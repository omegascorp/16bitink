import { closed, cub, type Draw, oval, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { CORN_PAINT, glaze } from './cornPaint';

/**
 * The corn snake's lower jaw when it gapes, seen from above: the two halves
 * of the jaw (not joined at the chin, as a snake's aren't) swung out wide,
 * the pink floor of the mouth between them with the tongue's sheath and the
 * windpipe's opening, the skin of the chin stretched between the jaw tips,
 * and the needle teeth raked back along each half.
 */
export interface JawSpec {
  /** The jaw half's spine on the y > 0 side, back (jaw corner) to tip, in frame coordinates. */
  readonly spine: readonly [Pt, Pt, Pt, Pt];
  /** Its width at the corner and at the tip. */
  readonly w0: number;
  readonly w1: number;
}

export const CORN_JAW: Record<'open' | 'strike', JawSpec> = {
  open: { spine: [pt(-8, 12.8), pt(3, 19.5), pt(19, 20.5), pt(29.5, 12.8)], w0: 3.9, w1: 1.7 },
  strike: { spine: [pt(-5, 12.6), pt(6, 16), pt(18, 15.5), pt(27, 8.4)], w0: 3.7, w1: 1.6 },
};

const flip = (pts: readonly Pt[], s: number): Pt[] => pts.map((p) => pt(p.x, p.y * s));

interface Half {
  shape: Pt[];
  inner: Pt[];
  outer: Pt[];
  spine: Pt[];
  tip: Pt;
}

/** One jaw half on side s (1: y > 0). */
function half(j: JawSpec, s: 1 | -1): Half {
  const [a, b, c, e] = j.spine;
  const spine = flip(cub(a, b, c, e, 22), s);
  const r = ribbon(spine, (u) => j.w0 + (j.w1 - j.w0) * u);
  // ribbon's top is to the left of travel (towards −y): inner on the y > 0 side, outer on the other.
  const inner = s > 0 ? r.top : r.bot;
  const outer = s > 0 ? r.bot : r.top;
  const tip = spine[spine.length - 1]!;
  const prev = spine[spine.length - 2]!;
  const l = Math.hypot(tip.x - prev.x, tip.y - prev.y) || 1;
  const point = pt(tip.x + ((tip.x - prev.x) / l) * j.w1 * 0.7, tip.y + ((tip.y - prev.y) / l) * j.w1 * 0.7);
  return { shape: [...outer, point, ...[...inner].reverse()], inner, outer, spine, tip };
}

/** The mouth's floor: from the jaw corners (under the head) between both halves' inner edges to the chin's stretched skin. */
function floorOf(up: Half, down: Half): { floor: Pt[]; web: Pt[] } {
  const tipU = up.inner[up.inner.length - 1]!;
  const tipD = down.inner[down.inner.length - 1]!;
  const chin = cub(tipU, pt(tipU.x - 3.4, tipU.y * 0.4), pt(tipD.x - 3.4, tipD.y * 0.4), tipD, 12);
  const floor = [...up.inner, ...chin.slice(1, -1), ...[...down.inner].reverse()];
  const back = cub(pt(tipU.x - 4, tipU.y - 0.8), pt(tipU.x - 7.6, tipU.y * 0.3), pt(tipD.x - 7.6, tipD.y * 0.3), pt(tipD.x - 4, tipD.y + 0.8), 12);
  return { floor, web: [...chin, ...[...back].reverse()] };
}

function fillPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[], style: string | CanvasGradient): void {
  ctx.save();
  ctx.fillStyle = style;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The pink inside: the throat deep under the head, the floor lit towards the front, the sheath and glottis down the middle. */
function mouth(d: Draw, floor: readonly Pt[], web: readonly Pt[], head: readonly Pt[], front: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const g = ctx.createLinearGradient(2, 0, front, 0);
  g.addColorStop(0, CORN_PAINT.throat);
  g.addColorStop(0.3, CORN_PAINT.mouthDeep);
  g.addColorStop(0.7, CORN_PAINT.mouth);
  g.addColorStop(1, '#f2b8bc');
  pen.fill(floor, PAPER_FILL, 1);
  fillPath(ctx, floor, g);
  pen.clipped(floor, () => {
    // The floor rounds down into the throat: deeper along the far side, a wet sheen on the near.
    glaze(ctx, front - 10, 5, 10, 5, 0, CORN_PAINT.mouthDeep, 0.35);
    glaze(ctx, front - 11, -4.5, 7, 2.4, -0.1, PAPER_FILL, 0.35);
    // The tongue's sheath down the middle and the glottis in front of it.
    const sheath = ribbon(cub(pt(front - 20, 0.4), pt(front - 16, 0.2), pt(front - 13, 0), pt(front - 9.5, 0), 10), (u) => 2.6 - 0.6 * u).shape;
    pen.fill(sheath, '#c86070', 0.85);
    pen.hair(closed(sheath), 0.3, CORN_PAINT.throat, 0.55);
    pen.hair([pt(front - 12, 0), pt(front - 9.6, 0)], 0.5, CORN_PAINT.throat, 0.8);
    const glottis = oval(front - 7.6, 0, 1.6, 1.15, 14);
    pen.fill(glottis, '#d47684', 0.95);
    pen.hair(closed(glottis), 0.32, CORN_PAINT.throat, 0.7);
    pen.hair([pt(front - 8.6, 0), pt(front - 6.6, 0)], 0.42, CORN_PAINT.throat, 0.9);
    // The head's shadow cast forward and down onto the floor.
    pen.fill(head.map((p) => pt(p.x + 1.6, p.y + 2.2)), CORN_PAINT.throat, 0.35);
  });
  // The chin's skin stretched between the jaw tips: pale, its scales pulled apart.
  pen.fill(web, CORN_PAINT.cream, 0.95);
  pen.clipped(web, () => {
    for (let i = 0; i < 9; i++) {
      const y = -5 + i * 1.25;
      pen.fill(oval(front - 2.8 - Math.abs(y) * 0.25, y, 0.7, 0.45, 8), '#d9b896', 0.7);
    }
    pen.fill(web.map((p) => pt(p.x - 1.4, p.y)), CORN_PAINT.mouthDeep, 0.25);
  });
  pen.hair(closed(web), 0.35, d.ink, 0.5);
}

/** One jaw half: pale lip scales on top, the orange of its side along the outer edge, sutures, teeth, a contour. */
function jawHalf(d: Draw, h: Half, s: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(h.shape, PAPER_FILL, 1);
  pen.fill(h.shape, CORN_PAINT.cream, 0.9);
  pen.clipped(h.shape, () => {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = CORN_PAINT.ground;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    h.outer.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    if (s > 0) pen.fill(h.shape.map((p) => pt(p.x - 0.6, p.y - 1)), CORN_PAINT.shadow, 0.18);
    // The sutures between the lip scales, each edged in black as a corn's are.
    for (let i = 3; i < h.spine.length - 1; i += 2) pen.hair([h.inner[i]!, h.outer[i]!], 0.32, CORN_PAINT.rim, 0.6);
    const gl = h.spine[Math.floor(h.spine.length * 0.45)]!;
    glaze(ctx, gl.x, gl.y - 0.6, 5, 1, 0, PAPER_FILL, 0.5);
  });
  // Teeth along the inner edge, raked back towards the throat.
  for (let i = 6; i < h.inner.length - 2; i += 3) {
    const a = h.inner[i]!;
    const b = h.inner[i - 1]!;
    const tip = pt(a.x - 0.7, a.y - s * 0.6);
    pen.fill([a, tip, b], PAPER_FILL, 1);
    pen.hair([a, tip, b], 0.18, d.ink, 0.3);
  }
  pen.stroke(closed(h.shape), s > 0 ? 1.3 : 1, d.ink, 0.95);
}

/** The gaping lower jaw and mouth, painted under the head; `head` is the head's outline (for its cast shadow). */
export function jaws(d: Draw, j: JawSpec, head: readonly Pt[]): void {
  const up = half(j, -1);
  const down = half(j, 1);
  const { floor, web } = floorOf(up, down);
  mouth(d, floor, web, head, j.spine[3].x - 2);
  jawHalf(d, up, -1);
  jawHalf(d, down, 1);
}
