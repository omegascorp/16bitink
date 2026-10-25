import { createRng } from '../../logic/rng';
import { blob } from '../groundKit';
import { closed, cub, type Draw, oval, pt, shade, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { bilateral, castShadow, ellipseAt, glaze, skinWash } from '../critters/preyKit';
import { arcPts, bandedLimb, bump, digits, scatter } from './barrensCrittersKit';

/**
 * The American toad, seen from above facing +x: a squat, broad body about
 * 22 × 18, brown-olive and warty all over, paired dark spots each holding a
 * wart or two, a pale stripe down the middle of the back, big kidney-shaped
 * parotoid glands behind gold eyes, crests between the eyes, and short
 * banded legs.
 *  - 'sit': at rest, hind legs folded beside it;
 *  - 'hop': stretched mid-hop, hind legs out behind, hands reaching ahead;
 *  - 'puff': blown up nearly round to look too big to swallow, legs tucked under.
 */
export const TOAD = {
  back: '#8a7a4c',
  head: '#9d8a57',
  deep: '#453720',
  spot: '#4a3a22',
  rim: '#c9b98a',
  wart: '#a8703f',
  wartRed: '#b5643a',
  wartHi: '#e6cf9f',
  stripe: '#e3d5a6',
  gland: '#94804f',
  belly: '#e8dcbc',
  bellyDeep: '#b9a77a',
  gold: '#e3aa3b',
  goldDeep: '#8a5716',
  pupil: '#141218',
  tip: '#2e2416',
} as const;

const T = TOAD;

type Pose = 'sit' | 'hop' | 'puff';

/** How a pose holds the body: stretch, a shift forward, and how far it is blown up round (0..1). */
interface Stretch {
  readonly sx: number;
  readonly sy: number;
  readonly dx: number;
  readonly round: number;
}

const BODY: Readonly<Record<Pose, Stretch>> = {
  sit: { sx: 1, sy: 1, dx: 0, round: 0 },
  hop: { sx: 1.07, sy: 0.88, dx: 3.5, round: 0 },
  puff: { sx: 1.05, sy: 1.12, dx: -0.5, round: 0.72 },
};

/** The squat body from above: a blunt rounded snout, the head widening to broad shoulders, a round rump. */
function baseOutline(): Pt[] {
  return bilateral([
    ...cub(pt(10.4, 0), pt(10.5, 2.1), pt(9.5, 4), pt(7.6, 5.3), 6),
    ...cub(pt(7.6, 5.3), pt(5.6, 6.6), pt(2.4, 8.6), pt(-1.4, 8.9), 7).slice(1),
    ...cub(pt(-1.4, 8.9), pt(-5.4, 9.2), pt(-9.4, 7.6), pt(-10.8, 4.4), 7).slice(1),
    ...cub(pt(-10.8, 4.4), pt(-11.6, 2.6), pt(-11.6, 1.2), pt(-11.6, 0), 4).slice(1),
  ]);
}

const BASE = baseOutline();

/** A pose's place for a point drawn on the sitting toad: stretched, shifted, blown up towards a circle. */
function placer(k: Stretch): (p: Pt) => Pt {
  return (p) => {
    const q = pt(p.x * k.sx + k.dx, p.y * k.sy);
    if (k.round <= 0) return q;
    const r = Math.hypot(p.x + 0.6, p.y) || 1;
    // Inflating pushes everything out towards a circle of radius R.
    const R = 11.6;
    const g = 1 + k.round * (R / Math.max(r, 3) - 1) * Math.min(1, r / 9);
    return pt((p.x + 0.6) * g * (k.sx * 0.96) - 0.6 + k.dx, p.y * g * k.sy * 0.92);
  };
}

/** The outline with small bumps along it: warts break a toad's silhouette. */
function outline(k: Stretch, squeeze = 1): Pt[] {
  const at = placer(k);
  const n = BASE.length;
  return BASE.map((p, i) => {
    const bumpy = 1 + 0.035 * Math.sin(i * 2.7) * (k.round > 0 ? 0.4 : 1);
    return at(pt(p.x * bumpy * (squeeze < 1 ? 0.98 : 1), p.y * bumpy * squeeze));
  }).slice(0, n);
}

/** The paired dark spots down the back, each a few board px across (centre x, y on the +y side, size). */
const SPOTS: readonly (readonly [number, number, number])[] = [
  [-7.6, 3.1, 1.9], [-3.2, 4, 2.1], [1.2, 2.9, 1.5], [-9.6, 6.1, 1.3], [-5, 7, 1.3], [-0.6, 6.6, 1.1], [3.6, 6.4, 0.9],
];

/** The skin: the warm back washed and rounded, paired dark spots, the pale dorsal stripe. */
function back(d: Draw, k: Stretch, body: readonly Pt[], at: (p: Pt) => Pt): void {
  const { pen } = d;
  const rng = createRng(6101);
  const L = at(pt(-3, -3.5));
  skinWash(d, body, T.back, T.deep, { at: L, r: 8 * k.sx }, 0.46);
  pen.clipped(body, () => {
    const h = at(pt(6.5, 0));
    glaze(d, h.x, h.y, 5.5 * k.sx, 5 * k.sy, 0, T.head, 0.6);
    // A little ruddy warmth over the hips and greener olive at the flanks, as on a real toad.
    const hip = at(pt(-7, 0));
    glaze(d, hip.x, hip.y, 6, 7 * k.sy, 0, '#94683e', 0.3);
    for (const s of [-1, 1]) {
      const f = at(pt(-1, s * 7.5));
      glaze(d, f.x, f.y, 8, 2.6, 0, '#76784a', 0.35);
    }
    for (const s of [-1, 1]) {
      for (const [x, y, r] of SPOTS) {
        const c = at(pt(x, s * y));
        const grow = 1 + k.round * 0.35;
        const b = blob(c, r * grow * k.sx, r * 0.78 * grow * k.sy, rng, 0.35, 14, rng() * TAU);
        pen.fill(b.map((p) => pt(p.x - 0.25, p.y - 0.3)), T.rim, 0.45);
        pen.fill(b, T.spot, 0.78);
        pen.fill(b.map((p) => pt(c.x + (p.x - c.x) * 0.6 - 0.2, c.y + (p.y - c.y) * 0.6 - 0.2)), mix(T.spot, T.back, 0.35), 0.35);
        pen.hair(closed(b).slice(5, 13), 0.2, d.ink, 0.5);
      }
    }
    // The pale stripe down the middle of the back, soft-edged.
    const stripe = [pt(6.5, 0), pt(2, 0.1), pt(-3, -0.1), pt(-8, 0.05), pt(-11.2, 0)].map(at);
    pen.hair(stripe, 1.7, T.stripe, 0.5);
    pen.hair(stripe, 0.8, T.stripe, 0.85);
    pen.hair(stripe.map((p) => pt(p.x + 0.15, p.y + 0.75)), 0.22, d.ink, 0.35);
  });
}

/** Warts all over the back, bigger and darker inside the spots, none on the stripe. */
function warts(d: Draw, k: Stretch, body: readonly Pt[], at: (p: Pt) => Pt): void {
  const rng = createRng(6111);
  const spots = [-1, 1].flatMap((s) => SPOTS.map(([x, y, r]) => ({ c: at(pt(x, s * y)), r: r * (1 + k.round * 0.35) })));
  const stripeY = (p: Pt): number => Math.abs(p.y) / k.sy;
  const head = at(pt(5.5, 0));
  const pts = scatter(rng, body, 70, 1.55 + k.round * 0.3, (p) => stripeY(p) > 0.9 && Math.hypot(p.x - head.x, p.y - head.y) > 4.6);
  d.pen.clipped(body, () => {
    for (const p of pts) {
      const inSpot = spots.some((s) => Math.hypot(p.x - s.c.x, p.y - s.c.y) < s.r * 0.9);
      const r = (inSpot ? 0.85 : 0.5) + rng() * (inSpot ? 0.45 : 0.4);
      const colour = inSpot ? mix(T.wartRed, T.spot, 0.25 + rng() * 0.2) : rng() < 0.4 ? T.wart : mix(T.back, T.wartHi, 0.2);
      bump(d, p, r * (1 - k.round * 0.12), colour, T.wartHi, T.deep);
    }
  });
}

/** A parotoid gland behind each eye: a big raised kidney-shaped swelling, pitted with pores. */
function glands(d: Draw, k: Stretch, at: (p: Pt) => Pt): void {
  const { pen } = d;
  for (const s of [-1, 1]) {
    const c = at(pt(0.8, s * 5.3));
    const g = ellipseAt(c.x, c.y, 2.9 * k.sx, 1.55 * k.sy, s * 0.3, 16);
    pen.fill(g.map((p) => pt(p.x + 0.55, p.y + 0.8)), T.deep, 0.55);
    skinWash(d, g, T.gland, T.deep, { at: pt(c.x - 0.9, c.y - 0.6), r: 1.6 }, 0.6);
    pen.clipped(g, () => glaze(d, c.x + 0.6, c.y + s * 0.3, 1.6, 0.9, s * 0.3, T.spot, 0.45));
    const rng = createRng(6120 + s);
    pen.clipped(g, () => {
      for (let i = 0; i < 9; i++) {
        const a = rng() * TAU;
        const r = Math.sqrt(rng());
        pen.dot(c.x + Math.cos(a) * r * 2.2 * k.sx, c.y + Math.sin(a) * r * 1.1 * k.sy, 0.2, T.deep, 0.6);
      }
    });
    pen.stroke(closed(g), 0.32, d.ink, 0.85, false);
  }
}

/** The crests: a ridge along the inside of each eye, turning out behind it (the American toad's L). */
function crests(d: Draw, at: (p: Pt) => Pt): void {
  const { pen } = d;
  for (const s of [-1, 1]) {
    const ridge = [pt(7.6, s * 2.1), pt(5.6, s * 2.3), pt(3.6, s * 2.6), pt(2.9, s * 3.6)].map(at);
    pen.hair(ridge, 0.75, T.wartHi, 0.6);
    pen.hair(ridge.map((p) => pt(p.x + 0.2, p.y + s * 0.4)), 0.3, d.ink, 0.6);
  }
}

/** A gold eye bulging on top of the head under a warty lid, a dark horizontal pupil, bright glints. */
function eye(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const lid = oval(c.x, c.y, r * 1.25, r * 1.12, 18);
  pen.fill(lid.map((p) => pt(p.x + 0.45, p.y + 0.7)), d.ink, 0.25);
  skinWash(d, lid, T.head, T.deep, { at: pt(c.x - r * 0.4, c.y - r * 0.5), r: r * 0.8 });
  pen.stroke(closed(lid), 0.4, d.ink, 0.95);
  const ball = oval(c.x + r * 0.08, c.y, r * 0.92, r * 0.86, 18);
  pen.fill(ball, PAPER_FILL, 1);
  pen.fill(ball, T.gold, 0.95);
  pen.clipped(ball, () => {
    pen.crescent(ball, pt(-r * 0.22, -r * 0.3), () => pen.fill(ball, T.goldDeep, 0.6));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      pen.hair([pt(c.x + Math.cos(a) * r * 0.42, c.y + Math.sin(a) * r * 0.4), pt(c.x + Math.cos(a) * r * 0.82, c.y + Math.sin(a) * r * 0.78)], 0.14, T.goldDeep, 0.6);
    }
  });
  pen.fill(ellipseAt(c.x + r * 0.1, c.y, r * 0.62, r * 0.3, 0, 14), T.pupil, 1);
  pen.stroke(closed(ball), 0.38, d.ink, 0.95);
  pen.dot(c.x - r * 0.28, c.y - r * 0.34, Math.max(0.35, r * 0.22), PAPER_FILL, 1);
  pen.dot(c.x + r * 0.4, c.y + r * 0.3, 0.3, PAPER_FILL, 0.7);
}

/** Where a pose puts the legs (for +y; mirrored for −y). */
interface Legs {
  readonly hip: Pt;
  readonly knee: Pt;
  readonly ankle: Pt;
  readonly toes: number;
  readonly lens: readonly number[];
  readonly shoulder: Pt;
  readonly wrist: Pt;
  readonly fingers: number;
}

const LEGS: Readonly<Record<Pose, Legs>> = {
  sit: {
    hip: pt(-7.6, 5.4), knee: pt(-1.2, 9.6), ankle: pt(-7.4, 10.6), toes: Math.PI - 0.25, lens: [1.8, 2.6, 3.4, 2.7, 1.9],
    shoulder: pt(3.2, 5.8), wrist: pt(5.6, 9.4), fingers: 0.55,
  },
  hop: {
    hip: pt(-5, 3.8), knee: pt(-10.6, 6.6), ankle: pt(-16, 5.4), toes: Math.PI - 0.08, lens: [2, 2.8, 3.6, 2.9, 2.1],
    shoulder: pt(9, 3.6), wrist: pt(15.6, 5.2), fingers: 0.1,
  },
  puff: {
    hip: pt(-7, 5), knee: pt(-3.4, 9.2), ankle: pt(-7.8, 10.2), toes: Math.PI - 0.5, lens: [1.4, 2, 2.6, 2.1, 1.5],
    shoulder: pt(3.4, 5.4), wrist: pt(6, 9.6), fingers: 0.65,
  },
};

const mirror = (p: Pt, s: number): Pt => pt(p.x, p.y * s);

/** The legs: short, thick, warty and banded; stubby toes with dark tips. */
function legs(d: Draw, l: Legs, k: Stretch): void {
  const at = (p: Pt): Pt => (k.round > 0 ? pt(p.x * k.sx + k.dx, p.y * k.sy) : p);
  for (const s of [-1, 1]) {
    const ankle = at(mirror(l.ankle, s));
    digits(d, ankle, s * l.toes, 1.15, l.lens, 0.95, T.back, T.deep, T.tip);
    bandedLimb(d, at(mirror(l.knee, s)), ankle, 2.6, 1.8, T.back, T.deep, T.spot, 2);
    bandedLimb(d, at(mirror(l.hip, s)), at(mirror(l.knee, s)), 4.2, 3, T.back, T.deep, T.spot, 2);
    const wrist = at(mirror(l.wrist, s));
    bandedLimb(d, at(mirror(l.shoulder, s)), wrist, 2.3, 1.7, T.back, T.deep, T.spot, 1);
    digits(d, wrist, s * l.fingers, 1.6, [1.3, 1.8, 1.7, 1.2], 0.85, T.back, T.deep, T.tip);
  }
}

/** Little marks of swelling round the blown-up toad. */
function swell(d: Draw): void {
  for (const [a, r] of [[-2.2, 15], [-1.2, 14.5], [1.25, 14.5], [2.25, 15], [-3.05, 14]] as const) {
    const c = pt(-0.5, 0);
    d.pen.hair(arcPts(c, r, r * 0.98, a - 0.16, a + 0.16, 4), 0.55, d.ink, 0.6);
    d.pen.hair(arcPts(c, r + 1.8, (r + 1.8) * 0.98, a - 0.09, a + 0.09, 3), 0.45, d.ink, 0.4);
  }
}

function draw(d: Draw, pose: Pose): void {
  const { pen } = d;
  const k = BODY[pose];
  const at = placer(k);
  const body = outline(k);
  const air = pose === 'hop';
  castShadow(d, body, air ? pt(2.2, 3.4) : pt(0.9, 1.3), air ? 0.13 : pose === 'puff' ? 0.24 : 0.2);
  legs(d, LEGS[pose], k);
  // The pale throat and belly show round the very edge.
  skinWash(d, body, T.belly, T.bellyDeep);
  const top = outline(k, 0.975);
  back(d, k, top, at);
  warts(d, k, top, at);
  glands(d, k, at);
  crests(d, at);
  // The mouth's line round the snout, nostrils.
  const mouth = closed(body);
  pen.hair(mouth.slice(1, 9), 0.25, d.ink, 0.5);
  pen.hair(mouth.slice(-9, -1), 0.25, d.ink, 0.5);
  for (const s of [-1, 1]) {
    const n = at(pt(9.6, s * 1.2));
    pen.dot(n.x, n.y, 0.38, T.deep, 0.95);
  }
  shade(d, top, 0.2);
  pen.stroke(closed(body), 0.55, d.ink, 0.95);
  // The sheen of skin, more of it when blown up tight.
  pen.clipped(body, () => {
    const g = at(pt(-5.5, -2.6));
    glaze(d, g.x, g.y, 3.5 + k.round * 2.5, 1.8 + k.round, -0.4, PAPER_FILL, 0.22 + k.round * 0.12);
  });
  for (const s of [-1, 1]) eye(d, at(pt(5.4, s * 4.3)), 1.95);
  if (pose === 'puff') swell(d);
}

export const TOAD_ART: SpriteArt<Pose> = {
  frame: 52,
  res: 3,
  poses: ['sit', 'hop', 'puff'],
  draw,
};
