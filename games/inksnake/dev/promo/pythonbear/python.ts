import { SNAKE_W } from '../../../src/art/types';
import { route } from '../krait/path';
import { drawBody, drawBodyShadow, drawSprite, type Pt, type Sprite, type Strip } from '../sprites';
import type { HeadPose } from './reticHead';
import { RETIC } from './reticArt';

/**
 * The reticulated python laid out on screen: a body along a spine (head
 * first) with a width at each point, its contour inked, and the side-on head
 * at the front. Shared by every shot.
 */
export interface PythonCast {
  /** Strips for a body whose head is on the right / on the left (see reticArt.ts). */
  readonly right: Strip;
  readonly left: Strip;
  readonly head: Readonly<Record<HeadPose, Sprite>>;
}

export interface Lay {
  readonly spine: readonly Pt[];
  readonly widths: readonly number[];
  /** The body's ordinary width, screen px (the pattern's scale). */
  readonly base: number;
  readonly headRight: boolean;
}

/** Points every `step` px along a smooth curve through `knots`, from the head back. */
export function spineOf(knots: readonly Pt[], step = 4): Pt[] {
  const r = route(knots, 1);
  const n = Math.max(2, Math.ceil(r.length / step));
  return Array.from({ length: n + 1 }, (_, i) => r.at((i / n) * r.length));
}

/** Arc length along a spine at each of its points. */
export function lengths(spine: readonly Pt[]): number[] {
  const out = [0];
  for (let i = 1; i < spine.length; i++) out.push(out[i - 1]! + Math.hypot(spine[i]!.x - spine[i - 1]!.x, spine[i]!.y - spine[i - 1]!.y));
  return out;
}

/** The two edges of a lay, `k` of the half width out each side. */
function edges(l: Lay, k = 1): { a: Pt[]; b: Pt[] } {
  const n = l.spine.length;
  const a: Pt[] = [];
  const b: Pt[] = [];
  l.spine.forEach((p, i) => {
    const s = l.spine[Math.max(0, i - 1)]!;
    const e = l.spine[Math.min(n - 1, i + 1)]!;
    const len = Math.hypot(e.x - s.x, e.y - s.y) || 1;
    const nx = -(e.y - s.y) / len;
    const ny = (e.x - s.x) / len;
    const h = (l.widths[i]! / 2) * k;
    a.push({ x: p.x + nx * h, y: p.y + ny * h });
    b.push({ x: p.x - nx * h, y: p.y - ny * h });
  });
  return { a, b };
}

function strokeLine(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, colour: string, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** The body: its soft shadow, the strip, a firm contour along both edges. */
export function drawPythonBody(ctx: CanvasRenderingContext2D, cast: PythonCast, boil: number, l: Lay, shadow = 1): void {
  const pose = { spine: l.spine, widths: l.widths, along: l.base / SNAKE_W };
  if (shadow > 0) drawBodyShadow(ctx, pose, l.base, shadow);
  drawBody(ctx, l.headRight ? cast.right : cast.left, boil, pose);
  const { a, b } = edges(l, 0.985);
  const w = Math.max(2.2, l.base * 0.028);
  strokeLine(ctx, a, w, RETIC.line);
  strokeLine(ctx, b, w, RETIC.line);
}

/** The outline of a lay (for clipping or shading over it). */
export function outlineOf(l: Lay): Pt[] {
  const { a, b } = edges(l);
  return [...a, ...b.reverse()];
}

/**
 * The head at the front of a lay, side on, facing along the body's first
 * stretch; `scale` is screen px per head art unit (its neck is 24 deep, so
 * base / 24 meets the body). `lift` turns it up (radians), `tilt` nods it.
 */
export function drawPythonHead(ctx: CanvasRenderingContext2D, cast: PythonCast, boil: number, l: Lay, pose: HeadPose, lift = 0): void {
  const a = l.spine[0]!;
  const b = l.spine[Math.min(l.spine.length - 1, 3)]!;
  const forward = Math.atan2(a.y - b.y, a.x - b.x);
  const scale = (l.widths[0]! / SNAKE_W);
  const right = Math.cos(forward) >= 0;
  const rotation = right ? forward - lift : forward + lift;
  drawSprite(ctx, cast.head[pose], boil, { x: a.x, y: a.y, scale, rotation, flip: right ? 1 : -1 });
}
