import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, lerp, ramp, smooth, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This fish has HUMAN teeth": the sheepshead (Archosargus probatocephalus)
 * of the US Atlantic and Gulf coasts, whose front teeth look like ours, with
 * rows of molars behind them (three rows on top, two below) for crushing
 * shells. Told by a narrator (words.ts), every beat timed to the words, a
 * function of time in seconds over a loop of LOOP_S.
 *
 *   0     "This fish has HUMAN teeth." (nervous): a big close-up of a striped
 *         sheepshead's face against a dark-green pier piling, lips parted in an
 *         uncanny smile over a row of very human front teeth; the smile widens
 *         on "HUMAN" (creak, squelch)
 *   2.45  "Front teeth like ours… and rows of molars behind them!" (curious): the
 *         camera pushes in, the mouth opens wide, and the molars behind are
 *         revealed row by row (a tick each), three on top, two below; "molars"
 *   5.84  "It's a sheepshead, and it crunches crabs, oysters, even barnacles
 *         right off the pier!" (surprised): out to the fish at a barnacle-crusted
 *         piling; "sheepshead"; a crab, an oyster, then barnacles crunched like
 *         crackers, crumbs flying; up to the pier on "pier!"
 *   11.4  "Its stripes earned it a nickname: the convict fish." (chuckles): its
 *         bars darken one by one, it turns black and white in front of a mugshot
 *         height board; a cap and a "CONVICT FISH" board, a flash; jail bars slam
 *   14.33 "Honestly? Better teeth than most people." (sarcastic): back on its
 *         face, smug, under a dentist's lamp; a dentist's mirror, a sparkle "ding"
 *         on its teeth; three snapshots of people's (imperfect) grins
 *   16.73 "Still… no kisses." (softly): it puckers up at the camera, heart-shaped
 *         bubbles rise; an ink hand gently pushes its lips away
 *   18.74 "Because": it grins at the camera again, frame 1.
 */

/** The line boil steps at the game's 8 a second: 156 steps, 52 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Whole cycles a loop, as a phase in radians at time t: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const HUMAN_AT = said('HUMAN');
export const FRONT_AT = said('Front');
export const OURS_AT = said('ours…');
export const AND_AT = said('and');
export const ROWS_AT = said('rows');
export const MOLARS_AT = said('molars');
export const BEHIND_AT = said('behind');
export const THEM_AT = said('them!');
export const ITS_A_AT = said("It's");
export const SHEEPSHEAD_AT = said('sheepshead,');
export const CRABS_AT = said('crabs,');
export const OYSTERS_AT = said('oysters,');
export const BARNACLES_AT = said('barnacles');
export const RIGHT_AT = said('right');
export const PIER_AT = said('pier!');
export const STRIPES_ITS_AT = said('Its');
export const STRIPES_AT = said('stripes');
export const NICKNAME_AT = said('nickname:');
export const CONVICT_AT = said('convict');
export const CONVICT_FISH_AT = said('fish.');
export const HONESTLY_AT = said('Honestly?');
export const BETTER_AT = said('Better');
export const BETTER_TEETH_AT = said('teeth', 2);
export const MOST_AT = said('most');
export const STILL_AT = said('Still…');
export const NO_AT = said('no');
export const KISSES_AT = said('kisses.');
export const BECAUSE_AT = said('Because');

// ---------------------------------------------------------------- the world

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** The barnacle-crusted piling the fish feeds on (world px), and the sea's surface, under the pier's deck. */
export const PILING = { left: -790, right: -520 } as const;
export const SURFACE_Y = -1000;
export const DECK = { bottom: -1090, top: -1150 } as const;

/** What it crunches, on the piling's face, and when its jaws shut on each. */
export const CRAB = { x: -535, y: -420 } as const;
export const OYSTER = { x: -545, y: -90 } as const;
export const BARNACLES = { x: -550, y: 230 } as const;
export const CRAB_BITE = CRABS_AT + 0.05;
export const OYSTER_BITE = OYSTERS_AT + 0.16;
export const BARNACLE_BITES = [BARNACLES_AT + 0.12, BARNACLES_AT + 0.42] as const;

// ---------------------------------------------------------------- camera

/** The camera: the world point at FOCUS on screen, and the zoom. */
export interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export const FOCUS = { x: 540, y: 860 } as const;
export const toScreen = (v: View, p: Pt): Pt => ({ x: FOCUS.x + (p.x - v.x) * v.zoom, y: FOCUS.y + (p.y - v.y) * v.zoom });

/** Frame 1: the face, big, the mouth left of centre and the eye up right. */
export const CAM0: View = { x: 112, y: 19, zoom: 1.6 };
const CAM_HOOK: View = { x: 104, y: 24, zoom: 1.74 };
const CAM_MOUTH: View = { x: 0, y: 132, zoom: 2.4 };
const CAM_PILING: View = { x: 30, y: -300, zoom: 0.64 };
const CAM_PIER: View = { x: 30, y: -500, zoom: 0.64 };
const CAM_MUG: View = { x: 730, y: 175, zoom: 0.53 };
const CAM_DENTIST: View = { x: 80, y: -27, zoom: 1.5 };
const CAM_KISS: View = { x: 12, y: -35, zoom: 1.7 };

/** Where the camera is at each key; it eases between consecutive keys (two equal keys hold). */
const CAMERA: readonly (readonly [number, View])[] = [
  [0, CAM0],
  [1.9, CAM_HOOK],
  [FRONT_AT - 0.05, CAM_HOOK],
  [OURS_AT + 0.3, CAM_MOUTH],
  [ITS_A_AT - 0.2, { ...CAM_MOUTH, zoom: 2.48 }],
  [SHEEPSHEAD_AT + 0.35, CAM_PILING],
  [CRAB_BITE + 0.2, CAM_PILING],
  [OYSTER_BITE + 0.1, { ...CAM_PILING, y: -10 }],
  [BARNACLES_AT, { ...CAM_PILING, y: 280 }],
  [BARNACLE_BITES[1] + 0.05, { ...CAM_PILING, y: 280 }],
  [PIER_AT + 0.4, CAM_PIER],
  [STRIPES_ITS_AT - 0.15, CAM_PIER],
  [STRIPES_AT + 0.45, CAM_MUG],
  [HONESTLY_AT - 0.05, { ...CAM_MUG, zoom: 0.55 }],
  [HONESTLY_AT + 0.55, CAM_DENTIST],
  [STILL_AT - 0.1, { ...CAM_DENTIST, zoom: 1.56 }],
  [STILL_AT + 0.7, CAM_KISS],
  [BECAUSE_AT - 0.1, { ...CAM_KISS, zoom: 1.66 }],
  [LOOP_S - 0.3, CAM0],
  [LOOP_S, CAM0],
];

export function cameraAt(t: number): View {
  const u = wrap(t);
  let i = 0;
  while (i < CAMERA.length - 2 && u > CAMERA[i + 1]![0]) i++;
  const [t0, a] = CAMERA[i]!;
  const [t1, b] = CAMERA[i + 1]!;
  const k = smooth((u - t0) / (t1 - t0));
  // Zoom eases in log space, so a big zoom change feels even all the way.
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), k)) };
}

/** A gentle jolt on each crunch, the slam of the bars and the push (screen px). */
export function shakeAt(t: number): Pt {
  const u = wrap(t);
  const hits = [CRAB_BITE, OYSTER_BITE, ...BARNACLE_BITES, CONVICT_FISH_AT + 0.24, KISSES_AT + 0.02];
  let x = 0;
  let y = 0;
  hits.forEach((h, i) => {
    const d = u - h;
    if (d < 0 || d > 0.35) return;
    const k = (1 - d / 0.35) ** 2 * (i === 4 ? 16 : 9);
    x += k * Math.sin(d * 80 + i);
    y += k * Math.cos(d * 63 + i * 2);
  });
  return { x, y };
}

// ---------------------------------------------------------------- the fish

/** Everything that moves on the fish at one moment. */
export interface FishPose {
  /** Where its mouth is (world px), its tilt (radians, + noses down), its size. */
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  readonly scale: number;
  /** Squashed against the hand (0 none). */
  readonly squash: number;
  /** Lips pulled back off the teeth (0 shut .. 1 every tooth bare). */
  readonly lips: number;
  /** The jaw dropped (0 teeth together .. 1 wide open). */
  readonly jaw: number;
  /** Mouth corners up (0 .. 1). */
  readonly smile: number;
  /** Lips puckered for a kiss (0 .. 1). */
  readonly pucker: number;
  /** Molar rows shown (0 .. 5, fractional while one pops in): three top rows, then two bottom. */
  readonly rows: number;
  /** The upper eyelid down (0 open .. 1 shut), shut in a happy curve (0 .. 1), the pupil shrunk in alarm (0 .. 1). */
  readonly lid: number;
  readonly happy: number;
  readonly wide: number;
  /** Where the pupil looks (-1 .. 1 each way; -x is forwards, towards the camera). */
  readonly lookX: number;
  readonly lookY: number;
  /** The brow: -1 worried (raised at the front) .. 1 smug (low and flat). */
  readonly brow: number;
  /** Turned black and white like a prison uniform (0 .. 1), and how much each bar is lit up (by bar). */
  readonly convict: number;
  readonly barGlow: readonly number[];
}

/** A value that holds at each key's value and eases to the next over `fade` s from the key's time ([time, value] in order, the first at 0). */
function steps(u: number, keys: readonly (readonly [number, number])[], fade: number): number {
  let v = keys[0]![1];
  for (let i = 1; i < keys.length; i++) v = lerp(v, keys[i]![1], ramp(u, keys[i]![0], keys[i]![0] + fade));
  return v;
}

/** A move from one value to another over [from, to], smoothly. */
const go = (t: number, from: number, to: number, a: number, b: number): number => lerp(a, b, ramp(t, from, to));

/** Where the mouth swims during the feeding beat: in to the crab, down to the oyster, to the barnacles, and home. */
function feedPos(u: number): { x: number; y: number; tilt: number } {
  const home = { x: 0, y: 0, tilt: 0 };
  const crab = { x: CRAB.x + 265, y: CRAB.y + 10, tilt: 0.06 };
  const oyster = { x: OYSTER.x + 250, y: OYSTER.y + 5, tilt: 0.02 };
  const barn = { x: BARNACLES.x + 240, y: BARNACLES.y, tilt: -0.08 };
  const rise = { x: BARNACLES.x + 300, y: -230, tilt: 0.12 };
  const legs: readonly (readonly [number, number, { x: number; y: number; tilt: number }])[] = [
    [ITS_A_AT - 0.1, SHEEPSHEAD_AT + 0.6, crab],
    [CRAB_BITE + 0.25, OYSTER_BITE - 0.3, oyster],
    [OYSTER_BITE + 0.25, BARNACLE_BITES[0] - 0.25, barn],
    [BARNACLE_BITES[1] + 0.3, PIER_AT + 0.4, rise],
    [STRIPES_ITS_AT - 0.3, STRIPES_AT + 0.5, home],
  ];
  let p = home;
  let prev = home;
  for (const [from, to, target] of legs) {
    const k = ramp(u, from, to);
    p = { x: lerp(prev.x, target.x, k), y: lerp(prev.y, target.y, k), tilt: lerp(prev.tilt, target.tilt, k) };
    if (u < to) break;
    prev = target;
  }
  return p;
}

/** A snap forward and back for a bite at `at` (0 .. 1). */
const lungeAt = (u: number, at: number): number => (u < at ? ramp(u, at - 0.22, at) : 1 - ramp(u, at + 0.05, at + 0.35));

/** The jaw for a bite: opens just before `at`, snaps shut on it. */
const biteJaw = (u: number, at: number): number => (u < at ? 0.75 * ramp(u, at - 0.3, at - 0.12) * (1 - ramp(u, at - 0.06, at)) : 0);

const BITES = [CRAB_BITE, OYSTER_BITE, ...BARNACLE_BITES];

/** Molar rows popping in, a tick each: three top rows, then the two bottom ones. */
export const ROW_TIMES = [AND_AT + 0.02, ROWS_AT + 0.06, MOLARS_AT + 0.08, BEHIND_AT + 0.08, THEM_AT + 0.02] as const;

export function fishAt(t: number): FishPose {
  const u = wrap(t);
  const feed = feedPos(u);
  const lunge = Math.max(...BITES.map((b) => lungeAt(u, b)));
  // The kiss: it leans in at the camera, then the hand pushes it back.
  const lean = window01(u, STILL_AT, BECAUSE_AT + 0.4, 0.55) * (1 - ramp(u, KISSES_AT, KISSES_AT + 0.25));
  const pushed = window01(u, KISSES_AT - 0.02, BECAUSE_AT + 0.45, 0.25);
  const squash = 0.08 * window01(u, KISSES_AT - 0.02, KISSES_AT + 0.45, 0.12);
  const scale = 1 + 0.08 * lean - 0.07 * pushed;
  // A slow breath and drift, whole cycles a loop.
  const drift = { x: 6 * Math.sin(cycles(3, u)), y: 8 * Math.sin(cycles(4, u) + 1) };

  // The mouth, beat by beat.
  const hook = u < FRONT_AT || u >= BECAUSE_AT;
  const lips = hook
    ? u >= BECAUSE_AT ? go(u, BECAUSE_AT, BECAUSE_AT + 0.35, 0.3, 0.78) : go(u, HUMAN_AT - 0.1, HUMAN_AT + 0.12, 0.78, 1)
    : u < ITS_A_AT ? 1
    : u < STRIPES_ITS_AT ? go(u, ITS_A_AT, ITS_A_AT + 0.4, 1, 0.55)
    : u < CONVICT_AT - 0.1 ? go(u, STRIPES_ITS_AT, STRIPES_ITS_AT + 0.4, 0.55, 0.25)
    : u < HONESTLY_AT ? go(u, CONVICT_AT - 0.1, CONVICT_AT + 0.05, 0.25, 1)
    : u < STILL_AT ? 1
    : go(u, STILL_AT, STILL_AT + 0.3, 1, 0) + 0.3 * ramp(u, KISSES_AT + 0.1, KISSES_AT + 0.3);
  const jaw = Math.max(
    ramp(u, FRONT_AT - 0.05, FRONT_AT + 0.85) * (1 - ramp(u, ITS_A_AT - 0.25, ITS_A_AT + 0.25)) * (0.55 + 0.45 * ramp(u, AND_AT - 0.3, AND_AT + 0.1)),
    ...BITES.map((b) => biteJaw(u, b)),
  );
  const smile = hook
    ? u >= BECAUSE_AT ? go(u, BECAUSE_AT, BECAUSE_AT + 0.4, 0, 0.55) : go(u, HUMAN_AT - 0.1, HUMAN_AT + 0.2, 0.55, 0.75)
    : u < ITS_A_AT ? go(u, FRONT_AT, FRONT_AT + 0.4, 0.75, 0.35)
    : u < CONVICT_AT - 0.1 ? go(u, ITS_A_AT, ITS_A_AT + 0.3, 0.35, 0.2)
    : u < HONESTLY_AT ? go(u, CONVICT_AT - 0.1, CONVICT_AT + 0.1, 0.2, 0.9)
    : u < STILL_AT ? go(u, HONESTLY_AT, HONESTLY_AT + 0.4, 0.9, 1)
    : go(u, STILL_AT, STILL_AT + 0.3, 1, 0);
  const pucker = window01(u, STILL_AT, KISSES_AT + 0.35, 0.35);
  const rows = ROW_TIMES.reduce((n, at) => n + ramp(u, at, at + 0.14), 0) * (1 - ramp(u, ITS_A_AT + 0.3, CRAB_BITE - 0.45)); // reset once the mouth is shut

  // The eye.
  const lid = steps(u, [[0, 0], [FRONT_AT, 0.12], [STRIPES_ITS_AT, 0.22], [CONVICT_AT - 0.4, 0.12], [HONESTLY_AT, 0.5], [KISSES_AT, 0]], 0.25);
  const happy = window01(u, STILL_AT + 0.1, KISSES_AT + 0.02, 0.3);
  const wide = Math.max(0.55 * (1 - ramp(u, FRONT_AT, FRONT_AT + 0.4)) + 0.55 * ramp(u, LOOP_S - 0.6, LOOP_S - 0.3), 0.9 * window01(u, KISSES_AT - 0.08, BECAUSE_AT + 0.3, 0.18), 0.6 * window01(u, CONVICT_AT - 0.1, CONVICT_AT + 0.5, 0.12));
  // Where it looks: at us, into the mouth, at its food, at us, aside (smug), at us; the brow worried, curious, flat, smug, soft.
  const lookX = steps(u, [[0, -0.35], [FRONT_AT, -0.2], [ITS_A_AT, -0.85], [STRIPES_ITS_AT, -0.3], [HONESTLY_AT, 0.55], [STILL_AT, -0.4], [BECAUSE_AT, -0.35]], 0.25);
  const lookY = steps(u, [[0, 0.15], [FRONT_AT, 0.3], [ITS_A_AT, 0.35], [STRIPES_ITS_AT, 0.1], [HONESTLY_AT, -0.35], [STILL_AT, 0.1], [BECAUSE_AT, 0.15]], 0.25);
  const brow = steps(u, [[0, -0.8], [FRONT_AT, -0.3], [ITS_A_AT, 0], [HONESTLY_AT, 1], [STILL_AT, -0.4], [BECAUSE_AT, -0.8]], 0.3);

  // The stripes: each bar lit in turn on "stripes", then black and white for the mugshot.
  const barGlow = Array.from({ length: 6 }, (_, i) => window01(u, STRIPES_AT + i * 0.09, STRIPES_AT + i * 0.09 + 0.55, 0.15));
  const convict = window01(u, NICKNAME_AT - 0.1, HONESTLY_AT + 0.45, 0.4);

  return {
    x: feed.x + lunge * -60 + 70 * pushed + drift.x,
    y: feed.y + drift.y,
    tilt: feed.tilt + 0.05 * pushed,
    scale,
    squash,
    lips: clamp01(lips),
    jaw: clamp01(jaw),
    smile: clamp01(smile),
    pucker,
    rows,
    lid: clamp01(lid),
    happy,
    wide: clamp01(wide),
    lookX,
    lookY,
    brow,
    convict,
    barGlow,
  };
}

/** Heading cues, for labels and props, each 0 .. 1. */
export const molarsLabel = (t: number): number => window01(wrap(t), MOLARS_AT - 0.05, ITS_A_AT - 0.05, 0.15);
export const sheepsheadLabel = (t: number): number => window01(wrap(t), SHEEPSHEAD_AT - 0.05, CRAB_BITE - 0.15, 0.2);
export const mugAt = (t: number): number => window01(wrap(t), STRIPES_ITS_AT - 0.1, HONESTLY_AT + 0.5, 0.45);
export const capAt = (t: number): number => window01(wrap(t), CONVICT_AT - 0.08, HONESTLY_AT + 0.3, 0.12);
export const flashAt = (t: number): number => {
  const d = wrap(t) - CONVICT_AT;
  return d < 0 || d > 0.5 ? 0 : (1 - d / 0.5) ** 2;
};
/** The jail bars: across the frame on "fish.", gone on "Honestly?" (0 out at the right .. 1 in). */
export const barsAt = (t: number): number => {
  const u = wrap(t);
  return u < HONESTLY_AT - 0.1 ? ramp(u, CONVICT_FISH_AT, CONVICT_FISH_AT + 0.24) ** 2 : 1 - ramp(u, HONESTLY_AT - 0.1, HONESTLY_AT + 0.25);
};
export const lampAt = (t: number): number => window01(wrap(t), HONESTLY_AT, STILL_AT + 0.2, 0.35);
/** The dentist's mirror: swung in under the teeth on "Honestly?", out before "Still…". */
export const mirrorAt = (t: number): number => window01(wrap(t), HONESTLY_AT + 0.25, STILL_AT - 0.05, 0.4);
export const sparkleAt = (t: number): number => {
  const d = wrap(t) - BETTER_TEETH_AT;
  return d < -0.05 || d > 0.75 ? 0 : Math.sin(Math.PI * clamp01((d + 0.05) / 0.8));
};
export const peopleAt = (t: number): number => window01(wrap(t), MOST_AT - 0.08, STILL_AT + 0.05, 0.18);
export const kissAt = (t: number): number => window01(wrap(t), STILL_AT, BECAUSE_AT, 0.3);
/** The ink hand: in from the left on "no", palm on the lips on "kisses.", away on "Because" (0 out .. 1 pressing). */
export const handAt = (t: number): number => {
  const u = wrap(t);
  return u < BECAUSE_AT ? ramp(u, NO_AT - 0.15, KISSES_AT) + 0.35 * ramp(u, KISSES_AT, KISSES_AT + 0.25) : 1.35 * (1 - ramp(u, BECAUSE_AT - 0.05, BECAUSE_AT + 0.4));
};

/** Heart-shaped bubbles from the pucker: when each leaves the lips, and its wobble. */
export const HEARTS = Array.from({ length: 7 }, (_, i) => ({ at: STILL_AT + 0.2 + i * 0.2, phase: i * 1.7, size: 0.8 + ((i * 37) % 5) * 0.12, drift: ((i * 53) % 7) / 7 - 0.5 }));
export const HEART_LIFE = 1.25;

/** The grade over the picture, per mood: [r, g, b, alpha] washed over everything. */
export function gradeAt(t: number): readonly [number, number, number, number] {
  const u = wrap(t);
  const nervous = 1 - ramp(u, FRONT_AT, FRONT_AT + 0.5) + ramp(u, BECAUSE_AT, BECAUSE_AT + 0.5);
  const warm = window01(u, STILL_AT, BECAUSE_AT + 0.2, 0.4);
  const sunny = window01(u, ITS_A_AT, STRIPES_ITS_AT, 0.4);
  if (warm > 0) return [255, 140, 165, 0.13 * warm];
  if (sunny > 0) return [210, 240, 210, 0.05 * sunny];
  return [20, 60, 70, 0.16 * clamp01(nervous)];
}
