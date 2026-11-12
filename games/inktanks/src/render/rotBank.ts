import type Phaser from 'phaser';
import { pixelsOf, putPixels, rotateFrom, upscale8 } from './rotsprite';

/**
 * Turning the straight-down part sprites. Two modes, for the stress test to
 * decide between:
 *  - 'free': the GPU turns the one texture (nearest sampling);
 *  - 'rot32': RotSprite, 32 steps precomputed per texture actually in use,
 *    built on first use into an 8 × 4 sheet.
 * Also makes team-tinted hulls from a hull and its stripe mask.
 */
export type RotMode = 'free' | 'rot32';
export const STEPS = 32;
const COLS = 8;

function canvasOf(scene: Phaser.Scene, key: string): HTMLCanvasElement {
  const img = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return c;
}

export class RotBank {
  /** Bytes of textures this bank made (RGBA, as uploaded to the GPU). */
  bytes = 0;
  sheets = 0;
  buildMs = 0;

  constructor(private readonly scene: Phaser.Scene, public mode: RotMode) {}

  /** A hull with its stripe mask tinted to `colour`, kept as `tint:<key>:<hex>`. */
  tinted(key: string, mask: string | null, colour: number): string {
    if (!mask || !this.scene.textures.exists(mask)) return key;
    const out = `tint:${key}:${colour.toString(16)}`;
    if (this.scene.textures.exists(out)) return out;
    const part = canvasOf(this.scene, key);
    const m = canvasOf(this.scene, mask).getContext('2d')!.getImageData(0, 0, part.width, part.height).data;
    const ctx = part.getContext('2d')!;
    const img = ctx.getImageData(0, 0, part.width, part.height);
    const d = img.data;
    const r = (colour >> 16) & 255;
    const g = (colour >> 8) & 255;
    const b = colour & 255;
    for (let i = 0; i < d.length; i += 4) {
      if (m[i + 3]! < 128 || m[i]! < 128) continue;
      const lum = (d[i]! + d[i + 1]! + d[i + 2]!) / 3 / 128;
      d[i] = Math.min(255, r * lum);
      d[i + 1] = Math.min(255, g * lum);
      d[i + 2] = Math.min(255, b * lum);
    }
    ctx.putImageData(img, 0, 0);
    this.scene.textures.addCanvas(out, part);
    this.bytes += part.width * part.height * 4;
    return out;
  }

  /** Builds the 32-step sheet for a texture now (to warm up the parts in a match). */
  warm(key: string): void {
    const out = `rot:${key}`;
    if (this.scene.textures.exists(out) || !this.scene.textures.exists(key)) return;
    const t0 = performance.now();
    const c = canvasOf(this.scene, key);
    const { width: w, height: h } = c;
    const sheet = document.createElement('canvas');
    sheet.width = w * COLS;
    sheet.height = h * Math.ceil(STEPS / COLS);
    const big = upscale8(pixelsOf(c));
    for (let i = 0; i < STEPS; i++) putPixels(sheet, rotateFrom(big, w, h, (i / STEPS) * Math.PI * 2), (i % COLS) * w, Math.floor(i / COLS) * h);
    const tex = this.scene.textures.addCanvas(out, sheet)!;
    for (let i = 0; i < STEPS; i++) tex.add(String(i), 0, (i % COLS) * w, Math.floor(i / COLS) * h, w, h);
    this.bytes += sheet.width * sheet.height * 4;
    this.sheets++;
    this.buildMs += performance.now() - t0;
  }

  /** Shows `key` on `img` turned to the world angle (0 = east; the art faces north). */
  apply(img: Phaser.GameObjects.Image, key: string, angle: number): void {
    const a = angle + Math.PI / 2;
    if (this.mode === 'free') {
      if (img.texture.key !== key) img.setTexture(key);
      img.setRotation(a);
      return;
    }
    this.warm(key);
    const step = ((Math.round((a / (Math.PI * 2)) * STEPS) % STEPS) + STEPS) % STEPS;
    img.setTexture(`rot:${key}`, String(step)).setRotation(0);
  }
}

/** A rough GPU memory figure for every texture in the scene's manager, MB. */
export function textureMegabytes(scene: Phaser.Scene): number {
  let bytes = 0;
  for (const key of scene.textures.getTextureKeys()) {
    const src = scene.textures.get(key).source[0];
    if (src) bytes += src.width * src.height * 4;
  }
  return bytes / (1024 * 1024);
}
