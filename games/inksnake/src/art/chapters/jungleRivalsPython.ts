import { createRng } from '../../logic/rng';
import { cub, type Draw, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { blotchShape, flankHatch, glaze } from '../snakes/cornPaint';
import { stripLength, type SnakeArt } from '../types';
import { rgba } from '../wash';
import { dense, HALF_W, headArt, type HeadSpec, NECK, outlineOf, tongueArt, type Warp } from './jungleSnakeHead';
import { type BlotchPaint, bodyClip, contours, crossWash, grain, layTile, mod, modelBody, paintBlotch, scaleRows } from './jungleSnakePaint';

/**
 * The Indian rock python (Python molurus), seen from above: heavy, a pale
 * buff ground of small glossy scales carrying a chain of big, squarish
 * brown blotches down the back, each paler in its heart and edged in dark
 * umber, smaller blotches with pale centres along the flanks between them;
 * a long head with a pinkish-brown arrowhead on the crown, a dark stripe
 * through each eye, heat pits along the lips, slit-pupilled eyes.
 */
const PERIOD = 120;
const SADDLES = 3;
const STEP = PERIOD / SADDLES;
const Y = {
  buff: '#d3bd8e',
  pale: '#efe2b8',
  deep: '#7d6442',
  shadow: '#33230f',
  edge: '#4a3820',
  belly: '#ece0bc',
} as const;
const WASH = [[0, '#ebdcb2'], [0.16, '#dcc596'], [0.45, '#c6ab7a'], [0.75, '#a1865a'], [1, '#6f5a3a']] as const;
const SADDLE: BlotchPaint = { body: '#7d5735', lit: '#a37b4a', deep: '#3a2412', rim: '#22140a', halo: Y.pale, haloAlpha: 0.45 };
const FLANK: BlotchPaint = { body: '#7a5634', lit: '#c0a070', deep: '#33200f', rim: '#22140a' };

function saddle(i: number): Pt[] {
  const k = mod(i, SADDLES);
  const rng = createRng(61100 + k * 17);
  const cx = i * STEP + STEP / 2 + (rng() - 0.5) * 3;
  return blotchShape(cx, 12 + (rng() - 0.5) * 1.2, 12.5 + rng() * 2, 8.6 + rng() * 0.8, 61200 + k, { rough: 0.2, pow: 2.5, notch: 0.12, lobe: 0.16, n: 56 });
}

function flanks(i: number): Pt[][] {
  const k = mod(i, SADDLES);
  const rng = createRng(61300 + k * 13);
  const x = i * STEP + (rng() - 0.5) * 3;
  return [
    blotchShape(x, 2.2, 6 + rng() * 1.5, 2.8, 61400 + k, { rough: 0.18, pow: 2.3, n: 28 }),
    blotchShape(x + (rng() - 0.5) * 3, 21.8, 6.4 + rng() * 1.5, 3, 61500 + k, { rough: 0.18, pow: 2.3, n: 28 }),
  ];
}

function groundGlazes(ctx: CanvasRenderingContext2D, i: number): void {
  const k = mod(i, SADDLES);
  const rng = createRng(61600 + k * 11);
  const x = i * STEP;
  glaze(ctx, x + (rng() - 0.5) * 4, 10 + rng() * 2, 6, 6, 0, Y.pale, 0.4);
  glaze(ctx, x + STEP / 2 + (rng() - 0.5) * 6, 20, 12, 3, 0, Y.deep, 0.22);
}

export function paintPythonTile(ctx: CanvasRenderingContext2D, ink: string, f: number): void {
  const boil = f * 1000;
  bodyClip(ctx, 0, PERIOD, crossWash(ctx, 0, WASH), () => {
    for (let i = -1; i <= SADDLES; i++) groundGlazes(ctx, i);
    grain(ctx, 0, PERIOD, 0, 61700, 320, true, Y.deep);
    for (let i = -1; i <= SADDLES; i++) {
      for (const [j, b] of flanks(i).entries()) {
        paintBlotch(ctx, b, 61800 + mod(i, SADDLES) * 3 + j + boil, ink, FLANK, 0.8, 0.9);
        const c = b.reduce((a, p) => pt(a.x + p.x / b.length, a.y + p.y / b.length), pt(0, 0));
        glaze(ctx, c.x, c.y, 2.6, 1.1, 0, Y.pale, 0.75);
      }
    }
    for (let i = -1; i <= SADDLES; i++) {
      const b = saddle(i);
      paintBlotch(ctx, b, 61900 + mod(i, SADDLES) + boil, ink, SADDLE, 1.2);
      // Each saddle's heart a paler, warmer brown, as the rock python's are.
      const rng = createRng(62050 + mod(i, SADDLES));
      const cx = i * STEP + STEP / 2 + (rng() - 0.5) * 3;
      glaze(ctx, cx, 11.4, 8.5, 4.6, 0, '#b48c5c', 0.55);
      glaze(ctx, cx + 1, 10.6, 4, 2, 0, '#c8a474', 0.4);
    }
    scaleRows(ctx, 0, PERIOD, 0, { rows: 29, len: 1.5, period: PERIOD, edge: Y.edge, alpha: 0.38, gloss: 0.4, heart: 0.05 });
    modelBody(ctx, 0, PERIOD, 0, Y.shadow, 0.28);
    flankHatch(ctx, 0, PERIOD, 60, 0, 62000 + boil, ink, 0.36, true);
  });
  contours(ctx, PERIOD, ink, 62100 + boil);
}

const UPPER = outlineOf(-14.5, [
  [pt(-11, -NECK - 0.2), pt(-8.5, -13.2), pt(-3, -13.5)],
  [pt(2, -13.7), pt(8, -12), pt(12.5, -9.4)],
  [pt(16.5, -7.2), pt(20, -4.8), pt(22.4, -3)],
  [pt(23.4, -2.1), pt(23.8, -1.1), pt(23.8, 0)],
]);

const PLATES: readonly (readonly Pt[])[] = [
  cub(pt(23.4, -2.4), pt(22, -2.1), pt(21.4, -1.1), pt(21.3, 0), 4),
  [pt(21.3, 0), pt(18.6, 0)],
  cub(pt(21.8, -2), pt(20, -3.2), pt(19.2, -4.2), pt(18.8, -5.4), 4),
  [pt(18.6, 0), pt(14.4, 0)],
  cub(pt(14.4, 0), pt(14.8, -2.4), pt(15.4, -4.4), pt(16.2, -6.4), 4),
  cub(pt(13.4, -9.4), pt(9.6, -10.8), pt(5, -11.2), pt(2.2, -10.4), 6),
];

/** The arrowhead on the crown: its point at the snout, its barbs back over the nape. */
function arrowhead(): Pt[] {
  const upper = [
    pt(21, 0),
    ...cub(pt(21, 0), pt(14, -2.2), pt(4, -4.6), pt(-6, -7), 10).slice(1),
    ...cub(pt(-6, -7), pt(-10, -8), pt(-14.6, -7.8), pt(-15.2, -6), 6).slice(1),
    ...cub(pt(-15.2, -6), pt(-13.4, -4.2), pt(-12, -2), pt(-13.4, 0), 6).slice(1),
  ];
  return dense([...upper, ...upper.slice(1, -1).reverse().map((p) => pt(p.x, -p.y))], 0.8);
}

/** The small scales of the crown behind the big front plates: a fine mesh of tiny arcs. */
function crownScales(d: Draw, w: Warp): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineWidth = 0.22;
  ctx.strokeStyle = rgba(Y.shadow, 0.35);
  ctx.beginPath();
  for (let x = -14; x < 13; x += 1.6) {
    for (let y = -11; y <= 11; y += 1.5) {
      const o = (Math.round(x / 1.6) % 2) * 0.75;
      const p = w(pt(x, y + o));
      ctx.moveTo(p.x - 0.5, p.y - 0.6);
      ctx.quadraticCurveTo(p.x + 0.6, p.y, p.x - 0.5, p.y + 0.6);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function skin(d: Draw, w: Warp): void {
  const { pen } = d;
  const { ctx } = pen;
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = crossWash(ctx, -HALF_W, WASH);
  ctx.fillRect(-40, -20, 80, 40);
  ctx.globalAlpha = 1;
  const c = w(pt(4, 0));
  glaze(ctx, c.x, c.y, 14, 9, 0, '#c9ad7c', 0.4);
  for (const s of [1, -1] as const) {
    const stripe = ribbon(cub(pt(19, 5.2 * s), pt(11, 9.8 * s), pt(0, 12.4 * s), pt(-12, 12.6 * s), 16), (u) => 1.8 + 1.8 * u).shape.map(w);
    paintBlotch(ctx, stripe, 62200 + s + d.f, d.ink, { body: '#5a3a22', lit: '#7a5434', deep: '#2a180c', rim: '#1a0f08' }, 0.6, 0.88);
  }
  paintBlotch(ctx, arrowhead().map(w), 62300 + d.f, d.ink, { body: '#9e6e52', lit: '#c09070', deep: '#5a3020', rim: '#2e180e', halo: Y.pale, haloAlpha: 0.3 }, 0.9, 0.85);
  crownScales(d, w);
  // The heat pits along the front of the lips.
  for (const s of [1, -1] as const) {
    for (const [x, y] of [[22.4, 2.6], [21.2, 3.9], [19.8, 5]] as const) {
      const p = w(pt(x, y * s));
      pen.dot(p.x, p.y, 0.42, Y.shadow, 0.75);
    }
  }
  const gl = w(pt(-2, -5));
  glaze(ctx, gl.x, gl.y, 9, 2, 0.05, PAPER_FILL, 0.25);
}

const SPEC: HeadSpec = {
  upper: UPPER,
  period: PERIOD,
  tile: paintPythonTile,
  crownFrom: -16,
  skin,
  plates: PLATES.map((p) => dense(p, 0.8)),
  plateInk: '#3a2614',
  plateLight: '#f2e4c0',
  eye: { x: 7, y: 11.6, rx: 2.7, ry: 2.3, iris: ['#d8b476', '#8e6a38', '#2e2012'], slit: true, pupil: 1.05 },
  nostril: pt(20.6, 3.4),
  shadow: Y.shadow,
  jaw: {
    open: { spine: [pt(-7, 13.2), pt(4, 20.4), pt(20, 21.4), pt(32, 13.2)], w0: 4.2, w1: 1.8 },
    strike: { spine: [pt(-4.5, 12.8), pt(7, 16.4), pt(19.5, 15.8), pt(29.5, 8.6)], w0: 4, w1: 1.7 },
  },
  mouth: {
    lip: Y.belly, side: Y.buff, mottle: Y.deep, mouth: '#f0d0c6', mouthDeep: '#bb7e7e', throat: '#4a1e22',
    chin: '#f0e4c2', shadow: Y.shadow, every: 2,
  },
};

function drawStrip(d: Draw, length: number): void {
  layTile(d.pen.ctx, PERIOD, length, (tile) => paintPythonTile(tile, d.ink, d.f));
}

export const PYTHON_ART: SnakeArt = {
  period: PERIOD,
  drawStrip: (d, length) => drawStrip(d, Math.min(length, stripLength(PERIOD))),
  head: headArt(SPEC),
  tongue: tongueArt('#3a3236', '#120e10', '#a89aa2'),
  snout: 23,
  colours: { base: Y.buff, mark: SADDLE.body, belly: Y.belly },
};
