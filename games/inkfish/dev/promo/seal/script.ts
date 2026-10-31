import type { SfxId } from '../../../src/audio/recipes';
import {
  AND_AT, ATE_AT, BEST_AT, BITE_BACK, BITS_AT, BURP_AT, BUT_AT, CAPE_AT, CHASE_CUTS, FIVE_AT, FLIPPED_AT, GREAT_AT, HOURS_AT, HUNTS_AT, ITSELF_AT, LONG_AT, LOOP_S, NOW_AT,
  OFF_AT, PEEK_IN, PEEK_OUT, PREDATOR_AT, ROLL_CUT, ROLL_FROM, SCRIPT_AT, SEAL_AGAIN_AT, SEALS_AT, SINK_FROM, SOME_AT, SOUTH_AT, THOSE_SHARKS_AT, TICK_AT, TWO_AT, WHITES_AT,
  WHOS_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  place: { y: 350, size: 104 },
  placeSouth: { y: 445, size: 96 },
  whiteTag: { y: 800, size: 92 },
  count: { y: 640, size: 250 },
  clock: { y: 700, size: 100 },
  feetSeal: { y: 520, size: 92 },
  metresSeal: { y: 604, size: 76 },
  feetShark: { y: 930, size: 92 },
  metresShark: { y: 1014, size: 76 },
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

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** The counter's rattle: a click per tick, climbing in pitch. */
const TICKS: readonly SoundCue[] = TICK_AT.map((t, i) => cue('click', t, 1.2 + 0.18 * i, 0.16, 0.3));
/** The seal's tugs. */
const TUGS: readonly SoundCue[] = [0, 1, 2].map((i) => cue('rustle', AND_AT + 0.1 + i * 0.28, 0.6 + 0.12 * i, 0.12, i % 2 ? 0.3 : -0.3));
/** The clock's ticks while its hand spins. */
const CLOCK: readonly SoundCue[] = [0, 1, 2, 3].map((i) => cue('click', TWO_AT + 0.05 + i * 0.12, 1.5, 0.09, -0.3));

/**
 * Quiet under the voice, one mood a beat: a cheeky chomp and a bright ding in
 * the hook (mischievous), a low boom and a rising lunge as the great white
 * comes (dramatic), a whoosh and a ding on the flip (surprise), a rattle of
 * clicks and a bright ding for FIVE (excited), rustles, a low sink and a comic
 * burp for the chuckle, low nervous notes for the bars, a comic sting and a
 * squeak for the great white backing off (sarcastic), and the chomp again.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: a cheeky chomp and a ding on "HUNTS".
  cue('suck', 0.08, 0.7, 0.16, -0.1),
  cue('clang', HUNTS_AT, 1.6, 0.1),
  cue('splash', 0.45, 0.9, 0.08, 0.3),
  // Off Cape Point.
  cue('splash', OFF_AT, 0.8, 0.12, 0.2),
  cue('click', CAPE_AT, 1.3, 0.08, -0.2),
  cue('click', SOUTH_AT, 1.1, 0.08, 0.2),
  // Great whites eat seals: dread.
  cue('boom', GREAT_AT, 0.32, 0.16),
  cue('lunge', WHITES_AT - 0.1, 0.4, 0.2, 0.2),
  cue('spotted', SEALS_AT - 0.1, 0.8, 0.14, -0.2),
  // The flip.
  cue('dash', ROLL_FROM + 0.05, 1.5, 0.18, -0.3),
  cue('dash', ROLL_CUT, 0.9, 0.12, 0.3),
  cue('clang', FLIPPED_AT + 0.3, 1.8, 0.1),
  cue('spotted', SCRIPT_AT, 1.5, 0.16),
  cue('lunge', BUT_AT + 0.2, 0.5, 0.1, 0.2),
  // FIVE blue sharks.
  ...TICKS,
  cue('powerup', FIVE_AT + 0.02, 1.7, 0.1, 0.1),
  ...CHASE_CUTS.map((t, i) => cue('dash', t - 0.04, 1.1 + 0.15 * i, 0.1, i % 2 ? 0.4 : -0.4)),
  ...CLOCK,
  cue('powerup', HOURS_AT, 1.1, 0.08, 0.1),
  // The tug, the sink and the burp.
  ...TUGS,
  cue('drop', SINK_FROM + 0.1, 0.5, 0.1, 0.2),
  cue('drop', ATE_AT + 0.9, 0.4, 0.08, 0.1),
  cue('suck', BURP_AT, 0.42, 0.26),
  cue('yuck', BURP_AT + 0.08, 1.4, 0.1, -0.1),
  cue('splash', BEST_AT - 0.2, 0.5, 0.08, 0.2),
  cue('splash', BITS_AT + 0.4, 1.2, 0.05, -0.2),
  // The bars: nervous.
  cue('click', SOME_AT, 1.2, 0.1, -0.3),
  cue('click', THOSE_SHARKS_AT, 1.2, 0.1, 0.3),
  cue('drop', LONG_AT, 0.55, 0.1),
  cue('spotted', SEAL_AGAIN_AT, 0.9, 0.12, -0.1),
  cue('drop', ITSELF_AT, 0.45, 0.1, 0.1),
  // So who's the predator now?
  cue('lunge', PEEK_IN, 0.6, 0.14, 0.4),
  cue('rustle', WHOS_AT, 0.7, 0.08, 0.4),
  cue('clang', NOW_AT, 1.4, 0.12),
  cue('dash', PEEK_OUT + 0.1, 1.5, 0.14, 0.5),
  cue('drop', PREDATOR_AT + 0.1, 0.5, 0.06),
  // The jaws again.
  cue('suck', BITE_BACK + 0.25, 0.7, 0.16, -0.1),
  cue('splash', LOOP_S - 0.3, 0.7, 0.1, 0.2),
];
