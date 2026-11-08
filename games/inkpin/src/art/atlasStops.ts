import { GOLD, GOLD_DARK, GOLD_LIGHT, INK } from './palette';
import { ellipse, makeCanvas, Pen } from './pen';
import { mix, rgba } from './wash';

/** A level's stop on the Atlas: a parchment medallion, a gold coin once won, a faded one before it's reached. */
export type StopKind = 'paper' | 'gold' | 'faded';

/** Texture px per world px for the stops. */
export const STOP_RES = 2;

/** Paints a stop of radius r, centred in a square canvas with room for its shadow. */
export function paintStop(kind: StopKind, r: number): HTMLCanvasElement {
  const size = Math.ceil(r * 2 + 16);
  const { canvas, ctx } = makeCanvas(size * STOP_RES, size * STOP_RES);
  ctx.scale(STOP_RES, STOP_RES);
  ctx.translate(size / 2, size / 2);
  const pen = new Pen(ctx, kind === 'gold' ? 71 : kind === 'paper' ? 73 : 79, 0.4);
  // A soft shadow down and to the right, as if it sat on the page.
  const sh = ctx.createRadialGradient(3, 5, r * 0.6, 3, 5, r * 1.15);
  sh.addColorStop(0, 'rgba(61,50,38,0.3)');
  sh.addColorStop(1, 'rgba(61,50,38,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  const disc = ellipse(0, 0, r, r, 40);
  const fill = (inner: string, mid: string, outer: string): void => {
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, inner);
    g.addColorStop(0.6, mid);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  };
  if (kind === 'gold') {
    fill(GOLD_LIGHT, GOLD, GOLD_DARK);
    // An embossed rim and a shine.
    pen.circle(0, 0, r * 0.8, 1.2, rgba(GOLD_DARK, 0.9));
    pen.hair(ellipse(0, 0, r * 0.78, r * 0.78, 30).slice(16, 27), 1.4, rgba('#fff6d0', 0.9));
    ctx.fillStyle = rgba('#ffffff', 0.45);
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
    ctx.fill();
    pen.stroke([...disc, disc[0]!], 1.8, INK, 0.95);
  } else if (kind === 'paper') {
    fill('#fffaf0', '#f1e6c9', mix('#e2d0a6', '#a88a5a', 0.3));
    pen.circle(0, 0, r * 0.8, 1, rgba(INK, 0.45));
    pen.stroke([...disc, disc[0]!], 2, INK, 0.95);
  } else {
    fill('#efe8d8', '#e2d9c4', '#cfc4ab');
    pen.stroke([...disc, disc[0]!], 1.4, '#8a8578', 0.8);
  }
  return canvas;
}
