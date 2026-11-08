import { makeCanvas } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { drawGreatWhite } from '../foodchain/art/greatWhite';
import { drawOrca } from '../foodchain/art/orca';
import { clamp01, lerp, ramp, VIDEO } from '../short';
import { TEXT } from './script';
import { drawRays, drawSnow, drawVignette, drawWater, glow, type Rgb, wash } from './sea';
import { A_AT, AN_AT, BIGGER_AT, cycles, ORCA_AT, wrap } from './story';

/**
 * "A bigger great white? An orca?": the two suspects, one after the other,
 * as dark silhouettes against a dim violet glow (each still shows its own
 * shape: the shark's fins and tail, the orca's tall fin and white patches,
 * just), a yellow "?" popping up by each.
 */

const SLY_TOP: Rgb = [40, 30, 78];
const SLY_MID: Rgb = [20, 14, 44];
const SLY_BOTTOM: Rgb = [6, 4, 16];
const SPOKEN = '#f5c84a';
const HALO = '#0a0618';

let sheetFor: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;

/** Draws `paint` into a spare canvas, darkens it to a silhouette with a little of its shading left, and lays it in. */
function silhouette(ctx: CanvasRenderingContext2D, paint: (c: CanvasRenderingContext2D) => void, darkness: number): void {
  sheetFor ??= makeCanvas(VIDEO.width, VIDEO.height);
  const c = sheetFor.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.clearRect(0, 0, VIDEO.width, VIDEO.height);
  paint(c);
  c.globalCompositeOperation = 'source-atop';
  c.globalAlpha = darkness;
  c.fillStyle = '#0c0820';
  c.fillRect(0, 0, VIDEO.width, VIDEO.height);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  ctx.drawImage(sheetFor.canvas, 0, 0);
}

/** A "?" that pops up with a little overshoot. */
function drawQuestion(ctx: CanvasRenderingContext2D, x: number, y: number, since: number, t: number): void {
  if (since <= 0) return;
  const over = TEXT.questionPop - 1;
  const pop = since < 0.16 ? (since / 0.16) * TEXT.questionPop : 1 + over * Math.max(0, 1 - (since - 0.16) / 0.12);
  const wob = 0.08 * Math.sin(cycles(11, t));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wob);
  ctx.scale(pop, pop);
  drawTextLine(ctx, '?', 0, 0, TEXT.questions[0].size, 700, clamp01(since * 6), { fill: SPOKEN, halo: HALO });
  ctx.restore();
}

export function drawSuspects(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number, _boil: number): void {
  const u = wrap(t);
  drawWater(ctx, sheet, SLY_TOP, SLY_MID, SLY_BOTTOM);
  drawRays(ctx, t, 0.6, -150, '200,180,255');
  drawSnow(ctx, t, '#e6dcff', 0.8);
  // The bigger great white swims in from the left, high in the frame.
  const inGw = ramp(u, A_AT - 0.1, BIGGER_AT + 0.35);
  const gw = { x: lerp(-520, 560, inGw), y: 560 + 10 * Math.sin(cycles(4, t)) };
  glow(ctx, gw.x, gw.y, 520, '150,120,230', 0.35 * inGw);
  silhouette(ctx, (c) => drawGreatWhite(c, gw.x, gw.y, 820, 0.03 * Math.sin(cycles(3, t)), t, { tail: cycles(23, t) }), 0.72);
  // The orca from the right, lower down.
  const inOrca = ramp(u, AN_AT - 0.15, ORCA_AT + 0.25);
  const orca = { x: lerp(1620, 520, inOrca), y: 940 + 10 * Math.sin(cycles(4, t) + 1) };
  if (inOrca > 0) {
    glow(ctx, orca.x, orca.y, 520, '150,120,230', 0.35 * inOrca);
    silhouette(ctx, (c) => drawOrca(c, orca.x, orca.y, 800, Math.PI + 0.03 * Math.sin(cycles(3, t)), t, { tail: cycles(19, t) }, true), 0.7);
  }
  const [q1, q2] = TEXT.questions;
  drawQuestion(ctx, q1.x, q1.y, u - (BIGGER_AT + 0.25), t);
  drawQuestion(ctx, q2.x, q2.y, u - (ORCA_AT + 0.12), t);
  wash(ctx, 'soft-light', '#c070e0', 0.25);
  drawVignette(ctx, 0.6, '4,2,12');
}
