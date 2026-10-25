import type { SfxId } from '../../../src/audio/recipes';
import {
  BARNACLE_BITES, BECAUSE_AT, BETTER_TEETH_AT, CONVICT_AT, CONVICT_FISH_AT, CRAB_BITE, FRONT_AT, HEART_LIFE, HEARTS, HONESTLY_AT, HUMAN_AT, ITS_A_AT,
  KISSES_AT, LOOP_S, MOST_AT, OYSTER_BITE, PIER_AT, ROW_TIMES, STILL_AT, STRIPES_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** The captions and the sound effects under the voice. */

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words and 18 letters, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,!?…:]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
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
  const u = wrap(t);
  const line = LINES.find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (u >= w.start / TEMPO) word = i;
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

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/**
 * Quiet under the voice. Uneasy in the hook (a low creak, a wet squelch as
 * the smile widens), curious ticks as each molar row appears, three crunches
 * (crab, oyster, barnacles) and a splash at the pier for the surprise, little
 * blips as each bar lights up, the camera flash and the jail door's clank for
 * the chuckle, the sparkle's "ding" for the cheek, and soft kissy pops for the
 * pucker.
 */
export const SOUNDS: readonly SoundCue[] = [
  // Nervous: creak, squelch.
  cue('yuck', 0.04, 0.42, 0.07, 0.2),
  cue('rustle', 0.35, 0.3, 0.05, -0.2),
  cue('eat', HUMAN_AT - 0.03, 0.45, 0.2),
  cue('drop', HUMAN_AT + 0.05, 0.42, 0.08),
  // Curious: the mouth opens, a tick per molar row.
  cue('suck', FRONT_AT, 1.5, 0.06),
  ...ROW_TIMES.map((t, i) => cue('click', t, 1.15 + i * 0.14, 0.28, (i % 2 ? 0.25 : -0.25))),
  // Surprised: out to the piling, crunch, crunch, crunch, and the pier.
  cue('dash', ITS_A_AT - 0.15, 0.8, 0.13),
  cue('smash', CRAB_BITE, 0.85, 0.22, -0.2),
  cue('eat', CRAB_BITE + 0.02, 0.7, 0.1, -0.2),
  cue('smash', OYSTER_BITE, 1.05, 0.22, -0.2),
  cue('clang', OYSTER_BITE + 0.01, 2.3, 0.03, -0.2),
  cue('smash', BARNACLE_BITES[0], 1.3, 0.18, -0.2),
  cue('smash', BARNACLE_BITES[1], 1.45, 0.18, -0.2),
  cue('splash', PIER_AT + 0.1, 1.2, 0.07, 0.2),
  // Chuckles: a blip per bar lighting up, the flash, the bars slamming.
  ...Array.from({ length: 6 }, (_, i) => cue('drop', STRIPES_AT + i * 0.09, 0.8 + i * 0.08, 0.06)),
  cue('click', CONVICT_AT, 0.5, 0.32),
  cue('dash', CONVICT_AT + 0.01, 2.2, 0.1),
  cue('clang', CONVICT_FISH_AT + 0.24, 0.55, 0.16),
  cue('boom', CONVICT_FISH_AT + 0.24, 0.9, 0.08),
  // Sarcastic: the bars away, the mirror in, the ding, the snapshots.
  cue('dash', HONESTLY_AT - 0.1, 1.0, 0.08, 0.3),
  cue('rustle', HONESTLY_AT + 0.3, 1.5, 0.05, -0.3),
  cue('clang', BETTER_TEETH_AT, 2.6, 0.1),
  cue('frenzy', BETTER_TEETH_AT + 0.03, 1.6, 0.06),
  ...[0, 1, 2].map((i) => cue('drop', MOST_AT + i * 0.11, 0.7 + i * 0.05, 0.07, -0.3)),
  // Softly: kissy pops, the gentle push.
  cue('suck', STILL_AT + 0.05, 2.2, 0.04),
  ...HEARTS.map((h, i) => cue('drop', h.at + HEART_LIFE, 1.15 + (i % 3) * 0.15, 0.07, -0.2 + (i % 2) * 0.4)),
  cue('dash', KISSES_AT - 0.05, 0.6, 0.08, -0.3),
  cue('eat', KISSES_AT + 0.02, 1.5, 0.06),
  // Back round to the grin.
  cue('dash', BECAUSE_AT + 0.05, 1.2, 0.06),
];
