import type { SfxId } from '../../../src/audio/recipes';
import { ramp, window01 } from '../short';
import {
  BELIEVE_AT, BLUEFIN_AT, BREATHES_AT, DROWN_AT, EVEN_AT, GILLS_AT, IF_AT, LOOP_S, MOUTH_AT, OCEAN_AT, PUSHING_AT, REST_AT, RING_LAND, RING_OFF,
  SLEEP_AT, SO_AT, SO_YES_AT, STOPS_AT, SUFFOCATES_AT, SWIM_AT, TUNA_AT, WATER_AT, YES_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (the hook, the labels and the captions), and the sound effects under the voice. */

// ---------------------------------------------------------------- labels

/** "FISH CAN DROWN?!" up top: from the loop's first frame until the tuna is named, and back on "believe". */
export const hookAt = (t: number): number =>
  t < LOOP_S / 2 ? 1 - ramp(t, TUNA_AT - 0.3, TUNA_AT + 0.05) : ramp(t, BELIEVE_AT - 0.1, BELIEVE_AT + 0.25);
/** "tuna" over its back, from "tuna" until it stops. */
export const tunaLabel = (t: number): number => window01(t, TUNA_AT - 0.05, STOPS_AT, 0.25);
/** "mouth" by its open mouth, and "water" by the water flowing in. */
export const mouthLabel = (t: number): number => window01(t, MOUTH_AT - 0.05, STOPS_AT, 0.25);
export const waterLabel = (t: number): number => window01(t, WATER_AT - 0.05, STOPS_AT, 0.25);
/** "gills" by its gill cover, on "gills", until it sets off again. */
export const gillsLabel = (t: number): number => window01(t, GILLS_AT - 0.05, SO_AT + 0.2, 0.25);
/** "no water, no O₂" under the gauge as it drains. */
export const chokeLabel = (t: number): number => window01(t, SUFFOCATES_AT - 0.05, SO_AT + 0.2, 0.2);
/** "bluefin" over the tuna on the map, "Atlantic Ocean" across the sea on "ocean". */
export const bluefinLabel = (t: number): number => window01(t, BLUEFIN_AT - 0.05, SO_YES_AT + 0.1, 0.25);
export const oceanLabel = (t: number): number => window01(t, OCEAN_AT - 0.1, SO_YES_AT + 0.3, 0.25);

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,:…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
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
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
  });
  return { line, word };
}

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/** A nervous pulse as the oxygen drains: low ticks, closer and closer together. */
const PULSE: readonly SoundCue[] = [0, 0.42, 0.78, 1.08, 1.33, 1.54, 1.72].map((d) => ({
  id: 'click', t: STOPS_AT + 0.35 + d, pitch: 0.55, gain: 0.2, pan: 0.3,
}));

/** Pen ticks as the dotted route is drawn across the ocean. */
const DOTS: readonly SoundCue[] = [0, 0.3, 0.6, 0.9, 1.2, 1.5].map((d) => ({
  id: 'click', t: SWIM_AT - 0.1 + d, pitch: 1.3, gain: 0.08, pan: -0.4 + 0.16 * d,
}));

/**
 * Quiet under the voice: a surprised sting on the hook, the ring floating
 * off, water rushing in through the mouth, a nervous pulse and two warning
 * beeps as it suffocates (nothing funny there), the rush as it sets off
 * again, pen strokes crossing out the bed and the "Zzz", the map's rustle
 * and a warm chime as the bluefin arrives, and a splash as the ring lands.
 */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'spotted', t: DROWN_AT, pitch: 1.2, gain: 0.1, pan: 0 },
  { id: 'free', t: RING_OFF + 0.1, pitch: 1.0, gain: 0.12, pan: 0.1 },
  { id: 'drop', t: BREATHES_AT, pitch: 1.0, gain: 0.1, pan: 0.5 },
  { id: 'suck', t: MOUTH_AT - 0.15, pitch: 1.5, gain: 0.07, pan: 0.4 },
  { id: 'suck', t: PUSHING_AT - 0.1, pitch: 1.7, gain: 0.06, pan: 0.4 },
  { id: 'click', t: GILLS_AT, pitch: 1.1, gain: 0.12, pan: 0.2 },
  { id: 'dash', t: IF_AT + 0.2, pitch: 0.4, gain: 0.08, pan: 0 },
  ...PULSE,
  { id: 'spotted', t: SUFFOCATES_AT + 0.25, pitch: 0.7, gain: 0.12, pan: 0.5 },
  { id: 'spotted', t: SUFFOCATES_AT + 0.65, pitch: 0.7, gain: 0.12, pan: 0.5 },
  { id: 'lunge', t: SO_AT - 0.1, pitch: 0.8, gain: 0.3, pan: 0 },
  { id: 'dash', t: SO_AT, pitch: 0.7, gain: 0.18, pan: 0.2 },
  { id: 'drop', t: REST_AT - 0.2, pitch: 0.6, gain: 0.1, pan: -0.4 },
  { id: 'click', t: REST_AT + 0.08, pitch: 0.9, gain: 0.16, pan: -0.4 },
  { id: 'click', t: REST_AT + 0.28, pitch: 0.9, gain: 0.16, pan: -0.4 },
  { id: 'drop', t: EVEN_AT - 0.1, pitch: 0.5, gain: 0.1, pan: 0.4 },
  { id: 'dash', t: SLEEP_AT + 0.05, pitch: 1.5, gain: 0.1, pan: 0.4 },
  { id: 'rustle', t: BLUEFIN_AT - 0.3, pitch: 0.9, gain: 0.16, pan: 0 },
  ...DOTS,
  { id: 'grow', t: OCEAN_AT + 0.45, pitch: 0.9, gain: 0.16, pan: 0.4 },
  { id: 'dash', t: SO_YES_AT, pitch: 0.8, gain: 0.12, pan: 0 },
  { id: 'free', t: YES_AT + 0.3, pitch: 0.7, gain: 0.08, pan: 0 },
  { id: 'splash', t: RING_LAND - 0.02, pitch: 1.1, gain: 0.18, pan: 0 },
];
