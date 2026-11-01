import { BOIL_FPS } from '../../../src/art/textures';
import type { Pt } from '../../../src/art/pen';
import { lerp, ramp, window01 } from '../short';
import type { Placed } from '../seal/story';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This crocodile ate a SHARK": in August 2014, on the Adelaide River in
 * Australia's Northern Territory, an 18 ft (5.5 m) saltwater crocodile called
 * Brutus rose from the water with a bull shark of nearly 5 ft (1.5 m) across
 * his jaws, photographed from a tour cruise. Told by a narrator (words.ts),
 * each beat timed to the words, a function of time over a loop of LOOP_S. One
 * mood a sentence:
 *
 *   0     "This crocodile ate a SHARK!" (excited): the croc's head and shoulders
 *         rearing out of the brown river, a bull shark crosswise in its jaws,
 *         spray flying; the picture alone proves the title.
 *   2.1   "Australia's Adelaide River, twenty fourteen." (dramatic): wide, mangrove
 *         banks, a tour boat, the place and the year written over a still river.
 *   4.2   "An eighteen-foot saltwater croc called Brutus…": the whole croc along
 *         the boat, a measure bar, 18 ft over 5.5 m, the name BRUTUS.
 *   7.4   "rose up with a bull shark in his JAWS!" (surprised): the rise, a burst of
 *         spray, the camera shaken.
 *  10.2   "Bull sharks swim up rivers…" (nervous): under the water, brown-green,
 *         a bull shark gliding upstream.
 *  12.1   "and this one picked the wrong river." (mischievous): the shark swims
 *         on, a croc's eye and snout creeping up behind it at the surface.
 *  14.5   "Crocs will eat almost anything." (chuckles): the croc's smug head, a
 *         burp of bubbles.
 *  16.3   "Shark or croc: who would YOU bet on?" (curious): a face-off with a VS.
 *  18.3   "Because": a whip back to frame 1.
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

export const SHARK_HOOK_AT = said('SHARK!');
export const AUSTRALIA_AT = said('Australia\'s');
export const ADELAIDE_AT = said('Adelaide');
export const YEAR_AT = said('twenty fourteen.');
export const AN_AT = said('An');
export const EIGHTEEN_AT = said('eighteen-foot');
export const SALTWATER_AT = said('saltwater');
export const BRUTUS_AT = said('Brutus…');
export const ROSE_AT = said('rose');
export const BULL_AT = said('bull');
export const JAWS_AT = said('JAWS!');
export const BULLS_AT = said('Bull');
export const RIVERS_AT = said('rivers…');
export const AND_AT = said('and');
export const PICKED_AT = said('picked');
export const WRONG_AT = said('wrong');
export const RIVER_AT = said('river.');
export const CROCS_AT = said('Crocs');
export const ALMOST_AT = said('almost');
export const ANYTHING_AT = said('anything.');
export const SHARK_AT = said('Shark');
export const CROC_AT = said('croc:');
export const YOU_AT = said('YOU');
export const BET_AT = said('bet');
export const ON_AT = said('on?');
export const BECAUSE_AT = said('Because');

// ---------------------------------------------------------------- the scenes

export type SceneId = 'hook' | 'river' | 'size' | 'rise' | 'under' | 'wrong' | 'smug' | 'vs';
export const SCENE_IDS: readonly SceneId[] = ['hook', 'river', 'size', 'rise', 'under', 'wrong', 'smug', 'vs'];

export const RIVER_FROM = AUSTRALIA_AT - 0.1;
export const SIZE_FROM = AN_AT - 0.05;
export const RISE_FROM = ROSE_AT - 0.45;
export const UNDER_FROM = BULLS_AT - 0.1;
export const WRONG_FROM = AND_AT - 0.05;
export const SMUG_FROM = CROCS_AT - 0.1;
export const VS_FROM = SHARK_AT - 0.1;
export const BACK_FROM = BECAUSE_AT - 0.45;
const FADE = 0.16;

const between = (t: number, a: number, b: number): number => ramp(t, a, a + FADE) * (1 - ramp(t, b, b + FADE));

/** How much of each scene is on screen. The hook is also the rise's end, so the two meet without a seam. */
export function sceneAlpha(id: SceneId, t: number): number {
  switch (id) {
    case 'hook': return Math.max(1 - ramp(t, RIVER_FROM, RIVER_FROM + FADE), ramp(t, BACK_FROM, BACK_FROM + 0.3));
    case 'river': return between(t, RIVER_FROM, SIZE_FROM);
    case 'size': return between(t, SIZE_FROM, RISE_FROM);
    case 'rise': return between(t, RISE_FROM, UNDER_FROM);
    case 'under': return between(t, UNDER_FROM, WRONG_FROM);
    case 'wrong': return between(t, WRONG_FROM, SMUG_FROM);
    case 'smug': return between(t, SMUG_FROM, VS_FROM);
    case 'vs': return between(t, VS_FROM, BACK_FROM) * (1 - ramp(t, BACK_FROM, BACK_FROM + 0.3));
  }
}

// ---------------------------------------------------------------- frame 1: the croc rearing with the shark

/** The thrash: whole cycles a loop (about 1.5 a second), so the loop point matches. */
const THRASH = 30;
export const CROC_LEN = 2400;
export const BITE_SHARK_LEN = 1000;
/** Where the jaws close on the shark, on screen, once the croc is up. */
export const MOUTH_UP: Pt = { x: 600, y: 780 };
/** The river's surface across the hook. */
export const HOOK_WATER_Y = 1190;

/** A blow that dies away over `len` seconds from `at`. */
const decay = (t: number, at: number, len: number): number => (t >= at && t < at + len ? 1 - (t - at) / len : 0);

export interface Rear {
  readonly croc: Placed;
  /** The jaws' opening: a gap just wide enough for the shark. */
  readonly gape: number;
  readonly shark: Placed & { readonly bend: number };
  /** The mouth, on screen. */
  readonly mouth: Pt;
  /** Water rushing off: 1 just after the surge, dying away. */
  readonly spray: number;
}

/** The croc, `up` (0 under the river .. 1 reared), with the shark across its jaws, thrashing it about. */
export function rearAt(t: number, up: number): Rear {
  const ph = (2 * Math.PI * t) / LOOP_S;
  const th = Math.sin(THRASH * ph);
  const mouth = { x: MOUTH_UP.x + 10 * Math.sin(2 * ph) + 10 * th * up, y: MOUTH_UP.y + (1 - up) * 760 + 8 * Math.sin(3 * ph) };
  const rot = -0.82 + 0.03 * Math.sin(2 * ph) + 0.035 * th * up - 0.12 * (1 - up);
  const k = CROC_LEN / 310;
  const local = { x: 124 * k, y: 11 * k };
  const [c, s] = [Math.cos(rot), Math.sin(rot)];
  const croc: Placed = { x: mouth.x - (local.x * c - local.y * s), y: mouth.y - (local.x * s + local.y * c), len: CROC_LEN, rot, face: 1, beat: 6 * ph };
  const shark = { x: mouth.x, y: mouth.y, len: BITE_SHARK_LEN, rot: rot + 1.5 + 0.16 * Math.sin(THRASH * ph + 1.1) + 0.05 * Math.sin(2 * ph), face: 1 as const, beat: 2 * THRASH * ph, bend: 0.06 + 0.2 * Math.sin(THRASH * ph - 0.7) };
  return { croc, gape: 0.3 + 0.05 * th, shark, mouth, spray: 0 };
}

/** The hook (frame 1) : the croc already up, thrashing; the loop point matches the start. */
export const hookAt = (t: number): Rear => rearAt(t, 1);

/** Droplets flying off the thrash: one burst a thrash cycle, so the loop point matches. Age 0 .. 1. */
export const sprayAge = (t: number): number => (((THRASH * t) / LOOP_S) % 1 + 1) % 1;

// ---------------------------------------------------------------- the river

export const RIVER_WATER_Y = 880;
export const placeAt = (t: number): number => window01(t, AUSTRALIA_AT - 0.05, AN_AT + 0.05, 0.2);
export const placeRiverAt = (t: number): number => window01(t, ADELAIDE_AT - 0.05, AN_AT + 0.05, 0.2);
export const yearAt = (t: number): number => window01(t, YEAR_AT - 0.05, AN_AT + 0.15, 0.2);

/** The boat motors slowly across the river scene; at rest in the size scene. */
export const boatX = (t: number): number => lerp(150, 330, ramp(t, RIVER_FROM, SIZE_FROM + 0.6));

// ---------------------------------------------------------------- the size

export const SIZE_WATER_Y = 1000;
export const SIZE_LEN = 920;
export const SIZE_BAR_Y = 835;
export const sizeBarAt = (t: number): number => ramp(t, EIGHTEEN_AT - 0.1, EIGHTEEN_AT + 0.7);
export const feetAt = (t: number): number => window01(t, EIGHTEEN_AT, RISE_FROM + FADE, 0.2);
export const metresAt = (t: number): number => window01(t, EIGHTEEN_AT + 0.3, RISE_FROM + FADE, 0.2);
export const nameAt = (t: number): number => window01(t, BRUTUS_AT - 0.25, RISE_FROM + FADE, 0.2);
export const saltwaterAt = (t: number): number => window01(t, SALTWATER_AT, BRUTUS_AT - 0.1, 0.15);

/** The croc floats along the boat, its tail swaying; it comes in from the left. */
export function sizeCrocAt(t: number): Placed {
  const slide = ramp(t, SIZE_FROM, SIZE_FROM + 0.8);
  return { x: lerp(-200, 520, slide) + 14 * Math.sin(t * 0.9), y: SIZE_WATER_Y - 40 + 6 * Math.sin(t * 2.1), len: SIZE_LEN, rot: 0.03 * Math.sin(t * 1.6), face: 1, beat: t * 3.2 };
}

// ---------------------------------------------------------------- the rise

/** The croc surges up from the river on "rose", the shark across its jaws; spray bursts on "JAWS". */
export const riseUpAt = (t: number): number => ramp(t, ROSE_AT - 0.1, JAWS_AT - 0.15);
export const jawsAge = (t: number): number => t - JAWS_AT;
export const sharkTagAt = (t: number): number => window01(t, BULL_AT - 0.05, UNDER_FROM + FADE, 0.15);
export const risePose = (t: number): Rear => rearAt(t, riseUpAt(t));

// ---------------------------------------------------------------- under the river

export const sharkTagUnderAt = (t: number): number => window01(t, BULLS_AT, WRONG_FROM + FADE, 0.2);
export const upriverAt = (t: number): number => window01(t, RIVERS_AT - 0.45, WRONG_FROM + FADE, 0.2);

/** The bull shark gliding upstream (to the right), slow and steady, nervous in the murk. */
export function underShark(t: number): Placed & { readonly bend: number } {
  const u = t - UNDER_FROM;
  return { x: lerp(120, 640, ramp(t, UNDER_FROM, WRONG_FROM + 0.3)), y: 880 + 22 * Math.sin(u * 1.7), len: 760, rot: 0.04 * Math.sin(u * 1.5) - 0.02, face: 1, beat: u * 6, bend: 0.06 * Math.sin(u * 2) };
}

// ---------------------------------------------------------------- the wrong river

export const WRONG_WATER_Y = 740;
export const wrongTextAt = (t: number): number => window01(t, WRONG_AT - 0.05, SMUG_FROM + FADE, 0.15);

/** The shark swims on, carefree; the croc creeps up behind it from the left, eye and snout at the surface. */
export function wrongScene(t: number): { readonly shark: Placed & { readonly bend: number }; readonly croc: Placed; readonly lid: number; readonly grin: number } {
  const u = t - WRONG_FROM;
  const creep = ramp(t, PICKED_AT - 0.5, WRONG_AT + 0.6);
  return {
    shark: { x: lerp(430, 760, ramp(t, WRONG_FROM, SMUG_FROM)), y: 1050 + 14 * Math.sin(u * 1.9), len: 600, rot: 0.02 * Math.sin(u * 1.5), face: 1, beat: u * 6, bend: 0.05 * Math.sin(u * 2.2) },
    croc: { x: lerp(-520, 240, creep), y: WRONG_WATER_Y + 150 - 20 * ramp(t, PICKED_AT, WRONG_AT) + 5 * Math.sin(u * 2.3), len: 1000, rot: 0.02, face: 1, beat: u * 2.5 },
    lid: 0.55 * ramp(t, PICKED_AT, WRONG_AT),
    grin: ramp(t, WRONG_AT, RIVER_AT),
  };
}

// ---------------------------------------------------------------- the smug croc

export const SMUG_LEN = 2300;
export const burpAt = (t: number): number => Math.sin(Math.PI * ramp(t, ANYTHING_AT - 0.1, ANYTHING_AT + 0.45));
export const BURP_AT = ANYTHING_AT;

export function smugAt(t: number): { readonly croc: Placed; readonly gape: number; readonly lid: number; readonly puff: number } {
  const u = t - SMUG_FROM;
  return {
    croc: { x: -330 + 12 * Math.sin(u * 1.4), y: 900 + 8 * Math.sin(u * 2), len: SMUG_LEN, rot: -0.05 + 0.02 * Math.sin(u * 1.1), face: 1, beat: u * 2 },
    gape: 0.08 * Math.sin(Math.PI * ramp(t, ANYTHING_AT, ANYTHING_AT + 0.35)),
    lid: 0.5 + 0.1 * Math.sin(u * 2.4),
    puff: burpAt(t),
  };
}
export const burpTextAt = (t: number): number => window01(t, BURP_AT, BURP_AT + 0.8, 0.12);

// ---------------------------------------------------------------- the face-off

export const vsAt = (t: number): number => ramp(t, CROC_AT - 0.2, CROC_AT + 0.25);
export const questionAt = (t: number): number => window01(t, YOU_AT - 0.15, BACK_FROM + FADE, 0.15);
export const sharkSideAt = (t: number): number => ramp(t, SHARK_AT, SHARK_AT + 0.45);
export const crocSideAt = (t: number): number => ramp(t, CROC_AT - 0.3, CROC_AT + 0.2);

export interface Faceoff {
  readonly shark: Placed & { readonly bend: number };
  readonly croc: Placed;
  /** The croc's jaws, 0 .. 1. */
  readonly gape: number;
}

export function faceoffAt(t: number): Faceoff {
  const u = t - VS_FROM;
  const s = sharkSideAt(t);
  const c = crocSideAt(t);
  return {
    shark: { x: lerp(-500, 380, s), y: 600 + 12 * Math.sin(u * 2.4), len: 900, rot: 0.14 + 0.03 * Math.sin(u * 2), face: 1, beat: u * 9, bend: 0.1 * Math.sin(u * 3) },
    croc: { x: lerp(1650, 700, c), y: 1040 + 10 * Math.sin(u * 1.8), len: 980, rot: -0.08 + 0.02 * Math.sin(u * 2.2), face: -1, beat: u * 4 },
    gape: 0.18 * ramp(t, YOU_AT, ON_AT),
  };
}

// ---------------------------------------------------------------- the camera and the grade

export interface Camera {
  readonly zoom: number;
  readonly rot: number;
  readonly dx: number;
  readonly dy: number;
}

const WHIP_FROM = BACK_FROM - 0.25;
const WHIP_TO = BACK_FROM + 0.35;

/** A push in and out all loop (whole cycles), a shake on "JAWS" and on "SHARK", a whip into frame 1. */
export function cameraAt(t: number): Camera {
  const ph = (2 * Math.PI * t) / LOOP_S;
  const jolt = decay(t, JAWS_AT, 0.7) + 0.7 * decay(t, SHARK_HOOK_AT, 0.4) + 0.5 * decay(t, BURP_AT, 0.3);
  const whip = Math.sin(Math.PI * ramp(t, WHIP_FROM, WHIP_TO)) ** 2;
  return {
    zoom: 1.03 + 0.02 * Math.sin(ph) + 0.1 * whip,
    rot: -0.05 * whip,
    dx: 6 * Math.sin(2 * ph) + 22 * jolt * Math.sin(t * 71) - 120 * whip,
    dy: 5 * Math.sin(3 * ph) + 18 * jolt * Math.sin(t * 83 + 1),
  };
}

/** A white flash on the surge, on each cut, and on the whip. */
export function flashAt(t: number): number {
  return Math.max(0.55 * decay(t, JAWS_AT - 0.04, 0.3), 0.3 * decay(t, RIVER_FROM, 0.18), 0.3 * decay(t, UNDER_FROM, 0.18), 0.22 * decay(t, SMUG_FROM, 0.16), 0.5 * decay(t, BACK_FROM + 0.12, 0.25));
}

/** The cold, grey-green gloom under the water; a warm, sickly tint for the smug beat. */
export const gloomAt = (t: number): number => window01(t, UNDER_FROM, WRONG_FROM + FADE, 0.25);
