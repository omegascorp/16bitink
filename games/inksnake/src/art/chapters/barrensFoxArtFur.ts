import { type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { glaze } from '../critters/tomcatKit';

/**
 * The Red Fox's paints: a rich red-orange coat over warm undertones, golden
 * where the light catches it, grizzled with black-tipped guard hairs down
 * the back and tail, white at the cheeks, throat and tail tip, black on the
 * backs of the ears and down the legs.
 */
export const FOX = {
  base: '#c9652b',
  rich: '#a8461b',
  deep: '#6e2e14',
  light: '#f0ad67',
  cream: '#efd3a0',
  white: '#f8f3e8',
  whiteDeep: '#c7baa6',
  black: '#231b19',
  blackSoft: '#4b342a',
  grizzle: '#5a3424',
  eye: '#e2a12c',
  eyeDeep: '#94561a',
  nose: '#1d1716',
} as const;

/** A coat hair's colour: mostly red, some deep, a few black-tipped guard hairs and golden ones. */
export const redHair = (r: number, guard = 0.08): string => (r < guard ? FOX.black : r < guard + 0.22 ? FOX.rich : r < 0.72 ? FOX.base : r < 0.9 ? FOX.light : FOX.deep);
export const whiteHair = (r: number): string => (r < 0.3 ? FOX.whiteDeep : r < 0.4 ? FOX.cream : PAPER_FILL);
export const blackHair = (r: number): string => (r < 0.55 ? FOX.black : r < 0.85 ? FOX.blackSoft : FOX.grizzle);

/** Paper, the wash, and its shadow crescent away from the light. */
export function wash(d: Draw, shape: readonly Pt[], color: string, shift: Pt, deep = 0.5): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, color, 0.93);
  pen.clipped(shape, () => pen.crescent(shape, shift, () => pen.fill(shape, mix(color, FOX.deep, 0.6), deep)));
}

/** Volume over the fur: a golden light at the upper left, a warm umber shadow at the lower right. */
export function model(d: Draw, shape: readonly Pt[], c: Pt, rx: number, ry: number, shift: Pt, lit = 0.3): void {
  const { pen } = d;
  pen.clipped(shape, () => {
    glaze(d, c.x - rx * 0.25, c.y - ry * 0.35, rx * 0.8, ry * 0.6, 0, FOX.light, lit);
    pen.crescent(shape, shift, () => pen.fill(shape, FOX.deep, 0.36));
  });
}

/** The angle along a spine at the point nearest p, and how far along it that is (0..1). */
export function along(spine: readonly Pt[], p: Pt): { ang: number; u: number; side: number } {
  let best = 0;
  let bd = Infinity;
  spine.forEach((s, i) => {
    const dd = (s.x - p.x) ** 2 + (s.y - p.y) ** 2;
    if (dd < bd) [bd, best] = [dd, i];
  });
  const n = spine.length - 1;
  const a = spine[Math.max(0, best - 1)]!;
  const b = spine[Math.min(n, best + 1)]!;
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const s = spine[best]!;
  const side = Math.sign(Math.cos(ang) * (p.y - s.y) - Math.sin(ang) * (p.x - s.x)) || 1;
  return { ang, u: best / n, side };
}
