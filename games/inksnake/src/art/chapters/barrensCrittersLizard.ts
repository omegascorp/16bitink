import { closed, type Draw, pt, ribbon, shade } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { beadEye, castShadow, glaze, skinWash } from '../critters/preyKit';
import { bandedLimb } from './barrensCrittersKit';

/**
 * The eastern fence lizard, seen from above facing +x: slim and about 20
 * long in the body with a tail longer still, grey-brown with dark wavy
 * crossbars down its back and tail, a hint of a male's blue at the flanks,
 * and rough keeled scales all over. Its legs sprawl out to the sides with
 * long thin toes. It rests with its tail in a lazy curve ('idle') and runs
 * with its body swinging side to side, the legs in diagonal pairs ('run0',
 * 'run1').
 */
const L = {
  base: '#8f8371',
  deep: '#463d31',
  fawn: '#b9aa8a',
  bar: '#2f2820',
  blue: '#4f75a6',
  head: '#9a8c76',
  toe: '#6e6353',
} as const;

type Pose = 'idle' | 'run0' | 'run1';

/** Spine length, board px: snout 0, head to 6, neck to 9, trunk to 21, tail to the end. */
const LEN = 47;
const SNOUT = 21.5;
const SHOULDER = 10;
const HIP = 20.4;

/** Full body width along the spine, through these knots (s, width), eased between them. */
const WIDTH: readonly (readonly [number, number])[] = [
  [0, 0.8], [1.4, 2.5], [3.8, 4.7], [6, 5.8], [8, 5], [10, 6.4], [14, 8.4], [18, 7.8], [21, 5.4], [23, 4.1], [30, 2.6], [38, 1.3], [LEN, 0.3],
];

function widthAt(s: number): number {
  for (let i = 1; i < WIDTH.length; i++) {
    const [s1, w1] = WIDTH[i]!;
    const [s0, w0] = WIDTH[i - 1]!;
    if (s <= s1) {
      const t = (s - s0) / (s1 - s0);
      return w0 + (w1 - w0) * (1 - Math.cos(Math.PI * t)) * 0.5;
    }
  }
  return WIDTH[WIDTH.length - 1]![1];
}

/** How a pose bends it: the trunk's sideways swing, the tail's curve, and each leg's phase (+1 reached forward, −1 pushed back). */
interface Bend {
  readonly trunk: number;
  readonly tail: number;
  readonly whip: number;
  /** Fore −y, fore +y, hind −y, hind +y. */
  readonly legs: readonly [number, number, number, number];
}

const BENDS: Readonly<Record<Pose, Bend>> = {
  idle: { trunk: 0.5, tail: 8, whip: -2, legs: [0.45, 0.35, 0.15, 0.25] },
  run0: { trunk: 2.1, tail: -9, whip: 3, legs: [1, -1, -1, 1] },
  run1: { trunk: -2.1, tail: 9, whip: -3, legs: [-1, 1, 1, -1] },
};

/** The spine's point at s: the trunk swung in one smooth bend, the tail curving off after it. */
function spineAt(b: Bend, s: number): Pt {
  const trunk = b.trunk * Math.sin((Math.PI * Math.min(s, 26)) / 26);
  const u = Math.max(0, (s - 21) / (LEN - 21));
  const tail = b.tail * u ** 1.5 + b.whip * Math.sin(Math.PI * u) * u;
  return pt(SNOUT - s, trunk + tail);
}

interface Lizard {
  readonly spine: Pt[];
  readonly shape: Pt[];
  readonly at: (s: number, v: number) => Pt;
  readonly frame: (s: number) => { f: Pt; n: Pt };
}

function lizard(b: Bend): Lizard {
  const n = 60;
  const spine = Array.from({ length: n + 1 }, (_, i) => spineAt(b, (i / n) * LEN));
  const { shape } = ribbon(spine, (u) => widthAt(u * LEN));
  const frame = (s: number): { f: Pt; n: Pt } => {
    const a = spineAt(b, Math.max(0, s - 0.5));
    const c = spineAt(b, Math.min(LEN, s + 0.5));
    const l = Math.hypot(a.x - c.x, a.y - c.y) || 1;
    const f = pt((a.x - c.x) / l, (a.y - c.y) / l);
    return { f, n: pt(-f.y, f.x) };
  };
  // v runs −1..1 across the body, +1 on the +y side.
  const at = (s: number, v: number): Pt => {
    const p = spineAt(b, s);
    const { n: nn } = frame(s);
    const half = widthAt(s) / 2;
    return pt(p.x + nn.x * v * half, p.y + nn.y * v * half);
  };
  return { spine, shape, at, frame };
}

/** Long thin toes fanned from `base` round `ang`, each with a fine claw. */
function toes(d: Draw, base: Pt, ang: number, spread: number, lens: readonly number[]): void {
  const { pen } = d;
  lens.forEach((l, i) => {
    const a = ang + (i / (lens.length - 1) - 0.5) * spread;
    const mid = pt(base.x + Math.cos(a) * l * 0.55, base.y + Math.sin(a) * l * 0.55);
    const tip = pt(base.x + Math.cos(a + 0.12) * l, base.y + Math.sin(a + 0.12) * l);
    pen.hair([base, mid, tip], 0.62, d.ink, 0.85);
    pen.hair([base, mid, tip], 0.36, L.toe, 1);
    pen.hair([tip, pt(tip.x + Math.cos(a + 0.2) * 0.6, tip.y + Math.sin(a + 0.2) * 0.6)], 0.2, d.ink, 0.9);
  });
}

/** The four sprawling legs, each at its phase: forelegs out and forward, hind legs out with long toes trailing back. */
function legs(d: Draw, z: Lizard, b: Bend): void {
  const sides = [-1, 1] as const;
  sides.forEach((side, i) => {
    const p = b.legs[2 + i]!;
    const { f, n } = z.frame(HIP);
    const hip = z.at(HIP, side * 0.55);
    const out = pt(n.x * side, n.y * side);
    const knee = pt(hip.x + out.x * 4.4 + f.x * (0.6 + 2 * p), hip.y + out.y * 4.4 + f.y * (0.6 + 2 * p));
    const ankle = pt(knee.x + out.x * 1.4 - f.x * (2.6 - 0.8 * p), knee.y + out.y * 1.4 - f.y * (2.6 - 0.8 * p));
    const toeAng = Math.atan2(-f.y * 0.8 + out.y * 0.6, -f.x * 0.8 + out.x * 0.6) - side * 0.15 * p;
    toes(d, ankle, toeAng, 1.5, [1.4, 2.2, 3, 3.9, 2.1]);
    bandedLimb(d, knee, ankle, 1.5, 1.1, L.base, L.deep, L.bar, 1, 0.35);
    bandedLimb(d, hip, knee, 2.4, 1.6, L.base, L.deep, L.bar, 1, 0.35);
  });
  sides.forEach((side, i) => {
    const p = b.legs[i]!;
    const { f, n } = z.frame(SHOULDER);
    const sh = z.at(SHOULDER, side * 0.5);
    const out = pt(n.x * side, n.y * side);
    const elbow = pt(sh.x + out.x * 3.4 + f.x * 1.3 * p, sh.y + out.y * 3.4 + f.y * 1.3 * p);
    const wrist = pt(elbow.x + out.x * 0.9 + f.x * (0.6 + 1.6 * p), elbow.y + out.y * 0.9 + f.y * (0.6 + 1.6 * p));
    const toeAng = Math.atan2(f.y * (0.4 + 0.5 * p) + out.y * 0.8, f.x * (0.4 + 0.5 * p) + out.x * 0.8);
    toes(d, wrist, toeAng, 1.7, [1, 1.6, 2, 2.1, 1.3]);
    bandedLimb(d, elbow, wrist, 1.35, 1, L.base, L.deep, L.bar, 1, 0.35);
    bandedLimb(d, sh, elbow, 2, 1.4, L.base, L.deep, L.bar, 0, 0.35);
  });
}

/** A wavy dark crossbar (a chevron pointing back) across the back at s, `w` thick. */
function crossbar(d: Draw, z: Lizard, s: number, w: number, alpha: number): void {
  const pts = [-0.95, -0.6, -0.3, 0, 0.3, 0.6, 0.95].map((v, i) => z.at(s + Math.abs(v) * -1.1 + (i % 2) * 0.55, v));
  d.pen.hair(pts, w, L.bar, alpha);
  d.pen.hair(pts.map((p) => pt(p.x - 0.55, p.y)), w * 0.35, mix(L.fawn, PAPER_FILL, 0.3), alpha * 0.55);
}

/** Keeled scales in rows down the body: each a small arc open towards the head, with its keel. */
function scales(d: Draw, z: Lizard, from: number, to: number, step: number): void {
  const { pen } = d;
  for (let s = from, row = 0; s < to; s += step, row++) {
    const half = widthAt(s) / 2;
    const across = Math.max(1, Math.round((half * 2) / step));
    const { f, n } = z.frame(s);
    for (let j = 0; j <= across; j++) {
      const v = -1 + ((j + (row % 2) * 0.5) / across) * 2;
      if (Math.abs(v) > 0.95) continue;
      const c = z.at(s, v);
      const r = step * 0.5;
      const arc = [pt(c.x + n.x * r + f.x * r * 0.4, c.y + n.y * r + f.y * r * 0.4), pt(c.x - f.x * r * 0.6, c.y - f.y * r * 0.6), pt(c.x - n.x * r + f.x * r * 0.4, c.y - n.y * r + f.y * r * 0.4)];
      pen.hair(arc, 0.17, L.deep, 0.5);
      pen.hair([pt(c.x + f.x * r * 0.5, c.y + f.y * r * 0.5), pt(c.x - f.x * r * 0.4, c.y - f.y * r * 0.4)], 0.13, d.ink, 0.35);
      pen.dot(c.x + f.x * r * 0.2 + n.x * r * 0.25, c.y + f.y * r * 0.2 + n.y * r * 0.25, 0.16, PAPER_FILL, 0.35);
    }
  }
}

/** The body: washed and rounded, fawn bands down the sides, blue at the flanks, crossbars, scales, the head's plates and eyes. */
function body(d: Draw, z: Lizard): void {
  const { pen } = d;
  const { shape } = z;
  skinWash(d, shape, L.base, L.deep, { at: z.at(12, 0.4), r: 6 }, 0.42);
  pen.clipped(shape, () => {
    for (const v of [-0.62, 0.62]) {
      const band = Array.from({ length: 12 }, (_, i) => z.at(7 + i * 1.6, v));
      pen.hair(band, 1.4, L.fawn, 0.55);
    }
    pen.hair(Array.from({ length: 12 }, (_, i) => z.at(6 + i * 2.4, 0)), 1.4, L.deep, 0.25);
    for (const v of [-1, 1]) {
      const c = z.at(15, v * 0.95);
      glaze(d, c.x, c.y, 5, 1.6, 0, L.blue, 0.6);
    }
    const h = z.at(3.5, 0);
    glaze(d, h.x, h.y, 3.6, 2.6, 0, L.head, 0.6);
    for (const [s, w, a] of [[10.5, 0.9, 0.8], [13.4, 1.05, 0.9], [16.3, 1.05, 0.9], [19.2, 0.95, 0.85], [23, 0.8, 0.7], [27, 0.7, 0.65], [31, 0.6, 0.6], [35, 0.5, 0.55], [39, 0.4, 0.5]] as const) crossbar(d, z, s, w, a);
    // The tail darkening to its tip.
    const tip = z.at(43, 0);
    glaze(d, tip.x, tip.y, 6, 2, 0, L.deep, 0.35);
  });
  pen.clipped(shape, () => scales(d, z, 6.5, LEN - 2, 0.95));
  shade(d, shape, 0.2);
  pen.clipped(shape, () => pen.crescent(shape, pt(-0.6, -1), () => pen.fill(shape, L.deep, 0.3)));
  // A spiny edge along the trunk: keeled scales catching the contour.
  for (let s = 9; s < 30; s += 0.9) {
    for (const v of [-1, 1]) {
      const p = z.at(s, v);
      const { f, n } = z.frame(s);
      pen.hair([p, pt(p.x - f.x * 0.7 + n.x * v * 0.35, p.y - f.y * 0.7 + n.y * v * 0.35)], 0.22, d.ink, 0.6);
    }
  }
  pen.stroke(closed(shape), 0.42, d.ink, 0.95);
  head(d, z);
}

/** The head: plates on its crown, a pale lip line, nostrils, and bead eyes under scaly brows. */
function head(d: Draw, z: Lizard): void {
  const { pen } = d;
  pen.hair([z.at(0.8, 0), z.at(3, 0), z.at(5.6, 0)], 0.2, L.deep, 0.55);
  for (const [s, v] of [[2.2, 0.5], [3.6, 0.6], [5.2, 0.62]] as const) pen.hair([z.at(s, -v), z.at(s + 0.4, 0), z.at(s, v)], 0.18, L.deep, 0.5);
  for (const v of [-1, 1]) {
    const nostril = z.at(0.9, v * 0.45);
    pen.dot(nostril.x, nostril.y, 0.22, d.ink, 0.85);
    const e = z.at(4.4, v * 0.74);
    pen.fill([z.at(3.4, v * 0.98), z.at(4.4, v * 1.12), z.at(5.4, v * 0.98), z.at(4.4, v * 0.52)], mix(L.head, PAPER_FILL, 0.35), 0.9);
    pen.dot(e.x, e.y, 0.85, d.ink, 0.9);
    beadEye(d, e, 0.66);
    pen.hair([z.at(3.4, v * 0.55), z.at(4.4, v * 0.42), z.at(5.4, v * 0.55)], 0.22, d.ink, 0.6);
  }
  const g = z.at(2.8, -0.35);
  glaze(d, g.x, g.y, 1.8, 1, 0, PAPER_FILL, 0.3);
}

function draw(d: Draw, pose: Pose): void {
  const b = BENDS[pose];
  const z = lizard(b);
  castShadow(d, z.shape, pt(0.9, 1.3), 0.18);
  legs(d, z, b);
  body(d, z);
}

export const LIZARD_ART: SpriteArt<Pose> = {
  frame: 60,
  res: 3,
  poses: ['idle', 'run0', 'run1'],
  draw,
};
