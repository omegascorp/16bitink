import { createRng } from '../logic/rng';
import { ART_RES, BASALT, BASALT_DARK, BASALT_LIGHT, INK, MOSS, ROCK, ROCK_DARK } from './palette';
import { ellipse, makeCanvas, Pen } from './pen';
import { mix, rgba } from './wash';

/**
 * A temple boulder: a rough round stone with cracks and a cap of moss,
 * centred. It turns as it rolls. In the volcano it's basalt instead: dark,
 * pitted with gas holes, and bare (nothing grows on it there).
 */
export const BOULDER_FRAME = { w: 64, h: 64 } as const;

export function paintBoulder(r: number, basalt = false): HTMLCanvasElement {
  const [light, mid, dark] = basalt ? [BASALT_LIGHT, BASALT, BASALT_DARK] : [ROCK, ROCK, ROCK_DARK];
  const { canvas, ctx } = makeCanvas(BOULDER_FRAME.w * ART_RES, BOULDER_FRAME.h * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(BOULDER_FRAME.w / 2, BOULDER_FRAME.h / 2);
  const pen = new Pen(ctx, 61, 0.5);
  const rng = createRng(7);
  const shape = ellipse(0, 0, r, r, 36).map((p, i) => {
    const k = 1 + (Math.sin(i * 1.7) * 0.025 + (rng() - 0.5) * 0.03);
    return { x: p.x * k, y: p.y * k };
  });
  const g = ctx.createRadialGradient(-r * 0.4, -r * 0.45, r * 0.1, 0, 0, r * 1.15);
  g.addColorStop(0, mix(light, '#ffffff', basalt ? 0.2 : 0.35));
  g.addColorStop(0.55, mid);
  g.addColorStop(1, mix(dark, basalt ? '#120e16' : '#3a3028', 0.35));
  ctx.fillStyle = g;
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.clipped(shape, () => {
    // Pits and a few chips, then moss on one side.
    for (let i = 0; i < (basalt ? 26 : 14); i++) pen.dot((rng() - 0.5) * r * 1.6, (rng() - 0.5) * r * 1.6, 0.8 + rng() * 1.4, rgba(basalt ? '#17121c' : ROCK_DARK, 0.7));
    pen.hatch(shape, 4, 0.9, 0.7, { color: INK, alpha: basalt ? 0.3 : 0.18 });
    if (basalt) {
      // A lit rim on the top left: the dark stone still has to read as round.
      pen.hair(ellipse(0, 0, r - 2.5, r - 2.5, 36).slice(16, 26), 1.6, mix(BASALT_LIGHT, '#ffffff', 0.35), 0.6);
      return;
    }
    for (let i = 0; i < 9; i++) {
      const a = -2.2 + rng() * 1.2;
      const d = r * (0.55 + rng() * 0.4);
      pen.dot(Math.cos(a) * d, Math.sin(a) * d, 2.5 + rng() * 2.5, rgba(MOSS, 0.75));
    }
  });
  // Two cracks.
  pen.hair([{ x: -r * 0.2, y: -r * 0.9 }, { x: -r * 0.05, y: -r * 0.45 }, { x: -r * 0.25, y: -r * 0.1 }], 1, INK, 0.7);
  pen.hair([{ x: r * 0.5, y: r * 0.3 }, { x: r * 0.2, y: r * 0.45 }, { x: r * 0.25, y: r * 0.8 }], 0.9, INK, 0.6);
  pen.stroke([...shape, shape[0]!], 1.6, INK, 0.95);
  return canvas;
}
