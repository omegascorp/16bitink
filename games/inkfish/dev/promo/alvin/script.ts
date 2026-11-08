import type { SfxId } from '../../../src/audio/recipes';
import {
  ALVIN_AT, ATTACHED_AT, BANG_AT, BUT_AT, CREW_AT, EIGHT_AT, FIRST_AT, FLORIDA_AT, HEAD_AT, LOOP_S, NEXT_AT, NINETEEN_AT, RAMS_AT, STEAKS_AT, STUCK_AT, SUBMARINE_AT, SWORDFISH_AT,
  THEN_AT, THEY_AT, THREE_AT, TITANIC_AT, TWO_AT, wrap, YEAR_AT,
} from './story';
import { IMPACT } from './poses';
import { PLATE_AT } from './poses';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  year: { y: 470, size: 240 },
  depth: { y: 700, size: 190 },
  depthUs: { y: 810, size: 110 },
  place: { y: 940, size: 100 },
  name: { y: 490, size: 200 },
  size: { y: 420, size: 190 },
  sizeUs: { y: 530, size: 110 },
  yearLater: { y: 470, size: 240 },
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
 * Quiet under the voice, one mood a beat: a thud and a ding for the hook
 * (shock), a low boom and clicks for the descent (tense), a warm ding then a
 * dropping note, a smash and a clang for the BANG, a wrench of lunges and clangs
 * for the thrashing, a rising whoosh and a comic sting for the climb (laugh),
 * bright pops for the plates (laugh), a deep swell and a slow ding for the
 * Titanic (awe), and a whoosh and the hit at the seam (tension).
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: the hit just before frame 1 (a late "smash"), the splash of it, a ding on "SUBMARINE".
  cue('smash', LOOP_S + IMPACT, 1.1, 0.14),
  cue('clang', LOOP_S + IMPACT + 0.02, 0.8, 0.1, 0.2),
  cue('powerup', SUBMARINE_AT, 1.3, 0.1),
  // The descent: dread, then the numbers.
  cue('boom', 2.05, 0.4, 0.14),
  cue('click', YEAR_AT + 0.05, 1.2, 0.08, -0.2),
  cue('drop', TWO_AT, 0.5, 0.1),
  cue('click', TWO_AT + 0.5, 1.4, 0.08, 0.2),
  cue('click', FLORIDA_AT, 1.2, 0.08, -0.2),
  // The portholes: warm, then uneasy, then the BANG.
  cue('powerup', THREE_AT, 1.1, 0.07),
  cue('click', ALVIN_AT - 0.05, 1.5, 0.09),
  cue('drop', THEN_AT, 0.45, 0.12),
  cue('smash', BANG_AT, 0.9, 0.2),
  cue('boom', BANG_AT, 0.5, 0.16),
  cue('clang', BANG_AT + 0.03, 0.7, 0.14, 0.2),
  // The thrash: lunges and clangs as the fish wrenches, a squawk-like yank on "STUCK".
  cue('lunge', SWORDFISH_AT, 0.7, 0.1, -0.3),
  cue('click', EIGHT_AT - 0.05, 1.5, 0.08),
  cue('lunge', RAMS_AT - 0.05, 0.6, 0.12, 0.3),
  cue('clang', RAMS_AT + 0.05, 0.9, 0.12),
  cue('lash', RAMS_AT + 0.45, 0.8, 0.08, -0.2),
  cue('lash', STUCK_AT - 0.2, 1, 0.08, 0.2),
  cue('hurt', STUCK_AT + 0.02, 1.4, 0.1, 0.1),
  cue('lash', STUCK_AT + 0.35, 1.2, 0.07, -0.3),
  // The climb: a rising whoosh, bubbles and a comic sting.
  cue('dash', THEY_AT, 0.8, 0.1, -0.2),
  cue('suck', HEAD_AT, 1.3, 0.08, 0.2),
  cue('free', ATTACHED_AT - 0.3, 1.2, 0.1),
  cue('spotted', ATTACHED_AT + 0.05, 0.9, 0.1, -0.2),
  // The steaks: a bright pop for each plate, a cheer for the crew.
  cue('splash', NEXT_AT, 1.4, 0.08),
  cue('powerup', PLATE_AT[0]!, 1.5, 0.1, -0.3),
  cue('powerup', PLATE_AT[1]!, 1.7, 0.1),
  cue('powerup', PLATE_AT[2]!, 1.9, 0.1, 0.3),
  cue('eat', STEAKS_AT + 0.5, 1.2, 0.1, 0.1),
  cue('win', CREW_AT - 0.05, 1.3, 0.1),
  // Awe: a deep swell, a slow ding as the bow comes out of the dark.
  cue('boom', NINETEEN_AT, 0.3, 0.13),
  cue('rustle', NINETEEN_AT + 0.4, 0.4, 0.05),
  cue('powerup', NINETEEN_AT + 0.55, 0.7, 0.06),
  cue('clang', TITANIC_AT - 0.15, 0.5, 0.1),
  cue('powerup', TITANIC_AT, 0.6, 0.1),
  // Tension: a creeping drop, then a whoosh as the sword flashes in.
  cue('drop', BUT_AT, 0.4, 0.12),
  cue('dash', FIRST_AT + 0.25, 1.5, 0.14, -0.3),
];
