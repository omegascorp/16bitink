import type { Rng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import type { BandMaker } from './band';
import { blob, type Brush, note, polar } from './brush';
import { type Geo, hash, PENCIL, type Span, Ticks } from './common';
import { type CanopyLook, paintCanopy } from './canopy';
import { cellRows } from './paper';
import { type PlaceKit, placeBand } from './placeBand';
import { bush, reeds } from './plants';
import { brainCoral, seaFan, staghorn } from './rocks';
import { frondTop, giant, wadingTree } from './trees';
import { lilyPad, ripple, waterBody, type WaterLook } from './water';

/**
 * The wet chapters' bands: the Rainforest (a canopy of great crowns and
 * tree ferns, a river winding down one side), the Reef (open turquoise
 * water over coral heads, the trail running along a sand bar, a sand cay
 * with palms) and the Flooded Forest (dark still water among standing
 * trees, lily pads and reeds, the trail on a mud levee).
 */
const LEAF_NEST: readonly [string, string, string] = ['#8a6a3a', '#5a3a20', '#b89a5a'];
const RIVER: WaterLook = { shallow: '#8fb7a5', deep: '#3f6f68', bank: '#6a5a40' };

/** The river's middle and half-width at world y in a band: down the right side, from the band's top to the creek at its gate. */
function riverAt(region: MapRegion, y: number): [number, number] {
  const x = MAP.width - 300 + hash(region.index, 51) * 80;
  const [p1, p2] = [hash(region.index, 52) * 6.28, hash(region.index, 53) * 6.28];
  return [x + Math.sin(y / 190 + p1) * 60 + Math.sin(y / 71 + p2) * 14, 30 + Math.sin(y / 120 + p2) * 8];
}

function riverShape(region: MapRegion): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let y = region.top - 20; y <= region.gate.y + 10; y += 16) {
    const [cx, half] = riverAt(region, y);
    left.push(pt(cx - half, y));
    right.push(pt(cx + half, y));
  }
  return [...left, ...right.reverse()];
}

const RAIN_CANOPY: CanopyLook = { leaf: '#5f9a4e', deep: '#2a5530', lit: '#c4dc8a', r: [24, 44], fill: 0.72, clear: 120 };
const FLOOD_CANOPY: CanopyLook = { leaf: '#6a9356', deep: '#2f4a33', lit: '#c0d490', r: [22, 40], fill: 0.42, clear: 115 };

const rainforest: PlaceKit = {
  salt: 5000,
  wash: { colour: '#5a8a4c', alpha: 0.42, deep: ['#2f5a33', '#7aa05a'], bloom: 1.4 },
  marks: { tick: '#2f5a33', grain: '#2f4a2a', density: 0.45, flower: ['#e05a6a', '#f2d060', 0.02] },
  notes: ['emergent tree', 'strangler fig', 'canopy giant'],
  trail: { bed: '#7a5a3c', mark: '#3a2a1a', fringe: '#3f6b3a', nest: LEAF_NEST },
  ground: (ctx, geo, span, region, draft) => paintCanopy(ctx, geo, span, region, RAIN_CANOPY, draft, 5100, (x, y, r) => y < region.gate.y + 40 && Math.abs(x - riverAt(region, y)[0]) < riverAt(region, y)[1] + r * 0.7),
  lay: ({ under, place, region }) => {
    const shape = riverShape(region);
    const x = riverAt(region, region.top + 300)[0];
    for (let y = region.top; y < region.gate.y; y += 40) place.reserve(pt(riverAt(region, y)[0], y), 70);
    under.add((region.top + region.gate.y) / 2, (region.gate.y - region.top) / 2 + 60, (b, r) => {
      waterBody(b, shape, RIVER, r, 60);
      if (b.draft) note(b, pt(x - 110, region.top + 300), pt(x - 40, region.top + 290), 'river');
    });
  },
  tiers: [
    { motifs: [(b, c, s, r) => giant(b, c, s, r)], count: 14, size: 82, busy: 0.4 },
    { motifs: [(b, c, s, r) => giant(b, c, s, r, '#5f9a4e'), (b, c, s, r) => frondTop(b, c, s, r)], count: 20, size: 42, busy: 0.28 },
    { motifs: [(b, c, s, r) => frondTop(b, c, s, r, '#6fa05a'), (b, c, s, r) => bush(b, c, s, r, '#4f8a46', r() < 0.3 ? '#e05a6a' : null)], count: 26, size: 18, busy: 0.16 },
  ],
};

/** A raised bank winding along the trail through water: sand or mud, wavering in width, foam or a dark line at its edge. */
/** Path samples over which a bank narrows away at each end of its band. */
const BANK_TAPER = 60;

function bankAlong(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, region: MapRegion, half: number, colour: string, edge: string, draft: boolean, salt: number): void {
  const [a, b] = geo.range(span.y0, span.y1, half + 60);
  const i0 = Math.max(a, geo.index(region.bottom + 10));
  const i1 = Math.min(b, geo.index(region.top - 10));
  if (i1 - i0 < 2) return;
  const { pts, nrm } = geo;
  // It narrows to nothing at the band's ends (counted from the region, not the chunk, so seams never show).
  const rb = geo.index(region.bottom + 10);
  const rt = geo.index(region.top - 10);
  const taper = (i: number): number => {
    const t = Math.max(0, Math.min(1, Math.min(i - rb, rt - i) / BANK_TAPER));
    return t * t * (3 - 2 * t);
  };
  const w = (i: number, side: number): number => (half + Math.sin(i * 0.045 + side + salt) * 18 + Math.sin(i * 0.13 + side * 2) * 7) * taper(i);
  const edgeOf = (side: number): Pt[] => {
    const out: Pt[] = [];
    for (let i = i0; i <= i1; i += 2) out.push(pt(pts[i]!.x + nrm[i]!.x * side * w(i, side), pts[i]!.y + nrm[i]!.y * side * w(i, side)));
    return out;
  };
  const l = edgeOf(1);
  const r = edgeOf(-1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-50, region.top, MAP.width + 100, region.bottom - region.top);
  ctx.clip();
  if (!draft) {
    const shape = new Path2D();
    [...l, ...[...r].reverse()].forEach((p, k) => (k === 0 ? shape.moveTo(p.x, p.y) : shape.lineTo(p.x, p.y)));
    shape.closePath();
    ctx.fillStyle = rgba(PAPER_FILL, 0.9);
    ctx.fill(shape);
    ctx.fillStyle = rgba(colour, 0.7);
    ctx.fill(shape);
  }
  for (const side of [l, r]) {
    const line = new Ticks();
    for (let k = 0; k + 1 < side.length; k++) if (hash(k, salt, 3) > 0.12) line.add(side[k]!.x, side[k]!.y, side[k + 1]!.x, side[k + 1]!.y);
    line.stroke(ctx, draft ? PENCIL : edge, draft ? 0.7 : 1.4, draft ? 0.55 : 0.6);
    if (!draft) {
      const foam = new Ticks();
      for (let k = 0; k + 1 < side.length; k += 3) foam.add(side[k]!.x + 3, side[k]!.y + 4, side[k + 1]!.x + 3, side[k + 1]!.y + 4);
      foam.stroke(ctx, PAPER_FILL, 1.2, 0.6);
    }
  }
  ctx.restore();
}

/** Wave dashes over open water, seeded per world cell, thinning near the trail. */
function waterMarks(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, region: MapRegion, ink: string, lit: boolean, salt: number): void {
  const CELL = 44;
  const dark = new Ticks();
  const light = new Ticks();
  const [r0, r1] = cellRows(span, CELL, 20);
  for (let cy = Math.max(r0, Math.floor(region.top / CELL)); cy <= Math.min(r1, Math.floor(region.bottom / CELL)); cy++) {
    for (let cx = 0; cx * CELL < MAP.width; cx++) {
      if (hash(cx, cy, salt) > 0.34) continue;
      const x = (cx + hash(cx, cy, salt + 1)) * CELL;
      const y = (cy + hash(cx, cy, salt + 2)) * CELL;
      if (geo.dist(x, y, 140) < 120 || geo.onLabel(x, y, 10)) continue;
      const l = 6 + hash(cx, cy, salt + 3) * 10;
      const t = hash(cx, cy, salt + 4) < 0.5 && lit ? light : dark;
      t.curve(x - l, y, x, y - 2.5, x + l, y);
    }
  }
  dark.stroke(ctx, ink, 0.6, 0.4);
  light.stroke(ctx, PAPER_FILL, 1.2, 0.6);
}

/** A coral garden: a few heads of brain coral, staghorn and fans together. */
function coralGarden(b: Brush, c: Pt, s: number, rng: Rng): void {
  for (let i = 0; i < 6; i++) {
    const p = polar(c, rng() * Math.PI * 2, s * 0.7 * Math.sqrt(rng()));
    const k = rng();
    if (k < 0.4) brainCoral(b, p, s * (0.18 + rng() * 0.12), rng);
    else if (k < 0.75) staghorn(b, p, s * (0.3 + rng() * 0.15), rng, rng() < 0.5 ? '#c98a6a' : '#d8a050');
    else seaFan(b, p, s * 0.3, rng);
  }
}

/** A sand cay: a low island of white sand ringed by shallows, a couple of palms on it. */
function sandCay(b: Brush, c: Pt, s: number, rng: Rng): void {
  const shallows = blob(c, s * 1.35, s * 0.85, rng, 0.2, 30);
  const sand = blob(c, s, s * 0.6, rng, 0.18, 30);
  b.tint(shallows, '#c8eee6', 0.6);
  b.line(shallows, 0.5, 0.3);
  b.body(sand, '#f2e6c0', 0.85);
  b.shade(sand, s * 0.15, '#c8b07a', 0.3);
  b.edge(sand, 1, 0.75);
  for (let i = 0; i < 2 + Math.floor(rng() * 2); i++) frondTop(b, polar(c, rng() * 6.28, s * 0.35), s * 0.32, rng, '#6f9a4e');
}

const reef: PlaceKit = {
  salt: 6000,
  wash: { colour: '#7cc6c6', alpha: 0.5, deep: ['#3f9ab0', '#5ab0b8'], bloom: 1.3 },
  notes: ['coral heads', 'staghorn', 'coral garden'],
  trail: { bed: '#d8c49a', mark: '#9a845a', fringe: null, nest: ['#b8a070', '#7a6a40', '#e0d0a0'] },
  ground: (ctx, geo, span, region, draft) => {
    waterMarks(ctx, geo, span, region, draft ? PENCIL : '#2f7a90', !draft, 610);
    bankAlong(ctx, geo, span, region, 92, '#f0e4bc', '#c8a870', draft, 6);
  },
  bare: () => true,
  lay: ({ over, place, rng, region }) => {
    const s = 90;
    const c = place.take(rng, { x0: 60, x1: 360, y0: region.top + 200, y1: region.bottom - 400 }, s * 1.3, 40, 40) ?? place.take(rng, { x0: MAP.width - 360, x1: MAP.width - 60, y0: region.top + 200, y1: region.bottom - 400 }, s * 1.3, 40, 40);
    if (c) over.add(c.y, s * 1.6, (b, r) => {
      sandCay(b, c, s, r);
      if (b.draft) note(b, pt(c.x, c.y + s + 20), pt(c.x, c.y + s * 0.62), 'sand cay');
    });
  },
  tiers: [
    { motifs: [coralGarden], count: 9, size: 90, busy: 0.4, flat: true },
    { motifs: [(b, c, s, r) => brainCoral(b, c, s * 0.5, r), (b, c, s, r) => staghorn(b, c, s * 0.8, r)], count: 18, size: 32, busy: 0.3, flat: true },
    { motifs: [(b, c, s, r) => seaFan(b, c, s, r), (b, c, s, r) => fishShoal(b, c, s, r)], count: 18, size: 16, busy: 0.25, flat: true },
  ],
};

/** A little shoal of fish glimpsed under the water: slim shapes all heading one way. */
function fishShoal(b: Brush, c: Pt, s: number, rng: Rng): void {
  const a = rng() * Math.PI * 2;
  for (let i = 0; i < 5; i++) {
    const p = polar(c, rng() * 6.28, s * rng());
    const head = polar(p, a, 4);
    const tail = polar(p, a + Math.PI, 4);
    b.line([tail, p, head], 1.4, 0.55, '#e0903a');
    b.line([tail, polar(tail, a + Math.PI - 0.5, 2.5)], 0.6, 0.5);
    b.line([tail, polar(tail, a + Math.PI + 0.5, 2.5)], 0.6, 0.5);
  }
}

const BLACKWATER: WaterLook = { shallow: '#8a9a7a', deep: '#3a4a3a', bank: '#6a5a3a' };

/** A raft of lily pads, a flower or two among them. */
function lilyRaft(b: Brush, c: Pt, s: number, rng: Rng): void {
  for (let i = 0; i < 6; i++) lilyPad(b, polar(c, rng() * 6.28, s * Math.sqrt(rng())), 6 + rng() * 6, rng, rng() < 0.25 ? '#f2d6e0' : null);
  if (rng() < 0.4) ripple(b, polar(c, 1, s * 0.6), 10, rng);
}

/** A stand of flooded trees, the furthest drawn first. */
function floodedStand(b: Brush, c: Pt, s: number, rng: Rng): void {
  const trees = Array.from({ length: 2 + Math.floor(rng() * 2) }, () => ({ p: polar(c, rng() * 6.28, s * 0.5 * rng()), r: s * (0.45 + rng() * 0.2) }));
  trees.sort((p, q) => p.p.y - q.p.y);
  for (const t of trees) wadingTree(b, t.p, t.r, rng);
}

const flooded: PlaceKit = {
  salt: 9500,
  wash: { colour: '#7f977a', alpha: 0.5, deep: ['#3f5a44', '#6a8a6a'], bloom: 1.2 },
  notes: ['drowned trees', 'flooded stand', 'igapó'],
  trail: { bed: '#8a7a56', mark: '#4a3a2a', fringe: mix('#5f7a4a', '#26316a', 0.2), nest: ['#a89a5a', '#6a5a30', '#d0c080'] },
  ground: (ctx, geo, span, region, draft) => {
    waterMarks(ctx, geo, span, region, draft ? PENCIL : '#2a3a2e', !draft, 950);
    bankAlong(ctx, geo, span, region, 70, '#a8a070', '#5a4a30', draft, 9);
    paintCanopy(ctx, geo, span, region, FLOOD_CANOPY, draft, 9600);
  },
  bare: () => true,
  tiers: [
    { motifs: [floodedStand], count: 9, size: 90, busy: 0.4 },
    { motifs: [(b, c, s, r) => wadingTree(b, c, s, r), lilyRaft], count: 16, size: 42, busy: 0.3 },
    { motifs: [(b, c, s, r) => lilyPad(b, c, s * 0.5, r, r() < 0.3 ? '#f2d6e0' : null), (b, c, s, r) => reeds(b, c, s * 1.4, r)], count: 24, size: 18, busy: 0.22 },
  ],
};

const make = (kit: PlaceKit): BandMaker => (geo: Geo, region: MapRegion, draft: boolean) => placeBand(kit, geo, region, draft);

export const WET_BANDS = { rainforest: make(rainforest), reef: make(reef), flooded: make(flooded) } as const;
