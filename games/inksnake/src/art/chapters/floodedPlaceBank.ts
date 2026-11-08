import type { Rng } from '../../logic/rng';
import { blob, SHADOW, wash } from '../groundKit';
import { closed, type Draw, normals, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { Busy } from '../places/farmKit';
import { specks } from '../places/farmGroundParts';
import { mix } from '../wash';
import {
  distToEdge, FOAM, GRASS, inPoly, smoothLoop, LEAF_DRY, LEAF_LITTER, MUD, MUD_LIT, MUD_WET, SEDGE, SEDGE_DEEP, SEDGE_LIT, SHADE, SILT, SKY, strokePath, W, H,
} from './floodedPlaceKit';

/**
 * A bank or an island of the flooded forest from above: low land just
 * out of the water, its shore a margin of wet grey-brown mud glistening at
 * the waterline, a band of paler silty shallows round it and its shade on
 * the water; the land itself washed sedge-green and ochre, drifted with
 * dead leaves, tufts of sedge thickest by the water, a few roots crossing
 * the shore; a little relief (the lit upper-left shore, the shaded far one).
 */

/** The polygon pushed out (by > 0) or in (by < 0) along its normals. */
export function offsetPoly(poly: readonly Pt[], by: number | ((i: number) => number)): Pt[] {
  const n = normals(closed(poly)).slice(0, poly.length);
  const probe = 3 % poly.length;
  const p = poly[probe]!;
  const q = n[probe]!;
  const outward = inPoly(poly, p.x + q.x * 2, p.y + q.y * 2) ? -1 : 1;
  const at = typeof by === 'number' ? (): number => by : by;
  return poly.map((pp, i) => pt(pp.x + n[i]!.x * at(i) * outward, pp.y + n[i]!.y * at(i) * outward));
}

/** The bank's shade on the water and the pale silty shallows round its shore. */
export function bankShallows(d: Draw, poly: readonly Pt[]): void {
  const { pen } = d;
  for (const [k, a] of [[3, 0.14], [7, 0.12], [12, 0.08]] as const) pen.fill(poly.map((p) => pt(p.x + SHADOW.x * k, p.y + SHADOW.y * k)), SHADE, a);
  pen.fill(offsetPoly(poly, 14), SILT, 0.06);
  pen.fill(offsetPoly(poly, 7), SILT, 0.1);
  pen.fill(offsetPoly(poly, 3), MUD, 0.18);
}

/** Tufts of sedge: blades fanning from a root, a few bent over, laid as batched strokes in three greens. */
function sedges(d: Draw, poly: readonly Pt[], rng: Rng, busy: Busy, dense: number): void {
  const deep: [number, number, number, number, number][] = [];
  const mid: [number, number, number, number, number][] = [];
  const lit: [number, number, number, number, number][] = [];
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.max(0, Math.min(...xs)), Math.min(W, Math.max(...xs)), Math.max(0, Math.min(...ys)), Math.min(H, Math.max(...ys))];
  const tries = Math.round(((x1 - x0) * (y1 - y0)) / 180 * dense);
  for (let k = 0; k < tries; k++) {
    const x = x0 + rng() * (x1 - x0);
    const y = y0 + rng() * (y1 - y0);
    if (!inPoly(poly, x, y)) continue;
    const shore = distToEdge(poly, x, y);
    // Thickest along the water, thinning inland and near the level's things.
    const want = (0.25 + 0.75 * Math.max(0, 1 - shore / 26)) * (0.25 + 0.75 * busy(x, y));
    if (rng() > want) continue;
    const blades = 4 + Math.floor(rng() * 5);
    const s = 5 + rng() * 6;
    for (let b = 0; b < blades; b++) {
      const a = -Math.PI / 2 + (rng() - 0.5) * 2.6;
      const mark: [number, number, number, number, number] = [x + (rng() - 0.5) * 2, y + (rng() - 0.5) * 2, a, s * (0.6 + rng() * 0.6), (rng() - 0.5) * 3];
      (b % 3 === 0 ? deep : b % 3 === 1 ? mid : lit).push(mark);
    }
  }
  const { ctx } = d.pen;
  strokePath(ctx, deep.map(([x, y, a, l, b]) => [x + 0.8, y + 1.1, a, l, b] as const), SHADE, 0.22, 0.9);
  strokePath(ctx, deep, SEDGE_DEEP, 0.85, 0.8);
  strokePath(ctx, mid, SEDGE, 0.85, 0.7);
  strokePath(ctx, lit, SEDGE_LIT, 0.8, 0.6);
}

/** Roots of the forest crossing the shore: a few dark knees arching out of the land, slantwise, down into the water. */
function roots(d: Draw, poly: readonly Pt[], rng: Rng, busy: Busy): void {
  const n = normals(closed(poly));
  for (let i = 0; i < poly.length; i += 4) {
    const p = poly[i]!;
    if (rng() > 0.3 * busy(p.x, p.y)) continue;
    const q = n[i]!;
    const flip = inPoly(poly, p.x + q.x * 3, p.y + q.y * 3) ? 1 : -1;
    const ix = q.x * flip;
    const iy = q.y * flip;
    const slant = (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 0.5);
    const tx = -iy * slant;
    const ty = ix * slant;
    const len = 12 + rng() * 10;
    const inn = pt(p.x + ix * 8 - tx * 4, p.y + iy * 8 - ty * 4);
    const mid = pt(p.x + tx * len * 0.3, p.y + ty * len * 0.3);
    const out = pt(p.x - ix * len * 0.6 + tx * len * 0.7, p.y - iy * len * 0.6 + ty * len * 0.7);
    const path = [inn, mid, out];
    d.pen.stroke(path.map((r) => pt(r.x + 1, r.y + 1.4)), 1.8, SHADE, 0.25, false);
    d.pen.stroke(path, 1.5, MUD_WET, 0.9, false);
    d.pen.hair(path.slice(0, 2).map((r) => pt(r.x - 0.4, r.y - 0.5)), 0.45, MUD_LIT, 0.6);
  }
}

/** Short blades of grass laid all over the land as batched strokes, in deep, mid and lit greens: the sward's texture. */
function sward(d: Draw, land: readonly Pt[], box: { cx: number; cy: number; rx: number; ry: number }, rng: Rng): void {
  const marks: [number, number, number, number, number][][] = [[], [], [], []];
  const n = Math.min(14000, Math.round(box.rx * box.ry * 1.4));
  for (let i = 0; i < n; i++) {
    const x = box.cx + (rng() - 0.5) * box.rx * 2;
    const y = box.cy + (rng() - 0.5) * box.ry * 2;
    if (!inPoly(land, x, y)) continue;
    const a = -Math.PI / 2 + (rng() - 0.5) * 1.6;
    marks[Math.floor(rng() * 4)]!.push([x, y, a, 2 + rng() * 3.5, (rng() - 0.5) * 1.2]);
  }
  const { ctx } = d.pen;
  strokePath(ctx, marks[0]!, SEDGE_DEEP, 0.55, 0.6);
  strokePath(ctx, marks[1]!, mix(GRASS, SEDGE_DEEP, 0.3), 0.55, 0.55);
  strokePath(ctx, marks[2]!, GRASS, 0.6, 0.5);
  strokePath(ctx, marks[3]!, SEDGE_LIT, 0.55, 0.45);
}

/** One bank or island. */
export function paintBank(d: Draw, poly: readonly Pt[], rng: Rng, busy: Busy): void {
  const { pen } = d;
  // The mud margin at the waterline, wider where the bank shelves gently, wet and dark, glistening in streaks.
  const ph = rng() * TAU;
  const land = offsetPoly(poly, (i) => -(4.5 + 3.5 * (0.5 + 0.5 * Math.sin(i * 0.21 + ph) * Math.cos(i * 0.07 - ph))));
  pen.fill(poly, PAPER_FILL, 0.6);
  pen.fill(poly, MUD, 0.85);
  pen.clipped(poly, () => {
    pen.fill(offsetPoly(poly, -2), MUD_WET, 0.35);
    const wet = closed(offsetPoly(poly, -1.4));
    for (let i = 0; i < wet.length - 2; i += 5) if (rng() < 0.45) pen.hair(wet.slice(i, i + 4), 0.8, SKY, 0.4);
  });
  const xs = land.map((p) => p.x);
  const ys = land.map((p) => p.y);
  const box = { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, rx: (Math.max(...xs) - Math.min(...xs)) / 2, ry: (Math.max(...ys) - Math.min(...ys)) / 2 };
  const { cx, cy, rx, ry } = box;
  // The land: paper, a deep sedge-green wash, then blooms of lighter grass and ochre litter as it dried.
  pen.fill(land, PAPER_FILL, 0.7);
  pen.fill(land, mix(GRASS, SEDGE_DEEP, 0.45), 0.78);
  pen.clipped(land, () => {
    for (let k = 0; k < 14; k++) {
      const p = pt(cx + (rng() - 0.5) * rx * 1.7, cy + (rng() - 0.5) * ry * 1.7);
      const col = k % 4 === 0 ? LEAF_DRY : k % 4 === 1 ? SEDGE_DEEP : k % 4 === 2 ? SEDGE_LIT : MUD_LIT;
      wash(d, smoothLoop(blob(p, 12 + rng() * rx * 0.35, 8 + rng() * ry * 0.35, rng, 0.35, 10, rng() * TAU), 5), col, 0.12 + rng() * 0.1, 0.3);
    }
    const litter: (readonly [number, number, number])[] = [];
    for (let i = 0; i < Math.min(2400, Math.round(rx * ry * 0.25)); i++) litter.push([cx + (rng() - 0.5) * rx * 2, cy + (rng() - 0.5) * ry * 2, 0.4 + rng() * 0.9]);
    specks(d, LEAF_LITTER, 0.35, litter);
    // Relief: the land's slope down to the far shore in shade, the near one lit.
    pen.crescent(land, pt(-SHADOW.x * 10, -SHADOW.y * 10), () => pen.fill(land, SHADE, 0.22));
    pen.crescent(land, pt(SHADOW.x * 8, SHADOW.y * 8), () => pen.fill(land, PAPER_FILL, 0.16));
  });
  // The grass blades run over the land's edge onto the mud, so the two meet softly.
  sward(d, land, box, rng);
  sedges(d, land, rng, busy, 1.6);
  roots(d, poly, rng, busy);
  // The waterline: the shore in ink, coming and going, and a lit line of wet just outside it.
  const lap = closed(offsetPoly(poly, 1.8));
  for (let i = 0; i < lap.length - 2; i += 4) if (rng() < 0.6) pen.hair(lap.slice(i, i + 4), 0.8, FOAM, 0.5);
  const shore = closed(poly);
  for (let i = 0; i < shore.length - 2; ) {
    const n = 6 + Math.floor(rng() * 10);
    if (rng() < 0.8) pen.stroke(shore.slice(i, i + n + 1), 1.3, d.ink, 0.8, false);
    i += n;
  }
}
