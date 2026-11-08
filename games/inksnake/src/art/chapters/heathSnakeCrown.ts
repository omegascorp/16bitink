import { closed, cub, type Draw, oval, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, pathOf, type Pt } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { rgba } from '../wash';
import { centreOf } from './barrensSnakePaint';
import { ADDER_PAINT, dense, type Warp } from './heathSnakePaint';

/**
 * The adder's head markings and plates, from above, in the head's frame
 * (facing +x, centred between the eyes): the dark V on the crown with its
 * point between the eyes and its arms flaring back over the parietals, two
 * short spurs forward (so it reads as the adder's X), the dark stripe from
 * each eye back along the side of the neck, the white upper lip barred
 * black, and the plates drawn in fine line.
 */
const A = ADDER_PAINT;

/** A dark mark as watercolour: the black laid in, lifted a little towards the light, pooled darker at its edge, a pen rim. */
export function paintMark(ctx: CanvasRenderingContext2D, shape: readonly Pt[], seed: number, ink: string, rim = 1): void {
  const pen = new Pen(ctx, seed, 0.3);
  const { cx, cy, rx, ry } = centreOf(shape);
  pen.fill(shape, A.zig, 0.94);
  pen.clipped(shape, () => {
    glaze(ctx, cx - rx * 0.15, cy - ry * 0.3, rx * 0.85, ry * 0.6, 0, A.zigLit, 0.42);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(A.zigDeep, 0.6);
    ctx.lineWidth = rim * 1.8;
    pathOf(ctx, shape);
    ctx.stroke();
    ctx.restore();
    pen.stroke(closed(shape), rim * 0.9, A.rim, 0.8, false);
  });
  pen.hair(closed(shape), 0.26, ink, 0.32);
}

/** One arm of the V on side s: from its point between the eyes back over the parietal, widening into a club. */
function vArm(s: 1 | -1): Pt[] {
  const spine = cub(pt(4.2, 0.2 * s), pt(0.6, 2.6 * s), pt(-4, 5.4 * s), pt(-9.6, 7.6 * s), 16);
  return dense(ribbon(spine, (u) => 1.9 + 1.4 * u * u).shape, 0.8);
}

/** The short spur forward of the V on side s, towards the front of the supraocular. */
function spur(s: 1 | -1): Pt[] {
  const spine = cub(pt(3.4, 0.4 * s), pt(4.8, 1.4 * s), pt(6, 2.2 * s), pt(7.2, 2.7 * s), 8);
  return dense(ribbon(spine, (u) => 1.7 - 1 * u).shape, 0.7);
}

/** The stripe from behind the eye back along the side of the neck, on side s. */
function eyeStripe(s: 1 | -1): Pt[] {
  const spine = cub(pt(3.4, 11.8 * s), pt(-1.5, 12.3 * s), pt(-7, 12.6 * s), pt(-15.5, 11 * s), 14);
  return dense(ribbon(spine, (u) => 2.6 - 0.5 * u).shape, 0.8);
}

/** The pale upper lip along the side of the head on side s (from the jaw angle to the snout), and where its black bars fall. */
function lip(s: 1 | -1): { band: Pt[]; bars: Pt[][] } {
  const spine = cub(pt(-5, 14.1 * s), pt(4, 14.3 * s), pt(13, 11.4 * s), pt(19.3, 5 * s), 18);
  const band = dense(ribbon(spine, () => 1.6).shape, 0.8);
  const bars = [2, 5, 8, 11, 14, 17].map((i) => {
    const p = spine[i]!;
    const q = spine[i + 1]!;
    const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const nx = ((q.y - p.y) / l) * 1.2;
    const ny = (-(q.x - p.x) / l) * 1.2;
    return [pt(p.x - nx, p.y - ny), pt(p.x + nx, p.y + ny)];
  });
  return { band, bars };
}

/** The marks on head and neck, warped to the pose; `nape` is the zigzag's start behind the head (unwarped). */
export function adderMarks(d: Draw, w: Warp, nape: readonly Pt[]): void {
  const { ctx } = d.pen;
  const map = (pts: readonly Pt[]): Pt[] => pts.map(w);
  for (const s of [1, -1] as const) {
    const l = lip(s);
    d.pen.fill(map(l.band), A.lip, 0.8);
    for (const b of l.bars) d.pen.hair(map(b), 0.75, A.bar, 0.7);
  }
  glaze(ctx, -13, 0, 4.5, 3, 0, A.pale, 0.4);
  paintMark(ctx, map(nape), 16000 + d.f, d.ink, 1);
  for (const s of [1, -1] as const) paintMark(ctx, map(eyeStripe(s)), 16100 + s + d.f, d.ink, 0.95);
  for (const s of [1, -1] as const) paintMark(ctx, map(vArm(s)), 16200 + s + d.f, d.ink, 1);
  for (const s of [1, -1] as const) paintMark(ctx, map(spur(s)), 16300 + s + d.f, d.ink, 0.8);
}

/** The crown's plates in fine line (upper half; mirrored), and the small scales of the snout. */
const PLATES: readonly (readonly Pt[])[] = [
  // The frontal: a shield between the supraoculars.
  [pt(10.4, 0), pt(10.2, -3.3), pt(3.4, -3.5), pt(0.2, 0)],
  // The parietals behind it.
  [pt(3.4, -3.5), pt(1.4, -7.2), pt(-4.6, -7), pt(-6.6, -2.2), pt(-6.2, 0)],
  // The supraocular, long, over the eye.
  [pt(10.6, -4), pt(10.8, -9.2), pt(8.6, -11.4), pt(3, -11.6), pt(1.4, -8.6), pt(3.4, -3.6)],
  // Canthals and the apical along the snout's ridge.
  [pt(10.8, -9.2), pt(13.6, -8.4), pt(16.4, -6.4)],
  [pt(10.4, -3.3), pt(13.4, -3.1), pt(13.6, -8.4)],
  [pt(13.4, -3.1), pt(16.6, -2.6), pt(16.4, -6.4)],
  // The rostral seen from above, just at the tip.
  [pt(16.6, -2.6), pt(19.6, -3), pt(20.6, -1.4)],
  [pt(13.4, 0), pt(13.4, -3.1)],
  [pt(16.6, 0), pt(16.6, -2.6)],
];

export function adderPlates(d: Draw, w: Warp): void {
  const { pen } = d;
  for (const plate of PLATES) {
    for (const side of [1, -1]) pen.hair(dense(plate, 0.8).map((p) => w(pt(p.x, p.y * side))), 0.34, d.ink, side < 0 ? 0.42 : 0.55);
  }
  // The small scales between the parietals and the neck, and over the temples, each a faint loop.
  for (let i = 0; i < 26; i++) {
    const x = -7.5 - (i % 6) * 1.5 - (Math.floor(i / 6) % 2) * 0.75;
    const y = -8 + Math.floor(i / 6) * 3.2 + ((i * 7) % 3) * 0.3;
    const c = w(pt(x, y));
    pen.hair(closed(oval(c.x, c.y, 0.7, 0.55, 8)), 0.22, d.ink, 0.3);
  }
  const lit = w(pt(14.8, -1.6));
  pen.dot(lit.x, lit.y, 0.4, PAPER_FILL, 0.5);
}
