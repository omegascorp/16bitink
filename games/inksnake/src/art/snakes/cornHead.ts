import { closed, cub, type Draw, normals, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { SNAKE_W, type SpriteArt } from '../types';
import { CORN_JAW, jaws } from './cornJaws';
import { CORN_PAINT, crossWash, flankHatch, glaze, grain, modelOver, paintBlotch, scaleRows } from './cornPaint';

/**
 * The corn snake's head from above, facing +x, the frame centred between
 * the eyes: a long rounded head a little wider than the neck at the jaws,
 * the big plates of its crown drawn in fine line, the spear-point on top
 * running back down the neck in two arms, the bar across the brow and the
 * stripe through each eye back to the jaw, round-pupilled eyes bulging
 * from the sides. The neck behind is the body strip's cross-section (same
 * washes, shading and contours at y = ±10.8) and fades out at the back,
 * where the strip under it takes over.
 */
type HeadPose = 'shut' | 'open' | 'strike';

const FRAME = 72;
const HALF_W = SNAKE_W / 2;
/** The neck's contours, as the strip's (y = 1.2 and SNAKE_W − 1.2). */
const NECK = HALF_W - 1.2;
/** The snout tip, shut. */
export const CORN_SNOUT = 20.2;
/** Where the neck starts fading into the strip under it, and where it has gone. */
const FADE_FROM = -22;
const FADE_TO = -35;

/** How a pose bends the shut head: the snout foreshortened as it tips up to gape, the head lunging. */
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

/** Points every ~`step` px along a polyline, so a warp bends it smoothly. */
function dense(pts: readonly Pt[], step = 0.8): Pt[] {
  const out: Pt[] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push(pt(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n));
  }
  return out;
}

export type Warp = (p: Pt) => Pt;

/** The pose's warp of the shut head: the snout end shortened, the jaw corners pushed out, the head moved forward on a stretched neck. */
function warpOf(g: Gape): Warp {
  return (p) => {
    let x = p.x > 2 ? 2 + (p.x - 2) * g.k : p.x;
    x += g.push * ease((p.x + 30) / 22);
    const jaw = 1 + g.spread * 0.06 * Math.max(0, 1 - Math.abs(p.x + 5) / 9);
    return pt(x, p.y * jaw);
  };
}

const mirror = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(p.x, -p.y));
/** A closed outline from its upper half traced back to front (the tip on the midline). */
const bilateral = (upper: readonly Pt[]): Pt[] => [...upper, ...mirror(upper).reverse().slice(1)];

/** The head's upper outline, from the back of the neck to the snout tip. */
const UPPER: Pt[] = dense([
  pt(FADE_TO - 2, -NECK),
  pt(-15, -NECK),
  ...cub(pt(-15, -NECK), pt(-10.5, -NECK - 0.1), pt(-9.5, -13.6), pt(-4.5, -13.8), 8).slice(1),
  ...cub(pt(-4.5, -13.8), pt(1, -14), pt(6.5, -12.9), pt(10.5, -10.6), 8).slice(1),
  ...cub(pt(10.5, -10.6), pt(14.2, -8.6), pt(17.2, -6.8), pt(18.9, -4.4), 8).slice(1),
  ...cub(pt(18.9, -4.4), pt(20, -2.9), pt(CORN_SNOUT, -1.4), pt(CORN_SNOUT, 0), 5).slice(1),
]);

/** The upper outline pushed out by `by` (to paper under the contour's width). */
function outward(upper: readonly Pt[], by: number): Pt[] {
  const n = normals(upper);
  return upper.map((p, i) => (p.y === 0 ? pt(p.x + by, 0) : pt(p.x + n[i]!.x * by, p.y + n[i]!.y * by)));
}

/** The markings, in shut-head coordinates (y < 0 half, mirrored for the other). */
function spear(): Pt[] {
  const outer = cub(pt(6.6, 0), pt(3.5, -2), pt(-3, -4.6), pt(-11, -6), 8);
  const arm = [pt(-18, -6.7), pt(-27, -7), pt(-40, -7)];
  const inner = [pt(-40, -2.4), pt(-27, -2.3), pt(-21, -2), ...cub(pt(-18.5, -1.7), pt(-16.6, -1.2), pt(-15.4, -0.5), pt(-15, 0), 4)];
  return dense(bilateral([...outer, ...arm, ...inner]), 1);
}

/** The bar across the brow, eye to eye, in front of the spear's point. */
function brow(): Pt[] {
  const spine = cub(pt(7.4, -12.2), pt(9.6, -7), pt(9.8, 7), pt(7.4, 12.2), 16);
  return ribbon(spine, (u) => 3.1 + 0.6 * Math.sin(Math.PI * u)).shape;
}

/** The stripe from behind the eye angling back to the corner of the jaw, on side s. */
function eyeStripe(s: 1 | -1): Pt[] {
  const spine = cub(pt(3.4, 11.2 * s), pt(-0.5, 12.6 * s), pt(-5, 13.6 * s), pt(-11, 13.2 * s), 12);
  return ribbon(spine, (u) => 3.2 - 1.3 * u).shape;
}

/** The plates of the crown, as hairlines (upper half; mirrored). */
const PLATES: readonly (readonly Pt[])[] = [
  // Rostral, internasals, prefrontals, the frontal shield and the parietals behind it.
  cub(pt(19.2, -2.8), pt(17.8, -2.2), pt(17.4, -0.8), pt(17.4, 0), 4),
  [pt(17.4, 0), pt(14.6, 0)],
  cub(pt(14.6, 0), pt(15.2, -2.2), pt(16, -3.8), pt(17.6, -5.6), 4),
  [pt(14.6, 0), pt(10.8, 0)],
  cub(pt(10.8, 0), pt(11.4, -3), pt(11.8, -5.2), pt(12.6, -8), 4),
  cub(pt(10.8, -2.8), pt(6, -3.4), pt(1, -3.2), pt(-5.8, 0), 6),
  [pt(10.8, -2.8), pt(10.8, 0)],
  [pt(-5.8, 0), pt(-14.4, 0)],
  cub(pt(1, -3.2), pt(-1, -6.4), pt(-3, -8.6), pt(-4, -9.4), 5),
  cub(pt(-4, -9.4), pt(-9.4, -9.2), pt(-13.4, -6.4), pt(-14.4, 0), 6),
  // The supraocular's rim over the eye.
  cub(pt(11.2, -8.6), pt(8, -9.8), pt(2, -10.4), pt(-1.4, -9.4), 6),
  // Lip scales along the edge in front of the eye.
  [pt(13.4, -9.6), pt(12.6, -8.5)],
  [pt(16.4, -7.4), pt(15.4, -6.5)],
  [pt(18.6, -5), pt(17.6, -4.4)],
];

/** Paints a piece of the warped head over everything inside `clip`. */
function clipped(ctx: CanvasRenderingContext2D, clip: readonly Pt[], paint: () => void): void {
  ctx.save();
  ctx.beginPath();
  clip.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  paint();
  ctx.restore();
}

/** The skin of head and neck: the strip's cross-section washes, the crown modelled as a dome, the markings. */
function skin(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { ctx } = d.pen;
  const map = (pts: readonly Pt[]): Pt[] => pts.map(w);
  clipped(ctx, body, () => {
    ctx.fillStyle = PAPER_FILL;
    ctx.fillRect(-40, -20, 80, 40);
    ctx.globalAlpha = 0.93;
    ctx.fillStyle = crossWash(ctx, -HALF_W);
    ctx.fillRect(-40, -20, 80, 40);
    ctx.globalAlpha = 1;
    // The crown a shade warmer and deeper than the neck; the snout paler.
    const c = w(pt(2, 0));
    glaze(ctx, c.x, c.y, 13, 9, 0, '#d4703a', 0.3);
    const s = w(pt(15, 0));
    glaze(ctx, s.x, s.y - 1, 5, 4, 0, CORN_PAINT.tan, 0.4);
    paintBlotch(ctx, map(spear()), 8100 + d.f, d.ink, 1.0);
    for (const side of [1, -1] as const) paintBlotch(ctx, map(dense(eyeStripe(side), 1)), 8200 + side + d.f, d.ink, 1.05);
    paintBlotch(ctx, map(dense(brow(), 1)), 8300 + d.f, d.ink, 1.05);
    // Scale rows on the neck, giving way to the crown's plates.
    clipped(ctx, [pt(-40, -20), pt(-12, -20), pt(-12, 20), pt(-40, 20)], () => scaleRows(ctx, -40, -12, -HALF_W, 2.5, 0.42));
    grain(ctx, -40, 64, -HALF_W, 8400, 260, false);
    modelOver(ctx, -40, 30, -HALF_W);
    flankHatch(ctx, -40, 28, 14, -HALF_W, 8500 + d.f * 100, d.ink, 0.38, false);
  });
  crown(d, w, body);
}

/** The crown's dome: shade on its far side, hatched; the plates in fine line; nostrils; a glint on the brow. */
function crown(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { pen } = d;
  const head = dense([pt(-14, -14.5), pt(24, -14.5), pt(24, 14.5), pt(-14, 14.5)], 2).map(w);
  clipped(pen.ctx, body, () => {
    pen.crescent(head, pt(-3.2, -4.6), () => pen.fill(head, CORN_PAINT.shadow, 0.08));
    pen.crescent(body, pt(-2.2, -3.4), () => pen.hatch(head, 1.5, 0.95, 0.32, { color: d.ink, alpha: 0.28 }));
    for (const plate of PLATES) {
      for (const side of [1, -1]) pen.hair(dense(plate, 0.8).map((p) => w(pt(p.x, p.y * side))), 0.34, d.ink, side < 0 ? 0.42 : 0.55);
    }
    const brow = w(pt(1.5, -6.6));
    glaze(pen.ctx, brow.x, brow.y, 4.2, 1.5, -0.1, PAPER_FILL, 0.45);
    const tip = w(pt(17, -1.8));
    glaze(pen.ctx, tip.x, tip.y, 2.6, 1.2, -0.4, PAPER_FILL, 0.55);
  });
  for (const side of [1, -1]) {
    const n = w(pt(17.2, 3.5 * side));
    pen.dot(n.x, n.y, 0.62, d.ink, 0.85);
    pen.dot(n.x - 0.3, n.y - 0.35, 0.28, PAPER_FILL, 0.6);
  }
}

/** An eye bulging from the side of the head: dark socket, amber-red iris, round pupil looking out, a glint. */
function eye(d: Draw, w: Warp, side: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = w(pt(4.8, 11.5 * side));
  const rx = 3.4;
  const ry = 2.7;
  const ball = Array.from({ length: 22 }, (_, i) => pt(c.x + Math.cos((i / 22) * Math.PI * 2) * rx, c.y + Math.sin((i / 22) * Math.PI * 2) * ry));
  pen.fill(ball.map((p) => pt(p.x + 0.5, p.y + 0.7)), d.ink, 0.35);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.9, c.y - 0.8, 0.2, c.x, c.y, rx * 1.05);
    g.addColorStop(0, '#f0a050');
    g.addColorStop(0.45, CORN_PAINT.iris);
    g.addColorStop(1, '#4a1a10');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - rx, c.y - ry, rx * 2, ry * 2);
    pen.dot(c.x + 0.2, c.y + side * 0.55, 1.15, '#140a0c', 1);
    // The brow plate's shadow over the top of the eye.
    pen.fill(ball.map((p) => pt(p.x + 0.4, p.y - side * ry * 1.35)), CORN_PAINT.shadow, 0.45);
  });
  pen.stroke(closed(ball), 0.75, d.ink, 0.95, false);
  pen.dot(c.x - 1.1, c.y - 0.9, 0.62, PAPER_FILL, 0.95);
  pen.dot(c.x + 1.1, c.y + 0.6, 0.3, PAPER_FILL, 0.5);
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
  if (g.spread > 0) jaws(d, CORN_JAW[pose === 'open' ? 'open' : 'strike'], body);
  skin(d, w, body);
  for (const side of [-1, 1] as const) eye(d, w, side);
  // Contours: lighter on the lit side, heavier on the shaded one, meeting at the snout.
  const tipAt = upper.length - 1;
  d.pen.stroke(upper.slice(0, tipAt).concat(mirror(upper.slice(tipAt - 6, tipAt)).reverse()), 1.1, d.ink, 0.95);
  d.pen.stroke(mirror(upper), 1.7, d.ink, 1);
  fadeNeck(d.pen.ctx);
}

export const CORN_HEAD: SpriteArt<HeadPose> = {
  frame: FRAME,
  res: 4,
  poses: ['shut', 'open', 'strike'],
  draw: drawHead,
};

/** The forked tongue: a red stem flicking out of the snout, splitting into two dark tines. */
function drawTongue(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const stem = cub(pt(-1, 0), pt(4, -0.7), pt(8, 0.8), pt(11.2, 0.2), 12);
  const shape = ribbon(stem, (u) => 1.35 - 0.45 * u).shape;
  const tine = (s: 1 | -1): Pt[] => ribbon(cub(pt(10.8, 0.2), pt(13, 0.3 + s * 0.4), pt(15, s * 1.8), pt(17, s * 3), 8), (u) => 0.9 - 0.7 * u).shape;
  const fork = ctx.createLinearGradient(9, 0, 17, 0);
  fork.addColorStop(0, CORN_PAINT.tongue);
  fork.addColorStop(1, CORN_PAINT.tongueTip);
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
  pen.fill(shape, CORN_PAINT.tongue, 1);
  pen.clipped(shape, () => {
    pen.fill(shape.map((p) => pt(p.x, p.y + 0.55)), '#6e1020', 0.45);
    pen.hair(stem.map((p) => pt(p.x, p.y - 0.35)), 0.3, '#ffc4cc', 0.6);
  });
  pen.hair(closed(shape), 0.25, d.ink, 0.55);
}

export const CORN_TONGUE: SpriteArt<'flick'> = {
  frame: 40,
  res: 4,
  poses: ['flick'],
  draw: drawTongue,
};
