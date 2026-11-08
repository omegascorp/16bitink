import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This orca swam inside a blue whale's mouth": Bremer Bay, Western
 * Australia, 21 March 2019. A pod of a dozen or so orcas chased an adult
 * (probably pygmy) blue whale, about 18–22 m (60–72 ft) long, and killed it
 * within about an hour: the first orca kill of a blue whale anyone recorded
 * (Totterdell et al. 2022). One orca "lunged head first into the blue's
 * mouth, presumably to feed on the tongue".
 *
 * Every beat is a function of video time t (seconds) over a loop of LOOP_S,
 * timed to the narrator's words (words.ts). One scene at a time, with short
 * crossfades between them:
 *
 *   0     "This orca swam INSIDE a blue whale's mouth.": the blue whale's head,
 *         its mouth gaping, an orca half inside it, head first (awe). The orca
 *         slides deeper; the jaw twitches on "INSIDE" and "mouth".
 *   3.6   "Australia, 2019.": the grey open sea at the surface, a blow far off
 *         and fins closing in; a little map of Australia, "Australia, 2019" (tension)
 *   5.9   "A pod chased a blue whale, sixty feet long,": underwater, the whole
 *         whale fleeing, the pod round it; "60 ft" / "18 m" under it (chase)
 *   8.6   "for an hour…": a clock sweeps an hour, the whale slows (exhausted)
 *   9.6   "the first time anyone saw orcas KILL one!": a boat on the surface,
 *         a camera flash on "saw"; dark on "KILL", the whale sinks, the orcas
 *         circle (shock, no blood)
 *   12.2  "Then one went in head-first…": the frame-1 shot builds: the orca
 *         swims in (hushed)
 *   14.4  "for the tongue.": the camera pushes into the mouth, the tongue lights up
 *   15.4  "The biggest prey on Earth,": the whole whale, huge, a little Earth over it
 *   16.8  "and they want the TONGUE.": the orca's smug face, a napkin, an
 *         eyebrow; "?!" over the whale (sarcastic)
 *   18.3  "So yes,": the orca swims back into the mouth: frame 1.
 */

/** The line boil steps at the game's 8 a second: 156 steps, 52 whole cycles a loop. */
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

export const ORCA_AT = said('orca');
export const INSIDE_AT = said('INSIDE');
export const WHALES_AT = said("whale's");
export const MOUTH_AT = said('mouth.');
export const MOUTH_END = ends('mouth.');
export const AUSTRALIA_AT = said('Australia,');
export const YEAR_AT = said('2019.');
export const POD_AT = said('pod');
export const CHASED_AT = said('chased');
export const BLUE_AT = said('blue', 2);
export const SIXTY_AT = said('sixty');
export const LONG_END = ends('long,');
export const HOUR_FOR_AT = said('for');
export const HOUR_AT = said('hour…');
export const HOUR_END = ends('hour…');
export const FIRST_AT = said('first');
export const ANYONE_AT = said('anyone');
export const SAW_AT = said('saw');
export const ORCAS_AT = said('orcas');
export const KILL_AT = said('KILL');
export const ONE_END = ends('one!');
export const THEN_AT = said('Then');
export const WENT_AT = said('went');
export const HEAD_AT = said('head-first…');
export const HEAD_END = ends('head-first…');
export const TONGUE_FOR_AT = said('for', 2);
export const TONGUE_AT = said('tongue.');
export const TONGUE_END = ends('tongue.');
export const BIGGEST_AT = said('biggest');
export const PREY_AT = said('prey');
export const EARTH_AT = said('Earth,');
export const AND_AT = said('and');
export const WANT_AT = said('want');
export const TONGUE2_AT = said('TONGUE.');
export const TONGUE2_END = ends('TONGUE.');
export const SO_AT = said('So');

// ---------------------------------------------------------------- scenes

export type SceneId = 'maw' | 'surface' | 'chase' | 'prey' | 'smug';

/** Crossfades: [from, to, the scene before, the scene after]. */
export const CUTS: readonly (readonly [number, number, SceneId, SceneId])[] = [
  [MOUTH_END + 0.1, MOUTH_END + 0.36, 'maw', 'surface'],
  [POD_AT - 0.3, POD_AT - 0.06, 'surface', 'chase'],
  [THEN_AT - 0.3, THEN_AT - 0.06, 'chase', 'maw'],
  [TONGUE_END + 0.2, said('The') - 0.04, 'maw', 'prey'],
  [AND_AT - 0.16, AND_AT + 0.02, 'prey', 'smug'],
  [SO_AT - 0.2, SO_AT + 0.02, 'smug', 'maw'],
];

/** What's on screen at t: one scene, or two mixing (`mix` of the second over the first). */
export interface SceneMix {
  readonly a: SceneId;
  readonly b: SceneId | null;
  readonly mix: number;
}

export function sceneAt(t: number): SceneMix {
  const u = wrap(t);
  for (let i = CUTS.length - 1; i >= 0; i--) {
    const [from, to, before, after] = CUTS[i]!;
    if (u >= to) return { a: after, b: null, mix: 0 };
    if (u >= from) return { a: before, b: after, mix: ramp(u, from, to) };
  }
  return { a: 'maw', b: null, mix: 0 };
}

// ---------------------------------------------------------------- the maw (frame 1, "Then one went in…", the end)

/**
 * How far the orca is into the mouth, in orca lengths along its path: 0 is
 * frame 1 (half inside), below 0 still outside, swimming in. The hook slides
 * it slowly deeper; the middle swims it in from outside, head first, and on
 * deep for the tongue; the end swims it in again, reaching 0 at the loop
 * point at the hook's own pace.
 */
const SLIDE_RATE = 0.09;
const HOOK_DIVE: readonly Key[] = [
  { t: 0, at: 0, rate: SLIDE_RATE },
  { t: MOUTH_AT, at: 0.3, rate: 0.12 },
  { t: MOUTH_END + 0.4, at: 0.36, rate: 0.05 },
];
const MID_DIVE: readonly Key[] = [
  { t: THEN_AT - 0.3, at: -1.25, rate: 0.55 },
  { t: HEAD_AT, at: -0.05, rate: 0.5 },
  { t: HEAD_END, at: 0.2, rate: 0.2 },
  { t: TONGUE_AT, at: 0.34, rate: 0.08 },
  { t: TONGUE_END + 0.5, at: 0.38, rate: 0.05 },
];
const END_DIVE: readonly Key[] = [
  { t: SO_AT - 0.2, at: -0.95, rate: 0.6 },
  { t: LOOP_S, at: 0, rate: SLIDE_RATE },
];

export function diveAt(t: number): number {
  const u = wrap(t);
  if (u < 6) return curveAt(HOOK_DIVE, u).at;
  if (u < 16) return curveAt(MID_DIVE, u).at;
  return curveAt(END_DIVE, u).at;
}

/** The whale's jaw, 0 shut .. 1 dropped all the way: wide, twitching shut a little on "INSIDE" and on "mouth". */
export const GAPE = 0.78;
const twitch = (u: number, at: number): number => {
  const s = u - at;
  return s < 0 || s > 0.6 ? 0 : Math.sin((Math.PI * s) / 0.6) ** 2 * (1 - s / 0.6);
};
export const gapeAt = (t: number): number => {
  const u = wrap(t);
  return GAPE - 0.07 * twitch(u, INSIDE_AT + 0.05) - 0.05 * twitch(u, MOUTH_AT + 0.05) - 0.06 * twitch(u, HEAD_AT + 0.1);
};

/**
 * The maw's camera: screen px per scene px and where it looks. A slow push in
 * through the hook; for "Then one went in" it starts wider and closes in;
 * on "tongue" it pushes into the mouth; the end eases back to frame 1's
 * framing at the hook's pace.
 */
export interface MawCam {
  readonly zoom: number;
  /** Scene point at the centre of the frame (540, 800). */
  readonly x: number;
  readonly y: number;
}
const CAM_RATE = 0.012;
const HOOK_ZOOM: readonly Key[] = [{ t: 0, at: 1, rate: CAM_RATE }, { t: 4, at: 1.045, rate: CAM_RATE }];
const MID_ZOOM: readonly Key[] = [
  { t: THEN_AT - 0.3, at: 0.9 }, { t: HEAD_END, at: 0.98, rate: 0.03 },
  { t: TONGUE_FOR_AT, at: 1.0, rate: 0.05 }, { t: TONGUE_END, at: 1.42, rate: 0.12 }, { t: TONGUE_END + 0.6, at: 1.48 },
];
const END_ZOOM: readonly Key[] = [{ t: SO_AT - 0.2, at: 0.97, rate: CAM_RATE }, { t: LOOP_S, at: 1, rate: CAM_RATE }];
/** The tongue push: 0 framing the mouth .. 1 centred on the tongue; back to 0 once the maw is off screen. */
export const tonguePushAt = (t: number): number => ramp(wrap(t), TONGUE_FOR_AT - 0.05, TONGUE_END + 0.1) * (1 - ramp(wrap(t), said('The') + 0.1, said('The') + 0.3));
/** The tongue lit up, 0 .. 1. */
export const tongueGlowAt = (t: number): number => window01(wrap(t), TONGUE_FOR_AT, said('The') + 0.2, 0.3);

export function mawZoomAt(t: number): number {
  const u = wrap(t);
  if (u < 6) return curveAt(HOOK_ZOOM, u).at;
  if (u < 16) return curveAt(MID_ZOOM, u).at;
  return curveAt(END_ZOOM, u).at;
}

/** The hush: how dark the maw is for "Then one went in head-first…", 0 .. 1. */
export const hushAt = (t: number): number => window01(wrap(t), THEN_AT - 0.3, TONGUE_FOR_AT + 0.1, 0.35);

// ---------------------------------------------------------------- the chase and the kill

/** The chase's values go back to where they started once it's off screen (after the cut to "Then"), so every value is where it began at the seam. */
const chaseReset = (u: number): number => 1 - ramp(u, THEN_AT, THEN_AT + 0.2);

/** The chase's clock: the whale's tail beat slows from the chase to "hour…", and stops on "KILL". */
export const tailRateAt = (t: number): number => {
  const u = wrap(t);
  return 2.6 - 1.5 * ramp(u, HOUR_FOR_AT, HOUR_END + 0.3) - 0.9 * ramp(u, KILL_AT, KILL_AT + 0.8);
};
/** The tail's phase: the rate integrated (closed form for the ramps would be fiddly; sum in small steps). */
export function tailPhaseAt(t: number): number {
  const u = wrap(t);
  const from = POD_AT - 0.4;
  if (u < from || u > THEN_AT) return 0;
  const step = 1 / 120;
  let phase = 0;
  for (let s = from; s < u; s += step) phase += tailRateAt(s + step / 2) * Math.min(step, u - s);
  return phase;
}
/** The clock's hand, 0 .. 1 turn: an hour sweeping by on "for an hour…". */
export const clockAt = (t: number): number => ramp(wrap(t), HOUR_FOR_AT, HOUR_END + 0.15) * chaseReset(wrap(t));
/** The clock on screen, 0 .. 1. */
export const clockShowAt = (t: number): number => window01(wrap(t), HOUR_FOR_AT - 0.25, ANYONE_AT, 0.2);
/** The "60 ft" / "18 m" bar under the whale, 0 .. 1. */
export const sizeBarAt = (t: number): number => window01(wrap(t), SIXTY_AT - 0.08, HOUR_END + 0.2, 0.18);
/** The kill: the picture darkens, the whale rolls and sinks, 0 .. 1. */
export const killAt = (t: number): number => ramp(wrap(t), KILL_AT - 0.05, KILL_AT + 0.7) * chaseReset(wrap(t));
/** The boat on the surface and its camera flash. */
export const boatAt = (t: number): number => window01(wrap(t), said('the') - 0.15, KILL_AT + 0.2, 0.25);
export const flashAt = (t: number): number => {
  const s = wrap(t) - SAW_AT - 0.05;
  return s < 0 || s > 0.35 ? 0 : (1 - s / 0.35) ** 2;
};
/** Jolts of the picture on "KILL", px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const s = wrap(t) - KILL_AT;
  if (s < 0 || s > 0.45) return { x: 0, y: 0 };
  const amp = 22 * (1 - s / 0.45) ** 2;
  return { x: amp * Math.sin(s * 115), y: amp * 0.7 * Math.cos(s * 140) };
}

// ---------------------------------------------------------------- the surface

/** The map of Australia and the "Australia, 2019" label, 0 .. 1 (the label pops on "Australia"). */
export const placeAt = (t: number): number => window01(wrap(t), AUSTRALIA_AT - 0.05, POD_AT - 0.2, 0.18);

// ---------------------------------------------------------------- the prey and the smug face

/** The little Earth over the whale on "Earth", 0 .. 1. */
export const earthAt = (t: number): number => window01(wrap(t), EARTH_AT - 0.1, AND_AT + 0.05, 0.15);
/** The eyebrow up and the "?!" over the whale on "TONGUE". */
export const browAt = (t: number): number => window01(wrap(t), WANT_AT, SO_AT, 0.18);
export const huhAt = (t: number): number => window01(wrap(t), TONGUE2_AT - 0.08, SO_AT, 0.15);
