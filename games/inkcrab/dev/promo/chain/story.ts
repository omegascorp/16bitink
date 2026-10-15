import { BOIL_FPS } from '../sprites';
import { ramp, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "Hermit crabs queue up to swap houses": the vacancy chain of the land
 * hermit crab Coenobita clypeatus (Rotjan, Chabot & Lewis, Behavioral
 * Ecology 2010, in Belize). Told by a narrator (words.ts) on Wreck Cove, the
 * game's own vacancy-chain beach, with the game's purple-pincher rivals;
 * every beat timed to the words, a function of time in seconds over a loop
 * of LOOP_S. The crabs and shells move in queue.ts; this file has the
 * timings, the props, the captions and the sounds.
 *
 *   0     seven crabs in a snaking queue (layout.ts), roped off like a bank's,
 *         biggest to smallest, behind a big empty shell
 *         (highlighted, as the game marks a shell you can take), twitching;
 *         a hop runs down the line on "QUEUE UP", and on "swap houses"
 *         dashed arcs hint at the swap to come
 *   2.5   "big empty shell" called out; it settles with a bump on "turns up"
 *   4.4   "crabs gather round and wait": they shuffle closer, then "…"
 *   6.0   "sometimes for hours": a clock, its hands whirling round
 *   7.3   "lining up from biggest to smallest": a size ruler along the lane,
 *         "biggest" and "smallest" written at its ends
 *   9.8   the payoff: the biggest slips out of its shell, naked and red, and
 *         moves into the big one on "in,"; then the rest follow down the
 *         line like dominoes, a tick and a "movein" each
 *   12.4  "each crab taking the next shell up": the hops drawn as arcs, one
 *         by one; "in SECONDS": a stopwatch clicks
 *   15.1  "Scientists call it a vacancy chain": the paper's authors, then
 *         the heading; the crabs grow into their roomier shells, the biggest
 *         walks off in its new house, a tiny naked crab takes the shell left
 *         at the end, and a wave rolls in a fresh big empty shell: the line
 *         is back as it began.
 */
export const LOOP_S = 18;

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;
/** Leg poses while walking or dashing run faster than the boil, as in the game. */
export const walkFrameAt = (t: number): number => Math.floor(t * 12 + 1e-9) % 3;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}
/** When a word ends, in voice.mp3. */
export function ended(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.end / TEMPO;
}

export const QUEUE_AT = said('QUEUE');
export const SWAP_AT = said('swap');
export const BIG_AT = said('big');
export const SHELL_AT = said('shell');
export const TURNS_AT = said('turns');
export const GATHER_AT = said('crabs', 2);
export const WAIT_AT = said('wait,');
export const SOMETIMES_AT = said('sometimes');
export const HOURS_AT = said('hours,');
export const LINING_AT = said('lining');
export const BIGGEST_AT = said('biggest');
export const SMALLEST_AT = said('smallest.');
export const THEN_AT = said('Then');
export const BIGGEST2_AT = said('biggest', 2);
export const IN_AT = said('in,');
export const AND_AT = said('and', 2);
export const EACH_AT = said('each');
export const SECONDS_AT = said('SECONDS.');
export const SCIENTISTS_AT = said('Scientists');
export const VACANCY_AT = said('vacancy');
export const CHAIN_AT = said('chain.');
export const SO_AT = said('So');

// ---------------------------------------------------------------- props

/** The big empty shell named: a callout on "big empty shell", gone once the crabs start to gather. */
export const bigShellLabel = (t: number): number => window01(t, BIG_AT - 0.05, GATHER_AT + 0.35, 0.2);
/** Dashed arcs from each crab to the shell ahead, hinting at the swap on "swap houses". */
export const hintArcsAt = (t: number): number => window01(t, SWAP_AT - 0.1, BIG_AT, 0.25);
/** "…" over the crabs as they wait. */
export const waitAt = (t: number): number => window01(t, WAIT_AT - 0.1, HOURS_AT + 0.35, 0.2);

/** The clock on "sometimes for hours": in on "sometimes", its hands whirling round, out as they line up. */
export const clockAt = (t: number): number => window01(t, SOMETIMES_AT - 0.15, LINING_AT + 0.25, 0.25);
/** The clock's hour hand, in turns: a few hours whirl by while it is up. */
export const clockTurnsAt = (t: number): number => 0.35 * Math.max(0, t - SOMETIMES_AT) - 0.2 * Math.max(0, t - (LINING_AT + 0.1));
export const hoursLabel = (t: number): number => window01(t, HOURS_AT - 0.05, LINING_AT + 0.25, 0.15);

/** The size ruler over the line: drawn in from the left on "lining up", gone as the chain begins ("biggest" stays a moment longer). */
export const rulerAt = (t: number): number => ramp(t, LINING_AT - 0.05, LINING_AT + 0.55) * (1 - ramp(t, THEN_AT, THEN_AT + 0.35));
export const biggestLabel = (t: number): number => window01(t, BIGGEST_AT - 0.05, IN_AT + 0.3, 0.15);
export const smallestLabel = (t: number): number => window01(t, SMALLEST_AT - 0.05, THEN_AT + 0.35, 0.15);
/** "biggest" jumps again as the narrator names it a second time. */
export const biggestJolt = (t: number): number => window01(t, BIGGEST2_AT - 0.05, BIGGEST2_AT + 0.4, 0.1);

/** The hops drawn as solid arcs, one by one down the line from "each crab taking the next shell up". */
export function chainArcAt(slot: number, t: number): number {
  const from = EACH_AT + (slot - 1) * 0.2;
  return ramp(t, from, from + 0.3) * (1 - ramp(t, SECONDS_AT + 0.5, SCIENTISTS_AT));
}

/** The stopwatch on "in SECONDS": in, clicked, its hand ticking a few seconds round, out before the heading. */
export const stopwatchAt = (t: number): number => window01(t, SECONDS_AT - 0.3, SCIENTISTS_AT + 0.1, 0.2);
/** Whole seconds ticked off: the hand jumps a second at a time. */
export const stopwatchTicksAt = (t: number): number => Math.max(0, Math.min(3, Math.floor((t - SECONDS_AT) / 0.25) + 1));
export const secondsLabel = (t: number): number => window01(t, SECONDS_AT - 0.05, SCIENTISTS_AT + 0.1, 0.15);

/** The paper on "Scientists", the heading written out on "vacancy chain", both gone before the loop comes round. */
export const paperLabel = (t: number): number => window01(t, SCIENTISTS_AT - 0.05, LOOP_S - 0.12, 0.3);
/** How much of "vacancy chain" is written, 0 .. 1, from "vacancy" into "chain". */
export const headingWritten = (t: number): number => ramp(t, VACANCY_AT - 0.08, CHAIN_AT + 0.12);
export const headingAt = (t: number): number => 1 - ramp(t, LOOP_S - 0.42, LOOP_S - 0.12);

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** How many words each caption line takes, so phrases stay whole ("big empty shell", "vacancy chain"). */
const LINE_SIZES = [4, 3, 5, 2, 3, 2, 3, 2, 4, 3, 2, 5, 3, 4, 2, 3, 3, 2] as const;

/** The voiceover cut into short lines. */
export const LINES: readonly Line[] = (() => {
  let at = 0;
  const groups = LINE_SIZES.map((n) => {
    const g = WORDS.slice(at, at + n);
    at += n;
    return g;
  });
  if (at !== WORDS.length) throw new Error(`caption lines take ${at} of ${WORDS.length} words`);
  return groups.map((g, i) => ({
    words: g,
    // The first line is up from the first frame: the hook is on screen before its first word lands.
    from: i === 0 ? 0 : g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  // The loop opens on the hook's first word, a moment before the voice reaches it.
  let word = line === LINES[0] ? 0 : -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
  });
  return { line, word };
}
