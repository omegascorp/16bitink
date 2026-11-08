import { closed, type Draw, pt, ribbon, shade } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { beadEye, castShadow, glaze, skinWash } from '../critters/preyKit';
import { bandedLimb } from './barrensCrittersKit';

/**
 * The side-blotched lizard, seen from above facing +x: a small, slim
 * sand-brown lizard about 34 long with its tail, smooth and finely
 * granular (not spiny), with paired dark blotches edged pale down its back,
 * broken pale stripes along its sides, pale-blue flecks scattered over a
 * male's back, and its namesake: a blue-black blotch on each flank just
 * behind the foreleg. Its legs sprawl with long thin toes. It rests with
 * its tail in a lazy curve ('idle') and runs with its body swinging, the
 * legs in diagonal pairs ('run0', 'run1'). Drawn in lizard units, scaled
 * down by K.
 */
const U = {
  base: '#a08a6a',
  deep: '#4c3e2e',
  sand: '#cdb894',
  blotch: '#3b2e22',
  spot: '#1d2233',
  fleck: '#8fb4cf',
  throat: '#d9a25a',
  head: '#a89476',
  toe: '#75674f',
} as const;

type Pose = 'idle' | 'run0' | 'run1';

const K = 0.7;
/** Spine length, lizard units: snout 0, head to 6, neck to 9, trunk to 21, tail to the end. */
const LEN = 48;
const SNOUT = 20;
const SHOULDER = 10;
const HIP = 20.4;
/** Lines are drawn a little heavier, to stay as strong once scaled down. */
const LW = 1.15;

const WIDTH: readonly (readonly [number, number])[] = [
  [0, 1], [1.4, 3], [3.8, 5.4], [6, 6.3], [8, 5.6], [10, 6.8], [14, 8.4], [18, 8], [21, 5.6], [23, 4], [30, 2.5], [38, 1.3], [LEN, 0.3],
];

function widthAt(s: number): number {
  for (let i = 1; i < WIDTH.length; i++) {
    const [s1, w1] = WIDTH[i]!;
    const [s0, w0] = WIDTH[i - 1]!;
    if (s <= s1) return w0 + (w1 - w0) * (1 - Math.cos((Math.PI * (s - s0)) / (s1 - s0))) * 0.5;
  }
  return WIDTH[WIDTH.length - 1]![1];
}

interface Bend {
  readonly trunk: number;
  readonly tail: number;
  readonly whip: number;
  /** Fore −y, fore +y, hind −y, hind +y: +1 reached forward, −1 pushed back. */
  readonly legs: readonly [number, number, number, number];
}

const BENDS: Readonly<Record<Pose, Bend>> = {
  idle: { trunk: 0.6, tail: 9, whip: -2.5, legs: [0.45, 0.3, 0.1, 0.25] },
  run0: { trunk: 2.3, tail: -10, whip: 3, legs: [1, -1, -1, 1] },
  run1: { trunk: -2.3, tail: 10, whip: -3, legs: [-1, 1, 1, -1] },
};

function spineAt(b: Bend, s: number): Pt {
  const trunk = b.trunk * Math.sin((Math.PI * Math.min(s, 26)) / 26);
  const u = Math.max(0, (s - 21) / (LEN - 21));
  return pt(SNOUT - s, trunk + b.tail * u ** 1.5 + b.whip * Math.sin(Math.PI * u) * u);
}

interface Lizard {
  readonly shape: Pt[];
  readonly at: (s: number, v: number) => Pt;
  readonly frame: (s: number) => { f: Pt; n: Pt };
}

function lizard(b: Bend): Lizard {
  const spine = Array.from({ length: 61 }, (_, i) => spineAt(b, (i / 60) * LEN));
  const { shape } = ribbon(spine, (u) => widthAt(u * LEN));
  const frame = (s: number): { f: Pt; n: Pt } => {
    const a = spineAt(b, Math.max(0, s - 0.5));
    const c = spineAt(b, Math.min(LEN, s + 0.5));
    const l = Math.hypot(a.x - c.x, a.y - c.y) || 1;
    const f = pt((a.x - c.x) / l, (a.y - c.y) / l);
    return { f, n: pt(-f.y, f.x) };
  };
  const at = (s: number, v: number): Pt => {
    const p = spineAt(b, s);
    const { n } = frame(s);
    const half = widthAt(s) / 2;
    return pt(p.x + n.x * v * half, p.y + n.y * v * half);
  };
  return { shape, at, frame };
}

/** Long thin toes fanned from `base`, each with a fine claw. */
function toes(d: Draw, base: Pt, ang: number, spread: number, lens: readonly number[]): void {
  lens.forEach((l, i) => {
    const a = ang + (i / (lens.length - 1) - 0.5) * spread;
    const mid = pt(base.x + Math.cos(a) * l * 0.55, base.y + Math.sin(a) * l * 0.55);
    const tip = pt(base.x + Math.cos(a + 0.12) * l, base.y + Math.sin(a + 0.12) * l);
    d.pen.hair([base, mid, tip], 0.55, d.ink, 0.85);
    d.pen.hair([base, mid, tip], 0.32, U.toe, 1);
  });
}

function legs(d: Draw, z: Lizard, b: Bend): void {
  const sides = [-1, 1] as const;
  sides.forEach((side, i) => {
    const p = b.legs[2 + i]!;
    const { f, n } = z.frame(HIP);
    const hip = z.at(HIP, side * 0.55);
    const out = pt(n.x * side, n.y * side);
    const knee = pt(hip.x + out.x * 4.6 + f.x * (0.6 + 2 * p), hip.y + out.y * 4.6 + f.y * (0.6 + 2 * p));
    const ankle = pt(knee.x + out.x * 1.4 - f.x * (2.6 - 0.8 * p), knee.y + out.y * 1.4 - f.y * (2.6 - 0.8 * p));
    toes(d, ankle, Math.atan2(-f.y * 0.8 + out.y * 0.6, -f.x * 0.8 + out.x * 0.6) - side * 0.15 * p, 1.5, [1.5, 2.3, 3.1, 4.1, 2.2]);
    bandedLimb(d, knee, ankle, 1.6, 1.15, U.base, U.deep, U.blotch, 1, 0.35 * LW);
    bandedLimb(d, hip, knee, 2.5, 1.7, U.base, U.deep, U.blotch, 1, 0.35 * LW);
  });
  sides.forEach((side, i) => {
    const p = b.legs[i]!;
    const { f, n } = z.frame(SHOULDER);
    const sh = z.at(SHOULDER, side * 0.5);
    const out = pt(n.x * side, n.y * side);
    const elbow = pt(sh.x + out.x * 3.6 + f.x * 1.3 * p, sh.y + out.y * 3.6 + f.y * 1.3 * p);
    const wrist = pt(elbow.x + out.x * 0.9 + f.x * (0.6 + 1.6 * p), elbow.y + out.y * 0.9 + f.y * (0.6 + 1.6 * p));
    toes(d, wrist, Math.atan2(f.y * (0.4 + 0.5 * p) + out.y * 0.8, f.x * (0.4 + 0.5 * p) + out.x * 0.8), 1.7, [1.1, 1.7, 2.1, 2.2, 1.4]);
    bandedLimb(d, elbow, wrist, 1.4, 1.05, U.base, U.deep, U.blotch, 1, 0.35 * LW);
    bandedLimb(d, sh, elbow, 2.1, 1.5, U.base, U.deep, U.blotch, 0, 0.35 * LW);
  });
}

/** A pair of dark blotches either side of the spine at s, each with a pale trailing edge. */
function blotches(d: Draw, z: Lizard, s: number, size: number, alpha: number): void {
  const { pen } = d;
  for (const v of [-0.38, 0.38]) {
    const c = z.at(s, v);
    const back = z.at(s + size * 0.9, v * 1.05);
    const blob = [z.at(s - size * 0.7, v * 0.55), z.at(s - size * 0.4, v * 1.45), z.at(s + size * 0.5, v * 1.5), z.at(s + size * 0.6, v * 0.7), z.at(s, v * 0.25)];
    pen.fill(blob, U.blotch, alpha);
    pen.hair([z.at(s + size * 0.55, v * 0.4), back, z.at(s + size * 0.75, v * 1.6)], 0.45 * LW * size, mix(U.sand, PAPER_FILL, 0.4), alpha * 0.75);
    pen.dot(c.x, c.y, 0.25, U.blotch, alpha * 0.6);
  }
}

/** Fine granular scales: tiny dots and specks, stippled lighter and darker. */
function grain(d: Draw, shape: readonly Pt[]): void {
  d.pen.stipple(shape, 900, () => 0.5, 0.2, U.deep);
  d.pen.stipple(shape, 500, () => 0.45, 0.2, mix(U.sand, PAPER_FILL, 0.3));
}

function body(d: Draw, z: Lizard): void {
  const { pen } = d;
  const { shape } = z;
  skinWash(d, shape, U.base, U.deep, { at: z.at(12, -0.4), r: 6 }, 0.4);
  pen.clipped(shape, () => {
    // Broken pale stripes down each side of the back.
    for (const v of [-0.7, 0.7]) {
      for (let s = 6; s < 30; s += 2.3) pen.hair([z.at(s, v), z.at(s + 1.6, v * 0.97)], 1.1, U.sand, 0.6);
    }
    const h = z.at(3.5, 0);
    glaze(d, h.x, h.y, 3.8, 2.8, 0, U.head, 0.6);
    // The orange-yellow of the throat showing at the jaw's edges.
    for (const v of [-1, 1]) {
      const t = z.at(4.5, v * 0.95);
      glaze(d, t.x, t.y, 2.4, 1.1, 0, U.throat, 0.55);
    }
    for (const [s, k, a] of [[11.5, 1.05, 0.8], [14.6, 1.1, 0.85], [17.7, 1.05, 0.85], [20.8, 0.9, 0.75], [24.5, 0.8, 0.6], [28.5, 0.7, 0.5]] as const) blotches(d, z, s, k * 1.6, a);
    for (const s of [33, 37, 41]) pen.hair([z.at(s, -0.9), z.at(s + 0.6, 0), z.at(s, 0.9)], 0.7, U.blotch, 0.4);
    const tip = z.at(44, 0);
    glaze(d, tip.x, tip.y, 6, 2, 0, U.deep, 0.3);
  });
  pen.clipped(shape, () => grain(d, shape));
  // A male's pale-blue flecks over the back.
  for (const [s, v] of [[12.5, 0.05], [15, -0.6], [15.5, 0.62], [18.5, -0.1], [19.5, 0.5], [13.2, -0.85], [21.5, -0.55], [16.8, 0.1]] as const) {
    const p = z.at(s, v);
    pen.dot(p.x, p.y, 0.38, U.fleck, 0.85);
  }
  shade(d, shape, 0.18);
  pen.clipped(shape, () => pen.crescent(shape, pt(-0.6, -1), () => pen.fill(shape, U.deep, 0.28)));
  // The namesake: a blue-black blotch on each flank behind the foreleg.
  for (const v of [-1, 1]) {
    const c = z.at(12, v * 0.86);
    pen.clipped(shape, () => {
      pen.fill([z.at(10.9, v * 0.62), z.at(11.6, v * 1.05), z.at(13.3, v * 1.05), z.at(13.4, v * 0.6)], U.spot, 0.95);
      pen.dot(c.x - 0.3, c.y - 0.3, 0.3, mix(U.fleck, PAPER_FILL, 0.4), 0.6);
    });
  }
  pen.stroke(closed(shape), 0.4 * LW, d.ink, 0.95);
  head(d, z);
}

function head(d: Draw, z: Lizard): void {
  const { pen } = d;
  pen.hair([z.at(0.8, 0), z.at(3, 0), z.at(5.6, 0)], 0.2 * LW, U.deep, 0.5);
  for (const v of [-1, 1]) {
    const nostril = z.at(0.9, v * 0.45);
    pen.dot(nostril.x, nostril.y, 0.25, d.ink, 0.85);
    const e = z.at(4.3, v * 0.76);
    pen.fill([z.at(3.3, v * 1), z.at(4.3, v * 1.14), z.at(5.3, v * 1), z.at(4.3, v * 0.52)], mix(U.head, PAPER_FILL, 0.35), 0.9);
    pen.dot(e.x, e.y, 0.95, d.ink, 0.9);
    beadEye(d, e, 0.74);
    pen.hair([z.at(3.3, v * 0.55), z.at(4.3, v * 0.42), z.at(5.3, v * 0.55)], 0.22 * LW, d.ink, 0.6);
  }
  const g = z.at(2.8, -0.35);
  glaze(d, g.x, g.y, 1.8, 1, 0, PAPER_FILL, 0.35);
}

function draw(d: Draw, pose: Pose): void {
  const b = BENDS[pose];
  const z = lizard(b);
  const { ctx } = d.pen;
  ctx.save();
  ctx.scale(K, K);
  ctx.translate(2, 0);
  castShadow(d, z.shape, pt(1.2, 1.7), 0.18);
  legs(d, z, b);
  body(d, z);
  ctx.restore();
}

export const SIDE_LIZARD_ART: SpriteArt<Pose> = {
  frame: 52,
  res: 3,
  poses: ['idle', 'run0', 'run1'],
  draw,
};
