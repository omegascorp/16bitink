import { makeDraw, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { dab, finished, gleam, groundShadow, LIGHT, limb, lineOf, mix, paint, shapeOf, SHADOW, type Joint } from './crownElitePaint';
import { FORE_HIP_F, FORE_HIP_N, griffinRig, HIP, HIP_F, HIP_N, NECK, type Foreleg, type GriffinRig, type Hindleg } from './griffinPoses';
import { featherShape, wing, type WingSpec } from './wings';
import { bump, dress, place, swoosh, within, type Xf } from './wingRig';
import type { CreatureDrawer } from './types';

/**
 * The Griffin: an eagle's head, neck, wings and taloned forelegs on a
 * lion's tawny hindquarters, standing with one foreleg raised to strike and
 * its wings half lifted. Gold-brown plumage barred dark at the tips, a
 * pale feathered ruff, a hooked gold beak, a lion's tail with a dark tuft.
 * About 72 units to the wingtips. It moves by the rig in griffinPoses.ts.
 */
const C = {
  lion: '#b8742e',
  plume: '#965a20',
  ruff: '#e0b264',
  headF: '#c98f38',
  crown: '#8e5e2e',
  covert: '#b67a32',
  tip: '#4e3220',
  beak: '#e6b43c',
  scale: '#dcae48',
  talon: '#2a2220',
} as const;

const NEAR_LOOK: Omit<WingSpec, 'shoulder' | 'elbow' | 'wrist' | 'hand' | 'primaries' | 'secondaries'> = { feather: C.plume, tip: C.tip, covert: C.covert };
const FAR_LOOK = { ...NEAR_LOOK, far: true };

/** The lion's paw, in its own space: the ankle joint at the origin, flat on the ground at tilt 0. */
const PAW: readonly (readonly [number, number])[] = [[-2.6, -1.6], [2, -2], [4.8, 0.4], [5, 2.4], [-3, 2.4], [-3.6, 0.4]];

/** A lion's hind leg: thigh, hock angled back, and a round paw. */
function hindLeg(d: Draw, hip: Pt, l: Hindleg, far: boolean): void {
  const col = far ? mix(C.lion, SHADOW, 0.32) : C.lion;
  const j: Joint[] = [[hip.x, hip.y, 13], [l.knee.x, l.knee.y, 8], [l.hock.x, l.hock.y, 5.6], [l.ankle.x, l.ankle.y, 4.6], [l.paw.x, l.paw.y, 4.6]];
  paint(d, limb(j).shape, col, { shadow: 0.55, hatch: 0.18, line: 0.6, lit: pt(0.3, 0.3) });
  within(d, { pivot: pt(0, 0), rot: l.tilt, x: l.paw.x, y: l.paw.y }, () => {
    paint(d, shapeOf(PAW, 4), col, { shadow: 0.45, hatch: 0, line: 0.6 });
    for (const k of [1, 2.8]) d.pen.hair([pt(k, 0.8), pt(k + 0.2, 2.4)], 0.35, d.ink, 0.7);
  });
}

/** An eagle's foreleg: a feathered thigh, a scaled yellow shank, and toes with black talons. */
function eagleLeg(d: Draw, hip: Pt, l: Foreleg, far: boolean): void {
  const { ankle, foot, ang } = l;
  const dark = (c: string): string => (far ? mix(c, SHADOW, 0.3) : c);
  const shank = limb([[hip.x + (ankle.x - hip.x) * 0.5, hip.y + (ankle.y - hip.y) * 0.5, 3.6], [ankle.x, ankle.y, 3], [foot.x, foot.y, 2.8]]);
  paint(d, shank.shape, dark(C.scale), { shadow: 0.5, hatch: 0, line: 0.55, gloss: true });
  d.pen.clipped(shank.shape, () => {
    for (let t = 0.15; t < 1; t += 0.14) {
      const p = shank.spine[Math.floor(t * (shank.spine.length - 1))]!;
      d.pen.hair([pt(p.x - 1.6, p.y - 0.4), pt(p.x + 1.6, p.y + 0.6)], 0.3, d.ink, 0.5);
    }
  });
  // Toes: three forward, one back, each ending in a hooked talon.
  for (const [da, len] of [[-0.5, 5.6], [0, 6.4], [0.5, 5.4], [Math.PI - 0.3, 3.6]] as const) {
    const a = ang + da;
    const end = pt(foot.x + Math.cos(a) * len, foot.y + Math.sin(a) * len);
    const toe = limb([[foot.x, foot.y, 2.2], [end.x, end.y, 1.6]]);
    paint(d, toe.shape, dark(C.scale), { shadow: 0.4, hatch: 0, line: 0.5 });
    const hook = a + 1.2;
    const claw = [pt(end.x - Math.sin(a) * 0.8, end.y + Math.cos(a) * 0.8), pt(end.x + Math.cos(a) * 2.2, end.y + Math.sin(a) * 2.2), pt(end.x + Math.cos(hook) * 3, end.y + Math.sin(hook) * 3)];
    d.pen.stroke(lineOf(claw.map((p) => [p.x, p.y] as [number, number])), 0.9, C.talon, 1, false);
  }
  const knee = pt(hip.x + (ankle.x - hip.x) * 0.55, hip.y + (ankle.y - hip.y) * 0.55);
  const thigh = limb([[hip.x - 1, hip.y - 2, 9], [knee.x, knee.y, 5.4]]).shape;
  paint(d, thigh, dark(C.ruff), { shadow: 0.5, hatch: 0.16, line: 0.55 });
  for (const k of [-1.6, 0.4, 2.2]) {
    const ang = Math.atan2(ankle.y - hip.y, ankle.x - hip.x);
    const root = pt(knee.x - Math.sin(ang) * k - Math.cos(ang) * 2.4, knee.y + Math.cos(ang) * k - Math.sin(ang) * 2.4);
    paint(d, featherShape(root, ang + k * 0.12, 4.6, 2.4), dark(C.ruff), { shadow: 0.3, hatch: 0, line: 0.4 });
  }
  d.pen.clipped(thigh, () => scallops(d, thigh, dark(C.ruff), 2.6));
}

/** Rows of small feather scallops over a shape: plumage texture. */
function scallops(d: Draw, shape: readonly Pt[], colour: string, step: number): void {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const ink = mix(colour, SHADOW, 0.55);
  let row = 0;
  for (let y = Math.min(...ys); y < Math.max(...ys) + step; y += step * 0.8, row++) {
    for (let x = Math.min(...xs) + (row % 2) * step * 0.5; x < Math.max(...xs); x += step) {
      d.pen.hair([pt(x - step * 0.45, y - step * 0.2), pt(x, y + step * 0.32), pt(x + step * 0.45, y - step * 0.2)], 0.28, ink, 0.55);
    }
  }
}

function body(d: Draw): Pt[] {
  const shape = shapeOf([[10, -42], [-2, -40.6], [-14, -39.6], [-25, -38.6], [-32.4, -34], [-34.6, -26], [-32, -19.6], [-24, -17], [-12, -18.4], [-2, -17.4], [7, -19], [13, -24.6], [15.4, -33]], 6);
  paint(d, shape, C.lion, { shadow: 0.6, hatch: 0.18, line: 0, lit: pt(0.4, 0.2) });
  d.pen.clipped(shape, () => {
    dab(d, shapeOf([[-30, -32], [-22, -36], [-16, -30], [-24, -24]]), LIGHT, 0.24, 2.4);
    dab(d, shapeOf([[-34, -22], [8, -24], [8, -16], [-34, -16]]), SHADOW, 0.2, 2.2);
  });
  d.pen.hair(lineOf([[-18, -20], [-15.6, -26], [-17.4, -33]]), 0.4, d.ink, 0.45);
  d.pen.stroke(lineOf([[-19, -17.6], [-12, -18.4], [-2, -17.4], [7, -19]]), 0.6, d.ink, 0.85, false);
  d.pen.hair(lineOf([[-30.6, -21], [-27, -17.4], [-22.6, -16.4]]), 0.5, d.ink, 0.6);
  return shape;
}

/** The feathered neck and breast, a pale ruff in scalloped rows, overlapping the lion's shoulders. */
function breast(d: Draw): void {
  const shape = shapeOf([[4, -44], [9.6, -52], [15, -57.6], [21, -56], [23, -48], [20.6, -38], [16.6, -28], [11, -21.6], [4, -24], [-2, -30], [-5, -38]], 5);
  paint(d, shape, C.ruff, { shadow: 0.55, hatch: 0.16, line: 0.6, lit: pt(0.55, 0.25) });
  d.pen.clipped(shape, () => {
    scallops(d, shape, C.ruff, 3);
    dab(d, shapeOf([[16, -48], [22, -46], [19, -30], [13, -26]]), SHADOW, 0.16, 2);
  });
}

/** Where the lower mandible hinges. */
const GAPE_HINGE = pt(26.4, -52.4);

/** The eagle's head: golden crown feathers, a fierce brow over the eye, the hooked beak (`gape` opens it, radians). */
function eagleHead(d: Draw, gape: number): void {
  const { pen } = d;
  for (const [y, len] of [[-60, 8], [-58, 7]] as const) paint(d, featherShape(pt(15, y), -2.75, len, 3.2), mix(C.crown, C.headF, 0.3), { shadow: 0.3, hatch: 0, line: 0.45 });
  const skull = shapeOf([[13.6, -55.6], [16.6, -61.2], [22.6, -62.6], [27, -60], [28.6, -55.4], [26, -50.6], [20, -48.6], [15, -50.6]], 5);
  paint(d, skull, C.headF, { shadow: 0.5, hatch: 0.14, line: 0.65, lit: pt(0.35, 0.2) });
  pen.clipped(skull, () => {
    dab(d, shapeOf([[15, -61], [24, -63], [26, -59], [16, -57]]), C.crown, 0.5, 1.2);
    scallops(d, skull, C.headF, 2.2);
  });
  if (gape > 0.04) {
    // The open mouth: a dark gullet and a red tongue between the mandibles.
    const tipDown = pt(GAPE_HINGE.x + Math.cos(gape + 0.1) * 6, GAPE_HINGE.y + Math.sin(gape + 0.1) * 6);
    pen.fill(shapeOf([[GAPE_HINGE.x - 0.6, GAPE_HINGE.y - 0.6], [31, -53.2], [33.4, -51.4], [tipDown.x, tipDown.y], [GAPE_HINGE.x, GAPE_HINGE.y + 1.4]], 3), '#4a1e1a', 0.95);
    pen.fill(shapeOf([[GAPE_HINGE.x + 1, GAPE_HINGE.y + 0.4], [GAPE_HINGE.x + 4.4, GAPE_HINGE.y + 0.4 + gape * 2.4], [GAPE_HINGE.x + 2.4, GAPE_HINGE.y + 1.2 + gape * 3]], 3), '#b8433a', 0.9);
  }
  within(d, { pivot: GAPE_HINGE, rot: gape, x: 0, y: 0 }, () => {
    const lower = shapeOf([[26.8, -53], [31, -52.6], [32.2, -51], [29, -50.2], [26.4, -51.2]], 3);
    paint(d, lower, mix(C.beak, SHADOW, 0.2), { shadow: 0.4, hatch: 0, line: 0.5 });
  });
  const upper = shapeOf([[25.4, -58.8], [29.6, -58.8], [33.2, -56], [35, -51.6], [33.8, -49.2], [33, -51.6], [30.6, -53], [26.6, -53.2], [25.2, -55.4]], 4);
  paint(d, upper, C.beak, { shadow: 0.45, hatch: 0, line: 0.6, gloss: true });
  pen.fill(shapeOf([[33.4, -53.6], [35, -51.6], [33.8, -49.2], [33, -51.4]], 3), '#3a2a1c', 0.55);
  gleam(d, lineOf([[27, -58], [30.4, -57.6], [32.8, -55]]), 0.6, 0.85);
  pen.dot(28.4, -55.6, 0.45, d.ink);
  // Eye under a heavy brow, lowered further in anger as it strikes.
  pen.dot(23.6, -57.2, 1.2, '#e8a62c');
  pen.dot(23.9, -57.2, 0.75, '#1a1412');
  pen.dot(23.5, -57.6, 0.3, '#fdf8ea');
  const frown = Math.min(1, gape * 2.5);
  pen.stroke(lineOf([[21.2, -59.2 - frown * 0.4], [24, -59.4 + frown * 0.5], [26.4, -58 + frown * 0.9]]), 1, d.ink, 0.95, false);
}

/** The lion's tail: the rest curve swung by `lift` at the root and curled by `curl` toward the tip. */
const TAIL = lineOf([[-32, -29], [-38, -32], [-43.6, -40], [-47, -45], [-51.6, -44]], 5);
const TUFT_AT = pt(-51.6, -44);

function tail(d: Draw, lift: number, curl: number): void {
  const root = TAIL[0]!;
  const turnAt = (u: number): number => lift + curl * u * u;
  // Bend each point about the one before it so the tail stays its length as it curls.
  const bent = TAIL.reduce<Pt[]>((out, p, i) => {
    if (i === 0) return [root];
    const prev = TAIL[i - 1]!;
    const a = turnAt(i / (TAIL.length - 1));
    const [dx, dy] = [p.x - prev.x, p.y - prev.y];
    const last = out[i - 1]!;
    return [...out, pt(last.x + dx * Math.cos(a) - dy * Math.sin(a), last.y + dx * Math.sin(a) + dy * Math.cos(a))];
  }, []);
  const l = limb(bent.map((p, i) => [p.x, p.y, 3 - (i / (bent.length - 1)) * 1.4] as Joint), 1);
  paint(d, l.shape, C.lion, { shadow: 0.5, hatch: 0, line: 0.6 });
  const tip = bent[bent.length - 1]!;
  within(d, { pivot: TUFT_AT, rot: turnAt(1), x: tip.x - TUFT_AT.x, y: tip.y - TUFT_AT.y }, () => {
    const tuft = shapeOf([[-49.6, -46.2], [-52.6, -47.6], [-55.6, -46.6], [-54.4, -44.4], [-55.6, -41.6], [-51.4, -42.4], [-49.6, -43]], 4);
    paint(d, tuft, '#5a3a24', { shadow: 0.4, hatch: 0, line: 0.55 });
    d.pen.hair(lineOf([[-50, -44.6], [-54, -45.6]]), 0.3, '#c9a77a', 0.7);
  });
}

/** Rake marks trailing the talons as they strike. */
function rake(d: Draw, r: GriffinRig, hip: Pt, k: number): void {
  const { foot } = r.foreN;
  const a = Math.atan2(foot.y - hip.y, foot.x - hip.x);
  const reach = Math.hypot(foot.x - hip.x, foot.y - hip.y);
  for (const [dr, w] of [[-3, 2.4], [2.2, 3], [7, 2.4]] as const) swoosh(d, hip, reach + dr, a - 1.25, a + 0.05, w, mix(LIGHT, SHADOW, 0.4), 0.5 * k);
}

function figure(d: Draw, r: GriffinRig): void {
  const trunk: Xf = { pivot: HIP, ...r.trunk };
  const head: Xf = { pivot: NECK, ...r.head };
  const neck: Xf = { pivot: pt(6, -30), rot: r.head.rot * 0.35, x: r.head.x * 0.4, y: r.head.y * 0.4 };
  within(d, trunk, () => wing(d, dress(r.far, FAR_LOOK)));
  hindLeg(d, place(trunk, HIP_F), r.hindF, true);
  eagleLeg(d, place(trunk, FORE_HIP_F), r.foreF, true);
  within(d, trunk, () => tail(d, r.tail.lift, r.tail.curl));
  hindLeg(d, place(trunk, HIP_N), r.hindN, false);
  within(d, trunk, () => {
    body(d);
    within(d, neck, () => breast(d));
    wing(d, dress(r.near, NEAR_LOOK));
  });
  eagleLeg(d, place(trunk, FORE_HIP_N), r.foreN, false);
  within(d, trunk, () => within(d, head, () => eagleHead(d, r.head.gape)));
}

export const drawGriffin: CreatureDrawer = (ctx, seed, f, pose) => {
  const r = griffinRig(pose);
  finished(ctx, seed, f, (d) => figure(d, r), (d) => groundShadow(d, -8 + r.trunk.x, 34 - (1 - r.ground) * 8, 3.4, 0.16 * (0.4 + 0.6 * r.ground)), { line: 0.7 });
  const strike = pose?.kind === 'attack' ? bump(pose.t, 0.5, 0.2) : 0;
  if (strike > 0) rake(makeDraw(ctx, seed + f + 3, f, 0), r, place({ pivot: HIP, ...r.trunk }, FORE_HIP_N), strike);
};
