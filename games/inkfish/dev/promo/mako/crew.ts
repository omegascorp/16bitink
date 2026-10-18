import { lerp, ramp } from '../short';
import { ANGLERS_AT, CRASH_HOOK, CRASH_2013, CUT_AT, HOOKED_AT, LOOP_S, take } from './beats';
import { EXIT_2013, EXIT_HOOK } from './shark';

/**
 * The boat and the two anglers on it, through the one long take (take time,
 * beats.ts). The boat floats at world x 0 on the surface, bow left; it rocks
 * gently, and hard when the mako lands on its bow. The anglers stand in the
 * cockpit astern of the cabin: A with the rod, B beside him. The boat's own
 * frame is world px before it rocks.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** The boat's roll (screen radians, negative dips the bow) and heave (px down). */
export interface BoatPose {
  readonly roll: number;
  readonly heave: number;
}

/** Gentle swell: whole cycles a loop. */
const SWAY_CYCLES = 2;
const BOB_CYCLES = 3;

/** The bow slams down and the boat rocks it off, dying away in about three seconds. */
function slam(v: number, at: number): { readonly roll: number; readonly heave: number } {
  const s = v - at;
  if (s < 0 || s > 3.2) return { roll: 0, heave: 0 };
  const fade = Math.exp(-1.5 * s) * (1 - ramp(s, 2.6, 3.2));
  return { roll: -0.085 * fade * Math.sin(2 * Math.PI * 1.1 * s + 0.35) , heave: 16 * Math.exp(-3 * s) * Math.sin(2 * Math.PI * 1.4 * s + 0.4) };
}

export function boatAt(t: number): BoatPose {
  const v = take(t);
  const a = slam(v, CRASH_2013);
  const b = slam(v, CRASH_HOOK);
  return {
    roll: 0.014 * Math.sin((2 * Math.PI * SWAY_CYCLES * v) / LOOP_S) + a.roll + b.roll,
    heave: 4 * Math.sin((2 * Math.PI * BOB_CYCLES * v) / LOOP_S + 1) + a.heave + b.heave,
  };
}

/** A point in the boat's frame, in the world as the boat rocks. */
export function onBoat(b: BoatPose, p: Pt): Pt {
  const c = Math.cos(b.roll);
  const s = Math.sin(b.roll);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c + b.heave };
}

// ---------------------------------------------------------------- the anglers

/** The deck in the cockpit, boat frame. */
export const DECK_Y = -80;
/** The cabin's after wall and roof edge, boat frame (boat.ts draws it). */
export const CABIN = { front: -40, back: 228, roof: -206 } as const;

/** Joints relative to the feet (boat frame px), for one pose. */
export interface Body {
  readonly feet: number;
  readonly hip: Pt;
  readonly neck: Pt;
  readonly head: Pt;
  readonly elbows: readonly [Pt, Pt];
  readonly hands: readonly [Pt, Pt];
  readonly knees: readonly [Pt, Pt];
  readonly toes: readonly [Pt, Pt];
}

const P = (x: number, y: number): Pt => ({ x, y });

/** A's poses: fishing (rod forward), fighting (leaning back on a bent rod), alarmed, clinging to the cabin. */
const A_FISH: Body = { feet: 300, hip: P(0, -48), neck: P(-6, -90), head: P(-9, -104), elbows: [P(-16, -62), P(-24, -74)], hands: [P(-28, -70), P(-40, -84)], knees: [P(-6, -24), P(6, -24)], toes: [P(-12, 0), P(10, 0)] };
const A_FIGHT: Body = { feet: 306, hip: P(4, -46), neck: P(16, -86), head: P(20, -100), elbows: [P(0, -66), P(-6, -76)], hands: [P(-14, -70), P(-26, -84)], knees: [P(-8, -24), P(12, -26)], toes: [P(-18, 0), P(14, 0)] };
const A_ALARM: Body = { feet: 304, hip: P(2, -48), neck: P(8, -90), head: P(10, -105), elbows: [P(-12, -70), P(-4, -82)], hands: [P(-24, -74), P(-34, -88)], knees: [P(-6, -24), P(8, -24)], toes: [P(-14, 0), P(12, 0)] };
const A_CLING: Body = { feet: 262, hip: P(10, -40), neck: P(-12, -78), head: P(-20, -92), elbows: [P(-20, -100), P(-8, -96)], hands: [P(-30, -122), P(-22, -124)], knees: [P(-6, -22), P(16, -20)], toes: [P(-10, 0), P(18, 0)] };

/** B's poses: watching, pointing at the line, arms up in alarm, hanging on to A. */
const B_WATCH: Body = { feet: 352, hip: P(0, -48), neck: P(-3, -90), head: P(-5, -105), elbows: [P(-12, -66), P(10, -66)], hands: [P(-10, -50), P(12, -50)], knees: [P(-5, -24), P(6, -24)], toes: [P(-11, 0), P(10, 0)] };
const B_POINT: Body = { feet: 352, hip: P(0, -48), neck: P(-5, -90), head: P(-8, -105), elbows: [P(-26, -82), P(10, -66)], hands: [P(-50, -88), P(12, -50)], knees: [P(-5, -24), P(6, -24)], toes: [P(-11, 0), P(10, 0)] };
const B_ALARM: Body = { feet: 356, hip: P(2, -48), neck: P(6, -90), head: P(8, -106), elbows: [P(-14, -104), P(24, -104)], hands: [P(-20, -128), P(30, -128)], knees: [P(-5, -24), P(8, -24)], toes: [P(-12, 0), P(12, 0)] };
const B_CLING: Body = { feet: 300, hip: P(12, -42), neck: P(-6, -80), head: P(-10, -95), elbows: [P(-20, -78), P(-14, -70)], hands: [P(-34, -88), P(-30, -80)], knees: [P(-4, -22), P(18, -22)], toes: [P(-8, 0), P(20, 0)] };

const mix = (a: Pt, b: Pt, u: number): Pt => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
const pair = (a: readonly [Pt, Pt], b: readonly [Pt, Pt], u: number): readonly [Pt, Pt] => [mix(a[0], b[0], u), mix(a[1], b[1], u)];

function blend(a: Body, b: Body, u: number): Body {
  return {
    feet: lerp(a.feet, b.feet, u),
    hip: mix(a.hip, b.hip, u),
    neck: mix(a.neck, b.neck, u),
    head: mix(a.head, b.head, u),
    elbows: pair(a.elbows, b.elbows, u),
    hands: pair(a.hands, b.hands, u),
    knees: pair(a.knees, b.knees, u),
    toes: pair(a.toes, b.toes, u),
  };
}

/** A pose sequence: [time, pose], blended over `fade` s into each. */
function sequence(v: number, steps: readonly (readonly [number, Body])[], fade: number): Body {
  let body = steps[0]![1];
  for (let i = 1; i < steps.length; i++) {
    const [at, next] = steps[i]!;
    const u = ramp(v, at, at + fade);
    if (u <= 0) break;
    body = blend(body, next, u);
  }
  return body;
}

/** The scramble back to the cabin: a hop over SCRAMBLE_S after each crash. */
const SCRAMBLE_S = 0.3;
const hopOf = (v: number): number => {
  for (const c of [CRASH_2013, CRASH_HOOK]) {
    const s = (v - c) / SCRAMBLE_S;
    if (s > 0 && s < 1) return 26 * Math.sin(Math.PI * s);
  }
  return 0;
};

export interface Angler {
  /** The pose, in the boat's frame: joints relative to (feet, DECK_Y). */
  readonly body: Body;
  /** Up off the deck as they scramble, px. */
  readonly lift: number;
  /** Shaking with fright, px. */
  readonly shiver: number;
  /** The "!" over the head, 0 .. 1 (overshooting as it pops). */
  readonly alarm: number;
}

/** "!" popping in at `at` and fading out after `hold` s. */
function popAt(v: number, at: number, hold: number): number {
  const s = v - at;
  if (s < 0 || s > hold) return 0;
  const pop = s < 0.18 ? 1.2 * Math.sin((Math.PI / 2) * (s / 0.18)) : 1 + 0.2 * Math.exp(-(s - 0.18) * 10);
  return Math.min(pop, 1 - ramp(s, hold - 0.25, hold));
}

const alarmOf = (v: number, delay: number): number =>
  Math.max(popAt(v, EXIT_2013 + 0.05 + delay, 1.25), popAt(v, EXIT_HOOK + 0.12 + delay, 1.9), popAt(v, CRASH_HOOK + delay, 0.6));

/** Shivering while they cling on. */
const shiverOf = (v: number, phase: number): number => {
  const on = Math.max(ramp(v, CRASH_2013 + 0.3, CRASH_2013 + 0.5), 0) * (1 - ramp(v, CUT_AT + LOOP_S - 0.5, CUT_AT + LOOP_S));
  return on * 1.6 * Math.sin(2 * Math.PI * 9 * v + phase);
};

export function anglerAt(t: number, who: 'A' | 'B'): Angler {
  const v = take(t);
  const hop = hopOf(v) * (who === 'A' ? 1 : 0.8);
  const body = who === 'A'
    ? sequence(v, [[CUT_AT, A_FISH], [HOOKED_AT, A_FIGHT], [CRASH_2013, A_CLING], [EXIT_HOOK + 0.1, A_ALARM], [EXIT_HOOK + 0.7, A_CLING]], 0.22)
    : sequence(v, [[CUT_AT, B_WATCH], [ANGLERS_AT, B_POINT], [EXIT_2013, B_ALARM], [CRASH_2013, B_CLING], [EXIT_HOOK + 0.15, B_ALARM], [CRASH_HOOK - 0.2, B_CLING]], 0.22);
  return { body, lift: hop, shiver: shiverOf(v, who === 'A' ? 0 : 2), alarm: alarmOf(v, who === 'A' ? 0 : 0.1) };
}

// ---------------------------------------------------------------- the rod

/** The rod: whole and bending to the line, or snapped when the mako lands. */
export interface Rod {
  /** 0 straight .. 1 bent double. */
  readonly bend: number;
  /** Snapped: only the butt is left in his hands, the tip dangling from it. */
  readonly broken: boolean;
  /** The line from the tip to the mako's mouth: 0 slack .. 1 taut, or null once it's gone. */
  readonly line: number | null;
  /** The dangling tip's swing, radians. */
  readonly swing: number;
}

export function rodAt(t: number): Rod {
  const v = take(t);
  if (v >= CRASH_2013) {
    const s = v - CRASH_2013;
    return { bend: 0, broken: true, line: null, swing: 0.5 * Math.exp(-0.8 * Math.min(s, 6)) * Math.sin(2 * Math.PI * 0.9 * s) + 0.08 * Math.sin(2 * Math.PI * (2 * v) / LOOP_S) };
  }
  const hooked = ramp(v, HOOKED_AT, HOOKED_AT + 0.12);
  return { bend: 0.2 + 0.6 * hooked + 0.1 * hooked * Math.sin(2 * Math.PI * 5 * v), broken: false, line: hooked, swing: 0 };
}
