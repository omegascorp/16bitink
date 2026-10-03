export interface FrenzyState {
  /** 0..1 */
  readonly meter: number;
}

/**
 * A meal fills a fifth of the meter, and a full meter takes ~16 s to drain:
 * two quick meals make x2, a fish every couple of seconds builds to x5, and
 * eating slower than one every ~3.5 s never builds a combo.
 */
export const FRENZY_GAIN = 0.2;
export const FRENZY_DRAIN_PER_SEC = 0.06;
export const MAX_MULTIPLIER = 5;

export const initialFrenzy: FrenzyState = { meter: 0 };

export function feedFrenzy(state: FrenzyState): FrenzyState {
  return { meter: Math.min(1, state.meter + FRENZY_GAIN) };
}

export function drainFrenzy(state: FrenzyState, dtSec: number): FrenzyState {
  return { meter: Math.max(0, state.meter - FRENZY_DRAIN_PER_SEC * dtSec) };
}

export function frenzyMultiplier(state: FrenzyState): number {
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(state.meter * (MAX_MULTIPLIER - 1) + 1e-9));
}

export function frenzyLabel(multiplier: number): string {
  if (multiplier >= MAX_MULTIPLIER) return 'INK FRENZY!';
  if (multiplier >= 3) return 'Frenzy';
  return '';
}
