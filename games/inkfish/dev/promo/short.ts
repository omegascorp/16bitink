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
