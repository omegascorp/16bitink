import { bezier, edge, makeDraw, oval, pt, ribbon, shade, tube, type Draw } from './kit';
import type { Pt } from './pen';
import { createRng } from '../logic/rng';

/**
 * A heap of washed-up bull kelp, side-on: long whip-like stipes, each
 * ending in a round float with a fan of ribbon blades, tangled in a low
 * mound on the sand. Olive and golden brown, darker underneath where it's
 * wet, edged in pen. Drawn in world px with the sand along the bottom.
 */
const KELP = '#8a7634';
const KELP_DARK = '#5c4d22';
const KELP_GOLD = '#b39a4c';
/** Heap height in tiles, at its fullest. */
export const HEAP_TILES = 1.4;
/** Tiles of room drawn past each end of the heap, for its loose ends and blades. */
export const HEAP_OVERHANG = 2;
/** Tiles the stipes' ends may reach past the heap (their blades stream on further). */
const LOOSE = 0.7;

/** The mound's top over the sand (px) at `u` 0..1 across the heap. */
function moundTop(u: number, tall: number): number {
  return tall * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, u)))), 0.55);
}

/** One stipe lying along the heap: thin at the holdfast end, swelling to the float, which carries the blades. */
function strand(d: Draw, from: Pt, to: Pt, sag: number, wash: string): void {
  const mid = pt((from.x + to.x) / 2, (from.y + to.y) / 2 + sag);
  const spine = bezier(from, mid, to, 14);
  const stipe = tube(spine, 1.3, 3);
  d.pen.fill(stipe, wash, 0.95);
  edge(d, stipe, 0.7, 0.8);
  const dir = Math.sign(to.x - from.x) || 1;
  // The blades: long wavy ribbons streaming on from the float.
  for (let k = 0; k < 3; k++) {
    const lift = (k - 1) * 2.6;
    const len = 11 + k * 3;
    const blade = ribbon(
      [to, pt(to.x + dir * len * 0.35, to.y + lift - 1.4), pt(to.x + dir * len * 0.7, to.y + lift + 1.2), pt(to.x + dir * len, to.y + lift * 1.4)],
      (u) => 3.6 * (1 - u * 0.6),
    ).shape;
    d.pen.fill(blade, k === 1 ? KELP_GOLD : wash, 0.9);
    edge(d, blade, 0.55, 0.65);
  }
  const float = oval(to.x, to.y, 2.6, 2.2, 14);
  d.pen.fill(float, wash, 1);
  edge(d, float, 0.9);
  d.pen.stroke([pt(to.x - 1.2, to.y - 1), pt(to.x - 0.1, to.y - 1.6)], 0.7, '#f7f1df', 0.8, false);
}

/**
 * Draws a heap `width` tiles long into `ctx` (already scaled to world px),
 * with HEAP_OVERHANG tiles of loose ends either side, lying on the sand
 * whose surface is at `ground(x)`.
 */
export function drawWrack(ctx: CanvasRenderingContext2D, width: number, tile: number, ground: (x: number) => number, seed: number): void {
  const rng = createRng(seed);
  const x0 = HEAP_OVERHANG * tile;
  const span = width * tile;
  const tall = HEAP_TILES * tile;
  const d = makeDraw(ctx, seed, 0, ground(x0 + span / 2));
  // The tangled body of the heap first, dark and wet, hatched on its shadow side, so the strands lie on a mass.
  const top: Pt[] = [];
  const bottom: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const x = x0 + (span * i) / 24;
    top.push(pt(x, ground(x) - moundTop(i / 24, tall) * 0.75));
    bottom.push(pt(x, ground(x) + 1));
  }
  const bed = [...top, ...bottom.reverse()];
  d.pen.fill(bed, KELP_DARK, 0.9);
  shade(d, bed, 0.45, true);
  edge(d, bed, 0.9, 0.7);
  // Strands from the bottom of the pile up: darker and wetter underneath.
  const n = Math.round(width * 3);
  for (let i = 0; i < n; i++) {
    const layer = i / n;
    const u = rng();
    const len = (1.2 + rng() * 1.6) * tile;
    const dir = rng() < 0.5 ? 1 : -1;
    const ax = x0 + u * span;
    const bx = Math.max(x0 - LOOSE * tile, Math.min(x0 + span + LOOSE * tile, ax + dir * len));
    const y = (x: number): number => ground(x) - 1.5 - moundTop((x - x0) / span, tall) * (0.25 + layer * 0.7) * (0.7 + rng() * 0.3);
    strand(d, pt(ax, y(ax)), pt(bx, y(bx)), (rng() - 0.5) * 4, layer < 0.35 ? KELP_DARK : KELP);
  }
}
