import { INK, PAPER_FILL, RED } from '../../../src/art/palette';
import { drawTextLine } from '../captions';
import { clamp01, lerp, smooth } from '../short';
import { drawSprite, type Sprite } from '../sprites';
import { BARS, type BarId } from './story';

/**
 * The pinch chart, pinned up over the beach on "Its pinch beats the bite of
 * almost any land predator": one bar each, the coconut crab's pinch tall,
 * the bites of the game's own land predators (arctic fox, raccoon, monitor
 * lizard, inked red as the game inks a hunter) low, and a crocodile's bar
 * running off the top: the "almost". No numbers on the predators: the bars
 * only rank them (Oka et al. 2016 put a big coconut crab's pinch above the
 * bite of every land animal measured but alligators and crocodiles).
 */
export interface ChartState {
  /** 0 away (above the frame) .. 1 pinned up. */
  readonly show: number;
  readonly bars: Readonly<Record<BarId, number>>;
  readonly almost: number;
  readonly predators: number;
  /** The ring round the crab's bar, 0 .. 1 of its life. */
  readonly ring: number;
}

export interface ChartIcons {
  readonly fox: Sprite;
  readonly raccoon: Sprite;
  readonly monitor: Sprite;
  readonly crab: Sprite;
}

const CARD = { x0: 70, y0: 290, x1: 1010, y1: 740 } as const;
const BASE_Y = 662;
const BAR_H = 250;
const COLUMN: Readonly<Record<BarId, { readonly x: number; readonly w: number }>> = {
  fox: { x: 180, w: 92 },
  raccoon: { x: 318, w: 92 },
  monitor: { x: 456, w: 92 },
  crab: { x: 640, w: 136 },
  croc: { x: 850, w: 136 },
};
const CRAB_WASH = '#5b5799';

/** A crocodile in side view, in silhouette, `w` px long, standing on (x, y). */
function crocodile(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  const s = w / 140;
  const P = (px: number, py: number): [number, number] => [x + (px - 70) * s, y + (py - 40) * s];
  const outline: [number, number][] = [
    P(0, 30), P(18, 24), P(40, 20), P(58, 16), P(80, 15), P(96, 18), P(104, 20), P(118, 21), P(134, 23), P(140, 26),
    P(136, 29), P(118, 29), P(104, 30), P(98, 32), P(100, 40), P(94, 40), P(90, 33), P(70, 33), P(64, 40), P(58, 40),
    P(56, 33), P(40, 31), P(20, 31),
  ];
  ctx.save();
  ctx.beginPath();
  outline.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.closePath();
  ctx.fillStyle = RED;
  ctx.globalAlpha *= 0.85;
  ctx.fill();
  // The ridge of scutes along its back.
  ctx.strokeStyle = PAPER_FILL;
  ctx.lineWidth = 2;
  for (let k = 0; k < 7; k++) {
    const [px, py] = P(30 + k * 9, 21 - k * 0.6);
    ctx.beginPath();
    ctx.moveTo(px, py + 2);
    ctx.lineTo(px + 3 * s, py - 1.5 * s);
    ctx.stroke();
  }
  ctx.fillStyle = PAPER_FILL;
  const [ex, ey] = P(110, 20.5);
  ctx.beginPath();
  ctx.arc(ex, ey, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A ruled bar from the baseline up to `h` (share of BAR_H); the crocodile's breaks off at the card's top with a zigzag. */
function bar(ctx: CanvasRenderingContext2D, id: BarId, h: number): void {
  if (h <= 0.002) return;
  const { x, w } = COLUMN[id];
  const top = BASE_Y - BAR_H * h;
  const broken = id === 'croc' && top < CARD.y0 + 70;
  const y = broken ? CARD.y0 + 70 : top;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, BASE_Y);
  ctx.lineTo(x - w / 2, y);
  if (broken) {
    for (let k = 1; k <= 4; k++) ctx.lineTo(x - w / 2 + (w * k) / 4, y + (k % 2 ? -12 : 4));
  } else ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, BASE_Y);
  ctx.closePath();
  ctx.fillStyle = id === 'crab' ? CRAB_WASH : RED;
  ctx.globalAlpha = id === 'crab' ? 0.75 : 0.32;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

export function drawChart(ctx: CanvasRenderingContext2D, s: ChartState, icons: ChartIcons, boil: number): void {
  if (s.show <= 0) return;
  const e = smooth(s.show);
  ctx.save();
  ctx.globalAlpha = clamp01(s.show * 3);
  ctx.translate(0, -(1 - e) * 520);
  ctx.translate(540, 515);
  ctx.rotate(-0.012);
  ctx.translate(-540, -515);
  // The card: paper with a pen border and a strip of tape.
  ctx.fillStyle = PAPER_FILL;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(CARD.x0, CARD.y0, CARD.x1 - CARD.x0, CARD.y1 - CARD.y0, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(243, 224, 74, 0.55)';
  ctx.fillRect(480, CARD.y0 - 18, 120, 36);
  drawTextLine(ctx, 'pinch vs. bite', 470, CARD.y0 + 64, 66, 700);
  // Baseline.
  ctx.beginPath();
  ctx.moveTo(CARD.x0 + 40, BASE_Y);
  ctx.lineTo(CARD.x1 - 40, BASE_Y);
  ctx.lineWidth = 4;
  ctx.stroke();
  for (const id of BARS) bar(ctx, id, s.bars[id]);
  // Who each bar is, standing under it.
  const shown = (id: BarId): number => clamp01(s.bars[id] * 20);
  const icon = (sprite: Sprite, id: BarId, scale: number): void => {
    drawSprite(ctx, sprite, boil, { x: COLUMN[id].x - 4, y: CARD.y1 - 12, scale, alpha: shown(id) });
  };
  icon(icons.fox, 'fox', 1.25);
  icon(icons.raccoon, 'raccoon', 1.25);
  icon(icons.monitor, 'monitor', 1.05);
  icon(icons.crab, 'crab', 1.25);
  if (shown('croc') > 0) {
    ctx.save();
    ctx.globalAlpha *= shown('croc');
    crocodile(ctx, COLUMN.croc.x, CARD.y1 - 14, 190);
    ctx.restore();
  }
  const crabTop = BASE_Y - BAR_H * s.bars.crab;
  drawTextLine(ctx, 'coconut crab', COLUMN.crab.x, crabTop - 18, 46, 700, clamp01(s.bars.crab * 3));
  drawTextLine(ctx, 'land predators', COLUMN.raccoon.x, BASE_Y - 82, 50, 700, s.predators);
  if (s.predators > 0) {
    ctx.beginPath();
    ctx.moveTo(COLUMN.fox.x - 46, BASE_Y - 62);
    ctx.quadraticCurveTo(COLUMN.raccoon.x, BASE_Y - 72, COLUMN.monitor.x + 46, BASE_Y - 62);
    ctx.globalAlpha = s.predators;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  drawTextLine(ctx, 'almost: big crocs', COLUMN.croc.x - 10, CARD.y0 + 50, 42, 700, s.almost);
  if (s.ring > 0 && s.ring < 1) {
    ctx.beginPath();
    ctx.ellipse(COLUMN.crab.x, crabTop - 30, lerp(120, 170, s.ring), lerp(50, 75, s.ring), -0.05, 0, Math.PI * 2);
    ctx.strokeStyle = RED;
    ctx.globalAlpha = 1 - s.ring;
    ctx.lineWidth = 6;
    ctx.stroke();
  }
  ctx.restore();
}
