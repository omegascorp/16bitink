import { createRng } from '../../../src/logic/rng';
import { suckedIn } from '../effects';
import { clamp01, curveAt, type Key } from '../short';
import { asPose, tiltFrom, type WorldFish } from '../gameplay/fish';
import {
  DRIFT, FRENZY_AT, lengthOf, lipsAt, loopTime, MEALS, PLAYER_LEN, playerFish, STAPLE, storyTime, SUCK, type Meal,
} from './story';

/**
 * The minnow school: a thick shoal streaming in head-on from the right,
 * each fish on its place in the formation, rippling with the school, and
 * swerving round you as you plough through. The ones you eat are placed so
 * they meet your lips at their gulp. When the frenzy hits, the rest bolt.
 * Every position is a pure function of story time (see story.ts).
 */

/** How fast the school comes at you across the screen, px/s. */
export const SCHOOL_SPEED = 330;
/** Where the school's front column is at the loop point (just reaching your lips), and its centre line. */
const FRONT_X = 640;
const MID_Y = 800;
const COLS = 11;
const ROWS = 5;
const COL_GAP = 140;
const ROW_GAP = 100;
/** Story time the school is in play: off screen at both ends. */
export const SCHOOL_FROM = -2.5;
export const SCHOOL_TO = 6.5;

interface Member {
  /** Place in the formation, px from the front column's centre line. */
  readonly hx: number;
  readonly hy: number;
  readonly size: number;
  readonly phase: number;
  readonly sparkle: number;
  /** The meal it becomes, if any. */
  readonly meal: Meal | null;
}

/** The school's front: sweeping in fast from off screen, then steady as it meets you at the loop point. */
const SWEEP: readonly Key[] = [
  { t: SCHOOL_FROM, at: FRONT_X + 1700, rate: -1800 },
  { t: -1.6, at: FRONT_X + 360, rate: -250 },
  { t: 0, at: FRONT_X, rate: -SCHOOL_SPEED },
  { t: 10, at: FRONT_X - SCHOOL_SPEED * 10, rate: -SCHOOL_SPEED },
];
const anchorX = (s: number): number => curveAt(SWEEP, s).at;

/** The school's ripple: a wave running back through the shoal, and each fish's own wiggle. */
function ripple(m: { readonly hx: number; readonly phase: number }, s: number): { readonly x: number; readonly y: number } {
  return {
    x: 7 * Math.sin(2 * Math.PI * 0.8 * s + m.phase * 3),
    y: 11 * Math.sin(2 * Math.PI * 0.9 * s - m.hx * 0.006 + m.phase),
  };
}

/** The formation: a jittered, rounded block of minnows, with the eaten ones put where your lips will be. */
const MEMBERS: readonly Member[] = (() => {
  const rng = createRng(4242);
  const [lo, hi] = STAPLE.size;
  const grid: Member[] = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const ex = (c - (COLS - 1) / 2) / (COLS / 2);
      const ey = (r - (ROWS - 1) / 2) / (ROWS / 2 + 0.3);
      // Rounded ends: skip the corners.
      if (ex * ex + ey * ey > 1.15) continue;
      grid.push({
        hx: c * COL_GAP + (r % 2) * COL_GAP * 0.5 + (rng() - 0.5) * 50,
        hy: (r - (ROWS - 1) / 2) * ROW_GAP + (rng() - 0.5) * 34,
        size: Math.round(lo + rng() * (hi - lo)),
        phase: rng() * Math.PI * 2,
        sparkle: rng(),
        meal: null,
      });
    }
  }
  // Each meal takes the place of the nearest fish in the formation.
  let members = grid;
  for (const meal of MEALS) {
    const s = meal.at - SUCK;
    const lips = lipsAt(loopTime(s));
    const want = { x: lips.x + meal.dx * PLAYER_LEN + lengthOf(meal.size) * 0.45, y: lips.y + meal.dy * PLAYER_LEN };
    const proto = { hx: 0, phase: 0 };
    const nearest = members
      .filter((m) => m.meal === null)
      .reduce((best, m) => (Math.hypot(anchorX(s) + m.hx - want.x, MID_Y + m.hy - want.y) < Math.hypot(anchorX(s) + best.hx - want.x, MID_Y + best.hy - want.y) ? m : best));
    const phase = nearest.phase;
    const w = ripple({ ...proto, hx: want.x - anchorX(s), phase }, s);
    const placed: Member = { ...nearest, hx: want.x - anchorX(s) - w.x, hy: want.y - MID_Y - w.y, size: meal.size, meal };
    // Make room: nobody else sits on top of it.
    members = members
      .filter((m) => m !== nearest && (m.meal !== null || Math.hypot(m.hx - placed.hx, m.hy - placed.hy) > 70))
      .concat(placed);
  }
  return members;
})();

export const SCHOOL_SIZE = MEMBERS.length;

/** A fish's place before you and the panic move it. */
function formationAt(m: Member, s: number): { readonly x: number; readonly y: number } {
  const w = ripple(m, s);
  return { x: anchorX(s) + m.hx + w.x, y: MID_Y + m.hy + w.y };
}

/** Which way a fish swerves round you, fixed for its whole pass: the side of you it is on as it passes. */
function sideOf(m: Member): 1 | -1 {
  const pass = (FRONT_X + m.hx - 480) / SCHOOL_SPEED;
  const dy = formationAt(m, pass).y - playerFish(loopTime(Math.min(SCHOOL_TO - 0.01, Math.max(SCHOOL_FROM, pass)))).y;
  if (Math.abs(dy) > 8) return dy > 0 ? 1 : -1;
  return m.phase > Math.PI ? 1 : -1;
}
const SIDES = MEMBERS.map(sideOf);

/** Swerving round you: pushed up or down (and a little ahead) the closer it comes to your body. */
function swerve(i: number, p: { readonly x: number; readonly y: number }, s: number): { readonly x: number; readonly y: number } {
  if (MEMBERS[i]!.meal) return { x: 0, y: 0 };
  const you = playerFish(loopTime(s));
  const dx = (p.x - you.x) / (PLAYER_LEN * 0.8);
  const dy = (p.y - you.y) / (PLAYER_LEN * 0.5);
  const near = Math.exp(-(dx * dx + dy * dy));
  return { x: 25 * near * Math.tanh(3 * dx), y: 110 * near * SIDES[i]! };
}

/** When a fish bolts after the frenzy (nearest first), and which way. */
function bolt(m: Member): { readonly at: number; readonly dir: { readonly x: number; readonly y: number } } {
  const p = formationAt(m, FRENZY_AT);
  const lips = lipsAt(loopTime(FRENZY_AT));
  const dx = p.x - lips.x;
  const dy = p.y - lips.y + (m.phase - Math.PI) * 15;
  const d = Math.hypot(dx, dy) || 1;
  return { at: FRENZY_AT + 0.06 + d / 3000, dir: { x: dx / d, y: dy / d } };
}
const BOLTS = MEMBERS.map(bolt);

function positionAt(i: number, s: number): { readonly x: number; readonly y: number } {
  const m = MEMBERS[i]!;
  const p = formationAt(m, s);
  const w = swerve(i, p, s);
  const b = BOLTS[i]!;
  const since = Math.max(0, s - b.at);
  const flee = 1100 * since * since + 260 * since;
  return { x: p.x + w.x + b.dir.x * flee, y: p.y + w.y + b.dir.y * flee * 0.55 };
}

export type MinnowState =
  | { readonly kind: 'swimming'; readonly fish: WorldFish; readonly sparkle: number; readonly alarm: number }
  | { readonly kind: 'swallowed'; readonly fish: WorldFish; readonly stretch: number; readonly squash: number };

/** A glint off a minnow's flank now and then, 0 .. 1. */
function glint(m: Member, s: number): number {
  return Math.max(0, Math.sin(2 * Math.PI * (0.7 * s + m.sparkle))) ** 14;
}

/** The "!" a fish near you pops as the frenzy hits, 0 .. 1 (overshooting as it pops). */
function alarm(i: number, s: number): number {
  const b = BOLTS[i]!;
  if (b.at > FRENZY_AT + 0.25) return 0;
  const since = s - b.at + 0.04;
  if (since < 0 || since > 0.7) return 0;
  return (since < 0.1 ? 1.2 * clamp01(since / 0.1) : 1) * (1 - clamp01((since - 0.5) / 0.2));
}

const OFF = 120;
const inFrame = (p: { readonly x: number; readonly y: number }): boolean => p.x > 0 && p.x < 1080 && p.y > 0 && p.y < 1920;
const onStage = (p: { readonly x: number; readonly y: number }, length: number): boolean =>
  p.x > -length - OFF && p.x < 1080 + length + OFF && p.y > -OFF && p.y < 1920 + OFF;

export function schoolAt(t: number): MinnowState[] {
  const s = storyTime(t);
  if (s < SCHOOL_FROM || s >= SCHOOL_TO) return [];
  const out: MinnowState[] = [];
  MEMBERS.forEach((m, i) => {
    if (m.meal && s >= m.meal.at) return;
    const p = positionAt(i, s);
    const length = lengthOf(m.size);
    if (!onStage(p, length)) return;
    const h = 1 / 60;
    const a = positionAt(i, s - h);
    const b = positionAt(i, s + h);
    const vx = (b.x - a.x) / (2 * h) + DRIFT;
    const vy = (b.y - a.y) / (2 * h);
    const facing: 1 | -1 = s >= BOLTS[i]!.at && BOLTS[i]!.dir.x > 0 ? 1 : -1;
    const fish: WorldFish = {
      shape: 'minnow', x: p.x, y: p.y, length, facing,
      tilt: tiltFrom({ x: p.x, y: p.y, vx, vy }, length),
      beat: 2 * Math.PI * 4 * s + m.phase,
      effort: clamp01(0.4 + Math.hypot(vx, vy) / (6 * length)),
    };
    if (m.meal && s >= m.meal.at - SUCK) {
      const [pose, look] = suckedIn(asPose(fish), asPose(playerFish(t)), (s - (m.meal.at - SUCK)) / SUCK);
      out.push({ kind: 'swallowed', fish: { ...fish, x: pose.x, y: pose.y, length: pose.length, tilt: pose.tilt }, ...look });
      return;
    }
    out.push({ kind: 'swimming', fish, sparkle: inFrame(p) ? glint(m, s) : 0, alarm: alarm(i, s) });
  });
  return out;
}

/** For the tests: every member's place (on stage or not) at story time s. */
export const schoolPositions = (s: number): { readonly x: number; readonly y: number; readonly length: number; readonly eaten: boolean }[] =>
  MEMBERS.map((m, i) => ({ ...positionAt(i, s), length: lengthOf(m.size), eaten: m.meal !== null && s >= m.meal.at }));
