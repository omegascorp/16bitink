import { hash } from '../logic/noise';
import { capsule, cub, oval, pt, type Draw } from './kit';
import { dab, gleam, glow, mix, paint, SHADOW, soft } from './paint';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { lash, rib } from './aster/gear';
import { ASTER } from './aster/style';

/**
 * The Aster craft out of the water (spec, "Brine", the ending): standing on
 * dry ground on four claw legs with petal pads for feet, and lifting off,
 * its legs folded up under the hull, teal thrust under it and the last of
 * Brine's sea dripping off it. The hull itself is drawn by asterCraftArt.ts;
 * this is what's added round it. Coordinates are in the hull's own frame
 * (keel at y -16, the rim at -54, half-width 50 at the rim), as there.
 */

export type GroundState = 'landed' | 'flying';

/** How high the hull rides over its origin: up on its legs, or lifting off (bobbing a little with the boil). */
export function craftLift(state: GroundState, f: number): number {
  return state === 'landed' ? 10 : 25 + [0, -1, 0.7][f]!;
}

const DRIP = '#b8b4d6';
const DUST = '#bfae9c';

/** Where each leg joins the hull, under the cup, and how it's posed: out and down to the ground, or folded under. */
interface LegPose {
  readonly hip: Pt;
  readonly knee: Pt;
  readonly foot: Pt;
  readonly far: boolean;
}

function legPoses(state: GroundState, lift: number): LegPose[] {
  if (state === 'landed') {
    const near = (s: number): LegPose => ({ hip: pt(s * 30, -24), knee: pt(s * 52, -27), foot: pt(s * 61, lift), far: false });
    const far = (s: number): LegPose => ({ hip: pt(s * 16, -20), knee: pt(s * 34, -22), foot: pt(s * 40, lift - 1.5), far: true });
    return [far(-1), far(1), near(-1), near(1)];
  }
  // Folded: the thigh tucked up along the hull, the shin folded back in under the keel, its pad turned up.
  const near = (s: number): LegPose => ({ hip: pt(s * 30, -24), knee: pt(s * 48, -24), foot: pt(s * 40, -9), far: false });
  const far = (s: number): LegPose => ({ hip: pt(s * 16, -20), knee: pt(s * 31, -21), foot: pt(s * 25, -8), far: true });
  return [far(-1), far(1), near(-1), near(1)];
}

/** The socket a leg turns in: a glazed boss on the hull's underside, lashed on. */
function hipBoss(d: Draw, at: Pt, far: boolean): void {
  const wash = far ? mix(ASTER.glaze, SHADOW, 0.3) : mix(ASTER.shell, ASTER.glaze, 0.35);
  paint(d, oval(at.x, at.y, 5.2, 4, 14), wash, { alpha: 1, shadow: 0.5, hatch: 0, line: 0.6, gloss: true });
  if (!far) lash(d, pt(at.x - 1.6, at.y - 3.4), pt(at.x + 1.6, at.y + 3.4), 2);
}

/** A petal pad for a foot: a curved scoop of ceramic, ribbed, laid flat on the ground (or, folded, hanging under the foot, smaller in its tuck). */
function footPad(d: Draw, foot: Pt, w: number, wash: string): void {
  const shape = [pt(foot.x - w, foot.y), ...cub(pt(foot.x - w, foot.y), pt(foot.x - w * 0.8, foot.y - 4), pt(foot.x + w * 0.8, foot.y - 4.4), pt(foot.x + w, foot.y), 8), ...cub(pt(foot.x + w, foot.y), pt(foot.x + w * 0.4, foot.y + 1.2), pt(foot.x - w * 0.4, foot.y + 1.2), pt(foot.x - w, foot.y), 6).slice(1)];
  paint(d, shape, wash, { alpha: 1, shadow: 0.5, hatch: 0.1, line: 0.6, gloss: true });
  for (const k of [-0.45, 0, 0.45]) rib(d, pt(foot.x + k * w * 0.4, foot.y - 0.4), pt(foot.x + k * w * 1.4, foot.y - 2.6), 0);
}

/** One claw leg, like their lander's: a ribbed thigh out to the knee, a shin bowing down to a petal pad, cord at the knee. */
function leg(d: Draw, p: LegPose, flat: boolean): void {
  const wash = p.far ? mix(ASTER.shell, SHADOW, 0.32) : ASTER.shell;
  const thigh = capsule(p.hip, p.knee, 6.4, 5);
  paint(d, thigh, wash, { alpha: 1, shadow: 0.5, hatch: 0.12, line: 0.7, gloss: true });
  d.pen.clipped(thigh, () => dab(d, capsule(pt(p.hip.x, p.hip.y + 2), pt(p.knee.x, p.knee.y + 2), 3, 2.4), ASTER.glaze, 0.5, 1));
  const out = Math.sign(p.knee.x - p.hip.x) || 1;
  const bow = pt((p.knee.x + p.foot.x) / 2 + out * (flat ? 5 : 2), (p.knee.y + p.foot.y) / 2);
  const end = pt(p.foot.x, p.foot.y - (flat ? 2 : 0));
  const shin = [
    ...cub(pt(p.knee.x - 2.4, p.knee.y), pt(bow.x - 2.6, bow.y - 3), pt(end.x - 1.4, end.y - 6), end, 8),
    ...cub(end, pt(end.x + 1.6, end.y - 6), pt(bow.x + 2.6, bow.y - 3), pt(p.knee.x + 2.4, p.knee.y), 8),
  ];
  paint(d, shin, wash, { alpha: 1, shadow: 0.55, hatch: 0.12, line: 0.7, gloss: true });
  d.pen.clipped(shin, () => rib(d, pt(p.knee.x, p.knee.y + 2), pt(end.x, end.y - 3), out * 2));
  if (!p.far) gleam(d, [pt(bow.x - out * 1.2, bow.y - 5), pt(bow.x - out * 1.4, bow.y + 3)], 0.6, 0.6);
  footPad(d, p.foot, flat ? 7.5 : 5, wash);
  lash(d, pt(p.knee.x - 2.6, p.knee.y - 2.2), pt(p.knee.x + 2.6, p.knee.y + 2.2), 2);
}

/** The legs behind the hull (`far`), or in front of it: drawn before and after the hull. */
export function craftLegs(d: Draw, state: GroundState, lift: number, far: boolean): void {
  for (const p of legPoses(state, lift).filter((l) => l.far === far)) {
    leg(d, p, state === 'landed');
    hipBoss(d, p.hip, p.far);
  }
}

/** Under it on the ground: its shadow and the dents of its feet, or (lifting off) the shadow left behind as it rises. */
export function craftGround(d: Draw, state: GroundState): void {
  if (state === 'landed') {
    dab(d, oval(0, 0.6, 56, 3.4, 28), SHADOW, 0.16, 2.4);
    for (const x of [-61, -40, 40, 61]) dab(d, oval(x, 0.4, 9, 1.8, 16), SHADOW, x === 40 || x === -40 ? 0.12 : 0.22, 0.8);
    return;
  }
  dab(d, oval(0, 0.6, 40, 2.6, 24), SHADOW, 0.1, 3);
  // The dents its feet left, and grit thrown out by the thrust.
  for (const x of [-61, 61]) d.pen.hair(cub(pt(x - 6, 0.4), pt(x - 3, 1.6), pt(x + 3, 1.6), pt(x + 6, 0.4), 6), 0.5, mix(DUST, SHADOW, 0.5), 0.6);
  for (let k = 0; k < 9; k++) {
    const s = k % 2 ? 1 : -1;
    const x = s * (16 + hash(k, d.f, 6700) * 40);
    const y = -1 - hash(k, d.f, 6701) * 7;
    d.pen.dot(x, y, 0.3 + hash(k, 3, 6702) * 0.3, mix(DUST, SHADOW, 0.3), 0.6);
  }
}

/** Water still running off it as it rises (in the ground's frame, the hull `lift` up): drops falling from its underside, a little lower each frame. */
export function craftDrips(d: Draw, lift: number): void {
  for (let k = 0; k < 7; k++) {
    const x = (hash(k, 1, 6710) - 0.5) * 84;
    const from = -lift - (Math.abs(x) > 30 ? 30 : 20);
    const fall = ((Math.floor(hash(k, 2, 6711) * 3) + d.f) % 3) / 3 + hash(k, 4, 6713) * 0.2;
    const y = from + 4 + fall * (-from - 6);
    const r = 0.7 + hash(k, 3, 6712) * 0.4;
    const drop = [pt(x, y - r * 2.6), ...cub(pt(x, y - r * 2.6), pt(x + r * 0.4, y - r), pt(x + r * 1.1, y - r * 0.2), pt(x + r, y + r * 0.4), 5).slice(1), ...cub(pt(x + r, y + r * 0.4), pt(x + r * 0.7, y + r * 1.3), pt(x - r * 0.7, y + r * 1.3), pt(x - r, y + r * 0.4), 5).slice(1), ...cub(pt(x - r, y + r * 0.4), pt(x - r * 1.1, y - r * 0.2), pt(x - r * 0.4, y - r), pt(x, y - r * 2.6), 5).slice(1)];
    paint(d, drop, DRIP, { alpha: 0.85, shadow: 0.3, hatch: 0, line: 0.35, gloss: true });
    d.pen.dot(x - r * 0.35, y - r * 0.2, r * 0.3, PAPER_FILL, 0.9);
  }
}

/**
 * The thrust under it (drawn after the finish, so it isn't outlined): a
 * teal glow out of each petal thruster, tongues of light reaching down, and
 * where they meet the ground, a wash of light and blown dust. `lift` is the
 * hull's height over the ground; the thrusters' mouths are at y -6 in its frame.
 */
export function craftThrust(d: Draw, lift: number): void {
  const { ctx } = d.pen;
  const mouth = -6 - lift;
  const breathe = [1, 0.85, 1.12][d.f]!;
  glow(ctx, pt(0, mouth + 4), 22 * breathe, ASTER.glow, 0.55);
  for (const x of [-9, -3, 3, 9]) {
    const len = (lift - 2) * (Math.abs(x) > 5 ? 0.7 : 1) * breathe;
    const lean = x * 0.5;
    const tongue = [pt(x - 2.4, mouth), ...cub(pt(x - 2.4, mouth), pt(x - 3 + lean * 0.3, mouth + len * 0.4), pt(x + lean - 1, mouth + len * 0.8), pt(x + lean, mouth + len), 8), ...cub(pt(x + lean, mouth + len), pt(x + lean + 1, mouth + len * 0.8), pt(x + 3 + lean * 0.3, mouth + len * 0.4), pt(x + 2.4, mouth), 8).slice(1)];
    soft(ctx, 1.6, () => d.pen.fill(tongue, ASTER.glow, 0.32));
    soft(ctx, 0.8, () => d.pen.fill(tongue.map((p) => pt(x + (p.x - x) * 0.4, p.y)), '#e9fff8', 0.4));
  }
  // Where it meets the ground: a pool of light, and dust blown out flat both ways.
  glow(ctx, pt(0, -1), 34 * breathe, ASTER.glow, 0.3);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const x = s * (14 + k * 11 + d.f * 2);
      dab(d, oval(x, -2 - k * 0.8, 7 + k * 2, 2.6 + k * 0.6, 14), DUST, 0.22 - k * 0.05, 2.2);
    }
  }
}
