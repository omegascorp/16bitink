import { INK, PAPER } from '../../../src/art/pen';
import { drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { FRAME } from '../descent/frame';
import { drawTextLeft, PAPER_ON_INK } from '../descent/hud';
import { clamp01, smooth } from '../short';
import { SPECIES, weightLabels, type Kind } from './species';

/**
 * What's written over the climb: the weight tag (bottom centre, the video's
 * "price tag": pounds big, grams small), the step card (top left), the size
 * ruler (left edge, log scale, metric with US beside it) and the food
 * pyramid (top right), each band ten times less food than the one under it.
 */

const W = FRAME.width;
const H = FRAME.height;
const ACCENT = '#f2b233';
const RED = '#c8372d';

/** Ink on pale water, paper on deep water. */
export const inkOn = (dark: number): TextInk => (dark > 0.5 ? PAPER_ON_INK : INK_ON_PAPER);
const strokeOn = (dark: number): string => (dark > 0.5 ? PAPER : INK);

// ---------------------------------------------------------------- the weight tag

export interface TagState {
  /** The weight shown, grams (it counts up between steps). */
  readonly grams: number;
  /** The jump to shout ("×1,000"), and how far its pop has got (0 hidden .. 1 settled). */
  readonly jump: string;
  readonly pop: number;
  readonly alpha: number;
}

/** The tag counting from one weight to the next over [from, to] (log scale, so every digit gets its moment). */
export const countUp = (a: number, b: number, t: number, from: number, to: number): number =>
  Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * smooth((t - from) / (to - from)));

export function drawWeightTag(ctx: CanvasRenderingContext2D, s: TagState, dark: number): void {
  if (s.alpha <= 0) return;
  const { lb, g } = weightLabels(s.grams);
  const ink = inkOn(dark);
  const y = H - 118;
  drawTextLine(ctx, lb, W / 2, y, 112, 700, s.alpha, ink);
  drawTextLine(ctx, g, W / 2, y + 56, 46, 500, s.alpha * 0.9, ink);
  if (!s.jump || s.pop <= 0) return;
  ctx.save();
  ctx.font = '700 112px Caveat';
  const half = ctx.measureText(lb).width / 2;
  ctx.font = '700 92px Caveat';
  const popHalf = ctx.measureText(`${s.jump}!`).width / 2;
  ctx.restore();
  const k = s.pop < 0.35 ? 0.4 + 2.2 * s.pop : 1.17 - 0.17 * smooth((s.pop - 0.35) / 0.4);
  ctx.save();
  ctx.translate(W / 2 + half + 40 + popHalf, y - 30);
  ctx.rotate(-0.12);
  ctx.scale(k, k);
  drawTextLine(ctx, `${s.jump}!`, 0, 0, 92, 700, s.alpha * clamp01(s.pop * 4), { fill: ACCENT, halo: '#3a2205' });
  ctx.restore();
}

// ---------------------------------------------------------------- the step card

export function drawStepCard(ctx: CanvasRenderingContext2D, step: number, kind: Kind, alpha: number, dark: number): void {
  if (alpha <= 0) return;
  const sp = SPECIES[kind];
  const ink = inkOn(dark);
  const x = 150;
  drawTextLeft(ctx, step > 0 ? `STEP ${step}` : 'THE GIANTS', x, 104, 50, 700, alpha * 0.85, ink);
  drawTextLeft(ctx, sp.name.toUpperCase(), x, 178, 88, 700, alpha, ink);
  drawTextLeft(ctx, `${sp.size[0]} · ${sp.size[1]}`, x, 228, 42, 500, alpha * 0.9, ink);
}

// ---------------------------------------------------------------- the size ruler

const RULER_X = 78;
const RULER_TOP = 290;
const RULER_BOTTOM = 930;
const LOG_MIN = -5; // 0.01 mm
const LOG_MAX = 1.5; // ~30 m
const rulerY = (metres: number): number =>
  RULER_BOTTOM - ((Math.log10(metres) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (RULER_BOTTOM - RULER_TOP);

const TICKS: readonly (readonly [number, string])[] = [
  [1e-5, '0.01 mm'], [1e-4, '0.1 mm'], [1e-3, '1 mm'], [1e-2, '1 cm'], [0.1, '10 cm · 4 in'], [1, '1 m · 3 ft'], [10, '10 m · 33 ft'],
];
/** Everyday things beside the ruler, appearing as the chain grows past them. */
const MARKS: readonly (readonly [number, string])[] = [
  [3e-4, 'grain of salt'], [3e-3, 'sesame seed'], [0.18, 'your hand'], [1.75, 'a person'], [12, 'a bus'],
];

/** The ruler with a marker at `metres` (the hero's length); everyday marks fade in once the marker passes them. */
export function drawRuler(ctx: CanvasRenderingContext2D, metres: number, alpha: number, dark: number): void {
  if (alpha <= 0) return;
  const stroke = strokeOn(dark);
  const ink = inkOn(dark);
  ctx.save();
  ctx.globalAlpha = alpha * 0.85;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(RULER_X, RULER_TOP - 10);
  ctx.lineTo(RULER_X, RULER_BOTTOM + 10);
  ctx.stroke();
  ctx.lineWidth = 2;
  for (let e = LOG_MIN; e <= LOG_MAX; e += 0.25) {
    const y = rulerY(10 ** e);
    const major = Math.abs(e - Math.round(e)) < 1e-6;
    ctx.beginPath();
    ctx.moveTo(RULER_X - (major ? 14 : 7), y);
    ctx.lineTo(RULER_X, y);
    ctx.stroke();
  }
  ctx.restore();
  for (const [m, label] of TICKS) drawTextLeft(ctx, label, RULER_X + 14, rulerY(m) + 9, 26, 500, alpha * 0.8, ink);
  for (const [m, label] of MARKS) {
    const shown = clamp01((Math.log10(metres) - Math.log10(m) + 0.15) / 0.3);
    drawTextLeft(ctx, `← ${label}`, RULER_X + 14, rulerY(m) + 9, 24, 700, alpha * 0.75 * shown, ink);
  }
  // The marker: a red pointer on the hero's length.
  const y = rulerY(Math.min(10 ** LOG_MAX, Math.max(10 ** LOG_MIN, metres)));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = RED;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(RULER_X - 6, y);
  ctx.lineTo(RULER_X - 38, y - 15);
  ctx.lineTo(RULER_X - 38, y + 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the food pyramid

export const BAND_LABELS = ['100%', '10%', '1%', '0.1%', '0.01%', '0.001%'] as const;
const BAND_NAMES = ['diatoms', 'copepods', 'anchovies', 'mackerel', 'tuna', 'orcas'] as const;

export interface PyramidState {
  /** How many bands are drawn (fractional while the next draws in). */
  readonly bands: number;
  /** Where and how big: centre of the base, and the base width in px. */
  readonly x: number;
  readonly baseY: number;
  readonly base: number;
  readonly alpha: number;
  /** The empty seventh band above the orca, 0..1 (section 8). */
  readonly ghost: number;
  /** Arrows from the giants to band 2 (index 1), 0..1 each. */
  readonly arrows: number;
  /** Names on the bands, 0..1. */
  readonly names: number;
}

/** Band k's width: each narrower than the one under it (ten times less food; drawn at about half so it stays visible). */
const bandWidth = (base: number, k: number): number => base * 0.52 ** k;

/** Where the giants' arrow starts (its tail), for a label beside it. */
export function arrowTail(p: PyramidState): { x: number; y: number } {
  const bandH = p.base * 0.11;
  return { x: p.x - bandWidth(p.base, 1) / 2 - 10 - p.base * 0.55 * smooth(p.arrows), y: p.baseY - 2 * bandH + bandH * 0.43 };
}

export function drawPyramid(ctx: CanvasRenderingContext2D, p: PyramidState, dark: number): void {
  if (p.alpha <= 0 || p.bands <= 0) return;
  const bandH = p.base * 0.11;
  const ink = inkOn(dark);
  const stroke = strokeOn(dark);
  const label = Math.max(30, p.base * 0.085);
  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.lineWidth = Math.max(2, p.base * 0.006);
  ctx.strokeStyle = stroke;
  for (let k = 0; k < Math.ceil(p.bands); k++) {
    const grow = clamp01(p.bands - k);
    const w = bandWidth(p.base, k) * smooth(grow);
    const y = p.baseY - (k + 1) * bandH;
    ctx.fillStyle = k === 0 ? '#6fae6a' : `hsl(${28 + k * 6}, 70%, ${62 - k * 4}%)`;
    ctx.fillRect(p.x - w / 2, y, w, bandH * 0.86);
    ctx.strokeRect(p.x - w / 2, y, w, bandH * 0.86);
  }
  ctx.restore();
  for (let k = 0; k < Math.ceil(p.bands); k++) {
    const grow = clamp01(p.bands - k);
    const y = p.baseY - (k + 1) * bandH + bandH * 0.68;
    drawTextLeft(ctx, BAND_LABELS[k]!, p.x + bandWidth(p.base, k) / 2 + label * 0.4, y, label, 700, p.alpha * smooth(grow), ink);
    // The copepods' name gives way to the giants' arrow pointing at that band.
    if (p.names > 0 && !(k === 1 && p.arrows > 0)) {
      ctx.save();
      ctx.font = `500 ${label * 0.8}px Caveat`;
      const w = ctx.measureText(BAND_NAMES[k]!).width;
      ctx.restore();
      drawTextLeft(ctx, BAND_NAMES[k]!, p.x - bandWidth(p.base, k) / 2 - label * 0.4 - w, y, label * 0.8, 500, p.alpha * p.names * smooth(grow), ink);
    }
  }
  if (p.ghost > 0) {
    const w = bandWidth(p.base, 6);
    const y = p.baseY - 7 * bandH;
    ctx.save();
    ctx.globalAlpha = p.alpha * p.ghost;
    ctx.strokeStyle = RED;
    ctx.lineWidth = Math.max(2, p.base * 0.006);
    ctx.setLineDash([10, 9]);
    ctx.strokeRect(p.x - Math.max(w, p.base * 0.12) / 2, y, Math.max(w, p.base * 0.12), bandH * 0.86);
    ctx.restore();
    drawTextLine(ctx, '?', p.x, y - bandH * 0.25, label * 1.6, 700, p.alpha * p.ghost, { fill: RED, halo: PAPER });
  }
  if (p.arrows > 0) {
    // From the left, two red arrows into the copepod band: the giants feed at step 2.
    const y = p.baseY - 2 * bandH + bandH * 0.43;
    const tipX = p.x - bandWidth(p.base, 1) / 2 - 10;
    const fromX = tipX - p.base * 0.55 * smooth(p.arrows);
    ctx.save();
    ctx.globalAlpha = p.alpha * clamp01(p.arrows * 3);
    ctx.strokeStyle = RED;
    ctx.fillStyle = RED;
    ctx.lineWidth = Math.max(4, p.base * 0.012);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fromX, y);
    ctx.lineTo(tipX - 18, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tipX, y);
    ctx.lineTo(tipX - 26, y - 14);
    ctx.lineTo(tipX - 26, y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** A puff of ink smoke curling off a band (the 90% that's burned up), u 0..1 through the puff. */
export function drawSmoke(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, u: number, dark: number): void {
  if (u <= 0 || u >= 1) return;
  ctx.save();
  ctx.strokeStyle = dark > 0.5 ? 'rgba(230,226,240,0.8)' : 'rgba(40,36,46,0.75)';
  ctx.lineWidth = Math.max(1.5, size * 0.04);
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.32;
    const r = size * (0.3 + 1.4 * u) * (0.8 + 0.08 * i);
    const cx = x + Math.cos(a) * r * 0.7;
    const cy = y + Math.sin(a) * r;
    ctx.globalAlpha = (1 - u) * 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, size * (0.12 + 0.2 * u), a + 1.4 + 6 * u, a + 4.6 + 6 * u);
    ctx.stroke();
  }
  ctx.restore();
}
