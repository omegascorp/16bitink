import { smooth } from '../short';
import type { Sea } from '../swallowyou/sea';
import { vignette } from '../swallowyou/sea';
import { drawPop, drawText, PAPER_ON_INK, RED, YELLOW_ON_INK } from '../swallowyou/text';
import { drawLegend, type Legend, type LegendLook } from './art/legends';
import { drawSiphonophoreAlong } from './art/siphonophore';
import { drawMonster, SQUID_EYE } from './cast';
import { H, W } from './lineup';
import { drawSilhouettes, flyByView } from './stage';
import { T } from './timeline';

/**
 * The cold open (section 0): the sailors' monsters as old engravings, one per
 * line (the kraken round a mast, the serpents, the "island" that opens an
 * eye, the whale smashing a ship); on "they weren't JUST making it up" the
 * parchment tears and blue water floods through onto the real squid's eye;
 * then the whole row flies by in silhouette, megalodon and Godzilla are
 * struck off, and a pale string runs off the edge of the frame, unnamed.
 */

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

interface Plate {
  readonly legend: Legend;
  readonly from: number;
  readonly look: (t: number) => LegendLook;
}

const PLATES: readonly Plate[] = [
  { legend: 'kraken', from: 0, look: (t) => ({ rise: smooth(t / 3) }) },
  { legend: 'seaserpent', from: T.serpents - 0.15, look: (t) => ({ rise: smooth((t - T.serpents) / 1) }) },
  { legend: 'island', from: T.island - 0.15, look: (t) => ({ eye: smooth((t - T.island - 0.5) / 0.6), rise: 1 }) },
  { legend: 'essex', from: T.whaleShip - 0.15, look: (t) => ({ impact: smooth((t - T.whaleShip - 0.2) / 0.6) }) },
];

function plateAt(t: number): Plate {
  let on = PLATES[0]!;
  for (const p of PLATES) if (t >= p.from) on = p;
  return on;
}

/** The engraving on now, full frame on parchment, with a slow push in. */
function drawPlates(ctx: CanvasRenderingContext2D, sea: Sea, t: number, tear: number): void {
  // The paper around the card only until it tears: then the water behind shows through the rip.
  if (tear <= 0) sea.draw(ctx, 'paper', t);
  const p = plateAt(t);
  const push = 1 + 0.04 * clamp01((t - p.from) / 3);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(push, push);
  drawLegend(ctx, p.legend, -W / 2 + 60, -H / 2 + 40, W - 120, H - 80, t, { ...p.look(t), tear });
  ctx.restore();
}

/** The real giant squid's eye filling the frame, in blue water. */
function drawRealEye(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  sea.draw(ctx, 'cold', t);
  // The squid huge, facing left, its eye on the frame's centre and slowly growing.
  const len = 2700 * (1 + 0.06 * clamp01((t - T.justMaking) / 3));
  drawMonster(ctx, 'squid', { x: 960 - SQUID_EYE.along * len, y: 540 }, len, -1, t);
  vignette(ctx, 0.35);
  drawText(ctx, 'REAL', { x: 960, y: 950, size: 110, maxWidth: 600 }, 700, smooth((t - T.real) / 0.25), YELLOW_ON_INK);
}

/** The row flying by in silhouette on bright water. */
function drawFlyBy(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  sea.draw(ctx, 'tropic', t);
  const u = smooth((t - T.lining) / (T.megalodon - T.lining + 0.6));
  drawSilhouettes(ctx, flyByView(u), t, 1);
  drawPop(ctx, 'your size…', 360, 260, 90, t, T.yourSize, T.hundredFeet, YELLOW_ON_INK);
  drawPop(ctx, '…to 100 ft of whale', 1300, 260, 90, t, T.hundredFeet, T.megalodon, YELLOW_ON_INK);
}

/** "No megalodon. No Godzilla.": the names written and struck off in red. */
function drawStruck(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  const strike = (name: string, x: number, at: number): void => {
    const a = alpha * smooth((t - at) / 0.25);
    if (a <= 0) return;
    drawText(ctx, name, { x, y: 540, size: 120, maxWidth: 760 }, 700, a, PAPER_ON_INK);
    const k = smooth((t - at - 0.35) / 0.2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = RED;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 330, 470);
    ctx.lineTo(x - 330 + 660 * k, 470 + 140 * k);
    ctx.moveTo(x - 330, 610);
    ctx.lineTo(x - 330 + 660 * k, 610 - 140 * k);
    ctx.stroke();
    ctx.restore();
  };
  strike('MEGALODON', 520, T.megalodon);
  strike('GODZILLA', 1400, T.godzilla);
}

/** The pale string crossing the dark and running off the right edge, with a question mark. */
function drawString(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  sea.draw(ctx, 'deep', t);
  const u = clamp01((t - T.longest) / 2.8);
  const n = 160;
  const path = Array.from({ length: n + 1 }, (_, i) => {
    const k = i / n;
    // Head first, running right and off the frame; the tail trails in from the left.
    return { x: -200 + 2600 * (u * 1.1 - k * 0.9), y: 560 + 70 * Math.sin(k * 9 + t * 0.7) };
  });
  drawSiphonophoreAlong(ctx, path, t, { glow: 0.8, width: 12, side: -1 });
  drawPop(ctx, '?', 1500, 380, 200, t, T.oneAnimal, T.oneAnimal + 3, YELLOW_ON_INK);
  vignette(ctx, 0.5);
}

/** The whole cold open, 0 .. the start of section 1. */
export function drawOpen(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  if (t >= T.longest - 0.1) {
    drawString(ctx, sea, t);
    return;
  }
  if (t >= T.lining - 0.1) {
    drawFlyBy(ctx, sea, t);
    const struck = smooth((t - T.megalodon + 0.2) / 0.3);
    if (struck > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(4,8,16,${0.6 * struck})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      drawStruck(ctx, t, struck);
    }
    return;
  }
  const tear = clamp01((t - T.justMaking) / 0.8);
  if (tear > 0) drawRealEye(ctx, sea, t);
  if (tear < 1) drawPlates(ctx, sea, t, smooth(tear));
}
