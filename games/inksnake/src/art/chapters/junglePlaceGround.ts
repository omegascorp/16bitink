import { createRng, type Rng } from '../../logic/rng';
import type { LevelDef } from '../../level/types';
import { blob, edgeWash, edgenessOf, groundWash, wash } from '../groundKit';
import { type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { type Busy, busyOf, keepsOf, noiseOf, perArea, seedOf, smoothstep } from '../places/farmKit';
import { specks } from '../places/farmGroundParts';
import { glaze } from '../snakes/cornPaint';
import { frond } from './barrensPlaceFrond';
import { field, H, inAny, leaf, LEAF_GREEN, LOAM, LOAM_DEEP, LOAM_PALE, MOSS, SHADE, streamsOf, UMBER, W } from './junglePlaceKit';
import { mossPatch, rootRun, seedling, termiteMound } from './junglePlaceParts';
import { paintStream } from './junglePlaceStream';

/**
 * The Jungle's ground (chapter 9), seen from above: dark loam under a deep
 * canopy, its light dappled, strewn with big fallen sal and teak leaves
 * (old ones flattened grey into the soil, this year's russet and ochre on
 * top, thick at the edges and thin in the middle where the snake hunts),
 * surface roots snaking in from trees off the board, moss, seedlings and
 * young ferns at the edges, a termite mound of red clay on some levels,
 * and the stream with its banks (junglePlaceStream.ts) where a level has one.
 */

/** How thick the litter lies (0..1): patchy, thick at the edges, thin in the middle and by the snake's start. */
type Litter = (x: number, y: number) => number;

function litterOf(level: LevelDef, rng: Rng): Litter {
  const n1 = noiseOf(rng, 150);
  const n2 = noiseOf(rng, 48);
  const edge = edgenessOf(W, H, 0.25);
  const { start } = level;
  return (x, y) => {
    const drifts = smoothstep((0.7 * n1(x, y) + 0.3 * n2(x, y) + 0.1) / 0.4);
    let v = 0.15 + 0.5 * drifts + 0.45 * edge(x, y);
    const mid = Math.hypot((x - W / 2) / (W * 0.36), (y - H / 2) / (H * 0.4));
    v -= 0.22 * Math.max(0, 1 - mid);
    v -= 0.25 * Math.max(0, 1 - Math.hypot(x - start.x, y - start.y) / 120);
    return Math.max(0, Math.min(1, v));
  };
}

/** The paper, the loam's wash, blooms where it dried unevenly, its crumbs, the canopy's shade pooled at the edges. */
function loam(d: Draw, litter: Litter, busy: Busy, rng: Rng): void {
  groundWash(d, W, H, LOAM, 0.56);
  field(d, 6, LOAM_DEEP, 0.32, (x, y) => litter(x, y) ** 1.4);
  const damp = noiseOf(rng, 120);
  field(d, 8, MOSS, 0.2, (x, y) => smoothstep((damp(x, y) - 0.15) / 0.5) * (0.4 + 0.6 * busy(x, y)));
  for (let k = 0; k < perArea(70); k++) {
    const p = pt(rng() * W, rng() * H);
    const colour = rng() < 0.3 ? MOSS : rng() < 0.55 ? LOAM_DEEP : rng() < 0.8 ? LOAM_PALE : '#8a6a44';
    d.pen.fill(blob(p, 40 + rng() * 90, 24 + rng() * 50, rng, 0.32, 18, rng() * TAU), colour, 0.04 + 0.08 * busy(p.x, p.y));
  }
  for (let k = 0; k < perArea(16); k++) {
    const p = pt(rng() * W, rng() * H);
    wash(d, blob(p, 34 + rng() * 70, 20 + rng() * 40, rng, 0.35, 24, rng() * TAU), rng() < 0.5 ? LOAM_DEEP : MOSS, 0.05, 0.8);
  }
  const at = (n: number, r0: number, r1: number): (readonly [number, number, number])[] => Array.from({ length: perArea(n) }, () => [rng() * W, rng() * H, r0 + rng() * (r1 - r0)] as const);
  specks(d, UMBER, 0.3, at(26000, 0.3, 0.8));
  specks(d, '#6b5a3a', 0.25, at(6000, 0.4, 1));
  specks(d, PAPER_FILL, 0.45, at(9000, 0.3, 0.7));
}

/** Dappled light: the canopy's shadows lying cool over the edges, sun flecks warm in the clearings. */
function dapple(d: Draw, busy: Busy, rng: Rng): void {
  const { ctx } = d.pen;
  for (let k = 0; k < perArea(46); k++) {
    const p = pt(rng() * W, rng() * H);
    const e = busy(p.x, p.y);
    if (rng() > 0.25 + e) continue;
    glaze(ctx, p.x, p.y, 60 + rng() * 90, 34 + rng() * 50, rng() * TAU, SHADE, 0.1 + 0.14 * e);
  }
  for (let k = 0; k < perArea(60); k++) {
    const p = pt(W * 0.1 + rng() * W * 0.8, H * 0.1 + rng() * H * 0.8);
    glaze(ctx, p.x, p.y, 10 + rng() * 26, 6 + rng() * 14, rng() * TAU, '#fff2c4', 0.1 + rng() * 0.12);
  }
}

/** Where the board's edge plants go: busy ground off the water. */
function spots(n: number, rng: Rng, busy: Busy, water: readonly (readonly Pt[])[], least: number): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k < n * 6 && out.length < n; k++) {
    const p = pt(rng() * W, rng() * H);
    if (busy(p.x, p.y) < least + rng() * 0.2 || inAny(water, p.x, p.y, 18)) continue;
    out.push(p);
  }
  return out;
}

/** The leaves: a layer of old ones flattened into the loam, then this year's lying loose over them. */
function litterLeaves(d: Draw, litter: Litter, busy: Busy, water: readonly (readonly Pt[])[], rng: Rng): void {
  const place = (n: number, s0: number, s1: number, age: () => number, lift: number, keepNear: number): void => {
    for (let k = 0; k < n; k++) {
      const p = pt(rng() * W, rng() * H);
      const v = litter(p.x, p.y);
      if (rng() > v * (keepNear + (1 - keepNear) * busy(p.x, p.y)) || inAny(water, p.x, p.y, 4)) continue;
      const len = s0 + rng() * (s1 - s0);
      leaf(d, p, rng() * TAU, len, rng, { age: age(), lift, tone: rng() < 0.05 ? LEAF_GREEN : undefined });
    }
  };
  place(perArea(4600), 9, 20, () => 0.55 + rng() * 0.35, 0, 0.6);
  place(perArea(2200), 10, 24, () => 0.15 + rng() * 0.35, 1.2, 0.35);
  place(perArea(520), 12, 26, () => rng() * 0.2, 2.2, 0.2);
}

/** The ground: loam, dapple, stream, roots, litter, the edge plants, the shade pooled at the edges. */
export function paintJungleGround(d: Draw, level: LevelDef): void {
  const rng = createRng(seedOf(level.id) + 9901);
  const keeps = keepsOf(level);
  const busy = busyOf(keeps, 60);
  const litter = litterOf(level, rng);
  const streams = streamsOf(level);
  const water = streams.map((z) => z.points);
  loam(d, litter, busy, rng);
  dapple(d, busy, rng);
  for (const z of streams) paintStream(d, z.points, rng);
  for (let k = 0; k < 3; k++) rootRun(d, rng, busy, water);
  for (const p of spots(perArea(14), rng, busy, water, 0.55)) mossPatch(d, p, 8 + rng() * 14, rng);
  litterLeaves(d, litter, busy, water, rng);
  if (rng() < 0.7) {
    const corner = spots(1, rng, busy, water, 0.85)[0];
    if (corner) termiteMound(d, corner, 26 + rng() * 10, rng);
  }
  for (const p of spots(perArea(12), rng, busy, water, 0.7)) seedling(d, p, 6 + rng() * 5, rng);
  for (const p of spots(perArea(7), rng, busy, water, 0.8)) {
    const toward = Math.atan2(H / 2 - p.y, W / 2 - p.x);
    for (let k = 0; k < 3; k++) frond(d, p, toward + (k - 1) * 0.9 + (rng() - 0.5) * 0.4, 22 + rng() * 14, rng, { bronze: rng() * 0.15, lift: 2.5, broad: 0.8 });
  }
  edgeWash(d, W, H, '#2f3a26', 0.34, W * 0.18);
}
