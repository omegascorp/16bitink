import { PLACES, type Place } from '../../level/types';
import type { MapLayout, MapNode, MapRegion } from '../../scenes/map/layout';
import { makeDraw } from '../kit';
import type { Band, BandMaker } from './band';
import { nameBoard } from './boards';
import { Brush } from './brush';
import { drawFeatures, type Geo, geoOf, seedOf, type Span, touches } from './common';
import { paintEnds } from './ends';
import { farmPlan } from './farmBand';
import { thresholdFor } from './gates';
import { paintPaper } from './paper';
import { PLACE_BANDS } from './places';
import { paintedNest, paintedTrail, pencilNest, pencilTrail } from './trail';

export { SIGN_BOARD } from './boards';

/**
 * The level map's backdrop: a naturalist's route map of the snake's
 * journey, one long scroll from the farm (chapter 1, at the bottom) to the
 * flooded forest (chapter 10, at the top). Each chapter's band is painted
 * in pen and wash where it is built and pencilled where it is not, by its
 * place's own band painter; the worn snake trail climbs through them all,
 * a nest on it for every level, a threshold and a name board at each
 * chapter's foot. Painted a chunk of world rows at a time; everything is
 * placed once per layout from world-fixed seeds, so chunk seams never show.
 */

const MAKERS: Readonly<Record<Place, BandMaker>> = { ...PLACE_BANDS, farm: farmPlan };

/** Where the pencil runs on under the paint as the trail passes between a draft and a painted chapter, path samples. */
const OVERLAP = 12;

interface Stretch {
  readonly i0: number;
  readonly i1: number;
  readonly band: Band;
}

interface Plan {
  readonly geo: Geo;
  readonly bands: readonly Band[];
  readonly stretches: readonly Stretch[];
}

/** The place a region's band shows: its own, or (for a draft) the one planned for its chapter. */
const placeOf = (r: MapRegion): Place => (r.chapter.place === 'draft' ? PLACES[r.index] ?? 'farm' : r.chapter.place);

const plans = new WeakMap<MapLayout, Plan>();

function planOf(layout: MapLayout): Plan {
  const hit = plans.get(layout);
  if (hit) return hit;
  const geo = geoOf(layout);
  const bands = layout.regions.map((r) => MAKERS[placeOf(r)](geo, r, r.chapter.place === 'draft'));
  const last = geo.pts.length - 1;
  const stretches = layout.regions.map((r, k): Stretch => ({
    i0: k === 0 ? 0 : geo.index(r.bottom),
    i1: k === layout.regions.length - 1 ? last : geo.index(r.top),
    band: bands[k]!,
  }));
  const plan = { geo, bands, stretches };
  plans.set(layout, plan);
  return plan;
}

/** Nodes whose nests a chunk may touch, with room for a whole pen run of the trail beyond the span. */
const near = (span: Span, nodes: readonly MapNode[]): MapNode[] => nodes.filter((n) => touches(span, n.y, 260));

/**
 * Paints world rows y0..y0+h across the map's full width. The caller has
 * already scaled the context to its resolution and translated it by
 * (0, -y0), so one unit is one world px.
 */
export function paintMapChunk(ctx: CanvasRenderingContext2D, layout: MapLayout, y0: number, h: number): void {
  const span: Span = { y0, y1: y0 + h };
  const { geo, bands, stretches } = planOf(layout);
  const nodes = near(span, layout.nodes);
  const pts = nodes.map((n) => ({ x: n.x, y: n.y }));
  const here = bands.filter((b) => b.region.top - 320 < span.y1 && b.region.bottom + 320 > span.y0);
  paintPaper(ctx, span);
  paintEnds(ctx, layout, span);
  for (const b of here) b.ground(ctx, span);
  for (const b of here) drawFeatures(ctx, span, b.under);
  for (const b of here) gate(ctx, b, span, 'under');
  // The trail: pencil under, then paint over it, each chapter's stretch in its own look.
  for (const s of stretches) if (s.band.draft) pencilTrail(ctx, geo, span, Math.max(0, s.i0 - OVERLAP), Math.min(geo.pts.length - 1, s.i1 + OVERLAP), pts, seedOf(800, s.band.region.index));
  for (const s of stretches) if (!s.band.draft) paintedTrail(ctx, geo, span, s.i0, s.i1, s.band.trail, pts, seedOf(810, s.band.region.index));
  for (const n of nodes) {
    const band = bands[n.region]!;
    if (band.draft) pencilNest(ctx, n, seedOf(820, n.index));
    else paintedNest(ctx, n, band.trail, seedOf(830, n.index));
  }
  for (const b of here) drawFeatures(ctx, span, b.over);
  for (const b of here) gate(ctx, b, span, 'over');
}

/** A band's threshold across the trail and (over it) its name board. */
function gate(ctx: CanvasRenderingContext2D, band: Band, span: Span, layer: 'under' | 'over'): void {
  const r = band.region;
  if (!touches(span, r.gate.y, 170) && !touches(span, r.sign.y, 90)) return;
  const t = thresholdFor(placeOf(r));
  const b = new Brush(makeDraw(ctx, seedOf(6000, r.index, layer === 'under' ? 1 : 2), 0, 0), band.draft);
  const rng = b.pen.rng;
  if (layer === 'under') {
    t.under?.(b, r.gate, rng);
    return;
  }
  t.over(b, r.gate, rng);
  nameBoard(new Brush(makeDraw(ctx, seedOf(6000, r.index, 3), 0, 0), band.draft), r.sign);
}
