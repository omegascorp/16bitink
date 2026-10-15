import type { SfxId } from '../../../src/audio/recipes';
import { ATLANTIC_AT, BRAZIL_AT, CAROLINAS_AT, DOTS, INDIAN_AT, PACIFIC_AT, SPREAD_AT, YEARS_AT } from './atlas';
import { GULPS } from './school';
import {
  CARD_IN, CARD_OUT, EAT_AT, EATS_AT, EIGHTY_AT, FIVE_AT, GROUPER_IN, LOOP_S, MEAL_GULP, MEAL_SUCK_FROM, ONE_AT, SAFE_AT, SMALL_AT, SO_AT, THERE_AT,
  VENOMOUS_AT, wrap,
} from './story';

/**
 * The game's sound effects under the narrator, each matching its beat's
 * mood: a clink of cutlery on "EAT", paper for the map, low rumbles as the
 * lionfish spreads, the "!" alarm on −79%, a buzz on "venomous", a bright
 * ding on "safe". Quiet: the voice does the talking.
 */

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t: wrap(t), pitch, gain, pan });

/** A few of the dots' pops, spread over the spread. */
const POPS = DOTS.filter((_, i) => i % 18 === 0).map((d, i) => cue('drop', d.t, 1.1 + 0.08 * (i % 5), 0.07, -0.3 + 0.15 * (i % 5)));

export const SOUNDS: readonly SoundCue[] = [
  // The chromis going in across the loop point.
  cue('suck', MEAL_SUCK_FROM - 0.05, 1.2, 0.16, -0.3),
  cue('eat', MEAL_GULP, 1.0, 0.26, -0.3),
  cue('clang', EAT_AT, 1.6, 0.16, -0.4),
  // The map.
  cue('rustle', CARD_IN, 0.8, 0.22),
  cue('click', PACIFIC_AT, 1.0, 0.3, 0.4),
  cue('click', INDIAN_AT, 1.1, 0.3, 0.2),
  cue('dash', YEARS_AT - 0.3, 0.6, 0.12, 0.2),
  cue('click', YEARS_AT + 0.05, 0.8, 0.35, -0.3),
  cue('boom', SPREAD_AT, 0.45, 0.16),
  cue('lunge', ATLANTIC_AT - 0.1, 0.55, 0.18),
  ...POPS,
  cue('boom', CAROLINAS_AT, 0.5, 0.12, -0.2),
  cue('boom', BRAZIL_AT, 0.42, 0.18, 0.3),
  cue('rustle', CARD_OUT - 0.3, 0.9, 0.18),
  // The grouper thinks better of it.
  cue('dash', GROUPER_IN + 0.1, 0.55, 0.12, -0.6),
  cue('zap', THERE_AT - 0.2, 1.0, 0.12, 0.1),
  cue('spotted', THERE_AT, 0.75, 0.16, -0.4),
  cue('dash', EATS_AT + 0.3, 0.7, 0.12, -0.6),
  // The experiment.
  cue('rustle', SMALL_AT, 1.1, 0.14),
  cue('lunge', ONE_AT, 0.7, 0.2),
  ...GULPS.map((g, i) => cue('eat', g, 1.5 + 0.04 * i, 0.16, i < 4 ? -0.4 : 0.3)),
  cue('spotted', EIGHTY_AT, 1.0, 0.3),
  cue('hurt', EIGHTY_AT + 0.02, 0.7, 0.2),
  cue('click', FIVE_AT, 1.0, 0.35),
  // Venom, then a ding: it's good to eat.
  cue('zap', VENOMOUS_AT, 0.8, 0.22, 0.3),
  cue('clang', SAFE_AT, 2.2, 0.22, -0.3),
  cue('click', SO_AT + 0.2, 0.9, 0.35, -0.3),
].filter((c) => c.t >= 0 && c.t < LOOP_S);
