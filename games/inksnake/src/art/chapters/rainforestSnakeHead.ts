import { closed, cub, type Draw, normals, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { flankHatch, glaze } from '../snakes/cornPaint';
import { SNAKE_W, type SpriteArt } from '../types';
import { speckle } from './barrensSnakePaint';
import { FLY_JAW, flyJaws } from './rainforestSnakeJaws';
import { FLY_PAINT, flyCrossWash, flyModel, flyScales, glossGlints, inFlower } from './rainforestSnakePaint';

/**
 * The paradise flying snake's head from above, facing +x, the frame centred
 * between the eyes: long, flat and squared off at the snout, wider than the
 * slender neck, with big round-pupilled golden eyes bulging at its sides
 * (it hunts by sight). Glossy black, its shields edged yellow-green, with
 * yellow-green bars across the snout, between the eyes and over the crown,
 * and the first red-orange flower on the nape. The neck is the back strip's
 * cross-section (same washes, scales, gloss and contours at y = ±10.8) and
 * fades out at the back, where the strip under it takes over.
 */
type HeadPose = 'shut' | 'open' | 'strike';

const FRAME = 72;
const HALF_W = SNAKE_W / 2;
const NECK = HALF_W - 1.2;
const TIP = 24.4;
/** Where the tongue comes out: the notch in the rostral. */
export const FLY_SNOUT = 23.6;
const FADE_FROM = -22;
const FADE_TO = -35;
const F = FLY_PAINT;

interface Gape {
  readonly k: number;
  readonly push: number;
  readonly spread: number;
}
const GAPE: Record<HeadPose, Gape> = {
  shut: { k: 1, push: 0, spread: 0 },
  open: { k: 0.74, push: 0, spread: 1 },
  strike: { k: 0.86, push: 3.4, spread: 0.55 },
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

type Warp = (p: Pt) => Pt;

/** The pose's warp of the shut head: the snout shortened as it tips up to gape, the jaw corners pushed out, the head lunging on a stretched neck. */
function warpOf(g: Gape): Warp {
  return (p) => {
    let x = p.x > 2 ? 2 + (p.x - 2) * g.k : p.x;
    x += g.push * ease((p.x + 30) / 22);
    const jaw = 1 + g.spread * 0.06 * Math.max(0, 1 - Math.abs(p.x + 5) / 9);
    return pt(x, p.y * jaw);
  };
}

const mirror = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(p.x, -p.y));
const bilateral = (upper: readonly Pt[]): Pt[] => [...upper, ...mirror(upper).reverse().slice(1)];

/** The head's upper outline, from the back of the neck to the snout's middle: a slim neck, the head swelling past it, long and squared at the snout. */
const UPPER: Pt[] = dense([
  pt(FADE_TO - 2, -NECK),
  pt(-17, -NECK),
  ...cub(pt(-17, -NECK), pt(-12.5, -NECK - 0.2), pt(-9.5, -13.4), pt(-4.5, -13.8), 8).slice(1),
  ...cub(pt(-4.5, -13.8), pt(1.5, -14.2), pt(7, -13.6), pt(11.5, -12), 8).slice(1),
  ...cub(pt(11.5, -12), pt(15.5, -10.4), pt(19.5, -8.2), pt(22, -5.8), 8).slice(1),
  ...cub(pt(22, -5.8), pt(23.6, -4.2), pt(TIP, -2.4), pt(TIP, 0), 6).slice(1),
]);

function outward(upper: readonly Pt[], by: number): Pt[] {
  const n = normals(upper);
  return upper.map((p, i) => (p.y === 0 ? pt(p.x + by, 0) : pt(p.x + n[i]!.x * by, p.y + n[i]!.y * by)));
}

/** A yellow-green bar across the head at x, `w` wide, reaching out to half-width `reach`. */
function bar(x: number, w: number, reach: number, bow: number): Pt[] {
  const spine = cub(pt(x - bow, -reach), pt(x + bow * 0.6, -reach * 0.45), pt(x + bow * 0.6, reach * 0.45), pt(x - bow, reach), 16);
  return dense(ribbon(spine, (u) => w * (0.75 + 0.35 * Math.sin(Math.PI * u))).shape, 0.8);
}

/** The head's shields in fine line (upper half; mirrored): rostral, internasal, prefrontal, frontal, supraocular, parietal. */
const PLATES: readonly (readonly Pt[])[] = [
  cub(pt(TIP - 0.3, -2.6), pt(22.6, -2.2), pt(21.8, -1), pt(21.6, 0), 4),
  [pt(21.6, 0), pt(15.8, 0)],
  cub(pt(19.6, 0), pt(19.8, -2), pt(20.2, -3.8), pt(21.4, -5.6), 4),
  cub(pt(15.8, 0), pt(16, -3), pt(16.4, -5.6), pt(17, -8.2), 4),
  cub(pt(15.8, -3.4), pt(11, -3.2), pt(6, -2.4), pt(2.6, 0), 6),
  cub(pt(16.4, -6.2), pt(12, -8.6), pt(7, -9.4), pt(3.4, -8.6), 6),
  [pt(3.4, -8.6), pt(4.6, -2)],
  [pt(2.6, 0), pt(-10, 0)],
  cub(pt(3.4, -8.6), pt(-1, -10.6), pt(-6.5, -9.6), pt(-10, 0), 7),
  cub(pt(19, -6.8), pt(18.3, -7.6), pt(17.6, -8.6), pt(17.2, -9.6), 3),
];

/** The head's big shields (snout to parietals) and lips: everything else, the temples behind the eyes and the neck, is scaled like the body. */
const SHIELDS: Pt[] = dense([
  pt(-10.6, 0), ...cub(pt(-10.6, 0), pt(-10, -5), pt(-6.5, -9.6), pt(-1, -11.2), 8).slice(1), pt(2.6, -11.8), pt(4, -17), pt(30, -17),
  pt(30, 17), pt(4, 17), pt(2.6, 11.8), ...cub(pt(-1, 11.2), pt(-6.5, 9.6), pt(-10, 5), pt(-10.6, 0), 8).slice(0, -1),
], 1);

/** Runs `paint` clipped to the frame outside `shape`. */
function outsideShields(ctx: CanvasRenderingContext2D, shape: readonly Pt[], paint: () => void): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-FRAME, -FRAME, FRAME * 2, FRAME * 2);
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip('evenodd');
  paint();
  ctx.restore();
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

/** A yellow-green wash in a shape, pooled at its edge, lifted where the light hits. */
function limeWash(d: Draw, shape: readonly Pt[], alpha: number): void {
  const { pen } = d;
  pen.fill(shape, F.lime, alpha);
  pen.clipped(shape, () => {
    const xs = shape.map((p) => p.x);
    const ys = shape.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    glaze(pen.ctx, cx - 0.5, cy - 3, 2.6, 5, 0, F.yellow, 0.6);
    pen.stroke(closed(shape), 0.8, F.greenDeep, 0.5, false);
  });
}

/** The skin of head and neck: the black ground, the bars and the shields' edges, the neck's scales and flower, the gloss. */
function skin(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { ctx } = d.pen;
  const map = (pts: readonly Pt[]): Pt[] => pts.map(w);
  clipTo(ctx, body, () => {
    ctx.fillStyle = flyCrossWash(ctx, -HALF_W);
    ctx.fillRect(-40, -20, 80, 40);
    const c = w(pt(4, -4));
    glaze(ctx, c.x, c.y, 14, 8, 0, '#22342a', 0.7);
    const snout = w(pt(17, 3));
    glaze(ctx, snout.x, snout.y, 7, 4, 0.3, '#0a1311', 0.5);
    const nape = w(pt(-5, 5));
    glaze(ctx, nape.x, nape.y, 6, 4, 0, '#33473a', 0.4);
    speckle(ctx, -14, 40, -HALF_W, 15500, 130, false, F.blackLit);
    // The lip scales along each side, yellow-green, seen past the head's edge.
    const lip = UPPER.filter((p) => p.x > -8 && p.x < TIP - 1.5);
    for (const s of [1, -1]) d.pen.stroke(lip.map((p) => w(pt(p.x, p.y * s))), 2.6, F.lime, s > 0 ? 0.4 : 0.55, false);
    outsideShields(ctx, map(SHIELDS), () => flyScales(ctx, -42, 8, -HALF_W, 15200, { red: (j, r) => inFlower(j, r, [-22]) }));
    limeWash(d, map(bar(18.6, 1.8, 6.2, 0.6)), 0.72);
    limeWash(d, map(bar(9.8, 1.7, 8.6, 1.6)), 0.7);
    limeWash(d, map(bar(-3.2, 2, 9, 2.6)), 0.68);
    for (const s of [1, -1]) limeWash(d, map(dense([pt(-9.6, 4.6 * s), pt(-7.2, 3.2 * s), pt(-6.6, 6 * s), pt(-9, 7.6 * s)], 0.6)), 0.72);
    flyModel(ctx, -40, 30, -HALF_W);
    glossGlints(ctx, -40, 30, -HALF_W, 15300, 12, false);
    flankHatch(ctx, -40, 28, 14, -HALF_W, 15400 + d.f * 100, d.ink, 0.35, false);
  });
  crown(d, w, body);
}

/** The crown's dome: shade on its far side, the shields edged in fine line, nostrils, glints along the brow and snout. */
function crown(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { pen } = d;
  const head = dense([pt(-14, -15), pt(26, -15), pt(26, 15), pt(-14, 15)], 2).map(w);
  clipTo(pen.ctx, body, () => {
    pen.crescent(head, pt(-3.2, -4.6), () => pen.fill(head, F.net, 0.22));
    for (const plate of PLATES) {
      for (const side of [1, -1]) {
        const line = dense(plate, 0.8).map((p) => w(pt(p.x, p.y * side)));
        pen.hair(line, 0.7, F.lime, side < 0 ? 0.55 : 0.4);
        pen.hair(line, 0.3, F.net, 0.8);
      }
    }
    const brow = w(pt(8, -7.4));
    glaze(pen.ctx, brow.x, brow.y, 5, 1.3, -0.1, PAPER_FILL, 0.5);
    const snout = w(pt(18, -3.4));
    glaze(pen.ctx, snout.x, snout.y, 3.4, 1, -0.4, PAPER_FILL, 0.42);
    const crownGl = w(pt(-3, -5));
    glaze(pen.ctx, crownGl.x, crownGl.y, 4, 1.2, 0.1, PAPER_FILL, 0.35);
  });
  for (const side of [1, -1]) {
    const n = w(pt(21.4, 4.4 * side));
    pen.dot(n.x, n.y, 0.75, F.net, 0.95);
    pen.dot(n.x - 0.3, n.y - 0.4, 0.28, F.lime, 0.7);
  }
}

/** A big eye bulging at the side of the head: dark socket, golden iris, round pupil, a glint. */
function eye(d: Draw, w: Warp, side: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = w(pt(9.4, 10.5 * side));
  const rx = 3.4;
  const ry = 2.5;
  const ball = Array.from({ length: 24 }, (_, i) => pt(c.x + Math.cos((i / 24) * Math.PI * 2) * rx, c.y + Math.sin((i / 24) * Math.PI * 2) * ry));
  pen.fill(ball.map((p) => pt(p.x + 0.5, p.y + 0.7)), d.ink, 0.4);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.9, c.y - 0.8, 0.2, c.x, c.y, rx * 1.05);
    g.addColorStop(0, '#f2dc7a');
    g.addColorStop(0.5, F.iris);
    g.addColorStop(1, '#3b2a0c');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - rx, c.y - ry, rx * 2, ry * 2);
    pen.dot(c.x + 0.2, c.y + side * 0.4, 1.25, '#0a0806', 1);
    pen.fill(ball.map((p) => pt(p.x + 0.4, p.y - side * ry * 1.35)), F.net, 0.45);
  });
  pen.stroke(closed(ball), 0.8, F.net, 0.95, false);
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
  if (g.spread > 0) flyJaws(d, FLY_JAW[pose === 'open' ? 'open' : 'strike'], body);
  skin(d, w, body);
  for (const side of [-1, 1] as const) eye(d, w, side);
  d.pen.stroke(upper, 1.1, d.ink, 0.95);
  d.pen.stroke(mirror(upper), 1.7, d.ink, 1);
  fadeNeck(d.pen.ctx);
}

export const FLY_HEAD: SpriteArt<HeadPose> = {
  frame: FRAME,
  res: 4,
  poses: ['shut', 'open', 'strike'],
  draw: drawHead,
};

/** The forked tongue: a slate-black stem flicking out of the rostral's notch, splitting into two fine tines. */
function drawTongue(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const stem = cub(pt(-1, 0), pt(4, -0.7), pt(8, 0.8), pt(11.6, 0.2), 12);
  const shape = ribbon(stem, (u) => 1.2 - 0.45 * u).shape;
  const tine = (s: 1 | -1): Pt[] => ribbon(cub(pt(11.2, 0.2), pt(13.4, 0.3 + s * 0.4), pt(15.4, s * 1.8), pt(17.6, s * 3.1), 8), (u) => 0.8 - 0.62 * u).shape;
  const fork = ctx.createLinearGradient(9, 0, 17, 0);
  fork.addColorStop(0, F.tongue);
  fork.addColorStop(1, F.tongueTip);
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
  pen.fill(shape, F.tongue, 1);
  pen.clipped(shape, () => {
    pen.fill(shape.map((p) => pt(p.x, p.y + 0.55)), F.tongueTip, 0.5);
    pen.hair(stem.map((p) => pt(p.x, p.y - 0.35)), 0.3, '#9fb0aa', 0.6);
  });
  pen.hair(closed(shape), 0.25, d.ink, 0.55);
}

export const FLY_TONGUE: SpriteArt<'flick'> = {
  frame: 40,
  res: 4,
  poses: ['flick'],
  draw: drawTongue,
};
