import { ZONE_INFO } from '../../../src/levels/zones';
import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { clamp01, ramp, window01 } from '../short';
import { FRAME } from './frame';
import { sectionStart, T } from './timeline';
import { atmAt, darknessAt, foodAt, lightAt } from './world';

/**
 * What's written over the dive: the depth (top left) and the zone bar down
 * the left edge, the three dials (top right: light, food, pressure), each
 * zone's chapter card (top middle, as in the game's map), rings and labels
 * on the animals the narrator names, and the big numbers.
 */

export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
const ACCENT = '#f5c84a';
const W = FRAME.width;

/** Ink in sunlit water, paper in the dark. */
export const inkFor = (dark: number): TextInk => (dark > 0.45 ? PAPER_ON_INK : INK_ON_PAPER);
const strokeFor = (dark: number): string => (dark > 0.45 ? PAPER : INK);

export const formatMetres = (m: number): string => `${Math.round(m).toLocaleString('en-US')} m`;

/** Left-aligned text in the handwriting font, with a halo. */
export function drawTextLeft(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, weight: 500 | 700, alpha: number, colours: TextInk): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.font = `${weight} ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  drawTextLine(ctx, text, x + w / 2, y, size, weight, alpha, colours);
}

// ---------------------------------------------------------------- depth and zone bar

/** The depth, big, and the zone's real name under it. */
export function drawDepth(ctx: CanvasRenderingContext2D, metres: number, alpha: number): void {
  if (alpha <= 0) return;
  const dark = darknessAt(metres);
  drawTextLeft(ctx, formatMetres(metres), 120, 112, 92, 700, alpha, inkFor(dark));
  drawTextLeft(ctx, zoneName(metres), 124, 162, 44, 500, alpha * 0.9, inkFor(dark));
}

/** The ocean's real layers, which the game's chapters follow down. */
function zoneName(m: number): string {
  if (m < 200) return 'sunlight zone';
  if (m < 1000) return 'twilight zone';
  if (m < 4000) return 'midnight zone';
  if (m < 6000) return 'abyssal zone';
  return 'hadal zone';
}

/** A bar down the left edge: the ten chapters, light to dark, with a marker at the current depth. */
const BAR = { x: 56, top: 220, bottom: 940, w: 26 } as const;

export function drawZoneBar(ctx: CanvasRenderingContext2D, metres: number, alpha: number): void {
  if (alpha <= 0) return;
  const n = ZONE_INFO.length;
  const band = (BAR.bottom - BAR.top) / n;
  ctx.save();
  ctx.globalAlpha = alpha;
  ZONE_INFO.forEach((z, i) => {
    const dark = darknessAt((z.depth[0] + z.depth[1]) / 2);
    const shade = Math.round(235 - 215 * dark);
    ctx.fillStyle = `rgb(${shade - 20},${shade - 5},${Math.min(255, shade + 20)})`;
    ctx.fillRect(BAR.x, BAR.top + i * band, BAR.w, band);
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.strokeRect(BAR.x, BAR.top, BAR.w, BAR.bottom - BAR.top);
  // The marker: where we are, by chapter (linear within each).
  const i = Math.max(0, ZONE_INFO.findIndex((z) => metres < z.depth[1]));
  const z = ZONE_INFO[i === -1 ? n - 1 : i]!;
  const u = clamp01((metres - z.depth[0]) / (z.depth[1] - z.depth[0]));
  const y = BAR.top + (i + u) * band;
  ctx.fillStyle = ACCENT;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(BAR.x + BAR.w + 4, y);
  ctx.lineTo(BAR.x + BAR.w + 26, y - 13);
  ctx.lineTo(BAR.x + BAR.w + 26, y + 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the three dials

export interface DialState {
  readonly metres: number;
  /** Each dial draws itself in over its own [from, from + 0.8]. */
  readonly shown: readonly [number, number, number];
  /** How much each dial glows (the narration pointing at it), 0 .. 1. */
  readonly glow: readonly [number, number, number];
}

const DIALS = [{ x: 1500, label: 'light' }, { x: 1650, label: 'food' }, { x: 1800, label: 'pressure' }] as const;
const DIAL_Y = 104;
const DIAL_R = 52;

export function drawDials(ctx: CanvasRenderingContext2D, d: DialState): void {
  const dark = darknessAt(d.metres);
  const ink = strokeFor(dark);
  const values = [lightAt(d.metres), foodAt(d.metres), Math.min(1, Math.log10(atmAt(d.metres)) / Math.log10(1100))];
  DIALS.forEach((dial, i) => {
    const show = d.shown[i]!;
    if (show <= 0) return;
    ctx.save();
    ctx.globalAlpha = show;
    if (d.glow[i]! > 0) {
      ctx.fillStyle = `rgba(245,200,74,${(0.45 * d.glow[i]!).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(dial.x, DIAL_Y, DIAL_R + 18, 0, Math.PI * 2);
      ctx.fill();
    }
    // The face: a half-ring from left (empty) round the top to right (full).
    ctx.lineCap = 'round';
    ctx.strokeStyle = ink;
    ctx.globalAlpha = show * 0.35;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(dial.x, DIAL_Y + 14, DIAL_R, Math.PI, Math.PI + Math.PI * show);
    ctx.stroke();
    ctx.globalAlpha = show;
    ctx.strokeStyle = i === 2 ? '#c8372d' : ACCENT;
    ctx.beginPath();
    ctx.arc(dial.x, DIAL_Y + 14, DIAL_R, Math.PI, Math.PI + Math.PI * values[i]! * show);
    ctx.stroke();
    // The needle.
    const a = Math.PI + Math.PI * values[i]! * show;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(dial.x, DIAL_Y + 14);
    ctx.lineTo(dial.x + Math.cos(a) * (DIAL_R - 14), DIAL_Y + 14 + Math.sin(a) * (DIAL_R - 14));
    ctx.stroke();
    ctx.restore();
    const reading = i === 0 ? `${Math.round(values[0]! * 100)}%` : i === 1 ? (values[1]! > 0.6 ? 'plenty' : values[1]! > 0.15 ? 'little' : 'scraps') : `${Math.round(atmAt(d.metres)).toLocaleString('en-US')} atm`;
    drawTextLine(ctx, dial.label, dial.x, DIAL_Y + 58, 34, 700, show, inkFor(dark));
    drawTextLine(ctx, reading, dial.x, DIAL_Y + 94, 30, 500, show * 0.9, inkFor(dark));
  });
}

/** The dials' state over the video: drawn in as the narration names them, lit when it points at one. */
export function dialsAt(t: number, metres: number): DialState {
  const shown = (from: number): number => ramp(t, from, from + 0.8);
  const pulse = (from: number, to: number): number => window01(t, from, to, 0.4) * (0.75 + 0.25 * Math.sin((t - from) * 7));
  return {
    metres,
    shown: [shown(T.lightFades), shown(T.foodRunsOut), shown(T.pressureClimbs)],
    glow: [
      Math.max(pulse(T.lightFades, T.lightFades + 1.4), pulse(T.firstDial, T.rememberRed), pulse(T.noSunlight, T.noSunlight + 2)),
      Math.max(pulse(T.foodRunsOut, T.foodRunsOut + 1.4), pulse(T.nothingMakesFood, T.nothingMakesFood + 3)),
      Math.max(pulse(T.pressureClimbs, T.pressureClimbs + 3), pulse(T.fourDegrees + 0.8, T.theyWait - 1.2), pulse(T.notice, T.holdOn + 1), pulse(T.pressureWins, T.invisible)),
    ],
  };
}

// ---------------------------------------------------------------- chapter cards

/** Each zone's chapter card: the game's chapter number and name, and the depth range, as the camera arrives. */
const CARDS: readonly { readonly chapter: number; readonly at: number }[] = [
  { chapter: 1, at: sectionStart(1) },
  { chapter: 2, at: sectionStart(2) },
  { chapter: 3, at: sectionStart(3) },
  { chapter: 4, at: sectionStart(4) },
  { chapter: 5, at: sectionStart(5) },
  { chapter: 6, at: sectionStart(6) },
  { chapter: 7, at: sectionStart(8) },
  { chapter: 8, at: sectionStart(9) },
  { chapter: 9, at: sectionStart(10) },
  { chapter: 10, at: sectionStart(11) },
];
const CARD_S = 4.2;

export function drawChapterCard(ctx: CanvasRenderingContext2D, t: number, metres: number): number | null {
  const card = CARDS.find((c) => t >= c.at - 0.3 && t < c.at + CARD_S);
  if (!card) return null;
  const z = ZONE_INFO[card.chapter - 1]!;
  const alpha = window01(t, card.at - 0.3, card.at + CARD_S, 0.45);
  const ink = inkFor(darknessAt(metres));
  const range = `${z.depth[0].toLocaleString('en-US')}–${z.depth[1].toLocaleString('en-US')} m`;
  drawTextLine(ctx, `chapter ${card.chapter}`, W / 2, 92, 38, 500, alpha * 0.85, ink);
  drawTextLine(ctx, z.name, W / 2, 158, 76, 700, alpha, ink);
  drawTextLine(ctx, range, W / 2, 206, 40, 500, alpha * 0.85, ink);
  return card.at;
}

// ---------------------------------------------------------------- rings and labels

/** A hand-drawn ring round an animal (centre, radius), drawn round over `draw` 0 .. 1, labelled beside it. */
export function drawCallout(
  ctx: CanvasRenderingContext2D, x: number, y: number, r: number, label: string, note: string | undefined, alpha: number, draw: number, dark: number,
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = dark > 0.45 ? '#dcd6e6' : INK;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.15, r * 0.82, -0.12, -0.4, -0.4 + (Math.PI * 2 - 0.12) * draw);
  ctx.stroke();
  ctx.restore();
  // Label (and note) above the ring, unless that would run into the dials and cards at the top.
  const top = y - r * 0.82;
  const bottom = y + r * 0.82;
  const above = top - (note ? 80 : 40) > 250;
  const labelY = above ? top - (note ? 70 : 24) : bottom + 58;
  const noteY = above ? top - 26 : bottom + 100;
  const cx = Math.min(W - 260, Math.max(300, x));
  drawTextLine(ctx, label, cx, labelY, 56, 700, alpha * clamp01(draw * 1.5), inkFor(dark));
  if (note) drawTextLine(ctx, note, cx, noteY, 36, 500, alpha * clamp01(draw * 1.5 - 0.3), inkFor(dark));
}

// ---------------------------------------------------------------- big numbers

/** A big figure with a line under it (the reef's "1%", the twilight's "3 in 4"), centred at (x, y). */
export function drawFigure(ctx: CanvasRenderingContext2D, big: string, small: string, x: number, y: number, alpha: number, dark: number): void {
  if (alpha <= 0) return;
  drawTextLine(ctx, big, x, y, 120, 700, alpha, inkFor(dark));
  drawTextLine(ctx, small, x, y + 56, 44, 500, alpha * 0.92, inkFor(dark));
}
