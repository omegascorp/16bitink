import { INK, PAPER, RED } from '../../../src/art/palette';
import { CAPTION_FONT } from '../captions';
import { clamp01, smooth } from '../short';
import { T, sectionStart as s } from './timeline';

/**
 * What's written over the picture: the meal counter (bottom centre, in
 * pounds with the metric under it, rolling up with each meal: the video's
 * "$1… $X"), the snake's name card (bottom left) and the map-pin card (top
 * left), all on the game's paper in its handwriting.
 */

export const GOLD = '#f2cf55';

/** Handwritten text with a halo. */
export function write(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number,
  o: { weight?: 500 | 700; align?: CanvasTextAlign; alpha?: number; fill?: string; halo?: string; maxWidth?: number } = {},
): void {
  const alpha = o.alpha ?? 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.font = `${o.weight ?? 700} ${size}px ${CAPTION_FONT}`;
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  const w = ctx.measureText(text).width;
  const k = o.maxWidth && w > o.maxWidth ? o.maxWidth / w : 1;
  ctx.translate(x, y);
  ctx.scale(k, 1);
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = o.halo ?? PAPER;
  ctx.lineWidth = size * 0.16;
  ctx.strokeText(text, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = o.fill ?? INK;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** A paper card with a wobbly ink edge and a soft shadow. */
export function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number, tilt = 0): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(tilt);
  ctx.fillStyle = 'rgba(20,14,8,0.28)';
  ctx.fillRect(-w / 2 + 8, -h / 2 + 10, w, h);
  ctx.fillStyle = PAPER;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const jit = (i: number): number => Math.sin(i * 12.9898) * 1.6;
  ctx.moveTo(-w / 2 + jit(1), -h / 2 + jit(2));
  ctx.lineTo(w / 2 + jit(3), -h / 2 + jit(4));
  ctx.lineTo(w / 2 + jit(5), h / 2 + jit(6));
  ctx.lineTo(-w / 2 + jit(7), h / 2 + jit(8));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** A rubber stamp: a red word in a box, slammed in at `u` 0..1. */
export function stamp(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, u: number, rot = -0.12): void {
  if (u <= 0) return;
  const k = 1 + 1.4 * (1 - smooth(u));
  ctx.save();
  ctx.globalAlpha = clamp01(u * 2) * 0.92;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(k, k);
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + size * 0.5;
  ctx.strokeStyle = RED;
  ctx.lineWidth = size * 0.08;
  ctx.strokeRect(-w / 2, -size * 0.55, w, size * 1.1);
  ctx.fillStyle = RED;
  ctx.fillText(text, 0, size * 0.04);
  ctx.restore();
}

interface Measure {
  readonly at: number;
  readonly lb: number;
  readonly shown: string;
  readonly under: string;
}

const MEASURES: readonly Measure[] = [
  { at: T.ounce, lb: 0.06, shown: '0.06 lb', under: '1 oz · 28 g' },
  { at: T.crocodile, lb: 6, shown: '≈ 6 lb', under: '2.5 kg' },
  { at: T.heavier, lb: 35, shown: '35 lb', under: '15.9 kg' },
  { at: T.deer77, lb: 77, shown: '77 lb', under: '34.9 kg' },
  { at: T.swallowingHyena, lb: 150, shown: '≈ 150 lb', under: '68 kg' },
];

const ROLL_S = 1;

/** When the counter rolls to a new meal (for the tick sound). */
export const COUNTER_STEPS: readonly { readonly at: number; readonly from: number; readonly to: number }[] = MEASURES.map((m, i) => ({
  at: m.at, from: i ? MEASURES[i - 1]!.lb : 0, to: m.lb,
}));
export const COUNTER_ROLL_S = ROLL_S;

/** When the counter is up: the cold open's slam, then from the mouse to the twist (not over the game). */
export function counterAlpha(t: number): number {
  if (t < T.lining) return 1 - smooth((t - T.lining + 0.4) / 0.4);
  if (t >= s(3) - 0.2 && t < s(4)) return 0;
  return smooth((t - T.ounce + 0.2) / 0.3) * (1 - smooth((t - T.thisOne + 0.3) / 0.3));
}

function big(ctx: CanvasRenderingContext2D, text: string, under: string, pop: number, alpha: number, counterY: number): void {
  ctx.save();
  ctx.translate(960, counterY);
  ctx.scale(pop, pop);
  write(ctx, text, 0, 0, 130, { alpha, maxWidth: 700 });
  ctx.restore();
  write(ctx, under, 960, counterY + 70, 50, { weight: 700, alpha });
}

export function drawCounter(ctx: CanvasRenderingContext2D, t: number, top = false): void {
  /** Bottom centre, or top centre over the line-up (its ruler runs along the bottom). */
  const counterY = top ? 130 : 985;
  const alpha = counterAlpha(t);
  if (alpha <= 0) return;
  if (t < T.lining) {
    big(ctx, '77 lb', '34.9 kg', 1 + 0.25 * Math.max(0, 1 - Math.abs(t - T.seventySeven - 0.1) / 0.25), alpha, counterY);
    return;
  }
  if (t >= T.notClose + 0.6) {
    const u = smooth((t - T.notClose - 0.6) / 0.4);
    ctx.save();
    ctx.translate(960, counterY);
    ctx.scale(1, Math.max(0.05, Math.abs(Math.cos(u * Math.PI))));
    if (u < 0.5) write(ctx, '≈ 150 lb', 0, 0, 130, { alpha });
    else write(ctx, 'MOUTH vs BODY', 0, 0, 110, { alpha, fill: RED });
    ctx.restore();
    return;
  }
  let i = -1;
  MEASURES.forEach((m, k) => (t >= m.at ? (i = k) : null));
  if (i < 0) return;
  const m = MEASURES[i]!;
  const prev = i ? MEASURES[i - 1]!.lb : 0;
  const roll = clamp01((t - m.at) / ROLL_S);
  const v = prev + (m.lb - prev) * (1 - (1 - roll) ** 3);
  const shown = roll >= 1 ? m.shown : `${v < 1 ? v.toFixed(2) : Math.round(v)} lb`;
  const pop = roll >= 1 ? 1 + 0.2 * Math.max(0, 1 - (t - m.at - ROLL_S) / 0.25) : 1;
  big(ctx, shown, m.under, pop, alpha, counterY);
}

const NAMES: readonly { readonly from: number; readonly to: number; readonly name: string }[] = [
  { from: T.cornSnake, to: T.goUp, name: 'CORN SNAKE · 3–4 ft' },
  { from: T.olive, to: T.snakeEating, name: 'OLIVE PYTHON · ≈ 10 ft' },
  { from: T.burmese, to: T.forget, name: 'BURMESE PYTHON · 11 ft · 31.5 lb' },
  { from: T.fifteenFoot, to: T.measured + 1, name: 'BURMESE PYTHON · 14.8 ft · 115 lb' },
  { from: T.rockPython, to: T.laughing, name: 'AFRICAN ROCK PYTHON · ≈ 13 ft' },
  { from: T.thisOne + 0.3, to: T.halfInch, name: "GANS' EGG-EATER · ≈ 3 ft" },
];

export function drawNameCard(ctx: CanvasRenderingContext2D, t: number): void {
  const on = NAMES.find((n) => t >= n.from && t < n.to);
  if (!on) return;
  const a = smooth((t - on.from) / 0.35) * (1 - smooth((t - on.to + 0.35) / 0.35));
  const slide = (1 - smooth((t - on.from) / 0.4)) * -80;
  card(ctx, 36 + slide, 930, 600, 100, a, -0.015);
  write(ctx, on.name, 62 + slide, 998, 52, { align: 'left', alpha: a, maxWidth: 560 });
}

interface Pin {
  readonly from: number;
  readonly to: number;
  readonly place: string;
  readonly when: string;
  readonly seed: number;
  readonly stamp?: { readonly at: number; readonly text: string };
}

const PINS: readonly Pin[] = [
  { from: T.y2014, to: s(3) - 0.3, place: 'Lake Moondarra, Queensland', when: 'Australia · 2014', seed: 3, stamp: { at: T.australia, text: 'AUSTRALIA' } },
  { from: T.y2015, to: T.howFit, place: 'Collier County, Florida', when: 'USA · 2015', seed: 5 },
  { from: T.naples, to: T.tenInches - 0.5, place: 'Near Naples, Florida', when: 'USA', seed: 5 },
  { from: T.kenya, to: T.laughing, place: 'Masai Mara, Kenya', when: '2017', seed: 9 },
];

/** A little painted map: a wobbly coast on blue water, a red pin. */
function miniMap(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, t: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#a9c7cf';
  ctx.fillRect(x, y, w, h);
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const r = 0.62 + 0.12 * Math.sin(a * 3 + seed) + 0.07 * Math.cos(a * 5 + seed * 2);
    const px = x + w * 0.42 + Math.cos(a) * w * 0.55 * r;
    const py = y + h * 0.55 + Math.sin(a) * h * 0.65 * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.fillStyle = '#d9c995';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // The pin, bobbing.
  const px = x + w * 0.5;
  const py = y + h * 0.5 - 6 * Math.abs(Math.sin(t * 3));
  ctx.save();
  ctx.fillStyle = RED;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(px, py + 26);
  ctx.lineTo(px - 11, py - 4);
  ctx.arc(px, py - 8, 12, Math.PI * 0.85, Math.PI * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(px, py - 8, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawPinCard(ctx: CanvasRenderingContext2D, t: number): void {
  const on = PINS.find((p) => t >= p.from && t < p.to);
  if (!on) return;
  const a = smooth((t - on.from) / 0.35) * (1 - smooth((t - on.to + 0.35) / 0.35));
  const drop = (1 - smooth((t - on.from) / 0.45)) * -60;
  card(ctx, 36, 36 + drop, 620, 170, a, 0.012);
  ctx.save();
  ctx.globalAlpha = a;
  miniMap(ctx, 54, 54 + drop, 170, 134, on.seed, t);
  ctx.restore();
  write(ctx, on.place, 246, 112 + drop, 46, { align: 'left', alpha: a, maxWidth: 390 });
  write(ctx, on.when, 246, 172 + drop, 44, { align: 'left', alpha: a, weight: 500, maxWidth: 390 });
  if (on.stamp) stamp(ctx, on.stamp.text, 540, 250 + drop, 64, clamp01((t - on.stamp.at) / 0.3) * a);
}
