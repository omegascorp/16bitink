import { createRng } from '../../logic/rng';
import { type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { shadowOf, swish } from '../critters/birdKit';
import { wingOutlines } from '../critters/birdWing';
import { paintHead, type SecHead } from './savannaBossHead';
import { impact, legShadow, paintLeg, type SecLeg } from './savannaBossLegs';
import { greyPlumage, paintTail, rump } from './savannaBossPaint';
import { bothWings, paintFoldedWing, paintOpenWing, type Spread } from './savannaBossWings';

/**
 * The Secretary Bird, chapter 4's boss, seen from above facing +x: a tall
 * ash-grey eagle on a crane's legs, about 110 from bill to tail tip, the
 * long tail's two middle streamers trailing far behind, black flight
 * feathers, black "trousers" and the black crest of quills off the nape.
 *
 * - 'walk0', 'walk1': long strides, a foot reaching far ahead, the other
 *   far behind, the crest lying back;
 * - 'raise': one leg lifted high and forward (nearer the eye, its shadow
 *   far off), wings half open for balance, crest up, eyes on the ring;
 * - 'stamp': the foot slammed down far in front, toes splayed over a burst
 *   of impact marks, wings flared, the body thrown forward;
 * - 'down': the foot pinned to the ground, the head low over it, wings
 *   folded: open to a strike;
 * - 'startle': wings thrown wide, beak open, crest fanned, legs dangling
 *   as it jumps back;
 * - 'fly0', 'fly1': flapping off beaten, legs trailing under the tail.
 */
type Pose = 'walk0' | 'walk1' | 'raise' | 'stamp' | 'down' | 'startle' | 'fly0' | 'fly1';

const SEED = 4407;

interface Spec {
  readonly head: SecHead;
  /** Where the neck leaves the body. */
  readonly neck: Pt;
  readonly shift: number;
  readonly wings: Spread | { folded: number };
  readonly tail: { len: number; spread: number };
  /** Legs under the body (on the ground, dangling) and legs held up over it. */
  readonly legs: readonly SecLeg[];
  readonly raised?: SecLeg;
  readonly impact?: Pt;
  readonly air: number;
}

const HIP = 8;
const stride = (k: 1 | -1): Spec => ({
  head: { c: pt(38, k * 0.8), r: 6.2, crest: 0.1, down: 0 },
  neck: pt(15, 0), shift: 0, wings: { folded: 0 }, tail: { len: 50, spread: 0.18 },
  legs: [
    { hip: pt(3, k * HIP), foot: pt(34, k * 9), lift: 0, ang: 0.1 * k },
    { hip: pt(-1, -k * HIP), foot: pt(-30, -k * 8.5), lift: 0.15, ang: -0.2 * k },
  ],
  air: 0,
});

const SPECS: Readonly<Record<Pose, Spec>> = {
  walk0: stride(1),
  walk1: stride(-1),
  raise: {
    head: { c: pt(36, -2), r: 6.2, crest: 0.6, down: 0.3 }, neck: pt(15, 0), shift: -2, wings: 'half', tail: { len: 48, spread: 0.3 },
    legs: [{ hip: pt(1, -HIP), foot: pt(2, -9), lift: 0, ang: 0 }],
    raised: { hip: pt(6, HIP), foot: pt(40, 12), lift: 1, ang: 0.15, grip: 'curl' },
    air: 0,
  },
  stamp: {
    head: { c: pt(39, 1), r: 6.2, crest: 1, down: 0.55 }, neck: pt(16, 0), shift: 6, wings: 'flare', tail: { len: 46, spread: 0.5 },
    legs: [{ hip: pt(6, HIP), foot: pt(44, 11), lift: 0, ang: 0.1, grip: 'splay' }, { hip: pt(-2, -HIP), foot: pt(-20, -10), lift: 0, ang: -0.1 }],
    impact: pt(46, 11), air: 0,
  },
  down: {
    head: { c: pt(40, 2), r: 6, crest: 0.3, down: 0.85 }, neck: pt(16, 0), shift: 4, wings: { folded: 0.35 }, tail: { len: 48, spread: 0.25 },
    legs: [{ hip: pt(6, HIP), foot: pt(43, 12), lift: 0, ang: 0.1, grip: 'splay' }, { hip: pt(-2, -HIP), foot: pt(-18, -10), lift: 0, ang: -0.1 }],
    air: 0,
  },
  startle: {
    head: { c: pt(34, 0), r: 6.4, crest: 1, down: 0, open: true }, neck: pt(15, 0), shift: -4, wings: 'full', tail: { len: 48, spread: 0.7 },
    legs: [{ hip: pt(4, HIP), foot: pt(22, 10), lift: 0.7, ang: 0.6, grip: 'curl' }, { hip: pt(4, -HIP), foot: pt(24, -9), lift: 0.7, ang: -0.6, grip: 'curl' }],
    air: 0.6,
  },
  fly0: {
    head: { c: pt(38, 0), r: 6, crest: 0.15, down: 0 }, neck: pt(15, 0), shift: 0, wings: 'full', tail: { len: 50, spread: 0.12 },
    legs: [{ hip: pt(-6, 4), foot: pt(-46, 4), lift: 0.8, ang: Math.PI }, { hip: pt(-6, -4), foot: pt(-47, -3.5), lift: 0.8, ang: Math.PI }],
    air: 1,
  },
  fly1: {
    head: { c: pt(38, 0), r: 6, crest: 0.15, down: 0 }, neck: pt(15, 0), shift: 0, wings: 'up', tail: { len: 50, spread: 0.12 },
    legs: [{ hip: pt(-6, 4), foot: pt(-46, 4), lift: 0.8, ang: Math.PI }, { hip: pt(-6, -4), foot: pt(-47, -3.5), lift: 0.8, ang: Math.PI }],
    air: 1,
  },
};

/** The body: an egg, broad at the shoulders, narrowing to the rump. */
function bodyShape(): Pt[] {
  return Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * TAU;
    const c = Math.cos(a);
    return pt(1 + c * 21, Math.sin(a) * 13.5 * (1 - 0.25 * Math.max(0, -c) ** 1.5 - 0.15 * Math.max(0, c) ** 2));
  });
}

function draw(d: Draw, pose: Pose): void {
  const rng = createRng(SEED);
  const s = SPECS[pose];
  const { ctx } = d.pen;
  ctx.translate(4 + s.shift, 0);
  const body = bodyShape();
  const wings = typeof s.wings === 'string' ? bothWings(s.wings) : [];
  // Shadows first: the body's and wings' together, each foot's apart.
  shadowOf(d, [body, ...wings.flatMap(wingOutlines)], 4 + s.air * 10, 0.14 - s.air * 0.05);
  for (const l of [...s.legs, ...(s.raised ? [s.raised] : [])]) d.pen.fill(legShadow(l), d.ink, 0.12);
  if (s.impact) impact(d, s.impact, 9);
  if (pose === 'startle') for (const k of [-1, 1]) swish(d, pt(40, k * 14), Math.PI, 16, k * 2, 0.5);
  for (const l of s.legs) paintLeg(d, rng, l);
  paintTail(d, -17, s.tail.len, s.tail.spread);
  rump(d, -15, rng);
  for (const w of wings) paintOpenWing(d, w, rng);
  greyPlumage(d, body, rng, { n: 140, size: 4.2, line: 1.2 });
  if (typeof s.wings !== 'string') for (const side of [1, -1] as const) paintFoldedWing(d, rng, side, s.wings.folded);
  if (s.raised) paintLeg(d, rng, s.raised);
  paintHead(d, rng, s.neck, s.head);
}

/** The Secretary Bird. */
export const SECRETARY_ART: SpriteArt<Pose> = {
  frame: 150,
  res: 2,
  poses: ['walk0', 'walk1', 'raise', 'stamp', 'down', 'startle', 'fly0', 'fly1'],
  draw,
};
