import { INK, PAPER } from '../../../src/art/pen';
import { drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { lerp } from '../short';
import { type Pt, spineOf, tailOf } from './body';
import { CRIMSON, toScreen, type View } from './ribbon';
import {
  DIVER_H, deepFishAt, diver, dimension, dimensionAlpha, flash, gauge, gaugeDepth, HEAD, LOOP_S, legendLabel, phoneUp, RISE_FROM, sandAt, seismograph,
  traceAt, visitor,
} from './story';

/**
 * What's drawn over the scenes to explain them: the diver and the "8 m"
 * line for scale, the depth gauge, the oarfish's Japanese name, the
 * seismograph, and the beachgoer taking a photo.
 */
const CHALK = '#dcd6e6';
const ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
const SUIT = '#2a3140';

// ---------------------------------------------------------------- scale

/** Where the diver floats beside the oarfish (his head level with its snout), m. */
const DIVER_AT: Pt = { x: HEAD.x + 2.35, y: HEAD.y + 0.15 };

/** A scuba diver, upright, in chalky ink: fins, tank, mask, and bubbles going up. */
export function drawDiver(ctx: CanvasRenderingContext2D, view: View, t: number, boil: number): void {
  const a = diver(t);
  if (a <= 0) return;
  const top = toScreen(view, DIVER_AT);
  const h = DIVER_H * view.zoom;
  const u = h / 100;
  const w = (2 * Math.PI * t) / LOOP_S;
  const kick = Math.sin(w * 6) * 4 * u;
  const j = (boil % 3) * 0.4;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(top.x, top.y + Math.sin(w * 4) * 1.2 * u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = CHALK;
  ctx.fillStyle = SUIT;
  ctx.lineWidth = Math.max(1.6, 1.1 * u);
  // Tank on his back (his back to the right: he faces the fish).
  ctx.beginPath();
  ctx.roundRect(6 * u, 14 * u, 9 * u, 30 * u, 4 * u);
  ctx.fill();
  ctx.stroke();
  // Legs and fins.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 3 * u, 50 * u);
    ctx.lineTo(side * 3 * u + kick * side * 0.3, 80 * u);
    ctx.lineTo(side * 2 * u + kick * side, 88 * u);
    ctx.lineWidth = 7 * u;
    ctx.strokeStyle = SUIT;
    ctx.stroke();
    ctx.lineWidth = Math.max(1.6, 1.1 * u);
    ctx.strokeStyle = CHALK;
    ctx.beginPath();
    ctx.moveTo(side * 2 * u + kick * side - 3 * u, 86 * u);
    ctx.lineTo(side * 2 * u + kick * side * 1.6 - 9 * u, 100 * u);
    ctx.lineTo(side * 2 * u + kick * side * 1.6 + 2 * u, 100 * u);
    ctx.closePath();
    ctx.fillStyle = '#3c4658';
    ctx.fill();
    ctx.stroke();
  }
  // Body.
  ctx.fillStyle = SUIT;
  ctx.beginPath();
  ctx.moveTo(-7 * u, 14 * u);
  ctx.quadraticCurveTo(-9 * u, 34 * u, -6 * u, 52 * u);
  ctx.lineTo(7 * u, 52 * u);
  ctx.quadraticCurveTo(9 * u, 32 * u, 7 * u, 14 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Arm reaching towards the fish.
  ctx.beginPath();
  ctx.moveTo(-5 * u, 18 * u);
  ctx.quadraticCurveTo(-16 * u, 26 * u, -20 * u + j, 36 * u);
  ctx.lineWidth = 5 * u;
  ctx.strokeStyle = SUIT;
  ctx.stroke();
  ctx.lineWidth = Math.max(1.6, 1.1 * u);
  ctx.strokeStyle = CHALK;
  // Head, mask facing left, regulator hose.
  ctx.fillStyle = SUIT;
  ctx.beginPath();
  ctx.arc(0, 7 * u, 7 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8fb3c9';
  ctx.beginPath();
  ctx.roundRect(-8 * u, 3 * u, 7 * u, 5 * u, 1.5 * u);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6 * u, 11 * u);
  ctx.quadraticCurveTo(4 * u, 16 * u, 10 * u, 16 * u);
  ctx.stroke();
  // Bubbles rising, looping.
  for (let k = 0; k < 5; k++) {
    const rise = ((t * 0.9 + k * 0.2) % 1) * 46 * u;
    ctx.beginPath();
    ctx.arc(-8 * u + Math.sin(t * 5 + k) * 2 * u, 2 * u - rise, (1.2 + k * 0.25) * u, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // His height, bracketed on his far side.
  const x = top.x + 30 * u;
  bracket(ctx, x, top.y, top.y + h, a, 10 * u);
  drawTextLine(ctx, '1.8 m', x + 74, top.y + h / 2 + 18, 56, 700, a, ON_INK);
}

/** A dimension line: a vertical line with end ticks and arrowheads. */
function bracket(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, alpha: number, tick: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - tick, y0);
  ctx.lineTo(x + tick, y0);
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y1);
  ctx.moveTo(x - tick, y1);
  ctx.lineTo(x + tick, y1);
  for (const [y, dir] of [[y0, 1], [y1, -1]] as const) {
    if (Math.abs(y1 - y0) < 30) continue;
    ctx.moveTo(x - 8, y + dir * 14);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 8, y + dir * 14);
  }
  ctx.stroke();
  ctx.restore();
}

/** "8 m": a dimension line beside the whole fish, snout to tail, drawing itself out. */
export function drawDimension(ctx: CanvasRenderingContext2D, view: View, t: number): void {
  const a = dimensionAlpha(t);
  if (a <= 0) return;
  const pose = deepFishAt(t);
  const head = toScreen(view, pose);
  const tail = toScreen(view, tailOf(spineOf(pose)));
  const x = toScreen(view, { x: HEAD.x - 1.9, y: 0 }).x;
  const u = dimension(t);
  bracket(ctx, x, head.y, lerp(head.y, tail.y, u), a, 14);
  // Faint guides across to the snout and the tail.
  ctx.save();
  ctx.globalAlpha = a * 0.5;
  ctx.strokeStyle = CHALK;
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 18, head.y);
  ctx.lineTo(head.x - 10, head.y);
  if (u > 0.98) {
    ctx.moveTo(x + 18, tail.y);
    ctx.lineTo(tail.x - 10, tail.y);
  }
  ctx.stroke();
  ctx.restore();
  const label = Math.max(0, (u - 0.45) / 0.55);
  drawTextLine(ctx, '8 m', x - 125, (head.y + tail.y) / 2 + 40, 130, 700, a * label, ON_INK);
}

// ---------------------------------------------------------------- depth

const GAUGE = { x: 112, top: 330, bottom: 1010, maxDepth: 1000 } as const;
const depthY = (m: number): number => GAUGE.top + ((GAUGE.bottom - GAUGE.top) * m) / GAUGE.maxDepth;

/** A depth gauge down the left side: 0 to 1,000 m, the oarfish's 200–1,000 m marked, and a marker riding up with the camera. */
export function drawDepthGauge(ctx: CanvasRenderingContext2D, t: number): void {
  const a = gauge(t);
  if (a <= 0) return;
  const { x } = GAUGE;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = CHALK;
  ctx.fillStyle = CHALK;
  ctx.lineCap = 'round';
  // The band where it lives.
  ctx.fillStyle = CRIMSON;
  ctx.globalAlpha = a * 0.35;
  ctx.fillRect(x - 10, depthY(200), 20, depthY(1000) - depthY(200));
  ctx.globalAlpha = a;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, GAUGE.top);
  ctx.lineTo(x, GAUGE.bottom);
  for (let m = 0; m <= 1000; m += 100) {
    const big = m % 500 === 0 || m === 200;
    ctx.moveTo(x, depthY(m));
    ctx.lineTo(x + (big ? 22 : 12), depthY(m));
  }
  ctx.stroke();
  ctx.restore();
  for (const m of [0, 200, 1000]) drawTextLine(ctx, m === 1000 ? '1,000 m' : `${m} m`, x + 92, depthY(m) + 16, 46, 700, a, ON_INK);
  // The marker: where we are.
  const y = depthY(gaugeDepth(t));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 14, y);
  ctx.lineTo(x - 40, y - 14);
  ctx.lineTo(x - 40, y + 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // "the deep" beside the band, until the camera starts up.
  const deepLabel = a * (1 - Math.max(0, Math.min(1, (t - RISE_FROM) / 0.3)));
  drawTextLine(ctx, 'the deep', x + 150, (depthY(200) + depthY(1000)) / 2 + 20, 60, 700, deepLabel, { fill: '#f08a7a', halo: '#05091a' });
}

// ---------------------------------------------------------------- the shore

/** Its name in Japan, and what it means, in the sky over the shore. */
export function drawLegend(ctx: CanvasRenderingContext2D, t: number): void {
  const a = legendLabel(t);
  if (a <= 0) return;
  drawTextLine(ctx, 'ryūgū no tsukai', 540, 350, 92, 700, a, INK_ON_PAPER);
  drawTextLine(ctx, '“messenger from the sea god’s palace”', 540, 418, 48, 500, a, INK_ON_PAPER);
}

const STRIP = { left: 96, right: 984, top: 300, bottom: 450, needle: 900 } as const;
const PAPER_SPEED = 380;

/** A seismograph strip in the sky: the pen at the right writing the ground's shaking, the paper running left. */
export function drawSeismograph(ctx: CanvasRenderingContext2D, t: number): void {
  const a = seismograph(t);
  if (a <= 0) return;
  const mid = (STRIP.top + STRIP.bottom) / 2;
  const amp = (STRIP.bottom - STRIP.top) * 0.46;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = '#efe6cf';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(STRIP.left, STRIP.top, STRIP.right - STRIP.left, STRIP.bottom - STRIP.top, 6);
  ctx.fill();
  ctx.stroke();
  // Faint grid, running with the paper.
  ctx.globalAlpha = a * 0.25;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const scroll = (t * PAPER_SPEED) % 60;
  for (let x = STRIP.left + 60 - scroll; x < STRIP.right; x += 60) {
    ctx.moveTo(x, STRIP.top + 4);
    ctx.lineTo(x, STRIP.bottom - 4);
  }
  for (const y of [mid - amp * 0.5, mid, mid + amp * 0.5]) {
    ctx.moveTo(STRIP.left + 4, y);
    ctx.lineTo(STRIP.right - 4, y);
  }
  ctx.stroke();
  // The trace, as the pen wrote it.
  ctx.globalAlpha = a;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let x = STRIP.left + 6; x <= STRIP.needle; x += 2) {
    const y = mid + amp * traceAt(t - (STRIP.needle - x) / PAPER_SPEED);
    if (x === STRIP.left + 6) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // The pen arm.
  const tip = { x: STRIP.needle, y: mid + amp * traceAt(t) };
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(STRIP.right + 4, STRIP.top - 18);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.fillStyle = CRIMSON;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Where the beachgoer stands, behind the stranded fish, m. */
const VISITOR_X = 2.35;
const VISITOR_H = 1.7;

/** A beachgoer: walks up behind the fish, raises a phone, and takes its picture. */
export function drawVisitor(ctx: CanvasRenderingContext2D, view: View, t: number): void {
  const a = visitor(t);
  if (a <= 0) return;
  const walk = 1 - Math.min(1, a * 1.0);
  const x = VISITOR_X + 0.9 * walk;
  const feet = toScreen(view, { x, y: sandAt(x) - 0.05 });
  const u = (VISITOR_H * view.zoom) / 100;
  const stride = Math.sin(t * 9) * 6 * u * walk;
  const lift = phoneUp(t);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(feet.x, feet.y);
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.8, 1.4 * u);
  // Legs.
  ctx.fillStyle = '#5a6f8f';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 4 * u, -46 * u);
    ctx.lineTo(side * 4 * u + side * stride, 0);
    ctx.lineWidth = 6.5 * u;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 4.2 * u;
    ctx.strokeStyle = '#e9d9c0';
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(1.8, 1.4 * u);
  ctx.strokeStyle = INK;
  // Shorts and shirt.
  ctx.fillStyle = '#5a6f8f';
  ctx.beginPath();
  ctx.roundRect(-9 * u, -54 * u, 18 * u, 14 * u, 3 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.moveTo(-9 * u, -52 * u);
  ctx.lineTo(-10 * u, -80 * u);
  ctx.quadraticCurveTo(0, -86 * u, 10 * u, -80 * u);
  ctx.lineTo(9 * u, -52 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Head, a sun hat.
  ctx.fillStyle = '#e9d9c0';
  ctx.beginPath();
  ctx.arc(0, -91 * u, 7.5 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8c76a';
  ctx.beginPath();
  ctx.ellipse(0, -97 * u, 13 * u, 3 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -100 * u, 7 * u, 5 * u, 0, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  // Arms: one raising the phone towards the fish's head (to his right).
  const hand = { x: lerp(8 * u, 20 * u, lift), y: lerp(-56 * u, -88 * u, lift) };
  ctx.lineWidth = 4.5 * u;
  ctx.beginPath();
  ctx.moveTo(8 * u, -78 * u);
  ctx.quadraticCurveTo(lerp(12 * u, 10 * u, lift), lerp(-66 * u, -84 * u, lift), hand.x, hand.y);
  ctx.moveTo(-8 * u, -78 * u);
  ctx.lineTo(-10 * u, -56 * u);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.8, 1.4 * u);
  ctx.fillStyle = '#26262c';
  ctx.beginPath();
  ctx.roundRect(hand.x - 2 * u, hand.y - 7 * u, 4 * u, 12 * u, 1.2 * u);
  ctx.fill();
  ctx.stroke();
  // The flash.
  const f = flash(t);
  if (f >= 0 && f <= 1) {
    ctx.strokeStyle = '#e8b93a';
    ctx.lineWidth = 3;
    ctx.globalAlpha = a * (1 - f);
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      const r0 = (8 + 30 * f) * u * 0.6;
      const r1 = (16 + 60 * f) * u * 0.6;
      ctx.beginPath();
      ctx.moveTo(hand.x + 4 * u + Math.cos(ang) * r0, hand.y + Math.sin(ang) * r0);
      ctx.lineTo(hand.x + 4 * u + Math.cos(ang) * r1, hand.y + Math.sin(ang) * r1);
      ctx.stroke();
    }
  }
  ctx.restore();
}
