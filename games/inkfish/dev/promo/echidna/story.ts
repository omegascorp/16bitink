import { BOIL_FPS } from '../../../src/art/textures';
import type { Pt } from '../../../src/art/pen';
import { lerp, ramp, window01 } from '../short';
import { onAnimal, type Placed } from '../seal/story';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This shark swallowed a spiky animal from LAND": in 2022 on Orpheus Island
 * (Great Barrier Reef, Queensland), researchers tagging a 3 m (10 ft) tiger
 * shark saw it cough up a whole short-beaked echidna. Told by a narrator
 * (words.ts), each beat timed to the words, a function of time over a loop of
 * LOOP_S. One mood a sentence:
 *
 *   0     "This shark swallowed a spiky animal… from LAND!" (surprised): frame 1,
 *         the surface line of shallow turquoise water, a sandy island shore
 *         with trees above it (soft until "LAND"), the tiger shark close and
 *         big, jaws open, a spiky echidna going into its mouth, snout first.
 *   3.5   "Australia, twenty twenty-two." (dramatic): Orpheus Island in a rich
 *         sunrise sky, the place and the year written over it.
 *   5.8   "Scientists caught a ten-foot tiger shark to tag it…": a research
 *         boat, two people with gloves and a tag, the shark held alongside, 3 m
 *         over 10 ft.
 *   9.1   "and it coughed up a whole ECHIDNA!" (nervous, then shock): the shark's
 *         jaws pop open, the echidna flies out; then big and clear, "Spines,
 *         legs, everything" lighting each part in turn.
 *  13.8   "The echidna didn't make it…" (sad): the colours drain, a soft grey
 *         light, the echidna lying still on the deck.
 *  15.5   "the shark was totally fine." (laugh): bright again, the shark swims
 *         off with its new tag, a cheeky wiggle and a wink.
 *  17.6   "Tiger sharks eat almost ANYTHING. So yes," (mischievous): a turtle, a
 *         seabird and a tyre pass the shark's open mouth, then frame 1 again
 *         with the echidna sliding back in for the seam.
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

export const SHARK_AT = said('shark');
export const ANIMAL_AT = said('animal…');
export const LAND_AT = said('LAND!');
export const AUSTRALIA_AT = said('Australia,');
export const YEAR_AT = said('twenty twenty-two.');
export const SCIENTISTS_AT = said('Scientists');
export const CAUGHT_AT = said('caught');
export const TENFOOT_AT = said('ten-foot');
export const TIGER_AT = said('tiger');
export const TAG_AT = said('tag');
export const AND_AT = said('and');
export const COUGHED_AT = said('coughed');
export const ECHIDNA_AT = said('ECHIDNA!');
export const SPINES_AT = said('Spines,');
export const LEGS_AT = said('legs,');
export const EVERYTHING_AT = said('everything.');
export const THE_AT = said('The');
export const MAKE_AT = said('make');
export const FINE_THE_AT = said('the');
export const FINE_AT = said('fine.');
export const TIGER_SHARKS_AT = said('Tiger');
export const EAT_AT = said('eat');
export const ALMOST_AT = said('almost');
export const ANYTHING_AT = said('ANYTHING.');
export const SO_AT = said('So');

// ---------------------------------------------------------------- the scenes

export type SceneId = 'hook' | 'place' | 'tag' | 'cough' | 'sad' | 'fine';
export const SCENE_IDS: readonly SceneId[] = ['hook', 'place', 'tag', 'cough', 'sad', 'fine'];

export const PLACE_FROM = AUSTRALIA_AT - 0.1;
export const TAG_FROM = SCIENTISTS_AT - 0.1;
export const COUGH_FROM = AND_AT - 0.1;
export const SAD_FROM = THE_AT - 0.1;
export const FINE_FROM = FINE_THE_AT - 0.1;
export const MONTAGE_FROM = TIGER_SHARKS_AT - 0.1;
const FADE = 0.16;

const between = (t: number, a: number, b: number): number => ramp(t, a, a + FADE) * (1 - ramp(t, b, b + FADE));

/** How much of each scene is on screen. The hook is also the montage's frame, so the two meet without a seam. */
export function sceneAlpha(id: SceneId, t: number): number {
  switch (id) {
    case 'hook': return Math.max(1 - ramp(t, PLACE_FROM, PLACE_FROM + FADE), ramp(t, MONTAGE_FROM, MONTAGE_FROM + FADE));
    case 'place': return between(t, PLACE_FROM, TAG_FROM);
    case 'tag': return between(t, TAG_FROM, COUGH_FROM);
    case 'cough': return between(t, COUGH_FROM, SAD_FROM);
    case 'sad': return between(t, SAD_FROM, FINE_FROM);
    case 'fine': return between(t, FINE_FROM, MONTAGE_FROM);
  }
}

/** A blow that dies away over `len` seconds from `at`. */
const decay = (t: number, at: number, len: number): number => (t >= at && t < at + len ? 1 - (t - at) / len : 0);

const phase = (t: number): number => (2 * Math.PI * t) / LOOP_S;

// ---------------------------------------------------------------- frame 1 (and the montage): the shark and the echidna

/** The water's surface line across frame 1. */
export const HOOK_SURFACE_Y = 640;
export const HOOK_SHARK_LEN = 2400;
/** The echidna's size going into the mouth, in the shark's own units (a 40 cm animal on a 3 m shark is about 41; a bit larger here to read). */
export const MOUTH_ECHIDNA_LEN = 32;
/** The echidna's resting spot in the open mouth, in the shark's own units; `push` slides it in (0 outside .. 1 deep). */
export const mouthEchidna = (push: number): Placed => ({ x: lerp(166, 126, push), y: 27 - 2 * push, len: MOUTH_ECHIDNA_LEN, rot: -0.2, face: -1, beat: 0 });

/** How deep the echidna sits in the jaws in frame 1 (and where the cough starts it from). */
const HOOK_PUSH = 0.6;

export type PassKind = 'turtle' | 'bird' | 'tyre';
export interface Pass {
  readonly kind: PassKind;
  /** 0 outside the mouth .. 1 swallowed. */
  readonly u: number;
}

export const PASSES: readonly { readonly kind: PassKind; readonly at: number }[] = [
  { kind: 'turtle', at: EAT_AT },
  { kind: 'bird', at: ALMOST_AT + 0.12 },
  { kind: 'tyre', at: ANYTHING_AT + 0.25 },
];
const PASS_LEN = 0.5;
/** 0 when an item comes into view, 1 when it has been swallowed (`at`). */
export const passAge = (t: number, at: number): number => (t - (at - PASS_LEN)) / PASS_LEN;

export interface Hook {
  readonly shark: Placed & { readonly bend: number };
  readonly gape: number;
  readonly fear: number;
  readonly lid: number;
  /** The echidna's push into the mouth, <= 0: out of the mouth, absent. */
  readonly push: number;
  readonly passes: readonly Pass[];
  /** The shore above the water: 0 soft .. 1 sharp. */
  readonly focus: number;
  /** A mischievous dusk tint over the montage, 0 .. 1. */
  readonly tint: number;
}

/** The shark close and big, jaws open, always chomping a little; every clock a whole number of cycles a loop. */
export function hookAt(t: number): Hook {
  const u = wrap(t);
  const ph = phase(u);
  const montage = u > MONTAGE_FROM - 0.5;
  const back = ramp(u, SO_AT - 0.35, LOOP_S - 0.35);
  const sly = window01(u, MONTAGE_FROM, SO_AT + 0.4, 0.25);
  const passes = PASSES.map((p) => ({ kind: p.kind, u: passAge(u, p.at) })).filter((p) => p.u > 0 && p.u < 1);
  const push = montage ? lerp(-0.7, HOOK_PUSH, back) : HOOK_PUSH;
  return {
    shark: { x: -330 + 12 * Math.sin(3 * ph), y: 960 + 14 * Math.sin(2 * ph), len: HOOK_SHARK_LEN, rot: -0.1 + 0.014 * Math.sin(2 * ph + 1), face: 1, beat: 6 * ph, bend: 0.02 * Math.sin(2 * ph) },
    gape: 0.8 + 0.08 * Math.sin(7 * ph),
    fear: 0.55 - 0.35 * sly,
    lid: 0.45 * sly,
    push: push + (montage ? 0 : 0.07 * Math.sin(5 * ph)),
    passes,
    focus: ramp(u, LAND_AT - 0.15, LAND_AT + 0.35) * (1 - ramp(u, MONTAGE_FROM - 0.05, MONTAGE_FROM + 0.2)),
    tint: montage ? Math.sin(Math.PI * ramp(u, MONTAGE_FROM, LOOP_S - 0.2)) ** 0.7 * 0.5 : 0,
  };
}

/** Bubbles and motes rising through the water (whole cycles a loop): `age` 0 .. 1 for each. */
export const riseAge = (t: number, i: number, cycles = 2): number => (((t / LOOP_S) * cycles + i * 0.173) % 1 + 1) % 1;

// ---------------------------------------------------------------- Orpheus Island

export const placeLineAt = (t: number): number => window01(t, AUSTRALIA_AT - 0.05, SCIENTISTS_AT + 0.05, 0.2);
export const islandLineAt = (t: number): number => window01(t, AUSTRALIA_AT + 0.25, SCIENTISTS_AT + 0.05, 0.2);
export const reefLineAt = (t: number): number => window01(t, AUSTRALIA_AT + 0.7, SCIENTISTS_AT + 0.05, 0.2);
export const yearAt = (t: number): number => window01(t, YEAR_AT - 0.05, SCIENTISTS_AT + 0.15, 0.2);
/** The slow push towards the island. */
export const placeZoomAt = (t: number): number => ramp(t, PLACE_FROM, TAG_FROM + 0.3);

// ---------------------------------------------------------------- the tagging

export const TAG_SURFACE_Y = 780;
export const TAG_SHARK_LEN = 1000;
export const metricAt = (t: number): number => window01(t, TENFOOT_AT - 0.1, COUGH_FROM + FADE, 0.2);
export const usAt = (t: number): number => window01(t, TENFOOT_AT + 0.25, COUGH_FROM + FADE, 0.2);
export const sizeBarAt = (t: number): number => ramp(t, TENFOOT_AT - 0.1, TENFOOT_AT + 0.7);
export const sharkTagLabelAt = (t: number): number => window01(t, TIGER_AT - 0.05, TAG_AT - 0.1, 0.15);
/** The tag pops onto the fin, 0 .. 1. */
export const tagOnAt = (t: number): number => ramp(t, TAG_AT, TAG_AT + 0.3);
export const tagWordAt = (t: number): number => window01(t, TAG_AT - 0.05, COUGH_FROM + FADE, 0.15);
/** The researchers lean in, 0 .. 1. */
export const leanAt = (t: number): number => ramp(t, SCIENTISTS_AT, SCIENTISTS_AT + 0.6) * (1 - 0.6 * ramp(t, TAG_AT + 0.3, TAG_AT + 1));

export function tagSharkAt(t: number): Placed & { readonly bend: number } {
  const u = t - TAG_FROM;
  const slide = ramp(t, CAUGHT_AT - 0.3, CAUGHT_AT + 0.6);
  return { x: lerp(1500, 590, slide) + 8 * Math.sin(u * 1.2), y: 990 + 8 * Math.sin(u * 1.7), len: TAG_SHARK_LEN, rot: 0.01 * Math.sin(u * 1.4), face: 1, beat: u * 3.4, bend: 0.03 * Math.sin(u * 1.9) };
}

// ---------------------------------------------------------------- the cough

export const COUGH_SHARK: Placed = { x: -420, y: 1500, len: 2300, rot: -0.06, face: 1, beat: 0 };
export const echidnaLabelAt = (t: number): number => window01(t, ECHIDNA_AT - 0.05, SAD_FROM + FADE, 0.2);
export const spinesAt = (t: number): number => window01(t, SPINES_AT - 0.05, LEGS_AT - 0.02, 0.1);
export const legsAt = (t: number): number => window01(t, LEGS_AT - 0.02, EVERYTHING_AT - 0.02, 0.1);
export const everythingAt = (t: number): number => window01(t, EVERYTHING_AT - 0.02, SAD_FROM + 0.1, 0.15);
export const FLY_FROM = COUGHED_AT + 0.02;
export const FLY_TO = ECHIDNA_AT + 0.15;
export const COUGH_BIG_LEN = 640;
export const COUGH_REST: Pt = { x: 600, y: 720 };

export interface Cough {
  readonly shark: Placed & { readonly bend: number };
  readonly gape: number;
  readonly fear: number;
  /** 0 .. 1 along the way out; the echidna is in the mouth while < MOUTH_PART. */
  readonly fly: number;
  readonly echidna: Placed;
  readonly bristle: number;
}

/** The echidna's flight is in the mouth until this much of it is done. */
export const MOUTH_PART = 0.18;

export function coughAt(t: number): Cough {
  const u = t - COUGH_FROM;
  const shake = 1 - ramp(t, COUGHED_AT, COUGHED_AT + 0.3);
  const shark = {
    ...COUGH_SHARK,
    x: COUGH_SHARK.x + 7 * shake * Math.sin(t * 52) + 6 * Math.sin(u * 1.3),
    y: COUGH_SHARK.y + 5 * shake * Math.sin(t * 61 + 1) + 10 * Math.sin(u * 1.7),
    beat: u * 3,
    bend: 0.02 * Math.sin(u * 1.5),
  };
  const gape = ramp(t, COUGHED_AT - 0.12, COUGHED_AT + 0.12) * (0.92 - 0.45 * ramp(t, ECHIDNA_AT + 0.4, ECHIDNA_AT + 1));
  const fly = ramp(t, FLY_FROM, FLY_TO);
  const k = shark.len / 310;
  const exit = mouthEchidna(0.0);
  const start = onAnimal(shark, { x: exit.x, y: exit.y });
  const rest = { x: COUGH_REST.x + 10 * Math.sin(u * 1.1), y: COUGH_REST.y + 16 * Math.sin(u * 1.6) };
  const f = Math.max(0, (fly - MOUTH_PART) / (1 - MOUTH_PART));
  const inside = fly < MOUTH_PART;
  // In the jaws (as deep as frame 1 has it), slid out to the lips, where the flight takes over.
  const echidna: Placed = inside
    ? mouthEchidna(HOOK_PUSH * (1 - fly / MOUTH_PART))
    : {
        x: lerp(start.x, rest.x, f),
        y: lerp(start.y, rest.y, f) - 260 * Math.sin(Math.PI * f) * (1 - f),
        len: lerp(mouthEchidna(0).len * k, COUGH_BIG_LEN, ramp(f, 0, 0.8)),
        rot: lerp(shark.rot + mouthEchidna(0).rot, 0.08, f) - 0.5 * Math.sin(Math.PI * f),
        face: -1,
        beat: u * 5,
      };
  return { shark, gape, fear: 0.2 + 0.8 * ramp(t, COUGH_FROM, COUGHED_AT), fly, echidna, bristle: Math.max(decay(t, ECHIDNA_AT, 1.2), ramp(t, COUGHED_AT, ECHIDNA_AT) * 0.6) };
}

/** Where the cough's shock burst is centred, and when. */
export const shockAge = (t: number): number => t - ECHIDNA_AT;

// ---------------------------------------------------------------- the sad deck

export const SAD_LEN = 700;
export const sadEchidna = (t: number): Placed => ({ x: 650, y: 830 + 2 * Math.sin((t - SAD_FROM) * 0.9), len: SAD_LEN, rot: 0.03, face: -1, beat: 0 });
export const sadDropAt = (t: number): number => ramp(t, SAD_FROM, SAD_FROM + 0.7);
/** The colours draining and coming back. */
export const drainAt = (t: number): number => ramp(t, THE_AT - 0.4, THE_AT + 0.4) * (1 - ramp(t, FINE_THE_AT - 0.05, FINE_THE_AT + 0.35));

// ---------------------------------------------------------------- the shark swims off

export function fineSharkAt(t: number): Placed & { readonly bend: number; readonly lid: number } {
  const u = t - FINE_FROM;
  const off = ramp(t, FINE_AT - 0.9, MONTAGE_FROM + 0.1);
  const wiggle = Math.min(1, 0.4 + ramp(t, FINE_AT - 1.2, FINE_AT));
  return {
    x: lerp(250, 1040, off),
    y: lerp(1080, 850, off) + 14 * Math.sin(u * 3.1),
    len: lerp(1700, 640, off),
    rot: -0.1 * off + 0.03 * Math.sin(u * 2.4),
    face: 1,
    beat: u * 9 * wiggle,
    bend: 0.14 * Math.sin(u * 5.4) * wiggle,
    lid: 0.5 + 0.5 * Math.sin(Math.PI * ramp(t, FINE_AT + 0.2, FINE_AT + 0.45)) ** 2,
  };
}
export const fineTagAt = (t: number): number => window01(t, FINE_AT - 0.2, MONTAGE_FROM + FADE, 0.2);

// ---------------------------------------------------------------- the camera

export interface Camera {
  readonly zoom: number;
  readonly rot: number;
  readonly dx: number;
  readonly dy: number;
}

const WHIP_FROM = SO_AT - 0.45;
const WHIP_TO = SO_AT + 0.25;

/** A push in and out all loop (whole cycles), a shake on "LAND" and "ECHIDNA", a whip into frame 1 on "So". */
export function cameraAt(t: number): Camera {
  const ph = phase(t);
  const jolt = decay(t, LAND_AT, 0.5) + decay(t, COUGHED_AT, 0.45) + 1.2 * decay(t, ECHIDNA_AT, 0.7) + 0.4 * decay(t, FINE_AT, 0.3);
  const whip = Math.sin(Math.PI * ramp(t, WHIP_FROM, WHIP_TO)) ** 2;
  return {
    zoom: 1.03 + 0.02 * Math.sin(ph) + 0.08 * whip + 0.05 * ramp(t, SAD_FROM, FINE_FROM) * (1 - ramp(t, FINE_FROM, FINE_FROM + 0.2)),
    rot: -0.04 * whip + 0.008 * Math.sin(3 * ph),
    dx: 6 * Math.sin(2 * ph) + 20 * jolt * Math.sin(t * 71) - 100 * whip,
    dy: 5 * Math.sin(3 * ph) + 16 * jolt * Math.sin(t * 83 + 1),
  };
}

/** A white flash on the cut to each scene and on the shock. */
export function flashAt(t: number): number {
  return Math.max(0.55 * decay(t, ECHIDNA_AT - 0.04, 0.3), 0.28 * decay(t, PLACE_FROM, 0.18), 0.22 * decay(t, TAG_FROM, 0.16), 0.3 * decay(t, FINE_FROM, 0.2), 0.35 * decay(t, COUGHED_AT, 0.18), 0.4 * decay(t, SO_AT - 0.2, 0.25));
}
