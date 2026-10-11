import type { MapLayout } from '../../scenes/map/layout';
import { MAP } from '../../scenes/map/layout';
import { islandPlans, seaRoutePath } from '../../scenes/map/plan';
import { createRng } from '../../logic/rng';
import { makeDraw } from '../kit';
import { INK } from '../palette';
import { PENCIL, type Span } from './context';
import { drawIsland } from './island';
import { BIOME_ART } from './islands';
import { compassRose, hereBeCrabs, scaleBar, titleCartouche, windRose } from './ornaments';
import { rhumbLines, routePoints, seaBase, soundings, waveMarks, windRoses } from './sea';
import { straitLife, STRAIT_LIFE_Y } from './straits';
import { sailboat } from './symbols';

/**
 * The level map as a hand-inked chart: the sea's washes, rhumb lines,
 * wave marks and soundings; every island in its own shape and colours,
 * with its waters, islets, landmarks and name cartouche; sea creatures and
 * ships in the straits, dashed sea routes between islands, and the title,
 * compass and scale before the first island. Drawn a chunk at a time;
 * everything is placed from world-fixed seeds, so a chunk seam never shows.
 */

/** How far beyond an island its drawings may reach, for deciding which chunks it touches. */
const REACH = 360;

/** How much of a draft x is: 1 over unbuilt islands, 0 over built ones, easing across the strait between. */
function draftAt(layout: MapLayout, x: number): number {
  const rs = layout.regions;
  const v = (i: number): number => (rs[i]!.beach.built ? 0 : 1);
  if (x <= rs[0]!.x1) return v(0);
  for (let i = 0; i < rs.length - 1; i++) {
    if (x <= rs[i]!.x1) return v(i);
    if (x < rs[i + 1]!.x0) {
      const t = (x - rs[i]!.x1) / (rs[i + 1]!.x0 - rs[i]!.x1);
      return v(i) + (v(i + 1) - v(i)) * t * t * (3 - 2 * t);
    }
  }
  return v(rs.length - 1);
}

/** Washes unbuilt islands back towards paper, so they read as pencil sketches of what's to come. */
function draftWash(ctx: CanvasRenderingContext2D, layout: MapLayout, span: Span): void {
  const w = span.x1 - span.x0;
  const g = ctx.createLinearGradient(span.x0, 0, span.x1, 0);
  for (let k = 0; k <= 32; k++) g.addColorStop(k / 32, `rgba(255,250,240,${(0.38 * draftAt(layout, span.x0 + (w * k) / 32)).toFixed(3)})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(span.x0, 0, w, layout.height);
  ctx.restore();
}

/** The dashed sea route from one island's last level to the next island's first, a sailboat halfway. */
function seaRoute(ctx: CanvasRenderingContext2D, layout: MapLayout, i: number, ink: string): void {
  const route = seaRoutePath(layout, i);
  if (route.length < 31) return;
  const d = makeDraw(ctx, 5000 + i, 0, 0, ink);
  for (let k = 0; k < route.length - 2; k += 3) d.pen.stroke([route[k]!, route[k + 1]!, route[k + 2]!], 1.8, d.ink, 0.75, false);
  const m = route[30]!;
  sailboat(d, m.x, m.y + 2, 1);
}

const inkAt = (layout: MapLayout) => (x: number): string => (draftAt(layout, x) > 0.5 ? PENCIL : INK);

/** Paints the chart between x0 and x0 + w (world px) into a context already scaled and translated for that span. */
export function drawChartChunk(ctx: CanvasRenderingContext2D, layout: MapLayout, x0: number, w: number, chunk: number): void {
  const span: Span = { x0, x1: x0 + w };
  const plans = islandPlans(layout);
  const ink = inkAt(layout);
  seaBase(ctx, layout, span);
  rhumbLines(ctx, layout, span);
  waveMarks(ctx, layout, span, ink);
  const life = layout.regions.slice(0, -1).map((r, i) => ({ x: (r.x1 + layout.regions[i + 1]!.x0) / 2, y: STRAIT_LIFE_Y, r: 120 }));
  const roses = windRoses(layout).map((o) => ({ x: o.x, y: o.y, r: o.r + 40 }));
  const start = [{ x: MAP.start / 2, y: 400, r: 300 }, { x: layout.width - MAP.start / 2, y: 330, r: 260 }];
  soundings(ctx, layout, span, [...life, ...roses, ...start, ...routePoints(layout)], ink);
  layout.regions.forEach((r, i) => {
    if (r.x1 + MAP.shoal + REACH < x0 || r.x0 - MAP.shoal - REACH > x0 + w) return;
    drawIsland(ctx, layout, r, plans[i]!, i, span, BIOME_ART[r.beach.biome.id]);
  });
  for (let i = 0; i < layout.regions.length - 1; i++) {
    const sx = life[i]!.x;
    if (sx + 200 < x0 || sx - 200 > x0 + w) continue;
    straitLife(makeDraw(ctx, 6000 + i, 0, 0, ink(sx)), i, sx, STRAIT_LIFE_Y);
  }
  for (const [k, rose] of windRoses(layout).entries()) {
    if (rose.x + rose.r * 1.4 < x0 || rose.x - rose.r * 1.4 > x0 + w) continue;
    const d = makeDraw(ctx, 77 + k, 0, 0, ink(rose.x));
    if (k === 0) compassRose(d, rose.x, rose.y, rose.r);
    else windRose(d, rose.x, rose.y, rose.r);
  }
  if (x0 < MAP.start) {
    titleCartouche(makeDraw(ctx, 81, 0, 0, INK), 40, 120, 480, 270);
    scaleBar(makeDraw(ctx, 82, 0, 0, INK), 290, 600, 230);
  }
  if (x0 + w > layout.width - MAP.start) hereBeCrabs(makeDraw(ctx, 83, 0, 0, ink(layout.width)), layout.width - MAP.start / 2 + 20, 250);
  draftWash(ctx, layout, span);
  for (let i = 0; i < layout.regions.length - 1; i++) {
    const a = layout.regions[i]!;
    const b = layout.regions[i + 1]!;
    if (a.x1 > x0 + w + REACH || b.x0 < x0 - REACH) continue;
    seaRoute(ctx, layout, i, b.beach.built ? INK : PENCIL);
  }
  // A ragged ruled border along the top and bottom of the chart.
  const rng = createRng(chunk + 1);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.4;
  for (const y of [6, layout.height - 6]) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    for (let x = x0; x < x0 + w + 40; x += 40) ctx.lineTo(Math.min(x, x0 + w), y + (rng() - 0.5) * 1.2);
    ctx.stroke();
  }
  ctx.restore();
}
