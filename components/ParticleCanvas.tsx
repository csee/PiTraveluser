import React, { useEffect, useRef, useState, useCallback } from 'react';
import { User, Particle } from '../types';
import { getPointsFromPath, getPointsFromText, LOGO_PATH } from '../utils/geometry';

interface Props {
  users: User[];
}

const ParticleCanvas: React.FC<Props> = ({ users }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  
  // Interaction State
  const transformRef = useRef({ zoom: 1, rotation: 0 });
  const mouseRef = useRef({ 
    x: 0, 
    y: 0, 
    radius: 80, 
    active: false, 
    isDragging: false, 
    dragStartX: 0,
    dragStartY: 0,
    dragStartRotation: 0,
    mouseDownTime: 0
  });
  
  // 0: SVG Logo, 1: Text "圆周旅迹", 2: Text "1650"
  const [viewMode, setViewMode] = useState(0);
  const animationRef = useRef<number>(0);

  // Resize handler state to trigger recalculation
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Use ResizeObserver to handle initial load and window resizing reliably
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use contentRect to get accurate inner dimensions
        const { width, height } = entry.contentRect;
        
        // Update state only if dimensions have changed effectively
        setDimensions(prev => {
          if (Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
             return prev;
          }
          return { width, height };
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Init particles and targets
  useEffect(() => {
    if (users.length === 0 || dimensions.width === 0 || dimensions.height === 0) return;
    
    const { width, height } = dimensions;
    if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
    }

    // 1. Generate Points for Mode 0 (Logo)
    const points0 = getPointsFromPath(LOGO_PATH, width, height, users.length);
    
    // 2. Generate Points for Mode 1 (Text 1)
    const points1 = getPointsFromText("圆周旅迹", width, height, users.length);

    // 3. Generate Points for Mode 2 (Text 2)
    const points2 = getPointsFromText("1650", width, height, users.length);

    const defaultTarget = { x: width / 2, y: height / 2 };

    const newParticles: Particle[] = users.map((user, i) => {
      // TypeScript safety: Provide fallback if point generation fails or indices mismatch
      const target0 = points0[i] || defaultTarget;
      const target1 = points1[i] || defaultTarget;
      const target2 = points2[i] || defaultTarget;

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        targets: [target0, target1, target2],
        vx: 0,
        vy: 0,
        density: (Math.random() * 20) + 1,
        user: user,
        color: user.color || '#fff',
        size: 8 + Math.random() * 4, 
      };
    });

    particlesRef.current = newParticles;
  }, [users, dimensions]);

  // Helper to transform screen mouse coordinates to local canvas space
  const getLocalMousePos = (screenX: number, screenY: number, width: number, height: number) => {
    const { zoom, rotation } = transformRef.current;
    const cx = width / 2;
    const cy = height / 2;
    
    let dx = screenX - cx;
    let dy = screenY - cy;
    
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    
    const lx = rx / zoom;
    const ly = ry / zoom;
    
    return { x: lx + cx, y: ly + cy };
  };

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear with clean black
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    
    const { zoom, rotation } = transformRef.current;
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.rotate(rotation);
    ctx.translate(-width / 2, -height / 2);

    const mouse = mouseRef.current;
    const localMouse = getLocalMousePos(mouse.x, mouse.y, width, height);
    
    const currentMode = viewMode % 3;

    particlesRef.current.forEach(p => {
      // Safety check if targets exist
      if (!p.targets || !p.targets[currentMode]) return;

      const target = p.targets[currentMode];

      const dx = localMouse.x - p.x;
      const dy = localMouse.y - p.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const maxDistance = mouse.radius; 
      
      let directionX = 0;
      let directionY = 0;

      // Interaction Force (Repulsion)
      if (distance < maxDistance && mouse.active && !mouse.isDragging) {
        const force = (maxDistance - distance) / maxDistance;
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        directionX = forceDirectionX * force * p.density * 5;
        directionY = forceDirectionY * force * p.density * 5;
      }

      // Physics: Move towards target
      // If dragging or not interacting, return to target heavily
      // If interacting, allow repulsion to affect position
      if (distance >= maxDistance || !mouse.active || mouse.isDragging) {
         const dxTarget = p.x - target.x;
         const dyTarget = p.y - target.y;
         // Ease factor (0.05 to 0.1 is smooth)
         p.x -= (dxTarget / 15);
         p.y -= (dyTarget / 15);
      } else {
         p.x -= directionX;
         p.y -= directionY;
         
         // Still apply a weak pull to target even when repulsed, so they don't get stuck forever
         const dxTarget = p.x - target.x;
         const dyTarget = p.y - target.y;
         p.x -= (dxTarget / 30);
         p.y -= (dyTarget / 30);
      }

      ctx.fillStyle = p.color;
      // Drawing text is expensive, consider using small circles for performance if lagging
      ctx.font = `${p.size}px Arial`; 
      ctx.fillText(p.user.nickname, p.x, p.y);
    });

    ctx.restore();
    animationRef.current = requestAnimationFrame(animate);
  }, [viewMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      let newZoom = transformRef.current.zoom - e.deltaY * zoomSensitivity;
      newZoom = Math.max(0.1, Math.min(newZoom, 5));
      transformRef.current.zoom = newZoom;
    };

    const handleMouseDown = (e: MouseEvent) => {
       const rect = canvas.getBoundingClientRect();
       mouseRef.current.x = e.clientX - rect.left;
       mouseRef.current.y = e.clientY - rect.top;
       mouseRef.current.isDragging = true;
       mouseRef.current.dragStartX = e.clientX;
       mouseRef.current.dragStartY = e.clientY;
       mouseRef.current.dragStartRotation = transformRef.current.rotation;
       mouseRef.current.mouseDownTime = Date.now();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      
      mouseRef.current.x = mx;
      mouseRef.current.y = my;
      mouseRef.current.active = true;

      if (mouseRef.current.isDragging) {
        const deltaX = e.clientX - mouseRef.current.dragStartX;
        // Rotation sensitivity
        transformRef.current.rotation = mouseRef.current.dragStartRotation + (deltaX * 0.005);
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      mouseRef.current.isDragging = false;
      mouseRef.current.active = false;

      const clickDuration = Date.now() - mouseRef.current.mouseDownTime;
      const moveDist = Math.abs(e.clientX - mouseRef.current.dragStartX) + Math.abs(e.clientY - mouseRef.current.dragStartY);
      
      // If it's a click (short time, short distance), switch mode
      if (clickDuration < 200 && moveDist < 10) {
        setViewMode(prev => (prev + 1) % 3);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      mouseRef.current.x = t.clientX - rect.left;
      mouseRef.current.y = t.clientY - rect.top;
      mouseRef.current.active = true;
      mouseRef.current.isDragging = true;
      mouseRef.current.dragStartX = t.clientX;
      mouseRef.current.dragStartY = t.clientY;
      mouseRef.current.dragStartRotation = transformRef.current.rotation;
      mouseRef.current.mouseDownTime = Date.now();
    }

    const handleTouchMove = (e: TouchEvent) => {
       e.preventDefault();
       const rect = canvas.getBoundingClientRect();
       const t = e.touches[0];
       mouseRef.current.x = t.clientX - rect.left;
       mouseRef.current.y = t.clientY - rect.top;

       if (mouseRef.current.isDragging) {
         const deltaX = t.clientX - mouseRef.current.dragStartX;
         transformRef.current.rotation = mouseRef.current.dragStartRotation + (deltaX * 0.005);
       }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      mouseRef.current.isDragging = false;
      mouseRef.current.active = false;
      
      const clickDuration = Date.now() - mouseRef.current.mouseDownTime;
      // Touch click logic
      if (clickDuration < 300) {
         setViewMode(prev => (prev + 1) % 3);
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-grab active:cursor-grabbing">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default ParticleCanvas;