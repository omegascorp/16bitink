import { createRng } from '../../logic/rng';
import { closed, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, pathOf, type Pt } from '../pen';
import { SNAKE_W } from '../types';
import { rgba } from '../wash';

/**
 * The corn snake's paint box and the brushwork its body strip and its neck
 * share, so the head's neck matches the strip it lies on: the cross-section
 * wash, the light and shade over the pattern, the scale rows, the saddle
 * blotches with their black rims, the flank hatching and the edge contours.
 * Everything here is deterministic: the same call paints the same pixels.
 */
export const CORN_PAINT = {
  ground: '#e88e48',
  shadow: '#6a2a1a',
  saddle: '#b8321f',
  saddleLit: '#dc5a34',
  saddleDeep: '#7e1a13',
  rim: '#22100e',
  tan: '#f4bf86',
  cream: '#f3e0c2',
  mouth: '#e597a0',
  mouthDeep: '#b04c5e',
  throat: '#5a1a28',
  iris: '#cc5f26',
  tongue: '#bb2238',
  tongueTip: '#2a0d18',
} as const;

const P = CORN_PAINT;

/** The body's cross-section wash, `yTop` being where the strip's y = 0 lies: lit pale at the top edge, deepening to the far flank. */
export function crossWash(ctx: CanvasRenderingContext2D, yTop: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + SNAKE_W);
  g.addColorStop(0, '#f7c58c');
  g.addColorStop(0.16, '#f2a964');
  g.addColorStop(0.42, '#e98f4a');
  g.addColorStop(0.74, '#d8763a');
  g.addColorStop(1, '#b4582a');
  return g;
}

/** A soft round glaze of colour, densest in its middle (rx × ry, turned by rot). */
export function glaze(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rot: number, color: string, alpha: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.55, rgba(color, alpha * 0.85));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/**
 * Light and shade over the painted pattern, as a cylinder lit from the upper
 * left: a glossy band high on the back, the far flank in shadow with a
 * little light reflected back at its very edge.
 */
export function modelOver(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number): void {
  const h = SNAKE_W;
  const dark = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  dark.addColorStop(0, rgba(P.shadow, 0.04));
  dark.addColorStop(0.12, rgba(P.shadow, 0));
  dark.addColorStop(0.5, rgba(P.shadow, 0));
  dark.addColorStop(0.68, rgba(P.shadow, 0.12));
  dark.addColorStop(0.86, rgba(P.shadow, 0.36));
  dark.addColorStop(0.95, rgba(P.shadow, 0.46));
  dark.addColorStop(1, rgba(P.shadow, 0.24));
  const gloss = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  gloss.addColorStop(0.08, rgba(PAPER_FILL, 0));
  gloss.addColorStop(0.2, rgba(PAPER_FILL, 0.34));
  gloss.addColorStop(0.27, rgba(PAPER_FILL, 0.26));
  gloss.addColorStop(0.42, rgba(PAPER_FILL, 0));
  ctx.save();
  ctx.fillStyle = dark;
  ctx.fillRect(x0, yTop - 4, x1 - x0, h + 8);
  ctx.fillStyle = gloss;
  ctx.fillRect(x0, yTop - 4, x1 - x0, h + 8);
  ctx.restore();
}

/** A fixed pseudo-random 0..1 for scale (j, r). */
function hash(j: number, r: number): number {
  const v = Math.sin(j * 12.9898 + r * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** How strongly the gloss band lights strip-y `y` (0..1). */
function glossAt(y: number): number {
  return Math.max(0, 1 - Math.abs(y - 5.6) / 3.2);
}

/** Rows of the body's scales running along it */
export const SCALE_ROWS = 15;

/**
 * The scales, row on row round the body: each one's free edge an arc drawn
 * towards the tail (+x), the rows packed tighter towards the edges where the
 * back turns away, a glint on each scale along the gloss band. `len` must
 * divide the period for the rows to repeat with it.
 */
export function scaleRows(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number, len: number, alpha: number, period = 1200): void {
  const perRow = Math.max(1, Math.round(period / len));
  const span = 2.64;
  const dth = span / SCALE_ROWS;
  ctx.save();
  ctx.lineCap = 'round';
  for (let r = 0; r < SCALE_ROWS; r++) {
    const th = -span / 2 + dth * (r + 0.5);
    const sy = 12 + 11.2 * Math.sin(th);
    const y = yTop + sy;
    const hh = 11.2 * Math.cos(th) * dth * 0.56;
    const shift = (r % 2) * (len / 2);
    const first = Math.floor((x0 - len) / len) * len + shift;
    const edges = [new Path2D(), new Path2D()];
    const glints = [new Path2D(), new Path2D()];
    for (let x = first; x <= x1 + len; x += len) {
      const j = ((Math.round((x - shift) / len) % perRow) + perRow) % perRow;
      const h = hash(j, r);
      const e = edges[h < 0.5 ? 0 : 1]!;
      const b = (hash(j + 7, r + 3) - 0.5) * 0.3;
      e.moveTo(x - len * 0.38, y - hh + b);
      e.quadraticCurveTo(x + len * (0.55 + 0.15 * h), y + b, x - len * 0.38, y + hh + b);
      if (h > 0.3) {
        const gl = glints[h > 0.72 ? 1 : 0]!;
        gl.moveTo(x - len * 0.32, y - hh * 0.4);
        gl.lineTo(x + len * (0.02 + 0.2 * h), y - hh * 0.48);
      }
    }
    const shade = sy / SNAKE_W;
    ctx.lineWidth = 0.28;
    edges.forEach((e, i) => {
      ctx.strokeStyle = rgba(P.shadow, alpha * (0.35 + 0.9 * shade) * (i === 0 ? 0.7 : 1.15));
      ctx.stroke(e);
    });
    const g = glossAt(sy);
    if (g > 0.05) {
      glints.forEach((gl, i) => {
        ctx.lineWidth = i === 0 ? 0.36 : 0.5;
        ctx.strokeStyle = rgba(PAPER_FILL, (i === 0 ? 0.3 : 0.6) * g);
        ctx.stroke(gl);
      });
    }
  }
  ctx.restore();
}

/** Pigment settling in the paper's tooth: fine dots over x0..x0+w, repeated every `w` when `wrap`. */
export function grain(ctx: CanvasRenderingContext2D, x0: number, w: number, yTop: number, seed: number, count: number, wrap: boolean): void {
  const rng = createRng(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = x0 + rng() * w;
    const y = yTop + 1.2 + rng() * 21.6;
    const r = 0.18 + rng() * 0.32;
    const pale = rng() < 0.12;
    ctx.fillStyle = pale ? rgba(PAPER_FILL, 0.22) : rgba(P.shadow, 0.1 + 0.14 * rng() + 0.1 * ((y - yTop) / SNAKE_W));
    for (const k of wrap ? [-w, 0, w] : [0]) {
      ctx.beginPath();
      ctx.arc(x + k, y, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * A pen contour along y running x0..x1 whose drift and swell repeat every
 * `period` (whole cycles of each wave per period), so it joins itself.
 */
export function periodicLine(ctx: CanvasRenderingContext2D, period: number, x0: number, x1: number, y: number, width: number, color: string, alpha: number, seed: number): void {
  const rng = createRng(seed);
  const ph = [rng() * TAU, rng() * TAU, rng() * TAU, rng() * TAU];
  const cycles = (k: number): number => Math.max(1, Math.round(period / k));
  const [c1, c2, c3, c4] = [cycles(64), cycles(29), cycles(41), cycles(17)];
  const top: Pt[] = [];
  const bot: Pt[] = [];
  const step = period / Math.ceil(period);
  for (let x = Math.floor(x0 / step) * step; x <= x1 + step; x += step) {
    const u = x / period;
    const yy = y + 0.22 * Math.sin(TAU * c1 * u + ph[0]!) + 0.1 * Math.sin(TAU * c2 * u + ph[1]!);
    const w = (width * (1 + 0.2 * Math.sin(TAU * c3 * u + ph[2]!) + 0.1 * Math.sin(TAU * c4 * u + ph[3]!))) / 2;
    top.push(pt(x, yy - w));
    bot.push(pt(x, yy + w));
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  pathOf(ctx, [...top, ...bot.reverse()]);
  ctx.fill();
  ctx.restore();
}

/**
 * Hatching down the shadowed flank: `n` short diagonal strokes over
 * x0..x0+span, each from its own seeded pen so a stroke and its copy one
 * span along (`wrap`) are drawn alike, and a sparser cross-hatch nearer the edge.
 */
export function flankHatch(ctx: CanvasRenderingContext2D, x0: number, span: number, n: number, yTop: number, seed: number, ink: string, alpha: number, wrap: boolean): void {
  for (let j = 0; j < n; j++) {
    for (const k of wrap ? [-span, 0] : [0]) {
      const rng = createRng(seed * 31 + j);
      const x = x0 + (j * span) / n + k;
      const y0 = yTop + 16.6 + rng() * 1.8;
      new Pen(ctx, seed + j, 0.4).hair([pt(x, y0), pt(x + 2.3, yTop + 22.6)], 0.34, ink, alpha * (0.7 + 0.3 * rng()));
      if (j % 2 === 0) {
        const c0 = yTop + 19.4 + rng() * 1.2;
        new Pen(ctx, seed + 500 + j, 0.4).hair([pt(x + 2.4, c0), pt(x + 0.6, yTop + 22.6)], 0.3, ink, alpha * 0.6);
      }
    }
  }
}

/**
 * A blotch outline: a squarish oval (superellipse of power `pow`) with a
 * seeded irregular wobble, `n` points round.
 */
export interface BlotchForm {
  readonly rough?: number;
  readonly pow?: number;
  /** How deeply the front and back are dented at the midline. */
  readonly notch?: number;
  /** How far the four corners reach out. */
  readonly lobe?: number;
  readonly n?: number;
}

export function blotchShape(cx: number, cy: number, rx: number, ry: number, seed: number, form: BlotchForm = {}): Pt[] {
  const { rough = 0.07, pow = 2.6, notch = 0, lobe = 0, n = 36 } = form;
  const rng = createRng(seed);
  const ph = [rng() * TAU, rng() * TAU, rng() * TAU, rng() * TAU];
  const e = 2 / pow;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const wobble = 1 + rough * (0.5 * Math.sin(2 * a + ph[0]!) + 0.3 * Math.sin(3 * a + ph[1]!) + 0.2 * Math.sin(5 * a + ph[2]!) + 0.12 * Math.sin(7 * a + ph[3]!));
    const k = wobble * (1 - notch * c ** 8) * (1 + lobe * Math.sin(2 * a) ** 8);
    return pt(cx + Math.sign(c) * Math.abs(c) ** e * rx * k, cy + Math.sign(s) * Math.abs(s) ** e * ry * k);
  });
}

function centre(shape: readonly Pt[]): { cx: number; cy: number; rx: number; ry: number } {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2 };
}

/**
 * A red blotch with a black rim, painted as watercolour: the red laid in,
 * a warmer heart lifted towards the light, the pigment pooled darker at the
 * drying edge, then the black rim drawn in with a pen (heavier on the side
 * turned from the light), and a fine ink hairline round it.
 */
export function paintBlotch(ctx: CanvasRenderingContext2D, shape: readonly Pt[], seed: number, ink: string, rim = 1.25): void {
  const pen = new Pen(ctx, seed, 0.35);
  const { cx, cy, rx, ry } = centre(shape);
  pen.fill(shape, P.saddle, 0.94);
  pen.clipped(shape, () => {
    glaze(ctx, cx - rx * 0.12, cy - ry * 0.22, rx * 0.8, ry * 0.62, 0, P.saddleLit, 0.5);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(P.saddleDeep, 0.42);
    ctx.lineWidth = rim * 3.6;
    pathOf(ctx, shape);
    ctx.stroke();
    ctx.restore();
    pen.stroke(closed(shape), rim * 1.7, P.rim, 0.92, false);
  });
  pen.hair(closed(shape), 0.32, ink, 0.3);
}
