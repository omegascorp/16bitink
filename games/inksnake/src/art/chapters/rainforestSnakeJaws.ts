import { closed, cub, type Draw, oval, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { JawSpec } from '../snakes/cornJaws';
import { glaze } from '../snakes/cornPaint';
import { FLY_PAINT } from './rainforestSnakePaint';

/**
 * The flying snake's lower jaw when it gapes, seen from above: the two
 * slender halves of the jaw swung out wide, their lip scales yellow-green
 * edged black, the pale pink floor of the mouth between with the tongue's
 * sheath and the windpipe's opening, the chin's yellow skin stretched
 * between the jaw tips, and the needle teeth raked back along each half.
 */
export const FLY_JAW: Record<'open' | 'strike', JawSpec> = {
  open: { spine: [pt(-7, 13.4), pt(4, 20.4), pt(21, 21), pt(32, 12.8)], w0: 3.8, w1: 1.6 },
  strike: { spine: [pt(-4.5, 13), pt(7, 16.6), pt(20, 16), pt(29.5, 8.6)], w0: 3.6, w1: 1.5 },
};

const F = FLY_PAINT;
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

function floorOf(up: Half, down: Half): { floor: Pt[]; web: Pt[] } {
  const tipU = up.inner[up.inner.length - 1]!;
  const tipD = down.inner[down.inner.length - 1]!;
  const chin = cub(tipU, pt(tipU.x - 3.4, tipU.y * 0.4), pt(tipD.x - 3.4, tipD.y * 0.4), tipD, 12);
  const floor = [...up.inner, ...chin.slice(1, -1), ...[...down.inner].reverse()];
  const back = cub(pt(tipU.x - 4, tipU.y - 0.8), pt(tipU.x - 7.6, tipU.y * 0.3), pt(tipD.x - 7.6, tipD.y * 0.3), pt(tipD.x - 4, tipD.y + 0.8), 12);
  return { floor, web: [...chin, ...[...back].reverse()] };
}

/** The inside of the mouth: the throat dark under the head, the floor pale pink towards the front, the sheath and glottis down the middle. */
function mouth(d: Draw, floor: readonly Pt[], web: readonly Pt[], head: readonly Pt[], front: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const g = ctx.createLinearGradient(2, 0, front, 0);
  g.addColorStop(0, F.throat);
  g.addColorStop(0.28, F.mouthDeep);
  g.addColorStop(0.68, F.mouth);
  g.addColorStop(1, '#f8e0da');
  pen.fill(floor, PAPER_FILL, 1);
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  floor.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  pen.clipped(floor, () => {
    glaze(ctx, front - 10, 5, 10, 5, 0, F.mouthDeep, 0.3);
    glaze(ctx, front - 11, -4.5, 7, 2.4, -0.1, PAPER_FILL, 0.4);
    for (const y of [-6, -3.2, 3.2, 6]) pen.hair(cub(pt(front - 3, y * 0.7), pt(front - 8, y), pt(front - 14, y * 1.1), pt(front - 20, y * 0.9), 8), 0.26, F.mouthDeep, 0.45);
    const sheath = ribbon(cub(pt(front - 20, 0.4), pt(front - 16, 0.2), pt(front - 13, 0), pt(front - 9.5, 0), 10), (u) => 2.4 - 0.6 * u).shape;
    pen.fill(sheath, '#c98a90', 0.85);
    pen.hair(closed(sheath), 0.3, F.throat, 0.55);
    const glottis = oval(front - 7.6, 0, 1.5, 1.1, 14);
    pen.fill(glottis, '#dc9298', 0.95);
    pen.hair(closed(glottis), 0.32, F.throat, 0.7);
    pen.hair([pt(front - 8.6, 0), pt(front - 6.6, 0)], 0.42, F.throat, 0.9);
    pen.fill(head.map((p) => pt(p.x + 1.6, p.y + 2.2)), F.throat, 0.35);
  });
  pen.fill(web, F.belly, 0.95);
  pen.clipped(web, () => pen.fill(web.map((p) => pt(p.x - 1.4, p.y)), F.greenDeep, 0.25));
  pen.hair(closed(web), 0.35, d.ink, 0.5);
}

/** One jaw half: yellow-green lip scales, each edged black, the black of the jaw's side along the outer edge, teeth, a contour. */
function jawHalf(d: Draw, h: Half, s: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(h.shape, PAPER_FILL, 1);
  pen.fill(h.shape, F.lip, 0.92);
  pen.clipped(h.shape, () => {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = F.black;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    h.outer.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    if (s > 0) pen.fill(h.shape.map((p) => pt(p.x - 0.6, p.y - 1)), F.net, 0.2);
    for (let i = 3; i < h.spine.length - 1; i += 2) {
      pen.hair([h.inner[i]!, h.outer[i]!], 0.36, F.net, 0.75);
      const c = h.spine[i + 1]!;
      glaze(ctx, c.x, c.y - 0.3, 1.1, 0.8, 0, F.lime, 0.5);
    }
    const gl = h.spine[Math.floor(h.spine.length * 0.45)]!;
    glaze(ctx, gl.x, gl.y - 0.6, 5, 1, 0, PAPER_FILL, 0.5);
  });
  for (let i = 6; i < h.inner.length - 2; i += 3) {
    const a = h.inner[i]!;
    const b = h.inner[i - 1]!;
    const tip = pt(a.x - 0.8, a.y - s * 0.6);
    pen.fill([a, tip, b], PAPER_FILL, 1);
    pen.hair([a, tip, b], 0.18, d.ink, 0.3);
  }
  pen.stroke(closed(h.shape), s > 0 ? 1.3 : 1, d.ink, 0.95);
}

/** The gaping lower jaw and mouth, painted under the head; `head` is the head's outline (for its cast shadow). */
export function flyJaws(d: Draw, j: JawSpec, head: readonly Pt[]): void {
  const up = half(j, -1);
  const down = half(j, 1);
  const { floor, web } = floorOf(up, down);
  mouth(d, floor, web, head, j.spine[3].x - 2);
  jawHalf(d, up, -1);
  jawHalf(d, down, 1);
}
