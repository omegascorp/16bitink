import { type MapLayout, type MapNode, type MapRegion, regionAt } from '../../scenes/map/layout';
import { makeDraw } from '../kit';
import { allotmentPlan } from './allotmentBand';
import type { Band } from './band';
import { barnPlan } from './barnBand';
import { drawFeatures, type Feature, type Geo, geoOf, seedOf, type Span, touches } from './common';
import { draftPlan } from './draftBand';
import { farmGate, palingGate, stileFence } from './farmGates';
import { paintEnds } from './ends';
import { type GardenPlan, gardenPlan, inBed, paintBeds } from './gardenBand';
import { gardenWall, pencilGate, pencilSign, roseArch, signBoard } from './gates';
import { greenhousePlan } from './greenhouseBand';
import { orchardPlan } from './orchardBand';
import { rockeryPlan } from './rockeryBand';
import { ruinsPlan } from './ruinsBand';
import { greenhouseDoor, hedgeGate, stoneGap } from './thresholds';
import { lawnMarks, paintLawn, paintPaper } from './ground';
import { ironGate, ruinedArch } from './lateGates';
import { meadowPlan } from './meadowBand';
import { nightPlan } from './nightBand';
import { paintedGroove, pencilGroove, pencilPocket } from './groove';
import { jointMoss, paintSlab, pathSlabs, pocketBed, pocketDimple, type Slab, slabTouches } from './paving';
import { type PondPlan, pondPlan } from './pondBand';
import { paintBridge, paintShores, paintWater } from './pondPaint';

export { SIGN_BOARD } from './gates';

/**
 * The level map's backdrop: the estate's garden plan from above, painted
 * in pen and wash where its chapters are built and pencilled where they
 * are not, with the worn groove climbing through it all. Painted a chunk
 * of world rows at a time; everything is placed once per layout from
 * world-fixed seeds, so chunk seams never show.
 */

/** A stretch of the groove drawn in one style: path indices i0..i1. */
interface Stretch {
  readonly i0: number;
  readonly i1: number;
  readonly painted: boolean;
}

/** A run of painted chapters sharing one lawn. */
interface Sheet {
  readonly top: number;
  readonly bottom: number;
}

interface Plan {
  readonly geo: Geo;
  readonly stretches: readonly Stretch[];
  readonly sheets: readonly Sheet[];
  readonly gardens: readonly GardenPlan[];
  readonly ponds: readonly PondPlan[];
  /** Chapters 3 on (greenhouse, orchard, rockery), each painted by its own band. */
  readonly bands: readonly Band[];
  readonly drafts: readonly Feature[];
  readonly path: readonly Slab[];
  readonly bridges: readonly (readonly [number, number])[];
}

/** Where the pencil runs on under the paint as the groove passes from a draft into a painted chapter. */
const OVERLAP = 15;

const painted = (r: MapRegion): boolean => r.chapter.place !== 'draft';

/** How far into a lawn's ragged top the painted groove stops and the pencil takes over. */
const PAINT_STOP = 40;

const BANDS: Partial<Record<MapRegion['chapter']['place'], (geo: Geo, r: MapRegion) => Band>> = {
  greenhouse: greenhousePlan,
  orchard: orchardPlan,
  rockery: rockeryPlan,
  allotment: allotmentPlan,
  meadow: meadowPlan,
  barn: barnPlan,
  ruins: ruinsPlan,
  night: nightPlan,
};

function stretchesOf(geo: Geo, sheets: readonly Sheet[]): Stretch[] {
  const { layout, pts } = geo;
  const paintedAt = (y: number): boolean => painted(layout.regions[regionAt(layout, y)]!) && !sheets.some((s) => y >= s.top - 30 && y < s.top + PAINT_STOP);
  const out: Stretch[] = [];
  let start = 0;
  let style = paintedAt(pts[0]!.y);
  for (let i = 1; i < pts.length; i++) {
    const s = paintedAt(pts[i]!.y);
    if (s === style) continue;
    out.push({ i0: start, i1: i, painted: style });
    start = i;
    style = s;
  }
  out.push({ i0: start, i1: pts.length - 1, painted: style });
  return out;
}

/** Runs of neighbouring painted chapters: one lawn under each, from the lowest one's gate up to just short of the highest one's top. */
function sheetsOf(layout: MapLayout): Sheet[] {
  const out: Sheet[] = [];
  let run: MapRegion[] = [];
  const flush = (): void => {
    if (run.length === 0) return;
    const low = run[0]!;
    out.push({ bottom: low.chapter.place === 'garden' ? low.gate.y : low.bottom, top: run[run.length - 1]!.top + 24 });
    run = [];
  };
  for (const r of layout.regions) {
    if (painted(r)) run.push(r);
    else flush();
  }
  flush();
  return out;
}

const plans = new WeakMap<MapLayout, Plan>();

function planOf(layout: MapLayout): Plan {
  const hit = plans.get(layout);
  if (hit) return hit;
  const geo = geoOf(layout);
  const regions = layout.regions;
  const gardens = regions.filter((r) => r.chapter.place === 'garden').map((r) => gardenPlan(geo, r));
  const ponds = regions.filter((r) => r.chapter.place === 'pond').map((r) => pondPlan(geo, r));
  const bands = regions.flatMap((r) => {
    const make = BANDS[r.chapter.place];
    return make ? [make(geo, r)] : [];
  });
  const drafts = regions.filter((r) => !painted(r)).flatMap((r) => draftPlan(geo, r));
  const bridges = ponds.flatMap((p) => p.bridges);
  const onBridge = (i: number): boolean => bridges.some(([a, b]) => i >= a - 3 && i <= b + 3);
  const sheets = sheetsOf(layout);
  // The paved path, over each lawn: from above the garden wall (or the sheet's foot) to below its ragged top.
  // Where a band lays its own floor (the glasshouse's tiled aisle), the paving stops short and starts again beyond.
  const unpaved = bands.flatMap((b) => b.unpaved.map(([lo, hi]) => [geo.index(hi), geo.index(lo)] as const));
  const path = sheets.flatMap((s, k) => pieces(geo.index(s.bottom - 24), geo.index(s.top + 40), unpaved).flatMap(([a, b], j) => pathSlabs(geo, a, b, 5100 + k * 16 + j, onBridge)));
  const plan: Plan = { geo, stretches: stretchesOf(geo, sheets), sheets, gardens, ponds, bands, drafts, path, bridges };
  plans.set(layout, plan);
  return plan;
}

/** Index range a..b with the `holes` cut out of it. */
function pieces(a: number, b: number, holes: readonly (readonly [number, number])[]): [number, number][] {
  let out: [number, number][] = [[a, b]];
  for (const [h0, h1] of holes) {
    out = out.flatMap(([p, q]): [number, number][] => {
      if (h1 <= p || h0 >= q) return [[p, q]];
      return [...(h0 > p ? [[p, h0] as [number, number]] : []), ...(h1 < q ? [[h1, q] as [number, number]] : [])];
    });
  }
  return out.filter(([p, q]) => q - p > 6);
}

/** Nodes whose pockets a chunk may touch, with room for a whole pen run of the groove beyond the span. */
const near = (span: Span, nodes: readonly MapNode[]): MapNode[] => nodes.filter((n) => touches(span, n.y, 420));

/**
 * Paints world rows y0..y0+h across the map's full width. The caller has
 * already scaled the context to its resolution and translated it by
 * (0, -y0), so one unit is one world px.
 */
export function paintMapChunk(ctx: CanvasRenderingContext2D, layout: MapLayout, y0: number, h: number): void {
  const span: Span = { y0, y1: y0 + h };
  const plan = planOf(layout);
  const { geo } = plan;
  const nodes = near(span, layout.nodes);
  const isPainted = (n: MapNode): boolean => painted(layout.regions[n.region]!);
  paintPaper(ctx, span);
  paintEnds(ctx, layout, span);
  // Ground: lawns, terraces, beds, water.
  for (const s of plan.sheets) paintLawn(ctx, span, s.top, s.bottom);
  for (const g of plan.gardens) {
    const terrace = g.terrace.filter((s) => slabTouches(span, s));
    terrace.forEach((s) => paintSlab(makeDraw(ctx, s.seed, 0, 0), s));
    jointMoss(ctx, terrace, span);
    paintBeds(ctx, g.beds, span, 7300);
  }
  const bands = plan.bands.filter((b) => b.region.top - 300 < span.y1 && b.region.bottom + 300 > span.y0);
  for (const b of bands) b.ground(ctx, span);
  const wet = (x: number, y: number): boolean => plan.ponds.some((p) => p.inWater(x, y));
  const beds = plan.gardens.flatMap((g) => g.beds);
  const bare = (x: number, y: number): boolean => bands.some((b) => y > b.region.top - 60 && y < b.region.bottom + 60 && b.bare(x, y));
  for (const s of plan.sheets) lawnMarks(ctx, geo, span, s.top, s.bottom - 20, (x, y) => wet(x, y) || inBed(beds, x, y, 6) || bare(x, y));
  for (const p of plan.ponds) {
    paintWater(ctx, geo, p, span);
    drawFeatures(ctx, span, p.water);
    paintShores(ctx, p, span);
  }
  for (const g of plan.gardens) drawFeatures(ctx, span, g.under);
  for (const b of bands) b.floor(ctx, span);
  for (const b of bands) drawFeatures(ctx, span, b.under);
  // The path, the pockets' beds and the bridges, then the groove over them.
  const path = plan.path.filter((s) => slabTouches(span, s));
  path.forEach((s) => paintSlab(makeDraw(ctx, s.seed, 0, 0), s));
  jointMoss(ctx, path, span);
  for (const n of nodes) if (isPainted(n)) pocketBed(makeDraw(ctx, seedOf(5200, n.index), 0, 0), geo, n);
  plan.bridges.forEach((b, k) => {
    if (touches(span, (geo.pts[b[0]]!.y + geo.pts[b[1]]!.y) / 2, 120)) paintBridge(makeDraw(ctx, seedOf(5300, k), 0, 0), geo, b);
  });
  const wood = (i: number): boolean => plan.bridges.some(([a, b]) => i >= a && i <= b);
  for (const s of plan.stretches) if (!s.painted) pencilGroove(ctx, geo, span, Math.max(0, s.i0 - OVERLAP), Math.min(geo.pts.length - 1, s.i1 + OVERLAP), nodes);
  for (const s of plan.stretches) if (s.painted) paintedGroove(ctx, geo, span, s.i0, s.i1, wood, nodes);
  for (const n of nodes) {
    if (isPainted(n)) pocketDimple(makeDraw(ctx, seedOf(5400, n.index), 0, 0), geo, n);
    else pencilPocket(ctx, n, seedOf(5500, n.index));
  }
  // What stands up from the ground: reeds, trees, gates and name boards; then the pencil drafts.
  for (const p of plan.ponds) drawFeatures(ctx, span, p.banks);
  for (const g of plan.gardens) drawFeatures(ctx, span, g.over);
  for (const b of bands) drawFeatures(ctx, span, b.over);
  for (const r of layout.regions) paintGate(ctx, r, span);
  drawFeatures(ctx, span, plan.drafts);
}

/** The region's gate across the groove and its name board. */
function paintGate(ctx: CanvasRenderingContext2D, r: MapRegion, span: Span): void {
  if (!touches(span, r.gate.y, 150) && !touches(span, r.sign.y, 80)) return;
  const d = makeDraw(ctx, seedOf(6000, r.index, 1), 0, 0);
  const board = makeDraw(ctx, seedOf(6000, r.index, 2), 0, 0);
  if (r.chapter.place === 'garden') gardenWall(d, r.gate);
  else if (r.chapter.place === 'pond') roseArch(d, r.gate);
  else if (r.chapter.place === 'greenhouse') greenhouseDoor(d, r.gate);
  else if (r.chapter.place === 'orchard') hedgeGate(d, r.gate);
  else if (r.chapter.place === 'rockery') stoneGap(d, r.gate);
  else if (r.chapter.place === 'allotment') palingGate(d, r.gate);
  else if (r.chapter.place === 'meadow') stileFence(d, r.gate);
  else if (r.chapter.place === 'barn') farmGate(d, r.gate);
  else if (r.chapter.place === 'ruins') ruinedArch(d, r.gate);
  else if (r.chapter.place === 'night') ironGate(d, r.gate);
  else pencilGate(d, r.gate);
  if (painted(r)) signBoard(board, r.sign);
  else pencilSign(board, r.sign);
}
