import type { SfxId } from '../../../src/audio/recipes';
import { SLOT_X } from './layout';
import { ARRIVE, CRABS, GROW_FROM, LEAVE, NEWCOMER_FROM, NEWCOMER_IN, SHELL_LANDS, WALK_FROM, WAVE_FROM } from './queue';
import { GATHER_AT, QUEUE_AT, SECONDS_AT, SOMETIMES_AT, TURNS_AT, VACANCY_AT, WAIT_AT } from './story';

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/** Screen x to stereo pan, gently. */
const panAt = (x: number): number => Math.max(-0.6, Math.min(0.6, (x - 540) / 900));

/**
 * Quiet under the voice: it does the talking. A light, curious mood: little
 * hops down the line on "QUEUE UP", the shell's bump as it turns up, the
 * shuffle of feet, the clock's ticks; then the payoff, a tok as each crab
 * pops out and the game's "movein" as it takes the next shell, falling
 * like dominoes; the game's win at the end of the chain, a click of the
 * stopwatch, a warm grow as they fill their new homes, and the tide that
 * brings the next big shell.
 */
export const SOUNDS: readonly SoundCue[] = [
  ...CRABS.map((i): SoundCue => ({ id: 'jump', t: QUEUE_AT - 0.05 + 0.07 * i, pitch: 0.7 + 0.1 * i, gain: 0.12, pan: panAt(SLOT_X[i]!) })),
  { id: 'place', t: TURNS_AT, pitch: 0.8, gain: 0.3, pan: panAt(SLOT_X[0]!) },
  { id: 'dig', t: GATHER_AT + 0.1, pitch: 1.4, gain: 0.1, pan: 0.2 },
  { id: 'dig', t: GATHER_AT + 0.45, pitch: 1.6, gain: 0.1, pan: 0.1 },
  { id: 'dig', t: GATHER_AT + 0.8, pitch: 1.5, gain: 0.1, pan: 0.15 },
  { id: 'hide', t: WAIT_AT + 0.05, pitch: 1.2, gain: 0.12, pan: 0 },
  ...[0, 1, 2, 3, 4].map((k): SoundCue => ({ id: 'click', t: SOMETIMES_AT + 0.05 + 0.25 * k, pitch: 0.7, gain: 0.18, pan: 0.4 })),
  ...CRABS.flatMap((i): SoundCue[] => [
    { id: 'tok', t: LEAVE[i]!, pitch: 0.7 + 0.1 * i, gain: 0.32, pan: panAt(SLOT_X[i]!) },
    { id: 'movein', t: ARRIVE[i]! - 0.05, pitch: 0.7 + 0.1 * i, gain: i === 1 ? 0.5 : 0.32, pan: panAt(SLOT_X[i - 1]!) },
  ]),
  { id: 'win', t: ARRIVE[CRABS.length]! + 0.2, pitch: 1, gain: 0.18, pan: 0 },
  { id: 'click', t: SECONDS_AT - 0.2, pitch: 1.4, gain: 0.28, pan: 0.4 },
  ...[0, 1, 2].map((k): SoundCue => ({ id: 'click', t: SECONDS_AT + 0.25 * k, pitch: 1, gain: 0.16, pan: 0.4 })),
  { id: 'grow', t: GROW_FROM, pitch: 0.9, gain: 0.22, pan: 0 },
  { id: 'dig', t: WALK_FROM + 0.1, pitch: 1.1, gain: 0.08, pan: -0.5 },
  { id: 'jump', t: NEWCOMER_FROM + 0.1, pitch: 1.6, gain: 0.1, pan: 0.5 },
  { id: 'movein', t: NEWCOMER_IN - 0.05, pitch: 1.5, gain: 0.3, pan: panAt(SLOT_X[CRABS.length]!) },
  { id: 'tide', t: WAVE_FROM, pitch: 1, gain: 0.32, pan: -0.4 },
  { id: 'place', t: SHELL_LANDS, pitch: 0.75, gain: 0.26, pan: panAt(SLOT_X[0]!) },
  { id: 'join', t: VACANCY_AT, pitch: 1, gain: 0.12, pan: 0 },
];
