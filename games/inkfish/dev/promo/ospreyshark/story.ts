import { type Pt } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, lerp, ramp, window01 } from '../short';
import { type OspreyPose } from './art/osprey';
import { type SharkPlace } from './art/shark';
import { OSPREY_AT, RIG_MID, SPOTS, sharkPlace } from './rig';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This bird caught a SHARK… that caught a FISH!": on 12 April 2018, over
 * Madeira Beach, Florida, a photographer shot an osprey about 400 ft up
 * carrying a small shark in its talons; at home, zoomed in, he saw the shark
 * had a fish in its mouth. Told by a narrator (words.ts) through one camera,
 * every beat a pure function of time over LOOP_S:
 *
 *   0     "This bird caught a SHARK… that caught a FISH!" (excited): frame 1,
 *         close: the osprey, wings raised, the shark clamped under it head
 *         first, the silver fish hanging from the shark's jaws.
 *   3.1   "An osprey, 400 feet over Florida." (curious, airy): wide on the
 *         beach and the pier, the bird a speck high up; "Florida"; a dashed
 *         line down to the sand, "400 ft" over "120 m".
 *   6.1   "The photographer zoomed in…" (suspense): a camera's viewfinder over
 *         the shot; it zooms in on the speck.
 *   7.6   "a shark's TAIL!" (surprise): close on the shark's tail under the
 *         bird's feet, ringed in red, a "!".
 *   9.0   "And in its mouth? Another FISH!" (dramatic): along the shark to
 *         its jaws, down to the fish: ringed, a flash.
 *  11.4   "He called it a one-in-a-TRILLION shot." (playful): the shutter;
 *         the picture snaps into a print; a red "1 in 1,000,000,000,000" stamp.
 *  14.0   "Bad day to be the fish," (cheeky, a little sad): close on the
 *         fish's worried face, colour drained, a bead of sweat.
 *  15.6   "because" (mischief): the camera pulls back to frame 1.
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
const ended = (text: string, nth = 1): number => WORDS.filter((x) => x.text === text)[nth - 1]!.end / TEMPO;

export const AT = {
  bird: said('bird'),
  shark: said('SHARK…'),
  fish: said('FISH!'),
  an: said('An'),
  osprey: said('osprey,'),
  feet: said('400'),
  florida: said('Florida.'),
  the: said('The'),
  photographer: said('photographer'),
  zoomed: said('zoomed'),
  in: said('in…'),
  a: said('a', 3),
  sharks: said('shark\'s'),
  tail: said('TAIL!'),
  and: said('And'),
  mouth: said('mouth?'),
  another: said('Another'),
  fish2: said('FISH!', 2),
  he: said('He'),
  one: said('one'),
  trillion: said('TRILLION'),
  shot: said('shot.'),
  bad: said('Bad'),
  fishBad: said('fish,'),
  because: said('because'),
  end: ended('because'),
} as const;

// ---------------------------------------------------------------- the shots

export type ShotName = 'hook' | 'wide' | 'zoom' | 'tail' | 'mouth' | 'photo' | 'bad' | 'back';
type Cut = Exclude<ShotName, 'hook'>;

export const CUTS: Readonly<Record<Cut, number>> = {
  wide: AT.an - 0.1,
  zoom: AT.the - 0.1,
  tail: AT.a - 0.05,
  mouth: AT.and - 0.05,
  photo: AT.he - 0.12,
  bad: AT.bad - 0.1,
  back: AT.because - 0.08,
};
const ORDER: readonly Cut[] = ['wide', 'zoom', 'tail', 'mouth', 'photo', 'bad', 'back'];

export interface Shot {
  readonly name: ShotName;
  readonly s: number;
}

export function shotAt(t: number): Shot {
  const u = wrap(t);
  let name: ShotName = 'hook';
  let from = 0;
  for (const n of ORDER) {
    if (u >= CUTS[n]) {
      name = n;
      from = CUTS[n];
    }
  }
  return { name, s: u - from };
}

// ---------------------------------------------------------------- the cast

/** Integer cycles per loop, so every motion meets itself at the loop point. */
const cyc = (t: number, n: number, phase = 0): number => (2 * Math.PI * n * wrap(t)) / LOOP_S + phase;

export function ospreyAt(t: number): OspreyPose {
  const u = wrap(t);
  // A cry as the shot opens (beak open), then on "osprey".
  const cry = Math.max(window01(u, 0.05, 0.7, 0.15), window01(u, AT.osprey, AT.osprey + 0.6, 0.15));
  return { x: OSPREY_AT.x, y: OSPREY_AT.y + 6 * Math.sin(cyc(t, 11) - 0.6), k: 1, beat: cyc(t, 11), flap: 1, cry };
}

export function sharkAt(t: number): SharkPlace {
  const u = wrap(t);
  // The shark thrashes now and then: its tail beats faster on "SHARK" and on "TAIL".
  const thrash = 0.6 + 0.4 * Math.max(window01(u, AT.shark - 0.1, AT.shark + 1.2, 0.3), window01(u, AT.tail - 0.1, AT.tail + 1, 0.3));
  const beat = cyc(t, 15) + 0.8 * thrash * Math.sin(cyc(t, 33));
  const worried = 0.3 + 0.5 * window01(u, AT.fish - 0.1, AT.fish + 0.8, 0.2);
  return sharkPlace(0.8, beat, worried);
}

export interface FishState {
  readonly worry: number;
  readonly wiggle: number;
  readonly look: number;
  readonly swing: number;
}

export function fishAt(t: number): FishState {
  const u = wrap(t);
  const bad = window01(u, CUTS.bad - 0.2, CUTS.back + 0.5, 0.25);
  const flail = window01(u, AT.fish - 0.05, AT.fish + 0.8, 0.15) + window01(u, AT.fish2 - 0.05, AT.fish2 + 0.9, 0.15);
  const worry = clamp01(0.55 + 0.45 * Math.max(bad, flail));
  // It looks up at the viewer in the "bad day" close-up.
  const look = bad;
  const wiggle = (0.35 + 0.45 * clamp01(flail)) * Math.sin(cyc(t, 22)) + 0.15 * Math.sin(cyc(t, 7));
  const swing = 0.06 * Math.sin(cyc(t, 11, 0.9));
  return { worry, wiggle: wiggle * (1 - 0.6 * bad), look, swing };
}

// ---------------------------------------------------------------- the camera

/**
 * The camera looks at rig px: `f` (a point of the rig) lands on screen at `a`,
 * zoomed `z`. The wide shot is the same rig seen at a tenth of the size, with
 * the beach far below (scenery.ts).
 */
export interface Cam {
  readonly z: number;
  readonly f: Pt;
  readonly a: Pt;
}

export const HOOK_CAM: Cam = { z: 1.22, f: { x: 555, y: 660 }, a: { x: 540, y: 690 } };
/** Where the tiny bird is in the wide shot. */
export const WIDE_BIRD: Pt = { x: 700, y: 600 };
export const WIDE_Z = 0.1;
const WIDE: Cam = { z: WIDE_Z, f: RIG_MID, a: WIDE_BIRD };
const TAIL: Cam = { z: 2.1, f: SPOTS.tail, a: { x: 520, y: 880 } };
const JAWS: Cam = { z: 2.2, f: SPOTS.jaws, a: { x: 500, y: 700 } };
const FISH: Cam = { z: 2.0, f: SPOTS.fishMid, a: { x: 540, y: 820 } };
const FACE: Cam = { z: 4.3, f: SPOTS.fishFace, a: { x: 560, y: 760 } };
/** The photo shows frame 1, a little wider. */
export const PHOTO_CAM: Cam = { z: 0.8, f: { x: 548, y: 650 }, a: { x: 540, y: 560 } };

const lp = (p: Pt, q: Pt, u: number): Pt => ({ x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u) });
/** Between two cameras: the zoom geometric, the aim straight. */
function blend(c0: Cam, c1: Cam, u: number): Cam {
  const v = clamp01(u);
  return { z: c0.z * (c1.z / c0.z) ** v, f: lp(c0.f, c1.f, v), a: lp(c0.a, c1.a, v) };
}
const zoomBy = (c: Cam, k: number): Cam => ({ ...c, z: c.z * k });

export function camAt(t: number): Cam {
  const { name } = shotAt(t);
  const u = wrap(t);
  switch (name) {
    case 'hook':
      return zoomBy(HOOK_CAM, 1 + 0.05 * ramp(u, 0, CUTS.wide));
    case 'wide':
      return zoomBy(WIDE, 1 + 0.06 * ramp(u, CUTS.wide, CUTS.zoom + 0.3));
    case 'zoom': {
      // Holds a moment, then the lens racks in on the speck to the shark's tail.
      const go = ramp(u, AT.photographer + 0.1, CUTS.tail + 0.05);
      const v = go ** 1.6;
      return blend(zoomBy(WIDE, 1.06), TAIL, v);
    }
    case 'tail': {
      const punch = 1 + 0.06 * Math.exp(-(((u - AT.tail) * 6) ** 2)) * (u > AT.tail - 0.2 ? 1 : 0);
      return zoomBy(TAIL, (1 + 0.04 * ramp(u, CUTS.tail, CUTS.mouth)) * punch);
    }
    case 'mouth': {
      const along = blend(zoomBy(TAIL, 1.04), JAWS, ramp(u, CUTS.mouth, AT.mouth + 0.15));
      const down = blend(along, FISH, ramp(u, AT.another - 0.05, AT.fish2 + 0.1));
      const punch = 1 + 0.08 * Math.exp(-(((u - AT.fish2) * 5) ** 2)) * (u > AT.fish2 - 0.15 ? 1 : 0);
      return zoomBy(down, punch);
    }
    case 'photo':
      return PHOTO_CAM;
    case 'bad':
      return zoomBy(FACE, 1 + 0.05 * ramp(u, CUTS.bad, CUTS.back));
    case 'back':
      return blend(zoomBy(FACE, 1.05), HOOK_CAM, ramp(u, CUTS.back, LOOP_S));
  }
}

/** Rig px to screen px for a camera. */
export const toScreen = (c: Cam, p: Pt): Pt => ({ x: (p.x - c.f.x) * c.z + c.a.x, y: (p.y - c.f.y) * c.z + c.a.y });

// ---------------------------------------------------------------- mood, marks and writing

export interface Mood {
  /** Colour drained to grey-blue, 0 .. 1. */
  readonly drain: number;
  /** Warm sun, 0 .. 1. */
  readonly warm: number;
  /** A darker edge (suspense), 0 .. 1. */
  readonly vignette: number;
}

export function moodAt(t: number): Mood {
  const u = wrap(t);
  const sad = window01(u, CUTS.bad - 0.1, CUTS.back + 0.45, 0.3);
  const hook = u < CUTS.wide ? 1 - ramp(u, CUTS.wide - 0.2, CUTS.wide) : ramp(u, CUTS.back + 0.2, LOOP_S - 0.05);
  const warm = Math.max(hook, window01(u, CUTS.photo, CUTS.bad, 0.3) * 0.8);
  const tense = window01(u, CUTS.zoom + 0.2, CUTS.photo, 0.35);
  return { drain: 0.45 * sad, warm: 0.22 * warm, vignette: 0.55 * tense + 0.2 * sad };
}

/** A white flash: the shutter on "He called it", the reveal on "FISH!". */
export function flashAt(t: number): number {
  const u = wrap(t);
  const pop = (at: number, k: number): number => (u < at ? 0 : k * (1 - ramp(u, at, at + 0.3)));
  return Math.max(pop(AT.fish2, 0.4), pop(CUTS.photo + 0.02, 0.85));
}

/** The viewfinder over the zoom, the tail and the mouth. */
export const viewfinderAt = (t: number): number => window01(wrap(t), CUTS.zoom + 0.05, CUTS.photo, 0.18);
/** How much of the red ring round the tail (0 .. 1 drawn), and round the fish. */
export const tailRingAt = (t: number): number => (shotAt(t).name === 'tail' ? ramp(wrap(t), AT.tail - 0.05, AT.tail + 0.3) : 0);
export const fishRingAt = (t: number): number => (shotAt(t).name === 'mouth' ? ramp(wrap(t), AT.fish2 - 0.05, AT.fish2 + 0.3) : 0);
/** The "!" by the tail: how much, and its pop. */
export function bangAt(t: number): { readonly alpha: number; readonly scale: number } {
  const u = wrap(t);
  const alpha = shotAt(t).name === 'tail' ? window01(u, AT.tail - 0.02, CUTS.mouth, 0.1) : 0;
  return { alpha, scale: 1 + 0.5 * Math.exp(-(((u - AT.tail) * 9) ** 2)) };
}
const overBeach = (t: number): boolean => shotAt(t).name === 'wide' || shotAt(t).name === 'zoom';
/** "osprey" by the speck, "Florida" over the beach, the height line and its labels. */
export const ospreyTagAt = (t: number): number => (overBeach(t) ? window01(wrap(t), AT.osprey - 0.15, AT.feet + 0.1, 0.2) : 0);
export const floridaAt = (t: number): number => (overBeach(t) ? window01(wrap(t), AT.florida - 0.25, AT.photographer + 0.4, 0.25) : 0);
export const heightAt = (t: number): number => (overBeach(t) ? window01(wrap(t), AT.feet - 0.1, AT.photographer + 0.4, 0.25) : 0);

/** The print: how far it has snapped in (0 .. 1), and the stamp (0 none .. 1 down). */
export function photoAt(t: number): { readonly snap: number; readonly stamp: number } {
  const u = wrap(t);
  if (shotAt(t).name !== 'photo') return { snap: 0, stamp: 0 };
  return { snap: ramp(u, CUTS.photo, CUTS.photo + 0.35), stamp: ramp(u, AT.trillion - 0.12, AT.trillion + 0.06) };
}

/** A bead of sweat sliding down the fish's head: 0 none .. 1 dropped. */
export const sweatAt = (t: number): number => (shotAt(t).name === 'bad' ? ramp(wrap(t), AT.bad + 0.15, AT.fishBad + 0.3) : 0);
