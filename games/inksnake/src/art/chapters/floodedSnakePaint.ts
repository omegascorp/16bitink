import { createRng } from '../../logic/rng';
import { closed, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, pathOf, type Pt, withScratch } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { SNAKE_W } from '../types';
import { rgba } from '../wash';
import { centreOf } from './barrensSnakePaint';

/**
 * The green anaconda's paint box and the brushwork its back strip and its
 * neck share: an olive ground, lit yellow-olive along the back and sinking
 * to a deep moss-brown on the far flank; big black spots pooled darker at
 * their drying edges; the side spots (ocelli) black rings round an ochre
 * heart; small, smooth scales; and a wet sheen over the whole cylinder.
 * The bigger, older female rival uses the same brushwork in her own tones.
 * Everything is deterministic: the same call paints the same pixels.
 */
export interface AnacondaTone {
  /** The cross-section wash, lit edge (y = 0) to far flank. */
  readonly wash: readonly [string, string, string, string, string];
  readonly ground: string;
  readonly olive: string;
  readonly moss: string;
  readonly shadow: string;
  readonly spot: string;
  readonly spotLit: string;
  readonly spotDeep: string;
  readonly ocellus: string;
  readonly ocellusLit: string;
  readonly stripe: string;
  readonly iris: string;
  readonly lip: string;
  readonly belly: string;
  /** How glossy the wet skin is (0..1). */
  readonly sheen: number;
  /** Seeds the pattern, so two snakes are not marked alike. */
  readonly seed: number;
}

export const ANACONDA_TONE: AnacondaTone = {
  wash: ['#c3c27a', '#9da653', '#7d8a3c', '#5f6a2c', '#434a20'],
  ground: '#7d8a3c',
  olive: '#a7ac5c',
  moss: '#56602a',
  shadow: '#232611',
  spot: '#1e1e12',
  spotLit: '#3c3d22',
  spotDeep: '#0d0d07',
  ocellus: '#d2903a',
  ocellusLit: '#ecc067',
  stripe: '#dc8a33',
  iris: '#9b8a3c',
  lip: '#d8cd8c',
  belly: '#d9cf8f',
  sheen: 0.32,
  seed: 0,
};

/** The bigger, older female: paler and duller, greyer olive, her spots a little faded, her skin less glossy. */
export const BIG_ANACONDA_TONE: AnacondaTone = {
  wash: ['#c9c597', '#a7a771', '#8a8d58', '#6d7046', '#4f5134'],
  ground: '#8a8d58',
  olive: '#b0ae80',
  moss: '#646646',
  shadow: '#2b2b1c',
  spot: '#2a2a1e',
  spotLit: '#47463a',
  spotDeep: '#16160f',
  ocellus: '#c09a5a',
  ocellusLit: '#dcc08a',
  stripe: '#c79156',
  iris: '#8f8452',
  lip: '#d6cfa4',
  belly: '#d6cfa8',
  sheen: 0.22,
  seed: 777,
};

/** One period of the pattern, board px. */
export const ANA_PERIOD = 120;
/** Where the long contours run. */
export const TOP_EDGE = 1.2;
export const BOTTOM_EDGE = SNAKE_W - 1.2;

export const mod = (i: number, n: number): number => ((i % n) + n) % n;

/** The back's cross-section wash, `yTop` being where the strip's y = 0 lies. */
export function anaCrossWash(ctx: CanvasRenderingContext2D, yTop: number, t: AnacondaTone): CanvasGradient {
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + SNAKE_W);
  [0, 0.17, 0.44, 0.76, 1].forEach((s, i) => g.addColorStop(s, t.wash[i]!));
  return g;
}

/**
 * Light and shade over the painted pattern, a wet cylinder lit from the
 * upper left: a bright, narrow sheen high on the back with a broader soft
 * one round it, the far flank in deep shadow with a little reflected light
 * (from the water) at its very edge.
 */
export function anaModel(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number, t: AnacondaTone): void {
  const h = SNAKE_W;
  const dark = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  dark.addColorStop(0, rgba(t.shadow, 0.06));
  dark.addColorStop(0.12, rgba(t.shadow, 0));
  dark.addColorStop(0.5, rgba(t.shadow, 0));
  dark.addColorStop(0.68, rgba(t.shadow, 0.16));
  dark.addColorStop(0.86, rgba(t.shadow, 0.42));
  dark.addColorStop(0.95, rgba(t.shadow, 0.52));
  dark.addColorStop(1, rgba(t.shadow, 0.3));
  const gloss = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  gloss.addColorStop(0.08, rgba(PAPER_FILL, 0));
  gloss.addColorStop(0.17, rgba(PAPER_FILL, t.sheen * 0.7));
  gloss.addColorStop(0.22, rgba(PAPER_FILL, t.sheen));
  gloss.addColorStop(0.27, rgba(PAPER_FILL, t.sheen * 0.55));
  gloss.addColorStop(0.42, rgba(PAPER_FILL, 0));
  ctx.save();
  ctx.fillStyle = dark;
  ctx.fillRect(x0, yTop - 4, x1 - x0, h + 8);
  ctx.fillStyle = gloss;
  ctx.fillRect(x0, yTop - 4, x1 - x0, h + 8);
  ctx.restore();
}

/** A fixed pseudo-random 0..1 for (j, r). */
export function hash(j: number, r: number): number {
  const v = Math.sin(j * 12.9898 + r * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

const ROWS = 19;

/**
 * The small, smooth scales, row on row round the body: each a rounded free
 * edge towards the tail (+x) in a hair of shadow, a glint on the scales
 * along the sheen. `len` must divide `period` for the rows to repeat with it.
 */
export function smoothScales(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number, len: number, alpha: number, period: number, t: AnacondaTone): void {
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
    const glints = new Path2D();
    for (let x = first; x <= x1 + len; x += len) {
      const j = ((Math.round((x - shift) / len) % perRow) + perRow) % perRow;
      const h = hash(j, r + t.seed);
      const b = (hash(j + 7, r + 3) - 0.5) * 0.26;
      edges.moveTo(x - len * 0.36, y - hh + b);
      edges.quadraticCurveTo(x + len * (0.55 + 0.12 * h), y + b, x - len * 0.36, y + hh + b);
      if (h > 0.4) {
        glints.moveTo(x - len * 0.3, y - hh * 0.45 + b);
        glints.lineTo(x + len * (0.05 + 0.18 * h), y - hh * 0.5 + b);
      }
    }
    const shade = sy / SNAKE_W;
    ctx.lineWidth = 0.24;
    ctx.strokeStyle = rgba(t.shadow, alpha * (0.4 + 0.9 * shade));
    ctx.stroke(edges);
    const g = Math.max(0, 1 - Math.abs(sy - 5.2) / 3.6);
    if (g > 0.05) {
      ctx.lineWidth = 0.34;
      ctx.strokeStyle = rgba(PAPER_FILL, 0.5 * g * (t.sheen / 0.32));
      ctx.stroke(glints);
    }
  }
  ctx.restore();
}

/** Pigment in the paper's tooth, and the olive's darker flecks: dots over x0..x0+w, repeated every `w` when `wrap`. */
export function flecks(ctx: CanvasRenderingContext2D, x0: number, w: number, yTop: number, seed: number, count: number, wrap: boolean, color: string): void {
  const rng = createRng(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = x0 + rng() * w;
    const y = yTop + 1.2 + rng() * 21.6;
    const r = 0.16 + rng() * 0.36;
    const pale = rng() < 0.16;
    ctx.fillStyle = pale ? rgba(PAPER_FILL, 0.22) : rgba(color, 0.1 + 0.18 * rng() + 0.12 * ((y - yTop) / SNAKE_W));
    for (const k of wrap ? [-w, 0, w] : [0]) {
      ctx.beginPath();
      ctx.arc(x + k, y, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * A black spot painted as watercolour: the near-black laid in, its heart
 * lifted olive towards the light, the pigment pooled darkest at the drying
 * edge, a firm pen rim and a fine ink hairline round it.
 */
export function paintSpot(ctx: CanvasRenderingContext2D, shape: readonly Pt[], seed: number, ink: string, t: AnacondaTone, rim = 1.1): void {
  const pen = new Pen(ctx, seed, 0.35);
  const { cx, cy, rx, ry } = centreOf(shape);
  pen.fill(shape, t.spot, 0.93);
  pen.clipped(shape, () => {
    glaze(ctx, cx - rx * 0.16, cy - ry * 0.3, rx * 0.85, ry * 0.65, 0, t.spotLit, 0.55);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(t.spotDeep, 0.65);
    ctx.lineWidth = rim * 2.4;
    pathOf(ctx, shape);
    ctx.stroke();
    ctx.restore();
    pen.stroke(closed(shape), rim * 1.1, t.spotDeep, 0.85, false);
  });
  pen.hair(closed(shape), 0.32, ink, 0.4);
}

/**
 * A side spot: a black ring round an ochre-orange heart, the heart lit on
 * its upper side, the ring heavier on the side away from the light.
 */
export function paintOcellus(ctx: CanvasRenderingContext2D, ring: readonly Pt[], heart: readonly Pt[], seed: number, ink: string, t: AnacondaTone): void {
  const pen = new Pen(ctx, seed, 0.3);
  const c = centreOf(heart);
  pen.fill(ring, t.spot, 0.92);
  pen.fill(heart, t.ocellus, 0.95);
  pen.clipped(heart, () => {
    glaze(ctx, c.cx - c.rx * 0.2, c.cy - c.ry * 0.35, c.rx * 0.8, c.ry * 0.6, 0, t.ocellusLit, 0.6);
    glaze(ctx, c.cx + c.rx * 0.2, c.cy + c.ry * 0.5, c.rx, c.ry * 0.6, 0, t.moss, 0.35);
  });
  pen.hair(closed(heart), 0.26, t.spotDeep, 0.6);
  pen.hair(closed(ring), 0.3, ink, 0.4);
}

/**
 * Paints one period on a tile at the target's own resolution, then lays the
 * tile end to end along `length`, so x = period + a is pixel for pixel x = a.
 */
export function layAnaTile(ctx: CanvasRenderingContext2D, length: number, paint: (tile: CanvasRenderingContext2D) => void): void {
  const res = Math.abs(ctx.getTransform().a) || 1;
  withScratch(Math.round(ANA_PERIOD * res), Math.round(SNAKE_W * res), (tctx, tile) => {
    tctx.scale(res, res);
    paint(tctx);
    for (let x = 0; x < length; x += ANA_PERIOD) ctx.drawImage(tile, x, 0, ANA_PERIOD, SNAKE_W);
  });
}
