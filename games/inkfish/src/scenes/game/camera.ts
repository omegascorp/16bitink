import { TUNING } from './tuning';

/** Reference viewport height the base visible height was tuned for. */
const REFERENCE_VIEW_H = 760;

/**
 * Camera zoom that pulls back as the player grows (Tasty Planet style)
 * while never showing beyond the world edges. Small screens (phones) show
 * less of the world so fish stay readable. Zoom follows the screen's short
 * side, so turning a phone to portrait keeps the same zoom instead of
 * narrowing the view to a thin strip of sea.
 */
export function targetZoom(
  viewW: number, viewH: number, worldW: number, worldH: number, playerSize: number, baseSize: number,
): number {
  const short = Math.min(viewW, viewH);
  const screenFactor = Math.min(1, Math.max(0.6, short / REFERENCE_VIEW_H));
  const visibleShort = TUNING.baseVisibleHeight * screenFactor * Math.sqrt(playerSize / baseSize);
  const wanted = short / visibleShort;
  const minZoom = Math.max(viewW / worldW, viewH / worldH);
  return Math.max(minZoom, wanted);
}
