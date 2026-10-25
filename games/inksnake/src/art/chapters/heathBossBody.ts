import { createRng } from '../../logic/rng';
import { cub, type Draw, pt } from '../kit';
import { tufted } from '../critters/tomcatParts';
import type { Pt } from '../pen';
import { ellipseAt, glaze } from '../critters/preyKit';
import { clumps, fingers, leg, type Leg, type LegKey, makeLeg, paintFur, type Pelt, trunkShape } from './barrensCrittersBeast';
import { BADGER as B, type HeadSpec } from './heathBossHead';

/**
 * The Badger's build and coat, seen from above facing +x: a broad, flat
 * wedge of a body about 90 long, fullest behind the middle, on short black
 * legs with long pale digging claws on the forefeet; a coarse grizzled coat,
 * silver-grey with black-tipped guard hairs, darker down the flanks; a short
 * bushy tail. Each pose holds the body, legs, head and tail its own way.
 */
export type BadgerPose = 'emerge' | 'lunge' | 'sniff0' | 'sniff1' | 'startle' | 'dive';

export interface Build {
  readonly sx: number;
  readonly sy: number;
  readonly bend: number;
  readonly head: HeadSpec;
  /** The head swung round the neck (snuffling side to side), radians. */
  readonly turn: number;
  readonly legs: readonly [LegKey, LegKey, LegKey, LegKey];
  readonly tail: readonly Pt[];
  /** Fur standing on end (the startle). */
  readonly bristle: number;
}

/** The trunk's half width, neck to rump. */
const TRUNK: readonly (readonly [number, number])[] = [[16, 10.5], [8, 17], [-4, 21.5], [-18, 22.5], [-30, 19], [-38, 12], [-43, 0]];

const FORE = leg(pt(9, 9), pt(12, 13), pt(15, 18.5));
const HIND = leg(pt(-28, 10), pt(-30, 15), pt(-27, 20.5));
const tailOf = (s: number): Pt[] => cub(pt(-40, 0), pt(-45, s * 0.5), pt(-49, s * 1.5), pt(-53, s * 2.6), 10);

const sniff = (s: 1 | -1): Build => ({
  sx: 1, sy: 1, bend: s * 1.2,
  head: { C: pt(23, s * 1), R: 8.6, snout: 8.5, biting: false }, turn: s * 0.22,
  legs: [leg(pt(9, 9), pt(12, 13), pt(16 + s, 18.5)), leg(pt(9, 9), pt(12, 13), pt(16 - s, 18.5)), HIND, HIND],
  tail: tailOf(-s), bristle: 1,
});

export const BUILDS: Readonly<Record<BadgerPose, Build>> = {
  emerge: {
    sx: 1, sy: 1, bend: 0, head: { C: pt(25, 0), R: 8.8, snout: 12, biting: false }, turn: 0,
    legs: [leg(pt(9, 10), pt(14, 16), pt(20, 18)), leg(pt(9, 10), pt(14, 16), pt(20, 18)), HIND, HIND], tail: tailOf(1), bristle: 1,
  },
  lunge: {
    sx: 1.06, sy: 0.95, bend: 0, head: { C: pt(27, 0), R: 8.8, snout: 8, biting: true }, turn: 0,
    legs: [leg(pt(10, 10), pt(20, 16), pt(32, 17)), leg(pt(10, 10), pt(20, 16), pt(31, 18)), leg(pt(-30, 11), pt(-37, 17), pt(-46, 16)), leg(pt(-30, 11), pt(-37, 17), pt(-45, 17))],
    tail: tailOf(0), bristle: 1,
  },
  sniff0: sniff(1),
  sniff1: sniff(-1),
  startle: {
    sx: 0.9, sy: 1.08, bend: 0, head: { C: pt(20, 0), R: 9, snout: 10.5, biting: false, wide: true }, turn: 0,
    legs: [leg(pt(8, 9), pt(11, 15), pt(14, 21)), leg(pt(8, 9), pt(11, 15), pt(14, 21)), leg(pt(-26, 10), pt(-28, 17), pt(-25, 23)), leg(pt(-26, 10), pt(-28, 17), pt(-25, 23))],
    tail: cub(pt(-37, 0), pt(-43, 0), pt(-48, -0.5), pt(-53, 0), 10), bristle: 2.6,
  },
  dive: {
    sx: 1, sy: 0.96, bend: 0, head: { C: pt(25, 0), R: 8.8, snout: 12, biting: false }, turn: 0,
    legs: [FORE, FORE, leg(pt(-28, 10), pt(-33, 16), pt(-40, 18)), leg(pt(-28, 10), pt(-32, 16), pt(-38, 19))],
    tail: cub(pt(-40, 0), pt(-46, -0.5), pt(-51, -2.5), pt(-55, -5), 10), bristle: 1.4,
  },
};

const PELT: Pelt = {
  base: B.grey, deep: B.greyDeep, light: B.greyLight,
  hair: (_p, r) => (r < 0.2 ? B.black : r < 0.42 ? B.greyDeep : r < 0.72 ? B.grey : r < 0.93 ? B.silver : B.warm),
};
const LEG_PELT: Pelt = { base: B.leg, deep: B.black, light: B.greyDeep, hair: (_p, r) => (r < 0.6 ? B.black : r < 0.9 ? B.leg : B.greyDeep) };

export const trunkOf = (b: Build): Pt[] => trunkShape(TRUNK.map(([x, w]) => [x * b.sx, w * b.sy] as const), b.bend, b.bristle > 1.5 ? 1.2 : 0.45);
export const legsOf = (b: Build): Leg[] => b.legs.map((k, i) => makeLeg(k, i % 2 === 0 ? -1 : 1, i < 2, 6.4, 4.2));

/** A broad black forefoot with long pale claws for digging (shorter on the hind feet). */
function paw(d: Draw, l: Leg): void {
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const sole = ellipseAt(l.c.x + u.x, l.c.y + u.y, 3.2, 2.7, l.ang, 14);
  d.pen.fill(sole, B.leg, 1);
  d.pen.clipped(sole, () => d.pen.crescent(sole, pt(-0.5, -0.8), () => d.pen.fill(sole, B.black, 0.6)));
  const base = pt(l.c.x + u.x * 3, l.c.y + u.y * 3);
  fingers(d, base, l.ang, 1.4, l.front ? [2.4, 3, 3.2, 3, 2.4] : [1.6, 2, 2, 1.6], 1.2, B.leg, B.claw);
  if (l.front) {
    // The long claws themselves, pale and curved.
    for (let i = 0; i < 5; i++) {
      const a = l.ang + (i / 4 - 0.5) * 1.4;
      const from = pt(base.x + Math.cos(a) * 2.6, base.y + Math.sin(a) * 2.6);
      const to = pt(from.x + Math.cos(a + 0.15) * 3.6, from.y + Math.sin(a + 0.15) * 3.6);
      d.pen.stroke([from, to], 0.8, B.claw, 1, false);
      d.pen.hair([from, to], 0.25, d.ink, 0.7);
    }
  }
}

export function paintLeg(d: Draw, l: Leg, k: number): void {
  paintFur(d, LEG_PELT, { shape: l.limb, dir: (p) => Math.atan2(l.c.y - p.y, l.c.x - p.x), n: 140, len: 2, seed: 9520 + k, tuft: 1, line: 0.7 });
  paw(d, l);
}

/** The short bushy tail: grizzled grey, paler at its tip. */
export function paintTail(d: Draw, spine: readonly Pt[]): Pt[] {
  const a = spine[0]!;
  const end = spine[spine.length - 1]!;
  const mid = spine[Math.floor(spine.length / 2)]!;
  const len = Math.hypot(end.x - a.x, end.y - a.y);
  const shape = tufted(ellipseAt(mid.x, mid.y, len * 0.62, 4.6, Math.atan2(end.y - a.y, end.x - a.x), 30), 0.9, 2);
  paintFur(d, PELT, {
    shape,
    dir: (p) => Math.atan2(p.y - spine[0]!.y, p.x - spine[0]!.x),
    wet: () => glaze(d, end.x, end.y, 5, 4, 0, B.silver, 0.6),
    n: 160, len: 3, seed: 9530, tuft: 2.2, line: 0.7,
  });
  return shape;
}

/** The coat: grizzled silver-grey, darker down the flanks towards the black legs, guard hairs in locks over all. */
export function paintCoat(d: Draw, b: Build, shape: readonly Pt[]): void {
  const lie = (p: Pt): number => Math.PI + Math.sign(p.y) * Math.min(0.8, Math.abs(p.y) / 26) * -1;
  const rng = createRng(9540);
  paintFur(d, PELT, {
    shape,
    dir: lie,
    wet: () => {
      for (const s of [-1, 1]) glaze(d, -12 * b.sx, s * 20 * b.sy, 30 * b.sx, 6, 0, B.black, 0.45);
      glaze(d, 8 * b.sx, 0, 10, 11, 0, B.greyDeep, 0.35);
      glaze(d, -14 * b.sx, -5, 20, 9, 0, B.silver, 0.45);
      glaze(d, -36 * b.sx, 0, 8, 10, 0, B.greyDeep, 0.3 + rng() * 0.05);
    },
    over: () => clumps(d, shape, lie, 260, 9541, 5.2 * Math.min(1.4, b.bristle), B.black, B.silver, (p) => 0.35 + 0.35 * Math.min(1, Math.abs(p.y) / 18)),
    n: 1500, len: 3.6 * Math.min(1.3, b.bristle), seed: 9542, tuft: 2 * b.bristle, line: 0.7,
  });
}
