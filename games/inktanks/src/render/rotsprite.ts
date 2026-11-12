/**
 * RotSprite-style rotation for pixel art: the sprite is blown up 8x with
 * Scale2x three times (which rounds diagonal edges instead of making
 * staircases), turned, and sampled back down at each native pixel's centre.
 * Compared with turning the native pixels directly, lines stay one pixel
 * thick and edges don't break up into single loose pixels.
 *
 * Pixels are packed RGBA in a Uint32Array (little-endian: alpha in the top byte).
 */
export interface Pixels {
  readonly w: number;
  readonly h: number;
  readonly px: Uint32Array;
}

/** How far apart two colours may be (sum over R, G, B) and still count as the same for Scale2x. */
const TOLERANCE = 40;

function same(a: number, b: number): boolean {
  if (a === b) return true;
  const aa = a >>> 24;
  const ba = b >>> 24;
  if (aa < 128 || ba < 128) return aa < 128 && ba < 128;
  const d = Math.abs((a & 255) - (b & 255)) + Math.abs(((a >>> 8) & 255) - ((b >>> 8) & 255)) + Math.abs(((a >>> 16) & 255) - ((b >>> 16) & 255));
  return d <= TOLERANCE;
}

/** One Scale2x pass: each pixel becomes four, taking a neighbour's colour where two neighbours agree across a corner. */
export function scale2x(src: Pixels): Pixels {
  const { w, h, px } = src;
  const W = w * 2;
  const out = new Uint32Array(W * h * 2);
  const at = (x: number, y: number): number => px[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = at(x, y);
      const a = at(x, y - 1);
      const b = at(x + 1, y);
      const c = at(x - 1, y);
      const d = at(x, y + 1);
      const i = y * 2 * W + x * 2;
      out[i] = same(c, a) && !same(c, d) && !same(a, b) ? a : p;
      out[i + 1] = same(a, b) && !same(a, c) && !same(b, d) ? b : p;
      out[i + W] = same(d, c) && !same(d, b) && !same(c, a) ? c : p;
      out[i + W + 1] = same(b, d) && !same(b, a) && !same(d, c) ? d : p;
    }
  }
  return { w: W, h: h * 2, px: out };
}

/** The 8x image RotSprite turns. */
export function upscale8(src: Pixels): Pixels {
  return scale2x(scale2x(scale2x(src)));
}

/**
 * The native-size sprite turned clockwise by `angle` about its centre,
 * from the 8x image `big` (of a w x h sprite).
 */
export function rotateFrom(big: Pixels, w: number, h: number, angle: number): Pixels {
  const out = new Uint32Array(w * h);
  const k = big.w / w;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  for (let oy = 0; oy < h; oy++) {
    for (let ox = 0; ox < w; ox++) {
      const dx = ox + 0.5 - w / 2;
      const dy = oy + 0.5 - h / 2;
      const sx = Math.floor((c * dx + s * dy + w / 2) * k);
      const sy = Math.floor((-s * dx + c * dy + h / 2) * k);
      if (sx >= 0 && sy >= 0 && sx < big.w && sy < big.h) out[oy * w + ox] = big.px[sy * big.w + sx]!;
    }
  }
  return { w, h, px: out };
}

export function pixelsOf(canvas: HTMLCanvasElement): Pixels {
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
  return { w: canvas.width, h: canvas.height, px: new Uint32Array(data.data.buffer.slice(0)) };
}

/** Draws pixels onto a canvas at (x, y). */
export function putPixels(canvas: HTMLCanvasElement, p: Pixels, x = 0, y = 0): void {
  const bytes = new Uint8ClampedArray(p.px.length * 4);
  bytes.set(new Uint8Array(p.px.buffer, p.px.byteOffset, p.px.byteLength));
  const img = new ImageData(bytes, p.w, p.h);
  canvas.getContext('2d')!.putImageData(img, x, y);
}
