import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT } from '../captions';
import { clamp01, smooth } from '../short';
import { drawCard, drawText, INK_ON_PAPER, PAPER_ON_INK, RED, YELLOW_ON_INK } from '../swallowyou/text';
import { drawPosed } from './scene';
import { SHORT, type Contestant, type Evidence } from './species';
import { COUNTER_DROPS, fishLeft, TUNA_HAIL, type Verdict } from './verdicts';

/**
 * The readouts, flat and simple: the FISH LEFT counter top right, the round's
 * title card top left, rubber stamps (OUT in red, the evidence kinds in their
 * own inks), the green pass tick, the evidence tags stacked bottom left, and
 * the contestant cards (a face, a name, a number badge).
 */

export const GREEN = '#2fae4e';
export const OUT_RED = '#e0322b';
const GREY = '#b9bfc8';

export const EVIDENCE_INK: Readonly<Record<Evidence, string>> = {
  MEASURED: '#ffcf33',
  ESTIMATED: '#f2ead7',
  REPORTED: '#9fd8ff',
  MYTH: GREY,
  'NO STUDY': GREY,
};

export const fadeIn = (t: number, at: number, s = 0.3): number => smooth((t - at) / s);
export const window01 = (t: number, from: number, to: number, s = 0.3): number => fadeIn(t, from, s) * (1 - smooth((t - to) / s));

/** The counter, top right: FISH LEFT and the number, shaking as it drops. */
export function drawCounter(ctx: CanvasRenderingContext2D, t: number, alpha: number, scale = 1): void {
  if (alpha <= 0) return;
  const n = fishLeft(t);
  const last = [...COUNTER_DROPS, TUNA_HAIL.from].filter((d) => d <= t).sort((a, b) => b - a)[0] ?? -9;
  const shake = clamp01(1 - (t - last) / 0.5);
  const slam = t < 0.25 ? 1 + 0.12 * (1 - t / 0.25) : 1;
  const k = scale * slam * (1 + 0.12 * shake);
  ctx.save();
  ctx.translate(1700 + Math.sin(t * 70) * 7 * shake, 104);
  ctx.scale(k, k);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(6,14,28,0.92)';
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-180, -80, 360, 170, 22);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(1700 + Math.sin(t * 70) * 7 * shake, 104);
  ctx.scale(k, k);
  drawText(ctx, 'FISH LEFT', { x: 0, y: -46, size: 40, maxWidth: 320 }, 700, alpha, PAPER_ON_INK);
  drawText(ctx, String(n), { x: 0, y: 30, size: 116, maxWidth: 320 }, 700, alpha, { fill: shake > 0 ? '#ff6b5e' : '#ffcf33', halo: '#140d02' });
  ctx.restore();
}

/** The round's title card, top left. */
export function drawRoundCard(ctx: CanvasRenderingContext2D, title: string, sub: string, alpha: number): void {
  if (alpha <= 0) return;
  const slide = (1 - alpha) * -80;
  drawCard(ctx, 36 + slide, 22, 740, 150, alpha);
  drawText(ctx, title, { x: 64 + slide, y: 76, size: 64, maxWidth: 690, left: true }, 700, alpha, INK_ON_PAPER);
  drawText(ctx, sub, { x: 66 + slide, y: 136, size: 40, maxWidth: 690, left: true }, 500, alpha, INK_ON_PAPER);
}

/** A rubber stamp slammed on at `at` (big, then thumping down), held after. */
export function drawStamp(
  ctx: CanvasRenderingContext2D, text: string, colour: string, x: number, y: number, size: number, t: number, at: number, alpha = 1, rot = -0.12,
): void {
  const u = (t - at) / 0.2;
  if (u <= 0 || alpha <= 0) return;
  const k = u >= 1 ? 1 : 1.8 - 0.8 * smooth(u);
  const a = alpha * clamp01(u * 3);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(k, k);
  ctx.globalAlpha = a;
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const w = Math.max(size * 2.4, ctx.measureText(text).width + size * 0.9);
  ctx.fillStyle = 'rgba(10,6,4,0.35)';
  ctx.strokeStyle = colour;
  ctx.lineWidth = size * 0.11;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -size * 0.72, w, size * 1.44, size * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(k, k);
  drawText(ctx, text, { x: 0, y: size * 0.04, size, maxWidth: size * 9 }, 700, a, { fill: colour, halo: INK });
  ctx.restore();
}

/** OUT, in red. */
export const drawOut = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number, at: number, alpha = 1): void =>
  drawStamp(ctx, 'OUT', OUT_RED, x, y, size, t, at, alpha);

/** The pass: a green tick in a circle, popping on. */
export function drawTick(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, at: number, alpha = 1): void {
  const u = (t - at) / 0.25;
  if (u <= 0 || alpha <= 0) return;
  const k = u >= 1 ? 1 : 0.4 + 0.6 * u + 0.4 * Math.sin(Math.PI * u);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.globalAlpha = alpha * clamp01(u * 3);
  ctx.fillStyle = GREEN;
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = r * 0.24;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, 0);
  ctx.lineTo(-r * 0.1, r * 0.38);
  ctx.lineTo(r * 0.5, -r * 0.38);
  ctx.stroke();
  ctx.restore();
}

/** One evidence tag: the fish, what was measured, and its stamp; an aside under it. */
function drawTag(ctx: CanvasRenderingContext2D, v: Verdict, x: number, y: number, alpha: number): number {
  const size = 36;
  const text = `${SHORT[v.fish] ?? v.fish.toUpperCase()}${v.tag ? ` · ${v.tag}` : ''}`;
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const tw = Math.min(1180, ctx.measureText(text).width);
  ctx.font = `700 ${size * 0.8}px ${CAPTION_FONT}`;
  const sw = ctx.measureText(v.stamp).width + 30;
  ctx.restore();
  const h = v.aside ? 92 : 60;
  const w = tw + sw + 60;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(6,14,28,0.85)';
  ctx.strokeStyle = v.kind === 'out' ? OUT_RED : GREEN;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x, y - h, w, h, 14);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  drawText(ctx, text, { x: x + 20, y: y - h + 31, size, maxWidth: 1180, left: true }, 700, alpha, PAPER_ON_INK);
  const ink = EVIDENCE_INK[v.stamp];
  const sx = x + 34 + tw;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(sx, y - h + 12, sw, 40, 8);
  ctx.stroke();
  ctx.restore();
  drawText(ctx, v.stamp, { x: sx + sw / 2, y: y - h + 33, size: size * 0.8, maxWidth: sw }, 700, alpha, { fill: ink, halo: INK });
  if (v.aside) drawText(ctx, v.aside, { x: x + 22, y: y - 26, size: 30, maxWidth: 900, left: true }, 500, alpha, PAPER_ON_INK);
  return h + 10;
}

/** The evidence tags on screen at t, newest at the bottom, stacked up from the bottom left. */
export function drawTags(ctx: CanvasRenderingContext2D, verdicts: readonly Verdict[], t: number, alpha: number, x = 96, bottom = 1060): void {
  if (alpha <= 0) return;
  const showing = verdicts
    .map((v) => ({ v, a: window01(t, v.at + 0.35, v.at + (v.tagS ?? 5), 0.25) }))
    .filter((s) => s.a > 0)
    .slice(-3)
    .reverse();
  let y = bottom;
  for (const s of showing) y -= drawTag(ctx, s.v, x, y, s.a * alpha);
}

/** A contestant card: its face, its number badge and its name. */
export function drawMiniCard(
  ctx: CanvasRenderingContext2D, c: Contestant, x: number, y: number, w: number, h: number, t: number, boil: number, alpha: number, grey = 0,
): void {
  if (alpha <= 0) return;
  drawCard(ctx, x, y, w, h, alpha);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 4, y + 4, w - 8, h - 44);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#7fd0ef';
  ctx.fillRect(x + 4, y + 4, w - 8, h - 44);
  // The face: the head end fills the window.
  const len = c.id === 'eel' ? w * 1.7 : c.id === 'white' || c.id === 'mako' ? w * 2.2 : w * 1.15;
  drawPosed(ctx, c.id, x + w * 0.5 + len * 0.22, y + (h - 40) * 0.52, len, -1, t, boil, { effort: 0.2 });
  if (grey > 0) {
    ctx.fillStyle = `rgba(90,96,104,${0.7 * grey})`;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  drawText(ctx, c.name.split(' ').slice(-1)[0]!, { x: x + w / 2, y: y + h - 20, size: 28, maxWidth: w - 12 }, 700, alpha, INK_ON_PAPER);
  // The number badge.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = RED;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + 8, y + 8, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  drawText(ctx, `No.${c.no}`, { x: x + 8, y: y + 9, size: 20, maxWidth: 44 }, 700, alpha, { fill: PAPER, halo: '#5a0d0a' });
}

/** The once-only note in the cold open. */
export function drawStagedNote(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (alpha <= 0) return;
  const text = 'line-up staged · every result sourced';
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(6,14,28,0.8)';
  ctx.beginPath();
  ctx.roundRect(960 - 330, 1018, 660, 54, 27);
  ctx.fill();
  ctx.restore();
  drawText(ctx, text, { x: 960, y: 1046, size: 36, maxWidth: 620 }, 700, alpha, YELLOW_ON_INK);
}
