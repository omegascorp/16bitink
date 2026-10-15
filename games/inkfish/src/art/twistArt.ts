/** Darkness overlay texture size; the clear hole is DARK_HOLE of it, radius-wise. */
export const DARK_TEX = 1024;
export const DARK_HOLE = 0.08;

/** A sheet of ink with a soft clear hole in the middle: the "lights out" view. */
export function drawDarkness(ctx: CanvasRenderingContext2D): void {
  const c = DARK_TEX / 2;
  const hole = DARK_TEX * DARK_HOLE;
  const g = ctx.createRadialGradient(c, c, hole * 0.7, c, c, hole * 1.25);
  g.addColorStop(0, 'rgba(20,18,28,0)');
  g.addColorStop(0.55, 'rgba(20,18,28,0.75)');
  g.addColorStop(1, 'rgba(20,18,28,0.96)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, DARK_TEX, DARK_TEX);
}
