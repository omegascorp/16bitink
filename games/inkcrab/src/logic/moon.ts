import type { Box } from './body';

/**
 * Night on Moonlit Bay (beach 10). The beach is under a full moon, and
 * clouds pass over it on a steady rhythm, never a deadline: moonlight, then
 * a cloud comes over (the warning: the light fades) and the beach is dark
 * for `dark` seconds, the moon coming out again at the end. In the dark,
 * what hunts by sight sees only a little way (as in thick fog), and so does
 * the crab; sand hoppers come out to feed. Nothing about the dark harms.
 *
 * Glowing plankton lies in the wet sand of the strand (`glow` spans of
 * columns): wherever anything walks on it, it lights up and fades over a
 * few seconds. So you see a hunter coming by its glowing tracks in the
 * dark, and a hunter sees a crab walking on it: lit by its own footsteps,
 * it can be seen as far as by moonlight.
 */
export interface MoonSpec {
  /** Seconds from one cloud coming over the moon to the next. */
  readonly period: number;
  /** Seconds the moon is hidden each time, at the end of its cycle. */
  readonly dark: number;
  /** Seconds into the rhythm at the start (default 0: a whole spell of moonlight first). */
  readonly offset?: number;
}

/** A stretch of strand with glowing plankton in it: first and last column. */
export type GlowSpec = readonly [from: number, to: number];

export const MOON = {
  /** Seconds the light takes to fade as a cloud comes over (the warning), and to come back at the end. */
  fade: 2.5,
  /** Restocked food comes this much more often in the dark: sand hoppers come out at night. */
  foodEvery: 0.5,
} as const;

export const GLOW = {
  /** Seconds a footprint in the plankton takes to fade out. */
  fade: 3,
  /** A crab stays lit this long after its last step in the plankton. */
  linger: 0.8,
  /** px/s a body must be going to stir the plankton. */
  stir: 4,
} as const;

/** Seconds into the current cycle. */
function cycleTime(spec: MoonSpec, time: number): number {
  const t = (time + (spec.offset ?? 0)) % spec.period;
  return t < 0 ? t + spec.period : t;
}

/** Whether the moon is hidden now. */
export function isDark(spec: MoonSpec | undefined, time: number): boolean {
  return spec !== undefined && cycleTime(spec, time) >= spec.period - spec.dark;
}

/** How dark it is, 0 moonlight … 1 the moon hidden: fading as a cloud comes over, and back as it passes. */
export function darknessAt(spec: MoonSpec | undefined, time: number): number {
  if (!spec) return 0;
  const t = cycleTime(spec, time);
  const lit = spec.period - spec.dark;
  if (t >= spec.period - MOON.fade) return (spec.period - t) / MOON.fade;
  if (t >= lit) return 1;
  const u = (t - (lit - MOON.fade)) / MOON.fade;
  return u <= 0 ? 0 : u * u * (3 - 2 * u);
}

/** Dark or moonlit, and seconds until that changes: for the moon clock. */
export function moonTurn(spec: MoonSpec, time: number): { readonly dark: boolean; readonly seconds: number } {
  const t = cycleTime(spec, time);
  const dark = t >= spec.period - spec.dark;
  return { dark, seconds: (dark ? spec.period : spec.period - spec.dark) - t };
}

/**
 * The plankton in the strand: which columns glow, and when each was last
 * stirred by something walking on it.
 */
export class Plankton {
  private readonly stirred = new Map<number, number>();

  constructor(readonly spans: readonly GlowSpec[], private readonly tile: number) {}

  /** Whether column `col` has plankton in it. */
  has(col: number): boolean {
    return this.spans.some(([from, to]) => col >= from && col <= to);
  }

  /** Something on the ground went over its columns at `time`, moving at `vx`: they light up. */
  stir(b: Box, vx: number, time: number): void {
    if (Math.abs(vx) < GLOW.stir) return;
    for (const col of this.under(b)) if (this.has(col)) this.stirred.set(col, time);
  }

  /** How brightly column `col` glows now, 0..1: fresh footprints brightest. */
  brightness(col: number, time: number): number {
    const at = this.stirred.get(col);
    return at === undefined ? 0 : Math.max(0, 1 - (time - at) / GLOW.fade);
  }

  /** Whether a body stands lit by plankton it stirred a moment ago. */
  lit(b: Box, time: number): boolean {
    return this.under(b).some((col) => {
      const at = this.stirred.get(col);
      return at !== undefined && time - at <= GLOW.linger;
    });
  }

  /** Columns stirred within the fade, for drawing. */
  glowing(time: number): readonly (readonly [col: number, bright: number])[] {
    const out: [number, number][] = [];
    for (const col of this.stirred.keys()) {
      const bright = this.brightness(col, time);
      if (bright > 0) out.push([col, bright]);
      else this.stirred.delete(col);
    }
    return out;
  }

  private under(b: Box): number[] {
    const out: number[] = [];
    for (let col = Math.floor(b.x / this.tile); col <= Math.floor((b.x + b.w - 1e-6) / this.tile); col++) out.push(col);
    return out;
  }
}
