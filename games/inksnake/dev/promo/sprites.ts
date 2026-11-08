import { makeDraw } from '../../src/art/kit';
import { BOIL, INK } from '../../src/art/palette';
import { makeCanvas, releaseScratch } from '../../src/art/pen';
import { SNAKE_W, stripLength, type SnakeArt, type SpriteArt } from '../../src/art/types';

/**
 * The game's own drawings, baked big enough for a 1080 px wide video. Pen
 * strokes are vectors, so a bigger `res` gives the same drawing with crisp
 * lines, and the same seeds give the same wobble as in the game
 * (src/art/textures.ts bakes them the same way, at the game's own res).
 *
 * The line boils at BOIL_FPS through the game's BOIL frames: a cycle of
 * BOIL / BOIL_FPS = 0.375 s, so a loop must be a multiple of 1.5 s (a whole
 * number of 30 fps frames and of boil cycles).
 */
export const BOIL_FPS = 8;

/** The boil frame at loop time `t`. */
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL;

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** One pose of a sprite: a square canvas per boil frame, `frame` art units across, centred on the art's origin. */
export interface Sprite {
  readonly frames: readonly HTMLCanvasElement[];
  readonly frame: number;
  /** Canvas px per art unit. */
  readonly res: number;
}

/** Bakes one pose of any of the game's sprites (critters, heads, tongues) once per boil frame, as textures.ts does. */
export function bakeSprite<P extends string>(art: SpriteArt<P>, pose: P, res: number, seed: number, ink: string = INK): Sprite {
  const size = Math.ceil(art.frame * res);
  const frames = Array.from({ length: BOIL }, (_, f) => {
    const { canvas, ctx } = makeCanvas(size, size);
    ctx.scale(res, res);
    ctx.translate(art.frame / 2, art.frame / 2);
    art.draw(makeDraw(ctx, seed + f, f, 0, ink), pose);
    return canvas;
  });
  releaseScratch();
  return { frames, frame: art.frame, res };
}

export interface Placement {
  /** Where the drawing's origin (its frame's centre) lands on screen. */
  readonly x: number;
  readonly y: number;
  /** Screen px per art unit. */
  readonly scale: number;
  /** Radians, about the origin (art faces +x). */
  readonly rotation?: number;
  /** 1 as drawn, -1 mirrored top to bottom (the art's other side). */
  readonly flip?: number;
  readonly alpha?: number;
}

/** Draws a sprite's boil frame `boil` at a placement. */
export function drawSprite(ctx: CanvasRenderingContext2D, sprite: Sprite, boil: number, at: Placement): void {
  const n = sprite.frames.length;
  const canvas = sprite.frames[((boil % n) + n) % n]!;
  const alpha = at.alpha ?? 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(at.x, at.y);
  if (at.rotation) ctx.rotate(at.rotation);
  ctx.scale(at.scale, at.scale * (at.flip ?? 1));
  const half = sprite.frame / 2;
  ctx.drawImage(canvas, -half, -half, sprite.frame, sprite.frame);
  ctx.restore();
}

/** A snake's back strip (one period and a quarter, see SnakeArt), baked per boil frame at `res` px per strip unit. */
export interface Strip {
  readonly frames: readonly HTMLCanvasElement[];
  readonly period: number;
  readonly res: number;
}

export function bakeStrip(art: SnakeArt, res: number, seed = 11): Strip {
  const len = stripLength(art.period);
  const frames = Array.from({ length: BOIL }, (_, f) => {
    const { canvas, ctx } = makeCanvas(Math.ceil(len * res), Math.ceil(SNAKE_W * res));
    ctx.scale(res, res);
    art.drawStrip(makeDraw(ctx, seed, f, 0), len);
    // Opaque all the way across (ink past the contours), so the overlapping slices drawBody lays never darken where they overlap; drawBody clips the edges.
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, len, SNAKE_W);
    return canvas;
  });
  releaseScratch();
  return { frames, period: art.period, res };
}

/** A body on screen: its spine from the head back (screen px), the width at each point, and screen px per strip unit along it. */
export interface BodyPose {
  readonly spine: readonly Pt[];
  readonly widths: readonly number[];
  /** Screen px per strip unit along the body (the base width / SNAKE_W, as the game wraps the pattern). */
  readonly along: number;
  /** Strip units the pattern is slid by (it travels with the body as the snake moves). */
  readonly offset?: number;
}

/** The body's edge, as a share of its width in from the strip's edges: just past the outer contours (painted out to about 0.3 of SNAKE_W). */
const EDGE_INSET = 0.3 / SNAKE_W;

/** Where the snake's soft shadow falls, in body widths (the game's 3.5, 5 board px at its width of 15). */
const SHADOW = { x: 0.23, y: 0.33, alpha: 0.22 } as const;

/** The two edges of a body: left (strip y = 0) and right, as the game's layBody lays them, `inset` of the width in from each side. */
function edges(b: BodyPose, inset = 0): { left: Pt[]; right: Pt[] } {
  const n = b.spine.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = b.spine[Math.max(0, i - 1)]!;
    const c = b.spine[Math.min(n - 1, i + 1)]!;
    const dx = a.x - c.x;
    const dy = a.y - c.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const half = (b.widths[i]! / 2) * (1 - 2 * inset);
    const p = b.spine[i]!;
    left.push({ x: p.x + nx * half, y: p.y + ny * half });
    right.push({ x: p.x - nx * half, y: p.y - ny * half });
  }
  return { left, right };
}

/** The body's soft shadow on the ground under it. */
export function drawBodyShadow(ctx: CanvasRenderingContext2D, b: BodyPose, base: number, alpha = 1): void {
  if (b.spine.length < 2) return;
  const { left, right } = edges(b);
  const ox = SHADOW.x * base;
  const oy = SHADOW.y * base;
  ctx.save();
  ctx.globalAlpha *= SHADOW.alpha * alpha;
  ctx.fillStyle = INK;
  ctx.beginPath();
  [...left, ...[...right].reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x + ox, p.y + oy) : ctx.lineTo(p.x + ox, p.y + oy)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * The body as the game draws it: the strip laid along the spine in thin
 * slices, the pattern wrapping every period (from the head back), each
 * slice stretched across to the width there (so a lump swells it).
 */
export function drawBody(ctx: CanvasRenderingContext2D, strip: Strip, boil: number, b: BodyPose): void {
  const n = b.spine.length;
  if (n < 2) return;
  const tex = strip.frames[((boil % strip.frames.length) + strip.frames.length) % strip.frames.length]!;
  const res = strip.res;
  let dist = 0;
  ctx.save();
  // Clipped just outside the contours (the strip is opaque out to its edges).
  const { left, right } = edges(b, EDGE_INSET);
  ctx.beginPath();
  [...left, ...[...right].reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  const base = ctx.getTransform();
  for (let i = 0; i + 1 < n; i++) {
    const a = b.spine[i]!;
    const c = b.spine[i + 1]!;
    const len = Math.hypot(c.x - a.x, c.y - a.y);
    if (len < 1e-6) continue;
    const bx = (c.x - a.x) / len;
    const by = (c.y - a.y) / len;
    // The strip's y runs across to the left of travel (towards the head), as in the game.
    const nx = by;
    const ny = -bx;
    const w = (b.widths[i]! + b.widths[i + 1]!) / 2;
    const across = w / SNAKE_W;
    const u0 = ((((dist / b.along + (b.offset ?? 0)) % strip.period) + strip.period) % strip.period);
    const du = len / b.along;
    // A little overlap hides the seams between slices.
    const over = 0.9 / b.along;
    ctx.setTransform(base);
    ctx.transform(bx * b.along, by * b.along, nx * across, ny * across, a.x, a.y);
    ctx.drawImage(tex, u0 * res, 0, (du + over) * res, SNAKE_W * res, 0, -SNAKE_W / 2, du + over, SNAKE_W);
    dist += len;
  }
  ctx.restore();
}

/** Width share at `t` of the body's length (0 head .. 1 tail): full, then tapering smoothly to the tip (the game's taper). */
export function taper(t: number, from = 0.62, tip = 0.12): number {
  if (t <= from) return 1;
  const x = Math.min(1, (t - from) / (1 - from));
  const e = x * x * (3 - 2 * x);
  return 1 - (1 - tip) * e;
}

/** How much a lump `size` wide at `at` (distance from the head) swells the body at `d`, for a body `base` wide (the game's lumpAt). */
export function lumpAt(d: number, at: number, size: number, base: number): number {
  const reach = Math.max(size, base) * 1.15;
  const off = Math.abs(d - at);
  if (off >= reach || size <= 0) return 0;
  const amp = Math.max(base * 0.32, size * 1.04 - base);
  const c = Math.cos((off / reach) * Math.PI * 0.5);
  return amp * c * c;
}
