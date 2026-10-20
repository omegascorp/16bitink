import { createRng, type Rng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { closed, type Draw, makeDraw, oval, pt, TAU } from '../kit';
import { PAPER_FILL, STONE, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { Blobs, eachRun, type Feature, type Geo, hash, seedOf, smoothstep, type Span } from './common';
import { BLOOMS, cloverLeaf, FALL, fallenLeaf, fern, pebble, shrub, treeCrown, tuft } from './flora';
import { courses, type Slab } from './paving';

/**
 * Chapter 1's band, "The Garden": a flagstone terrace by the house below
 * the garden wall, then the lawn the groove's path climbs, with deep
 * borders down both sides (shrubs in flower, ferns, a tree overhanging
 * from each edge), a bird bath, clover, fallen leaves and pebbles where
 * the lawn is quiet enough for them.
 */
const EARTH = '#8a6a4a';

/** One border bed down a side of the lawn. */
export interface Bed {
  readonly side: 1 | -1;
  readonly y0: number;
  readonly y1: number;
  /** The bed's edge against the lawn at world y. */
  edge(y: number): number;
  readonly outline: readonly Pt[];
  /** The lawn-side edge, top to bottom, for inking. */
  readonly rim: readonly Pt[];
}

export interface GardenPlan {
  readonly terrace: readonly Slab[];
  readonly beds: readonly Bed[];
  readonly under: readonly Feature[];
  readonly over: readonly Feature[];
}

function makeBed(geo: Geo, side: 1 | -1, y0: number, y1: number, salt: number): Bed {
  const ph = hash(salt, 1) * TAU;
  const ph2 = hash(salt, 2) * TAU;
  const edge = (y: number): number => {
    const ends = smoothstep(Math.min(y1 - y, y - y0) / 140);
    const reach = (150 + Math.sin(y / 170 + ph) * 70 + Math.sin(y / 61 + ph2) * 30) * (0.35 + 0.65 * ends);
    return side < 0 ? Math.min(reach, geo.grooveX(y) - 250) : Math.max(MAP.width - reach, geo.grooveX(y) + 250);
  };
  const rim: Pt[] = [];
  for (let y = y0; y <= y1; y += 10) rim.push(pt(edge(y), y));
  const off = side < 0 ? -40 : MAP.width + 40;
  return { side, y0, y1, edge, rim, outline: [pt(off, y0), ...rim, pt(off, y1)] };
}

export const inBed = (beds: readonly Bed[], x: number, y: number, margin = 0): boolean =>
  beds.some((b) => y > b.y0 && y < b.y1 && (b.side < 0 ? x < b.edge(y) + margin : x > b.edge(y) - margin));

/** Tries `n` random spots in a box, keeping those `ok` accepts. */
function scatter(rng: Rng, n: number, x0: number, x1: number, y0: number, y1: number, ok: (x: number, y: number) => boolean): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = pt(x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0));
    if (ok(p.x, p.y)) out.push(p);
  }
  return out;
}

/** A stone bird bath from above: a round basin of water on its pedestal, its shadow on the lawn. */
function birdBath(d: Draw, c: Pt): void {
  const { pen } = d;
  const rim = oval(c.x, c.y, 34, 34, 32);
  const water = oval(c.x, c.y, 25, 25, 28);
  pen.fill(oval(c.x + 22, c.y + 32, 30, 26, 24), d.ink, 0.12);
  pen.fill(rim, PAPER_FILL, 1);
  pen.fill(rim, STONE, 0.6);
  pen.crescent(rim, pt(-5, -7), () => pen.fill(rim, STONE_DARK, 0.4));
  pen.fill(water, '#9ec1cc', 0.75);
  pen.crescent(water, pt(5, 7), () => pen.fill(water, '#4f7d8f', 0.45));
  pen.hair(oval(c.x - 4, c.y - 6, 12, 7, 16).slice(9, 15), 1.2, PAPER_FILL, 0.85);
  pen.stroke(closed(water), 0.9, d.ink, 0.75);
  pen.stroke(closed(rim), 1.2, d.ink, 0.85);
  fallenLeaf(d, pt(c.x + 8, c.y + 6), 13, 0.7, FALL[1]);
}

/** A round island bed cut into the lawn: an edging of setts, dark soil, a shrub in flower at its heart, low flowers round it. */
function islandBed(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const soil = oval(c.x, c.y, r, r * 0.9, 40);
  pen.fill(soil, PAPER_FILL, 0.8);
  pen.fill(soil, EARTH, 0.35);
  pen.clipped(soil, () => pen.stipple(soil, 160, () => 0.8, 0.6, mix(EARTH, d.ink, 0.4)));
  pen.crescent(soil, pt(-6, -9), () => pen.fill(soil, mix(EARTH, d.ink, 0.3), 0.25));
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU;
    const p = pt(c.x + Math.cos(a) * (r + 4), c.y + Math.sin(a) * (r * 0.9 + 4));
    const sett = oval(p.x, p.y, 5.5, 4, 10);
    pen.fill(sett, PAPER_FILL, 1);
    pen.fill(sett, STONE, 0.5);
    pen.hair(closed(sett), 0.45, d.ink, 0.55);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + rng();
    flowerClump(d, pt(c.x + Math.cos(a) * r * 0.62, c.y + Math.sin(a) * r * 0.55), rng, BLOOMS[i % BLOOMS.length]!);
  }
  shrub(d, pt(c.x - 4, c.y - 4), r * 0.42, rng, '#d0607a');
}

/** A clump of low flowers with their leaves. */
function flowerClump(d: Draw, c: Pt, rng: Rng, colour: string): void {
  const { pen } = d;
  for (let i = 0; i < 6; i++) {
    const p = pt(c.x + (rng() - 0.5) * 30, c.y + (rng() - 0.5) * 22);
    const leaf = oval(p.x, p.y, 4 + rng() * 3, 2 + rng() * 1.5, 10).map((q) => pt(p.x + (q.x - p.x) * Math.cos(i) - (q.y - p.y) * Math.sin(i), p.y + (q.x - p.x) * Math.sin(i) + (q.y - p.y) * Math.cos(i)));
    pen.fill(leaf, '#5f8f4e', 0.6);
    pen.hair(closed(leaf), 0.35, d.ink, 0.45);
  }
  for (let i = 0; i < 7; i++) {
    const p = pt(c.x + (rng() - 0.5) * 26, c.y + (rng() - 0.5) * 18);
    pen.dot(p.x, p.y, 2.2 + rng() * 1.2, colour, 0.9);
    pen.dot(p.x - 0.6, p.y - 0.7, 0.7, PAPER_FILL, 0.7);
  }
}

/** Plants down one bed: shrubs, flower clumps and ferns, seeded by place. */
function bedPlants(bed: Bed, salt: number): Feature[] {
  const rng = createRng(seedOf(salt, 3));
  const out: Feature[] = [];
  let k = 0;
  for (let y = bed.y0 + 30 + rng() * 30; y < bed.y1 - 24; y += 38 + rng() * 40) {
    const e = bed.edge(y);
    const depth = bed.side < 0 ? e : MAP.width - e;
    if (depth < 50) continue;
    // A deep border takes two plants abreast: one at the back, one at the front.
    const spots = depth > 170 ? [0.25 + rng() * 0.15, 0.62 + rng() * 0.15] : [0.35 + rng() * 0.35];
    for (const along of spots) {
      const x = bed.side < 0 ? e * along : MAP.width - depth * along;
      const yy = y + (rng() - 0.5) * 24;
      const r = Math.min(50, 20 + rng() * 30, depth * 0.4);
      const kind = rng();
      const seed = seedOf(salt, 10, k++);
      if (kind < 0.6) {
        const bloom = rng() < 0.55 ? BLOOMS[Math.floor(rng() * BLOOMS.length)]! : null;
        out.push({ y: yy, r: r + 30, seed, draw: (d) => shrub(d, pt(x, yy), r, createRng(seed), bloom) });
      } else if (kind < 0.88) {
        const colour = BLOOMS[Math.floor(rng() * BLOOMS.length)]!;
        out.push({ y: yy, r: 30, seed, draw: (d) => flowerClump(d, pt(x, yy), createRng(seed), colour) });
      } else {
        const ang = bed.side < 0 ? -0.3 + rng() * 0.6 : Math.PI - 0.3 + rng() * 0.6;
        out.push({ y: yy, r: 110, seed, draw: (d) => fern(d, pt(x - bed.side * 30, yy), ang, 1.6, 85) });
      }
    }
  }
  return out;
}

/** Things on the open lawn, kept out of the groove's calm. */
function lawnThings(geo: Geo, beds: readonly Bed[], y0: number, y1: number, salt: number): Feature[] {
  const rng = createRng(seedOf(salt, 4));
  const out: Feature[] = [];
  const free = (x: number, y: number, r: number, busy = 0.35): boolean => geo.busy(x, y) > busy && !inBed(beds, x, y, r);
  const add = (p: Pt, r: number, draw: (d: Draw, rng: Rng) => void): void => {
    const seed = seedOf(salt, 20, out.length);
    out.push({ y: p.y, r, seed, draw: (d) => draw(d, createRng(seed)) });
  };
  const bath = scatter(rng, 40, 200, 1400, y0 + 300, y1 - 300, (x, y) => free(x, y, 50, 0.7))[0];
  if (bath) add(bath, 70, (d) => birdBath(d, bath));
  const isle = scatter(rng, 60, 200, 1400, y0 + 200, y1 - 200, (x, y) => free(x, y, 90, 0.8) && (!bath || Math.hypot(x - bath.x, y - bath.y) > 400))[0];
  if (isle) add(isle, 100, (d, r) => islandBed(d, isle, 74, r));
  for (const p of scatter(rng, 30, 0, MAP.width, y0, y1, (x, y) => free(x, y, 30))) {
    add(p, 40, (d, r) => {
      for (let i = 0; i < 6; i++) {
        const c = pt(p.x + (r() - 0.5) * 50, p.y + (r() - 0.5) * 34);
        cloverLeaf(d, c, 6 + r() * 4, r() * TAU);
      }
    });
  }
  for (const p of scatter(rng, 60, 0, MAP.width, y0, y1, (x, y) => free(x, y, 10, 0.25))) {
    const len = 18 + rng() * 14;
    const ang = rng() * TAU;
    const colour = FALL[Math.floor(rng() * FALL.length)]!;
    add(p, 30, (d) => fallenLeaf(d, p, len, ang, colour));
  }
  for (const p of scatter(rng, 70, 0, MAP.width, y0, y1, (x, y) => free(x, y, 0, 0.2))) add(p, 12, (d, r) => pebble(d, p, 2 + r() * 3, r));
  for (const p of scatter(rng, 60, 0, MAP.width, y0, y1, (x, y) => free(x, y, -8, 0.3))) add(p, 16, (d, r) => tuft(d, p, 9 + r() * 6, r));
  return out;
}

export function gardenPlan(geo: Geo, region: MapRegion): GardenPlan {
  const salt = 7000 + region.index * 101;
  const g = region.gate.y;
  const rng = createRng(seedOf(salt, 1));
  const terrace = courses(rng, -20, MAP.width + 20, g + 30, Math.min(region.bottom + 120, geo.layout.height - 132), salt, (x, y) => Math.max(geo.busy(x, y) * 0.6, smoothstep((Math.abs(x - MAP.mid) - 420) / 300)));
  const beds = [makeBed(geo, -1, region.top + 60, g - 14, salt + 1), makeBed(geo, 1, region.top + 40, g - 14, salt + 2)];
  const terraceLitter: Feature[] = [];
  for (let i = 0; i < 26; i++) {
    const p = pt(rng() * MAP.width, g + 40 + rng() * 180);
    if (geo.busy(p.x, p.y) < 0.3) continue;
    const seed = seedOf(salt, 50, i);
    const kind = rng();
    terraceLitter.push({ y: p.y, r: 30, seed, draw: (d) => (kind < 0.7 ? fallenLeaf(d, p, 16 + kind * 12, kind * 40, FALL[i % FALL.length]!) : pebble(d, p, 3, createRng(seed))) });
  }
  const under = [...terraceLitter, ...beds.flatMap((b, i) => bedPlants(b, salt + 10 + i)), ...lawnThings(geo, beds, region.top + 40, g - 30, salt)];
  const t1 = pt(-40, region.top + (region.bottom - region.top) * 0.45);
  const t2 = pt(MAP.width + 50, region.top + 260);
  const over: Feature[] = [
    { y: t1.y, r: 300, seed: seedOf(salt, 30), draw: (d) => treeCrown(d, t1, 210, createRng(seedOf(salt, 31))) },
    { y: t2.y, r: 280, seed: seedOf(salt, 32), draw: (d) => treeCrown(d, t2, 190, createRng(seedOf(salt, 33))) },
    { y: t1.y + 150, r: 120, seed: seedOf(salt, 34), draw: (d) => fern(d, pt(150, t1.y + 170), -0.2, 1.4, 95) },
  ];
  return { terrace, beds, under, over };
}

/** The beds' soil: a warm wash, grain, a darker lip along the lawn and an inked edge. */
export function paintBeds(ctx: CanvasRenderingContext2D, beds: readonly Bed[], span: Span, salt: number): void {
  beds.forEach((bed, i) => {
    if (bed.y1 < span.y0 - 20 || bed.y0 > span.y1 + 20) return;
    const shape = new Path2D();
    bed.outline.forEach((p, k) => (k === 0 ? shape.moveTo(p.x, p.y) : shape.lineTo(p.x, p.y)));
    shape.closePath();
    ctx.save();
    ctx.fillStyle = rgba(PAPER_FILL, 0.7);
    ctx.fill(shape);
    ctx.fillStyle = rgba(EARTH, 0.3);
    ctx.fill(shape);
    ctx.clip(shape);
    const grain = new Blobs();
    for (let y = Math.floor(span.y0 / 9) * 9 - 9; y < span.y1 + 9; y += 9) {
      const row = Math.floor(y / 9);
      for (let k = 0; k < 6; k++) {
        const x = bed.side < 0 ? hash(row, k, 50 + i) * 320 : MAP.width - hash(row, k, 50 + i) * 320;
        grain.add(x, y + hash(row, k, 60 + i) * 9, 0.7 + hash(row, k, 70) * 0.9);
      }
    }
    grain.fill(ctx, mix(EARTH, '#26316a', 0.4), 0.35);
    ctx.strokeStyle = rgba(mix(EARTH, '#26316a', 0.3), 0.22);
    ctx.lineWidth = 12;
    const lip = new Path2D();
    bed.rim.forEach((p, k) => (k === 0 ? lip.moveTo(p.x, p.y) : lip.lineTo(p.x, p.y)));
    ctx.stroke(lip);
    ctx.restore();
    eachRun(bed.rim, 14, span, 20, (part, k) => makeDraw(ctx, seedOf(salt, 40 + i, k), 0, 0).pen.stroke(part, 1, '#26316a', 0.55, false));
  });
}
