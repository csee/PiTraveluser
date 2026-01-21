export interface User {
  nickname: string;
  userid: string;
  color?: string;
}

export interface Particle {
  x: number;
  y: number;
  targets: { x: number; y: number }[]; // Targets for different modes [SVG, Text1, Text2]
  vx: number;
  vy: number;
  density: number;
  user: User;
  color: string;
  size: number;
}

export interface ShapeMap {
  points: { x: number; y: number }[];
  width: number;
  height: number;
}