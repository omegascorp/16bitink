import { closed, cub, type Draw, normals, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { flankHatch, glaze } from '../snakes/cornPaint';
import { SNAKE_W, type SpriteArt } from '../types';
import { hogModel, keeledScales, speckle } from './barrensSnakePaint';
import { EGG_JAW, eggJaws } from './savannaSnakeJaws';
import { chevronShape, densify, densifyOpen, EGG_PAINT, eggCrossWash, paintEggMark } from './savannaSnakePaint';

/**
 * The egg-eater's head from above, facing +x, the frame centred between
 * the eyes: small and rounded, hardly wider than the slender neck, a short
 * blunt snout, big eyes set well out on the sides with vertical pupils (it
 * hunts at night), the grey-brown iris matching the body. On the crown the
 * night adder's mark: a dark V pointing forward between the eyes, its arms
 * running back down the neck, and a second chevron on the nape behind it.
 * The neck is the back strip's cross-section (same washes, scales, shading
 * and contours at y = ±10.8) and fades out at the back, where the strip
 * under it takes over.
 */
type HeadPose = 'shut' | 'open' | 'strike';

const FRAME = 64;
const HALF_W = SNAKE_W / 2;
const NECK = HALF_W - 1.2;
/** The snout tip, shut. */
const TIP = 19.4;
/** Where the tongue comes out: the notch in the rostral. */
export const EGG_SNOUT = 18.8;
const FADE_FROM = -19;
const FADE_TO = -31;
const E = EGG_PAINT;

interface Gape {
  readonly k: number;
  readonly push: number;
  readonly spread: number;
}
const GAPE: Record<HeadPose, Gape> = {
  shut: { k: 1, push: 0, spread: 0 },
  open: { k: 0.76, push: 0, spread: 1 },
  strike: { k: 0.88, push: 2.8, spread: 0.55 },
};

const ease = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

type Warp = (p: Pt) => Pt;

/** The pose's warp of the shut head: the snout shortened as it tips up to gape, the jaw corners pushed out, the head lunging on a stretched neck. */
function warpOf(g: Gape): Warp {
  return (p) => {
    let x = p.x > 2 ? 2 + (p.x - 2) * g.k : p.x;
    x += g.push * ease((p.x + 28) / 20);
    const jaw = 1 + g.spread * 0.07 * Math.max(0, 1 - Math.abs(p.x + 4) / 9);
    return pt(x, p.y * jaw);
  };
}

const mirror = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(p.x, -p.y));
const bilateral = (upper: readonly Pt[]): Pt[] => [...upper, ...mirror(upper).reverse().slice(1)];
const line = (pts: readonly Pt[], step = 0.8): Pt[] => densifyOpen(pts, step);

/** The head's upper outline, from the back of the neck to the snout's middle: barely wider than the neck, rounded all round. */
const UPPER: Pt[] = line([
  pt(FADE_TO - 2, -NECK),
  pt(-13, -NECK),
  ...cub(pt(-13, -NECK), pt(-9.6, -NECK - 0.2), pt(-7.6, -12.2), pt(-3.6, -12.5), 8).slice(1),
  ...cub(pt(-3.6, -12.5), pt(1.2, -12.8), pt(6.6, -12.2), pt(10.2, -10.2), 8).slice(1),
  ...cub(pt(10.2, -10.2), pt(13.6, -8.4), pt(16.4, -6.2), pt(18, -3.8), 8).slice(1),
  ...cub(pt(18, -3.8), pt(19, -2.4), pt(19.4, -1.2), pt(TIP, 0), 5).slice(1),
]);

function outward(upper: readonly Pt[], by: number): Pt[] {
  const n = normals(upper);
  return upper.map((p, i) => (p.y === 0 ? pt(p.x + by, 0) : pt(p.x + n[i]!.x * by, p.y + n[i]!.y * by)));
}

/** The crown's V: its point forward between the eyes, its arms swept back and widening down the sides of the neck. */
function crownV(): Pt[] {
  const front = (k: 1 | -1): Pt[] => cub(pt(5.4, 0), pt(1.4, 3.2 * k), pt(-6, 6.6 * k), pt(-15.5, 8.6 * k), 12);
  const back = (k: 1 | -1): Pt[] => cub(pt(1.2, 0), pt(-2, 1.9 * k), pt(-8, 3.4 * k), pt(-15.5, 4.2 * k), 12);
  return densify([...front(-1), ...back(-1).reverse().slice(0, -1), ...back(1).slice(1), ...front(1).reverse().slice(0, -1)], 0.9);
}

/** The dark streak from behind the eye towards the angle of the jaw, on side s. */
function eyeStreak(s: 1 | -1): Pt[] {
  const spine = cub(pt(2.8, 10.6 * s), pt(-0.6, 11.2 * s), pt(-3.8, 11.8 * s), pt(-7.4, 11.8 * s), 10);
  return densify(ribbon(spine, (u) => 1.9 - 0.9 * u).shape, 0.9);
}

/** The crown's plates in fine line (upper half; mirrored): internasals, prefrontals, frontal, supraoculars, parietals. */
const PLATES: readonly (readonly Pt[])[] = [
  cub(pt(17.6, -0.2), pt(17.4, -1.8), pt(16.8, -3), pt(17.4, -4.2), 4),
  [pt(18.2, 0), pt(14.8, 0)],
  cub(pt(14.8, 0), pt(14.8, -2.4), pt(15.2, -4.6), pt(16.2, -6.2), 5),
  [pt(14.8, 0), pt(10.4, 0)],
  cub(pt(10.4, 0), pt(10.6, -3.2), pt(11.2, -6.2), pt(12.6, -8.6), 6),
  cub(pt(10.4, -2.8), pt(6.4, -3.2), pt(1.6, -2.8), pt(-2.4, 0), 6),
  cub(pt(10.6, -2.8), pt(9.4, -6.6), pt(7, -8.6), pt(1.2, -8.8), 6),
  cub(pt(1.6, -3), pt(1, -5.6), pt(0.6, -7.6), pt(1.2, -8.8), 4),
  [pt(-2.4, 0), pt(-11, 0)],
  cub(pt(1.2, -8.8), pt(-4.6, -9.4), pt(-9.6, -6.6), pt(-11, 0), 7),
  [pt(12.6, -8.6), pt(11.6, -9.6)],
  [pt(15.4, -6.6), pt(14.6, -7.6)],
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

/** The skin of head and neck: the back's washes, the crown a shade darker and the snout dustier, the marks, the neck's keeled scales. */
function skin(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { ctx } = d.pen;
  const map = (pts: readonly Pt[]): Pt[] => pts.map(w);
  clipTo(ctx, body, () => {
    ctx.fillStyle = PAPER_FILL;
    ctx.fillRect(-36, -20, 72, 40);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = eggCrossWash(ctx, -HALF_W);
    ctx.fillRect(-36, -20, 72, 40);
    ctx.globalAlpha = 1;
    const c = w(pt(2, 0));
    glaze(ctx, c.x, c.y, 11, 8, 0, '#857158', 0.28);
    const s = w(pt(15, 0));
    glaze(ctx, s.x, s.y - 0.8, 5.5, 4.4, 0, E.dust, 0.32);
    const n = w(pt(-20, 0));
    glaze(ctx, n.x, n.y, 4, 5.5, 0, E.edging, 0.4);
    speckle(ctx, -36, 60, -HALF_W, 15600, 130, false, E.mark);
    paintEggMark(ctx, map(chevronShape(-26.5, 5.4, 7.6, 15610, 0)), 15620 + d.f, d.ink, 1.05, 0.75);
    for (const side of [1, -1] as const) paintEggMark(ctx, map(eyeStreak(side)), 15630 + side + d.f, d.ink, 0.8, 0);
    paintEggMark(ctx, map(crownV()), 15640 + d.f, d.ink, 1.05, 0.7);
    // The neck's keeled scales, thinning out over the back of the head (the crown's plates take over).
    for (const [x0, x1, a] of [[-36, -12, 0.55], [-12, -9.5, 0.4], [-9.5, -7, 0.26], [-7, -4.5, 0.12]] as const) {
      clipTo(ctx, [pt(x0, -20), pt(x1, -20), pt(x1, 20), pt(x0, 20)], () => keeledScales(ctx, -36, -4, -HALF_W, 2.4, a, 120));
    }
    speckle(ctx, -36, 60, -HALF_W, 15650, 220, false, E.shadow);
    hogModel(ctx, -36, 28, -HALF_W, E.shadow, 0.16);
    flankHatch(ctx, -36, 26, 13, -HALF_W, 15660 + d.f * 100, d.ink, 0.38, false);
  });
  crown(d, w, body);
}

/** The crown's dome: shade on its far side, hatched; the plates in fine line; nostrils; glints on brow and snout. */
function crown(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { pen } = d;
  const head = densify([pt(-12, -14), pt(22, -14), pt(22, 14), pt(-12, 14)], 2).map(w);
  clipTo(pen.ctx, body, () => {
    pen.crescent(head, pt(-3, -4.4), () => pen.fill(head, E.shadow, 0.1));
    pen.crescent(body, pt(-2, -3.2), () => pen.hatch(head, 1.4, 0.95, 0.3, { color: d.ink, alpha: 0.28 }));
    for (const plate of PLATES) {
      for (const side of [1, -1]) pen.hair(line(plate as Pt[], 0.8).map((p) => w(pt(p.x, p.y * side))), 0.32, d.ink, side < 0 ? 0.42 : 0.54);
    }
    const brow = w(pt(5, -6.4));
    glaze(pen.ctx, brow.x, brow.y, 4, 1.4, -0.1, PAPER_FILL, 0.4);
    const snout = w(pt(14.5, -3));
    glaze(pen.ctx, snout.x, snout.y, 3, 1.3, -0.5, PAPER_FILL, 0.32);
  });
  for (const side of [1, -1]) {
    const n = w(pt(16.6, 4.1 * side));
    pen.dot(n.x, n.y, 0.55, d.ink, 0.85);
    pen.dot(n.x - 0.3, n.y - 0.3, 0.24, PAPER_FILL, 0.6);
  }
}

/** An eye set out on the side of the head: dark socket, grey-brown iris finely veined, a vertical slit pupil, the brow's shadow, a glint. */
function eye(d: Draw, w: Warp, side: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = w(pt(6.4, 10.5 * side));
  const rx = 3.3;
  const ry = 2.6;
  const ball = Array.from({ length: 22 }, (_, i) => pt(c.x + Math.cos((i / 22) * Math.PI * 2) * rx, c.y + Math.sin((i / 22) * Math.PI * 2) * ry));
  pen.fill(ball.map((p) => pt(p.x + 0.5, p.y + 0.7)), d.ink, 0.35);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.8, c.y - 0.6, 0.2, c.x, c.y, rx * 1.05);
    g.addColorStop(0, '#cbb894');
    g.addColorStop(0.5, E.iris);
    g.addColorStop(1, '#2c2219');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - rx, c.y - ry, rx * 2, ry * 2);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      pen.hair([pt(c.x + Math.cos(a) * 0.9, c.y + Math.sin(a) * 0.8), pt(c.x + Math.cos(a) * rx * 0.95, c.y + Math.sin(a) * ry * 0.95)], 0.18, '#3b2d20', 0.5);
    }
    // The pupil: a vertical slit, seen from above running up over the eye's bulge (across the head).
    pen.fill(densify([pt(c.x + 0.2, c.y - 2.1), pt(c.x + 0.75, c.y), pt(c.x + 0.2, c.y + 2.1), pt(c.x - 0.35, c.y)], 0.4), '#0d0907', 1);
    pen.fill(ball.map((p) => pt(p.x + 0.4, p.y - side * ry * 1.3)), E.shadow, 0.5);
  });
  pen.stroke(closed(ball), 0.72, d.ink, 0.95, false);
  pen.dot(c.x - 1.1, c.y - 0.85, 0.55, PAPER_FILL, 0.95);
  pen.dot(c.x + 1, c.y + 0.55, 0.26, PAPER_FILL, 0.5);
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
  if (g.spread > 0) eggJaws(d, EGG_JAW[pose === 'open' ? 'open' : 'strike'], body);
  skin(d, w, body);
  for (const side of [-1, 1] as const) eye(d, w, side);
  d.pen.stroke(upper, 1.1, d.ink, 0.95);
  d.pen.stroke(mirror(upper), 1.75, d.ink, 1);
  fadeNeck(d.pen.ctx);
}

export const EGG_HEAD: SpriteArt<HeadPose> = {
  frame: FRAME,
  res: 4,
  poses: ['shut', 'open', 'strike'],
  draw: drawHead,
};

export { EGG_TONGUE } from './savannaSnakeJaws';
