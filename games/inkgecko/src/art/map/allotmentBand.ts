import { createRng, type Rng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { type Band, FeatureList, Placer } from './band';
import { type Bed, type Crop, plantBed } from './allotmentCrops';
import { compostBays, deckchairs, polytunnel, scarecrow, SHED_PAINT, shed, sunflower, wheelbarrow } from './allotmentKit';
import { Blobs, type Geo, hash, seedOf, type Span, Ticks } from './common';
import { coldFrame, waterButt, wateringCan } from './greenhouseKit';

/**
 * Chapter 6's band, "The Allotment": strips of plots laid across the
 * band either side of the paved path, grass paths between them. Each
 * plot is dug into beds (some boarded, some plain) between straw paths, a
 * different crop in each: brassicas, roots, onions, potatoes earthed up,
 * squash, sweetcorn, beans up canes and wigwams. Sheds stand at the outer
 * ends of some plots with water butts at their corners; there is a row of
 * compost bays, cold frames, a wheelbarrow of picked vegetables on a grass
 * path, and a scarecrow keeping watch over the cabbages.
 */
const SOIL = '#7b5a40';
const STRAW = '#dcc47e';
/** The first plots' feet, above the gate. */
const FOOT = 74;
/** How far either side of the groove the plots stop. */
const CLEAR = 116;
const STRAW_GAP = 18;
const CROPS: readonly Crop[] = ['cabbage', 'lettuce', 'carrot', 'onion', 'chard', 'potato', 'strawberry', 'pumpkin', 'corn', 'beans', 'wigwams', 'currants', 'rhubarb', 'flowers', 'cabbage', 'beans', 'potato', 'flowers'];

interface Plot {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  /** -1 left of the groove (its outer end at the map's left edge), 1 right. */
  readonly side: 1 | -1;
}

interface Layout {
  readonly plots: readonly Plot[];
  readonly beds: readonly Bed[];
}

export function allotmentPlan(geo: Geo, region: MapRegion): Band {
  const salt = 13000 + region.index * 101;
  const rng = createRng(seedOf(salt, 1));
  const under = new FeatureList(salt, 1);
  const over = new FeatureList(salt, 2);
  const place = new Placer(geo);
  place.reserve(region.sign, 175);
  place.reserve(region.gate, 110);
  const plots: Plot[] = [];
  for (const side of [-1, 1] as const) {
    for (let y1 = region.gate.y - FOOT - rng() * 30; y1 - 190 >= region.top - 50; ) {
      const h = Math.min(y1 - region.top + 50, 196 + rng() * 70);
      const y0 = y1 - h;
      let lo = Infinity;
      let hi = -Infinity;
      for (let y = y0 - 10; y <= y1 + 10; y += 8) {
        lo = Math.min(lo, geo.grooveX(y));
        hi = Math.max(hi, geo.grooveX(y));
      }
      if (side < 0 && lo - CLEAR > 180) plots.push({ x0: -40, x1: lo - CLEAR, y0, y1, side });
      if (side > 0 && MAP.width - hi - CLEAR > 180) plots.push({ x0: hi + CLEAR, x1: MAP.width + 40, y0, y1, side });
      y1 = y0 - 44 - rng() * 26;
    }
  }
  plots.sort((p, q) => q.y1 - p.y1);
  const beds: Bed[] = [];
  const ends = endsOf(plots, rng);
  plots.forEach((p, k) => {
    const end = plotEnd(p, ends[k]!, rng, place, under, over);
    const bx0 = p.side < 0 ? p.x0 + (end ? end + 40 : 40) : p.x0 + 16;
    const bx1 = p.side < 0 ? p.x1 - 16 : p.x1 - (end ? end + 40 : 40);
    beds.push(...bedsIn(bx0, bx1, p.y0 + 14, p.y1 - 14, rng));
  });
  for (const b of beds) under.add((b.y0 + b.y1) / 2, (b.y1 - b.y0) / 2 + 40, (d, r) => plantBed(d, b, r));
  things(geo, region, plots, beds, place, rng, under, over);
  const shape: Layout = { plots, beds };
  const inPlot = (x: number, y: number): boolean => plots.some((p) => x > p.x0 - 6 && x < p.x1 + 6 && y > p.y0 - 6 && y < p.y1 + 6);
  return {
    region,
    ground: (ctx, span) => paintPlots(ctx, span, shape),
    bare: inPlot,
    unpaved: [],
    floor: () => undefined,
    under: under.list,
    over: over.list,
  };
}

type End = 'shed' | 'compost' | 'frames' | 'tunnel' | 'none';

/** What stands at each plot's outer end: three sheds, one row of compost bays, a polytunnel, a few cold frames, the rest more beds. */
function endsOf(plots: readonly Plot[], rng: Rng): End[] {
  const out: End[] = plots.map(() => 'none');
  const deal = (side: 1 | -1, deck: readonly End[]): void => {
    const free = plots.flatMap((p, i) => (p.side === side && i > 0 ? [i] : []));
    for (const e of deck) {
      if (free.length === 0) break;
      out[free.splice(Math.floor(rng() * free.length), 1)[0]!] = e;
    }
  };
  const left = rng() < 0.5;
  deal(left ? -1 : 1, ['shed', 'shed', 'compost', 'frames']);
  deal(left ? 1 : -1, ['shed', 'tunnel', 'frames']);
  return out;
}

/** Lays out a plot's outer end; returns how much of the plot's length it takes. */
function plotEnd(p: Plot, end: End, rng: Rng, place: Placer, under: FeatureList, over: FeatureList): number {
  const outer = p.side < 0 ? 26 : MAP.width - 26;
  const inward = -p.side;
  const h = p.y1 - p.y0;
  if (end === 'shed') {
    const c = pt(outer + inward * 84, p.y0 + 70);
    const paint = SHED_PAINT[Math.floor(rng() * SHED_PAINT.length)]!;
    over.add(c.y, 140, (d, r) => shed(d, c, 132, 112, paint, r));
    const butt = pt(outer + inward * (p.side < 0 ? 160 : 6), p.y0 + 104);
    under.add(butt.y, 50, (d) => waterButt(d, butt, 18));
    if (h > 220 && rng() < 0.6) {
      const dc = pt(outer + inward * 80, p.y0 + 172);
      under.add(dc.y, 50, (d, r) => deckchairs(d, dc, r));
    } else {
      for (let i = 0; i < 3; i++) {
        const f = pt(outer + inward * (30 + i * 36), p.y0 + 156 + (i % 2) * 8);
        over.add(f.y, 50, (d, r) => sunflower(d, f, 11 + r() * 3, r));
      }
    }
    place.reserve(c, 110);
    return 172;
  }
  if (end === 'compost') {
    const x0 = p.side < 0 ? outer : outer - 150;
    under.add(p.y0 + 40, 80, (d, r) => compostBays(d, x0, p.y0 + 16, 50, r));
    const can = pt(outer + inward * 70, p.y0 + Math.min(150, h - 30));
    under.add(can.y, 40, (d) => wateringCan(d, can, p.side < 0 ? 0.4 : 2.7));
    place.reserve(pt(outer + inward * 80, p.y0 + 60), 90);
    return 172;
  }
  if (end === 'tunnel') {
    const w = 250;
    const c = pt(outer + inward * (w / 2 + 4), (p.y0 + p.y1) / 2);
    over.add(c.y, 110, (d, r) => polytunnel(d, c, w, Math.min(130, h - 50), r));
    place.reserve(c, 130);
    return w + 30;
  }
  if (end === 'frames') {
    const n = h > 220 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const c = pt(outer + inward * 62, p.y0 + h / (n + 1) * (i + 1));
      under.add(c.y, 70, (d, r) => coldFrame(d, c, 104, 64, r));
    }
    return 130;
  }
  return 0;
}

/** Rows of beds across x0..x1 × y0..y1, straw paths between them. */
function bedsIn(x0: number, x1: number, y0: number, y1: number, rng: Rng): Bed[] {
  const out: Bed[] = [];
  const rows = y1 - y0 > 200 ? 3 : y1 - y0 < 170 ? 2 : rng() < 0.5 ? 2 : 3;
  const h = (y1 - y0 - STRAW_GAP * (rows - 1)) / rows;
  for (let j = 0; j < rows; j++) {
    const by0 = y0 + j * (h + STRAW_GAP);
    for (let x = x0; x < x1 - 120; ) {
      let w = 150 + rng() * 170;
      if (x1 - (x + w) < 150) w = x1 - x;
      const crop = CROPS[Math.floor(rng() * CROPS.length)]!;
      out.push({ x0: x, y0: by0, x1: x + w, y1: by0 + h, crop, raised: rng() < 0.4, netted: (crop === 'cabbage' || crop === 'strawberry' || crop === 'currants') && rng() < 0.45 });
      x += w + STRAW_GAP + 4;
    }
  }
  return out;
}

/** The scarecrow, a wheelbarrow on a grass path, a spare water butt and a can or two. */
function things(geo: Geo, region: MapRegion, plots: readonly Plot[], beds: readonly Bed[], place: Placer, rng: Rng, under: FeatureList, over: FeatureList): void {
  const open = beds.filter((b) => (b.crop === 'cabbage' || b.crop === 'lettuce' || b.crop === 'potato') && b.x1 - b.x0 > 170 && geo.busy((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2) > 0.8);
  let crows = 0;
  for (const b of open) {
    if (crows >= 2) break;
    const c = pt((b.x0 + b.x1) / 2 + (rng() - 0.5) * 40, (b.y0 + b.y1) / 2);
    if (!place.claim(c, 40, 30, 1.2)) continue;
    over.add(c.y, 110, (d, r) => scarecrow(d, c, r));
    crows++;
  }
  // Grass paths between the plots: a wheelbarrow and the odd butt and can.
  const gaps = plots.map((p) => p.y0 - 28);
  for (let i = 0; i < 4; i++) {
    const y = gaps[(i * 2 + 1) % Math.max(1, gaps.length)];
    if (y === undefined || y < region.top - 20) continue;
    const c = place.take(rng, { x0: 120, x1: MAP.width - 120, y0: y - 6, y1: y + 6 }, 34, 40, 40);
    if (!c) continue;
    if (i === 0) under.add(c.y, 60, (d, r) => wheelbarrow(d, c, Math.PI + (r() - 0.5) * 0.6, r));
    else if (i === 1) under.add(c.y, 40, (d) => waterButt(d, c, 17));
    else under.add(c.y, 40, (d, r) => wateringCan(d, c, r() * 6.28));
  }
}

/** Straw over each plot, then its beds dug: dark tilth in a wash, furrows along it, crumbs. */
function paintPlots(ctx: CanvasRenderingContext2D, span: Span, s: Layout): void {
  const plots = s.plots.filter((p) => p.y1 + 20 > span.y0 && p.y0 - 20 < span.y1);
  if (plots.length === 0) return;
  const beds = s.beds.filter((b) => b.y1 + 20 > span.y0 && b.y0 - 20 < span.y1);
  const straw = new Path2D();
  for (const p of plots) traceRagged(straw, p.x0, p.y0, p.x1, p.y1);
  const soil = new Path2D();
  for (const b of beds) soil.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  ctx.save();
  ctx.fillStyle = rgba(PAPER_FILL, 0.5);
  ctx.fill(straw);
  ctx.fillStyle = rgba(STRAW, 0.4);
  ctx.fill(straw);
  ctx.strokeStyle = rgba(mix(STRAW, '#7a5a2a', 0.5), 0.2);
  ctx.lineWidth = 2;
  ctx.stroke(straw);
  // Straw: short gold and pale strands lying every way, off the beds.
  const gold = new Ticks();
  const pale = new Ticks();
  const y0 = Math.max(span.y0 - 8, Math.min(...plots.map((p) => p.y0)));
  const y1 = Math.min(span.y1 + 8, Math.max(...plots.map((p) => p.y1)));
  for (const p of plots) {
    const inside = beds.filter((b) => b.x0 >= p.x0 - 2 && b.x1 <= p.x1 + 2 && b.y0 >= p.y0 - 2 && b.y1 <= p.y1 + 2);
    for (let cy = Math.floor(Math.max(y0, p.y0) / 9); cy * 9 < Math.min(y1, p.y1); cy++) {
      for (let cx = Math.floor(Math.max(0, p.x0) / 9); cx * 9 < Math.min(MAP.width, p.x1); cx++) {
        const x = (cx + hash(cx, cy, 701)) * 9;
        const y = (cy + hash(cx, cy, 702)) * 9;
        if (x < p.x0 + 3 || x > p.x1 - 3 || y < p.y0 + 3 || y > p.y1 - 3 || inside.some((b) => x > b.x0 - 2 && x < b.x1 + 2 && y > b.y0 - 2 && y < b.y1 + 2)) continue;
        const a = hash(cx, cy, 703) * Math.PI;
        const l = 3 + hash(cx, cy, 704) * 4;
        (hash(cx, cy, 705) < 0.6 ? gold : pale).add(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
    }
  }
  gold.stroke(ctx, '#b08a3e', 0.7, 0.55);
  pale.stroke(ctx, PAPER_FILL, 0.8, 0.6);
  if (beds.length > 0) paintSoil(ctx, span, beds);
  ctx.restore();
}

function paintSoil(ctx: CanvasRenderingContext2D, span: Span, beds: readonly Bed[]): void {
  const soil = new Path2D();
  for (const b of beds) soil.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  ctx.fillStyle = rgba(PAPER_FILL, 0.55);
  ctx.fill(soil);
  ctx.fillStyle = rgba(SOIL, 0.48);
  ctx.fill(soil);
  ctx.save();
  ctx.clip(soil);
  const damp = new Blobs();
  const dry = new Blobs();
  const dark = new Blobs();
  const light = new Blobs();
  const furrows = new Ticks();
  for (const b of beds) {
    if (b.y1 < span.y0 - 10 || b.y0 > span.y1 + 10) continue;
    const k = Math.floor(b.x0 * 7 + b.y0);
    for (let i = 0; i < Math.ceil((b.x1 - b.x0) / 90); i++) {
      const x = b.x0 + (i + hash(k, i, 711)) * 90;
      const y = b.y0 + hash(k, i, 712) * (b.y1 - b.y0);
      (hash(k, i, 713) < 0.5 ? damp : dry).blot(x, y, 40 + hash(k, i, 714) * 40, 16 + hash(k, i, 715) * 14, (hash(k, i, 716) - 0.5) * 0.5, k + i);
    }
    for (let y = b.y0 + 6; y < b.y1 - 3; y += 8) {
      for (let x = b.x0 + 3; x < b.x1 - 6; x += 26) if (hash(Math.floor(x), Math.floor(y), 717) < 0.8) furrows.add(x, y + hash(Math.floor(x), Math.floor(y), 718), x + 18 + hash(Math.floor(x), Math.floor(y), 719) * 8, y);
    }
    for (let cy = Math.floor(Math.max(b.y0, span.y0 - 4) / 8); cy * 8 < Math.min(b.y1, span.y1 + 4); cy++) {
      for (let cx = Math.floor(b.x0 / 8); cx * 8 < b.x1; cx++) {
        const v = hash(cx, cy, 720);
        if (v > 0.6) continue;
        (v < 0.35 ? dark : light).add((cx + hash(cx, cy, 721)) * 8, (cy + hash(cx, cy, 722)) * 8, 0.6 + hash(cx, cy, 723) * 0.9);
      }
    }
  }
  damp.fill(ctx, '#3f2a1c', 0.12);
  dry.fill(ctx, PAPER_FILL, 0.12);
  furrows.stroke(ctx, '#3f2a1c', 0.8, 0.28);
  dark.fill(ctx, '#2f2016', 0.4);
  light.fill(ctx, '#d8c0a0', 0.45);
  ctx.restore();
}

/** A rectangle with softly ragged edges (fixed by world position, so every chunk agrees). */
function traceRagged(p: Path2D, x0: number, y0: number, x1: number, y1: number): void {
  const j = (a: number, b: number): number => (hash(Math.floor(a / 9), Math.floor(b / 9), 731) - 0.5) * 3;
  const pts: Pt[] = [];
  for (let x = x0; x < x1; x += 9) pts.push(pt(x, y0 + j(x, y0)));
  for (let y = y0; y < y1; y += 9) pts.push(pt(x1 + j(x1, y), y));
  for (let x = x1; x > x0; x -= 9) pts.push(pt(x, y1 + j(x, y1)));
  for (let y = y1; y > y0; y -= 9) pts.push(pt(x0 + j(x0, y), y));
  pts.forEach((q, i) => (i === 0 ? p.moveTo(q.x, q.y) : p.lineTo(q.x, q.y)));
  p.closePath();
}
