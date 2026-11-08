import { bezier, closed, type Draw, makeDraw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { type Pt, withScratch } from '../pen';
import { rgba } from '../wash';

/**
 * Small painting helpers for the Old Tomcat, after InkGecko's boss kit:
 * rotated ellipses, soft wet-in-wet glazes, mirrored outlines, a scratch
 * layer for soft shadows, and the dizzy stars of a stunned cat.
 */

/** A rotated ellipse. */
export function ellipseAt(cx: number, cy: number, rx: number, ry: number, rot: number, n = 18): Pt[] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return pt(cx + x * c - y * s, cy + x * s + y * c);
  });
}

/** A soft-edged glaze: `color` at `alpha` in the middle of an ellipse, fading out to nothing at its edge (wet-in-wet). */
export function glaze(d: Draw, cx: number, cy: number, rx: number, ry: number, rot: number, color: string, alpha: number): void {
  const { ctx } = d.pen;
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

const flipY = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(p.x, -p.y));
/** A closed outline from its lower half (traced from the back of the midline to the front of it). */
export const bilateralY = (half: readonly Pt[]): Pt[] => [...half, ...flipY(half).reverse().slice(1, -1)];

/**
 * Paints on a clear layer of the canvas's size, then lays it over the
 * canvas, faded and softened: the cat's shadow is one soft shape, however
 * many parts make it.
 */
export function onLayer(d: Draw, paint: (layer: Draw) => void, alpha = 1, blur = 0): void {
  const { ctx } = d.pen;
  const seed = Math.floor(d.pen.rng() * 1e9);
  const res = Math.hypot(ctx.getTransform().a, ctx.getTransform().b);
  withScratch(ctx.canvas.width, ctx.canvas.height, (lctx, canvas) => {
    lctx.setTransform(ctx.getTransform());
    paint(makeDraw(lctx, seed, d.f, d.g, d.ink));
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    if (blur > 0) ctx.filter = `blur(${blur * res}px)`;
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  });
}

/**
 * Dizzy marks round a stunned head, seen from above: little four-pointed
 * stars and a couple of swirls on a tilted orbit, in ink. The orbit turns
 * a little with each boil frame.
 */
export function dizzy(d: Draw, c: Pt, rx: number, ry: number): void {
  const { pen } = d;
  const turn = d.f * 0.35;
  const at = (a: number): Pt => pt(c.x + Math.cos(a) * rx, c.y + Math.sin(a) * ry);
  for (let i = 0; i < 3; i++) {
    const a0 = turn + (i / 3) * TAU + 0.35;
    pen.hair(Array.from({ length: 9 }, (_, k) => at(a0 + (k / 8) * (TAU / 3 - 0.9))), 0.8, d.ink, 0.75);
  }
  for (let i = 0; i < 3; i++) {
    const p = at(turn + (i / 3) * TAU);
    const r = i === 0 ? 5.6 : 4.6;
    const star = Array.from({ length: 8 }, (_, k) => {
      const a = (k / 8) * TAU + 0.2;
      const rr = k % 2 === 0 ? r : r * 0.36;
      return pt(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
    });
    pen.fill(star, PAPER_FILL, 0.95);
    pen.stroke(closed(star), 0.85, d.ink, 1, false);
    pen.dot(p.x, p.y, r * 0.16, d.ink, 0.8);
  }
  for (let i = 0; i < 2; i++) {
    const p = at(turn + (i + 0.5) * (TAU / 3) + 0.2);
    const sw = Array.from({ length: 14 }, (_, k) => {
      const a = (k / 13) * TAU * 1.4 + i;
      const r = 0.4 + (k / 13) * 3.2;
      return pt(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
    });
    pen.hair(sw, 0.8, d.ink, 0.95);
  }
  pen.hair(bezier(at(turn - 0.5), at(turn - 0.25), at(turn - 0.05), 4), 0.4, d.ink, 0.4);
}
