export interface Hotspot {
  id: string;
  x: number;     // Absolute x in canvas (assuming unscaled for now initially, or scaled image coordinates)
  y: number;     // Absolute y in canvas
  width: number; // Absolute width in canvas
  height: number;// Absolute height in canvas
  href: string;
  target: string;
  title: string;
}

export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
