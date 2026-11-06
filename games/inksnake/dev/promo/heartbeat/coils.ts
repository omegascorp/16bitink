import { SNAKE_W } from '../../../src/art/types';
import { VIDEO } from '../short';
import { drawSprite, type Pt, type Strip } from '../sprites';
import { axisOf, drawBoaBody, drawDark, drawJaws, drawMouth, type Jaws, zoomAbout } from './boaRig';
import type { Cast } from './cast';
import { HEART_SHAPE, HEART_W } from './heartArt';
import { route } from '../krait/path';
import { drawVignette } from './night';
import {
  coilGape, coilZoom, headSwing, heartAt, kickAt, lifeAt, ratEyeShut, ratSag, tightAt, tongueAt,
} from './story';

/**
 * The close-up: the boa's body wound round the rat as a stack of thick
 * bands. Each band is one half turn of a helix seen from a little above: the
 * pattern crowds towards its ends as the body turns away, the middle bows
 * down, and the half turn behind the rat runs back the other way, in shadow.
 * The coils come closer, thinner across the rat and fatter in the band, as
 * they tighten. Where they cover it, the heart glows through.
 */
export const HEART_AT: Pt = { x: 540, y: 1020 };
/** How wide the heart is on screen at rest. */
const HEART_PX = 470;
const BOW = 62;
/** How much of the coils shows across the heart. */
const VEIL = 0.13;
const SHADE = '12,7,8';

export interface Band {
  readonly y: number;
  /** How far the right end drops and the left end rises, from the middle. */
  readonly tilt: number;
  readonly bow: number;
  /** Half width to where the turn begins, and the band's thickness. */
  readonly r: number;
  readonly w: number;
  readonly u0: number;
}

export interface Coils {
  readonly front: readonly Band[];
  readonly back: readonly Band[];
}

/** The stack at tightness q (about −0.7 let go .. 1.1 at its tightest). */
export function coilsAt(q: number): Coils {
  const loose = Math.max(0, -q);
  const r = 366 - 76 * Math.max(0, q) + 26 * loose;
  const w = 230 + 26 * Math.max(0, q) - 30 * loose;
  const pitch = 212 - 34 * Math.max(0, q) + 62 * loose;
  const slide = 14 * q;
  const yOf = (i: number): number => HEART_AT.y + (i - 0.5) * pitch - BOW * 0.62;
  const turn = (i: number): number => i * 37 + slide + 200;
  return {
    front: [0, 1, 2].map((i) => ({ y: yOf(i), tilt: pitch / 4, bow: BOW, r, w, u0: turn(i) })),
    back: [-1, 0, 1, 2].map((i) => ({ y: yOf(i) + pitch / 2, tilt: -pitch / 4, bow: -BOW, r, w: w * 0.96, u0: turn(i) + 20 })),
  };
}

interface Slice {
  readonly x: number;
  readonly y: number;
  readonly u: number;
  readonly half: number;
}

const SLICES = 110;

/** The band as columns from left to right; the pattern runs round the turn (so it crowds at the ends). */
function slicesOf(b: Band, along: number): Slice[] {
  const reach = b.r + b.w / 2;
  return Array.from({ length: SLICES + 1 }, (_, i) => {
    const th = Math.PI * (1 - i / SLICES);
    const dx = reach * Math.cos(th);
    const over = Math.max(0, Math.abs(dx) - b.r) / (b.w / 2);
    return {
      x: HEART_AT.x + dx,
      y: b.y + (b.tilt * dx) / reach + b.bow * Math.sin(th),
      u: b.u0 + ((i / SLICES) * Math.PI * reach) / along,
      half: (b.w / 2) * Math.sqrt(Math.max(0, 1 - over * over)),
    };
  });
}

function outline(ctx: CanvasRenderingContext2D, s: readonly Slice[], off = 0): void {
  ctx.beginPath();
  s.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y - p.half + off) : ctx.lineTo(p.x, p.y - p.half + off)));
  [...s].reverse().forEach((p) => ctx.lineTo(p.x, p.y + p.half + off));
  ctx.closePath();
}

const wrapU = (u: number, period: number): number => ((u % period) + period) % period;

function laySlices(ctx: CanvasRenderingContext2D, tex: HTMLCanvasElement, strip: Strip, s: readonly Slice[], w: number): void {
  // A little wider than the band, so the strip's own edges fall outside its clip.
  const across = (w * 1.06) / SNAKE_W;
  const base = ctx.getTransform();
  for (let i = 0; i + 1 < s.length; i++) {
    const a = s[i]!;
    const c = s[i + 1]!;
    const du = c.u - a.u;
    const u0 = wrapU(a.u, strip.period);
    ctx.setTransform(base);
    ctx.transform((c.x - a.x) / du, (c.y - a.y) / du, 0, across, a.x, a.y);
    ctx.drawImage(tex, u0 * strip.res, 0, (du + 0.4) * strip.res, SNAKE_W * strip.res, 0, -SNAKE_W / 2, du + 0.4, SNAKE_W);
  }
  ctx.setTransform(base);
}

/** The round of the tube: dark towards the ends where it turns away, and along its edges. */
function shadeBand(ctx: CanvasRenderingContext2D, s: readonly Slice[], b: Band, dim: number): void {
  const reach = b.r + b.w / 2;
  const g = ctx.createLinearGradient(HEART_AT.x - reach, 0, HEART_AT.x + reach, 0);
  g.addColorStop(0, `rgba(${SHADE},0.92)`);
  g.addColorStop(0.09, `rgba(${SHADE},0.5)`);
  g.addColorStop(0.24, `rgba(${SHADE},0)`);
  g.addColorStop(0.76, `rgba(${SHADE},0)`);
  g.addColorStop(0.91, `rgba(${SHADE},0.55)`);
  g.addColorStop(1, `rgba(${SHADE},0.95)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height + 100);
  ctx.strokeStyle = `rgba(${SHADE},0.36)`;
  ctx.lineWidth = 34;
  outline(ctx, s);
  ctx.stroke();
  if (dim > 0) {
    ctx.fillStyle = `rgba(${SHADE},${dim})`;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height + 100);
  }
}

/** One band, its shadow on what's under it, its pattern, its roundness and its line. */
export function drawBand(ctx: CanvasRenderingContext2D, strip: Strip, boil: number, b: Band, dim = 0): void {
  const s = slicesOf(b, b.w / SNAKE_W);
  ctx.save();
  ctx.fillStyle = `rgba(${SHADE},0.5)`;
  outline(ctx, s, 22);
  ctx.fill();
  outline(ctx, s);
  ctx.clip();
  const tex = strip.frames[((boil % strip.frames.length) + strip.frames.length) % strip.frames.length]!;
  laySlices(ctx, tex, strip, s, b.w);
  shadeBand(ctx, s, b, dim);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = '#150c0a';
  ctx.lineWidth = 4.5;
  ctx.lineJoin = 'round';
  outline(ctx, s);
  ctx.stroke();
  ctx.restore();
}

const TAIL_KNOTS: readonly Pt[] = [
  { x: 1160, y: 1430 }, { x: 980, y: 1530 }, { x: 760, y: 1596 }, { x: 520, y: 1622 }, { x: 300, y: 1590 }, { x: 150, y: 1490 }, { x: 96, y: 1380 }, { x: 120, y: 1300 },
];

/** The tail, its red saddles the mark of the species, from under the coils. */
function drawTail(ctx: CanvasRenderingContext2D, cast: Cast, boil: number, wag: number): void {
  const r = route(TAIL_KNOTS.map((p, i) => ({ x: p.x + (i > 4 ? wag * (i - 4) : 0), y: p.y })), 8);
  const n = Math.ceil(r.length / 8);
  const spine = Array.from({ length: n + 1 }, (_, i) => r.at((i / n) * r.length));
  const widths = spine.map((_, i) => 176 * (1 - (i / n) ** 1.8) + 10);
  drawBoaBody(ctx, cast.tail, boil, { spine, widths, along: 170 / SNAKE_W });
}

/** The rat, nose up and to the left: head and shoulders over the top coil, the rest inside them. */
function drawRat(ctx: CanvasRenderingContext2D, cast: Cast, boil: number, t: number, q: number): void {
  const scale = 6.2;
  const sag = ratSag(t);
  const kick = kickAt(t);
  const rot = -2.4 - 0.1 * sag + 0.05 * Math.max(0, q) + 0.035 * kick;
  const c = { x: 628 - 10 * sag, y: 882 + 64 * sag - 10 * Math.max(0, q) - 12 * kick };
  const shut = ratEyeShut(t);
  drawSprite(ctx, cast.rat.open, boil, { x: c.x, y: c.y, scale, rotation: rot, flip: -1 });
  if (shut > 0) drawSprite(ctx, cast.rat.shut, boil, { x: c.x, y: c.y, scale, rotation: rot, flip: -1, alpha: shut });
}

/** The boa's head, resting by the rat's and listening; it swings in and opens at the end. */
function jawsAt(t: number): Jaws {
  const swing = headSwing(t);
  const gape = coilGape(t);
  return {
    rim: { x: 640 - 385 * swing, y: 690 - 16 * swing }, heading: Math.PI + 0.05 - 0.2 * swing, len: 336, neck: 150, hingeTop: 75, hingeBottom: 75,
    top: 2 + gape, bottom: 2 + gape * 1.08, eye: 'open',
  };
}

function drawNeck(ctx: CanvasRenderingContext2D, cast: Cast, boil: number, j: Jaws): void {
  const a = axisOf(j.heading);
  const hinge = { x: j.rim.x - a.e.x * j.len, y: j.rim.y - a.e.y * j.len };
  const knots = [{ x: j.rim.x - a.e.x * j.len * 0.6, y: j.rim.y - a.e.y * j.len * 0.6 }, hinge, { x: hinge.x + 110, y: hinge.y + 26 }, { x: 1180, y: 800 }, { x: 1240, y: 900 }];
  const r = route(knots, 6);
  const n = Math.ceil(r.length / 6);
  const spine = Array.from({ length: n + 1 }, (_, i) => r.at((i / n) * r.length));
  const widths = spine.map((_, i) => 150 + 70 * (i / n));
  drawBoaBody(ctx, cast.body, boil, { spine, widths, along: 170 / SNAKE_W, offset: 44 });
}

function drawTongue(ctx: CanvasRenderingContext2D, cast: Cast, boil: number, j: Jaws, out: number): void {
  if (out <= 0) return;
  const a = axisOf(j.heading);
  drawSprite(ctx, cast.tongue, boil, { x: j.rim.x + a.e.x * (40 * out - 6), y: j.rim.y + a.e.y * (40 * out - 6) + 6, rotation: j.heading, scale: 5.4 });
}

function heartPath(scale: number): Path2D {
  const k = (HEART_PX / HEART_W) * scale;
  const path = new Path2D();
  HEART_SHAPE.forEach((p, i) => {
    const x = HEART_AT.x + p.x * k;
    const y = HEART_AT.y + p.y * k;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  path.closePath();
  return path;
}

/** The red light through the snake's skin. */
function drawGlow(ctx: CanvasRenderingContext2D, glow: number, scale: number): void {
  if (glow <= 0) return;
  const r = 470 * (0.7 + 0.3 * scale);
  const g = ctx.createRadialGradient(HEART_AT.x, HEART_AT.y, 40, HEART_AT.x, HEART_AT.y, r);
  g.addColorStop(0, `rgba(255,44,30,${0.6 * glow})`);
  g.addColorStop(0.5, `rgba(250,36,26,${0.36 * glow})`);
  g.addColorStop(0.72, `rgba(230,30,24,${0.08 * glow})`);
  g.addColorStop(1, 'rgba(200,20,20,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(-100, -100, VIDEO.width + 200, VIDEO.height + 200);
  ctx.restore();
}

/** The heart inside the coils: laid over them, then the picture of the coils veiled back across it. */
function drawHeart(ctx: CanvasRenderingContext2D, cast: Cast, boil: number, t: number): void {
  const h = heartAt(t);
  if (h.alpha <= 0) return;
  const scale = (HEART_PX / HEART_W) * h.scale;
  const { veil } = cast;
  const copy = veil.getContext('2d')!;
  copy.clearRect(0, 0, veil.width, veil.height);
  copy.drawImage(ctx.canvas, 0, 0);
  ctx.save();
  ctx.globalAlpha = h.alpha;
  drawGlow(ctx, h.glow, h.scale);
  drawSprite(ctx, cast.heart.dead, boil, { x: HEART_AT.x, y: HEART_AT.y, scale });
  drawSprite(ctx, cast.heart.live, boil, { x: HEART_AT.x, y: HEART_AT.y, scale, alpha: h.life ** 0.8 });
  ctx.save();
  ctx.clip(heartPath(h.scale));
  ctx.resetTransform();
  ctx.globalAlpha = h.alpha * VEIL;
  ctx.drawImage(veil, 0, 0);
  ctx.restore();
  ctx.restore();
}

/** The coil shot at t. */
export function drawCoilShot(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const q = tightAt(t);
  const coils = coilsAt(q);
  const kick = kickAt(t);
  const j = jawsAt(t);
  ctx.save();
  drawDark(ctx, cast.dark);
  zoomAbout(ctx, HEART_AT, coilZoom(t) * (1 + 0.014 * kick), 0, 7 * kick);
  for (const b of coils.back) drawBand(ctx, cast.body, boil, b, 0.5);
  drawMouth(ctx, j);
  drawRat(ctx, cast, boil, t, q);
  drawTail(ctx, cast, boil, 7 * Math.sin((t * Math.PI * 2) / 3));
  drawNeck(ctx, cast, boil, j);
  drawJaws(ctx, cast, boil, j);
  drawTongue(ctx, cast, boil, j, tongueAt(t));
  for (const b of [...coils.front].reverse()) drawBand(ctx, cast.body, boil, b);
  drawHeart(ctx, cast, boil, t);
  ctx.restore();
  drawVignette(ctx, VIDEO.width, VIDEO.height, 0.34 + 0.56 * (1 - lifeAt(t)));
}
