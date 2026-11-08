import { closed, type Draw, pt, ribbon, shade } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { beadEye, castShadow, glaze, skinWash } from '../critters/preyKit';
import { bandedLimb } from './barrensCrittersKit';

/**
 * The rock agama (the Zagros' large-scaled rock agama), seen from above
 * facing +x: flat-bodied for squeezing into cracks, a broad triangular head
 * on a distinct neck, the male's head washed rusty-ochre, a dark olive-brown
 * back with rows of pale buff blotches, big keeled scales, and a long tail
 * ringed with whorls of spiny scales. Its legs sprawl, long-toed for
 * gripping rock. 'idle' rests on the rock; 'bob' is the push-up (forelegs
 * straight, head and chest raised: foreshortened from above, the shadow
 * thrown off under them); 'run0', 'run1' run with the body swinging.
 */
const A = {
  base: '#6f6a55',
  deep: '#2f2c22',
  pale: '#d9c79a',
  blotch: '#c8b27c',
  bar: '#2a261d',
  head: '#c0763a',
  headLit: '#e3a560',
  headDeep: '#6e3a1c',
  toe: '#5b5646',
} as const;

type Pose = 'idle' | 'bob' | 'run0' | 'run1';

/** Spine length, board px: snout 0, head to 7, neck to 9.5, trunk to 23, tail to the end. */
const LEN = 47;
const SNOUT = 22.5;
const SHOULDER = 11;
const HIP = 22;

/** Full body width along the spine, (s, width) knots eased between: the wide jaws, a pinched neck, a flat trunk. */
const WIDTH: readonly (readonly [number, number])[] = [
  [0, 1.2], [1.5, 3.8], [4, 6.6], [6.4, 7.6], [8.4, 5.6], [10, 6.6], [14, 10.2], [19, 10], [22.5, 6.4], [25, 4.4], [31, 2.8], [39, 1.5], [LEN, 0.35],
];

function widthAt(s: number): number {
  for (let i = 1; i < WIDTH.length; i++) {
    const [s1, w1] = WIDTH[i]!;
    const [s0, w0] = WIDTH[i - 1]!;
    if (s <= s1) return w0 + (w1 - w0) * (1 - Math.cos((Math.PI * (s - s0)) / (s1 - s0))) * 0.5;
  }
  return WIDTH[WIDTH.length - 1]![1];
}

/** How a pose bends it: trunk swing, tail curve and whip, each leg's phase (+1 forward, −1 back), and how far the front is raised. */
interface Bend {
  readonly trunk: number;
  readonly tail: number;
  readonly whip: number;
  /** Fore −y, fore +y, hind −y, hind +y. */
  readonly legs: readonly [number, number, number, number];
  readonly raise: number;
}

const BENDS: Readonly<Record<Pose, Bend>> = {
  idle: { trunk: 0.6, tail: -7, whip: 2.5, legs: [0.4, 0.3, 0.2, 0.1], raise: 0 },
  bob: { trunk: 0.3, tail: -6, whip: 2, legs: [0.15, 0.15, 0.2, 0.1], raise: 1 },
  run0: { trunk: 2.3, tail: -9, whip: 3, legs: [1, -1, -1, 1], raise: 0 },
  run1: { trunk: -2.3, tail: 9, whip: -3, legs: [-1, 1, 1, -1], raise: 0 },
};

/** The spine's point at s: the head end foreshortened when raised, the trunk swung, the tail curving after it. */
function spineAt(b: Bend, s: number): Pt {
  const trunk = b.trunk * Math.sin((Math.PI * Math.min(s, 28)) / 28);
  const u = Math.max(0, (s - 23) / (LEN - 23));
  const tail = b.tail * u ** 1.5 + b.whip * Math.sin(Math.PI * u) * u;
  // Raised, the head and neck tilt up towards the eye, so they look shorter from above.
  const lift = b.raise * Math.max(0, 1 - s / 16) * 3.2;
  return pt(SNOUT - s - lift, trunk + tail);
}

interface Body {
  readonly shape: Pt[];
  readonly at: (s: number, v: number) => Pt;
  readonly frame: (s: number) => { f: Pt; n: Pt };
}

function build(b: Bend): Body {
  const n = 64;
  const spine = Array.from({ length: n + 1 }, (_, i) => spineAt(b, (i / n) * LEN));
  // Raised, the head is nearer the eye: a touch wider.
  const grow = (s: number): number => 1 + b.raise * 0.18 * Math.max(0, 1 - s / 13);
  const { shape } = ribbon(spine, (u) => widthAt(u * LEN) * grow(u * LEN));
  const frame = (s: number): { f: Pt; n: Pt } => {
    const a = spineAt(b, Math.max(0, s - 0.5));
    const c = spineAt(b, Math.min(LEN, s + 0.5));
    const l = Math.hypot(a.x - c.x, a.y - c.y) || 1;
    const f = pt((a.x - c.x) / l, (a.y - c.y) / l);
    return { f, n: pt(-f.y, f.x) };
  };
  const at = (s: number, v: number): Pt => {
    const p = spineAt(b, s);
    const { n: nn } = frame(s);
    const half = (widthAt(s) * grow(s)) / 2;
    return pt(p.x + nn.x * v * half, p.y + nn.y * v * half);
  };
  return { shape, at, frame };
}

/** Long gripping toes fanned from `base`, each with a hooked claw. */
function toes(d: Draw, base: Pt, ang: number, spread: number, lens: readonly number[]): void {
  const { pen } = d;
  lens.forEach((l, i) => {
    const a = ang + (i / (lens.length - 1) - 0.5) * spread;
    const mid = pt(base.x + Math.cos(a) * l * 0.55, base.y + Math.sin(a) * l * 0.55);
    const tip = pt(base.x + Math.cos(a + 0.14) * l, base.y + Math.sin(a + 0.14) * l);
    pen.hair([base, mid, tip], 0.75, d.ink, 0.85);
    pen.hair([base, mid, tip], 0.45, A.toe, 1);
    pen.hair([tip, pt(tip.x + Math.cos(a + 0.5) * 0.8, tip.y + Math.sin(a + 0.5) * 0.8)], 0.25, d.ink, 0.95);
  });
}

/** The four sprawling legs; pushed up, the forelegs stand straight under the shoulders. */
function legs(d: Draw, z: Body, b: Bend): void {
  ([-1, 1] as const).forEach((side, i) => {
    const p = b.legs[2 + i]!;
    const { f, n } = z.frame(HIP);
    const hip = z.at(HIP, side * 0.5);
    const out = pt(n.x * side, n.y * side);
    const knee = pt(hip.x + out.x * 5.2 + f.x * (0.8 + 2.3 * p), hip.y + out.y * 5.2 + f.y * (0.8 + 2.3 * p));
    const ankle = pt(knee.x + out.x * 1.6 - f.x * (3 - 0.9 * p), knee.y + out.y * 1.6 - f.y * (3 - 0.9 * p));
    const toeAng = Math.atan2(-f.y * 0.8 + out.y * 0.6, -f.x * 0.8 + out.x * 0.6) - side * 0.15 * p;
    toes(d, ankle, toeAng, 1.5, [1.6, 2.6, 3.4, 4.4, 2.4]);
    bandedLimb(d, knee, ankle, 1.8, 1.3, A.base, A.deep, A.bar, 1, 0.38);
    bandedLimb(d, hip, knee, 2.9, 1.9, A.base, A.deep, A.bar, 1, 0.38);
  });
  ([-1, 1] as const).forEach((side, i) => {
    const p = b.legs[i]!;
    const { f, n } = z.frame(SHOULDER);
    const sh = z.at(SHOULDER, side * 0.5);
    const out = pt(n.x * side, n.y * side);
    const sprawl = 1 - b.raise * 0.45;
    const elbow = pt(sh.x + out.x * 4 * sprawl + f.x * 1.5 * p, sh.y + out.y * 4 * sprawl + f.y * 1.5 * p);
    const wrist = pt(elbow.x + out.x * 1.1 * sprawl + f.x * (0.8 + 1.8 * p + b.raise * 0.8), elbow.y + out.y * 1.1 * sprawl + f.y * (0.8 + 1.8 * p + b.raise * 0.8));
    const toeAng = Math.atan2(f.y * (0.4 + 0.5 * p) + out.y * 0.8, f.x * (0.4 + 0.5 * p) + out.x * 0.8);
    toes(d, wrist, toeAng, 1.7, [1.2, 1.9, 2.4, 2.5, 1.5]);
    bandedLimb(d, elbow, wrist, 1.6, 1.2, A.base, A.deep, A.bar, 1, 0.38);
    bandedLimb(d, sh, elbow, 2.4, 1.7, A.base, A.deep, A.bar, 0, 0.38);
  });
}

/** Big keeled scales in rows: each a small arc open towards the head, its keel a fine dark line. */
function scales(d: Draw, z: Body, from: number, to: number, step: number, spiny = 0): void {
  const { pen } = d;
  for (let s = from, row = 0; s < to; s += step, row++) {
    const across = Math.max(1, Math.round(widthAt(s) / step));
    const { f, n } = z.frame(s);
    for (let j = 0; j <= across; j++) {
      const v = -1 + ((j + (row % 2) * 0.5) / across) * 2;
      if (Math.abs(v) > 0.95) continue;
      const c = z.at(s, v);
      const r = step * 0.52;
      pen.hair([pt(c.x + n.x * r + f.x * r * 0.4, c.y + n.y * r + f.y * r * 0.4), pt(c.x - f.x * r * 0.6, c.y - f.y * r * 0.6), pt(c.x - n.x * r + f.x * r * 0.4, c.y - n.y * r + f.y * r * 0.4)], 0.2, A.deep, 0.55);
      pen.hair([pt(c.x + f.x * r * 0.5, c.y + f.y * r * 0.5), pt(c.x - f.x * r * (0.5 + spiny), c.y - f.y * r * (0.5 + spiny))], 0.15, d.ink, 0.45);
      pen.dot(c.x + f.x * r * 0.2 + n.x * r * 0.25, c.y + f.y * r * 0.2 + n.y * r * 0.25, 0.18, PAPER_FILL, 0.35);
    }
  }
}

/** The body: washed and rounded, pale blotches in rows across the back, the tail's whorls, scales, the rusty head. */
function body(d: Draw, z: Body, b: Bend): void {
  const { pen } = d;
  const { shape } = z;
  skinWash(d, shape, A.base, A.deep, { at: z.at(14, 0.4), r: 7 }, 0.45);
  pen.clipped(shape, () => {
    // The head and neck, rusty-ochre (a male in spring), fading into the olive back.
    const h = z.at(3.5, 0);
    glaze(d, h.x, h.y, 6.5, 5, 0, A.head, 0.85);
    glaze(d, h.x + 0.6, h.y - 1, 3.4, 2.2, 0, A.headLit, 0.5 + b.raise * 0.25);
    const nk = z.at(9, 0);
    glaze(d, nk.x, nk.y, 3.4, 3.4, 0, A.headDeep, 0.35);
    // Pale buff blotches in rows across the trunk, between dark bars.
    for (const [s, k] of [[12, 0.8], [15, 1], [18, 1], [21, 0.8]] as const) {
      for (const v of [-0.62, -0.2, 0.22, 0.64]) {
        const c = z.at(s + Math.abs(v) * 0.6, v);
        glaze(d, c.x, c.y, 1.4 * k, 1.1 * k, 0, A.blotch, 0.8);
      }
      const bar = [-0.9, -0.45, 0, 0.45, 0.9].map((v) => z.at(s + 1.5 + Math.abs(v) * 0.6, v));
      pen.hair(bar, 0.8, A.bar, 0.55);
    }
    // The tail ringed: dark whorls of spiny scales and pale bands between.
    for (let s = 25; s < LEN - 2; s += 2.4) {
      const ring = [-1, -0.5, 0, 0.5, 1].map((v) => z.at(s + Math.abs(v) * 0.5, v));
      pen.hair(ring, Math.max(0.4, widthAt(s) * 0.3), A.bar, 0.5);
      pen.hair(ring.map((p) => pt(p.x - 0.9, p.y)), Math.max(0.3, widthAt(s) * 0.18), mix(A.pale, A.base, 0.4), 0.45);
    }
  });
  pen.clipped(shape, () => {
    scales(d, z, 8.5, 24, 1.15);
    scales(d, z, 24, LEN - 2, 1.25, 0.5);
  });
  shade(d, shape, 0.2);
  pen.clipped(shape, () => pen.crescent(shape, pt(-0.6, -1), () => pen.fill(shape, A.deep, 0.32)));
  // Spiny scales catching the contour along the flanks and down the tail.
  for (let s = 9; s < LEN - 4; s += 0.9) {
    for (const v of [-1, 1]) {
      const p = z.at(s, v);
      const { f, n } = z.frame(s);
      pen.hair([p, pt(p.x - f.x * 0.8 + n.x * v * 0.45, p.y - f.y * 0.8 + n.y * v * 0.45)], 0.24, d.ink, 0.65);
    }
  }
  pen.stroke(closed(shape), 0.45, d.ink, 0.95);
  head(d, z);
}

/** The head: big plates on the crown, the jaw's corners, nostrils, bead eyes under scaly brows, the ear opening. */
function head(d: Draw, z: Body): void {
  const { pen } = d;
  pen.hair([z.at(1, 0), z.at(3.4, 0), z.at(6.2, 0)], 0.22, A.headDeep, 0.55);
  for (const [s, v] of [[2.2, 0.45], [3.8, 0.55], [5.4, 0.6], [6.8, 0.5]] as const) pen.hair([z.at(s, -v), z.at(s + 0.5, 0), z.at(s, v)], 0.2, A.headDeep, 0.5);
  for (const v of [-1, 1]) {
    const nostril = z.at(1, v * 0.5);
    pen.dot(nostril.x, nostril.y, 0.25, d.ink, 0.85);
    const e = z.at(4.6, v * 0.72);
    pen.fill([z.at(3.5, v * 0.98), z.at(4.6, v * 1.12), z.at(5.7, v * 0.98), z.at(4.6, v * 0.5)], mix(A.head, PAPER_FILL, 0.3), 0.9);
    pen.dot(e.x, e.y, 0.8, d.ink, 0.9);
    beadEye(d, e, 0.58);
    pen.hair([z.at(3.5, v * 0.52), z.at(4.6, v * 0.4), z.at(5.7, v * 0.52)], 0.24, d.ink, 0.6);
    // The ear opening behind the jaw's corner, fringed with small spines.
    const ear = z.at(7.2, v * 0.86);
    pen.dot(ear.x, ear.y, 0.5, A.deep, 0.75);
    pen.hair([z.at(6.4, v * 1.02), z.at(7.4, v * 1.12), z.at(8.2, v * 0.98)], 0.22, d.ink, 0.7);
  }
  const g = z.at(3, -0.35);
  glaze(d, g.x, g.y, 2, 1.1, 0, PAPER_FILL, 0.3);
}

function draw(d: Draw, pose: Pose): void {
  const b = BENDS[pose];
  const z = build(b);
  castShadow(d, z.shape, pt(0.9, 1.3), 0.2);
  // Pushed up, the raised head and chest throw a longer shadow off to one side.
  if (b.raise > 0) castShadow(d, z.shape.filter((p) => p.x > SNOUT - 16), pt(3.4, 4.8), 0.16);
  legs(d, z, b);
  body(d, z, b);
}

export const AGAMA_ART: SpriteArt<Pose> = { frame: 56, res: 3, poses: ['idle', 'bob', 'run0', 'run1'], draw };
