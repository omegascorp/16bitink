import { INK, PAPER } from '../../../src/art/pen';
import { FRAME } from '../descent/frame';
import { smooth } from '../short';
import { drawPop, drawText, INK_ON_PAPER, PAPER_ON_INK, RED_ON_PAPER, YELLOW_ON_INK } from '../swallowyou/text';
import { drawPiranhaInHandIcon } from './art/handIcon';
import { ANIMALS, kgLabel, lbLabel, SPECIES, type Animal } from './species';
import { T } from './timeline';

/**
 * The twist: every head pulled back into a line-up ("for its SIZE?"), the
 * piranha biting the bar under it, then "pound for pound" as bars of bite
 * over body weight where the piranha's ×30 out-scales everyone, and the
 * piranha in a hand.
 */

const W = FRAME.width;
const H = FRAME.height;

const BIG: readonly Animal[] = ANIMALS.filter((a) => a !== 'piranha');
const ROWS: readonly (readonly Animal[])[] = [BIG.slice(0, 5), BIG.slice(5)];
const LINEUP_SIZE: Readonly<Record<Animal, number>> = {
  human: 150, jaguar: 160, dog: 160, lion: 175, bullShark: 200, alligator: 215, saltCroc: 230, greatWhite: 250, trex: 280, megalodon: 360, piranha: 60,
};

interface Spot { readonly a: Animal; readonly x: number; readonly y: number; readonly size: number }

/** Where each head stands in the line-up: two rows, each fitted to the frame. */
const SPOTS: readonly Spot[] = ROWS.flatMap((row, r) => {
  const span = (a: Animal): number => 1.95 * LINEUP_SIZE[a];
  const k = Math.min(1, 1760 / row.reduce((sum, a) => sum + span(a), 0));
  let x = (W - row.reduce((sum, a) => sum + span(a) * k, 0)) / 2;
  return row.map((a) => {
    const size = LINEUP_SIZE[a] * k;
    const spot = { a, x: x + 1.6 * size, y: r === 0 ? 400 : 820, size };
    x += span(a) * k;
    return spot;
  });
});

/** The line-up, scaled about the frame's top middle by `k` (1 = full frame), with each head's number under it. */
export function drawLineup(ctx: CanvasRenderingContext2D, t: number, k: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  // Pulled back toward the top right, clear of the name card and the bar.
  const u = (1 - k) / 0.6;
  ctx.translate(W / 2 + 0.22 * W * u, 40 - 10 * u);
  ctx.scale(k, k);
  ctx.translate(-W / 2, -40);
  SPOTS.forEach((s, i) => {
    const on = smooth((t - T.forSizeTwist - 0.1 - i * 0.07) / 0.3);
    if (on <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha * on;
    SPECIES[s.a].draw(ctx, { x: s.x, y: s.y - 30 * (1 - on), size: s.size, jaw: 0, t });
    ctx.restore();
    const sp = SPECIES[s.a];
    drawText(ctx, lbLabel(sp.lb, sp.approx), { x: s.x - 0.6 * s.size, y: s.y + 0.42 * s.size + 50, size: 50, maxWidth: 1.8 * s.size }, 700, alpha * on, PAPER_ON_INK);
    drawText(ctx, kgLabel(sp.lb, sp.approx), { x: s.x - 0.6 * s.size, y: s.y + 0.42 * s.size + 92, size: 34, maxWidth: 1.8 * s.size }, 500, alpha * on * 0.85, PAPER_ON_INK);
  });
  ctx.restore();
}

/** The line-up beat: full frame, then pulled up and back to make room for the piranha on the bar. */
export function lineupScale(t: number): number {
  return 1 - 0.6 * smooth((t - T.this - 0.1) / 0.7);
}

export function drawLineupTitle(ctx: CanvasRenderingContext2D, t: number): void {
  drawPop(ctx, 'but for its SIZE?', W / 2, 160, 120, t, T.forSizeTwist, T.this, YELLOW_ON_INK, -0.03);
}

// ---------------------------------------------------------------- pound for pound

/** Bars of bite force over body weight: the piranha's ×30 runs off the top of everyone else's. */
export function drawPerWeight(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  ctx.fillStyle = '#1d2329';
  ctx.fillRect(0, 0, W, H);
  drawText(ctx, 'bite force ÷ its own body weight', { x: W / 2, y: 120, size: 84, maxWidth: 1600 }, 700, alpha, PAPER_ON_INK);
  const base = 900;
  const unit = 30;
  const colW = W / ANIMALS.length;
  const grow = smooth((t - T.thirty + 0.1) / 0.6);
  const rocket = smooth((t - T.thirty - 0.3) / 1.4);
  // "×1": biting its own weight.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setLineDash([14, 12]);
  ctx.strokeStyle = 'rgba(244,237,220,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(40, base - unit);
  ctx.lineTo(W - 40, base - unit);
  ctx.stroke();
  ctx.setLineDash([]);
  ANIMALS.forEach((a, i) => {
    const x = (i + 0.5) * colW;
    const sp = SPECIES[a];
    const piranha = a === 'piranha';
    const h = piranha ? unit * sp.perWeight * rocket : unit * sp.perWeight * grow;
    ctx.fillStyle = piranha ? '#d8312b' : '#7d8890';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.rect(x - colW * 0.32, base - h, colW * 0.64, h);
    ctx.fill();
    ctx.stroke();
    SPECIES[a].draw(ctx, { x: x + 50, y: base + 70, size: piranha ? 70 : 58, jaw: 0, t });
  });
  ctx.restore();
  drawText(ctx, 'its own weight', { x: 200, y: base - unit - 18, size: 40, maxWidth: 300 }, 500, alpha * grow, PAPER_ON_INK);
  const px = (ANIMALS.length - 0.5) * colW;
  drawPop(ctx, '×30 its own weight', px - 300, Math.max(330, base - unit * 30 * rocket - 40), 92, t, T.thirty + 0.9, 1e9, YELLOW_ON_INK, -0.04, 760);
  drawText(ctx, 'the strongest bite ever recorded for a bony fish', { x: W / 2, y: 1050, size: 54, maxWidth: 1500 }, 700, alpha * smooth((t - T.bonyFish) / 0.3), PAPER_ON_INK);
}

// ---------------------------------------------------------------- in one hand

export function drawPiranhaInHand(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = alpha;
  const bob = 5 * Math.sin(t * 2.4);
  const jaw = 0.3 + 0.3 * Math.max(0, Math.sin(t * 2.2)) ** 6;
  drawPiranhaInHandIcon(ctx, { x: 880, y: 650 + bob, size: 780, jaw });
  ctx.restore();
  drawText(ctx, 'pound for pound, the scariest bite', { x: W / 2, y: 150, size: 86, maxWidth: 1600 }, 700, alpha, INK_ON_PAPER);
  drawPop(ctx, 'fits in one hand', W / 2, 1000, 96, t, T.fitsHand - 0.1, 1e9, RED_ON_PAPER, -0.03);
  drawText(ctx, '2.5 lb (1.1 kg) fish', { x: 1360, y: 290, size: 56, maxWidth: 640 }, 700, alpha, { fill: INK, halo: PAPER });
  drawText(ctx, `bites ${lbLabel(SPECIES.piranha.lb)} (${kgLabel(SPECIES.piranha.lb)})`, { x: 1360, y: 360, size: 56, maxWidth: 640 }, 700, alpha, { fill: INK, halo: PAPER });
}
