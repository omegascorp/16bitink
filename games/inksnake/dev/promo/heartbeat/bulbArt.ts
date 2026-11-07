import { closed, cub, type Draw, oval, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';

/**
 * The fake heart: a small rubber bulb on a brass collar, plainly a made
 * thing, not an organ (the study's water-filled bulb, pumped from outside the
 * rat), and the thin tube that feeds it, a pale dash running along it with
 * each push.
 */
const RUBBER = { lit: '#e8834e', mid: '#c2502e', deep: '#6e2418', line: '#2a120c' } as const;

export const BULB_SHAPE: readonly Pt[] = [
  ...cub(pt(-30, 0), pt(-30, -22), pt(-8, -30), pt(12, -19), 18),
  ...cub(pt(12, -19), pt(22, -13), pt(30, -9), pt(38, -7), 8).slice(1),
  pt(38, 7),
  ...cub(pt(38, 7), pt(30, 9), pt(22, 13), pt(12, 19), 8),
  ...cub(pt(12, 19), pt(-8, 30), pt(-30, 22), pt(-30, 0), 18).slice(1, -1),
];

/** Art units across. */
export const BULB_W = 86;

function drawBulb(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(BULB_SHAPE, PAPER_FILL, 1);
  pen.clipped(BULB_SHAPE, () => {
    const g = ctx.createRadialGradient(-12, -12, 3, 2, 3, 46);
    g.addColorStop(0, RUBBER.lit);
    g.addColorStop(0.5, RUBBER.mid);
    g.addColorStop(1, RUBBER.deep);
    ctx.fillStyle = g;
    ctx.fillRect(-40, -40, 90, 80);
    glaze(ctx, -13, -14, 9, 5, -0.5, PAPER_FILL, 0.75);
    for (let i = 0; i < 4; i++) pen.hair(cub(pt(16 + i * 5, -14 + i * 0.8), pt(18 + i * 5, -6), pt(18 + i * 5, 6), pt(16 + i * 5, 14 - i * 0.8), 8), 0.5, RUBBER.line, 0.5);
  });
  pen.stroke(closed(BULB_SHAPE), 1, RUBBER.line, 1, false);
  const collar = [pt(37, -8.5), pt(45, -8.5), pt(45, 8.5), pt(37, 8.5)];
  pen.fill(collar, '#c9a24e', 1);
  pen.fill(oval(41, -4, 3.4, 1.4, 10), PAPER_FILL, 0.7);
  pen.stroke(closed(collar), 0.8, RUBBER.line, 1, false);
}

export const BULB: SpriteArt<'bulb'> = { frame: 104, res: 8, poses: ['bulb'], draw: drawBulb };

const smoothThrough = (ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void => {
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]!;
    const q = pts[i + 1]!;
    ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
  }
  const last = pts[pts.length - 1]!;
  ctx.lineTo(last.x, last.y);
};

/** The tube from `from` through `via`, `w` px wide, a dash of water moving along it. */
export function drawTube(ctx: CanvasRenderingContext2D, from: Pt, via: readonly Pt[], t: number, w: number): void {
  const pts = [from, ...via];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  smoothThrough(ctx, pts);
  ctx.strokeStyle = RUBBER.line;
  ctx.lineWidth = w + 5;
  ctx.stroke();
  ctx.strokeStyle = '#dfe6e2';
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.strokeStyle = '#7fb4c8';
  ctx.lineWidth = w * 0.5;
  ctx.setLineDash([26, 62]);
  ctx.lineDashOffset = (t * 160) % 88;
  ctx.stroke();
  ctx.restore();
}
