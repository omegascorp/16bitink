import type { SfxId } from '../../../src/audio/recipes';
import { ramp, window01 } from '../short';
import {
  BITE_AT, camAt, DINOS_AT, FIFTY_AT, FOREST_AT, GREW_AT, HOME_FROM, HOME_TO, IMPACT_AT, LOOP_S, REMEMBER_AT,
  REWIND_FROM, REWIND_TO, SIXTY_AT, SO_AT, SPOTS_AT, STREAK_FROM, SUCK_S, SWAM_AT, TODAY_CAM, TOP_AT, TREES_THE_AT, TREES_WORD_AT, TURN_AT, TURN_BACK_AT, WHOOSH_FROM,
  WHOOSH_TO, WIPED_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (the readout, notes and captions), and the sound effects under the voice. */

// ---------------------------------------------------------------- the readout

/** "450 million years ago" across the top, from the rewind until "So…". */
export const readoutAt = (t: number): number => window01(t, REWIND_FROM + 0.05, SO_AT + 0.3, 0.25);

/** Progress of the camera between two places on the timeline, 0 .. 1. */
const along = (t: number, from: number, to: number): number => Math.max(0, Math.min(1, (camAt(t) - from) / (to - from)));

/**
 * Where the story is on the timeline, millions of years ago (0: today): it
 * rolls with the camera, landing on 450 on "fifty", 390 on "grew", 66 on
 * "asteroid". The readout shows it, and the red ▼ on the ruler points at it.
 */
export function nowAt(t: number): number {
  if (t < REWIND_FROM || t >= HOME_TO) return 0;
  if (t < REWIND_TO) return 450 * along(t, TODAY_CAM, 450);
  if (t < TREES_THE_AT) return 450;
  if (t < GREW_AT) return 450 - 60 * ramp(t, TREES_THE_AT, GREW_AT - 0.05);
  if (t < WHOOSH_FROM) return 390;
  if (t < WHOOSH_TO) return 390 - 324 * along(t, 417, 62);
  if (t < HOME_FROM) return 66;
  return 66 * (1 - ramp(t, HOME_FROM, HOME_TO - 0.05));
}

/** The year on the readout, in whole millions of years. */
export const yearAt = (t: number): number => Math.round(nowAt(t));

/** Whether a story moment's number on the ruler is picked out in red: 450 and 390 while we're at them (both for the bracket), 66 for the asteroid. */
export function momentLit(myr: number, t: number): boolean {
  if (myr === 450) return t >= REWIND_TO - 0.1 && t < WHOOSH_FROM;
  if (myr === 390) return t >= GREW_AT - 0.1 && t < WHOOSH_FROM;
  if (myr === 66) return t >= WHOOSH_TO - 0.1 && t < HOME_FROM;
  return false;
}

export const yearText = (myr: number): string => (myr > 0 ? `${myr} million years ago` : 'today');

/** The tape-deck arrows by the readout: -1 rewinding (◀◀), 1 fast forward (▶▶), 0 none. */
export function windingAt(t: number): number {
  if (t > REWIND_FROM && t < REWIND_TO - 0.15) return -1;
  if ((t > WHOOSH_FROM && t < WHOOSH_TO - 0.1) || (t > HOME_FROM && t < HOME_TO - 0.1)) return 1;
  return 0;
}

// ---------------------------------------------------------------- notes

/** The hook's comparison, "sharks: 450 million years" over "trees: 390 million years", and "older ✓" by the shark: on from "remember", off as the rewind starts (before the readout takes their place). */
export const hookTags = (t: number): number => (t < LOOP_S / 2 ? 1 - ramp(t, REWIND_FROM - 0.25, REWIND_FROM + 0.05) : ramp(t, REMEMBER_AT - 0.1, REMEMBER_AT + 0.2));
/** "first sharks" over the early shark, from "swam". */
export const firstSharksLabel = (t: number): number => window01(t, SWAM_AT - 0.1, TREES_THE_AT + 0.25, 0.25);
/** "first trees" by the sprouting tree, on "grew". */
export const firstTreesLabel = (t: number): number => window01(t, GREW_AT + 0.1, WHOOSH_FROM + 0.15, 0.25);
/** The bracket on the ruler from 450 to 390, drawn out on "sixty", and its "60 million years". */
export const bracketShown = (t: number): number => window01(t, SIXTY_AT - 0.1, WHOOSH_FROM + 0.15, 0.2);
export const bracketDrawn = (t: number): number => ramp(t, SIXTY_AT - 0.1, SIXTY_AT + 0.35);
/** "dinosaurs" over them as they fall. */
export const dinosLabel = (t: number): number => window01(t, DINOS_AT - 0.15, DINOS_AT + 0.7, 0.2);
/** "survived" by the shark once the dust is flying. */
export const survivedLabel = (t: number): number => window01(t, IMPACT_AT + 0.5, HOME_FROM + 0.1, 0.25);
/** "apex predator" by the shark on "top of the food chain". */
export const apexLabel = (t: number): number => window01(t, TOP_AT - 0.1, SO_AT + 0.35, 0.25);

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
    const full = !last || last.length >= 4 || /[.,:…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    // The first line is up from the loop's first frame.
    from: i === 0 ? 0 : g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = -1;
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

/** The odometer ticking as the years roll by in the rewind: fast, then slowing to a stop. */
const TICKS: readonly SoundCue[] = [0.1, 0.25, 0.38, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.15, 1.32, 1.52, 1.75].map((d) => ({
  id: 'click', t: REWIND_FROM + d, pitch: 1.2, gain: 0.16, pan: 0.2,
}));

/**
 * Quiet under the voice: it does the talking. A whoosh for each trip along
 * the timeline, a bright "ding" as each number lands, a growing chime for
 * the tree, a big low boom for the asteroid (nothing funny there), and the
 * game's own suck-in and gulp for the shark's meal.
 */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'rustle', t: TREES_WORD_AT + 0.05, pitch: 0.9, gain: 0.14, pan: 0.2 },
  { id: 'dash', t: REWIND_FROM, pitch: 0.5, gain: 0.32, pan: 0.3 },
  ...TICKS,
  { id: 'clang', t: FIFTY_AT, pitch: 1.5, gain: 0.24, pan: 0 },
  { id: 'dash', t: TREES_THE_AT, pitch: 0.8, gain: 0.16, pan: -0.2 },
  { id: 'grow', t: GREW_AT, pitch: 0.9, gain: 0.2, pan: 0.5 },
  { id: 'rustle', t: GREW_AT + 0.35, pitch: 1.0, gain: 0.14, pan: 0.5 },
  { id: 'clang', t: SIXTY_AT, pitch: 1.8, gain: 0.24, pan: 0 },
  { id: 'dash', t: WHOOSH_FROM, pitch: 0.6, gain: 0.32, pan: -0.3 },
  { id: 'dash', t: STREAK_FROM + 0.05, pitch: 0.35, gain: 0.3, pan: 0.3 },
  { id: 'boom', t: IMPACT_AT, pitch: 0.55, gain: 0.45, pan: 0 },
  { id: 'lunge', t: IMPACT_AT, pitch: 0.5, gain: 0.3, pan: 0 },
  { id: 'boom', t: IMPACT_AT + 0.22, pitch: 0.4, gain: 0.3, pan: -0.2 },
  { id: 'lunge', t: WIPED_AT + 0.45, pitch: 0.6, gain: 0.2, pan: -0.4 },
  { id: 'lunge', t: DINOS_AT + 0.3, pitch: 0.55, gain: 0.18, pan: -0.5 },
  { id: 'dash', t: HOME_FROM, pitch: 0.8, gain: 0.16, pan: 0.2 },
  { id: 'spotted', t: SPOTS_AT, pitch: 1.1, gain: 0.2, pan: 0.4 },
  { id: 'lunge', t: BITE_AT - 0.45, pitch: 0.8, gain: 0.3, pan: 0.1 },
  { id: 'suck', t: BITE_AT - SUCK_S - 0.08, pitch: 1.0, gain: 0.16, pan: 0.2 },
  { id: 'eatBig', t: BITE_AT, pitch: 0.9, gain: 0.45, pan: 0.2 },
  { id: 'rustle', t: FOREST_AT, pitch: 0.85, gain: 0.16, pan: 0.4 },
  { id: 'dash', t: TURN_AT, pitch: 0.7, gain: 0.1, pan: 0.5 },
  { id: 'dash', t: TURN_BACK_AT, pitch: 0.75, gain: 0.1, pan: -0.5 },
];
