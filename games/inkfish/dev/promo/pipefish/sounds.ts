import type { SfxId } from '../../../src/audio/recipes';
import { SNACKS, snackTime } from './brood';
import {
  BELLY_AT, BIRTH_AT, BURSTS, CLOUD, eggLaunch, EGG_COUNT, EGG_FLIGHT, FEMALE_AT, HAPPY_AT, MALES_AT, ONLY_AT, OXYGEN_AT, PIPEFISH_AT, POUCH_AT,
  SEAHORSES_AT, FLIP_S, WEEK_FLIPS, WEEKS_AT,
} from './story';

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/**
 * Quiet under the voice: it does the talking. Warm and soft for the tender
 * beats (eggs dropping in, oxygen bubbles), a bright pop for the birth, a
 * little fanfare for the card.
 */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'click', t: PIPEFISH_AT, pitch: 1.0, gain: 0.3, pan: -0.2 },
  { id: 'dash', t: SEAHORSES_AT - 0.3, pitch: 1.3, gain: 0.07, pan: 0.6 },
  { id: 'click', t: SEAHORSES_AT + 0.05, pitch: 1.1, gain: 0.3, pan: 0.5 },
  { id: 'frenzy', t: ONLY_AT, pitch: 1.0, gain: 0.16, pan: 0 },
  { id: 'click', t: MALES_AT, pitch: 0.9, gain: 0.35, pan: -0.2 },
  { id: 'click', t: MALES_AT + 0.14, pitch: 1.0, gain: 0.35, pan: 0.4 },
  { id: 'dash', t: FEMALE_AT - 0.6, pitch: 1.1, gain: 0.08, pan: -0.6 },
  // Her eggs dropping into his pouch: soft, rising little plips.
  ...Array.from({ length: EGG_COUNT / 2 }, (_, i): SoundCue => ({
    id: 'drop', t: eggLaunch(2 * i) + EGG_FLIGHT, pitch: 1.4 + 0.08 * i, gain: 0.12, pan: 0.05 * i - 0.1,
  })),
  { id: 'click', t: POUCH_AT, pitch: 0.9, gain: 0.25, pan: 0 },
  { id: 'grow', t: BELLY_AT + 0.1, pitch: 0.8, gain: 0.14, pan: 0 },
  // Oxygen bubbling into the eggs.
  ...[0, 0.3, 0.62, 1.0].map((d, i): SoundCue => ({ id: 'free', t: OXYGEN_AT + d, pitch: 1.2 + 0.15 * i, gain: 0.09, pan: -0.5 })),
  // The calendar's pages.
  ...Array.from({ length: WEEK_FLIPS }, (_, i): SoundCue => ({ id: 'click', t: WEEKS_AT + FLIP_S * (i + 0.75), pitch: 1.3, gain: 0.3, pan: 0.5 })),
  { id: 'rustle', t: BIRTH_AT - 0.1, pitch: 1.0, gain: 0.12, pan: 0 },
  // The birth: a bright pop and a splash of babies.
  { id: 'powerup', t: CLOUD.at - 0.04, pitch: 1.0, gain: 0.32, pan: 0 },
  { id: 'splash', t: CLOUD.at, pitch: 1.3, gain: 0.14, pan: 0 },
  ...BURSTS.filter((b) => b !== CLOUD).map((b, i): SoundCue => ({ id: 'drop', t: b.at, pitch: 1.9 + 0.1 * (i % 3), gain: 0.14, pan: 0 })),
  // Babies snapping up plankton.
  ...SNACKS.map((s, i): SoundCue => ({ id: 'eat', t: snackTime(s), pitch: 2.2 + 0.1 * i, gain: 0.2, pan: 0 })),
  { id: 'win', t: HAPPY_AT, pitch: 1.0, gain: 0.18, pan: 0 },
];
