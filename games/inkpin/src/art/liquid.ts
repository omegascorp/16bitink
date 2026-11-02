import { LAVA, STONE, WATER, type Grains } from '../logic/particles';

/**
 * Draws the liquids as watercolour shapes with a pen outline. Each grain adds
 * a soft bump to its material's field on a half-resolution grid; where a
 * field passes the threshold the material shows, with an ink line just inside
 * the edge and a deeper wash where it's thick. Only the box the grains cover
 * is redrawn, so the cost follows the amount of liquid, not the board.
 */

/** Field pixels per board px. */
export const LIQUID_RES = 0.5;
/** A grain's bump reaches this far (board px). */
const REACH = 13;
const THRESHOLD = 0.55;
/** Width of the ink edge, in field units above the threshold. */
const EDGE = 0.28;
/** Soft anti-aliased rim below the threshold. */
const SOFT = 0.12;

type Rgb = readonly [number, number, number];
/** Edge ink, shallow wash, deep wash per material. */
const WATER_C: readonly [Rgb, Rgb, Rgb] = [[38, 64, 128], [143, 186, 222], [74, 124, 186]];
const LAVA_C: readonly [Rgb, Rgb, Rgb] = [[110, 28, 20], [236, 120, 40], [252, 214, 92]];
const STONE_C: readonly [Rgb, Rgb, Rgb] = [[38, 49, 106], [160, 150, 136], [118, 108, 98]];
/** How far below the surface the sheen reaches (field px), and its colours. */
const SHEEN = 3;
const SHEEN_WATER: Rgb = [214, 234, 248];
const SHEEN_LAVA: Rgb = [255, 236, 150];
/** The glow of stone that has only just cooled. */
const EMBER: Rgb = [232, 104, 40];
/** Steps over which new stone loses its glow. */
const COOL_STEPS = 260;

export class LiquidPainter {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly w: number;
  private readonly h: number;
  private readonly water: Float32Array;
  private readonly lava: Float32Array;
  private readonly stone: Float32Array;
  private readonly heat: Float32Array;
  private readonly image: ImageData;
  private readonly pixels: Uint32Array;
  /** The box drawn last time, so it can be cleared. */
  private last = { x0: 0, y0: 0, x1: 0, y1: 0 };

  /** Covers the board area from (ox, oy), `bw` × `bh` board px. */
  constructor(private readonly ox: number, private readonly oy: number, bw: number, bh: number) {
    this.w = Math.ceil(bw * LIQUID_RES);
    this.h = Math.ceil(bh * LIQUID_RES);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    const n = this.w * this.h;
    this.water = new Float32Array(n);
    this.lava = new Float32Array(n);
    this.stone = new Float32Array(n);
    this.heat = new Float32Array(n);
    this.image = ctx.createImageData(this.w, this.h);
    this.pixels = new Uint32Array(this.image.data.buffer);
  }

  paint(g: Grains): void {
    const box = this.splat(g);
    // Clear what was drawn last time and isn't covered now.
    const clear = union(this.last, box);
    this.shade(box);
    this.ctx.clearRect(clear.x0, clear.y0, clear.x1 - clear.x0, clear.y1 - clear.y0);
    if (box.x1 > box.x0 && box.y1 > box.y0) this.ctx.putImageData(this.image, 0, 0, box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
    this.last = box;
  }

  /** Adds every liquid grain's bump to its field; returns the box touched, in field px. */
  private splat(g: Grains): { x0: number; y0: number; x1: number; y1: number } {
    const { w, h } = this;
    let x0 = w;
    let y0 = h;
    let x1 = 0;
    let y1 = 0;
    for (let i = 0; i < g.count; i++) {
      const k = g.kind[i];
      if (k !== WATER && k !== LAVA && k !== STONE) continue;
      const fx = (g.x[i]! - this.ox) * LIQUID_RES;
      const fy = (g.y[i]! - this.oy) * LIQUID_RES;
      const r = REACH * LIQUID_RES;
      x0 = Math.min(x0, Math.max(0, Math.floor(fx - r)));
      y0 = Math.min(y0, Math.max(0, Math.floor(fy - r)));
      x1 = Math.max(x1, Math.min(w, Math.ceil(fx + r) + 1));
      y1 = Math.max(y1, Math.min(h, Math.ceil(fy + r) + 1));
    }
    const box = { x0, y0, x1, y1 };
    if (x1 <= x0) return box;
    for (let y = y0; y < y1; y++) {
      const row = y * w;
      this.water.fill(0, row + x0, row + x1);
      this.lava.fill(0, row + x0, row + x1);
      this.stone.fill(0, row + x0, row + x1);
      this.heat.fill(0, row + x0, row + x1);
    }
    const r = REACH * LIQUID_RES;
    const r2 = r * r;
    for (let i = 0; i < g.count; i++) {
      const k = g.kind[i];
      if (k !== WATER && k !== LAVA && k !== STONE) continue;
      const field = k === WATER ? this.water : k === LAVA ? this.lava : this.stone;
      const glow = k === STONE ? Math.max(0, 1 - g.age[i]! / COOL_STEPS) : 0;
      const fx = (g.x[i]! - this.ox) * LIQUID_RES;
      const fy = (g.y[i]! - this.oy) * LIQUID_RES;
      const cx0 = Math.max(0, Math.floor(fx - r));
      const cx1 = Math.min(w - 1, Math.ceil(fx + r));
      const cy0 = Math.max(0, Math.floor(fy - r));
      const cy1 = Math.min(h - 1, Math.ceil(fy + r));
      for (let y = cy0; y <= cy1; y++) {
        const dy = y + 0.5 - fy;
        const row = y * w;
        for (let x = cx0; x <= cx1; x++) {
          const dx = x + 0.5 - fx;
          const d2 = dx * dx + dy * dy;
          if (d2 >= r2) continue;
          const t = 1 - d2 / r2;
          const v = t * t;
          field[row + x] = field[row + x]! + v;
          if (glow > 0) this.heat[row + x] = this.heat[row + x]! + v * glow;
        }
      }
    }
    return box;
  }

  private shade(box: { x0: number; y0: number; x1: number; y1: number }): void {
    const { w, pixels } = this;
    for (let y = box.y0; y < box.y1; y++) {
      const row = y * w;
      for (let x = box.x0; x < box.x1; x++) {
        const i = row + x;
        const fw = this.water[i]!;
        const fl = this.lava[i]!;
        const fs = this.stone[i]!;
        // The strongest material owns the pixel.
        let v = fw;
        let pal = WATER_C;
        let field = this.water;
        if (fl > v) {
          v = fl;
          pal = LAVA_C;
          field = this.lava;
        }
        if (fs > v) {
          v = fs;
          pal = STONE_C;
          field = this.stone;
        }
        if (v < THRESHOLD - SOFT) {
          pixels[i] = 0;
          continue;
        }
        let r: number;
        let gr: number;
        let b: number;
        let a = 255;
        if (v < THRESHOLD) {
          // The soft rim: ink fading out, for an anti-aliased edge.
          [r, gr, b] = pal[0];
          a = Math.round(255 * ((v - (THRESHOLD - SOFT)) / SOFT));
        } else if (v < THRESHOLD + EDGE) {
          [r, gr, b] = pal[0];
        } else {
          // Wash: shallow near the edge, deeper inside; liquids slightly see-through.
          const depth = Math.min(1, (v - THRESHOLD - EDGE) / 1.6);
          const s = pal[1];
          const d = pal[2];
          r = s[0] + (d[0] - s[0]) * depth;
          gr = s[1] + (d[1] - s[1]) * depth;
          b = s[2] + (d[2] - s[2]) * depth;
          if (pal === STONE_C) {
            const hot = Math.min(1, this.heat[i]! / Math.max(0.001, fs));
            r += (EMBER[0] - r) * hot;
            gr += (EMBER[1] - gr) * hot;
            b += (EMBER[2] - b) * hot;
            // Speckles of grit, fixed to the board so they don't crawl.
            if (((x * 73856093) ^ (y * 19349663)) % 23 === 0) {
              r *= 0.6;
              gr *= 0.6;
              b *= 0.7;
            }
          } else {
            // A sheen along the top surface: light catching the wash.
            const above = y >= SHEEN ? field[i - SHEEN * w]! : 0;
            if (above < THRESHOLD) {
              const sheen = pal === WATER_C ? SHEEN_WATER : SHEEN_LAVA;
              r += (sheen[0] - r) * 0.6;
              gr += (sheen[1] - gr) * 0.6;
              b += (sheen[2] - b) * 0.6;
            }
            if (pal === WATER_C) a = 225;
          }
        }
        pixels[i] = (a << 24) | (Math.round(b) << 16) | (Math.round(gr) << 8) | Math.round(r);
      }
    }
  }
}

function union(a: { x0: number; y0: number; x1: number; y1: number }, b: { x0: number; y0: number; x1: number; y1: number }): { x0: number; y0: number; x1: number; y1: number } {
  if (a.x1 <= a.x0) return b;
  if (b.x1 <= b.x0) return a;
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}
