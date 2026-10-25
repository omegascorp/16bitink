import { closed, cub, type Draw, oval, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { JawSpec } from '../snakes/cornJaws';
import { glaze } from '../snakes/cornPaint';
import type { SpriteArt } from '../types';
import { VIPER_PAINT } from './mountainsSnakePaint';

/**
 * The viper's lower jaw when it gapes, seen from above: the two halves
 * swung out very wide (a viper's gape is huge), pale grey lip scales along
 * them, the pink floor of the mouth between with the tongue's sheath and
 * the windpipe's opening, and the chin's skin stretched between the tips;
 * the two long fangs swung forward from under the snout; and its tongue.
 */
export const VIPER_JAW: Record<'open' | 'strike', JawSpec> = {
  open: { spine: [pt(-8, 15), pt(3, 22.6), pt(19, 23.2), pt(30, 14.4)], w0: 4.4, w1: 1.9 },
  strike: { spine: [pt(-5.5, 14.6), pt(6, 18.6), pt(18, 18), pt(28, 10)], w0: 4.2, w1: 1.8 },
};

const V = VIPER_PAINT;
const flip = (pts: readonly Pt[], s: number): Pt[] => pts.map((p) => pt(p.x, p.y * s));

interface Half {
  shape: Pt[];
  inner: Pt[];
  outer: Pt[];
  spine: Pt[];
}

/** One jaw half on side s (1: y > 0). */
function half(j: JawSpec, s: 1 | -1): Half {
  const [a, b, c, e] = j.spine;
  const spine = flip(cub(a, b, c, e, 22), s);
  const r = ribbon(spine, (u) => j.w0 + (j.w1 - j.w0) * u);
  const inner = s > 0 ? r.top : r.bot;
  const outer = s > 0 ? r.bot : r.top;
  const tip = spine[spine.length - 1]!;
  const prev = spine[spine.length - 2]!;
  const l = Math.hypot(tip.x - prev.x, tip.y - prev.y) || 1;
  const point = pt(tip.x + ((tip.x - prev.x) / l) * j.w1 * 0.7, tip.y + ((tip.y - prev.y) / l) * j.w1 * 0.7);
  return { shape: [...outer, point, ...[...inner].reverse()], inner, outer, spine };
}

function fillPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[], style: string | CanvasGradient): void {
  ctx.save();
  ctx.fillStyle = style;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The inside of the mouth: dark throat under the head, pale pink towards the front, the sheath and glottis down the middle, the chin's skin. */
function mouth(d: Draw, up: Half, down: Half, head: readonly Pt[], front: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const tipU = up.inner[up.inner.length - 1]!;
  const tipD = down.inner[down.inner.length - 1]!;
  const chin = cub(tipU, pt(tipU.x - 3.4, tipU.y * 0.4), pt(tipD.x - 3.4, tipD.y * 0.4), tipD, 12);
  const floor = [...up.inner, ...chin.slice(1, -1), ...[...down.inner].reverse()];
  const back = cub(pt(tipU.x - 4, tipU.y - 0.8), pt(tipU.x - 7.6, tipU.y * 0.3), pt(tipD.x - 7.6, tipD.y * 0.3), pt(tipD.x - 4, tipD.y + 0.8), 12);
  const web = [...chin, ...[...back].reverse()];
  const g = ctx.createLinearGradient(2, 0, front, 0);
  g.addColorStop(0, V.throat);
  g.addColorStop(0.28, V.mouthDeep);
  g.addColorStop(0.68, V.mouth);
  g.addColorStop(1, '#f5dcd5');
  pen.fill(floor, PAPER_FILL, 1);
  fillPath(ctx, floor, g);
  pen.clipped(floor, () => {
    glaze(ctx, front - 10, 5, 10, 5, 0, V.mouthDeep, 0.32);
    glaze(ctx, front - 11, -4.5, 7, 2.4, -0.1, PAPER_FILL, 0.4);
    for (const y of [-6, -3.2, 3.2, 6]) pen.hair(cub(pt(front - 3, y * 0.7), pt(front - 8, y), pt(front - 14, y * 1.1), pt(front - 20, y * 0.9), 8), 0.26, V.mouthDeep, 0.45);
    const sheath = ribbon(cub(pt(front - 20, 0.4), pt(front - 16, 0.2), pt(front - 13, 0), pt(front - 9.5, 0), 10), (u) => 2.6 - 0.6 * u).shape;
    pen.fill(sheath, '#c98088', 0.85);
    pen.hair(closed(sheath), 0.3, V.throat, 0.55);
    const glottis = oval(front - 7.6, 0, 1.6, 1.15, 14);
    pen.fill(glottis, '#d98c92', 0.95);
    pen.hair(closed(glottis), 0.32, V.throat, 0.7);
    pen.hair([pt(front - 8.6, 0), pt(front - 6.6, 0)], 0.42, V.throat, 0.9);
    pen.fill(head.map((p) => pt(p.x + 1.6, p.y + 2.2)), V.throat, 0.35);
  });
  pen.fill(web, V.lip, 0.95);
  pen.clipped(web, () => pen.fill(web.map((p) => pt(p.x - 1.4, p.y)), V.mouthDeep, 0.22));
  pen.hair(closed(web), 0.35, d.ink, 0.5);
}

/** One jaw half: pale lip scales, the grey of its side along the outer edge, sutures, a contour. */
function jawHalf(d: Draw, h: Half, s: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(h.shape, PAPER_FILL, 1);
  pen.fill(h.shape, V.lip, 0.92);
  pen.clipped(h.shape, () => {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = V.ground;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 4;
    ctx.beginPath();
    h.outer.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    if (s > 0) pen.fill(h.shape.map((p) => pt(p.x - 0.6, p.y - 1)), V.shadow, 0.22);
    for (let i = 3; i < h.spine.length - 1; i += 2) {
      pen.hair([h.inner[i]!, h.outer[i]!], 0.3, V.shadow, 0.55);
      if (i % 4 === 1) glaze(ctx, h.spine[i + 1]!.x, h.spine[i + 1]!.y, 1.2, 1, 0, V.bar, 0.4);
    }
    const gl = h.spine[Math.floor(h.spine.length * 0.45)]!;
    glaze(ctx, gl.x, gl.y - 0.6, 5, 1, 0, PAPER_FILL, 0.45);
  });
  pen.stroke(closed(h.shape), s > 0 ? 1.35 : 1.05, d.ink, 0.95);
}

/** The gaping lower jaw and mouth, painted under the head; `head` is the head's outline (for its cast shadow). */
export function viperJaws(d: Draw, j: JawSpec, head: readonly Pt[]): void {
  const up = half(j, -1);
  const down = half(j, 1);
  mouth(d, up, down, head, j.spine[3].x - 2);
  jawHalf(d, up, -1);
  jawHalf(d, down, 1);
}

/** A fang swung forward from under the snout at (x, y), `len` long: ivory, curved, its point turned in, a fine shadow down its far side. */
export function fang(d: Draw, x: number, y: number, len: number): void {
  const s = Math.sign(y) || 1;
  const spine = cub(pt(x - 1, y), pt(x + len * 0.4, y + s * 0.2), pt(x + len * 0.8, y - s * 0.3), pt(x + len, y - s * 1.1), 10);
  const shape = ribbon(spine, (u) => 1.3 * (1 - u) + 0.15).shape;
  d.pen.fill(shape.map((p) => pt(p.x + 0.5, p.y + 0.7)), d.ink, 0.25);
  d.pen.fill(shape, V.fang, 1);
  d.pen.clipped(shape, () => d.pen.fill(shape.map((p) => pt(p.x, p.y + 0.5)), V.cool, 0.4));
  d.pen.hair(closed(shape), 0.32, d.ink, 0.85);
}

/** The forked tongue: a slate-black stem flicking out from the snout, splitting into two fine tines. */
function drawTongue(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const stem = cub(pt(-1, 0), pt(4, -0.7), pt(8, 0.8), pt(11.2, 0.2), 12);
  const shape = ribbon(stem, (u) => 1.3 - 0.45 * u).shape;
  const tine = (s: 1 | -1): Pt[] => ribbon(cub(pt(10.8, 0.2), pt(13, 0.3 + s * 0.4), pt(15, s * 1.8), pt(17, s * 3), 8), (u) => 0.85 - 0.65 * u).shape;
  const fork = ctx.createLinearGradient(9, 0, 17, 0);
  fork.addColorStop(0, V.tongue);
  fork.addColorStop(1, V.tongueTip);
  for (const s of [1, -1] as const) {
    const t = tine(s);
    fillPath(ctx, t, fork);
    pen.hair(closed(t), 0.22, d.ink, 0.5);
  }
  pen.fill(shape, V.tongue, 1);
  pen.clipped(shape, () => {
    pen.fill(shape.map((p) => pt(p.x, p.y + 0.55)), V.tongueTip, 0.5);
    pen.hair(stem.map((p) => pt(p.x, p.y - 0.35)), 0.3, '#a4a0aa', 0.6);
  });
  pen.hair(closed(shape), 0.25, d.ink, 0.55);
}

export const SPIDER_TONGUE: SpriteArt<'flick'> = {
  frame: 40,
  res: 4,
  poses: ['flick'],
  draw: drawTongue,
};
