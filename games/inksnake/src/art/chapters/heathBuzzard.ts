import { createRng } from '../../logic/rng';
import { cub, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { shadowOf, swish } from '../critters/birdKit';
import { type TailSpec, tailShape, talons } from '../critters/birdHawkParts';
import { buildWing, mapWing, mirrorY, type Wing, wingOutlines } from '../critters/birdWing';
import { barredTail, buzHead, buzPlumage, paintBuzWing } from './heathBuzzardParts';

/**
 * The common buzzard, seen from above facing +x: a stocky buteo on broad
 * rounded wings with five fingered primaries at each tip, dark brown above
 * and mottled with pale fringes, a paler band across the coverts, and a
 * short fanned grey-brown tail, finely barred. 'soar' spreads it wide (span
 * about 115), 'flap0' sweeps the wings forward on the downstroke, 'flap1'
 * lifts and flexes them, 'stoop' folds them back to drop on the snake with
 * its yellow talons forward, and 'ground' stands it on the heath after a
 * miss, wings half open for balance.
 */
type Pose = 'soar' | 'flap0' | 'flap1' | 'stoop' | 'ground';

const SEED = 9311;
/** Drawn on the hawk's build, a little smaller: the frame stays the buzzard's own. */
const SCALE = 0.76;
const PI = Math.PI;
const WRIST = 0.55;

/** The body: an egg, fullest at the shoulders, narrowing to the tail. */
function egg(cx: number, rx: number, ry: number): Pt[] {
  return Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * PI * 2;
    const c = Math.cos(a);
    return pt(cx + c * rx, Math.sin(a) * ry * (1 - 0.3 * Math.max(0, -c) ** 1.5));
  });
}

interface WingShape {
  readonly lead: readonly Pt[];
  readonly arm: readonly [number, number];
  readonly hand: readonly [number, number];
  readonly chord: readonly [number, number, number];
  readonly fingers: number;
  readonly priW: number;
}

const covertDepth = (t: number): number => (t < WRIST ? 0.56 : 0.56 - ((t - WRIST) / (1 - WRIST)) * 0.28);

function wingOf(s: WingShape): Wing {
  const [p0, c0, c1, w, c2, c3, end] = s.lead as [Pt, Pt, Pt, Pt, Pt, Pt, Pt];
  const lead = [...cub(p0, c0, c1, w, 10), ...cub(w, c2, c3, end, 10).slice(1)];
  const [arm, hand, outer] = s.chord;
  return buildWing({
    lead,
    wrist: WRIST,
    dir: (t) => (t < WRIST ? s.arm[0] + (s.arm[1] - s.arm[0]) * (t / WRIST) : s.hand[0] + (s.hand[1] - s.hand[0]) * ((t - WRIST) / (1 - WRIST)) ** 1.7),
    chord: (t) => {
      if (t < WRIST) return arm * (0.92 + 0.1 * Math.sin((t / WRIST) * PI));
      const u = (t - WRIST) / (1 - WRIST);
      return u < 0.7 ? arm + (hand - arm) * (u / 0.7) : hand + (outer - hand) * ((u - 0.7) / 0.3);
    },
    secondaries: 12,
    primaries: 10,
    secW: 7.4,
    priW: s.priW,
    coverts: covertDepth,
    fingers: s.fingers,
  });
}

const SOAR: WingShape = {
  lead: [pt(5, 7), pt(11, 15), pt(15, 26), pt(15, 35), pt(15, 42), pt(13.5, 48), pt(11, 52)],
  arm: [PI - 0.03, PI - 0.1], hand: [PI - 0.16, PI / 2 + 0.28], chord: [30, 33, 22], fingers: 5, priW: 8.8,
};
const DOWN: WingShape = {
  lead: [pt(5, 7), pt(12, 14), pt(17, 25), pt(17.5, 34), pt(18, 41), pt(17.5, 46), pt(16, 50)],
  arm: [PI - 0.05, PI - 0.16], hand: [PI - 0.22, PI / 2 + 0.1], chord: [29, 32, 22], fingers: 5, priW: 8.8,
};
const UP: WingShape = {
  lead: [pt(5, 7), pt(10, 12), pt(13, 20), pt(12.5, 27), pt(11, 32), pt(7, 37), pt(1, 40)],
  arm: [PI - 0.02, PI - 0.05], hand: [PI - 0.1, PI / 2 + 0.95], chord: [26, 28, 20], fingers: 5, priW: 8.4,
};
const STOOP: WingShape = {
  lead: [pt(8, 5.5), pt(10, 8.5), pt(10, 11.5), pt(8, 13), pt(4, 13.6), pt(-1, 12.8), pt(-6, 11.2)],
  arm: [PI + 0.15, PI + 0.2], hand: [PI + 0.22, PI + 0.3], chord: [15, 29, 27], fingers: 0, priW: 5.8,
};
const MANTLE: WingShape = {
  lead: [pt(5, 8), pt(10, 14), pt(12, 21), pt(13, 26), pt(15, 31), pt(19, 35), pt(24, 37)],
  arm: [PI - 0.3, PI - 0.6], hand: [PI / 2 + 0.7, 0.75], chord: [23, 26, 20], fingers: 5, priW: 8.4,
};

interface Build {
  readonly wing: WingShape;
  readonly tail: TailSpec;
  readonly body: Pt[];
  readonly head: { readonly c: Pt; readonly r: number };
}

const BODY = egg(0, 16.5, 11);
const HEAD = { c: pt(18.5, 0), r: 7.6 };

const BUILDS: Record<Pose, Build> = {
  soar: { wing: SOAR, tail: { x: -12, len: 21, half: 17 }, body: BODY, head: HEAD },
  flap0: { wing: DOWN, tail: { x: -12, len: 20, half: 11 }, body: BODY, head: HEAD },
  flap1: { wing: UP, tail: { x: -12, len: 20, half: 9 }, body: BODY, head: HEAD },
  stoop: { wing: STOOP, tail: { x: -12, len: 19, half: 6 }, body: egg(1, 17, 10), head: { c: pt(19.5, 0), r: 7 } },
  ground: { wing: MANTLE, tail: { x: -12, len: 19, half: 12 }, body: egg(0, 16, 12), head: { c: pt(19, 0), r: 7.2 } },
};

/** A paler band across the shoulders (the scapulars' pale fringes). */
const scapulars = (p: Pt): number => (Math.abs(p.y) > 5 && p.x > -4 && p.x < 10 ? 0.14 : 0.02);

function draw(d: Draw, pose: Pose): void {
  d.pen.ctx.scale(SCALE, SCALE);
  const rng = createRng(SEED);
  const b = BUILDS[pose];
  const right = wingOf(b.wing);
  const wings = [right, mapWing(right, mirrorY)];
  if (pose === 'ground') shadowOf(d, [b.body, tailShape(b.tail), ...wings.flatMap(wingOutlines)], 3, 0.16);
  if (pose === 'stoop') {
    for (const s of [-1, 1]) {
      const tip = wings[s > 0 ? 0 : 1]!.feathers[0]!.f.at(1, 0);
      swish(d, pt(tip.x - 4, tip.y + s * 2), PI, 18, s * 1.5, 0.6);
      swish(d, pt(tip.x + 6, tip.y + s * 6), PI, 14, s, 0.45);
    }
    swish(d, pt(-34, 0), PI, 12, 0, 0.5);
  }
  barredTail(d, b.tail);
  for (const w of wings) paintBuzWing(d, w, rng, covertDepth);
  buzPlumage(d, b.body, rng, { n: 95, size: 4.4, pale: scapulars, line: 1 });
  if (pose === 'stoop' || pose === 'ground') {
    // Yellow feet thrown forward under the chin (the stoop), or gripping the heather.
    const at = pose === 'stoop' ? 24 : 22;
    talons(d, pt(at, 5.5), 0.2, 1);
    talons(d, pt(at, -5.5), -0.2, -1);
  }
  buzHead(d, rng, b.head.c, b.head.r, pose === 'ground' || pose === 'stoop' ? 1 : 0);
}

export const BUZZARD_ART: SpriteArt<Pose> = { frame: 150, res: 2, poses: ['soar', 'flap0', 'flap1', 'stoop', 'ground'], draw };
