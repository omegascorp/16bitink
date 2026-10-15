import { HIGHLIGHT, INK, PAPER_FILL, RED } from '../../../src/art/palette';
import { drawTextLine } from '../captions';
import { clamp01, lerp, smooth } from '../short';

/**
 * The heatwave's thermometer, rising from cold blue to red, and the energy
 * bar that drains over the warm crab: drawn in ink on paper, plain shapes
 * with a pen-thick outline.
 */
const COLD = '#3f6fae';

/** A colour between two #rrggbb colours. */
export function mix(a: string, b: string, u: number): string {
  const c = (s: string, i: number): number => parseInt(s.slice(1 + 2 * i, 3 + 2 * i), 16);
  const k = clamp01(u);
  return `rgb(${[0, 1, 2].map((i) => Math.round(lerp(c(a, i), c(b, i), k))).join(', ')})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export const THERMO = { x: 905, top: 330, bottom: 860, tube: 56, bulb: 54 } as const;

/** The mercury's top at heat `heat` (0 .. 1). */
export const mercuryTop = (heat: number): number => lerp(THERMO.bottom - THERMO.bulb, THERMO.top + 30, heat);

/** The thermometer, slid in from the right (`show` 0 .. 1), filled to `heat`. */
export function drawThermometer(ctx: CanvasRenderingContext2D, show: number, heat: number, t: number): void {
  if (show <= 0) return;
  const { x, top, bottom, tube, bulb } = THERMO;
  ctx.save();
  ctx.translate((1 - smooth(show)) * 260, 0);
  ctx.globalAlpha = clamp01(show * 3);
  const colour = mix(COLD, RED, (heat - 0.18) / 0.72);
  // Glass: paper inside, then the column and the bulb.
  roundRect(ctx, x - tube / 2, top, tube, bottom - top, tube / 2);
  ctx.fillStyle = PAPER_FILL;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, bottom, bulb, 0, Math.PI * 2);
  ctx.fill();
  const level = mercuryTop(heat) + 2 * Math.sin(t * 5);
  ctx.fillStyle = colour;
  roundRect(ctx, x - tube / 2 + 12, level, tube - 24, bottom - level, (tube - 24) / 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, bottom, bulb - 12, 0, Math.PI * 2);
  ctx.fill();
  // Ticks up the side, a pen outline, a glint.
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  for (let k = 0; k < 9; k++) {
    const y = top + 50 + (k * (bottom - bulb - top - 70)) / 8;
    ctx.beginPath();
    ctx.moveTo(x - tube / 2 - 6, y);
    ctx.lineTo(x - tube / 2 - (k % 2 ? 18 : 30), y);
    ctx.stroke();
  }
  ctx.lineWidth = 6;
  ctx.beginPath();
  const a = Math.asin(tube / 2 / bulb);
  ctx.arc(x, bottom, bulb, -Math.PI / 2 + a, (3 * Math.PI) / 2 - a);
  ctx.lineTo(x - tube / 2, top + tube / 2);
  ctx.arc(x, top + tube / 2, tube / 2, Math.PI, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = PAPER_FILL;
  ctx.globalAlpha *= 0.8;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + tube / 2 - 12, top + 40);
  ctx.lineTo(x + tube / 2 - 12, top + 150);
  ctx.stroke();
  ctx.restore();
}

export const BAR = { w: 440, h: 54, segments: 8 } as const;

/** The energy bar centred at (x, y): `level` 1 full .. 0 empty, yellow running low into red. */
export function drawEnergyBar(ctx: CanvasRenderingContext2D, x: number, y: number, show: number, level: number, t: number): void {
  if (show <= 0) return;
  const { w, h, segments } = BAR;
  ctx.save();
  ctx.globalAlpha = clamp01(show);
  ctx.translate(x, y - 30 * (1 - smooth(show)));
  roundRect(ctx, -w / 2, -h / 2, w, h, 12);
  ctx.fillStyle = PAPER_FILL;
  ctx.fill();
  const low = level < 0.3;
  const fill = mix(HIGHLIGHT, RED, (0.55 - level) / 0.4);
  const pad = 8;
  const segW = (w - pad * 2) / segments;
  for (let k = 0; k < segments; k++) {
    const share = clamp01(level * segments - k);
    if (share <= 0) continue;
    // A low bar flickers on its last segment.
    const flicker = low && k === Math.floor(level * segments) ? 0.65 + 0.35 * Math.sin(t * 22) : 1;
    ctx.globalAlpha = clamp01(show) * flicker;
    ctx.fillStyle = fill;
    ctx.fillRect(-w / 2 + pad + k * segW + 2, -h / 2 + pad, (segW - 4) * share, h - pad * 2);
  }
  ctx.globalAlpha = clamp01(show);
  roundRect(ctx, -w / 2, -h / 2, w, h, 12);
  ctx.strokeStyle = level <= 0.02 ? RED : INK;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, 'energy', x - w / 2 + 70, y - h / 2 - 22, 62, 700, clamp01(show));
}
