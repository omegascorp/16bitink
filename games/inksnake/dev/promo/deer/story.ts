import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, ramp, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This python swallowed a deer HEAVIER than itself!": narrated, a pure
 * function of time, every beat timed from the words. Collier-Seminole State
 * Park, Florida, April 2015 (Herpetological Review, 2018): biologists of the
 * Conservancy of Southwest Florida found an 11 ft (3.4 m) female Burmese
 * python of 31.5 lb (14.3 kg) with a big food bulge; when they caught it, it
 * brought up a white-tailed deer fawn of 35 lb (15.9 kg), 111% of its
 * weight. Scientists believe it is the largest predator-to-prey ratio on
 * record for the species. Never an adult deer, never a dissection, never the
 * snake dying, never head first as fact, never a digestion time.
 *
 *   0     frame 1: the python's jaws stretched round the back half of a
 *         spotted fawn, in the swamp at late light (hook)
 *   3.24  "The snake: thirty-one pounds. The fawn: THIRTY-FIVE!": a wooden
 *         balance, the coiled snake on one pan; the fawn drops on the other
 *         and it tips down with a thunk
 *   7.57  "Biologists in Florida spotted a huge lump in its belly…": two
 *         biologists crouched in the sawgrass, peering at the python laid
 *         out with a huge bulge mid-body (11 ft / 3.4 m)
 *   10.66 "so they picked it up… and it threw the whole deer back UP!": the
 *         two lift it between them; on "threw" the jaws gape, the fawn
 *         slides out onto the grass and the two jump back
 *   14.16 "Scientists think it's the biggest meal for its size ever
 *         recorded in a Burmese python.": the snake beside the fawn, 111%
 *         and a record ribbon
 *   18.56 "So next time you can't finish dinner, remember:": the coiled
 *         python by a half-finished dinner plate; the call to action
 *   20.38 the jaws open out of the swamp into frame 1
 */
export const LOOP_S = 21;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Word i's start and end in the video, seconds. */
export const startOf = (i: number): number => WORDS[i]!.start / TEMPO;
export const endOf = (i: number): number => WORDS[i]!.end / TEMPO;

/** How many words each caption line holds, in order (the first three are the hook, on screen together). */
export const LINE_WORDS: readonly number[] = [3, 3, 2, 2, 2, 2, 1, 3, 3, 4, 2, 3, 3, 3, 2, 3, 3, 3, 2, 4, 3, 3, 2];

/** Index of the first word of each line. */
const FIRST = LINE_WORDS.map((_, i) => LINE_WORDS.slice(0, i).reduce((s, n) => s + n, 0));

export const SWALLOWED_AT = startOf(2);
export const HEAVIER_AT = startOf(5);
export const SNAKE_AT = startOf(9);
export const THIRTY_ONE_AT = startOf(10);
export const FAWN_AT = startOf(13);
export const THIRTY_FIVE_AT = startOf(14);
export const HUGE_AT = startOf(20);
export const LUMP_AT = startOf(21);
export const PICKED_AT = startOf(27);
export const THREW_AT = startOf(32);
export const UP_AT = startOf(37);
export const BIGGEST_AT = startOf(42);
export const RECORDED_AT = startOf(48);
export const BURMESE_AT = startOf(51);
export const DINNER_AT = startOf(59);
export const LAST_END = endOf(WORDS.length - 1);

/** The cuts between shots, each just before the first word of its beat. */
export const CUT = {
  scale: startOf(8) - 0.12,
  spot: startOf(15) - 0.12,
  lift: startOf(25) - 0.12,
  record: startOf(38) - 0.12,
  rest: startOf(53) - 0.12,
} as const;

/** The jaws open out of the swamp into frame 1 over the last of the loop. */
export const IRIS_AT = LOOP_S - 0.62;

export type Scene = 'hook' | 'scale' | 'spot' | 'lift' | 'record' | 'rest';

export const sceneAt = (t: number): Scene => {
  const u = wrap(t);
  if (u < CUT.scale) return 'hook';
  if (u < CUT.spot) return 'scale';
  if (u < CUT.lift) return 'spot';
  if (u < CUT.record) return 'lift';
  if (u < CUT.rest) return 'record';
  return 'rest';
};

/** How much of the frame the hook covers: all of it in its own shot, and a widening circle over the last shot at the end. */
export const irisAt = (t: number): number => {
  const u = wrap(t);
  if (u < CUT.scale) return 1;
  return u < IRIS_AT ? 0 : clamp01((u - IRIS_AT) / (LOOP_S - IRIS_AT - 0.05));
};

const pulse = (u: number, at: number, up: number, down: number): number =>
  u < at ? 0 : u < at + up ? Math.sin(((u - at) / up) * Math.PI * 0.5) : Math.max(0, 1 - (u - at - up) / down) ** 2;

// ---------------------------------------------------------------- frame 1

/** The hook's own clock: the loop's end runs into frame 1 (negative before the loop point). */
export const hookClock = (t: number): number => {
  const u = wrap(t);
  return u >= IRIS_AT ? u - LOOP_S : u;
};

export interface HookPose {
  /** The gulp: the neck swells, the head nods and the camera kicks. */
  readonly gulp: number;
  readonly zoom: number;
  /** The head's nod about the mouth's corner (radians). */
  readonly nod: number;
  /** How far the jaws have walked on over the fawn (px, slowly). */
  readonly walk: number;
}

export function hookPose(t: number): HookPose {
  const u = hookClock(t);
  const gulp = Math.max(pulse(u, SWALLOWED_AT - 0.04, 0.12, 0.5), pulse(u, HEAVIER_AT - 0.04, 0.12, 0.5));
  const run = (u + 0.62) / (CUT.scale + 0.62);
  return { gulp, zoom: 1 + 0.025 * run + 0.035 * gulp, nod: 0.018 * Math.sin(u * 4.2) + 0.03 * gulp, walk: 10 * run };
}

// ---------------------------------------------------------------- the balance

/** The fawn dropping onto the right pan: 0 above the frame .. 1 landed. */
export const fawnDrop = (t: number): number => clamp01((wrap(t) - FAWN_AT + 0.05) / 0.32) ** 2;
export const LAND_AT = FAWN_AT - 0.05 + 0.32;
/** The beam's tilt (radians, + = the right end down): down on the snake's side, then over with a thunk and a wobble. */
export function beamTilt(t: number): number {
  const u = wrap(t);
  const from = -0.15;
  const to = 0.13;
  if (u < LAND_AT) return from;
  const k = u - LAND_AT;
  const settle = 1 - Math.exp(-k * 9) * Math.cos(k * 22);
  return from + (to - from) * Math.min(1.12, settle);
}
export const snakeWeight = (t: number): number => window01(wrap(t), THIRTY_ONE_AT - 0.05, CUT.spot, 0.18);
export const fawnWeight = (t: number): number => window01(wrap(t), THIRTY_FIVE_AT - 0.05, CUT.spot, 0.18);

// ---------------------------------------------------------------- the biologists

/** The lump pulsing as it is named ("huge lump"), and the length along the snake. */
export const lumpPulse = (t: number): number => Math.max(pulse(wrap(t), HUGE_AT - 0.04, 0.14, 0.4), pulse(wrap(t), LUMP_AT - 0.04, 0.14, 0.4));
export const lengthLabel = (t: number): number => window01(wrap(t), startOf(16) - 0.1, CUT.lift, 0.2);
/** The biologists leaning in to look (0 upright .. 1 peering), from "spotted". */
export const peer = (t: number): number => ramp(wrap(t), startOf(18) - 0.2, HUGE_AT + 0.2);

/** The lift: 0 the snake on the grass .. 1 held up at their waists, from "picked". */
export const liftAt = (t: number): number => ramp(wrap(t), PICKED_AT - 0.25, endOf(29) + 0.1);
/** The jaws gaping on "threw" (0 shut .. 1 wide), shutting again once the fawn is out. */
export const gapeAt = (t: number): number => {
  const u = wrap(t);
  return ramp(u, THREW_AT - 0.25, THREW_AT + 0.05) * (1 - ramp(u, UP_AT + 0.05, CUT.record));
};
/** The fawn coming out: 0 inside .. 0.5 out of the mouth .. 1 lying on the grass. */
export const throwUp = (t: number): number => ramp(wrap(t), THREW_AT - 0.05, startOf(36) + 0.05);
export const FAWN_DOWN_AT = startOf(36) + 0.05;
/** The two jumping back and the "!" over them. */
export const jumpBack = (t: number): number => pulse(wrap(t), THREW_AT + 0.12, 0.16, 0.9);
export const startle = (t: number): number => window01(wrap(t), THREW_AT + 0.12, CUT.record, 0.1);

// ---------------------------------------------------------------- the record

export const percentAt = (t: number): number => window01(wrap(t), BIGGEST_AT - 0.08, CUT.rest, 0.2);
export const percentPop = (t: number): number => pulse(wrap(t), BIGGEST_AT - 0.08, 0.15, 0.4);
export const ribbonAt = (t: number): number => window01(wrap(t), RECORDED_AT - 0.08, CUT.rest, 0.2);
export const ribbonPop = (t: number): number => pulse(wrap(t), RECORDED_AT - 0.08, 0.15, 0.45);
export const nameAt = (t: number): number => window01(wrap(t), BURMESE_AT - 0.08, CUT.rest, 0.2);

// ---------------------------------------------------------------- the words

export interface Line {
  readonly words: readonly Word[];
  readonly from: number;
  readonly to: number;
}

/** When the hook's words come up over the last of the iris, ready for frame 1. */
const HOOK_FROM = LOOP_S - 0.24;

/** The voiceover cut into short lines, each on screen from its first word until the next takes over. */
export const LINES: readonly Line[] = LINE_WORDS.map((n, i) => {
  const first = FIRST[i]!;
  return {
    words: WORDS.slice(first, first + n),
    from: i === 0 ? 0 : startOf(first),
    to: i + 1 < LINE_WORDS.length ? startOf(FIRST[i + 1]!) : HOOK_FROM,
  };
});

/** The three hook lines stand together from frame 1, in full, so it works with the sound off. */
export const HOOK_LINES = 3;
export const HOOK_TO = LINES[HOOK_LINES]!.from;

export const hookAlpha = (t: number): number => {
  const u = wrap(t);
  return u < HOOK_TO ? 1 : ramp(u, HOOK_FROM, LOOP_S - 0.04);
};

export const TEXT = {
  hook: { y: 380, gap: 118, size: 128 },
  line: { y: 452, size: 128 },
} as const;

/** The line on screen after the hook, and the word being said in it (−1 none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.slice(HOOK_LINES).find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  return { line, word: line.words.reduce((now, w, i) => (u >= w.start / TEMPO ? i : now), -1) };
}

/** The word being said in the hook lines, counted through all three (−1 none). */
export function hookWord(t: number): number {
  const u = wrap(t);
  return u < HOOK_TO ? WORDS.slice(0, FIRST[HOOK_LINES]!).reduce((now, w, i) => (u >= startOf(i) ? i : now), -1) : -1;
}

// ---------------------------------------------------------------- the last shot and the call to action

export const CTA_AT = CUT.rest + 0.05;
export const CTA_END = LOOP_S - 0.6;

/** The credit for this short: it comes in with the call to action, never before. */
export const CREDIT = { text: 'InkSnake · 16bit.ink/snake', from: CTA_AT } as const;

export const ctaAt = (t: number): number => window01(wrap(t), CTA_AT, CTA_END, 0.2);
export const arrowDraw = (t: number): number => clamp01((wrap(t) - CTA_AT - 0.15) / 0.45);

export const CTA = {
  big: { text: '16bit.ink/snake', y: 1010, size: 132 },
  small: { text: 'tap the channel name', y: 1120, size: 84 },
  arrow: { from: { x: 236, y: 1166 }, c0: { x: 262, y: 1320 }, c1: { x: 220, y: 1400 }, tip: { x: 160, y: 1470 } },
} as const;

/** The python's head turning to the plate on "dinner", and its tongue flicking. */
export const plateLook = (t: number): number => ramp(wrap(t), DINNER_AT - 0.3, DINNER_AT + 0.2);
export function tongueAt(t: number): number {
  const u = wrap(t);
  for (const s of [CUT.rest + 0.3, DINNER_AT + 0.1, CUT.record + 0.5, BURMESE_AT]) if (u >= s && u < s + 0.24) return Math.sin(((u - s) / 0.24) * Math.PI);
  return 0;
}

// ---------------------------------------------------------------- the sound

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch = 1, gain = 0.5, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** Quiet under the voice, one mood per beat: the gulps, the balance's thunk, the sneaking, the lift, the splat, the fanfare, the plate. */
export const SOUNDS: readonly SoundCue[] = [
  cue('swallow', 0.05, 0.6, 0.45),
  cue('gulp', SWALLOWED_AT - 0.02, 0.55, 0.6),
  cue('gulp', HEAVIER_AT - 0.02, 0.5, 0.65),
  cue('plop', CUT.scale + 0.05, 0.8, 0.3, -0.3),
  cue('click', THIRTY_ONE_AT, 0.9, 0.3, -0.3),
  cue('miss', FAWN_AT - 0.05, 1.2, 0.25, 0.3),
  cue('bump', LAND_AT, 0.45, 0.65, 0.3),
  cue('click', THIRTY_FIVE_AT, 1.1, 0.3, 0.3),
  cue('steps', CUT.spot + 0.1, 0.7, 0.25, -0.2),
  cue('steps', CUT.spot + 0.7, 0.65, 0.22, 0.2),
  cue('appear', HUGE_AT, 0.7, 0.3),
  cue('squeeze', LUMP_AT, 0.6, 0.3),
  cue('grown', PICKED_AT, 0.6, 0.3),
  cue('squeeze', THREW_AT - 0.1, 0.8, 0.35, -0.2),
  cue('swallow', THREW_AT + 0.05, 1.3, 0.4, -0.2),
  cue('bump', FAWN_DOWN_AT, 0.55, 0.5, -0.3),
  cue('strike', THREW_AT + 0.12, 1.1, 0.3, 0.2),
  cue('win', BIGGEST_AT - 0.05, 0.9, 0.3),
  cue('click', RECORDED_AT - 0.05, 1, 0.3),
  cue('grown', BURMESE_AT, 0.8, 0.25),
  cue('plop', CUT.rest + 0.1, 1, 0.3),
  cue('tick', DINNER_AT, 1.3, 0.25, -0.3),
  cue('swallow', IRIS_AT + 0.1, 0.6, 0.35),
];

/** Every value the picture is drawn from at t, by name (each shot's values only while that shot shows). */
export function stateAt(t: number): Readonly<Record<string, number>> {
  const h = hookPose(t);
  const scene = sceneAt(t);
  const on = (s: Scene): number => (scene === s ? 1 : 0);
  const rest = on('rest') * (1 - irisAt(t));
  return {
    iris: irisAt(t), hookClock: hookClock(t), gulp: h.gulp, zoom: h.zoom, nod: h.nod, walk: h.walk, hook: hookAlpha(t),
    drop: on('scale') * fawnDrop(t), tilt: on('scale') * beamTilt(t), w31: snakeWeight(t), w35: fawnWeight(t),
    lump: on('spot') * lumpPulse(t), length: lengthLabel(t), peer: on('spot') * peer(t),
    lift: on('lift') * liftAt(t), gape: on('lift') * gapeAt(t), throwUp: on('lift') * throwUp(t), jump: on('lift') * jumpBack(t), startle: startle(t),
    percent: percentAt(t), ribbon: ribbonAt(t), name: nameAt(t),
    cta: ctaAt(t), look: rest * plateLook(t), tongue: rest * tongueAt(t),
  };
}
