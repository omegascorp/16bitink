import { PixelBuffer, type Rgba } from '../battle/pixelRaster';

/**
 * The game's name as a pixel-art wordmark: the pixel font's letters blown
 * up `scale` times into blocks, then shaded at the art's own pixel (a gold
 * fall from a pale top to a bronze foot, a lit top edge on every stroke), a
 * dark outline and a drop shadow. No Phaser here, so it can be tested.
 */

const OUTLINE = 2;
const SHADOW = 3;
const EDGE: Rgba = [26, 16, 10, 255];
const SHADOW_INK: Rgba = [26, 16, 10, 150];
const LIT: Rgba = [255, 244, 196, 255];
/** Top to bottom of a letter. */
const FALL: readonly Rgba[] = [[252, 226, 140, 255], [240, 196, 92, 255], [214, 152, 58, 255], [164, 98, 36, 255]];

/** `mask` holds the letters (any opaque pixel is ink); the result is the wordmark. */
export function drawWordmark(mask: { data: Uint8ClampedArray; w: number; h: number }, scale: number): PixelBuffer {
  const ink = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < mask.w && y < mask.h && mask.data[(y * mask.w + x) * 4 + 3]! >= 128;
  // The letters' rows, so the gold falls across the letter height rather than the buffer's.
  let top = mask.h;
  let bottom = 0;
  for (let y = 0; y < mask.h; y++) for (let x = 0; x < mask.w; x++) if (ink(x, y)) {
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  const pad = OUTLINE;
  const w = mask.w * scale + pad * 2;
  const h = mask.h * scale + pad * 2 + SHADOW;
  const solid = (x: number, y: number): boolean => {
    const mx = Math.floor((x - pad) / scale);
    const my = Math.floor((y - pad) / scale);
    return x >= pad && y >= pad && ink(mx, my);
  };
  const near = (x: number, y: number, r: number): boolean => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (solid(x + dx, y + dy)) return true;
    return false;
  };
  const out = new PixelBuffer(w, h);
  const span = Math.max(1, (bottom - top + 1) * scale);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) {
        const t = (y - pad - top * scale) / span;
        const c = !solid(x, y - 1) ? LIT : FALL[Math.min(FALL.length - 1, Math.max(0, Math.floor(t * FALL.length)))]!;
        out.put(x, y, c);
      } else if (near(x, y, OUTLINE)) out.put(x, y, EDGE);
      else if (near(x, y - SHADOW, OUTLINE)) out.put(x, y, SHADOW_INK);
    }
  }
  return out;
}
