import { createRng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { pt, TAU } from '../kit';
import { LEAF } from '../palette';
import { mix, rgba } from '../wash';
import { type Band, FeatureList, Placer } from './band';
import { Blobs, type Geo, hash, seedOf, type Span, Ticks } from './common';
import { basket, crate, type FruitKind, fruitTree, hive, ladder } from './orchardKit';

/**
 * Chapter 4's band, "The Orchard": rows of apple, pear and plum trees
 * across the band, each row standing in a strip of long grass full of
 * wildflowers, with mown grass paths between the rows and along the
 * groove. A ladder leans into one tree; baskets and a crate of picked fruit
 * wait on the paths; a beehive stands out in the long grass at the side.
 */
const LONG = '#a3a94f';
const BLADE = mix(LEAF, '#7a6a2a', 0.3);
/** Rows of trees, from the gate up. */
const FIRST_ROW = 230;
const ROW_GAP = 262;
/** Half the long grass strip's height round a row. */
const STRIP = 92;
/** How far either side of the groove the grass is kept mown. */
const MOWN = 120;
const CELL = 13;
const FLOWERS = ['#e9c23b', '#f2efe6', '#5b7fc7', '#d0607a', '#c7637f'] as const;

interface Row {
  readonly y: number;
  readonly kind: FruitKind;
  /** The mown corridor round the groove across this strip. */
  readonly cutL: number;
  readonly cutR: number;
  readonly ph: number;
}

export function orchardPlan(geo: Geo, region: MapRegion): Band {
  const salt = 11000 + region.index * 101;
  const rng = createRng(seedOf(salt, 1));
  const kinds: FruitKind[] = ['apple', 'pear', 'plum'];
  const rows: Row[] = [];
  for (let j = 0, y = region.gate.y - FIRST_ROW; y > region.top + 170; j++, y -= ROW_GAP) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let yy = y - STRIP - 20; yy <= y + STRIP + 20; yy += 8) {
      const x = geo.grooveX(yy);
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
    rows.push({ y, kind: kinds[(j + Math.floor(hash(salt, 2) * 3)) % 3]!, cutL: lo - MOWN, cutR: hi + MOWN, ph: rng() * TAU });
  }
  const edge = (r: Row, x: number, side: 1 | -1): number => r.y + side * (STRIP + Math.sin(x / 140 + r.ph + side * 2) * 18 + Math.sin(x / 47 + r.ph * 2 + side) * 7 + Math.sin(x / 17 + side) * 2.5);
  const inLong = (x: number, y: number): boolean => rows.some((r) => Math.abs(y - r.y) < STRIP + 30 && (x < r.cutL || x > r.cutR) && y > edge(r, x, -1) && y < edge(r, x, 1));
  const [under, over] = orchardThings(geo, region, rows, inLong, salt);
  return {
    region,
    ground: (ctx, span) => paintLongGrass(ctx, span, rows, edge, inLong),
    bare: inLong,
    unpaved: [],
    floor: () => undefined,
    under,
    over,
  };
}

/** The long grass strips: a warmer wash, ragged at its ends, then blades and wildflowers batched over it. */
function paintLongGrass(ctx: CanvasRenderingContext2D, span: Span, rows: readonly Row[], edge: (r: Row, x: number, side: 1 | -1) => number, inLong: (x: number, y: number) => boolean): void {
  const near = rows.filter((r) => r.y + STRIP + 30 > span.y0 && r.y - STRIP - 30 < span.y1);
  if (near.length === 0) return;
  const wash = new Path2D();
  const cap = (p: Path2D, r: Row, x: number, dir: 1 | -1): void => {
    for (const [px, py] of capPoints(r, x, dir, edge(r, x, -1), edge(r, x, 1))) p.lineTo(px, py);
  };
  for (const r of near) {
    for (const [a, b] of [[-50, r.cutL], [r.cutR, MAP.width + 50]] as const) {
      if (b - a < 20) continue;
      // Ragged along the top and bottom, rounded off where the mown path cuts through.
      for (let x = a; x <= b; x += 10) (x === a ? wash.moveTo(x, edge(r, x, -1)) : wash.lineTo(x, edge(r, x, -1)));
      if (b === r.cutL) cap(wash, r, b, 1);
      for (let x = b; x >= a; x -= 10) wash.lineTo(x, edge(r, x, 1));
      if (a === r.cutR) cap(wash, r, a, -1);
      wash.closePath();
    }
  }
  ctx.save();
  ctx.fillStyle = rgba(LONG, 0.2);
  ctx.fill(wash);
  ctx.strokeStyle = rgba(mix(LONG, '#2f5a33', 0.4), 0.18);
  ctx.lineWidth = 3;
  ctx.stroke(wash);
  ctx.restore();
  const blades = new Ticks();
  const seeds = new Ticks();
  const flowers = FLOWERS.map(() => new Blobs());
  const hearts = new Blobs();
  const y0 = Math.max(span.y0 - 20, Math.min(...near.map((r) => r.y - STRIP - 16)));
  const y1 = Math.min(span.y1 + 20, Math.max(...near.map((r) => r.y + STRIP + 16)));
  for (let cy = Math.floor(y0 / CELL); cy * CELL < y1; cy++) {
    for (let cx = 0; cx * CELL < MAP.width; cx++) {
      const x = (cx + hash(cx, cy, 301)) * CELL;
      const y = (cy + hash(cx, cy, 302)) * CELL;
      if (!inLong(x, y)) continue;
      const v = hash(cx, cy, 303);
      if (v < 0.075) {
        const f = Math.floor(hash(cx, cy, 304) * FLOWERS.length);
        const blob = flowers[f]!;
        if (f === 1) {
          for (let k = 0; k < 7; k++) {
            const a = (k / 7) * TAU;
            blob.add(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 1.8, 1.1, a);
          }
          hearts.add(x, y, 1.2);
        } else blob.add(x, y, 2.1 + hash(cx, cy, 305), 1.9);
        continue;
      }
      // A little fan of tall blades, some with seed heads.
      const n = 2 + Math.floor(hash(cx, cy, 306) * 3);
      for (let k = 0; k < n; k++) {
        const bx = x + (k - n / 2) * 2.2;
        const lean = (hash(cx, cy, 310 + k) - 0.5) * 6;
        const h = 7 + hash(cx, cy, 320 + k) * 7;
        blades.add(bx, y, bx + lean, y - h);
        if (hash(cx, cy, 330 + k) < 0.12) seeds.add(bx + lean, y - h, bx + lean * 1.2, y - h - 3);
      }
    }
  }
  blades.stroke(ctx, BLADE, 0.6, 0.5);
  seeds.stroke(ctx, '#a07a3a', 1.6, 0.5);
  flowers.forEach((f, i) => f.fill(ctx, FLOWERS[i]!, 0.9));
  hearts.fill(ctx, '#e6b34a', 0.95);
}

/** The strip's end where the mown path cuts it: a ragged bulge from its top edge round to its bottom (dir 1) or back up (dir -1). */
function capPoints(r: Row, x: number, dir: 1 | -1, top: number, bottom: number): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 1; k < 12; k++) {
    const u = k / 12;
    const y = dir > 0 ? top + (bottom - top) * u : bottom + (top - bottom) * u;
    const bulge = Math.sin(Math.PI * u) * 26 + Math.sin(y / 9 + r.ph) * 4 + Math.sin(y / 23 + r.ph * 3) * 6;
    out.push([x + dir * bulge, y]);
  }
  return out;
}

/** Trees along each row (`over`), and the ladder, baskets, crate and hive (`under`, except the ladder in its tree). */
function orchardThings(geo: Geo, region: MapRegion, rows: readonly Row[], inLong: (x: number, y: number) => boolean, salt: number): [FeatureList['list'], FeatureList['list']] {
  const rng = createRng(seedOf(salt, 3));
  const under = new FeatureList(salt, 1);
  const over = new FeatureList(salt, 2);
  const place = new Placer(geo);
  place.reserve(region.sign, 175);
  place.reserve(region.gate, 110);
  const trees: { c: ReturnType<typeof pt>; r: number; kind: FruitKind }[] = [];
  rows.forEach((row, j) => {
    for (let x = 90 + (j % 2) * 115 + rng() * 30; x < MAP.width - 60; x += 220 + rng() * 40) {
      const r = (row.kind === 'plum' ? 64 : 74) + rng() * 18;
      const c = pt(x, row.y + (rng() - 0.5) * 24);
      if (!place.claim(c, r, 55, 0.95)) continue;
      trees.push({ c, r, kind: row.kind });
    }
  });
  // The ladder goes up into one tree, from the side away from the groove.
  const pick = trees.filter((t) => geo.busy(t.c.x, t.c.y) > 0.9 && t.c.x > 150 && t.c.x < MAP.width - 150);
  const climbed = pick[Math.floor(hash(salt, 5) * pick.length)];
  trees.forEach((t, k) => {
    over.add(t.c.y, t.r * 1.6, (d) => fruitTree(d, t.c, t.r, t.kind, createRng(seedOf(salt, 40, k))));
    if (t !== climbed) return;
    const dir = t.c.x < MAP.mid ? -1 : 1;
    const foot = pt(t.c.x + dir * (t.r + 46), t.c.y + t.r * 0.6);
    const top = pt(t.c.x + dir * t.r * 0.25, t.c.y + t.r * 0.05);
    over.add(t.c.y, t.r + 80, (d) => ladder(d, foot, top));
    place.reserve(foot, 30);
    under.add(foot.y + 18, 50, (d, r) => basket(d, pt(foot.x + dir * 40, foot.y + 30), 25, t.kind, r));
  });
  // Baskets and a crate on the mown paths between rows; the hive out in the long grass at a side.
  const between = rows.slice(0, -1).map((r) => r.y - ROW_GAP / 2);
  for (let i = 0; i < 5; i++) {
    const y = between[i % Math.max(1, between.length)];
    if (y === undefined) break;
    const c = place.take(rng, { x0: 80, x1: MAP.width - 80, y0: y - 30, y1: y + 30 }, 30, 45, 40);
    if (!c) continue;
    const kind = rows[Math.min(rows.length - 1, i % rows.length)]!.kind;
    if (i === 2) under.add(c.y, 60, (d, r) => crate(d, c, (r() - 0.5) * 0.5, kind, r));
    else under.add(c.y, 50, (d, r) => basket(d, c, 24 + r() * 5, kind, r));
  }
  for (const row of rows) {
    if (hash(salt, row.y, 7) > 0.4) continue;
    const side = hash(salt, row.y, 8) < 0.5 ? -1 : 1;
    const c = pt(side < 0 ? 58 : MAP.width - 58, row.y + (hash(salt, row.y, 9) - 0.5) * 60);
    if (!inLong(c.x, c.y) || !place.claim(c, 40, 60)) continue;
    under.add(c.y, 70, (d) => hive(d, c));
    break;
  }
  return [under.list, over.list];
}
