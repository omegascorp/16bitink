import { closed, cub, type Draw, normals, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { flankHatch, glaze } from '../snakes/cornPaint';
import { SNAKE_W, type SpriteArt } from '../types';
import { KRAIT_JAW, kraitJaws } from './reefSnakeJaws';
import { grainOf, KRAIT_PAINT, kraitCrossWash, kraitModel, smoothScales } from './reefSnakePaint';

/**
 * The banded sea krait's head from above, facing +x, the frame centred
 * between the eyes: small and blunt, hardly wider than the neck, glossy
 * black over the crown with its big plates shining in fine pale line; the
 * snout yellow in front of the eyes, the yellow running back along the
 * upper lip and as a stripe over each eye to the temple; small dark eyes set
 * in the sides, the nostrils on the sides of the snout (a sea krait's are,
 * unlike a true sea snake's). The black reaches back over the nape, then the
 * silver neck (the strip's cross-section, same washes, scales and shading)
 * fades out at the back, where the strip under it takes over.
 */
type HeadPose = 'shut' | 'open' | 'strike';

const FRAME = 72;
const HALF_W = SNAKE_W / 2;
const NECK = HALF_W - 1.2;
/** The snout tip, shut; the tongue comes out just under it. */
export const KRAIT_SNOUT = 19.2;
const FADE_FROM = -22;
const FADE_TO = -35;
const K = KRAIT_PAINT;

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
const both = (half: readonly Pt[]): Pt[] => dense(bilateral(half), 1);

/** The head's upper outline, from the back of the neck to the blunt snout. */
const UPPER: Pt[] = dense([
  pt(FADE_TO - 2, -NECK),
  pt(-14, -NECK),
  ...cub(pt(-14, -NECK), pt(-10, -NECK - 0.1), pt(-8.5, -12.3), pt(-4, -12.5), 8).slice(1),
  ...cub(pt(-4, -12.5), pt(1, -12.7), pt(6, -12.1), pt(10, -10.4), 8).slice(1),
  ...cub(pt(10, -10.4), pt(13.6, -8.8), pt(16.6, -6.6), pt(18.2, -4.2), 8).slice(1),
  ...cub(pt(18.2, -4.2), pt(19.1, -2.6), pt(KRAIT_SNOUT, -1.3), pt(KRAIT_SNOUT, 0), 5).slice(1),
]);

function outward(upper: readonly Pt[], by: number): Pt[] {
  const n = normals(upper);
  return upper.map((p, i) => (p.y === 0 ? pt(p.x + by, 0) : pt(p.x + n[i]!.x * by, p.y + n[i]!.y * by)));
}

/** The black of crown and nape, its back edge ragged like a band's. */
function cap(): Pt[] {
  const back = Array.from({ length: 13 }, (_, i) => {
    const y = -16 + (i * 32) / 12;
    return pt(-17.5 + 1.4 * (y / 16) ** 2 + 0.5 * Math.sin(i * 2.1), y);
  });
  return dense([...back, pt(30, 16), pt(30, -16)], 1.5);
}

/** The yellow snout, in front of a line curving from eye to eye. */
const SNOUT: Pt[] = both([pt(26, 0), pt(26, -14), pt(9.6, -14), ...cub(pt(9.6, -10.6), pt(10.6, -6.4), pt(12.8, -3.6), pt(13.8, 0), 8)].reverse());

/** The yellow stripe over the eye on side s, running back to the temple. */
function brow(s: 1 | -1): Pt[] {
  const spine = cub(pt(10.6, -8.4 * s), pt(5, -7.3 * s), pt(-1.5, -8.4 * s), pt(-10, -9.8 * s), 14);
  return dense(ribbon(spine, (u) => 2.3 - 1.4 * u + 0.3 * Math.sin(u * 9)).shape, 0.8);
}

/** The crown's plates in fine line (upper half; mirrored): internasals, prefrontals, the frontal, supraoculars and the parietals. */
const PLATES: readonly (readonly Pt[])[] = [
  cub(pt(18.2, -2.6), pt(17, -2.1), pt(16.6, -0.8), pt(16.6, 0), 4),
  [pt(16.6, 0), pt(13.8, 0)],
  cub(pt(13.8, 0), pt(14.4, -2.2), pt(15.2, -3.8), pt(16.8, -5.4), 4),
  [pt(13.8, 0), pt(10, 0)],
  cub(pt(10, 0), pt(10.6, -3), pt(11, -5.2), pt(11.8, -7.8), 4),
  cub(pt(10, -2.8), pt(5.4, -3.3), pt(0.6, -3.1), pt(-5.6, 0), 6),
  [pt(10, -2.8), pt(10, 0)],
  [pt(-5.6, 0), pt(-13.6, 0)],
  cub(pt(0.6, -3.1), pt(-1.2, -6.2), pt(-3, -8.3), pt(-4, -9.1), 5),
  cub(pt(-4, -9.1), pt(-9, -8.9), pt(-12.8, -6.2), pt(-13.6, 0), 6),
  cub(pt(10.4, -8.2), pt(7.4, -9.4), pt(1.8, -10), pt(-1.4, -9.1), 6),
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

/** A yellow marking painted as watercolour: the yellow laid in, lifted pale towards the light, pooled ochre at its edge. */
function yellowWash(d: Draw, shape: readonly Pt[], lit: Pt): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, K.yellow, 0.9);
  pen.clipped(shape, () => {
    glaze(pen.ctx, lit.x, lit.y, 6, 4, 0, K.yellowLit, 0.6);
    pen.stroke(closed(shape), 1.6, K.yellowDeep, 0.35, false);
  });
}

/** The skin of head and neck: the silver neck, the black crown and nape, the yellow snout, lip and brow stripes. */
function skin(d: Draw, w: Warp, body: readonly Pt[], upper: readonly Pt[]): void {
  const { ctx } = d.pen;
  const map = (pts: readonly Pt[]): Pt[] => pts.map(w);
  clipTo(ctx, body, () => {
    ctx.fillStyle = PAPER_FILL;
    ctx.fillRect(-40, -20, 80, 40);
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = kraitCrossWash(ctx, -HALF_W);
    ctx.fillRect(-40, -20, 80, 40);
    ctx.globalAlpha = 1;
    grainOf(ctx, -40, 30, -HALF_W, 15100, 90, false);
    smoothScales(ctx, -40, -14, -HALF_W, 2.4, 0.42, 120);
    const black = map(cap());
    d.pen.fill(black, K.band, 0.97);
    clipTo(ctx, black, () => {
      const c = w(pt(-2, -5));
      glaze(ctx, c.x, c.y, 13, 5, 0, K.bandLit, 0.6);
      const nape = w(pt(-13, -4));
      glaze(ctx, nape.x, nape.y, 6, 4, 0, K.bandLit, 0.4);
      clipTo(ctx, [pt(-40, -20), pt(-12, -20), pt(-12, 20), pt(-40, 20)], () => smoothScales(ctx, -40, -12, -HALF_W, 2.4, 0.3, 120, true));
    });
    d.pen.hair(closed(black).filter((p) => p.x < -12), 0.32, d.ink, 0.4);
    // The upper lip's yellow, a rim along the edge from the jaw's angle to the snout.
    const lip = upper.filter((p) => p.x > w(pt(-7, 0)).x);
    for (const side of [1, -1]) {
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = K.yellow;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      lip.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y * side) : ctx.lineTo(p.x, p.y * side)));
      ctx.stroke();
      ctx.restore();
    }
    yellowWash(d, map(SNOUT), w(pt(15, -3)));
    for (const side of [1, -1] as const) yellowWash(d, map(brow(side)), w(pt(4, -8.5 * side)));
    kraitModel(ctx, -40, 30, -HALF_W, 0.34);
    flankHatch(ctx, -40, 28, 14, -HALF_W, 15200 + d.f * 100, d.ink, 0.34, false);
  });
  crown(d, w, body);
}

/** The crown's dome: shade on its far side, hatched; the plates in pale line on the black, ink on the yellow; nostrils; a wet glint along the brow. */
function crown(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { pen } = d;
  const head = dense([pt(-14, -14), pt(24, -14), pt(24, 14), pt(-14, 14)], 2).map(w);
  const snout = SNOUT.map(w);
  clipTo(pen.ctx, body, () => {
    pen.crescent(head, pt(-3.2, -4.6), () => pen.fill(head, K.shadow, 0.14));
    pen.crescent(body, pt(-2.2, -3.4), () => pen.hatch(head, 1.5, 0.95, 0.32, { color: d.ink, alpha: 0.26 }));
    for (const plate of PLATES) {
      for (const side of [1, -1]) {
        const line = dense(plate, 0.8).map((p) => w(pt(p.x, p.y * side)));
        pen.hair(line, 0.36, K.sheen, side < 0 ? 0.7 : 0.5);
        clipTo(pen.ctx, snout, () => pen.hair(line, 0.36, d.ink, 0.5));
      }
    }
    const gl = w(pt(2, -5.6));
    glaze(pen.ctx, gl.x, gl.y, 5, 1.3, -0.08, PAPER_FILL, 0.5);
    const tip = w(pt(16.4, -2));
    glaze(pen.ctx, tip.x, tip.y, 2.6, 1.1, -0.4, PAPER_FILL, 0.6);
  });
  for (const side of [1, -1]) {
    const n = w(pt(16, 5.6 * side));
    pen.dot(n.x, n.y, 0.62, d.ink, 0.9);
    pen.dot(n.x - 0.3, n.y - 0.35, 0.26, PAPER_FILL, 0.5);
  }
}

/** A small eye in the side of the head: a pale rim, a dark brown iris, a round pupil, the brow's shadow over it, a wet glint. */
function eye(d: Draw, w: Warp, side: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = w(pt(5.2, 10.9 * side));
  const rx = 2.6;
  const ry = 2.1;
  const ball = Array.from({ length: 20 }, (_, i) => pt(c.x + Math.cos((i / 20) * Math.PI * 2) * rx, c.y + Math.sin((i / 20) * Math.PI * 2) * ry));
  pen.fill(ball.map((p) => pt(p.x + 0.4, p.y + 0.6)), d.ink, 0.35);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.7, c.y - 0.6, 0.2, c.x, c.y, rx * 1.05);
    g.addColorStop(0, '#8a7458');
    g.addColorStop(0.5, K.iris);
    g.addColorStop(1, '#120e0c');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - rx, c.y - ry, rx * 2, ry * 2);
    pen.dot(c.x + 0.2, c.y + side * 0.4, 0.95, '#07060a', 1);
    pen.fill(ball.map((p) => pt(p.x + 0.4, p.y - side * ry * 1.3)), K.shadow, 0.5);
  });
  pen.stroke(closed(ball), 0.7, d.ink, 0.95, false);
  pen.hair(closed(ball.map((p) => pt(c.x + (p.x - c.x) * 1.2, c.y + (p.y - c.y) * 1.25))), 0.4, K.yellowLit, 0.5);
  pen.dot(c.x - 0.9, c.y - 0.75, 0.52, PAPER_FILL, 0.95);
  pen.dot(c.x + 0.9, c.y + 0.5, 0.24, PAPER_FILL, 0.5);
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
  if (g.spread > 0) kraitJaws(d, KRAIT_JAW[pose === 'open' ? 'open' : 'strike'], body);
  skin(d, w, body, upper);
  for (const side of [-1, 1] as const) eye(d, w, side);
  const tipAt = upper.length - 1;
  d.pen.stroke(upper.slice(0, tipAt).concat(mirror(upper.slice(tipAt - 6, tipAt)).reverse()), 1.1, d.ink, 0.95);
  d.pen.stroke(mirror(upper), 1.7, d.ink, 1);
  fadeNeck(d.pen.ctx);
}

export const KRAIT_HEAD: SpriteArt<HeadPose> = {
  frame: FRAME,
  res: 4,
  poses: ['shut', 'open', 'strike'],
  draw: drawHead,
};

/** The forked tongue: a dusky stem flicking out from the snout, splitting into two black tines. */
function drawTongue(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const stem = cub(pt(-1, 0), pt(4, -0.7), pt(8, 0.8), pt(11.2, 0.2), 12);
  const shape = ribbon(stem, (u) => 1.25 - 0.45 * u).shape;
  const tine = (s: 1 | -1): Pt[] => ribbon(cub(pt(10.8, 0.2), pt(13, 0.3 + s * 0.4), pt(15, s * 1.8), pt(17, s * 3), 8), (u) => 0.85 - 0.65 * u).shape;
  const fork = ctx.createLinearGradient(9, 0, 17, 0);
  fork.addColorStop(0, K.tongue);
  fork.addColorStop(1, K.tongueTip);
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
  pen.fill(shape, K.tongue, 1);
  pen.clipped(shape, () => {
    pen.fill(shape.map((p) => pt(p.x, p.y + 0.55)), K.tongueTip, 0.5);
    pen.hair(stem.map((p) => pt(p.x, p.y - 0.35)), 0.3, '#b49aae', 0.6);
  });
  pen.hair(closed(shape), 0.25, d.ink, 0.55);
}

export const KRAIT_TONGUE: SpriteArt<'flick'> = {
  frame: 40,
  res: 4,
  poses: ['flick'],
  draw: drawTongue,
};
