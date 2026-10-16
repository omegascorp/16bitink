import { INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawTextLine } from '../captions';
import { CARD, LANDS, OCEAN_LABEL, PLACE_LABELS, project, ROUTE_LEN, routeAt } from './atlas';
import { RED, WATER } from './props';

/**
 * The ink map of the North Atlantic: an old chart on a card, the coasts
 * inked and hatched, the sea washed blue with wave marks and a compass, and
 * the bluefin's dotted route drawn out as it crosses. The card is drawn once
 * per boil frame; the route and names go on top each frame.
 */

const CARD_PAPER = '#f1e4c0';
const SEA = '#b9d2dc';
const LAND = '#e0cb94';
const LAND_SHADE = '#a8865a';
/** The inner frame's inset from the card's edge. */
const INSET = 22;

/** Wave marks in the open sea (degrees). */
const WAVES: readonly (readonly [number, number])[] = [
  [-60, 30], [-47, 52], [-30, 55], [-25, 30], [-55, 18], [-38, 12], [-20, 5], [-28, -6], [-62, 50], [-15, 50], [-8, 25],
];

function inkCard(pen: Pen, ctx: CanvasRenderingContext2D): void {
  const { w, h } = CARD;
  const local = (p: Pt): Pt => ({ x: p.x - CARD.x, y: p.y - CARD.y });
  const rect = (i: number): Pt[] => [{ x: i, y: i }, { x: w - i, y: i }, { x: w - i, y: h - i }, { x: i, y: h - i }];
  pen.fill(rect(2), CARD_PAPER, 1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(INSET, INSET, w - 2 * INSET, h - 2 * INSET);
  ctx.clip();
  pen.fill(rect(INSET), SEA, 0.55);
  for (const [lon, lat] of WAVES) {
    const p = local(project(lon, lat));
    pen.hair([{ x: p.x - 22, y: p.y }, { x: p.x - 11, y: p.y - 6 }, { x: p.x, y: p.y }, { x: p.x + 11, y: p.y + 6 }, { x: p.x + 22, y: p.y }], 2, INK, 0.45);
  }
  for (const land of LANDS) {
    const pts = land.map(local);
    pen.fill(pts, LAND, 1);
    pen.hatch(pts, 11, 0.9, 0.9, { color: LAND_SHADE, alpha: 0.45 });
    pen.closed(pts, 2.8);
  }
  // A compass rose in the open sea.
  const c = local(project(-30, -4));
  pen.stroke([{ x: c.x, y: c.y - 46 }, { x: c.x + 10, y: c.y }, { x: c.x, y: c.y + 46 }, { x: c.x - 10, y: c.y }, { x: c.x, y: c.y - 46 }], 2.4);
  pen.fill([{ x: c.x, y: c.y - 46 }, { x: c.x + 10, y: c.y }, { x: c.x - 10, y: c.y }], INK, 0.85);
  pen.stroke([{ x: c.x - 40, y: c.y }, { x: c.x + 40, y: c.y }], 1.8);
  pen.circle(c.x, c.y, 26, 1.4);
  ctx.restore();
  pen.closed(rect(INSET), 2.4);
  pen.closed(rect(6), 4);
}

/** The map card, one canvas per boil frame. */
export function makeMap(): readonly HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(CARD.w, CARD.h);
    inkCard(new Pen(ctx, 6000 + f * 977, 1.1), ctx);
    return canvas;
  });
}

const DOT_GAP = 20;

/** The route as dots: faint all the way, bold red where the bluefin has already swum (`u` 0 .. 1). */
function drawRoute(ctx: CanvasRenderingContext2D, u: number): void {
  const n = Math.floor(ROUTE_LEN / DOT_GAP);
  ctx.save();
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const p = routeAt(s);
    const done = s <= u;
    ctx.globalAlpha = done ? 1 : 0.4;
    ctx.fillStyle = done ? RED : INK;
    ctx.beginPath();
    ctx.arc(p.x, p.y, done ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The map with its names and the route, faded in by `alpha`; "Atlantic Ocean" by `ocean`. */
export function drawMap(ctx: CanvasRenderingContext2D, frames: readonly HTMLCanvasElement[], boil: number, alpha: number, u: number, ocean: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const grow = 0.94 + 0.06 * alpha;
  ctx.translate(CARD.x + CARD.w / 2, CARD.y + CARD.h / 2);
  ctx.scale(grow, grow);
  ctx.translate(-CARD.x - CARD.w / 2, -CARD.y - CARD.h / 2);
  ctx.drawImage(frames[boil % frames.length]!, CARD.x, CARD.y);
  drawRoute(ctx, u);
  ctx.restore();
  for (const p of PLACE_LABELS) drawTextLine(ctx, p.text, p.at.x, p.at.y, 54, 700, alpha * 0.85);
  drawTextLine(ctx, 'Atlantic Ocean', OCEAN_LABEL.x, OCEAN_LABEL.y, 70, 700, alpha * ocean, { fill: WATER, halo: '#e3ecef' });
}
