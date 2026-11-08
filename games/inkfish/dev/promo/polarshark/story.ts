import { BOIL_FPS } from '../../../src/art/textures';
import { lerp, ramp, window01 } from '../short';
import type { Placed } from '../seal/story';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "The slowest shark had a polar bear in its stomach": in 2008 on Svalbard, scientists found part of a
 * young bear's jaw (about 10 cm, 4 in) inside a Greenland shark, a shark that cruises at under 1 mph.
 * Nobody knows whether it hunted the bear or found it dead. Told by a narrator (words.ts), each beat timed
 * to the words, a function of time over a loop of LOOP_S. One mood a sentence:
 *
 *   0     "The slowest shark on Earth… had a POLAR BEAR in its stomach!" (surprised): from underwater, dark
 *         teal Arctic water, a bear dog-paddling at the bright surface between ice floes, the huge Greenland
 *         shark gliding right under it, mouth a little open. No writing for the first 2.5 s.
 *   3.98  "Svalbard, two thousand eight." (dramatic): a cold twilight, mountains and floes, the place and year.
 *   6.26  "Inside a Greenland shark, scientists found part of a young bear's JAW." (hushed, then a flash):
 *         the shark's belly goes see-through, a small jaw fragment with teeth in the stomach; 10 cm over 4 in.
 *  10.66  "This shark cruises at under one mile an hour!" (laugh): bright water, the shark creeping, a gauge
 *         barely off zero, 1.2 km/h over 0.8 mph, a snail overtaking it.
 *  13.82  "So did it catch the bear…" (curious): the shark rises out of the dark under a swimming bear, "?".
 *  15.36  "or find it already dead?" (eerie): a still, dim bear sinking in the gloom.
 *  17.22  "Nobody knows." (a shrug): the shark rolls its eye up; a "?" bobs.
 *  18.5   "But somehow,": a whip back to frame 1.
 */

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3. */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const SLOWEST_AT = said('slowest');
export const BEAR_AT = said('BEAR');
export const STOMACH_AT = said('stomach!');
export const SVALBARD_AT = said('Svalbard,');
export const YEAR_AT = said('two thousand eight.');
export const INSIDE_AT = said('Inside');
export const GREENLAND_AT = said('Greenland');
export const SCIENTISTS_AT = said('scientists');
export const PART_AT = said('part');
export const YOUNG_AT = said('young');
export const JAW_AT = said('JAW.');
export const THIS_AT = said('This');
export const CRUISES_AT = said('cruises');
export const UNDER_AT = said('under');
export const HOUR_AT = said('hour!');
export const SO_AT = said('So');
export const CATCH_AT = said('catch');
export const OR_AT = said('or');
export const FIND_AT = said('find');
export const DEAD_AT = said('dead?');
export const NOBODY_AT = said('Nobody');
export const KNOWS_AT = said('knows.');
export const BUT_AT = said('But');

// ---------------------------------------------------------------- the scenes

export type SceneId = 'hook' | 'place' | 'inside' | 'slow' | 'hunt' | 'dead' | 'shrug';
export const SCENE_IDS: readonly SceneId[] = ['hook', 'place', 'inside', 'slow', 'hunt', 'dead', 'shrug'];

export const PLACE_FROM = SVALBARD_AT - 0.1;
export const INSIDE_FROM = INSIDE_AT - 0.1;
export const SLOW_FROM = THIS_AT - 0.1;
export const HUNT_FROM = SO_AT - 0.1;
export const DEAD_FROM = OR_AT - 0.1;
export const SHRUG_FROM = NOBODY_AT - 0.1;
export const BACK_FROM = BUT_AT - 0.3;
const FADE = 0.16;

const between = (t: number, a: number, b: number): number => ramp(t, a, a + FADE) * (1 - ramp(t, b, b + FADE));

/** How much of each scene is on screen. The hook is also the shrug's end, so the two meet without a seam. */
export function sceneAlpha(id: SceneId, t: number): number {
  switch (id) {
    case 'hook': return Math.max(1 - ramp(t, PLACE_FROM, PLACE_FROM + FADE), ramp(t, BACK_FROM, BACK_FROM + 0.4));
    case 'place': return between(t, PLACE_FROM, INSIDE_FROM);
    case 'inside': return between(t, INSIDE_FROM, SLOW_FROM);
    case 'slow': return between(t, SLOW_FROM, HUNT_FROM);
    case 'hunt': return between(t, HUNT_FROM, DEAD_FROM);
    case 'dead': return between(t, DEAD_FROM, SHRUG_FROM);
    case 'shrug': return between(t, SHRUG_FROM, BACK_FROM) * (1 - ramp(t, BACK_FROM, BACK_FROM + 0.4));
  }
}

/** A blow that dies away over `len` seconds from `at`. */
const decay = (t: number, at: number, len: number): number => (t >= at && t < at + len ? 1 - (t - at) / len : 0);

export interface Swimmer extends Placed {
  readonly bend: number;
  readonly open: number;
}

// ---------------------------------------------------------------- frame 1: the bear and the shark

/** The surface the bear paddles at, in the hook. */
export const HOOK_SURFACE_Y = 540;
export const SHARK_LEN = 1250;
export const BEAR_LEN = 500;

/** The shark glides, whole cycles a loop, so the loop point matches the start. */
export function hookShark(t: number): Swimmer {
  const ph = (2 * Math.PI * t) / LOOP_S;
  return { x: 500 + 30 * Math.sin(ph), y: 950 + 12 * Math.sin(2 * ph), len: SHARK_LEN, rot: -0.07 + 0.02 * Math.sin(ph + 1), face: 1, beat: 3 * ph, bend: 0.03 * Math.sin(3 * ph), open: 0.4 + 0.1 * Math.sin(2 * ph) };
}

/** The bear dog-paddles above and ahead of the shark's nose. */
export function hookBear(t: number): Placed {
  const ph = (2 * Math.PI * t) / LOOP_S;
  return { x: 640 + 26 * Math.sin(ph + 2), y: 570 + 7 * Math.sin(3 * ph), len: BEAR_LEN, rot: -0.03 + 0.03 * Math.sin(2 * ph), face: -1, beat: 18 * ph };
}

export const bearTagAt = (t: number): number => window01(t, BEAR_AT, PLACE_FROM + FADE, 0.15);
/** The stomach glows once, softly, on "stomach". */
export const stomachGlowAt = (t: number): number => Math.sin(Math.PI * ramp(t, STOMACH_AT - 0.15, STOMACH_AT + 0.8));
export const stomachTagAt = (t: number): number => window01(t, STOMACH_AT, PLACE_FROM + FADE, 0.15);

// ---------------------------------------------------------------- Svalbard

export const placeAt = (t: number): number => window01(t, SVALBARD_AT - 0.05, INSIDE_FROM + FADE, 0.2);
export const yearAt = (t: number): number => window01(t, YEAR_AT - 0.05, INSIDE_FROM + FADE, 0.2);
/** The twilight drifts slowly sideways. */
export const placeDrift = (t: number): number => lerp(-40, 40, ramp(t, PLACE_FROM, INSIDE_FROM));

// ---------------------------------------------------------------- inside the shark

export const INSIDE_SHARK_Y = 980;
export const INSIDE_LEN = 1040;
export function insideShark(t: number): Swimmer {
  const u = t - INSIDE_FROM;
  return { x: 540 + 12 * Math.sin(u * 0.9), y: INSIDE_SHARK_Y + 8 * Math.sin(u * 1.3), len: INSIDE_LEN, rot: 0.01 * Math.sin(u), face: 1, beat: u * 1.2, bend: 0.02 * Math.sin(u), open: 0 };
}
/** The belly goes see-through, then the fragment shows; a flash on JAW. */
export const xrayAt = (t: number): number => ramp(t, INSIDE_AT, SCIENTISTS_AT + 0.4) * (1 - ramp(t, SLOW_FROM - 0.1, SLOW_FROM + FADE));
export const fragmentAt = (t: number): number => ramp(t, PART_AT - 0.1, YOUNG_AT);
export const jawFlashAt = (t: number): number => decay(t, JAW_AT, 0.5);
export const sharkTagAt = (t: number): number => window01(t, GREENLAND_AT, SLOW_FROM + FADE, 0.15);
export const sizeTagAt = (t: number): number => window01(t, JAW_AT, SLOW_FROM + FADE, 0.15);
/** Where the jaw lies in the shark's own units. */
export const STOMACH: { readonly x: number; readonly y: number } = { x: 8, y: 14 };

// ---------------------------------------------------------------- one mile an hour

export const SLOW_SHARK_Y = 850;
export function slowShark(t: number): Swimmer {
  const u = t - SLOW_FROM;
  // One lazy tail beat across the whole scene, and a creep of 90 px.
  return { x: lerp(430, 520, ramp(t, SLOW_FROM, HUNT_FROM)), y: SLOW_SHARK_Y + 5 * Math.sin(u * 0.8), len: 920, rot: 0.01, face: 1, beat: (2 * Math.PI * u) / (HUNT_FROM - SLOW_FROM) - Math.PI / 2, bend: 0.02, open: 0 };
}
/** The snail crosses the sand, faster than the shark. */
export const snailX = (t: number): number => lerp(120, 760, ramp(t, SLOW_FROM + 0.3, HUNT_FROM - 0.1));
export const speedTagAt = (t: number): number => window01(t, UNDER_AT - 0.1, HUNT_FROM + FADE, 0.15);
export const mphTagAt = (t: number): number => window01(t, UNDER_AT + 0.3, HUNT_FROM + FADE, 0.15);
/** The gauge's needle trembles just off zero: 0 .. 1 of the dial. */
export const needleAt = (t: number): number => ramp(t, UNDER_AT - 0.1, UNDER_AT + 0.5) * (0.04 + 0.012 * Math.sin(t * 13));
export const slowTagAt = (t: number): number => window01(t, CRUISES_AT, UNDER_AT, 0.12);

// ---------------------------------------------------------------- caught?

export function huntBear(t: number): Placed {
  const u = t - HUNT_FROM;
  return { x: lerp(300, 600, ramp(t, HUNT_FROM, DEAD_FROM)), y: 560 + 10 * Math.sin(u * 2.4), len: 480, rot: 0.03 * Math.sin(u * 1.6), face: 1, beat: u * 5 };
}
/** The shark rises out of the dark below and behind the bear. */
export function huntShark(t: number): Swimmer {
  const c = ramp(t, HUNT_FROM, DEAD_FROM + 0.3);
  return { x: lerp(-60, 480, c), y: lerp(1260, 930, c), len: 1150, rot: lerp(-0.2, -0.04, c), face: 1, beat: (t - HUNT_FROM) * 2, bend: 0.03, open: 0.5 * c };
}
/** The fog the shark comes out of. */
export const huntFogAt = (t: number): number => 0.8 * (1 - ramp(t, HUNT_FROM + 0.2, DEAD_FROM));
export const catchTagAt = (t: number): number => window01(t, CATCH_AT - 0.1, DEAD_FROM + FADE, 0.15);
export const huntQuestionAt = (t: number): number => window01(t, CATCH_AT + 0.2, DEAD_FROM + FADE, 0.15);

// ---------------------------------------------------------------- or found it dead?

/** A still bear, dim, sinking gently in the gloom. */
export function sinkingBear(t: number): Placed {
  const u = t - DEAD_FROM;
  return { x: 560 + 14 * Math.sin(u * 0.7), y: lerp(560, 900, ramp(t, DEAD_FROM, SHRUG_FROM)), len: 640, rot: lerp(0.12, 0.5, ramp(t, DEAD_FROM, SHRUG_FROM)), face: 1, beat: 0 };
}
export const foundTagAt = (t: number): number => window01(t, FIND_AT - 0.1, SHRUG_FROM + FADE, 0.15);
export const deadQuestionAt = (t: number): number => window01(t, DEAD_AT - 0.1, SHRUG_FROM + FADE, 0.15);

// ---------------------------------------------------------------- nobody knows

/** The shark shrugs: head up, then settling, an eye rolling up; the same place as the hook's shark. */
export function shrugShark(t: number): Swimmer {
  const u = t - SHRUG_FROM;
  const k = Math.sin(Math.PI * ramp(t, KNOWS_AT - 0.2, KNOWS_AT + 0.9));
  const base = hookShark(t);
  return { ...base, rot: base.rot - 0.1 * k, y: base.y - 22 * k + 3 * Math.sin(u * 2), open: 0.4 * (1 - k) };
}
export const shrugBear = hookBear;
export const shrugQuestionAt = (t: number): number => window01(t, KNOWS_AT - 0.1, BACK_FROM + FADE, 0.15);
export const bobAt = (t: number): number => 14 * Math.sin((t - KNOWS_AT) * 4);

// ---------------------------------------------------------------- the camera and the grade

export interface Camera {
  readonly zoom: number;
  readonly rot: number;
  readonly dx: number;
  readonly dy: number;
}

const WHIP_FROM = BACK_FROM - 0.2;
const WHIP_TO = BACK_FROM + 0.4;

/** A slow push in and out all loop (whole cycles), a jolt on the stomach and the jaw, a whip into frame 1. */
export function cameraAt(t: number): Camera {
  const ph = (2 * Math.PI * t) / LOOP_S;
  const jolt = 0.6 * decay(t, STOMACH_AT, 0.4) + decay(t, JAW_AT, 0.6) + 0.5 * decay(t, HOUR_AT, 0.3);
  const whip = Math.sin(Math.PI * ramp(t, WHIP_FROM, WHIP_TO)) ** 2;
  return {
    zoom: 1.05 + 0.02 * Math.sin(ph) + 0.08 * whip,
    rot: 0.012 * Math.sin(ph) - 0.04 * whip,
    dx: 8 * Math.sin(2 * ph) + 18 * jolt * Math.sin(t * 71) - 90 * whip,
    dy: 6 * Math.sin(3 * ph) + 14 * jolt * Math.sin(t * 83 + 1),
  };
}

/** A white flash on the jaw, on each cut and on the whip. */
export function flashAt(t: number): number {
  return Math.max(0.6 * decay(t, JAW_AT - 0.04, 0.35), 0.25 * decay(t, PLACE_FROM, 0.18), 0.2 * decay(t, SLOW_FROM, 0.18), 0.2 * decay(t, HUNT_FROM, 0.18), 0.4 * decay(t, BACK_FROM + 0.12, 0.25));
}

/** A cold, dim grade for the "dead?" beat. */
export const gloomAt = (t: number): number => window01(t, DEAD_FROM, SHRUG_FROM + FADE, 0.25);
