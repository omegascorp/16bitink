import { HEX_CORNERS, HEX_PX, type WorldFit } from './pixelLayout';

/**
 * Pixel-exact drawing for the battle's native 960 × 540 world: whole pixels
 * only, no antialiasing. No Phaser here, so it can be tested on its own.
 */

/** A colour with alpha, each 0–255. */
export type Rgba = readonly [number, number, number, number];

/** Every pixel of an integer line (Bresenham), always walked left to right so an edge two hexes share comes out the same both times. */
export function linePixels(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  if (x1 < x0 || (x1 === x0 && y1 < y0)) [x0, y0, x1, y1] = [x1, y1, x0, y0];
  const out: [number, number][] = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    out.push([x, y]);
    if (x === x1 && y === y1) return out;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += 1;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** A hex's pixels as offsets from its centre: the rim (its six edges) and what lies inside it. */
export interface HexStamp {
  readonly rim: readonly (readonly [number, number])[];
  readonly inside: readonly (readonly [number, number])[];
}

function buildStamp(): HexStamp {
  const rim = new Map<string, [number, number]>();
  HEX_CORNERS.forEach(([ax, ay], i) => {
    const [bx, by] = HEX_CORNERS[(i + 1) % HEX_CORNERS.length]!;
    for (const p of linePixels(ax, ay, bx, by)) rim.set(`${p[0]},${p[1]}`, p);
  });
  const inside: [number, number][] = [];
  for (let dy = -HEX_PX.tip; dy <= HEX_PX.tip; dy++) {
    const xs = [...rim.values()].filter((p) => p[1] === dy).map((p) => p[0]);
    if (xs.length === 0) continue;
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    for (let dx = lo + 1; dx < hi; dx++) if (!rim.has(`${dx},${dy}`)) inside.push([dx, dy]);
  }
  return { rim: [...rim.values()], inside };
}

export const HEX_STAMP: HexStamp = buildStamp();

/** A w × h RGBA pixel buffer, written pixel by pixel (each write replaces what was there). */
export class PixelBuffer {
  readonly data: Uint8ClampedArray;

  constructor(readonly w: number, readonly h: number) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  clear(): void {
    this.data.fill(0);
  }

  put(x: number, y: number, c: Rgba): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = c[3];
  }

  /** A hex centred on (cx, cy): its inside filled with `fill` (if any), its rim in `rim` (if any). */
  hex(cx: number, cy: number, fill: Rgba | null, rim: Rgba | null): void {
    if (fill) for (const [dx, dy] of HEX_STAMP.inside) this.put(cx + dx, cy + dy, fill);
    if (rim) for (const [dx, dy] of HEX_STAMP.rim) this.put(cx + dx, cy + dy, rim);
  }
}

/** 5 × 7 digits, row by row ('1' = ink), as in the art direction's compose.py. */
export const FONT5: Readonly<Record<string, string>> = {
  '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100010001000100011111',
  '3': '01110100010000100110000011000101110', '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110',
  '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000', '8': '01110100011000101110100011000101110',
  '9': '01110100011000101111000010001001100',
};
const GLYPH = { w: 5, h: 7 } as const;
/** Space between the digits and the badge's edge. */
const BADGE_PAD = 2;
const BADGE_INK: Rgba = [255, 250, 235, 255];
const BADGE_EDGE: Rgba = [20, 16, 12, 255];

/** A count badge's colours: its fill and the lighter line along its top. */
export interface BadgeColours {
  readonly fill: Rgba;
  readonly top: Rgba;
}

/** A badge's size for `n`, outline included. */
export function badgeSize(n: number): { w: number; h: number } {
  const digits = String(n).length;
  return { w: digits * (GLYPH.w + 1) - 1 + BADGE_PAD * 2 + 2, h: GLYPH.h + BADGE_PAD * 2 + 2 };
}

/** A troop count drawn as compose.py's draw_badge does: a dark 1px outline, the side's colour, a light top line, 5 × 7 digits. */
export function drawBadge(n: number, colours: BadgeColours): PixelBuffer {
  const { w, h } = badgeSize(n);
  const b = new PixelBuffer(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) b.put(x, y, BADGE_EDGE);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) b.put(x, y, y === 1 ? colours.top : colours.fill);
  [...String(n)].forEach((ch, c) => {
    const bits = FONT5[ch];
    if (!bits) return;
    for (let k = 0; k < bits.length; k++) {
      if (bits[k] !== '1') continue;
      b.put(1 + BADGE_PAD + c * (GLYPH.w + 1) + (k % GLYPH.w), 1 + BADGE_PAD + Math.floor(k / GLYPH.w), BADGE_INK);
    }
  });
  return b;
}

/**
 * The background `src` (w × h RGBA) extended by `m` native pixels each side,
 * by repeating its edge rows and columns outward (never mirrored): the
 * paintings are made larger than the world, so this only covers a screen
 * wider or taller than even the painting.
 */
export function clampExtend(src: Uint8ClampedArray, w: number, h: number, m: WorldFit['margin']): { data: Uint8ClampedArray; w: number; h: number } {
  const ow = w + m.left + m.right;
  const oh = h + m.top + m.bottom;
  const data = new Uint8ClampedArray(ow * oh * 4);
  const clamp = (v: number, n: number): number => Math.min(n - 1, Math.max(0, v));
  for (let y = 0; y < oh; y++) {
    const sy = clamp(y - m.top, h);
    for (let x = 0; x < ow; x++) {
      const i = (sy * w + clamp(x - m.left, w)) * 4;
      const o = (y * ow + x) * 4;
      data[o] = src[i]!;
      data[o + 1] = src[i + 1]!;
      data[o + 2] = src[i + 2]!;
      data[o + 3] = src[i + 3]!;
    }
  }
  return { data, w: ow, h: oh };
}
