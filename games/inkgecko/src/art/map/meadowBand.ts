import { createRng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { makeDraw, pt, TAU } from '../kit';
import { LEAF, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { type Band, FeatureList, Placer } from './band';
import { Blobs, type Geo, hash, PATH_HALF, seedOf, type Span, Ticks } from './common';
import { shrub, treeCrown } from './flora';
import { bench, BUTTERCUP, butterfly, CORNFLOWER, cowParsley, daisies, POPPY, poppies, stileSteps } from './meadowKit';

/**
 * Chapter 7's band, "The Wild Meadow": long grass across the whole band,
 * swept into swathes by the wind and full of drifts of wildflowers
 * (poppies, ox-eye daisies, cornflowers, buttercups, cow parsley,
 * knapweed), with a path mown along the groove instead of paving. A side
 * path is mown out to a bench under a great oak; hawthorns stand in the
 * grass and butterflies are about. The stile at its foot steps over a
 * post-and-rail fence.
 */
const TALL = '#b3ab55';
const BLADE = mix(LEAF, '#7a6a2a', 0.35);
const DARK_BLADE = mix(LEAF, '#26316a', 0.35);
/** Half the mown path's width, from the groove. */
const MOWN = PATH_HALF + 48;
const CELL = 12;
type Kind = 'poppy' | 'daisy' | 'cornflower' | 'buttercup' | 'parsley' | 'knapweed';
const KINDS: readonly Kind[] = ['poppy', 'daisy', 'cornflower', 'buttercup', 'parsley', 'knapweed', 'poppy', 'buttercup'];

interface Drift {
  readonly c: Pt;
  readonly rx: number;
  readonly ry: number;
  readonly kind: Kind;
}

interface Meadow {
  readonly low: number;
  readonly high: number;
  readonly drifts: readonly Drift[];
  tall(x: number, y: number): boolean;
}

export function meadowPlan(geo: Geo, region: MapRegion): Band {
  const salt = 14000 + region.index * 101;
  const rng = createRng(seedOf(salt, 1));
  const low = region.gate.y - 40;
  const high = region.top - 56;
  // The oak and its bench, on the side and at the height where the groove is furthest away.
  const side = hash(salt, 2) < 0.5 ? -1 : 1;
  const tx = side < 0 ? 175 : MAP.width - 175;
  let ty = (low + high) / 2;
  let best = 0;
  for (let y = high + 260; y < low - 300; y += 30) {
    const dist = Math.abs(geo.grooveX(y) - tx) + Math.abs(geo.grooveX(y + 150) - tx);
    if (dist > best) [best, ty] = [dist, y];
  }
  const seat = pt(tx - side * 30, ty + 150);
  const clearing = { c: pt(seat.x, seat.y + 6), rx: 92, ry: 50 };
  const lane = mownLane(geo, seat, salt);
  const wob = (x: number, y: number): number => Math.sin(x / 37 + y / 53) * 7 + Math.sin(x / 13 - y / 17) * 3;
  const inClearing = (x: number, y: number): boolean => ((x - clearing.c.x) / clearing.rx) ** 2 + ((y - clearing.c.y) / clearing.ry) ** 2 < 1;
  const box = { x0: Math.min(...lane.map((p) => p.x)) - 30, x1: Math.max(...lane.map((p) => p.x)) + 30, y0: Math.min(...lane.map((p) => p.y)) - 30, y1: Math.max(...lane.map((p) => p.y)) + 30 };
  const onLane = (x: number, y: number): boolean => x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1 && lane.some((p) => Math.abs(p.x - x) < 26 && Math.abs(p.y - y) < 26 && Math.hypot(p.x - x, p.y - y) < 24 + wob(y, x) * 0.4);
  // The groove's reach across each 8 px row (within MOWN of it), so most of the meadow is known to be far without measuring.
  const reach = new Map<number, [number, number]>();
  const span = (y: number): [number, number] => {
    const k = Math.floor(y / 8);
    let hit = reach.get(k);
    if (!hit) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let yy = k * 8 - MOWN - 30; yy <= k * 8 + MOWN + 38; yy += 6) {
        const gx = geo.grooveX(yy);
        lo = Math.min(lo, gx);
        hi = Math.max(hi, gx);
      }
      hit = [lo - MOWN - 24, hi + MOWN + 24];
      reach.set(k, hit);
    }
    return hit;
  };
  const tall = (x: number, y: number): boolean => {
    const w = wob(x, y);
    if (y < high + w || y > low + w) return false;
    if (inClearing(x, y) || onLane(x, y)) return false;
    const [lo, hi] = span(y);
    if (x < lo || x > hi) return true;
    return geo.dist(x, y, MOWN + 20) > MOWN + w;
  };
  const drifts: Drift[] = [];
  for (let i = 0; i < 34; i++) drifts.push({ c: pt(rng() * MAP.width, high + rng() * (low - high)), rx: 60 + rng() * 110, ry: 30 + rng() * 50, kind: KINDS[Math.floor(rng() * KINDS.length)]! });
  const meadow: Meadow = { low, high, drifts, tall };
  const under = new FeatureList(salt, 1);
  const over = new FeatureList(salt, 2);
  const place = new Placer(geo, (x, y, r) => !tall(x, y) || !tall(x - r, y) || !tall(x + r, y));
  place.reserve(region.sign, 175);
  place.reserve(pt(tx, ty), 130);
  place.reserve(clearing.c, 100);
  over.add(ty, 200, (d, r) => treeCrown(d, pt(tx, ty), 118, r));
  over.add(seat.y, 50, (d, r) => bench(d, seat, 84, r));
  // Hawthorns in flower out in the grass; clumps that stand up out of it; butterflies.
  for (let i = 0; i < 3; i++) {
    const c = place.take(rng, { x0: 60, x1: MAP.width - 60, y0: high + 60, y1: low - 60 }, 44, 60, 40, 1.4);
    if (c) over.add(c.y, 90, (d, r) => shrub(d, c, 40 + r() * 10, r, r() < 0.6 ? '#f6f0e4' : '#e8b8c4', mix(LEAF, '#2f5a33', 0.3)));
  }
  const clumps = [cowParsley, poppies, daisies, cowParsley, poppies];
  for (let i = 0; i < 26; i++) {
    const c = place.take(rng, { x0: 30, x1: MAP.width - 30, y0: high + 20, y1: low - 20 }, 18, 10, 30);
    const draw = clumps[i % clumps.length]!;
    if (c) under.add(c.y, 40, (d, r) => draw(d, c, r));
  }
  for (let i = 0; i < 11; i++) {
    const c = pt(60 + rng() * (MAP.width - 120), high + 40 + rng() * (low - high - 80));
    if (geo.busy(c.x, c.y) < 0.4) continue;
    const s = 9 + rng() * 3;
    const a = rng() * TAU;
    over.add(c.y, 30, (d, r) => butterfly(d, c, s, a, r));
  }
  return {
    region,
    ground: (ctx, span) => paintMeadow(ctx, span, meadow),
    bare: tall,
    unpaved: [[region.top - 100, region.gate.y + 44]],
    floor: (ctx, span) => {
      mowingStripes(ctx, geo, span, high, region.gate.y + 30);
      if (span.y1 > region.gate.y - 40 && span.y0 < region.gate.y + 50) stileSteps(makeDraw(ctx, seedOf(salt, 7), 0, 0), region.gate, PATH_HALF - 4);
    },
    under: under.list,
    over: over.list,
  };
}

/** A mown side path from the groove out to the bench: points every few px. */
function mownLane(geo: Geo, seat: Pt, salt: number): Pt[] {
  const gx = geo.grooveX(seat.y + 40);
  const from = pt(gx + Math.sign(seat.x - gx) * PATH_HALF, seat.y + 40);
  const out: Pt[] = [];
  const n = Math.max(2, Math.ceil(Math.hypot(seat.x - from.x, seat.y - from.y) / 8));
  const ph = hash(salt, 3) * TAU;
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    out.push(pt(from.x + (seat.x - from.x) * u, from.y + (seat.y + 30 - from.y) * u + Math.sin(u * Math.PI * 2 + ph) * 18 * Math.sin(u * Math.PI)));
  }
  return out;
}

/** Which flower, if any, grows at this cell: thick in the drifts, the odd one anywhere. */
function flowerAt(m: Meadow, x: number, y: number, v: number, w: number): Kind | null {
  for (const d of m.drifts) {
    const k = ((x - d.c.x) / d.rx) ** 2 + ((y - d.c.y) / d.ry) ** 2;
    if (k < 1 && v < 0.7 * (1 - k * 0.6)) return d.kind;
  }
  return v < 0.07 ? KINDS[Math.floor(w * KINDS.length)]! : null;
}

/** The long grass: a warm wash in wind-swept swathes, blades leaning with the wind, seed heads, and the flowers in it. */
function paintMeadow(ctx: CanvasRenderingContext2D, span: Span, m: Meadow): void {
  const y0 = Math.max(span.y0 - 20, m.high - 20);
  const y1 = Math.min(span.y1 + 28, m.low + 20);
  if (y1 <= y0) return;
  const wash = new Path2D();
  const blades = new Ticks();
  const dark = new Ticks();
  const seeds = new Ticks();
  const blooms = { poppy: new Blobs(), daisy: new Blobs(), cornflower: new Blobs(), buttercup: new Blobs(), parsley: new Blobs(), knapweed: new Blobs() };
  const hearts = new Blobs();
  const yellow = new Blobs();
  for (let cy = Math.floor(y0 / CELL); cy * CELL < y1; cy++) {
    for (let cx = -1; cx * CELL < MAP.width + CELL; cx++) {
      const x = (cx + hash(cx, cy, 801)) * CELL;
      const y = (cy + hash(cx, cy, 802)) * CELL;
      if (!m.tall(x, y)) continue;
      if ((cx + cy) % 2 === 0) {
        const r = 15 + hash(cx, cy, 803) * 4;
        wash.moveTo(x + r, y);
        wash.arc(x, y, r, 0, TAU);
      }
      const kind = flowerAt(m, x, y, hash(cx, cy, 804), hash(cx, cy, 805));
      if (kind) {
        flower(blooms[kind], kind, x, y, hash(cx, cy, 806), hearts, yellow);
        continue;
      }
      // The wind: a slow lean that swings across the meadow in swathes.
      const lean = Math.sin(x / 210 + y / 330) * 4 + Math.sin(x / 90 - y / 140) * 2;
      const n = 3 + Math.floor(hash(cx, cy, 807) * 2);
      for (let k = 0; k < n; k++) {
        const bx = x + (k - n / 2) * 2.4;
        const h = 9 + hash(cx, cy, 810 + k) * 9;
        const l = lean + (hash(cx, cy, 820 + k) - 0.5) * 4;
        (k === 0 ? dark : blades).add(bx, y, bx + l, y - h);
        if (hash(cx, cy, 830 + k) < 0.14) seeds.add(bx + l, y - h, bx + l * 1.25, y - h - 3.5);
      }
    }
  }
  ctx.save();
  ctx.fillStyle = rgba(TALL, 0.24);
  ctx.fill(wash);
  ctx.clip(wash);
  // Swathes of warmer gold and cooler green laid over it, as the wind turns the grass.
  const gold = new Blobs();
  const cool = new Blobs();
  for (let cy = Math.floor((y0 - 280) / 140); cy * 140 < y1 + 280; cy++) {
    for (let cx = -1; cx * 200 < MAP.width + 200; cx++) {
      const x = (cx + hash(cx, cy, 841)) * 200;
      const y = (cy + hash(cx, cy, 842)) * 140;
      (hash(cx, cy, 843) < 0.55 ? gold : cool).blot(x, y, 110 + hash(cx, cy, 844) * 90, 34 + hash(cx, cy, 845) * 30, 0.35 + (hash(cx, cy, 846) - 0.5) * 0.4, cx * 31 + cy * 977);
    }
  }
  gold.fill(ctx, '#d0b04a', 0.13);
  cool.fill(ctx, '#5f8a5a', 0.1);
  ctx.restore();
  dark.stroke(ctx, DARK_BLADE, 0.6, 0.5);
  blades.stroke(ctx, BLADE, 0.65, 0.55);
  seeds.stroke(ctx, '#a07a3a', 1.7, 0.55);
  blooms.parsley.fill(ctx, '#fbf8ee', 0.9);
  blooms.daisy.fill(ctx, '#fbf8ee', 0.97);
  blooms.buttercup.fill(ctx, BUTTERCUP, 0.95);
  blooms.cornflower.fill(ctx, CORNFLOWER, 0.9);
  blooms.knapweed.fill(ctx, '#9a4fa0', 0.88);
  blooms.poppy.fill(ctx, POPPY, 0.92);
  yellow.fill(ctx, '#e8b830', 1);
  hearts.fill(ctx, '#2a2030', 0.85);
}

/** One flower's marks, added to its kind's batch. */
function flower(b: Blobs, kind: Kind, x: number, y: number, v: number, hearts: Blobs, yellow: Blobs): void {
  if (kind === 'poppy') {
    const r = 3.2 + v * 1.6;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + v * 3;
      b.add(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.7, r * 0.6, a);
    }
    hearts.add(x, y, 0.9);
  } else if (kind === 'daisy') {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      b.add(x + Math.cos(a) * 2.9, y + Math.sin(a) * 2.9, 1.8, 0.9, a);
    }
    yellow.add(x, y, 1.2);
  } else if (kind === 'parsley') {
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU + v;
      b.add(x + Math.cos(a) * 3.6 * (0.4 + ((k * 7) % 5) / 6), y + Math.sin(a) * 3.6 * (0.4 + ((k * 7) % 5) / 6), 0.85);
    }
  } else if (kind === 'cornflower') {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + v;
      b.add(x + Math.cos(a) * 2.1, y + Math.sin(a) * 2.1, 1.5, 0.9, a);
    }
  } else if (kind === 'buttercup') b.add(x, y, 1.8 + v * 0.8);
  else b.add(x, y, 1.8 + v, 1.6);
}

/** Stripes mown across the path along the groove: every other swathe a touch paler. */
function mowingStripes(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, high: number, low: number): void {
  const [a, b] = geo.range(Math.max(span.y0, high), Math.min(span.y1, low), MOWN + 30);
  if (b <= a) return;
  const { pts, nrm } = geo;
  const pale = new Path2D();
  for (let i = a - (a % 12); i < b; i += 12) {
    if ((i / 12) % 2 !== 0) continue;
    const j = Math.min(pts.length - 1, i + 6);
    const q = [i, j].flatMap((k) => [pt(pts[k]!.x + nrm[k]!.x * MOWN, pts[k]!.y + nrm[k]!.y * MOWN), pt(pts[k]!.x - nrm[k]!.x * MOWN, pts[k]!.y - nrm[k]!.y * MOWN)]);
    pale.moveTo(q[0]!.x, q[0]!.y);
    pale.lineTo(q[2]!.x, q[2]!.y);
    pale.lineTo(q[3]!.x, q[3]!.y);
    pale.lineTo(q[1]!.x, q[1]!.y);
    pale.closePath();
  }
  ctx.save();
  ctx.fillStyle = rgba(PAPER_FILL, 0.09);
  ctx.fill(pale);
  ctx.restore();
}
