import { createRng } from '../../logic/rng';
import { cub, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { shadowOf, swish } from '../critters/birdKit';
import { talons } from '../critters/birdHawkParts';
import { buildWing, mapWing, mirrorY, type Wing, wingOutlines } from '../critters/birdWing';
import { type EagleHead, eagleHead, eaglePlumage, type EagleTail, paintEagleWing, wedgeTail } from './reefCrittersEaglePaint';

/**
 * The white-bellied sea eagle, seen from above facing +x: long broad wings
 * (span about 116) held straight out, ash-grey coverts and slate-black
 * flight feathers fingered at the tips, a grey back, the white head and
 * neck and a short white wedge of a tail. 'soar' spreads the wings full;
 * 'flap0' sweeps them forward on the downstroke, 'flap1' raises and flexes
 * them back; 'stoop' folds them back in a dive, talons forward; 'ground'
 * stands on the sand mantling over its catch, wings half open and arched.
 */
type Pose = 'soar' | 'flap0' | 'flap1' | 'stoop' | 'ground';

const SEED = 6113;
const PI = Math.PI;
/** Everything is laid out at a big hawk's scale, then drawn this much smaller. */
const K = 0.71;

function egg(cx: number, rx: number, ry: number): Pt[] {
  return Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * Math.PI * 2;
    const c = Math.cos(a);
    return pt(cx + c * rx, Math.sin(a) * ry * (1 - 0.3 * Math.max(0, -c) ** 1.5));
  });
}

interface WingShape {
  /** Shoulder, the arm's controls, wrist, the hand's controls and its end (hawk scale). */
  readonly lead: readonly Pt[];
  readonly arm: readonly [number, number];
  readonly hand: readonly [number, number];
  /** Feather lengths: the arm's, the hand's longest, the outermost primary's. */
  readonly chord: readonly [number, number, number];
  readonly fingers: number;
}

const WRIST = 0.52;
const covertDepth = (t: number): number => (t < WRIST ? 0.54 : 0.54 - ((t - WRIST) / (1 - WRIST)) * 0.26);

function wingOf(s: WingShape): Wing {
  const [p0, c0, c1, w, c2, c3, end] = s.lead.map((p) => pt(p.x * K, p.y * K)) as [Pt, Pt, Pt, Pt, Pt, Pt, Pt];
  const lead = [...cub(p0, c0, c1, w, 10), ...cub(w, c2, c3, end, 10).slice(1)];
  const [arm, hand, outer] = s.chord.map((c) => c * K) as [number, number, number];
  return buildWing({
    lead,
    wrist: WRIST,
    dir: (t) => {
      if (t < WRIST) return s.arm[0] + (s.arm[1] - s.arm[0]) * (t / WRIST);
      const u = (t - WRIST) / (1 - WRIST);
      return s.hand[0] + (s.hand[1] - s.hand[0]) * u ** 1.8;
    },
    chord: (t) => {
      // Broad, the secondaries bulging (an eagle's S-curved trailing edge), the hand long and fingered.
      if (t < WRIST) return arm * (0.9 + 0.14 * Math.sin((t / WRIST) * Math.PI));
      const u = (t - WRIST) / (1 - WRIST);
      return u < 0.65 ? arm + (hand - arm) * (u / 0.65) : hand + (outer - hand) * ((u - 0.65) / 0.35);
    },
    secondaries: 13,
    primaries: 10,
    secW: 6.2 * K * 1.25,
    priW: 7.4 * K * 1.2,
    coverts: covertDepth,
    fingers: s.fingers,
  });
}

const SOAR: WingShape = {
  lead: [pt(5, 7), pt(10, 16), pt(12, 30), pt(12, 41), pt(12, 52), pt(11, 60), pt(8, 66)],
  arm: [PI - 0.02, PI - 0.06],
  hand: [PI - 0.1, PI / 2 + 0.42],
  chord: [33, 34, 22],
  fingers: 6,
};
const DOWN: WingShape = {
  lead: [pt(5, 7), pt(12, 15), pt(16, 29), pt(17, 40), pt(18, 50), pt(17, 57), pt(15, 62)],
  arm: [PI - 0.05, PI - 0.15],
  hand: [PI - 0.2, PI / 2 + 0.2],
  chord: [32, 33, 21],
  fingers: 6,
};
const UP: WingShape = {
  lead: [pt(5, 7), pt(9, 13), pt(11, 22), pt(10, 30), pt(8, 36), pt(4, 41), pt(-3, 44)],
  arm: [PI - 0.02, PI - 0.04],
  hand: [PI - 0.08, PI / 2 + 1],
  chord: [28, 30, 20],
  fingers: 6,
};
const STOOP: WingShape = {
  lead: [pt(8, 6), pt(10, 9), pt(10, 12.5), pt(8, 14), pt(3, 14.6), pt(-3, 13.6), pt(-9, 12)],
  arm: [PI + 0.15, PI + 0.2],
  hand: [PI + 0.22, PI + 0.3],
  chord: [17, 30, 28],
  fingers: 0,
};
const MANTLE: WingShape = {
  lead: [pt(5, 8), pt(10, 15), pt(12, 23), pt(13, 29), pt(15, 35), pt(20, 40), pt(26, 42)],
  arm: [PI - 0.3, PI - 0.6],
  hand: [PI / 2 + 0.7, 0.7],
  chord: [26, 28, 22],
  fingers: 6,
};

interface Build {
  readonly wing: WingShape;
  readonly tail: EagleTail;
  readonly body: Pt[];
  readonly neck: Pt[];
  readonly head: EagleHead;
}

const BODY = egg(-1, 13.5, 8.2);
const NECK = egg(8.6, 6.6, 5.6);
const HEAD: EagleHead = { c: pt(14.6, 0), r: 5.6 };

const BUILDS: Record<Pose, Build> = {
  soar: { wing: SOAR, tail: { x: -11, len: 14, half: 10 }, body: BODY, neck: NECK, head: HEAD },
  flap0: { wing: DOWN, tail: { x: -11, len: 13.5, half: 7.5 }, body: BODY, neck: NECK, head: HEAD },
  flap1: { wing: UP, tail: { x: -11, len: 13.5, half: 6.5 }, body: BODY, neck: NECK, head: HEAD },
  stoop: { wing: STOOP, tail: { x: -11, len: 12.5, half: 3.6 }, body: egg(0, 14, 7.4), neck: egg(10, 6, 5), head: { c: pt(15.4, 0), r: 5.2 } },
  ground: { wing: MANTLE, tail: { x: -11, len: 12.5, half: 7 }, body: egg(-1, 13, 9), neck: egg(9.2, 6.4, 5.6), head: { c: pt(14.4, 0), r: 5.3 } },
};

function draw(d: Draw, pose: Pose): void {
  const rng = createRng(SEED);
  const b = BUILDS[pose];
  const right = wingOf(b.wing);
  const wings = [right, mapWing(right, mirrorY)];
  if (pose === 'ground') shadowOf(d, [b.body, ...wings.flatMap(wingOutlines)], 3, 0.16);
  if (pose === 'stoop') {
    for (const s of [-1, 1]) {
      const tip = wings[s > 0 ? 0 : 1]!.feathers[0]!.f.at(1, 0);
      swish(d, pt(tip.x - 3, tip.y + s * 1.5), PI, 14, s * 1.2, 0.6);
      swish(d, pt(tip.x + 5, tip.y + s * 4.5), PI, 11, s * 0.8, 0.45);
    }
    swish(d, pt(-28, 0), PI, 10, 0, 0.5);
  }
  wedgeTail(d, b.tail);
  for (const w of wings) paintEagleWing(d, w, rng, covertDepth);
  eaglePlumage(d, b.body, rng, { n: 70, size: 3.4, line: 0.9 });
  eaglePlumage(d, b.neck, rng, { n: 26, size: 2.8, white: true, line: 0 });
  // The neck's contour only along its sides: at the back the white runs into the grey mantle.
  d.pen.hair(b.neck.slice(3, 14), 0.6, d.ink, 0.8);
  d.pen.hair(b.neck.slice(30, 42), 0.6, d.ink, 0.8);
  if (pose === 'ground' || pose === 'stoop') {
    const x = pose === 'ground' ? 18 : 19;
    talons(d, pt(x, 4.2), 0.15, 1);
    talons(d, pt(x, -4.2), -0.15, -1);
  }
  eagleHead(d, rng, b.head, pose === 'ground' || pose === 'stoop' ? 1 : 0);
}

export const EAGLE_ART: SpriteArt<Pose> = { frame: 130, res: 2, poses: ['soar', 'flap0', 'flap1', 'stoop', 'ground'], draw };
