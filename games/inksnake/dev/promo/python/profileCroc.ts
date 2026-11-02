import { capsule, type Draw, edge, normals, shade } from '../../../src/art/kit';
import { INK } from '../../../src/art/palette';
import { mix } from '../../../src/art/wash';
import type { Pt } from '../sprites';
import { CROC_L, crocHalfAt, crocPoint, HIPS_U, type HookShot } from './profile';

/**
 * The freshwater croc's back half, side on, going into the python's mouth:
 * pale brown with dark crossbands, a pale belly, rows of square scales, the
 * bony bumps along its back and the crest running down its curled tail, and
 * both hind legs, the near one braced on the mud, the far one kicking, both
 * folding back along its flanks as the hips reach the lips.
 */

const CROC = {
  base: '#94784a',
  back: '#6f5733',
  belly: '#dccb98',
  band: '#3f3220',
  crest: '#5e4f33',
  claw: '#2a2418',
} as const;

const STEP = 1.5;

interface CrocSide {
  readonly spine: readonly Pt[];
  readonly a: readonly number[];
  readonly halves: readonly number[];
  readonly top: readonly Pt[];
  readonly bot: readonly Pt[];
  readonly shape: readonly Pt[];
}

/** The croc from its tail tip forward to `a0` (a little way inside the lips, which hide it). */
function crocSide(shot: HookShot, a0: number): CrocSide {
  const a: number[] = [];
  for (let x = CROC_L; x > a0; x -= STEP) a.push(x);
  a.push(a0);
  const spine = a.map((x) => crocPoint(shot, x));
  const halves = a.map((x) => Math.max(0.6, crocHalfAt(x)));
  const n = normals(spine);
  const top = spine.map((p, i) => ({ x: p.x + n[i]!.x * halves[i]!, y: p.y + n[i]!.y * halves[i]! }));
  const bot = spine.map((p, i) => ({ x: p.x - n[i]!.x * halves[i]!, y: p.y - n[i]!.y * halves[i]! }));
  return { spine, a, halves, top, bot, shape: [...top, ...[...bot].reverse()] };
}

/** Points at depth v (-1 back .. 1 belly) for the stretch of the croc between a1 > a2. */
function strip(c: CrocSide, a1: number, a2: number, v: number): Pt[] {
  const n = normals(c.spine);
  const out: Pt[] = [];
  c.a.forEach((x, i) => {
    if (x <= a1 && x >= a2) out.push({ x: c.spine[i]!.x - n[i]!.x * c.halves[i]! * v, y: c.spine[i]!.y - n[i]!.y * c.halves[i]! * v });
  });
  return out;
}

const bandOf = (c: CrocSide, a1: number, a2: number, v0: number, v1: number): Pt[] => [...strip(c, a1, a2, v0), ...strip(c, a1, a2, v1).reverse()];

/** The croc's local frame at `a`: its spine point, forward (towards its head) and down (towards its belly). */
function frameAt(shot: HookShot, a: number): { o: Pt; f: Pt; dn: Pt } {
  const o = crocPoint(shot, a);
  const q = crocPoint(shot, a - 2);
  const l = Math.hypot(q.x - o.x, q.y - o.y) || 1;
  const f = { x: (q.x - o.x) / l, y: (q.y - o.y) / l };
  // Down: the right of forward when it points right (+x), as the art's y runs down.
  return { o, f, dn: { x: -f.y, y: f.x } };
}

type LegPose = readonly [knee: Pt, ankle: Pt, toe: Pt];

const lerpPt = (a: Pt, b: Pt, k: number): Pt => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const blend = (a: LegPose, b: LegPose, k: number): LegPose => [lerpPt(a[0], b[0], k), lerpPt(a[1], b[1], k), lerpPt(a[2], b[2], k)];

/** Legs in the croc's frame (forward, down) from the hip: braced on the mud, kicking back, and folded along the flank. */
const BRACED: LegPose = [{ x: 10, y: 29 }, { x: 4, y: 37 }, { x: 12, y: 38.5 }];
const KICKING: LegPose = [{ x: -12, y: 27 }, { x: -25, y: 31 }, { x: -34, y: 26 }];
const FOLDED: LegPose = [{ x: -12, y: 15 }, { x: -24, y: 16 }, { x: -32, y: 14 }];

function drawLeg(d: Draw, shot: HookShot, pose: LegPose, near: boolean): void {
  const a = HIPS_U * CROC_L;
  const { o, f, dn } = frameAt(shot, a);
  const h = crocHalfAt(a);
  const at = (q: Pt): Pt => ({ x: o.x + f.x * q.x + dn.x * q.y, y: o.y + f.y * q.x + dn.y * q.y });
  const hip = at({ x: 0, y: h * 0.45 });
  const [knee, ankle, toe] = pose.map(at) as [Pt, Pt, Pt];
  const tone = near ? CROC.base : mix(CROC.base, '#21180d', 0.42);
  // Toes fanned from the end of the foot, each with a dark claw.
  const dir = Math.atan2(toe.y - ankle.y, toe.x - ankle.x);
  const toes = [0, 1, 2, 3].map((k) => {
    const ang = dir + (k - 1.5) * 0.34;
    const len = 5.6 - Math.abs(k - 1.5) * 0.9;
    return { ang, tip: { x: toe.x + Math.cos(ang) * len, y: toe.y + Math.sin(ang) * len } };
  });
  const parts = [
    capsule(hip, knee, 13, 7.6), capsule(knee, ankle, 7.4, 5), capsule(ankle, toe, 5.4, 3.6), ...toes.map((t) => capsule(toe, t.tip, 1.9, 1)),
  ];
  // One silhouette: every part's contour first, then every fill over the inner lines.
  for (const s of parts) edge(d, s, 2.2);
  for (const s of parts) d.pen.fill(s, tone, 1);
  for (const s of parts.slice(0, 3)) shade(d, s, 0.4);
  for (const t of toes) d.pen.stroke([t.tip, { x: t.tip.x + Math.cos(t.ang) * 1.7, y: t.tip.y + Math.sin(t.ang) * 1.7 + 0.4 }], 0.9, CROC.claw, 1, false);
  // Scale rings round the shin.
  for (let k = 1; k < 4; k++) {
    const p = lerpPt(knee, ankle, k / 4);
    const nx = -(ankle.y - knee.y);
    const ny = ankle.x - knee.x;
    const l = Math.hypot(nx, ny) || 1;
    d.pen.hair([{ x: p.x + (nx / l) * 2.4, y: p.y + (ny / l) * 2.4 }, { x: p.x - (nx / l) * 2.4, y: p.y - (ny / l) * 2.4 }], 0.35, INK, 0.45);
  }
}

function legPoses(shot: HookShot): { near: LegPose; far: LegPose } {
  const kick = shot.kick;
  const near: LegPose = [
    { x: BRACED[0].x + kick * 1.2, y: BRACED[0].y }, { x: BRACED[1].x + kick * 1.6, y: BRACED[1].y }, { x: BRACED[2].x + kick * 2, y: BRACED[2].y },
  ];
  const far: LegPose = [
    { x: KICKING[0].x - kick * 1.5, y: KICKING[0].y - kick * 1.5 }, { x: KICKING[1].x - kick * 3, y: KICKING[1].y - kick * 3 }, { x: KICKING[2].x - kick * 4, y: KICKING[2].y - kick * 5 },
  ];
  return { near: blend(near, FOLDED, shot.fold), far: blend(far, FOLDED, shot.fold) };
}

/** The croc inside the neck, showing faintly through the stretched skin: its dark bands and its outline. */
export function drawCrocInside(d: Draw, shot: HookShot): void {
  const c = crocSide(shot, 0);
  for (let u = 0.2; u < shot.p + 0.02; u += 0.065) d.pen.fill(bandOf(c, u * CROC_L + 7, u * CROC_L - 3, -1, 0.4), CROC.band, 0.16);
  d.pen.hair(c.top.filter((_, i) => i % 2 === 0), 0.5, CROC.band, 0.3);
}

/** Draws what's outside the mouth of the croc (the caller clips to it), far leg first, then the body, then the near leg. */
export function drawCroc(d: Draw, dNear: Draw, shot: HookShot): void {
  const { pen } = d;
  const a0 = Math.max(0, shot.p * CROC_L - 10);
  const c = crocSide(shot, a0);
  if (c.spine.length < 3) return;
  const legs = legPoses(shot);
  const hipsOut = HIPS_U * CROC_L > shot.p * CROC_L - 14;
  if (hipsOut) drawLeg(d, shot, legs.far, false);
  // Body: washes, belly, bands, scales.
  pen.fill(c.shape, CROC.base, 1);
  pen.fill(bandOf(c, CROC_L, a0, -1, -0.45), CROC.back, 0.8);
  pen.fill(bandOf(c, CROC_L, a0, 0.35, 1), CROC.belly, 0.9);
  for (let u = 0.38; u < 0.97; u += 0.065) {
    const ac = u * CROC_L;
    if (ac < a0) continue;
    pen.fill(bandOf(c, ac + 7, ac - 3, -1, 0.4), CROC.band, 0.5);
  }
  for (let x = CROC_L - 3; x > a0; x -= 3.4) {
    const i = c.a.findIndex((y) => y <= x);
    if (i < 0) continue;
    pen.hair([c.top[i]!, c.bot[i]!], 0.3, INK, 0.14);
  }
  for (const v of [-0.5, 0.05, 0.42]) pen.hair(strip(c, CROC_L * 0.95, a0, v).filter((_, i) => i % 2 === 0), 0.3, INK, 0.18);
  shade(d, c.shape, 0.36);
  // The bumps on its back and the crest down its tail.
  const n = normals(c.spine);
  c.a.forEach((x, i) => {
    const u = x / CROC_L;
    if (u < 0.29 || u > 0.96 || i % 3 !== 0) return;
    const p = c.top[i]!;
    const back = c.top[Math.max(0, i - 1)]!;
    const fwd = c.top[Math.min(c.top.length - 1, i + 2)]!;
    const tall = u < HIPS_U ? 1.3 : 3.3 * (1 - u) + 0.8;
    const out = { x: p.x + n[i]!.x * tall, y: p.y + n[i]!.y * tall };
    const tip = { x: out.x + (back.x - p.x) * 0.9, y: out.y + (back.y - p.y) * 0.9 };
    const tri = [back, tip, fwd];
    pen.fill(tri, CROC.crest, 1);
    pen.stroke(tri, 0.6, INK, 0.9, false);
  });
  edge(d, c.shape, 1.4);
  // The dusk light along its back.
  pen.stroke(c.top.filter((_, i) => i % 2 === 0).map((p, i) => ({ x: p.x + n[i * 2]!.x * -1.2, y: p.y + n[i * 2]!.y * -1.2 })), 1.1, '#f2a65a', 0.45, false);
  if (hipsOut) drawLeg(dNear, shot, legs.near, true);
}
