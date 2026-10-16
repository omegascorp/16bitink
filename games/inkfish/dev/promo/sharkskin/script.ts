import type { SfxId } from '../../../src/audio/recipes';
import { ramp, window01 } from '../short';
import {
  AWAY_FROM, CHEFS_AT, DOWN_FROM, EVERY_AT, GRATE_AT, JAPAN_AT, LIKE_AT, LOOP_S, NOSE_AT, ON_SKIN_AT, OTHER_AT, POINT_AT, REMEMBER_AT, ROUGH_FROM,
  ROUGH_TO, SANDPAPER_AT, SCALE_AT, SKIN_AT, SMOOTH_AT, SMOOTH_FROM, SO_AT, STROKE_AT, SUSHI_AT, TAIL_AT, TEETH_AT, TO_TAIL_AT, TOOTH_AT, WASABI_AT,
  WAY_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (notes and captions), when each prop shows, and the sound effects under the voice. */

// ---------------------------------------------------------------- notes and props

/** "tiny teeth" by the magnifier: up from the first frame, off as the cut-away scale comes in, and back on "remember:". */
export const teethLabel = (t: number): number =>
  t < LOOP_S / 2 ? 1 - ramp(t, SCALE_AT - 0.3, SCALE_AT) : ramp(t, REMEMBER_AT + 0.05, REMEMBER_AT + 0.35);

/** The cut-away card: the scale on "scale", "=" on "like", the tooth on "tooth", gone before the hand comes down. */
const CARD_OFF = STROKE_AT - 0.35;
export const cardAt = (t: number): number => window01(t, EVERY_AT, CARD_OFF, 0.3);
export const scaleCut = (t: number): number => Math.min(ramp(t, SCALE_AT - 0.1, SCALE_AT + 0.2), 1 - ramp(t, CARD_OFF - 0.3, CARD_OFF));
export const equalsSign = (t: number): number => Math.min(ramp(t, LIKE_AT - 0.1, LIKE_AT + 0.15), 1 - ramp(t, CARD_OFF - 0.3, CARD_OFF));
export const toothCut = (t: number): number => Math.min(ramp(t, TOOTH_AT - 0.1, TOOTH_AT + 0.2), 1 - ramp(t, CARD_OFF - 0.3, CARD_OFF));

/** The long arrow along the shark to its tail, drawn out on "point to the tail" (0 .. 1 drawn), and how much shows. */
export const tailArrowDrawn = (t: number): number => ramp(t, POINT_AT, TAIL_AT + 0.1);
export const tailArrowShown = (t: number): number => window01(t, POINT_AT - 0.05, STROKE_AT - 0.1, 0.25);

/** "tail" under the tail on "tail." and again on "nose to tail"; "nose" under the nose on "nose". */
export const tailLabel = (t: number): number => Math.max(window01(t, TAIL_AT - 0.1, STROKE_AT - 0.1, 0.2), window01(t, TO_TAIL_AT - 0.1, SMOOTH_AT + 0.6, 0.2));
export const noseLabel = (t: number): number => window01(t, NOSE_AT - 0.1, SMOOTH_AT + 0.6, 0.2);

/** "smooth ✓" on "smooth.", until the hand turns round. */
export const smoothLabel = (t: number): number => window01(t, SMOOTH_AT - 0.05, OTHER_AT + 0.05, 0.2);

/** The sheet of sandpaper, slapped down on "SANDPAPER" (overshooting a touch as it lands). */
export const sandpaperAt = (t: number): number => window01(t, SANDPAPER_AT - 0.1, JAPAN_AT - 0.1, 0.18);

/** Japan: the flag and its name on "Japan", until "So…". */
const JAPAN_OFF = SO_AT + 0.1;
export const japanAt = (t: number): number => window01(t, JAPAN_AT - 0.1, JAPAN_OFF, 0.25);
/**
 * The chef steps in from the left on "Japan" (so the picture keeps moving
 * until "chefs"), in place and named on "chefs"; the grater on "grate", the
 * root on "wasabi", "shark skin" on "shark skin".
 */
export const chefAt = (t: number): number => window01(t, JAPAN_AT - 0.1, JAPAN_OFF, 0.3);
export const chefIn = (t: number): number => ramp(t, JAPAN_AT - 0.1, CHEFS_AT + 0.05);
export const chefLabel = (t: number): number => window01(t, CHEFS_AT - 0.1, JAPAN_OFF, 0.2);
export const graterAt = (t: number): number => window01(t, GRATE_AT - 0.2, JAPAN_OFF, 0.25);
export const wasabiAt = (t: number): number => window01(t, WASABI_AT - 0.2, JAPAN_OFF, 0.2);
export const skinLabel = (t: number): number => window01(t, ON_SKIN_AT - 0.05, JAPAN_OFF, 0.2);

/** The plate of sushi, sliding in on "So next time…", there on "sushi", and gone as the magnifier comes back. */
export const sushiAt = (t: number): number => window01(t, SO_AT + 0.1, REMEMBER_AT + 0.5, 0.4);

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
    const full = !last || last.length >= 4 || /[.,:?…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
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

/** The rasp of a hand dragged against the grain: low gritty bursts, one per lurch. */
const RASP: readonly SoundCue[] = [0, 1, 2, 3, 4].map((k) => ({
  id: 'rustle', t: ROUGH_FROM + 0.12 + (k * (ROUGH_TO - ROUGH_FROM)) / 5, pitch: 0.42, gain: 0.3, pan: 0.3 - 0.15 * k,
}));

/** The root going round on the grater: a soft scrape every turn. */
const GRATING: readonly SoundCue[] = [0, 1, 2, 3].map((k) => ({
  id: 'rustle', t: GRATE_AT + 0.15 + k * 0.45, pitch: 0.75, gain: 0.16, pan: 0.25,
}));

/**
 * Quiet under the voice: it does the talking. Each mood its own sound: a
 * bright ding for the surprise, pencil ticks for the curious diagram, a soft
 * swish and a gentle chime for the smooth stroke, a nervous double beep and
 * a gritty rasp against the grain, a cheeky plink and the grater's scrape
 * in Japan, and a soft rise for the sushi.
 */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'clang', t: TEETH_AT, pitch: 1.6, gain: 0.2, pan: 0 },
  { id: 'click', t: SCALE_AT, pitch: 1.1, gain: 0.25, pan: -0.4 },
  { id: 'click', t: LIKE_AT, pitch: 1.3, gain: 0.2, pan: 0 },
  { id: 'click', t: TOOTH_AT, pitch: 1.1, gain: 0.25, pan: 0.4 },
  { id: 'dash', t: POINT_AT + 0.05, pitch: 1.2, gain: 0.1, pan: 0.4 },
  { id: 'drop', t: TAIL_AT, pitch: 0.9, gain: 0.16, pan: 0.6 },
  { id: 'dash', t: DOWN_FROM + 0.1, pitch: 0.6, gain: 0.08, pan: -0.5 },
  { id: 'dash', t: SMOOTH_FROM, pitch: 0.45, gain: 0.1, pan: -0.3 },
  { id: 'grow', t: SMOOTH_AT, pitch: 0.8, gain: 0.1, pan: 0.2 },
  { id: 'spotted', t: WAY_AT, pitch: 0.8, gain: 0.1, pan: 0.4 },
  ...RASP,
  { id: 'smash', t: SANDPAPER_AT + 0.05, pitch: 0.5, gain: 0.12, pan: 0 },
  { id: 'dash', t: AWAY_FROM, pitch: 0.7, gain: 0.08, pan: -0.3 },
  { id: 'drop', t: JAPAN_AT, pitch: 1.2, gain: 0.16, pan: -0.4 },
  { id: 'frenzy', t: CHEFS_AT, pitch: 1.0, gain: 0.08, pan: -0.3 },
  ...GRATING,
  { id: 'drop', t: SKIN_AT + 0.3, pitch: 0.6, gain: 0.12, pan: 0.1 },
  { id: 'free', t: SUSHI_AT - 0.2, pitch: 0.8, gain: 0.12, pan: 0 },
  { id: 'drop', t: REMEMBER_AT, pitch: 0.8, gain: 0.12, pan: -0.2 },
];
