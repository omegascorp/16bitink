import { INK } from '../../../src/art/palette';
import { SNAKE_W } from '../../../src/art/types';
import type { Route } from '../krait/path';
import { VIDEO } from '../short';
import { drawBody, drawBodyShadow, drawSprite, type BodyPose, type Pt, taper } from '../sprites';
import type { Cast } from './cast';
import { CROC_LEN, CROC_SNOUT } from './croc';

/**
 * The python on screen, as the game draws its player snake (snakeView.ts):
 * the body strip laid along the route behind the head, tapering to the tail
 * and swelling over a meal, its soft shadow under it, the head sprite turned
 * along the neck, the tongue flicking from the snout; and, while it
 * swallows, the croc going down its throat between the gaping jaws (and
 * showing faintly through the skin inside the bulge).
 */

export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export const toScreen = (c: Camera, p: Pt): Pt => ({ x: (p.x - c.x) * c.zoom + VIDEO.width / 2, y: (p.y - c.y) * c.zoom + VIDEO.height / 2 });

export interface Bulge {
  readonly from: number;
  readonly to: number;
  readonly amp: number;
}

/** The croc in the jaws: how much of it has gone in (0 its snout at the lips, 1 all of it; negative: still ahead of the mouth), and how far its tail swings (radians). */
export interface Gulp {
  readonly p: number;
  readonly sway: number;
  readonly pose: 'swim0' | 'swim1';
}

export interface PythonPose {
  readonly route: Route;
  readonly headS: number;
  readonly length: number;
  readonly width: number;
  readonly bulges: readonly Bulge[];
  readonly head: 'shut' | 'open' | 'strike';
  readonly yaw?: number;
  readonly lunge?: number;
  readonly tongue?: number;
  readonly gulp?: Gulp;
  /** The croc under the skin: its middle this far back from the head (board px), faintly. */
  readonly inside?: { readonly at: number; readonly alpha: number };
  readonly slide?: number;
}

/** Board px per croc art unit: a croc a third of the python's length. */
export const CROC_K = 0.86;
/** Board px along the throat the whole croc takes. */
export const CROC_IN = CROC_LEN * CROC_K;
/** The lips of the gaping head, head units ahead of the frame's centre. */
const LIPS = 13.2;
const SNOUT_SHIFT = { open: 0, shut: 4.6, strike: 5.6 } as const;
const NECK_BACK = 28;

function bulgeAt(bulges: readonly Bulge[], d: number): number {
  let out = 0;
  for (const b of bulges) {
    if (b.amp <= 0 || b.to <= b.from) continue;
    const edge = Math.min(14, (b.to - b.from) / 2);
    const inA = Math.min(1, Math.max(0, (d - b.from) / edge));
    const inB = Math.min(1, Math.max(0, (b.to - d) / edge));
    const k = Math.min(inA, inB);
    out = Math.max(out, b.amp * k * k * (3 - 2 * k));
  }
  return out;
}

export function bodyOf(cam: Camera, k: PythonPose): BodyPose {
  const step = 2;
  const n = Math.ceil(k.length / step);
  const spine: Pt[] = [];
  const widths: number[] = [];
  for (let i = 0; i <= n; i++) {
    const d = Math.min(k.length, i * step);
    spine.push(toScreen(cam, k.route.at(k.headS - d)));
    widths.push((k.width * taper(d / k.length) + bulgeAt(k.bulges, d)) * cam.zoom);
  }
  return { spine, widths, along: (k.width * cam.zoom) / SNAKE_W, offset: k.slide ?? 0 };
}

export function headAngle(k: PythonPose): number {
  const scale = k.width / SNAKE_W;
  const h = k.route.at(k.headS);
  const back = k.route.at(k.headS - NECK_BACK * scale);
  const along = Math.atan2(h.y - back.y, h.x - back.x);
  const heading = k.route.heading(k.headS);
  const off = Math.atan2(Math.sin(heading - along), Math.cos(heading - along));
  return along + off * 0.15 + (k.yaw ?? 0);
}

export function headOn(cam: Camera, k: PythonPose): { readonly at: Pt; readonly angle: number; readonly scale: number } {
  const angle = headAngle(k);
  const h = k.route.at(k.headS);
  const lunge = k.lunge ?? 0;
  const at = toScreen(cam, { x: h.x + Math.cos(angle) * lunge, y: h.y + Math.sin(angle) * lunge });
  return { at, angle, scale: (k.width / SNAKE_W) * cam.zoom };
}

/** The croc going in: only what's in front of the lips shows, lying over the floor of the open mouth. */
function drawGulp(ctx: CanvasRenderingContext2D, cast: Cast, g: Gulp, boil: number, headScale: number, shift: number): void {
  const e = CROC_K / headScale;
  const snoutX = LIPS - g.p * CROC_LEN * e;
  ctx.save();
  if (g.p >= 0) {
    ctx.beginPath();
    const front: [number, number][] = [[8, -80], [8, -13], [8.4, -10.4], [11.6, -7.2], [13.4, -4.4], [14.3, -2.2], [14.6, 0], [14.3, 2.2], [13.4, 4.4], [11.6, 7.2], [8.4, 10.4], [8, 13], [8, 80]];
    front.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x + shift, y) : ctx.lineTo(x + shift, y)));
    ctx.lineTo(500, 80);
    ctx.lineTo(500, -80);
    ctx.closePath();
    ctx.clip();
  }
  ctx.save();
  ctx.translate(LIPS, 0);
  ctx.rotate(g.sway);
  ctx.translate(-LIPS, 0);
  drawSprite(ctx, cast.croc[g.pose], boil, { x: snoutX + CROC_SNOUT * e, y: 0, scale: e, rotation: Math.PI });
  ctx.restore();
  if (g.p >= 0) {
    const shade = ctx.createLinearGradient(LIPS, 0, LIPS + 6, 0);
    shade.addColorStop(0, 'rgba(10,14,30,0.55)');
    shade.addColorStop(1, 'rgba(10,14,30,0)');
    ctx.fillStyle = shade;
    ctx.fillRect(LIPS - 2, -11, 8, 22);
  }
  ctx.restore();
}

/** The swallowed croc showing through the skin inside the bulge: darkened into the scales. */
function drawInside(ctx: CanvasRenderingContext2D, cast: Cast, cam: Camera, k: PythonPose, boil: number): void {
  const s = k.headS - k.inside!.at;
  const c = toScreen(cam, k.route.at(s));
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  drawSprite(ctx, cast.croc.swim0, boil, { x: c.x, y: c.y, scale: CROC_K * cam.zoom, rotation: k.route.heading(s) + Math.PI, alpha: k.inside!.alpha });
  ctx.restore();
}

/** Draws the python (shadow, body, the croc inside, head, tongue, the croc in its jaws) for a camera. */
export function drawPython(ctx: CanvasRenderingContext2D, cast: Cast, cam: Camera, k: PythonPose, boil: number): void {
  const body = bodyOf(cam, k);
  const base = k.width * cam.zoom;
  const head = headOn(cam, k);
  drawBodyShadow(ctx, body, base);
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(head.at.x + base * 0.23 + Math.cos(head.angle) * base * 0.25, head.at.y + base * 0.33 + Math.sin(head.angle) * base * 0.25, base * 0.75, base * 0.6, head.angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawBody(ctx, cast.strip, boil, body);
  if (k.inside && k.inside.alpha > 0) drawInside(ctx, cast, cam, k, boil);
  const sprite = cast.head[k.head];
  ctx.save();
  ctx.translate(head.at.x, head.at.y);
  ctx.rotate(head.angle);
  ctx.scale(head.scale, head.scale);
  const out = k.head === 'shut' ? k.tongue ?? 0 : 0;
  if (out > 0) {
    const reach = cast.art.snout - 2 - (1 - out) * 9;
    ctx.save();
    ctx.translate(reach, 0);
    ctx.scale(0.5 + 0.5 * out, 1);
    drawSprite(ctx, cast.tongue, boil, { x: 0, y: 0, scale: 1, rotation: Math.sin(out * 29) * 0.16, alpha: Math.min(1, out * 4) });
    ctx.restore();
  }
  drawSprite(ctx, sprite, boil, { x: 0, y: 0, scale: 1 });
  if (k.gulp && k.gulp.p < 1) drawGulp(ctx, cast, k.gulp, boil, k.width / SNAKE_W, SNOUT_SHIFT[k.head]);
  ctx.restore();
}
