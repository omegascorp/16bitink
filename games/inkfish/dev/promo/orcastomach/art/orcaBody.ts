import { INK, makeCanvas, Pen, type Pt } from '../../../../src/art/pen';
import { curve, dab, path, softLine, smoothLoop } from '../../seal/art/paint';

/**
 * The orca's body seen from the front, falling away below and behind the
 * close-up head: black flanks, the white throat narrowing down the chest, the
 * two big rounded paddle flippers, all melting into the water with distance.
 * Baked once in the head's units (see orcaHead.ts).
 */

export const BOX = { x0: -860, x1: 860, y0: 120, y1: 2500 } as const;
export const RES = 0.8;

const BLACK = '#172033';
const IVORY = '#f3ead4';

const lerpAt = (t: readonly (readonly [number, number])[], y: number): number => {
  const i = Math.max(0, t.findIndex(([a]) => a > y) - 1);
  const [a, p] = t[i]!;
  const [b, q] = t[Math.min(t.length - 1, i + 1)]!;
  const u = Math.max(0, Math.min(1, (y - a) / (b - a || 1)));
  return p + (q - p) * (u * u * (3 - 2 * u));
};

const HALF: readonly (readonly [number, number])[] = [[120, 470], [500, 470], [900, 350], [1300, 250], [1800, 150], [2500, 60]];
const WHITE: readonly (readonly [number, number])[] = [[120, 330], [520, 230], [820, 110], [1000, 84], [1300, 110], [1800, 80], [2500, 20]];

const side = (table: readonly (readonly [number, number])[], s: 1 | -1): Pt[] =>
  Array.from({ length: 48 }, (_, i) => {
    const y = 120 + i * 50;
    return { x: s * lerpAt(table, y), y };
  });

function flipper(ctx: CanvasRenderingContext2D, pen: Pen, s: 1 | -1): void {
  const outline = smoothLoop([
    { x: s * 330, y: 540 }, { x: s * 520, y: 620 }, { x: s * 640, y: 820 }, { x: s * 680, y: 1040 }, { x: s * 610, y: 1210 },
    { x: s * 500, y: 1200 }, { x: s * 430, y: 1040 }, { x: s * 390, y: 840 }, { x: s * 320, y: 700 },
  ], 6);
  path(ctx, outline);
  const g = ctx.createLinearGradient(s * 340, 560, s * 640, 1190);
  g.addColorStop(0, '#0a0f1a');
  g.addColorStop(0.5, '#25324a');
  g.addColorStop(1, '#101828');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  softLine(ctx, curve({ x: s * 470, y: 650 }, { x: s * 620, y: 820 }, { x: s * 620, y: 1120 }, 12), 46, '#7f96b2', 0.24, 14);
  for (let i = 0; i < 16; i++) {
    const x = 400 + i * 16;
    pen.hair([{ x: s * x, y: 680 + i * 8 }, { x: s * (x + 34), y: 900 + i * 7 }, { x: s * (x + 36), y: 1130 }], 1.3, i % 3 ? '#bfd2e8' : '#04070d', 0.2);
  }
  ctx.restore();
  path(ctx, outline);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.stroke();
}

function paint(ctx: CanvasRenderingContext2D, pen: Pen): void {
  const shape = [...side(HALF, 1), ...side(HALF, -1).reverse()];
  path(ctx, shape);
  const g = ctx.createLinearGradient(-520, 0, 520, 0);
  g.addColorStop(0, '#0a0f1a');
  g.addColorStop(0.28, '#26334c');
  g.addColorStop(0.6, BLACK);
  g.addColorStop(1, '#090d17');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // The white of the throat and chest, narrowing between the flippers, its edge crisp as an orca's is.
  const white = [...side(WHITE, 1), ...side(WHITE, -1).reverse()];
  path(ctx, white);
  const w = ctx.createLinearGradient(-300, 0, 300, 0);
  w.addColorStop(0, '#b7c2ce');
  w.addColorStop(0.35, IVORY);
  w.addColorStop(0.6, '#fbf6ea');
  w.addColorStop(1, '#a7b4c3');
  ctx.fillStyle = w;
  ctx.fill();
  ctx.strokeStyle = 'rgba(8,12,20,0.55)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  dab(ctx, 0, 700, 260, '124,144,170', 0.28);
  // Long pale light down the near flank.
  softLine(ctx, side([[120, 390], [2500, 60]], -1), 60, '#6f86a2', 0.2, 14);
  ctx.restore();
  path(ctx, shape);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.stroke();
  flipper(ctx, pen, -1);
  flipper(ctx, pen, 1);
}

/** Distance: the body thins into the water, whatever colour the water is. */
function fadeAway(ctx: CanvasRenderingContext2D): void {
  ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createLinearGradient(0, 640, 0, 1720);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.6)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0);
  ctx.globalCompositeOperation = 'source-over';
}

export function makeBodySheet(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(Math.ceil((BOX.x1 - BOX.x0) * RES), Math.ceil((BOX.y1 - BOX.y0) * RES));
  ctx.scale(RES, RES);
  ctx.translate(-BOX.x0, -BOX.y0);
  paint(ctx, new Pen(ctx, 77, 0.5));
  fadeAway(ctx);
  return canvas;
}
