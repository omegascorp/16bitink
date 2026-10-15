import { ramp } from '../short';
import { cycle, DISAPPEARED_AT, LOOP_S, wrap, YEAR_TICKS } from './timing';

/**
 * The field of snow crabs on the Bering Sea floor, and when each one goes.
 * Nobody dies on screen: a crab fades to an empty dashed outline, and the
 * outline fades away. They go in three waves, each on its words:
 *
 *   A  "TEN BILLION crabs vanished": a third of the back rows, already going
 *      as the loop opens (their outlines are in frame 1), the last on
 *      "vanished"
 *   B  "Between 2018 and 2021": the rest of the back rows, a few each year
 *      as the counter ticks over
 *   C  "…snow crabs of Alaska's Bering Sea just… disappeared": the front
 *      rows (under the map card's edge), the last, the labelled "snow crab",
 *      on "disappeared"
 *
 * At "The count still says" the field fills again quietly, outline first,
 * so the loop comes round to a full field.
 */
export interface Crab {
  readonly x: number;
  /** Where its feet are. */
  readonly y: number;
  readonly scale: number;
  readonly facing: 1 | -1;
  readonly wave: 'A' | 'B' | 'C';
  /** When it starts to fade, unwrapped: after `back`, maybe past LOOP_S. */
  readonly vanish: number;
  /** When it comes back, near the end of the loop. */
  readonly back: number;
  readonly swayTurns: number;
  readonly swayPhase: number;
}

/** Rows from the back (small, high) to the front (big, low): feet line, scale, how many. */
const ROWS: readonly (readonly [number, number, number])[] = [
  [575, 1.2, 8],
  [680, 1.45, 7],
  [800, 1.75, 6],
  [935, 2.05, 5],
  [1080, 2.4, 4],
];
const BACK_ROWS = 3;

/** The labelled crab: front row, second from the left. */
export const HERO_INDEX = ROWS.slice(0, 4).reduce((s, r) => s + r[2], 0) + 1;

/** Waves A and B: how many of the back rows go with the hook. */
const WAVE_A = 12;
/** Wave A starts going under "The count still says:" (the line the hook finishes) and ends on "vanished". */
const A_FROM = 19.95;
const A_TO = LOOP_S + 1.6;
/** Wave C spreads from "snow crabs" to "disappeared". */
const C_FROM = 5.0;

/** The field fills again from here, over REFILL_S. */
export const REFILL_FROM = 18.95;
const REFILL_S = 0.85;

function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export const CRABS: readonly Crab[] = (() => {
  const rnd = random(2022);
  const spots = ROWS.flatMap(([y, scale, n], row) =>
    Array.from({ length: n }, (_, i) => ({ row, y: y + (rnd() - 0.5) * 22, scale: scale * (0.92 + rnd() * 0.16), x: ((i + 0.5 + (rnd() - 0.5) * 0.45 + (row % 2 ? 0.25 : -0.1)) * 1080) / n })),
  );
  const backIdx = spots.map((s, i) => (s.row < BACK_ROWS ? i : -1)).filter((i) => i >= 0);
  // A fixed shuffle of the back rows, so each wave is spread over the whole field.
  const order = [...backIdx].sort((a, b) => ((a * 7919) % 31) - ((b * 7919) % 31));
  const front = spots.map((s, i) => (s.row >= BACK_ROWS ? i : -1)).filter((i) => i >= 0 && i !== HERO_INDEX);
  const vanishOf = (i: number): { wave: Crab['wave']; at: number } => {
    const k = order.indexOf(i);
    if (k >= 0 && k < WAVE_A) return { wave: 'A', at: A_FROM + (k / (WAVE_A - 1)) * (A_TO - A_FROM) };
    if (k >= WAVE_A) {
      const j = k - WAVE_A;
      return { wave: 'B', at: YEAR_TICKS[j % YEAR_TICKS.length]! + 0.05 + 0.08 * Math.floor(j / YEAR_TICKS.length) };
    }
    if (i === HERO_INDEX) return { wave: 'C', at: DISAPPEARED_AT + 0.1 };
    const j = front.indexOf(i);
    return { wave: 'C', at: C_FROM + (j / front.length) * (DISAPPEARED_AT - 0.2 - C_FROM) };
  };
  return spots.map((s, i) => {
    const { wave, at } = vanishOf(i);
    const vanish = at < LOOP_S / 2 ? at + LOOP_S : at;
    const back = Math.min(REFILL_FROM + rnd() * REFILL_S, vanish - 0.9);
    return {
      x: s.x, y: s.y, scale: s.scale, facing: rnd() < 0.5 ? 1 : -1, wave, vanish, back,
      swayTurns: 3 + Math.floor(rnd() * 4), swayPhase: rnd() * Math.PI * 2,
    };
  });
})();

export interface CrabState {
  /** The crab itself, 0 .. 1. */
  readonly body: number;
  /** Its empty outline, 0 .. ~0.75. */
  readonly ghost: number;
  readonly x: number;
}

const FADE_S = 0.5;

/** How much of a crab shows at loop time t: comes back (outline, then body), stays, fades to an outline, gone. */
export function crabAt(c: Crab, t: number): CrabState {
  const phase = wrap(t - c.back);
  const gone = c.vanish - c.back;
  const body = ramp(phase, 0.15, 0.75) * (1 - ramp(phase, gone, gone + FADE_S));
  const coming = 0.55 * ramp(phase, 0, 0.2) * (1 - ramp(phase, 0.45, 0.85));
  const going = 0.8 * ramp(phase, gone + 0.05, gone + 0.35) * (1 - ramp(phase, gone + 1.2, gone + 2.4));
  return { body, ghost: Math.max(coming, going), x: c.x + 7 * c.scale * cycle(t, c.swayTurns, c.swayPhase) };
}
