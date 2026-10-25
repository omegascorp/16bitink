import { closed, cub, type Draw, normals, oval, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { blotchShape, flankHatch, glaze } from '../snakes/cornPaint';
import { SNAKE_W, type SpriteArt } from '../types';
import { ANA_JAW, anaJaws } from './floodedSnakeJaws';
import { anaCrossWash, anaModel, type AnacondaTone, flecks, paintOcellus, paintSpot, smoothScales } from './floodedSnakePaint';

/**
 * The green anaconda's head from above, facing +x, the frame centred
 * between the eyes: long, flat and hardly wider than the thick neck, the
 * snout broad and blunt. The eyes sit up on top of the head and the
 * nostrils on top of the snout (so it can lie with only those above the
 * water), the crown covered in small scales, and an orange stripe edged in
 * black runs back from each eye to the angle of the jaw. The neck is the
 * back strip's cross-section and fades out at the back, where the strip
 * under it takes over.
 */
type HeadPose = 'shut' | 'open' | 'strike';

const FRAME = 72;
const HALF_W = SNAKE_W / 2;
const NECK = HALF_W - 1.2;
const TIP = 24.6;
/** Where the tongue comes out: the notch at the front of the snout. */
export const ANA_SNOUT = 24;
const FADE_FROM = -22;
const FADE_TO = -35;

interface Gape {
  readonly k: number;
  readonly push: number;
  readonly spread: number;
}
const GAPE: Record<HeadPose, Gape> = {
  shut: { k: 1, push: 0, spread: 0 },
  open: { k: 0.76, push: 0, spread: 1 },
  strike: { k: 0.87, push: 3.2, spread: 0.55 },
};

const ease = (v: number): number => {
  const c = Math.max(0, Math.min(1, v));
  return c * c * (3 - 2 * c);
};

/** Points every ~`step` px along a polyline, so a warp bends it smoothly. */
function dense(pts: readonly Pt[], step = 0.8): Pt[] {
  const out: Pt[] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push(pt(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n));
  }
  return out;
}

type Warp = (p: Pt) => Pt;

/** The pose's warp of the shut head: the snout shortened as it tips up to gape, the jaw corners pushed out, the head lunging on a stretched neck. */
function warpOf(g: Gape): Warp {
  return (p) => {
    let x = p.x > 0 ? p.x * g.k : p.x;
    x += g.push * ease((p.x + 30) / 22);
    const jaw = 1 + g.spread * 0.05 * Math.max(0, 1 - Math.abs(p.x + 6) / 10);
    return pt(x, p.y * jaw);
  };
}

const mirror = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(p.x, -p.y));
const bilateral = (upper: readonly Pt[]): Pt[] => [...upper, ...mirror(upper).reverse().slice(1)];

/** The head's upper outline, from the back of the neck to the snout's tip. */
const UPPER: Pt[] = dense([
  pt(FADE_TO - 2, -NECK),
  pt(-16, -NECK),
  ...cub(pt(-16, -NECK), pt(-12, -NECK - 0.1), pt(-9.6, -12.3), pt(-5, -12.5), 8).slice(1),
  ...cub(pt(-5, -12.5), pt(0, -12.7), pt(6, -12), pt(11, -10.3), 8).slice(1),
  ...cub(pt(11, -10.3), pt(15.5, -8.7), pt(19.6, -6.7), pt(22.2, -4.6), 8).slice(1),
  ...cub(pt(22.2, -4.6), pt(23.8, -3.3), pt(24.5, -1.8), pt(TIP, 0), 6).slice(1),
]);

function outward(upper: readonly Pt[], by: number): Pt[] {
  const n = normals(upper);
  return upper.map((p, i) => (p.y === 0 ? pt(p.x + by, 0) : pt(p.x + n[i]!.x * by, p.y + n[i]!.y * by)));
}

/** The stripe from behind the eye back to the angle of the jaw on side s: its black edging, and the orange down its middle. */
function stripe(s: 1 | -1): { black: Pt[]; orange: Pt[] } {
  const spine = cub(pt(2.6, 9.4 * s), pt(-1.5, 10 * s), pt(-6, 10.6 * s), pt(-13.5, 10.4 * s), 14);
  return {
    black: dense(ribbon(spine, (u) => 3.4 - 0.9 * u).shape, 1),
    orange: dense(ribbon(spine.map((p) => pt(p.x - 0.3, p.y)), (u) => 1.7 - 0.5 * u).shape, 1),
  };
}

/** The two dark bars of the nape, and the first side spot on each flank of the neck. */
function nape(s: 1 | -1): { bar: Pt[]; ring: Pt[]; heart: Pt[] } {
  return {
    bar: blotchShape(-23, 4.3 * s, 6.2, 2.7, s > 0 ? 23100 : 23110, { rough: 0.12, pow: 2.2, n: 36 }),
    ring: blotchShape(-18.5, 9.4 * s, 3, 1.9, s > 0 ? 23120 : 23130, { rough: 0.12, pow: 2, n: 24 }),
    heart: blotchShape(-18.5, 9.4 * s, 1.6, 0.95, s > 0 ? 23140 : 23150, { rough: 0.16, pow: 2, n: 18 }),
  };
}

/** The bigger scales of the snout (upper half; mirrored): the rostral's edge, the nasals round the nostrils, the internasals behind. */
const PLATES: readonly (readonly Pt[])[] = [
  cub(pt(24.3, -1.9), pt(23.2, -1.6), pt(22.6, -0.6), pt(22.6, 0), 4),
  cub(pt(22.9, -4), pt(21.4, -4.4), pt(19.2, -4.2), pt(18.4, -2.6), 5),
  cub(pt(18.4, -2.6), pt(18.2, -1.4), pt(19.8, -0.6), pt(22.6, -0.6), 5),
  cub(pt(18.4, -2.6), pt(17, -2.4), pt(15.6, -1.4), pt(15.2, 0), 5),
  cub(pt(18.6, -4.4), pt(17, -5.8), pt(15, -5.6), pt(14.2, -3.4), 5),
  cub(pt(14.2, -3.4), pt(13.6, -1.8), pt(13.4, -0.8), pt(13.4, 0), 4),
];

function clipTo(ctx: CanvasRenderingContext2D, clip: readonly Pt[], paint: () => void): void {
  ctx.save();
  ctx.beginPath();
  clip.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  paint();
  ctx.restore();
}

/** The skin of head and neck: the back's washes, the crown a little darker and the snout paler, the markings, the small scales. */
function skin(d: Draw, w: Warp, body: readonly Pt[], t: AnacondaTone): void {
  const { ctx } = d.pen;
  const map = (pts: readonly Pt[]): Pt[] => pts.map(w);
  clipTo(ctx, body, () => {
    ctx.fillStyle = PAPER_FILL;
    ctx.fillRect(-40, -20, 80, 40);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = anaCrossWash(ctx, -HALF_W, t);
    ctx.fillRect(-40, -20, 80, 40);
    ctx.globalAlpha = 1;
    const c = w(pt(2, 0));
    glaze(ctx, c.x, c.y, 14, 7, 0, t.moss, 0.32);
    const s = w(pt(19, -1));
    glaze(ctx, s.x, s.y, 6, 4.4, 0, t.olive, 0.35);
    const n = w(pt(-24, 0));
    glaze(ctx, n.x, n.y, 9, 3, 0, t.olive, 0.25);
    flecks(ctx, -40, 66, -HALF_W, 23200 + t.seed, 160, false, t.shadow);
    // A few small black flecks on the crown, as most anacondas have.
    for (let i = 0; i < 7; i++) {
      const x = -9 + ((i * 37) % 23);
      const y = ((i * 53) % 13) - 6.5;
      paintSpot(ctx, map(blotchShape(x, y, 0.9 + (i % 3) * 0.3, 0.7, 23300 + i + t.seed, { rough: 0.2, n: 14 })), 23350 + i, d.ink, t, 0.4);
    }
    for (const side of [1, -1] as const) {
      const m = nape(side);
      paintSpot(ctx, map(m.bar), 23400 + side + d.f, d.ink, t, 1.1);
      paintOcellus(ctx, map(m.ring), map(m.heart), 23410 + side + d.f, d.ink, t);
      const st = stripe(side);
      paintSpot(ctx, map(st.black), 23420 + side + d.f, d.ink, t, 0.7);
      d.pen.fill(map(st.orange), t.stripe, 0.95);
      d.pen.clipped(map(st.orange), () => glaze(ctx, w(pt(-3, 9.8 * side)).x, w(pt(-3, 9.8 * side)).y - 0.3, 6, 0.8, 0, PAPER_FILL, 0.35));
    }
    clipTo(ctx, [pt(-40, -20), pt(17, -20), pt(17, 20), pt(-40, 20)], () => smoothScales(ctx, -40, 17, -HALF_W, 1.6, 0.4, 120, t));
    anaModel(ctx, -40, 30, -HALF_W, t);
    flankHatch(ctx, -40, 28, 14, -HALF_W, 23500 + d.f * 100, d.ink, 0.36, false);
  });
  crown(d, w, body, t);
}

/** The crown's dome: shade on its far side, hatched; the snout's plates in fine line; the nostrils on top; wet glints. */
function crown(d: Draw, w: Warp, body: readonly Pt[], t: AnacondaTone): void {
  const { pen } = d;
  const head = dense([pt(-14, -14), pt(26, -14), pt(26, 14), pt(-14, 14)], 2).map(w);
  clipTo(pen.ctx, body, () => {
    pen.crescent(head, pt(-3.2, -4.6), () => pen.fill(head, t.shadow, 0.12));
    pen.crescent(body, pt(-2.2, -3.4), () => pen.hatch(head, 1.5, 0.95, 0.32, { color: d.ink, alpha: 0.28 }));
    for (const plate of PLATES) for (const side of [1, -1]) pen.hair(dense(plate, 0.7).map((p) => w(pt(p.x, p.y * side))), 0.32, d.ink, side < 0 ? 0.42 : 0.55);
    const brow = w(pt(6, -5.2));
    glaze(pen.ctx, brow.x, brow.y, 5, 1.4, -0.15, PAPER_FILL, 0.45);
    const snout = w(pt(17, -3));
    glaze(pen.ctx, snout.x, snout.y, 3.4, 1.2, -0.4, PAPER_FILL, 0.4);
  });
  for (const side of [1, -1]) {
    // The nostrils open upwards from raised nasal scales, close together on top of the snout.
    const n = w(pt(20.4, 2.5 * side));
    pen.fill(oval(n.x, n.y, 1.5, 1.2, 14), t.olive, 0.5);
    pen.hair(closed(oval(n.x, n.y, 1.5, 1.2, 14)), 0.28, d.ink, 0.5);
    pen.fill(oval(n.x + 0.2, n.y + 0.15 * side, 0.75, 0.5, 12), '#0f100a', 0.92);
    pen.dot(n.x - 0.5, n.y - 0.55, 0.26, PAPER_FILL, 0.7);
  }
}

/** An eye set up on top of the head, looking up and out: a raised dome, an olive-gold iris, a slit pupil, the brow's shade over it, a wet glint. */
function eye(d: Draw, w: Warp, side: 1 | -1, t: AnacondaTone): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = w(pt(5, 8.6 * side));
  const rx = 2.8;
  const ry = 2.4;
  const ball = oval(c.x, c.y, rx, ry, 22);
  // The raised rim round the eye, and its shadow towards the lower right.
  pen.fill(oval(c.x + 0.7, c.y + 0.9, rx + 1.1, ry + 1, 22), t.shadow, 0.35);
  pen.fill(oval(c.x, c.y, rx + 0.9, ry + 0.8, 22), t.ground, 0.9);
  pen.hair(closed(oval(c.x, c.y, rx + 0.9, ry + 0.8, 22)), 0.3, d.ink, 0.5);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.8, c.y - 0.7, 0.2, c.x, c.y, rx * 1.05);
    g.addColorStop(0, '#d9c682');
    g.addColorStop(0.5, t.iris);
    g.addColorStop(1, '#2a2612');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - rx, c.y - ry, rx * 2, ry * 2);
    pen.fill(oval(c.x + 0.1, c.y + side * 0.2, 0.55, 1.6, 12), '#0c0b06', 1);
    pen.fill(ball.map((p) => pt(p.x + 0.4, p.y - ry * 1.3)), t.shadow, 0.45);
  });
  pen.stroke(closed(ball), 0.75, d.ink, 0.95, false);
  pen.dot(c.x - 1, c.y - 0.8, 0.6, PAPER_FILL, 0.95);
  pen.dot(c.x + 1, c.y + 0.6, 0.28, PAPER_FILL, 0.5);
}

/** The back of the neck dissolved, so the strip under it shows through and the join never does. */
function fadeNeck(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(FADE_TO, 0, FADE_FROM, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-FRAME / 2, -FRAME / 2, FADE_FROM + FRAME / 2, FRAME);
  ctx.restore();
}

function drawHead(d: Draw, pose: HeadPose, t: AnacondaTone): void {
  const g = GAPE[pose];
  const w = warpOf(g);
  const upper = UPPER.map(w);
  const body = bilateral(outward(UPPER, 0.7).map(w));
  if (g.spread > 0) anaJaws(d, ANA_JAW[pose === 'open' ? 'open' : 'strike'], body, t);
  skin(d, w, body, t);
  for (const side of [-1, 1] as const) eye(d, w, side, t);
  const tipAt = upper.length - 1;
  d.pen.stroke(upper.slice(0, tipAt).concat(mirror(upper.slice(tipAt - 6, tipAt)).reverse()), 1.15, d.ink, 0.95);
  d.pen.stroke(mirror(upper), 1.85, d.ink, 1);
  fadeNeck(d.pen.ctx);
}

/** The head in tone `t`. */
export function anacondaHead(t: AnacondaTone): SpriteArt<HeadPose> {
  return { frame: FRAME, res: 4, poses: ['shut', 'open', 'strike'], draw: (d, pose) => drawHead(d, pose, t) };
}
