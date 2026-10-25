import { createRng, type Rng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { pt } from '../kit';
import { cornCrib, coopRoof } from '../places/farmBuildings';
import { EARTH, EARTH_DEEP, GRASS, GRASS_DEEP, STRAW, STRAW_DEEP, STRAW_LIT, SWARD, SWARD_DEEP } from '../places/farmKit';
import { fieldStone, hayBale, trough } from '../places/farmSolids';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { type Band, FeatureList, leftLimit, Placer, rightLimit, type TrailLook } from './band';
import { blob, boxPts, type Brush, turnedBox } from './brush';
import { type Geo, seedOf, type Span } from './common';
import { farmhouse, field, type FieldKind, gableRoof, hedgerow, hen, roundBale, scarecrow, vegRows, wireFence } from './farmParts';
import { groundMarks, inSheet, paintWash, pencilGround } from './paper';
import { bush, grassClump, reeds } from './plants';
import { crown } from './trees';
import { lilyPad, pond, ripple } from './water';

/**
 * Chapter 1's band, "The Farm", from above in ink and wash like the farm's
 * boards: the farmhouse's tiled roof in its yard by the gate and the hen
 * coop with its run and hens across the trail; above them a vegetable plot
 * and the corn crib with its stacked bales; a duck pond in reeds and a mown
 * meadow of round bales; at the top a wheat field and a ploughed one, with
 * hedgerows, wire fences and oaks throwing their shadows. Everything keeps
 * clear of the trail and the levels' labels.
 */
export const FARM_TRAIL: TrailLook = { bed: EARTH, mark: EARTH_DEEP, fringe: mix(GRASS, '#26316a', 0.2), nest: [STRAW, STRAW_DEEP, STRAW_LIT] };
const SALT = 300;

interface Rect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

const inRect = (r: Rect, x: number, y: number, pad = 0): boolean => x > r.x0 - pad && x < r.x1 + pad && y > r.y0 - pad && y < r.y1 + pad;

/** A field's outline: a slightly skewed quadrilateral with points along its sides, its outer edges run off the page. */
function fieldShape(r: Rect, rng: Rng): Pt[] {
  const j = (): number => (rng() - 0.5) * 16;
  const corners = [pt(r.x0 + j(), r.y0 + j()), pt(r.x1 + j(), r.y0 + j()), pt(r.x1 + j(), r.y1 + j()), pt(r.x0 + j(), r.y1 + j())];
  const out: Pt[] = [];
  corners.forEach((a, i) => {
    const z = corners[(i + 1) % 4]!;
    const n = Math.max(1, Math.ceil(Math.hypot(z.x - a.x, z.y - a.y) / 14));
    for (let k = 0; k < n; k++) out.push(pt(a.x + ((z.x - a.x) * k) / n, a.y + ((z.y - a.y) * k) / n));
  });
  return out;
}

export function farmPlan(geo: Geo, region: MapRegion, draft: boolean): Band {
  const rng = createRng(seedOf(SALT, region.index));
  const under = new FeatureList(SALT + 1, draft);
  const over = new FeatureList(SALT + 2, draft);
  const B = region.bottom;
  const T = region.top;
  const bare: Rect[] = [];
  const place = new Placer(geo, region, (x, y, r) => bare.some((q) => inRect(q, x, y, r)) || y < T + 20 || y > B - 30);

  /** Left and right rects over rows y0..y1, up to the trail's clearance. */
  const left = (y0: number, y1: number, maxW: number, pad = 120): Rect => {
    const x1 = Math.min(MAP.mid - 150, leftLimit(geo, y0, y1, pad));
    return { x0: Math.max(-40, x1 - maxW), y0, x1, y1 };
  };
  const right = (y0: number, y1: number, maxW: number, pad = 120): Rect => {
    const x0 = Math.max(MAP.mid + 150, rightLimit(geo, y0, y1, pad));
    return { x0, y0, x1: Math.min(MAP.width + 40, x0 + maxW), y1 };
  };
  const addField = (r: Rect, kind: FieldKind, angle: number): void => {
    bare.push(r);
    const shape = fieldShape(r, createRng(seedOf(SALT, 5, bare.length)));
    under.add((r.y0 + r.y1) / 2, (r.y1 - r.y0) / 2 + 30, (b, frng) => field(b, shape, kind, angle, frng));
    // The field's edge towards the trail: a wire fence, or a hedgerow on the far side of a big one.
    const edge = r.x1 < MAP.mid ? [shape.find((p) => p.x > r.x1 - 20 && p.y < r.y0 + 20) ?? pt(r.x1, r.y0), pt(r.x1 + 4, r.y1)] : [pt(r.x0, r.y0), pt(r.x0 - 4, r.y1)];
    over.add((r.y0 + r.y1) / 2, (r.y1 - r.y0) / 2 + 20, (b) => wireFence(b, edge));
  };

  // The yard by the gate: the farmhouse on the left, the hen coop and its run on the right.
  const yardL = left(B - 470, B - 150, 470, 150);
  const house = pt(Math.min(yardL.x1 - 175, 380), B - 330);
  bare.push({ x0: house.x - 175, y0: house.y - 90, x1: house.x + 175, y1: house.y + 150 });
  under.add(house.y, 220, (b, r) => yard(b, house, r));
  over.add(house.y, 220, (b, r) => farmhouse(b, house, r));
  over.add(house.y + 120, 60, (b) => (b.draft ? undefined : trough(b.d, house.x + 190, house.y + 40, 30, 84)));
  const yardR = right(B - 520, B - 190, 380, 110);
  const coop = { x: yardR.x0 + 30, y: B - 500, w: 176, h: 86 };
  const run: Rect = { x0: coop.x - 10, y0: coop.y + coop.h + 6, x1: coop.x + coop.w + 70, y1: coop.y + coop.h + 150 };
  bare.push({ x0: coop.x - 20, y0: coop.y - 20, x1: run.x1 + 10, y1: run.y1 + 10 });
  under.add(run.y0, 200, (b, r) => {
    const earth = blob(pt((run.x0 + run.x1) / 2, (run.y0 + run.y1) / 2 - 30), (run.x1 - run.x0) / 2 + 30, (run.y1 - run.y0) / 2 + 60, r, 0.12, 30);
    b.body(earth, EARTH, 0.32);
    b.line(earth, 0.5, 0.3);
  });
  over.add(coop.y + 60, 220, (b, r) => {
    if (b.draft) gableRoof(b, pt(coop.x + coop.w / 2, coop.y + coop.h / 2), coop.w, coop.h, 0, r, '#9b8a72', 26);
    else coopRoof(b.d, coop.x, coop.y, coop.w, coop.h);
    wireFence(b, [pt(run.x0, run.y0), pt(run.x0, run.y1), pt(run.x1, run.y1), pt(run.x1, run.y0 - 20), pt(coop.x + coop.w, run.y0 - 20)]);
    for (let i = 0; i < 9; i++) hen(b, pt(run.x0 + 14 + r() * (run.x1 - run.x0 - 28), run.y0 + 14 + r() * (run.y1 - run.y0 - 28)), r);
  });
  over.add(run.y1 + 40, 60, (b, r) => {
    for (let i = 0; i < 4; i++) hen(b, pt(run.x0 + r() * 140, run.y1 + 18 + r() * 40), r);
  });

  // Above: the vegetable plot on the left, the corn crib and its bales on the right.
  const veg = left(B - 880, B - 600, 340);
  bare.push(veg);
  under.add((veg.y0 + veg.y1) / 2, 180, (b, r) => {
    field(b, boxPts(veg.x0, veg.y0, veg.x1, veg.y1, 14), 'veg', 0, r);
    vegRows(b, veg.x0, veg.y0, veg.x1, veg.y1, r);
  });
  over.add(veg.y0 + 10, 40, (b, r) => hedgerow(b, [pt(veg.x0 - 30, veg.y0 - 14), pt(veg.x1 + 10, veg.y0 - 14)], r, 11));
  const cribR = right(B - 900, B - 620, 400);
  const crib = { x: cribR.x0 + 20, y: B - 860, w: 122, h: 78 };
  bare.push({ x0: crib.x - 20, y0: crib.y - 20, x1: crib.x + crib.w + 180, y1: crib.y + crib.h + 130 });
  under.add(crib.y + 60, 160, (b, r) => {
    const earth = blob(pt(crib.x + crib.w / 2 + 50, crib.y + crib.h / 2 + 30), 140, 80, r, 0.15, 26);
    b.body(earth, EARTH, 0.28);
    b.line(earth, 0.5, 0.25);
  });
  over.add(crib.y + 60, 200, (b, r) => {
    if (b.draft) gableRoof(b, pt(crib.x + crib.w / 2, crib.y + crib.h / 2), crib.w, crib.h, 0, r, '#a89c86', 30);
    else cornCrib(b.d, crib.x, crib.y, crib.w, crib.h);
    // Rectangular bales stacked beside it.
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) baleOrSketch(b, crib.x + crib.w + 26 + i * 46, crib.y + 6 + j * 30, 42, 26);
    baleOrSketch(b, crib.x + 20, crib.y + crib.h + 40, 46, 26);
  });

  // Higher: the duck pond in its reeds on the left; a mown meadow of round bales on the right.
  const pondR = left(B - 1150, B - 940, 380);
  const pondC = pt(Math.min(pondR.x1 - 130, 360), B - 1040);
  bare.push({ x0: pondC.x - 130, y0: pondC.y - 85, x1: pondC.x + 130, y1: pondC.y + 85 });
  under.add(pondC.y, 120, (b, r) => {
    pond(b, pondC, 118, 70, r);
    for (let i = 0; i < 5; i++) lilyPad(b, pt(pondC.x - 60 + r() * 110, pondC.y - 30 + r() * 50), 6 + r() * 4, r, r() < 0.3 ? '#f2d6e0' : null);
    ripple(b, pt(pondC.x + 30, pondC.y + 8), 14, r);
  });
  over.add(pondC.y, 140, (b, r) => {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (0.8 + i * 0.25);
      reeds(b, pt(pondC.x + Math.cos(a) * 122, pondC.y + Math.sin(a) * 72 + 6), 26 + r() * 12, r);
    }
    for (let i = 0; i < 3; i++) duck(b, pt(pondC.x - 30 + i * 26, pondC.y + 10 + i * 6), r);
  });
  const mown = right(B - 1290, B - 960, 520);
  addField(mown, 'mown', -0.15);
  over.add((mown.y0 + mown.y1) / 2, 200, (b, r) => {
    for (let i = 0; i < 6; i++) roundBale(b, pt(mown.x0 + 50 + r() * Math.max(10, mown.x1 - mown.x0 - 100), mown.y0 + 40 + r() * (mown.y1 - mown.y0 - 80)), 17 + r() * 3, r);
  });

  // At the top: a wheat field on the left and a ploughed one on the right, hedged along their tops.
  const wheat = left(T + 50, T + 380, 640);
  addField(wheat, 'wheat', 1.45);
  const plough = right(T + 60, T + 340, 640);
  addField(plough, 'plough', 1.7);
  over.add(wheat.y0 + 120, 80, (b, r) => scarecrow(b, pt((wheat.x0 + wheat.x1) / 2 + 60, wheat.y0 + 120), r));
  for (const r of [wheat, plough]) over.add(r.y0, 40, (b, hr) => hedgerow(b, [pt(r.x0 - 20, r.y0 - 16), pt((r.x0 + r.x1) / 2, r.y0 - 20), pt(r.x1 + 20, r.y0 - 14)], hr));

  // Oaks along the hedges and by the house, their shadows pooled on the grass.
  for (const [x, y, s] of [[house.x - 210, house.y - 120, 70], [yardR.x1 - 60, B - 230, 64], [pondC.x - 190, pondC.y + 30, 72], [MAP.width - 150, B - 760, 80], [wheat.x1 + 40, wheat.y1 + 70, 52], [plough.x0 - 30, plough.y1 + 90, 56], [120, B - 760, 60]] as const) {
    if (!place.claim(pt(x, y), s, 30, 0.7)) continue;
    over.add(y, s + 60, (b, r) => crown(b, pt(x, y), s, r));
  }
  // More trees in the grass between: oaks, and apple trees in fruit.
  for (let i = 0, tries = 0; i < 12 && tries < 200; tries++) {
    const s = 34 + rng() * 26;
    const c = pt(MAP.mid - 560 + rng() * 1120, T + 80 + rng() * (B - T - 400));
    if (geo.busy(c.x, c.y) < 0.45 || !place.claim(c, s, 40, 0.8)) continue;
    const apples = rng() < 0.5;
    over.add(c.y, s + 60, (b, r) => {
      crown(b, c, s, r);
      if (apples) for (let k = 0; k < 14; k++) b.dot(c.x + (r() - 0.5) * s * 1.4, c.y + (r() - 0.5) * s * 1.4, 2, '#c8322a', 0.9);
    });
    i++;
  }
  // Bushes and field stones in the quiet grass.
  for (let i = 0; i < 48; i++) {
    const s = 10 + rng() * 14;
    const c = place.take(rng, { x0: 0, x1: MAP.width, y0: T + 60, y1: B - 60 }, s, 50, 20);
    if (!c) continue;
    if (rng() < 0.85) over.add(c.y, s + 30, (b, r) => bush(b, c, s, r, GRASS, r() < 0.3 ? '#f2efe6' : null));
    else over.add(c.y, s + 20, (b) => (b.draft ? undefined : fieldStone(b.d, c, s * 0.5)));
  }
  for (let i = 0; i < 80; i++) {
    const c = place.take(rng, { x0: 0, x1: MAP.width, y0: T + 40, y1: B - 40 }, 8, 22, 12);
    if (c) over.add(c.y, 30, (b, r) => grassClump(b, c, 12 + r() * 8, r, '#7f9a4a'));
  }

  return {
    region,
    draft,
    trail: FARM_TRAIL,
    under: under.list,
    over: over.list,
    ground: (ctx, span) => paintGround(ctx, geo, span, region, bare, draft),
  };
}

/** Rectangular bale (the board's, when painted). */
function baleOrSketch(b: Brush, x: number, y: number, w: number, h: number): void {
  if (!b.draft) return hayBale(b.d, x, y, w, h);
  const s = boxPts(x, y, x + w, y + h, 8);
  b.cast(s, 8, 0.12);
  b.body(s, STRAW, 0.6);
  b.hatch(s, 4, 0, 0.3);
  b.edge(s, 0.8, 0.8);
}

/** The farmyard round the house: trodden earth, a scatter of straw. */
function yard(b: Brush, c: Pt, rng: Rng): void {
  const earth = blob(pt(c.x + 40, c.y + 60), 230, 150, rng, 0.14, 34, -0.1);
  b.body(earth, EARTH, 0.3);
  b.line(earth, 0.5, 0.25);
  if (b.draft) return;
  for (let i = 0; i < 60; i++) {
    const p = pt(c.x - 150 + rng() * 380, c.y + 80 + rng() * 110);
    b.line([p, pt(p.x + (rng() - 0.5) * 10, p.y + (rng() - 0.5) * 6)], 0.6, 0.7, rng() < 0.5 ? STRAW_DEEP : STRAW);
  }
}

/** A duck afloat, from above: a teardrop body, a green head, a V of wake behind it. */
function duck(b: Brush, c: Pt, rng: Rng): void {
  const a = rng() * Math.PI * 2;
  const body = turnedBox(c, 13, 7, a, 3);
  b.line([pt(c.x - Math.cos(a) * 8, c.y - Math.sin(a) * 8), pt(c.x - Math.cos(a + 0.4) * 22, c.y - Math.sin(a + 0.4) * 22)], 0.5, 0.4);
  b.line([pt(c.x - Math.cos(a) * 8, c.y - Math.sin(a) * 8), pt(c.x - Math.cos(a - 0.4) * 22, c.y - Math.sin(a - 0.4) * 22)], 0.5, 0.4);
  b.body(body, '#b8a080', 0.8);
  b.dot(c.x + Math.cos(a) * 6, c.y + Math.sin(a) * 6, 2.6, '#3f7a4a', 1);
  b.dot(c.x + Math.cos(a) * 9, c.y + Math.sin(a) * 9, 1.2, '#e0a030', 1);
  b.edge(body, 0.6, 0.8);
}

function paintGround(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, region: MapRegion, bare: readonly Rect[], draft: boolean): void {
  const top = region.top + 14;
  const bottom = region.bottom - 8;
  if (draft) return pencilGround(ctx, geo, span, top, bottom, SALT, (x, y) => bare.some((r) => inRect(r, x, y, 8)));
  paintWash(ctx, span, top, bottom, { colour: SWARD, alpha: 0.42, deep: [SWARD_DEEP, GRASS_DEEP] }, SALT);
  groundMarks(ctx, geo, span, top, bottom, { tick: mix(GRASS, '#26316a', 0.35), grain: '#3f5f33', density: 0.85, height: 1.25, flower: ['#fffaf0', '#e6b34a', 0.06] }, SALT, (x, y) => bare.some((r) => inRect(r, x, y, 8)) || !inSheet(x, y, top, bottom, SALT));
}
