import { INK } from '../../../src/art/palette';
import { SNAKE_W } from '../../../src/art/types';
import { VIDEO } from '../short';
import { drawBody, drawBodyShadow, drawSprite, type BodyPose, type Pt, taper } from '../sprites';
import type { Cast } from './cast';
import { LONG_EEL_SNOUT, LONG_EEL_SPAN, LONG_EEL_WIDTH } from './eel';
import type { Route } from './path';

/**
 * The krait on screen, as the game draws its player snake (snakeView.ts):
 * the body strip laid along the route behind the head, tapering to the tail
 * and swelling over a meal, its soft shadow under it, the head sprite turned
 * along the neck, the tongue flicking from the snout; and, while it
 * swallows, the eel going down its throat between the gaping jaws.
 */

/** Where the camera looks: the board point at the screen's centre, and screen px per board px. */
export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export const toScreen = (c: Camera, p: Pt): Pt => ({ x: (p.x - c.x) * c.zoom + VIDEO.width / 2, y: (p.y - c.y) * c.zoom + VIDEO.height / 2 });

/** A meal in the body: the swelling from `from` to `to` (board px back from the head), `amp` wider at most. */
export interface Bulge {
  readonly from: number;
  readonly to: number;
  readonly amp: number;
}

export type MorayPose = 'swim0' | 'swim1';

/** The eel in the jaws: how much of it has gone in (0 its snout at the lips, 1 all of it), how far its tail swings (radians), its pose. */
export interface Gulp {
  readonly p: number;
  readonly sway: number;
  readonly pose: MorayPose;
}

export interface KraitPose {
  readonly route: Route;
  /** The head's place along the route. */
  readonly headS: number;
  readonly length: number;
  /** Body width, board px. */
  readonly width: number;
  readonly bulges: readonly Bulge[];
  readonly head: 'shut' | 'open' | 'strike';
  /** Extra turn of the head (radians): the jaws walking left and right over a meal. */
  readonly yaw?: number;
  /** The head pushed on forward along its heading, board px (a lunge). */
  readonly lunge?: number;
  /** The tongue out (0..1) and its flicker phase. */
  readonly tongue?: number;
  readonly gulp?: Gulp;
  /** The strip's pattern slid this far, strip units (it travels with the body as it swims). */
  readonly slide?: number;
}

/** Board px per eel unit: the moray drawn a little narrower than the krait's body. */
export const EEL_SCALE = 1.4;
/** The swallowed moray's snout in its frame, and its half width (eel.ts). */
const EEL_SNOUT = LONG_EEL_SNOUT;
const EEL_HALF_W = LONG_EEL_WIDTH / 2;
/** The lips of the gaping head, head units ahead of the frame's centre (the open pose's shortened snout). */
const LIPS = 13.2;
/** How much further forward a shut or striking head's snout reaches than the gaping one's, head units. */
const SNOUT_SHIFT = { open: 0, shut: 4.6, strike: 5.6 } as const;
/** Head units back from the head along the neck it is turned by (snakeView.ts NECK_BACK). */
const NECK_BACK = 28;

/** The swelling at d, board px back from the head. */
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

/** The body on screen: its spine from the head back, widths, and the pattern's scale. */
export function bodyOf(cam: Camera, k: KraitPose): BodyPose {
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

/** The way the head faces: along the neck, leaning a little into the heading (snakeView.ts headAngle). */
export function headAngle(k: KraitPose): number {
  const scale = k.width / SNAKE_W;
  const h = k.route.at(k.headS);
  const back = k.route.at(k.headS - NECK_BACK * scale);
  const along = Math.atan2(h.y - back.y, h.x - back.x);
  const heading = k.route.heading(k.headS);
  const off = Math.atan2(Math.sin(heading - along), Math.cos(heading - along));
  return along + off * 0.15 + (k.yaw ?? 0);
}

/** The head's place and turn on screen, and screen px per head unit. */
export function headOn(cam: Camera, k: KraitPose): { readonly at: Pt; readonly angle: number; readonly scale: number } {
  const angle = headAngle(k);
  const h = k.route.at(k.headS);
  const lunge = k.lunge ?? 0;
  const at = toScreen(cam, { x: h.x + Math.cos(angle) * lunge, y: h.y + Math.sin(angle) * lunge });
  return { at, angle, scale: (k.width / SNAKE_W) * cam.zoom };
}

/** The eel half way down the throat: only what's in front of the lips shows, lying over the floor of the open mouth. */
function drawGulp(ctx: CanvasRenderingContext2D, cast: Cast, g: Gulp, boil: number, headScale: number, eelScale: number, shift: number): void {
  // Head units per eel unit.
  const e = eelScale / headScale;
  const snoutX = LIPS - g.p * LONG_EEL_SPAN * e;
  ctx.save();
  // In front of the snout only (the crown hides the rest), and between the jaws.
  ctx.beginPath();
  const front: [number, number][] = [[8, -60], [8, -13], [8.4, -10.4], [11.6, -7.2], [13.4, -4.4], [14.3, -2.2], [14.6, 0], [14.3, 2.2], [13.4, 4.4], [11.6, 7.2], [8.4, 10.4], [8, 13], [8, 60]];
  front.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x + shift, y) : ctx.lineTo(x + shift, y)));
  ctx.lineTo(400, 60);
  ctx.lineTo(400, -60);
  ctx.closePath();
  ctx.clip();
  ctx.save();
  ctx.translate(LIPS, 0);
  ctx.rotate(g.sway);
  ctx.translate(-LIPS, 0);
  drawSprite(ctx, cast.eel[g.pose], boil, { x: snoutX + EEL_SNOUT * e, y: 0, scale: e, rotation: Math.PI });
  ctx.restore();
  // The crown's shadow across the eel where it meets the lips.
  const shade = ctx.createLinearGradient(LIPS, 0, LIPS + 6, 0);
  shade.addColorStop(0, 'rgba(10,14,30,0.55)');
  shade.addColorStop(1, 'rgba(10,14,30,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(LIPS - 2, -EEL_HALF_W * e * 1.2, 8, EEL_HALF_W * e * 2.4);
  ctx.restore();
}

/** Draws the krait (shadow, body, head, tongue, the eel in its jaws) for a camera. */
export function drawKrait(ctx: CanvasRenderingContext2D, cast: Cast, cam: Camera, k: KraitPose, boil: number): void {
  const body = bodyOf(cam, k);
  const base = k.width * cam.zoom;
  const head = headOn(cam, k);
  drawBodyShadow(ctx, body, base);
  // The head's own soft shadow, where the body's shadow ends.
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(head.at.x + base * 0.23 + Math.cos(head.angle) * base * 0.25, head.at.y + base * 0.33 + Math.sin(head.angle) * base * 0.25, base * 0.75, base * 0.6, head.angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawBody(ctx, cast.strip, boil, body);
  const sprite = cast.head[k.head];
  ctx.save();
  ctx.translate(head.at.x, head.at.y);
  ctx.rotate(head.angle);
  ctx.scale(head.scale, head.scale);
  // The tongue comes out from under the snout.
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
  // The eel: swimming at the snout, or going down between the jaws (the crown hides what's behind the snout; a shut or striking head's snout reaches further).
  if (k.gulp && k.gulp.p < 1) drawGulp(ctx, cast, k.gulp, boil, k.width / SNAKE_W, EEL_SCALE, SNOUT_SHIFT[k.head]);
  ctx.restore();
}
