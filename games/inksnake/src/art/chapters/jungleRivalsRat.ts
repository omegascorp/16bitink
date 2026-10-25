import { createRng } from '../../logic/rng';
import { cub, type Draw, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, type Pt } from '../pen';
import { flankHatch, glaze } from '../snakes/cornPaint';
import { stripLength, type SnakeArt } from '../types';
import { dense, HALF_W, headArt, NECK, type HeadSpec, outlineOf, tongueArt, type Warp } from './jungleSnakeHead';
import { bodyClip, contours, crossWash, grain, hash, layTile, mod, modelBody, scaleRows } from './jungleSnakePaint';

/**
 * The Indian rat snake (Ptyas mucosa), seen from above: slim and quick, a
 * glossy olive-brown back, yellower low on the flanks, crossed by broken
 * dark bars where scales are edged in black (the rat snake's bars, bold
 * towards its tail); a long head, quite distinct from the neck, with huge
 * dark eyes and pale lips barred with black.
 */
const PERIOD = 120;
const BARS = 6;
const STEP = PERIOD / BARS;
const P = {
  ground: '#8f7a48',
  warm: '#a88d52',
  yellow: '#c9ad62',
  deep: '#4f3f22',
  shadow: '#2a2010',
  bar: '#1d160c',
  belly: '#e8dca0',
} as const;
const WASH = [[0, '#a8965e'], [0.16, '#8c7b4a'], [0.45, '#6e5f38'], [0.78, '#52452a'], [1, '#382f1a']] as const;

/** Bar i's black-edged scales: short dark ticks scattered along a slanting line across the back, more of them low on the flanks. */
function bar(ctx: CanvasRenderingContext2D, i: number, ink: string, boil: number): void {
  const k = mod(i, BARS);
  const rng = createRng(41100 + k * 13);
  const x0 = i * STEP + STEP / 2 + (rng() - 0.5) * 4;
  const slant = (rng() - 0.5) * 3;
  const pen = new Pen(ctx, 41200 + k + boil, 0.25);
  glaze(ctx, x0, 12, 3.2, 12, 0, P.deep, 0.35);
  for (let r = 0; r < 15; r++) {
    const y = 1.6 + r * 1.48;
    if (hash(k * 31 + r, 5) < 0.22 + 0.25 * Math.abs(r - 5) / 10) continue;
    const x = x0 + slant * ((y - 12) / 12) + (hash(k, r) - 0.5) * 2.4 + (r % 2) * 1.2;
    const scale: Pt[] = [pt(x - 1.1, y - 0.65), pt(x + 0.9, y - 0.6), pt(x + 1.4, y), pt(x + 0.9, y + 0.6), pt(x - 1.1, y + 0.65)];
    pen.fill(scale, P.bar, 0.22 + 0.3 * hash(r, k + 2));
    pen.hair([pt(x + 0.6, y - 0.66), pt(x + 1.5, y), pt(x + 0.6, y + 0.66)], 0.55, P.bar, 0.85);
    if (hash(r + 9, k) > 0.55) pen.hair([pt(x + 3, y - 0.6), pt(x + 3.8, y), pt(x + 3, y + 0.6)], 0.45, P.bar, 0.6);
  }
  pen.hair([pt(x0 - slant, 2), pt(x0 + slant, 22)], 0.25, ink, 0.18);
}

function groundGlazes(ctx: CanvasRenderingContext2D, i: number): void {
  const k = mod(i, BARS);
  const rng = createRng(41300 + k * 11);
  const x = i * STEP;
  glaze(ctx, x + (rng() - 0.5) * 4, 7 + rng() * 2, 8, 3.5, 0, P.warm, 0.4);
  glaze(ctx, x + (rng() - 0.5) * 6, 19.5, 9, 2.6, 0, P.yellow, 0.35);
  glaze(ctx, x + STEP / 2, 14 + rng() * 2, 6, 4, 0, '#7a6438', 0.25);
}

export function paintRatTile(ctx: CanvasRenderingContext2D, ink: string, f: number): void {
  const boil = f * 1000;
  bodyClip(ctx, 0, PERIOD, crossWash(ctx, 0, WASH), () => {
    for (let i = -1; i <= BARS; i++) groundGlazes(ctx, i);
    grain(ctx, 0, PERIOD, 0, 41400, 280, true, P.deep);
    for (let i = -1; i <= BARS; i++) bar(ctx, i, ink, boil);
    scaleRows(ctx, 0, PERIOD, 0, { rows: 15, len: 2.4, period: PERIOD, edge: P.shadow, alpha: 0.6, gloss: 0.5, heart: 0.06 });
    modelBody(ctx, 0, PERIOD, 0, P.shadow, 0.3);
    flankHatch(ctx, 0, PERIOD, 60, 0, 41500 + boil, ink, 0.36, true);
  });
  contours(ctx, PERIOD, ink, 41600 + boil);
}

const UPPER = outlineOf(-15, [
  [pt(-11.5, -NECK - 0.1), pt(-9.5, -12.4), pt(-4.5, -12.7)],
  [pt(1, -13), pt(7, -12.2), pt(11.5, -10)],
  [pt(15.2, -8.2), pt(18.4, -6), pt(20.4, -3.8)],
  [pt(21.4, -2.4), pt(21.8, -1.2), pt(21.8, 0)],
]);

const PLATES: readonly (readonly Pt[])[] = [
  cub(pt(21.3, -2.6), pt(20, -2.2), pt(19.4, -1.2), pt(19.3, 0), 4),
  [pt(19.3, 0), pt(16.6, 0)],
  cub(pt(19.6, -2), pt(18, -3), pt(17.2, -4.4), pt(17, -6), 4),
  [pt(16.6, 0), pt(12.4, 0)],
  cub(pt(12.4, 0), pt(12.8, -3), pt(13.2, -5.6), pt(13.8, -8.2), 4),
  cub(pt(12.4, -2.8), pt(7.4, -3.4), pt(2.4, -3), pt(-3.8, 0), 6),
  cub(pt(13.8, -8.2), pt(10, -9.8), pt(4.6, -10.2), pt(1, -9.2), 6),
  cub(pt(2.4, -3), pt(1.8, -5.6), pt(1.4, -7.6), pt(1, -9.2), 4),
  [pt(-3.8, 0), pt(-12.2, 0)],
  cub(pt(1, -9.2), pt(-4.4, -9.4), pt(-10.4, -6.8), pt(-12.2, 0), 6),
];

/** The lips: pale cream along the head's edges, each scale's suture barred black. */
function lips(d: Draw, w: Warp): void {
  const { pen } = d;
  for (const s of [1, -1] as const) {
    const spine = cub(pt(-8, 12.4 * s), pt(2, 13.4 * s), pt(13, 11.2 * s), pt(20.4, 4 * s), 18);
    const r = ribbon(spine, (u) => 2.2 - 1 * u);
    pen.fill(r.shape.map(w), P.belly, s > 0 ? 0.45 : 0.7);
    for (let i = 2; i < spine.length - 1; i += 2) pen.hair([r.top[i]!, r.bot[i]!].map(w), 0.45, P.bar, 0.7);
  }
}

function skin(d: Draw, w: Warp): void {
  const { ctx } = d.pen;
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = crossWash(ctx, -HALF_W, WASH);
  ctx.fillRect(-40, -20, 80, 40);
  ctx.globalAlpha = 1;
  const c = w(pt(3, 0));
  glaze(ctx, c.x, c.y - 1, 13, 8, 0, '#7e6a3c', 0.35);
  const s = w(pt(16, 0));
  glaze(ctx, s.x, s.y - 1, 5, 4, 0, '#b39c64', 0.35);
  lips(d, w);
  const gl = w(pt(-3, -4.6));
  glaze(ctx, gl.x, gl.y, 8, 1.8, 0.05, PAPER_FILL, 0.25);
  const shade = w(pt(-6, 7));
  glaze(ctx, shade.x, shade.y, 9, 4, 0, P.shadow, 0.15);
}

const SPEC: HeadSpec = {
  upper: UPPER,
  period: PERIOD,
  tile: paintRatTile,
  crownFrom: -15.5,
  skin,
  plates: PLATES.map((p) => dense(p, 0.8)),
  plateInk: '#2e2410',
  plateLight: '#d6c48e',
  // The rat snake's huge eyes.
  eye: { x: 6, y: 11.6, rx: 3.7, ry: 3.1, iris: ['#9a7a3c', '#4a3416', '#120c06'], pupil: 1.6 },
  nostril: pt(18.4, 4),
  shadow: P.shadow,
  jaw: {
    open: { spine: [pt(-7, 12.6), pt(4, 19.6), pt(19, 20.4), pt(30, 12.4)], w0: 3.8, w1: 1.6 },
    strike: { spine: [pt(-4.5, 12.2), pt(7, 15.8), pt(18, 15.2), pt(27, 8)], w0: 3.6, w1: 1.5 },
  },
  mouth: {
    lip: P.belly, side: P.ground, mottle: P.bar, mouth: '#efc8c0', mouthDeep: '#b8767c', throat: '#4e1c24',
    chin: '#efe4bc', shadow: P.shadow, every: 0, barred: true,
  },
};

function drawStrip(d: Draw, length: number): void {
  layTile(d.pen.ctx, PERIOD, length, (tile) => paintRatTile(tile, d.ink, d.f));
}

export const RATSNAKE_ART: SnakeArt = {
  period: PERIOD,
  drawStrip: (d, length) => drawStrip(d, Math.min(length, stripLength(PERIOD))),
  head: headArt(SPEC),
  tongue: tongueArt('#3a3236', '#120e10', '#a89aa2'),
  snout: 21,
  colours: { base: P.ground, mark: P.bar, belly: P.belly },
};
