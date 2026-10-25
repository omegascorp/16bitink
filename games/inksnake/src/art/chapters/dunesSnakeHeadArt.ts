import { closed, cub, type Draw, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { JawSpec } from '../snakes/cornJaws';
import { blotchShape, flankHatch, glaze } from '../snakes/cornPaint';
import { SNAKE_W, type SpriteArt } from '../types';
import { hash, hogModel, keeledScales } from './barrensSnakePaint';
import { HOG_TONGUE } from './barrensSnakeHead';
import { bilateral, clipTo, contour, dense, fadeNeck, FADE_TO, FRAME, GAPE, type HeadPose, outward, scaleAt, type Warp, warpOf } from './dunesSnakeKit';
import { duneJaws, fangs, type JawPaint } from './dunesSnakeJaws';
import { paintSideBlotch, pepper, SIDE_PAINT, sideCrossWash } from './dunesSnakePaint';

/**
 * The sidewinder's head from above, facing +x, the frame centred between
 * the eyes: a pit viper's broad, flat, spade-shaped head, far wider than the
 * slim neck at the angles of the jaw, a short blunt snout, the crown paved
 * with small keeled scales. Over each eye the supraocular scale stands up as
 * a pointed horn (the "horned rattlesnake"), lit on its upper facet and
 * throwing a shadow; under it the pale eye with its upright slit pupil. A
 * brown stripe runs from each eye back to the jaw's angle; dark paired marks
 * lie on the nape. The neck is the strip's cross-section (same washes,
 * scales, shading and contours at y = ±10.8) and fades out at the back.
 */
const HALF_W = SNAKE_W / 2;
const NECK = HALF_W - 1.2;
const TIP = 19.9;
/** Where the tongue comes out: the notch under the rostral. */
export const SIDE_SNOUT = 19.2;
const P = SIDE_PAINT;
const EYE = pt(6.6, 12.5);

const JAW: Record<'open' | 'strike', JawSpec> = {
  open: { spine: [pt(-9.5, 16.2), pt(2, 23.4), pt(18, 23), pt(28.5, 13.2)], w0: 4.4, w1: 1.8 },
  strike: { spine: [pt(-6.5, 15.6), pt(6, 19.4), pt(17.5, 17.8), pt(26.5, 9.2)], w0: 4.2, w1: 1.7 },
};

const JAW_PAINT: JawPaint = {
  lip: P.lip, side: '#d2b48a', suture: '#8a6a4a', spot: '#a08060', shadow: P.shadow,
  mouth: P.mouth, mouthDeep: P.mouthDeep, throat: P.throat, chin: '#f2e8d2',
};

/** The head's upper outline, from the back of the neck to the snout's tip. */
const UPPER: Pt[] = dense([
  pt(FADE_TO - 2, -NECK),
  pt(-17.5, -NECK),
  ...cub(pt(-17.5, -NECK), pt(-12.8, -NECK - 0.2), pt(-10.8, -15.7), pt(-5.6, -16.5), 8).slice(1),
  ...cub(pt(-5.6, -16.5), pt(-1, -17.1), pt(4.6, -15.8), pt(8.6, -13.8), 8).slice(1),
  ...cub(pt(8.6, -13.8), pt(12.6, -11.8), pt(15.8, -8.7), pt(17.7, -5.4), 8).slice(1),
  ...cub(pt(17.7, -5.4), pt(19, -3.4), pt(19.8, -1.6), pt(TIP, 0), 6).slice(1),
]);

/** The horn's tip (upper side): it stands up and leans out and back. */
const HORN_TIP = pt(0.4, -17.8);

/** The supraocular horn over the eye on side s: a pointed, upturned scale, its tip reaching out past the head's edge. */
function horn(s: 1 | -1): Pt[] {
  const up = [
    ...cub(pt(8.4, -10), pt(6.4, -9.3), pt(3.4, -9.5), pt(1.4, -10.8), 6),
    ...cub(pt(1.4, -10.8), pt(0.8, -13), pt(0.5, -15.4), pt(HORN_TIP.x, HORN_TIP.y), 5).slice(1),
    ...cub(pt(HORN_TIP.x, HORN_TIP.y), pt(2.4, -15.6), pt(5.6, -12.8), pt(8.4, -10), 6).slice(1),
  ];
  return up.map((p) => pt(p.x, p.y * -s));
}

/** The stripe from behind the eye back to the jaw's angle, on side s. */
function eyeStripe(s: 1 | -1): Pt[] {
  const spine = cub(pt(3.4, 14.4 * s), pt(-1.6, 14.9 * s), pt(-6.6, 15.4 * s), pt(-11.6, 14.6 * s), 12);
  return dense(ribbon(spine, (u) => 2.9 - 1.3 * u).shape, 1);
}

/** The nape's marks: a dorsal blotch, a dark pair at the back of the head, a flank spot each side. */
function nape(): Pt[][] {
  return [
    blotchShape(-25.5, 0, 4.4, 5.2, 23400, { rough: 0.22, pow: 2.5, notch: 0.12, n: 40 }),
    blotchShape(-14.6, -4.6, 3.6, 2.2, 23410, { rough: 0.2, pow: 2.4, n: 26 }),
    blotchShape(-14.2, 4.8, 3.6, 2.3, 23420, { rough: 0.2, pow: 2.4, n: 26 }),
    blotchShape(-19.5, -8.8, 2.4, 1.6, 23430, { rough: 0.2, pow: 2.4, n: 22 }),
    blotchShape(-19, 9, 2.6, 1.7, 23440, { rough: 0.2, pow: 2.4, n: 22 }),
  ];
}

/** The small keeled scales paving the crown, row on row, each with its keel; bigger plates over the snout. */
function crownScales(d: Draw, w: Warp): void {
  const { pen } = d;
  for (let r = 0; r < 11; r++) {
    const y = -10 + r * 2;
    for (let c = 0; c < 16; c++) {
      const x = -16 + c * 2.1 + (r % 2) * 1.05;
      if (x > 13.5 - Math.abs(y) * 0.5) continue;
      const j = hash(c, r);
      const sc = scaleAt(pt(x, y), 2, 0.85, (j - 0.5) * 0.2 + y * 0.03).map(w);
      pen.hair(sc, 0.22, P.shadow, 0.22 + 0.18 * j + (y > 0 ? 0.08 : 0));
      if (j > 0.3) pen.hair([pt(x - 0.4, y + 0.1), pt(x + 0.5, y + 0.1)].map(w), 0.2, P.shadow, 0.28);
      if (j > 0.55 && y < 2) pen.hair([pt(x - 0.5, y - 0.35), pt(x + 0.3, y - 0.4)].map(w), 0.22, PAPER_FILL, 0.4);
    }
  }
  // The internasals and canthals over the snout, the rostral across its tip.
  const plates: Pt[][] = [
    cub(pt(19.3, -2.6), pt(18.2, -1.6), pt(18.2, 1.6), pt(19.3, 2.6), 6),
    [pt(18.3, 0), pt(15.6, 0)],
    cub(pt(18.4, -1.6), pt(17, -2.6), pt(15.6, -3.2), pt(14.6, -2.4), 4),
    cub(pt(18.4, 1.6), pt(17, 2.6), pt(15.6, 3.2), pt(14.6, 2.4), 4),
    cub(pt(15.8, -6.6), pt(14.2, -5.2), pt(12.8, -4.4), pt(11.2, -4.6), 4),
    cub(pt(15.8, 6.6), pt(14.2, 5.2), pt(12.8, 4.4), pt(11.2, 4.6), 4),
  ];
  for (const plate of plates) pen.hair(dense(plate, 0.6).map(w), 0.32, d.ink, 0.45);
}

/** The skin of head and neck: the back's washes, the crown a little deeper, the markings, the neck's keeled scales, light and shade. */
function skin(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { ctx } = d.pen;
  const map = (pts: readonly Pt[]): Pt[] => pts.map(w);
  clipTo(ctx, body, () => {
    ctx.fillStyle = PAPER_FILL;
    ctx.fillRect(-40, -24, 80, 48);
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = sideCrossWash(ctx, -HALF_W);
    ctx.fillRect(-40, -24, 80, 48);
    ctx.fillStyle = '#c8a982';
    ctx.fillRect(-40, HALF_W - 1, 80, 14);
    ctx.globalAlpha = 1;
    const c = w(pt(0, 0));
    glaze(ctx, c.x, c.y, 13, 9, 0, '#c4a27a', 0.3);
    const pink = w(pt(6, -3));
    glaze(ctx, pink.x, pink.y, 9, 6, 0, P.pink, 0.22);
    const lipU = w(pt(2, -15));
    glaze(ctx, lipU.x, lipU.y, 12, 2.2, -0.1, P.pale, 0.5);
    const snout = w(pt(16, 0));
    glaze(ctx, snout.x, snout.y, 4.6, 5.4, 0, P.pale, 0.35);
    pepper(ctx, -40, 62, -HALF_W, 23500, 360, false);
    for (const [i, b] of nape().entries()) paintSideBlotch(ctx, map(b), 23600 + i * 7 + d.f, d.ink, i === 0 ? 1.05 : 0.8, i === 0 ? 0.45 : 0.25);
    for (const side of [1, -1] as const) paintSideBlotch(ctx, map(eyeStripe(side)), 23700 + side + d.f, d.ink, 0.8, 0);
    clipTo(ctx, [pt(-40, -20), pt(-15, -20), pt(-15, 20), pt(-40, 20)], () => keeledScales(ctx, -40, -15, -HALF_W, 2.4, 0.5, 120));
    crownScales(d, w);
    pepper(ctx, -40, 62, -HALF_W, 23800, 200, false);
    hogModel(ctx, -40, 30, -HALF_W, P.shadow, 0.2);
    flankHatch(ctx, -40, 24, 12, -HALF_W, 23900 + d.f * 100, d.ink, 0.36, false);
    // The head's broad flat crown: shade on its far side, hatched.
    const head = dense([pt(-12, -17), pt(22, -17), pt(22, 17), pt(-12, 17)], 2).map(w);
    d.pen.crescent(head, pt(-3, -4.6), () => d.pen.fill(head, P.shadow, 0.1));
    d.pen.crescent(body, pt(-2.2, -3.4), () => d.pen.hatch(head, 1.5, 0.95, 0.3, { color: d.ink, alpha: 0.26 }));
  });
  for (const side of [1, -1]) {
    const n = w(pt(17, 4.4 * side));
    d.pen.dot(n.x, n.y, 0.65, d.ink, 0.85);
    const pit = w(pt(12.2, 11.4 * side));
    d.pen.dot(pit.x, pit.y, 0.5, d.ink, 0.6);
  }
}

/** An eye set in the side of the head: dark socket, pale buff iris, upright slit pupil, a glint. */
function eye(d: Draw, w: Warp, side: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = w(pt(EYE.x, EYE.y * side));
  const rx = 2.7;
  const ry = 2.2;
  const ball = Array.from({ length: 22 }, (_, i) => pt(c.x + Math.cos((i / 22) * Math.PI * 2) * rx, c.y + Math.sin((i / 22) * Math.PI * 2) * ry));
  pen.fill(ball.map((p) => pt(p.x + 0.5, p.y + 0.7)), d.ink, 0.35);
  pen.fill(ball.map((p) => pt(c.x + (p.x - c.x) * 1.35, c.y + (p.y - c.y) * 1.35)), P.stripe, 0.55);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.7, c.y - 0.6, 0.2, c.x, c.y, rx * 1.05);
    g.addColorStop(0, '#e6d2a4');
    g.addColorStop(0.45, '#a88a5c');
    g.addColorStop(1, '#3e2c1c');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - rx, c.y - ry, rx * 2, ry * 2);
    for (let i = 0; i < 10; i++) pen.dot(c.x + Math.cos(i * 2.4) * rx * 0.6, c.y + Math.sin(i * 2.4) * ry * 0.6, 0.22, '#7a5a36', 0.6);
    pen.fill(dense(ribbon([pt(c.x + 0.1, c.y - ry), pt(c.x + 0.2, c.y), pt(c.x + 0.1, c.y + ry)], (u) => 0.35 + 0.75 * Math.sin(Math.PI * u)).shape, 0.4), '#120a08', 1);
    pen.fill(ball.map((p) => pt(p.x + 0.4, p.y - side * ry * 1.3)), P.shadow, 0.45);
  });
  pen.stroke(closed(ball), 0.7, d.ink, 0.95, false);
  pen.dot(c.x - 0.9, c.y - 0.8, 0.5, PAPER_FILL, 0.95);
}

/** The horn over the eye on side s: pale, its upper facet lit, its far facet shaded, a ridge up it, its shadow thrown to the lower right. */
function paintHorn(d: Draw, w: Warp, s: 1 | -1): void {
  const { pen } = d;
  const shape = dense(horn(s), 0.6).map(w);
  pen.fill(shape.map((p) => pt(p.x + 1.4, p.y + 2.2)), d.ink, 0.22);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, P.horn, 0.75);
  const tip = w(pt(HORN_TIP.x + 0.4, HORN_TIP.y * -s));
  const base = w(pt(5, -10 * -s));
  pen.clipped(shape, () => {
    pen.fill(shape.map((p) => pt(p.x - 1.2, p.y - 1.6)), '#a98a62', 0.42);
    pen.hair([base, tip], 0.45, '#8a6a46', 0.55);
    pen.hair([pt(base.x - 0.6, base.y), pt(tip.x - 0.4, tip.y + s * 0.5)], 0.4, PAPER_FILL, 0.7);
    for (let i = 0; i < 18; i++) pen.dot(base.x + (hash(i, 3) - 0.5) * 6, base.y + (tip.y - base.y) * hash(i, 5), 0.18, P.fleck, 0.45);
  });
  pen.stroke(closed(shape), 0.75, d.ink, 0.9, false);
}

function drawHead(d: Draw, pose: HeadPose): void {
  const g = GAPE[pose];
  const w = warpOf(g, -7);
  const upper = UPPER.map(w);
  const body = bilateral(outward(UPPER, 0.7).map(w));
  if (g.spread > 0) {
    const j = JAW[pose === 'open' ? 'open' : 'strike'];
    duneJaws(d, JAW_PAINT, j, body);
    fangs(d, w(pt(13.4, 4.2)), pose === 'open' ? 9.5 : 10.5, '#e2b4b0');
  }
  skin(d, w, body);
  for (const side of [-1, 1] as const) eye(d, w, side);
  contour(d, upper);
  for (const side of [-1, 1] as const) paintHorn(d, w, side);
  fadeNeck(d.pen.ctx);
}

export const SIDE_HEAD: SpriteArt<HeadPose> = {
  frame: FRAME,
  res: 4,
  poses: ['shut', 'open', 'strike'],
  draw: drawHead,
};

/** The forked tongue: a rattlesnake's is black, like the hognose's. */
export const SIDE_TONGUE: SpriteArt<'flick'> = HOG_TONGUE;

