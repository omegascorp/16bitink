import type { Draw } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import { type Pt, withScratch } from '../../../src/art/pen';
import { pt } from '../../../src/art/kit';
import { createRng } from '../../../src/logic/rng';
import { CORN } from '../../../src/art/snakes/corn';
import { glaze, periodicLine } from '../../../src/art/snakes/cornPaint';
import { COBRA_PAINT, COBRA_PERIOD, paintCobraTile } from '../../../src/art/chapters/jungleSnakeCobra';
import { SNAKE_W, stripLength, type SnakeArt } from '../../../src/art/types';
import { rgba } from '../../../src/art/wash';

/**
 * The king cobra's body seen side on, for the strip the promo lays along a
 * body (sprites.ts drawBody): the game's own painted back (jungleSnakeCobra.ts
 * paintCobraTile: the olive-brown ground, every scale dark-edged, the pale
 * yellowish chevron bands) from its midline out to one flank, opened up so
 * the midline runs along the strip's top edge and the chevrons' arms sweep
 * down and back towards the belly; under it the pale cream belly plates. Lit
 * from above: a sheen along the back, the low flank darker, the belly's own
 * round. One period painted once and laid end to end.
 */
export const COBRA = {
  ...COBRA_PAINT,
  line: '#14120a',
  bellyLit: '#eee3b4',
  bellyDeep: '#a99a62',
  skin: '#1d1a10',
  throat: '#efe2b2',
} as const;

const PERIOD = COBRA_PERIOD;
/** Where the flank meets the belly, strip units from the top edge. */
export const BELLY_Y = 17.4;
/** The game tile's midline and the lit flank's contour it is opened out to. */
const MID = 12;
const FLANK = 0.6;

/** The game's back from its midline out to its lit flank, turned so the midline runs along the top, stretched over the strip's top BELLY_Y units. */
function paintSide(ctx: CanvasRenderingContext2D, f: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-1, 0, PERIOD + 2, BELLY_Y + 0.3);
  ctx.clip();
  ctx.scale(1, BELLY_Y / (FLANK - MID));
  ctx.translate(0, -MID);
  paintCobraTile(ctx, COBRA.line, f);
  ctx.restore();
}

/** The game's band i, its arm from the midline out to the lit flank (jungleSnakeCobra.ts bandSpine, the same seeds), in tile units. */
function bandArm(i: number): Pt[] {
  const k = ((i % 4) + 4) % 4;
  const rng = createRng(21100 + k * 17);
  const step = PERIOD / 4;
  const x = i * step + step / 2 + (rng() - 0.5) * 3;
  const sweep = 6.5 + rng() * 1.8;
  const lean = (rng() - 0.5) * 1.6;
  return [pt(x, 12), pt(x + sweep * 0.45, 6), pt(x + sweep + lean, -1.5)];
}

/** The bands lifted a little paler over the game's, so they read at phone size. */
function liftBands(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-1, 0, PERIOD + 2, BELLY_Y + 0.3);
  ctx.clip();
  ctx.scale(1, BELLY_Y / (FLANK - MID));
  ctx.translate(0, -MID);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  for (let i = -1; i <= 4; i++) {
    const arm = bandArm(i);
    for (const [w, colour, a, dx] of [[3.2, '#e8d68e', 0.22, 0.3], [2.2, '#efe0a0', 0.38, -0.2], [1, '#fff3c4', 0.3, 0]] as const) {
      ctx.strokeStyle = rgba(colour, a);
      ctx.lineWidth = w;
      ctx.beginPath();
      arm.forEach((p, j) => (j === 0 ? ctx.moveTo(p.x + dx, p.y) : ctx.lineTo(p.x + dx + (j === 1 ? 0.4 : 0), p.y)));
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** The belly plates: one per scale row along, pale cream, each with its free edge inked and its own little round. */
function paintBelly(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  const g = ctx.createLinearGradient(0, BELLY_Y, 0, SNAKE_W);
  g.addColorStop(0, COBRA.bellyDeep);
  g.addColorStop(0.18, COBRA.bellyLit);
  g.addColorStop(0.6, COBRA.belly);
  g.addColorStop(1, COBRA.bellyDeep);
  ctx.fillStyle = g;
  ctx.fillRect(-1, BELLY_Y, PERIOD + 2, SNAKE_W - BELLY_Y);
  ctx.strokeStyle = rgba(COBRA.bandDeep, 0.85);
  ctx.lineWidth = 0.32;
  for (let x = 0; x <= PERIOD; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, BELLY_Y + 0.3);
    ctx.quadraticCurveTo(x + 1.1, BELLY_Y + 3, x + 0.4, SNAKE_W - 0.4);
    ctx.stroke();
  }
  ctx.restore();
  // The flank's shadow lying on the top of the belly.
  const s = ctx.createLinearGradient(0, BELLY_Y - 1.5, 0, BELLY_Y + 2.5);
  s.addColorStop(0, rgba(COBRA.shadow, 0));
  s.addColorStop(0.45, rgba(COBRA.shadow, 0.45));
  s.addColorStop(1, rgba(COBRA.shadow, 0));
  ctx.fillStyle = s;
  ctx.fillRect(-1, BELLY_Y - 1.5, PERIOD + 2, 4);
}

/** Light from above over the opened-out back: the gloss along the spine, the low flank turning away. */
function modelSide(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, BELLY_Y);
  g.addColorStop(0, rgba(PAPER_FILL, 0.16));
  g.addColorStop(0.16, rgba(PAPER_FILL, 0.26));
  g.addColorStop(0.34, rgba(PAPER_FILL, 0.04));
  g.addColorStop(0.55, rgba(COBRA.shadow, 0));
  g.addColorStop(0.85, rgba(COBRA.shadow, 0.3));
  g.addColorStop(1, rgba(COBRA.shadow, 0.5));
  ctx.fillStyle = g;
  ctx.fillRect(-1, 0, PERIOD + 2, BELLY_Y);
  for (let x = 10; x < PERIOD; x += 30) glaze(ctx, x, 2.6, 12, 1.4, 0, PAPER_FILL, 0.14);
  // Warmed from the game's greener olive to a king cobra's olive-brown.
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = rgba('#9a8150', 0.62);
  ctx.fillRect(-1, 0, PERIOD + 2, BELLY_Y);
  ctx.restore();
}

function paintTile(ctx: CanvasRenderingContext2D, f: number): void {
  const boil = f * 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0.4, PERIOD, SNAKE_W - 0.8);
  ctx.clip();
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  paintSide(ctx, f);
  paintBelly(ctx);
  modelSide(ctx);
  liftBands(ctx);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, 0.9, 0.6, COBRA.line, 0.95, 31800 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, SNAKE_W - 0.9, 0.75, COBRA.line, 1, 31900 + boil);
}

const stripOf = (under: boolean) => (d: Draw, length: number): void => {
  const { ctx } = d.pen;
  const res = Math.abs(ctx.getTransform().a) || 1;
  withScratch(Math.round(PERIOD * res), Math.round(SNAKE_W * res), (tctx, tile) => {
    tctx.scale(res, res);
    if (under) {
      tctx.translate(0, SNAKE_W);
      tctx.scale(1, -1);
    }
    paintTile(tctx, d.f);
    for (let x = 0; x < Math.min(length, stripLength(PERIOD)); x += PERIOD) ctx.drawImage(tile, x, 0, PERIOD, SNAKE_W);
  });
};

/** Strips for a body whose head is on the right (back along the top edge) and on the left. */
export const COBRA_HEAD_RIGHT: SnakeArt = { ...CORN, period: PERIOD, drawStrip: stripOf(false) };
export const COBRA_HEAD_LEFT: SnakeArt = { ...CORN, period: PERIOD, drawStrip: stripOf(true) };
