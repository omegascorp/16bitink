import { createRng } from '../../../src/logic/rng';
import { closed, cub, type Draw, oval, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';
import { RETIC } from './reticArt';

/**
 * The reticulated python's head from the side, facing +x, for a neck 24
 * units deep (it meets the strip at x = 0): long and flat-topped, gold-tan,
 * a thin black line along the crown and another back from the eye to the
 * corner of the mouth, pale yellow lips with the heat pits notched into
 * them, and an amber-orange eye with an upright pupil and a catchlight.
 * Poses: 'shut' (mouth closed, eye open), 'sleep' (eye shut, on the vet's
 * table) and 'gape' (the skull alone above the upper lip, for the hook,
 * where the lips are stretched round the bear).
 */
export type HeadPose = 'shut' | 'sleep' | 'gape';

const P = {
  top: '#dcbc72', cheek: '#c09a55', low: '#9a7a46', lip: '#eadb9e', lipDeep: '#b9a56a', pit: '#3a2a16',
  iris: '#e08a2c', irisLit: '#f6c35c', irisDeep: '#7a3a12', pupil: '#0c0806',
} as const;

/** The snout tip and the corner of the mouth, art units. */
export const SNOUT: Pt = pt(51.5, 0);
export const RICTUS: Pt = pt(15, 3.2);

const TOP: readonly Pt[] = [
  ...cub(pt(-10, -12), pt(8, -11.8), pt(26, -11), pt(40, -9), 14),
  ...cub(pt(40, -9), pt(47, -7.6), pt(51.5, -5), pt(51.5, 0), 8).slice(1),
];
const LIP: readonly Pt[] = cub(SNOUT, pt(42, 1.2), pt(26, 2.4), RICTUS, 14);
const CHIN: readonly Pt[] = [
  ...cub(pt(51.5, 0), pt(51, 3), pt(46, 5.6), pt(36, 7.6), 8),
  ...cub(pt(36, 7.6), pt(24, 10.2), pt(8, 11.8), pt(-10, 12), 12).slice(1),
];

/** The closed head's outline: over the top to the snout, then back under the chin. */
const HEAD: readonly Pt[] = [...TOP, ...CHIN.slice(1)];
/** The skull alone, its bottom edge the upper lip running back to the neck. */
const SKULL: readonly Pt[] = [...TOP, ...LIP.slice(1), ...cub(RICTUS, pt(8, 3.6), pt(0, 4), pt(-10, 4.4), 6).slice(1)];

const shift = (pts: readonly Pt[], dy: number): Pt[] => pts.map((p) => pt(p.x, p.y + dy));

function eye(d: Draw, pose: HeadPose): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = pt(37.5, -4.6);
  const r = 3.3;
  const ball = oval(c.x, c.y, r, r * 0.92, 24);
  pen.fill(oval(c.x, c.y, r + 0.9, r * 0.92 + 0.8, 24), P.low, 0.6);
  if (pose === 'sleep') {
    pen.fill(ball, P.cheek, 1);
    pen.stroke(cub(pt(c.x - r, c.y), pt(c.x - 1.6, c.y + 1.6), pt(c.x + 1.6, c.y + 1.6), pt(c.x + r, c.y), 10), 0.9, RETIC.line, 1, false);
    return;
  }
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.6, c.y + 0.4, 0.2, c.x, c.y, r * 1.05);
    g.addColorStop(0, P.irisLit);
    g.addColorStop(0.55, P.iris);
    g.addColorStop(1, P.irisDeep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      pen.hair([pt(c.x + Math.cos(a) * 1.1, c.y + Math.sin(a) * 1.1), pt(c.x + Math.cos(a) * r * 0.95, c.y + Math.sin(a) * r * 0.95)], 0.14, P.irisDeep, 0.35);
    }
    pen.fill(oval(c.x + 0.1, c.y, 0.72, r * 0.86, 16), P.pupil, 1);
    // The brow's shadow over the top of the eye.
    pen.fill(ball.map((p) => pt(p.x, p.y - r * 1.45)), P.low, 0.55);
  });
  pen.stroke(closed(ball), 0.55, RETIC.line, 1, false);
  pen.dot(c.x - 1.15, c.y - 1.1, 0.62, PAPER_FILL, 1);
  pen.dot(c.x + 1.2, c.y + 1.3, 0.22, PAPER_FILL, 0.6);
}

/** Small scales over the crown and cheek; the heat pits notched into the lips. */
function scales(d: Draw, gape: boolean): void {
  const rng = createRng(6101);
  for (let i = 0; i < 160; i++) {
    const x = -4 + rng() * 52;
    const y = -11 + rng() * 11;
    d.pen.hair([pt(x, y), pt(x + 0.8, y + 0.4), pt(x + 0.6, y + 1.1)], 0.15, RETIC.line, 0.2);
  }
  for (let x = 46; x > 22; x -= 3.2) {
    const y = 1.6 - ((x - 15) / 37) * 0.6 + (x < 34 ? 0.4 : 0);
    d.pen.fill(oval(x, y - 1.3, 0.9, 0.55, 10), P.pit, 0.85);
  }
  if (gape) return;
  for (let x = 30; x > 10; x -= 3) {
    const y = 5 + ((30 - x) / 20) * 4.5;
    d.pen.fill(oval(x, y, 0.8, 0.5, 10), P.pit, 0.75);
  }
}

function drawHead(d: Draw, pose: HeadPose): void {
  const { pen } = d;
  const { ctx } = pen;
  const gape = pose === 'gape';
  const shape = gape ? SKULL : HEAD;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, -12, 0, 12);
    g.addColorStop(0, P.top);
    g.addColorStop(0.42, P.cheek);
    g.addColorStop(0.7, P.low);
    g.addColorStop(1, P.lip);
    ctx.fillStyle = g;
    ctx.fillRect(-12, -14, 66, 28);
    glaze(ctx, 22, -9, 22, 2.4, 0.03, PAPER_FILL, 0.35);
    // The crown's black line, seen edge on, and the faint olive of the head's top.
    pen.fill([...TOP.slice(0, 14), ...shift(TOP.slice(0, 14), 1.4).reverse()], RETIC.net, 0.85);
    glaze(ctx, 18, -6, 18, 3, 0, RETIC.olive, 0.35);
    // The upper lip, pale, the line back from the eye to the mouth's corner.
    pen.fill([...LIP, ...shift(LIP, -3).reverse()], P.lip, 0.85);
    pen.stroke(cub(pt(34.5, -3.2), pt(28, -1.4), pt(20, 0.6), pt(10, 2.6), 10), 0.75, RETIC.net, 0.9, false);
    if (!gape) {
      pen.fill([...LIP, ...CHIN.slice(0, 12).reverse()], P.lip, 0.9);
      pen.fill(shift(CHIN, -1.6).slice(4), P.lipDeep, 0.3);
    }
    scales(d, gape);
  });
  pen.dot(49.5, -3.2, 0.7, RETIC.line, 0.95);
  eye(d, pose);
  if (!gape) pen.hair(LIP, 0.7, RETIC.line, 1);
  pen.stroke(TOP, 0.9, RETIC.line, 1);
  pen.stroke(gape ? SKULL.slice(TOP.length - 1) : CHIN, 0.75, RETIC.line, 1);
  dissolveBack(ctx);
}

/** The back of the head melts into the neck drawn under it. */
function dissolveBack(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(-10, 0, 4, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-30, -20, 34, 40);
  ctx.restore();
}

export const RETIC_HEAD: SpriteArt<HeadPose> = { frame: 120, res: 10, poses: ['shut', 'sleep', 'gape'], draw: drawHead };
