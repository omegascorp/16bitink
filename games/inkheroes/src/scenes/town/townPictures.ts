import { PixelBuffer, type Rgba } from '../battle/pixelRaster';
import type { Pixels } from '../battle/pixelScenery';

/**
 * Small pictures for the town's screens, drawn at the art's pixel: a
 * sprite shrunk by a whole factor (each block averaged, its alpha all or
 * nothing) and stood on a backdrop. No Phaser here, so it can be tested.
 */

/** `src` shrunk `by` times: each by × by block averaged over its opaque pixels, kept where at least half is opaque. */
export function shrinkPixels(src: Pixels, by: number): Pixels {
  if (by <= 1) return src;
  const w = Math.max(1, Math.floor(src.w / by));
  const h = Math.max(1, Math.floor(src.h / by));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let n = 0;
      const sum = [0, 0, 0];
      for (let dy = 0; dy < by; dy++) {
        for (let dx = 0; dx < by; dx++) {
          const i = ((y * by + dy) * src.w + x * by + dx) * 4;
          if (src.data[i + 3]! < 128) continue;
          n++;
          for (let c = 0; c < 3; c++) sum[c]! += src.data[i + c]!;
        }
      }
      if (n * 2 < by * by) continue;
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) out[o + c] = Math.round(sum[c]! / n);
      out[o + 3] = 255;
    }
  }
  return { data: out, w, h };
}

/** The smallest whole factor that fits a `w` × `h` sprite in a `boxW` × `boxH` box. */
export function fitFactor(w: number, h: number, boxW: number, boxH: number): number {
  return Math.max(1, Math.ceil(w / boxW), Math.ceil(h / boxH));
}

/** `back` (cropped to w × h from its top-left) with `sprite` standing on it, its feet `foot` px above the bottom, centred. */
export function standOn(back: Pixels, sprite: Pixels, w: number, h: number, foot: number, flip = false): PixelBuffer {
  const out = new PixelBuffer(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * back.w + x) * 4;
      if (x < back.w && y < back.h) out.put(x, y, [back.data[i]!, back.data[i + 1]!, back.data[i + 2]!, 255]);
    }
  }
  const ox = Math.floor((w - sprite.w) / 2);
  const oy = h - foot - sprite.h;
  for (let y = 0; y < sprite.h; y++) {
    for (let x = 0; x < sprite.w; x++) {
      const sx = flip ? sprite.w - 1 - x : x;
      const i = (y * sprite.w + sx) * 4;
      if (sprite.data[i + 3]! < 128) continue;
      const px = ox + x;
      const py = oy + y;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const c: Rgba = [sprite.data[i]!, sprite.data[i + 1]!, sprite.data[i + 2]!, 255];
      out.put(px, py, c);
    }
  }
  return out;
}
