import { closed, cub, type Draw, oval, pt, ribbon } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { blotchShape, CORN_PAINT, crossWash, glaze, paintBlotch } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';
import type { EyeState } from './story';

/**
 * The corn snake's head from the side, facing +x, for the close shots: the
 * game's top-down head (snakes/cornHead.ts) walked round to the camera with
 * the same paint: orange ground, rust saddle marks rimmed in black, the bar
 * across the brow, the stripe through the eye to the jaw's corner, pale lip
 * scales, a pink mouth and needle teeth. Two sprites, each hinged at its
 * origin, so they can open round anything.
 */
export const JAW_ART = 45.5;

const P = CORN_PAINT;

const toothRow = (d: Draw, line: readonly Pt[], side: 1 | -1): void => {
  for (let i = 2; i < line.length - 2; i += 2) {
    const a = line[i]!;
    const b = line[i + 1]!;
    const tip = pt(a.x - 1.8, a.y + side * 3);
    d.pen.fill([a, tip, b], PAPER_FILL, 1);
    d.pen.hair([a, tip, b], 0.3, d.ink, 0.55);
  }
};

const lipPoints = (y0: number, y1: number, n = 26): Pt[] => Array.from({ length: n + 1 }, (_, i) => pt(-2 + (i / n) * 46, y0 + (y1 - y0) * (i / n)));

/** The eye: amber, a round pupil, a glint; or shut. */
function snakeEye(d: Draw, c: Pt, state: EyeState): void {
  const { pen } = d;
  const { ctx } = pen;
  const r = 4.3;
  const ball = oval(c.x, c.y, r, r * 0.92, 24);
  if (state !== 'open') {
    pen.fill(ball, P.ground, 1);
    const line = state === 'happy' ? cub(pt(c.x - r, c.y + 1), pt(c.x - 2, c.y - 3.4), pt(c.x + 2, c.y - 3.4), pt(c.x + r, c.y + 1), 10) : cub(pt(c.x - r, c.y - 1), pt(c.x - 2, c.y + 1.2), pt(c.x + 2, c.y + 1.2), pt(c.x + r, c.y - 1), 10);
    pen.stroke(line, 1.5, d.ink, 1, false);
    return;
  }
  pen.fill(ball.map((p) => pt(p.x + 0.5, p.y + 0.7)), d.ink, 0.35);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 1, c.y - 1, 0.2, c.x, c.y, r * 1.05);
    g.addColorStop(0, '#f0a050');
    g.addColorStop(0.45, P.iris);
    g.addColorStop(1, '#4a1a10');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    pen.dot(c.x + 0.6, c.y + 0.2, 1.75, '#140a0c', 1);
    pen.fill(ball.map((p) => pt(p.x, p.y - r * 1.4)), P.shadow, 0.45);
  });
  pen.stroke(closed(ball), 0.9, d.ink, 1, false);
  pen.dot(c.x - 1.3, c.y - 1.2, 0.8, PAPER_FILL, 1);
}

const SKULL: readonly Pt[] = [
  ...cub(pt(-22, -9), pt(-10, -10.5), pt(2, -13), pt(14, -15), 12),
  ...cub(pt(14, -15), pt(24, -16.4), pt(34, -13.5), pt(41, -8), 12).slice(1),
  ...cub(pt(41, -8), pt(44.5, -5.6), pt(46.4, -3), pt(45.5, 0.6), 8).slice(1),
  ...cub(pt(45.5, 0.6), pt(36, 2.2), pt(14, 2.6), pt(-22, 4), 14).slice(1),
];

/** The upper jaw and skull; the lip runs along y ≈ 1. */
function drawUpper(d: Draw, state: EyeState): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(SKULL, PAPER_FILL, 1);
  pen.clipped(SKULL, () => {
    ctx.fillStyle = crossWash(ctx, -15);
    ctx.fillRect(-24, -20, 74, 26);
    glaze(ctx, 8, -6, 18, 8, 0, '#d4703a', 0.35);
    glaze(ctx, 38, -5, 8, 5, 0, P.tan, 0.5);
    paintBlotch(ctx, blotchShape(4, -13.5, 17, 5.2, 8101, { rough: 0.1, pow: 2.3, lobe: 0.1, n: 40 }), 8102 + d.f, d.ink, 1.05);
    paintBlotch(ctx, ribbon(cub(pt(32.5, -15), pt(30.8, -12), pt(30.8, -9), pt(32, -6), 10), (u) => 2.4 + 0.6 * u).shape, 8110 + d.f, d.ink, 1);
    paintBlotch(ctx, ribbon(cub(pt(21, -5), pt(14, -3.6), pt(6, -2), pt(-6, 1.5), 12), (u) => 2.6 - 0.7 * u).shape, 8120 + d.f, d.ink, 1);
    // The lip scales, pale, each edged in dark.
    const lower = lipPoints(2.8, 0.6);
    const band = [...lipPoints(-1.8, -2.4), ...[...lower].reverse()];
    pen.fill(band, P.cream, 0.95);
    for (let i = 2; i < 25; i += 3) pen.hair([lipPoints(-1.8, -2.4)[i]!, lower[i]!], 0.5, P.rim, 0.7);
    pen.hair(lipPoints(-1.8, -2.4), 0.5, P.rim, 0.6);
    // A glossy crown and hairlines of its plates.
    glaze(ctx, 22, -12.6, 11, 1.6, 0.05, PAPER_FILL, 0.55);
    for (const plate of [[pt(38, -9.5), pt(36.5, -3)], [pt(28, -14.4), pt(26.5, -9)], [pt(40, -5.8), pt(44, -4.4)]]) pen.hair(plate, 0.5, d.ink, 0.5);
  });
  pen.dot(41.6, -4.8, 0.85, d.ink, 0.95);
  snakeEye(d, pt(24.5, -7.4), state);
  pen.stroke(SKULL.slice(0, 33), 1.6, d.ink, 1);
  pen.stroke(SKULL.slice(32), 1.2, d.ink, 1);
  // The back of the skull dissolves into the neck.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(-24, 0, -8, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-30, -24, 22, 48);
  ctx.restore();
}

export const SNAKE_UPPER: SpriteArt<EyeState> = { frame: 104, res: 7, poses: ['open', 'squeeze', 'happy'], draw: drawUpper };

const CHIN: readonly Pt[] = [
  ...cub(pt(-22, -4), pt(10, -2.6), pt(32, -2), pt(44, -0.6), 12),
  ...cub(pt(44, -0.6), pt(45.6, 0.6), pt(45.4, 2.2), pt(43, 3.4), 6).slice(1),
  ...cub(pt(43, 3.4), pt(32, 7), pt(12, 9), pt(-22, 9.5), 12).slice(1),
];

/** The lower jaw; the lip runs along y ≈ −1. */
function drawLower(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(CHIN, PAPER_FILL, 1);
  pen.clipped(CHIN, () => {
    pen.fill(CHIN, P.cream, 0.96);
    ctx.save();
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = P.ground;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    CHIN.slice(0, 12).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    pen.fill(CHIN.map((p) => pt(p.x, p.y + 5.8)), P.shadow, 0.16);
    for (let i = 0; i < 9; i++) pen.hair([pt(i * 5 - 2, -3), pt(i * 5 - 3, 0.6)], 0.5, P.rim, 0.5);
  });
  pen.stroke(closed(CHIN.slice(0, -1)), 1.4, d.ink, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(-24, 0, -8, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-30, -24, 22, 48);
  ctx.restore();
}

export const SNAKE_LOWER: SpriteArt<'jaw'> = { frame: 104, res: 7, poses: ['jaw'], draw: drawLower };

/** The pink inside each jaw, with its needle teeth, fading in as the mouth opens: on the same hinge as the jaw. */
function drawInside(d: Draw, pose: 'roof' | 'floor'): void {
  const { pen } = d;
  const s = pose === 'roof' ? 1 : -1;
  const a = pose === 'roof' ? lipPoints(4.2, 1.6) : lipPoints(-3.2, -0.6);
  const b = pose === 'roof' ? lipPoints(8.4, 3.4) : lipPoints(-8, -3);
  const pink = [...a, ...[...b].reverse()];
  toothRow(d, pose === 'roof' ? lipPoints(7.6, 3.2) : lipPoints(-7, -2.6), s);
  pen.fill(pink, P.mouth, 1);
  pen.clipped(pink, () => pen.fill(pink.map((p) => pt(p.x, p.y + s * 2.4)), P.mouthDeep, 0.6));
  pen.stroke(closed(pink), 0.7, d.ink, 0.9, false);
}

export const SNAKE_INSIDE: SpriteArt<'roof' | 'floor'> = { frame: 104, res: 7, poses: ['roof', 'floor'], draw: drawInside };
