import { closed, cub, type Draw, oval, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { JawSpec } from '../snakes/cornJaws';
import { glaze } from '../snakes/cornPaint';
import type { SpriteArt } from '../types';
import { EGG_PAINT } from './savannaSnakePaint';

/**
 * The egg-eater's lower jaw when it gapes, seen from above: the two halves
 * swung out wide, pale lip scales freckled grey, and between them the
 * inside of the mouth, which is black (its threat display: it gapes the
 * black mouth at whatever bothers it). It is almost toothless, so no teeth
 * show, only the soft dark gums. Also its tongue.
 */
export const EGG_JAW: Record<'open' | 'strike', JawSpec> = {
  open: { spine: [pt(-6, 12.4), pt(4, 19.6), pt(18, 20.2), pt(27.5, 12.4)], w0: 3.8, w1: 1.6 },
  strike: { spine: [pt(-4, 12), pt(6, 15.6), pt(17, 15.2), pt(25.5, 8.2)], w0: 3.6, w1: 1.5 },
};

const E = EGG_PAINT;
const flip = (pts: readonly Pt[], s: number): Pt[] => pts.map((p) => pt(p.x, p.y * s));

interface Half {
  shape: Pt[];
  inner: Pt[];
  outer: Pt[];
  spine: Pt[];
}

/** One jaw half on side s (1: y > 0). */
function half(j: JawSpec, s: 1 | -1): Half {
  const [a, b, c, e] = j.spine;
  const spine = flip(cub(a, b, c, e, 22), s);
  const r = ribbon(spine, (u) => j.w0 + (j.w1 - j.w0) * u);
  const inner = s > 0 ? r.top : r.bot;
  const outer = s > 0 ? r.bot : r.top;
  const tip = spine[spine.length - 1]!;
  const prev = spine[spine.length - 2]!;
  const l = Math.hypot(tip.x - prev.x, tip.y - prev.y) || 1;
  const point = pt(tip.x + ((tip.x - prev.x) / l) * j.w1 * 0.7, tip.y + ((tip.y - prev.y) / l) * j.w1 * 0.7);
  return { shape: [...outer, point, ...[...inner].reverse()], inner, outer, spine };
}

/** The black inside of the mouth: near-black in the throat, a sooty sheen towards the chin, the tongue's sheath and glottis faintly paler. */
function mouth(d: Draw, up: Half, down: Half, head: readonly Pt[], front: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const tipU = up.inner[up.inner.length - 1]!;
  const tipD = down.inner[down.inner.length - 1]!;
  const chin = cub(tipU, pt(tipU.x - 3.2, tipU.y * 0.4), pt(tipD.x - 3.2, tipD.y * 0.4), tipD, 12);
  const floor = [...up.inner, ...chin.slice(1, -1), ...[...down.inner].reverse()];
  const back = cub(pt(tipU.x - 3.6, tipU.y - 0.8), pt(tipU.x - 7, tipU.y * 0.3), pt(tipD.x - 7, tipD.y * 0.3), pt(tipD.x - 3.6, tipD.y + 0.8), 12);
  const web = [...chin, ...[...back].reverse()];
  const g = ctx.createLinearGradient(2, 0, front, 0);
  g.addColorStop(0, E.mouthDeep);
  g.addColorStop(0.5, E.mouth);
  g.addColorStop(1, '#3d3335');
  pen.fill(floor, PAPER_FILL, 1);
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  floor.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  pen.clipped(floor, () => {
    // A wet sheen on the black, where the light catches it.
    glaze(ctx, front - 10, -4.5, 7, 2.2, -0.1, '#8c8288', 0.35);
    glaze(ctx, front - 6, 4, 4, 1.4, 0.2, '#6d6468', 0.25);
    for (const y of [-6, -3, 3, 6]) pen.hair(cub(pt(front - 3, y * 0.7), pt(front - 8, y), pt(front - 14, y * 1.1), pt(front - 20, y * 0.9), 8), 0.3, '#5e5458', 0.5);
    const sheath = ribbon(cub(pt(front - 19, 0.3), pt(front - 15, 0.1), pt(front - 12, 0), pt(front - 9, 0), 10), (u) => 2.4 - 0.5 * u).shape;
    pen.fill(sheath, E.gum, 0.9);
    pen.hair(closed(sheath), 0.3, '#0a0708', 0.6);
    const glottis = oval(front - 7.2, 0, 1.5, 1.05, 14);
    pen.fill(glottis, '#5a4a4c', 0.95);
    pen.hair(closed(glottis), 0.3, '#0a0708', 0.8);
    pen.hair([pt(front - 8.1, 0), pt(front - 6.3, 0)], 0.42, '#0a0708', 0.9);
    pen.fill(head.map((p) => pt(p.x + 1.6, p.y + 2.2)), '#000000', 0.35);
  });
  // The soft gums along each half (no teeth to speak of).
  for (const h of [up, down]) pen.stroke(h.inner, 0.9, E.gum, 0.85, false);
  pen.fill(web, E.lip, 0.95);
  pen.clipped(web, () => {
    for (let i = 0; i < 8; i++) {
      const y = -4.4 + i * 1.25;
      pen.fill(oval(front - 2.6 - Math.abs(y) * 0.25, y, 0.65, 0.42, 8), i % 3 === 1 ? '#7d7468' : '#bfb196', 0.7);
    }
    pen.fill(web.map((p) => pt(p.x - 1.4, p.y)), E.mouth, 0.25);
  });
  pen.hair(closed(web), 0.35, d.ink, 0.5);
}

/** One jaw half: pale lip scales on top, the grey-brown of its side along the outer edge, sutures freckled grey, a contour. */
function jawHalf(d: Draw, h: Half, s: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(h.shape, PAPER_FILL, 1);
  pen.fill(h.shape, E.lip, 0.92);
  pen.clipped(h.shape, () => {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = E.ground;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    h.outer.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    if (s > 0) pen.fill(h.shape.map((p) => pt(p.x - 0.6, p.y - 1)), E.shadow, 0.2);
    for (let i = 3; i < h.spine.length - 1; i += 2) {
      pen.hair([h.inner[i]!, h.outer[i]!], 0.3, E.shadow, 0.5);
      if (i % 4 === 1) {
        const c = h.spine[i + 1]!;
        glaze(ctx, c.x, c.y, 1.2, 1, 0, E.cool, 0.55);
      }
    }
    const gl = h.spine[Math.floor(h.spine.length * 0.45)]!;
    glaze(ctx, gl.x, gl.y - 0.6, 5, 1, 0, PAPER_FILL, 0.5);
  });
  pen.stroke(closed(h.shape), s > 0 ? 1.3 : 1, d.ink, 0.95);
}

/** The gaping lower jaw and black mouth, painted under the head; `head` is the head's outline (for its cast shadow). */
export function eggJaws(d: Draw, j: JawSpec, head: readonly Pt[]): void {
  const up = half(j, -1);
  const down = half(j, 1);
  mouth(d, up, down, head, j.spine[3].x - 2);
  jawHalf(d, up, -1);
  jawHalf(d, down, 1);
}

/** The forked tongue: a sooty grey-black stem, splitting into two fine tines. */
function drawTongue(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const stem = cub(pt(-1, 0), pt(3.6, -0.6), pt(7, 0.7), pt(10, 0.2), 12);
  const shape = ribbon(stem, (u) => 1.15 - 0.4 * u).shape;
  const tine = (s: 1 | -1): Pt[] => ribbon(cub(pt(9.6, 0.2), pt(11.6, 0.3 + s * 0.4), pt(13.4, s * 1.6), pt(15.2, s * 2.7), 8), (u) => 0.78 - 0.6 * u).shape;
  const fork = ctx.createLinearGradient(8, 0, 15, 0);
  fork.addColorStop(0, E.tongue);
  fork.addColorStop(1, E.tongueTip);
  for (const s of [1, -1] as const) {
    const t = tine(s);
    ctx.save();
    ctx.fillStyle = fork;
    ctx.beginPath();
    t.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    pen.hair(closed(t), 0.2, d.ink, 0.5);
  }
  pen.fill(shape, E.tongue, 1);
  pen.clipped(shape, () => {
    pen.fill(shape.map((p) => pt(p.x, p.y + 0.5)), E.tongueTip, 0.5);
    pen.hair(stem.map((p) => pt(p.x, p.y - 0.32)), 0.28, '#a49aa2', 0.6);
  });
  pen.hair(closed(shape), 0.24, d.ink, 0.55);
}

export const EGG_TONGUE: SpriteArt<'flick'> = {
  frame: 36,
  res: 4,
  poses: ['flick'],
  draw: drawTongue,
};
