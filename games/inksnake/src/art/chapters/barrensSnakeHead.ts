import { closed, cub, type Draw, normals, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { blotchShape, flankHatch, glaze } from '../snakes/cornPaint';
import { SNAKE_W, type SpriteArt } from '../types';
import { HOG_JAW, hogJaws } from './barrensSnakeJaws';
import { HOG_PAINT, hogCrossWash, hogModel, keeledScales, paintHogBlotch, speckle } from './barrensSnakePaint';

/**
 * The eastern hognose's head from above, facing +x, the frame centred
 * between the eyes: a short, broad head hardly narrower than the spread neck
 * behind it, flaring at the jaw angles, tapering to the hog nose: the
 * upturned, keeled rostral scale coming to a point like a shovel's blade,
 * lit along its ridge, with a little shadow cast under its raised tip. A
 * dark band crosses the head between the eyes, a dark stripe runs from each
 * eye back to the angle of the jaw, and the two big dark blotches of the
 * nape lie on the neck. Round-pupilled hazel eyes. The neck is the back
 * strip's cross-section (same washes, scales, shading and contours at
 * y = ±10.8) and fades out at the back, where the strip under it takes over.
 */
type HeadPose = 'shut' | 'open' | 'strike';

const FRAME = 72;
const HALF_W = SNAKE_W / 2;
const NECK = HALF_W - 1.2;
/** The snout tip, shut. */
const TIP = 23.2;
/** Where the tongue comes out: just under the rostral's raised point. */
export const HOG_SNOUT = 22.4;
const FADE_FROM = -22;
const FADE_TO = -35;
const H = HOG_PAINT;

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

/** The head's upper outline, from the back of the neck to the snout's point. */
const UPPER: Pt[] = dense([
  pt(FADE_TO - 2, -NECK),
  pt(-15.5, -NECK),
  ...cub(pt(-15.5, -NECK), pt(-11.5, -NECK - 0.1), pt(-9.4, -14), pt(-4.6, -14.4), 8).slice(1),
  ...cub(pt(-4.6, -14.4), pt(0.6, -14.8), pt(6.2, -13.9), pt(10.2, -11.6), 8).slice(1),
  ...cub(pt(10.2, -11.6), pt(13.8, -9.8), pt(16.4, -7.4), pt(18.6, -5), 8).slice(1),
  ...cub(pt(18.6, -5), pt(19.4, -3.9), pt(20.2, -3), pt(21.2, -2.3), 4).slice(1),
  ...cub(pt(21.2, -2.3), pt(22.1, -1.7), pt(22.9, -0.8), pt(TIP, 0), 5).slice(1),
]);

function outward(upper: readonly Pt[], by: number): Pt[] {
  const n = normals(upper);
  return upper.map((p, i) => (p.y === 0 ? pt(p.x + by, 0) : pt(p.x + n[i]!.x * by, p.y + n[i]!.y * by)));
}

/** The band across the head between the eyes. */
function brow(): Pt[] {
  const spine = cub(pt(9.3, -12.2), pt(11.6, -7), pt(11.6, 7), pt(9.3, 12.2), 16);
  return dense(ribbon(spine, (u) => 2.7 + 0.7 * Math.sin(Math.PI * u)).shape, 1);
}

/** The stripe from behind the eye back to the angle of the jaw, on side s. */
function eyeStripe(s: 1 | -1): Pt[] {
  const spine = cub(pt(3.2, 11 * s), pt(-0.8, 11.6 * s), pt(-5.5, 12.4 * s), pt(-11.5, 12.2 * s), 12);
  return dense(ribbon(spine, (u) => 3.6 - 1.2 * u).shape, 1);
}

/** The big dark blotch of the nape on side s, and a smaller one low on the flank beside it. */
function nape(s: 1 | -1): Pt[][] {
  return [
    blotchShape(-22.5, 5.4 * s, 8.8, 3.5, s > 0 ? 12400 : 12410, { rough: 0.12, pow: 2.7, notch: 0.05, n: 40 }),
    blotchShape(-19.5, 9.3 * s, 3.2, 1.5, s > 0 ? 12420 : 12430, { rough: 0.14, pow: 2.6, n: 22 }),
  ];
}

/** The rostral scale's outline from above (whole, both halves): a keeled wedge, its apex reaching back between the internasals. */
const ROSTRAL: Pt[] = dense([pt(TIP + 0.4, 0), pt(21.2, -2.6), pt(18.6, -1.5), pt(16.8, 0), pt(18.6, 1.5), pt(21.2, 2.6)], 0.6);

/** The crown's plates in fine line (upper half; mirrored). */
const PLATES: readonly (readonly Pt[])[] = [
  [pt(21.2, -2.6), pt(18.6, -1.5), pt(16.8, 0)],
  // The azygous scale behind the rostral's apex, peculiar to hognoses.
  [pt(16.8, 0), pt(16, -0.9), pt(15.1, 0)],
  cub(pt(16.2, -0.9), pt(16.2, -2.8), pt(16.9, -4.6), pt(18, -6.1), 4),
  [pt(15.2, 0), pt(11.6, 0)],
  cub(pt(11.6, 0), pt(12, -3), pt(12.4, -5.8), pt(13.4, -8.8), 4),
  cub(pt(11.6, -3), pt(6.6, -3.6), pt(1.6, -3.4), pt(-5, 0), 6),
  [pt(11.6, -3), pt(11.6, 0)],
  [pt(-5, 0), pt(-13.6, 0)],
  cub(pt(1.6, -3.4), pt(-0.4, -6.6), pt(-2.5, -9), pt(-3.6, -9.9), 5),
  cub(pt(-3.6, -9.9), pt(-8.8, -9.7), pt(-12.8, -6.8), pt(-13.6, 0), 6),
  cub(pt(11.9, -9.4), pt(8.6, -10.6), pt(2.6, -11.3), pt(-0.9, -10.3), 6),
  [pt(14.4, -9.7), pt(13.5, -8.7)],
  [pt(17.2, -7.1), pt(16.3, -6.3)],
  [pt(19.5, -4.4), pt(18.6, -3.7)],
];

function clipTo(ctx: CanvasRenderingContext2D, clip: readonly Pt[], paint: () => void): void {
  ctx.save();
  ctx.beginPath();
  clip.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  paint();
  ctx.restore();
}

/** The skin of head and neck: the back's washes, the crown deeper and the snout paler, the markings, the neck's keeled scales. */
function skin(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { ctx } = d.pen;
  const map = (pts: readonly Pt[]): Pt[] => pts.map(w);
  clipTo(ctx, body, () => {
    ctx.fillStyle = PAPER_FILL;
    ctx.fillRect(-40, -20, 80, 40);
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = hogCrossWash(ctx, -HALF_W);
    ctx.fillRect(-40, -20, 80, 40);
    ctx.globalAlpha = 1;
    const c = w(pt(1, 0));
    glaze(ctx, c.x, c.y, 13, 9, 0, '#a87a44', 0.3);
    const s = w(pt(17, 0));
    glaze(ctx, s.x, s.y - 0.8, 6, 4.6, 0, H.sand, 0.22);
    const back = w(pt(-7, 0));
    glaze(ctx, back.x, back.y, 8, 8, 0, '#8e6236', 0.22);
    const n = w(pt(-24, 0));
    glaze(ctx, n.x, n.y, 9, 2.6, 0, H.ochre, 0.35);
    speckle(ctx, -40, 64, -HALF_W, 12500, 150, false, H.blotch);
    for (const side of [1, -1] as const) for (const [i, b] of nape(side).entries()) paintHogBlotch(ctx, map(b), 12600 + i * 7 + side + d.f, d.ink, i === 0 ? 1.2 : 0.95, i === 0 ? 0.3 : 0.18);
    for (const side of [1, -1] as const) paintHogBlotch(ctx, map(eyeStripe(side)), 12700 + side + d.f, d.ink, 1.05, 0);
    paintHogBlotch(ctx, map(brow()), 12800 + d.f, d.ink, 1.05, 0.25);
    clipTo(ctx, [pt(-40, -20), pt(-13, -20), pt(-13, 20), pt(-40, 20)], () => keeledScales(ctx, -40, -13, -HALF_W, 2.4, 0.46, 120));
    speckle(ctx, -40, 64, -HALF_W, 12900, 240, false);
    hogModel(ctx, -40, 30, -HALF_W);
    flankHatch(ctx, -40, 28, 14, -HALF_W, 13000 + d.f * 100, d.ink, 0.4, false);
  });
  crown(d, w, body);
}

/**
 * The upturned rostral: a keeled wedge, its upper facet lit, the far one in
 * shade, the keel drawn dark under a lit edge, the raised front lip drawn
 * across the point; the snout's sides falling away below the canthus.
 */
function rostral(d: Draw, w: Warp): void {
  const { pen } = d;
  const { ctx } = pen;
  const side = w(pt(15.5, 5.6));
  glaze(ctx, side.x, side.y, 6, 1.9, -0.5, H.shadow, 0.34);
  const lit = w(pt(15.5, -5.2));
  glaze(ctx, lit.x, lit.y, 5.5, 1.4, 0.5, PAPER_FILL, 0.18);
  const shape = ROSTRAL.map(w);
  pen.fill(shape, '#c79c5c', 0.55);
  pen.clipped(shape, () => {
    pen.fill(ROSTRAL.filter((p) => p.y >= 0).concat([pt(16.8, 0)]).map(w), H.shadow, 0.36);
    const ridge = w(pt(19.6, -0.9));
    glaze(ctx, ridge.x, ridge.y, 3.2, 0.8, 0, PAPER_FILL, 0.38);
  });
  pen.hair(closed(shape), 0.32, d.ink, 0.5);
  pen.hair(dense([pt(TIP - 0.3, 0.2), pt(17.4, 0.2)], 0.6).map(w), 0.46, H.blotchDeep, 0.6);
  pen.hair(dense([pt(TIP - 0.8, -0.3), pt(18, -0.35)], 0.6).map(w), 0.34, PAPER_FILL, 0.75);
  pen.hair(cub(pt(21.6, -1.8), pt(22.3, -0.7), pt(22.3, 0.7), pt(21.6, 1.8), 8).map(w), 0.3, d.ink, 0.5);
}

/** The crown's dome: shade on its far side, hatched; the plates in fine line; the rostral; nostrils; glints on brow and snout. */
function crown(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { pen } = d;
  const head = dense([pt(-14, -15), pt(25, -15), pt(25, 15), pt(-14, 15)], 2).map(w);
  clipTo(pen.ctx, body, () => {
    pen.crescent(head, pt(-3.2, -4.6), () => pen.fill(head, H.shadow, 0.1));
    pen.crescent(body, pt(-2.2, -3.4), () => pen.hatch(head, 1.5, 0.95, 0.32, { color: d.ink, alpha: 0.3 }));
    for (const plate of PLATES) {
      for (const side of [1, -1]) pen.hair(dense(plate, 0.8).map((p) => w(pt(p.x, p.y * side))), 0.34, d.ink, side < 0 ? 0.44 : 0.56);
    }
    rostral(d, w);
    const brow = w(pt(2, -6.8));
    glaze(pen.ctx, brow.x, brow.y, 4.4, 1.5, -0.1, PAPER_FILL, 0.42);
    const snout = w(pt(15.5, -3));
    glaze(pen.ctx, snout.x, snout.y, 2.8, 1.2, -0.5, PAPER_FILL, 0.3);
  });
  for (const side of [1, -1]) {
    const n = w(pt(18.6, 3.9 * side));
    pen.dot(n.x, n.y, 0.6, d.ink, 0.85);
    pen.dot(n.x - 0.3, n.y - 0.35, 0.26, PAPER_FILL, 0.6);
  }
}

/** An eye set in the side of the head: dark socket, hazel iris, round pupil, the brow plate's shadow over it, a glint. */
function eye(d: Draw, w: Warp, side: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = w(pt(5.6, 12.3 * side));
  const rx = 3.1;
  const ry = 2.5;
  const ball = Array.from({ length: 22 }, (_, i) => pt(c.x + Math.cos((i / 22) * Math.PI * 2) * rx, c.y + Math.sin((i / 22) * Math.PI * 2) * ry));
  pen.fill(ball.map((p) => pt(p.x + 0.5, p.y + 0.7)), d.ink, 0.35);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.8, c.y - 0.7, 0.2, c.x, c.y, rx * 1.05);
    g.addColorStop(0, '#d8b070');
    g.addColorStop(0.45, H.iris);
    g.addColorStop(1, '#2e1c0e');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - rx, c.y - ry, rx * 2, ry * 2);
    pen.dot(c.x + 0.2, c.y + side * 0.5, 1.05, '#120a08', 1);
    pen.fill(ball.map((p) => pt(p.x + 0.4, p.y - side * ry * 1.3)), H.shadow, 0.5);
  });
  pen.stroke(closed(ball), 0.75, d.ink, 0.95, false);
  pen.dot(c.x - 1, c.y - 0.85, 0.58, PAPER_FILL, 0.95);
  pen.dot(c.x + 1, c.y + 0.55, 0.28, PAPER_FILL, 0.5);
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
  // The raised point of the snout casts a little shadow forward and down.
  if (g.spread === 0) d.pen.fill(dense([pt(16, -3), pt(TIP + 0.4, 0), pt(16, 3)], 1).map((p) => pt(p.x + 1.3, p.y + 1.9)), d.ink, 0.2);
  if (g.spread > 0) hogJaws(d, HOG_JAW[pose === 'open' ? 'open' : 'strike'], body);
  skin(d, w, body);
  for (const side of [-1, 1] as const) eye(d, w, side);
  const tipAt = upper.length - 1;
  d.pen.stroke(upper.slice(0, tipAt).concat(mirror(upper.slice(tipAt - 6, tipAt)).reverse()), 1.15, d.ink, 0.95);
  d.pen.stroke(mirror(upper), 1.8, d.ink, 1);
  fadeNeck(d.pen.ctx);
}

export const HOG_HEAD: SpriteArt<HeadPose> = {
  frame: FRAME,
  res: 4,
  poses: ['shut', 'open', 'strike'],
  draw: drawHead,
};

/** The forked tongue: a slate-black stem flicking out from under the snout's point, splitting into two fine tines. */
function drawTongue(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const stem = cub(pt(-1, 0), pt(4, -0.7), pt(8, 0.8), pt(11.2, 0.2), 12);
  const shape = ribbon(stem, (u) => 1.3 - 0.45 * u).shape;
  const tine = (s: 1 | -1): Pt[] => ribbon(cub(pt(10.8, 0.2), pt(13, 0.3 + s * 0.4), pt(15, s * 1.8), pt(17, s * 3), 8), (u) => 0.85 - 0.65 * u).shape;
  const fork = ctx.createLinearGradient(9, 0, 17, 0);
  fork.addColorStop(0, H.tongue);
  fork.addColorStop(1, H.tongueTip);
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
  pen.fill(shape, H.tongue, 1);
  pen.clipped(shape, () => {
    pen.fill(shape.map((p) => pt(p.x, p.y + 0.55)), H.tongueTip, 0.5);
    pen.hair(stem.map((p) => pt(p.x, p.y - 0.35)), 0.3, '#a898b0', 0.6);
  });
  pen.hair(closed(shape), 0.25, d.ink, 0.55);
}

export const HOG_TONGUE: SpriteArt<'flick'> = {
  frame: 40,
  res: 4,
  poses: ['flick'],
  draw: drawTongue,
};
