/**
 * Monsoon squalls (Monsoon Harbour, beach 8): a steady rhythm of dry spells
 * and downpours, never a deadline. Each cycle is dry, then a squall builds
 * (the warning: the light goes and the first drops fall) and pours for
 * `pour` seconds, easing off at the end before it clears. While it pours,
 * what hunts by sight sees only a little way (as in thick fog; a monitor's
 * tongue isn't fooled), birds won't stoop, the rain washes food out onto
 * the sand, and wet sand digs quickly. Rain never harms.
 */
export interface RainSpec {
  /** Seconds from the start of one downpour to the start of the next. */
  readonly period: number;
  /** Seconds each downpour lasts, at the end of its cycle. */
  readonly pour: number;
  /** Seconds into the rhythm at the start (default 0: a whole dry spell first). */
  readonly offset?: number;
}

export const RAIN = {
  /** Seconds a squall builds before it pours: the warning. */
  build: 3,
  /** Seconds at the end of a downpour over which it eases off (it's still pouring). */
  ease: 2,
  /** Food the beach restocks comes this much more often in a downpour… */
  foodEvery: 0.3,
  /** …and it holds this share more of it than usual. */
  extra: 0.5,
  /** Wet sand digs in this share of the time. */
  dig: 0.5,
} as const;

/** Seconds into the current cycle. */
function cycleTime(spec: RainSpec, time: number): number {
  const t = (time + (spec.offset ?? 0)) % spec.period;
  return t < 0 ? t + spec.period : t;
}

/** Whether a downpour is on now. */
export function isPouring(spec: RainSpec | undefined, time: number): boolean {
  return spec !== undefined && cycleTime(spec, time) >= spec.period - spec.pour;
}

/** How hard it's raining, 0 dry … 1 a downpour: building up before it pours, easing off at the end. */
export function rainAt(spec: RainSpec | undefined, time: number): number {
  if (!spec) return 0;
  const t = cycleTime(spec, time);
  const dry = spec.period - spec.pour;
  if (t >= spec.period - RAIN.ease) return (spec.period - t) / RAIN.ease;
  if (t >= dry) return 1;
  const u = (t - (dry - RAIN.build)) / RAIN.build;
  return u <= 0 ? 0 : u * u * (3 - 2 * u);
}

/** Pouring or not, and seconds until that changes: for the rain clock. */
export function rainTurn(spec: RainSpec, time: number): { readonly pouring: boolean; readonly seconds: number } {
  const t = cycleTime(spec, time);
  const pouring = t >= spec.period - spec.pour;
  return { pouring, seconds: (pouring ? spec.period : spec.period - spec.pour) - t };
}
