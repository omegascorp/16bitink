import type { SfxId } from '../../../src/audio/recipes';
import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "In this family, dads get pregnant": pipefish and seahorses (family
 * Syngnathidae) are the only animals with true male pregnancy. The female
 * puts her eggs into the male's brood pouch; he gives them oxygen while they
 * grow, and weeks later he gives birth to a cloud of tiny, fully formed young.
 * Told by a narrator (words.ts) over one pipefish dad in the seagrass, every
 * beat timed to the words, a function of time in seconds over a loop of LOOP_S.
 *
 *   0     the dad, pouch still swollen, giving birth in little bursts: "♂ DAD",
 *         "pregnant" pointing at his pouch
 *   2.5   "Pipefish and seahorses": he is labelled, a pregnant seahorse
 *         drifts in; "the only…": ♂ pulses over both
 *   6.3   "The female lays her eggs in a pouch on his belly": she rolls belly
 *         to belly under him and her eggs fly up into his pouch
 *   9     "He gives them oxygen while they grow": a lens on the pouch, O₂
 *         bubbles into the eggs, the embryos growing; "weeks later": a
 *         calendar flips through the weeks as the pouch swells
 *   12.3  "…gives birth to a cloud of tiny fish!": the payoff, the pouch
 *         bursts and dozens of babies scatter; some snap up plankton
 *   14.4  "So happy Father's Day, because": a card, and the births go on in
 *         little bursts round the loop point.
 */
export const LOOP_S = 16.5;

/** The line boil steps at the game's 8 a second: 132 steps, 44 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const DADS_AT = said('DADS');
export const PREGNANT_AT = said('pregnant.');
export const PIPEFISH_AT = said('Pipefish');
export const SEAHORSES_AT = said('seahorses');
export const ONLY_AT = said('only');
export const MALES_AT = said('males');
export const PREGNANT2_AT = said('pregnant.', 2);
export const FEMALE_AT = said('female');
export const LAYS_AT = said('lays');
export const EGGS_AT = said('eggs');
export const POUCH_AT = said('pouch');
export const BELLY_AT = said('belly.');
export const OXYGEN_AT = said('oxygen');
export const GROW_AT = said('grow…');
export const WEEKS_AT = said('weeks');
export const LATER_AT = said('later,');
export const BIRTH_AT = said('birth');
export const CLOUD_AT = said('cloud');
export const SO_AT = said('So');
export const HAPPY_AT = said('happy');
export const BECAUSE_AT = said('because');

/** A value keyed through the loop that comes round smoothly: keys in [0, LOOP_S), the last running on into the first. */
export function looped(keys: readonly Key[]): (t: number) => number {
  const ext = [...keys.slice(-2).map((k) => ({ ...k, t: k.t - LOOP_S })), ...keys, ...keys.slice(0, 2).map((k) => ({ ...k, t: k.t + LOOP_S }))];
  return (t: number) => curveAt(ext, wrap(t)).at;
}

/** A blip over [at, at + len] that wraps round the loop point: 0 → 1 → 0. */
export function pulse(t: number, at: number, len: number): number {
  const u = wrap(t - at) / len;
  return u < 1 ? Math.sin(Math.PI * u) : 0;
}

// ---------------------------------------------------------------- the fish

/** A fish on screen. `face` -1 (left) .. 1 (right), `up` 1 upright .. -1 belly up (both pass through 0 as it turns). */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly face: number;
  readonly up: number;
  /** Nose up, radians. */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
}

/** The births: each burst of babies out of the pouch (its time and how many). The cloud is the payoff. */
export interface Burst {
  readonly at: number;
  readonly n: number;
}
export const BURSTS: readonly Burst[] = [
  { at: BIRTH_AT + 0.05, n: 3 },
  { at: CLOUD_AT, n: 40 },
  { at: 14.05, n: 3 },
  { at: 15.2, n: 3 },
  { at: 16.3, n: 5 },
  { at: 1.1, n: 3 },
  { at: 1.95, n: 3 },
];
export const CLOUD = BURSTS[1]!;

/** How hard the pouch squeezes, 0 .. 1: a contraction with each burst. */
export const squeezeAt = (t: number): number => Math.max(...BURSTS.map((b) => pulse(t, b.at - 0.12, 0.4) * (b.n > 10 ? 1 : 0.55)));

/** The dad: long and level across the middle, snout to the left. */
export const DAD = { x: 560, y: 740, len: 800 } as const;

export function dadAt(t: number): Fish {
  const w = (2 * Math.PI * t) / LOOP_S;
  const push = squeezeAt(t);
  return {
    x: DAD.x + 14 * Math.sin(2 * w + 1),
    y: DAD.y + 10 * Math.sin(3 * w),
    len: DAD.len,
    face: -1,
    up: 1,
    tilt: 0.03 * Math.sin(2 * w) + 0.03 * push,
    beat: 18 * w,
    effort: 0.25 + 0.35 * push,
  };
}

/**
 * How full his pouch is, 0 empty .. 1 about to burst: still swollen at the
 * loop's start (the births run on round the loop point), empty by the time
 * the female comes, filled as her eggs go in, swelling for "weeks", emptied
 * by the cloud on "birth", and swelling again before the loop point.
 */
export const pouchAt = looped([
  { t: 0.4, at: 0.56 },
  { t: 2.4, at: 0.2 },
  { t: 4.4, at: 0, rate: 0 },
  { t: EGGS_AT - 0.1, at: 0, rate: 0 },
  { t: BELLY_AT + 0.25, at: 0.42 },
  { t: OXYGEN_AT, at: 0.5 },
  { t: LATER_AT + 0.25, at: 0.94 },
  { t: BIRTH_AT, at: 1, rate: 0 },
  // Emptied by the cloud, a few left; then swelling again with the next brood's young round the loop point.
  { t: CLOUD_AT + 0.5, at: 0.12, rate: 0 },
  { t: 14.5, at: 0.14 },
  { t: 15.6, at: 0.42 },
]);

/** The female: in from the left on "female", belly to belly under him while she lays, then on and away to the right. */
const F_IN = FEMALE_AT - 0.75;
const F_ARRIVE = LAYS_AT - 0.1;
const F_ROLL = [LAYS_AT - 0.4, LAYS_AT + 0.15] as const;
const F_UNROLL = [BELLY_AT + 0.2, BELLY_AT + 0.75] as const;
const F_OUT = [BELLY_AT + 0.35, BELLY_AT + 1.3] as const;
export const FEMALE = { x: 600, y: 895, len: 660 } as const;

export function femaleAt(t: number): Fish | null {
  if (t < F_IN || t > F_OUT[1]) return null;
  const arrive = smooth((t - F_IN) / (F_ARRIVE - F_IN));
  const leave = ramp(t, F_OUT[0], F_OUT[1]) ** 1.6;
  const roll = ramp(t, F_ROLL[0], F_ROLL[1]) - ramp(t, F_UNROLL[0], F_UNROLL[1]);
  const moving = Math.max(1 - arrive, leave > 0 ? 1 : 0);
  return {
    x: lerp(lerp(-420, FEMALE.x, arrive), 1520, leave),
    y: lerp(lerp(1040, FEMALE.y, arrive), 1060, leave) + 6 * Math.sin(t * 2.6),
    len: FEMALE.len,
    face: 1,
    up: Math.cos(Math.PI * roll),
    tilt: 0.12 * (1 - arrive) - 0.08 * leave,
    beat: t * 9,
    effort: 0.3 + 0.5 * moving,
  };
}

/** Her eggs, each flying up from her into his pouch: launched one by one from "eggs" until "belly". */
export const EGG_COUNT = 14;
export const EGG_FLIGHT = 0.38;
const EGG_FROM = EGGS_AT - 0.12;
const EGG_TO = BELLY_AT - 0.05;
export const eggLaunch = (k: number): number => EGG_FROM + ((EGG_TO - EGG_FROM) * k) / (EGG_COUNT - 1);
/** Egg k's flight, 0 .. 1 (null when it isn't flying). */
export function eggFlight(k: number, t: number): number | null {
  const u = (t - eggLaunch(k)) / EGG_FLIGHT;
  return u >= 0 && u < 1 ? u : null;
}

/** A pregnant seahorse: drifting in from the right on "seahorses", gone again after "…get pregnant". */
const S_IN = [SEAHORSES_AT - 0.35, SEAHORSES_AT + 0.45] as const;
const S_OUT = [PREGNANT2_AT + 0.6, PREGNANT2_AT + 1.6] as const;
export const SEAHORSE = { x: 850, y: 455, h: 330 } as const;

export function seahorseAt(t: number): { readonly x: number; readonly y: number; readonly h: number; readonly sway: number } | null {
  if (t < S_IN[0] || t > S_OUT[1]) return null;
  const x = lerp(lerp(1300, SEAHORSE.x, ramp(t, S_IN[0], S_IN[1])), 1330, ramp(t, S_OUT[0], S_OUT[1]));
  return { x, y: SEAHORSE.y + 12 * Math.sin(t * 2.4), h: SEAHORSE.h, sway: Math.sin(t * 3.1) };
}

// ---------------------------------------------------------------- notes

/** Fades in over `fade` s from `from` and out by `to`, either side of the loop point (from > to wraps). */
export function wrapped(t: number, from: number, to: number, fade: number): number {
  if (from < to) return window01(t, from, to, fade);
  return t >= from - fade ? ramp(t, from, from + fade) : 1 - ramp(t, to - fade, to);
}

/** The hook's notes ("♂ DAD", "pregnant"): from "because", round the loop point, until "Pipefish". */
export const hookLabel = (t: number): number => wrapped(t, BECAUSE_AT - 0.1, PIPEFISH_AT + 0.1, 0.22);
/** His name on "Pipefish", the seahorse's on "seahorses", and "the only ones" on "only". */
export const pipefishLabel = (t: number): number => window01(t, PIPEFISH_AT - 0.05, FEMALE_AT - 0.1, 0.22);
export const seahorseLabel = (t: number): number => window01(t, SEAHORSES_AT - 0.05, S_OUT[0] + 0.2, 0.22);
export const onlyLabel = (t: number): number => window01(t, ONLY_AT - 0.08, FEMALE_AT - 0.1, 0.18);
/** "dad" from the female's arrival until the hook takes over again, "mom" while she is there. */
export const dadLabel = (t: number): number => window01(t, FEMALE_AT - 0.1, BECAUSE_AT + 0.1, 0.22);
export const momLabel = (t: number): number => window01(t, FEMALE_AT - 0.05, F_OUT[0] + 0.5, 0.22);
/** "brood pouch" on "pouch". */
export const pouchLabel = (t: number): number => window01(t, POUCH_AT - 0.05, OXYGEN_AT - 0.2, 0.2);
/** The ♂ badges swell on "DADS" and on "males". */
export const badgePulse = (t: number): number => Math.max(pulse(t, DADS_AT - 0.05, 0.5), pulse(t, MALES_AT - 0.05, 0.5));

/** The lens on the pouch: open on "oxygen", shut before the birth. */
export const lensAt = (t: number): number => window01(t, OXYGEN_AT - 0.45, BIRTH_AT - 0.25, 0.4);
/** The embryos in the eggs, 0 just laid .. 1 ready: growing from "oxygen" through "weeks later". */
export const embryoAt = (t: number): number => ramp(t, OXYGEN_AT - 0.2, LATER_AT + 0.3);

/** The calendar on "weeks later": shown, and how many pages have flipped (fractional mid-flip). */
export const calendarAt = (t: number): number => window01(t, WEEKS_AT - 0.25, BIRTH_AT + 0.15, 0.2);
export const WEEK_FLIPS = 3;
export const FLIP_S = 0.2;
export const pagesAt = (t: number): number => Math.min(WEEK_FLIPS, Math.max(0, (t - WEEKS_AT + 0.05) / FLIP_S));

/** "dozens to hundreds of babies" on "cloud", until "So". */
export const babiesLabel = (t: number): number => window01(t, CLOUD_AT + 0.05, SO_AT + 0.1, 0.2);
/** The Father's Day card: pops up on "So happy", gone by the loop point. */
export const cardAt = (t: number): number => window01(t, SO_AT - 0.1, LOOP_S - 0.25, 0.3);

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
