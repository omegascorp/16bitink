import { MAP, type MapLayout } from '../../scenes/map/layout';
import { closed, makeDraw, oval, pt, TAU } from '../kit';
import { PAPER_FILL, RED } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { Brush, polar } from './brush';
import { PENCIL, type Span, touches } from './common';

/**
 * The ends of the scroll, calm paper margins: at the foot, the title
 * cartouche ("InkSnake · field notes") on a ribbon with curled ends, a
 * compass rose and a scale bar, inked and washed; at the head, beyond the
 * last chapter, a small pencilled compass and a note that the way goes on.
 */
const HAND = '"Caveat", "Patrick Hand", "Comic Sans MS", cursive';
const RIBBON = '#e9dcb8';
const RIBBON_DEEP = '#b89a66';

/** A compass rose: an eight-point star, the north point red, a ring with ticks, N lettered. */
function compass(b: Brush, c: Pt, r: number): void {
  const { pen } = b;
  const { ctx } = pen;
  const ring = oval(c.x, c.y, r * 0.78, r * 0.78, 48);
  b.line(closed(ring), 0.8, 0.7);
  b.line(closed(oval(c.x, c.y, r * 0.7, r * 0.7, 48)), 0.5, 0.5);
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * TAU;
    b.line([polar(c, a, r * 0.7), polar(c, a, r * (k % 4 === 0 ? 0.62 : 0.66))], 0.5, 0.6);
  }
  for (let k = 0; k < 8; k++) {
    const a = -Math.PI / 2 + (k / 8) * TAU;
    const long = k % 2 === 0;
    const tip = polar(c, a, r * (long ? 1 : 0.55));
    const w = r * (long ? 0.13 : 0.09);
    for (const s of [-1, 1]) {
      const half = [c, tip, polar(c, a + s * (Math.PI / 4), w)];
      const lit = s < 0;
      if (!b.draft) pen.fill(half, k === 0 ? (lit ? mix(RED, PAPER_FILL, 0.35) : RED) : lit ? PAPER_FILL : mix('#8a8270', b.d.ink, 0.25), k === 0 ? 0.9 : 0.85);
      else if (!lit) b.hatch(half, 2.2, 0.9, 0.4);
      b.line(closed(half), 0.6, 0.85);
    }
  }
  b.dot(c.x, c.y, 2.2, b.ink, 0.9);
  ctx.save();
  ctx.fillStyle = b.ink;
  ctx.globalAlpha = 0.85;
  ctx.font = `700 ${Math.round(r * 0.42)}px ${HAND}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', c.x, c.y - r * 1.2);
  ctx.restore();
}

/** A scale bar of alternating blocks, as on a survey map. */
function scaleBar(b: Brush, x: number, y: number, w: number): void {
  const n = 4;
  for (let k = 0; k < n; k++) {
    const blk = [pt(x + (k * w) / n, y), pt(x + ((k + 1) * w) / n, y), pt(x + ((k + 1) * w) / n, y + 6), pt(x + (k * w) / n, y + 6)];
    if (k % 2 === 0) b.body(blk, b.d.ink, 0.75);
    b.line(closed(blk), 0.6, 0.8);
  }
  const { ctx } = b.pen;
  ctx.save();
  ctx.fillStyle = b.ink;
  ctx.globalAlpha = 0.75;
  ctx.font = `500 16px ${HAND}`;
  ctx.textAlign = 'center';
  ctx.fillText('0', x, y + 22);
  ctx.fillText('100 yards', x + w, y + 22);
  ctx.restore();
}

/** The title on a ribbon cartouche: a banner with curled, folded-back ends, lettered in ink. */
function cartouche(b: Brush, c: Pt): void {
  const { ctx } = b.pen;
  const w = 300;
  const h = 58;
  const bow = 8;
  const top = Array.from({ length: 21 }, (_, i) => pt(c.x - w / 2 + (w * i) / 20, c.y - h / 2 + bow * Math.sin((Math.PI * i) / 20) * -1 + bow));
  const bot = [...top].reverse().map((p) => pt(p.x, p.y + h));
  const face = [...top, ...bot];
  // The tails, behind the banner: folded back, notched.
  for (const s of [-1, 1]) {
    const x0 = c.x + s * (w / 2 - 8);
    const tail = [pt(x0, c.y - h / 2 + 18), pt(x0 + s * 62, c.y - h / 2 + 22), pt(x0 + s * 46, c.y + 12), pt(x0 + s * 64, c.y + h / 2 + 18), pt(x0, c.y + h / 2 + 14)];
    b.cast(tail, 6, 0.1);
    b.body(tail, mix(RIBBON, RIBBON_DEEP, 0.5), 0.8);
    b.hatch(tail, 3, 0.9, 0.25);
    b.edge(tail, 1, 0.85);
    const fold = [pt(x0, c.y + h / 2 + 14), pt(x0 + s * 14, c.y + h / 2 + 4), pt(x0, c.y + h / 2 - 6)];
    b.body(fold, RIBBON_DEEP, 0.8);
    b.line(closed(fold), 0.7, 0.85);
  }
  b.cast(face, 8, 0.12);
  b.body(face, RIBBON, 0.85);
  b.shade(face, 6, RIBBON_DEEP, 0.35);
  b.line(top.map((p) => pt(p.x, p.y + 5)), 0.45, 0.4);
  b.line(bot.map((p) => pt(p.x, p.y - 5)), 0.45, 0.4);
  b.edge(face, 1.3, 0.9);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = b.draft ? PENCIL : '#27408b';
  ctx.font = `700 34px ${HAND}`;
  ctx.fillText('InkSnake · field notes', c.x, c.y + bow - 2);
  ctx.restore();
}

/** A flourish under the title: a snake-like S of ink with a dot at each end. */
function flourish(b: Brush, c: Pt, w: number): void {
  const pts = Array.from({ length: 30 }, (_, i) => pt(c.x - w / 2 + (w * i) / 29, c.y + Math.sin((i / 29) * TAU * 1.5) * 5));
  b.stroke(pts, 1.1, 0.7);
  b.dot(pts[0]!.x - 4, pts[0]!.y, 1.6, b.ink, 0.8);
  b.dot(pts[29]!.x + 4, pts[29]!.y, 1.6, b.ink, 0.8);
}

/** Paints whichever end of the map the span reaches. */
export function paintEnds(ctx: CanvasRenderingContext2D, layout: MapLayout, span: Span): void {
  const foot = layout.height - 120;
  if (touches(span, foot, 140)) {
    const b = new Brush(makeDraw(ctx, 4301, 0, 0), false);
    cartouche(b, pt(MAP.mid - 300, foot));
    flourish(b, pt(MAP.mid - 300, foot + 62), 160);
    compass(b, pt(MAP.mid + 300, foot + 6), 54);
    scaleBar(b, MAP.mid + 390, foot + 40, 120);
  }
  const head = 120;
  if (touches(span, head, 140)) {
    const b = new Brush(makeDraw(ctx, 4401, 0, 0), true);
    compass(b, pt(MAP.mid + 300, head), 40);
    ctx.save();
    ctx.fillStyle = PENCIL;
    ctx.globalAlpha = 0.8;
    ctx.font = `500 22px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.fillText('…and on, upriver', MAP.mid - 280, head + 6);
    ctx.restore();
    flourish(b, pt(MAP.mid - 280, head + 30), 120);
  }
}
