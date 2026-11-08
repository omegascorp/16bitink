import { route, type Route } from '../krait/path';
import { drawWorld } from '../eggeater/render';
import { makeCanvas } from '../../../src/art/pen';
import { drawSprite, type Pt, type Sprite } from '../sprites';
import { type Board, type Camera, drawBoard, toScreen } from './boards';
import { type Cast, makeCast, type MealId, SNAKE_CM, type SnakeId } from './cast';
import { bodyOf, drawSnake, type SnakePose, type View } from './swallower';
import { arrow, caption, divider, punch, sticker, TH, TW, YELLOW } from './thumbKit';

/**
 * The three YouTube thumbnails for "What's the biggest thing a snake can
 * swallow? (Size Comparison)" (script.md, "Thumbnails"), drawn at 1920 × 1080
 * from the video's own engine, with the colours punched up:
 * - lump:     top-down and tight, the Burmese python's body bulging round the
 *             x-ray deer, the hind legs still out of the jaws; "77 LB";
 * - split:    corn snake and mouse | rock python and its hyena lump, a red
 *             divider and a fat yellow arrow;
 * - champion: the egg-eater side-on, jaws round an egg far wider than its
 *             head; a small python silhouette behind it marked "2nd"; "#1".
 */
export const SWALLOW_THUMBS = ['lump', 'split', 'champion'] as const;
export type SwallowThumb = (typeof SWALLOW_THUMBS)[number];

const viewOf = (cam: Camera): View => ({ at: (p: Pt) => toScreen(cam, p), zoom: cam.zoom });

/** The route distance nearest a point. */
function sNear(r: Route, p: Pt): number {
  let best = 0;
  let bestD = Infinity;
  for (let s = 0; s <= r.length; s += 1) {
    const q = r.at(s);
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bestD) [best, bestD] = [s, d];
  }
  return best;
}

interface Swallow {
  readonly snake: SnakeId;
  readonly meal: MealId;
  /** Board px per cm. */
  readonly scale: number;
  /** The route, in SCREEN px (1920 × 1080) for the swallow's camera, tail end first. */
  readonly knots: readonly Pt[];
  readonly head: Pt;
  /** How far in; 1 with `at` for a lump down the body. */
  readonly p: number;
  /** Share of the body the lump sits at, once swallowed. */
  readonly at?: number;
  readonly cm?: number;
  readonly wide?: number;
  /** How strongly the punched-up x-ray shows (0: the video's own). */
  readonly glow?: number;
}

/** Screen px to the camera's board px. */
const toBoard = (cam: Camera, p: Pt): Pt => ({ x: cam.x + (p.x - TW / 2) / cam.zoom, y: cam.y + (p.y - TH / 2) / cam.zoom });

function poseOf(cast: Cast, s: Swallow, cam: Camera): SnakePose {
  const size = SNAKE_CM[s.snake];
  const r = route(s.knots.map((k) => toBoard(cam, k)));
  const length = (s.cm ?? size.cm) * s.scale;
  const width = (s.wide ?? size.wide) * s.scale;
  return {
    snake: cast.snakes[s.snake], route: r, headS: sNear(r, toBoard(cam, s.head)), length, width,
    meal: { meal: cast.meals[s.meal], scale: s.scale, p: s.p, at: s.at === undefined ? undefined : length * s.at, xray: 1 },
  };
}

function bodyPath(ctx: CanvasRenderingContext2D, spine: readonly Pt[], widths: readonly number[]): void {
  const left: Pt[] = [];
  const right: Pt[] = [];
  const n = spine.length;
  for (let i = 0; i < n; i++) {
    const a = spine[Math.max(0, i - 1)]!;
    const c = spine[Math.min(n - 1, i + 1)]!;
    const len = Math.hypot(a.x - c.x, a.y - c.y) || 1;
    const nx = -(a.y - c.y) / len;
    const ny = (a.x - c.x) / len;
    const h = widths[i]! * 0.44;
    left.push({ x: spine[i]!.x + nx * h, y: spine[i]!.y + ny * h });
    right.push({ x: spine[i]!.x - nx * h, y: spine[i]!.y - ny * h });
  }
  ctx.beginPath();
  [...left, ...right.reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

/** `sprite` recoloured flat. */
function tinted(sprite: Sprite, color: string): Sprite {
  const frames = sprite.frames.map((src) => {
    const { canvas, ctx } = makeCanvas(src.width, src.height);
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, src.width, src.height);
    return canvas;
  });
  return { ...sprite, frames };
}

const X_RAY = '#8ff7ff';

/** The x-ray, punched up: the meal inside glowing cyan through the skin, its outline bright. */
function xrayGlow(ctx: CanvasRenderingContext2D, k: SnakePose, view: View, glow: number): void {
  const m = k.meal!;
  const b = bodyOf(k, view);
  const s = k.headS + b.lay.front - b.lay.centre;
  const c = view.at(k.route.at(s));
  const at = { x: c.x, y: c.y, scale: (m.scale * m.meal.cm * view.zoom) / m.meal.len, rotation: k.route.heading(s) + Math.PI };
  ctx.save();
  bodyPath(ctx, b.spine, b.widths);
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  drawSprite(ctx, tinted(m.meal.ghost, '#1f9fb8'), 0, { ...at, alpha: 0.32 * glow });
  ctx.globalCompositeOperation = 'source-over';
  const rim = tinted(m.meal.rim, X_RAY);
  ctx.shadowColor = X_RAY;
  ctx.shadowBlur = 18;
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as const) drawSprite(ctx, rim, 0, { ...at, x: at.x + dx, y: at.y + dy, alpha: glow });
  ctx.shadowBlur = 0;
  drawSprite(ctx, tinted(m.meal.rim, '#ffffff'), 0, { ...at, alpha: glow });
  ctx.restore();
}

function drawSwallow(ctx: CanvasRenderingContext2D, cast: Cast, s: Swallow, cam: Camera): void {
  const k = poseOf(cast, s, cam);
  const view = viewOf(cam);
  drawSnake(ctx, k, view, 0);
  if (s.glow) xrayGlow(ctx, k, view, s.glow);
}

/** A bright green wash over the swamp's mud and water (multiplied, so the painting's ink stays). */
function greenUp(ctx: CanvasRenderingContext2D, strength: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = strength;
  const g = ctx.createRadialGradient(TW * 0.55, TH * 0.45, 100, TW * 0.55, TH * 0.45, 1300);
  g.addColorStop(0, '#5fd62a');
  g.addColorStop(1, '#1f8a2a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TW, TH);
  ctx.restore();
}

function ground(ctx: CanvasRenderingContext2D, board: Board, cam: Camera, filter: string, wash?: (c: CanvasRenderingContext2D) => void): void {
  punch(ctx, (c) => {
    drawBoard(c, board, cam);
    wash?.(c);
  }, filter);
}

/** A soft dark edge, to push the middle forward. */
function vignette(ctx: CanvasRenderingContext2D, strength: number, x = TW / 2, y = TH / 2): void {
  const g = ctx.createRadialGradient(x, y, 380, x, y, 1250);
  g.addColorStop(0, 'rgba(5,20,5,0)');
  g.addColorStop(1, `rgba(5,20,5,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TW, TH);
}

// ---- A · lump -------------------------------------------------------------

const LUMP_CAM: Camera = { x: 505, y: 280, zoom: 7.2 };
const LUMP: Swallow = {
  snake: 'burmese', meal: 'deer', scale: 1.2, p: 0.6, glow: 1,
  knots: [{ x: -500, y: 1250 }, { x: -100, y: 980 }, { x: 350, y: 740 }, { x: 750, y: 650 }, { x: 980, y: 620 }, { x: 1900, y: 520 }],
  head: { x: 970, y: 621 },
};

function drawLump(ctx: CanvasRenderingContext2D, cast: Cast): void {
  ground(ctx, cast.boards.swamp, LUMP_CAM, 'saturate(1.5) contrast(1.15) brightness(1.1)', (c) => greenUp(c, 0.5));
  vignette(ctx, 0.55, 1100, 560);
  sticker(ctx, (c) => drawSwallow(c, cast, LUMP, LUMP_CAM), { outline: 8, filter: 'saturate(1.5) contrast(1.15)' });
  caption(ctx, '77 LB', 500, 180, 260, 900, YELLOW, -0.04);
}

// ---- B · split --------------------------------------------------------------

/** The divider's top and bottom x. */
const SPLIT_TOP = 820;
const SPLIT_BOTTOM = 700;
const leftPanel = (c: CanvasRenderingContext2D): void => {
  c.moveTo(0, 0); c.lineTo(SPLIT_TOP, 0); c.lineTo(SPLIT_BOTTOM, TH); c.lineTo(0, TH); c.closePath();
};
const rightPanel = (c: CanvasRenderingContext2D): void => {
  c.moveTo(SPLIT_TOP, 0); c.lineTo(TW, 0); c.lineTo(TW, TH); c.lineTo(SPLIT_BOTTOM, TH); c.closePath();
};

const CORN_CAM: Camera = { x: 300, y: 300, zoom: 5 };
const CORN: Swallow = {
  snake: 'corn', meal: 'mouse', scale: 3.1, p: 0,
  knots: [{ x: -100, y: 700 }, { x: 150, y: 980 }, { x: 450, y: 900 }, { x: 560, y: 680 }, { x: 300, y: 560 }, { x: 180, y: 400 }, { x: 310, y: 300 }, { x: 430, y: 290 }, { x: 900, y: 290 }],
  head: { x: 420, y: 290 },
};
const ROCK_CAM: Camera = { x: 500, y: 270, zoom: 5.4 };
const ROCK: Swallow = {
  snake: 'rock', meal: 'hyena', scale: 1.25, p: 0.66, glow: 1,
  knots: [{ x: 600, y: 1700 }, { x: 850, y: 1250 }, { x: 1020, y: 950 }, { x: 1200, y: 760 }, { x: 1370, y: 600 }, { x: 1900, y: 160 }],
  head: { x: 1370, y: 600 },
};

function panel(ctx: CanvasRenderingContext2D, clip: (c: CanvasRenderingContext2D) => void, draw: (c: CanvasRenderingContext2D) => void): void {
  ctx.save();
  ctx.beginPath();
  clip(ctx);
  ctx.clip();
  draw(ctx);
  ctx.restore();
}

function drawSplit(ctx: CanvasRenderingContext2D, cast: Cast): void {
  panel(ctx, leftPanel, (c) => {
    ground(c, cast.boards.farm, CORN_CAM, 'saturate(1.7) contrast(1.15) brightness(1.08)');
    vignette(c, 0.4, 400, 540);
  });
  panel(ctx, rightPanel, (c) => {
    ground(c, cast.boards.savanna, ROCK_CAM, 'saturate(1.8) contrast(1.15) brightness(1.06)');
    vignette(c, 0.45, 1300, 540);
  });
  sticker(ctx, (c) => drawSwallow(c, cast, CORN, CORN_CAM), { outline: 6, clip: leftPanel });
  sticker(ctx, (c) => drawSwallow(c, cast, ROCK, ROCK_CAM), { outline: 8, clip: rightPanel });
  divider(ctx, SPLIT_TOP, SPLIT_BOTTOM);
  arrow(ctx, 760, 560, 320, -0.1);
}

// ---- C · champion -----------------------------------------------------------

/** The egg-eater short's world (portrait, 1080 × 1920) at its own clock, and the 16:9 crop shown. */
export interface EggShot { readonly u: number; readonly x: number; readonly y: number; readonly w: number }
export const EGG_SHOT: EggShot = { u: 1.2, x: 0, y: 290, w: 1080 };

const SECOND_CAM: Camera = { x: 480, y: 270, zoom: 2 };
const SECOND: Swallow = {
  snake: 'burmese', meal: 'deer', scale: 0.55, wide: 26, p: 1, at: 0.42,
  knots: [{ x: 1330, y: 300 }, { x: 1420, y: 255 }, { x: 1530, y: 320 }, { x: 1650, y: 265 }, { x: 1770, y: 300 }, { x: 1860, y: 280 }, { x: 2100, y: 280 }],
  head: { x: 1860, y: 280 },
};

function drawChampion(ctx: CanvasRenderingContext2D, cast: Cast, shot: EggShot): void {
  const { canvas, ctx: off } = makeCanvas(1080, 1920);
  drawWorld(off, shot.u, 0);
  punch(ctx, (c) => c.drawImage(canvas, shot.x, shot.y, shot.w, (shot.w * TH) / TW, 0, 0, TW, TH), 'saturate(1.9) contrast(1.25) brightness(1.08)');
  // A python behind, in silhouette, marked "2nd".
  sticker(ctx, (c) => drawSwallow(c, cast, SECOND, SECOND_CAM), { outline: 0, filter: 'brightness(0.18) saturate(0.4)', shadow: false });
  // Darkened edges, so the pale egg glows.
  const g = ctx.createRadialGradient(1000, 520, 300, 1000, 520, 1150);
  g.addColorStop(0, 'rgba(60,20,0,0)');
  g.addColorStop(1, 'rgba(60,20,0,0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TW, TH);
  caption(ctx, '2nd', 1660, 170, 120, 320, '#ffffff');
  caption(ctx, '#1', 300, 230, 320, 600, YELLOW, -0.06);
}

let cast: Cast | undefined;

export function drawSwallowThumb(ctx: CanvasRenderingContext2D, id: SwallowThumb, egg: EggShot = EGG_SHOT): void {
  cast ??= makeCast();
  ctx.clearRect(0, 0, TW, TH);
  if (id === 'lump') drawLump(ctx, cast);
  else if (id === 'split') drawSplit(ctx, cast);
  else drawChampion(ctx, cast, egg);
}

/** For picking the egg shot: the short's whole portrait world at its time u. */
export function drawEggRaw(ctx: CanvasRenderingContext2D, u: number): void {
  drawWorld(ctx, u, 0);
}
