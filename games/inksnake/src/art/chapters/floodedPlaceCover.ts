import type { Rng } from '../../logic/rng';
import type { CoverDef } from '../../level/types';
import { blob, polar, SHADOW } from '../groundKit';
import { closed, type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { mix } from '../wash';
import {
  LETTUCE, LETTUCE_DEEP, LETTUCE_LIT, REED, REED_DEEP, REED_STRAW, rngAt, SEDGE_LIT, SHADE, strokePath, TEA_DEEP,
} from './floodedPlaceKit';
import { lilies } from './floodedPlaceLily';

/**
 * The Flooded Forest's cover, painted on the layer over the snake: water
 * lilies (floodedPlaceLily.ts), a raft of water lettuce (pale velvety
 * rosettes packed close, each leaf fluted with ribs), and a stand of reeds
 * on a bank (blades fanning out from their clumps, some gone to straw,
 * brown plumes nodding over them). Each opaque, inside about r × 1.12.
 */

/** One water-lettuce rosette: spoon-shaped leaves round a hollow heart, lit at their tips, ribbed lengthwise. */
function rosette(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const n = 7 + Math.floor(rng() * 3);
  const ph = rng() * TAU;
  const leaves: Pt[][] = [];
  for (let i = 0; i < n; i++) {
    const a = ph + ((i + (rng() - 0.5) * 0.3) / n) * TAU;
    const l = s * (0.85 + rng() * 0.25);
    const wide = s * 0.42;
    const side = pt(-Math.sin(a), Math.cos(a));
    const at = (t: number, v: number): Pt => {
      const p = polar(c, a, s * 0.12 + l * t);
      const w = wide * Math.sin(Math.PI * Math.min(1, t * 0.85 + 0.1)) * (0.4 + 0.6 * t);
      return pt(p.x + side.x * w * v, p.y + side.y * w * v);
    };
    const ts = [0, 0.2, 0.4, 0.6, 0.8, 0.92, 1];
    leaves.push([...ts.map((t) => at(t, 1)), ...[...ts].reverse().slice(1).map((t) => at(t, -1))]);
  }
  for (const leaf of leaves) pen.fill(leaf.map((p) => pt(p.x + SHADOW.x * 1.2, p.y + SHADOW.y * 1.2)), SHADE, 0.3);
  for (const [i, leaf] of leaves.entries()) {
    pen.fill(leaf, mix(LETTUCE, i % 2 ? LETTUCE_LIT : LETTUCE_DEEP, 0.25 + rng() * 0.2), 0.97);
    pen.clipped(leaf, () => {
      const tip = leaf[6]!;
      glaze(pen.ctx, tip.x, tip.y, s * 0.45, s * 0.45, 0, LETTUCE_LIT, 0.55);
      glaze(pen.ctx, c.x, c.y, s * 0.5, s * 0.5, 0, LETTUCE_DEEP, 0.6);
    });
    // The ribs running out along the leaf.
    const root = leaf[0]!;
    for (const k of [2, 3, 4]) pen.hair([root, leaf[k]!, leaf[k + 1]!].map((p, j) => (j === 0 ? p : pt((p.x + leaf[6]!.x) / 2, (p.y + leaf[6]!.y) / 2))), 0.25, LETTUCE_DEEP, 0.5);
    pen.hair(closed(leaf), 0.35, d.ink, 0.45);
  }
  pen.dot(c.x, c.y, s * 0.12, LETTUCE_DEEP, 0.9);
}

function waterLettuce(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const mat = blob(c, r * 1.02, r * 0.96, rng, 0.12, 28, rng() * TAU);
  pen.fill(mat.map((p) => pt(p.x + SHADOW.x * 2.5, p.y + SHADOW.y * 2.5)), SHADE, 0.3);
  pen.fill(mat, LETTUCE_DEEP, 0.97);
  pen.clipped(mat, () => glaze(pen.ctx, c.x + r * 0.3, c.y + r * 0.3, r, r, 0, TEA_DEEP, 0.3));
  const spots: { p: Pt; s: number }[] = [];
  for (let k = 0; k < 400 && spots.length < 34; k++) {
    const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.95);
    const s = 6 + rng() * 5;
    if (Math.hypot(p.x - c.x, p.y - c.y) + s * 0.8 > r * 1.1) continue;
    if (spots.some((q) => Math.hypot(q.p.x - p.x, q.p.y - p.y) < (q.s + s) * 0.62)) continue;
    spots.push({ p, s });
  }
  // Back to front: those lower down lie a little over those above.
  spots.sort((a, b) => a.p.y - b.p.y);
  for (const q of spots) rosette(d, q.p, q.s, rng);
}

/** A stand of reeds on a bank: long blades arching out of a few clumps, dark under, lit on top, some gone to straw, feathery brown plumes nodding over. */
function reeds(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const { ctx } = pen;
  const mat = blob(c, r * 0.9, r * 0.85, rng, 0.2, 26, rng() * TAU);
  pen.fill(mat.map((p) => pt(p.x + SHADOW.x * 6, p.y + SHADOW.y * 6)), SHADE, 0.32);
  pen.fill(mat, REED_DEEP, 0.95);
  const clumps = Array.from({ length: 5 + Math.floor(rng() * 3) }, () => polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.5));
  const layers: [string, number, number, number, number][] = [
    [REED_DEEP, 0.95, 1.5, 0.75, 40],
    [mix(REED, REED_DEEP, 0.4), 0.92, 1.2, 0.95, 34],
    [REED, 0.9, 1, 1.05, 26],
    [mix(REED, SEDGE_LIT, 0.55), 0.9, 0.8, 1.1, 18],
    [REED_STRAW, 0.8, 0.7, 1, 6],
  ];
  const tips: Pt[] = [];
  for (const [li, [col, alpha, width, reach, count]] of layers.entries()) {
    const marks: [number, number, number, number, number][] = [];
    for (const cl of clumps) {
      const lean = Math.atan2(cl.y - c.y, cl.x - c.x);
      for (let k = 0; k < count; k++) {
        // Blades fan out from the clump, leaning away from the stand's middle, arching as they go.
        const a = rng() < 0.6 ? lean + (rng() - 0.5) * 2.4 : rng() * TAU;
        const room = Math.max(4, r * 1.08 - Math.hypot(cl.x - c.x, cl.y - c.y) * Math.max(0, Math.cos(a - lean)));
        const l = Math.min(room, r * reach * (0.4 + rng() * 0.55));
        marks.push([cl.x, cl.y, a, l, (rng() < 0.5 ? -1 : 1) * l * (0.08 + rng() * 0.12)]);
        if (li === 2 && rng() < 0.12) tips.push(polar(cl, a, l * 0.85));
      }
    }
    if (li === 0) strokePath(ctx, marks.map(([x, y, a, l, b]) => [x + 1.4, y + 2, a, l, b] as const), SHADE, 0.35, width);
    strokePath(ctx, marks, col, alpha, width);
  }
  // Plumes: feathery brown seed heads, each a spray of fine hairs from a stem.
  for (const t of tips.slice(0, 8)) {
    const a = rng() * TAU;
    const plume = blob(polar(t, a, 3), 5, 2.2, rng, 0.3, 12, a);
    pen.fill(plume.map((p) => pt(p.x + SHADOW.x * 2.5, p.y + SHADOW.y * 2.5)), SHADE, 0.3);
    pen.fill(plume, '#7e5e3c', 0.85);
    pen.clipped(plume, () => glaze(ctx, t.x - 1, t.y - 1, 4, 2.4, a, '#d2b582', 0.7));
    for (let k = 0; k < 6; k++) pen.hair([polar(t, a, 1 + k * 0.9), polar(t, a + (k % 2 ? 0.5 : -0.5), 2.6 + k * 0.9)], 0.25, '#e2cc9a', 0.7);
    pen.hair([t, polar(t, a + Math.PI, 4)], 0.4, REED_DEEP, 0.8);
  }
}

export function paintFloodedCover(d: Draw, cv: CoverDef): void {
  const c = pt(cv.x, cv.y);
  const rng = rngAt(cv.x, cv.y, 3);
  if (cv.look === 'water-lettuce') waterLettuce(d, c, cv.r, rng);
  else if (cv.look === 'reeds') reeds(d, c, cv.r, rng);
  else lilies(d, c, cv.r, rng);
}
