import { BOIL_FPS } from '../../../src/art/textures';
import { ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This fish stabbed a SUBMARINE!": on 6 July 1967, 610 m (2,000 ft) down on
 * the Blake Plateau off Florida, a swordfish (about 2.4 m / 8 ft, 90 kg /
 * 200 lb) rammed the research sub Alvin and its sword wedged in a crevice
 * between two sections of the outer fairing. Nobody was hurt and the hull was
 * never pierced; the sub surfaced with the fish still attached, and the crew
 * ate it the next day. Told by a narrator (words.ts), each beat timed to the
 * words, a function of time over a loop of LOOP_S, a new mood every sentence:
 *
 *   0     "This fish stabbed a SUBMARINE!" (shock): frame 1, the swordfish
 *         driving its sword into the white sub's side, the fairing split at the seam,
 *         dark blue water. Nothing written.
 *   2.0   "1967. Two thousand feet down, off Florida," (tense): the sub tiny in
 *         black water, lamps lit; the year, 610 m over 2,000 ft, the place.
 *   5.3   "three men sit inside a tiny sub called Alvin… then BANG!" (warm, then
 *         shock): close on the portholes, three faces in warm light, the name on
 *         the hull; on BANG a white flash, a hard shake, the faces jolt.
 *   9.5   "An eight-foot swordfish rams it, and the sword gets STUCK!" (drama
 *         into funny): the fish wrenches, thrashes and wiggles, 2.4 m over 8 ft.
 *  12.8   "They head up… with the fish still attached!" (laugh): the water
 *         lightens, the sub rises with the fish dangling from its side.
 *  15.8   "Next day? Steaks. For the whole crew." (laugh): a sunny deck, a full
 *         table, three plates of grilled steak and lemon, the crew forks up.
 *  18.3   "Nineteen years later, that same sub reached the TITANIC." (awe): 1986,
 *         Alvin's lamps on the Titanic's prow, seen from below.
 *  21.6   "But first," (tension): the sword flashes out of the dark and lands on
 *         frame 1.
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

export const FISH_AT = said('fish');
export const SUBMARINE_AT = said('SUBMARINE!');
export const YEAR_AT = said('1967.');
export const TWO_AT = said('Two');
export const FEET_AT = said('feet');
export const FLORIDA_AT = said('Florida,');
export const THREE_AT = said('three');
export const SUB_AT = said('sub');
export const ALVIN_AT = said('Alvin…');
export const THEN_AT = said('then');
export const BANG_AT = said('BANG!');
export const EIGHT_AT = said('eight-foot');
export const SWORDFISH_AT = said('swordfish');
export const RAMS_AT = said('rams');
export const SWORD_AT = said('sword');
export const STUCK_AT = said('STUCK!');
export const THEY_AT = said('They');
export const HEAD_AT = said('head');
export const ATTACHED_AT = said('attached!');
export const NEXT_AT = said('Next');
export const STEAKS_AT = said('Steaks.');
export const CREW_AT = said('crew.');
export const NINETEEN_AT = said('Nineteen');
export const TITANIC_AT = said('TITANIC.');
export const BUT_AT = said('But');
export const FIRST_AT = said('first,');

export type SceneId = 'hook' | 'descent' | 'ports' | 'sword' | 'rise' | 'steaks' | 'titanic';

/** Each scene's start; it stays until the next has faded in over it. Chronological: the hook comes back at the end. */
export const STARTS: Readonly<Record<SceneId, number>> = {
  hook: LOOP_S - 0.95,
  descent: 1.95,
  ports: THREE_AT - 0.3,
  sword: BANG_AT + 0.7,
  rise: THEY_AT - 0.15,
  steaks: NEXT_AT - 0.1,
  titanic: NINETEEN_AT - 0.15,
};
export const FADE = 0.28;
/** Drawn first to last, so each later scene covers the one before; the loop's last scene is the hook again. */
export const SCENE_IDS: readonly SceneId[] = ['descent', 'ports', 'sword', 'rise', 'steaks', 'titanic', 'hook'];
const AFTER: Readonly<Record<SceneId, SceneId | null>> = { hook: 'descent', descent: 'ports', ports: 'sword', sword: 'rise', rise: 'steaks', steaks: 'titanic', titanic: 'hook' };

/** How much of a scene shows at time t: fading in over FADE, then there until the next scene is fully in. */
export function sceneAlpha(id: SceneId, t: number): number {
  const u = wrap(t);
  if (id === 'hook') return u < STARTS.descent + FADE ? 1 : u >= STARTS.hook ? ramp(u, STARTS.hook, STARTS.hook + FADE) : 0;
  const next = AFTER[id];
  const end = (next ? STARTS[next] : LOOP_S) + FADE;
  return u >= STARTS[id] && u < end ? ramp(u, STARTS[id], STARTS[id] + FADE) : 0;
}

/** The loop's clock round the seam: negative in the last seconds, so the hook's approach and its first moments are one motion. */
export const pOf = (t: number): number => { const u = wrap(t); return u > LOOP_S / 2 ? u - LOOP_S : u; };

// ---------------------------------------------------------------- written things

export const yearAt = (t: number): number => window01(t, YEAR_AT - 0.05, TWO_AT + 0.1, 0.2);
export const depthAt = (t: number): number => window01(t, TWO_AT - 0.05, THREE_AT + 0.1, 0.2);
export const usDepthAt = (t: number): number => window01(t, FEET_AT - 0.35, THREE_AT + 0.1, 0.2);
export const placeAt = (t: number): number => window01(t, FLORIDA_AT - 0.35, THREE_AT + 0.15, 0.2);
export const nameAt = (t: number): number => window01(t, ALVIN_AT - 0.3, BANG_AT + 0.7, 0.2);
export const sizeAt = (t: number): number => window01(t, EIGHT_AT - 0.1, THEY_AT + 0.05, 0.2);
export const usSizeAt = (t: number): number => window01(t, EIGHT_AT + 0.3, THEY_AT + 0.05, 0.2);
export const yearLaterAt = (t: number): number => window01(t, NINETEEN_AT - 0.05, BUT_AT + 0.1, 0.25);

// ---------------------------------------------------------------- screen effects

const decay = (age: number, rate: number): number => (age <= 0 ? 0 : Math.exp(-age * rate));
const onset = (age: number, rate: number): number => (age <= 0 ? 0 : 1 - Math.exp(-age * rate));

/** The BANG: a white flash that rises in an instant and is gone in half a second. */
export const bangFlashAt = (t: number): number => 0.95 * onset(t - BANG_AT, 70) * decay(t - BANG_AT, 6);
/** The hard shake after the BANG, in px. */
export function bangShakeAt(t: number): { readonly dx: number; readonly dy: number } {
  const a = t - BANG_AT;
  const amp = 52 * onset(a, 80) * decay(a, 4.2);
  return { dx: amp * Math.sin(a * 83), dy: amp * 0.7 * Math.sin(a * 67 + 1) };
}
/** The faces: calm, uneasy on "then", then the gasp on BANG. */
export const shockAt = (t: number): number => onset(t - BANG_AT, 60) * (1 - ramp(t, SWORD_AT - 0.2, STUCK_AT));
export const uneasyAt = (t: number): number => ramp(t, THEN_AT - 0.1, THEN_AT + 0.35) * (1 - onset(t - BANG_AT, 60));
