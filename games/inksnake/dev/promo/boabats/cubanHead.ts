import { createRng } from '../../../src/logic/rng';
import { closed, cub, type Draw, oval, pt, ribbon } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';

/**
 * The Cuban boa's head, from heartbeat/boaHead.ts (the same skull and
 * hinges, so boaRig's jaws fit it) repainted for Chilabothrus angulifer: a
 * heavy, darker brown head, the crown a shade darker, only a faint dark line
 * back from the eye, small head scales, lips a paler tan barred in brown and
 * a coppery eye with an upright slit. Side-on (upper jaw open or shut-eyed,
 * lower jaw) facing +x, hinged at the origin; and head-on ('front') for the
 * moment the three look at the camera.
 */
export const JAW_ART = 45.5;

const P = {
  top: '#7a5f43', ground: '#6a5139', low: '#56412d', crown: '#2c1c11', crownLit: '#4e3420', stripe: '#24160d',
  lip: '#c2aa84', chin: '#c8b08a', shadow: '#3c2a1c', rim: '#170e09', iris: '#b47a3c', irisLit: '#e0ae66', irisDeep: '#4e2c12', pupil: '#0b0806',
} as const;

export type EyeState = 'open' | 'squeeze';

const lip = (y0: number, y1: number, n = 26): Pt[] => Array.from({ length: n + 1 }, (_, i) => pt(-2 + (i / n) * 46, y0 + (y1 - y0) * (i / n)));

/** A realistic eye: a coppery iris, darker to its rim, an upright slit and one catchlight. */
function eyeBall(d: Draw, c: Pt, r: number, state: EyeState): void {
  const { pen } = d;
  const { ctx } = pen;
  const ball = oval(c.x, c.y, r, r * 0.94, 24);
  if (state === 'squeeze') {
    pen.fill(ball, P.crown, 1);
    pen.stroke(cub(pt(c.x - r, c.y - 0.6), pt(c.x - 2, c.y + 1.2), pt(c.x + 2, c.y + 1.2), pt(c.x + r, c.y - 0.6), 10), 1.1, P.rim, 1, false);
    return;
  }
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - r * 0.25, c.y - r * 0.25, 0.2, c.x, c.y, r * 1.05);
    g.addColorStop(0, P.irisLit);
    g.addColorStop(0.5, P.iris);
    g.addColorStop(1, P.irisDeep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    pen.fill(oval(c.x + 0.1, c.y, r * 0.2, r * 0.86, 16), P.pupil, 1);
    pen.fill(ball.map((p) => pt(p.x, p.y - r * 1.5)), P.crown, 0.55);
  });
  pen.stroke(closed(ball), 0.7, P.rim, 1, false);
  pen.dot(c.x - r * 0.34, c.y - r * 0.34, r * 0.17, PAPER_FILL, 0.95);
}

const SKULL: readonly Pt[] = [
  ...cub(pt(-22, -8), pt(-10, -9.8), pt(2, -12.8), pt(14, -14.4), 12),
  ...cub(pt(14, -14.4), pt(24, -15.6), pt(35, -12.6), pt(42, -6.8), 12).slice(1),
  ...cub(pt(42, -6.8), pt(45.4, -4.2), pt(46.4, -2), pt(45.5, 0.6), 8).slice(1),
  ...cub(pt(45.5, 0.6), pt(36, 2.2), pt(14, 2.6), pt(-22, 4), 14).slice(1),
];

function smallScales(d: Draw): void {
  const rng = createRng(6201);
  for (let i = 0; i < 170; i++) {
    const x = -14 + rng() * 58;
    const y = -15 + rng() * 15;
    d.pen.hair([pt(x, y), pt(x + 0.7, y + 0.5), pt(x + 0.5, y + 1.1)], 0.12, P.rim, 0.14);
  }
}

function drawUpper(d: Draw, state: EyeState): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(SKULL, PAPER_FILL, 1);
  pen.clipped(SKULL, () => {
    const g = ctx.createLinearGradient(0, -16, 0, 4);
    g.addColorStop(0, P.top);
    g.addColorStop(0.55, P.ground);
    g.addColorStop(1, P.low);
    ctx.fillStyle = g;
    ctx.fillRect(-24, -20, 74, 26);
    pen.fill(ribbon(cub(pt(-24, -10.4), pt(0, -13.4), pt(20, -16.8), pt(41, -9.5), 16), (u) => 4 - 1.6 * u).shape, P.crown, 0.9);
    pen.clipped(SKULL, () => glaze(ctx, 14, -12, 16, 2, 0.05, P.crownLit, 0.6));
    // The dark stripe from the eye back to the jaw's angle.
    pen.fill(ribbon(cub(pt(23, -5.0), pt(12, -4.0), pt(0, -2.0), pt(-20, 1.6), 16), (u) => 1.2 + 2.6 * u).shape, P.stripe, 0.88);
    glaze(ctx, 30, -12.6, 12, 1.4, 0.04, '#c8ae8a', 0.22);
    // The body's blotches carried on up the neck and over the back of the head, smaller towards the snout.
    for (const [x, y, rx, ry] of [[-18, -6.5, 5.2, 4], [-7, -9.5, 4.2, 3.2], [3, -11.5, 3.2, 2.4], [-12, -1.2, 3.4, 2.2], [11, -12.8, 2.2, 1.6], [19, -13.4, 1.5, 1.1]] as const) {
      const blot = oval(x, y, rx, ry, 18).map((p, i) => pt(p.x + Math.sin(i * 2.3 + x) * rx * 0.16, p.y + Math.cos(i * 1.7 + y) * ry * 0.16));
      pen.fill(blot, P.crown, 0.9);
      pen.clipped(blot, () => glaze(ctx, x, y - ry * 0.3, rx * 0.6, ry * 0.4, 0, P.crownLit, 0.5));
    }
    smallScales(d);
    // Pale lips, divided into their labial scales.
    const top = lip(-0.4, -1.2);
    const low = lip(2.8, 0.6);
    pen.fill([...top, ...[...low].reverse()], P.lip, 0.92);
    for (let i = 2; i < 25; i += 2) pen.hair([top[i]!, pt((top[i]!.x + low[i]!.x) / 2 - 0.5, (top[i]!.y + low[i]!.y) / 2), low[i]!], 0.2, P.rim, 0.28);
    pen.hair(low, 0.3, P.rim, 0.45);
  });
  pen.dot(41.8, -3.8, 0.8, P.rim, 0.95);
  eyeBall(d, pt(25.4, -5.6), 3.5, state);
  pen.stroke(SKULL.slice(0, 33), 0.9, P.rim, 1);
  pen.stroke(SKULL.slice(32), 0.7, P.rim, 1);
  dissolveBack(ctx);
}

function dissolveBack(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(-22, 0, -13, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-30, -24, 37, 48);
  ctx.restore();
}

export const CUBAN_UPPER: SpriteArt<EyeState> = { frame: 104, res: 9, poses: ['open', 'squeeze'], draw: drawUpper };

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
    pen.fill(CHIN, P.chin, 0.95);
    pen.fill(CHIN.map((p) => pt(p.x, p.y + 3.4)), P.shadow, 0.55);
    for (let i = 0; i < 9; i++) pen.hair([pt(i * 5 - 2, -2.4), pt(i * 5 - 2.8, -0.6), pt(i * 5 - 2.6, 1.4)], 0.22, P.rim, 0.3);
  });
  pen.stroke(closed(CHIN.slice(0, -1)), 0.8, P.rim, 1);
  dissolveBack(ctx);
}

export const CUBAN_LOWER: SpriteArt<'jaw'> = { frame: 104, res: 9, poses: ['jaw'], draw: drawLower };

/**
 * Head-on and a little from above: the crown seen foreshortened down to a
 * blunt snout, the head widest at the jaws' corners behind the eyes, the
 * eyes bulging at the sides, two nostrils at the snout's tip, and the
 * mouth's line low and nearly straight (a snake doesn't smile).
 */
const FRONT: readonly Pt[] = [
  ...cub(pt(0, -17), pt(8, -17), pt(14, -12), pt(16.5, -4), 10),
  ...cub(pt(16.5, -4), pt(18, 3), pt(15, 9.5), pt(8, 12), 10).slice(1),
  ...cub(pt(8, 12), pt(4, 13), pt(-4, 13), pt(-8, 12), 8).slice(1),
  ...cub(pt(-8, 12), pt(-15, 9.5), pt(-18, 3), pt(-16.5, -4), 10).slice(1),
  ...cub(pt(-16.5, -4), pt(-14, -12), pt(-8, -17), pt(0, -17), 10).slice(1, -1),
];

function drawFront(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(FRONT, PAPER_FILL, 1);
  pen.clipped(FRONT, () => {
    const g = ctx.createLinearGradient(0, -17, 0, 13);
    g.addColorStop(0, P.crown);
    g.addColorStop(0.35, P.top);
    g.addColorStop(0.75, P.ground);
    g.addColorStop(1, P.low);
    ctx.fillStyle = g;
    ctx.fillRect(-20, -18, 40, 32);
    // The snout's top, lit, narrowing towards us.
    glaze(ctx, 0, 1, 6, 9, 0, P.crownLit, 0.55);
    for (const s of [-1, 1]) pen.fill(ribbon(cub(pt(s * 5, -12), pt(s * 10, -8), pt(s * 13, -3), pt(s * 14.5, 2), 10), (u) => 0.6 + 1.4 * u).shape, P.stripe, 0.45);
    const rng = createRng(6401);
    for (let i = 0; i < 9; i++) pen.fill(oval(-10 + rng() * 20, -14 + rng() * 14, 0.7 + rng() * 1.1, 0.5 + rng() * 0.6, 10), P.stripe, 0.32);
    for (let i = 0; i < 110; i++) {
      const x = -15 + rng() * 30;
      const y = -15 + rng() * 24;
      pen.hair([pt(x, y), pt(x + 0.6, y + 0.5), pt(x + 0.4, y + 1)], 0.15, P.rim, 0.24);
    }
    // The pale lips, low and nearly level, and the shadowed chin.
    const mouth = cub(pt(-14.5, 8), pt(-8, 10.6), pt(8, 10.6), pt(14.5, 8), 18);
    pen.fill(ribbon(mouth, () => 1.3).shape, P.lip, 0.8);
    pen.stroke(mouth, 0.5, P.rim, 0.85, false);
  });
  for (const s of [-1, 1]) {
    eyeBall(d, pt(s * 13.4, -2.6), 2.9, 'open');
    pen.fill(oval(s * 2.6, 6.2, 0.95, 0.7, 10), P.rim, 0.9);
  }
  pen.stroke(closed(FRONT), 0.8, P.rim, 1, false);
}

export const CUBAN_FRONT: SpriteArt<'front'> = { frame: 44, res: 9, poses: ['front'], draw: drawFront };
