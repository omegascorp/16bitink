import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, lerp, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };
export { onAnimal, pinned, UNITS } from '../seal/story';
export type { Placed } from '../seal/story';

/**
 * "This whale caught a sea lion by MISTAKE": Monterey Bay, California, July 2019
 * (photographed by Chase Dekker): a humpback lunge-feeding on anchovies came up
 * with a California sea lion inside its open mouth; the whale paused and the sea
 * lion got out. Never shown swallowed, bitten or chewed. Told by a narrator
 * (words.ts), each beat timed to the words, a function of time over a loop of
 * LOOP_S. One mood a sentence:
 *
 *   0     "This whale caught a sea lion… by MISTAKE!" (surprised): a humpback bursts
 *         up out of the sea head first, mouth gaping, throat pleats ballooned, a
 *         wide-eyed sea lion sitting inside the open mouth; a jolt on "lion" and "MISTAKE".
 *   3.1   "Monterey Bay, twenty nineteen: humpbacks gulping anchovies…" (excited):
 *         bright, wider: several humpbacks lunge up through a silver anchovy ball,
 *         sea lions darting round; the place and the year written.
 *   7.1   "and one came up with a sea lion in its MOUTH!" (nervous): dark, drained;
 *         the camera pushes in on the open mouth, the sea lion inside, the jaws
 *         starting to close.
 *   9.9   "But a humpback's throat is only about as wide as your fist." (dramatic):
 *         a cutaway lens over the head: the narrow throat, and a fist drawn beside
 *         it at exactly the same width.
 *  13.4   "So the whale just paused… and the sea lion slipped right out!" (chuckles):
 *         the whale freezes with its mouth open, the sea lion slides over the lower
 *         lip and plops into the water with a splash; a comic burp.
 *  16.6   "So yes," (mischievous): whip back to the picture of frame 1.
 */

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const LION_AT = said('lion…');
export const MISTAKE_AT = said('MISTAKE!');
export const MONTEREY_AT = said('Monterey');
export const BAY_AT = said('Bay,');
export const TWENTY_AT = said('twenty nineteen:');
export const HUMPBACKS_AT = said('humpbacks');
export const GULPING_AT = said('gulping');
export const ANCHOVIES_AT = said('anchovies…');
export const AND_AT = said('and');
export const CAME_AT = said('came');
export const SEA_AT = said('sea', 2);
export const MOUTH_AT = said('MOUTH!');
export const BUT_AT = said('But');
export const THROAT_AT = said('throat');
export const WIDE_AT = said('wide');
export const YOUR_AT = said('your');
export const FIST_AT = said('fist.');
export const SO_AT = said('So');
export const PAUSED_AT = said('paused…');
export const SLIPPED_AT = said('slipped');
export const RIGHT_AT = said('right');
export const OUT_AT = said('out!');
export const SO_YES_AT = said('So', 2);

// ---------------------------------------------------------------- the scenes

export type SceneId = 'hook' | 'school' | 'mouth' | 'throat' | 'slip';
export const SCENE_IDS: readonly SceneId[] = ['hook', 'school', 'mouth', 'throat', 'slip'];

export const SCHOOL_FROM = MONTEREY_AT - 0.12;
export const MOUTH_FROM = AND_AT - 0.1;
export const THROAT_FROM = BUT_AT - 0.12;
export const SLIP_FROM = SO_AT - 0.1;
export const HOOK_BACK = SO_YES_AT - 0.3;
const FADE = 0.18;
const BACK_FADE = 0.25;

export function sceneAlpha(id: SceneId, t: number): number {
  switch (id) {
    case 'hook': return Math.max(1 - ramp(t, SCHOOL_FROM, SCHOOL_FROM + FADE), ramp(t, HOOK_BACK, HOOK_BACK + BACK_FADE));
    case 'school': return ramp(t, SCHOOL_FROM, SCHOOL_FROM + FADE) * (1 - ramp(t, MOUTH_FROM, MOUTH_FROM + FADE));
    case 'mouth': return ramp(t, MOUTH_FROM, MOUTH_FROM + FADE) * (1 - ramp(t, THROAT_FROM, THROAT_FROM + FADE));
    case 'throat': return ramp(t, THROAT_FROM, THROAT_FROM + FADE) * (1 - ramp(t, SLIP_FROM, SLIP_FROM + FADE));
    case 'slip': return ramp(t, SLIP_FROM, SLIP_FROM + FADE) * (1 - ramp(t, HOOK_BACK, HOOK_BACK + BACK_FADE));
  }
}

/** A blow that dies away over `len` seconds from `at`. */
const decay = (t: number, at: number, len: number): number => (t >= at && t < at + len ? 1 - (t - at) / len : 0);
const cycles = (t: number, n: number): number => Math.sin((2 * Math.PI * n * t) / LOOP_S);

// ---------------------------------------------------------------- the camera and the moods

export interface Camera {
  readonly zoom: number;
  readonly rot: number;
  readonly dx: number;
  readonly dy: number;
}

/** The whip back to frame 1: a sideways swing that is over before the hook is fully back. */
export const whipAt = (t: number): number => Math.sin(Math.PI * clamp01((t - (HOOK_BACK - 0.08)) / 0.45));

/** The push-in on the open mouth. */
export const pushAt = (t: number): number => ramp(t, MOUTH_FROM, MOUTH_AT + 0.35);

export function cameraAt(t: number): Camera {
  const jolt = decay(t, LION_AT, 0.4) * 0.7 + decay(t, MISTAKE_AT, 0.5) + 0.6 * decay(t, BAY_AT - 0.1, 0.3);
  const tense = window01(t, MOUTH_FROM, THROAT_FROM, 0.2);
  return {
    zoom: 1.02 + 0.02 * cycles(t, 1) + 0.1 * jolt * 0.4 + 0.06 * decay(t, FIST_AT - 0.05, 0.5),
    rot: 0.012 * tense * Math.sin(t * 23) + 0.03 * whipAt(t),
    dx: 5 * cycles(t, 2) + 16 * jolt * Math.sin(t * 71) + 9 * tense * Math.sin(t * 47) - 330 * whipAt(t) * (t < HOOK_BACK + 0.2 ? 1 : 0),
    dy: 5 * cycles(t, 3) + 12 * jolt * Math.sin(t * 83 + 1) + 7 * tense * Math.sin(t * 59),
  };
}

/** A white flash on each cut and on the splash. */
export const SPLASH_AT = OUT_AT + 0.1;
export function flashAt(t: number): number {
  return Math.max(
    0.32 * decay(t, SCHOOL_FROM, 0.2), 0.3 * decay(t, MOUTH_FROM, 0.2), 0.3 * decay(t, THROAT_FROM, 0.2), 0.3 * decay(t, SLIP_FROM, 0.2),
    0.14 * decay(t, SPLASH_AT, 0.18), 0.4 * decay(t, HOOK_BACK + 0.08, 0.22),
  );
}

/** Excited: bright and warm over the school. Nervous: drained and cold over the mouth. Dramatic: a dark vignette over the throat. */
export const brightAt = (t: number): number => window01(t, SCHOOL_FROM, MOUTH_FROM + 0.1, 0.2);
export const nervousAt = (t: number): number => window01(t, MOUTH_FROM, THROAT_FROM + 0.1, 0.2);
export const dramaAt = (t: number): number => window01(t, THROAT_FROM, SLIP_FROM + 0.1, 0.25);

// ---------------------------------------------------------------- frame 1: the hook

export interface Hook {
  /** The whale's bob, px. */
  readonly bob: number;
  /** 0 .. 1 */
  readonly gape: number;
  readonly throat: number;
  /** The sea lion's wobble, radians. */
  readonly wobble: number;
  /** The tail's phase. */
  readonly tail: number;
  /** The foam's loop, 0 .. 1 (whole cycles). */
  readonly foam: number;
}

/** The hook, a loop of its own: every motion a whole number of cycles a loop, so t = LOOP_S equals t = 0. */
export function hookAt(t: number): Hook {
  return {
    bob: 26 * cycles(t, 3),
    gape: 0.9 + 0.05 * cycles(t, 5),
    throat: 0.88 + 0.06 * cycles(t, 4),
    wobble: 0.09 * cycles(t, 6),
    tail: (2 * Math.PI * 2 * t) / LOOP_S,
    foam: (t / LOOP_S) % 1,
  };
}

// ---------------------------------------------------------------- the school

export const SCHOOL_WHALES = 3;
/** How far each whale has risen through the ball (0 .. 1) at t. */
export const riseAt = (t: number, i: number): number => ramp(t, SCHOOL_FROM + 0.1 + i * 0.35, SCHOOL_FROM + 1.7 + i * 0.5 + i * 0.4);
export const placeAt = (t: number): number => ramp(t, MONTEREY_AT - 0.05, MONTEREY_AT + 0.25) * (1 - ramp(t, MOUTH_FROM, MOUTH_FROM + FADE));
export const yearAt = (t: number): number => ramp(t, TWENTY_AT - 0.05, TWENTY_AT + 0.25) * (1 - ramp(t, MOUTH_FROM, MOUTH_FROM + FADE));
export const gulpAt = (t: number): number => 0.5 + 0.5 * Math.sin(t * 5.2);

// ---------------------------------------------------------------- the mouth

export const mouthGape = (t: number): number => lerp(0.92, 0.5, ramp(t, MOUTH_FROM + 0.3, MOUTH_AT + 0.4));
export const mouthSweat = (t: number): number => ramp(t, MOUTH_FROM, MOUTH_FROM + 0.6);

// ---------------------------------------------------------------- the throat and the fist

export const lensAt = (t: number): number => ramp(t, THROAT_FROM, THROAT_FROM + 0.4) * (1 - ramp(t, SLIP_FROM, SLIP_FROM + FADE));
export const throatTagAt = (t: number): number => ramp(t, THROAT_AT - 0.05, THROAT_AT + 0.2) * (1 - ramp(t, SLIP_FROM, SLIP_FROM + FADE));
export const guideAt = (t: number): number => ramp(t, WIDE_AT - 0.1, WIDE_AT + 0.3) * (1 - ramp(t, SLIP_FROM, SLIP_FROM + FADE));
/** The fist sliding in from the right (0 .. 1). */
export const fistAt = (t: number): number => ramp(t, YOUR_AT - 0.2, YOUR_AT + 0.2) * (1 - ramp(t, SLIP_FROM, SLIP_FROM + FADE));
export const fistTagAt = (t: number): number => ramp(t, FIST_AT - 0.05, FIST_AT + 0.2) * (1 - ramp(t, SLIP_FROM, SLIP_FROM + FADE));

// ---------------------------------------------------------------- the slip

export interface Slip {
  /** The jaw's opening. */
  readonly gape: number;
  /** 0 inside the mouth .. 1 at the lip: the slide. */
  readonly slide: number;
  /** 0 at the lip .. 1 in the water: the arc. */
  readonly fly: number;
  /** 0 .. 1: afterwards it bobs up, grinning. */
  readonly pop: number;
  /** Seconds since the splash (negative before). */
  readonly sinceSplash: number;
  /** The whale's freeze: 0 moving .. 1 frozen. */
  readonly frozen: number;
  readonly sweat: number;
}

export function slipAt(t: number): Slip {
  return {
    gape: lerp(0.5, 0.82, ramp(t, SO_AT, PAUSED_AT + 0.3)),
    slide: ramp(t, SLIPPED_AT - 0.05, RIGHT_AT + 0.05),
    fly: ramp(t, RIGHT_AT + 0.05, SPLASH_AT),
    pop: ramp(t, SPLASH_AT + 0.05, SPLASH_AT + 0.3),
    sinceSplash: t - SPLASH_AT,
    frozen: ramp(t, SO_AT + 0.1, PAUSED_AT - 0.1),
    sweat: 1 - ramp(t, SLIPPED_AT - 0.1, SLIPPED_AT + 0.3),
  };
}
