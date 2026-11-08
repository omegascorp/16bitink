import { createRng } from '../../logic/rng';
import { shadowOf, swish } from '../critters/birdKit';
import { buildWing, mapWing, mirrorY, type Wing, wingOutlines } from '../critters/birdWing';
import { cub, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { barredTail, eagleFoot, eagleHead, eaglePlumage, type Head, paintEagleWing, type TailSpec, tailShape } from './mountainsCrittersEagleParts';

/**
 * The short-toed snake eagle, seen from above facing +x: long broad wings
 * fingered at the tips, ash-brown with sandy coverts, a barred grey-brown
 * tail and a big round owlish head with staring yellow eyes. 'soar' holds
 * the wings flat out; 'hover' kites into the wind (the hands arched
 * forward and down, so the span looks shorter, the tail fanned wide, head
 * bent to look down: the lock); 'flap0' sweeps them forward on the
 * downstroke, 'flap1' raises and flexes them; 'stoop' folds them back tight
 * with the feet thrown forward; 'ground' stands after a miss, wings half
 * open. Painted in hawk units and scaled into a 150 frame.
 */
type Pose = 'soar' | 'hover' | 'flap0' | 'flap1' | 'stoop' | 'ground';

const SEED = 9711;
/** Hawk units to board px. */
const K = 0.8;
const PI = Math.PI;

/** The body: an egg, fullest at the shoulders, narrowing to the tail. */
function egg(cx: number, rx: number, ry: number): Pt[] {
  return Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * PI * 2;
    const c = Math.cos(a);
    return pt(cx + c * rx, Math.sin(a) * ry * (1 - 0.3 * Math.max(0, -c) ** 1.5));
  });
}

interface WingShape {
  /** Shoulder, the arm's controls, wrist, the hand's controls and its end. */
  readonly lead: readonly Pt[];
  readonly arm: readonly [number, number];
  readonly hand: readonly [number, number];
  /** The arm's feathers, the hand's longest, the outermost primary. */
  readonly chord: readonly [number, number, number];
  readonly fingers: number;
  readonly priW: number;
}

const WRIST = 0.55;
const covertDepth = (t: number): number => (t < WRIST ? 0.55 : 0.55 - ((t - WRIST) / (1 - WRIST)) * 0.27);

function wingOf(s: WingShape): Wing {
  const [p0, c0, c1, w, c2, c3, end] = s.lead as [Pt, Pt, Pt, Pt, Pt, Pt, Pt];
  const lead = [...cub(p0, c0, c1, w, 10), ...cub(w, c2, c3, end, 10).slice(1)];
  const [arm, hand, outer] = s.chord;
  return buildWing({
    lead,
    wrist: WRIST,
    dir: (t) => {
      if (t < WRIST) return s.arm[0] + (s.arm[1] - s.arm[0]) * (t / WRIST);
      return s.hand[0] + (s.hand[1] - s.hand[0]) * ((t - WRIST) / (1 - WRIST)) ** 1.7;
    },
    chord: (t) => {
      if (t < WRIST) return arm * (0.94 + 0.08 * Math.sin((t / WRIST) * PI));
      const u = (t - WRIST) / (1 - WRIST);
      return u < 0.7 ? arm + (hand - arm) * (u / 0.7) : hand + (outer - hand) * ((u - 0.7) / 0.3);
    },
    secondaries: 13,
    primaries: 10,
    secW: 7.4,
    priW: s.priW,
    coverts: covertDepth,
    fingers: s.fingers,
  });
}

const SOAR: WingShape = {
  lead: [pt(5, 7), pt(11, 16), pt(16, 30), pt(16, 40), pt(16, 48), pt(15, 55), pt(12.5, 60)],
  arm: [PI - 0.03, PI - 0.08],
  hand: [PI - 0.12, PI / 2 + 0.32],
  chord: [30, 33, 23],
  fingers: 5,
  priW: 8.4,
};
const HOVER: WingShape = {
  lead: [pt(5, 7), pt(12, 15), pt(18, 26), pt(19.5, 34), pt(21, 41), pt(23.5, 46), pt(26.5, 50)],
  arm: [PI - 0.12, PI - 0.3],
  hand: [PI - 0.45, PI / 2 - 0.15],
  chord: [30, 31, 22],
  fingers: 5,
  priW: 8.4,
};
const DOWN: WingShape = {
  lead: [pt(5, 7), pt(12, 15), pt(18, 29), pt(18.5, 39), pt(19, 46), pt(18.5, 52), pt(16.5, 57)],
  arm: [PI - 0.05, PI - 0.15],
  hand: [PI - 0.2, PI / 2 + 0.12],
  chord: [29, 32, 22],
  fingers: 5,
  priW: 8.4,
};
const UP: WingShape = {
  lead: [pt(5, 7), pt(10, 12), pt(13, 21), pt(12.5, 29), pt(11, 35), pt(7, 40), pt(0.5, 43)],
  arm: [PI - 0.02, PI - 0.05],
  hand: [PI - 0.1, PI / 2 + 0.95],
  chord: [26, 28, 20],
  fingers: 5,
  priW: 8,
};
const STOOP: WingShape = {
  lead: [pt(8, 5.5), pt(10, 8.5), pt(10, 11.5), pt(8, 13), pt(4, 13.8), pt(-1, 13), pt(-6, 11.5)],
  arm: [PI + 0.15, PI + 0.2],
  hand: [PI + 0.22, PI + 0.3],
  chord: [15, 30, 28],
  fingers: 0,
  priW: 5.6,
};
const MANTLE: WingShape = {
  lead: [pt(5, 8), pt(10, 14), pt(12, 21), pt(13, 26), pt(15, 31), pt(19, 35), pt(24, 37)],
  arm: [PI - 0.3, PI - 0.6],
  hand: [PI / 2 + 0.7, 0.75],
  chord: [23, 26, 21],
  fingers: 5,
  priW: 8.2,
};

interface Build {
  readonly wing: WingShape;
  readonly tail: TailSpec;
  readonly body: Pt[];
  readonly head: Head;
  readonly down: number;
}

const BODY = egg(0, 17, 11);
const HEAD: Head = { c: pt(20, 0), r: 9 };

const BUILDS: Record<Pose, Build> = {
  soar: { wing: SOAR, tail: { x: -12, len: 26, half: 15 }, body: BODY, head: HEAD, down: 0 },
  hover: { wing: HOVER, tail: { x: -12, len: 25, half: 23 }, body: BODY, head: { c: pt(19, 0), r: 9.2 }, down: 1 },
  flap0: { wing: DOWN, tail: { x: -12, len: 25, half: 11 }, body: BODY, head: HEAD, down: 0 },
  flap1: { wing: UP, tail: { x: -12, len: 25, half: 9 }, body: BODY, head: HEAD, down: 0 },
  stoop: { wing: STOOP, tail: { x: -12, len: 23, half: 4.5 }, body: egg(1, 17.5, 10), head: { c: pt(21, 0), r: 8.4 }, down: 1 },
  ground: { wing: MANTLE, tail: { x: -12, len: 23, half: 12 }, body: egg(0, 16.5, 12), head: { c: pt(20, 0), r: 8.8 }, down: 0.5 },
};

/** Paler coverts on the back's sides (the scapulars). */
const scapulars = (p: Pt): number => (Math.abs(p.y) > 5 && p.x > -6 && p.x < 11 ? 0.22 : 0.03);

function paint(d: Draw, pose: Pose): void {
  const rng = createRng(SEED);
  const b = BUILDS[pose];
  const right = wingOf(b.wing);
  const wings = [right, mapWing(right, mirrorY)];
  if (pose === 'ground') shadowOf(d, [b.body, tailShape(b.tail), ...wings.flatMap(wingOutlines)], 3, 0.16);
  if (pose === 'stoop') {
    for (const s of [-1, 1]) {
      const tip = wings[s > 0 ? 0 : 1]!.feathers[0]!.f.at(1, 0);
      swish(d, pt(tip.x - 4, tip.y + s * 2), PI, 18, s * 1.5, 0.6);
      swish(d, pt(tip.x + 6, tip.y + s * 7), PI, 14, s, 0.45);
    }
    swish(d, pt(-38, 0), PI, 12, 0, 0.5);
    // The feet thrown forward under the head, talons open.
    eagleFoot(d, pt(31, 8), 0.25, 1, 13);
    eagleFoot(d, pt(31, -8), -0.25, -1, 13);
  }
  barredTail(d, b.tail);
  for (const w of wings) paintEagleWing(d, w, rng, covertDepth);
  eaglePlumage(d, rumpOf(b.tail), rng, { n: 12, size: 4, pale: () => 0.3, line: 0.8 });
  eaglePlumage(d, b.body, rng, { n: 95, size: 4.4, pale: scapulars, line: 1 });
  if (pose === 'ground') {
    eagleFoot(d, pt(24, 6), 0.15, 1);
    eagleFoot(d, pt(24, -6), -0.15, -1);
  }
  eagleHead(d, rng, b.head, b.down);
}

/** The upper tail coverts over the tail's root. */
function rumpOf(t: TailSpec): Pt[] {
  return Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * PI * 2;
    return pt(t.x - 3 + Math.cos(a) * 8, Math.sin(a) * 6.5);
  });
}

function draw(d: Draw, pose: Pose): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.scale(K, K);
  ctx.translate(2, 0);
  paint(d, pose);
  ctx.restore();
}

/** The short-toed snake eagle. */
export const SNAKE_EAGLE_ART: SpriteArt<Pose> = { frame: 150, res: 2, poses: ['soar', 'hover', 'flap0', 'flap1', 'stoop', 'ground'], draw };
