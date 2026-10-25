import { createRng, type Rng } from '../../logic/rng';
import { bezier, closed, cub, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { boxOf, glaze, petalBlade, shadowOf, vane } from '../critters/birdKit';
import { buildWing, mapWing, mirrorY, type Wing } from '../critters/birdWing';
import { greyPlumage, HERON, heronFoot, heronHead, paintHeronWing, paintNeck } from './heathHeronParts';

/**
 * The grey heron, seen from above facing +x: a tall grey wading bird, its
 * wings folded over its back with slate-black tips and a black patch at
 * each shoulder, long pale plumes down its back, a white neck and a white
 * head with a black stripe running back into its crest, and a long yellow
 * bill. It stands hunched with its neck tucked in ('stand'), steps slowly
 * one long-toed foot forward ('wade0', 'wade1'), draws its neck back into
 * an S to aim ('raise'), shoots it straight out with the bill down ('stab'),
 * and flies on broad bowed wings, neck folded and legs trailing ('fly0'
 * the downstroke, 'fly1' the upstroke).
 */
type Pose = 'stand' | 'wade0' | 'wade1' | 'raise' | 'stab' | 'fly0' | 'fly1';

const SEED = 9407;
const PI = Math.PI;
const WRIST = 0.5;

/** The body: an egg, the breast fullest, narrowing to the short tail. */
function egg(cx: number, rx: number, ry: number): Pt[] {
  return Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * PI * 2;
    const c = Math.cos(a);
    return pt(cx + c * rx, Math.sin(a) * ry * (1 - 0.35 * Math.max(0, -c) ** 1.4));
  });
}

interface Ground {
  readonly neck: Pt[];
  readonly head: Pt;
  readonly ang: number;
  readonly bill: number;
  /** Feet as [knee, foot], −y then +y; a raised step shows one forward. */
  readonly feet: readonly [readonly [Pt, Pt], readonly [Pt, Pt]];
}

const under = (y: number): readonly [Pt, Pt] => [pt(0, y), pt(5, y * 1.1)];

const GROUND: Readonly<Record<'stand' | 'wade0' | 'wade1' | 'raise' | 'stab', Ground>> = {
  stand: { neck: bezier(pt(8, 0), pt(13, 1.5), pt(15, 0), 6), head: pt(17.5, 0), ang: 0.05, bill: 13, feet: [under(-4), under(4)] },
  wade0: { neck: bezier(pt(8, 0), pt(16, -2), pt(22, -0.5), 8), head: pt(25, -0.5), ang: 0.02, bill: 13, feet: [[pt(4, -4), pt(19, -6)], under(4)] },
  wade1: { neck: bezier(pt(8, 0), pt(16, 2), pt(22, 0.5), 8), head: pt(25, 0.5), ang: -0.02, bill: 13, feet: [under(-4), [pt(4, 4), pt(19, 6)]] },
  raise: { neck: cub(pt(8, 0), pt(17, -6.5), pt(12.5, 6.5), pt(21, 2.5), 14), head: pt(24, 2.4), ang: -0.05, bill: 13.5, feet: [under(-4.5), under(4.5)] },
  stab: { neck: bezier(pt(8, 0), pt(19, 0), pt(30, 0), 10), head: pt(33, 0), ang: 0, bill: 5.5, feet: [[pt(2, -5), pt(9, -6.5)], [pt(2, 5), pt(9, 6.5)]] },
};

/** A folded wing over the +y side of the back: grey coverts, the slate primaries crossing at the rear, the black shoulder. */
function foldedWing(d: Draw, rng: Rng, s: 1 | -1): void {
  const { pen } = d;
  const shape = [...cub(pt(10, 3 * s), pt(9, 9.5 * s), pt(-6, 10.5 * s), pt(-22, 2 * s), 14), ...cub(pt(-22, 2 * s), pt(-12, 2.5 * s), pt(0, 1.5 * s), pt(10, 3 * s), 10).slice(1)];
  for (let i = 0; i < 4; i++) {
    const f = petalBlade(pt(-6 + i * 1.5, (4.5 + i * 0.8) * s), PI + s * (0.06 + i * 0.03), 18 - i * 1.5, 5, -0.02 * s);
    vane(d, f, 5, { base: HERON.slate, deep: HERON.black, shaft: HERON.greyLight, line: 0.4, lineAlpha: 0.7 });
  }
  greyPlumage(d, cut(shape), rng, 26, 4.2, 0.45);
  const shoulder = pt(8, 6 * s);
  glaze(d, shoulder.x, shoulder.y, 3.6, 2.4, -0.3 * s, HERON.black, 0.85);
  pen.stroke(cub(pt(10, 3 * s), pt(9, 9.5 * s), pt(-6, 10.5 * s), pt(-14, 6 * s), 12), 0.55, d.ink, 0.9, false);
}

/** The covert part of a folded wing (its tip left to the primaries). */
const cut = (shape: Pt[]): Pt[] => shape.filter((p) => p.x > -12);

/** Long pale plumes from the shoulders down the middle of the back. */
function plumes(d: Draw, rng: Rng): void {
  for (let i = 0; i < 9; i++) {
    const y = (rng() - 0.5) * 5;
    const from = pt(6 - rng() * 4, y);
    const to = pt(-20 - rng() * 6, y * 0.4 + (rng() - 0.5) * 2);
    d.pen.hair(bezier(from, pt((from.x + to.x) / 2, y * 0.9 + (rng() - 0.5)), to, 8), 0.55 + rng() * 0.3, rng() < 0.7 ? HERON.plume : HERON.greyLight, 0.75);
  }
}

/** A stab's mark where the bill goes in: a ring of small ripples and flicks. */
function splash(d: Draw, at: Pt): void {
  const { pen } = d;
  for (const r of [3.5, 6]) pen.hair(closed(Array.from({ length: 16 }, (_, i) => pt(at.x + Math.cos((i / 16) * PI * 2) * r, at.y + Math.sin((i / 16) * PI * 2) * r * 0.8))), 0.35, d.ink, r < 4 ? 0.5 : 0.3);
  for (const a of [-1.1, -0.4, 0.4, 1.1, 2.4, -2.4]) pen.hair([pt(at.x + Math.cos(a) * 7, at.y + Math.sin(a) * 6), pt(at.x + Math.cos(a) * 8.6, at.y + Math.sin(a) * 7.4)], 0.4, d.ink, 0.5);
}

function drawGround(d: Draw, pose: keyof typeof GROUND): void {
  const rng = createRng(SEED);
  const g = GROUND[pose];
  const body = egg(-4, 16, 9.5);
  const tail = egg(-21, 4.5, 3.4);
  shadowOf(d, [body, tail], 4, 0.16);
  g.feet.forEach(([knee, foot]) => heronFoot(d, knee, foot, 0));
  greyPlumage(d, tail, rng, 6, 3, 0.45);
  greyPlumage(d, body, rng, 40, 4.6, 0.6);
  for (const s of [-1, 1] as const) foldedWing(d, rng, s);
  plumes(d, rng);
  paintNeck(d, g.neck, 6, pose === 'stab' ? 3.8 : 4.4);
  heronHead(d, g.head, g.ang, g.bill);
  if (pose === 'stab') splash(d, pt(g.head.x + 8.5, g.head.y));
}

interface WingShape {
  readonly lead: readonly [Pt, Pt, Pt, Pt, Pt, Pt, Pt];
  readonly arm: readonly [number, number];
  readonly hand: readonly [number, number];
  readonly chord: readonly [number, number, number];
}

const covertDepth = (t: number): number => (t < WRIST ? 0.5 : 0.5 - ((t - WRIST) / (1 - WRIST)) * 0.25);

function wingOf(s: WingShape): Wing {
  const [p0, c0, c1, w, c2, c3, end] = s.lead;
  const [arm, hand, outer] = s.chord;
  return buildWing({
    lead: [...cub(p0, c0, c1, w, 10), ...cub(w, c2, c3, end, 10).slice(1)],
    wrist: WRIST,
    dir: (t) => (t < WRIST ? s.arm[0] + (s.arm[1] - s.arm[0]) * (t / WRIST) : s.hand[0] + (s.hand[1] - s.hand[0]) * ((t - WRIST) / (1 - WRIST)) ** 1.6),
    chord: (t) => {
      if (t < WRIST) return arm * (0.94 + 0.08 * Math.sin((t / WRIST) * PI));
      const u = (t - WRIST) / (1 - WRIST);
      return u < 0.6 ? arm + (hand - arm) * (u / 0.6) : hand + (outer - hand) * ((u - 0.6) / 0.4);
    },
    secondaries: 14, primaries: 10, secW: 7, priW: 8, coverts: covertDepth, fingers: 2,
  });
}

const DOWN: WingShape = {
  lead: [pt(4, 6), pt(11, 14), pt(15, 24), pt(15, 33), pt(15, 42), pt(13, 50), pt(9, 57)],
  arm: [PI - 0.04, PI - 0.12], hand: [PI - 0.16, PI / 2 + 0.4], chord: [25, 27, 17],
};
const UP: WingShape = {
  lead: [pt(4, 6), pt(9, 11), pt(12, 18), pt(11, 25), pt(9, 30), pt(4, 35), pt(-3, 39)],
  arm: [PI - 0.02, PI - 0.05], hand: [PI - 0.1, PI / 2 + 0.9], chord: [22, 24, 16],
};

function drawFlying(d: Draw, pose: 'fly0' | 'fly1'): void {
  const rng = createRng(SEED);
  const right = wingOf(pose === 'fly0' ? DOWN : UP);
  const wings = [right, mapWing(right, mirrorY)];
  const body = egg(-2, 15, 8.5);
  const tail = egg(-18, 4.5, 3.6);
  for (const s of [-1, 1]) heronFoot(d, pt(-14, s * 2.2), pt(-38, s * 2.6), PI, 0.8);
  greyPlumage(d, tail, rng, 6, 3, 0.7);
  for (const w of wings) paintHeronWing(d, w, rng, covertDepth);
  greyPlumage(d, body, rng, 40, 4.4, 0.7);
  const b = boxOf(body);
  d.pen.clipped(body, () => glaze(d, b.cx + 8, 0, 6, 5, 0, HERON.greyDeep, 0.35));
  // The neck folded back onto the shoulders: a pale bulge, the head drawn in on it.
  paintNeck(d, bezier(pt(8, 0), pt(12, 0.6), pt(14, 0), 6), 8, 6);
  heronHead(d, pt(16.5, 0), 0, 12);
}

/** Drawn on a small build: scaled up on the ground (a tall bird), a little down in the air so the wings fit the frame. */
const SCALE = { ground: 1.45, air: 0.92 } as const;

function draw(d: Draw, pose: Pose): void {
  const air = pose === 'fly0' || pose === 'fly1';
  d.pen.ctx.scale(SCALE[air ? 'air' : 'ground'], SCALE[air ? 'air' : 'ground']);
  if (pose === 'fly0' || pose === 'fly1') drawFlying(d, pose);
  else drawGround(d, pose);
}

export const HERON_ART: SpriteArt<Pose> = {
  frame: 150,
  res: 2,
  poses: ['stand', 'wade0', 'wade1', 'raise', 'stab', 'fly0', 'fly1'],
  draw,
};
