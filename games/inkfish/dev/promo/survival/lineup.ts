import { createRng } from '../../../src/logic/rng';
import { INK, PAPER } from '../../../src/art/pen';
import { lerp, smooth } from '../short';
import { drawCard, drawPop, drawText, INK_ON_PAPER, PAPER_ON_INK, RED, YELLOW_ON_INK } from '../swallowyou/text';
import { drawMiniCard, fadeIn } from './hud';
import { H, W } from './layout';
import { drawPosed } from './scene';
import { aspectOf, LINEUP, TUNAS, type Contestant, type FishId } from './species';
import { T } from './timeline';

/**
 * The line-up, the video's one to-scale picture: inside the tank, the
 * contestants swim on from the right one by one, smallest to biggest, each
 * stopping in a row along the sand; the camera zooms out step by step (the
 * newest fish large, the first ones shrinking to dots), a ruler along the
 * bottom rescaling in inches with centimetres under them. Each fish gets a
 * card in the strip along the top and a size tag; the great white slides in
 * until only its head fits, then the camera pulls back on "pick yours".
 */

interface Place {
  readonly c: Contestant;
  /** Centre along the row and height off the middle line, inches. */
  readonly x: number;
  readonly y: number;
  /** When it swims on, and when its card pops up. */
  readonly enter: number;
  readonly card: number;
}

/** The row, packed tight left to right (gaps in inches). */
const ROW: Readonly<Record<string, { x: number; y?: number; enter: number; card: number }>> = {
  pupfish: { x: 1, enter: T.three, card: T.desert },
  mudskipper: { x: 3.7, enter: T.three + 0.25, card: T.mudskippers },
  rivulus: { x: 6.4, enter: T.three + 0.5, card: T.rivulus },
  goldfish: { x: 10.6, enter: T.four - 0.3, card: T.goldfish },
  eel: { x: 23.7, y: -4.2, enter: T.twenty - 0.3, card: T.eel },
  icefish: { x: 23.7, y: 4.2, enter: T.twenty, card: T.icefish },
  salmon: { x: 51.2, enter: T.salmon29 - 0.3, card: T.salmon },
  tuna: { x: 84.2, enter: T.tuna31 - 0.3, card: T.tuna31 + 0.6 },
  cod: { x: 122.2, enter: T.cod39 - 0.3, card: T.cod },
  mako: { x: 200.7, enter: T.mako9 - 0.3, card: T.mako9 + 0.6 },
  white: { x: 350, enter: T.white15 - 0.2, card: T.white15 + 0.5 },
};

const PLACES: readonly Place[] = LINEUP.map((c) => ({ c, ...ROW[c.id]!, y: ROW[c.id]!.y ?? 0 }));

interface Cam { readonly t: number; readonly x: number; readonly s: number }

/** Where the camera looks (row inches at the frame's centre) and its zoom (px per inch). */
const CAM: readonly Cam[] = [
  { t: T.okay, x: 3.7, s: 210 },
  { t: T.rivulus, x: 3.7, s: 210 },
  { t: T.rivulus + 1.1, x: 6.4, s: 420 },
  { t: T.four - 0.5, x: 6.4, s: 420 },
  { t: T.four + 0.9, x: 6.3, s: 135 },
  { t: T.twenty - 0.2, x: 6.3, s: 135 },
  { t: T.twenty + 1.1, x: 16.9, s: 50 },
  { t: T.salmon29 - 0.2, x: 16.9, s: 50 },
  { t: T.salmon29 + 1, x: 32.9, s: 25.9 },
  { t: T.tuna31 - 0.2, x: 32.9, s: 25.9 },
  { t: T.tuna31 + 1, x: 49.9, s: 17 },
  { t: T.cod39 - 0.2, x: 49.9, s: 17 },
  { t: T.cod39 + 1, x: 71, s: 12 },
  { t: T.serious, x: 71, s: 12 },
  { t: T.mako9 + 1.2, x: 127.4, s: 6.67 },
  { t: T.white15, x: 127.4, s: 6.67 },
  { t: T.ton + 0.9, x: 300, s: 12 },
  { t: T.pick - 0.1, x: 300, s: 12 },
  { t: T.pick + 1.4, x: 220, s: 3.9 },
];

function camAt(t: number): { x: number; s: number } {
  if (t <= CAM[0]!.t) return CAM[0]!;
  for (let i = 1; i < CAM.length; i++) {
    const a = CAM[i - 1]!;
    const b = CAM[i]!;
    if (t < b.t) {
      const u = smooth((t - a.t) / (b.t - a.t));
      return { x: lerp(a.x, b.x, u), s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), u)) };
    }
  }
  return CAM[CAM.length - 1]!;
}

const MID_Y = 540;
const RULER_Y = 990;

/** The 89 other skipjack, a school behind the line-up from "ninety of its friends". */
const rng = createRng(777);
const FRIENDS = Array.from({ length: 89 }, () => ({
  x: 64 + rng() * 52, y: (rng() < 0.5 ? -1 : 1) * (9 + rng() * 22), depth: 0.5 + rng() * 0.35, ph: rng() * 6.28, kind: TUNAS[Math.floor(rng() * TUNAS.length)]!,
}));

/** The row's water: the tank's blue, its sand along the bottom. */
function drawWater(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgb(110,204,242)');
  g.addColorStop(1, 'rgb(34,128,196)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 6; i++) {
    const x = 120 + i * 340 + Math.sin(t * 0.3 + i) * 40;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 90, 0);
    ctx.lineTo(x - 140, H);
    ctx.lineTo(x - 260, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#ecd39a';
  ctx.fillRect(0, 950, W, H - 950);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 950 + Math.sin(x * 0.02) * 5);
  ctx.stroke();
}

const STEPS_IN = [0.5, 1, 2, 3, 6, 12, 24, 36, 60, 120, 240];

/** The ruler along the sand: inches (or feet) on top, centimetres (or metres) under them. */
function drawRuler(ctx: CanvasRenderingContext2D, cam: { x: number; s: number }): void {
  const step = STEPS_IN.find((v) => v * cam.s >= 130) ?? 240;
  const x0 = 960 - cam.x * cam.s;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(Math.max(-10, x0), RULER_Y);
  ctx.lineTo(W + 10, RULER_Y);
  ctx.stroke();
  ctx.restore();
  const first = Math.max(0, Math.floor(((0 - x0) / cam.s) / step) * step);
  for (let v = first; ; v += step) {
    const x = x0 + v * cam.s;
    if (x > W + 60) break;
    if (x < -60) continue;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, RULER_Y - 14);
    ctx.lineTo(x, RULER_Y + 14);
    ctx.stroke();
    const feet = step >= 12;
    const top = feet ? `${v / 12} ft` : `${v} in`;
    const cm = v * 2.54;
    const under = cm >= 100 ? `${(cm / 100).toFixed(cm >= 1000 ? 0 : 1)} m` : `${Math.round(cm * 10) / 10} cm`;
    drawText(ctx, top, { x, y: RULER_Y + 38, size: 30, maxWidth: 140 }, 700, 1, INK_ON_PAPER);
    drawText(ctx, under, { x, y: RULER_Y + 70, size: 24, maxWidth: 140 }, 500, 1, INK_ON_PAPER);
  }
}

/** Where a fish is on screen at t: swimming on from the right edge, then holding its place in the row. */
function screenOf(p: Place, t: number, cam: { x: number; s: number }): { x: number; y: number; len: number } {
  const len = p.c.inches * cam.s;
  const home = 960 + (p.x - cam.x) * cam.s;
  const u = smooth((t - p.enter) / 1.3);
  const from = Math.max(W + len * 0.6, home + 900);
  return { x: lerp(from, home, u), y: MID_Y + p.y * cam.s + Math.sin(t * 1.1 + p.x) * 5, len };
}

/** The newest fish's card, bottom left: its number, name, one line and size tag. */
function drawBigCard(ctx: CanvasRenderingContext2D, c: Contestant, alpha: number): void {
  if (alpha <= 0) return;
  const slide = (1 - alpha) * -60;
  drawCard(ctx, 40 + slide, 740, 720, 196, alpha);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = RED;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(108 + slide, 806, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  drawText(ctx, `No.${c.no}`, { x: 108 + slide, y: 808, size: 38, maxWidth: 84 }, 700, alpha, { fill: PAPER, halo: '#5a0d0a' });
  drawText(ctx, c.name, { x: 172 + slide, y: 790, size: 54, maxWidth: 570, left: true }, 700, alpha, INK_ON_PAPER);
  drawText(ctx, c.line, { x: 174 + slide, y: 842, size: 36, maxWidth: 570, left: true }, 500, alpha, INK_ON_PAPER);
  drawText(ctx, c.size, { x: 70 + slide, y: 900, size: 46, maxWidth: 670, left: true }, 700, alpha, { fill: '#b5381e', halo: PAPER });
}

/** The strip of contestant cards along the top, tipping over one by one on "won't make it". */
function drawStrip(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  PLACES.forEach((p, i) => {
    const a = fadeIn(t, p.card, 0.25);
    if (a <= 0) return;
    const x = 26 + i * 126;
    const tip = smooth((t - T.most - i * 0.1) / 0.35);
    ctx.save();
    ctx.translate(x, 168);
    ctx.rotate(tip * 1.45);
    ctx.translate(0, tip * 60);
    drawMiniCard(ctx, p.c, 0, -150, 118, 150, t, boil, a * (1 - smooth((t - T.most - i * 0.1 - 0.4) / 0.5)));
    ctx.restore();
  });
}

export function drawLineup(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const cam = camAt(t);
  drawWater(ctx, t);
  // The school, faded behind.
  const friends = fadeIn(t, T.ninety, 0.6);
  if (friends > 0) {
    for (const f of FRIENDS) {
      const x = 960 + (f.x - cam.x) * cam.s + Math.sin(t * 0.6 + f.ph) * 6;
      const len = 31 * cam.s * f.depth;
      if (x < -len || x > W + len) continue;
      drawPosed(ctx, f.kind, x, MID_Y + f.y * cam.s, len, -1, t + f.ph, boil, { alpha: friends * 0.5 * f.depth, effort: 0.3 });
    }
  }
  const order = [...PLACES].sort((a, b) => b.c.inches - a.c.inches);
  for (const p of order) {
    if (t < p.enter) continue;
    const at = screenOf(p, t, cam);
    if (at.x + at.len < -40 || at.x - at.len > W + 40) continue;
    const moving = 1 - smooth((t - p.enter - 0.9) / 0.5);
    drawPosed(ctx, p.c.id as FishId, at.x, at.y, at.len, -1, t, boil, { effort: 0.25 + 0.7 * moving, expr: p.c.id === 'rivulus' && t > T.rivulus && t < T.four ? 'happy' : null });
    // A size tag under every fish big enough to label.
    const tag = fadeIn(t, p.card, 0.3) * smooth((at.len - 170) / 60);
    if (tag > 0 && p.c.id !== 'white') {
      const below = at.y + Math.max(30, at.len * aspectOf(p.c.id) * 0.95) + 30;
      drawText(ctx, p.c.size.split(' · ').slice(0, 2).join(' · '), { x: at.x, y: Math.min(below, 930), size: 34, maxWidth: Math.max(220, at.len) }, 700, tag, PAPER_ON_INK);
    }
  }
  drawRuler(ctx, cam);
  // The "?" over the rivulus as the camera pushes in on it.
  drawPop(ctx, '?', 960 + (6.4 - cam.x) * cam.s, MID_Y - 210, 170, t, T.rivulus + 1.1, T.four - 0.5, YELLOW_ON_INK);
  drawPop(ctx, 'SMALLEST → BIGGEST', 960, 330, 96, t, T.smallest - 0.1, T.three + 0.6, PAPER_ON_INK);
  drawPop(ctx, '…and 89 friends', Math.min(1250, 960 + (84 - cam.x) * cam.s), MID_Y - 300, 70, t, T.ninety + 0.2, T.cod39 - 0.3, YELLOW_ON_INK);
  drawPop(ctx, 'PICK YOURS', 960, 330, 120, t, T.pick, T.most - 0.2, YELLOW_ON_INK);
  // The newest named fish's big card.
  const named = [...PLACES].reverse().find((p) => t >= p.card);
  if (named) {
    const next = PLACES[PLACES.indexOf(named) + 1];
    const a = fadeIn(t, named.card, 0.25) * (1 - smooth((t - (next ? next.card : T.pick) + 0.15) / 0.2));
    drawBigCard(ctx, named.c, a);
  }
  drawStrip(ctx, t, boil);
}
