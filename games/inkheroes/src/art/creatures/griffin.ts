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
  lion: '#8e5c2c',
  plume: '#5c3a1e',
  ruff: '#8a6634',
  headF: '#6e4a26',
  crown: '#b48a42',
  covert: '#704826',
  tip: '#24170f',
  beak: '#b8913e',
  scale: '#a8823a',
  talon: '#140d09',
} as const;

const NEAR_LOOK: Omit<WingSpec, 'shoulder' | 'elbow' | 'wrist' | 'hand' | 'primaries' | 'secondaries'> = { feather: C.plume, tip: C.tip, covert: C.covert };
const FAR_LOOK = { ...NEAR_LOOK, far: true };

/** The lion's paw, in its own space: the ankle joint at the origin, flat on the ground at tilt 0. */
const PAW: readonly (readonly [number, number])[] = [[-3, -2.2], [1.6, -2.6], [4.6, -1], [6, 1.2], [5.8, 2.4], [-3.2, 2.4], [-3.9, 0.2]];

/** A lion's hind leg: thigh, hock angled back, and a round paw. */
function hindLeg(d: Draw, hip: Pt, l: Hindleg, far: boolean): void {
  const col = far ? mix(C.lion, SHADOW, 0.32) : C.lion;
  const j: Joint[] = [[hip.x, hip.y, 15], [l.knee.x, l.knee.y, 8], [l.hock.x, l.hock.y, 5.2], [l.ankle.x, l.ankle.y, 4.4], [l.paw.x, l.paw.y, 4.8]];
  const leg = limb(j);
  paint(d, leg.shape, col, { shadow: 0.7, hatch: 0.2, line: 0.6, lit: pt(0.3, 0.3) });
  // The thigh's muscle lit where it leaves the body; the hamstring and the point of the hock, the tendon behind the shank.
  if (!far) d.pen.clipped(leg.shape, () => dab(d, shapeOf([[hip.x - 2, hip.y + 2], [hip.x + 4, hip.y + 2], [l.knee.x + 2.4, l.knee.y], [l.knee.x - 1, l.knee.y - 1]]), LIGHT, 0.18, 1.2));
  d.pen.hair([pt(l.knee.x - 2.6, l.knee.y - 1), pt(l.hock.x - 1.6, l.hock.y - 0.4)], 0.4, d.ink, 0.55);
  d.pen.clipped(leg.shape, () => dab(d, shapeOf([[l.hock.x - 4, l.hock.y - 2], [l.hock.x + 4, l.hock.y - 2], [l.paw.x + 4, l.paw.y], [l.paw.x - 4, l.paw.y]]), mix(col, SHADOW, 0.5), 0.45, 1));
  within(d, { pivot: pt(0, 0), rot: l.tilt, x: l.paw.x, y: l.paw.y }, () => {
    paint(d, shapeOf(PAW, 4), mix(col, SHADOW, 0.25), { shadow: 0.6, hatch: 0, line: 0.6 });
    for (const k of [0.6, 2.4, 4]) d.pen.hair([pt(k, 0.2), pt(k + 0.3, 2.4)], 0.35, d.ink, 0.7);
  });
}

/** An eagle's foreleg: a feathered thigh, a scaled yellow shank, and toes with black talons. */
function eagleLeg(d: Draw, hip: Pt, l: Foreleg, far: boolean): void {
  const { ankle, foot, ang } = l;
  const dark = (c: string): string => (far ? mix(c, SHADOW, 0.3) : c);
  const shank = limb([[hip.x + (ankle.x - hip.x) * 0.5, hip.y + (ankle.y - hip.y) * 0.5, 4.2], [ankle.x, ankle.y, 3.5], [foot.x, foot.y, 3.2]]);
  paint(d, shank.shape, dark(C.scale), { shadow: 0.65, hatch: 0, line: 0.55, gloss: true });
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
    const toe = limb([[foot.x, foot.y, 2.6], [end.x, end.y, 1.8]]);
    paint(d, toe.shape, dark(C.scale), { shadow: 0.55, hatch: 0, line: 0.5 });
    const hook = a + 1.2;
    const claw = [pt(end.x - Math.sin(a) * 0.9, end.y + Math.cos(a) * 0.9), pt(end.x + Math.cos(a) * 2.8, end.y + Math.sin(a) * 2.8), pt(end.x + Math.cos(hook) * 3.6, end.y + Math.sin(hook) * 3.6)];
    d.pen.stroke(lineOf(claw.map((p) => [p.x, p.y] as [number, number])), 1.1, C.talon, 1, false);
    d.pen.hair([pt(end.x + Math.cos(a) * 0.6, end.y + Math.sin(a) * 0.6 - 0.3), pt(end.x + Math.cos(a) * 2.2, end.y + Math.sin(a) * 2.2 - 0.3)], 0.25, '#b8a080', 0.6);
  }
  const knee = pt(hip.x + (ankle.x - hip.x) * 0.55, hip.y + (ankle.y - hip.y) * 0.55);
  // The feathered thigh: a full, rounded trouser of plumage tapering to the shank.
  const ua = Math.atan2(knee.y - hip.y + 2, knee.x - hip.x + 1);
  const [ux, uy] = [Math.cos(ua), Math.sin(ua)];
  const at = (p: Pt, s: number, k: number): [number, number] => [p.x + ux * s - uy * k, p.y + uy * s + ux * k];
  const top = pt(hip.x - 1, hip.y - 2);
  const mid = pt((top.x + knee.x) / 2, (top.y + knee.y) / 2);
  const thigh = shapeOf([at(top, -3, 0), at(top, -0.6, 4.6), at(mid, 0, 5.2), at(knee, 0, 3), at(knee, 2.2, 0), at(knee, 0, -3), at(mid, 0, -4.6), at(top, -0.6, -4.4)], 5);
  paint(d, thigh, dark(C.ruff), { shadow: 0.65, hatch: 0.18, line: 0.55 });
  for (const k of [-1.6, 0.4, 2.2]) {
    const ang = Math.atan2(ankle.y - hip.y, ankle.x - hip.x);
    const root = pt(knee.x - Math.sin(ang) * k - Math.cos(ang) * 2.4, knee.y + Math.cos(ang) * k - Math.sin(ang) * 2.4);
    paint(d, featherShape(root, ang + k * 0.12, 5.4, 2.8), dark(C.ruff), { shadow: 0.5, hatch: 0, line: 0.4 });
  }
  d.pen.clipped(thigh, () => scallops(d, thigh, dark(C.ruff), 2.6));
}

/** Rows of small feather scallops over a shape: plumage texture. */
function scallops(d: Draw, shape: readonly Pt[], colour: string, step: number): void {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const ink = mix(colour, SHADOW, 0.7);
  let row = 0;
  for (let y = Math.min(...ys); y < Math.max(...ys) + step; y += step * 0.8, row++) {
    for (let x = Math.min(...xs) + (row % 2) * step * 0.5; x < Math.max(...xs); x += step) {
      d.pen.hair([pt(x - step * 0.45, y - step * 0.2), pt(x, y + step * 0.32), pt(x + step * 0.45, y - step * 0.2)], 0.28, ink, 0.55);
    }
  }
}

/** The lion's body: a deep chest behind the breast feathers, the waist tucked up, a heavy haunch over the hind leg. */
function body(d: Draw): Pt[] {
  const shape = shapeOf([[10, -43], [2, -43.6], [-8, -41.2], [-18, -40.8], [-27, -40.8], [-32.4, -38.6], [-35.4, -33.4], [-35.6, -28.8], [-33.8, -25.2], [-29.6, -23.2], [-21.6, -23.6], [-18.6, -24.4], [-10, -25], [0, -23.2], [8, -21.2], [13.5, -25], [15.6, -33]], 6);
  paint(d, shape, C.lion, { shadow: 0.72, hatch: 0.2, line: 0, lit: pt(0.4, 0.2) });
  d.pen.clipped(shape, () => {
    // The haunch and ribcage catch the light; the flank and belly turn into shadow.
    // The haunch's muscles: the croup's mass lit along the top, the long hamstring
    // down the back of the thigh in shade, the quadriceps lit over the stifle.
    dab(d, shapeOf([[-32, -38], [-24, -40], [-20, -36.6], [-30, -34.4]]), LIGHT, 0.26, 1.4);
    dab(d, shapeOf([[-28.4, -31.6], [-23, -33], [-20.6, -25], [-24.6, -24]]), LIGHT, 0.2, 1.4);
    dab(d, shapeOf([[-36, -32], [-32.6, -31], [-29, -22], [-34, -24]]), SHADOW, 0.5, 1.4);
    dab(d, shapeOf([[-31, -33.6], [-27, -33], [-28, -28], [-31, -29]]), SHADOW, 0.18, 1.2);
    dab(d, shapeOf([[-12, -39], [-2, -40.6], [2, -33], [-8, -30]]), LIGHT, 0.18, 2.4);
    dab(d, shapeOf([[-18, -36], [-13, -34], [-14, -25], [-19, -27]]), SHADOW, 0.3, 1.8);
    dab(d, shapeOf([[-36, -24], [10, -27], [10, -18], [-36, -16]]), SHADOW, 0.4, 2.2);
  });
  // The haunch's front, the flank's fold, the ribs' edge, the belly line.
  d.pen.hair(lineOf([[-19.6, -23], [-17.4, -29], [-19.6, -36]]), 0.4, d.ink, 0.55);
  d.pen.hair(lineOf([[-14, -38.6], [-11.4, -33], [-12, -26]]), 0.35, d.ink, 0.35);
  d.pen.hair(lineOf([[-29.6, -24], [-31.2, -28], [-32.4, -32.6]]), 0.4, d.ink, 0.5);
  d.pen.hair(lineOf([[-32, -35.6], [-27, -33.8], [-22, -35]]), 0.3, d.ink, 0.35);
  d.pen.stroke(lineOf([[-18.6, -23.4], [-10, -25], [0, -23.2], [8, -21.2]]), 0.5, d.ink, 0.8, false);
  return shape;
}

/** The feathered neck and breast, a pale ruff in scalloped rows, overlapping the lion's shoulders. */
/** The breast's ragged lower edge, back to front, where its feathers lie over the lion's coat. */
const BREAST_EDGE = lineOf([[-5, -41], [-3.4, -33], [0.6, -26.6], [6, -22.6], [12, -21.4], [17, -25]], 4);

/** A row of feathers along the breast's edge, `inset` units in from it, `len` long, coloured `colour`. */
function featherRow(d: Draw, inset: number, len: number, w: number, colour: (u: number) => string, step: number, phase: number): void {
  const n = BREAST_EDGE.length;
  for (let i = Math.round(phase * step); i < n; i += step) {
    const u = i / (n - 1);
    const p = BREAST_EDGE[i]!;
    // Feathers hang down and back: more back at the shoulder, straight down under the chest.
    const a = 2.35 - u * 0.75 + Math.sin(i * 1.7) * 0.08;
    const root = pt(p.x - Math.cos(a) * inset, p.y - Math.sin(a) * inset);
    const l = len * (0.8 + 0.4 * Math.abs(Math.sin(i * 2.3)));
    const f = featherShape(root, a, l, w);
    paint(d, f, colour(u), { shadow: 0.55, hatch: 0, line: 0.34, lineAlpha: 0.7 });
    // The shaft, and the tip darkening.
    const tip = pt(root.x + Math.cos(a) * l, root.y + Math.sin(a) * l);
    d.pen.hair([pt(root.x + Math.cos(a) * l * 0.1, root.y + Math.sin(a) * l * 0.1), pt(root.x + Math.cos(a) * l * 0.85, root.y + Math.sin(a) * l * 0.85)], 0.24, mix(colour(u), SHADOW, 0.55), 0.6);
    d.pen.clipped(f, () => dab(d, shapeOf([[tip.x - 3, tip.y - 3], [tip.x + 3, tip.y - 3], [tip.x + 3, tip.y + 3], [tip.x - 3, tip.y + 3]]), C.tip, 0.4, 0.8));
  }
}

/**
 * The feathered neck and breast: no bib, but plumage that thins into the
 * lion's coat, two ragged rows of feathers lying over one another, the
 * outer ones taking on the coat's tawny.
 */
function breast(d: Draw): void {
  const shape = shapeOf([[4, -44], [9.6, -52], [15, -57.6], [21, -56], [23, -48], [20.6, -38], [16.6, -28], [11, -21.6], [4, -24], [-2, -30], [-5, -38]], 5);
  // A soft wash of plumage colour over the coat first, so no hard edge is left between them.
  dab(d, shapeOf([[-8, -42], [0, -42], [10, -24], [18, -22], [12, -17], [0, -21], [-8, -32]]), mix(C.ruff, C.lion, 0.5), 0.5, 2.2);
  featherRow(d, -1.5, 8.4, 3.4, (u) => mix(mix(C.ruff, C.lion, 0.6), SHADOW, 0.1 + 0.25 * u), 3, 0);
  paint(d, shape, C.ruff, { shadow: 0.7, hatch: 0.18, line: 0, lit: pt(0.55, 0.25) });
  d.pen.clipped(shape, () => {
    dab(d, shapeOf([[8, -50], [16, -54], [18, -44], [10, -40]]), C.crown, 0.35, 2);
    scallops(d, shapeOf([[4, -44], [9.6, -52], [15, -57.6], [21, -56], [23, -48], [17, -42], [8, -40]]), C.ruff, 3);
    dab(d, shapeOf([[16, -48], [23, -46], [19, -28], [12, -24]]), SHADOW, 0.32, 2);
  });
  // The neck's front edge inked; the lower edges are left to the feathers.
  d.pen.stroke(lineOf([[15, -57.6], [21, -56], [23, -48], [20.6, -38], [16.6, -28]]), 0.4, d.ink, 0.75, false);
  featherRow(d, 3.6, 7.4, 3.8, (u) => mix(C.ruff, SHADOW, 0.06 + 0.2 * u), 4, 0.5);
}

/** Where the lower mandible hinges. */
const GAPE_HINGE = pt(26.4, -52.4);

/** The eagle's head: a flat skull swept back into hackles at the nape, a heavy brow ridge shading a fierce amber eye, the hooked beak (`gape` opens it, radians). */
function eagleHead(d: Draw, gape: number): void {
  const { pen } = d;
  // Hackles: narrow golden feathers raised along the nape.
  for (const [x, y, a, len] of [[16.4, -57.6, -2.85, 9], [15.4, -55.2, -2.7, 8.4], [15, -52.6, -2.55, 7.4], [17.6, -60, -2.95, 7.6]] as const) {
    paint(d, featherShape(pt(x, y), a, len, 2.6), mix(C.crown, C.headF, 0.35), { shadow: 0.5, hatch: 0, line: 0.42 });
  }
  const skull = shapeOf([[13.6, -55], [16.4, -60], [21.6, -61.8], [26.6, -60.2], [28.8, -56], [26.4, -50.6], [20, -48.4], [15, -50.4]], 5);
  paint(d, skull, C.headF, { shadow: 0.65, hatch: 0.16, line: 0.65, lit: pt(0.35, 0.2) });
  pen.clipped(skull, () => {
    dab(d, shapeOf([[14, -60], [22, -63], [24, -58.6], [16, -55]]), C.crown, 0.55, 1.2);
    scallops(d, skull, C.headF, 2.1);
    // The cheek and throat in shadow under the jaw line.
    dab(d, shapeOf([[17, -51], [26, -52], [25, -48], [18, -47]]), SHADOW, 0.35, 1.2);
  });
  if (gape > 0.04) {
    // The open mouth: a dark gullet and a red tongue between the mandibles.
    const tipDown = pt(GAPE_HINGE.x + Math.cos(gape + 0.1) * 6, GAPE_HINGE.y + Math.sin(gape + 0.1) * 6);
    pen.fill(shapeOf([[GAPE_HINGE.x - 0.6, GAPE_HINGE.y - 0.6], [31, -53.2], [33.4, -51.4], [tipDown.x, tipDown.y], [GAPE_HINGE.x, GAPE_HINGE.y + 1.4]], 3), '#2a0f0c', 0.95);
    pen.fill(shapeOf([[GAPE_HINGE.x + 1, GAPE_HINGE.y + 0.4], [GAPE_HINGE.x + 4.4, GAPE_HINGE.y + 0.4 + gape * 2.4], [GAPE_HINGE.x + 2.4, GAPE_HINGE.y + 1.2 + gape * 3]], 3), '#7e2a22', 0.9);
  }
  within(d, { pivot: GAPE_HINGE, rot: gape, x: 0, y: 0 }, () => {
    const lower = shapeOf([[26.8, -53], [31, -52.6], [32.2, -51], [29, -50.2], [26.4, -51.2]], 3);
    paint(d, lower, mix(C.beak, SHADOW, 0.3), { shadow: 0.55, hatch: 0, line: 0.5 });
  });
  // The cere at the beak's root, then the deep hooked upper mandible, darkening to its point.
  const upper = shapeOf([[25, -59.4], [29.6, -59.6], [33.6, -56.6], [35.6, -51.8], [34.6, -48.4], [33.4, -51.4], [30.6, -53], [26.6, -53.2], [24.8, -55.6]], 4);
  paint(d, upper, C.beak, { shadow: 0.6, hatch: 0, line: 0.6, gloss: true });
  pen.clipped(upper, () => {
    dab(d, shapeOf([[32.6, -55], [36, -52], [35, -48], [32.4, -51]], 3), '#2a1c10', 0.75, 0.6);
    dab(d, shapeOf([[24.6, -59.6], [27.4, -59.8], [27.4, -53], [24.6, -53.4]], 3), '#c9a24a', 0.5, 0.5);
  });
  pen.hair(lineOf([[27.4, -59.4], [27.6, -56], [27.2, -53.2]]), 0.35, d.ink, 0.6);
  gleam(d, lineOf([[28, -58.4], [31.2, -57.8], [33.6, -54.8]]), 0.55, 0.85);
  pen.dot(28.8, -56, 0.42, d.ink);
  // The eye sunk under the brow ridge, glaring; the ridge lowers further in anger as it strikes.
  const frown = Math.min(1, gape * 2.5);
  dab(d, shapeOf([[20.6, -59], [25.6, -59.2], [25.4, -55.6], [21, -55.8]], 3), SHADOW, 0.5, 0.6);
  pen.dot(23.4, -57, 1.15, '#c27a1c');
  pen.dot(23.7, -57, 0.7, '#120c09');
  pen.dot(23.2, -57.4, 0.25, '#f3e6c6', 0.9);
  const brow = shapeOf([[19.4, -59.6 - frown * 0.3], [23, -60.6], [26.8, -58.8 + frown * 0.8], [26.4, -57.8 + frown * 0.9], [23, -58.6 + frown * 0.5], [20, -58.4]], 3);
  paint(d, brow, mix(C.headF, SHADOW, 0.2), { shadow: 0.3, hatch: 0, line: 0.5 });
  pen.stroke(lineOf([[20, -58.4], [23, -58.6 + frown * 0.5], [26.4, -57.8 + frown * 0.9]]), 0.7, d.ink, 0.95, false);
  gleam(d, lineOf([[20.4, -59.8], [23.4, -60.4]]), 0.4, 0.6);
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
  paint(d, l.shape, C.lion, { shadow: 0.65, hatch: 0, line: 0.6 });
  const tip = bent[bent.length - 1]!;
  within(d, { pivot: TUFT_AT, rot: turnAt(1), x: tip.x - TUFT_AT.x, y: tip.y - TUFT_AT.y }, () => {
    const tuft = shapeOf([[-49.6, -46.2], [-52.6, -47.6], [-55.6, -46.6], [-54.4, -44.4], [-55.6, -41.6], [-51.4, -42.4], [-49.6, -43]], 4);
    paint(d, tuft, '#2e1d12', { shadow: 0.5, hatch: 0, line: 0.55 });
    d.pen.hair(lineOf([[-50, -44.6], [-54, -45.6]]), 0.3, '#8a6a46', 0.7);
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
