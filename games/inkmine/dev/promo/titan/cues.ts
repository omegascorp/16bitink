import type { SfxId } from '../../../src/audio/recipes';
import {
  AIR_AT, BEATS, BECAUSE_AT, COAT_AT, DEGREES_AT, FLY_AT, FOUR_AT, FREEZE_AT, GAS_AT, ITS_AT, LAKE_AT, LIQUID_AT, LOOP_S, MINUS_AT, OFF_AT, ONE_AT,
  POOF_AT, SO_AT, STRAP_AT, THICKER_AT, TODDLER_AT, WEIGH_AT, WINGS_AT, washAt,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** The captions (the voiceover in short lines) and the sound cues, both timed from the words. */

export interface Line {
  /** One row, or two for the hook. */
  readonly rows: readonly (readonly Word[])[];
  readonly from: number;
  readonly to: number;
}

/** Where each line starts (word index); the hook is two rows, so frame 1 already says "you could FLY…". */
const STARTS = [0, 7, 12, 16, 18, 21, 26, 29, 33, 38, 40, 44, 46, 51, 54, 58] as const;
const HOOK_SPLIT = 4;

export const LINES: readonly Line[] = STARTS.map((s, i) => {
  const end = STARTS[i + 1] ?? WORDS.length;
  const words = WORDS.slice(s, end);
  const rows = i === 0 ? [words.slice(0, HOOK_SPLIT), words.slice(HOOK_SPLIT)] : [words];
  return {
    rows,
    // The hook is up from the first frame.
    from: i === 0 ? 0 : WORDS[s]!.start / TEMPO,
    to: i + 1 < STARTS.length ? WORDS[end]!.start / TEMPO : LOOP_S,
  };
});

/** The line on screen at t, and the word being said in it, counted across its rows (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  const words = line.rows.flat();
  // The loop opens on the hook's first word, a moment before the voice reaches it.
  const first = line === LINES[0] ? 0 : -1;
  const word = words.reduce((cur, w, i) => (t >= w.start / TEMPO ? i : cur), first);
  return { line, word };
}

/** One of the game's effects. */
export interface SfxCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/** A sound of our own: a soft tone gliding, or a breath of filtered noise sweeping (synth.ts tone() and noise()). */
export interface ToneCue {
  readonly kind: 'tone';
  readonly t: number;
  readonly from: number;
  readonly to?: number;
  readonly dur: number;
  readonly gain: number;
  readonly type?: OscillatorType;
  readonly attack?: number;
  readonly vibrato?: { readonly depth: number; readonly rate: number };
}
export interface NoiseCue {
  readonly kind: 'noise';
  readonly t: number;
  readonly filter: BiquadFilterType;
  readonly from: number;
  readonly to?: number;
  readonly dur: number;
  readonly gain: number;
  readonly q?: number;
  readonly attack?: number;
}
export type SynthCue = ToneCue | NoiseCue;

/**
 * Quiet under the voice, one mood a beat: bright lifts for "FLY" and
 * "you're off!"; buckles clicking and a canvas fwump for the wings; airy
 * swells in the thick haze, a boing for the toddler; a cold glassy sting,
 * frost crackling and chattering for the cold; a deep swell, bubbles and a
 * falling whistle over the lake; a comic pop and a warm chord for the coat.
 */
export const SOUNDS: readonly SfxCue[] = [
  { id: 'find', t: FLY_AT - 0.02, pitch: 1.2, gain: 0.18, pan: 0.2 },
  { id: 'tick', t: STRAP_AT + 0.05, pitch: 0.7, gain: 0.6, pan: -0.2 },
  { id: 'tick', t: STRAP_AT + 0.35, pitch: 0.8, gain: 0.6, pan: -0.1 },
  { id: 'jetStart', t: OFF_AT - 0.08, pitch: 1.5, gain: 0.5, pan: 0 },
  { id: 'fed', t: OFF_AT, pitch: 1.3, gain: 0.5, pan: 0.1 },
  { id: 'land', t: OFF_AT - 0.02, pitch: 1.1, gain: 0.4, pan: 0 },
  { id: 'swell', t: AIR_AT - 0.1, pitch: 1.2, gain: 0.55, pan: 0 },
  { id: 'tick', t: FOUR_AT, pitch: 1.2, gain: 0.4, pan: 0.3 },
  { id: 'swell', t: THICKER_AT - 0.1, pitch: 0.9, gain: 0.45, pan: 0 },
  { id: 'tick', t: WEIGH_AT, pitch: 1.1, gain: 0.35, pan: -0.2 },
  { id: 'dull', t: ONE_AT, pitch: 0.75, gain: 0.5, pan: 0 },
  { id: 'shield', t: ITS_AT, pitch: 1.4, gain: 0.7, pan: 0.2 },
  { id: 'shield', t: MINUS_AT + 0.05, pitch: 1.9, gain: 0.5, pan: -0.3 },
  { id: 'airLow', t: DEGREES_AT, pitch: 1.3, gain: 0.45, pan: 0 },
  { id: 'swell', t: LAKE_AT - 0.2, pitch: 0.5, gain: 0.7, pan: 0 },
  { id: 'hurt', t: FREEZE_AT, pitch: 1.2, gain: 0.45, pan: 0 },
  { id: 'fizz', t: LIQUID_AT, pitch: 0.7, gain: 0.6, pan: -0.3 },
  { id: 'fizz', t: LIQUID_AT + 0.8, pitch: 0.6, gain: 0.5, pan: 0.3 },
  { id: 'blast', t: GAS_AT, pitch: 0.8, gain: 0.35, pan: 0 },
  { id: 'mended', t: COAT_AT + 0.05, pitch: 1.1, gain: 0.4, pan: 0 },
];

/** Bubbles blooping up through the lake (Hz up a little each). */
const BLOOPS = [0, 0.18, 0.41, 0.58, 0.83, 1.02, 1.3, 1.47].map((d, i): ToneCue => ({
  kind: 'tone', t: LIQUID_AT - 0.1 + d, from: 180 + (i % 3) * 60, to: 420 + (i % 4) * 70, dur: 0.12, gain: 0.05, attack: 0.01,
}));
/** Frost crackling over the wings. */
const CRACKLES = Array.from({ length: 14 }, (_, i): NoiseCue => ({
  kind: 'noise', t: ITS_AT + 0.1 + i * 0.17 + (i % 3) * 0.03, filter: 'highpass', from: 5200 + (i % 4) * 600, dur: 0.05, gain: 0.05, q: 1, attack: 0.003,
}));
/** Teeth chattering through "minus one hundred eighty". */
const CHATTER = Array.from({ length: 12 }, (_, i): NoiseCue => ({
  kind: 'noise', t: MINUS_AT + i * 0.085, filter: 'bandpass', from: 2600, dur: 0.03, gain: 0.07, q: 3, attack: 0.002,
}));

/** One whoosh a wingbeat, louder for a harder stroke, a splash when it's low over the lake. */
const WHOOSHES = BEATS.flatMap((b): SynthCue[] => {
  const g = Math.min(1.3, b.effort);
  const whoosh: NoiseCue = { kind: 'noise', t: b.t, filter: 'bandpass', from: 320, to: 900, dur: 0.32, gain: 0.07 * g, q: 0.9, attack: 0.08 };
  const wash = washAt(b.t + 0.15);
  return wash > 0.3 ? [whoosh, { kind: 'noise', t: b.t + 0.16, filter: 'lowpass', from: 1400, to: 500, dur: 0.4, gain: 0.05 * wash * g, attack: 0.02 }] : [whoosh];
});

export const SYNTHS: readonly SynthCue[] = [
  ...WHOOSHES,
  // "FLY": a bright rising glide.
  { kind: 'tone', t: FLY_AT - 0.05, from: 330, to: 990, dur: 0.6, gain: 0.05, attack: 0.05 },
  // The wings flaring open: a canvas fwump.
  { kind: 'noise', t: WINGS_AT, filter: 'lowpass', from: 700, to: 180, dur: 0.35, gain: 0.25, attack: 0.02 },
  // "you're off!": a lift.
  { kind: 'tone', t: OFF_AT, from: 392, to: 784, dur: 0.7, gain: 0.05, attack: 0.06 },
  // The toddler: a soft boing.
  { kind: 'tone', t: TODDLER_AT - 0.05, from: 260, to: 520, dur: 0.22, gain: 0.08, attack: 0.01, vibrato: { depth: 30, rate: 18 } },
  // "One catch": the warmth drains out, a cold glassy high note.
  { kind: 'tone', t: ONE_AT + 0.1, from: 1760, dur: 1.6, gain: 0.03, attack: 0.4, vibrato: { depth: 12, rate: 5 } },
  ...CRACKLES,
  ...CHATTER,
  // The lake: a deep, ominous drone, and a dissonant sting as it freezes.
  { kind: 'tone', t: LAKE_AT - 0.2, from: 55, to: 49, dur: 3, gain: 0.16, type: 'triangle', attack: 0.6 },
  { kind: 'tone', t: FREEZE_AT, from: 233, dur: 0.9, gain: 0.05, attack: 0.01 },
  { kind: 'tone', t: FREEZE_AT, from: 247, dur: 0.9, gain: 0.05, attack: 0.01 },
  ...BLOOPS,
  // Falling towards it: a whistle sliding down.
  { kind: 'tone', t: GAS_AT + 0.1, from: 1200, to: 300, dur: 0.75, gain: 0.04, attack: 0.05 },
  // The coat: a comic pop, and a soft puff as it vanishes.
  { kind: 'tone', t: COAT_AT - 0.04, from: 300, to: 820, dur: 0.12, gain: 0.12, attack: 0.005 },
  { kind: 'noise', t: COAT_AT - 0.04, filter: 'lowpass', from: 1200, to: 300, dur: 0.18, gain: 0.2, attack: 0.004 },
  { kind: 'noise', t: POOF_AT, filter: 'lowpass', from: 900, to: 260, dur: 0.22, gain: 0.16, attack: 0.004 },
  { kind: 'tone', t: POOF_AT, from: 640, to: 360, dur: 0.12, gain: 0.06, attack: 0.005 },
  // A chuckle of plucked notes after "coat".
  ...[0, 0.11, 0.22].map((d, i): ToneCue => ({ kind: 'tone', t: COAT_AT + 0.3 + d, from: [523.25, 659.25, 783.99][i]!, dur: 0.25, gain: 0.04, attack: 0.005 })),
  // Relief settling under "because".
  { kind: 'tone', t: BECAUSE_AT - 0.3, from: 196, dur: 1.2, gain: 0.03, attack: 0.3 },
  { kind: 'tone', t: SO_AT, from: 110, to: 147, dur: 0.8, gain: 0.05, attack: 0.1 },
];
