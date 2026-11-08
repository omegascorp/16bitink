import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, lerp, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This whale saved a seal from orcas": Antarctic Peninsula, 2009 (seen by the
 * NOAA biologist Robert Pitman): killer whales swam side by side and made a wave
 * that washed a Weddell seal off its ice floe; a humpback rolled onto its back,
 * the seal ended up on its chest, and the whale arched its chest to lift the
 * seal out of the water. Pitman et al. (2016) collected 115 cases of humpbacks
 * interfering with killer-whale hunts; why they do it is not known. The seal is
 * never shown hurt. Told by a narrator (words.ts), each beat timed to the words,
 * a function of time over a loop of LOOP_S. One mood a sentence:
 *
 *   0     "This whale saved a seal… from ORCAS!" (surprised): a huge humpback belly-up
 *         at the surface, white pleated chest out of the water, flippers open like
 *         arms, a smiling Weddell seal safe on its chest, tall black orca fins circling.
 *   3.0   "Antarctica, two thousand nine." (nervous): cold grey, an ice floe with the
 *         seal on it, orca fins closing in, the place and the year.
 *   5.0   "Orcas washed a seal off its ice floe…" (tense): three orcas abreast push a
 *         wave, the floe tips, the seal slides off into the sea.
 *   7.3   "then a humpback rolled over, and the seal landed on its CHEST!" (dramatic):
 *         the humpback rises from below, rolls belly-up under the seal; a boom.
 *  10.9   "It arched up and lifted the seal right out of the water!" (excited): bright,
 *         the chest rises, water pours off, flippers open, orca fins circling below.
 *  13.8   "Humpbacks have crashed orca hunts over a HUNDRED times." (curious): small
 *         humpbacks charging orcas, a counter to 100+.
 *  16.8   "Why? Nobody knows…" (soft): a close-up of the humpback's eye, a big "?".
 *  18.4   "But": whip back to frame 1.
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

export const ORCAS_HOOK_AT = said('ORCAS!');
export const ANTARCTICA_AT = said('Antarctica,');
export const NINE_AT = said('two thousand nine.');
export const ORCAS_AT = said('Orcas');
export const WASHED_AT = said('washed');
export const SEAL_OFF_AT = said('seal');
export const OFF_AT = said('off');
export const FLOE_AT = said('floe…');
export const THEN_AT = said('then');
export const HUMPBACK_AT = said('humpback');
export const ROLLED_AT = said('rolled');
export const OVER_AT = said('over,');
export const SEAL_LAND_AT = said('seal', 2);
export const LANDED_AT = said('landed');
export const CHEST_AT = said('CHEST!');
export const IT_AT = said('It');
export const ARCHED_AT = said('arched');
export const UP_AT = said('up');
export const LIFTED_AT = said('lifted');
export const WATER_AT = said('water!');
export const HUMPBACKS_AT = said('Humpbacks');
export const CRASHED_AT = said('crashed');
export const ORCA_AT = said('orca');
export const HUNDRED_AT = said('a HUNDRED');
export const TIMES_AT = said('times.');
export const WHY_AT = said('Why?');
export const NOBODY_AT = said('Nobody');
export const KNOWS_AT = said('knows…');
export const BUT_AT = said('But');

// ---------------------------------------------------------------- the scenes

export type SceneId = 'hook' | 'floe' | 'wave' | 'save' | 'montage' | 'why';
export const SCENE_IDS: readonly SceneId[] = ['hook', 'floe', 'wave', 'save', 'montage', 'why'];

export const FLOE_FROM = ANTARCTICA_AT - 0.15;
export const WAVE_FROM = ORCAS_AT - 0.12;
export const SAVE_FROM = THEN_AT - 0.1;
export const MONTAGE_FROM = HUMPBACKS_AT - 0.12;
export const WHY_FROM = WHY_AT - 0.1;
export const HOOK_BACK = BUT_AT - 0.42;
const FADE = 0.2;
const BACK_FADE = 0.36;

const between = (t: number, from: number, to: number): number => ramp(t, from, from + FADE) * (1 - ramp(t, to, to + FADE));

/** How much of each scene is on screen. */
export function sceneAlpha(id: SceneId, t: number): number {
  switch (id) {
    case 'hook': return Math.max(1 - ramp(t, FLOE_FROM, FLOE_FROM + FADE), ramp(t, HOOK_BACK, HOOK_BACK + BACK_FADE));
    case 'floe': return between(t, FLOE_FROM, WAVE_FROM);
    case 'wave': return between(t, WAVE_FROM, SAVE_FROM);
    case 'save': return between(t, SAVE_FROM, MONTAGE_FROM);
    case 'montage': return between(t, MONTAGE_FROM, WHY_FROM);
    case 'why': return ramp(t, WHY_FROM, WHY_FROM + FADE) * (1 - ramp(t, HOOK_BACK, HOOK_BACK + BACK_FADE));
  }
}

// ---------------------------------------------------------------- the camera and the moods

/** A blow that dies away over `len` seconds from `at`. */
export const decay = (t: number, at: number, len: number): number => (t >= at && t < at + len ? 1 - (t - at) / len : 0);
export const cycles = (t: number, n: number): number => Math.sin((2 * Math.PI * n * t) / LOOP_S);

export interface Camera {
  readonly zoom: number;
  readonly rot: number;
  readonly dx: number;
  readonly dy: number;
}

/** The whip back to frame 1: a sideways swing over before the hook is fully back. */
export const whipAt = (t: number): number => Math.sin(Math.PI * clamp01((t - (HOOK_BACK - 0.06)) / 0.46));

export function cameraAt(t: number): Camera {
  // A shove on "ORCAS!", a jolt on "CHEST!", a punch on "HUNDRED", a slow push on the eye.
  const orcas = decay(t, ORCAS_HOOK_AT - 0.04, 0.5);
  const chest = decay(t, CHEST_AT - 0.02, 0.5);
  const hundred = decay(t, HUNDRED_AT - 0.04, 0.45);
  const whip = whipAt(t);
  const shake = chest * Math.sin(t * 61);
  return {
    zoom: 1 + 0.07 * orcas + 0.05 * chest + 0.05 * hundred,
    rot: 0.02 * whip + 0.008 * shake,
    dx: -150 * whip + 12 * shake,
    dy: -10 * hundred + 16 * chest * Math.sin(t * 47),
  };
}

/** A white flash on the big beats. */
export const flashAt = (t: number): number => 0.32 * decay(t, CHEST_AT - 0.02, 0.22) + 0.18 * decay(t, HUNDRED_AT, 0.2) + 0.12 * decay(t, ORCAS_HOOK_AT - 0.04, 0.2);

/** Cold, drained: the floe, the wave and the roll. */
export const coldAt = (t: number): number => Math.max(
  ramp(t, FLOE_FROM, FLOE_FROM + 0.4) * (1 - ramp(t, SAVE_FROM + 1.0, SAVE_FROM + 1.6)),
  0.5 * ramp(t, SAVE_FROM + 1.0, SAVE_FROM + 1.6) * (1 - ramp(t, IT_AT - 0.1, IT_AT + 0.5)),
);
/** Bright and warm: the lift. */
export const brightAt = (t: number): number => ramp(t, IT_AT - 0.05, IT_AT + 0.45) * (1 - ramp(t, MONTAGE_FROM, MONTAGE_FROM + 0.3));
/** A soft dark vignette: the eye. */
export const duskAt = (t: number): number => ramp(t, WHY_FROM, WHY_FROM + 0.4) * (1 - ramp(t, HOOK_BACK, HOOK_BACK + BACK_FADE));

// ---------------------------------------------------------------- the writing

/** "Antarctica" and "2009": in as they are said, out as the wave begins. */
export const placeAt = (t: number): number => ramp(t, ANTARCTICA_AT - 0.04, ANTARCTICA_AT + 0.22) * (1 - ramp(t, WAVE_FROM - 0.05, WAVE_FROM + 0.2));
export const yearAt = (t: number): number => ramp(t, NINE_AT - 0.04, NINE_AT + 0.22) * (1 - ramp(t, WAVE_FROM - 0.05, WAVE_FROM + 0.2));

/** The counter of orca hunts crashed: climbs from "Humpbacks" to "a HUNDRED". */
export const COUNT_FROM = HUMPBACKS_AT + 0.1;
export const counterAt = (t: number): number => ramp(t, MONTAGE_FROM + 0.05, MONTAGE_FROM + 0.3) * (1 - ramp(t, WHY_FROM, WHY_FROM + FADE));
export const countAt = (t: number): number => Math.round(100 * ramp(t, COUNT_FROM, HUNDRED_AT + 0.05));
/** The "+" after 100. */
export const plusAt = (t: number): number => ramp(t, HUNDRED_AT + 0.05, HUNDRED_AT + 0.2);
/** One tick of the counter at each ten. */
export const TICK_AT: readonly number[] = Array.from({ length: 10 }, (_, i) => {
  const target = (i + 1) * 10;
  let lo = COUNT_FROM;
  let hi = HUNDRED_AT + 0.05;
  for (let n = 0; n < 30; n++) {
    const mid = (lo + hi) / 2;
    if (countAt(mid) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
});

/** The big "?": in on "Why?", out as the picture whips back. */
export const markAt = (t: number): number => ramp(t, WHY_AT, WHY_AT + 0.3) * (1 - ramp(t, HOOK_BACK, HOOK_BACK + 0.25));

/** The eye's lid: open, a slow blink on "knows…". */
export const lidAt = (t: number): number => {
  const u = (t - (KNOWS_AT + 0.25)) / 0.6;
  return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0;
};

export { lerp, window01 };
