import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, ramp, window01 } from '../short';
import type { Cam } from './geom';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This starfish eats with its stomach outside its body": an ochre sea star
 * (Pisaster ochraceus) humps over a mussel, its tube feet pull the shell
 * halves apart until a gap as thin as a sheet of paper opens, then it pushes
 * its stomach out of its mouth into the shell, digests the mussel there and
 * pulls the stomach back in, leaving the shell empty.
 *
 * Every beat is a function of video time t (seconds) over a loop of LOOP_S,
 * timed to the narrator's words (words.ts). One tide pool, one sea star; the
 * camera moves between beats, and the mood (colour, camera, the star's arm
 * tips, the sounds) changes every sentence:
 *
 *   0     "This starfish eats with its stomach OUTSIDE its body!" (surprise):
 *         the star humped over a gaping mussel, its pale frilly stomach
 *         bulging out from underneath into the shell; it pulses on "OUTSIDE"
 *   2.95  ⏪ rewind: the stomach slips back in, the shell shuts
 *   3.35  "It tugs a mussel open," (effort): close on the tube feet pulling
 *         the shell halves apart, strain lines; a creak and a crack opens
 *   4.66  "a crack as thin as PAPER…" (tension): closer still on the crack, a
 *         sheet of paper slides in beside it for scale; cold blue, dark edges
 *   6.40  "then pushes its stomach out of its mouth and INTO the shell!"
 *         (excited): pull back; the stomach flows out of the mouth and into
 *         the gap; a punch-in on "INTO"
 *   9.70  "It digests dinner right there," (amused): the stomach glows,
 *         bubbles rise, the mussel shrinks away
 *   11.27 "like eating takeout in the parking lot." (sarcastic): an ink inset
 *         of a takeout box on a car's dashboard, the parking lot outside
 *   13.22 "Then it slurps its stomach back in." (gross-funny, cute): slurp!
 *         The shell is left empty and clean
 *   15.25 "Because yes," the star glides on to the next mussel, already
 *         gaping, and pushes its stomach out again: frame 1.
 */

/** The line boil steps at the game's 8 a second: 132 steps, 44 whole cycles a loop. */
const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Whole cycles a loop, as a phase in radians: wiggles that are where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}
/** When a word ends. */
export function ends(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.end / TEMPO;
}

export const STARFISH_AT = said('starfish');
export const STOMACH_AT = said('stomach');
export const OUTSIDE_AT = said('OUTSIDE');
export const BODY_END = ends('body!');
export const IT_AT = said('It');
export const TUGS_AT = said('tugs');
export const MUSSEL_AT = said('mussel');
export const OPEN_AT = said('open,');
export const A_AT = said('a', 2);
export const CRACK_AT = said('crack');
export const THIN_AT = said('thin');
export const PAPER_AT = said('PAPER…');
export const THEN_AT = said('then');
export const PUSHES_AT = said('pushes');
export const STOMACH2_AT = said('stomach', 2);
export const OUT_AT = said('out');
export const MOUTH_AT = said('mouth');
export const INTO_AT = said('INTO');
export const SHELL_AT = said('shell!');
export const IT2_AT = said('It', 2);
export const DIGESTS_AT = said('digests');
export const DINNER_AT = said('dinner');
export const THERE_END = ends('there,');
export const LIKE_AT = said('like');
export const TAKEOUT_AT = said('takeout');
export const PARKING_AT = said('parking');
export const LOT_END = ends('lot.');
export const THEN2_AT = said('Then');
export const SLURPS_AT = said('slurps');
export const STOMACH3_AT = said('stomach', 3);
export const BACK_AT = said('back');
export const IN_END = ends('in.');
export const BECAUSE_AT = said('Because');
export const YES_AT = said('yes,');

// ---------------------------------------------------------------- the rewind

/** The ⏪ back to before the meal, after "body!": the stomach slips in and the shell shuts. */
export const REWIND = { from: BODY_END + 0.03, to: IT_AT - 0.02 } as const;
/** The ⏪ over the picture, 0 .. 1. */
export const rewindAt = (t: number): number => window01(wrap(t), REWIND.from - 0.08, REWIND.to + 0.14, 0.18);

// ---------------------------------------------------------------- the meal

/**
 * How far the stomach is out, 0 (in, behind the mouth) .. 1 (spread through
 * the shell). Out in frame 1; rewound in; pushed out from "pushes" to
 * "shell!"; slurped in on "slurps"; pushed out again into the next mussel on
 * "yes," so the end is frame 1.
 */
const STOMACH_KEYS: readonly Key[] = [
  { t: 0, at: 1, rate: 0 },
  { t: REWIND.from, at: 1, rate: 0 },
  { t: REWIND.to, at: 0, rate: 0 },
  { t: PUSHES_AT - 0.05, at: 0, rate: 0 },
  { t: MOUTH_AT, at: 0.42 },
  { t: SHELL_AT + 0.15, at: 1, rate: 0 },
  { t: SLURPS_AT - 0.08, at: 1, rate: 0 },
  { t: STOMACH3_AT + 0.08, at: 0.06, rate: -0.35 },
  { t: BACK_AT, at: 0, rate: 0 },
  { t: YES_AT - 0.08, at: 0, rate: 0 },
  { t: LOOP_S, at: 1, rate: 0 },
];
export const stomachAt = (t: number): number => Math.max(0, Math.min(1, curveAt(STOMACH_KEYS, wrap(t)).at));

/** The stomach's throb, -1 .. 1, strongest on "OUTSIDE" (a whole number of throbs a loop, so it's where it started at the seam). */
export function throbAt(t: number): number {
  const u = wrap(t);
  const big = window01(u, OUTSIDE_AT - 0.15, BODY_END + 0.1, 0.25);
  return (0.35 + 0.65 * big) * Math.sin(cycles(22, u));
}

/**
 * The gape of the mussel being eaten, 0 shut .. 1 wide (frame 1). Rewound
 * shut, tugged open to a crack on "open,", held at a crack through "PAPER…",
 * forced wider as the stomach goes in, and gaping, empty, after the slurp.
 * Every other mussel gapes at 1 (the next one is already open).
 */
export const CRACK = 0.14;
const GAP_KEYS: readonly Key[] = [
  { t: 0, at: 1, rate: 0 },
  { t: REWIND.from, at: 1, rate: 0 },
  { t: REWIND.to, at: 0, rate: 0 },
  { t: TUGS_AT + 0.05, at: 0, rate: 0 },
  { t: OPEN_AT + 0.2, at: CRACK, rate: 0 },
  { t: PUSHES_AT, at: CRACK, rate: 0 },
  { t: SHELL_AT + 0.2, at: 0.62, rate: 0 },
  { t: SLURPS_AT, at: 0.7 },
  { t: IN_END, at: 1, rate: 0 },
  { t: LOOP_S, at: 1, rate: 0 },
];
export const gapAt = (t: number): number => Math.max(0, curveAt(GAP_KEYS, wrap(t)).at);

/** The tug: jolts in the gape as the tube feet heave, 0 .. 1 (shell creaking). */
export const heaveAt = (t: number): number => {
  const u = wrap(t);
  return window01(u, TUGS_AT - 0.05, A_AT + 0.2, 0.15) * (0.5 + 0.5 * Math.sin((u - TUGS_AT) * 2 * Math.PI * 2.6));
};

/** How hard the tube feet pull, 0 .. 1: hard through the tug, holding on through the crack. */
export const strainAt = (t: number): number => {
  const u = wrap(t);
  return Math.max(window01(u, IT_AT - 0.05, A_AT + 0.25, 0.2), 0.45 * window01(u, A_AT, THEN_AT + 0.2, 0.2));
};

/** What's left of the mussel being eaten, 1 .. 0: digested from "digests", slurped clean on "slurps". */
export const meatAt = (t: number): number => {
  const u = wrap(t);
  return 1 - 0.55 * ramp(u, DIGESTS_AT, THERE_END + 0.2) - 0.45 * ramp(u, SLURPS_AT, STOMACH3_AT + 0.2);
};

/** The stomach's digesting glow, 0 .. 1. */
export const glowAt = (t: number): number => window01(wrap(t), IT2_AT - 0.1, LIKE_AT + 0.35, 0.3);

/** The sheet of paper sliding in beside the crack: 0 off to the right .. 1 in place; and how much shows. */
export const paperAt = (t: number): { readonly slide: number; readonly alpha: number } => {
  const u = wrap(t);
  return { slide: ramp(u, THIN_AT - 0.2, PAPER_AT + 0.05) - ramp(u, THEN_AT + 0.2, THEN_AT + 0.4), alpha: window01(u, THIN_AT - 0.2, THEN_AT + 0.15, 0.15) };
};

/** The takeout inset, 0 .. 1. */
export const takeoutAt = (t: number): number => window01(wrap(t), LIKE_AT - 0.12, LOT_END + 0.3, 0.22);

/** The sparkle on the empty, clean shell. */
export const sparkleAt = (t: number): number => window01(wrap(t), BACK_AT - 0.05, BECAUSE_AT + 0.05, 0.2);

// ---------------------------------------------------------------- the star

/** Scene px between one mussel and the next along the rock. */
export const MUSSEL_SPACING = 1100;

/** The glide on to the next mussel after the slurp: the rock slides by under the star, 0 .. MUSSEL_SPACING. */
export const panAt = (t: number): number => MUSSEL_SPACING * ramp(wrap(t), IN_END - 0.06, YES_AT - 0.06);

/** The star lifting off the rock as it glides, 0 .. 1. */
export const liftAt = (t: number): number => window01(wrap(t), IN_END - 0.2, YES_AT + 0.12, 0.3);

/** A squash as the stomach snaps back in: + taller, - flatter. */
export const squashAt = (t: number): number => {
  const s = wrap(t) - (STOMACH3_AT + 0.05);
  if (s < 0 || s > 0.7) return 0;
  return 0.12 * Math.sin(s * 15) * (1 - s / 0.7) ** 2;
};

/**
 * The star's mood in its arm tips: how far they curl up off the rock, 0 flat
 * .. 1.5, and a wiggle. Up and curled for surprise and glee, pressed flat to
 * heave, still for the tension.
 */
const MOODS: readonly (readonly [number, number, number])[] = [
  // [from, curl, wiggle]
  [0, 1, 0.5],
  [IT_AT, 0.15, 0],
  [A_AT, 0.1, 0],
  [THEN_AT, 1.25, 0.6],
  [IT2_AT, 0.8, 0.4],
  [LIKE_AT, 0.5, 0.15],
  [THEN2_AT, 1.4, 0.9],
  [BECAUSE_AT, 1, 0.5],
];

function moodBlend(u: number, pick: (m: readonly [number, number, number]) => number): number {
  let value = pick(MOODS[0]!);
  for (const m of MOODS.slice(1)) value += (pick(m) - value) * ramp(u, m[0], m[0] + 0.35);
  return value;
}

export const curlAt = (t: number): number => moodBlend(wrap(t), (m) => m[1]);
export const wiggleAt = (t: number): number => moodBlend(wrap(t), (m) => m[2]) * Math.sin(cycles(11, t));

// ---------------------------------------------------------------- the grade

/** A wash colour, [r, g, b]. */
export type Rgb = readonly [number, number, number];

/** One mood's look: a soft-light wash over the frame, and the dark at the edges. */
export interface Grade {
  readonly wash: Rgb;
  readonly washA: number;
  readonly vignette: number;
}

const GRADES: readonly (readonly [number, Grade])[] = [
  [0, { wash: [255, 150, 90], washA: 0.16, vignette: 0.5 }], // surprise: warm
  [IT_AT, { wash: [130, 175, 90], washA: 0.22, vignette: 0.62 }], // effort: olive
  [A_AT, { wash: [50, 80, 175], washA: 0.32, vignette: 0.85 }], // tension: cold blue, dark edges
  [THEN_AT, { wash: [255, 175, 70], washA: 0.24, vignette: 0.42 }], // excited: bright warm
  [IT2_AT, { wash: [255, 215, 120], washA: 0.26, vignette: 0.48 }], // amused: gold
  [LIKE_AT, { wash: [150, 165, 190], washA: 0.3, vignette: 0.66 }], // sarcastic: flat grey-blue
  [THEN2_AT, { wash: [255, 125, 175], washA: 0.22, vignette: 0.5 }], // gross-funny: pink
  [BECAUSE_AT, { wash: [255, 150, 90], washA: 0.16, vignette: 0.5 }], // back to the hook
];

export function gradeAt(t: number): Grade {
  const u = wrap(t);
  let g = GRADES[0]![1];
  for (const [from, next] of GRADES.slice(1)) {
    const k = ramp(u, from - 0.1, from + 0.3);
    if (k <= 0) continue;
    g = {
      wash: [0, 1, 2].map((i) => g.wash[i]! + (next.wash[i]! - g.wash[i]!) * k) as unknown as Rgb,
      washA: g.washA + (next.washA - g.washA) * k,
      vignette: g.vignette + (next.vignette - g.vignette) * k,
    };
  }
  return g;
}

// ---------------------------------------------------------------- the camera

/** Where the camera's focus lands on screen: the middle of the frame, a little high (the captions sit below). */
export const CAM_AT = { x: 540, y: 800 } as const;

/** The camera's moves: [time, zoom, focus x, focus y], each passed smoothly. */
const SHOTS: readonly (readonly [number, number, number, number])[] = [
  [0, 1.3, 540, 925],
  [REWIND.from, 1.38, 540, 925],
  [REWIND.to, 1.3, 540, 925],
  // Close on the tube feet heaving at the shell.
  [TUGS_AT + 0.15, 2.0, 650, 1030],
  [OPEN_AT + 0.2, 2.1, 640, 1028],
  // Closer still on the crack.
  [CRACK_AT + 0.1, 2.35, 590, 1050],
  [THEN_AT - 0.05, 2.45, 590, 1052],
  // Pull back: the mouth, the stomach coming out of it and into the shell.
  [PUSHES_AT + 0.25, 1.6, 540, 975],
  [INTO_AT - 0.05, 1.62, 540, 980],
  [INTO_AT + 0.12, 1.82, 540, 995],
  [SHELL_AT + 0.4, 1.65, 540, 990],
  // Digesting: in a little, drifting.
  [IT2_AT + 0.2, 1.72, 520, 1000],
  [THERE_END, 1.8, 560, 998],
  // Room above for the takeout inset.
  [LIKE_AT + 0.2, 1.15, 540, 800],
  [LOT_END, 1.17, 540, 802],
  // The slurp, close.
  [THEN2_AT + 0.25, 1.85, 540, 960],
  [STOMACH3_AT, 1.95, 540, 955],
  [IN_END - 0.1, 1.55, 540, 1000],
  // Wide again for the glide and frame 1.
  [YES_AT - 0.15, 1.28, 540, 926],
  [LOOP_S, 1.3, 540, 925],
];

const channel = (i: 1 | 2 | 3): readonly Key[] =>
  SHOTS.map(([t, ...v], k): Key => (k === 0 || k === SHOTS.length - 1 ? { t, at: v[i - 1]!, rate: i === 1 ? 0.025 : 0 } : { t, at: v[i - 1]! }));
const ZOOM = channel(1);
const FX = channel(2);
const FY = channel(3);

/** A jolt of the picture, px: the punch-in on "INTO" and the heaves. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const u = wrap(t);
  const s = u - INTO_AT;
  const punch = s >= 0 && s < 0.4 ? 18 * (1 - s / 0.4) ** 2 : 0;
  const heave = 7 * heaveAt(u) * window01(u, TUGS_AT, A_AT, 0.1);
  return { x: punch * Math.sin(s * 95) + heave * Math.sin(u * 61), y: punch * 0.7 * Math.cos(s * 120) + heave * Math.cos(u * 47) };
}

export function camAt(t: number): Cam {
  const u = wrap(t);
  const j = shakeAt(u);
  return { zoom: curveAt(ZOOM, u).at, focus: { x: curveAt(FX, u).at, y: curveAt(FY, u).at }, at: { x: CAM_AT.x + j.x, y: CAM_AT.y + j.y } };
}
