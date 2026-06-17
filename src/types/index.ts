export interface Hotspot {
  id: string;
  x: number;     // Absolute x in canvas (assuming unscaled for now initially, or scaled image coordinates)
  y: number;     // Absolute y in canvas
  width: number; // Absolute width in canvas
  height: number;// Absolute height in canvas
  action_type: string; // ID of the button template
  title: string;
  href: string;
  target: string;
  metadata: Record<string, any>; // Stores extra fields like couponIds, analytics labels, etc.
}

export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TemplateCategory = 'LAYOUT' | 'BUTTON' | 'CUSTOM';

export interface Template {
  id: string;
  name: string;
  service: string; // e.g., 'HAPPYORDER', 'HAPPYPOINT'
  category: TemplateCategory;
  content: string; // HTML or JSP snippet
  css_content?: string;
  js_content?: string; // JavaScript logic / functions
  created_at?: string;
  updated_at?: string;
}
