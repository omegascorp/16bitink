import { createRng } from '../../logic/rng';
import { closed, cub, type Draw, normals, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { blotchShape, flankHatch, glaze } from '../snakes/cornPaint';
import { SNAKE_W, type SpriteArt } from '../types';
import { fang, VIPER_JAW, viperJaws } from './mountainsSnakeJaws';
import { fleck, paintBar, roughScales, VIPER_PAINT, viperCrossWash, viperModel } from './mountainsSnakePaint';

export { SPIDER_TONGUE } from './mountainsSnakeJaws';

/**
 * The spider-tailed horned viper's head from above, facing +x, the frame
 * centred between the eyes: a broad, flat, arrow-shaped viper's head, much
 * wider than the thin neck behind it, bulging at the jaw angles (the venom
 * glands), tapering to a short blunt snout. The crown is covered in small,
 * rough keeled scales (no big plates), and over each eye stands the
 * "horn": a raised, pointed supraocular scale ringed with smaller spiky
 * ones, casting its shadow on the crown. A dark stripe runs from each eye
 * back to the jaw angle, a dark bar crosses the nape. The eyes, small and
 * grey with slit pupils, sit low under the horns. The neck is the back
 * strip's cross-section and fades out at the back, where the strip under
 * it takes over.
 */
type HeadPose = 'shut' | 'open' | 'strike';

const FRAME = 76;
const HALF_W = SNAKE_W / 2;
const NECK = HALF_W - 1.2;
/** The snout tip, shut. */
const TIP = 21;
/** Where the tongue comes out: the notch in the front of the snout. */
export const SPIDER_SNOUT = 20.4;
const FADE_FROM = -24;
const FADE_TO = -37;
const V = VIPER_PAINT;

interface Gape {
  readonly k: number;
  readonly push: number;
  readonly spread: number;
}
const GAPE: Record<HeadPose, Gape> = {
  shut: { k: 1, push: 0, spread: 0 },
  open: { k: 0.72, push: 0, spread: 1 },
  strike: { k: 0.84, push: 3.6, spread: 0.6 },
};

const ease = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
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
    let x = p.x > 2 ? 2 + (p.x - 2) * g.k : p.x;
    x += g.push * ease((p.x + 32) / 22);
    const jaw = 1 + g.spread * 0.07 * Math.max(0, 1 - Math.abs(p.x + 6) / 10);
    return pt(x, p.y * jaw);
  };
}

const mirror = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(p.x, -p.y));
const bilateral = (upper: readonly Pt[]): Pt[] => [...upper, ...mirror(upper).reverse().slice(1)];

/** The head's upper outline, from the back of the neck to the snout's middle. */
const UPPER: Pt[] = dense([
  pt(FADE_TO - 2, -NECK),
  pt(-18, -NECK),
  ...cub(pt(-18, -NECK), pt(-14, -NECK - 0.2), pt(-12.2, -15.4), pt(-6.5, -16.2), 10).slice(1),
  ...cub(pt(-6.5, -16.2), pt(-0.5, -16.9), pt(6, -15.8), pt(10.6, -13.2), 10).slice(1),
  ...cub(pt(10.6, -13.2), pt(14.6, -10.9), pt(17.6, -7.6), pt(19.4, -4.8), 8).slice(1),
  ...cub(pt(19.4, -4.8), pt(20.5, -3), pt(21, -1.4), pt(TIP, 0), 6).slice(1),
]);

function outward(upper: readonly Pt[], by: number): Pt[] {
  const n = normals(upper);
  return upper.map((p, i) => (p.y === 0 ? pt(p.x + by, 0) : pt(p.x + n[i]!.x * by, p.y + n[i]!.y * by)));
}

/** The stripe from behind the eye back to the angle of the jaw, on side s. */
function eyeStripe(s: 1 | -1): Pt[] {
  const spine = cub(pt(2.4, 13.4 * s), pt(-1.5, 14.2 * s), pt(-6, 15 * s), pt(-11.5, 14 * s), 12);
  return dense(ribbon(spine, (u) => 2.6 - 1.1 * u).shape, 1);
}

/** The dark marks of head and nape: the nape's cross-bar (two halves, as the back's), and a few single dark scales scattered over the crown. */
function marks(): { shape: Pt[]; seed: number; rim: number; halo: number }[] {
  const rng = createRng(17140);
  const strays = Array.from({ length: 9 }, (_, i) => {
    const x = -14 + rng() * 26;
    const y = (rng() - 0.5) * 2 * (11 - Math.max(0, x - 6) * 0.5);
    return { shape: blotchShape(x, y, 0.8 + rng() * 0.5, 0.6 + rng() * 0.3, 17150 + i, { rough: 0.2, pow: 2.2, n: 14 }), seed: 17160 + i, rim: 0.4, halo: 0 };
  });
  return [
    { shape: blotchShape(-26.5, -5.2, 4.8, 6, 17100, { rough: 0.22, pow: 2.5, n: 40 }), seed: 17110, rim: 1.05, halo: 0.4 },
    { shape: blotchShape(-25.2, 4.8, 4.8, 6.2, 17120, { rough: 0.22, pow: 2.5, n: 40 }), seed: 17130, rim: 1.1, halo: 0.34 },
    ...strays,
  ];
}

function clipTo(ctx: CanvasRenderingContext2D, clip: readonly Pt[], paint: () => void): void {
  ctx.save();
  ctx.beginPath();
  clip.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  paint();
  ctx.restore();
}

/**
 * The crown's small rough scales: a field of little keeled ovals, all
 * pointing back, smaller towards the snout, each with a dark keel, a lit
 * upper edge and a fleck of shadow at its free tip.
 */
function crownScales(d: Draw, w: Warp): void {
  const { pen } = d;
  const rng = createRng(17300);
  for (let row = -8; row <= 8; row++) {
    for (let col = 0; col < 26; col++) {
      const x0 = -20 + col * 1.6 + (row % 2 === 0 ? 0 : 0.8);
      const fade = Math.min(1, Math.max(0, (x0 + 20) / 10));
      const size = 1.5 - Math.max(0, x0 - 8) * 0.04;
      const y0 = row * 1.85 * (1 - Math.max(0, x0 - 10) * 0.035);
      if (x0 > 19.5) continue;
      const jx = (rng() - 0.5) * 0.4;
      const jy = (rng() - 0.5) * 0.35;
      const c = pt(x0 + jx, y0 + jy);
      const a = w(pt(c.x + size * 0.6, c.y));
      const b = w(pt(c.x - size * 0.6, c.y));
      const shade = (c.y + 16) / 32;
      pen.hair([pt(b.x, b.y - size * 0.34), pt(a.x, a.y), pt(b.x, b.y + size * 0.34)], 0.24, V.shadow, (0.26 + 0.34 * shade) * fade);
      pen.hair([w(pt(c.x - size * 0.4, c.y + 0.12)), w(pt(c.x + size * 0.35, c.y + 0.1))], 0.28, V.shadow, (0.3 + 0.3 * shade) * fade);
      if (shade < 0.7) pen.hair([w(pt(c.x - size * 0.35, c.y - 0.2)), w(pt(c.x + size * 0.25, c.y - 0.2))], 0.24, PAPER_FILL, (0.6 - 0.7 * shade) * fade);
    }
  }
}

/** The skin of head and neck: the back's washes, the crown cooler and the snout paler, the markings, the neck's keeled scales, the crown's small ones. */
function skin(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { ctx } = d.pen;
  clipTo(ctx, body, () => {
    ctx.fillStyle = PAPER_FILL;
    ctx.fillRect(-42, -22, 84, 44);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = viperCrossWash(ctx, -HALF_W);
    ctx.fillRect(-42, -22, 84, 44);
    ctx.globalAlpha = 1;
    const lit = w(pt(-4, -15));
    glaze(ctx, lit.x, lit.y, 14, 3.5, 0, '#ddd4c1', 0.8);
    const far = w(pt(-4, 15.5));
    glaze(ctx, far.x, far.y, 14, 3.2, 0, '#6f6960', 0.7);
    const c = w(pt(2, 0));
    glaze(ctx, c.x, c.y, 13, 9, 0, V.cool, 0.22);
    const s = w(pt(15, -1));
    glaze(ctx, s.x, s.y, 6, 4.5, 0, V.stone, 0.4);
    const n = w(pt(-20, 0));
    glaze(ctx, n.x, n.y, 6, 9, 0, V.buff, 0.3);
    fleck(ctx, -42, 66, -HALF_W, 17400, 140, false, V.fleck);
    fleck(ctx, -10, 32, -16, 17410, 90, false, V.fleck);
    for (const m of marks()) paintBar(ctx, m.shape.map(w), m.seed + d.f, d.ink, m.rim, m.halo);
    for (const side of [1, -1] as const) paintBar(ctx, eyeStripe(side).map(w), 17500 + side + d.f, d.ink, 0.6, 0);
    // The neck's scales give way to the crown's small ones over a few px, so no seam shows.
    clipTo(ctx, [pt(-42, -22), pt(-20, -22), pt(-20, 22), pt(-42, 22)], () => roughScales(ctx, -42, -20, -HALF_W, 3, 0.62, 120));
    for (let i = 0; i < 8; i++) {
      const x = -20 + i * 1.25;
      clipTo(ctx, [pt(x, -22), pt(x + 1.25, -22), pt(x + 1.25, 22), pt(x, 22)], () => roughScales(ctx, x - 3, x + 4, -HALF_W, 3, 0.62 * (1 - (i + 0.5) / 8), 120));
    }
    crownScales(d, w);
    fleck(ctx, -42, 66, -HALF_W, 17600, 200, false);
    viperModel(ctx, -42, 30, -HALF_W);
    flankHatch(ctx, -42, 24, 12, -HALF_W, 17700 + d.f * 100, d.ink, 0.4, false);
  });
  crown(d, w, body);
}

/** The crown's dome: shade on its far side, hatched; the canthus ridges from horn to snout; the snout's scales; nostrils. */
function crown(d: Draw, w: Warp, body: readonly Pt[]): void {
  const { pen } = d;
  const head = dense([pt(-16, -17), pt(23, -17), pt(23, 17), pt(-16, 17)], 2).map(w);
  clipTo(pen.ctx, body, () => {
    pen.crescent(head, pt(-3.4, -4.8), () => pen.fill(head, V.shadow, 0.12));
    pen.crescent(body, pt(-2.4, -3.6), () => pen.hatch(head, 1.5, 0.95, 0.32, { color: d.ink, alpha: 0.32 }));
    for (const side of [1, -1]) {
      const canthus = cub(pt(9, 10.4 * side), pt(13, 8.4 * side), pt(16.6, 5.8 * side), pt(19.2, 2.6 * side), 8).map(w);
      pen.hair(canthus, 0.4, d.ink, side < 0 ? 0.4 : 0.55);
      pen.hair(canthus.map((p) => pt(p.x - 0.2, p.y - 0.5)), 0.3, PAPER_FILL, side < 0 ? 0.6 : 0.25);
      // The supralabials: the lip's row of bigger scales round the edge.
      for (let x = -4; x <= 18; x += 2.6) {
        const e = UPPER.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best), UPPER[0]!);
        pen.hair([w(pt(e.x, e.y * side * 0.86)), w(pt(e.x + 0.6, e.y * side))], 0.3, V.shadow, 0.5);
      }
    }
    const brow = w(pt(0, -7));
    glaze(pen.ctx, brow.x, brow.y, 6, 2, -0.1, PAPER_FILL, 0.3);
  });
  for (const side of [1, -1]) {
    const nos = w(pt(17.6, 4.4 * side));
    pen.dot(nos.x, nos.y, 0.85, d.ink, 0.85);
    pen.dot(nos.x - 0.35, nos.y - 0.4, 0.3, PAPER_FILL, 0.55);
    pen.hair([w(pt(16.6, 3.6 * side)), w(pt(18.6, 4.8 * side)), w(pt(17.6, 5.6 * side))], 0.3, d.ink, 0.5);
  }
  pen.hair(cub(pt(20.2, -1.6), pt(19.4, -0.6), pt(19.4, 0.6), pt(20.2, 1.6), 6).map(w), 0.3, d.ink, 0.5);
}

/** An eye set low in the side of the head under its horn: dark socket, grey-buff iris, a vertical slit pupil, a glint. */
function eye(d: Draw, w: Warp, side: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = w(pt(5.2, 13.9 * side));
  const rx = 2.7;
  const ry = 2.1;
  const ball = Array.from({ length: 22 }, (_, i) => pt(c.x + Math.cos((i / 22) * Math.PI * 2) * rx, c.y + Math.sin((i / 22) * Math.PI * 2) * ry));
  pen.fill(ball.map((p) => pt(p.x + 0.5, p.y + 0.7)), d.ink, 0.35);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.7, c.y - 0.6, 0.2, c.x, c.y, rx * 1.05);
    g.addColorStop(0, '#a89c84');
    g.addColorStop(0.45, '#6a604f');
    g.addColorStop(1, '#1e1b17');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - rx, c.y - ry, rx * 2, ry * 2);
    // A viper's slit pupil, seen from above as a dark sliver along the eye.
    pen.fill(ribbon([pt(c.x - 1.6, c.y + side * 0.4), pt(c.x + 1.6, c.y + side * 0.4)], (u) => 1 * Math.sin(Math.PI * u) + 0.15).shape, '#0e0c0a', 1);
    pen.fill(ball.map((p) => pt(p.x + 0.3, p.y - side * ry * 1.25)), V.shadow, 0.55);
  });
  pen.stroke(closed(ball), 0.7, d.ink, 0.95, false);
  pen.dot(c.x - 0.9, c.y - 0.7, 0.5, PAPER_FILL, 0.95);
}

/**
 * The horn over the eye on side s: a tall pointed supraocular scale, its
 * tip leaning out and back, lit on the side towards the light, shaded and
 * hatched on the other, its shadow cast across the crown; a ring of smaller
 * spiky scales round its foot.
 */
function horn(d: Draw, w: Warp, s: 1 | -1): void {
  const { pen } = d;
  const spikes: [Pt, Pt, number][] = [
    [pt(10, 9.6 * s), pt(10.8, 12 * s), 0.8],
    [pt(4.2, 9.4 * s), pt(2, 11.2 * s), 0.8],
    [pt(8.8, 8.2 * s), pt(9.6, 9.6 * s), 0.6],
    [pt(7.6, 9.2 * s), pt(4, 13.6 * s), 2.6],
  ];
  for (const [b, t, r] of spikes) {
    const shape = thorn(b, t, r).map(w);
    pen.fill(shape.map((p) => pt(p.x + r * 0.9, p.y + r * 1.3)), V.shadow, 0.45);
  }
  for (const [b, t, r] of spikes) {
    const shape = thorn(b, t, r).map(w);
    pen.fill(shape, PAPER_FILL, 1);
    pen.fill(shape, r > 1 ? '#756a5c' : '#887c6c', 1);
    pen.clipped(shape, () => {
      const m = w(pt(b.x + (t.x - b.x) * 0.4, b.y + (t.y - b.y) * 0.4));
      glaze(pen.ctx, m.x - r * 0.4, m.y - r * 0.5, r * 0.8, r * 0.6, 0, '#d9d0bd', 0.7);
      pen.crescent(shape, pt(-r * 0.55, -r * 0.7), () => {
        pen.fill(shape, V.barDeep, 0.7);
        if (r > 1) pen.hatch(shape, 0.6, 0.9, 0.2, { color: d.ink, alpha: 0.5 });
      });
    });
    pen.hair(closed(shape), r > 1 ? 0.85 : 0.5, d.ink, 0.95);
    if (r > 1) pen.hair([w(pt(b.x - 0.3, b.y - 0.2 * s)), w(pt(b.x + (t.x - b.x) * 0.8, b.y + (t.y - b.y) * 0.8))], 0.3, PAPER_FILL, 0.75);
  }
}

/** A thorn-shaped scale seen from above: a round foot at `b`, `r` across, drawing smoothly to a point at `t`. */
function thorn(b: Pt, t: Pt, r: number): Pt[] {
  const a = Math.atan2(t.y - b.y, t.x - b.x);
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  const l = Math.hypot(t.x - b.x, t.y - b.y);
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const side = (k: 1 | -1): Pt[] =>
    cub(pt(b.x + nx * r * k, b.y + ny * r * k), pt(b.x + nx * r * k + ux * l * 0.45, b.y + ny * r * k + uy * l * 0.45), pt(t.x + nx * r * 0.25 * k - ux * l * 0.3, t.y + ny * r * 0.25 * k - uy * l * 0.3), t, 10);
  const foot = Array.from({ length: 9 }, (_, i) => {
    const th = a + Math.PI / 2 + (i / 8) * Math.PI;
    return pt(b.x + Math.cos(th) * r, b.y + Math.sin(th) * r);
  });
  return [...side(1), ...side(-1).reverse().slice(1), ...foot.slice(1, -1)];
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

function drawHead(d: Draw, pose: HeadPose): void {
  const g = GAPE[pose];
  const w = warpOf(g);
  const upper = UPPER.map(w);
  const body = bilateral(outward(UPPER, 0.7).map(w));
  if (g.spread > 0) viperJaws(d, VIPER_JAW[pose === 'open' ? 'open' : 'strike'], body);
  // The fangs swing forward from under the snout: painted before it, so their roots hide beneath.
  if (g.spread > 0) {
    const tip = w(pt(TIP, 0));
    for (const side of [1, -1] as const) fang(d, tip.x - 3, 3.4 * side, pose === 'open' ? 9 : 7);
  }
  skin(d, w, body);
  for (const side of [-1, 1] as const) eye(d, w, side);
  d.pen.stroke(upper, 1.15, d.ink, 0.95);
  d.pen.stroke(mirror(upper), 1.8, d.ink, 1);
  for (const side of [-1, 1] as const) horn(d, w, side);
  fadeNeck(d.pen.ctx);
}

export const SPIDER_HEAD: SpriteArt<HeadPose> = {
  frame: FRAME,
  res: 4,
  poses: ['shut', 'open', 'strike'],
  draw: drawHead,
};
