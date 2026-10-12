export const VIDEO = { width: 1080, height: 1920 } as const;

/** One promo short: a seamless loop the recorder (record.mjs) steps through frame by frame. */
export interface Short {
  /** Loop length: a whole number of video frames and of line-boil cycles. */
  readonly loopSeconds: number;
  draw(seconds: number): void;
  /** The soundtrack as WAV, looping like the picture, rotated to begin `start` seconds in. */
  audio(start: number): Promise<Blob>;
}

export const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));

/** Smoothstep of u over [0, 1]. */
export const smooth = (u: number): number => {
  const c = clamp01(u);
  return c * c * (3 - 2 * c);
};

/** 0 → 1 over [from, to], smoothly. */
export const ramp = (t: number, from: number, to: number): number => smooth((t - from) / (to - from));

export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

/** Fades in over `fade` s from `from`, holds, fades out over `fade` s up to `to`. */
export const window01 = (t: number, from: number, to: number, fade: number): number =>
  Math.min(ramp(t, from, from + fade), 1 - ramp(t, to - fade, to));

/** A value at a moment: where it is (`at`) and, optionally, how fast it is changing there (per second). */
export interface Key {
  readonly t: number;
  readonly at: number;
  readonly rate?: number;
}

/**
 * A smooth curve through keys in time order (cubic Hermite): at each key it
 * passes `at` changing at `rate`, or, where a key gives none, at the
 * Catmull-Rom rate from its neighbours (one-sided at the ends). Held at the
 * first and last keys' values outside them. Returns the value and its rate.
 */
export function curveAt(keys: readonly Key[], t: number): { readonly at: number; readonly rate: number } {
  const rateOf = (i: number): number => {
    const k = keys[i]!;
    if (k.rate !== undefined) return k.rate;
    const a = keys[Math.max(0, i - 1)]!;
    const b = keys[Math.min(keys.length - 1, i + 1)]!;
    return (b.at - a.at) / (b.t - a.t);
  };
  const time = Math.min(Math.max(t, keys[0]!.t), keys[keys.length - 1]!.t);
  let i = 0;
  while (i < keys.length - 2 && time > keys[i + 1]!.t) i++;
  const k0 = keys[i]!;
  const k1 = keys[i + 1]!;
  const h = k1.t - k0.t;
  const m0 = rateOf(i);
  const m1 = rateOf(i + 1);
  const s = (time - k0.t) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  return {
    at: (2 * s3 - 3 * s2 + 1) * k0.at + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * k1.at + (s3 - s2) * h * m1,
    rate: ((6 * s2 - 6 * s) * k0.at + (-6 * s2 + 6 * s) * k1.at) / h + (3 * s2 - 4 * s + 1) * m0 + (3 * s2 - 2 * s) * m1,
  };
}
