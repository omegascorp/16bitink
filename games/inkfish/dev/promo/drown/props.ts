import { INK, PAPER, Pen, type Pt } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { mouthOf } from '../chain';
import { clamp01 } from '../short';
import { bodyPoint, GILL, poseOf } from './fish';
import type { Fish } from './story';

/**
 * The short's props, inked like the game's sketchbook and boiling with it:
 * the life ring, the O₂ gauge, the water streaming through the tuna's gills,
 * the bed and the "Zzz" that get crossed out.
 */

export const RED = '#c8352b';
export const WATER = '#2a6db5';
const RING_WHITE = '#fffaf0';
const WOOD = '#9a6a3c';
const BLANKET = '#8fb3d9';
const SAFE = '#5d9bd1';

/** A pen whose wobble changes with the boil frame (the same shape, re-inked). */
const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number, wobble = 1.3): Pen => new Pen(ctx, seed * 31 + boil * 977, wobble);
/** A small per-frame shift of a drawn size, so canvas-drawn props boil too. */
const BOIL_SHIFT = [0, 0.9, -0.7] as const;

/** A handwritten note at `at`, with an inked leader line to `to` (if given) ending in a dot. */
export function drawCallout(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: Pt | null, alpha: number, size: number, colours: TextInk): void {
  if (alpha <= 0) return;
  if (to) {
    const from = { x: at.x, y: to.y > at.y ? at.y + size * 0.25 : at.y - size * 0.8 };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len > 40) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = colours.fill;
      ctx.fillStyle = colours.fill;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x + (dx / len) * 10, from.y + (dy / len) * 10);
      ctx.lineTo(to.x - (dx / len) * 12, to.y - (dy / len) * 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(to.x, to.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha, colours);
}

// ---------------------------------------------------------------- the life ring

const RING = { ry: 150, rx: 46, tube: 36 } as const;

/**
 * The life ring round the tuna, seen nearly edge-on: its far half is drawn
 * behind the fish and its near half in front, so the fish wears it.
 */
export function drawRing(ctx: CanvasRenderingContext2D, c: Pt, scale: number, spin: number, half: 'back' | 'front', boil: number): void {
  const j = BOIL_SHIFT[boil % 3]!;
  const ry = (RING.ry + j) * scale;
  const rx = (RING.rx - j) * scale;
  const tube = RING.tube * scale;
  const [from, to] = half === 'front' ? [-Math.PI / 2, Math.PI / 2] : [Math.PI / 2, (3 * Math.PI) / 2];
  const arc = (a0: number, a1: number, width: number, colour: string, k = 1): void => {
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * k, ry * k, 0, a0, a1);
    ctx.lineWidth = width;
    ctx.strokeStyle = colour;
    ctx.stroke();
  };
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(spin);
  ctx.lineCap = 'butt';
  arc(from, to, tube + 7 * scale, INK);
  arc(from, to, tube, RING_WHITE);
  // Four red bands round it.
  for (let k = 0; k < 4; k++) {
    const mid = (k * Math.PI) / 2;
    const a0 = Math.max(from, mid - 0.32);
    const a1 = Math.min(to, mid + 0.32);
    const b0 = Math.max(from, mid + 2 * Math.PI - 0.32);
    const b1 = Math.min(to, mid + 2 * Math.PI + 0.32);
    if (a1 > a0) arc(a0, a1, tube, RED);
    if (b1 > b0) arc(b0, b1, tube, RED);
  }
  // Shading on the inside of the tube, a glint on the outside, and the hole's inked edge.
  ctx.globalAlpha = 0.28;
  arc(from, to, 5 * scale, INK, 1 - (0.28 * tube) / ry);
  ctx.globalAlpha = 0.7;
  arc(from, to, 3 * scale, RING_WHITE, 1 + (0.2 * tube) / ry);
  ctx.globalAlpha = 1;
  arc(from, to, 2.5 * scale, INK, 1 - (0.5 * tube) / ry);
  ctx.restore();
}

// ---------------------------------------------------------------- the O₂ gauge

/** The dial's sweep: empty at the lower left, round over the top, full at the lower right. */
const DIAL_FROM = 0.8 * Math.PI;
const DIAL_TO = 2.2 * Math.PI;
const RED_ZONE = 0.28;

/** "O₂" with a hand-set subscript (the font has no ₂). */
export function drawO2(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, colour = INK): void {
  drawTextLine(ctx, 'O', x - size * 0.12, y, size, 700, alpha, { fill: colour, halo: PAPER });
  drawTextLine(ctx, '2', x + size * 0.2, y + size * 0.18, size * 0.6, 700, alpha, { fill: colour, halo: PAPER });
}

/** The O₂ gauge: `level` 1 full .. 0 empty; `alarm` pulses it red. */
export function drawGauge(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, level: number, alarm: number, shown: number, t: number, boil: number): void {
  if (shown <= 0) return;
  const pen = penFor(ctx, 7, boil);
  ctx.save();
  ctx.globalAlpha = shown;
  ctx.translate(x, y);
  const pop = 0.7 + 0.3 * shown;
  ctx.scale(pop, pop);
  if (alarm > 0) {
    ctx.save();
    ctx.globalAlpha = shown * alarm * (0.45 + 0.35 * Math.sin(t * 20));
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  pen.fill(ringPts(0, 0, r, 40), PAPER, 1);
  pen.circle(0, 0, r, 5);
  pen.circle(0, 0, r * 0.88, 1.6);
  // The scale: red where it's running out, blue where it's safe, and ticks.
  const band = (a0: number, a1: number, colour: string): void => {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, a0, a1);
    ctx.lineWidth = r * 0.14;
    ctx.strokeStyle = colour;
    ctx.stroke();
  };
  const split = DIAL_FROM + RED_ZONE * (DIAL_TO - DIAL_FROM);
  band(DIAL_FROM, split, RED);
  band(split, DIAL_TO, SAFE);
  for (let k = 0; k <= 8; k++) {
    const a = DIAL_FROM + (k / 8) * (DIAL_TO - DIAL_FROM);
    pen.hair([{ x: Math.cos(a) * r * 0.56, y: Math.sin(a) * r * 0.56 }, { x: Math.cos(a) * r * 0.82, y: Math.sin(a) * r * 0.82 }], 2.2, INK, 0.9);
  }
  drawO2(ctx, 0, r * 0.62, r * 0.46, 1, alarm > 0.5 ? RED : INK);
  // The needle: a tapered ink spike, trembling as the oxygen runs out.
  const a = DIAL_FROM + clamp01(level) * (DIAL_TO - DIAL_FROM) + 0.05 * alarm * Math.sin(t * 47);
  const tip = { x: Math.cos(a) * r * 0.8, y: Math.sin(a) * r * 0.8 };
  const side = { x: -Math.sin(a) * r * 0.07, y: Math.cos(a) * r * 0.07 };
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(side.x - tip.x * 0.15, side.y - tip.y * 0.15);
  ctx.lineTo(-side.x - tip.x * 0.15, -side.y - tip.y * 0.15);
  ctx.closePath();
  ctx.fillStyle = alarm > 0.5 ? RED : INK;
  ctx.fill();
  pen.dot(0, 0, r * 0.09, INK);
  ctx.restore();
}

const ringPts = (x: number, y: number, r: number, n: number): Pt[] =>
  Array.from({ length: n }, (_, i) => ({ x: x + Math.cos((i / n) * Math.PI * 2) * r, y: y + Math.sin((i / n) * Math.PI * 2) * r }));

// ---------------------------------------------------------------- the water through its gills

/** Dashes flow along the streamlines, a whole number of dash periods a loop. */
const DASH = [24, 16] as const;
const FLOW_PX = (DASH[0] + DASH[1]) * 52;

/** A quadratic streamline from `a` via `c` to `b`, dashed, flowing, with an arrowhead at `b`. */
function streamline(ctx: CanvasRenderingContext2D, a: Pt, c: Pt, b: Pt, offset: number, width: number, head: boolean): void {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
  ctx.lineDashOffset = offset;
  ctx.lineWidth = width;
  ctx.stroke();
  if (!head) return;
  const ang = Math.atan2(b.y - c.y, b.x - c.x);
  const s = width * 3.4;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(b.x + Math.cos(ang) * s, b.y + Math.sin(ang) * s);
  ctx.lineTo(b.x + Math.cos(ang + 2.4) * s, b.y + Math.sin(ang + 2.4) * s);
  ctx.lineTo(b.x + Math.cos(ang - 2.4) * s, b.y + Math.sin(ang - 2.4) * s);
  ctx.closePath();
  ctx.fill();
  ctx.setLineDash([...DASH]);
}

/**
 * Water pushed in at the open mouth, through the head (faintly, under the
 * skin) and out behind the gill covers, back along the flanks.
 */
export function drawWaterFlow(ctx: CanvasRenderingContext2D, f: Fish, alpha: number, phase: number): void {
  if (alpha <= 0) return;
  const m = mouthOf(poseOf(f));
  const L = f.len;
  const offset = -phase * FLOW_PX;
  const at = (dx: number, dy: number): Pt => ({ x: m.x + dx * L, y: m.y + dy * L });
  ctx.save();
  ctx.strokeStyle = WATER;
  ctx.fillStyle = WATER;
  ctx.lineCap = 'round';
  ctx.setLineDash([...DASH]);
  ctx.globalAlpha = alpha;
  for (const k of [-1, 0, 1]) streamline(ctx, at(0.36, k * 0.15), at(0.15, k * 0.11), at(0.04, k * 0.012), offset, 6, true);
  ctx.globalAlpha = alpha * 0.45;
  for (const k of [-1, 1]) streamline(ctx, at(0, k * 0.01), at(-0.12, k * 0.04), bodyPoint(f, GILL - 0.01, k * 0.35), offset, 4, false);
  ctx.globalAlpha = alpha;
  for (const k of [-1, 1]) {
    const from = bodyPoint(f, GILL + 0.01, k * 0.45);
    streamline(ctx, from, bodyPoint(f, 0.42, k * 0.95), bodyPoint(f, 0.6, k * 1.35), offset, 6, true);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the night's props

/** A red cross-out stroke from `a` to `b`, `u` of it drawn, on a paper halo. */
function crossStroke(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, u: number, width: number): void {
  if (u <= 0) return;
  const e = { x: a.x + (b.x - a.x) * clamp01(u), y: a.y + (b.y - a.y) * clamp01(u) };
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, w] of [[PAPER, width * 1.8], [RED, width]] as const) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(e.x, e.y);
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.stroke();
  }
  ctx.restore();
}

/** A bed with a pillow and a blanket, about 240 × 130 px at scale 1, crossed out in red (`cross` 0 .. 1). */
export function drawBed(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number, cross: number, boil: number): void {
  if (alpha <= 0) return;
  const pen = penFor(ctx, 23, boil);
  const P = (px: number, py: number): Pt => ({ x: x + px * s, y: y + py * s });
  ctx.save();
  ctx.globalAlpha = alpha;
  const head = [P(-120, 50), P(-120, -70), P(-96, -80), P(-96, 50)];
  const foot = [P(104, 50), P(104, -20), P(120, -26), P(120, 50)];
  const mattress = [P(-96, 0), P(104, 0), P(104, 34), P(-96, 34)];
  const pillow = [P(-90, -4), P(-86, -32), P(-40, -36), P(-30, -8)];
  const blanket = [P(-44, -14), P(60, -20), P(104, -12), P(104, 30), P(-44, 30)];
  for (const [pts, fill] of [[head, WOOD], [foot, WOOD], [mattress, PAPER], [pillow, RING_WHITE], [blanket, BLANKET]] as const) {
    pen.fill(pts, fill, 1);
    pen.closed(pts, 3.2 * s);
  }
  pen.hair([P(-10, -12), P(-4, 28)], 1.6 * s, INK, 0.6);
  pen.hair([P(40, -16), P(46, 28)], 1.6 * s, INK, 0.6);
  pen.stroke([P(-120, 50), P(-120, 62)], 4 * s);
  pen.stroke([P(120, 50), P(120, 62)], 4 * s);
  ctx.restore();
  crossStroke(ctx, P(-140, -90), P(140, 80), cross * 2, 12 * s);
  crossStroke(ctx, P(140, -90), P(-140, 80), cross * 2 - 1, 12 * s);
}

/** A thought bubble of "Zzz", trailing little bubbles down to `from` (the tuna's head), struck through (`strike` 0 .. 1). */
export function drawZzz(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number, strike: number, from: Pt, boil: number): void {
  if (alpha <= 0) return;
  const pen = penFor(ctx, 41, boil);
  const cloud = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    const bump = 1 + 0.1 * Math.abs(Math.sin(a * 4));
    return { x: x + Math.cos(a) * 125 * s * bump, y: y + Math.sin(a) * 78 * s * bump };
  });
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const k of [1, 2]) {
    const u = k / 3;
    const c = { x: from.x + (x - from.x) * u * 0.8, y: from.y + (y + 70 * s - from.y) * u * 0.8 };
    const r = (8 + 6 * k) * s;
    pen.fill(ringPts(c.x, c.y, r, 16), PAPER, 1);
    pen.circle(c.x, c.y, r, 2.6);
  }
  pen.fill(cloud, PAPER, 1);
  pen.closed(cloud, 3.4 * s);
  ctx.font = `700 ${92 * s}px ${CAPTION_FONT}`;
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Z', x - 48 * s, y + 14 * s);
  ctx.font = `700 ${70 * s}px ${CAPTION_FONT}`;
  ctx.fillText('z', x, y - 2 * s);
  ctx.font = `700 ${54 * s}px ${CAPTION_FONT}`;
  ctx.fillText('z', x + 42 * s, y - 18 * s);
  ctx.restore();
  crossStroke(ctx, { x: x - 130 * s, y: y - 30 * s }, { x: x + 130 * s, y: y + 40 * s }, strike, 9 * s);
}
