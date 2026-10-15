import type { SfxId } from '../../../src/audio/recipes';
import {
  ALL_AT, ALMOST_AT, ANY_AT, BEATS_AT, BECAUSE_AT, BIG_AT, BIGGEST_AT, BITE_AT, COCONUT_AT, COCONUTS_AT, CRUMBS, GROWS_AT, HERMIT_AT, KILOS_AT,
  LEGS_AT, LOOP_S, METRE_AT, MORPH_FROM, NO_PROBLEM_AT, OUTGROW_AT, PINCH_AT, POP_AT, PREDATOR_AT, STARTS_AT, TAP_TIMES, TINY_AT, UP_AT, YET_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** The captions (the voiceover in short lines) and the sound cues, both timed from the words. */

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The hook is one line ("This crab cracks open COCONUTS."), so frame 1 says it all. */
const HOOK_WORDS = 5;

/** The voiceover cut into short lines: at most four words, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [WORDS.slice(0, HOOK_WORDS)];
  for (const w of WORDS.slice(HOOK_WORDS)) {
    const last = groups[groups.length - 1]!;
    const prev = last[last.length - 1]!;
    const full = groups.length === 1 || last.length >= 4 || /[.,:…!]$/.test(prev.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    // The first line is up from the first frame: the hook is on screen before its first word lands.
    from: i === 0 ? 0 : g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  // The loop opens on the hook's first word, a moment before the voice reaches it.
  let word = line === LINES[0] ? 0 : -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
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

/**
 * Quiet under the voice: it does the talking. Low knocks as the claw works
 * the coconut and a big crunch with a bright flourish as it splits; ticks
 * for the labels, a ding for "4 kg" and "≈ 1 m"; a deep crunch on "pinch";
 * a whoosh back in time, soft nibbles and the game's grow and move-in
 * chimes up the shell ladder; knocks as the armour hardens.
 */
export const SOUNDS: readonly SoundCue[] = [
  ...TAP_TIMES.map((at, i): SoundCue => ({ id: 'knock', t: at, pitch: 0.7 + 0.08 * i, gain: 0.22, pan: 0.3 })),
  { id: 'quarry', t: COCONUTS_AT, pitch: 0.9, gain: 0.3, pan: 0.3 },
  { id: 'tok', t: COCONUTS_AT + 0.05, pitch: 0.8, gain: 0.2, pan: 0.35 },
  { id: 'click', t: COCONUT_AT, pitch: 1, gain: 0.22, pan: 0 },
  { id: 'dig', t: BIGGEST_AT - 0.2, pitch: 1.4, gain: 0.12, pan: -0.6 },
  { id: 'click', t: BIGGEST_AT, pitch: 1.2, gain: 0.2, pan: 0 },
  { id: 'place', t: UP_AT, pitch: 0.8, gain: 0.25, pan: -0.1 },
  { id: 'find', t: KILOS_AT, pitch: 1, gain: 0.16, pan: 0.1 },
  { id: 'click', t: LEGS_AT, pitch: 1.3, gain: 0.2, pan: -0.3 },
  { id: 'join', t: METRE_AT, pitch: 1, gain: 0.2, pan: 0 },
  { id: 'caught', t: PINCH_AT, pitch: 0.6, gain: 0.32, pan: 0.2 },
  { id: 'tok', t: PINCH_AT + 0.02, pitch: 0.6, gain: 0.18, pan: 0.25 },
  { id: 'trade', t: BEATS_AT, pitch: 0.9, gain: 0.2, pan: 0.2 },
  { id: 'click', t: BITE_AT, pitch: 0.9, gain: 0.2, pan: -0.4 },
  { id: 'click', t: BITE_AT + 0.1, pitch: 1, gain: 0.2, pan: -0.2 },
  { id: 'click', t: BITE_AT + 0.2, pitch: 1.1, gain: 0.2, pan: 0 },
  { id: 'jump', t: ALMOST_AT, pitch: 0.55, gain: 0.25, pan: 0.5 },
  { id: 'find', t: PREDATOR_AT, pitch: 0.9, gain: 0.12, pan: 0.2 },
  { id: 'gust', t: YET_AT - 0.15, pitch: 1.4, gain: 0.12, pan: 0 },
  { id: 'hide', t: STARTS_AT + 0.05, pitch: 1.3, gain: 0.2, pan: 0 },
  { id: 'join', t: TINY_AT, pitch: 1.5, gain: 0.14, pan: 0 },
  { id: 'click', t: HERMIT_AT, pitch: 1.2, gain: 0.18, pan: -0.2 },
  ...CRUMBS.map((c): SoundCue => ({ id: 'eat', t: c.eaten, pitch: 1.3, gain: 0.22, pan: 0.1 })),
  ...[GROWS_AT, BIG_AT, ANY_AT].flatMap((at, i): SoundCue[] => [
    { id: 'grow', t: at - 0.32, pitch: 1 + 0.12 * i, gain: 0.12, pan: 0 },
    { id: 'movein', t: at - 0.02, pitch: 1 - 0.1 * i, gain: 0.18, pan: -0.1 },
  ]),
  { id: 'grow', t: OUTGROW_AT, pitch: 1.4, gain: 0.12, pan: 0 },
  { id: 'out', t: POP_AT, pitch: 1, gain: 0.2, pan: -0.2 },
  { id: 'tok', t: ALL_AT + 0.45, pitch: 0.9, gain: 0.15, pan: -0.5 },
  { id: 'knock', t: NO_PROBLEM_AT, pitch: 0.8, gain: 0.2, pan: 0 },
  { id: 'trade', t: MORPH_FROM, pitch: 0.8, gain: 0.2, pan: 0 },
  { id: 'click', t: BECAUSE_AT, pitch: 0.8, gain: 0.18, pan: 0.3 },
];
