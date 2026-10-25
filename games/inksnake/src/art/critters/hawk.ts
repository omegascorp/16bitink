import { createRng } from '../../logic/rng';
import { cub, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { shadowOf, swish } from './birdKit';
import { hawkHead, type HawkHead, hawkPlumage, paintHawkWing, redTail, rump, type TailSpec, tailShape, talons } from './birdHawkParts';
import { buildWing, mapWing, mirrorY, type Wing, wingOutlines } from './birdWing';
import { CRITTER_POSES, type CritterPose } from './poses';

/**
 * The red-tailed hawk, seen from above facing +x: broad rounded wings
 * fingered at the tips, dark brown with buff-fringed coverts and pale
 * scapulars, the brick-red tail, a pale streaked head with a jutting brow.
 * 'soar' spreads the wings full (span about 155) and fans the tail;
 * 'flap0' sweeps them forward on the downstroke, 'flap1' raises and flexes
 * them back; 'stoop' folds them back tight in a dive; 'ground' mantles
 * over its catch, wings half open and arched forward, talons gripping.
 */
type HawkPose = CritterPose<'hawk'>;

const SEED = 9203;

/** The body: an egg, fullest at the shoulders, narrowing to the tail. */
function egg(cx: number, rx: number, ry: number): Pt[] {
  return Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * Math.PI * 2;
    const c = Math.cos(a);
    return pt(cx + c * rx, Math.sin(a) * ry * (1 - 0.3 * Math.max(0, -c) ** 1.5));
  });
}

interface WingShape {
  /** Shoulder, the control points of the arm, wrist, the hand's controls and its end. */
  readonly lead: readonly Pt[];
  /** Feather angles: along the arm (root, wrist), then the hand (inner, outermost). */
  readonly arm: readonly [number, number];
  readonly hand: readonly [number, number];
  /** Feather lengths: the arm's, the hand's longest, the outermost primary's. */
  readonly chord: readonly [number, number, number];
  readonly fingers: number;
  readonly priW: number;
}

const WRIST = 0.55;

/** Covert depth across the chord at t. */
const covertDepth = (t: number): number => (t < WRIST ? 0.56 : 0.56 - ((t - WRIST) / (1 - WRIST)) * 0.28);

function wingOf(s: WingShape): Wing {
  const [p0, c0, c1, w, c2, c3, end] = s.lead as [Pt, Pt, Pt, Pt, Pt, Pt, Pt];
  const lead = [...cub(p0, c0, c1, w, 10), ...cub(w, c2, c3, end, 10).slice(1)];
  const [arm, hand, outer] = s.chord;
  const spec = {
    lead,
    wrist: WRIST,
    dir: (t: number) => {
      if (t < WRIST) return s.arm[0] + (s.arm[1] - s.arm[0]) * (t / WRIST);
      const u = (t - WRIST) / (1 - WRIST);
      return s.hand[0] + (s.hand[1] - s.hand[0]) * u ** 1.7;
    },
    chord: (t: number) => {
      // The arm's trailing edge bulges (the broad secondaries of a buteo).
      if (t < WRIST) return arm * (0.92 + 0.1 * Math.sin((t / WRIST) * Math.PI));
      const u = (t - WRIST) / (1 - WRIST);
      return u < 0.7 ? arm + (hand - arm) * (u / 0.7) : hand + (outer - hand) * ((u - 0.7) / 0.3);
    },
    secondaries: 12,
    primaries: 10,
    secW: 7.6,
    priW: s.priW,
    coverts: covertDepth,
    fingers: s.fingers,
  };
  return buildWing(spec);
}

const PI = Math.PI;

const SOAR: WingShape = {
  lead: [pt(5, 7), pt(11, 15), pt(15, 27), pt(15, 36), pt(15, 43), pt(14, 49), pt(12, 53)],
  arm: [PI - 0.03, PI - 0.1],
  hand: [PI - 0.14, PI / 2 + 0.3],
  chord: [29, 33, 24],
  fingers: 5,
  priW: 8.6,
};
const DOWN: WingShape = {
  lead: [pt(5, 7), pt(12, 14), pt(17, 26), pt(17.5, 35), pt(18, 42), pt(17.5, 47), pt(16, 51)],
  arm: [PI - 0.05, PI - 0.16],
  hand: [PI - 0.22, PI / 2 + 0.1],
  chord: [28, 32, 23],
  fingers: 5,
  priW: 8.6,
};
const UP: WingShape = {
  lead: [pt(5, 7), pt(10, 12), pt(13, 20), pt(12.5, 27), pt(11, 32), pt(7, 37), pt(1, 40)],
  arm: [PI - 0.02, PI - 0.05],
  hand: [PI - 0.1, PI / 2 + 0.95],
  chord: [25, 28, 21],
  fingers: 5,
  priW: 8.2,
};
const STOOP: WingShape = {
  lead: [pt(8, 5.5), pt(10, 8.5), pt(10, 11.5), pt(8, 13), pt(4, 13.6), pt(-1, 12.8), pt(-6, 11.2)],
  arm: [PI + 0.15, PI + 0.2],
  hand: [PI + 0.22, PI + 0.3],
  chord: [15, 29, 27],
  fingers: 0,
  priW: 5.6,
};
const MANTLE: WingShape = {
  lead: [pt(5, 8), pt(10, 14), pt(12, 21), pt(13, 26), pt(15, 31), pt(19, 35), pt(24, 37)],
  arm: [PI - 0.3, PI - 0.6],
  hand: [PI / 2 + 0.7, 0.7],
  chord: [23, 26, 21],
  fingers: 5,
  priW: 8.4,
};

interface Build {
  readonly wing: WingShape;
  readonly tail: TailSpec;
  readonly body: Pt[];
  readonly head: HawkHead;
}

const BODY = egg(0, 17, 10.5);
const HEAD: HawkHead = { c: pt(19, 0), r: 7.4 };

const BUILDS: Record<HawkPose, Build> = {
  soar: { wing: SOAR, tail: { x: -12, len: 24, half: 19 }, body: BODY, head: HEAD },
  flap0: { wing: DOWN, tail: { x: -12, len: 23, half: 12 }, body: BODY, head: HEAD },
  flap1: { wing: UP, tail: { x: -12, len: 23, half: 9 }, body: BODY, head: HEAD },
  stoop: { wing: STOOP, tail: { x: -12, len: 21, half: 4.5 }, body: egg(1, 17.5, 9.5), head: { c: pt(20, 0), r: 6.7 } },
  ground: { wing: MANTLE, tail: { x: -12, len: 21, half: 14 }, body: egg(0, 16.5, 11.5), head: { c: pt(19.5, 0), r: 6.8 } },
};

/** Pale scapulars: the paler feathers in a band across the shoulders and down the back's sides. */
const scapulars = (p: Pt): number => (Math.abs(p.y) > 4.5 && p.x > -6 && p.x < 11 ? 0.2 : 0.02);

function draw(d: Draw, pose: HawkPose): void {
  const rng = createRng(SEED);
  const b = BUILDS[pose];
  const right = wingOf(b.wing);
  const wings = [right, mapWing(right, mirrorY)];
  if (pose === 'ground') shadowOf(d, [b.body, tailShape(b.tail), ...wings.flatMap(wingOutlines)], 3, 0.16);
  if (pose === 'stoop') {
    for (const s of [-1, 1]) {
      const tip = wings[s > 0 ? 0 : 1]!.feathers[0]!.f.at(1, 0);
      swish(d, pt(tip.x - 4, tip.y + s * 2), PI, 18, s * 1.5, 0.6);
      swish(d, pt(tip.x + 6, tip.y + s * 6), PI, 14, s * 1, 0.45);
    }
    swish(d, pt(-36, 0), PI, 12, 0, 0.5);
  }
  redTail(d, b.tail);
  for (const w of wings) paintHawkWing(d, w, rng, covertDepth);
  rump(d, b.tail, rng);
  hawkPlumage(d, b.body, rng, { n: 95, size: 4.4, pale: scapulars, line: 1 });
  if (pose === 'ground') {
    talons(d, pt(23, 5.5), 0.15, 1);
    talons(d, pt(23, -5.5), -0.15, -1);
  }
  hawkHead(d, rng, b.head, pose === 'ground' || pose === 'stoop' ? 1 : 0);
}

/** The hawk. */
export const HAWK: SpriteArt<HawkPose> = { frame: 190, res: 2, poses: CRITTER_POSES.hawk, draw };
