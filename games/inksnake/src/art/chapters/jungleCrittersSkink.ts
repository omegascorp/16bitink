import { closed, type Draw, pt, ribbon, shade } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { castShadow, glaze, skinWash } from '../critters/preyKit';
import { bandedLimb } from './barrensCrittersKit';

/**
 * The keeled grass skink (Eutropis carinata), seen from above facing +x:
 * sleek and glossy, about 40 long nose to tail tip, its body hardly wider
 * than its neck; a bronze-brown back flecked dark, with faint keels down
 * every scale, a cream stripe down each side over a broad dark-brown flank
 * band, short legs, a small pointed head and a thick tail tapering long.
 * It rests flat with its tail in a lazy curve ('idle'), wriggles as it runs
 * ('run0', 'run1'), and asleep from venom lies curled round with its tail
 * wrapped about it, eyes shut ('sleep').
 */
const K = {
  base: '#9c7644',
  back: '#b48d55',
  deep: '#44301b',
  band: '#4a3220',
  stripe: '#e6d29c',
  fleck: '#3a2716',
  head: '#a98352',
  belly: '#d9c59a',
  toe: '#6f5332',
} as const;

type Pose = 'idle' | 'run0' | 'run1' | 'sleep';

/** Spine length, board px: snout 0, head to 4.5, neck to 7, trunk to 18, the tail to the end. */
const LEN = 40;
const SHOULDER = 7.6;
const HIP = 17.4;

/** Full body width along the spine (s, width), eased between: a sleek tube with a thick-rooted tail. */
const WIDTH: readonly (readonly [number, number])[] = [
  [0, 0.8], [1, 2.4], [2.8, 4.2], [4.6, 5.2], [7, 5.4], [10, 6.6], [14, 6.9], [17, 6.2], [19.5, 5.2], [24, 3.8], [31, 2.2], [36, 1.1], [LEN, 0.3],
];

function widthAt(s: number): number {
  for (let i = 1; i < WIDTH.length; i++) {
    const [s1, w1] = WIDTH[i]!;
    const [s0, w0] = WIDTH[i - 1]!;
    if (s <= s1) return w0 + (w1 - w0) * (1 - Math.cos((Math.PI * (s - s0)) / (s1 - s0))) * 0.5;
  }
  return WIDTH[WIDTH.length - 1]![1];
}

/** A pose: the spine's heading at knots (s, turn), each leg's phase (+1 forward, −1 back) and how far they splay. */
interface Bend {
  readonly turn: readonly (readonly [number, number])[];
  /** Fore −y, fore +y, hind −y, hind +y. */
  readonly legs: readonly [number, number, number, number];
  readonly splay: number;
  readonly asleep: boolean;
}

const BENDS: Readonly<Record<Pose, Bend>> = {
  idle: { turn: [[0, 0.05], [8, 0], [18, -0.05], [26, 0.25], [LEN, 0.75]], legs: [0.5, 0.4, 0.1, 0.25], splay: 1.15, asleep: false },
  run0: { turn: [[0, -0.32], [8, 0], [18, 0.32], [28, 0.05], [LEN, -0.5]], legs: [1, -1, -1, 1], splay: 1, asleep: false },
  run1: { turn: [[0, 0.32], [8, 0], [18, -0.32], [28, -0.05], [LEN, 0.5]], legs: [-1, 1, 1, -1], splay: 1, asleep: false },
  sleep: { turn: [[0, -0.8], [7, -0.35], [17, 0.35], [22, 1.3], [28, 2.5], [34, 3.5], [LEN, 4.3]], legs: [-0.7, -0.9, -1, -1], splay: 0.7, asleep: true },
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

interface Skink {
  readonly shape: Pt[];
  readonly at: (s: number, v: number) => Pt;
  readonly frame: (s: number) => { f: Pt; n: Pt };
}

const STEPS = 80;

/** The spine traced back from the snout along its headings, then centred on the trunk (on the curl, asleep). */
function skink(b: Bend): Skink {
  const ds = LEN / STEPS;
  const raw: Pt[] = [pt(0, 0)];
  for (let i = 1; i <= STEPS; i++) {
    const a = turnAt(b, (i - 0.5) * ds);
    const p = raw[i - 1]!;
    raw.push(pt(p.x - Math.cos(a) * ds, p.y + Math.sin(a) * ds));
  }
  const mid = raw[Math.round(STEPS * ((b.asleep ? 13 : 19) / LEN))]!;
  const spine = raw.map((p) => pt(p.x - mid.x + (b.asleep ? -1 : 0), p.y - mid.y + (b.asleep ? -5 : 0)));
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
  const at = (s: number, v: number): Pt => {
    const p = point(s);
    const { n } = frame(s);
    const half = widthAt(s) / 2;
    return pt(p.x + n.x * v * half, p.y + n.y * v * half);
  };
  return { shape: ribbon(spine, (u) => widthAt(u * LEN)).shape, at, frame };
}

/** Thin toes fanned from `base` round `ang`, each with a fine claw. */
function toes(d: Draw, base: Pt, ang: number, spread: number, lens: readonly number[]): void {
  const { pen } = d;
  lens.forEach((l, i) => {
    const a = ang + (i / (lens.length - 1) - 0.5) * spread;
    const mid = pt(base.x + Math.cos(a) * l * 0.55, base.y + Math.sin(a) * l * 0.55);
    const tip = pt(base.x + Math.cos(a + 0.1) * l, base.y + Math.sin(a + 0.1) * l);
    pen.hair([base, mid, tip], 0.6, d.ink, 0.85);
    pen.hair([base, mid, tip], 0.36, K.toe, 1);
  });
}

/** Short legs, each at its phase; tucked back along the body asleep. */
function legs(d: Draw, z: Skink, b: Bend): void {
  const o = b.splay;
  ([-1, 1] as const).forEach((side, i) => {
    const p = b.legs[2 + i]!;
    const { f, n } = z.frame(HIP);
    const hip = z.at(HIP, side * 0.6);
    const out = pt(n.x * side, n.y * side);
    const knee = pt(hip.x + out.x * 3.2 * o + f.x * (0.4 + 1.6 * p), hip.y + out.y * 3.2 * o + f.y * (0.4 + 1.6 * p));
    const ankle = pt(knee.x + out.x * 1 * o - f.x * (2 - 0.6 * p), knee.y + out.y * 1 * o - f.y * (2 - 0.6 * p));
    const toeAng = Math.atan2(-f.y * 0.8 + out.y * 0.6, -f.x * 0.8 + out.x * 0.6) - side * 0.15 * p;
    toes(d, ankle, toeAng, 1.4, [1.1, 1.7, 2.3, 2.8, 1.6]);
    bandedLimb(d, knee, ankle, 1.3, 1, K.base, K.deep, K.band, 0, 0.32);
    bandedLimb(d, hip, knee, 2, 1.4, K.base, K.deep, K.band, 0, 0.32);
  });
  ([-1, 1] as const).forEach((side, i) => {
    const p = b.legs[i]!;
    const { f, n } = z.frame(SHOULDER);
    const sh = z.at(SHOULDER, side * 0.55);
    const out = pt(n.x * side, n.y * side);
    const elbow = pt(sh.x + out.x * 2.5 * o + f.x * p, sh.y + out.y * 2.5 * o + f.y * p);
    const wrist = pt(elbow.x + out.x * 0.7 * o + f.x * (0.4 + 1.2 * p), elbow.y + out.y * 0.7 * o + f.y * (0.4 + 1.2 * p));
    const toeAng = Math.atan2(f.y * (0.4 + 0.5 * p) + out.y * 0.8, f.x * (0.4 + 0.5 * p) + out.x * 0.8);
    toes(d, wrist, toeAng, 1.6, [0.8, 1.3, 1.6, 1.6, 1]);
    bandedLimb(d, elbow, wrist, 1.1, 0.9, K.base, K.deep, K.band, 0, 0.32);
    bandedLimb(d, sh, elbow, 1.6, 1.2, K.base, K.deep, K.band, 0, 0.32);
  });
}

/** The pattern: a bronze back with dark flecks, the cream stripes over dark flank bands, the tail's stripes fading out. */
function pattern(d: Draw, z: Skink): void {
  const { pen } = d;
  const run = (from: number, to: number, v: number, step = 1): Pt[] => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => z.at(from + i * step, v));
  pen.hair(run(4, 30, 0, 1.3), 3.2, K.back, 0.6);
  for (const v of [-1, 1]) {
    pen.hair(run(2.5, 34, v * 0.86), 2.3, K.band, 0.95);
    pen.hair(run(3, 31, v * 0.6), 1.05, K.stripe, 0.95);
    pen.hair(run(3, 31, v * 0.6).map((q) => pt(q.x + 0.15, q.y + 0.3)), 0.2, d.ink, 0.35);
    pen.hair(run(5, 26, v * 0.97), 0.7, mix(K.belly, K.base, 0.3), 0.5);
  }
  // Dark flecks in rows down the back, each with a pale fleck behind it.
  for (let s = 6; s < 30; s += 1.6) {
    for (const v of [-0.32, 0, 0.32]) {
      const c = z.at(s + (v === 0 ? 0.8 : 0), v);
      const w = widthAt(s) / 7;
      pen.dot(c.x, c.y, 0.26 * Math.min(1, w + 0.2), K.fleck, 0.6);
      const b = z.at(s - 0.5 + (v === 0 ? 0.8 : 0), v);
      pen.dot(b.x, b.y, 0.2, mix(K.stripe, PAPER_FILL, 0.3), 0.45);
    }
  }
  const h = z.at(2.8, 0);
  glaze(d, h.x, h.y, 2.8, 2.2, 0, K.head, 0.6);
}

/** Smooth overlapping scales: each a small arc open towards the head, keeled, with a glossy glint. */
function scales(d: Draw, z: Skink, from: number, to: number, step: number): void {
  const { pen } = d;
  for (let s = from, row = 0; s < to; s += step, row++) {
    const half = widthAt(s) / 2;
    const across = Math.max(1, Math.round((half * 2) / step));
    const { f, n } = z.frame(s);
    for (let j = 0; j <= across; j++) {
      const v = -1 + ((j + (row % 2) * 0.5) / across) * 2;
      if (Math.abs(v) > 0.94) continue;
      const c = z.at(s, v);
      const r = step * 0.55;
      const arc = [pt(c.x + n.x * r + f.x * r * 0.3, c.y + n.y * r + f.y * r * 0.3), pt(c.x - f.x * r * 0.7, c.y - f.y * r * 0.7), pt(c.x - n.x * r + f.x * r * 0.3, c.y - n.y * r + f.y * r * 0.3)];
      pen.hair(arc, 0.13, K.deep, 0.3);
      pen.hair([pt(c.x + f.x * r * 0.4, c.y + f.y * r * 0.4), pt(c.x - f.x * r * 0.4, c.y - f.y * r * 0.4)], 0.09, K.deep, 0.2);
      if (v < 0.2 && (j + row) % 2 === 0) pen.dot(c.x + f.x * r * 0.15 - n.x * r * 0.2, c.y + f.y * r * 0.15 - n.y * r * 0.2, 0.13, PAPER_FILL, 0.3);
    }
  }
}

/** The head: plates on the crown, a pale lip line, nostrils, bead eyes under the brows (shut asleep). */
function head(d: Draw, z: Skink, asleep: boolean): void {
  const { pen } = d;
  pen.hair([z.at(0.7, 0), z.at(2.4, 0), z.at(4.2, 0)], 0.18, K.deep, 0.55);
  for (const [s, v] of [[1.6, 0.5], [2.8, 0.6], [4, 0.58]] as const) pen.hair([z.at(s, -v), z.at(s + 0.4, 0), z.at(s, v)], 0.17, K.deep, 0.5);
  for (const v of [-1, 1]) {
    const nostril = z.at(0.7, v * 0.45);
    pen.dot(nostril.x, nostril.y, 0.2, d.ink, 0.85);
    pen.hair([z.at(0.5, v * 0.85), z.at(2, v * 0.96), z.at(3.6, v * 0.98)], 0.3, K.stripe, 0.6);
    const e = z.at(3.1, v * 0.72);
    if (asleep) {
      pen.hair([z.at(2.5, v * 0.84), z.at(3.1, v * 0.66), z.at(3.8, v * 0.84)], 0.36, d.ink, 0.9);
    } else {
      pen.dot(e.x, e.y, 0.75, '#151319', 1);
      pen.dot(e.x - 0.2, e.y - 0.22, 0.4, PAPER_FILL, 0.55);
    }
    pen.hair([z.at(2.3, v * 0.52), z.at(3.1, v * 0.4), z.at(3.9, v * 0.52)], 0.2, d.ink, 0.6);
  }
}

function draw(d: Draw, pose: Pose): void {
  const { pen } = d;
  const b = BENDS[pose];
  const z = skink(b);
  castShadow(d, z.shape, pt(0.8, 1.2), 0.18);
  legs(d, z, b);
  skinWash(d, z.shape, K.base, K.deep, { at: z.at(11, -0.4), r: 5 }, 0.4);
  pen.clipped(z.shape, () => pattern(d, z));
  pen.clipped(z.shape, () => scales(d, z, 3.5, LEN - 2, 0.85));
  shade(d, z.shape, 0.16);
  pen.clipped(z.shape, () => {
    pen.crescent(z.shape, pt(-0.5, -0.9), () => pen.fill(z.shape, K.deep, 0.28));
    // The skink's gloss: a long bright sheen down the lit side of the back.
    const sheen = Array.from({ length: 12 }, (_, i) => z.at(4 + i * 2, -0.35));
    pen.hair(sheen, 1.1, PAPER_FILL, 0.4);
    pen.hair(sheen.slice(1, 8), 0.45, PAPER_FILL, 0.75);
  });
  pen.stroke(closed(z.shape), 0.42, d.ink, 0.95);
  head(d, z, b.asleep);
}

export const SKINK_ART: SpriteArt<Pose> = {
  frame: 50,
  res: 3,
  poses: ['idle', 'run0', 'run1', 'sleep'],
  draw,
};
