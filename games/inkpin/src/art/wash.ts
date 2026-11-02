import type { Pt } from './pen';

/**
 * Small colour and paint helpers shared by the drawings: mixing washes,
 * CSS rgba strings for gradients, and an eraser for drawing a part over
 * the lines of the parts behind it on a transparent layer.
 */

/** `#rrggbb` mixed towards `#rrggbb` by t (0..1). */
export function mix(a: string, b: string, t: number): string {
  const p = parseInt(a.slice(1), 16);
  const q = parseInt(b.slice(1), 16);
  const ch = (s: number): number => Math.round(((p >> s) & 255) + (((q >> s) & 255) - ((p >> s) & 255)) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

/** `#rrggbb` as a CSS rgba() with alpha a. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Clears a closed shape on the layer, so a part drawn next hides the lines of the parts behind it. */
export function erase(ctx: CanvasRenderingContext2D, shape: readonly Pt[]): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
