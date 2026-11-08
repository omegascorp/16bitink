import { createRng } from '../../logic/rng';
import type { Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { blotchShape, flankHatch, glaze, periodicLine } from '../snakes/cornPaint';
import { SNAKE_W } from '../types';
import {
  ANA_PERIOD, anaCrossWash, anaModel, type AnacondaTone, BOTTOM_EDGE, flecks, layAnaTile, mod, paintOcellus, paintSpot, smoothScales, TOP_EDGE,
} from './floodedSnakePaint';

/**
 * The green anaconda's back, seen from above, one period painted once on a
 * tile and laid end to end (the features crossing the tile's ends drawn at
 * both ends from the same seed), so x = PERIOD + a is pixel for pixel x = a:
 * big black oval spots alternating either side of the spine, black-ringed
 * ochre side spots low on both flanks in the gaps between them, the olive
 * ground glazed yellower here and mossier there, the small smooth scales,
 * a wet sheen.
 */
const PERIOD = ANA_PERIOD;
const SPOTS = 6;
const STEP = PERIOD / SPOTS;
/** A scale's length along the body; it divides the period. */
const SCALE_LEN = 2;

interface Mark {
  readonly shape: Pt[];
  readonly seed: number;
}
interface Ocellus {
  readonly ring: Pt[];
  readonly heart: Pt[];
  readonly seed: number;
}

/** Dorsal spot i (any integer), the same as spot i + SPOTS one period along: even ones on the lit side of the spine, odd ones on the far side. */
export function dorsalSpot(i: number, t: AnacondaTone, at = 0): Mark {
  const k = mod(i, SPOTS);
  const rng = createRng(21100 + k * 17 + t.seed);
  const side = k % 2 === 0 ? -1 : 1;
  const cx = at + i * STEP + STEP / 2 + (rng() - 0.5) * 3;
  const cy = 12 + side * (3.5 + rng() * 0.9);
  const rx = 6.4 + (rng() - 0.5) * 1.8;
  const ry = 4.5 + (rng() - 0.5) * 0.9;
  return { shape: blotchShape(cx, cy, rx, ry, 21200 + k + t.seed, { rough: 0.13, pow: 2.05, notch: 0.04, n: 44 }), seed: 21300 + k + t.seed };
}

/** The side spots by dorsal spot i: a big one on the flank across from it, a small one half over the edge before it. */
function ocelli(i: number, t: AnacondaTone): Ocellus[] {
  const k = mod(i, SPOTS);
  const rng = createRng(21400 + k * 13 + t.seed);
  const far = k % 2 === 0 ? 1 : -1;
  const out: Ocellus[] = [];
  const make = (cx: number, cy: number, rx: number, ry: number, s: number): void => {
    const ring = blotchShape(cx, cy, rx, ry, s, { rough: 0.12, pow: 2, n: 28 });
    const heart = blotchShape(cx + (rng() - 0.5) * 0.4, cy + (rng() - 0.5) * 0.3, rx * 0.62, ry * 0.56, s + 50, { rough: 0.18, pow: 2, n: 22 });
    out.push({ ring, heart, seed: s + 100 });
  };
  const x = i * STEP + STEP / 2 + (rng() - 0.5) * 3;
  make(x, far < 0 ? 3.2 + rng() * 0.6 : SNAKE_W - 3.3 - rng() * 0.6, 3.5 + rng() * 0.8, 2.5 + rng() * 0.4, 21500 + k * 3 + t.seed);
  const x2 = i * STEP + (rng() - 0.5) * 2.5;
  make(x2, far < 0 ? SNAKE_W - 1.4 : 1.3, 2.7 + rng() * 0.6, 1.9, 21600 + k * 3 + t.seed);
  return out;
}

/** Small dark flecks scattered on the flanks by dorsal spot i. */
function flankFlecks(i: number, t: AnacondaTone): Mark[] {
  const k = mod(i, SPOTS);
  const rng = createRng(21700 + k * 7 + t.seed);
  return Array.from({ length: 3 }, (_, m) => {
    const up = rng() < 0.5;
    const x = i * STEP + rng() * STEP;
    const y = up ? 1.8 + rng() * 3.4 : SNAKE_W - 1.8 - rng() * 3.4;
    return { shape: blotchShape(x, y, 0.9 + rng() * 0.8, 0.7 + rng() * 0.5, 21800 + k * 5 + m + t.seed, { rough: 0.2, pow: 2, n: 14 }), seed: 21900 + k * 5 + m };
  });
}

/** The ground between the spots, glazed unevenly as a wash dries: yellower olive on the lit flank, mossier down the spine and the far flank. */
function groundGlazes(ctx: CanvasRenderingContext2D, i: number, t: AnacondaTone): void {
  const k = mod(i, SPOTS);
  const rng = createRng(22100 + k * 11 + t.seed);
  const x = i * STEP;
  glaze(ctx, x + (rng() - 0.5) * 4, 4 + rng() * 2, 9, 3.2, 0, t.olive, 0.4);
  glaze(ctx, x + STEP / 2 + (rng() - 0.5) * 6, 12 + (rng() - 0.5) * 3, 8, 3, 0, t.moss, 0.22);
  glaze(ctx, x + (rng() - 0.5) * 8, 19.5 + rng() * 1.5, 10, 3, 0, t.moss, 0.3);
}

/** Paints one period of the back into [0, PERIOD] × [0, SNAKE_W]. */
function paintTile(ctx: CanvasRenderingContext2D, ink: string, f: number, t: AnacondaTone): void {
  const boil = f * 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP_EDGE - 0.6, PERIOD, BOTTOM_EDGE - TOP_EDGE + 1.2);
  ctx.clip();
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = anaCrossWash(ctx, 0, t);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 1;
  for (let i = -1; i <= SPOTS; i++) groundGlazes(ctx, i, t);
  flecks(ctx, 0, PERIOD, 0, 22200 + t.seed, 300, true, t.shadow);
  for (let i = -1; i <= SPOTS; i++) for (const m of flankFlecks(i, t)) paintSpot(ctx, m.shape, m.seed + boil, ink, t, 0.5);
  for (let i = -1; i <= SPOTS; i++) for (const o of ocelli(i, t)) paintOcellus(ctx, o.ring, o.heart, o.seed + boil, ink, t);
  for (let i = -1; i <= SPOTS; i++) {
    const s = dorsalSpot(i, t);
    paintSpot(ctx, s.shape, s.seed + boil, ink, t);
  }
  smoothScales(ctx, 0, PERIOD, 0, SCALE_LEN, 0.42, PERIOD, t);
  flecks(ctx, 0, PERIOD, 0, 22300 + t.seed, 420, true, t.shadow);
  anaModel(ctx, 0, PERIOD, 0, t);
  flankHatch(ctx, 0, PERIOD, 60, 0, 22400 + boil, ink, 0.36, true);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, TOP_EDGE, 1.15, ink, 0.95, 22500 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE, 1.9, ink, 1, 22550 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE - 0.55, 0.6, ink, 0.3, 22590 + boil);
}

/** The back strip in tone `t`. */
export function drawAnaStrip(d: Draw, length: number, t: AnacondaTone): void {
  layAnaTile(d.pen.ctx, length, (tile) => paintTile(tile, d.ink, d.f, t));
}
