import { makeDraw, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { dab, finished, gleam, glow, groundShadow, LIGHT, limb, lineOf, mix, paint, shapeOf, SHADOW } from './crownElitePaint';
import { CROWN_BLUE, GOLD } from './crownMountRider';
import { NECK, seraphRig, WAIST, type SeraphRig } from './seraphPoses';
import { wing, type WingSpec } from './wings';
import { bump, dress, place, swoosh, within, type Xf } from './wingRig';
import type { CreatureDrawer } from './types';

/**
 * The Seraph, the Crown's highest: a tall winged warrior in a white robe
 * and a gilded cuirass with a blue sash, golden hair under a circlet, a
 * ring of light behind the head, and a flaming sword raised before it.
 * Two great white wings lift from the shoulders, the far one peeking over
 * the near. About 100 units to the wingtips, the body about 84. It moves by
 * the rig in seraphPoses.ts.
 */
const C = {
  robe: '#f1ede2',
  robeShade: '#b9bfd6',
  gold: '#d6a843',
  skin: '#ecc39c',
  hair: '#dcac48',
  feather: '#f4f0e6',
  featherTip: '#cdb47c',
  covert: '#fbf7ec',
  blade: '#e8eef6',
  flame: '#f29a2e',
  flameCore: '#ffe9a6',
} as const;

const NEAR_LOOK: Omit<WingSpec, 'shoulder' | 'elbow' | 'wrist' | 'hand' | 'primaries' | 'secondaries'> = { feather: C.feather, tip: C.featherTip, covert: C.covert };
const FAR_LOOK = { ...NEAR_LOOK, far: true };

const HEAD = pt(3, -77);
const SHOULDER = pt(2.4, -67);
const FAR_SHOULDER = pt(-1.4, -67.6);
/** Upper arm and forearm lengths. */
const ARM = [9.5, 11.2] as const;
/** Where the far hand hangs when the sword is held one-handed: at the side, hidden by the body. */
const FAR_REST_HAND = pt(-1, -52);

/** Where the elbow falls for a hand at `hand`: two-bone reach, the elbow bent to the `bend` side. */
function elbowOf(shoulder: Pt, hand: Pt, bend: 1 | -1): Pt {
  const [l1, l2] = ARM;
  const [dx, dy] = [hand.x - shoulder.x, hand.y - shoulder.y];
  const len = Math.hypot(dx, dy) || 0.01;
  const d = Math.min(l1 + l2 - 0.05, len);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const [ux, uy] = [dx / len, dy / len];
  return pt(shoulder.x + ux * a - uy * h * bend, shoulder.y + uy * a + ux * h * bend);
}

/** A point along the sword: `s` up the blade from the hand, `off` across it. */
type Along = (s: number, off?: number) => Pt;
const alongBlade = (hand: Pt, ang: number): Along => {
  const [cx, cy] = [Math.cos(ang), Math.sin(ang)];
  return (s, off = 0) => pt(hand.x + cx * s - cy * off, hand.y + cy * s + cx * off);
};

/**
 * The robe: falling from the waist to a hem swept back by the wind, folds
 * catching the light. `warp` carries each point of the hanging robe to
 * where the pose puts it.
 */
function robe(d: Draw, warp: (p: Pt) => Pt, footTurn: number): void {
  const W = (xy: readonly (readonly [number, number])[]): [number, number][] => xy.map(([x, y]) => {
    const p = warp(pt(x, y));
    return [p.x, p.y];
  });
  const shape = shapeOf(W([[-7, -52], [6.4, -52], [9, -36], [13, -16], [15.4, -2.4], [8, -0.6], [-2, -1], [-12, -2], [-21, -5], [-15, -18], [-10, -36]]), 6);
  // The sandalled foot stepping out under the hem: drawn first, the hem over its heel.
  const heel = pt(12, -1.6);
  const at = warp(heel);
  within(d, { pivot: heel, rot: footTurn, x: at.x - heel.x, y: at.y - heel.y }, () => {
    const foot = shapeOf([[8.4, -3.4], [13, -3.2], [17.6, -1.2], [17.4, 0], [8.6, 0]], 3);
    paint(d, foot, C.skin, { shadow: 0.4, hatch: 0, line: 0.55 });
    d.pen.hair([pt(12, -3), pt(12.6, 0)], 0.5, C.gold, 1);
  });
  paint(d, shape, C.robe, { shadow: 0.55, hatch: 0.16, line: 0.6, lit: pt(0.45, 0.2) });
  d.pen.clipped(shape, () => {
    for (const [x0, x1, dark] of [[-4, -12, false], [-1, -5, true], [2, 2, false], [4, 7, true], [6, 11, false]] as const) {
      const line = lineOf(W([[x0, -50], [(x0 + x1) / 2 - 0.4, -26], [x1, -2]]));
      if (dark) dab(d, [...line.map((p) => pt(p.x - 1, p.y)), ...[...line].reverse().map((p) => pt(p.x + 1.2, p.y))], C.robeShade, 0.4, 1.2);
      else gleam(d, line, 1.2, 0.5);
      d.pen.hair(line.map((p) => pt(p.x + 1.4, p.y)), 0.35, mix(C.robeShade, SHADOW, 0.4), 0.5);
    }
    const hem = lineOf(W([[-20.4, -5.6], [-12, -3], [-2, -2.2], [8, -1.8], [15, -3.6]]));
    d.pen.stroke(hem, 2, C.gold, 0.95, false);
  });
}

/** The robe's hang for a rig: the waist rides the trunk, the hem lags it and blows in the wind. */
function robeWarp(r: SeraphRig): (p: Pt) => Pt {
  const { trunk, robe: w } = r;
  return (p) => {
    const u = Math.max(0, Math.min(1, (p.y + 52) / 52));
    const hang: Xf = { pivot: WAIST, rot: trunk.rot * (1 - 0.65 * u), x: trunk.x * (1 - 0.4 * u), y: trunk.y * (1 - 0.25 * u) };
    const q = place(hang, p);
    const k = Math.pow(u, 1.5);
    // The back of the robe catches more of the wind than the front.
    const back = 1 + Math.max(0, -p.x) * 0.03;
    const ripple = w.ripple * u * Math.sin(w.phase - p.x * 0.3);
    return pt(q.x + w.wx * k * back + ripple * 0.6, q.y + w.wy * k * back + ripple * 0.5 * Math.cos(w.phase * 0.5 + p.x * 0.2));
  };
}

/** The gilded cuirass with a blue sash and a skirt of gold strips. */
function cuirass(d: Draw): void {
  const { pen } = d;
  for (let i = 0; i < 5; i++) {
    const x = -7.4 + i * 3.1;
    const strip = [pt(x, -53), pt(x + 2.8, -53), pt(x + 3.1 + i * 0.3, -44.4), pt(x + 1.6 + i * 0.3, -43.6), pt(x + 0.2 + i * 0.3, -44.2)];
    paint(d, strip, C.gold, { shadow: 0.4, hatch: 0, line: 0.5, gloss: true });
    pen.dot(x + 1.5 + i * 0.25, -46, 0.45, '#5f8fe0');
  }
  const plate = shapeOf([[-7.4, -51.6], [-8.6, -58.6], [-7.4, -65.6], [-3.6, -69.4], [2.4, -69.6], [6.4, -66], [7.8, -60], [6.2, -53.2], [3, -51]], 5);
  paint(d, plate, C.gold, { shadow: 0.55, hatch: 0.2, line: 0.65, gloss: true, lit: pt(0.5, 0.25) });
  pen.hair(lineOf([[5, -68], [7, -61.4], [5.6, -54]]), 0.4, d.ink, 0.5);
  gleam(d, lineOf([[3.8, -67.4], [5.6, -61.6], [4.6, -55.6]]), 0.9, 0.9);
  // Muscled breastplate: a line under the pectoral.
  pen.hair(lineOf([[-2, -61.4], [2.6, -60], [6.6, -61.6]]), 0.4, mix(C.gold, SHADOW, 0.6), 0.7);
  const sash = shapeOf([[-7.8, -66.6], [-4.8, -68.8], [7.6, -53.4], [4.4, -51.6]], 3);
  paint(d, sash, CROWN_BLUE, { shadow: 0.45, hatch: 0, line: 0.55 });
  pen.hair(lineOf([[-6.2, -67.4], [5.8, -52.6]]), 0.3, '#c9d6f5', 0.6);
}

/**
 * Head in profile: serene face, golden hair streaming back, circlet, and a
 * ring of light behind. The hair's trailing locks blow back by `stream`
 * and stir by `stir`.
 */
function headAndHalo(d: Draw, stream: number, stir: number): void {
  const { pen } = d;
  const h = HEAD;
  const k = 1.25;
  const P = (x: number, y: number): [number, number] => [h.x + x * k, h.y + y * k];
  // The locks blow back the further they hang from the crown; the crown itself stays put.
  const H = (x: number, y: number): [number, number] => {
    const w = Math.max(0, (-x - 1.5) / 12) * Math.max(0.15, Math.min(1, (y + 3) / 9));
    return P(x - w * (stream * 4.2 - stir * 0.7), y - w * (stream * 1.8 - stir * 0.9));
  };
  glow(pen.ctx, pt(h.x - 3, h.y - 2), 15, '#fff1c0', 0.32);
  const ring = shapeOf([P(-3.4, -10.4), P(-0.6, -9.8), P(-0.4, -1), P(-3.4, 8), P(-6.4, 7.6), P(-6.6, -1)], 6);
  pen.stroke([...ring, ring[0]!], 2.2, d.ink, 0.5);
  pen.stroke([...ring, ring[0]!], 1.4, '#f3cf6a', 1);
  // Hair: a long golden fall streaming back past the shoulders.
  const hair = shapeOf([H(0.6, -5.8), H(-4, -5.6), H(-7.4, -2), H(-10.6, 3), H(-14.6, 7.6), H(-10.6, 7), H(-9, 9.4), H(-5.4, 7.6), H(-2.6, 5.6), H(-0.6, 1)], 5);
  paint(d, hair, C.hair, { shadow: 0.5, hatch: 0.16, line: 0.55, lit: pt(0.5, 0.2) });
  for (const n of [0, 1, 2, 3]) pen.hair(lineOf([H(-1.4, -4.6 + n), H(-6 - n, 0 + n * 1.2), H(-11 - n * 0.6, 6 + n * 0.4)]), 0.32, n % 2 ? mix(C.hair, SHADOW, 0.45) : mix(C.hair, '#ffffff', 0.5), 0.8);
  const face = shapeOf([P(-1.2, -4.8), P(2, -5.4), P(3.8, -3.6), P(4.2, -1.6), P(5.6, 0.4), P(4.4, 0.9), P(4.6, 1.9), P(4.1, 2.5), P(4.2, 3.2), P(3, 4.6), P(0.2, 4.8), P(-1.6, 2.4)], 4);
  paint(d, face, C.skin, { shadow: 0.4, hatch: 0, line: 0.55, lit: pt(0.6, 0.3) });
  dab(d, shapeOf([P(-1.4, 0), P(1.4, 1), P(1, 4), P(-1.2, 3)]), SHADOW, 0.14, 1);
  // Brow, a calm lowered eye, lips.
  pen.hair(lineOf([P(1.4, -2.5), P(2.6, -2.8), P(3.6, -2.3)]), 0.4, mix(C.hair, SHADOW, 0.5), 0.9);
  pen.hair(lineOf([P(1.8, -1.2), P(2.7, -0.9), P(3.4, -1.2)]), 0.5, d.ink, 0.95);
  pen.hair(lineOf([P(3.9, 1.95), P(4.5, 2.1)]), 0.35, '#a5603e', 0.9);
  // Hair over the brow and the gold circlet with a blue stone.
  const fringe = shapeOf([P(-2, -4.2), P(0.4, -6.4), P(3, -5.6), P(3.8, -3.6), P(1.6, -4.2), P(-0.6, -2.6)], 4);
  paint(d, fringe, C.hair, { shadow: 0.3, hatch: 0, line: 0.5 });
  pen.stroke(lineOf([P(-3.2, -3.6), P(0, -5.2), P(3.4, -4.4)]), 1.1, GOLD, 1, false);
  pen.dot(h.x + 2 * k, h.y - 4.9 * k, 0.8, '#5f8fe0');
}

/** Fire tongues along the blade: where up it starts, height, which edge; lean and curl. */
const TONGUES = [[5, 6, 1], [8.6, 9.6, -1], [12.4, 7.2, 1], [15.6, 11.4, -1], [19.4, 8, 1], [22.4, 12.6, -1], [26, 9, 1], [29.4, 11, -1], [32.6, 7.4, 1]] as const;
const LEAN = [-2.2, -0.6, -3, -1.2, -2.6, -0.4, -2, -1.4, -2.8] as const;
const CURL = [1, -1, 1.4, -0.8, 1.2, -1.2, 0.8, -1, 1] as const;

/** The flaming sword: a long bright blade wreathed in fire, gold hilt. `flame` scales the fire, `flick` sets its flicker. */
function sword(d: Draw, at: Along, flame: number, flick: number): void {
  const { pen } = d;
  const len = 36;
  glow(pen.ctx, at(len * 0.55), 18, '#ffb84a', 0.3);
  // Fire wreathing the blade: irregular tongues rising up the screen off both edges, a soft envelope
  // round them and hot cores inside.
  const shapes = TONGUES.map(([s, h0, side], i) => {
    const h = h0 * flame * (1 + 0.1 * Math.sin(i * 2.3 + flick));
    const base = at(s, side * 1.1);
    const [lean, curl] = [LEAN[i]!, CURL[i]!];
    return { base, shape: shapeOf([[base.x - 2.6, base.y + 1.4], [base.x - 2.4 + lean * 0.2, base.y - h * 0.4], [base.x + lean * 0.7 - curl, base.y - h * 0.75], [base.x + lean, base.y - h], [base.x + lean * 0.4 + curl * 0.6, base.y - h * 0.55], [base.x + 2.4, base.y - h * 0.2], [base.x + 2.4, base.y + 0.8], [base.x, base.y + 2.4]], 4) };
  });
  for (const { base, shape } of shapes) pen.fill(shape.map((p) => pt(base.x + (p.x - base.x) * 1.4, base.y + (p.y - base.y) * 1.25)), '#f7b955', 0.35);
  for (const { base, shape } of shapes) {
    pen.fill(shape, C.flame, 0.85);
    pen.fill(shape.map((p) => pt(base.x + (p.x - base.x) * 0.62, base.y + 0.6 + (p.y - base.y) * 0.62)), '#ffc24a', 0.95);
    pen.fill(shape.map((p) => pt(base.x + (p.x - base.x) * 0.3, base.y + 0.9 + (p.y - base.y) * 0.32)), C.flameCore, 1);
    pen.hair(shape.slice(2, 9), 0.3, '#a8461a', 0.5);
  }
  const blade = [at(3, -1.6), at(len - 4, -1.1), at(len, 0), at(len - 4, 1.1), at(3, 1.6)];
  paint(d, blade, C.blade, { shadow: 0.35, hatch: 0, line: 0.55, gloss: true });
  pen.hair([at(4, 0), at(len - 3, 0)], 0.35, '#9aa6bd', 0.7);
  gleam(d, [at(5, -0.7), at(len - 6, -0.5)], 0.6, 0.95);
  const guard = [at(2.4, -5), at(3.6, -5), at(3.6, 5), at(2.4, 5)];
  paint(d, shapeOf(guard.map((p) => [p.x, p.y] as [number, number]), 2), C.gold, { shadow: 0.3, hatch: 0, line: 0.5, gloss: true });
  pen.stroke([at(-4, 0), at(2.4, 0)], 2.2, d.ink, 1, false);
  pen.stroke([at(-4, 0), at(2.4, 0)], 1.4, '#6a4a2e', 1, false);
  pen.dot(at(-4.8).x, at(-4.8).y, 1.3, C.gold);
}

/** An arm: the white sleeve, bare forearm, gold vambrace; the near one gets its gold shoulder pad. */
function arm(d: Draw, shoulder: Pt, hand: Pt, far: boolean): void {
  const dark = (c: string): string => (far ? mix(c, SHADOW, 0.3) : c);
  const elbow = elbowOf(shoulder, hand, 1);
  const upper = limb([[shoulder.x, shoulder.y, 5], [elbow.x, elbow.y, 4]]);
  paint(d, upper.shape, dark(C.robe), { shadow: 0.5, hatch: 0.14, line: 0.6 });
  const fore = limb([[elbow.x, elbow.y, 4], [hand.x, hand.y, 3.2]]);
  paint(d, fore.shape, dark(C.skin), { shadow: 0.45, hatch: 0, line: 0.6 });
  const brace = limb([[elbow.x + (hand.x - elbow.x) * 0.35, elbow.y + (hand.y - elbow.y) * 0.35, 4.4], [hand.x - (hand.x - elbow.x) * 0.1, hand.y - (hand.y - elbow.y) * 0.1, 3.8]]);
  paint(d, brace.shape, dark(C.gold), { shadow: 0.4, hatch: 0, line: 0.5, gloss: true });
  if (far) return;
  const S = shoulder;
  const pad = shapeOf([[S.x - 4.6, S.y + 1.6], [S.x - 2, S.y - 3], [S.x + 3, S.y - 2.4], [S.x + 4.6, S.y + 1.8], [S.x, S.y + 3.6]], 4);
  paint(d, pad, C.gold, { shadow: 0.45, hatch: 0, line: 0.55, gloss: true });
}

/** A fist round the grip, turned with the blade. */
function fist(d: Draw, hand: Pt, blade: number, far: boolean): void {
  within(d, { pivot: pt(0, 0), rot: blade + 0.86, x: hand.x, y: hand.y }, () => {
    const shape = shapeOf([[-2.2, -1.2], [0.6, -2.6], [2.6, -0.6], [2, 2], [-1, 2.4]], 4);
    paint(d, shape, far ? mix(C.skin, SHADOW, 0.3) : C.skin, { shadow: 0.45, hatch: 0, line: 0.6 });
  });
}

function figure(d: Draw, r: SeraphRig, flick: number): void {
  const trunk: Xf = { pivot: WAIST, ...r.trunk };
  const at = alongBlade(r.hand, r.blade);
  const hilt = at(-3.4);
  const farHand = pt(FAR_REST_HAND.x + (hilt.x - FAR_REST_HAND.x) * r.grip, FAR_REST_HAND.y + (hilt.y - FAR_REST_HAND.y) * r.grip);
  within(d, trunk, () => {
    wing(d, dress(r.far, FAR_LOOK));
    wing(d, dress(r.near, NEAR_LOOK));
    arm(d, FAR_SHOULDER, farHand, true);
    if (r.grip > 0.5) fist(d, farHand, r.blade, true);
  });
  robe(d, robeWarp(r), r.foot);
  within(d, trunk, () => {
    cuirass(d);
    within(d, { pivot: NECK, ...r.head }, () => headAndHalo(d, r.hair.stream, r.hair.stir));
    arm(d, SHOULDER, r.hand, false);
    sword(d, at, r.flame, flick);
    fist(d, r.hand, r.blade, false);
  });
}

/** The blade's arc through the blow, behind the sword. */
function sweepTrail(d: Draw, r: SeraphRig, k: number): void {
  const trunk: Xf = { pivot: WAIST, ...r.trunk };
  const at = alongBlade(r.hand, r.blade);
  const c = place(trunk, SHOULDER);
  const tip = place(trunk, at(30));
  const a = Math.atan2(tip.y - c.y, tip.x - c.x);
  const reach = Math.hypot(tip.x - c.x, tip.y - c.y);
  swoosh(d, c, reach - 3, a - 1.5, a - 0.08, 7, '#ffd98a', 0.5 * k);
  swoosh(d, c, reach - 11, a - 1.2, a - 0.1, 4, mix(LIGHT, '#ffd98a', 0.5), 0.4 * k);
}

export const drawSeraph: CreatureDrawer = (ctx, seed, f, pose) => {
  const r = seraphRig(pose);
  const flick = (pose?.t ?? 0) * Math.PI * 4 + f;
  finished(ctx, seed, f, (d) => figure(d, r, flick), (d) => groundShadow(d, -2 + r.trunk.x, 22 - (1 - r.ground) * 6, 3.4, 0.16 * (0.4 + 0.6 * r.ground)), { line: 0.7 });
  const blow = pose?.kind === 'attack' ? bump(pose.t, 0.5, 0.2) : 0;
  if (blow > 0) sweepTrail(makeDraw(ctx, seed + f + 3, f, 0), r, blow);
};
