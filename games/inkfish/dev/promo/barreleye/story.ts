import type { SfxId } from '../../../src/audio/recipes';
import { curveAt, type Key, ramp, smooth, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This fish can see through its own head": the barreleye (Macropinna
 * microstoma), told by a narrator (words.ts). Every beat is timed to the
 * words, a function of time in seconds over a loop of LOOP_S.
 *
 *   0     a big side-on barreleye hovering, its green eyes glowing inside its clear head
 *   2.8   "The barreleye lives seven hundred metres down.": a depth tag counts down to 700 m
 *   5.0   "Those two dots aren't its eyes. They're its nostrils.": the camera pushes in; the dots
 *         are circled, "eyes?" is crossed out and "nostrils" written in
 *   8.8   "Its real eyes are the glowing green domes inside its clear head,": the eyes are
 *         labelled and glow; a gleam runs round the clear shield
 *   12.4  "staring straight up for the shadows of prey.": the camera pulls back; sight lines run
 *         up from the eyes and a copepod's shadow drifts over
 *   15.2  "When it spots one, its eyes swivel forward,": the eyes turn a quarter turn inside the shield
 *   17.8  "and up it goes.": nose up, it rises and snaps the copepod
 *   19.2  "Because unlike most fish,": it settles back, eyes up again, as the loop began.
 *
 * World units are px at zoom 1. The fish's body centre rests at the origin,
 * facing right; its own drawing (fish.ts) is in the same px.
 */
export const LOOP_S = 21;

/** When a word begins, in the sped-up voice.mp3 (which starts with the loop). */
export const wordAt = (w: Word): number => w.start / TEMPO;

/** When a word of the voiceover begins (`nth` for a word said more than once). */
export function said(text: string, nth = 0): number {
  const w = WORDS.filter((x) => x.text === text)[nth];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return wordAt(w);
}

export const NAME_AT = said('barreleye');
export const DEPTH_FROM = said('seven');
export const DEPTH_TO = said('down.');
export const PUSH_FROM = said('down.') + 0.25;
export const PUSH_TO = said('two') + 0.05;
export const CIRCLE_AT = said('dots');
export const STRIKE_AT = said("aren't");
export const NOSTRILS_AT = said('nostrils.');
export const REAL_AT = said('real');
export const GLOW_FROM = said('glowing');
export const CLEAR_AT = said('clear');
export const PULL_FROM = said('head,') + 0.3;
export const PULL_TO = said('straight') + 0.15;
export const SIGHT_FROM = said('staring');
export const PREY_IN = said('straight');
export const SPOT_AT = said('spots');
export const SWIVEL_FROM = said('swivel') - 0.1;
export const SWIVEL_TO = said('forward,') + 0.3;
export const RISE_FROM = said('and', 0);
export const CATCH_AT = said('goes.') + 0.42;
export const SETTLE_FROM = said('Because');
export const SETTLE_TO = LOOP_S - 0.2;

interface Pt { readonly x: number; readonly y: number }

const curve = (keys: readonly Key[], t: number): number => curveAt(keys, t).at;
/** A held value: no movement into or out of it. */
const hold = (t: number, at: number): Key => ({ t, at, rate: 0 });

// ---------------------------------------------------------------- the fish

/** Eyes pointing up (inside the head, relative to the body) and pointing forward, radians (0 is towards the snout). */
export const EYES_UP = -Math.PI / 2;
export const EYES_FORWARD = 0;

export interface FishPose {
  /** Body centre, world px. */
  readonly x: number;
  readonly y: number;
  /** Nose up is negative, radians. */
  readonly tilt: number;
  /** Where the tubular eyes point, relative to the body (EYES_UP .. EYES_FORWARD). */
  readonly eyes: number;
  /** Fin sculling phase, and 0 hovering .. 1 swimming hard. */
  readonly fin: number;
  readonly effort: number;
  /** The eyes' glow, about 1 at rest. */
  readonly glow: number;
  /** 0 .. 1 over the bite, or outside that. */
  readonly bite: number;
}

/** The top of the rise, just after the bite, and the end of its coast upwards. */
const RISE_TOP = CATCH_AT + 0.1;
const COAST = SETTLE_FROM + 0.05;
const FISH_X: readonly Key[] = [hold(0, 0), hold(RISE_FROM - 0.1, 0), { t: RISE_TOP, at: 140, rate: 70 }, hold(COAST, 158), hold(SETTLE_TO, 0), hold(LOOP_S, 0)];
const FISH_Y: readonly Key[] = [
  hold(0, 0), hold(RISE_FROM - 0.1, 0), { t: RISE_TOP, at: -330, rate: -90 }, hold(COAST, -352), hold(SETTLE_TO, 0), hold(LOOP_S, 0),
];
const TILT: readonly Key[] = [
  hold(0, 0), hold(RISE_FROM - 0.3, 0), { t: RISE_FROM + 0.5, at: -0.86, rate: -0.3 }, { t: RISE_TOP, at: -0.98, rate: 0 },
  { t: COAST, at: -0.9, rate: 0.25 }, hold(SETTLE_TO - 0.15, 0), hold(LOOP_S, 0),
];
const EYES: readonly Key[] = [
  hold(0, EYES_UP), hold(SWIVEL_FROM, EYES_UP), hold(SWIVEL_TO, EYES_FORWARD), hold(SETTLE_FROM + 0.15, EYES_FORWARD), hold(SETTLE_TO - 0.25, EYES_UP),
  hold(LOOP_S, EYES_UP),
];

/** Fin beats per loop at rest, and extra beats while it swims up: whole numbers, so the fins loop. */
const FIN_BEATS = 14;
const EXTRA_BEATS = 3;
const HARD_FROM = RISE_FROM - 0.15;
const HARD_TO = COAST + 0.3;
/** A slow hover: bobs and rocks a whole number of times per loop. */
const BOBS = 3;
const ROCKS = 2;

export function fishAt(t: number): FishPose {
  const phase = (FIN_BEATS * t) / LOOP_S + EXTRA_BEATS * smooth((t - HARD_FROM) / (HARD_TO - HARD_FROM));
  const lit = window01(t, GLOW_FROM - 0.1, PULL_FROM + 0.4, 0.35);
  return {
    x: curve(FISH_X, t),
    y: curve(FISH_Y, t) + 6 * Math.sin((2 * Math.PI * BOBS * t) / LOOP_S),
    tilt: curve(TILT, t) + 0.018 * Math.sin((2 * Math.PI * ROCKS * t) / LOOP_S + 0.7),
    eyes: curve(EYES, t),
    fin: 2 * Math.PI * phase,
    effort: window01(t, HARD_FROM, HARD_TO, 0.4),
    glow: 1 + 0.07 * Math.sin((2 * Math.PI * 6 * t) / LOOP_S) + lit * (0.7 + 0.4 * Math.sin(2 * Math.PI * 1.6 * (t - GLOW_FROM))),
    bite: (t - CATCH_AT + 0.12) / 0.3,
  };
}

/** A point of the fish's own drawing (body px, facing right, centre at 0, 0) in the world. */
export function onFish(f: FishPose, p: Pt): Pt {
  const c = Math.cos(f.tilt);
  const s = Math.sin(f.tilt);
  return { x: f.x + p.x * c - p.y * s, y: f.y + p.x * s + p.y * c };
}

/** Where things are on the fish, in its own px (fish.ts draws it so). */
export const ANATOMY = {
  mouth: { x: 400, y: 24 },
  /** The two nostrils (nares) above the mouth: they look like eyes. */
  nares: [{ x: 346, y: -4 }, { x: 306, y: -16 }],
  /** The eyes turn about these points, inside the clear shield; the near eye first. */
  pivots: [{ x: 226, y: -112 }, { x: 206, y: -120 }],
  /** From the pivot to the lens' centre along the eye, and the lens' radius. */
  lensReach: 96,
  lensR: 30,
  /** The shield's top. */
  domeTop: { x: 210, y: -272 },
} as const;

/** The centre of each lens (near eye first), in the world. */
export function lensesAt(f: FishPose): Pt[] {
  return ANATOMY.pivots.map((p) => onFish(f, { x: p.x + Math.cos(f.eyes) * ANATOMY.lensReach, y: p.y + Math.sin(f.eyes) * ANATOMY.lensReach }));
}

/** Which way the eyes look, in the world, radians. */
export const gazeOf = (f: FishPose): number => f.tilt + f.eyes;

export const mouthAt = (f: FishPose): Pt => onFish(f, ANATOMY.mouth);

// ---------------------------------------------------------------- the prey

/**
 * A copepod, the size of a grain of rice, drifting over the fish's head: a
 * dark shadow against the faint light from above. It drifts into the
 * upward sight lines as the narrator says "spots", hops away as the fish
 * comes up, and is caught at the fish's mouth.
 */
const PREY_FROM = PREY_IN - 0.2;
const PREY_SLOW = RISE_FROM - 0.05;
const PREY_X: readonly Key[] = [{ t: PREY_FROM, at: -640, rate: 230 }, { t: SPOT_AT, at: 226, rate: 110 }, { t: PREY_SLOW, at: 300, rate: 15 }];
const PREY_Y: readonly Key[] = [{ t: PREY_FROM, at: -540, rate: 25 }, { t: SPOT_AT, at: -470, rate: 0 }, { t: PREY_SLOW, at: -490, rate: -10 }];
const HOP_FROM = RISE_FROM + 0.1;

export interface Prey {
  readonly x: number;
  readonly y: number;
  /** Which way it swims (radians), and its legs' kick, 0 .. 1. */
  readonly heading: number;
  readonly kick: number;
}

export function preyAt(t: number): Prey | null {
  if (t < PREY_FROM || t >= CATCH_AT) return null;
  const drift: Pt = { x: curve(PREY_X, t), y: curve(PREY_Y, t) + 8 * Math.sin(2 * Math.PI * 0.7 * t) };
  if (t < HOP_FROM) return { ...drift, heading: Math.atan2(-0.1, 1), kick: 0.3 + 0.2 * Math.sin(2 * Math.PI * 1.3 * t) };
  // An escape hop, too late: it ends in the fish's mouth.
  const end = mouthAt(fishAt(CATCH_AT));
  const from: Pt = { x: curve(PREY_X, HOP_FROM), y: curve(PREY_Y, HOP_FROM) };
  const u = (t - HOP_FROM) / (CATCH_AT - HOP_FROM);
  const e = 1 - (1 - u) * (1 - u);
  return {
    x: from.x + (end.x - from.x) * e,
    y: from.y + (end.y - from.y) * e - 40 * Math.sin(Math.PI * u),
    heading: Math.atan2(end.y - from.y, end.x - from.x) * 0.5,
    kick: 1,
  };
}

/** The ring that pops round the copepod as the fish spots it: 0 .. 1 over its life, or outside that. */
export const spotRing = (t: number): number => (t - SPOT_AT) / 0.6;

// ---------------------------------------------------------------- the camera

export interface Camera {
  /** The world point at the middle of the picture, and px per world px. */
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** The whole fish, big, clear of the captions. */
export const WIDE: Camera = { x: -26, y: 162, zoom: 1.1 };
/** The face: the nostrils, with room on the right for the labels. */
const FACE: Camera = { x: 316, y: 85, zoom: 1.75 };
/** The shield and its eyes, for "its real eyes are…". */
const DOME: Camera = { x: 272, y: 122, zoom: 1.6 };
/** Pulled back, the fish low, the water above it open for the prey. */
const SKY: Camera = { x: 30, y: 130, zoom: 1 };
/** A little closer on the head as the eyes turn. */
const TURN: Camera = { x: 150, y: 140, zoom: 1.1 };
/** Following it up. */
const UP: Camera = { x: 150, y: -25, zoom: 0.8 };

const cams = (pick: (c: Camera) => number): Key[] => [
  hold(0, pick(WIDE)), hold(PUSH_FROM, pick(WIDE)), hold(PUSH_TO, pick(FACE)), hold(REAL_AT - 0.35, pick(FACE)), hold(REAL_AT + 0.6, pick(DOME)),
  hold(PULL_FROM, pick(DOME)), hold(PULL_TO, pick(SKY)), hold(SPOT_AT, pick(SKY)), hold(SWIVEL_TO, pick(TURN)), { t: RISE_TOP, at: pick(UP), rate: 0 },
  hold(SETTLE_FROM + 0.1, pick(UP)), hold(SETTLE_TO, pick(WIDE)), hold(LOOP_S, pick(WIDE)),
];
const CAM_X = cams((c) => c.x);
const CAM_Y = cams((c) => c.y);
const CAM_ZOOM = cams((c) => Math.log(c.zoom));

export function cameraAt(t: number): Camera {
  return { x: curve(CAM_X, t), y: curve(CAM_Y, t), zoom: Math.exp(curve(CAM_ZOOM, t)) };
}

// ---------------------------------------------------------------- marks on the picture

/** The depth tag: shown 0 .. 1, and the metres it reads. */
export const depthTag = (t: number): number => window01(t, NAME_AT, PUSH_FROM + 0.35, 0.35);
export const depthMetres = (t: number): number => Math.round(700 * ramp(t, DEPTH_FROM, DEPTH_TO + 0.2) / 10) * 10;

/** The ring drawn round the two dots, and the labels by it: how far each is drawn or shown, 0 .. 1. */
export const naresRing = (t: number): number => Math.min(ramp(t, CIRCLE_AT - 0.1, CIRCLE_AT + 0.35), 1 - ramp(t, REAL_AT - 0.45, REAL_AT - 0.1));
export const eyesGuess = (t: number): number => Math.min(ramp(t, CIRCLE_AT + 0.15, CIRCLE_AT + 0.4), 1 - ramp(t, REAL_AT - 0.45, REAL_AT - 0.1));
export const strike = (t: number): number => ramp(t, STRIKE_AT + 0.05, STRIKE_AT + 0.4);
export const nostrilsLabel = (t: number): number => Math.min(ramp(t, NOSTRILS_AT - 0.1, NOSTRILS_AT + 0.4), 1 - ramp(t, REAL_AT - 0.45, REAL_AT - 0.1));

/** "eyes" pointing at the green lenses. */
export const eyesLabel = (t: number): number => window01(t, REAL_AT - 0.05, PULL_FROM + 0.1, 0.35);
/** A gleam running once round the clear shield as the narrator says "clear head": 0 .. 1, or outside that. */
export const gleam = (t: number): number => (t - (CLEAR_AT - 0.1)) / 0.8;
/** The shield's outline, brighter while it's talked about. */
export const shieldLit = (t: number): number => window01(t, CLEAR_AT - 0.15, PULL_FROM + 0.3, 0.3);

/** Dashed sight lines from the eyes, along their gaze: shown 0 .. 1, and how far they reach, 0 .. 1. */
export const sight = (t: number): number => window01(t, SIGHT_FROM - 0.05, CATCH_AT - 0.05, 0.3);
export const sightReach = (t: number): number => ramp(t, SIGHT_FROM - 0.05, SIGHT_FROM + 0.85);

/** The curved arrow showing the eyes turn forward, 0 .. 1. */
export const swivelArrow = (t: number): number => window01(t, SWIVEL_FROM - 0.2, SWIVEL_TO + 0.35, 0.25);

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** How many words each caption line takes, in order: at most four, broken where the voice breaks. */
const LINE_SIZES = [4, 4, 3, 4, 4, 2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4] as const;

export const LINES: readonly Line[] = (() => {
  let at = 0;
  const groups = LINE_SIZES.map((n) => {
    const g = WORDS.slice(at, at + n);
    at += n;
    return g;
  });
  if (at !== WORDS.length) throw new Error(`captions take ${at} of ${WORDS.length} words`);
  return groups.map((g, i) => ({
    words: g,
    from: wordAt(g[0]!),
    to: i + 1 < groups.length ? wordAt(groups[i + 1]![0]!) : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (t >= wordAt(w)) word = i;
  });
  return { line, word };
}

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/** Quiet under the voice: it does the talking. */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'drop', t: DEPTH_FROM, pitch: 0.6, gain: 0.12, pan: -0.3 },
  { id: 'dash', t: PUSH_FROM + 0.1, pitch: 0.6, gain: 0.14, pan: 0 },
  { id: 'click', t: CIRCLE_AT, pitch: 0.9, gain: 0.16, pan: 0.2 },
  { id: 'click', t: STRIKE_AT + 0.1, pitch: 0.7, gain: 0.16, pan: 0.25 },
  { id: 'click', t: NOSTRILS_AT, pitch: 1.1, gain: 0.16, pan: 0.25 },
  { id: 'powerup', t: GLOW_FROM, pitch: 0.7, gain: 0.08, pan: 0 },
  { id: 'dash', t: PULL_FROM + 0.1, pitch: 0.55, gain: 0.12, pan: 0 },
  { id: 'spotted', t: SPOT_AT, pitch: 1, gain: 0.16, pan: 0.15 },
  { id: 'rustle', t: SWIVEL_FROM + 0.1, pitch: 1.2, gain: 0.14, pan: 0.1 },
  { id: 'dash', t: RISE_FROM + 0.05, pitch: 0.9, gain: 0.2, pan: 0.1 },
  { id: 'eat', t: CATCH_AT, pitch: 1.5, gain: 0.3, pan: 0.2 },
  { id: 'dash', t: SETTLE_FROM + 0.2, pitch: 0.5, gain: 0.1, pan: 0 },
];
