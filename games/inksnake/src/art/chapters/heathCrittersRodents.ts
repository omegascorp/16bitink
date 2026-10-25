import { cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { ellipseAt, glaze } from '../critters/preyKit';
import { type BodyFrame, drawRodent, type RodentLook, type RodentPose, TAILS } from '../critters/preyRodent';

/**
 * The Heath's two small rodents, painted on the farm mouse's build
 * (critters/preyRodent.ts), told apart at a glance:
 *
 * - the wood mouse: slim and sandy gold-brown, with big bulging black eyes,
 *   big round ears and a tail as long as it is, dusky above;
 * - the field vole: stubby and round, a shaggy grey-brown coat, a blunt
 *   snout, small eyes, ears all but lost in the fur and a short stub of a tail.
 *
 * Both sit ('idle'), run in two strides ('run0', 'run1'; the vole also
 * staggers off in them after the adder's bite), and sleep curled up in a
 * ball, nose to tail, eyes shut ('sleep').
 */
type Pose = 'idle' | 'run0' | 'run1' | 'sleep';

const WOODMOUSE: RodentLook = {
  len: 24, wide: 11.5,
  fur: '#a8794c', warm: '#c78c48', back: '#7b5535', pale: '#ead9bd', deep: '#4b321f',
  pink: '#eaa9a2', pinkDeep: '#bd6f6d', tail: '#c9a593', tailDeep: '#8a6656',
  earR: 3.7, eyeR: 1.55, snout: 0,
  tailLen: 30, tailW: 1.5, ring: 1.1, ringAlpha: 0.3,
  hairLen: 1.4, hairN: 430, guard: 0, tuft: 1, line: 0.5, whisker: 8, seed: 8801,
};

const VOLE: RodentLook = {
  len: 38, wide: 21,
  fur: '#7f6a52', warm: '#94744c', back: '#54432f', pale: '#b7a68c', deep: '#2f251b',
  pink: '#c99a90', pinkDeep: '#93625a', tail: '#8c7462', tailDeep: '#4e3e31',
  earR: 2.1, eyeR: 1.2, snout: 1,
  tailLen: 12, tailW: 2.6, ring: 1.2, ringAlpha: 0.25,
  hairLen: 2.6, hairN: 900, guard: 260, tuft: 2, line: 0.8, whisker: 8, seed: 8813,
};

/** A short stub of a tail, trailing and a little swung (`s`). */
const stub = (s: number) => (b: BodyFrame, look: RodentLook): Pt[] => {
  const T = look.tailLen;
  const r = pt(b.rump.x + look.len * 0.06, b.rump.y);
  return cub(r, pt(r.x - T * 0.4, r.y), pt(r.x - T * 0.7, r.y + s * T * 0.15), pt(r.x - T, r.y + s * T * 0.3), 10);
};

/** Curled right round in sleep: the tail wraps the +y flank and its tip tucks under the nose. */
const wrap = (b: BodyFrame, look: RodentLook): Pt[] => {
  const T = look.tailLen;
  const r = pt(b.rump.x + look.len * 0.04, b.rump.y);
  const side = look.wide * 0.55;
  return cub(r, pt(r.x - T * 0.16, r.y + side * 0.9), pt(r.x + T * 0.2, b.rump.y + side * 1.25), pt(b.nose.x - look.len * 0.05, b.nose.y + side * 0.55), 22);
};

/** A ball, the head bowed round towards the tail (bend curls nose and rump the same way). */
const SLEEP_BEND = { mouse: 0.5, vole: 0.26 } as const;

function posesOf(look: RodentLook, vole: boolean): Record<Pose, RodentPose> {
  const k = look.wide;
  return {
    idle: { sx: 0.9, sy: 1.07, bend: 0, fore: [0, 0], hind: [0, 0], sit: true, tail: vole ? stub(0.6) : TAILS.curl },
    run0: { sx: 1.04, sy: 0.95, bend: 0.045 * k, fore: [0.14, -0.06], hind: [-0.1, 0.1], sit: false, tail: vole ? stub(-1) : TAILS.swing(-1) },
    run1: { sx: 1.04, sy: 0.95, bend: -0.045 * k, fore: [-0.06, 0.14], hind: [0.1, -0.1], sit: false, tail: vole ? stub(1) : TAILS.swing(1) },
    sleep: { sx: vole ? 0.8 : 0.74, sy: 1.12, bend: SLEEP_BEND[vole ? 'vole' : 'mouse'] * k, fore: [0, 0], hind: [0, 0], sit: true, tail: vole ? stub(1.4) : wrap },
  };
}

/**
 * Where the rodent build puts the point (u, v) on a body in a pose, the
 * same sums as preyRodent's body frame (u rump 0 to nose 1, v across).
 */
function bodyAt(look: RodentLook, pose: RodentPose, u: number, v: number): Pt {
  const L = look.len * pose.sx;
  const half = (look.wide / 2) * pose.sy * profile(u, look.snout);
  return pt(-L / 2 + u * L, pose.bend * (2 * u - 1) ** 2 + v * half);
}

/** preyRodent's half-width profile, for finding the eyes. */
function profile(u: number, snout: number): number {
  if (u < 0.3) return Math.sqrt(Math.max(0, 1 - ((0.3 - u) / 0.3) ** 2));
  const x = (u - 0.3) / 0.4;
  const t = Math.max(0, Math.min(1, (u - 0.68) / 0.16));
  const trunk = (1 - 0.3 * x * x) * (1 - t * t * (3 - 2 * t));
  const hc = 0.67 - snout * 0.02;
  const head = (0.74 + snout * 0.04) * Math.pow(Math.max(0, 1 - ((u - hc) / (1 - hc)) ** 2), 0.78 - snout * 0.2);
  const k = 28;
  const blend = Math.log(Math.exp(k * trunk) + Math.exp(k * head)) / k - (Math.log(2) / k) * Math.exp(-k * Math.abs(trunk - head));
  return Math.max(0, blend) * (1 - 0.06 * Math.exp(-(((u - 0.61) / 0.06) ** 2)));
}

/** Shut eyes: the bead painted out with fur, a sleepy curved lid line and two tiny lashes. */
function shutEyes(d: Draw, look: RodentLook, pose: RodentPose): void {
  const { pen } = d;
  const r = look.eyeR;
  for (const s of [-1, 1]) {
    const e = bodyAt(look, pose, 0.8, s * 0.62);
    const lid = ellipseAt(e.x, e.y, r * 1.25, r * 1.1, 0, 14);
    pen.fill(lid, look.fur, 1);
    glaze(d, e.x - r * 0.3, e.y - r * 0.3, r * 1.2, r, 0, PAPER_FILL, 0.25);
    glaze(d, e.x + r * 0.3, e.y + r * 0.3, r * 1.3, r, 0, look.deep, 0.3);
    const a = pt(e.x - r * 0.9, e.y - s * r * 0.15);
    const b = pt(e.x + r * 0.9, e.y - s * r * 0.15);
    const m = pt(e.x, e.y + s * r * 0.55);
    pen.hair([a, m, b], Math.max(0.35, r * 0.32), d.ink, 0.9);
    for (const t of [0.3, 0.7]) {
      const p = pt(a.x + (b.x - a.x) * t, (a.y + b.y) / 2 + s * r * 0.45);
      pen.hair([p, pt(p.x + r * 0.15, p.y + s * r * 0.45)], 0.25, d.ink, 0.7);
    }
  }
}

function rodentArt(look: RodentLook, frame: number, vole: boolean): SpriteArt<Pose> {
  const poses = posesOf(look, vole);
  return {
    frame,
    res: 3,
    poses: ['idle', 'run0', 'run1', 'sleep'],
    draw: (d, pose) => {
      drawRodent(d, look, poses[pose]);
      if (pose === 'sleep') shutEyes(d, look, poses[pose]);
    },
  };
}

export const WOODMOUSE_ART = rodentArt(WOODMOUSE, 56, false);
export const VOLE_ART = rodentArt(VOLE, 60, true);
