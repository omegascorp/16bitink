import { ART_RES } from '../art/palette';

/**
 * Device pixels per CSS pixel the canvas renders at, as in the other games:
 * capped at the resolution textures are baked at.
 */
export const DPR = typeof window === 'undefined' ? 1 : Math.min(ART_RES, Math.max(1, window.devicePixelRatio || 1));

/** The screen in CSS pixels. */
export function screenSize(scale: { width: number; height: number }): { width: number; height: number } {
  return { width: scale.width / DPR, height: scale.height / DPR };
}
