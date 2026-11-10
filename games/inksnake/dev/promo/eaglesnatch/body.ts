import { INK } from '../../../src/art/palette';
import { SNAKE_W } from '../../../src/art/types';
import { drawSprite, type Sprite, type Strip } from '../sprites';
import { TOE, TOE_LIT } from './art';
import { type Carried, type Foot, shadowAlt } from './carry';
import { KS, W, type Pt } from './story';

/** The carried snake's body, its shadow on the rock, and the eagle's legs and feet on it. */

const EDGE_INSET = 0.3 / SNAKE_W;
/** The ground shadow's offset in body widths and strength (sprites.ts drawBodyShadow's). */
const SHADOW = { x: 0.23, y: 0.33, alpha: 0.22 } as const;
const SHADOW_DIR: Pt = { x: -0.2, y: 0.3 };

function edges(spine: readonly Pt[], widths: readonly number[], inset = 0): { left: Pt[]; right: Pt[] } {
  const n = spine.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = spine[Math.max(0, i - 1)]!;
    const c = spine[Math.min(n - 1, i + 1)]!;
    const len = Math.hypot(a.x - c.x, a.y - c.y) || 1;
    const [nx, ny] = [-(a.y - c.y) / len, (a.x - c.x) / len];
    const half = (widths[i]! / 2) * (1 - 2 * inset);
    const p = spine[i]!;
    left.push({ x: p.x + nx * half, y: p.y + ny * half });
    right.push({ x: p.x - nx * half, y: p.y - ny * half });
  }
  return { left, right };
}

function outline(ctx: CanvasRenderingContext2D, left: readonly Pt[], right: readonly Pt[]): void {
  ctx.beginPath();
  [...left, ...[...right].reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

/**
 * sprites.ts drawBody, but the pattern is laid by the body's own length
 * (`arc`, px on the rock) rather than by the length on screen, so it stays on
 * its scales while the body hangs foreshortened. On the rock the two agree.
 */
export function drawCarriedBody(ctx: CanvasRenderingContext2D, strip: Strip, boil: number, c: Carried): void {
  const { spine, widths, arc } = c;
  const n = spine.length;
  const tex = strip.frames[((boil % strip.frames.length) + strip.frames.length) % strip.frames.length]!;
  const res = strip.res;
  ctx.save();
  const { left, right } = edges(spine, widths, EDGE_INSET);
  outline(ctx, left, right);
  ctx.clip();
  const base = ctx.getTransform();
  for (let i = 0; i + 1 < n; i++) {
    const [a, b] = [spine[i]!, spine[i + 1]!];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const du = (arc[i + 1]! - arc[i]!) / KS;
    if (len < 1e-6 || du <= 0) continue;
    const along = len / du;
    const [bx, by] = [(b.x - a.x) / len, (b.y - a.y) / len];
    const across = (widths[i]! + widths[i + 1]!) / 2 / SNAKE_W;
    const u0 = (((arc[i]! / KS) % strip.period) + strip.period) % strip.period;
    const over = 0.9 / along;
    ctx.setTransform(base);
    ctx.transform(bx * along, by * along, by * across, -bx * across, a.x, a.y);
    ctx.drawImage(tex, u0 * res, 0, (du + over) * res, SNAKE_W * res, 0, -SNAKE_W / 2, du + over, SNAKE_W);
  }
  ctx.restore();
}

/** Its shadow on the rock: under it while it lies there, sliding off and fading, softer, as it is lifted (less than the eagle's: it hangs lower). */
export function drawCarriedShadow(ctx: CanvasRenderingContext2D, c: Carried): void {
  const alts = c.heights.map(shadowAlt);
  const at = c.spine.map((p, i) => ({ x: p.x + SHADOW.x * W + SHADOW_DIR.x * alts[i]!, y: p.y + SHADOW.y * W + SHADOW_DIR.y * alts[i]! }));
  const widths = c.widths.map((w, i) => w / (1 + alts[i]! / 1000));
  const mean = alts.reduce((s, a) => s + a, 0) / alts.length;
  const { left, right } = edges(at, widths);
  ctx.save();
  ctx.globalAlpha *= SHADOW.alpha * (1 - 0.3 * Math.min(1, mean / 300));
  if (mean > 4) ctx.filter = `blur(${Math.min(7, mean / 30).toFixed(1)}px)`;
  ctx.fillStyle = INK;
  outline(ctx, left, right);
  ctx.fill();
  ctx.restore();
}

/** A leg: the bare, scaly, pale-grey tarsus from the feathered thigh under the body down onto the foot. */
function drawLeg(ctx: CanvasRenderingContext2D, f: Foot): void {
  const [dx, dy] = [f.hip.x - f.at.x, f.hip.y - f.at.y];
  const k = f.scale;
  // It runs on in under the body (which covers its top end), so it never ends in the open.
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  ctx.save();
  ctx.translate(f.at.x, f.at.y);
  ctx.rotate(Math.atan2(dy, dx));
  const half = 1.25 * k;
  // The bare tarsus, coming down from under the body onto the foot (its top end is under the body).
  ctx.fillStyle = TOE;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.7 * k;
  ctx.beginPath();
  ctx.roundRect(-half * 0.7, -half, len + half * 0.7, half * 2, half);
  ctx.fill();
  ctx.stroke();
  // Its scales: rows of small plates across it, and the lit top edge.
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 0.28 * k;
  for (let x = half * 0.6; x < len; x += 1.1 * k) {
    ctx.beginPath();
    ctx.moveTo(x, -half * 0.85);
    ctx.quadraticCurveTo(x - 0.45 * k, 0, x, half * 0.85);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = TOE_LIT;
  ctx.lineWidth = 0.45 * k;
  ctx.beginPath();
  ctx.moveTo(0, -half * 0.5);
  ctx.lineTo(len, -half * 0.5);
  ctx.stroke();
  ctx.restore();
}

/** The feet on the snake's neck, the toes wrapped across it (three forward over the far flank, the hind toe on the near one, the bird's side), the legs coming down onto them. Drawn over the snake, under the eagle. */
export function drawFeet(ctx: CanvasRenderingContext2D, grip: Sprite, boil: number, c: Carried, heading: number): void {
  if (!c.feet) return;
  const { a, b } = c.feet;
  const axis = Math.atan2(a.at.y - b.at.y, a.at.x - b.at.x);
  for (const f of [a, b]) {
    // The three forward toes over the far flank (away from the bird's body), the hind toe on the near one.
    const flip = Math.cos(axis + Math.PI / 2 - heading) >= 0 ? -1 : 1;
    drawSprite(ctx, grip, boil, { x: f.at.x, y: f.at.y, rotation: axis, scale: f.scale, flip });
  }
  for (const f of [b, a]) drawLeg(ctx, f);
}
