import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import { TEMPO, TRIM, WORDS, type Word } from './words';

/**
 * "Evolution keeps making crabs": carcinization, the crab body plan evolved
 * at least five separate times in decapods (Wolfe et al. 2021); king crabs
 * probably began as hermit crabs (Tsang et al. 2011); the word is
 * Borradaile's (1916). Told by a narrator (words.ts) on a page of the
 * game's field notebook, every beat timed to the words, a function of time
 * in seconds over a loop of LOOP_S.
 *
 *   0     the hook as the page's heading, under it a march of progress in
 *         two rows: shrimp-like, lobster-like, squat lobster, crab; on
 *         "CRABS" every one of them tucks its tail under and is a crab
 *   2.7   "A crab-shaped body": callouts on one, "wide, flat shell" and
 *         "tail tucked under"
 *   3.6   "evolved at least five separate times": five lanes, an ancestor
 *         and an arrow to the same animal, each folding into a crab with a
 *         tally stroke, the fifth (a slash) and "×5" on "five"; the
 *         ancestors are named on "animals that started out as…"
 *   8.0   "King crabs": the payoff, a big spiny king crab; "probably began
 *         as" sends it right and a dashed arrow back to "hermit crabs", the
 *         game's hermit crab in its shell; "swapped the borrowed shell": it
 *         steps out and leaves it; "for armour of their own": it becomes the
 *         king crab in a burst of ink
 *   13.0  "It happened so often": the game's crabs stamp in all round;
 *         "scientists gave it a name:", a blank; "carcinization" written
 *         into it with how to say it
 *   17.2  "Face it:": the page clears to the heading and the march row, and
 *         the loop finishes the sentence.
 */
export const LOOP_S = 18;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** A time in the original take, in the trimmed and sped-up voice.mp3. */
export const voiceTime = (take: number): number => (take - TRIM) / TEMPO;

/** When a word of the voiceover begins, in voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return voiceTime(w.start);
}

export const KEEPS_AT = said('keeps');
export const CRABS_AT = said('CRABS.');
export const SHAPED_AT = said('crab-shaped');
export const EVOLVED_AT = said('evolved');
export const LEAST_AT = said('least');
export const FIVE_AT = said('five');
export const ANIMALS_AT = said('animals');
export const SOMETHING_AT = said('something');
export const KING_AT = said('King');
export const PROBABLY_AT = said('probably');
export const BEGAN_AT = said('began');
export const HERMIT_AT = said('hermit');
export const SWAPPED_AT = said('swapped');
export const BORROWED_AT = said('borrowed');
export const SHELL_AT = said('shell');
export const ARMOUR_AT = said('armour');
export const OWN_AT = said('own.');
export const IT_AT = said('It');
export const OFTEN_AT = said('often,');
export const SCIENTISTS_AT = said('scientists');
export const NAME_AT = said('name:');
export const CARCIN_AT = said('carcinization.');
export const CARCIN_END = voiceTime(WORDS.find((w) => w.text === 'carcinization.')!.end);
export const FACE_AT = said('Face');

/** The page comes back to the opening (heading and march row) from here. */
export const RETURN_FROM = FACE_AT - 0.2;

/** A bouncy 0 .. 1 (overshoots a little, then settles): a stamp landing. */
export function popAt(t: number, at: number, s = 0.32): number {
  const u = clamp01((t - at) / s);
  if (u <= 0) return 0;
  const c = 1.9;
  return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
}

// ---------------------------------------------------------------- the opening: heading and march row

/** The heading, fully shown at the loop point: gone as the lanes come, written again from "Face it". */
export function headingAt(t: number): { readonly alpha: number; readonly reveal: number } {
  if (t < LOOP_S / 2) return { alpha: 1 - ramp(t, SHAPED_AT + 0.45, SHAPED_AT + 0.8), reveal: 1 };
  return { alpha: ramp(t, RETURN_FROM, RETURN_FROM + 0.25), reveal: ramp(t, RETURN_FROM + 0.05, LOOP_S - 0.25) };
}

/** Each figure's place in the march, from the most shrimp-like (0) to the crab (1). */
export const MARCH_M = [0, 0.3, 0.62, 1] as const;
/**
 * Where each stands (its ground point), in a 2×2 grid read like a page:
 * shrimp-like → lobster-like, then squat lobster → crab. Set right of each
 * column's middle, since a long tail reaches further back than the claws do.
 */
export const MARCH_AT: readonly { readonly x: number; readonly y: number }[] = [
  { x: 330, y: 740 },
  { x: 850, y: 740 },
  { x: 330, y: 1010 },
  { x: 850, y: 1010 },
];
export const MARCH_SCALE = 2.9;
export const MARCH_NAMES = ['shrimp-like', 'lobster-like', 'squat lobster', 'crab'] as const;

/** How far each figure has folded into a crab: one after another on "CRABS", undone off screen. */
export const foldAt = (i: number, t: number): number =>
  t < LOOP_S / 2 ? ramp(t, CRABS_AT - 0.08 + 0.12 * i, CRABS_AT + 0.32 + 0.12 * i) : 0;

/** The row: there from the first frame, away as the lanes come, back for the loop point. */
export const marchAt = (t: number): number => (t < LOOP_S / 2 ? 1 - ramp(t, SHAPED_AT + 0.45, SHAPED_AT + 0.8) : ramp(t, RETURN_FROM, RETURN_FROM + 0.4));

export interface Figure {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  /** 0 long-tailed .. 1 a crab. */
  readonly m: number;
  readonly alpha: number;
}

/** A march figure, walking on the spot (three sways and nine steps a loop, so it comes round). */
export function marchFigure(i: number, t: number): Figure {
  const phase = (2 * Math.PI * t) / LOOP_S;
  return {
    x: MARCH_AT[i]!.x + 9 * Math.sin(3 * phase + i * 1.3),
    y: MARCH_AT[i]!.y - 3 * Math.max(0, Math.sin(18 * phase + i)),
    scale: MARCH_SCALE,
    m: lerp(MARCH_M[i]!, 1, foldAt(i, t)),
    alpha: marchAt(t),
  };
}

/** Each figure's name, crossing to "crab!" as it folds. */
export const nameSwapAt = (i: number, t: number): number => (i === 3 ? 0 : smooth((foldAt(i, t) - 0.3) / 0.6));

/** "A crab-shaped body": what makes the shape, called out on the lobster-like one. */
export const shapeCalloutAt = (t: number): number => window01(t, SHAPED_AT - 0.05, SHAPED_AT + 0.75, 0.15);

// ---------------------------------------------------------------- five lanes, five times

export const LANES_FROM = EVOLVED_AT - 0.45;
export const LANES_TO = KING_AT - 0.3;
export const lanesAt = (t: number): number => window01(t, LANES_FROM, LANES_TO, 0.3);

export interface Lane {
  readonly y: number;
  /** Where the ancestor starts, 0 .. 1 (0 for the hermit crab: the game's own is drawn there). */
  readonly m0: number;
  readonly wash: string;
  readonly claw: number;
  readonly ancestor: string;
  readonly result: string;
}
/** Hairy stone crab is Lomis hirta; the fifth lane goes unnamed (sources differ on which it is). */
export const LANES: readonly Lane[] = [
  { y: 480, m0: 0, wash: '#c0653a', claw: 1, ancestor: 'lobster-like', result: 'true crabs' },
  { y: 605, m0: 0.3, wash: '#c99a62', claw: 0.85, ancestor: 'squat lobster', result: 'porcelain crabs' },
  { y: 730, m0: 0.12, wash: '#d27a3a', claw: 0.7, ancestor: 'hermit crab', result: 'king crabs' },
  { y: 855, m0: 0.08, wash: '#9c7f6a', claw: 0.6, ancestor: '?', result: 'hairy stone crab' },
  { y: 980, m0: 0.04, wash: '#7f8f6a', claw: 0.55, ancestor: '?', result: '…' },
];
export const HERMIT_LANE = 2;
export const LANE_ANCESTOR_X = 205;
export const LANE_RESULT_X = 640;
export const LANE_SCALE = 1.65;

/** One fold per lane, from "evolved" to "five", evenly. */
export const FOLDS: readonly number[] = LANES.map((_, k) => lerp(EVOLVED_AT, FIVE_AT, k / (LANES.length - 1)));
export const laneFoldAt = (k: number, t: number): number => ramp(t, FOLDS[k]! - 0.1, FOLDS[k]! + 0.25);

/** A lane's two animals, stepping on the spot; the one on the right folds into a crab. */
export function laneFigure(k: number, side: 'ancestor' | 'result', t: number): Figure {
  const lane = LANES[k]!;
  const phase = (2 * Math.PI * t) / LOOP_S;
  const right = side === 'result';
  return {
    x: (right ? LANE_RESULT_X : LANE_ANCESTOR_X) + 6 * Math.sin(6 * phase + k * 1.7 + (right ? 1 : 0)),
    y: lane.y,
    scale: LANE_SCALE,
    m: right ? lerp(lane.m0, 1, laneFoldAt(k, t)) : lane.m0,
    alpha: lanesAt(t),
  };
}

/** A tally stroke as each lane folds (the fifth is the slash), 0 .. 1 of it drawn. */
export const tallyAt = (k: number, t: number): number => ramp(t, FOLDS[k]! - 0.05, FOLDS[k]! + 0.12) * lanesAt(t);
export const leastAt = (t: number): number => ramp(t, LEAST_AT - 0.08, LEAST_AT + 0.12) * lanesAt(t);
/** "×5", stamped on "five". */
export const fiveAt = (t: number): number => popAt(t, FIVE_AT - 0.04) * lanesAt(t);
export const resultLabelAt = (k: number, t: number): number => ramp(t, FOLDS[k]! + 0.05, FOLDS[k]! + 0.25) * lanesAt(t);
/** The ancestors named as "animals that started out as something else" is said. */
export const ancestorLabelAt = (k: number, t: number): number => ramp(t, ANIMALS_AT - 0.1 + 0.15 * k, ANIMALS_AT + 0.1 + 0.15 * k) * lanesAt(t);

// ---------------------------------------------------------------- king crabs

export const GROUND_Y = 930;

/** The king crab: big and central on "King crabs", off to the right while its ancestor is shown, then where the hermit stood. */
const KING_X: readonly Key[] = [
  { t: PROBABLY_AT + 0.05, at: 540, rate: 0 },
  { t: BEGAN_AT + 0.2, at: 790, rate: 0 },
  { t: ARMOUR_AT - 0.2, at: 790, rate: 0 },
  { t: ARMOUR_AT + 0.25, at: 560, rate: 0 },
  { t: IT_AT + 0.05, at: 560, rate: 0 },
  { t: IT_AT + 0.5, at: 540, rate: 0 },
];
const KING_Y: readonly Key[] = [
  { t: IT_AT + 0.05, at: GROUND_Y, rate: 0 },
  { t: IT_AT + 0.5, at: 800, rate: 0 },
];
const KING_SCALE: readonly Key[] = [
  { t: PROBABLY_AT + 0.05, at: 3.9, rate: 0 },
  { t: BEGAN_AT + 0.2, at: 2.45, rate: 0 },
  { t: ARMOUR_AT - 0.2, at: 2.45, rate: 0 },
  { t: ARMOUR_AT + 0.25, at: 3.1, rate: 0 },
  { t: IT_AT + 0.05, at: 3.1, rate: 0 },
  { t: IT_AT + 0.5, at: 2.2, rate: 0 },
];

export function kingAt(t: number): Figure {
  const pop = popAt(t, KING_AT - 0.14, 0.45);
  const merge = 1 + 0.12 * window01(t, ARMOUR_AT - 0.05, ARMOUR_AT + 0.45, 0.2);
  return {
    x: curveAt(KING_X, t).at,
    y: curveAt(KING_Y, t).at,
    scale: curveAt(KING_SCALE, t).at * lerp(0.55, 1, pop) * merge,
    m: 1,
    alpha: clamp01(pop * 1.6) * (1 - ramp(t, SCIENTISTS_AT - 0.1, SCIENTISTS_AT + 0.2)),
  };
}

/** "KING CRAB" across the page as it lands, then a small name over it on the right. */
export const kingTitleAt = (t: number): number => window01(t, KING_AT - 0.08, BEGAN_AT + 0.05, 0.15);
export const kingNameAt = (t: number): number => window01(t, BEGAN_AT + 0.05, ARMOUR_AT - 0.15, 0.15);
/** "probably…?" and the dashed arrow from the hermit crab to the king crab. */
export const probablyAt = (t: number): number => window01(t, PROBABLY_AT - 0.06, SWAPPED_AT - 0.1, 0.15);
export const arrowAt = (t: number): number => ramp(t, BEGAN_AT, HERMIT_AT + 0.2) * (1 - ramp(t, SWAPPED_AT - 0.25, SWAPPED_AT));
export const armourLabelAt = (t: number): number => window01(t, ARMOUR_AT - 0.05, IT_AT + 0.15, 0.15);

/** The game's hermit crab: in its shell on "hermit crabs", out of it on "swapped", gone into the king crab on "armour". */
export const HERMIT = { x: 290, scale: 2.05, walk: 205 } as const;
export function hermitAt(t: number): { readonly shell: number; readonly crab: number; readonly dx: number } {
  const there = popAt(t, HERMIT_AT - 0.1, 0.3);
  return {
    shell: there * (1 - ramp(t, IT_AT, IT_AT + 0.35)),
    crab: Math.min(1, there) * (1 - ramp(t, ARMOUR_AT - 0.12, ARMOUR_AT + 0.22)),
    dx: HERMIT.walk * ramp(t, SWAPPED_AT - 0.05, SHELL_AT + 0.15),
  };
}
export const hermitNameAt = (t: number): number => window01(t, HERMIT_AT - 0.05, SWAPPED_AT + 0.15, 0.15);
export const shellLabelAt = (t: number): number => window01(t, BORROWED_AT - 0.08, IT_AT + 0.2, 0.15);
/** The burst of ink as the hermit becomes a king crab, 0 .. 1 out (<0, >1: none). */
export const burstAt = (t: number): number => (t - (ARMOUR_AT - 0.08)) / 0.55;

// ---------------------------------------------------------------- so often: the game's crabs

export interface Stamp {
  readonly species: 'porcelaincrab' | 'shorecrab' | 'kelpcrab' | 'coconutcrab' | 'snowcrab' | 'bluecrab' | 'stonecrab' | 'dungeness';
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly facing: 1 | -1;
}
export const STAMPS: readonly Stamp[] = [
  { species: 'porcelaincrab', x: 160, y: 505, scale: 2.29, facing: 1 },
  { species: 'shorecrab', x: 410, y: 480, scale: 2.2, facing: -1 },
  { species: 'kelpcrab', x: 670, y: 505, scale: 2.29, facing: 1 },
  { species: 'coconutcrab', x: 915, y: 500, scale: 1.63, facing: -1 },
  { species: 'snowcrab', x: 165, y: 1085, scale: 1.76, facing: 1 },
  { species: 'bluecrab', x: 410, y: 1075, scale: 1.8, facing: -1 },
  { species: 'stonecrab', x: 665, y: 1085, scale: 2.07, facing: 1 },
  { species: 'dungeness', x: 915, y: 1080, scale: 2.02, facing: -1 },
];
export const STAMP_TIMES: readonly number[] = STAMPS.map((_, i) => lerp(IT_AT - 0.05, OFTEN_AT, i / (STAMPS.length - 1)));
export const stampAt = (i: number, t: number): number => popAt(t, STAMP_TIMES[i]!, 0.28) * (1 - ramp(t, RETURN_FROM - 0.25, RETURN_FROM + 0.15));

// ---------------------------------------------------------------- the name

export const nameAt = (t: number): number => window01(t, SCIENTISTS_AT - 0.05, RETURN_FROM + 0.1, 0.25);
/** How much of "carcinization" is written. */
export const writeAt = (t: number): number => ramp(t, CARCIN_AT - 0.06, CARCIN_END - 0.1) * nameAt(t);
export const sayItAt = (t: number): number => ramp(t, CARCIN_AT + 0.3, CARCIN_AT + 0.55) * nameAt(t);
export const meaningAt = (t: number): number => ramp(t, CARCIN_END - 0.15, CARCIN_END + 0.1) * nameAt(t);

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
    const full = !last || last.length >= 4 || /[.,:…!]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    // The first line is up from the first frame: the hook is on screen before its first word lands.
    from: i === 0 ? 0 : voiceTime(g[0]!.start),
    to: i + 1 < groups.length ? voiceTime(groups[i + 1]![0]!.start) : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  // The loop opens on the hook's first word, a moment before the voice reaches it.
  let word = line === LINES[0] ? 0 : -1;
  line.words.forEach((w, i) => {
    if (t >= voiceTime(w.start)) word = i;
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

/**
 * Quiet under the voice, playful but not silly: the game's growing
 * arpeggio for each animal turning crab, pencil toks for the tally strokes
 * and a bright sparkle on "five", the squeak out of the shell and the
 * move-in chime when it swaps, a knock for each crab stamped on the page,
 * and a small fanfare for the name.
 */
export const SOUNDS: readonly SoundCue[] = [
  ...[0, 1, 2].map((i): SoundCue => ({ id: 'grow', t: CRABS_AT - 0.05 + 0.12 * i, pitch: 1.1 + 0.15 * i, gain: 0.16, pan: -0.5 + 0.4 * i })),
  { id: 'click', t: SHAPED_AT, pitch: 1.2, gain: 0.25, pan: -0.2 },
  ...FOLDS.slice(0, 4).map((at, k): SoundCue => ({ id: 'tok', t: at - 0.02, pitch: 0.9 + 0.1 * k, gain: 0.3, pan: 0.3 })),
  { id: 'find', t: FIVE_AT - 0.02, pitch: 1, gain: 0.32, pan: 0.2 },
  ...LANES.map((_, k): SoundCue => ({ id: 'click', t: ANIMALS_AT + 0.15 * k - 0.05, pitch: 1 + 0.1 * k, gain: 0.12, pan: -0.4 })),
  { id: 'grow', t: KING_AT - 0.1, pitch: 0.75, gain: 0.3, pan: 0 },
  { id: 'place', t: KING_AT + 0.15, pitch: 0.8, gain: 0.35, pan: 0 },
  { id: 'click', t: PROBABLY_AT, pitch: 0.9, gain: 0.2, pan: 0 },
  { id: 'hide', t: HERMIT_AT - 0.05, pitch: 1, gain: 0.3, pan: -0.4 },
  { id: 'out', t: SWAPPED_AT, pitch: 1, gain: 0.35, pan: -0.3 },
  { id: 'movein', t: SHELL_AT - 0.1, pitch: 1, gain: 0.25, pan: -0.2 },
  { id: 'grow', t: ARMOUR_AT - 0.08, pitch: 0.9, gain: 0.3, pan: 0.1 },
  ...STAMP_TIMES.map((at, i): SoundCue => ({ id: i % 2 ? 'knock' : 'tok', t: at, pitch: 0.85 + 0.06 * i, gain: 0.18, pan: STAMPS[i]!.x / 540 - 1 })),
  { id: 'click', t: SCIENTISTS_AT, pitch: 1.1, gain: 0.2, pan: 0 },
  { id: 'win', t: CARCIN_AT, pitch: 1, gain: 0.16, pan: 0 },
  { id: 'jump', t: FACE_AT - 0.1, pitch: 0.8, gain: 0.18, pan: 0 },
];
