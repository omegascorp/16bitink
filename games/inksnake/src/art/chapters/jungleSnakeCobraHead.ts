import { cub, type Draw, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { COBRA_PAINT, COBRA_PERIOD, COBRA_WASH, paintCobraTile } from './jungleSnakeCobra';
import { dense, HALF_W, headArt, type HeadSpec, outlineOf, tongueArt, type Warp } from './jungleSnakeHead';
import { crossWash } from './jungleSnakePaint';

/**
 * The king cobra's head from above, facing +x: big, long and flat, only a
 * little wider than the neck at the temples, the snout broad and rounded.
 * Its crown is a mosaic of large shields drawn in fine line, each groove
 * catching light on its far lip: rostral, internasals, prefrontals, the
 * frontal, the supraoculars over the eyes, the big parietals and, behind
 * them, the two large occipitals no other cobra has. The head is olive,
 * a little warmer than the neck, the lips pale yellowish; bronze eyes.
 */
const C = COBRA_PAINT;
const TIP = 23.4;
export const COBRA_SNOUT = 22.6;

const UPPER = outlineOf(-17.5, [
  [pt(-13.5, -10.9), pt(-11, -13.4), pt(-5, -13.9)],
  [pt(1, -14.3), pt(7, -13.4), pt(12, -11.2)],
  [pt(16, -9.4), pt(19.6, -7.2), pt(21.7, -4.6)],
  [pt(22.8, -3.1), pt(TIP, -1.5), pt(TIP, 0)],
]);

/** The crown's shields as hairlines (upper half; mirrored). */
const PLATES: readonly (readonly Pt[])[] = [
  // Rostral and internasals.
  cub(pt(22.7, -3.2), pt(21.6, -2.6), pt(20.9, -1.4), pt(20.8, 0), 4),
  [pt(20.8, 0), pt(18, 0)],
  cub(pt(21.2, -2.2), pt(19.6, -3.2), pt(18.6, -4.4), pt(18.2, -6.6), 4),
  [pt(18, 0), pt(18.2, -4.4)],
  // Prefrontals and the frontal shield.
  [pt(18, 0), pt(13.6, 0)],
  cub(pt(13.6, 0), pt(13.8, -3), pt(14.2, -6), pt(14.8, -9), 4),
  cub(pt(13.6, -3.1), pt(8, -3.8), pt(3, -3.2), pt(-1.4, 0), 6),
  // The supraocular's rim over the eye, and its back edge.
  cub(pt(14.8, -9), pt(10.4, -10.9), pt(4.4, -11.4), pt(0.4, -10.2), 6),
  cub(pt(3.2, -3.3), pt(2.2, -6), pt(1.2, -8.4), pt(0.4, -10.2), 4),
  // The parietals.
  [pt(-1.4, 0), pt(-10.8, 0)],
  cub(pt(0.4, -10.2), pt(-4, -10.8), pt(-8.6, -8.6), pt(-10.8, -4.2), 6),
  [pt(-10.8, -4.2), pt(-10.8, 0)],
  // The two big occipitals behind them.
  [pt(-10.8, 0), pt(-17.4, 0)],
  cub(pt(-9.6, -6.6), pt(-12.6, -8), pt(-16.2, -6.6), pt(-17.4, 0), 6),
  // Postoculars, temporals, and the lip scales along the edge.
  [pt(0.4, -10.2), pt(-1.8, -12)],
  [pt(-5, -11.2), pt(-6, -13.2)],
  [pt(12.6, -10.7), pt(11.6, -9.7)],
  [pt(16.3, -8.7), pt(15.3, -7.7)],
  [pt(19.5, -6.2), pt(18.5, -5.3)],
  [pt(-9.4, -10.4), pt(-10.8, -12.4)],
];

/** The pale yellowish lip line along the head's sides, seen just over the edge from above. */
function lips(d: Draw, w: Warp): void {
  const { pen } = d;
  for (const s of [1, -1] as const) {
    const spine = cub(pt(-9, 13.4 * s), pt(2, 14.6 * s), pt(14, 12.4 * s), pt(21.6, 4.4 * s), 18);
    const shape = ribbon(spine, (u) => 2.4 - 1.2 * u).shape.map(w);
    pen.fill(shape, C.band, s > 0 ? 0.5 : 0.72);
  }
}

/** The head's own skin: the back's olive, the crown a little warmer and smoother, the snout greyer, pale lips. */
function skin(d: Draw, w: Warp): void {
  const { ctx } = d.pen;
  ctx.globalAlpha = 0.96;
  ctx.fillStyle = crossWash(ctx, -HALF_W, COBRA_WASH);
  ctx.fillRect(-40, -20, 80, 40);
  ctx.globalAlpha = 1;
  const c = w(pt(2, 0));
  glaze(ctx, c.x, c.y - 1, 14, 9, 0, '#7a6f3e', 0.4);
  const s = w(pt(17, 0));
  glaze(ctx, s.x, s.y - 1, 6, 5, 0, '#8d8660', 0.35);
  const back = w(pt(-12, 0));
  glaze(ctx, back.x, back.y, 7, 6, 0, C.deep, 0.22);
  lips(d, w);
  // Each shield's face a slightly different olive, as wash dries unevenly.
  for (const [x, y, rx, ry, col, a] of [[-6, -5.4, 4, 3, '#857c48', 0.3], [-14, -3.6, 3, 2.6, '#6a6338', 0.3], [8, -7.6, 4, 2, '#8a8150', 0.32], [16, -2.4, 2.4, 1.6, '#9a9264', 0.3]] as const) {
    for (const side of [1, -1]) {
      const p = w(pt(x, y * side));
      glaze(ctx, p.x, p.y, rx, ry, 0, col, a * (side < 0 ? 1 : 0.6));
    }
  }
  // The gloss of a big smooth head, catching the light along the crown.
  const gl = w(pt(-4, -5));
  glaze(ctx, gl.x, gl.y, 9, 2, 0.05, PAPER_FILL, 0.22);
}

const SPEC: HeadSpec = {
  upper: UPPER,
  period: COBRA_PERIOD,
  tile: paintCobraTile,
  crownFrom: -18.5,
  skin,
  plates: PLATES.map((p) => dense(p, 0.8)),
  plateInk: '#1c1a10',
  plateLight: '#c8bd86',
  eye: { x: 5.2, y: 12.5, rx: 3.1, ry: 2.6, iris: ['#d0a858', '#7c5826', '#23170b'], pupil: 1.15 },
  nostril: pt(19.8, 4.4),
  shadow: C.shadow,
  jaw: {
    open: { spine: [pt(-8, 13.8), pt(3, 21), pt(20, 22), pt(31.5, 13.8)], w0: 4.4, w1: 1.9 },
    strike: { spine: [pt(-5, 13.4), pt(7, 17.2), pt(19.5, 16.6), pt(29, 9)], w0: 4.1, w1: 1.8 },
  },
  mouth: {
    lip: '#ecdfa8', side: C.ground, mottle: '#8a8160', mouth: '#f0d8cc', mouthDeep: '#b98a84', throat: '#4a2a24',
    chin: '#efe2b2', shadow: C.shadow, every: 0,
  },
};

export const COBRA_HEAD_SPEC = SPEC;
export const COBRA_HEAD = headArt(SPEC);
export const COBRA_TONGUE = tongueArt('#2e2c33', '#0e0d11', '#a3a2b0');
