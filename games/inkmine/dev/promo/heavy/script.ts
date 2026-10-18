import type { SfxId } from '../../../src/audio/recipes';
import { CELLS_AT, DROPS, SMALL_CELL_AT, STROKES } from './lesson';
import { GIVE_AT, SINK_AT, SIT_AT } from './falls';
import {
  ANIMALS_AT, BACK_AT, BECAUSE_AT, CANT_AT, countAt, DOUBLE_AT, FOUR_AT, GALILEO_AT, HEAVIER_AT, JUST_AT, LIKE_AT, LOOP_S, RIDERS_LAND, SHORT_AT, SLAM_AT, SNAP_AT,
  STEPS, STOMP_AT, STRONGER_AT, THIN_LEGS_AT, walkSteps, WIDE_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** The captions (the voiceover in short phrases) and the sound cues, both timed from the words. */

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** Where each phrase begins (a word index): broken where the narrator breathes or the picture changes. */
const BREAKS = [0, 8, 14, 16, 22, 25, 29, 31, 35, 41, 44, 48, 52, 53, 58, 61, 65, 68] as const;

export const LINES: readonly Line[] = BREAKS.map((first, i) => {
  const next = BREAKS[i + 1];
  const words = WORDS.slice(first, next ?? WORDS.length);
  return {
    words,
    // The hook is up from the first frame, a moment before the voice reaches it.
    from: i === 0 ? 0 : words[0]!.start / TEMPO,
    to: next === undefined ? LOOP_S : WORDS[next]!.start / TEMPO,
  };
});

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = line === LINES[0] ? 0 : -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
  });
  return { line, word };
}

/**
 * The effects under the voice: the game's own (SfxId) and a few made for
 * this short in sfx.ts, each matched to its beat's mood.
 */
export type CustomSfx = 'boom' | 'stomp' | 'thud' | 'oof' | 'scratch' | 'block' | 'hm' | 'snap' | 'plop' | 'dizzy' | 'creak' | 'strain' | 'wah' | 'whoosh' | 'triumph' | 'pluck';
export interface SoundCue {
  readonly id: SfxId | CustomSfx;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
  /** For sounds that last as long as their action (the quill's scratch, a creak). */
  readonly dur?: number;
}
const cue = (id: SoundCue['id'], t: number, gain: number, pitch = 1, pan = 0, dur?: number): SoundCue => ({ id, t, pitch, gain, pan, ...(dur ? { dur } : {}) });

/** SHOCK: the slam into the loop point and the stomp on "THIS", the ground cracking. */
const SHOCK: readonly SoundCue[] = [
  cue('whoosh', BECAUSE_AT + 0.05, 0.5, 0.6, 0, 0.7),
  cue('boom', SLAM_AT, 0.42),
  cue('crumbleHard', SLAM_AT + 0.03, 0.6, 0.7, 0.2),
  cue('whoosh', LIKE_AT - 0.15, 0.3, 0.8, 0.2, 0.35),
  cue('boom', STOMP_AT, 0.3, 1.08),
  cue('crumbleHard', STOMP_AT + 0.03, 0.45, 0.8, 0.3),
];

/** LAUGH: heavy comic footfalls, and an "oof" as each extra you lands. */
const LAUGH: readonly SoundCue[] = [
  ...STEPS.map((at, k) => cue('thud', at, 0.8, 1 - 0.05 * k, -0.3 + 0.12 * k)),
  ...RIDERS_LAND.map((at, i) => cue('oof', at, 0.85, 1 - 0.12 * i, 0)),
  cue('pluck', BACK_AT + 0.05, 0.5, 1.2, 0.3),
];

/** CURIOUS: a soft swell, and the quill scratching each stroke. */
const CURIOUS: readonly SoundCue[] = [
  cue('swell', GALILEO_AT - 0.15, 0.9, 1.25),
  ...STROKES.map((s) => cue('scratch', s.from, s.id === 'big' ? 0.6 : 0.45, s.id === 'big' ? 0.8 : 1, (s.x0 + s.x1) / 1100 - 0.4, s.to - s.from)),
];

/** TENSION, then SURPRISE: the copy whooshes up, eight thumps climbing, a heavy settle; four ticks and the "hm?". */
const TENSION: readonly SoundCue[] = [
  cue('whoosh', DOUBLE_AT, 0.4, 1.2, 0.3, 0.5),
  ...DROPS.map((d, n) => cue('block', d.at, 0.75, 1 + 0.075 * n, d.i ? 0.3 : 0.1)),
  cue('full', HEAVIER_AT + 0.05, 0.9, 0.7, 0.2),
  cue('tick', SMALL_CELL_AT, 0.7, 1, -0.5),
  ...CELLS_AT.map((at, k) => cue('tick', at, 0.7, 1.1 + 0.1 * k, 0.1)),
  cue('hm', FOUR_AT + 0.12, 0.8),
  cue('creak', STRONGER_AT - 0.1, 0.45, 0.9, 0.2, 0.7),
];

/** JOLT: a wobbling creak, the crack on "snap", the plop and a dizzy twitter. */
const JOLT: readonly SoundCue[] = [
  cue('tick', THIN_LEGS_AT, 0.5, 1.4),
  cue('creak', JUST_AT - 0.35, 0.5, 1.2, 0, SNAP_AT - JUST_AT + 0.3),
  cue('snap', GIVE_AT, 0.5),
  cue('plop', SIT_AT, 0.9),
  cue('dizzy', SIT_AT + 0.25, 0.45, 1, 0.2),
];

/** TENDER: the strain of the push, a soft thump back down, a sad low "wah-wah". */
const TENDER: readonly SoundCue[] = [
  cue('strain', CANT_AT - 0.08, 0.55, 1, 0, 0.45),
  cue('land', SINK_AT + 0.28, 0.9, 0.6),
  cue('wah', SINK_AT + 0.05, 0.75),
];

/** TRIUMPH: its stride, ticks for "short" and "wide", a stamp and a rising tick per leg, then the fanfare. */
const TRIUMPH: readonly SoundCue[] = [
  ...walkSteps().map((at, k) => cue('stomp', at, 0.55, 1 + 0.03 * (k % 2), k % 2 ? 0.2 : -0.2)),
  cue('tick', SHORT_AT, 0.6, 1.2),
  cue('tick', WIDE_AT, 0.6, 1.35),
  ...[0, 1, 2, 3, 4, 5].flatMap((k) => [cue('stomp', countAt(k), 0.35, 1.2, -0.5 + k * 0.2), cue('tick', countAt(k) + 0.01, 0.55, 1 + 0.12 * k, -0.5 + k * 0.2)]),
  cue('triumph', ANIMALS_AT - 0.05, 0.85),
];

export const SOUNDS: readonly SoundCue[] = [...SHOCK, ...LAUGH, ...CURIOUS, ...TENSION, ...JOLT, ...TENDER, ...TRIUMPH];
