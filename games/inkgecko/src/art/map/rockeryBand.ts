import { createRng, type Rng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { closed, makeDraw, pt, TAU } from '../kit';
import { PAPER_FILL, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { type Band, FeatureList, Placer } from './band';
import { Blobs, eachRun, type Geo, hash, seedOf, type Span, Ticks, tracePath } from './common';
import { boulder as pencilBoulder, bush as pencilBush, construction } from './draftKit';
import { lilyPad, steppingStone } from './flora';
import { raggedEdge } from './ground';
import { ALPINE, boulder, conifer, cushion, sedges } from './rockeryKit';

/**
 * Chapter 5's band, "The Rockery": a rock garden climbing the slope in
 * tiers, each tier's edge set with stones and its face in shadow; gravel
 * scree between boulders, cushions of alpines and dwarf conifers; a little
 * rill running down one side from a spring among the rocks to a pool with
 * stepping stones. Towards the top the paint gives out and the rocks are
 * only pencilled, fading into the chapters still being drawn.
 */
const GRAVEL = '#c9bda3';
const WATER = '#a5c6c9';
const DEEP = '#3f6f86';
const SHADE = '#2c4f5c';
/** Tiers up the slope, from the gate. */
const FIRST_TIER = 300;
const TIER_GAP = 360;
/** Where the rockery is the last chapter painted, above region.top + FADE it is only pencilled. */
const FADE = 300;
const SCREE_CELL = 170;

export interface RockeryShape {
  /** Spine of the rill, spring to pool, with its half-width at each point. */
  readonly rill: readonly Pt[];
  readonly rillHalf: readonly number[];
  readonly pool: readonly Pt[];
  readonly poolC: Pt;
  wet(x: number, y: number, pad?: number): boolean;
}

export function rockeryPlan(geo: Geo, region: MapRegion): Band {
  const salt = 12000 + region.index * 101;
  const rng = createRng(seedOf(salt, 1));
  const next = geo.layout.regions[region.index + 1];
  const fades = !next || next.chapter.place === 'draft';
  const fade = region.top + (fades ? FADE : 60);
  const side = hash(salt, 2) < 0.5 ? 1 : -1;
  const sx = (x: number): number => (side > 0 ? x : MAP.width - x);
  const tiers: { y: number; ph: number; ph2: number }[] = [];
  for (let y = region.gate.y - FIRST_TIER; y > region.top + 120; y -= TIER_GAP) tiers.push({ y, ph: rng() * TAU, ph2: rng() * TAU });
  const tierY = (t: { y: number; ph: number; ph2: number }, x: number): number => t.y + Math.sin(x / 230 + t.ph) * 26 + Math.sin(x / 83 + t.ph2) * 7;
  const water = waterShape(region, fade, sx, salt);
  const shape = { tiers, tierY, fade, fades, water };
  const [under, over] = rockeryThings(geo, region, shape, salt);
  return {
    region,
    ground: (ctx, span) => paintSlope(ctx, geo, span, region, shape, salt),
    bare: (x, y) => water.wet(x, y, 8),
    unpaved: [],
    floor: (ctx, span) => paintWater(ctx, span, water, tiers, tierY, salt),
    under,
    over,
  };
}

type Tier = { y: number; ph: number; ph2: number };
interface Shape {
  readonly tiers: readonly Tier[];
  tierY(t: Tier, x: number): number;
  readonly fade: number;
  /** The paint gives out at the top, into the drafts. */
  readonly fades: boolean;
  readonly water: RockeryShape;
}

function waterShape(region: MapRegion, fade: number, sx: (x: number) => number, salt: number): RockeryShape {
  const ph = hash(salt, 3) * TAU;
  const ph2 = hash(salt, 4) * TAU;
  const poolC = pt(sx(1335), region.gate.y - 470);
  const rx = 96;
  const ry = 62;
  const pool = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * TAU;
    const k = 1 + Math.sin(a * 2 + ph) * 0.1 + Math.sin(a * 3 + ph2) * 0.06;
    return pt(poolC.x + Math.cos(a) * rx * k, poolC.y + Math.sin(a) * ry * k);
  });
  const y0 = fade + 60;
  const y1 = poolC.y - ry * 0.7;
  const rill: Pt[] = [];
  const half: number[] = [];
  for (let y = y0; y <= y1; y += 14) {
    const u = (y - y0) / (y1 - y0);
    const base = sx(1445) + (poolC.x - sx(1445)) * u;
    rill.push(pt(base + Math.sin(y / 70 + ph) * 34 + Math.sin(y / 26 + ph2) * 7, y));
    half.push(7 + u * 4 + Math.sin(y / 50 + ph) * 2);
  }
  const inPool = (x: number, y: number, pad: number): boolean => ((x - poolC.x) / (rx * 1.1 + pad)) ** 2 + ((y - poolC.y) / (ry * 1.1 + pad)) ** 2 < 1;
  const wet = (x: number, y: number, pad = 0): boolean => {
    if (inPool(x, y, pad)) return true;
    if (y < y0 - 20 - pad || y > y1 + 20 + pad) return false;
    const i = Math.max(0, Math.min(rill.length - 1, Math.round((y - y0) / 14)));
    return Math.abs(x - rill[i]!.x) < half[i]! + pad + 4;
  };
  return { rill, rillHalf: half, pool, poolC, wet };
}

/** The slope: each tier's face in shadow below its edge and its lip catching the light, scree between the rocks. */
function paintSlope(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, region: MapRegion, s: Shape, salt: number): void {
  if (span.y1 < region.top || span.y0 > region.bottom) return;
  ctx.save();
  // Towards the top the lawn's wash thins out to paper, as if the painter had stopped there.
  if (s.fades && span.y0 < region.top + FADE) {
    const g = ctx.createLinearGradient(0, region.top + FADE, 0, region.top);
    g.addColorStop(0, rgba(PAPER_FILL, 0));
    g.addColorStop(0.6, rgba(PAPER_FILL, 0.45));
    g.addColorStop(1, rgba(PAPER_FILL, 0.7));
    // Only over the lawn: below its ragged top edge (the sheet's top is this band's top + 24).
    const lawn = new Path2D();
    for (let x = -50; x <= MAP.width + 50; x += 10) (x === -50 ? lawn.moveTo(x, raggedEdge(x, region.top + 24, 3)) : lawn.lineTo(x, raggedEdge(x, region.top + 24, 3)));
    lawn.lineTo(MAP.width + 50, region.top + FADE);
    lawn.lineTo(-50, region.top + FADE);
    lawn.closePath();
    ctx.fillStyle = g;
    ctx.fill(lawn);
  }
  for (const t of s.tiers) {
    if (t.y < s.fade || t.y - 70 > span.y1 || t.y + 70 < span.y0) continue;
    const below = new Path2D();
    const lip = new Path2D();
    for (let x = -50; x <= MAP.width + 50; x += 12) (x === -50 ? below.moveTo(x, s.tierY(t, x)) : below.lineTo(x, s.tierY(t, x)));
    for (let x = MAP.width + 50; x >= -50; x -= 12) below.lineTo(x, s.tierY(t, x) + 38 + Math.sin(x / 41) * 6);
    below.closePath();
    for (let x = -50; x <= MAP.width + 50; x += 12) (x === -50 ? lip.moveTo(x, s.tierY(t, x) - 46) : lip.lineTo(x, s.tierY(t, x) - 46));
    for (let x = MAP.width + 50; x >= -50; x -= 12) lip.lineTo(x, s.tierY(t, x));
    lip.closePath();
    ctx.fillStyle = rgba(mix(STONE_DARK, '#2f5a33', 0.4), 0.13);
    ctx.fill(below);
    ctx.fillStyle = rgba(PAPER_FILL, 0.16);
    ctx.fill(lip);
  }
  // Scree: ragged blots of gravel out of the calm, grit sprinkled through them.
  const scree = new Blobs();
  const path = new Path2D();
  for (let cy = Math.floor((span.y0 - SCREE_CELL) / SCREE_CELL); cy <= Math.floor((span.y1 + SCREE_CELL) / SCREE_CELL); cy++) {
    for (let cx = 0; cx * SCREE_CELL < MAP.width + SCREE_CELL; cx++) {
      const x = (cx + hash(cx, cy, 501)) * SCREE_CELL;
      const y = (cy + hash(cx, cy, 502)) * SCREE_CELL;
      if (y < s.fade + 60 || y > region.gate.y - 60 || hash(cx, cy, 503) > 0.8 || geo.busy(x, y) < 0.35) continue;
      const rx = 70 + hash(cx, cy, 504) * 90;
      const ry = 34 + hash(cx, cy, 505) * 34;
      scree.blot(x, y, rx, ry, (hash(cx, cy, 506) - 0.5) * 0.6, cx * 211 + cy * 13 + salt);
      tracePath(path, Array.from({ length: 16 }, (_, i) => pt(x + Math.cos((i / 16) * TAU) * rx, y + Math.sin((i / 16) * TAU) * ry)));
    }
  }
  scree.fill(ctx, PAPER_FILL, 0.4);
  scree.fill(ctx, GRAVEL, 0.5);
  ctx.clip(path);
  const grit = new Blobs();
  const dark = new Blobs();
  for (let y = Math.floor((span.y0 - 4) / 7) * 7; y < span.y1 + 4; y += 7) {
    const row = Math.floor(y / 7);
    for (let k = 0; k < 90; k++) {
      const x = hash(row, k, 511) * MAP.width;
      (hash(row, k, 512) < 0.3 ? dark : grit).add(x, y + hash(row, k, 513) * 7, 0.7 + hash(row, k, 514) * 1.3, 0.6 + hash(row, k, 515) * 1);
    }
  }
  grit.fill(ctx, mix(GRAVEL, '#ffffff', 0.3), 0.6);
  dark.fill(ctx, mix(STONE_DARK, '#26316a', 0.3), 0.4);
  ctx.restore();
}

/** The rill and the pool: water washed in, deeper down the middle, banks inked, a white tumble where the rill drops over each tier. */
function paintWater(ctx: CanvasRenderingContext2D, span: Span, w: RockeryShape, tiers: readonly Tier[], tierY: (t: Tier, x: number) => number, salt: number): void {
  const top = w.rill[0]!.y - 20;
  const bottom = w.poolC.y + 90;
  if (span.y1 < top || span.y0 > bottom) return;
  const left: Pt[] = [];
  const right: Pt[] = [];
  w.rill.forEach((p, i) => {
    const q = w.rill[Math.min(w.rill.length - 1, i + 1)]!;
    const o = w.rill[Math.max(0, i - 1)]!;
    const l = Math.hypot(q.x - o.x, q.y - o.y) || 1;
    const n = pt(-(q.y - o.y) / l, (q.x - o.x) / l);
    left.push(pt(p.x + n.x * w.rillHalf[i]!, p.y + n.y * w.rillHalf[i]!));
    right.push(pt(p.x - n.x * w.rillHalf[i]!, p.y - n.y * w.rillHalf[i]!));
  });
  const water = new Path2D();
  tracePath(water, [...left, ...[...right].reverse()]);
  tracePath(water, w.pool);
  ctx.save();
  ctx.fillStyle = rgba(SHADE, 0.2);
  ctx.translate(4, 6);
  ctx.fill(water, 'nonzero');
  ctx.translate(-4, -6);
  ctx.fillStyle = PAPER_FILL;
  ctx.fill(water);
  ctx.fillStyle = rgba(WATER, 0.7);
  ctx.fill(water);
  ctx.clip(water);
  const g = ctx.createRadialGradient(w.poolC.x + 10, w.poolC.y + 8, 10, w.poolC.x, w.poolC.y, 100);
  g.addColorStop(0, rgba(DEEP, 0.4));
  g.addColorStop(1, rgba(DEEP, 0.05));
  ctx.fillStyle = g;
  ctx.fillRect(w.poolC.x - 130, w.poolC.y - 90, 260, 180);
  ctx.strokeStyle = rgba(DEEP, 0.25);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  w.rill.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  const shine = new Ticks();
  w.rill.forEach((p, i) => {
    if (i % 3 === 0) shine.add(p.x - 3, p.y - 2 + hash(i, 1, salt) * 4, p.x + 2, p.y + 3);
  });
  for (let k = 0; k < 6; k++) {
    const x = w.poolC.x - 60 + hash(k, 2, salt) * 110;
    const y = w.poolC.y - 40 + hash(k, 3, salt) * 70;
    shine.add(x, y, x + 14 + hash(k, 4, salt) * 16, y + 0.5);
  }
  shine.stroke(ctx, PAPER_FILL, 1, 0.7);
  ctx.restore();
  // Tumbles where the rill drops over a tier's edge.
  const foam = new Blobs();
  for (const t of tiers) {
    const i = w.rill.findIndex((p) => p.y > tierY(t, p.x));
    if (i <= 0 || i >= w.rill.length - 2) continue;
    for (let k = 0; k < 9; k++) {
      const p = w.rill[i + (k % 2)]!;
      foam.add(p.x + (hash(k, 5, t.y) - 0.5) * w.rillHalf[i]! * 1.4, p.y + (hash(k, 6, t.y) - 0.2) * 14, 1.6 + hash(k, 7, t.y) * 1.6);
    }
  }
  foam.fill(ctx, PAPER_FILL, 0.9);
  // Banks inked in fixed runs.
  [left, right, closed(w.pool)].forEach((line, j) =>
    eachRun(line, 14, span, 20, (part, k) => {
      const { pen } = makeDraw(ctx, seedOf(salt, 60 + j, k), 0, 0);
      pen.stroke(part, 0.95, '#26316a', 0.75, false);
      pen.hair(part.map((p) => pt(p.x + 2, p.y + 3)), 0.45, SHADE, 0.3);
    }),
  );
}

/** Rocks along the tiers and scattered between, alpines, conifers, the spring and the pool's furniture; pencil sketches near the top. */
function rockeryThings(geo: Geo, region: MapRegion, s: Shape, salt: number): [FeatureList['list'], FeatureList['list']] {
  const rng = createRng(seedOf(salt, 5));
  const under = new FeatureList(salt, 1);
  const over = new FeatureList(salt, 2);
  const { water } = s;
  const place = new Placer(geo, (x, y, r) => water.wet(x, y, r + 6) || y - r < s.fade + 10 || y + r > region.gate.y - 40);
  place.reserve(region.sign, 175);
  const rock = (c: Pt, r: number, list: FeatureList = under): void => list.add(c.y, r * 1.8 + 10, (d, q) => boulder(d, c, r, q));
  // The spring among rocks at the rill's head; flat stones round the pool; stepping stones over the rill.
  const head = water.rill[0]!;
  for (let k = 0; k < 4; k++) {
    const a = -Math.PI / 2 + (k - 1.5) * 0.9;
    const r = 18 + rng() * 14;
    const c = pt(head.x + Math.cos(a) * (r + 12), head.y + Math.sin(a) * (r + 8) - 6);
    if (place.claim(c, r, 30, 0.85)) rock(c, r);
  }
  water.pool.forEach((p, i) => {
    if (i % 3 !== 0 || hash(i, 9, salt) < 0.25) return;
    const c = pt(water.poolC.x + (p.x - water.poolC.x) * 1.12, water.poolC.y + (p.y - water.poolC.y) * 1.16);
    const r = 9 + hash(i, 10, salt) * 9;
    place.reserve(c, r);
    rock(c, r);
  });
  const ford = water.rill[Math.floor(water.rill.length * 0.55)]!;
  for (let k = -1; k <= 1; k++) {
    const c = pt(ford.x + k * 15, ford.y + k * 3);
    under.add(c.y, 20, (d, q) => steppingStone(d, c, 9, q));
  }
  place.reserve(ford, 30);
  for (let k = 0; k < 3; k++) {
    const c = pt(water.poolC.x - 40 + hash(k, 11, salt) * 80, water.poolC.y - 25 + hash(k, 12, salt) * 50);
    under.add(c.y, 24, (d, q) => lilyPad(d, c, 10 + q() * 5, q() * TAU, q, k === 0 ? '#f2efe6' : null));
  }
  for (let k = 0; k < 6; k++) {
    const a = 0.5 + (k / 6) * TAU;
    const c = pt(water.poolC.x + Math.cos(a) * 118, water.poolC.y + Math.sin(a) * 82);
    if (geo.busy(c.x, c.y) > 0.6 && hash(k, 13, salt) < 0.7) under.add(c.y, 26, (d, q) => sedges(d, c, 16, q));
  }
  // Outcrops along each painted tier's edge: rocks bedded together, the biggest mid-way, a drift of alpines spilling below.
  const drift = (c: Pt, n: number, size: number): void => {
    const colour = ALPINE[Math.floor(rng() * ALPINE.length)]!;
    for (let k = 0; k < n; k++) {
      const r = size * (0.6 + rng() * 0.5);
      const p = pt(c.x + (rng() - 0.5) * size * 3.2, c.y + (rng() - 0.5) * size * 1.8);
      if (place.claim(p, r, 22, 0.9)) under.add(p.y, r * 1.5, (d, q) => cushion(d, p, r, colour, q));
    }
  };
  for (const t of s.tiers) {
    if (t.y < s.fade + 40) continue;
    for (let x = 20 + rng() * 60; x < MAP.width - 40; ) {
      const len = 150 + rng() * 210;
      const rocks: { c: Pt; r: number }[] = [];
      for (let xx = x; xx < Math.min(MAP.width + 20, x + len); ) {
        const u = (xx - x) / len;
        const r = (14 + rng() * 22) * (0.7 + 0.6 * Math.sin(Math.PI * u));
        const c = pt(xx + r * 0.8, s.tierY(t, xx + r * 0.8) + (rng() - 0.5) * 18 - r * 0.15);
        if (place.claim(c, r, 22, 0.7)) rocks.push({ c, r });
        xx += r * 1.35 + rng() * 10;
      }
      rocks.sort((a, b) => a.c.y - b.c.y).forEach((k) => rock(k.c, k.r));
      if (rocks.length > 1) drift(pt(x + len * (0.3 + rng() * 0.4), s.tierY(t, x + len / 2) + 46), 3 + Math.floor(rng() * 3), 17);
      x += len + 70 + rng() * 150;
    }
  }
  const box = { x0: 40, x1: MAP.width - 40, y0: s.fade, y1: region.gate.y - 50 };
  for (let i = 0; i < 10; i++) {
    const r = 34 + rng() * 26;
    const c = place.take(rng, box, r, 45, 40);
    if (!c) continue;
    rock(c, r, over);
    // A satellite or two bedded at its foot, and alpines tucked against it.
    for (let k = 0; k < 2; k++) {
      const a = 0.2 + rng() * 2.4;
      const rr = r * (0.3 + rng() * 0.25);
      const p = pt(c.x + Math.cos(a) * (r + rr * 0.6), c.y + Math.sin(a) * (r * 0.8 + rr * 0.5));
      if (place.claim(p, rr, 22, 0.6)) rock(p, rr, over);
    }
    drift(pt(c.x + (rng() - 0.5) * r, c.y - r - 16), 2 + Math.floor(rng() * 2), 15);
  }
  for (let i = 0; i < 8; i++) {
    const r = 14 + rng() * 11;
    const c = place.take(rng, box, r, 35, 30);
    if (c) under.add(c.y, r * 2, (d, q) => conifer(d, c, r, q));
  }
  for (let i = 0, made = 0; i < 200 && made < 18; i++) {
    const c = pt(box.x0 + rng() * (box.x1 - box.x0), box.y0 + rng() * (box.y1 - box.y0));
    if (!place.fits(c, 30, 24)) continue;
    drift(c, 3 + Math.floor(rng() * 3), 15 + rng() * 6);
    made++;
  }
  for (let i = 0; i < 36; i++) {
    const r = 3 + rng() * 5;
    const c = place.take(rng, box, r, 20, 10);
    if (c) rock(c, r);
  }
  if (s.fades) pencilTop(geo, region, s, rng, over);
  return [under.list, over.list];
}

/** Near the top, the rockery only pencilled: rocks, cushions and the tier's line laid out, thinning upwards. */
function pencilTop(geo: Geo, region: MapRegion, s: Shape, rng: Rng, out: FeatureList): void {
  const place = new Placer(geo);
  const y0 = region.top + 40;
  const y1 = s.fade + 70;
  for (let i = 0; i < 40; i++) {
    const big = i < 12;
    const r = big ? 22 + rng() * 22 : 9 + rng() * 8;
    const c = place.take(rng, { x0: 40, x1: MAP.width - 40, y0, y1 }, r, 30, 20, 1.1);
    if (!c) continue;
    const done = 0.45 + rng() * 0.55 * ((c.y - y0) / (y1 - y0));
    out.add(c.y, r * 2 + 30, (d, q) => (big ? pencilBoulder(d, c, r, q, done) : pencilBush(d, c, r, q, done)));
  }
  for (const t of s.tiers) {
    if (t.y >= s.fade + 40) continue;
    for (let x = 0; x < MAP.width; x += 200) {
      const a = pt(x, s.tierY(t, x));
      const b = pt(x + 200, s.tierY(t, x + 200));
      if (geo.dist((a.x + b.x) / 2, (a.y + b.y) / 2, 200) < 110) continue;
      out.add(a.y, 60, (d) => construction(d, a, b, 10));
    }
  }
}
