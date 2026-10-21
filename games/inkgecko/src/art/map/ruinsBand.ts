import { createRng, type Rng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { makeDraw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { type Band, FeatureList, Placer } from './band';
import { type Geo, hash, PATH_HALF, seedOf, type Span } from './common';
import { fern, treeCrown, tuft } from './flora';
import { courses, jointMoss, paintSlab, type Slab, slabTouches } from './paving';
import { column, fallenColumn, mosaic, rubble, sideRuin, stump, toppledUrn, wallRuin, wildRose } from './ruinsKit';

/**
 * Chapter 9's band, "The Ruins": the roofless shell of an old garden
 * chapel the groove runs up through, its flagstone floor cracked and
 * gapped with grass, low walls of dressed stone broken off at odd heights,
 * an arcade of columns down each side (some standing, some stumps, some
 * fallen in their drums), mosaic still showing where the flags are lost.
 * Beside it a round temple folly is falling down about its own mosaic
 * floor; wild roses scramble over the stones, ivy climbs, ferns grow in
 * the cracks, a young birch has seeded in the nave and an urn lies tipped
 * over in the grass.
 */
interface Chapel {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly floor: readonly Slab[];
}

export function ruinsPlan(geo: Geo, region: MapRegion): Band {
  const salt = 16000 + region.index * 101;
  const rng = createRng(seedOf(salt, 1));
  const x0 = 420;
  const x1 = MAP.width - 420;
  const y0 = region.top + 150;
  const y1 = region.gate.y - 360;
  // Flags inside the chapel, some lost to the grass.
  const all = courses(rng, x0 + 14, x1 - 14, y0 + 14, y1 - 6, salt + 5, () => 0.9);
  const floor = all.filter((s) => hash(s.seed, 3) > 0.16);
  const chapel: Chapel = { x0, x1, y0, y1, floor };
  const under = new FeatureList(salt, 1);
  const over = new FeatureList(salt, 2);
  const place = new Placer(geo);
  place.reserve(region.sign, 175);
  place.reserve(region.gate, 120);
  fabric(geo, chapel, rng, place, under, over);
  const side = geo.grooveX((y0 + y1) / 2) > MAP.mid ? -1 : 1;
  folly(geo, chapel, side, rng, place, under, over);
  grounds(geo, region, chapel, rng, place, under, over);
  const inside = (x: number, y: number): boolean => x > x0 && x < x1 && y > y0 && y < y1;
  return {
    region,
    ground: () => undefined,
    bare: (x, y) => inside(x, y) && floor.some((s) => Math.abs(s.cx - x) < 70 && Math.abs(s.cy - y) < 60),
    unpaved: [[y0 + 10, y1 - 4]],
    floor: (ctx, span) => paintFloor(ctx, span, chapel),
    under: under.list,
    over: over.list,
  };
}

function paintFloor(ctx: CanvasRenderingContext2D, span: Span, c: Chapel): void {
  if (span.y1 < c.y0 - 20 || span.y0 > c.y1 + 20) return;
  const slabs = c.floor.filter((s) => slabTouches(span, s));
  ctx.save();
  ctx.beginPath();
  ctx.rect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);
  ctx.clip();
  slabs.forEach((s) => paintSlab(makeDraw(ctx, s.seed, 0, 0), s));
  jointMoss(ctx, slabs, span);
  ctx.restore();
}

/** The chapel's walls, its arcades, mosaic where the flags are gone, a birch in the nave. */
function fabric(geo: Geo, c: Chapel, rng: Rng, place: Placer, under: FeatureList, over: FeatureList): void {
  for (const x of [c.x0, c.x1]) {
    for (let y = c.y0 + 10; y < c.y1 - 20; ) {
      const len = 120 + rng() * 160;
      const ya = y;
      const yb = Math.min(c.y1 - 10, y + len);
      over.add((ya + yb) / 2, (yb - ya) / 2 + 30, (d, r) => sideRuin(d, x, ya, yb, r));
      place.reserve(pt(x, (ya + yb) / 2), 30);
      y = yb + 30 + rng() * 60;
    }
  }
  const back = geo.grooveX(c.y0);
  const front = geo.grooveX(c.y1);
  const gap = PATH_HALF + 24;
  for (const [y, gx] of [[c.y0 + 8, back], [c.y1 + 6, front]] as const) {
    for (const [a, b] of [[c.x0 - 10, gx - gap], [gx + gap, c.x1 + 10]] as const) {
      const ya = y;
      if (b - a > 40) over.add(ya - 30, 80, (d, r) => wallRuin(d, a, b, ya, r));
    }
  }
  // The arcades: a column every so often down each side, standing, broken off, or fallen into the nave.
  for (const side of [-1, 1] as const) {
    const x = side < 0 ? c.x0 + 62 : c.x1 - 62;
    for (let y = c.y0 + 110, k = 0; y < c.y1 - 60; y += 150, k++) {
      const p = pt(x, y);
      const v = hash(seedOf(c.x0, side, k), 7);
      if (geo.dist(p.x, p.y, 200) < PATH_HALF + 30) continue;
      place.reserve(p, 34);
      if (v < 0.4) {
        const h = 80 + rng() * 80;
        const cap = rng() < 0.3;
        over.add(p.y - h / 2, h + 40, (d, r) => column(d, p, 30, h, cap, r));
      } else if (v < 0.75) under.add(p.y, 40, (d, r) => stump(d, p, 13, r));
      else {
        const lie = pt(x + side * -30, y + 30);
        under.add(lie.y, 90, (d, r) => fallenColumn(d, lie, Math.PI / 2 + side * 0.5, 3, 12, r));
      }
    }
  }
  const nave = { x0: c.x0 + 100, x1: c.x1 - 100, y0: c.y0 + 70, y1: c.y1 - 70 };
  for (let i = 0; i < 2; i++) {
    const m = place.take(rng, nave, 56, 40, 40);
    if (m) {
      const seed = seedOf(c.y0, 11, i);
      under.add(m.y, 70, (d) => mosaic(d, m, 54, seed));
    }
  }
  const birch = place.take(rng, nave, 50, 50, 40);
  if (birch) over.add(birch.y, 100, (d, r) => treeCrown(d, birch, 56, r));
  for (let i = 0; i < 6; i++) {
    const f = place.take(rng, nave, 14, 30, 20);
    if (f) {
      const a = rng() * TAU;
      under.add(f.y, 40, (d) => fern(d, f, a, 2.4, 18, 5));
    }
  }
}

/** The round temple folly to one side: its stepped platform, mosaic floor, a ring of columns in all states. */
function folly(geo: Geo, c: Chapel, side: 1 | -1, rng: Rng, place: Placer, under: FeatureList, over: FeatureList): void {
  const cx = side < 0 ? 215 : MAP.width - 215;
  let cy = (c.y0 + c.y1) / 2;
  let best = -1;
  for (let y = c.y0 + 160; y < c.y1 - 160; y += 40) {
    const far = Math.abs(geo.grooveX(y) - cx);
    if (far > best) [best, cy] = [far, y];
  }
  const centre = pt(cx, cy);
  place.reserve(centre, 150);
  const seed = seedOf(c.y1, 21);
  under.add(cy, 140, (d) => {
    const { pen } = d;
    for (const [r, a] of [[128, 0.65], [112, 0.75]] as const) {
      const ring = Array.from({ length: 48 }, (_, k) => pt(cx + Math.cos((k / 48) * TAU) * r, cy + Math.sin((k / 48) * TAU) * r * 0.92));
      pen.fill(ring.map((p) => pt(p.x + 8, p.y + 10)), d.ink, 0.12);
      pen.fill(ring, '#fffaf0', 1);
      pen.fill(ring, '#cfc6b0', a);
      pen.crescent(ring, pt(-4, -6), () => pen.fill(ring, '#8f8676', 0.35));
      pen.stroke([...ring, ring[0]!], 1, d.ink, 0.8);
      for (let k = 0; k < 24; k++) {
        const t = (k / 24) * TAU;
        pen.hair([pt(cx + Math.cos(t) * (r - 14), cy + Math.sin(t) * (r - 14) * 0.92), pt(cx + Math.cos(t) * r, cy + Math.sin(t) * r * 0.92)], 0.4, d.ink, 0.45);
      }
    }
    mosaic(d, centre, 84, seed);
  });
  const ring: { p: Pt; kind: number }[] = [];
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * TAU + 0.2;
    ring.push({ p: pt(cx + Math.cos(t) * 104, cy + Math.sin(t) * 96), kind: Math.floor(hash(seed, k) * 3) });
  }
  ring.sort((a, b) => a.p.y - b.p.y);
  for (const { p, kind } of ring) {
    if (kind === 0) {
      const h = 90 + rng() * 70;
      const cap = rng() < 0.5;
      over.add(p.y - h / 2, h + 50, (d, r) => column(d, p, 26, h, cap, r));
    } else if (kind === 1) under.add(p.y, 30, (d, r) => stump(d, p, 11, r));
    else {
      const a = Math.atan2(p.y - cy, p.x - cx);
      const lie = pt(p.x + Math.cos(a) * 50, p.y + Math.sin(a) * 46);
      under.add(lie.y, 80, (d, r) => fallenColumn(d, lie, a, 3, 11, r));
    }
  }
  for (let k = 0; k < 2; k++) {
    const a = rng() * TAU;
    const rc = pt(cx + Math.cos(a) * 150, cy + Math.sin(a) * 130);
    under.add(rc.y, 80, (d, r) => wildRose(d, rc, 38, r));
  }
}

/** Out in the grass: roses over the wall ends, the urn, rubble, ferns, a tree or two, long tufts everywhere. */
function grounds(geo: Geo, region: MapRegion, c: Chapel, rng: Rng, place: Placer, under: FeatureList, over: FeatureList): void {
  const box = { x0: 40, x1: MAP.width - 40, y0: region.top + 40, y1: region.gate.y - 80 };
  for (const x of [c.x0, c.x1]) {
    for (const y of [c.y0 + 30 + rng() * 200, c.y1 - 60 - rng() * 200]) {
      const p = pt(x + (rng() - 0.5) * 40, y);
      if (place.claim(p, 40, 30, 0.8)) over.add(p.y, 80, (d, r) => wildRose(d, p, 36 + r() * 12, r));
    }
  }
  const urn = place.take(rng, box, 40, 60, 60);
  if (urn) {
    const a = rng() * TAU;
    under.add(urn.y, 70, (d, r) => toppledUrn(d, urn, a, r));
  }
  for (let i = 0; i < 2; i++) {
    const t = place.take(rng, { ...box, x0: i === 0 ? 30 : MAP.width - 330, x1: i === 0 ? 330 : MAP.width - 30 }, 80, 60, 40);
    if (t) over.add(t.y, 160, (d, r) => treeCrown(d, t, 80 + r() * 20, r));
  }
  for (let i = 0; i < 10; i++) {
    const p = place.take(rng, box, 22, 30, 30);
    if (p) under.add(p.y, 40, (d, r) => rubble(d, p, r));
  }
  for (let i = 0; i < 12; i++) {
    const p = place.take(rng, box, 20, 30, 30);
    if (!p) continue;
    const a = -Math.PI / 2 + (rng() - 0.5);
    if (i % 3 === 0) under.add(p.y, 40, (d, r) => wildRose(d, p, 22, r));
    else under.add(p.y, 40, (d) => fern(d, p, a, 2.6, 20, 6));
  }
  // Fragments of an old cloister wall out in the grass.
  for (let i = 0; i < 4; i++) {
    const p = place.take(rng, box, 70, 40, 40);
    if (!p) continue;
    const len = 90 + rng() * 80;
    under.add(p.y - 20, 70, (d, r) => wallRuin(d, p.x - len / 2, p.x + len / 2, p.y + 10, r));
  }
  // Long grass tufts gathering out of the calm, thickest against the stones.
  for (let i = 0; i < 160; i++) {
    const p = pt(box.x0 + rng() * (box.x1 - box.x0), box.y0 + rng() * (box.y1 - box.y0));
    if (geo.busy(p.x, p.y) < 0.5 || !place.fits(p, 8, 20)) continue;
    const s = 10 + rng() * 8;
    under.add(p.y, 30, (d, r) => tuft(d, p, s, r));
  }
}
