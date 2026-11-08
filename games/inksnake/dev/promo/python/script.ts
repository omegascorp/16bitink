import type { SfxId } from '../../../src/audio/recipes';
import { window01 } from '../short';
import type { Pt } from '../sprites';
import { DUSK } from './moves';
import {
  AUSTRALIA_AT, BACK_FROM, BARELY_AT, BELLY_AT, BELLY_FROM, DAYS_AT, DAYS_FROM, DUSK_FROM, FACE_FROM, FOUGHT_AT, FOURTEEN_AT,
  GRABBED_AT, HEAD_AT, HOURS_AT, LAKE_AT, LAKE_FROM, LOOP_S, PYTHON_AT, SUITCASE_AT, TAG_FROM, TEN_AT, TENFOOT_AT, THEN_AT, THREEFOOT_AT, WHO_AT,
  WHOLE_AT, YOU_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (labels and captions), and the sound effects under the voice. */

/** Where the words go on screen (px, centres and alphabetic baselines; sizes in px), all between y 270 and 1240. */
export const TEXT = {
  lake: { x: 540, y: 470, size: 112 },
  australia: { x: 540, y: 610, size: 164 },
  year: { x: 540, y: 820, size: 250 },
  clock: { x: 250, y: 440, r: 66 },
  pythonLen: { x: 160, size: 92 },
  crocLen: { size: 92 },
  /** The sky arc's baseline. */
  sky: { y: 520 },
  days: { x: 250, y: 800, size: 320 },
  daysWord: { x: 250, y: 925, size: 120 },
  question: { x: 560, y: 850, size: 400 },
  suitcase: { x: 820, y: 900, w: 340 },
} as const;

// ---------------------------------------------------------------- labels

/** "Lake Moondarra" and "Australia" over the dawn lake, from "Australia" to the python's entry. */
export const placeLabel = (t: number): number => window01(wrap(t), AUSTRALIA_AT - 0.1, LAKE_FROM + 0.1, 0.22);
export const yearLabel = (t: number): number => window01(wrap(t), FOURTEEN_AT - 0.05, LAKE_FROM + 0.1, 0.22);
/** The bar along the python and its "10 ft / 3 m", from "ten-foot" until the grab. */
export const pythonBar = (t: number): number => window01(wrap(t), TENFOOT_AT - 0.15, GRABBED_AT + 0.12, 0.2);
/** The bar along the croc and its "3 ft / 1 m", from "three-foot" to the cut to the fight's close-up. */
export const crocBar = (t: number): number => window01(wrap(t), THREEFOOT_AT - 0.12, THREEFOOT_AT + 1.55, 0.22);
/** The clock: from "and fought" to just after "Hours later" begins; it spins from the first coil. */
export const clockShown = (t: number): number => window01(wrap(t), FOUGHT_AT + 0.4, HOURS_AT + 0.95, 0.2);
export const clockTurns = (t: number): number => (clockShown(t) > 0 ? 7 * Math.max(0, wrap(t) - (FOUGHT_AT + 0.3)) / (HOURS_AT + 0.95 - FOUGHT_AT - 0.3) : 0);
/** The sky arc, from "Hours" to the belly cut, and the sun's place on it (0 left horizon .. 1 right horizon). */
export const skyShown = (t: number): number => window01(wrap(t), HOURS_AT + 0.7, BELLY_FROM + 0.02, 0.2);
export const sunPhase = (t: number): number => 0.3 + 0.62 * Math.min(1, Math.max(0, (wrap(t) - HOURS_AT) / (BELLY_FROM - HOURS_AT)));
/** The suitcase popping in beside the lump. */
export const suitcaseShown = (t: number): number => window01(wrap(t), SUITCASE_AT - 0.35, DAYS_FROM, 0.3);

/** Days: the counter steps 1 to 10 from "barely" to "ten"; the sun and moon go round meanwhile. */
const DAYS_FROM_S = THEN_AT + 0.25;
const DAYS_TO_S = TEN_AT + 0.1;
export const dayNumber = (t: number): number => {
  const u = wrap(t);
  if (u < DAYS_FROM_S) return 0;
  return Math.min(10, 1 + Math.floor(((u - DAYS_FROM_S) / (DAYS_TO_S - DAYS_FROM_S)) * 10));
};
export const daysShown = (t: number): number => window01(wrap(t), DAYS_FROM_S - 0.1, FACE_FROM + 0.05, 0.2);
export const daySkyShown = (t: number): number => window01(wrap(t), THEN_AT + 0.05, FACE_FROM + 0.05, 0.2);
/** Where the sun or moon is on the sky arc and whether it is the moon (0 sun .. 1 moon), ten rounds in the ten days. */
export function daySky(t: number): { phase: number; night: number } {
  const u = wrap(t);
  const turns = Math.min(10, Math.max(0, ((u - DAYS_FROM_S) / (DAYS_TO_S - DAYS_FROM_S)) * 10));
  const within = (turns * 2) % 2;
  // First half of each day the sun crosses, second half the moon.
  const phase = within % 1;
  return { phase: 0.05 + 0.9 * phase, night: within >= 1 ? 1 : 0 };
}
export const questionShown = (t: number): number => window01(wrap(t), YOU_AT - 0.3, BACK_FROM + 0.02, 0.25);

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words and 18 letters, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,!?…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
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
  const u = wrap(t);
  const line = LINES.find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (u >= w.start / TEMPO) word = i;
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

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t: wrap(t), pitch, gain, pan });

const every = (id: SfxId, from: number, to: number, step: number, pitch: number, gain: number, pan = 0): SoundCue[] => {
  const out: SoundCue[] = [];
  for (let t = from; t < to; t += step) out.push(cue(id, t, pitch, gain, pan));
  return out;
};

/** Where the hook's jaw-walk steps fall (so they carry on round the seam). */
const HOOK_STEPS = { start: -0.95, gone: 2.0, step: 0.33 } as const;

/**
 * Quiet under the voice, matching each line's mood. Excited hook: the jaws'
 * wet gulps and a big swallow on "CROCODILE!". Calm: soft plops of the lake.
 * Curious: a slither in, the strike on "grabbed". Nervous: low growls, the
 * squeeze of the coils, ticks of the clock. Surprised: the gape, the swallow
 * on "HEAD first!". Chuckles: a low comic burp and a squeak for the suitcase.
 * Soft: quiet ticks for the days. Mischievous: a growl and a bright "ding" for
 * the "?". Then the lead-in: the strike and the first gulp.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook.
  ...every('gulp', HOOK_STEPS.start + HOOK_STEPS.step, HOOK_STEPS.gone - 0.1, HOOK_STEPS.step, 0.8, 0.22),
  cue('swallow', WHOLE_AT - 0.05, 0.85, 0.42),
  cue('gulp', WHOLE_AT + 0.35, 0.6, 0.3),
  // Calm lake.
  cue('plop', TAG_FROM + 0.3, 1.3, 0.12, 0.3),
  cue('plop', AUSTRALIA_AT + 0.9, 1.5, 0.1, -0.3),
  cue('appear', FOURTEEN_AT, 1.2, 0.16),
  // The python comes in, the length bars, the strike.
  cue('steps', LAKE_FROM + 0.1, 0.8, 0.2, -0.2),
  cue('steps', LAKE_FROM + 0.8, 0.85, 0.18, -0.2),
  cue('appear', TENFOOT_AT, 1.3, 0.2),
  cue('steps', PYTHON_AT + 0.2, 0.9, 0.16, -0.1),
  cue('strike', GRABBED_AT - 0.1, 1.0, 0.5),
  cue('nip', GRABBED_AT + 0.05, 0.8, 0.3),
  cue('appear', THREEFOOT_AT, 1.1, 0.2),
  cue('hurt', LAKE_AT - 0.2, 0.6, 0.16),
  // Nervous: the fight.
  cue('growl', FOUGHT_AT - 1.1, 0.5, 0.22),
  ...every('squeeze', FOUGHT_AT - 0.9, HOURS_AT - 0.1, 0.55, 1.1, 0.14, 0.1),
  ...every('knot', FOUGHT_AT - 0.6, HOURS_AT - 0.3, 0.7, 0.8, 0.12, -0.1),
  ...every('tick', FOUGHT_AT + 0.45, HOURS_AT + 0.9, 0.17, 1.4, 0.1, 0.2),
  cue('growl', FOUGHT_AT + 0.2, 0.45, 0.2),
  // Surprised: hours later, the gape, the swallow.
  cue('dive', HOURS_AT - 0.02, 0.6, 0.16),
  cue('grown', HOURS_AT + 0.1, 1.0, 0.3),
  cue('appear', DUSK.open + 0.05, 0.7, 0.4),
  cue('swallow', DUSK.bite - 0.05, 0.8, 0.4),
  ...every('gulp', DUSK.bite + DUSK.step, BELLY_FROM - 0.2, DUSK.step, 0.7, 0.2),
  cue('swallow', HEAD_AT - 0.05, 0.7, 0.34),
  // Chuckles: a burp and a squeak.
  cue('gulp', BELLY_AT - 0.05, 0.4, 0.34),
  cue('squeak', BELLY_AT + 0.35, 0.7, 0.14),
  cue('squeak', SUITCASE_AT - 0.1, 1.3, 0.18),
  cue('plop', SUITCASE_AT + 0.05, 0.6, 0.3),
  // Soft: the days go by.
  ...every('tick', DAYS_FROM_S, DAYS_TO_S, (DAYS_TO_S - DAYS_FROM_S) / 10, 1.2, 0.12, 0.2),
  cue('lose', DAYS_AT - 0.1, 0.7, 0.12),
  // Mischievous: face to face.
  cue('growl', WHO_AT + 0.05, 0.55, 0.2),
  cue('appear', YOU_AT - 0.1, 1.2, 0.3),
  cue('tick', YOU_AT + 0.4, 0.9, 0.16),
  // The lead-in: the strike and the first gulp (they carry round the seam into the hook).
  cue('strike', BACK_FROM + 0.02, 1.05, 0.46),
  cue('gulp', LOOP_S - 0.5, 0.75, 0.24),
];

export const DAYS_STEP = (DAYS_TO_S - DAYS_FROM_S) / 10;
export type { Pt };
