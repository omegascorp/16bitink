import { ellipse, INK, Pen, type Pt } from './pen';
import { ART_RES } from './propArt';

const BLUE = '#1f3f8a';
const WASH = '#3466c2';

/** In-game size of the ink drop collectible (texture is ART_RES times larger). */
export const DROP_SIZE = 48;
/** Darkness overlay texture size; the clear hole is DARK_HOLE of it, radius-wise. */
export const DARK_TEX = 1024;
export const DARK_HOLE = 0.08;

/** A fat drop of blue ink with a highlight: the collectible in "Ink drops" levels. */
export function drawInkDrop(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, 0.35);
  const s = ART_RES;
  const c = DROP_SIZE / 2;
  const P = (x: number, y: number): Pt => ({ x: (c + x) * s, y: (c + y) * s });
  // Teardrop: a circle at the bottom pulled to a point on top.
  const arc = Array.from({ length: 21 }, (_, i) => {
    const a = -Math.PI / 6 + (i / 20) * (Math.PI * 4 / 3);
    return P(Math.cos(a) * 12, 5 + Math.sin(a) * 12);
  });
  const body: Pt[] = [P(0, -19), ...arc, P(0, -19)];
  pen.fill(body, WASH, 0.85);
  pen.clipped(body, () => {
    for (let k = -14; k < 16; k += 2.4) pen.hair([P(k, 18), P(k + 10, -16)], 0.45 * s, BLUE, 0.55);
  });
  pen.stroke(body, 1.3 * s, BLUE);
  pen.fill(ellipse((c - 4.5) * s, (c + 2) * s, 2.6 * s, 4 * s, 12), '#fffaf0', 0.85);
  pen.dot((c + 6) * s, (c + 9) * s, 1 * s, INK, 0.5);
}

/** A sheet of ink with a soft clear hole in the middle: the "lights out" view. */
export function drawDarkness(ctx: CanvasRenderingContext2D): void {
  const c = DARK_TEX / 2;
  const hole = DARK_TEX * DARK_HOLE;
  const g = ctx.createRadialGradient(c, c, hole * 0.7, c, c, hole * 1.25);
  g.addColorStop(0, 'rgba(20,18,28,0)');
  g.addColorStop(0.55, 'rgba(20,18,28,0.75)');
  g.addColorStop(1, 'rgba(20,18,28,0.96)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, DARK_TEX, DARK_TEX);
}
