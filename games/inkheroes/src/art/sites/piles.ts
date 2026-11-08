import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { block } from './build';
import { PLANK } from './darkPaints';
import { cluster, flask, gem, GOLD, GOLD_DEEP, logStack, lump, MERCURY } from './parts';
import { blob, boundsOf, groundShadow, mix, paint, sparkle, sprite } from './paintKit';
import { SITE_FRAME, type SiteDrawer } from './types';

/**
 * Loose resources lying on the map to be picked up: a small heap of each,
 * about half a tile across, on a soft shadow.
 */
const BOUNDS = boundsOf(SITE_FRAME.small);
/** Sulfur in shade-dark ochre, its crystals catching the light. */
export const DEEP_SULFUR = '#bf9b2c';

export function small(draw: (d: Draw, rng: Rng) => void, shadowW = 15, air?: (d: Draw, rng: Rng) => void, line = 0.5): SiteDrawer {
  return (ctx, seed, f) => sprite(ctx, seed, f, { bounds: BOUNDS, line, rim: 0.4, ground: (d) => groundShadow(d, 2, 1, shadowW, 4, 0.4), air }, draw);
}

/** A coin lying flat: a gold ellipse with its milled rim and a lit face. */
export function coin(d: Draw, c: Pt, r: number, line = 0.4): void {
  const face = oval(c.x, c.y, r, r * 0.55, 14);
  paint(d, oval(c.x, c.y + 0.6, r, r * 0.55, 14), GOLD_DEEP, { shadow: 0.2, hatch: 0, line: 0 });
  paint(d, face, GOLD, { shadow: 0.35, hatch: 0, line, gloss: true });
  d.pen.hair(closed(oval(c.x, c.y, r * 0.62, r * 0.34, 12)), 0.3, GOLD_DEEP, 0.7);
}

/** A sack of drawstring leather. */
function sack(d: Draw, c: Pt, r: number): void {
  const body = [...bezier(pt(c.x - r * 0.4, c.y - r * 1.2), pt(c.x - r * 1.3, c.y - r * 0.6), pt(c.x - r, c.y + r * 0.8), 8), ...bezier(pt(c.x - r, c.y + r * 0.8), pt(c.x, c.y + r * 1.15), pt(c.x + r, c.y + r * 0.8), 8).slice(1), ...bezier(pt(c.x + r, c.y + r * 0.8), pt(c.x + r * 1.3, c.y - r * 0.6), pt(c.x + r * 0.4, c.y - r * 1.2), 8).slice(1)];
  paint(d, body, '#6e5032', { shadow: 0.6, hatch: 0.3, line: 0.6 });
  const neck = [pt(c.x - r * 0.45, c.y - r * 1.2), pt(c.x - r * 0.7, c.y - r * 1.75), pt(c.x + r * 0.7, c.y - r * 1.75), pt(c.x + r * 0.45, c.y - r * 1.2)];
  paint(d, neck, '#7d5c3a', { shadow: 0.4, hatch: 0, line: 0.5 });
  d.pen.stroke([pt(c.x - r * 0.5, c.y - r * 1.2), pt(c.x + r * 0.5, c.y - r * 1.15)], 0.8, '#2e1c10', 1, false);
}

function goldPile(d: Draw, rng: Rng): void {
  sack(d, pt(-6, -6), 5);
  const heap = [...bezier(pt(-12, 1), pt(-6, -11), pt(2, -10), 8), ...bezier(pt(2, -10), pt(10, -9), pt(13, 1), 8).slice(1)];
  paint(d, heap, GOLD, { shadow: 0.6, hatch: 0.25, line: 0.6 });
  const spots: [number, number][] = [[-8, -2], [-4, -6], [1, -8], [5, -5], [9, -1], [-1, -2], [4, 0], [-5, 1], [7, -6.5]];
  for (const [x, y] of spots) coin(d, pt(x + (rng() - 0.5), y), 2.4);
  for (const [x, y] of [[-14, 3], [14, 3.5], [11, 5.5]] as const) coin(d, pt(x, y), 2.2);
}

function woodPile(d: Draw, rng: Rng): void {
  logStack(d, rng, pt(0, 4), 3.6, [4, 3, 2], 8);
}

function orePile(d: Draw, rng: Rng): void {
  const spots: [number, number, number][] = [[-8, 1, 4], [1, 2, 4.6], [9, 1, 3.6], [-4, -4, 4], [5, -4, 3.8], [0, -9, 3.4]];
  for (const [x, y, r] of spots) lump(d, rng, pt(x, y), r, r * 0.8, mix('#5a5b62', rng() < 0.4 ? '#6e4a34' : '#70737c', 0.35));
}

function mercuryPile(d: Draw, rng: Rng): void {
  block(d, rng, { x0: -12, x1: 6, z0: 6, z1: 16, h0: 0, h1: 7 }, PLANK, 'plank');
  flask(d, pt(-7, -7), 3.2);
  flask(d, pt(0, -8), 2.6);
  flask(d, pt(10, 3), 4);
  flask(d, pt(-12, 4), 2.6, MERCURY);
}

function sulfurPile(d: Draw, rng: Rng): void {
  const heap = [...bezier(pt(-13, 2), pt(-7, -14), pt(1, -13), 8), ...bezier(pt(1, -13), pt(9, -12), pt(14, 2), 8).slice(1)];
  paint(d, heap, DEEP_SULFUR, { shadow: 0.7, hatch: 0.3, cross: true, line: 0.6 });
  d.pen.clipped(heap, () => d.pen.stipple(heap, 120, () => 0.6, 0.5, '#e3cc6e'));
  for (let i = 0; i < 5; i++) lump(d, rng, pt(-9 + i * 4.5, 2 - (i % 2) * 1.5), 2.2, 1.7, mix(DEEP_SULFUR, '#8a6418', rng() * 0.4), 0.45);
}

function crystalPile(d: Draw, rng: Rng): void {
  for (let i = 0; i < 3; i++) d.pen.fill(blob(pt(-6 + i * 6, 2), 3.6, 1.8, rng, 0.2, 10), '#4f474b', 0.9);
  cluster(d, rng, pt(0, 2), 18);
}

function gemsPile(d: Draw, rng: Rng): void {
  sack(d, pt(-6, -4), 4.2);
  const spots: [number, number, number][] = [[3, -2, 3.6], [-3, 3, 3], [8, 3, 2.8], [12, -2, 2.2], [-11, 3, 2.4]];
  for (const [x, y, r] of spots) gem(d, pt(x + (rng() - 0.5) * 0.6, y), r);
}

function glints(points: readonly [number, number][]): (d: Draw) => void {
  return (d) => points.forEach(([x, y]) => sparkle(d, pt(x, y), 2));
}

export const PILES = {
  'pile-gold': small(goldPile, 15, glints([[-3, -9], [8, -4]])),
  'pile-wood': small(woodPile, 15),
  'pile-ore': small(orePile, 14),
  'pile-mercury': small(mercuryPile, 15, glints([[9, -4]])),
  'pile-sulfur': small(sulfurPile, 15),
  'pile-crystal': small(crystalPile, 13, glints([[-4, -12], [5, -6]])),
  'pile-gems': small(gemsPile, 14, glints([[2, -4], [-11, 2]])),
} as const;

