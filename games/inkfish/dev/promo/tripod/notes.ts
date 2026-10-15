import type { SfxId } from '../../../src/audio/recipes';
import { ramp, smooth, window01 } from '../short';
import { EAT_A, EAT_B, LAND_AT, LIFT_AT, LOOP_S, REACH_AT, RISE_AT, said, STAND_AT } from './story';
import { TEMPO, WORDS, type Word } from './words';

/** The short's labels, diagrams and readouts, timed to the words; the captions; and the sounds under the voice. */

/**
 * "stilts", pointing at all three, from "That's why" round the loop point to
 * "The tripodfish": the first frame says what the first line says.
 */
export const stiltsLabel = (t: number): number => (t < LOOP_S / 2 ? 1 - ramp(t, LIFT_AT - 0.2, LIFT_AT + 0.1) : ramp(t, said("That's") - 0.1, said("That's") + 0.15));

/** "tripodfish", over it as it is named. */
export const nameLabel = (t: number): number => window01(t, said('tripodfish') - 0.05, said('mud') - 0.05, 0.2);
/** "mud", on "mud", till the depth gauge takes over. */
export const mudLabel = (t: number): number => window01(t, said('mud') - 0.05, said('up') - 0.1, 0.2);

/** Speed lines under it as it rises onto its stilts. */
export const riseAt = (t: number): number => window01(t, RISE_AT + 0.05, STAND_AT - 0.05, 0.12);

// ---------------------------------------------------------------- the depth gauge

const DEPTH_FROM = said('up');
const DEPTH_TO = said('down.');
export const MAX_DEPTH = 4500;

/** The gauge, from "up to" until it props itself up. */
export const depthAt = (t: number): number => window01(t, DEPTH_FROM - 0.25, RISE_AT + 0.15, 0.3);

/** The depth on the gauge, counted down from "up" to "down", in whole hundreds. */
export function metresAt(t: number): number {
  return Math.round((MAX_DEPTH * smooth((t - DEPTH_FROM) / (DEPTH_TO - DEPTH_FROM))) / 100) * 100;
}

/** "4.5 km down", on "kilometres". */
export const kmLabel = (t: number): number => depthAt(t) * ramp(t, said('kilometres') - 0.05, said('kilometres') + 0.25);

// ---------------------------------------------------------------- three fin rays, longer than its body

/** The numbers 1, 2, 3 on the rays, one each on "three", "fin", "rays". */
const TAG_AT = [said('three'), said('fin'), said('rays')];
export const tagAt = (i: number, t: number): number => window01(t, TAG_AT[i]! - 0.04, said('body,') + 0.2, 0.15);
/** "fin rays", on "fin". */
export const finRaysLabel = (t: number): number => window01(t, said('fin') - 0.05, said('body,') + 0.2, 0.2);

/** The measuring bars' time on screen, until the current comes in. */
const BARS_TO = said('current.') - 0.15;
export const barsAt = (t: number): number => window01(t, said('rays') - 0.1, BARS_TO, 0.25);
/** The yellow bar traced down the front ray as it is named… */
export const rayTraceAt = (t: number): number => ramp(t, said('rays') - 0.05, said('longer') + 0.05);
/** …then swung up and laid along the body on "longer", overhanging its tail… */
export const raySwingAt = (t: number): number => ramp(t, said('longer') + 0.1, said('body,') + 0.05);
/** …and the body's own length drawn beside it on "body". */
export const bodyBarAt = (t: number): number => ramp(t, said('body,') - 0.1, said('body,') + 0.25);

// ---------------------------------------------------------------- the current, the fins, the copepod

/** The current streaming at its face, from "faces" until "Its front fins". */
export const currentAt = (t: number): number => window01(t, said('faces') - 0.15, said('Its') + 0.25, 0.3);
export const currentLabel = (t: number): number => window01(t, said('current.') - 0.05, said('Its') + 0.25, 0.2);
/** "front fins", on "front", while they sweep forwards. */
export const frontFinsLabel = (t: number): number => window01(t, said('front') - 0.05, said('feeling') - 0.1, 0.2);
/** "like hands": little motion ticks at the ray tips while they feel about. */
export const handsAt = (t: number): number => window01(t, said('hands,') - 0.05, said('feeling') + 0.6, 0.2);

/** The lens on the copepod in the fins, from "tiny" to "It lets". */
export const lensAt = (t: number): number => window01(t, said('tiny') - 0.35, said('It', 2) - 0.05, 0.3);
export const copepodLabel = (t: number): number => window01(t, said('crustaceans') - 0.05, said('It', 2) - 0.05, 0.2);

/** A dashed arrow from the copepod to its mouth on "lets the food come to it". */
export const foodArrowAt = (t: number): number => window01(t, said('lets') - 0.05, EAT_B - 0.05, 0.15);
export const foodLabel = (t: number): number => window01(t, said('food') - 0.05, EAT_B + 0.15, 0.15);

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

/** Soft and quiet under the voice: plinks for the copepods, a hush of silt, a rising swell as it stands. */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'suck', t: EAT_A - 0.3, pitch: 1.6, gain: 0.08, pan: -0.3 },
  { id: 'eat', t: EAT_A, pitch: 1.6, gain: 0.32, pan: -0.3 },
  { id: 'drop', t: said('STILTS.') + 0.05, pitch: 1.5, gain: 0.12, pan: -0.2 },
  { id: 'drop', t: said('STILTS.') + 0.2, pitch: 1.7, gain: 0.1, pan: 0.1 },
  { id: 'drop', t: said('STILTS.') + 0.35, pitch: 1.9, gain: 0.09, pan: 0.4 },
  { id: 'dash', t: LIFT_AT + 0.05, pitch: 0.55, gain: 0.08, pan: 0 },
  { id: 'rustle', t: LAND_AT - 0.06, pitch: 0.6, gain: 0.22, pan: 0 },
  { id: 'drop', t: LAND_AT - 0.04, pitch: 0.5, gain: 0.14, pan: 0 },
  ...[0.25, 0.5, 0.75].map((k): SoundCue => ({ id: 'click', t: DEPTH_FROM + k * (DEPTH_TO - DEPTH_FROM), pitch: 0.8 + 0.2 * k, gain: 0.12, pan: 0.6 })),
  { id: 'drop', t: DEPTH_TO, pitch: 1.2, gain: 0.2, pan: 0.6 },
  { id: 'grow', t: said('props') - 0.15, pitch: 0.8, gain: 0.22, pan: 0 },
  { id: 'rustle', t: STAND_AT - 0.03, pitch: 0.8, gain: 0.2, pan: 0 },
  ...TAG_AT.map((at, i): SoundCue => ({ id: 'click', t: at, pitch: 1.2 + 0.15 * i, gain: 0.16, pan: i === 2 ? 0.4 : -0.3 })),
  { id: 'dash', t: said('longer') + 0.1, pitch: 1.5, gain: 0.07, pan: 0 },
  { id: 'drop', t: said('body,') + 0.2, pitch: 1.8, gain: 0.14, pan: 0.2 },
  { id: 'dash', t: said('faces') - 0.1, pitch: 0.45, gain: 0.07, pan: -0.7 },
  { id: 'dash', t: said('current.') - 0.2, pitch: 0.5, gain: 0.06, pan: -0.7 },
  { id: 'rustle', t: REACH_AT, pitch: 1.4, gain: 0.08, pan: -0.4 },
  { id: 'drop', t: said('crustaceans') - 0.05, pitch: 2.2, gain: 0.12, pan: -0.4 },
  { id: 'click', t: said('crustaceans') + 0.1, pitch: 1.6, gain: 0.08, pan: 0.4 },
  { id: 'suck', t: EAT_B - 0.3, pitch: 1.6, gain: 0.08, pan: -0.3 },
  { id: 'eat', t: EAT_B, pitch: 1.5, gain: 0.32, pan: -0.3 },
  { id: 'drop', t: EAT_B + 0.12, pitch: 2.0, gain: 0.08, pan: -0.3 },
];
