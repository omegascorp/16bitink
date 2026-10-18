import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, type Pen, type Pt } from '../../../src/art/pen';
import { closed, bez, livePen, pt } from './ink';

/**
 * The puppy, sitting in a big air bubble so it can float in beside the
 * axolotl: a round head with floppy ears, big eyes and a black nose, tan fur
 * hatched in pen. Happy as it floats in; offended once it hears it's less cute
 * (brows down, eyes half shut and sliding sideways, a pout, chin up), and
 * still cute. Its own units: the bubble's radius is 62, its centre at 0, 0.
 */

const FUR = '#dca56c';
const FUR_LIGHT = '#f6e0bc';
const FUR_DARK = '#8f5b33';
const EAR = '#94603a';
export const BUBBLE_R = 62;

/** A furry outline: the shape's edge with little tufts every few points. */
const tufty = (pts: readonly Pt[], c: Pt, every: number, size: number): Pt[] =>
  pts.map((p, i) => {
    if (i % every) return p;
    const d = Math.hypot(p.x - c.x, p.y - c.y) || 1;
    return pt(p.x + ((p.x - c.x) / d) * size, p.y + ((p.y - c.y) / d) * size);
  });

function drawEar(pen: Pen, side: number, huff: number, lw: number): void {
  // Floppy, hanging beside the head; pinned back a little when it huffs.
  const root = pt(side * 19, -30);
  const tip = pt(side * (31 - 4 * huff), -2 - 6 * huff);
  const ear = [...bez(root, pt(side * 40, -32), tip, 10), ...bez(tip, pt(side * 22, -6), pt(side * 12, -26), 8)];
  pen.fill(ear, PAPER_FILL, 1);
  pen.fill(ear, EAR, 0.9);
  pen.hatch(ear, 2.4, 1.2, lw * 0.35, { color: '#4a2c18', alpha: 0.45 });
  pen.stroke(closed(ear), lw, INK, 1, false);
}

function drawEyes(pen: Pen, huff: number, lw: number): void {
  for (const side of [-1, 1]) {
    const e = pt(side * 10.5, -18);
    pen.fill(ellipse(e.x, e.y, 5, 5.6, 16), INK, 1);
    // Looking sideways (down-left, at the axolotl) as it huffs.
    pen.dot(e.x + 1.5 - 3 * huff, e.y - 2 + huff, 1.6, PAPER_FILL, 0.95);
    if (huff > 0.02) {
      const lid = [pt(e.x - 6.5, e.y - 7), pt(e.x + 6.5, e.y - 7), pt(e.x + 6.5, e.y - 7 + 6 * huff + side * 1.5 * huff), pt(e.x - 6.5, e.y - 7 + 6 * huff - side * 1.5 * huff)];
      pen.fill(lid, FUR, huff);
      pen.hair([lid[3]!, lid[2]!], lw * 0.7, INK, huff);
      // Brows down toward the middle.
      pen.stroke([pt(e.x + side * 7, e.y - 12 - 1.5 * huff), pt(e.x - side * 4, e.y - 9 + 3 * huff)], lw * 1.8, INK, huff, false);
    }
  }
}

function drawMuzzle(pen: Pen, huff: number, lw: number): void {
  const m = ellipse(0, -5, 13, 9.5, 24);
  pen.fill(m, FUR_LIGHT, 1);
  pen.hair(closed(m), lw * 0.45, FUR_DARK, 0.6);
  // The nose.
  pen.fill([pt(-4.5, -10), pt(4.5, -10), pt(3.5, -7.5), pt(0, -5.5), pt(-3.5, -7.5)], INK, 1);
  pen.dot(-1.5, -9, 0.9, PAPER_FILL, 0.8);
  if (huff < 0.5) {
    // A happy open mouth with a tongue.
    const open = 1 - huff * 2;
    pen.hair([pt(0, -5.5), pt(0, -2)], lw * 0.6, INK, 1);
    const mouth = [pt(-6, -2), pt(-2, 1 + 3 * open), pt(2, 1 + 3 * open), pt(6, -2)];
    pen.fill(mouth, '#7e2b33', open);
    pen.fill(ellipse(0, 1 + 2.4 * open, 2.6, 2.2 * open + 0.2, 10), '#ef7d8f', open);
    pen.stroke([pt(-7, -3), pt(-3.5, -1.5), pt(0, -2), pt(3.5, -1.5), pt(7, -3)], lw * 0.6, INK, 1, false);
  } else {
    // A small pout.
    const p = (huff - 0.5) * 2;
    pen.hair([pt(0, -5.5), pt(0, -3)], lw * 0.6, INK, 1);
    pen.stroke([pt(-4, 0.5), pt(-1.5, -1.5 - p), pt(1.5, -1.5 - p), pt(4, 0.5)], lw * 0.7, INK, 1, false);
    pen.fill(ellipse(-13, -6, 4, 2.5, 10), '#f08a9a', 0.5 * p);
    pen.fill(ellipse(13, -6, 4, 2.5, 10), '#f08a9a', 0.5 * p);
  }
}

/** The bubble round the puppy: a faint fill, a bright rim, a curved highlight and a glint. */
function drawBubble(pen: Pen, lw: number, front: boolean): void {
  const rim = ellipse(0, 0, BUBBLE_R, BUBBLE_R, 60);
  if (!front) {
    pen.fill(rim, '#dff6ff', 0.14);
    return;
  }
  pen.stroke(closed(rim), lw * 0.9, '#eafaff', 0.85, false);
  pen.hair(Array.from({ length: 14 }, (_, i) => pt(Math.cos(3.4 + i * 0.07) * 54, Math.sin(3.4 + i * 0.07) * 54)), lw * 1.4, '#ffffff', 0.7);
  pen.fill(ellipse(-30, -38, 5, 3.5, 12), '#ffffff', 0.85);
}

export function drawPuppy(ctx: CanvasRenderingContext2D, huff: number, px: number, boil: number): void {
  const lw = 2.6 / px;
  const pen = livePen(ctx, boil, 9, 0.3);
  drawBubble(pen, lw, false);
  ctx.save();
  // Chin up as it huffs.
  ctx.rotate(-0.12 * huff);
  // The body, sitting, and the little front paws.
  const body = tufty(ellipse(0, 24, 21, 22, 30), pt(0, 24), 3, 1.6);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, FUR, 0.92);
  pen.fill(ellipse(0, 28, 10, 13, 20), FUR_LIGHT, 0.85);
  pen.hatch(body, 2.6, -0.9, lw * 0.35, { color: FUR_DARK, alpha: 0.4, onlyBelow: 30 });
  pen.stroke(closed(body), lw, INK, 1, false);
  for (const side of [-1, 1]) {
    const paw = ellipse(side * 8, 44, 6.5, 4.5, 14);
    pen.fill(paw, FUR_LIGHT, 1);
    pen.stroke(closed(paw), lw * 0.8, INK, 1, false);
    pen.hair([pt(side * 8 - 1.5, 42.5), pt(side * 8 - 1.5, 45.5)], lw * 0.4, INK, 0.7);
    pen.hair([pt(side * 8 + 1.5, 42.5), pt(side * 8 + 1.5, 45.5)], lw * 0.4, INK, 0.7);
  }
  // The head, ears hanging either side.
  for (const side of [-1, 1]) drawEar(pen, side, huff, lw);
  const head = tufty(ellipse(0, -14, 25, 22, 40), pt(0, -14), 4, 1.8);
  pen.fill(head, PAPER_FILL, 1);
  pen.fill(head, FUR, 0.95);
  pen.fill(ellipse(-3, -27, 10, 5, 16), FUR_LIGHT, 0.35);
  pen.hatch(head, 2.6, -0.8, lw * 0.32, { color: FUR_DARK, alpha: 0.35, onlyBelow: -4 });
  pen.stroke(closed(head), lw, INK, 1);
  drawEyes(pen, huff, lw);
  drawMuzzle(pen, huff, lw);
  ctx.restore();
  drawBubble(pen, lw, true);
}

/** Its "hmph": a puff of air from its nose and a little cross mark by its head, `a` 0 .. 1. */
export function drawHmph(ctx: CanvasRenderingContext2D, a: number, px: number, boil: number): void {
  if (a <= 0.01) return;
  const lw = 2.6 / px;
  const pen = livePen(ctx, boil, 13, 0.3);
  ctx.save();
  ctx.globalAlpha = a;
  for (const [x, y, r] of [[30, -2, 5], [37, -7, 4], [42, -1, 3.5]] as const) {
    const puff = ellipse(x, y, r, r * 0.8, 12);
    pen.fill(puff, '#f4fbff', 0.9);
    pen.stroke(closed(puff), lw * 0.6, INK, 0.8, false);
  }
  // The cross mark, four little curved strokes.
  const c = pt(26, -38);
  for (let i = 0; i < 4; i++) {
    const a0 = (i * Math.PI) / 2 + Math.PI / 4;
    const p0 = pt(c.x + Math.cos(a0) * 2.5, c.y + Math.sin(a0) * 2.5);
    const p1 = pt(c.x + Math.cos(a0) * 10, c.y + Math.sin(a0) * 10);
    pen.stroke(bez(p0, pt((p0.x + p1.x) / 2 + Math.cos(a0 + 1) * 2, (p0.y + p1.y) / 2 + Math.sin(a0 + 1) * 2), p1, 5), lw * 1.8, '#d63a3a', 1, false);
  }
  ctx.restore();
}
