import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "Orcas only eat one part of a great white": off Mexico (the Gulf of
 * California, hunts filmed in 2020 and 2022, published in Frontiers in Marine
 * Science, November 2025) the "Moctezuma pod" flipped young great whites
 * belly-up. A shark on its back goes still (tonic immobility); the orcas went
 * for the liver, about a quarter of a shark's body, fatty and high-energy.
 * The liver is only ever a glowing outline inside a silhouette.
 *
 * Every beat is a function of video time t (seconds) over a loop of LOOP_S,
 * timed to the narrator's words (words.ts). One scene at a time:
 *
 *   0     "Orcas only eat ONE part of a great white." (menace): the orca's
 *         head close, jaws open over a young great white limp on its back;
 *         a slow push in on the orca's eye
 *   2.6   "Off Mexico," (tension): wide, blue Gulf water, the pod far off,
 *         "Gulf of California" / "Mexico"
 *   3.9   "a pod flipped young great whites upside down…" (action): the pod
 *         closes in and an orca rolls the shark over
 *   6.6   "and a shark on its back goes LIMP." (eerie): the shark hangs
 *         belly-up, still, sinking; "z z Z" drifting up
 *   8.9   "Then they went straight for…" an orca charging in, the water reddening
 *  10.1   "…the LIVER!" (shock): a flash to an X-ray: the shark's silhouette,
 *         the liver glowing warm orange inside it
 *  11.3   "It's about a QUARTER of a shark's body," (excited): the silhouette
 *         splits in four, one quarter lit; "¼"
 *  12.6   "all fat and energy." (hype): the liver pours into a battery that fills; sparkles
 *  13.9   "Picky eaters." (comic): the orca, nose in the air, a tiny napkin on
 *  15.0   "Because yes," the orca's head swings back in over the shark: frame 1.
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

export const ORCAS_AT = said('Orcas');
export const ONE_AT = said('ONE');
export const GREAT_AT = said('great');
export const WHITE_AT = said('white.');
export const WHITE_END = ends('white.');
export const OFF_AT = said('Off');
export const MEXICO_AT = said('Mexico,');
export const A_AT = said('a', 2);
export const POD_AT = said('pod');
export const FLIPPED_AT = said('flipped');
export const YOUNG_AT = said('young');
export const WHITES_AT = said('whites');
export const UPSIDE_AT = said('upside');
export const DOWN_AT = said('down…');
export const AND_AT = said('and');
export const SHARK_AT = said('shark');
export const BACK_AT = said('back');
export const LIMP_AT = said('LIMP.');
export const THEN_AT = said('Then');
export const STRAIGHT_AT = said('straight');
export const LIVER_AT = said('LIVER!');
export const ITS_AT = said("It's");
export const QUARTER_AT = said('QUARTER');
export const SHARKS_AT = said("shark's");
export const BODY_AT = said('body,');
export const ALL_AT = said('all');
export const FAT_AT = said('fat');
export const ENERGY_AT = said('energy.');
export const ENERGY_END = ends('energy.');
export const PICKY_AT = said('Picky');
export const EATERS_AT = said('eaters.');
export const BECAUSE_AT = said('Because');
export const YES_AT = said('yes,');

// ---------------------------------------------------------------- scenes

export type SceneId = 'hook' | 'gulf' | 'flip' | 'limp' | 'xray' | 'energy' | 'picky';

/** Crossfades: [from, to, the scene before, the scene after]. */
const CUTS: readonly (readonly [number, number, SceneId, SceneId])[] = [
  [WHITE_END + 0.12, WHITE_END + 0.36, 'hook', 'gulf'],
  [A_AT - 0.2, A_AT, 'gulf', 'flip'],
  [AND_AT - 0.22, AND_AT - 0.02, 'flip', 'limp'],
  [LIVER_AT - 0.1, LIVER_AT + 0.02, 'limp', 'xray'],
  [ALL_AT - 0.17, ALL_AT + 0.03, 'xray', 'energy'],
  [PICKY_AT - 0.2, PICKY_AT, 'energy', 'picky'],
  [BECAUSE_AT - 0.3, BECAUSE_AT - 0.02, 'picky', 'hook'],
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
  return { a: 'hook', b: null, mix: 0 };
}

/**
 * 1 until `from`, then back to 0 over 0.2 s: a beat's value going back to
 * where it started once its scene is off screen, so every value at the loop
 * point is what it was at frame 1.
 */
export const until = (u: number, from: number): number => 1 - ramp(u, from, from + 0.2);

// ---------------------------------------------------------------- the hook (frame 1 and the end)

/**
 * The hook runs on three clocks, each passing the same value at the same
 * rate at 0 and at LOOP_S: the orca's gape (0 shut .. 1 wide), the camera's
 * push in on its eye (zoom), and how far the orca has come in along its
 * heading (px). The start plays them on into the push; the end winds them
 * up from the orca drawing back, so the end flows into frame 1.
 */
const JAW0 = 0.8;
const JAW_RATE = 0.16;
const ZOOM_RATE = 0.075;
const IN_RATE = 22;
const HOOK_JAW: readonly Key[] = [{ t: 0, at: JAW0, rate: JAW_RATE }, { t: ONE_AT, at: 0.95 }, { t: 3, at: 1, rate: 0 }];
const END_JAW: readonly Key[] = [{ t: BECAUSE_AT - 0.35, at: 0.12, rate: 0 }, { t: LOOP_S, at: JAW0, rate: JAW_RATE }];
const HOOK_ZOOM: readonly Key[] = [{ t: 0, at: 1, rate: ZOOM_RATE }, { t: 3, at: 1.26, rate: 0.1 }];
const END_ZOOM: readonly Key[] = [{ t: BECAUSE_AT - 0.35, at: 0.9, rate: ZOOM_RATE }, { t: LOOP_S, at: 1, rate: ZOOM_RATE }];
const HOOK_IN: readonly Key[] = [{ t: 0, at: 0, rate: IN_RATE }, { t: 3, at: 45, rate: 12 }];
const END_IN: readonly Key[] = [{ t: BECAUSE_AT - 0.35, at: -260, rate: 160 }, { t: LOOP_S, at: 0, rate: IN_RATE }];

const hookPart = (u: number): boolean => u < 5;

/** The orca's gape in the hook, 0 .. 1. */
export const hookJawAt = (t: number): number => {
  const u = wrap(t);
  return curveAt(hookPart(u) ? HOOK_JAW : END_JAW, u).at;
};
/** The camera's zoom on the orca's eye in the hook. */
export const hookZoomAt = (t: number): number => {
  const u = wrap(t);
  return curveAt(hookPart(u) ? HOOK_ZOOM : END_ZOOM, u).at;
};
/** How far the orca has come in along its heading in the hook, px. */
export const hookInAt = (t: number): number => {
  const u = wrap(t);
  return curveAt(hookPart(u) ? HOOK_IN : END_IN, u).at;
};
/** The orca's eye catching the light on "ONE", 0 .. 1. */
export const glintAt = (t: number): number => window01(wrap(t), ONE_AT - 0.05, ONE_AT + 0.6, 0.18);

// ---------------------------------------------------------------- the flip

/** The shark's roll as the orcas flip it, 0 upright .. 1 on its back (π). */
export const rollAt = (t: number): number => ramp(wrap(t), UPSIDE_AT - 0.4, UPSIDE_AT + 0.3) * until(wrap(t), AND_AT + 0.1);
/** The ram: the orca's snout driving up under the shark, 0 .. 1 .. 0. */
export const ramAt = (t: number): number => window01(wrap(t), FLIPPED_AT - 0.4, DOWN_AT + 0.45, 0.45);

// ---------------------------------------------------------------- limp, and the charge

/** The shark going still on "LIMP": 0 .. 1. */
export const limpAt = (t: number): number => ramp(wrap(t), LIMP_AT - 0.05, LIMP_AT + 0.35) * until(wrap(t), LIVER_AT + 0.15);
/** The orca charging in on "Then they went straight for the…", 0 off screen .. 1 at the belly. */
export const chargeAt = (t: number): number => ramp(wrap(t), THEN_AT - 0.25, LIVER_AT + 0.05) * until(wrap(t), LIVER_AT + 0.15);
/** The flash as it cuts to the X-ray on "LIVER", 0 .. 1. */
export const flashAt = (t: number): number => {
  const s = wrap(t) - (LIVER_AT - 0.05);
  if (s < 0 || s > 0.3) return 0;
  return s < 0.05 ? s / 0.05 : (1 - (s - 0.05) / 0.25) ** 2;
};
/** The jolt with the flash, px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const s = wrap(t) - LIVER_AT;
  if (s < 0 || s > 0.4) return { x: 0, y: 0 };
  const amp = 22 * (1 - s / 0.4) ** 2;
  return { x: amp * Math.sin(s * 110), y: amp * 0.7 * Math.cos(s * 135) };
}

// ---------------------------------------------------------------- the X-ray, the quarter, the battery

/** The liver lighting up inside the silhouette, 0 .. 1. */
export const liverAt = (t: number): number => ramp(wrap(t), LIVER_AT - 0.04, LIVER_AT + 0.3) * until(wrap(t), ALL_AT + 0.1);
/** The silhouette splitting into four, one quarter lit, 0 .. 1. */
export const splitAt = (t: number): number => ramp(wrap(t), QUARTER_AT - 0.1, QUARTER_AT + 0.3) * until(wrap(t), ALL_AT + 0.1);
/** The battery filling, 0 .. 1: from "all" to the end of "energy". */
export const chargeLevelAt = (t: number): number => ramp(wrap(t), ALL_AT + 0.1, ENERGY_END) * until(wrap(t), PICKY_AT + 0.1);
/** The bolt and the sparkles on "energy", 0 .. 1 .. 0. */
export const boltAt = (t: number): number => window01(wrap(t), ENERGY_AT - 0.05, PICKY_AT + 0.1, 0.15);

// ---------------------------------------------------------------- picky

/** The orca's nose going up in the air on "Picky", 0 .. 1. */
export const sniffAt = (t: number): number => ramp(wrap(t), PICKY_AT - 0.05, PICKY_AT + 0.35) * until(wrap(t), BECAUSE_AT + 0.05);
