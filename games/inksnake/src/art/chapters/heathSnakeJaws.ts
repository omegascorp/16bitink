import { closed, cub, type Draw, oval, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { JawSpec } from '../snakes/cornJaws';
import { glaze } from '../snakes/cornPaint';
import { ADDER_PAINT } from './heathSnakePaint';

/**
 * The adder's lower jaw when it gapes, seen from above: the two halves of
 * the jaw swung out wide, white lip scales edged in black along them (the
 * male's chin is pale, barred dark), the pale pink floor of the mouth with
 * the tongue's sheath and the windpipe's opening, the chin's skin stretched
 * between the jaw tips; and the two long fangs, swung forward on their
 * hinges, curving down out from under the raised snout.
 */
export const ADDER_JAW: Record<'open' | 'strike', JawSpec> = {
  open: { spine: [pt(-8, 13.2), pt(3, 19.8), pt(18.5, 20.6), pt(28.5, 12.8)], w0: 4, w1: 1.7 },
  strike: { spine: [pt(-5, 13), pt(6, 16.2), pt(17, 15.6), pt(26, 8.4)], w0: 3.8, w1: 1.6 },
};

const A = ADDER_PAINT;
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
  g.addColorStop(0, A.throat);
  g.addColorStop(0.3, A.mouthDeep);
  g.addColorStop(0.7, A.mouth);
  g.addColorStop(1, '#f8e4de');
  pen.fill(floor, PAPER_FILL, 1);
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  floor.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  pen.clipped(floor, () => {
    glaze(ctx, front - 10, 5, 10, 5, 0, A.mouthDeep, 0.3);
    glaze(ctx, front - 11, -4.5, 7, 2.4, -0.1, PAPER_FILL, 0.42);
    for (const y of [-6, -3.2, 3.2, 6]) pen.hair(cub(pt(front - 3, y * 0.7), pt(front - 8, y), pt(front - 14, y * 1.1), pt(front - 20, y * 0.9), 8), 0.26, A.mouthDeep, 0.45);
    const sheath = ribbon(cub(pt(front - 20, 0.4), pt(front - 16, 0.2), pt(front - 13, 0), pt(front - 9.5, 0), 10), (u) => 2.6 - 0.6 * u).shape;
    pen.fill(sheath, '#c98088', 0.85);
    pen.hair(closed(sheath), 0.3, A.throat, 0.55);
    const glottis = oval(front - 7.6, 0, 1.6, 1.15, 14);
    pen.fill(glottis, '#d98c92', 0.95);
    pen.hair(closed(glottis), 0.32, A.throat, 0.7);
    pen.hair([pt(front - 8.6, 0), pt(front - 6.6, 0)], 0.42, A.throat, 0.9);
    pen.fill(head.map((p) => pt(p.x + 1.6, p.y + 2.2)), A.throat, 0.35);
  });
  pen.fill(web, A.lip, 0.95);
  pen.clipped(web, () => {
    for (let i = 0; i < 7; i++) {
      const y = -4.5 + i * 1.5;
      pen.fill(oval(front - 2.8 - Math.abs(y) * 0.25, y, 0.55, 0.4, 8), A.bar, 0.35);
    }
    pen.fill(web.map((p) => pt(p.x - 1.4, p.y)), A.mouthDeep, 0.2);
  });
  pen.hair(closed(web), 0.35, d.ink, 0.5);
}

/** One jaw half: white lip scales, each sutured in black, the grey of its side along the outer edge, small teeth, a contour. */
function jawHalf(d: Draw, h: Half, s: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(h.shape, PAPER_FILL, 1);
  pen.fill(h.shape, A.lip, 0.92);
  pen.clipped(h.shape, () => {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.grey;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    h.outer.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    if (s > 0) pen.fill(h.shape.map((p) => pt(p.x - 0.6, p.y - 1)), A.shadow, 0.2);
    for (let i = 3; i < h.spine.length - 1; i += 2) pen.hair([h.inner[i]!, h.outer[i]!], i % 4 === 1 ? 0.6 : 0.32, A.bar, 0.75);
    const gl = h.spine[Math.floor(h.spine.length * 0.45)]!;
    glaze(ctx, gl.x, gl.y - 0.6, 5, 1, 0, PAPER_FILL, 0.5);
  });
  for (let i = 6; i < h.inner.length - 2; i += 3) {
    const a = h.inner[i]!;
    const b = h.inner[i - 1]!;
    const tip = pt(a.x - 0.7, a.y - s * 0.6);
    pen.fill([a, tip, b], PAPER_FILL, 1);
    pen.hair([a, tip, b], 0.18, d.ink, 0.3);
  }
  pen.stroke(closed(h.shape), s > 0 ? 1.35 : 1.05, d.ink, 0.95);
}

/** The gaping lower jaw and mouth, painted under the head; `head` is the head's outline (for its cast shadow). */
export function adderJaws(d: Draw, j: JawSpec, head: readonly Pt[]): void {
  const up = half(j, -1);
  const down = half(j, 1);
  const { floor, web } = floorOf(up, down);
  mouth(d, floor, web, head, j.spine[3].x - 2);
  jawHalf(d, up, -1);
  jawHalf(d, down, 1);
}

/** The two fangs swung forward, from `base` (under the snout, side by side) curving down and in: ivory, shaded on the far side, a glint. */
export function fangs(d: Draw, base: Pt, reach: number): void {
  const { pen } = d;
  for (const s of [-1, 1] as const) {
    const b = pt(base.x, base.y + s * 3.6);
    const spine = cub(b, pt(b.x + reach * 0.45, b.y + s * 0.2), pt(b.x + reach * 0.8, b.y - s * 0.3), pt(b.x + reach, b.y - s * 1.1), 10);
    const shape = ribbon(spine, (u) => 1.35 * (1 - u) + 0.15).shape;
    pen.fill(shape.map((p) => pt(p.x + 0.6, p.y + 0.9)), d.ink, 0.22);
    pen.fill(shape, A.fang, 1);
    pen.clipped(shape, () => pen.fill(shape.map((p) => pt(p.x, p.y + 0.5)), '#b9ae98', 0.55));
    pen.hair(closed(shape), 0.32, d.ink, 0.8);
    pen.hair(spine.slice(1, 6).map((p) => pt(p.x, p.y - 0.25)), 0.22, PAPER_FILL, 0.9);
  }
}
