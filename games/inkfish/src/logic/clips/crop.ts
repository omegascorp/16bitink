export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Phone video: 9 wide by 16 tall. */
export const CLIP_ASPECT = 9 / 16;

/**
 * The part of the screen that goes into the clip: as much of it as fits a
 * 9:16 frame, centred on the fish and kept inside the screen. On a wide
 * screen that's a full-height strip; on a tall phone, the full width.
 */
export function cropFor(width: number, height: number, focusX: number, focusY: number, aspect = CLIP_ASPECT): Rect {
  const clamp = (v: number, max: number): number => Math.min(Math.max(v, 0), max);
  if (width / height > aspect) {
    const w = Math.round(height * aspect);
    return { x: clamp(Math.round(focusX - w / 2), width - w), y: 0, w, h: height };
  }
  const h = Math.min(height, Math.round(width / aspect));
  return { x: 0, y: clamp(Math.round(focusY - h / 2), height - h), w: width, h };
}

/** Frame-rate independent easing: covers about `rate` e-folds of the distance per second. */
export function easeToward(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}
