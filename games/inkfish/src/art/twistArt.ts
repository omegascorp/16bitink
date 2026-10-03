import { ellipse, INK, Pen, type Pt } from './pen';
import { ART_RES } from './propArt';

const BLUE = '#1f3f8a';
const WASH = '#3466c2';

/** In-game size of the ink bottle collectible (texture is ART_RES times larger). */
export const BOTTLE_SIZE = 48;
/** Darkness overlay texture size; the clear hole is DARK_HOLE of it, radius-wise. */
export const DARK_TEX = 1024;
export const DARK_HOLE = 0.08;

const GLASS = '#cfe0e6';
const CORK = '#b98a55';

/**
 * A squat glass bottle of blue ink with a cork: the catch in "Ink bottles"
 * levels. Drawn upright and centred; it tumbles as it sinks.
 */
export function drawInkBottle(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, 0.35);
  const s = ART_RES;
  const c = BOTTLE_SIZE / 2;
  const P = (x: number, y: number): Pt => ({ x: (c + x) * s, y: (c + y) * s });
  // Shoulders rounding into a short neck, a flat heavy base.
  const glass: Pt[] = [
    P(-4, -13), P(-4, -9), P(-11, -6), P(-13, -2), P(-13, 14), P(-11, 17), P(11, 17), P(13, 14), P(13, -2), P(11, -6), P(4, -9), P(4, -13),
  ];
  pen.fill(glass, GLASS, 0.55);
  // The ink inside, two thirds full, its surface tilted a touch.
  const ink: Pt[] = [P(-12.5, 0), P(12.5, -1.5), P(12.5, 14), P(10.5, 16.5), P(-10.5, 16.5), P(-12.5, 14)];
  pen.fill(ink, WASH, 0.9);
  pen.clipped(ink, () => {
    for (let k = -16; k < 16; k += 2.4) pen.hair([P(k, 18), P(k + 8, -2)], 0.45 * s, BLUE, 0.6);
  });
  pen.stroke([P(-12.5, 0), P(12.5, -1.5)], 0.9 * s, BLUE);
  // A paper label with a scribbled word.
  const label: Pt[] = [P(-9, 4), P(9, 4), P(9, 12), P(-9, 12)];
  pen.fill(label, '#f4eddc', 0.95);
  pen.stroke([...label, label[0]!], 0.8 * s, INK);
  pen.hair([P(-6, 8), P(-3, 6.8), P(0, 8.6), P(3, 7), P(6, 8)], 0.7 * s, INK, 0.8);
  pen.stroke([...glass, glass[0]!], 1.3 * s, INK);
  // Cork, poking out of the neck.
  const cork: Pt[] = [P(-5, -19), P(5, -19), P(4.2, -12), P(-4.2, -12)];
  pen.fill(cork, CORK, 0.95);
  pen.stroke([...cork, cork[0]!], 1 * s, INK);
  pen.hair([P(-3, -16.5), P(-1, -16)], 0.6 * s, INK, 0.6);
  pen.hair([P(1.5, -14.5), P(3, -14.8)], 0.6 * s, INK, 0.6);
  // Glint on the glass.
  pen.fill(ellipse((c - 9) * s, (c - 1) * s, 1.6 * s, 4.5 * s, 12), '#fffaf0', 0.85);
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
