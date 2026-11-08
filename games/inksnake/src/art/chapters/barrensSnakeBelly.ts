import { createRng } from '../../logic/rng';
import { cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, pathOf, type Pt } from '../pen';
import { blotchShape, flankHatch, glaze, periodicLine } from '../snakes/cornPaint';
import { SNAKE_W } from '../types';
import { rgba } from '../wash';
import { BOTTOM_EDGE, hash, HOG_PAINT, HOG_PERIOD, hogModel, layTile, mod, paintHogBlotch, speckle, TOP_EDGE } from './barrensSnakePaint';

/**
 * The hognose's belly, for when it rolls over and plays dead: the wide
 * ventral plates crossing the body, pale cream to yellowish, mottled with
 * smoky grey plate by plate and in drifts over several plates, each plate's
 * free edge (towards the tail, +x) casting a hair of shadow on the next and
 * catching a glint; along both edges a thin band of the tan flank turning
 * away, its lowest blotches peeking round. Periodic on the back's period.
 */
const PERIOD = HOG_PERIOD;
/** A ventral plate's length along the body; it divides the period. */
const PLATE = 3;
const PLATES = PERIOD / PLATE;
/** Where the plates end and the flank begins, each side. */
const PLATE_TOP = 4;
const PLATE_BOT = SNAKE_W - 3.8;
/** Drifts of mottling per period. */
const DRIFTS = 8;

const H = HOG_PAINT;

/** The belly's cross-section wash: cream where the light falls, cooling to grey-buff on the far side. */
function bellyWash(ctx: CanvasRenderingContext2D): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, 0, SNAKE_W);
  g.addColorStop(0, '#d9be86');
  g.addColorStop(PLATE_TOP / SNAKE_W, '#efe7cc');
  g.addColorStop(0.4, '#e9e0c2');
  g.addColorStop(0.72, '#d9d1b6');
  g.addColorStop(PLATE_BOT / SNAKE_W, '#bdb59c');
  g.addColorStop(1, '#9c7b4c');
  return g;
}

/** Plate j's free edge, across the belly, bowed a little towards the tail and hooked forward where it meets the flank. */
function plateEdge(j: number): Pt[] {
  const x = j * PLATE;
  const w = (hash(mod(j, PLATES), 41) - 0.5) * 0.3;
  return cub(pt(x - 0.7, PLATE_TOP - 0.2), pt(x + 0.5 + w, PLATE_TOP + 4), pt(x + 0.5 - w, PLATE_BOT - 4), pt(x - 0.7, PLATE_BOT + 0.2), 14);
}

/** Plate j: between edge j − 1 (its front, under the plate before) and edge j (its free edge). */
function plateShape(j: number): Pt[] {
  return [...plateEdge(j - 1), ...plateEdge(j).reverse()];
}

/** The tan of the flank showing along both edges. */
function flankGround(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = rgba('#cfa866', 0.92);
  ctx.fillRect(-1, 0, PERIOD + 2, PLATE_TOP - 0.3);
  ctx.fillStyle = rgba('#a27a46', 0.92);
  ctx.fillRect(-1, PLATE_BOT + 0.3, PERIOD + 2, SNAKE_W - PLATE_BOT);
  ctx.restore();
}

/** The flank's two thin bands at the edges: tan, with the flank's lowest blotches peeking round. */
function flankBands(ctx: CanvasRenderingContext2D, ink: string, boil: number): void {
  for (let i = -1; i <= DRIFTS; i++) {
    const k = mod(i, DRIFTS);
    const rng = createRng(11100 + k * 7);
    const x = (i * PERIOD) / DRIFTS + (rng() - 0.5) * 3;
    const up = blotchShape(x, 1.6, 2.4 + rng() * 0.8, 1.5, 11200 + k, { rough: 0.15, pow: 2.6, n: 20 });
    const down = blotchShape(x + 7 + (rng() - 0.5) * 2, SNAKE_W - 1.5, 2.6 + rng() * 0.8, 1.6, 11300 + k, { rough: 0.15, pow: 2.6, n: 20 });
    paintHogBlotch(ctx, up, 11400 + k + boil, ink, 0.8, 0);
    paintHogBlotch(ctx, down, 11500 + k + boil, ink, 0.8, 0);
  }
}

/** Smoky grey mottling: soft drifts across several plates, then plate-by-plate patches, as the eastern hognose's belly is clouded. */
function mottling(ctx: CanvasRenderingContext2D): void {
  for (let i = -1; i <= DRIFTS; i++) {
    const k = mod(i, DRIFTS);
    const rng = createRng(11600 + k * 23);
    const x = (i * PERIOD) / DRIFTS + PERIOD / DRIFTS / 2 + (rng() - 0.5) * 6;
    const y = 7 + rng() * 10;
    const rx = 6 + rng() * 5;
    const ry = 3 + rng() * 3;
    glaze(ctx, x, y, rx, ry, (rng() - 0.5) * 0.6, H.mottle, 0.32 + rng() * 0.18);
    glaze(ctx, x + (rng() - 0.5) * 4, y + (rng() - 0.5) * 3, rx * 0.45, ry * 0.5, 0, '#3f3d3c', 0.22 + rng() * 0.14);
  }
  for (let j = -1; j <= PLATES + 1; j++) {
    const jj = mod(j, PLATES);
    const n = Math.floor(hash(jj, 5) * 3.6);
    if (n === 0) continue;
    const shape = plateShape(j);
    ctx.save();
    pathOf(ctx, shape);
    ctx.clip();
    for (let m = 0; m < n; m++) {
      const y = PLATE_TOP + 1 + hash(jj, 11 + m) * (PLATE_BOT - PLATE_TOP - 2);
      const len = 1.6 + hash(jj, 17 + m) * 4.4;
      const a = 0.14 + hash(jj, 23 + m) * 0.3;
      glaze(ctx, j * PLATE - PLATE / 2 + 0.3, y, len, 2.2, 0, H.mottle, a);
      glaze(ctx, j * PLATE - PLATE / 2 + 0.6, y + 0.2, len * 0.5, 1, 0, '#3d3c3c', a * 0.6);
    }
    ctx.restore();
  }
}

/** Each plate's free edge: a hair of shadow cast tailwards onto the next plate, the edge in fine ink, a glint where the light catches it. */
function plateLines(ctx: CanvasRenderingContext2D, ink: string, boil: number): void {
  for (let j = -1; j <= PLATES + 1; j++) {
    const jj = mod(j, PLATES);
    const edge = plateEdge(j);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(H.shadow, 0.08);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    edge.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x + 0.55, p.y) : ctx.lineTo(p.x + 0.55, p.y)));
    ctx.stroke();
    ctx.restore();
    new Pen(ctx, 11700 + jj + boil, 0.25).hair(edge, 0.28, ink, 0.3 + 0.12 * hash(jj, 3));
    if (hash(jj, 9) > 0.4) {
      const glint = edge.slice(2, 5).map((p) => pt(p.x - 0.45, p.y));
      new Pen(ctx, 11800 + jj, 0.2).hair(glint, 0.34, PAPER_FILL, 0.4);
    }
  }
}

/** Paints one period of the belly into [0, PERIOD] × [0, SNAKE_W]. */
function paintTile(ctx: CanvasRenderingContext2D, ink: string, f: number): void {
  const boil = f * 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP_EDGE - 0.6, PERIOD, BOTTOM_EDGE - TOP_EDGE + 1.2);
  ctx.clip();
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = bellyWash(ctx);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 1;
  // The yellowish cast of the plates, stronger towards the light.
  glaze(ctx, PERIOD * 0.3, 8, PERIOD * 0.4, 5, 0, '#ecd796', 0.22);
  glaze(ctx, PERIOD * 0.8, 9, PERIOD * 0.4, 5, 0, '#ecd796', 0.18);
  glaze(ctx, PERIOD * 1.3, 8, PERIOD * 0.4, 5, 0, '#ecd796', 0.22);
  glaze(ctx, PERIOD * -0.2, 9, PERIOD * 0.4, 5, 0, '#ecd796', 0.18);
  mottling(ctx);
  flankGround(ctx);
  flankBands(ctx, ink, boil);
  plateLines(ctx, ink, boil);
  speckle(ctx, 0, PERIOD, 0, 11900, 300, true, '#4a4642');
  hogModel(ctx, 0, PERIOD, 0, '#3e3a30', 0.3);
  flankHatch(ctx, 0, PERIOD, 50, 0, 12000 + boil, ink, 0.3, true);
  ctx.restore();
  // Where the plates meet the flank, a fine line each side.
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, PLATE_TOP - 0.4, 0.42, ink, 0.45, 12100 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, PLATE_BOT + 0.4, 0.5, ink, 0.5, 12150 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, TOP_EDGE, 1.15, ink, 0.95, 12200 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE, 1.85, ink, 1, 12250 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, BOTTOM_EDGE - 0.55, 0.6, ink, 0.3, 12290 + boil);
}

/** The belly strip: the tile painted at the strip's own resolution, then laid end to end. */
export function drawBelly(d: Draw, length: number): void {
  layTile(d.pen.ctx, length, (tile) => paintTile(tile, d.ink, d.f));
}
