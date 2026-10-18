import type { SfxId } from '../../../src/audio/recipes';
import {
  AND_AT, ANIMALS_AT, BUS_AT, COLONY_AT, DO_AT, EVEN_AT, FLOAT_AT, GULP_AT, LEFT_AT, LIVING_AT, LONGER_AT, LOOP_S, MAN_AT, OH_AT, ONE_AT, RIGHT_AT, SAIL_AT,
  SAND_AT, SO_AT, SOME_LEFT_AT, SOME_RIGHT_AT, STILL_AT, STING2_AT, STING_AT, TENTACLES_AT, THE_AT, TINY_AT, WHATEVER_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** The captions (the voiceover in short lines) and the sound cues, both timed from the words. */

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/**
 * How many words each line takes: the hook whole ("This is NOT a
 * jellyfish."), then at most four, broken at the voice's pauses and never
 * inside "man o' war".
 */
const LINE_SIZES = [5, 2, 3, 4, 3, 3, 4, 2, 2, 3, 3, 3, 2, 3, 4, 4, 3, 3, 4, 1] as const;

export const LINES: readonly Line[] = (() => {
  let at = 0;
  const groups = LINE_SIZES.map((n) => WORDS.slice(at, (at += n)));
  if (at !== WORDS.length) throw new Error(`The lines take ${at} words; the voiceover has ${WORDS.length}`);
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
 * Quiet under the voice, a new colour of sound for each mood: a low, uneasy
 * chord and soft claw-steps for the suspense; a whoosh into the colony and a
 * sparkle; chirps as the polyps open their eyes and a bright boing as they
 * blink; a chime for the float, a crackle for the stingers, a nibble for the
 * gulp; the uneasy chord again and the hiss of tentacles stretching, a thud
 * on "BUS!"; the chord low and slow for the eerie beat, then the zap, a
 * squeak and the shell's tuck and clatter; a wave, gusts and two boings at
 * sea; a soft wave and a peek for the end.
 */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'dark', t: 0.02, pitch: 1, gain: 0.5, pan: 0 },
  ...[0.55, 1.35, 2.1].map((at, i): SoundCue => ({ id: 'dig', t: at, pitch: 1.5 + 0.1 * i, gain: 0.08, pan: -0.4 })),
  { id: 'gust', t: THE_AT, pitch: 1.5, gain: 0.12, pan: 0 },
  { id: 'click', t: MAN_AT, pitch: 1, gain: 0.18, pan: 0 },
  { id: 'find', t: COLONY_AT, pitch: 0.9, gain: 0.12, pan: 0 },
  ...Array.from({ length: 6 }, (_, i): SoundCue => ({ id: 'join', t: TINY_AT + 0.05 + i * 0.14, pitch: 1.2 + 0.08 * i, gain: 0.07, pan: -0.6 + 0.24 * i })),
  { id: 'click', t: ANIMALS_AT, pitch: 1.2, gain: 0.15, pan: 0.2 },
  { id: 'grow', t: LIVING_AT, pitch: 0.9, gain: 0.1, pan: 0 },
  { id: 'jump', t: ONE_AT, pitch: 1.1, gain: 0.2, pan: 0 },
  { id: 'jump', t: FLOAT_AT - 0.2, pitch: 0.6, gain: 0.22, pan: 0 },
  { id: 'movein', t: FLOAT_AT + 0.05, pitch: 1, gain: 0.12, pan: 0 },
  { id: 'steam', t: STING_AT, pitch: 1.6, gain: 0.08, pan: 0.1 },
  { id: 'tok', t: STING_AT + 0.04, pitch: 1.3, gain: 0.14, pan: -0.2 },
  { id: 'eat', t: GULP_AT, pitch: 1.3, gain: 0.3, pan: 0.2 },
  { id: 'full', t: GULP_AT + 0.12, pitch: 1.2, gain: 0.15, pan: 0.2 },
  { id: 'dark', t: AND_AT, pitch: 0.9, gain: 0.45, pan: 0 },
  { id: 'pour', t: TENTACLES_AT, pitch: 0.8, gain: 0.14, pan: -0.3 },
  { id: 'pour', t: LONGER_AT, pitch: 0.9, gain: 0.14, pan: 0.3 },
  { id: 'caught', t: BUS_AT, pitch: 0.7, gain: 0.28, pan: 0.5 },
  { id: 'tok', t: BUS_AT + 0.02, pitch: 0.7, gain: 0.16, pan: 0.5 },
  { id: 'dark', t: EVEN_AT, pitch: 0.75, gain: 0.5, pan: 0 },
  ...[EVEN_AT + 0.5, SAND_AT - 0.35, SAND_AT + 0.25].map((at, i): SoundCue => ({ id: 'dig', t: at, pitch: 1.7 - 0.1 * i, gain: 0.06, pan: -0.3 })),
  { id: 'steam', t: STILL_AT - 0.02, pitch: 1.4, gain: 0.22, pan: -0.2 },
  { id: 'caught', t: STILL_AT, pitch: 1.1, gain: 0.22, pan: -0.2 },
  { id: 'out', t: STILL_AT + 0.06, pitch: 1.5, gain: 0.22, pan: -0.3 },
  { id: 'hide', t: STILL_AT + 0.14, pitch: 1.2, gain: 0.2, pan: -0.3 },
  { id: 'knock', t: STING2_AT + 0.06, pitch: 1.1, gain: 0.16, pan: -0.6 },
  { id: 'steam', t: STING2_AT, pitch: 2, gain: 0.06, pan: -0.2 },
  { id: 'tide', t: OH_AT, pitch: 1, gain: 0.18, pan: 0 },
  { id: 'click', t: SAIL_AT, pitch: 1.1, gain: 0.16, pan: 0 },
  { id: 'gust', t: SOME_LEFT_AT - 0.2, pitch: 1.2, gain: 0.14, pan: -0.4 },
  { id: 'jump', t: LEFT_AT, pitch: 0.9, gain: 0.2, pan: -0.6 },
  { id: 'gust', t: SOME_RIGHT_AT - 0.1, pitch: 1.3, gain: 0.12, pan: 0.4 },
  { id: 'jump', t: RIGHT_AT, pitch: 1.2, gain: 0.2, pan: 0.6 },
  { id: 'tide', t: SO_AT, pitch: 1.1, gain: 0.12, pan: 0 },
  { id: 'out', t: WHATEVER_AT + 0.1, pitch: 1.1, gain: 0.12, pan: -0.5 },
  ...[DO_AT + 0.3, DO_AT + 0.95].map((at, i): SoundCue => ({ id: 'dig', t: at, pitch: 1.5 + 0.1 * i, gain: 0.08, pan: -0.5 })),
];
