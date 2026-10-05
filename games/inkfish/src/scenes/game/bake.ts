import type Phaser from 'phaser';
import { makeCanvas } from '../../art/pen';

/**
 * Static pen work baked into textures once per level. A Phaser Graphics object
 * is re-triangulated on every frame it is drawn, which for thousands of sand
 * dots is real CPU time on an old phone; a baked image costs one quad.
 *
 * A band is cut into power-of-two chunks: small enough for any GPU's texture
 * limit, and power-of-two so the GPU builds mipmaps and the stipple stays
 * clean when the camera pulls back.
 */
const CHUNK_W = 1024;

/** Pixels per world unit to bake a band `height` world units tall: at least `res`, raised to fill a power-of-two texture. */
function bandRes(height: number, res: number): { res: number; texH: number } {
  const texH = 2 ** Math.ceil(Math.log2(height * res));
  return { res: texH / height, texH };
}

export interface Band {
  /** World x where the band starts and ends. */
  readonly x0: number;
  readonly x1: number;
  /** World y of the band's top edge, and its height. */
  readonly top: number;
  readonly height: number;
}

/**
 * Draws `draw` (in world coordinates) into chunked textures covering `band`
 * and places them at `depth`. `draw` is called once per chunk with the chunk's
 * world x range, so it can skip what lies outside. Keys start with `prefix`;
 * any textures left from an earlier level under it are replaced.
 */
export function bakeBand(
  scene: Phaser.Scene, prefix: string, band: Band, res: number, depth: number,
  draw: (ctx: CanvasRenderingContext2D, fromX: number, toX: number) => void,
): Phaser.GameObjects.Image[] {
  const fit = bandRes(band.height, res);
  const chunkWorld = CHUNK_W / fit.res;
  const images: Phaser.GameObjects.Image[] = [];
  for (let i = 0, x = band.x0; x < band.x1; i++, x += chunkWorld) {
    const key = `${prefix}-${i}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const { canvas, ctx } = makeCanvas(CHUNK_W, fit.texH);
    ctx.setTransform(fit.res, 0, 0, fit.res, -x * fit.res, -band.top * fit.res);
    draw(ctx, x, x + chunkWorld);
    scene.textures.addCanvas(key, canvas);
    images.push(scene.add.image(x, band.top, key).setOrigin(0).setScale(1 / fit.res).setDepth(depth));
  }
  // They belong to this level alone: free them (and their GPU memory) when it ends.
  // (The scene destroys the images itself; the textures are the game's and stay unless removed.)
  const keys = images.map((img) => img.texture.key);
  scene.events.once('shutdown', () => {
    for (const key of keys) if (scene.textures.exists(key)) scene.textures.remove(key);
  });
  return images;
}

/** A Phaser colour (0xrrggbb) with alpha, as a canvas style. */
export function rgba(color: number, alpha: number): string {
  return `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${alpha})`;
}

/** Strokes a polyline. */
export function strokeLine(ctx: CanvasRenderingContext2D, pts: readonly (readonly [number, number])[], width: number, color: number, alpha: number): void {
  if (pts.length < 2) return;
  ctx.lineWidth = width;
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.stroke();
}

/**
 * The per-corner multiply tint that makes plain paper look as if a wash of
 * `color` at `alpha` were laid over it: paper·(1 − a) + color·a = paper·tint.
 * Exact for the paper's base colour; its faint grain keeps its contrast.
 */
export function washTint(paper: number, color: number, alpha: number): number {
  const channel = (shift: number): number => {
    const p = (paper >> shift) & 255;
    const c = (color >> shift) & 255;
    return Math.round(Math.min(1, 1 - alpha + (alpha * c) / p) * 255);
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
