import { type Draw } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import { EGG_PAINT as E } from '../../../src/art/chapters/savannaSnakePaint';
import { type BodyModel, topY } from './model';
import { EGG, spikesLit, spikesOut } from './story';
import { across, along, bandPoly, sliceAt } from './bodyArt';
import { STRAIGHT } from './path';

/**
 * The x-ray of the neck (the backbone and the spikes that crack the egg) and
 * the small effects: the brackets that set the egg against the head, the
 * glow of the lit spikes, the crack's flash, the pop's puff.
 */

const BONE = '#efe6cf';
const BONE_SHADE = '#a8996f';
const GOLD = '#ffd45c';

/** The teal glass inside the skin while the x-ray is up. */
export function xrayInterior(d: Draw, m: BodyModel, s1: number): void {
  if (m.xray <= 0.01) return;
  const ctx = d.pen.ctx;
  const pts = bandPoly(m, 0, s1);
  ctx.save();
  const g = ctx.createLinearGradient(0, -44, 0, 0);
  g.addColorStop(0, `rgba(48,128,140,${0.9 * m.xray})`);
  g.addColorStop(1, `rgba(12,44,56,${0.95 * m.xray})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The glow round the glassy neck. */
export function xrayRim(d: Draw, m: BodyModel, s1: number): void {
  if (m.xray <= 0.01) return;
  const ctx = d.pen.ctx;
  const top = along(20, s1, 1).map((s) => across(sliceAt(m, s), 0));
  ctx.save();
  ctx.shadowColor = `rgba(120,240,230,${0.9 * m.xray})`;
  ctx.shadowBlur = 14;
  d.pen.stroke(top, 1.1, `rgba(170,250,240,${0.8})`, m.xray, false);
  ctx.restore();
}

/** The backbone along the top of the neck, ribs, and the spikes pointing down into the throat. */
export function backbone(d: Draw, m: BodyModel, centre: number, t: number): void {
  const xr = m.xray;
  if (xr <= 0.01) return;
  const { pen } = d;
  const ctx = pen.ctx;
  const out = spikesOut(t);
  const lit = spikesLit(t);
  const from = Math.max(28, centre - 44);
  const to = Math.min(STRAIGHT - 4, centre + 52);
  ctx.save();
  ctx.globalAlpha = xr;
  // The column: beads linked by a rod along the top edge.
  const rod = [];
  for (let s = from; s <= to; s += 2) rod.push({ x: s, y: topY(m, s) + 2.1 });
  pen.stroke(rod, 1.5, BONE_SHADE, 0.9, false);
  for (let s = from; s <= to; s += 2.6) {
    const p = { x: s, y: topY(m, s) + 2.1 };
    pen.dot(p.x, p.y, 1.15, BONE, 1);
    pen.hair([{ x: p.x - 0.5, y: p.y + 0.6 }, { x: p.x + 0.7, y: p.y + 0.5 }], 0.3, BONE_SHADE, 0.8);
  }
  // Ribs curving down, faint.
  for (let s = from + 3; s <= to; s += 5.2) {
    const y0 = topY(m, s) + 2.6;
    pen.hair([{ x: s, y: y0 }, { x: s + 2.4, y: y0 + 5 }, { x: s + 2.2, y: y0 + 11 }], 0.35, BONE, 0.35);
  }
  ctx.restore();
  // The spikes, seven, pointing down at the egg: they grow on "spikes", glow gold on "BACKBONE".
  if (out <= 0.01) return;
  for (let i = 0; i < 7; i++) {
    const s = centre - 13 + i * 4.4;
    const root = { x: s, y: topY(m, s) + 2.6 };
    const len = (4.6 + 1.6 * Math.sin(((i + 0.5) / 7) * Math.PI)) * out;
    const tip = { x: s + 0.4, y: root.y + len };
    ctx.save();
    ctx.globalAlpha = xr;
    if (lit > 0.01) {
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 6.5);
      g.addColorStop(0, `rgba(255,236,150,${0.95 * lit})`);
      g.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(tip.x - 7, tip.y - 7, 14, 14);
      ctx.globalCompositeOperation = 'source-over';
    }
    pen.fill([{ x: root.x - 0.95, y: root.y - 0.4 }, { x: root.x + 0.95, y: root.y - 0.4 }, tip], lit > 0.5 ? '#fff3c2' : BONE, 1);
    pen.hair([{ x: root.x - 0.95, y: root.y - 0.4 }, tip, { x: root.x + 0.95, y: root.y - 0.4 }], 0.3, lit > 0.5 ? GOLD : BONE_SHADE, 0.9);
    ctx.restore();
  }
}

/** A dashed bracket (an arrow with end ticks) from y0 to y1 at x, and a pulse of gold behind it. */
function bracket(d: Draw, x: number, y0: number, y1: number, show: number, pulse: number): void {
  const { pen } = d;
  const ctx = pen.ctx;
  ctx.save();
  ctx.globalAlpha = show;
  if (pulse > 0) {
    ctx.shadowColor = `rgba(255,214,90,${pulse})`;
    ctx.shadowBlur = 16;
  }
  const col = '#fff2c0';
  pen.stroke([{ x, y: y0 }, { x, y: y1 }], 0.8, col, 1, false);
  for (const [y, dir] of [[y0, 1], [y1, -1]] as const) {
    pen.stroke([{ x: x - 1.7, y: y + dir * 2.6 }, { x, y }, { x: x + 1.7, y: y + dir * 2.6 }], 0.8, col, 1, false);
    pen.stroke([{ x: x - 2.6, y }, { x: x + 2.6, y }], 0.8, col, 1, false);
  }
  ctx.restore();
}

/** On "HEAD": the egg's height and the head's, side by side. */
export function brackets(d: Draw, m: BodyModel, show: number, pulse: number): void {
  if (show <= 0.01) return;
  const eggX = (m.object?.x ?? 0) - EGG.rx - 4;
  bracket(d, eggX, -2 * EGG.ry, 0, show, pulse);
  bracket(d, 38, -10.8, 0, show, pulse);
}

/** A ring spreading out from (x, y): u 0..1. */
export function ring(d: Draw, x: number, y: number, u: number, r: number, color = PAPER_FILL): void {
  if (u <= 0 || u >= 1) return;
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.globalAlpha = (1 - u) * 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.9 * (1 - u) + 0.2;
  ctx.beginPath();
  ctx.arc(x, y, r * (0.15 + u), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Short rays flying out of a point: the crack, the pop. */
export function burst(d: Draw, x: number, y: number, u: number, r: number, color: string, n = 12): void {
  if (u <= 0 || u >= 1) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    const r0 = r * (0.25 + 0.6 * u);
    const r1 = r * (0.5 + 0.9 * u);
    d.pen.hair([{ x: x + Math.cos(a) * r0, y: y + Math.sin(a) * r0 }, { x: x + Math.cos(a) * r1, y: y + Math.sin(a) * r1 }], 0.6, color, 1 - u);
  }
}

/** A tiny shell crumb or sparkle drifting off. */
export function crumbs(d: Draw, x: number, y: number, u: number): void {
  if (u <= 0 || u >= 1) return;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * (0.1 + 0.8 * ((i * 0.37) % 1));
    const sp = 10 + (i % 3) * 5;
    d.pen.dot(x + Math.cos(a) * sp * u, y + Math.sin(a) * sp * u + 14 * u * u, 0.5, i % 2 ? E.edging : '#efe3c6', 1 - u);
  }
}

/** A white flash over the whole picture. */
export function flash(ctx: CanvasRenderingContext2D, width: number, height: number, a: number): void {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = Math.min(0.85, a);
  ctx.fillStyle = '#fff8e0';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
