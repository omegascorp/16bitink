/**
 * The ambience's moods and the pure rules behind them: which chord each
 * place hums, how deep ground darkens and quietens it, and when the next
 * far-off tone falls. The audio graph that plays them is ambience.ts.
 */

/** Where the player is: on a planet, aboard (the lander or the starship's page), on the star map, or nowhere (silence). */
export type Mood = 'planet' | 'ship' | 'space' | 'none';

export interface MoodSpec {
  /** The pad's notes, Hz: each played by two slightly detuned oscillators. */
  readonly chord: readonly number[];
  readonly wave: OscillatorType;
  /** The pad's low-pass, Hz, before depth darkens it. */
  readonly cutoff: number;
  /** The pad's loudness. */
  readonly level: number;
  /** Wind's loudness at the surface (none indoors or in space). */
  readonly wind: number;
  /** Notes the occasional far-off tones are picked from, Hz. */
  readonly bells: readonly number[];
  /** Seconds between far-off tones, at least and at most. */
  readonly bellGap: readonly [number, number];
}

/**
 * Each place's sound. The planet: a low, open fifth-and-ninth drone under a
 * thin wind, with a rare glassy tone far off. Aboard: warmer and airier,
 * a major-seventh hum. The star map: high, sparse and starry.
 */
export const MOODS: Readonly<Record<Exclude<Mood, 'none'>, MoodSpec>> = {
  planet: { chord: [65.41, 98, 146.83, 220], wave: 'sine', cutoff: 900, level: 0.15, wind: 0.07, bells: [392, 440, 587.33, 659.25, 783.99], bellGap: [7, 16] },
  ship: { chord: [87.31, 130.81, 164.81, 261.63, 329.63], wave: 'triangle', cutoff: 1300, level: 0.12, wind: 0, bells: [523.25, 659.25, 783.99, 987.77], bellGap: [9, 18] },
  space: { chord: [55, 110, 164.81, 246.94, 369.99], wave: 'sine', cutoff: 1800, level: 0.12, wind: 0, bells: [880, 987.77, 1174.66, 1318.51, 1479.98], bellGap: [3, 8] },
};

/** How depth changes the planet's sound: the pad's loudness and low-pass multipliers and the wind's. */
export interface Shade {
  readonly level: number;
  readonly cutoff: number;
  readonly wind: number;
}

/** Metres down at which the ground has done all the darkening it will. */
const DEEPEST = 90;
/** Metres down at which the wind can no longer be heard. */
const WIND_GONE = 6;

/**
 * Deeper is quieter and darker: the drone fades to about a third and its
 * low-pass closes to about a quarter by DEEPEST metres, easing in (the first
 * few metres change little); the wind is gone a few metres down.
 */
export function depthShade(depth: number): Shade {
  const d = Number.isFinite(depth) ? Math.max(0, depth) : 0;
  const k = Math.min(1, d / DEEPEST);
  const eased = k * (2 - k);
  return {
    level: 1 - 0.65 * eased,
    cutoff: 1 - 0.75 * eased,
    wind: Math.max(0, 1 - d / WIND_GONE),
  };
}

/** Seconds until the next far-off tone: somewhere in the mood's gap, `r` in [0, 1). */
export function nextBell(spec: MoodSpec, r: number): number {
  const [lo, hi] = spec.bellGap;
  return lo + (hi - lo) * Math.min(1, Math.max(0, r));
}
