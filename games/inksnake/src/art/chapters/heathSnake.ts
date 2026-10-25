import { createRng } from '../../logic/rng';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, pathOf, type Pt } from '../pen';
import { blotchShape, flankHatch, glaze, periodicLine } from '../snakes/cornPaint';
import { SNAKE_W, stripLength, type SnakeArt } from '../types';
import { rgba } from '../wash';
import { centreOf, hogModel, mod, speckle } from './barrensSnakePaint';
import { ADDER_HEAD, ADDER_SNOUT, ADDER_TONGUE } from './heathSnakeHead';
import {
  ADDER_PAINT, ADDER_PERIOD, adderCrossWash, adderScales, BOTTOM_EDGE, layAdderTile, TOP_EDGE, ZIG, ZIGS, zigEdges, zigShape,
} from './heathSnakePaint';

/**
 * The European adder (Vipera berus, chapter 8), a male, seen from above:
 * a stout snake, silvery grey-cream, a bold jet-black zigzag running down
 * the middle of the back, its outer points sharp and its inner notches
 * rounded, a row of dark spots low on each flank in the bays between the
 * zigzag's points, the ground finely flecked and the keeled scales matte.
 *
 * As the hognose's, the strip is one period painted once on a tile (the
 * features crossing the tile's ends drawn at both ends from the same seed,
 * the zigzag's geometry periodic) and the tile laid end to end, so
 * x = PERIOD + a is pixel for pixel x = a, and the zigzag joins across it.
 */
const PERIOD = ADDER_PERIOD;
/** A scale's length along the body; it divides the period. */
const SCALE_LEN = 2.56;
const A = ADDER_PAINT;

/** The flank spots beside zig i: one high on the top flank under its bottom point, one low on the bottom flank under its top point. */
function flankSpots(i: number): { shape: Pt[]; seed: number }[] {
  const k = mod(i, ZIGS);
  const rng = createRng(14100 + k * 17);
  const up = blotchShape(i * ZIG + ZIG / 2 + (rng() - 0.5) * 1.4, 2.5, 2.5 + rng() * 0.6, 1.9, 14200 + k, { rough: 0.16, pow: 2.4, n: 24 });
  const down = blotchShape(i * ZIG + (rng() - 0.5) * 1.4, SNAKE_W - 2.4, 2.7 + rng() * 0.6, 2.1, 14300 + k, { rough: 0.16, pow: 2.4, n: 24 });
  return [{ shape: up, seed: 14400 + k }, { shape: down, seed: 14500 + k }];
}

/** The ground between the marks: warmed buff here and there along the back, cooled grey low on the flanks, unevenly, as a wash dries. */
function groundGlazes(ctx: CanvasRenderingContext2D, i: number): void {
  const k = mod(i, ZIGS);
  const rng = createRng(14600 + k * 11);
  const x = i * ZIG;
  glaze(ctx, x + ZIG * 0.5 + (rng() - 0.5) * 4, 5 + rng() * 2, 6, 2.6, 0, A.pale, 0.45);
  glaze(ctx, x + (rng() - 0.5) * 6, 19 + rng() * 1.5, 7, 2.8, 0, A.grey, 0.28);
  if (rng() < 0.6) glaze(ctx, x + rng() * ZIG, 8 + rng() * 8, 7, 4, 0, A.buff, 0.22);
}

/** A dark flank spot as watercolour: the black laid in, lifted a little towards the light, pooled darker at its drying edge, a pen rim. */
function paintSpot(ctx: CanvasRenderingContext2D, shape: readonly Pt[], seed: number, ink: string): void {
  const pen = new Pen(ctx, seed, 0.3);
  const { cx, cy, rx, ry } = centreOf(shape);
  pen.fill(shape, A.zig, 0.86);
  pen.clipped(shape, () => {
    glaze(ctx, cx - rx * 0.2, cy - ry * 0.3, rx * 0.8, ry * 0.6, 0, A.zigLit, 0.45);
    pen.stroke(closed(shape), 0.9, A.rim, 0.7, false);
  });
  pen.hair(closed(shape), 0.26, ink, 0.3);
}

/**
 * The zigzag as watercolour: a pale margin either side (the band is edged
 * lighter), the black laid in as one wash, a lifted, slightly warm heart
 * along each stroke where the light catches the back, the pigment pooled
 * near-black at the drying edges, then each stroke's edges inked
 * separately, as a pen draws a zigzag, stroke by stroke.
 */
function paintZigzag(ctx: CanvasRenderingContext2D, ink: string, boil: number): void {
  const x0 = -ZIG;
  const x1 = PERIOD + ZIG;
  const band = zigShape(x0, x1);
  const margin = zigShape(x0, x1, 0, 0.5);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(A.pale, 0.55);
  ctx.lineWidth = 2.2;
  pathOf(ctx, margin);
  ctx.stroke();
  ctx.restore();
  const pen = new Pen(ctx, 14700, 0.3);
  pen.fill(band, A.zig, 0.95);
  pen.clipped(band, () => {
    for (let i = -1; i <= ZIGS; i++) {
      // Lift along each stroke's middle, more on the upper (lit) side of the back.
      for (const h of [0.25, 0.75]) {
        const x = (i + h) * ZIG;
        const e = zigEdges(x);
        const rot = h < 0.5 ? 0.95 : -0.95;
        const y = (e.top + e.bot) / 2;
        glaze(ctx, x, y - 0.5, 4.6, 1.6, rot, A.zigLit, 0.12 + 0.6 * Math.max(0, 1 - y / SNAKE_W));
      }
    }
    speckle(ctx, 0, PERIOD, 0, 14750, 260, true, '#6a5f56');
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(A.zigDeep, 0.7);
    ctx.lineWidth = 1.8;
    pathOf(ctx, band);
    ctx.stroke();
    ctx.restore();
  });
  for (let i = -1; i <= ZIGS; i++) {
    const k = mod(i, ZIGS);
    for (const [h, top] of [[0, true], [0.5, false]] as const) {
      // Each edge in two strokes per zig, broken at the points as a pen lifts.
      const from = (i + h) * ZIG;
      for (const [a, b, s] of [[from - 0.2, from + ZIG / 2 + 0.3, 0], [from + ZIG / 2 - 0.3, from + ZIG + 0.2, 1]] as const) {
        const line: Pt[] = [];
        for (let x = a; x <= b; x += 0.5) line.push(pt(x, top ? zigEdges(x).top : zigEdges(x).bot));
        new Pen(ctx, 14800 + k * 8 + (top ? 0 : 4) + s * 2 + boil, 0.25).hair(line, 0.62, A.rim, 0.75);
        new Pen(ctx, 14900 + k * 8 + (top ? 0 : 4) + s * 2 + boil, 0.3).hair(line, 0.24, ink, 0.35);
      }
    }
  }
}

/** Paints one period of the back into [0, PERIOD] × [0, SNAKE_W]. */
function paintTile(ctx: CanvasRenderingContext2D, ink: string, f: number): void {
  const boil = f * 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP_EDGE - 0.6, PERIOD, BOTTOM_EDGE - TOP_EDGE + 1.2);
  ctx.clip();
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = adderCrossWash(ctx, 0);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 1;
  for (let i = -1; i <= ZIGS; i++) groundGlazes(ctx, i);
  speckle(ctx, 0, PERIOD, 0, 15000, 320, true, A.shadow);
  for (let i = -1; i <= ZIGS; i++) for (const s of flankSpots(i)) paintSpot(ctx, s.shape, s.seed + boil, ink);
  paintZigzag(ctx, ink, boil);
  adderScales(ctx, 0, PERIOD, 0, SCALE_LEN, 0.42);
  speckle(ctx, 0, PERIOD, 0, 15100, 380, true);
  hogModel(ctx, 0, PERIOD, 0, A.shadow, 0.26);
  flankHatch(ctx, 0, PERIOD, 64, 0, 15200 + boil, ink, 0.38, true);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, TOP_EDGE, 1.15, ink, 0.95, 15300 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE, 1.85, ink, 1, 15350 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE - 0.55, 0.6, ink, 0.3, 15390 + boil);
}

function drawStrip(d: Draw, length: number): void {
  layAdderTile(d.pen.ctx, length, (tile) => paintTile(tile, d.ink, d.f));
}

export const ADDER_ART: SnakeArt | undefined = {
  period: PERIOD,
  drawStrip: (d, length) => drawStrip(d, Math.min(length, stripLength(PERIOD))),
  head: ADDER_HEAD,
  tongue: ADDER_TONGUE,
  snout: ADDER_SNOUT,
  colours: { base: A.ground, mark: A.zig, belly: A.belly },
};
