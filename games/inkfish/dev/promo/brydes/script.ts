import type { SfxId } from '../../../src/audio/recipes';
import {
  AND_AT, CALVES_AT, CHASING_AT, COPY_AT, DRIFT_AT, FORTY_AT, GULF_AT, HONESTLY_AT, IN_AT, JAWS_AT, LAZIEST_AT, LOOP_S, NO2_AT, NO_AT, OCEAN_AT, SO_AT, WAITS_AT,
  BUBBLES, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** The captions, the words over the picture and where they sit, and the sound effects under the voice. */

/** Every line of text: its baseline (y) and its full size, px. All of it stays between y 270 and 1240. */
export const TEXT = {
  caption: { y: 1200, size: 96 },
  place: { y: 600, size: 112 },
  feet: { y: 740, size: 136 },
  metres: { y: 850, size: 92 },
} as const;

export interface Line {
  readonly words: readonly Word[];
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

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** The fish drifting in, nervous little ticks quickening to the gulp. */
const NERVOUS: readonly SoundCue[] = Array.from({ length: 8 }, (_, i) => cue('click', AND_AT + 0.1 + ((IN_AT - AND_AT - 0.3) * i) / 8, 1.5 + 0.1 * (i % 3), 0.07, i % 2 ? 0.3 : -0.3));
/** Gentle surface laps under the hook. */
const LAPS: readonly SoundCue[] = [0.9, 2.4, 3.9].map((t, i) => cue('rustle', t, 0.5, 0.07, i % 2 ? 0.3 : -0.3));

/**
 * Quiet under the voice: a soft swell as the mouth hangs open, a "ding" on
 * the place tag and the length, a flutter of nervous ticks as the fish drift
 * in, the gulp (a big swallow, a boom and a splash), comic boings for the two
 * crossed-out cards and a burp for the bubble, a tender pop for the calf, a
 * lazy sigh for the sarcastic line, and the swell back into the open mouth.
 */
export const SOUNDS: readonly SoundCue[] = [
  cue('suck', 0.03, 0.4, 0.2),
  ...LAPS,
  cue('squawk', WAITS_AT + 0.3, 1.5, 0.06, 0.5),
  cue('drop', WAITS_AT + 0.05, 0.8, 0.1),
  cue('powerup', GULF_AT, 0.9, 0.1),
  cue('clang', FORTY_AT + 0.25, 1.5, 0.18),
  cue('boom', FORTY_AT + 0.27, 0.5, 0.1),
  cue('suck', JAWS_AT, 0.5, 0.18),
  ...NERVOUS,
  cue('eatBig', IN_AT - 0.02, 0.42, 0.3),
  cue('boom', IN_AT, 0.3, 0.22),
  cue('splash', IN_AT + 0.02, 0.6, 0.22, 0.3),
  cue('drop', IN_AT + 0.5, 0.7, 0.1),
  cue('lash', NO_AT, 1.2, 0.14, -0.3),
  cue('squawk', NO_AT + 0.35, 0.6, 0.08, -0.3),
  cue('smash', NO_AT + 0.36, 1.4, 0.08, -0.3),
  cue('lash', NO2_AT, 1.3, 0.14, -0.3),
  cue('smash', NO2_AT + 0.36, 1.4, 0.08, -0.3),
  cue('yuck', BUBBLES[0].from, 0.5, 0.16),
  cue('drop', BUBBLES[0].from + 0.3, 1.1, 0.08),
  cue('click', BUBBLES[0].to - 0.05, 1.8, 0.12),
  cue('rustle', CHASING_AT + 0.1, 0.6, 0.06),
  cue('suck', CALVES_AT - 0.2, 0.7, 0.12, 0.3),
  cue('powerup', COPY_AT, 1.2, 0.1, 0.3),
  cue('eat', COPY_AT + 0.35, 1.5, 0.1, 0.4),
  cue('eat', COPY_AT + 0.55, 1.7, 0.08, 0.4),
  cue('yuck', HONESTLY_AT + 0.15, 0.4, 0.1),
  cue('drop', LAZIEST_AT, 0.5, 0.08),
  cue('rustle', BUBBLES[1].from + 0.1, 0.45, 0.08),
  cue('click', BUBBLES[1].to - 0.05, 1.4, 0.1),
  cue('dash', OCEAN_AT - 0.25, 0.7, 0.14),
  cue('suck', SO_AT + 0.2, 0.4, 0.22),
  cue('lunge', LOOP_S - 0.5, 0.42, 0.12, 0.1),
  cue('drop', DRIFT_AT, 0.9, 0.08),
];
