import { BOIL } from '../../../src/art/palette';
import { BOIL_FPS } from '../sprites';
import { clamp01, lerp, ramp, window01 } from '../short';
import { TEMPO, WORDS } from './words';

/**
 * "This crab cracks open coconuts": the coconut crab (Birgus latro), the
 * biggest crab on land, which starts life as a hermit crab in a snail shell
 * and outgrows shells altogether. Told by a narrator (words.ts) on a palm
 * beach, every beat timed to the words, a function of time in seconds over a
 * loop of LOOP_S.
 *
 *   0     the coconut crab squeezes a coconut in its claw, cracks already
 *         spreading; on "COCONUTS" it splits with a CRACK
 *   2.5   "coconut crab", "Birgus latro"; a ghost crab runs in for scale on
 *         "biggest crab", "on land"
 *   5.2   "up to four kilos": a scale rises under it, the dial swings to 4 kg;
 *         "legs nearly a metre across": its leg tips ringed, a tape, "≈ 1 m"
 *   8.7   "Its pinch": a squeeze and a crunch; the chart card: its bar tall,
 *         the game's predators' bars low, a crocodile's off the scale on
 *         "almost"
 *   12.1  "Yet it starts life…": rewind; the coconut whole again, and a tiny
 *         hermit crab in a periwinkle ("tiny", "hermit crab", "borrowed snail
 *         shell"), nibbling crumbs
 *   16    "until it grows too big…": it grows into a snail shell, a whelk, a
 *         conch, then too big for any: the conch pops off
 *   18.5  "No shell, no problem": its soft back hardens, plate by plate, into
 *         the coconut crab, which grips the coconut on "because", and the
 *         loop finishes the sentence.
 */
export const LOOP_S = 21;

/** The line boil steps at 8 a second: 168 steps, 56 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS % BOIL;

const HALF = LOOP_S / 2;
/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Time measured from the loop point, negative before it: beats that run across the seam use this. */
export const seam = (t: number): number => (wrap(t) < HALF ? wrap(t) : wrap(t) - LOOP_S);

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const CRAB_AT = said('crab');
export const CRACKS_AT = said('cracks');
export const COCONUTS_AT = said('COCONUTS.');
export const COCONUT_AT = said('coconut');
export const BIGGEST_AT = said('biggest');
export const LAND_AT = said('land:');
export const UP_AT = said('up');
export const FOUR_AT = said('four');
export const KILOS_AT = said('kilos,');
export const LEGS_AT = said('legs');
export const METRE_AT = said('metre');
export const ACROSS_AT = said('across.');
export const ITS_AT = said('Its');
export const PINCH_AT = said('pinch');
export const BEATS_AT = said('beats');
export const BITE_AT = said('bite');
export const ALMOST_AT = said('almost');
export const PREDATOR_AT = said('predator.');
export const YET_AT = said('Yet');
export const STARTS_AT = said('starts');
export const TINY_AT = said('tiny');
export const HERMIT_AT = said('hermit');
export const BORROWED_AT = said('borrowed');
export const SNAIL_AT = said('snail');
export const UNTIL_AT = said('until');
export const GROWS_AT = said('grows');
export const BIG_AT = said('big');
export const ANY_AT = said('any', 2);
export const SHELL_TOO_AT = said('shell', 1);
export const ALL_AT = said('all.');
export const NO_SHELL_AT = said('No');
export const NO_PROBLEM_AT = said('no');
export const BECAUSE_AT = said('because');

// ---------------------------------------------------------------- the coconut crab

/** Where it stands (its ground point), and its size: screen px per unit of the game's drawing. */
export const BIG = { x: 390, ground: 1040, scale: 5.5 } as const;
/** Its claw tip, in the drawing's units from its ground point (where the coconut sits). */
export const CLAW_TIP = { x: 57, y: -18 } as const;
/** How high the scale lifts it. */
export const LIFT_PX = 62;

/** When it squeezes the coconut: from "because", across the loop point, to the split on "COCONUTS". */
const GRIP_FROM = BECAUSE_AT - LOOP_S + 0.05;
const GRIP_TO = COCONUTS_AT + 0.35;
export const gripAt = (t: number): number => window01(seam(t), GRIP_FROM, GRIP_TO, 0.25);

/** It grows out of the naked hermit crab on "no problem" and is there to grip on "because". */
export const MORPH_FROM = NO_PROBLEM_AT + 0.45;
export const MORPH_TO = BECAUSE_AT - 0.08;

/** The scale under it, 0 .. 1 of its height: up on "up to", down again before "Its pinch". */
export const scaleAt = (t: number): number => window01(t, UP_AT - 0.2, ITS_AT, 0.3);

export interface Pose {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly alpha: number;
  readonly rot: number;
}

/** Before this it is the grown crab of the first half; after it, the one the young crab turns into. */
const REBORN = (STARTS_AT + UNTIL_AT) / 2;

export function bigAt(t: number): Pose {
  const w = wrap(t);
  const early = w < REBORN;
  const squeeze = gripAt(t) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 2.4 * seam(t)));
  // A squeeze on "pinch" too.
  const pinch = window01(t, PINCH_AT - 0.1, PINCH_AT + 0.45, 0.12);
  return {
    x: BIG.x,
    y: BIG.ground - LIFT_PX * scaleAt(t),
    scale: BIG.scale * (early ? lerp(1, 0.12, ramp(w, YET_AT - 0.05, YET_AT + 0.35)) : lerp(0.55, 1, ramp(w, MORPH_FROM, MORPH_TO))),
    alpha: early ? 1 - ramp(w, YET_AT, YET_AT + 0.3) : ramp(w, MORPH_FROM, MORPH_FROM + 0.25),
    rot: -0.03 * squeeze - 0.04 * pinch,
  };
}

// ---------------------------------------------------------------- the coconut

export const NUT = { x: 785, ground: BIG.ground, rx: 92, ry: 84 } as const;

/** Its cracks, 0 .. 1: one more at each squeeze, across the loop point (so the first frame already shows some). */
const TAPS = [BECAUSE_AT - LOOP_S + 0.28, CRAB_AT, CRACKS_AT] as const;
export const TAP_TIMES = TAPS.map((u) => wrap(u));
export function crackAt(t: number): number {
  const u = seam(t);
  return TAPS.reduce((s, at) => s + ramp(u, at, at + 0.14) / TAPS.length, 0);
}

/** Split in two on "COCONUTS"; whole again when the story rewinds on "Yet". */
export function splitAt(t: number): number {
  const w = wrap(t);
  return w < HALF ? ramp(w, COCONUTS_AT - 0.03, COCONUTS_AT + 0.28) : 1 - ramp(w, YET_AT + 0.05, YET_AT + 0.5);
}

/** The CRACK burst, 0 .. 1 of its life, from the split. */
export const burstAt = (t: number): number => (wrap(t) - (COCONUTS_AT - 0.05)) / 0.85;

/** A pinch burst at the claw on "pinch". */
export const pinchBurstAt = (t: number): number => (wrap(t) - (PINCH_AT - 0.03)) / 0.7;

// ---------------------------------------------------------------- "biggest", "four kilos", "a metre"

/** A ghost crab runs in from the left for scale on "biggest", and away again. */
export function ghostAt(t: number): { readonly x: number; readonly alpha: number; readonly facing: number } | null {
  if (t < BIGGEST_AT - 0.3 || t > UP_AT + 0.6) return null;
  const inn = ramp(t, BIGGEST_AT - 0.3, BIGGEST_AT + 0.15);
  const out = ramp(t, UP_AT - 0.1, UP_AT + 0.6);
  return { x: lerp(lerp(-90, 70, inn), -110, out), alpha: 1, facing: out > 0 ? -1 : 1 };
}

/** The scale's dial: out from "up to"; its needle at `kg`, swung to 4 on "four" with an overshoot. */
export const dialAt = (t: number): number => window01(t, UP_AT - 0.1, LEGS_AT + 0.1, 0.25);
export function needleAt(t: number): number {
  const u = t - (FOUR_AT - 0.2);
  if (u <= 0) return 0;
  return u < 0.3 ? lerp(0, 4.4, ramp(u, 0, 0.3)) : lerp(4.4, 4, ramp(u, 0.3, 0.55));
}
/** "4 kg" pops on "kilos". */
export const kgPopAt = (t: number): number => (t - (KILOS_AT - 0.05)) / 0.3;

/** Its leg tips ringed on "legs"; the tape drawn across them on "nearly a"; "≈ 1 m" on "metre". */
export const legRingsAt = (t: number): number => window01(t, LEGS_AT - 0.05, ITS_AT - 0.05, 0.15);
export const tapeAt = (t: number): number => ramp(t, LEGS_AT + 0.15, METRE_AT) * (1 - ramp(t, ITS_AT - 0.25, ITS_AT + 0.05));
export const metrePopAt = (t: number): number => (t - (METRE_AT - 0.05)) / 0.3;
export const metreLabel = (t: number): number => window01(t, METRE_AT - 0.05, ITS_AT + 0.05, 0.15);

// ---------------------------------------------------------------- labels

export const nameLabel = (t: number): number => window01(t, COCONUT_AT - 0.05, UP_AT - 0.05, 0.2);
export const biggestLabel = (t: number): number => window01(t, BIGGEST_AT - 0.05, UP_AT - 0.05, 0.2);
export const onLandLabel = (t: number): number => window01(t, LAND_AT - 0.1, UP_AT - 0.05, 0.2);

// ---------------------------------------------------------------- the pinch chart

/** The card: in on "pinch", away before "Yet". */
export const cardAt = (t: number): number => window01(t, PINCH_AT - 0.1, YET_AT + 0.05, 0.3);
export type BarId = 'fox' | 'raccoon' | 'monitor' | 'crab' | 'croc';
export const BARS: readonly BarId[] = ['fox', 'raccoon', 'monitor', 'crab', 'croc'];
/** Each bar's height as a share of the chart (the crocodile's runs off the top), and when it rises. */
export const BAR_TOP: Readonly<Record<BarId, number>> = { fox: 0.17, raccoon: 0.13, monitor: 0.21, crab: 0.78, croc: 1.12 };
const BAR_FROM: Readonly<Record<BarId, number>> = {
  crab: BEATS_AT - 0.1, fox: BITE_AT - 0.1, raccoon: BITE_AT, monitor: BITE_AT + 0.1, croc: ALMOST_AT - 0.05,
};
export const barAt = (id: BarId, t: number): number =>
  BAR_TOP[id] * ramp(t, BAR_FROM[id], BAR_FROM[id] + (id === 'croc' ? 0.45 : 0.3)) * (1 - ramp(t, YET_AT + 0.1, YET_AT + 0.2));
/** The note by the crocodile's bar on "almost", and the predators' row named on "land predator". */
export const almostLabel = (t: number): number => ramp(t, ALMOST_AT + 0.1, ALMOST_AT + 0.35);
export const predatorsLabel = (t: number): number => ramp(t, said('land') - 0.05, said('land') + 0.2);
/** A ring round the crab's bar as "predator" lands: it beats them all. */
export const crabRingAt = (t: number): number => (t - (PREDATOR_AT - 0.05)) / 0.9;

// ---------------------------------------------------------------- rewind: the hermit crab

/** The rewind marks, on "Yet it starts life". */
export const rewindAt = (t: number): number => window01(t, YET_AT - 0.05, said('life') + 0.25, 0.15);

/** Where the young crab stands. */
export const HERMIT = { x: 452, ground: BIG.ground } as const;
export type ShellStep = 'periwinkle' | 'snail' | 'whelk' | 'conch';
/** Its shells, each moved into as it grows: a periwinkle at first, then one bigger shell on each beat. */
export const SHELLS: readonly { readonly kind: ShellStep; readonly at: number; readonly size: number }[] = [
  { kind: 'periwinkle', at: STARTS_AT, size: 0.62 },
  { kind: 'snail', at: GROWS_AT, size: 0.92 },
  { kind: 'whelk', at: BIG_AT, size: 1.25 },
  { kind: 'conch', at: ANY_AT, size: 1.62 },
];
/** Too big for the conch on "any shell", and out of it on "at all". */
export const OUTGROW_AT = SHELL_TOO_AT;
export const POP_AT = ALL_AT - 0.04;
const NAKED_SIZE = 2.15;

/** How big the young crab is (its sprites' scale), growing a step before each new shell lands. */
export function hermitSizeAt(t: number): number {
  let s = SHELLS[0]!.size;
  for (let i = 1; i < SHELLS.length; i++) s += (SHELLS[i]!.size - SHELLS[i - 1]!.size) * ramp(t, SHELLS[i]!.at - 0.3, SHELLS[i]!.at - 0.05);
  return s + (NAKED_SIZE - SHELLS[SHELLS.length - 1]!.size) * ramp(t, OUTGROW_AT - 0.05, POP_AT);
}
/** It is on screen from "starts life" until it has turned into the coconut crab. */
export const hermitAlphaAt = (t: number): number => window01(t, STARTS_AT - 0.1, MORPH_FROM + 0.3, 0.25);

/** A shell's state: dropping in from above (`drop` 1 → 0 as it lands), then pushed out behind (`out` 0 → 1). */
export interface ShellState {
  readonly drop: number;
  readonly out: number;
}
export function shellAt(i: number, t: number): ShellState | null {
  const step = SHELLS[i]!;
  const next = SHELLS[i + 1];
  const landed = i === 0 ? ramp(t, step.at - 0.15, step.at + 0.15) : ramp(t, step.at - 0.3, step.at);
  const leave = next ? next.at - 0.05 : POP_AT;
  const out = ramp(t, leave, leave + (next ? 0.45 : 0.65));
  if (t < step.at - 0.32 || out >= 1 || t > MORPH_TO) return null;
  return { drop: 1 - landed, out };
}
/** The conch straining as the crab outgrows it. */
export const strainAt = (t: number): number => window01(t, OUTGROW_AT, POP_AT + 0.05, 0.1);
/** Out of shells for good: the soft crab from "at all". */
export const nakedAt = (t: number): number => window01(t, POP_AT - 0.05, LOOP_S - 0.2, 0.1);
/** Its back hardening into plates on "no problem". */
export const armourAt = (t: number): number => ramp(t, NO_PROBLEM_AT - 0.1, MORPH_FROM + 0.1);

/** Crumbs it eats as it grows: one on "snail shell" (in the magnifier), one on "until". */
export const CRUMBS: readonly { readonly dx: number; readonly eaten: number }[] = [
  { dx: 66, eaten: said('shell…') + 0.05 },
  { dx: 90, eaten: UNTIL_AT + 0.05 },
];
/** A crumb, 1 whole .. 0 eaten (null when gone or not out yet). */
export function crumbAt(i: number, t: number): number | null {
  const c = CRUMBS[i]!;
  if (t < STARTS_AT - 0.1 || t > c.eaten + 0.25) return null;
  return clamp01(ramp(t, STARTS_AT - 0.1, STARTS_AT + 0.2) * (1 - ramp(t, c.eaten - 0.05, c.eaten + 0.2)));
}

export const tinyRingAt = (t: number): number => window01(t, TINY_AT - 0.05, BORROWED_AT, 0.15);
/** The magnifier over the tiny crab: open from "tiny" until it starts to grow. */
export const LENS = { x: 540, y: 560, r: 235, zoom: 3 } as const;
export const lensAt = (t: number): number => window01(t, TINY_AT - 0.1, UNTIL_AT + 0.1, 0.3);
export const hermitLabel = (t: number): number => window01(t, HERMIT_AT - 0.05, UNTIL_AT - 0.1, 0.2);
export const borrowedLabel = (t: number): number => window01(t, BORROWED_AT - 0.05, UNTIL_AT - 0.1, 0.2);
export const tooBigLabel = (t: number): number => window01(t, OUTGROW_AT - 0.05, NO_SHELL_AT + 0.1, 0.2);
export const noShellLabel = (t: number): number => window01(t, NO_SHELL_AT - 0.05, MORPH_FROM + 0.2, 0.2);
export const armourLabel = (t: number): number => window01(t, NO_PROBLEM_AT, LOOP_S - 0.7, 0.2);
/** A puff of ink as the soft crab becomes the coconut crab. */
export const morphPuffAt = (t: number): number => (wrap(t) - MORPH_FROM) / 0.7;
