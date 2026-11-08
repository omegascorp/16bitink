import { cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { ellipseAt, glaze } from '../critters/preyKit';
import { type BodyFrame, drawRodent, type RodentLook, type RodentPose, TAILS } from '../critters/preyRodent';

/**
 * The bandicoot rat (Bandicota bengalensis), seen from above facing +x: a
 * stocky dark rat about 30 × 15 in the body, its coarse coat grizzled
 * grey-brown and shaggy with long dark guard hairs, a broad blunt head with
 * small rounded ears, dark feet and a dark, scaly tail shorter than its
 * body. It sits ('idle'), runs in two strides ('run0', 'run1'), and, asleep
 * from venom, curls up in a ball, eyes shut, tail wrapped round ('sleep').
 */
type Pose = 'idle' | 'run0' | 'run1' | 'sleep';

const LOOK: RodentLook = {
  len: 30, wide: 15,
  fur: '#6e6152', warm: '#80684a', back: '#3f362d', pale: '#a99c88', deep: '#221c17',
  pink: '#9c7b72', pinkDeep: '#5e4440', tail: '#544a44', tailDeep: '#241e1a',
  earR: 2.7, eyeR: 1.05, snout: 1,
  tailLen: 24, tailW: 2.5, ring: 1, ringAlpha: 0.55,
  hairLen: 1.8, hairN: 620, guard: 190, tuft: 2, line: 0.62, whisker: 8, seed: 9201,
};

/** Curled right round asleep: the tail wraps the +y flank and its tip tucks under the nose. */
const wrap = (b: BodyFrame, look: RodentLook): Pt[] => {
  const T = look.tailLen;
  const r = pt(b.rump.x + look.len * 0.04, b.rump.y);
  const side = look.wide * 0.55;
  return cub(r, pt(r.x - T * 0.2, r.y + side * 1), pt(r.x + T * 0.3, b.rump.y + side * 1.35), pt(b.nose.x - look.len * 0.06, b.nose.y + side * 0.6), 22);
};

const POSES: Readonly<Record<Pose, RodentPose>> = {
  idle: { sx: 0.92, sy: 1.06, bend: 0, fore: [0, 0], hind: [0, 0], sit: true, tail: TAILS.curl },
  run0: { sx: 1.04, sy: 0.95, bend: 0.7, fore: [0.13, -0.05], hind: [-0.09, 0.09], sit: false, tail: TAILS.swing(-1) },
  run1: { sx: 1.04, sy: 0.95, bend: -0.7, fore: [-0.05, 0.13], hind: [0.09, -0.09], sit: false, tail: TAILS.swing(1) },
  sleep: { sx: 0.78, sy: 1.14, bend: 0.2 * LOOK.wide, fore: [0, 0], hind: [0, 0], sit: true, tail: wrap },
};

/** preyRodent's half-width profile (the same sums), for finding the eyes. */
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

/** Where the rodent build puts (u, v) on the body in a pose (u rump 0 to nose 1, v across). */
function bodyAt(pose: RodentPose, u: number, v: number): Pt {
  const L = LOOK.len * pose.sx;
  const half = (LOOK.wide / 2) * pose.sy * profile(u, LOOK.snout);
  return pt(-L / 2 + u * L, pose.bend * (2 * u - 1) ** 2 + v * half);
}

/** Shut eyes: each bead painted out with fur, a sleepy curved lid line with two tiny lashes. */
function shutEyes(d: Draw, pose: RodentPose): void {
  const { pen } = d;
  const r = LOOK.eyeR;
  for (const s of [-1, 1]) {
    const e = bodyAt(pose, 0.8, s * 0.62);
    pen.fill(ellipseAt(e.x, e.y, r * 1.3, r * 1.15, 0, 14), LOOK.fur, 1);
    glaze(d, e.x - r * 0.3, e.y - r * 0.3, r * 1.2, r, 0, PAPER_FILL, 0.2);
    glaze(d, e.x + r * 0.3, e.y + r * 0.3, r * 1.3, r, 0, LOOK.deep, 0.3);
    const a = pt(e.x - r * 0.95, e.y - s * r * 0.15);
    const b = pt(e.x + r * 0.95, e.y - s * r * 0.15);
    pen.hair([a, pt(e.x, e.y + s * r * 0.6), b], Math.max(0.45, r * 0.45), d.ink, 0.95);
    for (const t of [0.3, 0.7]) {
      const p = pt(a.x + (b.x - a.x) * t, (a.y + b.y) / 2 + s * r * 0.48);
      pen.hair([p, pt(p.x + r * 0.15, p.y + s * r * 0.45)], 0.22, d.ink, 0.7);
    }
  }
}

/** A sleeper's tiny "z"s drifting up from it. */
function snooze(d: Draw, at: Pt): void {
  for (const [dx, dy, k] of [[0, 0, 1], [2.6, -2.8, 0.75]] as const) {
    const s = 1.5 * k;
    const o = pt(at.x + dx, at.y + dy);
    const z = [pt(o.x - s, o.y - s), pt(o.x + s, o.y - s), pt(o.x - s, o.y + s), pt(o.x + s, o.y + s)];
    d.pen.hair(z, 0.6 * k + 0.1, PAPER_FILL, 0.9);
    d.pen.hair(z, 0.35 * k, d.ink, 0.8);
  }
}

export const BANDICOOT_ART: SpriteArt<Pose> = {
  frame: 60,
  res: 3,
  poses: ['idle', 'run0', 'run1', 'sleep'],
  draw: (d, pose) => {
    drawRodent(d, LOOK, POSES[pose]);
    if (pose === 'sleep') {
      shutEyes(d, POSES.sleep);
      snooze(d, pt(LOOK.len * 0.42, -LOOK.wide * 0.75));
    }
  },
};
