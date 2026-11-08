import { makeCanvas } from '../../../src/art/pen';
import { blurred } from './rock';
import { fbm, hex, mixRgb, ridged, type Rgb, sstep } from './noise';

/**
 * The Zagros behind everything: a real height field of long parallel folds of
 * bare limestone, gullied and bedded, lit by a low sun and drawn in true
 * perspective, ridge behind ridge paling into the haze; a dawn and, for
 * another day, a clear noon. From the rock it is seen out of focus.
 */

export const VIEW = { w: 1960, h: 2300 } as const;

export type Sky = 'dawn' | 'noon';

interface Tones {
  readonly top: Rgb;
  readonly mid: Rgb;
  readonly low: Rgb;
  readonly glow: Rgb;
  readonly lit: Rgb;
  readonly shade: Rgb;
  readonly haze: Rgb;
  readonly sun: readonly [number, number, number];
  readonly glowAt: number;
  readonly cloud: Rgb;
}

const TONES: Readonly<Record<Sky, Tones>> = {
  dawn: { top: hex('#6f8db0'), mid: hex('#e0b09a'), low: hex('#fbdcae'), glow: hex('#fff2cf'), lit: hex('#f4cb98'), shade: hex('#6f5a6c'), haze: hex('#f4cfb2'), sun: [-0.86, 0.2, 0.28], glowAt: 1, cloud: hex('#fde0bf') },
  noon: { top: hex('#3f8ad0'), mid: hex('#8fc4e8'), low: hex('#dcecf2'), glow: hex('#ffffff'), lit: hex('#efe6d2'), shade: hex('#7e8799'), haze: hex('#cfe0ea'), sun: [0.3, 0.8, 0.3], glowAt: 0.2, cloud: hex('#ffffff') },
};

const N = 1024;
const SPAN = 7;
let field: Float32Array | null = null;

/** The land: parallel folds with bare gullied flanks. */
function land(): Float32Array {
  const out = new Float32Array(N * N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = (i / N) * SPAN;
      const z = (j / N) * SPAN;
      const warp = fbm(x * 0.45, z * 0.45, 3);
      const fold = 0.5 + 0.5 * Math.sin((z + 0.24 * x + 1.1 * warp) * 7.2);
      const gullies = ridged(x * 1.9, z * 1.9, 6);
      out[j * N + i] = fold ** 1.5 * (0.5 + 0.5 * gullies) + 0.2 * gullies + 0.03 * fbm(x * 12, z * 12, 3);
    }
  }
  return out;
}

const heightAt = (f: Float32Array, i: number, j: number): number => f[(((j % N) + N) % N) * N + (((i % N) + N) % N)]!;

function shading(f: Float32Array, sun: Tones['sun']): Float32Array {
  const out = new Float32Array(N * N);
  const l = Math.hypot(sun[0], sun[1], sun[2]);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const dx = (heightAt(f, i + 1, j) - heightAt(f, i - 1, j)) * 62;
      const dz = (heightAt(f, i, j + 1) - heightAt(f, i, j - 1)) * 62;
      const nl = 1 / Math.hypot(dx, 1, dz);
      out[j * N + i] = Math.max(0, (-dx * sun[0] + sun[1] - dz * sun[2]) * nl) / l;
    }
  }
  return out;
}

const HORIZON = 1000;

/** Column by column from near to far: each piece of land that shows above what is nearer is painted, paling with distance. */
function terrain(ctx: CanvasRenderingContext2D, T: Tones): void {
  field ??= land();
  const shade = shading(field, T.sun);
  const { w, h } = VIEW;
  const img = ctx.createImageData(w, h - HORIZON + 260);
  const data = img.data;
  const top = HORIZON - 260;
  const lerp2 = (f: Float32Array, fx: number, fz: number): number => {
    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    const u = fx - ix;
    const v = fz - iz;
    const a0 = heightAt(f, ix, iz);
    const b0 = heightAt(f, ix + 1, iz);
    const a1 = heightAt(f, ix, iz + 1);
    const b1 = heightAt(f, ix + 1, iz + 1);
    return a0 + (b0 - a0) * u + (a1 - a0) * v + (a0 - b0 - a1 + b1) * u * v;
  };
  for (let i = 0; i < w; i++) {
    const a = (i / w - 0.5) * 1.5;
    let low: number = h;
    let z = 0.52;
    while (z < 26 && low > top) {
      const wx = 2.2 + a * z;
      const fx = (wx / SPAN) * N;
      const fz = ((0.6 + z) / SPAN) * N;
      const e = lerp2(field, fx, fz);
      const sy = Math.round(HORIZON + ((1.05 - e) / z) * 1250 - 30);
      if (sy < low) {
        const d = lerp2(shade, fx, fz);
        const haze = 1 - Math.exp(-z * 0.16);
        const beds = 1 + 0.08 * Math.sin(e * 74 + wx * 3);
        const rock = mixRgb(T.shade, T.lit, sstep(0.08, 0.7, d) * beds);
        const c = mixRgb(rock, T.haze, Math.min(1, haze * 1.03));
        for (let y = Math.max(top, sy); y < low; y++) {
          const o = ((y - top) * w + i) * 4;
          data[o] = c[0];
          data[o + 1] = c[1];
          data[o + 2] = c[2];
          data[o + 3] = 255;
        }
        low = sy;
      }
      z *= 1.0006;
    }
  }
  const { canvas, ctx: t } = makeCanvas(w, img.height);
  t.putImageData(img, 0, 0);
  ctx.save();
  ctx.filter = 'blur(0.7px)';
  ctx.drawImage(canvas, 0, top);
  ctx.restore();
}

function sky(ctx: CanvasRenderingContext2D, T: Tones, kind: Sky): void {
  const w = 700;
  const h = 620;
  const { canvas, ctx: c } = makeCanvas(w, h);
  const img = c.createImageData(w, h);
  const sunX = 0.33 * w;
  const sunY = 0.86 * h;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const v = j / h;
      const g = v < 0.6 ? mixRgb(T.top, T.mid, v / 0.6) : mixRgb(T.mid, T.low, (v - 0.6) / 0.4);
      const near = Math.exp(-Math.hypot(i - sunX, (j - sunY) * 1.4) / 120) * T.glowAt;
      const cloud = sstep(0.54, 0.76, fbm(i * 0.006, j * 0.02, 5)) * (kind === 'dawn' ? 0.5 : 0.8);
      const o = (j * w + i) * 4;
      const p = mixRgb(mixRgb(g, T.glow, Math.min(1, near * 1.5)), T.cloud, cloud);
      img.data[o] = p[0];
      img.data[o + 1] = p[1];
      img.data[o + 2] = p[2];
      img.data[o + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, VIEW.w, HORIZON + 60);
}

function paint(kind: Sky): HTMLCanvasElement {
  const T = TONES[kind];
  const { canvas, ctx } = makeCanvas(VIEW.w, VIEW.h);
  sky(ctx, T, kind);
  terrain(ctx, T);
  return canvas;
}

interface Baked {
  readonly sharp: HTMLCanvasElement;
  readonly soft: HTMLCanvasElement;
}
const cache = new Map<Sky, Baked>();

export function zagros(kind: Sky): Baked {
  const have = cache.get(kind);
  if (have) return have;
  const sharp = paint(kind);
  const made = { sharp, soft: blurred(sharp, 11) };
  cache.set(kind, made);
  return made;
}
