import { createRng, type Rng } from '../logic/rng';
import { blob, body, castShadow, polar, SHADOW } from './groundKit';
import { closed, type Draw, normals, oval, pt, ribbon, TAU } from './kit';
import { LEAF, MOSS, PAPER_FILL, STONE_DARK } from './palette';
import type { Pt } from './pen';
import { ROCK, stoneShape } from './rockeryThings';
import { coverEnds, coverHalf } from './tunnel';
import { mix } from './wash';

/**
 * The rockery's covers, deck and seat: rough slabs laid across a stretch of
 * groove like a clapper bridge on stone piers, a rubble causeway carrying a
 * groove over another (also used in the garden and pond), and a big flat
 * stepping stone set in gravel for the gecko.
 */
const SLAB = '#b2ab9a';
const LICHEN = '#cdc684';
const GRAVEL_BED = '#8a8572';
/** One slab's length, in groove points (every ~4 units), give or take. */
const SLAB_LEN = 9;

/** The ground tone under a raised groove on stone (rockery, garden, pond). */
export const ROCKERY_BED = '#d0c9b8';

/** A rough-edged version of a polygon: each side broken into a few wobbling steps. */
function rough(poly: readonly Pt[], rng: Rng, amp: number): Pt[] {
  return poly.flatMap((a, i) => {
    const b = poly[(i + 1) % poly.length]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const n = Math.max(2, Math.round(len / 13));
    return Array.from({ length: n }, (_, k) => {
      const t = k / n;
      const wob = k === 0 ? 0 : (rng() - 0.5) * amp;
      return pt(a.x + (b.x - a.x) * t - ((b.y - a.y) / len) * wob, a.y + (b.y - a.y) * t + ((b.x - a.x) / len) * wob);
    });
  });
}

/** One flat stone: washed, flecked, lichened, its edges worn into shade, outlined. */
function flatStone(d: Draw, shape: readonly Pt[], rng: Rng, lift: number): void {
  const { pen } = d;
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const c = pt((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  castShadow(d, shape, lift, 0.2);
  body(d, shape, mix(SLAB, rng() < 0.5 ? '#a3aaa6' : '#c2ae8a', rng() * 0.7), 0.85);
  pen.clipped(shape, () => {
    pen.fill(blob(pt(c.x - SHADOW.x * size * 0.08, c.y - SHADOW.y * size * 0.08), size * 0.3, size * 0.22, rng, 0.25, 16), PAPER_FILL, 0.22);
    pen.stipple(shape, Math.round(size * 1.6), () => 0.6, 0.55, STONE_DARK);
    for (let k = 0; k < 3; k++) pen.fill(blob(polar(c, rng() * TAU, rng() * size * 0.3), size * 0.12, size * 0.08, rng, 0.3, 12), STONE_DARK, 0.1);
    for (let k = 0; k < 2; k++) {
      const p = polar(c, rng() * TAU, rng() * size * 0.35);
      const lr = 2.5 + rng() * 4;
      pen.fill(blob(p, lr, lr * 0.85, rng, 0.25, 12), LICHEN, 0.5);
    }
  });
  pen.crescent(shape, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(shape, mix(STONE_DARK, d.ink, 0.2), 0.5));
  pen.crescent(shape, pt(SHADOW.x * 3, SHADOW.y * 3), () => pen.fill(shape, PAPER_FILL, 0.3));
  pen.crescent(shape, pt(-SHADOW.x * 8, -SHADOW.y * 8), () => pen.hatch(shape, 3, 0.9, 0.45, { color: d.ink, alpha: 0.35 }));
  pen.stroke(closed(shape), 1.2, d.ink, 0.95);
}

/** A small rounded stone (pier, parapet), radius r. */
function cobble(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const shape = stoneShape(c, r, rng, 0.85, rng() * TAU);
  castShadow(d, shape, r * 0.5, 0.2);
  body(d, shape, mix(ROCK, STONE_DARK, rng() * 0.3), 0.75);
  pen.crescent(shape, pt(-SHADOW.x * r * 0.3, -SHADOW.y * r * 0.3), () => pen.fill(shape, STONE_DARK, 0.45));
  if (rng() < 0.4) pen.clipped(shape, () => pen.fill(oval(c.x - r * 0.3, c.y - r * 0.3, r * 0.5, r * 0.4, 10), rng() < 0.5 ? MOSS : LICHEN, 0.55));
  pen.stroke(closed(shape), 0.9, d.ink, 0.9, false);
}

/**
 * Rough stone slabs laid across a stretch of groove on stone piers, like a
 * clapper bridge; follows a curve. Covers coverHalf(grooveW) either side.
 */
export function slabBridge(d: Draw, pts: readonly Pt[], grooveW: number): void {
  if (pts.length < 2) return;
  const rng = createRng(Math.round(pts[0]!.x * 13 + pts[0]!.y * 7 + pts.length));
  coverEnds(d, pts, grooveW);
  const half = coverHalf(grooveW) + 2;
  const last = pts.length - 1;
  const nrm = normals(pts);
  const cuts = [0];
  while (cuts[cuts.length - 1]! < last) cuts.push(Math.min(last, cuts[cuts.length - 1]! + SLAB_LEN - 1 + Math.floor(rng() * 3)));
  if (cuts.length > 2 && last - cuts[cuts.length - 2]! < 5) cuts.splice(cuts.length - 2, 1);
  // Piers under the joints, showing past the slabs' ends.
  for (const i of cuts) {
    for (const s of [1, -1]) cobble(d, pt(pts[i]!.x + nrm[i]!.x * s * (half + 3), pts[i]!.y + nrm[i]!.y * s * (half + 3)), 9 + rng() * 4, rng);
  }
  for (let k = 0; k + 1 < cuts.length; k++) {
    const [i, j] = [Math.max(0, cuts[k]! - 1), Math.min(last, cuts[k + 1]! + 1)];
    const span = pts.slice(i, j + 1);
    const over = [rng() * 6, rng() * 6];
    const band = ribbon(span, (u) => half * 2 + (u < 0.5 ? over[0]! : over[1]!) * 2);
    flatStone(d, rough(band.shape, rng, 1.8), rng, 9);
  }
}

/** A rubble causeway: rounded stones packed along either side of the groove, bigger ones at its ends. */
export function stoneDeck(d: Draw, pts: readonly Pt[], half: number, grooveW: number, rng: Rng): void {
  const deck = ribbon(pts, () => half * 2);
  body(d, deck.shape, mix(ROCK, STONE_DARK, 0.3), 0.7);
  const nrm = normals(pts);
  const mid = (grooveW / 2 + half) / 2;
  for (let i = 1; i < pts.length - 1; i += 2) {
    for (const s of [1, -1]) cobble(d, pt(pts[i]!.x + nrm[i]!.x * s * mid, pts[i]!.y + nrm[i]!.y * s * mid), (half - grooveW / 2) / 2 + 0.5 + rng() * 1.5, rng);
  }
  for (const i of [0, pts.length - 1]) {
    for (const s of [1, -1]) cobble(d, pt(pts[i]!.x + nrm[i]!.x * s * (half - 3), pts[i]!.y + nrm[i]!.y * s * (half - 3)), 10 + rng() * 2, rng);
  }
  d.pen.stroke(deck.top, 0.8, d.ink, 0.5, false);
  d.pen.stroke(deck.bot, 0.8, d.ink, 0.5, false);
}

/**
 * A big flat stepping stone, radius ~r at c, set in gravel for the gecko:
 * a bed of darker settled grit round it, a worn pale top, lichen and moss
 * in its pits, shade under its rim.
 */
export function stepStone(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = createRng(Math.round(c.x * 31 + c.y * 17));
  const bed = blob(c, r + 12, r + 10, rng, 0.08, 30);
  pen.fill(bed, GRAVEL_BED, 0.3);
  pen.stipple(bed, 220, (x, y) => (Math.hypot(x - c.x, y - c.y) > r ? 0.8 : 0), 0.8, mix(GRAVEL_BED, d.ink, 0.3));
  const shape = stoneShape(c, r * 1.02, rng, 0.94, rng() * TAU);
  castShadow(d, shape, 5, 0.22);
  body(d, shape, mix(SLAB, '#bfae8c', 0.45), 0.9);
  pen.clipped(shape, () => {
    pen.fill(blob(pt(c.x - r * 0.1, c.y - r * 0.12), r * 0.6, r * 0.5, rng, 0.2, 20), PAPER_FILL, 0.28);
    pen.stipple(shape, 260, () => 0.6, 0.55, STONE_DARK);
    for (let k = 0; k < 4; k++) pen.fill(blob(polar(c, rng() * TAU, rng() * r * 0.6), r * 0.16, r * 0.1, rng, 0.3, 12), STONE_DARK, 0.1);
    for (let k = 0; k < 5; k++) {
      const p = polar(c, rng() * TAU, r * (0.55 + rng() * 0.35));
      const lr = 3 + rng() * 5;
      pen.fill(blob(p, lr, lr * 0.85, rng, 0.25, 14), LICHEN, 0.5);
      pen.hair(closed(blob(p, lr, lr * 0.85, rng, 0.25, 14)), 0.4, d.ink, 0.3);
    }
    for (let k = 0; k < 24; k++) {
      const p = polar(c, -2.3 + (rng() - 0.5) * 0.9, r * (0.8 + rng() * 0.25));
      pen.fill(oval(p.x, p.y, 1.5 + rng() * 2, 1.2 + rng() * 1.5, 8), rng() < 0.4 ? LEAF : MOSS, 0.55);
    }
    pen.hair([polar(c, 0.4, r * 0.3), polar(c, 0.6, r * 0.55), polar(c, 0.45, r * 0.85)], 0.6, d.ink, 0.45);
  });
  pen.crescent(shape, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(shape, STONE_DARK, 0.4));
  pen.crescent(shape, pt(-SHADOW.x * 8, -SHADOW.y * 8), () => pen.hatch(shape, 3, 0.9, 0.45, { color: d.ink, alpha: 0.28 }));
  pen.stroke(closed(shape), 1.4, d.ink, 0.95);
}
