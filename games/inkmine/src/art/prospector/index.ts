import { lookOf, type ProspectorLook } from '../../logic/gear';
import type { Draw } from '../kit';
import type { Pt } from '../pen';
import { cell } from './cell';
import { drill } from './drill';
import { helmet } from './helmet';
import { jetpack, nozzles, NOZZLES, strap } from './jetpack';
import { pack } from './pack';
import { pt } from './parts';
import { arm, leg, torso } from './suit';

/**
 * The prospector: a small figure in a suit and helmet with a jetpack and
 * an energy cell on their back, an ore pack at the hip and a drill in hand,
 * inked in blue like every "you" in the catalog. Each of the six pieces is
 * drawn at its own mark (logic/gear.ts, marks.ts), so the character
 * changes piece by piece as gear is built. Drawn facing right in
 * a frame of PROSPECTOR_FRAME units with the feet on y = PROSPECTOR_GROUND;
 * `d.f` (0..2) is both the line-boil frame and the walk step.
 */
export const PROSPECTOR_FRAME = 64;
export const PROSPECTOR_GROUND = 14;

export type Pose = 'idle' | 'walk' | 'drillSide' | 'drillDown' | 'drillUp' | 'climb' | 'fly';
export const POSES: readonly Pose[] = ['idle', 'walk', 'drillSide', 'drillDown', 'drillUp', 'climb', 'fly'];

/** Where the jetpack's nozzle mouth is for a jetpack of mark `mk` (drawing units, facing right), for the flame. */
export function nozzleOf(mk: number): Pt {
  return NOZZLES[lookOf(mk)];
}

interface Rig {
  readonly hand: Pt;
  readonly angle: number;
  /** Where the face looks. */
  readonly gaze: Pt;
}

const RIGS: Readonly<Record<Exclude<Pose, 'climb'>, Rig>> = {
  idle: { hand: pt(6.8, 4.6), angle: 0.55, gaze: pt(0.6, 0.4) },
  walk: { hand: pt(6.8, 4.4), angle: 0.45, gaze: pt(0.8, 0) },
  drillSide: { hand: pt(8, 1.4), angle: 0, gaze: pt(1, 0) },
  drillDown: { hand: pt(6.6, 6.4), angle: Math.PI / 2, gaze: pt(0.6, 1.4) },
  drillUp: { hand: pt(11.6, -1), angle: -Math.PI / 2, gaze: pt(0.8, -1.6) },
  fly: { hand: pt(6.8, 5.4), angle: 0.8, gaze: pt(0.6, -0.6) },
};

function legs(d: Draw, mk: number, pose: Pose): void {
  const g = d.g;
  if (pose === 'fly') {
    // Legs trailing a little behind, toes down.
    leg(d, mk, pt(-3, 6.6), pt(-5.6, g - 2.4), false);
    leg(d, mk, pt(2.4, 6.6), pt(0.2, g - 1), true);
    return;
  }
  if (pose === 'climb') {
    leg(d, mk, pt(-3, 6.6), pt(-4, g - 4), false);
    leg(d, mk, pt(2.4, 6.6), pt(3.4, g - 2), true);
    return;
  }
  const step = pose === 'walk' ? [-2.8, 0, 2.8][d.f]! : 0;
  const lift = pose === 'walk' ? [0.8, 0, 0.8][d.f]! : 0;
  leg(d, mk, pt(-3, 6.6), pt(-3 - step, g - 2 - lift), false);
  leg(d, mk, pt(2.4, 6.6), pt(2.4 + step, g - 2), true);
}

export function drawProspector(d: Draw, pose: Pose, look: ProspectorLook): void {
  const spin = d.f;
  jetpack(d, look.jetpack);
  cell(d, look.cell);
  nozzles(d, look.jetpack);
  legs(d, look.suit, pose);
  torso(d, look.suit);
  pack(d, look.pack);
  strap(d, look.jetpack);
  if (pose === 'climb') {
    // Hands on the rungs overhead, behind the helmet; the drill rides on the pack.
    arm(d, look.suit, pt(-3.8, -1), pt(-5.6, -16 + (d.f === 1 ? 1.4 : 0)));
    arm(d, look.suit, pt(3.6, -1), pt(7.4, -15 - (d.f === 1 ? 1.4 : 0)));
    helmet(d, look.helmet, pt(0.4, -1.4));
    return;
  }
  const rig = RIGS[pose];
  helmet(d, look.helmet, rig.gaze);
  if (lookOf(look.drill) < 2) {
    // The drill's power cable from the cell.
    d.pen.stroke([pt(-7.6, 7), pt(-3.6, 11.4), pt(rig.hand.x - 4, rig.hand.y + 4.4), pt(rig.hand.x - 1.4, rig.hand.y + 2)], 0.9, d.ink, 0.8, false);
  }
  arm(d, look.suit, pt(2, -0.6), rig.hand);
  drill(d, look.drill, rig.hand, rig.angle, spin, pose.startsWith('drill'));
}
