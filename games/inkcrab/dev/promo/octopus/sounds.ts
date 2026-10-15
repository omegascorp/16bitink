import type { SfxId } from '../../../src/audio/recipes';
import { JETS, PUFFS, SHELL_TOP } from './motion';
import {
  AGAIN_AT, BAD_AT, BEATS, BLUE_AT, BODY_AT, COPPER_AT, COUNT_AT, CRABS_AT, HUNTS_AT, IRON_AT, KNOCK_AT, MAIN_AT, monitorAt, NOT_AT, STOP_FROM,
  STOP_TO, THEM_AT, THREE_AT, TWO_AT,
} from './story';

/**
 * What the short sounds like under the voice, quiet: the voice does the
 * talking. A soft three-part heartbeat all the way through (the main
 * heart's thump missing while it is stopped); a bright sparkle on "THREE"
 * and a chime on "BLUE"; a metal tok for each tile; the monitor's beep and
 * its flat tone; a rush of water for the jet; a low, uneasy chord for "Bad
 * news for crabs"; the crab's nervous squeak, the knock on its shell and
 * its tuck into it (the game's hide); scrapes as arms go into the holes;
 * ticks as the hearts are counted again.
 */
export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

export const SOUNDS: readonly SoundCue[] = [
  { id: 'find', t: THREE_AT, pitch: 1, gain: 0.22, pan: 0 },
  { id: 'click', t: THREE_AT + 0.18, pitch: 1.2, gain: 0.25, pan: 0.2 },
  { id: 'click', t: THREE_AT + 0.36, pitch: 1.4, gain: 0.25, pan: 0 },
  { id: 'click', t: TWO_AT, pitch: 1, gain: 0.2, pan: -0.2 },
  { id: 'click', t: BODY_AT - 0.1, pitch: 0.9, gain: 0.2, pan: -0.3 },
  { id: 'grow', t: BLUE_AT, pitch: 1, gain: 0.2, pan: 0.2 },
  { id: 'tok', t: COPPER_AT, pitch: 1.1, gain: 0.25, pan: -0.5 },
  { id: 'tok', t: NOT_AT, pitch: 0.7, gain: 0.25, pan: 0.5 },
  { id: 'click', t: IRON_AT + 0.08, pitch: 0.75, gain: 0.25, pan: 0.5 },
  { id: 'click', t: MAIN_AT - 0.2, pitch: 1.1, gain: 0.2, pan: -0.5 },
  { id: 'gust', t: JETS[0]! - 0.25, pitch: 1.5, gain: 0.3, pan: 0.2 },
  { id: 'gust', t: JETS[1]! - 0.2, pitch: 1.8, gain: 0.16, pan: 0.4 },
  { id: 'dark', t: BAD_AT, pitch: 1, gain: 0.3, pan: 0 },
  { id: 'dark', t: HUNTS_AT, pitch: 0.89, gain: 0.26, pan: 0 },
  { id: 'out', t: CRABS_AT, pitch: 1, gain: 0.22, pan: 0.5 },
  { id: 'knock', t: KNOCK_AT, pitch: 1, gain: 0.32, pan: 0.5 },
  { id: 'hide', t: KNOCK_AT + 0.16, pitch: 1, gain: 0.3, pan: 0.5 },
  ...PUFFS.filter((p) => p.to !== SHELL_TOP).map((p, i): SoundCue => ({ id: 'dig', t: p.at, pitch: 0.75 + 0.06 * i, gain: 0.22, pan: p.to.x > 540 ? 0.6 : -0.3 })),
  { id: 'click', t: COUNT_AT, pitch: 1.2, gain: 0.25, pan: -0.2 },
  { id: 'click', t: THEM_AT, pitch: 1.35, gain: 0.25, pan: 0.2 },
  { id: 'click', t: AGAIN_AT, pitch: 1.5, gain: 0.25, pan: 0 },
];

/** The heartbeat's thumps: the gill hearts softer, the main heart a little louder. */
export const THUMPS: readonly { readonly t: number; readonly gain: number }[] = BEATS.map((b) => ({ t: b.t, gain: b.id === 3 ? 1 : 0.6 }));

/** The monitor's beep on each main-heart beat while it is on screen, and its flat tone while that heart is stopped. */
export const BEEPS: readonly number[] = BEATS.filter((b) => b.id === 3 && monitorAt(b.t + 0.06) > 0.5).map((b) => b.t + 0.06);
export const FLAT = { from: STOP_FROM + 0.05, to: STOP_TO - 0.05 } as const;
