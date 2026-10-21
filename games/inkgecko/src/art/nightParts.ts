import { createRng, type Rng } from '../logic/rng';
import { blob, body, castShadow, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, lerp, normals, oval, pt, ribbon, TAU } from './kit';
import { nightBloom, nightLeaves, starlets } from './nightFlora';
import { BOX, BOX_DEEP, BOX_LIT, type Clump, clumps, glow, LAWN_DEEP, MOON, MOONSTONE, MOONSTONE_DEEP, NIGHT_SKY } from './nightKit';
import { drawGardenLantern } from './nightLantern';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { coverEnds, coverHalf, unit } from './tunnel';
import { mix } from './wash';

/**
 * The night garden's cover, deck and seat: a clipped yew hedge the groove
 * runs through in an arch, a little arched timber moon bridge carrying a
 * groove over another with a lantern on a post at one end, and a round
 * moonlit stepping stone in the lawn for the gecko, ringed with tiny pale
 * flowers.
 */
const TIMBER = '#7a6a5c';
const TIMBER_LIT = '#b9b2a8';
const RAIL = '#35302f';
const LICHEN_PALE = '#c9d0bb';
/** The ground tone under a raised groove in the night garden: moonlit boards. */
export const NIGHT_BED = '#7d8596';

/**
 * A clipped yew hedge over the stretch of groove `pts`, the groove passing
 * through it in an arch: a thick dark block of rounded clumps, its top
 * silvered by the moon, its ends cut square, a moonflower or two twined
 * over it. Fully covers a band wider than coverHalf either side.
 */
export function yewArch(d: Draw, pts: readonly Pt[], grooveW: number): void {
  if (pts.length < 2) return;
  const { pen } = d;
  const rng = createRng(Math.round(pts[0]!.x * 13 + pts[0]!.y * 7 + pts.length));
  const half = coverHalf(grooveW) + 4;
  coverEnds(d, pts, grooveW);
  const block = ribbon(pts, () => half * 2).shape;
  castShadow(d, block, 16, 0.28, NIGHT_SKY);
  castShadow(d, block, 8, 0.25, NIGHT_SKY);
  pen.fill(block, BOX_DEEP, 1);
  const nrm = normals(pts);
  const cs: Clump[] = [];
  const outer = half - 8.5;
  const rows = 7;
  for (let i = 0; i < pts.length; i += 2) {
    const stagger = (i / 2) % 2 === 0 ? 0 : outer / (rows - 1);
    for (let k = 0; k < rows; k++) {
      const off = -outer + ((2 * outer) / (rows - 1)) * k + stagger * (k === rows - 1 ? 0 : 1);
      const r = 8.6 + (rng() - 0.5) * 2;
      cs.push({ x: pts[i]!.x + nrm[i]!.x * off + (rng() - 0.5) * 2, y: pts[i]!.y + nrm[i]!.y * off + (rng() - 0.5) * 2, r });
    }
  }
  // Clipped square at the ends: the clumps stay inside the block.
  pen.clipped(ribbon(pts, () => half * 2 + 3).shape, () => {
    clumps(d, cs, { lift: 0, deep: BOX_DEEP, mid: mix(BOX, '#24403a', 0.3), lit: BOX_LIT, ticks: 6 }, rng);
  });
  // Its flat clipped top silvered towards the moon, the far side rolling away into shade.
  pen.crescent(block, pt(SHADOW.x * 12, SHADOW.y * 12), () => pen.fill(block, BOX_LIT, 0.2));
  pen.crescent(block, pt(-SHADOW.x * 14, -SHADOW.y * 14), () => pen.fill(block, '#06100c', 0.4));
  pen.crescent(block, pt(-SHADOW.x * 6, -SHADOW.y * 6), () => pen.fill(block, '#06100c', 0.3));
  // The cut ends: a straight clipped edge, the face catching the moon or turned from it.
  for (const [i, j] of [[0, Math.min(3, pts.length - 1)], [pts.length - 1, Math.max(0, pts.length - 4)]] as const) {
    const p = pts[i]!;
    const inward = unit(p, pts[j]!);
    const n = nrm[i]!;
    const a = pt(p.x + n.x * half, p.y + n.y * half);
    const b = pt(p.x - n.x * half, p.y - n.y * half);
    const face = [a, b, pt(b.x + inward.x * 5, b.y + inward.y * 5), pt(a.x + inward.x * 5, a.y + inward.y * 5)];
    const lit = -(inward.x * -SHADOW.x + inward.y * -SHADOW.y);
    pen.fill(face, lit > 0 ? BOX_LIT : '#0a120f', 0.25 + Math.abs(lit) * 0.2);
    pen.stroke([a, b], 1.3, d.ink, 0.9, false);
  }
  // A moonflower vine scrambling over the top.
  const flowers = Math.max(1, Math.round(pts.length / 30));
  for (let k = 0; k < flowers; k++) {
    const i = Math.min(pts.length - 1, Math.floor(((k + 0.3 + rng() * 0.4) / flowers) * pts.length));
    const o = (rng() - 0.5) * half * 0.9;
    const c = pt(pts[i]!.x + nrm[i]!.x * o, pts[i]!.y + nrm[i]!.y * o);
    const from = polar(c, rng() * TAU, 22);
    pen.hair([from, lerp(from, c, 0.5), c], 0.7, '#6f8f7d', 0.8);
    nightLeaves(d, c, 6, rng, 3);
    nightBloom(d, 'moonflower', c, 7.5, rng);
  }
}

/**
 * The night garden's deck: a little moon bridge, an arched timber
 * footbridge in the Chinese-garden way. Boards across, lit where the slope
 * faces the moon, dark-stained rails with posts curling out at the ends,
 * the arch's shadow swelling under its crown, and a lantern on a post at
 * one end.
 */
export function moonBridge(d: Draw, pts: readonly Pt[], half: number, _grooveW: number, rng: Rng): void {
  const { pen } = d;
  const last = pts.length - 1;
  const nrm = normals(pts);
  const dir = unit(pts[0]!, pts[last]!);
  // The near ramp faces back along -dir: towards the moon when the bridge runs away from it.
  const towardMoon = dir.x * SHADOW.x + dir.y * SHADOW.y;
  // The arch stands high in the middle: its shadow reaches further there.
  const lift = (i: number): number => 5 + 22 * Math.sin((Math.PI * i) / last);
  const wide = half + 5;
  const sh = [...pts.map((p, i) => pt(p.x + nrm[i]!.x * wide + SHADOW.x * lift(i), p.y + nrm[i]!.y * wide + SHADOW.y * lift(i))), ...[...pts].reverse().map((p, k) => pt(p.x - nrm[last - k]!.x * wide + SHADOW.x * lift(last - k), p.y - nrm[last - k]!.y * wide + SHADOW.y * lift(last - k)))];
  pen.fill(sh, NIGHT_SKY, 0.4);
  pen.fill(ribbon(pts, () => wide * 2 - 2).shape, '#1c1a20', 0.85);
  // The boards, each lit by how its bit of slope faces the moon.
  for (let i = 0; i < last; i += 2) {
    const j = Math.min(last, i + 2);
    const [a, b] = [lerp(pts[i]!, pts[j]!, 0.08), lerp(pts[i]!, pts[j]!, 0.92)];
    const [na, nb] = [nrm[i]!, nrm[j]!];
    const reach = wide - 1 - rng() * 1.2;
    const plank = [pt(a.x + na.x * reach, a.y + na.y * reach), pt(b.x + nb.x * reach, b.y + nb.y * reach), pt(b.x - nb.x * reach, b.y - nb.y * reach), pt(a.x - na.x * reach, a.y - na.y * reach)];
    const u = (i + 1) / last;
    const slope = Math.cos(Math.PI * u) * towardMoon;
    body(d, plank, mix(TIMBER, rng() < 0.5 ? '#6c6f7c' : TIMBER, rng() * 0.5), 0.88);
    pen.fill(plank, slope > 0 ? TIMBER_LIT : '#121018', Math.abs(slope) * 0.55 + (slope > 0 ? 0 : 0.08));
    pen.fill(plank, MOON, 0.2 * Math.sin(Math.PI * u) ** 4);
    pen.hair([lerp(plank[0]!, plank[3]!, 0.3), lerp(plank[1]!, plank[2]!, 0.32)], 0.35, d.ink, 0.35);
    pen.stroke(outline(plank, 5), 0.6, d.ink, 0.75, false);
  }
  // Rails along both sides, curling outwards at the ends, on square posts.
  for (const s of [1, -1]) {
    const off = wide - 2.5;
    const line = pts.map((p, i) => pt(p.x + nrm[i]!.x * s * off, p.y + nrm[i]!.y * s * off));
    const curl = (p: Pt, out: Pt, n: Pt): Pt[] => [pt(p.x + out.x * 5 + n.x * s * 2, p.y + out.y * 5 + n.y * s * 2), pt(p.x + out.x * 9 + n.x * s * 6, p.y + out.y * 9 + n.y * s * 6)];
    const rail = [...curl(line[0]!, pt(-dir.x, -dir.y), nrm[0]!).reverse(), ...line, ...curl(line[last]!, dir, nrm[last]!)];
    const shape = ribbon(rail, () => 4.4).shape;
    castShadow(d, shape, 6, 0.3, NIGHT_SKY);
    pen.fill(shape, RAIL, 1);
    pen.stroke(rail.map((p) => pt(p.x - SHADOW.x * 1.1, p.y - SHADOW.y * 1.1)), 1, '#8d8ea0', 0.55, false);
    pen.stroke(closed(shape), 0.8, d.ink, 0.95, false);
    // Posts at the ends and quarters, each with a round cap.
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const p = line[Math.round(t * last)]!;
      const sq = outline([0, 1, 2, 3].map((k) => polar(p, Math.atan2(dir.y, dir.x) + Math.PI / 4 + (k * Math.PI) / 2, 4.4)), 2);
      castShadow(d, sq, 6 + lift(Math.round(t * last)) * 0.5, 0.3, NIGHT_SKY);
      pen.fill(sq, RAIL, 1);
      pen.stroke(closed(sq), 0.8, d.ink, 0.95, false);
      const cap = oval(p.x, p.y, 2.3, 2.3, 12);
      pen.fill(cap, '#77788a', 1);
      pen.fill(oval(p.x - 0.7, p.y - 0.9, 1, 0.9, 8), '#c9ccd8', 0.8);
      pen.hair(closed(cap), 0.5, d.ink, 0.9);
    }
  }
  // The lantern on its post just off the bridge's first corner.
  const p0 = pts[0]!;
  const lamp = pt(p0.x + nrm[0]!.x * (wide + 8) - dir.x * 7, p0.y + nrm[0]!.y * (wide + 8) - dir.y * 7);
  glow(pen.ctx, lamp, 46, 0.35);
  pen.ctx.save();
  pen.ctx.translate(lamp.x, lamp.y);
  pen.ctx.scale(0.5, 0.5);
  drawGardenLantern(d, true);
  pen.ctx.restore();
}

/**
 * A round stepping stone sunk in the dew-wet lawn, radius r at c, for the
 * gecko to sit on: pale and moonlit on its upper left, shaded and hatched
 * on its far side, freckled with lichen and beaded with dew, ringed with
 * tiny pale flowers.
 */
export function moonStone(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = createRng(Math.round(c.x * 29 + c.y * 13));
  const bed = blob(c, r + 13, r + 12, rng, 0.08, 40);
  pen.fill(bed, LAWN_DEEP, 0.28);
  // Mats of creeping thyme round it, starred with tiny pale flowers.
  const stars: Pt[] = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * TAU + rng() * 0.5;
    const m = polar(c, a, r + 8);
    pen.fill(blob(m, 9 + rng() * 5, 6 + rng() * 3, rng, 0.3, 24, a + Math.PI / 2), '#2a4236', 0.7);
    for (let j = 0; j < 6; j++) stars.push(polar(m, rng() * TAU, Math.sqrt(rng()) * 8));
  }
  starlets(pen.ctx, stars, 1.3);
  const stone = blob(c, r, r * 0.97, rng, 0.04, 56);
  castShadow(d, stone, 5, 0.4, NIGHT_SKY);
  body(d, stone, mix(MOONSTONE, '#9aa4b6', 0.4), 0.92);
  pen.clipped(stone, () => {
    for (let k = 0; k < 8; k++) pen.fill(blob(polar(c, rng() * TAU, rng() * r * 0.75), r * (0.14 + rng() * 0.2), r * (0.1 + rng() * 0.14), rng, 0.3, 14, rng() * TAU), rng() < 0.5 ? MOONSTONE_DEEP : '#c3cad8', 0.18);
    pen.fill(blob(pt(c.x - r * 0.22, c.y - r * 0.28), r * 0.5, r * 0.4, rng, 0.2, 20), MOON, 0.22);
    pen.stipple(stone, 420, () => 0.6, 0.5, MOONSTONE_DEEP);
    for (let k = 0; k < 6; k++) {
      const p = polar(c, rng() * TAU, r * (0.4 + rng() * 0.5));
      const lr = 2 + rng() * 4;
      pen.fill(blob(p, lr, lr * 0.85, rng, 0.35, 14), LICHEN_PALE, 0.45);
    }
    // A hairline crack, and the worn bevel of the rim.
    const a = rng() * TAU;
    pen.hair([polar(c, a, r * 0.95), polar(c, a + 0.2, r * 0.6), polar(c, a + 0.1, r * 0.3)], 0.5, d.ink, 0.5);
    pen.hair(closed(blob(c, r * 0.9, r * 0.88, rng, 0.03, 44)), 0.5, d.ink, 0.25);
  });
  pen.crescent(stone, pt(-SHADOW.x * 7, -SHADOW.y * 7), () => pen.fill(stone, MOONSTONE_DEEP, 0.5));
  pen.crescent(stone, pt(-SHADOW.x * 12, -SHADOW.y * 12), () => pen.hatch(stone, 3, 0.9, 0.45, { color: d.ink, alpha: 0.35 }));
  pen.crescent(stone, pt(SHADOW.x * 4, SHADOW.y * 4), () => pen.fill(stone, PAPER_FILL, 0.3));
  // Dew beads: each a dark-edged drop with a point of moonlight.
  for (let k = 0; k < 16; k++) {
    const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.85);
    const br = 0.9 + rng() * 1.2;
    pen.fill(oval(p.x + 0.4, p.y + 0.6, br, br, 8), MOONSTONE_DEEP, 0.5);
    pen.dot(p.x - br * 0.3, p.y - br * 0.35, br * 0.4, PAPER_FILL, 0.95);
  }
  pen.stroke(closed(stone), 1.5, d.ink, 0.95);
}
