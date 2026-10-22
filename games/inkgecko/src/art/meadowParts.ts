import { createRng, type Rng } from '../logic/rng';
import { blob, body, castShadow, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, lerp, normals, oval, pt, ribbon, TAU } from './kit';
import { blade } from './meadowBank';
import { board, OAK } from './meadowThings';
import { LEAF, MOSS, PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { mix } from './wash';

/**
 * The meadow's deck and seat: a boardwalk of short cross-boards on two
 * rails carrying a groove over another, and an old millstone half sunk in
 * the grass for the gecko. (The meadow's cover is in meadowBank.ts.)
 */
const UNDER = '#2c3628';
const RAIL = '#7b705e';
const BOARD = '#cdb48c';
const EARTH = '#8a6a4a';
const GRIT_STONE = '#b8aa98';
const GRIT_PINK = '#c4a596';
const GRIT_DEEP = '#7f7262';
const LICHEN = '#cdc684';
/** Groove points per board (they come every ~4 units), and how far boards run past the deck's half-width. */
const BOARD_PTS = 3;
const BOARD_OVER = 6;

/** The ground tone under a raised groove in the meadow: weathered boards. */
export const MEADOW_BED = '#cdc6b0';

/**
 * A boardwalk deck: short weathered cross-boards with thin dark gaps
 * between them, a little ragged at their ends, nailed down onto two rails
 * that show in the gaps, grass poking up at the edges, a stake at each corner.
 */
export function boardwalk(d: Draw, pts: readonly Pt[], half: number, _grooveW: number, rng: Rng): void {
  const { pen } = d;
  const last = pts.length - 1;
  const nrm = normals(pts);
  const reach = half + BOARD_OVER;
  pen.fill(ribbon(pts, () => reach * 2 - 3).shape, UNDER, 0.7);
  for (const s of [1, -1]) {
    const rail = pts.map((p, i) => pt(p.x + nrm[i]!.x * s * (half - 6), p.y + nrm[i]!.y * s * (half - 6)));
    pen.stroke(rail, 5, RAIL, 0.9, false);
  }
  for (let i = 0; i < last; i += BOARD_PTS) {
    const j = Math.min(last, i + BOARD_PTS);
    const [a, b] = [lerp(pts[i]!, pts[j]!, 0.06), lerp(pts[i]!, pts[j]!, 0.94)];
    const [na, nb] = [nrm[i]!, nrm[j]!];
    const l0 = reach - rng() * 3;
    const l1 = reach - rng() * 3;
    const plank = [pt(a.x + na.x * l0, a.y + na.y * l0), pt(b.x + nb.x * (l0 + rng() - 0.5), b.y + nb.y * (l0 + rng() - 0.5)), pt(b.x - nb.x * l1, b.y - nb.y * l1), pt(a.x - na.x * (l1 + rng() - 0.5), a.y - na.y * (l1 + rng() - 0.5))];
    castShadow(d, plank, 2, 0.15);
    board(d, plank, na, rng, mix(BOARD, OAK, rng() * 0.45));
    const m = lerp(a, b, 0.5);
    for (const s of [1, -1]) {
      for (const k of [-0.25, 0.25]) {
        const nail = polar(pt(m.x + na.x * s * (half - 6), m.y + na.y * s * (half - 6)), Math.atan2(b.y - a.y, b.x - a.x), k * Math.hypot(b.x - a.x, b.y - a.y));
        pen.dot(nail.x, nail.y, 0.65, d.ink, 0.7);
      }
    }
  }
  // Stakes at the corners, grass poking up along the edges.
  for (const i of [0, last]) {
    for (const s of [1, -1]) {
      const p = pt(pts[i]!.x + nrm[i]!.x * s * (reach + 2), pts[i]!.y + nrm[i]!.y * s * (reach + 2));
      const top = blob(p, 4.4, 4.1, rng, 0.1, 10);
      castShadow(d, top, 8, 0.2);
      body(d, top, mix(OAK, '#6e6352', 0.3), 0.85);
      pen.hair(closed(oval(p.x, p.y, 2, 2, 8)), 0.4, d.ink, 0.5);
      pen.stroke(closed(top), 0.9, d.ink, 0.9, false);
    }
  }
  for (let i = 1; i < last; i += 2) {
    if (rng() < 0.45) continue;
    const s = rng() < 0.5 ? 1 : -1;
    const p = pt(pts[i]!.x + nrm[i]!.x * s * (reach - 1), pts[i]!.y + nrm[i]!.y * s * (reach - 1));
    for (let k = 0; k < 3; k++) blade(d, p, Math.atan2(nrm[i]!.y * s, nrm[i]!.x * s) + (rng() - 0.5) * 1.6, 4 + rng() * 5, mix(LEAF, MOSS, rng()), 0.8, rng);
  }
}

/** The millstone's dressing: in each harp a master furrow and three shorter ones parallel to it, cut tangent to a ring round the eye. */
function harps(d: Draw, c: Pt, r: number, eyeR: number, rng: Rng): void {
  const { pen } = d;
  const count = 8;
  const turn = rng() * TAU;
  for (let k = 0; k < count; k++) {
    const a0 = turn + (k / count) * TAU;
    const start = polar(c, a0, eyeR * 1.5);
    const dir = a0 + 1.2;
    for (let f = 0; f < 4; f++) {
      const s0 = polar(polar(start, dir, f * r * 0.13), dir - Math.PI / 2, -f * r * 0.085);
      const s1 = polar(s0, dir, r * (1 - f * 0.16));
      const worn = f === 0 ? 0.55 : 0.35;
      pen.hair([s0, s1], 2, mix(GRIT_DEEP, d.ink, 0.2), worn * 0.6);
      pen.hair([polar(s0, dir - Math.PI / 2, -1.1), polar(s1, dir - Math.PI / 2, -1.1)], 0.7, d.ink, worn);
      pen.hair([polar(s0, dir - Math.PI / 2, 1.2), polar(s1, dir - Math.PI / 2, 1.2)], 0.8, PAPER_FILL, worn * 0.7);
    }
  }
}

/**
 * An old millstone half sunk in the grass, radius r at c, for the gecko to
 * sit on: a pinkish gritstone disc dressed in harps of furrows, worn smooth
 * at the middle, its square eye grown over with clover, chips out of its
 * rim, lichen, and the grass creeping back over its edge.
 */
export function millstone(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = createRng(Math.round(c.x * 31 + c.y * 17));
  // Trodden earth and flattened grass round it.
  const bed = blob(c, r + 8, r + 7, rng, 0.08, 36);
  pen.fill(bed, EARTH, 0.25);
  pen.stipple(bed, 180, (x, y) => (Math.hypot(x - c.x, y - c.y) > r ? 0.8 : 0), 0.7, mix(EARTH, d.ink, 0.3));
  const stone = blob(c, r, r * 0.98, rng, 0.035, 56);
  castShadow(d, stone, 3, 0.25);
  body(d, stone, mix(GRIT_STONE, GRIT_PINK, 0.45), 0.9);
  const eyeR = r * 0.16;
  pen.clipped(stone, () => {
    // Blotches of the stone's colour, then its grit.
    for (let k = 0; k < 9; k++) pen.fill(blob(polar(c, rng() * TAU, rng() * r * 0.8), r * (0.15 + rng() * 0.2), r * (0.1 + rng() * 0.15), rng, 0.3, 14, rng() * TAU), rng() < 0.5 ? GRIT_PINK : GRIT_DEEP, 0.15);
    harps(d, c, r, eyeR, rng);
    // Worn smooth and pale where feet have stood.
    pen.fill(blob(pt(c.x - r * 0.08, c.y - r * 0.1), r * 0.5, r * 0.42, rng, 0.2, 20), PAPER_FILL, 0.18);
    pen.stipple(stone, 520, () => 0.6, 0.5, GRIT_DEEP);
    for (let k = 0; k < 7; k++) {
      const p = polar(c, rng() * TAU, r * (0.45 + rng() * 0.5));
      const lr = 2 + rng() * 4.5;
      const patch = blob(p, lr, lr * 0.85, rng, 0.35, 14);
      pen.fill(patch, LICHEN, 0.55);
      pen.hair(closed(patch), 0.35, mix(LICHEN, d.ink, 0.5), 0.5);
      if (rng() < 0.6) pen.fill(oval(p.x + lr * 1.2, p.y + lr * 0.4, lr * 0.4, lr * 0.35, 8), LICHEN, 0.45);
    }
    // The bevel round the rim, darker on the far side.
    pen.hair(closed(blob(c, r * 0.9, r * 0.88, rng, 0.03, 44)), 0.6, d.ink, 0.35);
  });
  pen.crescent(stone, pt(-SHADOW.x * 6, -SHADOW.y * 6), () => pen.fill(stone, GRIT_DEEP, 0.45));
  pen.crescent(stone, pt(SHADOW.x * 4, SHADOW.y * 4), () => pen.fill(stone, PAPER_FILL, 0.25));
  pen.crescent(stone, pt(-SHADOW.x * 11, -SHADOW.y * 11), () => pen.hatch(stone, 3, 0.9, 0.45, { color: d.ink, alpha: 0.3 }));
  // The eye: a square hole, its far wall lit, clover grown in it.
  const ea = rng() * TAU;
  const eye = [0, 1, 2, 3].map((k) => polar(c, ea + Math.PI / 4 + (k * Math.PI) / 2, eyeR * Math.SQRT2));
  pen.fill(eye, UNDER, 0.9);
  pen.crescent(eye, pt(-3, -4.5), () => pen.fill(eye, EARTH, 0.65));
  for (let k = 0; k < 3; k++) {
    const lc = polar(c, ea + k * 2.1, eyeR * 0.45);
    pen.fill(oval(lc.x, lc.y, eyeR * 0.42, eyeR * 0.42, 10), LEAF, 0.9);
    pen.hair(closed(oval(lc.x, lc.y, eyeR * 0.2, eyeR * 0.14, 8)), 0.4, PAPER_FILL, 0.5);
    pen.hair(closed(oval(lc.x, lc.y, eyeR * 0.42, eyeR * 0.42, 10)), 0.35, d.ink, 0.6);
  }
  pen.stroke(outline(eye, 4), 1, d.ink, 0.9, false);
  // Chips out of the rim.
  for (let k = 0; k < 4; k++) {
    const a = rng() * TAU;
    const chip = blob(polar(c, a, r - 1), 4 + rng() * 4, 2.5 + rng() * 1.5, rng, 0.25, 10, a + Math.PI / 2);
    pen.clipped(stone, () => pen.fill(chip, GRIT_DEEP, 0.55));
    pen.hair(closed(chip).slice(5, 11), 0.6, d.ink, 0.7);
  }
  pen.stroke(closed(stone), 1.5, d.ink, 0.95);
  // Grass creeping back over the rim.
  for (let k = 0; k < 22; k++) {
    const a = rng() * TAU;
    const p = polar(c, a, r + 4);
    for (let j = 0; j < 3; j++) blade(d, polar(p, rng() * TAU, 1.5), a + Math.PI + (rng() - 0.5) * 1.3, 5 + rng() * 7, mix(LEAF, MOSS, rng()), 0.85, rng);
  }
}
