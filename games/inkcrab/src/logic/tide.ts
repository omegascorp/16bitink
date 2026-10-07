/**
 * The tide: a steady rhythm, never a deadline. The sea's surface rises
 * from its low-tide row to its high-tide row and back, once a period,
 * starting at low water. Rows are terrain rows (the water's top edge).
 */
export interface TideSpec {
  /** Row the sea's surface sits at at low water (the larger number: lower down). */
  readonly low: number;
  /** Row it reaches at high water. */
  readonly high: number;
  /** Seconds from one low water to the next. */
  readonly period: number;
}

/** 0 at low water, 0.5 at high water, back to 1 at the next low. */
export function tidePhase(spec: TideSpec, time: number): number {
  return ((time / spec.period) % 1 + 1) % 1;
}

/** World y of the sea's surface at `time`: easing between low and high, slowest at the turn. */
export function tideY(spec: TideSpec, time: number, tile: number): number {
  const rise = (1 - Math.cos(tidePhase(spec, time) * Math.PI * 2)) / 2;
  return (spec.low + (spec.high - spec.low) * rise) * tile;
}

/** Rising or falling, and seconds until the next high or low water: for the tide clock. */
export function tideTurn(spec: TideSpec, time: number): { readonly rising: boolean; readonly seconds: number } {
  const p = tidePhase(spec, time);
  const rising = p < 0.5;
  return { rising, seconds: ((rising ? 0.5 : 1) - p) * spec.period };
}

/** How many high waters have come by `time` (each one washes things in). */
export function highWaters(spec: TideSpec, time: number): number {
  return Math.floor(time / spec.period + 0.5);
}

/** Whether it's the low half of the cycle: gulls are about. */
export function isLowWater(spec: TideSpec, time: number): boolean {
  const p = tidePhase(spec, time);
  return p < 0.25 || p > 0.75;
}
