import { createRng, type Rng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { rgba } from '../wash';
import { type Band, boxPts, FeatureList, Placer } from './band';
import { Blobs, type Geo, hash, PATH_HALF, seedOf, type Span } from './common';
import { bench } from './meadowKit';
import { balustrade, boxHedge, fullMoon, moonDial, moonInWater, moths, nightStar, pathLantern, pool, topiary, yewColumn } from './nightKit';

/**
 * Chapter 10's band, "The Night Garden": the top of the climb, a formal
 * garden under a full moon. A moonlit gravel parterre the groove crosses,
 * compartments of clipped box with topiary at their corners and pale
 * night flowers glowing in them, a round reflecting pool with the moon in
 * it, the moon-dial, little lanterns lit along the way and fireflies. All
 * of it is glazed in deep indigo moonlight that deepens from dusk at the
 * gate into the night sky above, where the full moon and the stars are.
 */
const GRAVEL = '#cbc8bc';
const NIGHT_FLOWERS = ['#fbf8ee', '#f4eecc', '#e8e4f8'] as const;
const CLEAR = PATH_HALF + 64;

type Design = 'circle' | 'cross' | 'flowers';

interface Bed {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly design: Design;
}

interface Garden {
  readonly p: { x0: number; y0: number; x1: number; y1: number };
  readonly beds: readonly Bed[];
}

export function nightPlan(geo: Geo, region: MapRegion): Band {
  const salt = 17000 + region.index * 101;
  const rng = createRng(seedOf(salt, 1));
  const last = region.index === geo.layout.regions.length - 1;
  const p = { x0: 60, x1: MAP.width - 60, y0: region.top + 60, y1: region.gate.y - 110 };
  // The pool where the groove swings furthest out, on the far side of it; the compartments keep clear of it.
  let water = pt(MAP.mid, (p.y0 + p.y1) / 2);
  let far = -1;
  for (let y = p.y0 + 260; y < p.y1 - 260; y += 20) {
    const gx = (geo.grooveX(y - 120) + geo.grooveX(y) + geo.grooveX(y + 120)) / 3;
    const x = gx > MAP.mid ? gx - 300 : gx + 300;
    const room = Math.min(...[-140, -70, 0, 70, 140].map((dy) => Math.abs(geo.grooveX(y + dy) - x)));
    if (room > far) [far, water] = [room, pt(x, y)];
  }
  const beds = compartments(geo, p, rng, water);
  const garden: Garden = { p, beds };
  const under = new FeatureList(salt, 1);
  const over = new FeatureList(salt, 2);
  const inBed = (x: number, y: number, r: number): boolean => beds.some((b) => x + r > b.x0 - 20 && x - r < b.x1 + 20 && y + r > b.y0 - 20 && y - r < b.y1 + 20);
  const place = new Placer(geo, (x, y, r) => inBed(x, y, r) || y - r < p.y0 + 10 || y + r > p.y1 - 10 || x - r < p.x0 || x + r > p.x1);
  place.reserve(region.sign, 175);
  for (const b of beds) under.add((b.y0 + b.y1) / 2, (b.y1 - b.y0) / 2 + 60, (d, r) => bedHedges(d, b, r));
  // The terrace's balustrade along the top, open where the groove comes through, urns on its piers.
  const by = p.y0 + 4;
  const bx = geo.grooveX(by);
  for (const [a, z] of [[p.x0 + 20, bx - PATH_HALF - 34], [bx + PATH_HALF + 34, p.x1 - 20]] as const) if (z - a > 60) under.add(by - 30, 80, (d, r) => balustrade(d, a, z, by, r));
  // Yew columns flanking the way out onto the terrace and the way in from the gate.
  for (const [y, gx] of [[by + 70, geo.grooveX(by + 70)], [p.y1 - 6, geo.grooveX(p.y1 - 6)]] as const) {
    for (const sd of [-1, 1]) {
      const base = pt(gx + sd * (PATH_HALF + 46), y);
      place.reserve(base, 30);
      over.add(base.y - 50, 140, (d, r) => yewColumn(d, base, 28, 96, r));
    }
  }
  const box = { x0: p.x0 + 40, x1: p.x1 - 40, y0: p.y0 + 40, y1: p.y1 - 40 };
  place.reserve(water, 150);
  {
    under.add(water.y, 170, (d, r) => {
      poolApron(d, water, 132);
      pool(d, water, 84, r);
    });
    const seat = pt(water.x, water.y + 150);
    if (place.claim(seat, 40, 20)) under.add(seat.y, 50, (d, r) => bench(d, seat, 80, r));
  }
  const dial = place.take(rng, box, 50, 40, 60);
  if (dial) under.add(dial.y, 70, (d, r) => moonDial(d, dial, r));
  const standards: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const c = place.take(rng, box, 22, 30, 30);
    if (!c) continue;
    if (i % 2 === 0) under.add(c.y, 50, (d, r) => topiary(d, c, 16 + r() * 6, r() < 0.5, r));
    else {
      standards.push(c);
      under.add(c.y, 50, (d, r) => topiary(d, c, 17, false, r));
    }
  }
  // Moonlight over everything so far, deepening from dusk at the gate up into the sky.
  const top = last ? 0 : region.top - 60;
  const foot = region.gate.y + 150;
  for (let y = top; y < foot; y += 300) {
    const ya = y;
    const yb = Math.min(foot, y + 300);
    over.add((ya + yb) / 2, (yb - ya) / 2 + 2, (d) => veil(d.pen.ctx, ya, yb, region, top, foot));
  }
  for (const b of beds) over.add((b.y0 + b.y1) / 2, (b.y1 - b.y0) / 2 + 20, (d) => bedFlowers(d.pen.ctx, b));
  over.add(water.y, 200, (d) => moonInWater(d, pt(water.x - 18, water.y - 14), 22));
  for (const c of standards) over.add(c.y, 30, (d, r) => whiteRoses(d, c, r));
  lanterns(geo, region, over);
  for (let i = 0; i < 46; i++) {
    const c = pt(p.x0 + rng() * (p.x1 - p.x0), region.top + rng() * (region.gate.y - region.top));
    if (geo.busy(c.x, c.y) < 0.3) continue;
    const s = 1.2 + rng() * 1.2;
    over.add(c.y, 12, (d) => firefly(d.pen.ctx, c, s));
  }
  if (last) sky(region, rng, over);
  return {
    region,
    ground: (ctx, span) => paintParterre(ctx, span, garden),
    bare: (x, y) => x > p.x0 && x < p.x1 && y > p.y0 && y < p.y1,
    unpaved: [[p.y0 - 10, p.y1 + 10]],
    floor: () => undefined,
    under: under.list,
    over: over.list,
  };
}

/** Box compartments down the parterre's two sides, cut back to keep clear of the groove. */
function compartments(geo: Geo, p: { x0: number; y0: number; x1: number; y1: number }, rng: Rng, water: Pt): Bed[] {
  const out: Bed[] = [];
  const designs: Design[] = ['circle', 'flowers', 'cross'];
  const n = 4;
  const gap = 44;
  const h = (p.y1 - p.y0 - 60 - gap * (n - 1)) / n;
  for (let j = 0; j < n; j++) {
    const y0 = p.y0 + 30 + j * (h + gap);
    const y1 = y0 + h;
    let lo = Infinity;
    let hi = -Infinity;
    for (let y = y0 - 20; y <= y1 + 20; y += 8) {
      lo = Math.min(lo, geo.grooveX(y));
      hi = Math.max(hi, geo.grooveX(y));
    }
    const pond = Math.abs(water.y - (y0 + y1) / 2) < h / 2 + 150;
    const left = { x0: p.x0 + 34, x1: Math.min(p.x0 + 34 + 330, lo - CLEAR, pond && water.x < MAP.mid ? water.x - 160 : Infinity) };
    const right = { x0: Math.max(p.x1 - 34 - 330, hi + CLEAR, pond && water.x > MAP.mid ? water.x + 160 : -Infinity), x1: p.x1 - 34 };
    for (const [k, s] of [left, right].entries()) {
      if (s.x1 - s.x0 < 170) continue;
      out.push({ x0: s.x0, x1: s.x1, y0, y1, design: designs[(j + k + Math.floor(rng() * 3)) % 3]! });
    }
  }
  return out;
}

/** A compartment's box: its border, the inner pattern, topiary cones at its corners. */
function bedHedges(d: Draw, b: Bed, rng: Rng): void {
  const W = 14;
  boxHedge(d, boxPts(b.x0, b.y0, b.x1, b.y1, 12), W, rng);
  const c = pt((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2);
  const r = Math.min(b.x1 - b.x0, b.y1 - b.y0) * 0.3;
  if (b.design === 'circle') {
    boxHedge(d, Array.from({ length: 28 }, (_, k) => pt(c.x + Math.cos((k / 28) * TAU) * r, c.y + Math.sin((k / 28) * TAU) * r)), W - 2, rng);
    topiary(d, c, 15, false, rng);
  } else if (b.design === 'cross') {
    for (const [a, z] of [[pt(b.x0 + 20, b.y0 + 20), pt(b.x1 - 20, b.y1 - 20)], [pt(b.x1 - 20, b.y0 + 20), pt(b.x0 + 20, b.y1 - 20)]] as const) boxHedge(d, [a, pt((a.x + z.x) / 2, (a.y + z.y) / 2), z, pt((a.x + z.x) / 2, (a.y + z.y) / 2)], W - 3, rng);
    topiary(d, c, 13, true, rng);
  }
  for (const [x, y] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]] as const) topiary(d, pt(x, y), 12, true, rng);
}

/** The moonlight: a multiplied indigo glaze over a stretch of rows, its strength set by one gradient for the whole band. */
function veil(ctx: CanvasRenderingContext2D, ya: number, yb: number, region: MapRegion, top: number, foot: number): void {
  const g = ctx.createLinearGradient(0, top, 0, foot);
  const at = (y: number): number => Math.max(0, Math.min(1, (y - top) / (foot - top)));
  g.addColorStop(0, 'rgba(34,42,104,0.95)');
  g.addColorStop(at(region.top + 40), 'rgba(70,82,150,0.92)');
  g.addColorStop(at(region.gate.y - 140), 'rgba(96,106,170,0.88)');
  g.addColorStop(at(region.gate.y + 30), 'rgba(140,146,200,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = g;
  ctx.fillRect(-50, ya, MAP.width + 100, yb - ya);
  ctx.restore();
}

/** Pale night flowers in a compartment, glowing a little in the dark (painted over the veil). */
function bedFlowers(ctx: CanvasRenderingContext2D, b: Bed): void {
  const glow = new Blobs();
  const petals = NIGHT_FLOWERS.map(() => new Blobs());
  const hearts = new Blobs();
  const c = pt((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2);
  const r = Math.min(b.x1 - b.x0, b.y1 - b.y0) * 0.3;
  for (let y = b.y0 + 18; y < b.y1 - 14; y += 9) {
    for (let x = b.x0 + 18; x < b.x1 - 14; x += 9) {
      const h = hash(Math.floor(x), Math.floor(y), 951);
      const dc = Math.hypot(x - c.x, y - c.y);
      if (b.design === 'circle' && Math.abs(dc - r) < 16) continue;
      if (b.design === 'circle' && dc < 26) continue;
      if (b.design === 'cross') {
        const u = (x - b.x0) / (b.x1 - b.x0);
        const v = (y - b.y0) / (b.y1 - b.y0);
        if (Math.abs(u - v) * (b.x1 - b.x0) < 18 || Math.abs(u + v - 1) * (b.x1 - b.x0) < 18) continue;
      }
      if (h > (b.design === 'flowers' ? 0.55 : 0.32)) continue;
      const px = x + (hash(Math.floor(x), Math.floor(y), 952) - 0.5) * 7;
      const py = y + (hash(Math.floor(x), Math.floor(y), 953) - 0.5) * 7;
      if (h < 0.08) glow.blot(px, py, 14, 11, 0, Math.floor(px * 3 + py));
      const k = Math.floor(hash(Math.floor(x), Math.floor(y), 954) * 3);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + h * 9;
        petals[k]!.add(px + Math.cos(a) * 2.2, py + Math.sin(a) * 2.2, 1.7, 1.1, a);
      }
      hearts.add(px, py, 0.8);
    }
  }
  glow.fill(ctx, '#f4f0dc', 0.08);
  petals.forEach((p, i) => p.fill(ctx, NIGHT_FLOWERS[i]!, 0.82));
  hearts.fill(ctx, '#e8d070', 0.9);
}

/** Lanterns along the groove, every so often on alternate sides, kept clear of the pockets. */
function lanterns(geo: Geo, region: MapRegion, over: FeatureList): void {
  const { pts, nrm } = geo;
  const nodes = geo.layout.nodes.filter((n) => n.region === region.index);
  let acc = 0;
  let side = 1;
  for (let i = geo.index(region.gate.y - 40); i < geo.index(region.top + 20); i++) {
    acc += Math.hypot(pts[i + 1]!.x - pts[i]!.x, pts[i + 1]!.y - pts[i]!.y);
    if (acc < 150) continue;
    const c = pt(pts[i]!.x + nrm[i]!.x * side * (PATH_HALF + 26), pts[i]!.y + nrm[i]!.y * side * (PATH_HALF + 26));
    if (nodes.some((n) => Math.hypot(n.x - c.x, n.y - c.y) < 84)) continue;
    acc = 0;
    side = -side as 1 | -1;
    const seed = seedOf(c.x, c.y);
    over.add(c.y, 100, (d) => {
      pathLantern(d, c);
      if (hash(seed, 1) < 0.5) moths(d, c, createRng(seed));
    });
  }
}

function firefly(ctx: CanvasRenderingContext2D, c: Pt, s: number): void {
  ctx.save();
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, s * 5);
  g.addColorStop(0, 'rgba(230,255,160,0.9)');
  g.addColorStop(0.25, 'rgba(210,250,140,0.35)');
  g.addColorStop(1, 'rgba(200,240,120,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, s * 5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Above the garden: the full moon over the pencilled one, stars, and the Plough picked out. */
function sky(region: MapRegion, rng: Rng, over: FeatureList): void {
  const moon = pt(MAP.width - 330, 130);
  over.add(moon.y, 200, (d) => fullMoon(d, moon, 64));
  const plough = [pt(180, 70), pt(240, 92), pt(300, 88), pt(352, 112), pt(360, 168), pt(440, 176), pt(450, 128)];
  for (const s of plough) over.add(s.y, 12, (d) => nightStar(d, s, 6));
  for (let i = 0; i < 70; i++) {
    const c = pt(30 + rng() * (MAP.width - 60), 14 + rng() ** 1.5 * (region.top + 10));
    if (Math.abs(c.x - MAP.mid) < 70 || Math.hypot(c.x - moon.x, c.y - moon.y) < 110) continue;
    const s = 1.5 + rng() * 3.5;
    over.add(c.y, 10, (d) => nightStar(d, c, s));
  }
}

/** The parterre's moonlit gravel, the grass inside each compartment. */
function paintParterre(ctx: CanvasRenderingContext2D, span: Span, g: Garden): void {
  const { p } = g;
  if (span.y1 < p.y0 - 10 || span.y0 > p.y1 + 10) return;
  const ya = Math.max(span.y0 - 4, p.y0);
  const yb = Math.min(span.y1 + 4, p.y1);
  ctx.save();
  const area = new Path2D();
  area.roundRect(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0, 40);
  ctx.fillStyle = rgba(PAPER_FILL, 0.55);
  ctx.fill(area);
  ctx.fillStyle = rgba(GRAVEL, 0.55);
  ctx.fill(area);
  ctx.strokeStyle = rgba('#26316a', 0.35);
  ctx.lineWidth = 1.2;
  ctx.stroke(area);
  ctx.clip(area);
  const grit = new Blobs();
  const pale = new Blobs();
  for (let y = Math.floor(ya / 6) * 6; y < yb; y += 6) {
    const row = Math.floor(y / 6);
    for (let k = 0; k < 60; k++) {
      const x = p.x0 + hash(row, k, 961) * (p.x1 - p.x0);
      (hash(row, k, 962) < 0.5 ? grit : pale).add(x, y + hash(row, k, 963) * 6, 0.6 + hash(row, k, 964) * 0.9);
    }
  }
  grit.fill(ctx, '#5a5a6a', 0.3);
  pale.fill(ctx, PAPER_FILL, 0.6);
  for (const b of g.beds) {
    if (b.y1 < span.y0 || b.y0 > span.y1) continue;
    ctx.fillStyle = rgba('#6f9a6a', 0.4);
    ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  }
  ctx.restore();
}

/** A broad ring of pale flags round the pool, laid in a circle with joints radiating like a compass rose. */
function poolApron(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const ring = Array.from({ length: 64 }, (_, k) => pt(c.x + Math.cos((k / 64) * TAU) * r, c.y + Math.sin((k / 64) * TAU) * r * 0.9));
  pen.fill(ring, PAPER_FILL, 0.9);
  pen.fill(ring, '#d8d4c8', 0.6);
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * TAU;
    const r0 = k % 4 === 0 ? 40 : 96;
    pen.hair([pt(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0 * 0.9), pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.9)], k % 4 === 0 ? 0.9 : 0.5, d.ink, k % 4 === 0 ? 0.5 : 0.35);
  }
  pen.hair([...ring, ring[0]!].map((p) => pt(c.x + (p.x - c.x) * 0.82, c.y + (p.y - c.y) * 0.82)), 0.5, d.ink, 0.4);
  pen.stroke([...ring, ring[0]!], 1, d.ink, 0.7);
}

/** White roses on a clipped standard, glowing in the moonlight (painted over the veil). */
function whiteRoses(d: Draw, c: Pt, rng: Rng): void {
  for (let k = 0; k < 11; k++) {
    const a = rng() * TAU;
    const kk = 15 * Math.sqrt(rng());
    const p = pt(c.x + Math.cos(a) * kk, c.y + Math.sin(a) * kk);
    for (let i = 0; i < 5; i++) {
      const b = (i / 5) * TAU + a;
      d.pen.dot(p.x + Math.cos(b) * 1.8, p.y + Math.sin(b) * 1.8, 1.6, '#fbf8ee', 0.92);
    }
  }
}
