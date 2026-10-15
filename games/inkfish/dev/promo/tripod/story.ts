import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import { type Fish, FLOOR_Y, LIE_Y, mouthOf, type Pt, REST_BEAT, STAND_Y, STILTS, stiltAt, TRIPOD } from './body';
import { TEMPO, WORDS } from './words';

/**
 * "This fish stands on stilts": the tripodfish (Bathypterois grallator)
 * perches on the deep-sea mud on two pelvic fin rays and the lower ray of its
 * tail fin, the first pelvic ray longer than its body, facing into the
 * current with its front fins held forwards to feel for copepods drifting by
 * (it lives 878–4,720 m down, FishBase). Told by a narrator (words.ts), every
 * beat timed to the words, a function of time in seconds over a loop of LOOP_S.
 *
 *   0     standing tall on its three stilts, "stilts" labelled, front fins
 *         forwards; a copepod drifts into its mouth and it snaps it up
 *   2.3   "The tripodfish lives on the mud…": it lifts off, folds its rays back
 *         and sinks onto the mud with a puff of silt as the narrator says
 *         "floor"; a rattail swims by
 *   5.3   "…up to four and a half kilometres down": a depth gauge runs to
 *         4,500 m
 *   7.5   "It props itself up" (the payoff): the rays swing down, it rises
 *         and lands on them, stiff; "three fin rays" numbered 1, 2, 3; the front
 *         ray measured, swung up beside the body: longer
 *   10.6  "…and faces into the current": the current streams at its face
 *   12.1  "Its front fins reach forward like hands, feeling for tiny
 *         crustaceans": the fins sweep forwards and feel; a lens on a copepod
 *   17.1  "It lets the food come to it": the copepod drifts to its mouth, gulp,
 *         and "That's why" runs into "this fish stands on stilts".
 */
export const LOOP_S = 19.5;

/** The line boil steps at the game's 8 a second: 156 steps, 52 whole cycles a loop. */
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

/** A value keyed through the loop that comes round smoothly: keys in [0, LOOP_S), the last running on into the first. */
export function looped(keys: readonly Key[]): (t: number) => number {
  const eased = keys.map((k) => ({ ...k, rate: k.rate ?? 0 }));
  const ext = [
    ...eased.slice(-2).map((k) => ({ ...k, t: k.t - LOOP_S })),
    ...eased,
    ...eased.slice(0, 2).map((k) => ({ ...k, t: k.t + LOOP_S })),
  ];
  return (t: number) => curveAt(ext, wrap(t)).at;
}

// ---------------------------------------------------------------- the tripodfish

/** It lifts off on "The tripodfish", lands on the mud on "floor". */
export const LIFT_AT = said('The');
const HIGH_AT = LIFT_AT + 0.45;
export const LAND_AT = said('floor,');
/** It rises on "It props itself up" and lands on its stilts just before "on three". */
export const RISE_AT = said('It') - 0.2;
const TOP_AT = RISE_AT + 0.8;
const HOVER_TO = RISE_AT + 0.97;
export const STAND_AT = said('on', 3) - 0.04;

const bodyY = looped([
  { t: LIFT_AT, at: STAND_Y },
  { t: HIGH_AT, at: STAND_Y - 60 },
  { t: LAND_AT, at: LIE_Y },
  { t: RISE_AT, at: LIE_Y },
  { t: TOP_AT, at: STAND_Y - 55 },
  { t: HOVER_TO, at: STAND_Y - 55 },
  { t: STAND_AT, at: STAND_Y },
]);

const bodyTilt = looped([
  { t: LIFT_AT, at: 0 },
  { t: HIGH_AT, at: 0.06 },
  { t: (HIGH_AT + LAND_AT) / 2, at: -0.05 },
  { t: LAND_AT, at: 0 },
  { t: RISE_AT, at: 0 },
  { t: RISE_AT + 0.35, at: 0.07 },
  { t: STAND_AT, at: 0 },
]);

/** Its tail beats only while it swims, a whole number of beats each time, so it stands with its tail straight. */
const SINK_BEATS = 4;
const RISE_BEATS = 3;
const SWIM_TO = LAND_AT + 0.3;

export function tripodAt(t: number): Fish {
  const swim = window01(t, LIFT_AT - 0.1, SWIM_TO, 0.3) + window01(t, RISE_AT - 0.1, STAND_AT + 0.1, 0.2);
  return {
    x: TRIPOD.x,
    y: bodyY(t),
    len: TRIPOD.len,
    face: TRIPOD.face,
    tilt: bodyTilt(t),
    beat: REST_BEAT + 2 * Math.PI * (SINK_BEATS * smooth((t - LIFT_AT) / (SWIM_TO - LIFT_AT)) + RISE_BEATS * smooth((t - RISE_AT) / (STAND_AT - RISE_AT))),
    effort: 0.55 * swim,
    jaw: jawAt(t),
  };
}

/** How far its stilts are down, 0 folded back .. 1 standing: folded as it lifts off, swung down as it rises. */
export function stiltsDown(t: number): number {
  if (t < (LAND_AT + RISE_AT) / 2) return 1 - ramp(t, LIFT_AT + 0.2, LIFT_AT + 1.05);
  return ramp(t, RISE_AT + 0.45, RISE_AT + 0.85);
}

/** How far its front fins reach forwards, 0 laid back .. 1 held out: back while it swims, forwards on "reach forward". */
export const REACH_AT = said('reach');
export function finsForward(t: number): number {
  if (t < (LAND_AT + REACH_AT) / 2) return 1 - ramp(t, LIFT_AT, LIFT_AT + 0.6);
  return ramp(t, REACH_AT - 0.1, said('forward') + 0.35);
}

/** The fins' rays feeling about like fingers, from "hands" until the copepod has gone by. */
export const feelAt = (t: number): number => window01(t, said('hands,') - 0.1, said('It', 2) + 0.2, 0.3);
export const wiggleAt = (i: number, t: number): number => 0.07 * feelAt(t) * Math.sin(2 * Math.PI * 1.6 * t + i * 1.3);

/** The rays flash yellow as the narrator says "STILTS", and again, stiff, as it lands on them. */
const FLASHES = [said('STILTS.'), STAND_AT];
export const stiffAt = (t: number): number => Math.max(0, ...FLASHES.map((at) => {
  const u = (t - at) / 0.8;
  return u < 0 || u > 1 ? 0 : Math.min(1, u * 8) * (1 - u);
}));

/** Puffs of silt: under its belly as it lands, and at its three feet as it stands. */
export interface Puff {
  readonly at: number;
  readonly x: number;
  readonly spread: number;
}

/** The fish standing, as it is from the moment it lands on its stilts round to when it lifts off. */
export const STANDING: Fish = { x: TRIPOD.x, y: STAND_Y, len: TRIPOD.len, face: TRIPOD.face, tilt: 0, beat: REST_BEAT, effort: 0, jaw: 0 };

export const PUFFS: readonly Puff[] = [
  { at: LAND_AT - 0.04, x: TRIPOD.x - 20, spread: 300 },
  ...STILTS.map((s): Puff => ({ at: STAND_AT, x: stiltAt(s, STANDING, 1).foot.x, spread: 80 })),
];
export const PUFF_S = 1.1;

// ---------------------------------------------------------------- food

/** It eats twice: one copepod just after the loop starts, and the one it felt for, on "…come to it". */
export const EAT_A = said('fish') + 0.3;
export const EAT_B = said('it.') + 0.05;
const EATS = [EAT_A, EAT_B];

/** Time since `at`, folded into (-LOOP_S/2, LOOP_S/2]. */
const since = (t: number, at: number): number => {
  const d = wrap(t - at);
  return d > LOOP_S / 2 ? d - LOOP_S : d;
};

function jawAt(t: number): number {
  return Math.max(
    ...EATS.map((e) => {
      const d = since(t, e);
      return d < 0 ? 0.75 * ramp(d, -0.32, -0.1) : 0.75 * (1 - ramp(d, 0, 0.07));
    }),
  );
}

/** The snap of a bite, 0 .. 1 over its life (outside: none). */
export const snapAt = (t: number): number => Math.max(-1, ...EATS.map((e) => {
  const u = since(t, e) / 0.3;
  return u >= 0 && u <= 1 ? u : -1;
}));

/** Where the mouth is when it stands (both meals are eaten standing). */
const MOUTH = mouthOf(STANDING);

/** A copepod: where it is, how big (it shrinks as it goes in), and which way its head points (radians). */
export interface Copepod extends Pt {
  readonly size: number;
  readonly heading: number;
}

/** The first meal drifts in from the left over the loop point. */
const A_FROM = { t: 18.75, x: 215, y: 470 } as const;

/** The second: in with the current as the fins go forwards, into the rays on "feeling", along them, and on to its mouth. */
const B_KEYS = {
  x: [{ t: 12.9, at: -40 }, { t: 14.5, at: 228 }, { t: 15.4, at: 246 }, { t: 16.5, at: 262 }, { t: 17.6, at: 272 }, { t: EAT_B, at: MOUTH.x }],
  y: [{ t: 12.9, at: 300 }, { t: 14.5, at: 392 }, { t: 15.4, at: 404 }, { t: 16.5, at: 440 }, { t: 17.6, at: 488 }, { t: EAT_B, at: MOUTH.y }],
} as const;
export const B_FROM = B_KEYS.x[0]!.t;

/** The last moments: pulled into the mouth, shrinking. */
const gulp = (p: Copepod, eatAt: number, t: number): Copepod => {
  const u = clamp01((t - (eatAt - 0.14)) / 0.14);
  return { ...p, x: lerp(p.x, MOUTH.x, u), y: lerp(p.y, MOUTH.y, u), size: p.size * (1 - 0.7 * u) };
};

export type MealId = 'a' | 'b';

export function mealAt(id: MealId, t: number): Copepod | null {
  if (id === 'a') {
    const d = wrap(t - A_FROM.t);
    const span = wrap(EAT_A - A_FROM.t);
    if (d >= span) return null;
    const u = smooth(d / span) * 0.7 + 0.3 * (d / span);
    const p = { x: lerp(A_FROM.x, MOUTH.x, u), y: lerp(A_FROM.y, MOUTH.y, u) + 8 * Math.sin(d * 5), size: 1, heading: -0.4 };
    return gulp(p, A_FROM.t + span, A_FROM.t + d);
  }
  if (t < B_FROM || t >= EAT_B) return null;
  const x = curveAt(B_KEYS.x, t);
  const y = curveAt(B_KEYS.y, t);
  // Drifting with the current, tail first: the head points back up-current, away from where it drifts.
  const p = { x: x.at + 6 * Math.sin(t * 4.1), y: y.at + 5 * Math.sin(t * 3.3), size: 1, heading: Math.atan2(-y.rate, -x.rate) };
  return gulp(p, EAT_B, t);
}

/** Other copepods and specks drifting by on the current, clear of its head: each crosses the picture a whole number of times a loop. */
export const DRIFTERS = [
  { x0: 120, y: 320, laps: 1, bob: 0.4, size: 0.7 },
  { x0: 760, y: 360, laps: 2, bob: 1.7, size: 0.6 },
  { x0: 420, y: 800, laps: 1, bob: 2.6, size: 0.8 },
  { x0: 980, y: 880, laps: 2, bob: 3.3, size: 0.65 },
  { x0: 300, y: 960, laps: 1, bob: 4.4, size: 0.75 },
  { x0: 640, y: 1030, laps: 2, bob: 5.2, size: 0.6 },
  { x0: 860, y: 740, laps: 1, bob: 0.9, size: 0.55 },
] as const;
const SPAN = 1080 + 160;

export function drifterAt(i: number, t: number): Copepod {
  const d = DRIFTERS[i]!;
  const x = ((((d.x0 + (d.laps * SPAN * t) / LOOP_S) % SPAN) + SPAN) % SPAN) - 80;
  return { x, y: d.y + 14 * Math.sin((2 * Math.PI * 2 * t) / LOOP_S + d.bob), size: d.size, heading: Math.PI + 0.3 * Math.sin(d.bob) };
}

// ---------------------------------------------------------------- the rattail

/** A rattail cruising past above the mud while the tripodfish lies on it: everything else down here swims. */
const RAT_FROM = LIFT_AT + 0.1;
const RAT_TO = RISE_AT + 0.6;
export const RATTAIL = { y: 860, len: 230 } as const;

export function rattailAt(t: number): Fish | null {
  if (t < RAT_FROM || t > RAT_TO) return null;
  const u = (t - RAT_FROM) / (RAT_TO - RAT_FROM);
  return { x: lerp(1300, -300, u), y: RATTAIL.y + 10 * Math.sin(t * 1.7), len: RATTAIL.len, face: -1, tilt: 0.03 * Math.sin(t * 1.7 + 1), beat: t * 9, effort: 0.45, jaw: 0 };
}

export { FLOOR_Y };
