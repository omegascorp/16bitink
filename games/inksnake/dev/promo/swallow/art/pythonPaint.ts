import { createRng } from '../../../../src/logic/rng';
import { cub, type Draw, pt, ribbon } from '../../../../src/art/kit';
import { PAPER_FILL } from '../../../../src/art/palette';
import type { Pt } from '../../../../src/art/pen';
import { blotchShape, flankHatch, glaze } from '../../../../src/art/snakes/cornPaint';
import { stripLength, type SnakeArt } from '../../../../src/art/types';
import { rgba } from '../../../../src/art/wash';
import { dense, HALF_W, headArt, type HeadSpec, NECK, outlineOf, tongueArt, type Warp } from '../../../../src/art/chapters/jungleSnakeHead';
import { type BlotchPaint, bodyClip, contours, crossWash, grain, layTile, mod, modelBody, paintBlotch, scaleRows } from '../../../../src/art/chapters/jungleSnakePaint';

/** Everything that makes one python species look like itself: colours and blotch geometry. */
export interface PythonTone {
  seed: number;
  period: number;
  /** Big back blotches per period. */
  count: number;
  wash: readonly (readonly [number, string])[];
  pale: string;
  deep: string;
  shadow: string;
  edge: string;
  belly: string;
  base: string;
  back: BlotchPaint;
  flank: BlotchPaint;
  /** Warm glaze over each back blotch's heart. */
  heart: readonly [string, string];
  /** Back blotch outlines for blotch i (any integer; must repeat every `count`). */
  backShapes: (i: number, step: number, rng: () => number) => Pt[][];
  /** Flank blotch outlines for slot i. */
  flankShapes: (i: number, step: number, rng: () => number) => Pt[][];
  scale: { alpha: number; gloss: number };
  head: {
    stripe: BlotchPaint;
    arrow: BlotchPaint;
    /** Pale stripe along each side of the crown (African rock python). */
    paleStripe?: string;
    crown: string;
    iris: readonly [string, string, string];
    plateLight: string;
    mouthSide: string;
    mottle: string;
    arrowLength: number;
  };
}

export const smooth = (pts: readonly Pt[], rounds = 2): Pt[] => {
  let p = pts.slice();
  for (let r = 0; r < rounds; r++) {
    const q: Pt[] = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i]!;
      const b = p[(i + 1) % p.length]!;
      q.push(pt(0.75 * a.x + 0.25 * b.x, 0.75 * a.y + 0.25 * b.y), pt(0.25 * a.x + 0.75 * b.x, 0.25 * a.y + 0.75 * b.y));
    }
    p = q;
  }
  return p;
};

export function paintTile(t: PythonTone, ctx: CanvasRenderingContext2D, ink: string, f: number): void {
  const boil = f * 1000;
  const step = t.period / t.count;
  const n = t.count;
  bodyClip(ctx, 0, t.period, crossWash(ctx, 0, t.wash), () => {
    for (let i = -1; i <= n; i++) {
      const k = mod(i, n);
      const rng = createRng(t.seed + 600 + k * 11);
      const x = i * step;
      glaze(ctx, x + (rng() - 0.5) * 4, 10 + rng() * 2, 6, 6, 0, t.pale, 0.35);
      glaze(ctx, x + step / 2 + (rng() - 0.5) * 6, 20, 12, 3, 0, t.deep, 0.22);
    }
    grain(ctx, 0, t.period, 0, t.seed + 700, 320, true, t.deep);
    for (let i = -1; i <= n; i++) {
      const k = mod(i, n);
      for (const [j, b] of t.flankShapes(i, step, createRng(t.seed + 300 + k * 13)).entries()) {
        paintBlotch(ctx, b, t.seed + 800 + k * 3 + j + boil, ink, t.flank, 0.8, 0.9);
      }
    }
    for (let i = -1; i <= n; i++) {
      const k = mod(i, n);
      for (const [j, b] of t.backShapes(i, step, createRng(t.seed + 100 + k * 17)).entries()) {
        paintBlotch(ctx, b, t.seed + 900 + k * 2 + j + boil, ink, t.back, 1.25);
        const c = b.reduce((a, p) => pt(a.x + p.x / b.length, a.y + p.y / b.length), pt(0, 0));
        glaze(ctx, c.x, c.y - 0.6, 8, 4.4, 0, t.heart[0], 0.5);
        glaze(ctx, c.x + 1, c.y - 1.2, 4, 2, 0, t.heart[1], 0.35);
      }
    }
    scaleRows(ctx, 0, t.period, 0, { rows: 29, len: 1.5, period: t.period, edge: t.edge, alpha: t.scale.alpha, gloss: t.scale.gloss, heart: 0.05 });
    modelBody(ctx, 0, t.period, 0, t.shadow, 0.3);
    flankHatch(ctx, 0, t.period, 60, 0, t.seed + 1000 + boil, ink, 0.36, true);
  });
  contours(ctx, t.period, ink, t.seed + 1100 + boil);
}

const UPPER = outlineOf(-14.5, [
  [pt(-11, -NECK - 0.2), pt(-8.5, -13.2), pt(-3, -13.5)],
  [pt(2, -13.7), pt(8, -12), pt(12.5, -9.4)],
  [pt(16.5, -7.2), pt(20, -4.8), pt(22.4, -3)],
  [pt(23.4, -2.1), pt(23.8, -1.1), pt(23.8, 0)],
]);
const PLATES: readonly (readonly Pt[])[] = [
  cub(pt(23.4, -2.4), pt(22, -2.1), pt(21.4, -1.1), pt(21.3, 0), 4),
  [pt(21.3, 0), pt(18.6, 0)],
  cub(pt(21.8, -2), pt(20, -3.2), pt(19.2, -4.2), pt(18.8, -5.4), 4),
  [pt(18.6, 0), pt(14.4, 0)],
  cub(pt(14.4, 0), pt(14.8, -2.4), pt(15.4, -4.4), pt(16.2, -6.4), 4),
  cub(pt(13.4, -9.4), pt(9.6, -10.8), pt(5, -11.2), pt(2.2, -10.4), 6),
];

function arrowhead(len: number): Pt[] {
  const b = len - 15.2;
  const upper = [
    pt(21, 0),
    ...cub(pt(21, 0), pt(14, -2.2), pt(4, -4.6), pt(-6, -7), 10).slice(1),
    ...cub(pt(-6, -7), pt(-10, -8), pt(-14.6 + b, -7.8), pt(-len, -6), 6).slice(1),
    ...cub(pt(-len, -6), pt(-13.4 - b / 2, -4.2), pt(-12, -2), pt(-13.4, 0), 6).slice(1),
  ];
  return dense([...upper, ...upper.slice(1, -1).reverse().map((p) => pt(p.x, -p.y))], 0.8);
}

function crownScales(t: PythonTone, d: Draw, w: Warp): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineWidth = 0.22;
  ctx.strokeStyle = rgba(t.shadow, 0.35);
  ctx.beginPath();
  for (let x = -14; x < 13; x += 1.6) {
    for (let y = -11; y <= 11; y += 1.5) {
      const o = (Math.round(x / 1.6) % 2) * 0.75;
      const p = w(pt(x, y + o));
      ctx.moveTo(p.x - 0.5, p.y - 0.6);
      ctx.quadraticCurveTo(p.x + 0.6, p.y, p.x - 0.5, p.y + 0.6);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function skin(t: PythonTone, d: Draw, w: Warp): void {
  const { pen } = d;
  const { ctx } = pen;
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = crossWash(ctx, -HALF_W, t.wash);
  ctx.fillRect(-40, -20, 80, 40);
  ctx.globalAlpha = 1;
  const c = w(pt(4, 0));
  glaze(ctx, c.x, c.y, 14, 9, 0, t.head.crown, 0.4);
  for (const s of [1, -1] as const) {
    if (t.head.paleStripe) {
      const pale = ribbon(cub(pt(19, 4.2 * s), pt(11, 8 * s), pt(0, 10.2 * s), pt(-12, 10.6 * s), 16), (u) => 1.1 + 0.9 * u).shape.map(w);
      paintBlotch(ctx, pale, 62400 + s + d.f, d.ink, { body: t.head.paleStripe, lit: t.pale, deep: t.head.crown, rim: t.shadow }, 0.4, 0.9);
    }
    const stripe = ribbon(cub(pt(19, 5.2 * s), pt(11, 9.8 * s), pt(0, 12.4 * s), pt(-12, 12.6 * s), 16), (u) => 1.8 + 1.8 * u).shape.map(w);
    paintBlotch(ctx, stripe, 62200 + s + d.f, d.ink, t.head.stripe, 0.6, 0.88);
  }
  paintBlotch(ctx, arrowhead(t.head.arrowLength).map(w), 62300 + d.f, d.ink, t.head.arrow, 0.9, 0.85);
  crownScales(t, d, w);
  for (const s of [1, -1] as const) {
    for (const [x, y] of [[22.4, 2.6], [21.2, 3.9], [19.8, 5]] as const) {
      const p = w(pt(x, y * s));
      pen.dot(p.x, p.y, 0.42, t.shadow, 0.75);
    }
  }
  const gl = w(pt(-2, -5));
  glaze(ctx, gl.x, gl.y, 9, 2, 0.05, PAPER_FILL, 0.3);
}

export function makePython(t: PythonTone): SnakeArt {
  const spec: HeadSpec = {
    upper: UPPER,
    period: t.period,
    tile: (ctx, ink, f) => paintTile(t, ctx, ink, f),
    crownFrom: -16,
    skin: (d, w) => skin(t, d, w),
    plates: PLATES.map((p) => dense(p, 0.8)),
    plateInk: '#3a2614',
    plateLight: t.head.plateLight,
    eye: { x: 7, y: 11.6, rx: 2.7, ry: 2.3, iris: [...t.head.iris], slit: true, pupil: 1.05 },
    nostril: pt(20.6, 3.4),
    shadow: t.shadow,
    jaw: {
      open: { spine: [pt(-7, 13.2), pt(4, 20.4), pt(20, 21.4), pt(32, 13.2)], w0: 4.2, w1: 1.8 },
      strike: { spine: [pt(-4.5, 12.8), pt(7, 16.4), pt(19.5, 15.8), pt(29.5, 8.6)], w0: 4, w1: 1.7 },
    },
    mouth: {
      lip: t.belly, side: t.head.mouthSide, mottle: t.head.mottle, mouth: '#f0d0c6', mouthDeep: '#bb7e7e', throat: '#4a1e22',
      chin: t.belly, shadow: t.shadow, every: 2,
    },
  };
  return {
    period: t.period,
    drawStrip: (d, length) => layTile(d.pen.ctx, t.period, Math.min(length, stripLength(t.period)), (tile) => paintTile(t, tile, d.ink, d.f)),
    head: headArt(spec),
    tongue: tongueArt('#3a3236', '#120e10', '#a89aa2'),
    snout: 23,
    colours: { base: t.base, mark: t.back.body, belly: t.belly },
  };
}

export { blotchShape };
