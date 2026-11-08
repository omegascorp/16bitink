import { closed, cub, type Draw, normals, oval, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { flankHatch, glaze } from '../snakes/cornPaint';
import { SNAKE_W, type SpriteArt } from '../types';
import { hogModel, speckle } from './barrensSnakePaint';
import { ADDER_JAW, adderJaws, fangs } from './heathSnakeJaws';
import { ADDER_PAINT, adderCrossWash, adderScales, dense, type Warp, zigEdges } from './heathSnakePaint';
import { adderMarks, adderPlates } from './heathSnakeCrown';

/**
 * The adder's head from above, facing +x, the frame centred between the
 * eyes: a broad, flat, rounded-triangular head set off a little from the
 * neck, the blunt snout, the big supraocular plates jutting over the eyes
 * (the adder's frown), the frontal and parietal plates between, small
 * scales elsewhere. The dark V on the crown, its point forward, a dark
 * stripe from each eye back along the side of the neck, the white upper
 * lip barred black, and the zigzag starting on the nape. Copper-red eyes
 * with a vertical slit. The neck is the back strip's cross-section and
 * fades out at the back, where the strip under it takes over.
 */
type HeadPose = 'shut' | 'open' | 'strike';

const FRAME = 72;
const HALF_W = SNAKE_W / 2;
const NECK = HALF_W - 1.2;
/** The snout tip, shut. */
const TIP = 20.8;
/** Where the tongue comes out: the notch in the rostral. */
export const ADDER_SNOUT = 20.2;
const FADE_FROM = -22;
const FADE_TO = -35;
const A = ADDER_PAINT;

interface Gape {
  readonly k: number;
  readonly push: number;
  readonly spread: number;
}
const GAPE: Record<HeadPose, Gape> = {
  shut: { k: 1, push: 0, spread: 0 },
  open: { k: 0.74, push: 0, spread: 1 },
  strike: { k: 0.86, push: 3.2, spread: 0.55 },
};

const ease = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};


/** The pose's warp of the shut head: the snout shortened as it tips up to gape, the jaw corners pushed out, the head lunging on a stretched neck. */
function warpOf(g: Gape): Warp {
  return (p) => {
    let x = p.x > 2 ? 2 + (p.x - 2) * g.k : p.x;
    x += g.push * ease((p.x + 30) / 22);
    const jaw = 1 + g.spread * 0.07 * Math.max(0, 1 - Math.abs(p.x + 6) / 9);
    return pt(x, p.y * jaw);
  };
}

const mirror = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(p.x, -p.y));
const bilateral = (upper: readonly Pt[]): Pt[] => [...upper, ...mirror(upper).reverse().slice(1)];

/** The head's upper outline, from the back of the neck to the snout's tip: swelling at the jaw angles, the brow jutting over the eye, a blunt snout. */
const UPPER: Pt[] = dense([
  pt(FADE_TO - 2, -NECK),
  pt(-15, -NECK),
  ...cub(pt(-15, -NECK), pt(-11.5, -NECK - 0.6), pt(-9, -14.6), pt(-4.5, -14.9), 8).slice(1),
  ...cub(pt(-4.5, -14.9), pt(0, -15.1), pt(4.5, -14.4), pt(8.4, -12.8), 8).slice(1),
  ...cub(pt(8.4, -12.8), pt(12, -11.2), pt(15.2, -9), pt(17.6, -6.6), 8).slice(1),
  ...cub(pt(17.6, -6.6), pt(19.5, -4.6), pt(20.6, -2.4), pt(TIP, 0), 8).slice(1),
]);

function outward(upper: readonly Pt[], by: number): Pt[] {
  const n = normals(upper);
  return upper.map((p, i) => (p.y === 0 ? pt(p.x + by, 0) : pt(p.x + n[i]!.x * by, p.y + n[i]!.y * by)));
}

function clipTo(ctx: CanvasRenderingContext2D, clip: readonly Pt[], paint: () => void): void {
  ctx.save();
  ctx.beginPath();
  clip.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  paint();
  ctx.restore();
}

/** The zigzag's start on the nape: the strip's band (mirrored, running back along −x), drawn to a point behind the head. */
function napeZig(): Pt[] {
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let s = 10.5; s <= 42; s += 0.4) {
    const e = zigEdges(s + 4);
    const t = ease((s - 10.5) / 4.5);
    const c = (e.top + e.bot) / 2;
    top.push(pt(-s, c + (e.top - c) * t - HALF_W));
    bot.push(pt(-s, c + (e.bot - c) * t - HALF_W));
  }
  return [...top, ...bot.reverse()];
}

/** The skin of head and neck: the back's washes, the crown a little deeper, the marks, the neck's keeled scales, light and shade. */
function skin(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { ctx } = d.pen;
  clipTo(ctx, body, () => {
    ctx.fillStyle = PAPER_FILL;
    ctx.fillRect(-40, -20, 80, 40);
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = adderCrossWash(ctx, -HALF_W);
    ctx.fillRect(-40, -20, 80, 40);
    ctx.globalAlpha = 1;
    const c = w(pt(2, 0));
    glaze(ctx, c.x, c.y, 13, 9, 0, A.grey, 0.22);
    const s = w(pt(16, 0));
    glaze(ctx, s.x, s.y - 0.8, 6, 4.6, 0, A.buff, 0.26);
    speckle(ctx, -40, 64, -HALF_W, 15500, 150, false, A.shadow);
    adderMarks(d, w, napeZig());
    // The neck's keeled scales, thinning out over the temples so no edge shows.
    clipTo(ctx, [pt(-40, -20), pt(-13, -20), pt(-13, 20), pt(-40, 20)], () => adderScales(ctx, -40, -13, -HALF_W, 2.56, 0.44));
    clipTo(ctx, [pt(-13, -20), pt(-9, -20), pt(-9, 20), pt(-13, 20)], () => adderScales(ctx, -13, -9, -HALF_W, 2.56, 0.24));
    clipTo(ctx, [pt(-9, -20), pt(-5, -20), pt(-5, 20), pt(-9, 20)], () => adderScales(ctx, -9, -5, -HALF_W, 2.56, 0.1));
    speckle(ctx, -40, 64, -HALF_W, 15600, 220, false);
    hogModel(ctx, -40, 30, -HALF_W, A.shadow, 0.26);
    flankHatch(ctx, -40, 28, 14, -HALF_W, 15700 + d.f * 100, d.ink, 0.38, false);
  });
  crown(d, w, body);
}

/** The crown's dome: shade on its far side, hatched; the plates in fine line; the nostrils; glints on brow and snout. */
function crown(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { pen } = d;
  const head = dense([pt(-13, -15), pt(24, -15), pt(24, 15), pt(-13, 15)], 2).map(w);
  clipTo(pen.ctx, body, () => {
    pen.crescent(head, pt(-3.2, -4.6), () => pen.fill(head, A.shadow, 0.1));
    pen.crescent(body, pt(-2.2, -3.4), () => pen.hatch(head, 1.5, 0.95, 0.32, { color: d.ink, alpha: 0.3 }));
    adderPlates(d, w);
    const brow = w(pt(6, -9.5));
    glaze(pen.ctx, brow.x, brow.y, 4, 1.4, -0.05, PAPER_FILL, 0.5);
    const snout = w(pt(15, -3));
    glaze(pen.ctx, snout.x, snout.y, 3, 1.3, -0.5, PAPER_FILL, 0.32);
  });
  for (const side of [1, -1]) {
    const n = w(pt(17.6, 5.6 * side));
    pen.dot(n.x, n.y, 0.75, d.ink, 0.85);
    pen.dot(n.x - 0.3, n.y - 0.35, 0.28, PAPER_FILL, 0.6);
  }
}

/** An eye set in the side of the head under the supraocular's ledge: copper-red iris, vertical slit pupil, the ledge's shadow, a glint. */
function eye(d: Draw, w: Warp, side: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = w(pt(5.4, 12.7 * side));
  const rx = 2.9;
  const ry = 2.2;
  const ball = oval(c.x, c.y, rx, ry, 22);
  pen.fill(ball.map((p) => pt(p.x + 0.5, p.y + 0.7)), d.ink, 0.35);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.7, c.y - 0.6, 0.2, c.x, c.y, rx * 1.05);
    g.addColorStop(0, A.irisLit);
    g.addColorStop(0.5, A.iris);
    g.addColorStop(1, '#3a1308');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - rx, c.y - ry, rx * 2, ry * 2);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      pen.hair([pt(c.x + Math.cos(a) * 0.9, c.y + Math.sin(a) * 0.7), pt(c.x + Math.cos(a) * rx * 0.9, c.y + Math.sin(a) * ry * 0.9)], 0.16, '#5a1c0a', 0.4);
    }
    pen.fill(oval(c.x + 0.1, c.y, 0.5, 1.9, 14), '#0c0605', 1);
    // The supraocular's ledge shades the upper, inner part of the eye.
    pen.fill(ball.map((p) => pt(p.x + 0.3, p.y - side * ry * 1.25)), A.shadow, 0.55);
  });
  pen.stroke(closed(ball), 0.75, d.ink, 0.95, false);
  pen.dot(c.x - 1, c.y - 0.75 * side - 0.1, 0.5, PAPER_FILL, 0.95);
  pen.dot(c.x + 1.1, c.y + 0.6, 0.25, PAPER_FILL, 0.5);
}

/** The back of the neck dissolved, so the strip under it shows through and the join never does. */
function fadeNeck(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(FADE_TO, 0, FADE_FROM, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-FRAME / 2, -FRAME / 2, FADE_FROM + FRAME / 2, FRAME);
  ctx.restore();
}

function drawHead(d: Draw, pose: HeadPose): void {
  const g = GAPE[pose];
  const w = warpOf(g);
  const upper = UPPER.map(w);
  const body = bilateral(outward(UPPER, 0.7).map(w));
  if (g.spread > 0) {
    adderJaws(d, ADDER_JAW[pose === 'open' ? 'open' : 'strike'], body);
    fangs(d, w(pt(15, 0)), pose === 'open' ? 9.5 : 8.5);
  }
  skin(d, w, body);
  for (const side of [-1, 1] as const) eye(d, w, side);
  // The supraocular ledge drawn firm over each eye.
  for (const side of [-1, 1] as const) d.pen.hair(dense(cub(pt(10, 11.2 * side), pt(7.5, 12.6 * side), pt(4, 12.8 * side), pt(1.6, 11.6 * side), 8)).map(w), 0.8, d.ink, 0.85);
  const tipAt = upper.length - 1;
  d.pen.stroke(upper.slice(0, tipAt).concat(mirror(upper.slice(tipAt - 6, tipAt)).reverse()), 1.15, d.ink, 0.95);
  d.pen.stroke(mirror(upper), 1.8, d.ink, 1);
  fadeNeck(d.pen.ctx);
}

export const ADDER_HEAD: SpriteArt<HeadPose> = {
  frame: FRAME,
  res: 4,
  poses: ['shut', 'open', 'strike'],
  draw: drawHead,
};

/** The forked tongue: a black stem with a red-brown sheen, flicking out of the rostral's notch, splitting into two fine tines. */
function drawTongue(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const stem = cub(pt(-1, 0), pt(4, -0.7), pt(8, 0.8), pt(11.2, 0.2), 12);
  const shape = ribbon(stem, (u) => 1.3 - 0.45 * u).shape;
  const tine = (s: 1 | -1): Pt[] => ribbon(cub(pt(10.8, 0.2), pt(13, 0.3 + s * 0.4), pt(15, s * 1.8), pt(17, s * 3), 8), (u) => 0.85 - 0.65 * u).shape;
  const fork = ctx.createLinearGradient(9, 0, 17, 0);
  fork.addColorStop(0, A.tongue);
  fork.addColorStop(1, A.tongueTip);
  for (const s of [1, -1] as const) {
    const t = tine(s);
    ctx.save();
    ctx.fillStyle = fork;
    ctx.beginPath();
    t.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    pen.hair(closed(t), 0.22, d.ink, 0.5);
  }
  pen.fill(shape, A.tongue, 1);
  pen.clipped(shape, () => {
    pen.fill(shape.map((p) => pt(p.x, p.y + 0.55)), A.tongueTip, 0.5);
    pen.hair(stem.map((p) => pt(p.x, p.y - 0.35)), 0.3, '#a07a80', 0.6);
  });
  pen.hair(closed(shape), 0.25, d.ink, 0.55);
}

export const ADDER_TONGUE: SpriteArt<'flick'> = {
  frame: 40,
  res: 4,
  poses: ['flick'],
  draw: drawTongue,
};
