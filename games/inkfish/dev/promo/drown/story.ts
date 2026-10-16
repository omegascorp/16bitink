import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, lerp, ramp, window01 } from '../short';
import { routeAt } from './atlas';
import { TEMPO, WORDS } from './words';

/**
 * "Fish CAN drown": tuna are ram ventilators. They breathe by swimming with
 * the mouth open, so the water is pushed over their gills; stop swimming and
 * the water stops, and they suffocate. So they never stop, even to rest, and
 * a bluefin can cross the whole Atlantic (tagging studies). Told by a
 * narrator (words.ts) over the game's tuna, every beat a function of time in
 * seconds over a loop of LOOP_S:
 *
 *   0     the hook: the tuna swimming in a life ring under "FISH CAN DROWN?!"
 *   1.5   "A tuna breathes by swimming…": the ring floats off; an O₂ gauge,
 *         full; "…mouth open, pushing water over its gills": the mouth
 *         opens and ink streamlines of water run in and out past the gills
 *   5.7   "If it stops swimming, it suffocates": the tuna slows and sinks,
 *         the stream stops, the gauge drains into the red
 *   8.2   "So it never stops": it kicks off again and the gauge refills;
 *         night falls; "Not to rest": a bed, crossed out; "Not even to
 *         SLEEP": a "Zzz" bubble, struck through, the tuna swimming on
 *   11.9  "A bluefin can swim across an entire ocean": the tuna shrinks onto
 *         an ink map of the Atlantic and crosses it on a dotted route
 *   14.7  "So yes, believe it or not:": back to the tuna, the life ring drops
 *         on again, and the loop finishes the sentence.
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

export const DROWN_AT = said('drown.');
export const TUNA_AT = said('tuna');
export const BREATHES_AT = said('breathes');
export const MOUTH_AT = said('mouth');
export const OPEN_AT = said('open,');
export const PUSHING_AT = said('pushing');
export const WATER_AT = said('water');
export const GILLS_AT = said('gills.');
export const IF_AT = said('If');
export const STOPS_AT = said('stops');
export const SUFFOCATES_AT = said('suffocates.');
export const SO_AT = said('So');
export const NEVER_AT = said('never');
export const NOT_AT = said('Not');
export const REST_AT = said('rest.');
export const EVEN_AT = said('even');
export const SLEEP_AT = said('SLEEP.');
export const A_BLUEFIN_AT = said('A', 2);
export const BLUEFIN_AT = said('bluefin');
export const SWIM_AT = said('swim');
export const OCEAN_AT = said('ocean.');
export const SO_YES_AT = said('So', 2);
export const YES_AT = said('yes,');
export const BELIEVE_AT = said('believe');

// ---------------------------------------------------------------- swimming

/** How far it has stopped, 0 swimming .. 1 stopped: on "stops swimming", until it kicks off again on "So…". */
export const stopAt = (t: number): number => ramp(t, STOPS_AT - 0.05, STOPS_AT + 0.75) * (1 - ramp(t, SO_AT - 0.1, SO_AT + 0.3));
/** The kick as it sets off again on "So it never stops", 0 .. 1. */
export const burstAt = (t: number): number => Math.sin(Math.PI * clamp01((t - (SO_AT - 0.1)) / 1.6));

/** How fast it swims (and the sea streams past), 1 cruising. */
export const speedAt = (t: number): number => 1 - 0.95 * stopAt(t) + 0.6 * burstAt(t);

/**
 * The share of a loop's worth of `rate` used up by time t, 0 .. 1: a phase
 * that runs faster or slower with the rate and still comes round exactly.
 */
function phaseOf(rate: (t: number) => number): (t: number) => number {
  const step = 1 / 240;
  const n = Math.round(LOOP_S / step);
  const sums = [0];
  for (let i = 0; i < n; i++) sums.push(sums[i]! + rate((i + 0.5) * step) * step);
  const total = sums[n]!;
  return (t: number) => {
    const f = wrap(t) / step;
    const i = Math.min(n - 1, Math.floor(f));
    return (sums[i]! + (sums[i + 1]! - sums[i]!) * (f - i)) / total;
  };
}

/** How far the sea has streamed past, 0 .. 1 a loop (the marks lap the frame a whole number of times). */
export const flowPhase = phaseOf(speedAt);
/** Tail beats: they slow to a lazy scull when it stops. */
export const TAIL_BEATS = 32;
const tailPhase = phaseOf((t) => 0.15 + 0.85 * Math.min(1.4, speedAt(t)));

// ---------------------------------------------------------------- the tuna

/** A fish on screen, facing right. */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  /** Nose up, radians (as drawSwimmer takes it). */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  readonly jaw: number;
}

/** Where the tuna holds station while the sea streams past it. */
export const TUNA = { x: 520, y: 790, len: 560 } as const;
/** Its size on the map. */
export const MAP_LEN = 150;
/** How wide its mouth hangs open while it breathes. */
const GAPE = 0.3;

/**
 * How far it has shrunk onto the map, 0 big .. 1 on the map: on "A bluefin…", and back on "So yes…".
 * It starts just ahead of "A" so the shrink (560 to 150 px long) takes ~0.7 s and never jumps.
 */
export const onMapAt = (t: number): number =>
  ramp(t, A_BLUEFIN_AT - 0.3, BLUEFIN_AT + 0.25) * (1 - ramp(t, SO_YES_AT, BELIEVE_AT - 0.05));
/** How far along the route it has swum, 0 .. 1: from "swim" to just after "ocean". */
export const routeUAt = (t: number): number => ramp(t, SWIM_AT - 0.25, OCEAN_AT + 0.55);

export function tunaAt(t: number): Fish {
  const w = (2 * Math.PI * t) / LOOP_S;
  const stop = stopAt(t);
  const big = {
    // It surges forward as it kicks off, and sinks nose-down when it stops (tuna are heavier than water).
    x: TUNA.x + 18 * Math.sin(2 * w) + 40 * burstAt(t),
    y: TUNA.y + 14 * Math.sin(3 * w + 1) + 80 * stop,
    tilt: 0.03 * Math.cos(3 * w + 1) - 0.1 * stop,
  };
  const k = onMapAt(t);
  const there = routeAt(routeUAt(t));
  const jaw = GAPE * ramp(t, MOUTH_AT - 0.1, OPEN_AT + 0.1) * (1 - stop) * (1 - ramp(t, A_BLUEFIN_AT - 0.4, A_BLUEFIN_AT));
  return {
    x: lerp(big.x, there.x, k),
    y: lerp(big.y, there.y, k),
    len: lerp(TUNA.len, MAP_LEN, k),
    tilt: lerp(big.tilt, -there.heading, k),
    beat: 2 * Math.PI * TAIL_BEATS * tailPhase(t),
    effort: 0.3 + 0.45 * Math.min(1.3, speedAt(t)),
    jaw,
  };
}

// ---------------------------------------------------------------- the life ring

/** It floats off on "A tuna…" and drops back on for "…believe it or not". */
export const RING_OFF = TUNA_AT - 0.2;
const RING_RISE_S = 1;
export const RING_LAND = BELIEVE_AT + 0.5;
const RING_FALL_S = 0.75;
/** Higher than this it's off the top of the frame. */
const RING_GONE = 1000;

/** The ring: how far above its place round the tuna (px) and its spin (radians), or null while it's away. */
export function ringAt(t: number): { readonly lift: number; readonly spin: number } | null {
  const sway = 0.05 * Math.sin((2 * Math.PI * 4 * t) / LOOP_S);
  if (t < RING_OFF) return { lift: 0, spin: sway };
  if (t < RING_OFF + RING_RISE_S) {
    const lift = RING_GONE * ((t - RING_OFF) / RING_RISE_S) ** 1.6;
    return { lift, spin: sway + (0.6 * lift) / RING_GONE };
  }
  if (t < RING_LAND - RING_FALL_S) return null;
  if (t < RING_LAND) {
    const lift = RING_GONE * ((RING_LAND - t) / RING_FALL_S) ** 2;
    return { lift, spin: sway - (0.5 * lift) / RING_GONE };
  }
  // A little bob as it lands.
  return { lift: -16 * Math.sin(Math.PI * clamp01((t - RING_LAND) / 0.35)), spin: sway };
}

// ---------------------------------------------------------------- the gauge, the water, the night

/** The O₂ gauge: in on "breathes", out once it has refilled. */
export const gaugeAt = (t: number): number => window01(t, BREATHES_AT - 0.1, NOT_AT + 0.35, 0.25);
/** How far the oxygen has drained, 0 .. 1: as it stops and suffocates, refilling once it swims again. */
export const drainAt = (t: number): number => ramp(t, STOPS_AT + 0.3, SUFFOCATES_AT + 0.65) * (1 - ramp(t, SO_AT, NEVER_AT + 0.35));
/** The gauge's needle, 1 full .. 0.12 deep in the red. */
export const oxygenAt = (t: number): number => 1 - 0.88 * drainAt(t);

/** The streamlines of water through its mouth and out past its gills: on "pushing water", gone while it's stopped. */
export const waterAt = (t: number): number => ramp(t, PUSHING_AT - 0.2, WATER_AT + 0.1) * (1 - stopAt(t)) * (1 - ramp(t, NOT_AT, NOT_AT + 0.4));

/** Night falls on "never stops…" and lifts as the map comes in. */
export const nightAt = (t: number): number => ramp(t, NEVER_AT, REST_AT) * (1 - ramp(t, SLEEP_AT + 0.55, BLUEFIN_AT + 0.05));
/** The bed on "rest", crossed out as it's said. */
export const bedAt = (t: number): number => window01(t, REST_AT - 0.25, A_BLUEFIN_AT - 0.05, 0.25);
export const bedCrossAt = (t: number): number => ramp(t, REST_AT + 0.05, REST_AT + 0.45);
/** The "Zzz" bubble on "even", struck through on "SLEEP". */
export const zzzAt = (t: number): number => window01(t, EVEN_AT - 0.15, A_BLUEFIN_AT - 0.05, 0.25);
export const zzzStrikeAt = (t: number): number => ramp(t, SLEEP_AT + 0.05, SLEEP_AT + 0.35);

/** The map card, in on "A bluefin…", out on "So yes…". */
export const mapAt = (t: number): number => ramp(t, A_BLUEFIN_AT - 0.15, BLUEFIN_AT + 0.2) * (1 - ramp(t, SO_YES_AT + 0.05, YES_AT + 0.45));
