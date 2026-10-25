import { createRng } from '../../logic/rng';
import { closed, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, pathOf, type Pt } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { SNAKE_W } from '../types';
import { rgba } from '../wash';
import { centreOf, hash } from './barrensSnakePaint';

/**
 * The spider-tailed horned viper's paint box and the brushwork its back
 * strip and its neck share: the grey-buff of the Zagros limestone, dark
 * grey-brown cross-bars pooled darker at their drying edges and haloed
 * paler, and the rough, strongly keeled scales (each one a raised ridge
 * catching the light above and casting a hair of shadow below), all under
 * the cylinder's light and shade. Deterministic: the same call paints the
 * same pixels.
 */
export const VIPER_PAINT = {
  ground: '#b3a892',
  stone: '#d8cfbb',
  buff: '#c7b08a',
  cool: '#8d8b86',
  shadow: '#2f2a26',
  bar: '#5b5149',
  barLit: '#7f7365',
  barDeep: '#352e29',
  rim: '#1f1a17',
  halo: '#e4dccb',
  fleck: '#3e3631',
  belly: '#e2dccc',
  lip: '#ddd3bf',
  mouth: '#e9c4bd',
  mouthDeep: '#b97d80',
  throat: '#4a2228',
  iris: '#a89a7c',
  fang: '#f4efe2',
  tongue: '#2c2a30',
  tongueTip: '#121115',
} as const;

const V = VIPER_PAINT;

/** One period of the back's pattern, board px (the shared tile layer, barrensSnakePaint.layTile, lays 120). */
export const VIPER_PERIOD = 120;
/** Where the long contours run. */
export const TOP_EDGE = 1.2;
export const BOTTOM_EDGE = SNAKE_W - 1.2;

/** The back's cross-section wash, `yTop` being where the strip's y = 0 lies: pale limestone where the light hits, greying to slate on the far flank. */
export function viperCrossWash(ctx: CanvasRenderingContext2D, yTop: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + SNAKE_W);
  g.addColorStop(0, '#ddd4c1');
  g.addColorStop(0.16, '#cbbfa7');
  g.addColorStop(0.44, '#b5a990');
  g.addColorStop(0.74, '#9a907e');
  g.addColorStop(1, '#6f6960');
  return g;
}

/**
 * Light and shade over the pattern, a cylinder lit from the upper left:
 * hardly any sheen (the keeled scales are dull as rock), the far flank in a
 * cool slate shadow with a little reflected light at its edge.
 */
export function viperModel(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number, sheen = 0.16): void {
  const h = SNAKE_W;
  const dark = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  dark.addColorStop(0, rgba(V.shadow, 0.06));
  dark.addColorStop(0.12, rgba(V.shadow, 0));
  dark.addColorStop(0.5, rgba(V.shadow, 0));
  dark.addColorStop(0.68, rgba(V.shadow, 0.13));
  dark.addColorStop(0.86, rgba(V.shadow, 0.38));
  dark.addColorStop(0.95, rgba(V.shadow, 0.48));
  dark.addColorStop(1, rgba(V.shadow, 0.24));
  const gloss = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  gloss.addColorStop(0.06, rgba(PAPER_FILL, 0));
  gloss.addColorStop(0.18, rgba(PAPER_FILL, sheen));
  gloss.addColorStop(0.3, rgba(PAPER_FILL, sheen * 0.6));
  gloss.addColorStop(0.46, rgba(PAPER_FILL, 0));
  ctx.save();
  ctx.fillStyle = dark;
  ctx.fillRect(x0, yTop - 4, x1 - x0, h + 8);
  ctx.fillStyle = gloss;
  ctx.fillRect(x0, yTop - 4, x1 - x0, h + 8);
  ctx.restore();
}

/** Rows of scales round the back. */
const ROWS = 15;

/**
 * The rough scales, row on row round the body: each a pointed oval whose
 * free tip points to the tail (+x), a heavy keel down its middle (dark
 * under, lit over), the tip lifted off the skin so it casts a fleck of
 * shadow, the rows packed tighter where the back turns away. `len` must
 * divide `period` for the rows to repeat with it.
 */
export function roughScales(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number, len: number, alpha: number, period: number): void {
  const perRow = Math.max(1, Math.round(period / len));
  const span = 2.7;
  const dth = span / ROWS;
  ctx.save();
  ctx.lineCap = 'round';
  for (let r = 0; r < ROWS; r++) {
    const th = -span / 2 + dth * (r + 0.5);
    const sy = 12 + 11.3 * Math.sin(th);
    const y = yTop + sy;
    const hh = 11.3 * Math.cos(th) * dth * 0.56;
    const shift = (r % 2) * (len / 2);
    const first = Math.floor((x0 - len) / len) * len + shift;
    const edges = new Path2D();
    const lit = new Path2D();
    const keel = new Path2D();
    const tips = new Path2D();
    for (let x = first; x <= x1 + len; x += len) {
      const j = ((Math.round((x - shift) / len) % perRow) + perRow) % perRow;
      const h = hash(j, r + 40);
      const b = (hash(j + 7, r + 43) - 0.5) * 0.34;
      const tip = x + len * (0.6 + 0.14 * h);
      edges.moveTo(x - len * 0.44, y - hh + b);
      edges.quadraticCurveTo(x + len * 0.22, y - hh * 0.85 + b, tip, y + b);
      edges.quadraticCurveTo(x + len * 0.22, y + hh * 0.85 + b, x - len * 0.44, y + hh + b);
      lit.moveTo(x - len * 0.2, y + b - 0.22);
      lit.lineTo(tip - len * (0.22 + 0.16 * h), y + b - 0.2);
      keel.moveTo(x - len * 0.32, y + b + 0.16);
      keel.lineTo(tip - len * 0.12, y + b + 0.12);
      tips.moveTo(tip + 0.15, y + b + 0.25);
      tips.lineTo(tip + len * 0.22, y + b + hh * 0.5);
    }
    const shade = sy / SNAKE_W;
    ctx.lineWidth = 0.28;
    ctx.strokeStyle = rgba(V.shadow, alpha * (0.5 + 0.8 * shade));
    ctx.stroke(edges);
    ctx.lineWidth = 0.34;
    ctx.strokeStyle = rgba(V.shadow, alpha * (0.45 + 0.6 * shade));
    ctx.stroke(keel);
    ctx.lineWidth = 0.3;
    ctx.strokeStyle = rgba(V.shadow, alpha * 0.5);
    ctx.stroke(tips);
    ctx.lineWidth = 0.3;
    ctx.strokeStyle = rgba(PAPER_FILL, alpha * Math.max(0, 0.95 - 1 * shade));
    ctx.stroke(lit);
  }
  ctx.restore();
}

/** Pigment in the paper's tooth and the viper's fine dark flecking: dots over x0..x0+w, repeated every `w` when `wrap`. */
export function fleck(ctx: CanvasRenderingContext2D, x0: number, w: number, yTop: number, seed: number, count: number, wrap: boolean, color: string = V.shadow): void {
  const rng = createRng(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = x0 + rng() * w;
    const y = yTop + 1.2 + rng() * 21.6;
    const r = 0.16 + rng() * 0.4;
    const pale = rng() < 0.2;
    ctx.fillStyle = pale ? rgba(PAPER_FILL, 0.3) : rgba(color, 0.14 + 0.22 * rng() + 0.1 * ((y - yTop) / SNAKE_W));
    for (const k of wrap ? [-w, 0, w] : [0]) {
      ctx.beginPath();
      ctx.arc(x + k, y, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * A dark cross-bar or spot painted as watercolour: laid in over a paler
 * halo of limestone, its heart lifted warmer towards the light, the pigment
 * pooled near-black at the drying edge, a soft pen rim and an ink hairline.
 * The rim is broken (the bars' edges are ragged with single dark scales).
 */
export function paintBar(ctx: CanvasRenderingContext2D, shape: readonly Pt[], seed: number, ink: string, rim = 1, halo = 0.45): void {
  const pen = new Pen(ctx, seed, 0.35);
  const { cx, cy, rx, ry } = centreOf(shape);
  if (halo > 0) glaze(ctx, cx, cy, rx + 2.4, ry + 1.6, 0, V.halo, halo);
  pen.fill(shape, V.bar, 0.9);
  pen.clipped(shape, () => {
    glaze(ctx, cx - rx * 0.16, cy - ry * 0.3, rx * 0.9, ry * 0.72, 0, V.barLit, 0.55);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(V.barDeep, 0.55);
    ctx.lineWidth = rim * 2.6;
    pathOf(ctx, shape);
    ctx.stroke();
    ctx.restore();
    pen.stroke(closed(shape), rim * 1.1, V.rim, 0.7, false);
  });
  pen.hair(closed(shape), 0.28, ink, 0.3);
}
