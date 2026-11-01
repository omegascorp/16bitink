import type { SfxId } from '../../../src/audio/recipes';
import {
  ANOTHER2_AT, ANOTHER_AT, AND_AT, ANTARCTICA_AT, BIGGER_AT, BITE_AT, BROUGHT_AT, CUT, DAYS_AT, DIDNT_AT, GRIZZLY_AT, HE_AT, HUNTER_AT, LOOP_S, MOUTH_AT,
  PENGUIN_AT, START_AT, STARVE_AT, THEN_AT, TICK_AT, USELESS_AT, WHOD_AT, wrap, YEAR_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  place: { y: 350, size: 104 },
  year: { y: 470, size: 130 },
  tag: { y: 780, size: 96 },
  penguin: { y: 440, size: 150 },
  count: { y: 500, size: 240 },
  days: { y: 610, size: 100 },
  caption: { y: 1200, size: 96 },
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
    const full = !last || last.length >= 4 || /[.,!?…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    from: i === 0 ? 0 : g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

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

/**
 * Quiet under the voice, one mood a beat: low nervous notes and a hollow chomp
 * on the hook, a cold boom and clicks for the place and year (dramatic), a
 * rising lunge as the head grows (shock), a held breath then a whoosh as the
 * jaws open (surprise), a bright ding and a rising powerup for the penguin
 * (excited), a comic plop and a tick per penguin and per day (chuckles), a dry
 * flat note for the glare (sarcastic), a slow sinking drop for the sad line.
 */
export const SOUNDS: readonly SoundCue[] = [
  // Nervous.
  cue('suck', 0.1, 0.5, 0.14, -0.1),
  cue('click', 1.4, 1.1, 0.07, 0.3),
  cue('drop', 2.1, 0.5, 0.08),
  cue('suck', MOUTH_AT - 0.05, 0.6, 0.18),
  cue('splash', MOUTH_AT + 0.1, 0.8, 0.08, 0.2),
  // Antarctica, 2006.
  cue('boom', ANTARCTICA_AT - 0.05, 0.3, 0.14),
  cue('click', ANTARCTICA_AT + 0.4, 1.4, 0.08, -0.2),
  cue('click', YEAR_AT, 1.2, 0.09, 0.2),
  cue('clang', YEAR_AT + 0.2, 1.1, 0.06),
  // Bigger than a grizzly.
  cue('lunge', BIGGER_AT - 0.1, 0.4, 0.2, 0.2),
  cue('spotted', GRIZZLY_AT - 0.1, 0.8, 0.12, -0.2),
  cue('boom', GRIZZLY_AT + 0.2, 0.28, 0.14),
  // She didn't bite: held breath, then the jaws open.
  cue('drop', DIDNT_AT, 0.5, 0.09),
  cue('dash', BITE_AT + 0.1, 1.2, 0.16, -0.2),
  cue('clang', BITE_AT + 0.25, 1.7, 0.08),
  // A penguin!
  cue('dash', CUT.offer, 0.9, 0.12, -0.3),
  cue('clang', PENGUIN_AT, 1.8, 0.12),
  cue('powerup', PENGUIN_AT + 0.02, 1.6, 0.1, 0.1),
  cue('splash', BROUGHT_AT, 0.9, 0.07),
  // Then another, and another: plops.
  cue('drop', ANOTHER_AT - 0.1, 0.9, 0.12, 0.2),
  cue('yuck', ANOTHER_AT, 1.5, 0.06),
  cue('drop', AND_AT - 0.1, 1.1, 0.12, -0.2),
  cue('drop', ANOTHER2_AT - 0.1, 0.8, 0.12, 0.3),
  cue('drop', THEN_AT, 1.0, 0.05),
  ...TICK_AT.map((t, i) => cue('click', t, 1.2 + 0.2 * i, 0.15, 0.3)),
  cue('drop', DAYS_AT - 0.35, 0.7, 0.12),
  cue('powerup', DAYS_AT, 1.4, 0.1, 0.1),
  cue('suck', DAYS_AT + 0.45, 0.45, 0.2),
  // The flat stare.
  cue('yuck', HE_AT + 0.05, 0.7, 0.08),
  cue('click', HE_AT + 0.7, 0.8, 0.07, -0.2),
  // Zip, a miss.
  cue('dash', USELESS_AT - 0.05, 1.6, 0.16, 0.5),
  cue('splash', USELESS_AT + 0.35, 0.6, 0.1, -0.3),
  cue('drop', HUNTER_AT + 0.15, 0.4, 0.08),
  // Sad.
  cue('drop', WHOD_AT, 0.4, 0.1),
  cue('drop', STARVE_AT + 0.05, 0.3, 0.08),
  // The jaws again.
  cue('suck', CUT.back + 0.3, 0.55, 0.12, -0.1),
  cue('splash', START_AT + 0.4, 0.7, 0.08, 0.2),
];
