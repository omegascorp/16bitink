import type { Pt } from './stick';

/** The closest the player may zoom in, as a multiple of the level's own fit. */
export const ZOOM_MAX = 2.5;
/** One press of + or − zooms by this much. */
export const ZOOM_STEP = 1.3;

export interface ZoomRange {
  readonly min: number;
  readonly max: number;
}

/**
 * How far the level's camera may zoom: out until the whole level shows
 * (`whole`, never past the level's own fit), in up to ZOOM_MAX times `fit`.
 */
export function zoomRange(fit: number, whole: number): ZoomRange {
  return { min: Math.min(fit, whole), max: fit * ZOOM_MAX };
}

export function clampZoom(zoom: number, range: ZoomRange): number {
  return Math.min(range.max, Math.max(range.min, zoom));
}

/**
 * The camera's new middle (board px) when it zooms from `z` to `z2` about the
 * screen point `at`, so the board under `at` stays put. `half` is the
 * screen's middle; everything on screen is in the same units as `at`.
 */
export function zoomAbout(mid: Pt, at: Pt, half: Pt, z: number, z2: number): Pt {
  const k = 1 / z - 1 / z2;
  return { x: mid.x + (at.x - half.x) * k, y: mid.y + (at.y - half.y) * k };
}
