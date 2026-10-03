import type { Light } from './fish/kit';

/**
 * Light for the deep zones. Glow layers are drawn as separate textures and
 * shown on top of their ink drawing with additive blending: on dark water
 * they read as light, while the ink drawing underneath stays untouched.
 */

/** Side of the plain soft-glow texture, px. */
export const GLOW_TEX = 128;

/** A white dot fading to nothing: tinted and scaled for halos, marine snow and the player's light. */
export function drawSoftGlow(ctx: CanvasRenderingContext2D): void {
  const c = GLOW_TEX / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, GLOW_TEX, GLOW_TEX);
}

/** One halo: a bright core in `color` fading out over `reach` px. */
export function halo(ctx: CanvasRenderingContext2D, x: number, y: number, reach: number, color: string, strength = 1): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, reach);
  g.addColorStop(0, withAlpha(color, 0.95 * strength));
  g.addColorStop(0.18, withAlpha(color, 0.6 * strength));
  g.addColorStop(0.5, withAlpha(color, 0.16 * strength));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - reach, y - reach, reach * 2, reach * 2);
  ctx.restore();
}

/** The glow layer for a fish: a halo around each of its lights, sized to the light. */
export function drawFishGlow(ctx: CanvasRenderingContext2D, lights: readonly Light[]): void {
  for (const l of lights) halo(ctx, l.x, l.y, Math.max(14, l.r * 8), l.color, 0.9);
}

/** '#rrggbb' with an alpha, as an rgba() string. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
