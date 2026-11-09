import type { Pixels } from './pixelScenery';
import type { FigureArt } from './standIns';

/** A pixel counts as drawn from this alpha up (a faint dust edge doesn't). */
const DRAWN_ALPHA = 32;

/**
 * The middle of the drawn body across a strip of `frames` frames `frameW`
 * wide: each frame's alpha bounding box, the median of their centres, in
 * frame-local x. Null when nothing is drawn.
 */
export function bodyMiddle(px: Pixels, frameW: number, frames: number): number | null {
  const mids: number[] = [];
  for (let f = 0; f < frames; f++) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let y = 0; y < px.h; y++) {
      for (let x = 0; x < frameW; x++) {
        const gx = f * frameW + x;
        if (gx >= px.w || px.data[(y * px.w + gx) * 4 + 3]! < DRAWN_ALPHA) continue;
        lo = Math.min(lo, x);
        hi = Math.max(hi, x);
      }
    }
    if (hi >= lo) mids.push((lo + hi + 1) / 2);
  }
  if (!mids.length) return null;
  mids.sort((a, b) => a - b);
  return Math.round(mids[Math.floor(mids.length / 2)]!);
}

/**
 * `art` with its feet moved under the body's middle (`middle`, from
 * bodyMiddle of its idle strip), for a unit of three hexes: its feet stand on
 * the middle hex, so the body spreads evenly over all three, and a turn
 * mirrors it in place. The walk's own foot column moves as much.
 */
export function onBodyMiddle(art: FigureArt, middle: number | null): FigureArt {
  if (middle === null || middle === art.footX) return art;
  const dx = middle - art.footX;
  return { ...art, footX: middle, ...(art.walkFootX !== undefined ? { walkFootX: art.walkFootX + dx } : {}) };
}
