import { createRng } from '../../logic/rng';
import { cub, type Draw, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, type Pt } from '../pen';
import { flankHatch, glaze } from '../snakes/cornPaint';
import { SNAKE_W, stripLength, type SnakeArt } from '../types';
import { rgba } from '../wash';
import { dense, HALF_W, headArt, type HeadSpec, NECK, outlineOf, tongueArt, type Warp } from './jungleSnakeHead';
import { bodyClip, contours, crossWash, grain, hash, layTile, mod, modelBody, scaleRows } from './jungleSnakePaint';

/**
 * The banded krait (Bungarus fasciatus), seen from above: bold rings of
 * glossy black and sulphur yellow, as wide as each other, their edges
 * stepping scale by scale; the back ridged along the spine (a krait's body
 * is triangular in section), the row of big hexagonal scales down the
 * ridge lit on its near side, the far slope in shade. A black head with a
 * yellow chevron reaching forward over the nape, small black eyes.
 * Used for both 'banded-krait' and the bigger 'big-krait'.
 */
const PERIOD = 120;
const RINGS = 4;
const STEP = PERIOD / RINGS;
const K = {
  yellow: '#e2bd45',
  yellowLit: '#f6e294',
  yellowDeep: '#a9852a',
  black: '#1a1917',
  blackLit: '#555a66',
  shadow: '#1c160a',
  belly: '#ecd890',
} as const;
const WASH = [[0, '#f4de88'], [0.16, '#ecca5a'], [0.45, '#dcb443'], [0.75, '#b8922f'], [1, '#7d6321']] as const;

/** Ring i's black band: its two edges stepping row by row as they follow the scales. */
function ringShape(i: number): Pt[] {
  const k = mod(i, RINGS);
  const x0 = i * STEP;
  const rows = 15;
  const front: Pt[] = [];
  const back: Pt[] = [];
  for (let r = 0; r <= rows; r++) {
    const y = -1 + (r * 26) / rows;
    const step = (r % 2) * 1.25;
    front.push(pt(x0 + step + (hash(k * 7 + r, 1) - 0.5) * 1.4, y));
    back.push(pt(x0 + STEP / 2 + step + (hash(k * 7 + r, 2) - 0.5) * 1.4, y));
  }
  return [...front, ...back.reverse()];
}

function paintRing(ctx: CanvasRenderingContext2D, i: number, ink: string, boil: number): void {
  const shape = ringShape(i);
  const pen = new Pen(ctx, 51100 + mod(i, RINGS) + boil, 0.3);
  pen.fill(shape, K.black, 0.95);
  pen.clipped(shape, () => {
    glaze(ctx, i * STEP + STEP / 4, 6, STEP / 3, 3, 0, K.blackLit, 0.5);
    glaze(ctx, i * STEP + STEP / 4, 19, STEP / 3, 4, 0, '#000000', 0.4);
  });
  pen.hair(shape.slice(0, 16), 0.3, ink, 0.3);
}

function yellowGlazes(ctx: CanvasRenderingContext2D, i: number): void {
  const k = mod(i, RINGS);
  const rng = createRng(51200 + k * 11);
  const x = i * STEP + STEP * 0.75;
  glaze(ctx, x + (rng() - 0.5) * 2, 6 + rng() * 2, 6, 3.4, 0, K.yellowLit, 0.45);
  glaze(ctx, x + (rng() - 0.5) * 3, 18, 6, 4, 0, K.yellowDeep, 0.3);
}

/** The ridge down the spine: a row of big hexagonal scales, lit along its near slope, the far slope stepping into shade. */
function ridge(ctx: CanvasRenderingContext2D, ink: string): void {
  ctx.save();
  const g = ctx.createLinearGradient(0, 11.2, 0, 13.2);
  g.addColorStop(0, rgba(K.shadow, 0));
  g.addColorStop(1, rgba(K.shadow, 0.16));
  ctx.fillStyle = g;
  ctx.fillRect(-2, 11.2, PERIOD + 4, SNAKE_W - 11.2);
  const len = 3;
  const hex = new Path2D();
  for (let x = -len; x <= PERIOD + len; x += len) {
    hex.moveTo(x - len * 0.5, 12);
    hex.lineTo(x - len * 0.25, 10.6);
    hex.lineTo(x + len * 0.25, 10.6);
    hex.lineTo(x + len * 0.5, 12);
    hex.lineTo(x + len * 0.25, 13.4);
    hex.lineTo(x - len * 0.25, 13.4);
    hex.closePath();
  }
  ctx.lineWidth = 0.3;
  ctx.strokeStyle = rgba(ink, 0.35);
  ctx.stroke(hex);
  ctx.fillStyle = rgba(PAPER_FILL, 0.12);
  ctx.fillRect(-2, 10.6, PERIOD + 4, 1.2);
  ctx.restore();
}

export function paintKraitTile(ctx: CanvasRenderingContext2D, ink: string, f: number): void {
  const boil = f * 1000;
  bodyClip(ctx, 0, PERIOD, crossWash(ctx, 0, WASH), () => {
    for (let i = -1; i <= RINGS; i++) yellowGlazes(ctx, i);
    grain(ctx, 0, PERIOD, 0, 51300, 220, true, K.yellowDeep);
    for (let i = -1; i <= RINGS; i++) paintRing(ctx, i, ink, boil);
    scaleRows(ctx, 0, PERIOD, 0, { rows: 15, len: 3, period: PERIOD, edge: K.shadow, alpha: 0.55, gloss: 0.6, heart: 0.05 });
    ridge(ctx, ink);
    modelBody(ctx, 0, PERIOD, 0, K.shadow, 0.32);
    flankHatch(ctx, 0, PERIOD, 60, 0, 51400 + boil, ink, 0.36, true);
  });
  contours(ctx, PERIOD, ink, 51500 + boil);
}

const UPPER = outlineOf(-15, [
  [pt(-11.5, -NECK - 0.2), pt(-9.5, -12.6), pt(-4.5, -12.9)],
  [pt(1, -13.2), pt(7, -12.4), pt(11.5, -10.3)],
  [pt(15.2, -8.4), pt(18.4, -6.3), pt(20.3, -4)],
  [pt(21.3, -2.6), pt(21.7, -1.3), pt(21.7, 0)],
]);

const PLATES: readonly (readonly Pt[])[] = [
  cub(pt(21.2, -2.8), pt(20, -2.3), pt(19.3, -1.2), pt(19.2, 0), 4),
  [pt(19.2, 0), pt(16.6, 0)],
  cub(pt(19.6, -2), pt(18.1, -3), pt(17.2, -4.3), pt(16.9, -6.2), 4),
  [pt(16.6, 0), pt(12.6, 0)],
  cub(pt(12.6, 0), pt(12.8, -3), pt(13.2, -5.8), pt(13.8, -8.5), 4),
  cub(pt(12.6, -2.9), pt(7.6, -3.5), pt(3, -3), pt(-1.4, 0), 6),
  cub(pt(13.8, -8.5), pt(9.8, -10.1), pt(4.4, -10.5), pt(0.8, -9.5), 6),
  cub(pt(3, -3), pt(2, -5.6), pt(1.4, -7.8), pt(0.8, -9.5), 4),
  [pt(-1.4, 0), pt(-11.6, 0)],
  cub(pt(0.8, -9.5), pt(-4, -10), pt(-9.6, -7.4), pt(-11.6, 0), 6),
  [pt(0.8, -9.5), pt(-1.4, -11.4)],
];

/** The yellow chevron over the nape, its point reaching forward towards the eyes, its arms running back down the neck's sides. */
function chevron(): Pt[] {
  const spine = [...cub(pt(-19, -11.6), pt(-13, -9.8), pt(-6.5, -5), pt(-3.6, 0), 10), ...cub(pt(-3.6, 0), pt(-6.5, 5), pt(-13, 9.8), pt(-19, 11.6), 10).slice(1)];
  return ribbon(spine, (u) => 3.4 + 1.6 * Math.abs(u - 0.5)).shape;
}

function skin(d: Draw, w: Warp): void {
  const { pen } = d;
  const { ctx } = pen;
  ctx.fillStyle = K.black;
  ctx.fillRect(-40, -20, 80, 40);
  const g = crossWash(ctx, -HALF_W, [[0, rgba(K.blackLit, 0.55)], [0.3, rgba(K.blackLit, 0.18)], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.4)']]);
  ctx.fillStyle = g;
  ctx.fillRect(-40, -20, 80, 40);
  const shape = chevron().map(w);
  pen.fill(shape, K.yellow, 0.95);
  pen.clipped(shape, () => {
    const c = w(pt(-10, -6));
    glaze(ctx, c.x, c.y, 7, 3, 0, K.yellowLit, 0.5);
    const e = w(pt(-10, 7));
    glaze(ctx, e.x, e.y, 8, 4, 0, K.yellowDeep, 0.5);
  });
  pen.hair(shape, 0.3, d.ink, 0.4);
  // Pale yellowish lip scales showing at the snout's sides.
  for (const s of [1, -1] as const) {
    const lip = ribbon(cub(pt(4, 13 * s), pt(11, 11.6 * s), pt(16.5, 8.6 * s), pt(20.6, 3.6 * s), 14), (u) => 1.8 - 0.7 * u).shape.map(w);
    pen.fill(lip, K.belly, s > 0 ? 0.35 : 0.55);
  }
  const gl = w(pt(2, -5));
  glaze(ctx, gl.x, gl.y, 10, 2.2, 0.05, PAPER_FILL, 0.3);
}

const SPEC: HeadSpec = {
  upper: UPPER,
  period: PERIOD,
  tile: paintKraitTile,
  crownFrom: -17,
  skin,
  plates: PLATES.map((p) => dense(p, 0.8)),
  plateInk: '#050404',
  plateLight: '#7d8290',
  eye: { x: 6.2, y: 12, rx: 2.3, ry: 2, iris: ['#4c4038', '#1c1612', '#060505'], pupil: 0.95 },
  nostril: pt(18.6, 4.1),
  shadow: '#000000',
  jaw: {
    open: { spine: [pt(-7, 12.8), pt(4, 19.6), pt(19, 20.4), pt(30, 12.4)], w0: 3.9, w1: 1.6 },
    strike: { spine: [pt(-4.5, 12.4), pt(7, 15.8), pt(18, 15.2), pt(27, 8)], w0: 3.7, w1: 1.5 },
  },
  mouth: {
    lip: K.belly, side: K.black, mottle: '#6a6450', mouth: '#efd0c6', mouthDeep: '#b67c7e', throat: '#3e1a20',
    chin: '#f0e2b0', shadow: K.shadow, every: 0,
  },
};

function drawStrip(d: Draw, length: number): void {
  layTile(d.pen.ctx, PERIOD, length, (tile) => paintKraitTile(tile, d.ink, d.f));
}

export const KRAIT_ART: SnakeArt = {
  period: PERIOD,
  drawStrip: (d, length) => drawStrip(d, Math.min(length, stripLength(PERIOD))),
  head: headArt(SPEC),
  tongue: tongueArt('#3a3436', '#100c0e', '#a49aa0'),
  snout: 21,
  colours: { base: K.yellow, mark: K.black, belly: K.belly },
};
