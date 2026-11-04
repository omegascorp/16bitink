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

/**
 * `src` shrunk `by` times by averaging each block, weighted by how opaque
 * each pixel is. Softer than shrinkMode but it keeps a busy picture readable
 * at a very small size (the town list's pictures).
 */
export function shrinkSmooth(src: Pixels, by: number): Pixels {
  const w = Math.max(1, Math.floor(src.w / by));
  const h = Math.max(1, Math.floor(src.h / by));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sum = [0, 0, 0, 0];
      for (let dy = 0; dy < by; dy++) {
        for (let dx = 0; dx < by; dx++) {
          const i = ((y * by + dy) * src.w + x * by + dx) * 4;
          const a = src.data[i + 3]!;
          sum[0]! += src.data[i]! * a;
          sum[1]! += src.data[i + 1]! * a;
          sum[2]! += src.data[i + 2]! * a;
          sum[3]! += a;
        }
      }
      if (!sum[3]) continue;
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) out[o + c] = Math.round(sum[c]! / sum[3]!);
      out[o + 3] = Math.round(sum[3]! / (by * by));
    }
  }
  return { data: out, w, h };
}

/**
 * `src` shrunk `by` times keeping it crisp: each block takes its most
 * common colour (near colours counted together, then averaged), kept where
 * at least half the block is opaque. A big picture shrinks into a small
 * sprite that still reads as the same place (the map's town).
 */
export function shrinkMode(src: Pixels, by: number): Pixels {
  const w = Math.max(1, Math.floor(src.w / by));
  const h = Math.max(1, Math.floor(src.h / by));
  const out = new Uint8ClampedArray(w * h * 4);
  const counts = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      counts.clear();
      let opaque = 0;
      for (let dy = 0; dy < by; dy++) {
        for (let dx = 0; dx < by; dx++) {
          const i = ((y * by + dy) * src.w + x * by + dx) * 4;
          if (src.data[i + 3]! < 128) continue;
          opaque++;
          const r = src.data[i]!;
          const g = src.data[i + 1]!;
          const b = src.data[i + 2]!;
          const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
          const c = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
          counts.set(key, { n: c.n + 1, r: c.r + r, g: c.g + g, b: c.b + b });
        }
      }
      if (opaque * 2 < by * by) continue;
      let best = { n: 0, r: 0, g: 0, b: 0 };
      for (const c of counts.values()) if (c.n > best.n) best = c;
      const o = (y * w + x) * 4;
      out[o] = Math.round(best.r / best.n);
      out[o + 1] = Math.round(best.g / best.n);
      out[o + 2] = Math.round(best.b / best.n);
      out[o + 3] = 255;
    }
  }
  return { data: out, w, h };
}

/** `src` cut to its opaque pixels. */
export function inkBox(src: Pixels): { l: number; t: number; w: number; h: number } | null {
  let l = src.w;
  let t = src.h;
  let r = -1;
  let b = -1;
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      if (src.data[(y * src.w + x) * 4 + 3]! < 128) continue;
      l = Math.min(l, x);
      t = Math.min(t, y);
      r = Math.max(r, x);
      b = Math.max(b, y);
    }
  }
  return r < l ? null : { l, t, w: r - l + 1, h: b - t + 1 };
}

/** `src` cut down to its ink. */
export function cropToInk(src: Pixels): Pixels {
  const box = inkBox(src);
  if (!box) return { data: new Uint8ClampedArray(4), w: 1, h: 1 };
  const { l, t, w, h } = box;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) out.set(src.data.subarray(((t + y) * src.w + l) * 4, ((t + y) * src.w + l + w) * 4), y * w * 4);
  return { data: out, w, h };
}

const PUFF_LIT: Rgba = [222, 220, 214, 255];
const PUFF_MID: Rgba = [186, 184, 180, 255];
const PUFF_DARK: Rgba = [146, 144, 142, 255];

/** A puff of radius `r`: a disc lit from the top left, shaded down to the right. */
export function puffPixels(r: number): PixelBuffer {
  const d = r * 2 + 1;
  const b = new PixelBuffer(d, d);
  for (let y = 0; y < d; y++) {
    for (let x = 0; x < d; x++) {
      const dx = x - r;
      const dy = y - r;
      if (dx * dx + dy * dy > r * r + r * 0.6) continue;
      const light = -(dx + dy) / Math.max(1, r);
      b.put(x, y, light > 0.35 ? PUFF_LIT : light < -0.35 ? PUFF_DARK : PUFF_MID);
    }
  }
  return b;
}
