import { C, FISH_TEX, heightAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { clamp01, smooth, VIDEO } from '../short';
import { CHALK, type Pt } from './scene';
import { captionAt } from './story';

/** The notes inked over the picture: the "?", the readouts, the labels and arrows, the ship's stamp, the captions. */

export const NIGHT = '#05091a';
export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: NIGHT };
export const SPOKEN = '#f5c84a';
export const SPOKEN_INK: TextInk = { fill: SPOKEN, halo: NIGHT };
const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
const CAPTION_MAX_W = 980;
export const TOP_Y = 380;

// ---------------------------------------------------------------- points on the fish

const CUSK = ANATOMY.facelesscusk;
/** Fish-texture px to body lengths from its centre (x forward, y down). */
const toBody = (x: number, y: number): Pt => ({ x: (x - FISH_TEX / 2) / (2 * CUSK.hl), y: (y - FISH_TEX / 2) / (2 * CUSK.hl) });
/** Where its eye would be: the game draws only a faint trace of it under the skin. */
export const EYE = toBody(C + CUSK.hl - 2 * CUSK.hl * CUSK.eye.t, C - heightAt(CUSK, CUSK.eye.t) * 0.3);
export const EYE_R = CUSK.eye.r / (2 * CUSK.hl);
/** Its small mouth under the overhanging snout. */
export const MOUTH = toBody(C + CUSK.hl - 2 * CUSK.hl * 0.08, C + 14);

export interface OnScreen {
  readonly x: number;
  readonly y: number;
  /** Body length, px. */
  readonly len: number;
  /** Nose up, radians (it faces right). */
  readonly tilt: number;
}

/** A point given in body lengths from its centre, on screen. */
export function fishPoint(f: OnScreen, p: Pt): Pt {
  const c = Math.cos(f.tilt);
  const s = Math.sin(f.tilt);
  return { x: f.x + (p.x * c + p.y * s) * f.len, y: f.y + (-p.x * s + p.y * c) * f.len };
}

// ---------------------------------------------------------------- the "?"

/** A dashed ring round the blank face and a big inked "?" in it. */
export function drawQuestion(ctx: CanvasRenderingContext2D, f: OnScreen, alpha: number, pop: number): void {
  if (alpha <= 0) return;
  const at = fishPoint(f, { x: EYE.x - 0.02, y: EYE.y + 0.02 });
  const r = 0.11 * f.len * pop;
  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = SPOKEN;
  ctx.lineWidth = Math.max(3, 0.007 * f.len);
  ctx.setLineDash([0.03 * f.len, 0.02 * f.len]);
  ctx.beginPath();
  ctx.ellipse(at.x, at.y, r * 1.15, r, -f.tilt, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, '?', at.x, at.y + r * 0.62, r * 1.75, 700, alpha, SPOKEN_INK);
}

// ---------------------------------------------------------------- readouts and labels

/** The depth, counting, big at the top. */
export function drawReadout(ctx: CanvasRenderingContext2D, metres: number, alpha: number): void {
  if (alpha <= 0) return;
  const deep = metres >= 3999.5;
  drawTextLine(ctx, `${Math.round(metres).toLocaleString('en-US')} m`, VIDEO.width / 2, TOP_Y + 20, 124, 700, alpha, deep ? SPOKEN_INK : PAPER_ON_INK);
  drawTextLine(ctx, 'down', VIDEO.width / 2, TOP_Y + 92, 62, 700, alpha * 0.85, PAPER_ON_INK);
}

/** A note with a chalk leader line to what it names, ending in a dot. */
export function drawNote(
  ctx: CanvasRenderingContext2D, text: string, at: Pt, to: Pt | null, size: number, alpha: number, ink: TextInk = PAPER_ON_INK, leadDx = 0,
): void {
  if (alpha <= 0) return;
  if (to) {
    const from = { x: at.x + leadDx, y: at.y + (to.y > at.y ? 18 : -size * 0.85) };
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = CHALK;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(from.x, (from.y + to.y) / 2, to.x, to.y);
    ctx.stroke();
    ctx.fillStyle = CHALK;
    ctx.beginPath();
    ctx.arc(to.x, to.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha, ink);
}

/** A chalk arrow drawn on from `from` to `to`, bowing sideways by `bow` px, `u` 0 .. 1 drawn. */
export function drawArrow(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, bow: number, u: number, alpha: number): void {
  if (u <= 0 || alpha <= 0) return;
  const mid = { x: (from.x + to.x) / 2 + bow, y: (from.y + to.y) / 2 };
  const at = (s: number): Pt => ({
    x: (1 - s) ** 2 * from.x + 2 * (1 - s) * s * mid.x + s * s * to.x,
    y: (1 - s) ** 2 * from.y + 2 * (1 - s) * s * mid.y + s * s * to.y,
  });
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = SPOKEN;
  ctx.fillStyle = SPOKEN;
  ctx.lineCap = 'round';
  ctx.lineWidth = 9;
  ctx.beginPath();
  for (let k = 0; k <= 24; k++) {
    const p = at((k / 24) * u);
    if (k === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  if (u > 0.85) {
    const tip = at(u);
    const back = at(u - 0.05);
    const a = Math.atan2(tip.y - back.y, tip.x - back.x);
    const head = 34 * smooth((u - 0.85) / 0.15);
    ctx.beginPath();
    ctx.moveTo(tip.x + Math.cos(a) * 6, tip.y + Math.sin(a) * 6);
    ctx.lineTo(tip.x - Math.cos(a - 0.5) * head, tip.y - Math.sin(a - 0.5) * head);
    ctx.lineTo(tip.x - Math.cos(a + 0.5) * head, tip.y - Math.sin(a + 0.5) * head);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** A ring pulsing round something, `u` 0 .. 1 over its life (steady at `hold` once grown). */
export function drawRing(ctx: CanvasRenderingContext2D, at: Pt, rx: number, ry: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = SPOKEN;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(at.x, at.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The ship's name and the year, stamped: the year big in yellow, landing with a thump. */
export function drawStamp(ctx: CanvasRenderingContext2D, at: Pt, name: string, year: string, nameAlpha: number, yearAlpha: number, thump: number): void {
  drawTextLine(ctx, year, at.x, at.y, 130 * thump, 700, yearAlpha, SPOKEN_INK);
  drawTextLine(ctx, name, at.x, at.y + 74, 64, 700, nameAlpha, PAPER_ON_INK);
}

/** The 4 km ruler down the side of the column: a line with end ticks and its length written along it. */
export function drawRuler(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const mid = (top + bottom) / 2;
  const gap = 140;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, mid - gap);
  ctx.moveTo(x, mid + gap);
  ctx.lineTo(x, bottom);
  for (const y of [top, bottom]) {
    ctx.moveTo(x - 18, y);
    ctx.lineTo(x + 18, y);
  }
  ctx.moveTo(x - 12, top + 18);
  ctx.lineTo(x, top);
  ctx.lineTo(x + 12, top + 18);
  ctx.moveTo(x - 12, bottom - 18);
  ctx.lineTo(x, bottom);
  ctx.lineTo(x + 12, bottom - 18);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(x, mid);
  ctx.rotate(-Math.PI / 2);
  drawTextLine(ctx, '4,000 m', 0, 24, 76, 700, alpha, SPOKEN_INK);
  ctx.restore();
}

// ---------------------------------------------------------------- captions

/** The spoken line, word by word, the word being said in yellow. */
export function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    const colours = i === now.word ? SPOKEN_INK : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

/** 0 .. 1 .. 0 bump over `s` seconds from `at`. */
export const bump = (t: number, at: number, s: number): number => Math.sin(Math.PI * clamp01((t - at) / s));
