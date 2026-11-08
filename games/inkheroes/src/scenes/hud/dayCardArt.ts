import type { Rim } from '../battle/pixelFrames';
import { PixelBuffer, type Rgba } from '../battle/pixelRaster';

const TROUGH: Rgba = [20, 13, 8, 255];
const TROUGH_FLOOR: Rgba = [64, 47, 33, 255];
const TROUGH_LIT: Rgba = [88, 66, 46, 255];

/** A w × h meter (a gold bar, the mana gauge): a sunk trough, filled to `share` in `rim`'s tones, lit along the top. */
export function drawMeter(w: number, h: number, share: number, rim: Rim): PixelBuffer {
  const b = new PixelBuffer(w, h);
  const fill = Math.round((w - 2) * Math.max(0, Math.min(1, share)));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      if (edge) {
        b.put(x, y, TROUGH);
        continue;
      }
      if (x - 1 >= fill) {
        b.put(x, y, y === h - 2 ? TROUGH_LIT : TROUGH_FLOOR);
        continue;
      }
      b.put(x, y, y === 1 ? rim.light : y === h - 2 ? rim.dark : rim.mid);
    }
  }
  return b;
}
