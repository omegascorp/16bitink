import { pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { dab, finished, gleam, groundShadow, LIGHT, limb, lineOf, mix, paint, shapeOf, SHADOW, type Joint } from './crownElitePaint';
import { featherShape, wing, type WingSpec } from './wings';
import type { CreatureDrawer } from './types';

/**
 * The Griffin: an eagle's head, neck, wings and taloned forelegs on a
 * lion's tawny hindquarters, standing with one foreleg raised to strike and
 * its wings half lifted. Gold-brown plumage barred dark at the tips, a
 * pale feathered ruff, a hooked gold beak, a lion's tail with a dark tuft.
 * About 72 units to the wingtips.
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

const NEAR_WING: WingSpec = {
  shoulder: pt(-1, -40), elbow: pt(-15, -49), wrist: pt(-10, -61), hand: pt(-21, -67),
  primaries: { n: 8, a0: -3.12, a1: -2.36, l0: 16, l1: 23 },
  secondaries: { n: 8, a: 2.68, l0: 16, l1: 18.6 },
  feather: C.plume, tip: C.tip, covert: C.covert,
};

const FAR_WING: WingSpec = {
  shoulder: pt(4, -42), elbow: pt(-5, -53), wrist: pt(0, -63), hand: pt(-7, -68),
  primaries: { n: 7, a0: -2.8, a1: -2.1, l0: 14, l1: 19 },
  secondaries: { n: 6, a: 2.55, l0: 13, l1: 14 },
  feather: C.plume, tip: C.tip, covert: C.covert, far: true,
};

/** A lion's hind leg: thigh, hock angled back, and a round paw. */
function hindLeg(d: Draw, x: number, far: boolean): void {
  const col = far ? mix(C.lion, SHADOW, 0.32) : C.lion;
  const j: Joint[] = [[x + 4, -28, 13], [x, -17, 8], [x - 3, -10.6, 5.6], [x - 1.6, -5, 4.6], [x + 0.6, -2.4, 4.6]];
  const l = limb(j);
  paint(d, l.shape, col, { shadow: 0.55, hatch: 0.18, line: 0.6, lit: pt(0.3, 0.3) });
  const paw = shapeOf([[x - 2, -4], [x + 2.6, -4.4], [x + 5.4, -2], [x + 5.6, 0], [x - 2.4, 0], [x - 3, -2]], 4);
  paint(d, paw, col, { shadow: 0.45, hatch: 0, line: 0.6 });
  for (const k of [1.6, 3.4]) d.pen.hair([pt(x + k, -1.6), pt(x + k + 0.2, 0)], 0.35, d.ink, 0.7);
}

/** An eagle's foreleg: a feathered thigh, a scaled yellow shank, and toes with black talons. */
function eagleLeg(d: Draw, hip: Pt, ankle: Pt, foot: Pt, ang: number, far: boolean): void {
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

/** The eagle's head: golden crown feathers, a fierce brow over the eye, the hooked beak. */
function eagleHead(d: Draw): void {
  const { pen } = d;
  for (const [y, len] of [[-60, 8], [-58, 7]] as const) paint(d, featherShape(pt(15, y), -2.75, len, 3.2), mix(C.crown, C.headF, 0.3), { shadow: 0.3, hatch: 0, line: 0.45 });
  const skull = shapeOf([[13.6, -55.6], [16.6, -61.2], [22.6, -62.6], [27, -60], [28.6, -55.4], [26, -50.6], [20, -48.6], [15, -50.6]], 5);
  paint(d, skull, C.headF, { shadow: 0.5, hatch: 0.14, line: 0.65, lit: pt(0.35, 0.2) });
  pen.clipped(skull, () => {
    dab(d, shapeOf([[15, -61], [24, -63], [26, -59], [16, -57]]), C.crown, 0.5, 1.2);
    scallops(d, skull, C.headF, 2.2);
  });
  const upper = shapeOf([[25.4, -58.8], [29.6, -58.8], [33.2, -56], [35, -51.6], [33.8, -49.2], [33, -51.6], [30.6, -53], [26.6, -53.2], [25.2, -55.4]], 4);
  paint(d, upper, C.beak, { shadow: 0.45, hatch: 0, line: 0.6, gloss: true });
  const lower = shapeOf([[26.8, -53], [31, -52.6], [32.2, -51], [29, -50.2], [26.4, -51.2]], 3);
  paint(d, lower, mix(C.beak, SHADOW, 0.2), { shadow: 0.4, hatch: 0, line: 0.5 });
  pen.fill(shapeOf([[33.4, -53.6], [35, -51.6], [33.8, -49.2], [33, -51.4]], 3), '#3a2a1c', 0.55);
  gleam(d, lineOf([[27, -58], [30.4, -57.6], [32.8, -55]]), 0.6, 0.85);
  pen.dot(28.4, -55.6, 0.45, d.ink);
  // Eye under a heavy brow.
  pen.dot(23.6, -57.2, 1.2, '#e8a62c');
  pen.dot(23.9, -57.2, 0.75, '#1a1412');
  pen.dot(23.5, -57.6, 0.3, '#fdf8ea');
  pen.stroke(lineOf([[21.2, -59.2], [24, -59.4], [26.4, -58]]), 1, d.ink, 0.95, false);
}

function tail(d: Draw): void {
  const spine = lineOf([[-32, -29], [-38, -32], [-43.6, -40], [-47, -45], [-51.6, -44]], 5);
  const l = limb(spine.map((p, i) => [p.x, p.y, 3 - (i / (spine.length - 1)) * 1.4] as Joint), 1);
  paint(d, l.shape, C.lion, { shadow: 0.5, hatch: 0, line: 0.6 });
  const tuft = shapeOf([[-49.6, -46.2], [-52.6, -47.6], [-55.6, -46.6], [-54.4, -44.4], [-55.6, -41.6], [-51.4, -42.4], [-49.6, -43]], 4);
  paint(d, tuft, '#5a3a24', { shadow: 0.4, hatch: 0, line: 0.55 });
  d.pen.hair(lineOf([[-50, -44.6], [-54, -45.6]]), 0.3, '#c9a77a', 0.7);
}

export const drawGriffin: CreatureDrawer = (ctx, seed, f) => {
  finished(ctx, seed, f, (d) => {
    wing(d, FAR_WING);
    hindLeg(d, -20, true);
    eagleLeg(d, pt(7, -26), pt(7.6, -10), pt(8.4, -3.2), 0.05, true);
    tail(d);
    hindLeg(d, -26, false);
    body(d);
    breast(d);
    wing(d, NEAR_WING);
    eagleLeg(d, pt(12, -28), pt(19, -20), pt(24.6, -18.6), 0.9, false);
    eagleHead(d);
  }, (d) => groundShadow(d, -8, 34), { line: 0.7 });
};
