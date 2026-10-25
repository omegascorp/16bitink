import { createRng } from '../../logic/rng';
import { closed, cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { JawSpec } from '../snakes/cornJaws';
import { flankHatch, glaze } from '../snakes/cornPaint';
import { SNAKE_W, type SpriteArt } from '../types';
import { hogModel } from './barrensSnakePaint';
import { bilateral, clipTo, contour, dense, fadeNeck, FADE_TO, FRAME, GAPE, type HeadPose, outward, type Warp, warpOf } from './dunesSnakeKit';
import { duneJaws, type JawPaint } from './dunesSnakeJaws';
import { bandShape, creamWash, KING_PAINT, kingCrossWash, kingFlecks, smoothScales } from './dunesRivalPaint';

/**
 * The California kingsnake's head from above, facing +x, the frame centred
 * between the eyes: a colubrid's neat head, hardly wider than the neck,
 * rounded at the snout, capped with big glossy plates. Black, the plates'
 * edges picked out pale, the snout freckled with cream, the lip scales
 * cream barred with black along each side; the first cream band crosses the
 * nape. Small dark eyes with round pupils. The neck is the strip's
 * cross-section (same washes and contours at y = ±10.8) and fades at the back.
 */
const HALF_W = SNAKE_W / 2;
const NECK = HALF_W - 1.2;
const TIP = 20.2;
export const KING_SNOUT = 19.6;
const K = KING_PAINT;

const JAW: Record<'open' | 'strike', JawSpec> = {
  open: { spine: [pt(-8, 12.8), pt(3, 19.5), pt(19, 20.5), pt(29.5, 12.8)], w0: 3.9, w1: 1.7 },
  strike: { spine: [pt(-5, 12.6), pt(6, 16), pt(18, 15.5), pt(27, 8.4)], w0: 3.7, w1: 1.6 },
};

const JAW_PAINT: JawPaint = {
  lip: K.lip, side: '#2a2320', suture: '#1a1412', shadow: K.shadow,
  mouth: K.mouth, mouthDeep: K.mouthDeep, throat: K.throat, chin: '#eee4cc',
};

/** The head's upper outline, from the back of the neck to the snout tip. */
const UPPER: Pt[] = dense([
  pt(FADE_TO - 2, -NECK),
  pt(-15, -NECK),
  ...cub(pt(-15, -NECK), pt(-10.5, -NECK - 0.1), pt(-9.5, -13.2), pt(-4.5, -13.4), 8).slice(1),
  ...cub(pt(-4.5, -13.4), pt(1, -13.6), pt(6.5, -12.6), pt(10.5, -10.4), 8).slice(1),
  ...cub(pt(10.5, -10.4), pt(14.5, -8.2), pt(17.5, -5.4), pt(19, -3), 8).slice(1),
  ...cub(pt(19, -3), pt(19.7, -1.8), pt(20, -0.9), pt(TIP, 0), 4).slice(1),
]);

/** The crown's plates (upper half; mirrored): rostral, internasals, prefrontals, frontal, supraoculars, parietals. */
const PLATES: readonly (readonly Pt[])[] = [
  cub(pt(19.6, -2.2), pt(18.6, -1.6), pt(18.1, -0.8), pt(18, 0), 4),
  [pt(18, 0), pt(14.8, 0)],
  cub(pt(14.8, 0), pt(15, -2.6), pt(15.6, -4.8), pt(16.8, -6.6), 4),
  [pt(14.8, 0), pt(11.4, 0)],
  cub(pt(11.4, 0), pt(11.7, -3), pt(12.2, -6), pt(13.2, -8.8), 4),
  cub(pt(11.6, -3), pt(6.6, -3.6), pt(1.6, -3.4), pt(-5, 0), 6),
  [pt(-5, 0), pt(-13.6, 0)],
  cub(pt(1.6, -3.4), pt(-0.4, -6.6), pt(-2.5, -9), pt(-3.6, -9.9), 5),
  cub(pt(-3.6, -9.9), pt(-8.8, -9.7), pt(-12.8, -6.8), pt(-13.6, 0), 6),
  cub(pt(11.9, -9.2), pt(8.6, -10.3), pt(2.6, -10.8), pt(-0.9, -10), 6),
];

/** The cream lip scales along the side s, each barred with black at its suture. */
function lips(d: Draw, w: Warp, s: 1 | -1): void {
  const { pen } = d;
  const edge = UPPER.filter((p) => p.x > -9 && p.x < 18.6).map((p) => pt(p.x, -p.y * s));
  const inner = edge.map((p) => pt(p.x - 0.3, p.y - s * (1.9 - Math.max(0, p.x - 12) * 0.18)));
  const band = [...edge, ...[...inner].reverse()].map(w);
  pen.fill(band, PAPER_FILL, 0.85);
  pen.fill(band, K.lip, 0.75);
  pen.clipped(band, () => {
    for (let x = -7.5; x < 18; x += 2.7) {
      const a = w(pt(x, s * 14));
      const b = w(pt(x - 0.6, s * 9));
      pen.hair([a, b], 0.75, K.black, 0.85);
    }
    pen.fill(band.map((p) => pt(p.x + 0.4, p.y + 0.8)), K.shadow, 0.18);
  });
}

/** Skin of head and neck: glossy black, the nape's cream band, the freckled snout, plates in pale line, light and shade. */
function skin(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  clipTo(ctx, body, () => {
    ctx.fillStyle = PAPER_FILL;
    ctx.fillRect(-40, -22, 80, 44);
    ctx.globalAlpha = 0.97;
    ctx.fillStyle = kingCrossWash(ctx, -HALF_W);
    ctx.fillRect(-40, -22, 80, 44);
    ctx.globalAlpha = 1;
    const band = bandShape(-24, 6, 8.5, 2.5, 31).map((p) => w(pt(p.x, p.y - HALF_W)));
    pen.fill(band, PAPER_FILL, 1);
    ctx.save();
    ctx.globalAlpha = 0.92;
    pen.clipped(band, () => {
      ctx.fillStyle = creamWash(ctx, -HALF_W);
      ctx.fillRect(-40, -22, 80, 44);
    });
    ctx.restore();
    clipTo(ctx, [pt(-40, -20), pt(-13, -20), pt(-13, 20), pt(-40, 20)], () => smoothScales(ctx, -40, -13, -HALF_W, 2.5, 120, '#8a8078', 0.5));
    const rng = createRng(31100);
    for (let i = 0; i < 34; i++) {
      const p = w(pt(10 + rng() * 9, (rng() - 0.5) * 12 * (0.4 + 0.6 * rng())));
      pen.dot(p.x, p.y, 0.18 + rng() * 0.26, K.cream, 0.25 + rng() * 0.35);
    }
    kingFlecks(ctx, -40, 62, -HALF_W, 31200, 160, false);
    for (const side of [1, -1] as const) lips(d, w, side);
    for (const plate of PLATES) for (const side of [1, -1]) pen.hair(dense(plate, 0.8).map((p) => w(pt(p.x, p.y * side))), 0.36, '#cfc6b4', side < 0 ? 0.55 : 0.4);
    hogModel(ctx, -40, 30, -HALF_W, K.shadow, 0.3);
    const crown = w(pt(2, -5.5));
    glaze(ctx, crown.x, crown.y, 8, 2.2, -0.08, K.sheen, 0.4);
    const snout = w(pt(15.5, -3));
    glaze(ctx, snout.x, snout.y, 3, 1.2, -0.5, K.sheen, 0.4);
    flankHatch(ctx, -40, 28, 14, -HALF_W, 31300 + d.f * 100, '#8a8aa0', 0.3, false);
  });
  for (const side of [1, -1]) {
    const n = w(pt(17.8, 3.6 * side));
    pen.dot(n.x, n.y, 0.6, K.blackDeep, 0.9);
    pen.dot(n.x - 0.3, n.y - 0.3, 0.25, K.cream, 0.6);
  }
}

/** A small dark eye: black-brown iris round a round pupil, ringed pale, with a glint. */
function eye(d: Draw, w: Warp, side: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = w(pt(5.6, 11.4 * side));
  const rx = 2.5;
  const ry = 2.1;
  const ball = Array.from({ length: 22 }, (_, i) => pt(c.x + Math.cos((i / 22) * Math.PI * 2) * rx, c.y + Math.sin((i / 22) * Math.PI * 2) * ry));
  pen.fill(ball.map((p) => pt(c.x + (p.x - c.x) * 1.3, c.y + (p.y - c.y) * 1.3)), K.cream, 0.45);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.7, c.y - 0.6, 0.2, c.x, c.y, rx);
    g.addColorStop(0, '#7a6450');
    g.addColorStop(0.5, K.iris);
    g.addColorStop(1, '#100b08');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - rx, c.y - ry, rx * 2, ry * 2);
    pen.dot(c.x + 0.2, c.y + side * 0.3, 1, '#050303', 1);
  });
  pen.stroke(closed(ball), 0.7, d.ink, 0.95, false);
  pen.dot(c.x - 0.9, c.y - 0.75, 0.55, PAPER_FILL, 0.95);
  pen.dot(c.x + 0.9, c.y + 0.5, 0.25, PAPER_FILL, 0.5);
}

function drawHead(d: Draw, pose: HeadPose): void {
  const g = GAPE[pose];
  const w = warpOf(g);
  const upper = UPPER.map(w);
  const body = bilateral(outward(UPPER, 0.7).map(w));
  if (g.spread > 0) duneJaws(d, JAW_PAINT, JAW[pose === 'open' ? 'open' : 'strike'], body);
  skin(d, w, body);
  for (const side of [-1, 1] as const) eye(d, w, side);
  contour(d, upper);
  fadeNeck(d.pen.ctx);
}

export const KING_HEAD: SpriteArt<HeadPose> = {
  frame: FRAME,
  res: 4,
  poses: ['shut', 'open', 'strike'],
  draw: drawHead,
};
