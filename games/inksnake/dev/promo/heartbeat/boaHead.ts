import { createRng } from '../../../src/logic/rng';
import { closed, cub, type Draw, oval, pt, ribbon } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';

/**
 * The boa constrictor's head from the side, facing +x: the long tan wedge of
 * the species, its crown dark along the top, the broad dark stripe running
 * from the nostril through the eye and widening back to the jaw's corner, a
 * pale band over it, small irregular head scales (no big plates), pale lips
 * barred in brown and a silver-gold eye with a vertical pupil. Two sprites,
 * each hinged at its origin.
 */
export const JAW_ART = 45.5;

const P = {
  ground: '#cdb68c', pale: '#ecdcb8', stripe: '#3b2418', stripeLit: '#6d4a30', rust: '#a2593a', shadow: '#4a3324',
  cream: '#f0e4c6', rim: '#22140e', iris: '#c9a24e', irisDeep: '#5b3d1c', pupil: '#0e0a08',
} as const;

export type EyeState = 'open' | 'squeeze';

const lip = (y0: number, y1: number, n = 26): Pt[] => Array.from({ length: n + 1 }, (_, i) => pt(-2 + (i / n) * 46, y0 + (y1 - y0) * (i / n)));

function eye(d: Draw, c: Pt, state: EyeState): void {
  const { pen } = d;
  const { ctx } = pen;
  const r = 3.5;
  const ball = oval(c.x, c.y, r, r * 0.94, 24);
  if (state === 'squeeze') {
    pen.fill(ball, P.stripe, 1);
    pen.stroke(cub(pt(c.x - r, c.y - 0.6), pt(c.x - 2, c.y + 1.2), pt(c.x + 2, c.y + 1.2), pt(c.x + r, c.y - 0.6), 10), 1.1, P.rim, 1, false);
    return;
  }
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.8, c.y - 0.8, 0.2, c.x, c.y, r * 1.05);
    g.addColorStop(0, '#ecd38a');
    g.addColorStop(0.5, P.iris);
    g.addColorStop(1, P.irisDeep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    // The pupil: a boa's upright slit.
    pen.fill(oval(c.x + 0.2, c.y, 0.78, r * 0.86, 16), P.pupil, 1);
    pen.fill(ball.map((p) => pt(p.x, p.y - r * 1.5)), P.stripe, 0.5);
  });
  pen.stroke(closed(ball), 0.7, P.rim, 1, false);
  pen.dot(c.x - 1.2, c.y - 1.2, 0.62, PAPER_FILL, 1);
}

const SKULL: readonly Pt[] = [
  ...cub(pt(-22, -8), pt(-10, -9.6), pt(2, -12.4), pt(14, -14.2), 12),
  ...cub(pt(14, -14.2), pt(24, -15.4), pt(35, -12.4), pt(42, -6.8), 12).slice(1),
  ...cub(pt(42, -6.8), pt(45.4, -4.2), pt(46.4, -2), pt(45.5, 0.6), 8).slice(1),
  ...cub(pt(45.5, 0.6), pt(36, 2.2), pt(14, 2.6), pt(-22, 4), 14).slice(1),
];

/** Small head scales: short curved hairlines all over, none of the big plates a corn snake has. */
function smallScales(d: Draw): void {
  const rng = createRng(4201);
  for (let i = 0; i < 150; i++) {
    const x = -14 + rng() * 58;
    const y = -15 + rng() * 15;
    d.pen.hair([pt(x, y), pt(x + 0.7, y + 0.5), pt(x + 0.5, y + 1.1)], 0.16, P.rim, 0.22);
  }
}

function drawUpper(d: Draw, state: EyeState): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(SKULL, PAPER_FILL, 1);
  pen.clipped(SKULL, () => {
    const g = ctx.createLinearGradient(0, -16, 0, 4);
    g.addColorStop(0, '#d9c49a');
    g.addColorStop(0.6, P.ground);
    g.addColorStop(1, '#b89d72');
    ctx.fillStyle = g;
    ctx.fillRect(-24, -20, 74, 26);
    // The dark crown, seen edge on, and the pale band under it.
    pen.fill(ribbon(cub(pt(-24, -10), pt(0, -13), pt(20, -16.5), pt(41, -9.5), 16), (u) => 3.4 - 1.4 * u).shape, P.stripe, 0.96);
    pen.fill(ribbon(cub(pt(-22, -6.4), pt(-4, -8), pt(14, -10), pt(38, -6.4), 16), (u) => 0.9 + 0.5 * u).shape, P.pale, 0.85);
    // The stripe from the nostril through the eye, widening back to the jaw's corner.
    const stripe = ribbon(cub(pt(44, -3.4), pt(30, -6.6), pt(14, -5.2), pt(-14, 1.8), 18), (u) => 1.1 + 4.2 * u ** 1.3).shape;
    pen.fill(stripe, P.stripe, 0.97);
    pen.clipped(stripe, () => glaze(ctx, 6, -2.4, 14, 2.2, 0.2, P.stripeLit, 0.8));
    glaze(ctx, 28, -13, 12, 1.4, 0.04, PAPER_FILL, 0.3);
    smallScales(d);
    // The lips: pale, barred in brown.
    const top = lip(-0.4, -1.2);
    const low = lip(2.8, 0.6);
    pen.fill([...top, ...[...low].reverse()], P.cream, 0.8);
    for (let i = 2; i < 25; i += 2) pen.hair([top[i]!, low[i]!], 0.26, P.rim, 0.26);
  });
  pen.dot(41.8, -3.8, 0.8, P.rim, 0.95);
  eye(d, pt(25.4, -5.6), state);
  pen.stroke(SKULL.slice(0, 33), 0.9, P.rim, 1);
  pen.stroke(SKULL.slice(32), 0.7, P.rim, 1);
  dissolveBack(ctx);
}

/** The back of the sprite melts into the neck drawn under it. */
function dissolveBack(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(-14, 0, 7, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-30, -24, 37, 48);
  ctx.restore();
}

export const BOA_UPPER: SpriteArt<EyeState> = { frame: 104, res: 9, poses: ['open', 'squeeze'], draw: drawUpper };

const CHIN: readonly Pt[] = [
  ...cub(pt(-22, -4), pt(10, -2.6), pt(32, -2), pt(44, -0.6), 12),
  ...cub(pt(44, -0.6), pt(45.6, 0.6), pt(45.4, 2.2), pt(43, 3.4), 6).slice(1),
  ...cub(pt(43, 3.4), pt(32, 7), pt(12, 9), pt(-22, 9.5), 12).slice(1),
];

function drawLower(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(CHIN, PAPER_FILL, 1);
  pen.clipped(CHIN, () => {
    pen.fill(CHIN, P.cream, 0.97);
    pen.fill(CHIN.map((p) => pt(p.x, p.y + 3.4)), P.shadow, 0.5);
    for (let i = 0; i < 9; i++) pen.fill(oval(i * 5 - 1, -1.4, 1.4, 1.5, 8), P.rust, 0.5);
    for (let i = 0; i < 9; i++) pen.hair([pt(i * 5 - 2, -3), pt(i * 5 - 3, 0.6)], 0.42, P.rim, 0.55);
  });
  pen.stroke(closed(CHIN.slice(0, -1)), 0.8, P.rim, 1);
  dissolveBack(ctx);
}

export const BOA_LOWER: SpriteArt<'jaw'> = { frame: 104, res: 9, poses: ['jaw'], draw: drawLower };
