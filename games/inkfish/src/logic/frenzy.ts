export interface FrenzyState {
  /** 0..1 */
  readonly meter: number;
}

export const FRENZY_GAIN = 0.11;
export const FRENZY_DRAIN_PER_SEC = 0.16;
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
