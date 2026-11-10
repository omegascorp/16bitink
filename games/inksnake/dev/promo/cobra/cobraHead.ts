import { createRng } from '../../../src/logic/rng';
import { closed, cub, type Draw, oval, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';
import { COBRA } from './cobraArt';

/**
 * The king cobra's head from the side, facing +x, for a neck 24 units deep
 * (it meets the strip at x = 0): big and long, flat on top with a low rise
 * over the eye, the snout broad and blunt; olive-brown, darker over the crown,
 * the large crown shields (the two big occipitals at the back, the king
 * cobra's own) edged along the top; pale yellow lip scales each edged black
 * behind, a cream throat; a big bronze eye with a ROUND pupil (an elapid's,
 * not a python's slit) and a catchlight. Poses: 'shut' (mouth closed) and
 * 'strike' (skull up, jaw dropped: pale mouth, short front fangs).
 */
export type CobraHeadPose = 'shut' | 'strike';

const P = {
  crown: '#6c663a', top: '#7a7243', cheek: '#5d5732', low: '#8b8253', lip: '#ecdfa8', lipDeep: '#bfae6c',
  iris: '#b98b3e', irisLit: '#e0b866', irisDeep: '#3a2610', pupil: '#0a0705',
  mouth: '#f1dcd0', mouthDeep: '#c99a92', throat: '#5a2e28', fang: '#fbf6e8',
} as const;

/** The snout tip and the corner of the mouth, art units. */
export const COBRA_SNOUT: Pt = pt(41.6, 0.6);
const RICTUS: Pt = pt(13, 3.8);

const TOP: readonly Pt[] = [
  ...cub(pt(-10, -12), pt(2, -11.8), pt(14, -11.3), pt(22, -10.9), 10),
  ...cub(pt(22, -10.9), pt(27, -10.8), pt(32, -9.6), pt(36.5, -7.4), 8).slice(1),
  ...cub(pt(36.5, -7.4), pt(40, -5.6), pt(41.8, -2.6), COBRA_SNOUT, 8).slice(1),
];
const LIP: readonly Pt[] = cub(COBRA_SNOUT, pt(34, 2.2), pt(22, 3), RICTUS, 14);
const CHIN: readonly Pt[] = [
  ...cub(COBRA_SNOUT, pt(41.4, 3), pt(38, 5.4), pt(31, 7.4), 8),
  ...cub(pt(31, 7.4), pt(22, 9.8), pt(8, 11.6), pt(-10, 12), 12).slice(1),
];
/** The lower jaw's lip, chin tip back to the corner. */
const JAW_LIP: readonly Pt[] = cub(pt(40.2, 2.6), pt(32, 4.2), pt(22, 4.6), RICTUS, 12);

const HEAD: readonly Pt[] = [...TOP, ...CHIN.slice(1)];
/** The skull alone, its bottom edge the upper lip running back to the neck. */
const SKULL: readonly Pt[] = [...TOP, ...LIP.slice(1), ...cub(RICTUS, pt(6, 4.2), pt(-2, 4.4), pt(-10, 4.6), 6).slice(1)];
/** The lower jaw alone: its lip from the chin back to the corner and on to the neck, then under the chin. */
const JAW: readonly Pt[] = [...cub(pt(-10, 4.6), pt(-2, 4.4), pt(6, 4.2), RICTUS, 6), ...[...JAW_LIP].reverse().slice(1), ...CHIN.slice(2)];

const turn = (pts: readonly Pt[], a: number, c: Pt): Pt[] =>
  pts.map((p) => pt(c.x + (p.x - c.x) * Math.cos(a) - (p.y - c.y) * Math.sin(a), c.y + (p.x - c.x) * Math.sin(a) + (p.y - c.y) * Math.cos(a)));

const shift = (pts: readonly Pt[], dy: number): Pt[] => pts.map((p) => pt(p.x, p.y + dy));

function eye(d: Draw, c: Pt): void {
  const { pen } = d;
  const { ctx } = pen;
  const r = 3.7;
  const ball = oval(c.x, c.y, r, r * 0.94, 26);
  // The socket's soft shadow, the iris's wash, its fine radial grain, the round pupil.
  pen.fill(oval(c.x, c.y + 0.2, r + 1, r * 0.94 + 0.9, 26), COBRA.shadow, 0.55);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.5, c.y + 0.6, 0.3, c.x, c.y, r * 1.05);
    g.addColorStop(0, P.irisLit);
    g.addColorStop(0.5, P.iris);
    g.addColorStop(1, P.irisDeep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      pen.hair([pt(c.x + Math.cos(a) * 1.7, c.y + Math.sin(a) * 1.7), pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r)], 0.13, P.irisDeep, 0.4);
    }
    pen.fill(oval(c.x + 0.15, c.y + 0.05, 1.55, 1.55, 20), P.pupil, 1);
    // The brow's shadow over the top of the eye.
    pen.fill(ball.map((p) => pt(p.x, p.y - r * 1.5)), COBRA.shadow, 0.5);
  });
  pen.stroke(closed(ball), 0.5, COBRA.line, 1, false);
  pen.dot(c.x - 1.3, c.y - 1.2, 0.72, PAPER_FILL, 1);
  pen.dot(c.x + 1.3, c.y + 1.4, 0.24, PAPER_FILL, 0.6);
}

/** The crown's shields along the top edge, the scales behind the eye, and the lip scales each edged black behind. */
function shields(d: Draw, lip: readonly Pt[], mouthOpen: boolean): void {
  const { pen } = d;
  // Crown plates seen from the side: the occipital, parietal, supraocular and prefrontal edges.
  for (const [x0, x1, y] of [[-6, -3, -11.6], [5, 8, -11.4], [18, 20.5, -10.9], [33.5, 35, -8.2], [38.6, 39.2, -5.6]] as const) {
    pen.hair(cub(pt(x0, y + 0.1), pt(x0 + 0.6, y + 2.2), pt(x1 - 0.4, y + 3.2), pt(x1, y + 3.8), 6), 0.32, COBRA.line, 0.55);
  }
  // The supraocular's rim over the eye.
  pen.hair(cub(pt(22.6, -8.8), pt(25.6, -9.8), pt(30.4, -9.4), pt(33.4, -7.6), 8), 0.42, COBRA.line, 0.7);
  // Postoculars and the big temporals behind the eye.
  for (const pts of [
    [pt(24.4, -5.8), pt(23, -3.4), pt(23.6, -1)],
    [pt(20.2, -7.6), pt(17.4, -3.2), pt(15.8, 0.4)],
    [pt(10.6, -9.6), pt(8.4, -5.2), pt(7.4, -0.6)],
    [pt(17.2, -3.6), pt(11.4, -3.6), pt(8.6, -4.6)],
  ]) pen.hair(pts, 0.3, COBRA.line, 0.5);
  // The nostril, big, near the snout's front.
  pen.fill(oval(38.6, -2.4, 0.9, 0.7, 12), COBRA.line, 0.9);
  // The pale lip scales: a band along the lip, each scale's back edge inked.
  const n = lip.length - 1;
  for (let i = 1; i < n; i += 2) {
    const p = lip[i]!;
    pen.hair([p, pt(p.x - 0.6, p.y - 3.4)], 0.42, COBRA.line, 0.8);
  }
  if (mouthOpen) return;
  for (let x = 37; x > 14; x -= 3.3) {
    const y = 3.6 + ((37 - x) / 23) * 1.4;
    pen.hair([pt(x, y), pt(x - 0.8, y + 3.2)], 0.32, COBRA.line, 0.55);
  }
}

/** The head's skin over a shape: the crown's olive, the cheek, the pale lip band, scales. */
function paintSkull(d: Draw, shape: readonly Pt[], lip: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, -12, 0, 6);
    g.addColorStop(0, P.crown);
    g.addColorStop(0.3, P.top);
    g.addColorStop(0.65, P.cheek);
    g.addColorStop(1, P.low);
    ctx.fillStyle = g;
    ctx.fillRect(-12, -14, 58, 30);
    // The same warm olive-brown as the body (cobraArt.ts modelSide).
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(154,129,80,0.55)';
    ctx.fillRect(-12, -14, 58, 30);
    ctx.restore();
    glaze(ctx, 22, -9.6, 16, 1.8, 0.02, PAPER_FILL, 0.28);
    glaze(ctx, 4, -6, 10, 6, 0, COBRA.deep, 0.35);
    glaze(ctx, 34, -3, 6, 4, 0, '#8d8660', 0.35);
    // The pale lip band, painted up from the lip.
    pen.fill([...lip, ...shift(lip, -3.6).reverse()], P.lip, 0.92);
    pen.fill([...lip, ...shift(lip, -1).reverse()], P.lipDeep, 0.4);
    const rng = createRng(33101);
    for (let i = 0; i < 150; i++) {
      const x = -6 + rng() * 46;
      const y = -11 + rng() * 11;
      pen.hair([pt(x, y), pt(x + 0.8, y + 0.4), pt(x + 0.6, y + 1.1)], 0.14, COBRA.line, 0.18);
    }
  });
}

/** The lower jaw and throat: pale cream, the infralabials edged, faint dark mottling on the throat. */
function paintJaw(d: Draw, shape: readonly Pt[], lip: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, 2, 0, 12);
    g.addColorStop(0, P.lip);
    g.addColorStop(0.55, COBRA.throat);
    g.addColorStop(1, P.lipDeep);
    ctx.fillStyle = g;
    ctx.fillRect(-12, -6, 60, 24);
    glaze(ctx, 4, 10, 12, 3, 0, COBRA.bandDeep, 0.4);
    glaze(ctx, 26, 5, 10, 1.6, -0.1, PAPER_FILL, 0.35);
    for (const [x, y] of [[6, 8.6], [12, 9.4], [1, 9.8]] as const) glaze(ctx, x, y, 1.6, 1.1, 0, COBRA.deep, 0.35);
    for (let i = 2; i < lip.length - 1; i += 2) {
      const p = lip[i]!;
      pen.hair([p, pt(p.x - 0.7, p.y + 2.8)], 0.3, COBRA.line, 0.5);
    }
  });
}

function drawMouth(d: Draw, upper: readonly Pt[], lower: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  const inside = [...upper, ...[...lower].reverse()];
  pen.fill(inside, PAPER_FILL, 1);
  pen.clipped(inside, () => {
    const g = ctx.createLinearGradient(RICTUS.x, 0, 42, 0);
    g.addColorStop(0, P.throat);
    g.addColorStop(0.35, P.mouthDeep);
    g.addColorStop(1, P.mouth);
    ctx.fillStyle = g;
    ctx.fillRect(0, -20, 50, 40);
    glaze(ctx, 30, 3, 8, 3, 0, PAPER_FILL, 0.3);
  });
  // The short fixed fangs at the front of the upper jaw.
  const f = upper[2]!;
  const fang = [pt(f.x + 0.8, f.y - 0.2), pt(f.x - 0.5, f.y + 3.2), pt(f.x - 1.2, f.y - 0.1)];
  pen.fill(fang, P.fang, 1);
  pen.hair(closed(fang), 0.2, COBRA.line, 0.6);
  pen.hair(closed(inside), 0.4, COBRA.line, 0.7);
}

/** The back of the head melts into the neck drawn under it. */
function dissolveBack(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(-10, 0, 3, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-30, -20, 33, 40);
  ctx.restore();
}

function drawHead(d: Draw, pose: CobraHeadPose): void {
  const { pen } = d;
  if (pose === 'shut') {
    paintSkull(d, HEAD, LIP);
    pen.clipped(HEAD, () => paintJaw(d, [...LIP, ...[...CHIN].reverse().slice(1)], JAW_LIP));
    shields(d, LIP, false);
    eye(d, pt(28.4, -4.3));
    pen.hair(LIP, 0.6, COBRA.line, 1);
    pen.stroke(TOP, 0.9, COBRA.line, 1);
    pen.stroke(CHIN, 0.8, COBRA.line, 1);
  } else {
    const up = -0.2;
    const down = 0.38;
    const jaw = turn(JAW, down, RICTUS);
    const jawLip = turn(JAW_LIP, down, RICTUS);
    paintJaw(d, jaw, jawLip);
    pen.stroke(turn(CHIN, down, RICTUS), 0.8, COBRA.line, 1);
    drawMouth(d, turn(LIP, up, RICTUS), jawLip);
    const { ctx } = pen;
    ctx.save();
    ctx.translate(RICTUS.x, RICTUS.y);
    ctx.rotate(up);
    ctx.translate(-RICTUS.x, -RICTUS.y);
    paintSkull(d, SKULL, LIP);
    shields(d, LIP, true);
    eye(d, pt(28.4, -4.3));
    pen.stroke(TOP, 0.9, COBRA.line, 1);
    pen.hair(LIP, 0.6, COBRA.line, 1);
    ctx.restore();
  }
  dissolveBack(d.pen.ctx);
}

export const COBRA_SIDE_HEAD: SpriteArt<CobraHeadPose> = { frame: 120, res: 10, poses: ['shut', 'strike'], draw: drawHead };
