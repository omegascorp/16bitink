import type { Pt } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import type { Fish } from './goldfish';
import { TEMPO, WORDS } from './words';

/**
 * "Your goldfish does NOT have a three-second memory": goldfish trained to
 * push a lever for food, which then only paid out during one hour a day,
 * learned to push it at that hour (Gee, Stephenson & Wright, University of
 * Plymouth, 1994), and goldfish keep what they learn for months. Told by a
 * narrator (words.ts) over two scenes side by side, a goldfish bowl at home
 * and a lab tank, the camera panning between them, every beat timed to the
 * words, a function of time in seconds over a loop of LOOP_S.
 *
 *   0     the hook: a goldfish in a round bowl, a "3-second memory?" tag
 *         and a stopwatch at 0:03; on "NOT" a red ink cross strikes the tag
 *   2.25  the camera pans to the lab: "Scientists": a lab-coat sleeve and a
 *         hand point out the lever on the tank wall; on "push" the goldfish
 *         nudges it and on "food" one pellet drops from the feeder
 *   5.7   "Then the lever only worked for one hour a day…": a clock, one
 *         hour shaded; the fish pushes outside it and gets a red ✕
 *   8.8   "…and the goldfish learned WHEN to push it": it waits by the lever
 *         watching the clock, the hand enters the hour on "WHEN", it pushes,
 *         a pellet drops with a bright ding
 *   11.0  "Goldfish can remember things for MONTHS": a calendar flips
 *         through the months while the clock spins and the fish pushes each
 *         time the hand comes round to its hour
 *   13.15 "So, for the record:": back to the bowl as it was at the start,
 *         and the loop finishes the sentence.
 */
export const LOOP_S = 15;

/** The line boil steps at the game's 8 a second: 120 steps, 40 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}
/** When a word of the voiceover ends, in voice.mp3. */
export function ended(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.end / TEMPO;
}

export const NOT_AT = said('NOT');
export const MEMORY_END = ended('memory.');
export const SCIENTISTS_AT = said('Scientists');
export const TAUGHT_AT = said('taught');
export const LAB_GOLDFISH_AT = said('goldfish', 2);
export const PUSH_AT = said('push');
export const LEVER_AT = said('lever');
export const FOOD_AT = said('food.');
export const THEN_AT = said('Then');
export const ONLY_AT = said('only');
export const ONE_AT = said('one');
export const HOUR_AT = said('hour');
export const DAY_AT = said('day…');
export const AND_AT = said('and');
export const WHEN_AT = said('WHEN');
export const PUSH_IT_AT = said('push', 2);
export const IT_AT = said('it.');
export const GOLDFISH_CAN_AT = said('Goldfish');
export const REMEMBER_AT = said('remember');
export const MONTHS_AT = said('MONTHS.');
export const SO_AT = said('So,');
export const RECORD_AT = said('record:');

/** A value keyed through the loop that comes round smoothly: keys in [0, LOOP_S), the last running on into the first. */
function looped(keys: readonly Key[]): (t: number) => number {
  const eased = keys.map((k) => ({ ...k, rate: k.rate ?? 0 }));
  const ext = [
    ...eased.slice(-2).map((k) => ({ ...k, t: k.t - LOOP_S })),
    ...eased,
    ...eased.slice(0, 2).map((k) => ({ ...k, t: k.t + LOOP_S })),
  ];
  return (t: number) => curveAt(ext, wrap(t)).at;
}

// ---------------------------------------------------------------- the camera

/** The lab stands one frame to the right of the bowl. */
export const LAB_X = 1080;
/**
 * Over to the lab as the hook's line ends, there for "Scientists"; home again on "So,". The pause
 * after "memory" is short, so the pan starts under the word's last syllable: 0.7 s keeps it under
 * 80 px a frame.
 */
export const PAN_IN_FROM = Math.min(MEMORY_END + 0.03, said('Scientists') - 0.65);
export const PAN_IN_TO = SCIENTISTS_AT + 0.05;
export const PAN_OUT_FROM = SO_AT - 0.4;
export const PAN_OUT_TO = SO_AT + 0.4;
/** How far the camera has moved right, px: 0 at the bowl, LAB_X at the lab. */
export const camAt = (t: number): number => LAB_X * (ramp(t, PAN_IN_FROM, PAN_IN_TO) - ramp(t, PAN_OUT_FROM, PAN_OUT_TO));

// ---------------------------------------------------------------- the bowl

/** The round bowl: its glass circle, the open top and the water line. */
export const BOWL = { x: 540, y: 775, r: 310, mouth: 165, water: 545 } as const;
export const BOWL_FISH_LEN = 250;

/**
 * Swimming right across the bowl in the hook, turning on "memory" and
 * heading back left; round again just before the loop. It turns mid-bowl,
 * where its fan tail clears the glass either way round.
 */
const bowlX = looped([
  { t: 0, at: 495, rate: 60 },
  { t: 1.6, at: 598, rate: 25 },
  { t: 2.1, at: 588, rate: -50 },
  { t: 3.4, at: 440, rate: -40 },
  { t: 13.0, at: 525, rate: -55 },
  { t: 14.2, at: 472, rate: -15 },
  { t: 14.7, at: 482, rate: 45 },
]);
const bowlFace = (t: number): number => (t < LOOP_S / 2 ? 1 - 2 * ramp(t, 1.6, 2.1) : -1 + 2 * ramp(t, 14.2, 14.7));

export function bowlFishAt(t: number): Fish {
  const face = bowlFace(t);
  return {
    x: bowlX(t),
    y: 790 + 16 * Math.sin((2 * Math.PI * 2 * t) / LOOP_S),
    len: BOWL_FISH_LEN,
    face,
    tilt: 0.05 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S + 0.6),
    beat: (2 * Math.PI * 16 * t) / LOOP_S,
    // Beating harder through each turn.
    effort: 0.35 + 0.4 * (1 - Math.abs(face)),
    jaw: 0,
    happy: false,
  };
}

/** The tag's red ink cross, struck on "NOT": two strokes, each 0 .. 1 drawn (off again once the camera has left). */
export function crossAt(t: number): readonly [number, number] {
  if (t > PAN_IN_TO + 0.5) return [0, 0];
  return [ramp(t, NOT_AT - 0.03, NOT_AT + 0.13), ramp(t, NOT_AT + 0.1, NOT_AT + 0.26)];
}
/** The tag sways a little on its string. */
export const tagSwayAt = (t: number): number => 0.035 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S);

// ---------------------------------------------------------------- the lab tank (lab coordinates)

/** Its bottom stands on the bench at the height of the shelf at home, so the two line up as the camera pans. */
export const TANK = { x0: 110, x1: 970, y0: 630, y1: 1077, water: 680, gravel: 1030 } as const;
/** The lever hangs from a pivot on the tank's right wall; `rest` and `push` are its swing, radians from straight down (towards the wall). */
export const LEVER = { pivot: { x: 915, y: 790 }, len: 105, paddle: 22, rest: -0.1, push: 0.26 } as const;
/** The feeder on the rim: pellets come out of its chute here. */
export const CHUTE = { x: 840, y: 692 } as const;
export const LAB_FISH_LEN = 250;

/** The pushes: the fish's nose reaches the paddle at each. The second is outside the hour and pays nothing. */
export const FAIL_AT = DAY_AT - 0.05;
export const PUSH3_AT = 11.88;
export const PUSH4_AT = 12.78;
export const PUSHES: readonly number[] = [PUSH_AT, FAIL_AT, PUSH_IT_AT, PUSH3_AT, PUSH4_AT];

/** The pellets that drop: out of the chute at `from`, eaten at `eaten` (the fish's nose is at the food then). */
export interface Drop {
  readonly from: number;
  readonly eaten: number;
}
export const DROPS: readonly Drop[] = [
  { from: FOOD_AT - 0.25, eaten: FOOD_AT + 0.45 },
  { from: PUSH_IT_AT + 0.15, eaten: PUSH_IT_AT + 0.8 },
  { from: PUSH3_AT + 0.1, eaten: PUSH3_AT + 0.52 },
  { from: PUSH4_AT + 0.1, eaten: PUSH4_AT + 0.54 },
];
/** Where a pellet is eaten: under the chute, at the fish's nose. */
export const EAT_AT_Y = 780;

/** How far a push has moved, 0 .. 1: in fast, then the lever swings back. */
const shoveAt = (t: number): number => Math.max(0, ...PUSHES.map((p) => ramp(t, p - 0.06, p + 0.08) - ramp(t, p + 0.12, p + 0.45)));
export const leverAngleAt = (t: number): number => LEVER.rest + (LEVER.push - LEVER.rest) * shoveAt(t);

export const paddleAt = (angle: number): Pt => ({
  x: LEVER.pivot.x + LEVER.len * Math.sin(angle),
  y: LEVER.pivot.y + LEVER.len * Math.cos(angle),
});

/** The fish's poses: nose on the paddle (pushing), nose at the food under the chute (eating), and waiting a little way back. */
const REST_PADDLE = paddleAt(LEVER.rest);
const PUSH_POSE = { x: REST_PADDLE.x - LEVER.paddle - LAB_FISH_LEN / 2, y: REST_PADDLE.y, tilt: 0 } as const;
const EAT_TILT = 0.25;
const EAT_POSE = {
  x: CHUTE.x - (LAB_FISH_LEN / 2) * Math.cos(EAT_TILT),
  y: EAT_AT_Y + (LAB_FISH_LEN / 2) * Math.sin(EAT_TILT),
  tilt: EAT_TILT,
} as const;
const WAIT_POSE = { x: PUSH_POSE.x - 74, y: PUSH_POSE.y, tilt: 0.14 } as const;

type Spot = readonly [t: number, x: number, y: number, tilt: number];
const pose = (t: number, p: { readonly x: number; readonly y: number; readonly tilt: number }): Spot => [t, p.x, p.y, p.tilt];

/** The lab fish leaves the chute after its first meal: on "Then", or a moment after the meal if "Then" comes first. */
const AFTER_MEAL_AT = Math.max(THEN_AT, DROPS[0]!.eaten + 0.3);

/** Where the lab fish is at each beat; it eases in and out of each spot. */
const SPOTS: readonly Spot[] = [
  [2.4, 300, 915, 0],
  [LAB_GOLDFISH_AT, 470, 905, 0],
  pose(PUSH_AT, PUSH_POSE),
  pose(DROPS[0]!.eaten, EAT_POSE),
  // Off the first meal before it laps the tank ("Then" follows "food" closely in this read).
  [AFTER_MEAL_AT, 700, 822, 0.1],
  [ONLY_AT + 0.05, 560, 852, -0.04],
  [ONE_AT, 600, 882, 0],
  pose(FAIL_AT, PUSH_POSE),
  pose(AND_AT + 0.1, WAIT_POSE),
  [WHEN_AT, WAIT_POSE.x - 4, WAIT_POSE.y, WAIT_POSE.tilt + 0.03],
  pose(PUSH_IT_AT, PUSH_POSE),
  pose(DROPS[1]!.eaten, EAT_POSE),
  [GOLDFISH_CAN_AT + 0.25, 705, 832, 0.15],
  pose(PUSH3_AT, PUSH_POSE),
  pose(DROPS[2]!.eaten, EAT_POSE),
  pose(PUSH4_AT, PUSH_POSE),
  pose(DROPS[3]!.eaten, EAT_POSE),
  [14.0, 700, 832, 0.15],
];
const labX = looped(SPOTS.map(([t, x]) => ({ t, at: x })));
const labY = looped(SPOTS.map(([t, , y]) => ({ t, at: y })));
const labTilt = looped(SPOTS.map(([t, , , tilt]) => ({ t, at: tilt })));

/** It turns round once, for a lap of the tank between the first meal and the push that fails. */
const TURN_FROM = AFTER_MEAL_AT - 0.05;
const TURN_BACK = ONLY_AT + 0.05;
const TURN_S = 0.42;
const labFace = (t: number): number => 1 - 2 * ramp(t, TURN_FROM, TURN_FROM + TURN_S) + 2 * ramp(t, TURN_BACK, TURN_BACK + TURN_S);

/** The mouth opens for each pellet as it reaches it, and the eyes smile shut after the first two meals. */
const jawAt = (t: number): number => Math.max(0, ...DROPS.map((d) => 0.32 * window01(t, d.eaten - 0.2, d.eaten + 0.08, 0.1)));
const happyAt = (t: number): boolean => DROPS.slice(0, 2).some((d) => t > d.eaten + 0.08 && t < d.eaten + 0.55);

export function labFishAt(t: number): Fish {
  const face = labFace(t);
  const shove = 26 * shoveAt(t);
  return {
    x: labX(t) + shove,
    y: labY(t) + 6 * Math.sin((2 * Math.PI * 5 * t) / LOOP_S),
    len: LAB_FISH_LEN,
    face,
    tilt: labTilt(t),
    beat: (2 * Math.PI * 22 * t) / LOOP_S,
    effort: 0.3 + 0.5 * clamp01(shove / 26) + 0.3 * (1 - Math.abs(face)),
    jaw: jawAt(t),
    happy: happyAt(t),
  };
}

/** A pellet's place (null before it drops and once it's eaten): out of the chute, then sinking slowly to where it is eaten. */
export function pelletAt(d: Drop, t: number): Pt | null {
  if (t < d.from || t >= d.eaten) return null;
  const u = (t - d.from) / (d.eaten - d.from);
  return { x: CHUTE.x + 5 * Math.sin(u * 5), y: lerp(CHUTE.y, EAT_AT_Y, 1 - (1 - u) ** 1.7) };
}

// ---------------------------------------------------------------- the scientist's hand

/** The hand reaches in from the right on "Scientists", taps the glass by the lever on "taught", and is gone as the fish pushes. */
export const handAt = (t: number): number => ramp(t, SCIENTISTS_AT - 0.2, TAUGHT_AT - 0.05) * (1 - ramp(t, PUSH_AT - 0.2, PUSH_AT + 0.35));
export const tapAt = (t: number): number => window01(t, TAUGHT_AT - 0.03, TAUGHT_AT + 0.32, 0.12);

// ---------------------------------------------------------------- the clock and the calendar

/** Its one hour: the lever pays out while the hand is between 2 and 3 o'clock. */
export const HOUR = { from: 2, to: 3 } as const;
export const inHour = (h: number): boolean => {
  const at = ((h % 12) + 12) % 12;
  return at >= HOUR.from && at < HOUR.to;
};
/** The clock pops up on "only", its hour shaded on "one hour", and stays until the camera has gone. */
export const clockShown = (t: number): number => window01(t, ONLY_AT - 0.15, PAN_OUT_TO + 0.4, 0.2);
export const hourShaded = (t: number): number => ramp(t, ONE_AT - 0.05, HOUR_AT + 0.25);

/**
 * The clock's hand, in hours (12 a turn): creeping round while the lever
 * fails, into the hour on "WHEN", then spinning as the months go by, in its
 * hour each time the fish pushes.
 */
const CLOCK_KEYS: readonly Key[] = [
  { t: ONLY_AT - 0.2, at: 10.3, rate: 0.75 },
  { t: WHEN_AT, at: 14, rate: 1.6 },
  { t: IT_AT + 0.5, at: 15.2, rate: 0.5 },
  { t: GOLDFISH_CAN_AT + 0.2, at: 15.6, rate: 2 },
  { t: PUSH3_AT - 0.03, at: 26, rate: 15 },
  { t: PUSH4_AT - 0.03, at: 38, rate: 12 },
  { t: PAN_OUT_FROM + 0.45, at: 43.5, rate: 2 },
  { t: PAN_OUT_TO + 0.4, at: 44, rate: 0 },
];
export const clockHandAt = (t: number): number => curveAt(CLOCK_KEYS, t).at;

/** The calendar pops up on "Goldfish can…" and flips a month at a time from "remember", faster and faster. */
export const MONTHS: readonly string[] = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'];
export const FLIPS: readonly number[] = [REMEMBER_AT, REMEMBER_AT + 0.3, REMEMBER_AT + 0.57, REMEMBER_AT + 0.82, REMEMBER_AT + 1.06];
export const FLIP_S = 0.24;
export const calendarShown = (t: number): number => window01(t, GOLDFISH_CAN_AT - 0.1, PAN_OUT_TO + 0.4, 0.2);

/** The month on top, and the page being flipped over it (0 .. 1), if one is. */
export function calendarAt(t: number): { readonly month: number; readonly flip: number | null } {
  const done = FLIPS.filter((f) => t >= f + FLIP_S).length;
  const flipping = FLIPS.find((f) => t >= f && t < f + FLIP_S);
  return { month: done, flip: flipping === undefined ? null : (t - flipping) / FLIP_S };
}

// ---------------------------------------------------------------- bubbles

/** A stream of bubbles rising from `x, bottom` to the surface at `top`, `count` at a time, each taking `period` s (a whole number a loop). */
export interface Stream {
  readonly x: number;
  readonly bottom: number;
  readonly top: number;
  readonly count: number;
  readonly period: number;
}
export const LAB_BUBBLES: Stream = { x: 236, bottom: TANK.gravel - 22, top: TANK.water + 6, count: 7, period: 2.5 };
export const BOWL_BUBBLES: Stream = { x: BOWL.x + 182, bottom: BOWL.y + 225, top: BOWL.water + 8, count: 3, period: 3.75 };

/** The stream's bubbles: where each is, and its radius. */
export function bubblesAt(s: Stream, t: number): readonly { readonly x: number; readonly y: number; readonly r: number }[] {
  return Array.from({ length: s.count }, (_, i) => {
    const u = (((t / s.period + i / s.count) % 1) + 1) % 1;
    return { x: s.x + 7 * Math.sin(u * 9 + i * 2.1), y: lerp(s.bottom, s.top, u), r: 4 + 5 * u + (i % 2) * 2 };
  });
}
