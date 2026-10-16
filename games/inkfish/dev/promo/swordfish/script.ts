import type { SfxId } from '../../../src/audio/recipes';
import { ramp, window01 } from '../short';
import {
  BRAIN_AT, DEEP_AT, DEGREES_AT, DIVE, DOWN_AT, EYE_AT, FAST_AT, FIFTEEN_AT, FORGET_AT, FREEZING_AT, HEATED_AT, HEATER_AT, HOME, LOOP_S, MUSCLE_AT,
  PREY_AT, SEATS_AT, SWORDFISH_AT, TEN_AT, tempAt, WARM_AT, WARMER_AT, WATER_C, ZOOM_IN, ZOOM_OUT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (labels, readouts and captions), and the sound effects under the voice. */

// ---------------------------------------------------------------- labels

/** "heated eyes" pointing at the glowing eye: the hook, gone on "Swordfish", back as the heated seat is struck out. */
export const hookLabel = (t: number): number => (t < LOOP_S / 2 ? 1 - ramp(t, SWORDFISH_AT - 0.15, SWORDFISH_AT + 0.1) : ramp(t, SEATS_AT, SEATS_AT + 0.2));
/** "swordfish" under it, on "Swordfish". */
export const nameLabel = (t: number): number => window01(t, SWORDFISH_AT - 0.05, DOWN_AT + 0.7, 0.2);
/** The depth readout, from "deep" until the camera goes in on the head. */
export const depthShown = (t: number): number => window01(t, DEEP_AT - 0.15, ZOOM_IN.from + 0.2, 0.25);
/** The thermometer, from "deep" until the camera pulls out again. */
export const thermoShown = (t: number): number => window01(t, DEEP_AT - 0.15, ZOOM_OUT.from + 0.15, 0.25);
/** The cutaway's labels, each on its word: "heater muscle", "eye", "brain". */
export const muscleLabel = (t: number): number => window01(t, MUSCLE_AT - 0.05, ZOOM_OUT.from, 0.2);
export const eyeLabel = (t: number): number => window01(t, EYE_AT - 0.05, ZOOM_OUT.from, 0.2);
export const brainLabel = (t: number): number => window01(t, BRAIN_AT - 0.05, ZOOM_OUT.from, 0.2);
/** "heater" in the muscle's label lights up on "heater". */
export const heaterLit = (t: number): number => ramp(t, HEATER_AT - 0.05, HEATER_AT + 0.15);
/** The two eye views, "cold eye" and "warm eye", from "Warm eyes" until the swordfish heads home. */
export const insetsShown = (t: number): number => window01(t, WARM_AT - 0.1, HOME.from + 0.8, 0.25);
/** "×10" stamped on "TEN" (overshooting a touch as it lands). */
export const tenShown = (t: number): number => (t < TEN_AT - 0.03 ? 0 : Math.min(1.12 * ramp(t, TEN_AT - 0.03, TEN_AT + 0.1), 1.12 - 0.12 * ramp(t, TEN_AT + 0.1, TEN_AT + 0.25), 1 - ramp(t, HOME.from + 0.55, HOME.from + 0.8)));
/** The heated seat: in on "Forget heated…", struck out on "seats", and gone by the loop point. */
export const seatShown = (t: number): number => Math.min(ramp(t, FORGET_AT - 0.06, FORGET_AT + 0.12), 1 - ramp(t, SEATS_AT + 0.2, LOOP_S - 0.02));
export const seatStruck = (t: number): number => ramp(t, SEATS_AT - 0.03, SEATS_AT + 0.13);

/** The thermometer's readout: the water's temperature, then how much warmer the eyes are ("+15 °C"). */
export function tempText(t: number): string {
  const c = Math.round(tempAt(t));
  return t < FIFTEEN_AT - 0.05 ? `${c} °C` : `+${c - WATER_C} °C`;
}

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

/** The depth counter ticking as it rolls down to 550 m, slowing as it lands. */
const TICKS: readonly SoundCue[] = [0, 0.12, 0.23, 0.33, 0.43, 0.53, 0.64, 0.76, 0.9, 1.06].map((d) => ({
  id: 'click', t: DEEP_AT - 0.05 + d, pitch: 1.3, gain: 0.12, pan: -0.3,
}));

/**
 * Quiet under the voice, one mood at a time: a bright sting for the hook;
 * a low whoosh down into the deep and an icy ding on "freezing"; a warm
 * swell for the heater and a rising tone as the thermometer climbs to a
 * ding; a dramatic thump, the mackerel's whoosh and a big boom for "×10";
 * then a playful pop and a whip for the struck-out seat.
 */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'spotted', t: HEATED_AT, pitch: 1.2, gain: 0.16, pan: 0.2 },
  { id: 'dash', t: DIVE.from, pitch: 0.45, gain: 0.28, pan: 0 },
  ...TICKS,
  { id: 'clang', t: FREEZING_AT, pitch: 2.1, gain: 0.16, pan: 0.3 },
  { id: 'rustle', t: FREEZING_AT + 0.05, pitch: 1.8, gain: 0.12, pan: -0.4 },
  { id: 'dash', t: ZOOM_IN.from, pitch: 0.8, gain: 0.14, pan: 0 },
  { id: 'grow', t: MUSCLE_AT, pitch: 0.7, gain: 0.18, pan: -0.2 },
  { id: 'powerup', t: HEATER_AT, pitch: 0.8, gain: 0.14, pan: -0.2 },
  { id: 'click', t: EYE_AT, pitch: 1.1, gain: 0.12, pan: 0.2 },
  { id: 'click', t: BRAIN_AT, pitch: 1.3, gain: 0.12, pan: -0.3 },
  { id: 'grow', t: FIFTEEN_AT - 0.05, pitch: 1.0, gain: 0.18, pan: 0.4 },
  { id: 'clang', t: DEGREES_AT + 0.45, pitch: 1.5, gain: 0.2, pan: 0.4 },
  { id: 'dash', t: ZOOM_OUT.from, pitch: 0.7, gain: 0.14, pan: 0 },
  { id: 'lunge', t: WARM_AT, pitch: 0.6, gain: 0.2, pan: 0 },
  { id: 'dash', t: FAST_AT - 0.1, pitch: 1.3, gain: 0.24, pan: -0.5 },
  { id: 'dash', t: PREY_AT + 0.1, pitch: 1.5, gain: 0.16, pan: 0.5 },
  { id: 'boom', t: TEN_AT, pitch: 0.7, gain: 0.3, pan: 0 },
  { id: 'clang', t: TEN_AT + 0.02, pitch: 1.2, gain: 0.22, pan: 0 },
  { id: 'drop', t: FORGET_AT - 0.04, pitch: 1.4, gain: 0.18, pan: -0.4 },
  { id: 'lash', t: SEATS_AT - 0.03, pitch: 1.5, gain: 0.16, pan: -0.4 },
];
