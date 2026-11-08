import type { SfxId } from '../../../src/audio/recipes';
import {
  AND_AT, ALMOST_AT, ANYTHING_AT, AUSTRALIA_AT, CAUGHT_AT, COUGHED_AT, EAT_AT, ECHIDNA_AT, EVERYTHING_AT, FINE_AT, FINE_FROM, LAND_AT, LEGS_AT, LOOP_S, MONTAGE_FROM, PLACE_FROM, SAD_FROM,
  SCIENTISTS_AT, SO_AT, SPINES_AT, TAG_AT, TAG_FROM, TENFOOT_AT, TIGER_AT, TIGER_SHARKS_AT, wrap, YEAR_AT, ANIMAL_AT, SHARK_AT, COUGH_FROM, MAKE_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  place: { y: 360, size: 112 },
  island: { y: 470, size: 100 },
  reef: { y: 560, size: 64 },
  year: { y: 830, size: 240 },
  tigerShark: { y: 1010, size: 130 },
  tagWord: { y: 660, size: 140 },
  metric: { y: 420, size: 190 },
  us: { y: 530, size: 110 },
  echidna: { y: 415, size: 190 },
  part: { y: 955, size: 120 },
  caption: { y: 1200, size: 96 },
} as const;

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

/**
 * Quiet under the voice, one mood a beat: a splash, a gulp and a bright ding
 * for the hook (surprise), a low boom and clicks for the place (dramatic),
 * rustles and a click for the tagging, a nervous drop, a cough (a smash, a
 * splash and a yuck) and a loud ding for the shock, a slow low note for the
 * sad echidna, a bright ding and a bubbly wiggle for the shark swimming off
 * (laugh), and three comic gulps and a sly sting for the montage.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: a splash, a gulp, a ding on "animal", a pop on "LAND".
  cue('splash', 0.12, 0.8, 0.12, -0.2),
  cue('suck', SHARK_AT, 0.7, 0.12, 0.2),
  cue('clang', ANIMAL_AT, 1.5, 0.1),
  cue('powerup', LAND_AT, 1.4, 0.12),
  cue('click', LAND_AT + 0.1, 1.6, 0.08, 0.3),
  // The place: dread, then the year.
  cue('boom', PLACE_FROM, 0.4, 0.14),
  cue('click', AUSTRALIA_AT, 1.2, 0.08, -0.2),
  cue('click', AUSTRALIA_AT + 0.35, 1.1, 0.08, 0.2),
  cue('powerup', YEAR_AT, 1.5, 0.1),
  // The tagging: boat sounds, the measure.
  cue('rustle', TAG_FROM, 0.6, 0.08, -0.3),
  cue('splash', SCIENTISTS_AT + 0.3, 0.9, 0.08, 0.3),
  cue('dash', CAUGHT_AT, 0.9, 0.1, -0.3),
  cue('click', TIGER_AT - 0.05, 1.3, 0.08),
  cue('click', TENFOOT_AT - 0.1, 1.4, 0.1, -0.2),
  cue('powerup', TENFOOT_AT + 0.65, 1.5, 0.1),
  cue('click', TAG_AT, 1.8, 0.14, 0.2),
  cue('clang', TAG_AT + 0.05, 1.2, 0.08),
  // Nervous, then the cough.
  cue('drop', COUGH_FROM, 0.5, 0.12),
  cue('spotted', AND_AT + 0.15, 0.7, 0.1, -0.2),
  cue('drop', COUGHED_AT - 0.35, 0.45, 0.1, 0.2),
  cue('smash', COUGHED_AT, 1.3, 0.12),
  cue('splash', COUGHED_AT + 0.02, 0.6, 0.16, -0.1),
  cue('yuck', COUGHED_AT + 0.06, 1.2, 0.1, 0.1),
  cue('lunge', COUGHED_AT + 0.15, 0.6, 0.12, 0.3),
  cue('clang', ECHIDNA_AT, 1.8, 0.14),
  cue('powerup', ECHIDNA_AT + 0.05, 1.6, 0.1),
  cue('click', SPINES_AT, 1.4, 0.1, -0.2),
  cue('click', LEGS_AT, 1.3, 0.1, 0.2),
  cue('powerup', EVERYTHING_AT, 1.3, 0.1),
  // Sad: a slow low note, a drip.
  cue('drop', SAD_FROM, 0.3, 0.16),
  cue('drop', MAKE_AT, 0.25, 0.14),
  cue('rustle', SAD_FROM + 0.2, 0.4, 0.05),
  // Laugh: a bright ding and a bubbly wiggle.
  cue('powerup', FINE_FROM + 0.05, 1.5, 0.12),
  cue('spotted', FINE_AT - 0.45, 1.2, 0.1, -0.2),
  cue('clang', FINE_AT, 1.7, 0.12),
  cue('dash', FINE_AT + 0.15, 1.3, 0.1, 0.4),
  cue('splash', FINE_AT + 0.35, 1.2, 0.06, 0.2),
  // Mischief: three gulps and a sting, then the whoosh back.
  cue('dash', MONTAGE_FROM, 1.1, 0.12, -0.3),
  cue('rustle', TIGER_SHARKS_AT + 0.3, 0.7, 0.07, 0.2),
  cue('eat', EAT_AT, 1.1, 0.12, 0.1),
  cue('eat', ALMOST_AT, 0.9, 0.12, -0.1),
  cue('eatBig', ANYTHING_AT, 0.8, 0.14, 0.1),
  cue('yuck', ANYTHING_AT + 0.05, 1.5, 0.06, -0.2),
  cue('dash', SO_AT - 0.4, 1.6, 0.14, 0.4),
  cue('suck', SO_AT + 0.3, 0.6, 0.12, -0.1),
  cue('splash', LOOP_S - 0.3, 0.7, 0.1, 0.2),
];
