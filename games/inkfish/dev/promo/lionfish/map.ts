import { INK, PAPER } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { ramp, smooth } from '../short';
import type { Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import {
  arrowAlpha, arrowAt, PACIFIC_AT, atlanticAt, BRAZIL, brazilAt, CAROLINAS, carolinasAt, DOTS, dotAt, FLORIDA, firstAt, INDIAN_RANGE, indianAt, LAND,
  type LonLat, PACIFIC_RANGE, pacificAt, type View, viewAt,
} from './atlas';
import { cardAt } from './story';

/** The map card: a sheet of the sketchbook unfolding over the reef, with the lionfish's journey inked on it. */

export const CARD = { x: 40, y: 290, w: 1000, h: 700 } as const;
const CX = CARD.x + CARD.w / 2;
const CY = CARD.y + CARD.h / 2;
const SEA = '#d9e9ee';
const SAND = '#eadfbd';
export const LION_RED = '#c8321e';
/** Where lionfish come from: the arrow starts in the Indo-Pacific. */
const HOME_SEA: LonLat = [124, -3];
const ARC_CONTROL: LonLat = [22, 64];

const project = (v: View, p: LonLat): { x: number; y: number } => ({ x: CX + (p[0] - v.lon) * v.k, y: CY - (p[1] - v.lat) * v.k });

function ring(ctx: CanvasRenderingContext2D, v: View, pts: readonly LonLat[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => {
    const q = project(v, p);
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  });
  ctx.closePath();
}

/** Red hatching over a home ocean, `alpha` 0 .. 1. */
function hatch(ctx: CanvasRenderingContext2D, v: View, area: readonly LonLat[], alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ring(ctx, v, area);
  ctx.globalAlpha = 0.16 * alpha;
  ctx.fillStyle = LION_RED;
  ctx.fill();
  ctx.clip();
  ctx.globalAlpha = 0.6 * alpha;
  ctx.strokeStyle = LION_RED;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let x = CARD.x - CARD.h; x < CARD.x + CARD.w; x += 16) {
    ctx.moveTo(x, CARD.y + CARD.h);
    ctx.lineTo(x + CARD.h, CARD.y);
  }
  ctx.stroke();
  ctx.restore();
}

/** A point on the arrow's arc from the Indo-Pacific to Florida, 0 .. 1. */
function arcAt(v: View, u: number): { x: number; y: number } {
  const [a, c, b] = [project(v, HOME_SEA), project(v, ARC_CONTROL), project(v, FLORIDA)];
  const s = 1 - u;
  return { x: s * s * a.x + 2 * s * u * c.x + u * u * b.x, y: s * s * a.y + 2 * s * u * c.y + u * u * b.y };
}

/** The dashed arrow, drawn out to `u`, with a little lionfish riding its tip. */
function drawArrow(ctx: CanvasRenderingContext2D, v: View, u: number, alpha: number, lion: Sprite, boil: number): void {
  if (u <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = LION_RED;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.setLineDash([18, 14]);
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const p = arcAt(v, (u * i) / 40);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  const tip = arcAt(v, u);
  const back = arcAt(v, Math.max(0, u - 0.03));
  const angle = Math.atan2(tip.y - back.y, tip.x - back.x);
  if (u >= 1) {
    ctx.fillStyle = LION_RED;
    ctx.beginPath();
    ctx.moveTo(tip.x + Math.cos(angle) * 8, tip.y + Math.sin(angle) * 8);
    ctx.lineTo(tip.x + Math.cos(angle + 2.5) * 30, tip.y + Math.sin(angle + 2.5) * 30);
    ctx.lineTo(tip.x + Math.cos(angle - 2.5) * 30, tip.y + Math.sin(angle - 2.5) * 30);
    ctx.closePath();
    ctx.fill();
  } else {
    // Heading left, so it's drawn mirrored and tilted along the arc.
    ctx.translate(tip.x, tip.y - 26);
    ctx.scale(-1, 1);
    ctx.rotate(Math.PI - angle);
    drawSwimmer(ctx, lion, { j: 0, shape: 'lionfish', age: 0, x: 0, y: 0, length: 90, facing: 1, tilt: 0, beat: u * 40, effort: 0.6 }, boil);
  }
  ctx.restore();
}

/** A place name in ink, `alpha` 0 .. 1, popping up a little as it comes in. */
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, alpha: number, colour = INK): void {
  if (alpha <= 0) return;
  drawTextLine(ctx, text, x, y + 12 * (1 - smooth(alpha)), size, 700, alpha, { fill: colour, halo: PAPER });
}

/** Bottom left of the card: hatching = native, a red dot = invasive. */
function drawLegend(ctx: CanvasRenderingContext2D, native: number, invasive: number): void {
  const x = CARD.x + 40;
  const y = CARD.y + CARD.h - 95;
  ctx.save();
  if (native > 0) {
    ctx.globalAlpha = native;
    ctx.fillStyle = PAPER;
    ctx.fillRect(x - 14, y - 34, 270, 128);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 14, y - 34, 270, 128);
    ctx.beginPath();
    ctx.rect(x, y - 18, 40, 32);
    ctx.fillStyle = 'rgba(200,50,30,0.16)';
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = LION_RED;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let k = -40; k < 40; k += 12) {
      ctx.moveTo(x + k, y + 14);
      ctx.lineTo(x + k + 32, y - 18);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  label(ctx, 'native', x + 120, y + 12, 46, native);
  if (invasive <= 0) return;
  ctx.save();
  ctx.globalAlpha = invasive;
  ctx.beginPath();
  ctx.arc(x + 20, y + 54, 9, 0, Math.PI * 2);
  ctx.fillStyle = LION_RED;
  ctx.fill();
  ctx.restore();
  label(ctx, 'invasive', x + 130, y + 68, 46, invasive);
}

export function drawMap(ctx: CanvasRenderingContext2D, t: number, lion: Sprite, boil: number): void {
  const open = cardAt(t);
  if (open <= 0) return;
  const v = viewAt(t);
  ctx.save();
  // Unfolding from a strip across the middle.
  ctx.translate(CX, CY);
  ctx.scale(0.85 + 0.15 * smooth(open), smooth(open));
  ctx.translate(-CX, -CY);
  ctx.globalAlpha = Math.min(1, open * 1.5);
  ctx.fillStyle = 'rgba(27,26,31,0.25)';
  ctx.fillRect(CARD.x + 12, CARD.y + 14, CARD.w, CARD.h);
  ctx.fillStyle = PAPER;
  ctx.fillRect(CARD.x, CARD.y, CARD.w, CARD.h);
  ctx.beginPath();
  ctx.rect(CARD.x, CARD.y, CARD.w, CARD.h);
  ctx.clip();
  ctx.fillStyle = SEA;
  ctx.fillRect(CARD.x, CARD.y, CARD.w, CARD.h);

  hatch(ctx, v, INDIAN_RANGE, indianAt(t));
  hatch(ctx, v, PACIFIC_RANGE, pacificAt(t));
  // The equator, faint and dashed.
  const eq = project(v, [0, 0]);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha *= 0.25;
  ctx.setLineDash([10, 12]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CARD.x, eq.y);
  ctx.lineTo(CARD.x + CARD.w, eq.y);
  ctx.stroke();
  ctx.restore();

  ctx.lineJoin = 'round';
  for (const pts of LAND) {
    ring(ctx, v, pts);
    ctx.fillStyle = SAND;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  drawArrow(ctx, v, arrowAt(t), arrowAlpha(t), lion, boil);
  for (const d of DOTS) {
    const s = dotAt(d, t);
    if (s <= 0) continue;
    const p = project(v, d.at);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = LION_RED;
    ctx.fill();
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  const pacific = project(v, [160, 14]);
  const indian = project(v, [76, -18]);
  label(ctx, 'Pacific', pacific.x, pacific.y, 54, pacificAt(t), LION_RED);
  label(ctx, 'Indian Ocean', indian.x, indian.y, 54, indianAt(t), LION_RED);
  const fl = project(v, FLORIDA);
  label(ctx, 'Florida, 1985', fl.x + 150, fl.y + 22, 50, firstAt(t));
  const atlantic = project(v, [-47, 24]);
  label(ctx, 'Atlantic Ocean', atlantic.x, atlantic.y, 58, atlanticAt(t));
  const nc = project(v, CAROLINAS);
  label(ctx, 'the Carolinas', nc.x + 165, nc.y - 6, 54, carolinasAt(t));
  const br = project(v, BRAZIL);
  label(ctx, 'Brazil', br.x - 80, br.y + 75, 58, brazilAt(t));
  drawLegend(ctx, ramp(t, PACIFIC_AT - 0.08, PACIFIC_AT + 0.3), Math.min(1, DOTS.filter((d) => dotAt(d, t) > 0).length / 3));
  ctx.restore();

  // The card's inked edge, outside the clip.
  ctx.save();
  ctx.translate(CX, CY);
  ctx.scale(0.85 + 0.15 * smooth(open), smooth(open));
  ctx.translate(-CX, -CY);
  ctx.globalAlpha = Math.min(1, open * 1.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.strokeRect(CARD.x, CARD.y, CARD.w, CARD.h);
  ctx.restore();
}
