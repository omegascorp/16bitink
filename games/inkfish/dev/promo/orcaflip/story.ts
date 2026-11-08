import { BOIL_FPS } from '../../../src/art/textures';
import { ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "These orcas flip WHALE SHARKS upside down!": orcas off the Gulf of
 * California really do ram young whale sharks until they roll belly-up (Pancaldi
 * et al. 2024: the shark is a juvenile, 6 m / 20 ft; an adult reaches about
 * 12 m / 40 ft; a big male orca is about 8 m / 26 ft). Told by a narrator
 * (words.ts), every beat a function of time over a loop of LOOP_S, a new mood a beat:
 *
 *   0     "These orcas flip WHALE SHARKS upside down!" (excited): frame 1, a huge
 *         whale shark already belly-up on a diagonal, head and mouth in frame, an
 *         orca's rostrum pressed into its flank, bubbles bursting round the
 *         contact. Nothing written.
 *   3.0   "The biggest fish on Earth… and this one's just a KID, twenty feet
 *         long!" (surprised, a laugh): an adult's pale outline behind, the kid in
 *         front, "6 m · 20 ft".
 *   7.5   "They hit it at full speed, again and again," (drama): three orcas hit
 *         it from three sides, a shake and a burst on each, the shark rolling on
 *         (it snaps across edge-on in one frame on the second hit: poses.ts).
 *  10.6   "until its belly faces the sky…" (nervous, sudden quiet): it hangs belly-up in rays.
 *  13.0   "Why?" orcas circle; "Scientists" cut to a scuba diver with a slate, the
 *         belly-up shark behind; "suspect the liver." an x-ray with a glowing
 *         liver (curious).
 *  15.5   "But it sinks before anyone can check!" (cheeky): it sinks belly-up into
 *         the dark, the diver kicking after it, the torch beam falling short.
 *  17.2   "Caught on camera off Mexico," (mischievous): a viewfinder over the
 *         water, a boat above; it pushes in on an orca charging, and lands on frame 1.
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
export const endOf = (text: string, nth = 1): number => WORDS.filter((x) => x.text === text)[nth - 1]!.end / TEMPO;

export const ORCAS_AT = said('orcas');
export const FLIP_AT = said('flip');
export const WHALE_AT = said('WHALE');
export const DOWN_AT = said('down!');
export const THE_AT = said('The');
export const BIGGEST_AT = said('biggest');
export const EARTH_AT = said('Earth…');
export const KID_AT = said('KID,');
export const TWENTY_AT = said('twenty');
export const LONG_AT = said('long!');
export const THEY_AT = said('They');
export const HIT_AT = said('hit');
export const SPEED_AT = said('speed,');
export const AGAIN_AT = said('again');
export const AGAIN2_AT = said('again,');
export const UNTIL_AT = said('until');
export const BELLY_AT = said('belly');
export const SKY_AT = said('sky…');
export const WHY_AT = said('Why?');
export const SCIENTISTS_AT = said('Scientists');
export const SUSPECT_AT = said('suspect');
export const LIVER_AT = said('liver.');
export const BUT_AT = said('But');
export const SINKS_AT = said('sinks');
export const ANYONE_AT = said('anyone');
export const CHECK_AT = said('check!');
export const CAUGHT_AT = said('Caught');
export const CAMERA_AT = said('camera');
export const OFF_AT = said('off');
export const MEXICO_AT = said('Mexico,');

export type SceneId = 'hook' | 'kid' | 'spin' | 'sci' | 'xray' | 'sink';

/** Each scene's start; it stays until the next has faded in over it. Chronological: the hook comes back at the end. */
export const STARTS: Readonly<Record<SceneId, number>> = {
  hook: CAUGHT_AT - 0.5,
  kid: THE_AT - 0.1,
  spin: THEY_AT - 0.15,
  sci: SCIENTISTS_AT - 0.1,
  xray: SUSPECT_AT - 0.15,
  sink: BUT_AT - 0.15,
};
export const FADE = 0.28;
/** Drawn first to last, so each later scene covers the one before; the loop's last scene is the hook again. */
export const SCENE_IDS: readonly SceneId[] = ['kid', 'spin', 'sci', 'xray', 'sink', 'hook'];
const AFTER: Readonly<Record<SceneId, SceneId>> = { hook: 'kid', kid: 'spin', spin: 'sci', sci: 'xray', xray: 'sink', sink: 'hook' };

/** How much of a scene shows at time t: fading in over FADE, then there until the next is fully in. */
export function sceneAlpha(id: SceneId, t: number): number {
  const u = wrap(t);
  if (id === 'hook') return u < STARTS.kid + FADE ? 1 : u >= STARTS.hook ? ramp(u, STARTS.hook, STARTS.hook + FADE) : 0;
  const end = STARTS[AFTER[id]] + FADE;
  return u >= STARTS[id] && u < end ? ramp(u, STARTS[id], STARTS[id] + FADE) : 0;
}

/** The loop's clock round the seam: negative in the last seconds, so the viewfinder's push-in and frame 1 are one motion. */
export const pOf = (t: number): number => { const u = wrap(t); return u > LOOP_S / 2 ? u - LOOP_S : u; };

// ---------------------------------------------------------------- written things

export const adultLabelAt = (t: number): number => window01(t, BIGGEST_AT + 0.2, KID_AT + 0.5, 0.2);
export const sizeAt = (t: number): number => window01(t, TWENTY_AT - 0.1, THEY_AT + 0.1, 0.2);
export const livedAt = (t: number): number => window01(t, LIVER_AT - 0.25, BUT_AT + 0.05, 0.2);
export const gulfAt = (t: number): number => window01(t, OFF_AT - 0.05, LOOP_S - 0.35, 0.2);
/** The viewfinder's frame, REC dot and corners: there while the picture is wide, gone before the push-in lands. */
export const viewfinderAt = (t: number): number => { const p = pOf(t); return p >= 0 ? 0 : ramp(wrap(t), STARTS.hook + 0.1, CAUGHT_AT) * (1 - ramp(p, -0.55, -0.08)); };

// ---------------------------------------------------------------- the hits

/** The moments the orcas strike: the first on "hit", one on each "again". */
export const HITS: readonly number[] = [HIT_AT + 0.02, AGAIN_AT + 0.1, AGAIN2_AT + 0.1];
/** Frame 1's slam: a moment before the loop point, so the bubbles are already bursting at t = 0. */
export const IMPACT = -0.1;

const decay = (age: number, rate: number): number => (age <= 0 ? 0 : Math.exp(-age * rate));
const onset = (age: number, rate: number): number => (age <= 0 ? 0 : 1 - Math.exp(-age * rate));

/** A hit's camera shake, in px: all at once, then dying away. */
export function shakeOf(age: number, amp: number): { readonly dx: number; readonly dy: number } {
  const a = amp * onset(age, 90) * decay(age, 5);
  return { dx: a * Math.sin(age * 83), dy: a * 0.7 * Math.sin(age * 67 + 1) };
}
