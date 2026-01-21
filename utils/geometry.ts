export const getPointsFromPath = (
  pathData: string, 
  width: number, 
  height: number, 
  numPoints: number
): { x: number, y: number }[] => {
  if (width === 0 || height === 0) return [];

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) return [];

  const path = new Path2D(pathData);
  
  ctx.fillStyle = '#000000'; 
  ctx.fillRect(0, 0, width, height); 
  
  ctx.translate(width / 2, height / 2);
  
  const svgWidth = 118;
  const svgHeight = 59;

  const scale = Math.min(width / svgWidth, height / svgHeight) * 0.75; 
  
  ctx.scale(scale, scale);
  ctx.translate(-svgWidth / 2, -svgHeight / 2);

  ctx.fillStyle = '#FFFFFF'; 
  ctx.fill(path);

  return samplePointsFromCanvas(ctx, width, height, numPoints);
};

export const getPointsFromText = (
  text: string,
  width: number,
  height: number,
  numPoints: number
): { x: number, y: number }[] => {
  if (width === 0 || height === 0) return [];

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) return [];

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Font sizing
  let fontSize = Math.min(width, height) * 0.5;
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
  const metrics = ctx.measureText(text);
  
  // Fit width (target 80% screen width)
  if (metrics.width > 0) {
      const targetWidth = width * 0.8;
      const scale = targetWidth / metrics.width;
      fontSize = fontSize * scale;
  }
  
  // Safety cap for height
  if (fontSize > height * 0.8) fontSize = height * 0.8;

  ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.fillText(text, width / 2, height / 2);

  return samplePointsFromCanvas(ctx, width, height, numPoints);
};

const samplePointsFromCanvas = (
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number, 
  numPoints: number
): { x: number, y: number }[] => {
  const idata = ctx.getImageData(0, 0, width, height);
  const buffer32 = new Uint32Array(idata.data.buffer);
  
  const validCoords: {x: number, y: number}[] = [];
  const gridX = 4;
  const gridY = 4;

  for (let y = 0; y < height; y += gridY) {
    for (let x = 0; x < width; x += gridX) {
      // 0xFF000000 is black (fully opaque) in Little Endian (ABGR) or potentially different depending on system,
      // but we painted black background. 
      // Safe check: look for non-black pixels.
      // Since we painted White (0xFFFFFFFF) on Black (0xFF000000), we just check != Black.
      if (buffer32[y * width + x] !== 0xFF000000) { 
           validCoords.push({ x, y });
      }
    }
  }

  // Shuffle
  for(let i = validCoords.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [validCoords[i], validCoords[j]] = [validCoords[j], validCoords[i]];
  }

  const result: {x: number, y: number}[] = [];
  if (validCoords.length === 0) {
      // Fallback center points
      for (let i = 0; i < numPoints; i++) result.push({x: width/2, y: height/2});
      return result;
  }

  for (let i = 0; i < numPoints; i++) {
    result.push(validCoords[i % validCoords.length]);
  }

  return result;
}

export const LOGO_PATH = "M55.124 0H0V58.7989C16.9966 58.7989 33.6511 48.0627 45.1006 32.8815C57.846 48.7036 85.3071 58.7989 117.598 58.7989V0H55.124Z";