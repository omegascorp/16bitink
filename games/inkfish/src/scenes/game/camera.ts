import { TUNING } from './tuning';

/** Reference viewport height the base visible height was tuned for. */
const REFERENCE_VIEW_H = 760;

/**
 * Camera zoom that pulls back as the player grows (Tasty Planet style)
 * while never showing beyond the world edges. Small screens (landscape
 * phones) show less of the world so fish stay readable.
 */
export function targetZoom(
  viewW: number, viewH: number, worldW: number, worldH: number, playerSize: number, baseSize: number,
): number {
  const screenFactor = Math.min(1, Math.max(0.6, viewH / REFERENCE_VIEW_H));
  const visibleH = TUNING.baseVisibleHeight * screenFactor * Math.sqrt(playerSize / baseSize);
  const wanted = viewH / visibleH;
  const minZoom = Math.max(viewW / worldW, viewH / worldH);
  return Math.max(minZoom, wanted);
}
