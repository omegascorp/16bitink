import { createRng } from '../../../src/logic/rng';
import { closed, cub, type Draw, oval, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';
import { BURM } from './burmeseArt';

/**
 * The Burmese python's head from the side, facing +x, for a neck 24 units
 * deep (it meets the strip at x = 0), seen a little from above so the crown
 * shows: the dark brown arrowhead over the top, its point running forward
 * to the snout; a pale buff stripe under it; the dark stripe from the
 * nostril through the eye back to the corner of the mouth; the dark wedge
 * under the eye; cream lips with the heat pits notched into them; an amber
 * eye with an upright pupil and a catchlight. Poses: 'shut', and 'gape'
 * (the jaws thrown wide, the pink mouth showing).
 */
export type BurmPose = 'shut' | 'gape';

const P = {
  top: '#d6b57a', cheek: '#c39d62', low: '#9c7b4a', lip: '#ecdcaa', lipDeep: '#b9a56a', pit: '#3a2a16',
  iris: '#c9862e', irisLit: '#ecbd62', irisDeep: '#5e3514', pupil: '#0c0806', mouth: '#c47d78', throat: '#5a2a2a', tooth: '#f6f0e0',
} as const;

/** The snout tip, art units. */
export const BURM_SNOUT: Pt = pt(50, 0);
const RICTUS: Pt = pt(14, 3.2);
const HINGE: Pt = pt(4, 2.6);

const TOP: readonly Pt[] = [
  ...cub(pt(-10, -12.4), pt(8, -12.4), pt(26, -11.4), pt(39, -9.2), 14),
  ...cub(pt(39, -9.2), pt(46, -7.8), pt(50, -5), pt(50, 0), 8).slice(1),
];
const LIP: readonly Pt[] = cub(BURM_SNOUT, pt(41, 1.2), pt(25, 2.4), RICTUS, 14);
const CHIN: readonly Pt[] = [
  ...cub(pt(50, 0), pt(49.5, 3), pt(45, 5.6), pt(35, 7.6), 8),
  ...cub(pt(35, 7.6), pt(23, 10.2), pt(8, 11.8), pt(-10, 12), 12).slice(1),
];
const HEAD: readonly Pt[] = [...TOP, ...CHIN.slice(1)];
const SKULL: readonly Pt[] = [...TOP, ...LIP.slice(1), ...cub(RICTUS, pt(8, 3.6), pt(0, 4), pt(-10, 4.4), 6).slice(1)];
const JAW: readonly Pt[] = [...LIP, ...cub(RICTUS, pt(8, 3.6), pt(0, 4), pt(-10, 4.4), 6).slice(1), ...[...CHIN].reverse()];

const shift = (pts: readonly Pt[], dy: number): Pt[] => pts.map((p) => pt(p.x, p.y + dy));
const turn = (pts: readonly Pt[], a: number): Pt[] =>
  pts.map((p) => pt(HINGE.x + (p.x - HINGE.x) * Math.cos(a) - (p.y - HINGE.y) * Math.sin(a), HINGE.y + (p.x - HINGE.x) * Math.sin(a) + (p.y - HINGE.y) * Math.cos(a)));

/** The arrowhead over the crown: from a point near the snout, widening back over the head. */
function arrowhead(): Pt[] {
  const top = TOP.filter((p) => p.x <= 45);
  const depth = (x: number): number => 0.6 + 7.2 * Math.max(0, Math.min(1, (45 - x) / 52)) ** 0.8;
  return [...top, ...[...top].reverse().map((p) => pt(p.x, p.y + depth(p.x)))];
}

function eye(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = pt(36.5, -4.4);
  const r = 3.1;
  const ball = oval(c.x, c.y, r, r * 0.92, 24);
  pen.fill(oval(c.x, c.y, r + 0.9, r * 0.92 + 0.8, 24), BURM.brownDeep, 0.7);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.6, c.y + 0.4, 0.2, c.x, c.y, r * 1.05);
    g.addColorStop(0, P.irisLit);
    g.addColorStop(0.55, P.iris);
    g.addColorStop(1, P.irisDeep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      pen.hair([pt(c.x + Math.cos(a) * 1.1, c.y + Math.sin(a) * 1.1), pt(c.x + Math.cos(a) * r * 0.95, c.y + Math.sin(a) * r * 0.95)], 0.14, P.irisDeep, 0.4);
    }
    pen.fill(oval(c.x + 0.1, c.y, 0.7, r * 0.86, 16), P.pupil, 1);
    pen.fill(ball.map((p) => pt(p.x, p.y - r * 1.45)), BURM.brownDeep, 0.5);
  });
  pen.stroke(closed(ball), 0.55, BURM.line, 1, false);
  pen.dot(c.x - 1.1, c.y - 1.05, 0.6, PAPER_FILL, 1);
  pen.dot(c.x + 1.15, c.y + 1.25, 0.22, PAPER_FILL, 0.6);
}

/** The markings: arrowhead, the pale stripe, the eye stripe and the wedge under the eye. */
function markings(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const arrow = arrowhead();
  pen.fill(arrow, BURM.brown, 0.97);
  pen.clipped(arrow, () => glaze(ctx, 16, -11, 22, 2.2, 0, BURM.brownLit, 0.6));
  pen.hair([...arrow.slice(arrow.length / 2)], 0.55, BURM.edge, 0.9);
  // The pale stripe between the arrowhead and the eye stripe.
  pen.hair(cub(pt(46, -5.4), pt(34, -8.4), pt(16, -4.6), pt(-8, -3.4), 12), 1.3, '#f0dcae', 0.6);
  // The eye stripe, nostril to the corner of the mouth.
  const stripe = [...cub(pt(48.5, -3.6), pt(42, -5.8), pt(30, -5.8), pt(22, -2.2), 10), ...cub(pt(22, -2.2), pt(16, 0.4), pt(8, 1.6), pt(-6, 2.2), 8).slice(1),
    ...cub(pt(-6, 4.2), pt(8, 3.6), pt(16, 2.8), pt(22, 0.8), 8), ...cub(pt(22, 0.8), pt(30, -2.2), pt(42, -2.4), pt(48.5, -2), 10).slice(1)];
  pen.fill(stripe, BURM.brownDeep, 0.92);
  pen.hair(stripe.slice(0, 18), 0.45, BURM.edge, 0.7);
  // The wedge under the eye, down to the lip.
  pen.fill([pt(33.6, -2.4), pt(39.4, -2.4), pt(37.2, 1.6), pt(35.4, 1.7)], BURM.brownDeep, 0.9);
}

function pits(d: Draw, gape: boolean): void {
  const rng = createRng(6201);
  for (let i = 0; i < 150; i++) {
    const x = -4 + rng() * 50;
    const y = -11 + rng() * 11;
    d.pen.hair([pt(x, y), pt(x + 0.8, y + 0.4), pt(x + 0.6, y + 1.1)], 0.15, BURM.line, 0.18);
  }
  for (let x = 46; x > 26; x -= 3.4) d.pen.fill(oval(x, 1.5 - ((x - 15) / 37) * 0.6 - 1.2, 0.85, 0.5, 10), P.pit, 0.8);
  if (gape) return;
  for (let x = 30; x > 12; x -= 3.2) d.pen.fill(oval(x, 5 + ((30 - x) / 18) * 4.2, 0.75, 0.48, 10), P.pit, 0.7);
}

function paintSkull(d: Draw, shape: readonly Pt[], gape: boolean): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, -12, 0, 12);
    g.addColorStop(0, P.top);
    g.addColorStop(0.42, P.cheek);
    g.addColorStop(0.7, P.low);
    g.addColorStop(1, P.lip);
    ctx.fillStyle = g;
    ctx.fillRect(-12, -14, 66, 28);
    glaze(ctx, 24, -8, 22, 2.4, 0.03, PAPER_FILL, 0.3);
    pen.fill([...LIP, ...shift(LIP, -2.8).reverse()], P.lip, 0.88);
    markings(d);
    if (!gape) {
      pen.fill([...LIP, ...CHIN.slice(0, 12).reverse()], P.lip, 0.9);
      pen.fill(shift(CHIN, -1.6).slice(4), P.lipDeep, 0.3);
    }
    pits(d, gape);
  });
  pen.dot(48.2, -3.2, 0.75, BURM.line, 0.95);
  eye(d);
}

/** The open mouth: the jaws turned apart about the hinge, the pink lining and small back-curved teeth between. */
function drawGape(d: Draw): void {
  const { pen } = d;
  const up = -0.5;
  const down = 0.55;
  const upperLip = turn(LIP, up);
  const lowerLip = turn(LIP, down);
  const inside = [...upperLip, pt(-4, 3), ...[...lowerLip].reverse()];
  pen.fill(inside, P.mouth, 1);
  pen.clipped(inside, () => {
    glaze(pen.ctx, 6, 3, 18, 8, 0, P.throat, 0.9);
    glaze(pen.ctx, 30, 6, 14, 3, 0.4, '#e6a8a0', 0.5);
  });
  for (const [lip, s] of [[upperLip, 1], [lowerLip, -1]] as const) {
    for (let i = 2; i < lip.length - 2; i += 2) {
      const p = lip[i]!;
      pen.fill([pt(p.x - 0.6, p.y), pt(p.x + 0.6, p.y), pt(p.x - 0.4, p.y + 1.6 * s)], P.tooth, 0.95);
    }
  }
  const jaw = turn(JAW, down);
  pen.fill(jaw, PAPER_FILL, 1);
  pen.clipped(jaw, () => {
    const g = pen.ctx.createLinearGradient(0, 0, 0, 30);
    g.addColorStop(0, P.lip);
    g.addColorStop(1, P.lipDeep);
    pen.ctx.fillStyle = g;
    pen.ctx.fillRect(-14, -10, 70, 50);
  });
  pen.stroke(closed(jaw), 0.75, BURM.line, 1, false);
  pen.ctx.save();
  pen.ctx.translate(HINGE.x, HINGE.y);
  pen.ctx.rotate(up);
  pen.ctx.translate(-HINGE.x, -HINGE.y);
  paintSkull(d, SKULL, true);
  pen.stroke(TOP, 0.9, BURM.line, 1);
  pen.stroke(SKULL.slice(TOP.length - 1), 0.75, BURM.line, 1);
  pen.ctx.restore();
}

function drawHead(d: Draw, pose: BurmPose): void {
  const { pen } = d;
  if (pose === 'gape') drawGape(d);
  else {
    paintSkull(d, HEAD, false);
    pen.hair(LIP, 0.7, BURM.line, 1);
    pen.stroke(TOP, 0.9, BURM.line, 1);
    pen.stroke(CHIN, 0.75, BURM.line, 1);
  }
  dissolveBack(pen.ctx);
}

/** The back of the head melts into the neck drawn under it. */
function dissolveBack(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(-10, 0, 4, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-30, -30, 34, 60);
  ctx.restore();
}

export const BURM_HEAD: SpriteArt<BurmPose> = { frame: 130, res: 10, poses: ['shut', 'gape'], draw: drawHead };
