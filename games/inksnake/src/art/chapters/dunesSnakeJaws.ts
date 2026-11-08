import { closed, cub, type Draw, oval, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { JawSpec } from '../snakes/cornJaws';
import { glaze } from '../snakes/cornPaint';

/**
 * The Dunes snakes' lower jaws when they gape, seen from above: the two
 * halves swung out wide (a snake's aren't joined at the chin), the floor of
 * the mouth between with the tongue's sheath and the windpipe's opening,
 * the chin's skin stretched between the jaw tips, small teeth raked back.
 * Each snake brings its own colours; a viper also shows its fangs, swung
 * forward from under the snout as the mouth opens.
 */
export interface JawPaint {
  /** The lip scales, and the colour of the jaw's side along its outer edge. */
  readonly lip: string;
  readonly side: string;
  /** The sutures between the lip scales. */
  readonly suture: string;
  /** Spots on every other lip scale, if any. */
  readonly spot?: string;
  readonly shadow: string;
  readonly mouth: string;
  readonly mouthDeep: string;
  readonly throat: string;
  readonly chin: string;
}

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

/** The inside of the mouth: the throat dark under the head, the floor paler towards the front, the sheath and glottis down the middle. */
function mouth(d: Draw, p: JawPaint, floor: readonly Pt[], web: readonly Pt[], head: readonly Pt[], front: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const g = ctx.createLinearGradient(2, 0, front, 0);
  g.addColorStop(0, p.throat);
  g.addColorStop(0.28, p.mouthDeep);
  g.addColorStop(0.68, p.mouth);
  g.addColorStop(1, PAPER_FILL);
  pen.fill(floor, PAPER_FILL, 1);
  pen.fill(floor, p.mouth, 0.3);
  ctx.save();
  ctx.globalAlpha = 0.92;
  pen.clipped(floor, () => {
    ctx.fillStyle = g;
    ctx.fillRect(-40, -40, 80, 80);
  });
  ctx.restore();
  pen.clipped(floor, () => {
    glaze(ctx, front - 10, 5, 10, 5, 0, p.mouthDeep, 0.32);
    glaze(ctx, front - 11, -4.5, 7, 2.4, -0.1, PAPER_FILL, 0.45);
    for (const y of [-6, -3.2, 3.2, 6]) pen.hair(cub(pt(front - 3, y * 0.7), pt(front - 8, y), pt(front - 14, y * 1.1), pt(front - 20, y * 0.9), 8), 0.26, p.mouthDeep, 0.45);
    const sheath = ribbon(cub(pt(front - 20, 0.4), pt(front - 16, 0.2), pt(front - 13, 0), pt(front - 9.5, 0), 10), (u) => 2.6 - 0.6 * u).shape;
    pen.fill(sheath, p.mouthDeep, 0.8);
    pen.hair(closed(sheath), 0.3, p.throat, 0.55);
    pen.hair([pt(front - 12, 0), pt(front - 9.6, 0)], 0.5, p.throat, 0.8);
    const glottis = oval(front - 7.6, 0, 1.6, 1.15, 14);
    pen.fill(glottis, p.mouthDeep, 0.9);
    pen.hair(closed(glottis), 0.32, p.throat, 0.7);
    pen.hair([pt(front - 8.6, 0), pt(front - 6.6, 0)], 0.42, p.throat, 0.9);
    pen.fill(head.map((q) => pt(q.x + 1.6, q.y + 2.2)), p.throat, 0.35);
  });
  pen.fill(web, p.chin, 0.95);
  pen.clipped(web, () => {
    for (let i = 0; i < 9; i++) {
      const y = -5 + i * 1.25;
      pen.fill(oval(front - 2.8 - Math.abs(y) * 0.25, y, 0.7, 0.45, 8), p.suture, 0.35);
    }
    pen.fill(web.map((q) => pt(q.x - 1.4, q.y)), p.mouthDeep, 0.22);
  });
  pen.hair(closed(web), 0.35, d.ink, 0.5);
}

/** One jaw half: lip scales on top, the jaw's side along the outer edge, sutures, teeth, a contour. */
function jawHalf(d: Draw, p: JawPaint, h: Half, s: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(h.shape, PAPER_FILL, 1);
  pen.fill(h.shape, p.lip, 0.92);
  pen.clipped(h.shape, () => {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = p.side;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    h.outer.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
    ctx.stroke();
    ctx.restore();
    if (s > 0) pen.fill(h.shape.map((q) => pt(q.x - 0.6, q.y - 1)), p.shadow, 0.2);
    for (let i = 3; i < h.spine.length - 1; i += 2) {
      pen.hair([h.inner[i]!, h.outer[i]!], 0.3, p.suture, 0.6);
      if (p.spot && i % 4 === 1) {
        const c = h.spine[i + 1]!;
        glaze(ctx, c.x, c.y, 1.3, 1.1, 0, p.spot, 0.5);
      }
    }
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
export function duneJaws(d: Draw, p: JawPaint, j: JawSpec, head: readonly Pt[]): void {
  const up = half(j, -1);
  const down = half(j, 1);
  const { floor, web } = floorOf(up, down);
  mouth(d, p, floor, web, head, j.spine[3].x - 2);
  jawHalf(d, p, up, -1);
  jawHalf(d, p, down, 1);
}

/**
 * A viper's two fangs swung forward as it gapes: long, curved, ivory, each
 * in its fleshy sheath, hanging from under the snout at `root` (frame px,
 * y > 0 side mirrored) and reaching `reach` forward. Painted over the mouth,
 * under the head.
 */
export function fangs(d: Draw, root: Pt, reach: number, sheath: string): void {
  const { pen } = d;
  for (const s of [-1, 1] as const) {
    const a = pt(root.x, root.y * s);
    const spine = cub(a, pt(a.x + reach * 0.45, a.y + s * 0.5), pt(a.x + reach * 0.85, a.y - s * 0.2), pt(a.x + reach, a.y - s * 1.4), 10);
    const tooth = ribbon(spine, (u) => 1.5 * (1 - u) + 0.15).shape;
    const fold = ribbon(spine.slice(0, 5), (u) => 2.6 - 1.4 * u).shape;
    pen.fill(fold.map((q) => pt(q.x + 0.6, q.y + 0.9)), d.ink, 0.22);
    pen.fill(fold, sheath, 0.9);
    pen.fill(tooth.map((q) => pt(q.x + 0.5, q.y + 0.8)), d.ink, 0.25);
    pen.fill(tooth, PAPER_FILL, 1);
    pen.fill(tooth, '#efe4c6', 0.6);
    pen.clipped(tooth, () => pen.fill(tooth.map((q) => pt(q.x, q.y + 0.6)), '#b9a57c', 0.45));
    pen.hair(closed(tooth), 0.3, d.ink, 0.8);
    pen.hair(closed(fold), 0.25, d.ink, 0.45);
  }
}
