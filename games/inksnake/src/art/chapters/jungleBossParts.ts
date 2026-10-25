import { cub, pt } from '../kit';
import type { Pt } from '../pen';
import { leg, type LegKey } from './barrensCrittersBeast';

/**
 * The Grey Mongoose's palette and its geometry pose by pose, seen from
 * above facing +x: a long, low, slim trunk, a pointed head, short legs and
 * a long bushy tail tapering to a pale tip. Board px, centred on the trunk.
 */
export const MONGOOSE = {
  base: '#9d978a',
  deep: '#4a453d',
  light: '#dcd5c4',
  dark: '#2c2924',
  pale: '#e9e3d3',
  warm: '#a98a62',
  rufous: '#93704c',
  leg: '#7a7064',
  legDark: '#433c34',
  tip: '#ece2c8',
  nose: '#5a423b',
  noseLit: '#9b7c72',
  iris: '#a8461f',
  irisDeep: '#5e2210',
  rim: '#2a1d18',
  mouth: '#a8404a',
  mouthDeep: '#5a1c25',
  tongue: '#d9757e',
  tooth: '#fbf8ef',
  claw: '#cfc3ab',
} as const;

export type MongoosePose = 'run0' | 'run1' | 'feint' | 'wobble' | 'crouch' | 'dart' | 'stare' | 'startle';
export const MONGOOSE_POSES: readonly MongoosePose[] = ['run0', 'run1', 'feint', 'wobble', 'crouch', 'dart', 'stare', 'startle'];

/** How the eyes look: keen (hunting), fixed (narrowed, locked on), wide (a fright, or staring at a hood), dizzy (off balance). */
export type MongooseEyes = 'keen' | 'fixed' | 'wide' | 'dizzy';

/** The trunk's half width, neck to rump: long, low and slim, a little fuller over the haunches. */
export const TRUNK: readonly (readonly [number, number])[] = [[20, 5.2], [13, 7.6], [4, 8.8], [-7, 8.4], [-16, 9.4], [-24, 7.6], [-30, 0]];

export interface Spec {
  readonly sx: number;
  readonly sy: number;
  /** Sideways sway of the trunk's ends (+y). */
  readonly bend: number;
  readonly head: Pt;
  readonly snout: number;
  readonly gape: boolean;
  readonly eyes: MongooseEyes;
  /** Hind +y, hind −y, fore +y, fore −y. */
  readonly legs: readonly [LegKey, LegKey, LegKey, LegKey];
  /** Forelegs held up to the chest (sitting up): only the paws show. */
  readonly tucked: boolean;
  readonly tail: readonly Pt[];
  /** The tail's width at its root, and how far the fur stands on end (0..1). */
  readonly tailW: number;
  readonly puff: number;
  /** Where the drawing sits in its frame. */
  readonly shift: Pt;
}

export const SPECS: Readonly<Record<MongoosePose, Spec>> = {
  // The bound gathered: hind feet landing up under the chest, forefeet swept back, the back arched short.
  run0: {
    sx: 0.92, sy: 1.06, bend: 0, head: pt(24.5, 0), snout: 9.5, gape: false, eyes: 'keen', tucked: false,
    legs: [leg(pt(-18, 6), pt(-10, 10.5), pt(-3, 9.6)), leg(pt(-18, 6), pt(-9, 10), pt(-2, 8.8)), leg(pt(11, 5), pt(7, 9), pt(1, 8.6)), leg(pt(11, 5), pt(8, 8.6), pt(2, 7.8))],
    tail: cub(pt(-25, 0), pt(-38, 1), pt(-52, -2), pt(-67, -1), 18), tailW: 12.6, puff: 0.1, shift: pt(3, 0),
  },
  // The bound stretched: forefeet thrown far ahead, hind feet kicked out behind, the tail streaming.
  run1: {
    sx: 1.08, sy: 0.92, bend: 0, head: pt(28.5, 0), snout: 9.5, gape: false, eyes: 'keen', tucked: false,
    legs: [leg(pt(-24, 6), pt(-32, 9.5), pt(-42, 8.6)), leg(pt(-24, 6), pt(-31, 9), pt(-41, 7.6)), leg(pt(15, 5), pt(23, 8.6), pt(33, 7.6)), leg(pt(15, 5), pt(22, 8.2), pt(32, 6.6))],
    tail: cub(pt(-30, 0), pt(-44, 0), pt(-58, 2), pt(-72, 1), 18), tailW: 11.9, puff: 0.05, shift: pt(2, 0),
  },
  // In low and stretched, already wheeling round: the trunk curved, the tail swinging out to the turn.
  feint: {
    sx: 1.1, sy: 0.86, bend: 3.2, head: pt(27.5, 3.4), snout: 9.5, gape: false, eyes: 'keen', tucked: false,
    legs: [leg(pt(-24, 6), pt(-30, 12), pt(-38, 14)), leg(pt(-24, 6), pt(-31, 9), pt(-40, 6)), leg(pt(15, 5), pt(22, 11), pt(28, 14.5)), leg(pt(15, 5), pt(22, 8), pt(31, 5.5))],
    tail: cub(pt(-30, 3), pt(-42, 7), pt(-53, 15), pt(-61, 27), 18), tailW: 12.6, puff: 0.15, shift: pt(5, -5),
  },
  // Off balance after the feint: feet splayed wide to catch itself, the trunk kinked, the tail swung right out.
  wobble: {
    sx: 0.98, sy: 1, bend: -3, head: pt(25, -3.6), snout: 9.3, gape: false, eyes: 'dizzy', tucked: false,
    legs: [leg(pt(-20, 6), pt(-22, 13), pt(-27, 17.5)), leg(pt(-20, 6), pt(-17, 13), pt(-12, 17)), leg(pt(13, 5), pt(18, 12), pt(25, 15.5)), leg(pt(13, 5), pt(12, 12.5), pt(8, 16.5))],
    tail: cub(pt(-27, -3), pt(-38, -10), pt(-44, -24), pt(-36, -38), 18), tailW: 13.3, puff: 0.3, shift: pt(6, 6),
  },
  // Low and tense, gathered to spring, fur and tail bristling, eyes locked on the snake.
  crouch: {
    sx: 0.9, sy: 1.1, bend: 0, head: pt(23.5, 0), snout: 9, gape: false, eyes: 'fixed', tucked: false,
    legs: [leg(pt(-18, 6), pt(-23, 11.5), pt(-14, 12.4)), leg(pt(-18, 6), pt(-23, 11.8), pt(-14.5, 12.2)), leg(pt(12, 5), pt(17, 9), pt(23, 10.8)), leg(pt(12, 5), pt(17, 8.8), pt(23.5, 10.4))],
    tail: cub(pt(-25, 0), pt(-38, 0.5), pt(-52, 1.5), pt(-66, 0.5), 18), tailW: 18.2, puff: 0.7, shift: pt(4, 0),
  },
  // The lunge: flat out, forefeet reaching, jaws wide.
  dart: {
    sx: 1.12, sy: 0.86, bend: 0, head: pt(29.5, 0), snout: 9.5, gape: true, eyes: 'fixed', tucked: false,
    legs: [leg(pt(-25, 6), pt(-34, 9), pt(-45, 7.6)), leg(pt(-25, 6), pt(-33, 8.6), pt(-44, 6.6)), leg(pt(16, 5), pt(25, 8.6), pt(35, 9)), leg(pt(16, 5), pt(25, 8.2), pt(36, 8))],
    tail: cub(pt(-31, 0), pt(-44, 0), pt(-56, -1.5), pt(-70, -1), 18), tailW: 12.6, puff: 0.2, shift: pt(0, 0),
  },
  // Stopped dead and sat up on its haunches: seen from above the trunk is foreshortened, forepaws held to the chest.
  stare: {
    sx: 0.6, sy: 1.08, bend: 0, head: pt(14.5, 0), snout: 7.6, gape: false, eyes: 'wide', tucked: true,
    legs: [leg(pt(-12, 6), pt(-12, 11), pt(-7, 12.6)), leg(pt(-12, 6), pt(-12, 11), pt(-7, 12.6)), leg(pt(8, 3.6), pt(10, 4.6), pt(12.5, 4.4)), leg(pt(8, 3.6), pt(10, 4.6), pt(12.5, 4.4))],
    tail: cub(pt(-16, 0), pt(-28, 2), pt(-38, 12), pt(-33, 26), 18), tailW: 12.6, puff: 0.1, shift: pt(10, -6),
  },
  // Struck: springing back off all four feet, fur on end, the tail bottle-brushed.
  startle: {
    sx: 0.92, sy: 1.14, bend: 0, head: pt(24, 0), snout: 9, gape: false, eyes: 'wide', tucked: false,
    legs: [leg(pt(-19, 6), pt(-25, 13.5), pt(-33, 17)), leg(pt(-19, 6), pt(-26, 13.5), pt(-34, 16)), leg(pt(11, 5), pt(16, 13), pt(23, 16.5)), leg(pt(11, 5), pt(17, 13), pt(24, 15.5))],
    tail: cub(pt(-25, 0), pt(-37, 3), pt(-50, -5), pt(-62, -13), 18), tailW: 25.2, puff: 1, shift: pt(4, 2),
  },
};
