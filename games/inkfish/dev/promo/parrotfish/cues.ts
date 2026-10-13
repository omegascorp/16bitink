import type { SfxId } from '../../../src/audio/recipes';
import {
  BIG_AT, CRUNCHES, GRIND_AT, HUNDREDS_AT, ISLAND_AT, LOOP_S, MALDIVES_AT, MOSTLY_AT, PARROTFISH_AT, POOP_AT, REMEMBER_AT, said, YEAR_AT, YOU_AT,
  ZOOM_IN, ZOOM_OUT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

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
    from: g[0]!.start / TEMPO,
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

/** The counter's ticks as it races up the year. */
const TICKS = [0, 1, 2, 3, 4, 5].map((k) => HUNDREDS_AT + 0.05 + k * ((YEAR_AT - HUNDREDS_AT) / 6));

/** Quiet under the voice: it does the talking. */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'rustle', t: REMEMBER_AT + 0.1, pitch: 0.7, gain: 0.16, pan: -0.1 },
  { id: 'spotted', t: REMEMBER_AT + 0.42, pitch: 1.1, gain: 0.2, pan: 0.5 },
  { id: 'dash', t: PARROTFISH_AT + 0.1, pitch: 1.2, gain: 0.08, pan: -0.2 },
  { id: 'eat', t: CRUNCHES[0]!, pitch: 0.7, gain: 0.45, pan: -0.4 },
  { id: 'smash', t: CRUNCHES[0]!, pitch: 1.3, gain: 0.12, pan: -0.4 },
  { id: 'eat', t: CRUNCHES[1]!, pitch: 0.62, gain: 0.45, pan: -0.4 },
  { id: 'smash', t: CRUNCHES[1]!, pitch: 1.1, gain: 0.12, pan: -0.4 },
  { id: 'click', t: GRIND_AT, pitch: 0.9, gain: 0.3, pan: 0 },
  { id: 'rustle', t: GRIND_AT + 0.3, pitch: 1.4, gain: 0.12, pan: 0 },
  { id: 'rustle', t: GRIND_AT + 0.75, pitch: 1.3, gain: 0.1, pan: 0 },
  { id: 'rustle', t: POOP_AT + 0.05, pitch: 0.7, gain: 0.16, pan: 0 },
  { id: 'grow', t: BIG_AT + 0.05, pitch: 1, gain: 0.22, pan: 0 },
  ...TICKS.map((t, k): SoundCue => ({ id: 'click', t, pitch: 1 + k * 0.08, gain: 0.22, pan: -0.3 })),
  { id: 'click', t: YEAR_AT + 0.15, pitch: 0.85, gain: 0.4, pan: -0.3 },
  { id: 'dash', t: ZOOM_OUT.from + 0.05, pitch: 0.6, gain: 0.12, pan: 0 },
  { id: 'drop', t: ISLAND_AT + 0.05, pitch: 1.4, gain: 0.16, pan: 0.2 },
  { id: 'drop', t: ISLAND_AT + 0.21, pitch: 1.6, gain: 0.16, pan: 0.4 },
  { id: 'drop', t: ISLAND_AT + 0.37, pitch: 1.8, gain: 0.16, pan: 0.6 },
  { id: 'click', t: MALDIVES_AT, pitch: 1, gain: 0.3, pan: 0 },
  { id: 'rustle', t: MOSTLY_AT, pitch: 1, gain: 0.12, pan: 0 },
  { id: 'dash', t: ZOOM_IN.from + 0.05, pitch: 0.75, gain: 0.1, pan: 0 },
  { id: 'click', t: YOU_AT, pitch: 1.1, gain: 0.3, pan: 0.4 },
  { id: 'dash', t: said('lie'), pitch: 1.3, gain: 0.06, pan: -0.2 },
];
