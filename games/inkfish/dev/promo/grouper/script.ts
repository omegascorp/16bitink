import type { SfxId } from '../../../src/audio/recipes';
import { ramp, window01 } from '../short';
import {
  AND_AT, ANYONE_AT, BOLT_FROM, CORAL_AT, CRACK_AT, DOG_AT, DUMB_AT, GROUPER_AT, GULP_AT, HEAD_AT, HEADSTAND_AT, HIDING_AT, HUNT_AT, LETS_AT, LOOP_S,
  MORAY_AT, POINT_AT, POINTING_AT, PREY_AT, SHAKE_FROM, SHAKE_TO, SHAKES_AT, SLIDE, SLIDES_AT, SO_AT, SPOT_AT, SUCK_S, THEN_AT, BACK_OUT, FOLLOW, HOMEWARD,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (labels, the arrow, the inset, captions), and the sound effects under the voice. */

/** Something on screen at the loop point: 1 there until `out`, built up again from `back` after the middle. */
const kept = (t: number, out: number, back: number, fade = 0.25): number => (t < LOOP_S / 2 ? 1 - ramp(t, out, out + fade) : ramp(t, back, back + fade));

// ---------------------------------------------------------------- the point

/** The headstand's red arrow down from its nose, and "pointing": up in the hook, gone as it rises; back on "pointing" and as it tips into the loop. */
const ARROW_OUT = POINT_AT + 0.45;
const ARROW_BACK = DUMB_AT;
const ARROW_GONE = SLIDE.from + 0.1;
export const arrowAt = (t: number): number => (t < LOOP_S / 2 ? 1 - ramp(t, ARROW_OUT, ARROW_OUT + 0.25) : Math.max(window01(t, POINTING_AT - 0.08, ARROW_GONE, 0.25), ramp(t, ARROW_BACK, ARROW_BACK + 0.2)));
/** How much of the arrow is drawn, 0 .. 1: drawn down from the nose each time it comes back. */
export const arrowDrawn = (t: number): number => (t < LOOP_S / 2 ? 1 : t < ARROW_BACK - 0.2 ? ramp(t, POINTING_AT - 0.08, POINTING_AT + 0.3) : ramp(t, ARROW_BACK, ARROW_BACK + 0.3));
export const pointingLabel = arrowAt;

/** "headstand!" by the grouper as it tips, until "pointing" takes its place. */
export const headstandLabel = (t: number): number => window01(t, HEADSTAND_AT - 0.05, POINTING_AT + 0.05, 0.2);
/** A dashed ring round the hiding spot, drawn round on "hiding spot", and its label. */
export const spotRing = (t: number): number => window01(t, HIDING_AT - 0.05, ARROW_GONE, 0.2);
export const spotRingDrawn = (t: number): number => ramp(t, HIDING_AT - 0.05, SPOT_AT + 0.2);
export const spotLabel = (t: number): number => window01(t, HIDING_AT, ARROW_GONE, 0.2);

// ---------------------------------------------------------------- names

/** "prey" over the chromis as it darts in, "coral" on the reef. */
export const preyLabel = (t: number): number => window01(t, PREY_AT - 0.05, CORAL_AT + 0.75, 0.2);
export const coralLabel = (t: number): number => window01(t, CORAL_AT - 0.05, GROUPER_AT + 0.9, 0.2);
/** "grouper" over it as it swims up, "moray eel" by the hole. */
export const grouperLabel = (t: number): number => window01(t, GROUPER_AT - 0.05, SHAKES_AT, 0.2);
export const morayLabel = (t: number): number => window01(t, MORAY_AT - 0.05, LETS_AT, 0.2);
/** "crack" by the entrance as the eel slides in; "lunch!" by the grouper after the gulp. */
export const crackLabel = (t: number): number => window01(t, CRACK_AT - 0.05, AND_AT + 0.5, 0.2);
export const lunchLabel = (t: number): number => window01(t, GULP_AT + 0.05, SO_AT + 0.3, 0.2);

// ---------------------------------------------------------------- the shake and the bubble

/** Shake lines by its head while it shimmies. */
export const shakeLines = (t: number): number => window01(t, SHAKE_FROM, SHAKE_TO, 0.2);
/** "let's hunt" in a speech bubble, popped up on "let's" (0 .. ~1.1 with the pop's overshoot). */
export function bubbleAt(t: number): number {
  const shown = window01(t, LETS_AT - 0.15, THEN_AT + 0.1, 0.25);
  const pop = 1 + 0.12 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - LETS_AT + 0.12) / 0.3)));
  return shown * pop;
}

// ---------------------------------------------------------------- the dog and the last line

/** The pointer inset, popped in on "dog". */
export const dogAt = (t: number): number => window01(t, DOG_AT - 0.12, SLIDE.from + 0.35, 0.2);
/** "dumb?" written from "anyone", struck through on "dumb", gone before the loop point. */
export const dumbAt = (t: number): number => Math.min(ramp(t, ANYONE_AT - 0.1, ANYONE_AT + 0.15), 1 - ramp(t, LOOP_S - 0.26, LOOP_S - 0.02));
export const strikeAt = (t: number): number => ramp(t, DUMB_AT - 0.04, DUMB_AT + 0.12);

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,:…!]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    // The first line is up from the loop's first frame: the hook reads before its first word lands.
    from: i === 0 ? 0 : g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  // The loop opens a hair before the hook's first word: it is already the one being said.
  let word = line === LINES[0] ? 0 : -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
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

/**
 * Quiet under the voice, matching each mood: a bright ding on "POINT"
 * (curious); soft swishes and a pop for the bubble (warm); a "!" sting for
 * the headstand and dings as the spot and the point land (surprised); a low
 * slither for the eel, the chromis's alarm, and the game's suck-in and gulp
 * for lunch (mischievous); then only soft touches (soft).
 */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'clang', t: POINT_AT, pitch: 1.8, gain: 0.2, pan: 0.2 },
  { id: 'dash', t: POINT_AT + 0.6, pitch: 0.8, gain: 0.08, pan: 0.3 },
  { id: 'rustle', t: HOMEWARD.from + 0.2, pitch: 0.6, gain: 0.1, pan: -0.4 },
  { id: 'dash', t: PREY_AT - 0.3, pitch: 1.7, gain: 0.12, pan: 0.6 },
  { id: 'rustle', t: CORAL_AT + 0.2, pitch: 1.2, gain: 0.14, pan: 0.4 },
  { id: 'dash', t: GROUPER_AT + 0.05, pitch: 0.8, gain: 0.12, pan: 0.2 },
  { id: 'rustle', t: SHAKES_AT, pitch: 1.3, gain: 0.12, pan: -0.1 },
  { id: 'rustle', t: HEAD_AT - 0.1, pitch: 1.45, gain: 0.12, pan: -0.1 },
  { id: 'drop', t: LETS_AT - 0.1, pitch: 1.5, gain: 0.16, pan: -0.1 },
  { id: 'dash', t: HUNT_AT + 0.5, pitch: 0.9, gain: 0.1, pan: 0.1 },
  { id: 'rustle', t: FOLLOW.from + 0.1, pitch: 0.65, gain: 0.12, pan: -0.4 },
  { id: 'spotted', t: HEADSTAND_AT, pitch: 1.2, gain: 0.18, pan: 0.2 },
  { id: 'click', t: SPOT_AT, pitch: 1.2, gain: 0.2, pan: 0.2 },
  { id: 'clang', t: POINTING_AT, pitch: 1.6, gain: 0.2, pan: 0.2 },
  { id: 'drop', t: DOG_AT - 0.1, pitch: 1.3, gain: 0.16, pan: -0.4 },
  { id: 'rustle', t: SLIDES_AT, pitch: 0.55, gain: 0.18, pan: -0.1 },
  { id: 'spotted', t: SLIDE.lip, pitch: 1.4, gain: 0.14, pan: 0.2 },
  { id: 'dash', t: BOLT_FROM, pitch: 1.5, gain: 0.14, pan: 0.4 },
  { id: 'suck', t: GULP_AT - SUCK_S - 0.08, pitch: 1.0, gain: 0.16, pan: 0.4 },
  { id: 'eatBig', t: GULP_AT, pitch: 1.0, gain: 0.4, pan: 0.4 },
  { id: 'rustle', t: BACK_OUT.from + 0.2, pitch: 0.55, gain: 0.1, pan: -0.1 },
  { id: 'dash', t: SO_AT + 0.04, pitch: 0.8, gain: 0.06, pan: 0.1 },
  { id: 'click', t: DUMB_AT, pitch: 0.9, gain: 0.12, pan: 0 },
  { id: 'dash', t: DUMB_AT - 0.31, pitch: 0.75, gain: 0.06, pan: 0.2 },
];
