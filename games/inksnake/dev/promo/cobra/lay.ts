import { SNAKE_W } from '../../../src/art/types';
import { drawBody, drawBodyShadow, drawSprite, type Pt, type Sprite, type Strip } from '../sprites';

/**
 * A snake laid on screen, side on: a body along a spine (head first) with a
 * width at each point, its contour inked, and a side-on head at the front.
 * Shared by the king cobra and the reticulated python in every shot.
 */
export interface Strips {
  /** For a body whose head is on the right / on the left (the back stays on top). */
  readonly right: Strip;
  readonly left: Strip;
}

export interface Lay {
  readonly spine: readonly Pt[];
  readonly widths: readonly number[];
  /** The body's ordinary width, screen px (the pattern's scale). */
  readonly base: number;
  readonly headRight: boolean;
  /** Strip units the pattern is slid by (a body sliding along its own length). */
  readonly offset?: number;
}

/** The two edges of a lay, `k` of the half width out each side. */
export function edges(l: Lay, k = 1): { a: Pt[]; b: Pt[] } {
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

export function outline(l: Lay): Pt[] {
  const { a, b } = edges(l);
  return [...a, ...b.reverse()];
}

export function strokeLine(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, colour: string, alpha = 1): void {
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

/** The body: its soft shadow, the strip, a firm contour along both edges and round the tail's tip. */
export function drawLaid(ctx: CanvasRenderingContext2D, strips: Strips, boil: number, l: Lay, line: string, shadow = 1): void {
  if (l.spine.length < 2) return;
  const pose = { spine: l.spine, widths: l.widths, along: l.base / SNAKE_W, offset: l.offset };
  if (shadow > 0) drawBodyShadow(ctx, pose, l.base, shadow);
  drawBody(ctx, l.headRight ? strips.right : strips.left, boil, pose);
  const { a, b } = edges(l, 0.985);
  strokeLine(ctx, [...a, ...[...b].reverse()], Math.max(2.2, l.base * 0.028), line);
}

/**
 * A side-on head at the front of a lay, facing along the body's first
 * stretch (its neck is 24 deep, so it meets the body); `lift` turns it up.
 */
export function drawHeadOn(ctx: CanvasRenderingContext2D, head: Sprite, boil: number, l: Lay, lift = 0, scaleBy = 1): void {
  const a = l.spine[0]!;
  const b = l.spine[Math.min(l.spine.length - 1, 3)]!;
  const forward = Math.atan2(a.y - b.y, a.x - b.x);
  const right = Math.cos(forward) >= 0;
  const rotation = right ? forward - lift : forward + lift;
  drawSprite(ctx, head, boil, { x: a.x, y: a.y, scale: (l.widths[0]! / SNAKE_W) * scaleBy, rotation, flip: right ? 1 : -1 });
}

/** Points along a polyline at arc length `s` from its start (clamped). */
export function along(spine: readonly Pt[], s: number): Pt {
  let d = 0;
  for (let i = 1; i < spine.length; i++) {
    const a = spine[i - 1]!;
    const b = spine[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (d + len >= s) {
      const u = len > 0 ? (s - d) / len : 0;
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    }
    d += len;
  }
  return spine[spine.length - 1]!;
}

/** The forked tongue flicking out of the snout of a lay's head (`out` 0 in .. 1 out). */
export function drawTongue(ctx: CanvasRenderingContext2D, l: Lay, snout: number, lift: number, out: number): void {
  if (out <= 0) return;
  const a = l.spine[0]!;
  const b = l.spine[Math.min(l.spine.length - 1, 3)]!;
  const forward = Math.atan2(a.y - b.y, a.x - b.x);
  const right = Math.cos(forward) >= 0;
  const dir = right ? forward - lift : forward + lift;
  const k = l.widths[0]! / SNAKE_W;
  const from = { x: a.x + Math.cos(dir) * snout * k, y: a.y + Math.sin(dir) * snout * k + 0.6 * k };
  const len = 26 * k * out;
  const tip = { x: from.x + Math.cos(dir + (right ? 0.08 : -0.08)) * len, y: from.y + Math.sin(dir + (right ? 0.08 : -0.08)) * len };
  ctx.save();
  ctx.strokeStyle = '#2e2c33';
  ctx.lineWidth = Math.max(3, 1.1 * k);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(tip.x, tip.y);
  for (const s of [-0.45, 0.45]) {
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x + Math.cos(dir + s) * 8 * k * out, tip.y + Math.sin(dir + s) * 8 * k * out);
  }
  ctx.stroke();
  ctx.restore();
}
