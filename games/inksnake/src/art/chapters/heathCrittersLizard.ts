import { closed, type Draw, pt, ribbon, shade } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { beadEye, castShadow, glaze, skinWash } from '../critters/preyKit';
import { bandedLimb } from './barrensCrittersKit';

/**
 * The common (viviparous) lizard, seen from above facing +x: small and
 * stocky, about 20 long in the body with a thick tail as long again, a
 * short rounded head under big plates. Olive-brown, with a broken dark
 * line down the spine, a pale line either side and dark flanks freckled
 * with pale spots, the scales small and smooth (no fence lizard's spines).
 * It basks flattened out, legs splayed ('idle'), runs swinging side to
 * side ('run0', 'run1'), and sleeps curled round, its tail wrapped about it
 * and its eyes shut ('sleep').
 */
const C = {
  base: '#8a7148',
  deep: '#3b2f21',
  pale: '#d2bf91',
  band: '#3a2c1d',
  spine: '#2a2117',
  spot: '#e0d09f',
  head: '#8a7652',
  toe: '#5f5139',
  warm: '#c08a45',
} as const;

type Pose = 'idle' | 'run0' | 'run1' | 'sleep';

/** Spine length, board px: snout 0, head to 5, neck to 8, trunk to 21, the tail to the end. */
const LEN = 46;
const SHOULDER = 9.5;
const HIP = 20;

/** Full body width along the spine (s, width), eased between. */
const WIDTH: readonly (readonly [number, number])[] = [
  [0, 1.2], [1.2, 3.3], [3.2, 5.3], [5.2, 6.1], [7, 5.7], [9.5, 6.8], [13, 8.7], [17, 8.5], [20.5, 6.3], [23, 4.8], [30, 3.1], [38, 1.7], [LEN, 0.35],
];

function widthAt(s: number): number {
  for (let i = 1; i < WIDTH.length; i++) {
    const [s1, w1] = WIDTH[i]!;
    const [s0, w0] = WIDTH[i - 1]!;
    if (s <= s1) return w0 + (w1 - w0) * (1 - Math.cos((Math.PI * (s - s0)) / (s1 - s0))) * 0.5;
  }
  return WIDTH[WIDTH.length - 1]![1];
}

/** A pose: the spine's heading at knots (s, turn), how flat it lies (width ×), each leg's phase and its splay. */
interface Bend {
  readonly turn: readonly (readonly [number, number])[];
  readonly flat: number;
  /** Fore −y, fore +y, hind −y, hind +y: +1 reached forward, −1 swept back. */
  readonly legs: readonly [number, number, number, number];
  readonly splay: number;
  readonly asleep: boolean;
}

const BENDS: Readonly<Record<Pose, Bend>> = {
  idle: { turn: [[0, 0.04], [10, 0], [21, -0.04], [30, 0.25], [LEN, 0.7]], flat: 1.12, legs: [0.55, 0.45, 0.1, 0.25], splay: 1.3, asleep: false },
  run0: { turn: [[0, -0.28], [10, 0], [21, 0.28], [32, 0.05], [LEN, -0.45]], flat: 1, legs: [1, -1, -1, 1], splay: 1, asleep: false },
  run1: { turn: [[0, 0.28], [10, 0], [21, -0.28], [32, -0.05], [LEN, 0.45]], flat: 1, legs: [-1, 1, 1, -1], splay: 1, asleep: false },
  sleep: { turn: [[0, -0.75], [9, -0.3], [21, 0.35], [27, 1.3], [34, 2.5], [40, 3.4], [LEN, 4.2]], flat: 1.05, legs: [-0.6, -0.8, -0.8, -1], splay: 0.55, asleep: true },
};

function turnAt(b: Bend, s: number): number {
  const k = b.turn;
  for (let i = 1; i < k.length; i++) {
    const [s1, a1] = k[i]!;
    const [s0, a0] = k[i - 1]!;
    if (s <= s1) return a0 + (a1 - a0) * (1 - Math.cos((Math.PI * (s - s0)) / (s1 - s0))) * 0.5;
  }
  return k[k.length - 1]![1];
}

interface Lizard {
  readonly shape: Pt[];
  readonly at: (s: number, v: number) => Pt;
  readonly frame: (s: number) => { f: Pt; n: Pt };
}

const STEPS = 92;

/** The spine traced back from the snout along its headings, then centred on its trunk. */
function lizard(b: Bend): Lizard {
  const ds = LEN / STEPS;
  const raw: Pt[] = [pt(0, 0)];
  for (let i = 1; i <= STEPS; i++) {
    const a = turnAt(b, (i - 0.5) * ds);
    const p = raw[i - 1]!;
    raw.push(pt(p.x - Math.cos(a) * ds, p.y + Math.sin(a) * ds));
  }
  const mid = raw[Math.round(STEPS * ((b.asleep ? 15 : 22) / LEN))]!;
  const spine = raw.map((p) => pt(p.x - mid.x + (b.asleep ? -1 : 0), p.y - mid.y + (b.asleep ? -6 : 0)));
  const point = (s: number): Pt => {
    const u = Math.max(0, Math.min(STEPS, s / ds));
    const i = Math.min(STEPS - 1, Math.floor(u));
    const t = u - i;
    return pt(spine[i]!.x + (spine[i + 1]!.x - spine[i]!.x) * t, spine[i]!.y + (spine[i + 1]!.y - spine[i]!.y) * t);
  };
  const frame = (s: number): { f: Pt; n: Pt } => {
    const a = point(Math.max(0, s - 0.5));
    const c = point(Math.min(LEN, s + 0.5));
    const l = Math.hypot(a.x - c.x, a.y - c.y) || 1;
    const f = pt((a.x - c.x) / l, (a.y - c.y) / l);
    return { f, n: pt(-f.y, f.x) };
  };
  const half = (s: number): number => (widthAt(s) * (s > 4 && s < 24 ? b.flat : 1)) / 2;
  const at = (s: number, v: number): Pt => {
    const p = point(s);
    const { n } = frame(s);
    return pt(p.x + n.x * v * half(s), p.y + n.y * v * half(s));
  };
  const { shape } = ribbon(spine, (u) => half(u * LEN) * 2);
  return { shape, at, frame };
}

/** Thin toes fanned from `base` round `ang`, each with a fine claw. */
function toes(d: Draw, base: Pt, ang: number, spread: number, lens: readonly number[]): void {
  const { pen } = d;
  lens.forEach((l, i) => {
    const a = ang + (i / (lens.length - 1) - 0.5) * spread;
    const mid = pt(base.x + Math.cos(a) * l * 0.55, base.y + Math.sin(a) * l * 0.55);
    const tip = pt(base.x + Math.cos(a + 0.1) * l, base.y + Math.sin(a + 0.1) * l);
    pen.hair([base, mid, tip], 0.66, d.ink, 0.85);
    pen.hair([base, mid, tip], 0.4, C.toe, 1);
    pen.hair([tip, pt(tip.x + Math.cos(a + 0.2) * 0.5, tip.y + Math.sin(a + 0.2) * 0.5)], 0.2, d.ink, 0.9);
  });
}

/** Short stout legs, each at its phase; splayed wide when basking, tucked back along the body asleep. */
function legs(d: Draw, z: Lizard, b: Bend): void {
  const sides = [-1, 1] as const;
  const o = b.splay;
  sides.forEach((side, i) => {
    const p = b.legs[2 + i]!;
    const { f, n } = z.frame(HIP);
    const hip = z.at(HIP, side * 0.55);
    const out = pt(n.x * side, n.y * side);
    const knee = pt(hip.x + out.x * 3.6 * o + f.x * (0.5 + 1.8 * p), hip.y + out.y * 3.6 * o + f.y * (0.5 + 1.8 * p));
    const ankle = pt(knee.x + out.x * 1.2 * o - f.x * (2.3 - 0.7 * p), knee.y + out.y * 1.2 * o - f.y * (2.3 - 0.7 * p));
    const toeAng = Math.atan2(-f.y * 0.8 + out.y * 0.6 * o, -f.x * 0.8 + out.x * 0.6 * o) - side * 0.15 * p;
    toes(d, ankle, toeAng, 1.4 + 0.2 * o, [1.2, 1.9, 2.5, 3.1, 1.8]);
    bandedLimb(d, knee, ankle, 1.6, 1.15, C.base, C.deep, C.band, 1, 0.35);
    bandedLimb(d, hip, knee, 2.5, 1.7, C.base, C.deep, C.band, 1, 0.35);
  });
  sides.forEach((side, i) => {
    const p = b.legs[i]!;
    const { f, n } = z.frame(SHOULDER);
    const sh = z.at(SHOULDER, side * 0.5);
    const out = pt(n.x * side, n.y * side);
    const elbow = pt(sh.x + out.x * 3 * o + f.x * 1.2 * p, sh.y + out.y * 3 * o + f.y * 1.2 * p);
    const wrist = pt(elbow.x + out.x * 0.8 * o + f.x * (0.5 + 1.4 * p), elbow.y + out.y * 0.8 * o + f.y * (0.5 + 1.4 * p));
    const toeAng = Math.atan2(f.y * (0.4 + 0.5 * p) + out.y * 0.8 * o, f.x * (0.4 + 0.5 * p) + out.x * 0.8 * o);
    toes(d, wrist, toeAng, 1.6, [0.9, 1.4, 1.7, 1.8, 1.1]);
    bandedLimb(d, elbow, wrist, 1.4, 1.05, C.base, C.deep, C.band, 1, 0.35);
    bandedLimb(d, sh, elbow, 2.1, 1.5, C.base, C.deep, C.band, 0, 0.35);
  });
}

/** A line down the body at v, from s0 to s1, broken into dashes `dash` long with `gap` between. */
function dashes(d: Draw, z: Lizard, v: number, s0: number, s1: number, dash: number, gap: number, w: number, colour: string, alpha: number): void {
  for (let s = s0; s < s1; s += dash + gap) {
    const e = Math.min(s1, s + dash);
    d.pen.hair([z.at(s, v), z.at((s + e) / 2, v * 1.02), z.at(e, v)], w * (1 - (s / LEN) * 0.5), colour, alpha);
  }
}

/** The pattern: dark flank bands freckled pale, a pale line along each, the broken dark spine line, small smooth scales. */
function pattern(d: Draw, z: Lizard): void {
  const { pen } = d;
  for (const v of [-1, 1]) {
    for (let s = 5; s < 36; s += 1.2) {
      const w = (1.8 * widthAt(s)) / 8;
      pen.hair([z.at(s, v * 0.78), z.at(s + 1.3, v * 0.8)], w * 1.2, C.band, 0.62);
    }
    const flank = z.at(14, v * 0.92);
    glaze(d, flank.x, flank.y, 5, 1.4, 0, C.warm, 0.35);
    dashes(d, z, v * 0.5, 5.5, 38, 2.6, 0.5, 0.8, C.pale, 0.9);
    for (let s = 7; s < 30; s += 2.3) {
      const p = z.at(s + (s % 2), v * (0.72 + ((s * 7) % 3) * 0.06));
      pen.dot(p.x, p.y, 0.42, C.spot, 0.8);
    }
  }
  dashes(d, z, 0, 6, 40, 1.5, 0.9, 1, C.spine, 0.8);
  for (let s = 8; s < 26; s += 2.6) {
    for (const v of [-0.25, 0.25]) {
      const p = z.at(s + v * 2, v);
      pen.dot(p.x, p.y, 0.32, C.spine, 0.55);
    }
  }
  const tip = z.at(42, 0);
  glaze(d, tip.x, tip.y, 5, 2, 0, C.deep, 0.3);
  // Small smooth scales: a fine net of beads catching the light.
  for (let s = 6; s < LEN - 2; s += 1.1) {
    const half = widthAt(s) / 2;
    const n = Math.max(1, Math.round(half / 0.9));
    for (let j = -n; j <= n; j++) {
      const v = (j + ((s * 1.25) % 1) * 0.5) / (n + 0.5);
      if (Math.abs(v) > 0.92) continue;
      const p = z.at(s, v);
      pen.dot(p.x - 0.12, p.y - 0.15, 0.17, PAPER_FILL, 0.16);
      pen.dot(p.x + 0.18, p.y + 0.2, 0.13, C.deep, 0.16);
    }
  }
}

/** The head: big plates on a short round crown, nostrils, a pale lip, bead eyes under scaly brows (shut asleep). */
function head(d: Draw, z: Lizard, asleep: boolean): void {
  const { pen } = d;
  const crown = z.at(3, 0);
  glaze(d, crown.x, crown.y, 3.4, 2.6, 0, C.head, 0.7);
  pen.hair([z.at(0.9, 0), z.at(2.8, 0), z.at(5.2, 0)], 0.2, C.deep, 0.55);
  for (const [s, v] of [[1.9, 0.5], [3.3, 0.62], [4.8, 0.6]] as const) pen.hair([z.at(s, -v), z.at(s + 0.45, 0), z.at(s, v)], 0.2, C.deep, 0.55);
  pen.hair([z.at(5.4, -0.55), z.at(6.2, 0), z.at(5.4, 0.55)], 0.35, C.band, 0.5);
  for (const v of [-1, 1]) {
    const nostril = z.at(0.8, v * 0.45);
    pen.dot(nostril.x, nostril.y, 0.22, d.ink, 0.85);
    pen.hair([z.at(0.6, v * 0.85), z.at(2.5, v * 0.96), z.at(4.4, v * 0.98)], 0.35, C.pale, 0.6);
    const e = z.at(3.7, v * 0.74);
    pen.fill([z.at(2.7, v * 0.98), z.at(3.7, v * 1.12), z.at(4.7, v * 0.98), z.at(3.7, v * 0.52)], mix(C.head, PAPER_FILL, 0.3), 0.9);
    if (asleep) {
      pen.hair([z.at(3, v * 0.82), z.at(3.7, v * 0.68), z.at(4.4, v * 0.82)], 0.38, d.ink, 0.9);
    } else {
      pen.dot(e.x, e.y, 0.8, d.ink, 0.9);
      beadEye(d, e, 0.62);
    }
    pen.hair([z.at(2.7, v * 0.55), z.at(3.7, v * 0.42), z.at(4.7, v * 0.55)], 0.22, d.ink, 0.6);
  }
  const g = z.at(2.4, -0.35);
  glaze(d, g.x, g.y, 1.7, 1, 0, PAPER_FILL, 0.3);
}

function draw(d: Draw, pose: Pose): void {
  const b = BENDS[pose];
  const z = lizard(b);
  castShadow(d, z.shape, pt(0.9, 1.3), b.flat > 1.1 ? 0.12 : 0.18);
  legs(d, z, b);
  const { pen } = d;
  skinWash(d, z.shape, C.base, C.deep, { at: z.at(12, -0.4), r: 6 }, 0.4);
  pen.clipped(z.shape, () => pattern(d, z));
  shade(d, z.shape, 0.18);
  pen.clipped(z.shape, () => pen.crescent(z.shape, pt(-0.6, -1), () => pen.fill(z.shape, C.deep, 0.3)));
  pen.stroke(closed(z.shape), 0.45, d.ink, 0.95);
  head(d, z, b.asleep);
}

export const COMMON_LIZARD_ART: SpriteArt<Pose> = {
  frame: 60,
  res: 3,
  poses: ['idle', 'run0', 'run1', 'sleep'],
  draw,
};
