import type { MapLayout, MapRegion } from '../../scenes/map/layout';
import { MAP } from '../../scenes/map/layout';
import { bezier, cub, type Draw, makeDraw, pt } from '../kit';
import type { Pt } from '../pen';
import { INK, PAPER_FILL } from '../palette';
import { createRng } from '../../logic/rng';
import { type Island, LANDMARKS } from './landmarks';

/**
 * The level map as a hand-inked chart: sea washes with wave marks and
 * shoreline ripples, each island's scrub and sand in its own colours with
 * its landmarks, sea routes dashed between islands and a compass rose.
 * Drawn a chunk at a time; every island is drawn from its own seed, so a
 * chunk seam never shows.
 */
const PENCIL = '#8a8578';
/** How far beyond an island its drawings may reach, for deciding which chunks it touches. */
const REACH = 260;

const scrubAt = (layout: MapLayout, x: number): number => layout.coastAt(x) - MAP.sandBand + 10 * Math.sin(x / 37) + 6 * Math.sin(x / 13);

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The sea, coloured by the nearest island, greyed for unbuilt ones. */
function sea(ctx: CanvasRenderingContext2D, layout: MapLayout, x0: number, w: number): void {
  // Opaque paper under the washes, so neighbouring chunks can overlap without a seam.
  ctx.fillStyle = '#f5f0e1';
  ctx.fillRect(x0, 0, w, layout.height);
  const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
  for (let k = 0; k <= 16; k++) {
    const x = x0 + (w * k) / 16;
    const r = nearest(layout, x);
    const [cr, cg, cb] = hexToRgb(r.beach.biome.sea);
    g.addColorStop(k / 16, `rgba(${cr},${cg},${cb},${r.beach.built ? 0.42 : 0.16})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(x0, 0, w, layout.height);
  const deep = ctx.createLinearGradient(0, MAP.coastY, 0, layout.height);
  deep.addColorStop(0, 'rgba(30,60,110,0)');
  deep.addColorStop(1, 'rgba(30,60,110,0.12)');
  ctx.fillStyle = deep;
  ctx.fillRect(x0, MAP.coastY, w, layout.height - MAP.coastY);
}

function nearest(layout: MapLayout, x: number): MapRegion {
  let best = layout.regions[0]!;
  let d = Infinity;
  for (const r of layout.regions) {
    const dist = x < r.x0 ? r.x0 - x : x > r.x1 ? x - r.x1 : 0;
    if (dist < d) {
      d = dist;
      best = r;
    }
  }
  return best;
}

/** Wave marks scattered over open water. */
function waves(d: Draw, layout: MapLayout, x0: number, w: number): void {
  for (let i = 0; i < w / 6; i++) {
    const x = x0 + d.pen.rng() * w;
    const y = 16 + d.pen.rng() * (layout.height - 32);
    if (y > layout.topAt(x) - 14 && y < layout.coastAt(x) + 24) continue;
    const s = 4 + d.pen.rng() * 4;
    d.pen.hair(bezier(pt(x, y), pt(x + s, y - 2.5), pt(x + s * 2, y), 4), 0.7, d.ink, 0.35);
  }
}

/** Ripple lines following the shore out into the water, fading. */
function shoreRipples(d: Draw, layout: MapLayout, x0: number, w: number): void {
  for (const [off, a] of [[9, 0.5], [20, 0.35], [34, 0.2]] as const) {
    for (const side of [1, -1] as const) {
      let run: Pt[] = [];
      const flush = (): void => {
        if (run.length > 2) d.pen.hair(run, 0.7, d.ink, a);
        run = [];
      };
      for (let x = x0 - 4; x <= x0 + w + 4; x += 6) {
        if (layout.coastAt(x) - layout.topAt(x) < 6) {
          flush();
          continue;
        }
        const y = side > 0 ? layout.coastAt(x) + off : layout.topAt(x) - off * 0.7;
        run.push(pt(x, y + Math.sin(x / 19 + off) * 1.5));
      }
      flush();
    }
  }
}

/** One island: scrub, sand, coastline and landmarks, faded to a pencil draft if it isn't built yet. */
function island(ctx: CanvasRenderingContext2D, layout: MapLayout, r: MapRegion, index: number): void {
  const draft = !r.beach.built;
  const d = makeDraw(ctx, 4000 + index * 97, 0, 0, draft ? PENCIL : INK);
  const { biome } = r.beach;
  const xs: number[] = [];
  for (let x = r.x0 - MAP.shoal; x <= r.x1 + MAP.shoal; x += 6) if (layout.coastAt(x) - layout.topAt(x) > 1) xs.push(x);
  if (xs.length < 2) return;
  const coast = xs.map((x) => pt(x, layout.coastAt(x)));
  // The far shore gets a narrow beach of its own before the scrub.
  const far = xs.map((x) => pt(x, layout.topAt(x)));
  const farSand = xs.map((x) => pt(x, Math.min(layout.topAt(x) + 14, (layout.topAt(x) + layout.coastAt(x)) / 2)));
  const scrub = xs.map((x, i) => pt(x, Math.max(farSand[i]!.y, Math.min(layout.coastAt(x) - 8, scrubAt(layout, x)))));
  const land = [...far, ...[...coast].reverse()];
  d.pen.fill(land, PAPER_FILL, 1);
  d.pen.fill(land, biome.sand, draft ? 0.4 : 0.85);
  d.pen.stipple(land, xs.length * 14, () => 0.5, 0.6, '#9c8a62');
  const green = [...farSand, ...[...scrub].reverse()];
  d.pen.fill(green, biome.land, draft ? 0.3 : 0.75);
  d.pen.stipple(green, xs.length * 10, () => 0.6, 0.7, d.ink);
  // The scrub's edge as a run of little bush scallops.
  const edge: Pt[] = [];
  for (let i = 0; i < scrub.length - 1; i++) edge.push(scrub[i]!, pt((scrub[i]!.x + scrub[i + 1]!.x) / 2, Math.min(scrub[i]!.y, scrub[i + 1]!.y) - 4));
  d.pen.stroke(edge, 0.9, d.ink, 0.6, false);
  d.pen.stroke(coast, 1.6, d.ink, 0.95, false);
  d.pen.stroke(far, 1.3, d.ink, 0.85, false);
  const is: Island = { x0: r.x0, x1: r.x1, coast: layout.coastAt, scrub: (x) => scrubAt(layout, x) };
  LANDMARKS[biome.id](d, is);
}

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
function draftWash(ctx: CanvasRenderingContext2D, layout: MapLayout, x0: number, w: number): void {
  const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
  for (let k = 0; k <= 32; k++) g.addColorStop(k / 32, `rgba(255,250,240,${(0.38 * draftAt(layout, x0 + (w * k) / 32)).toFixed(3)})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(x0, 0, w, layout.height);
  ctx.restore();
}

/** The dashed sea route from one island's last level to the next island's first, swinging out to sea. */
function seaRoute(d: Draw, layout: MapLayout, i: number): void {
  const a = layout.nodes.filter((n) => n.region === i).at(-1);
  const b = layout.nodes.find((n) => n.region === i + 1);
  if (!a || !b) return;
  const sea = layout.height - 70;
  const route = cub(pt(a.x + MAP.nodeRadius, a.y + 10), pt(a.x + 260, sea), pt(b.x - 260, sea), pt(b.x - MAP.nodeRadius, b.y + 10), 60);
  for (let k = 0; k < route.length - 2; k += 3) d.pen.stroke([route[k]!, route[k + 1]!, route[k + 2]!], 1.8, d.ink, 0.75, false);
  // A little sailboat halfway across.
  const m = route[30]!;
  const hull = [pt(m.x - 9, m.y - 3), pt(m.x + 9, m.y - 3), pt(m.x + 6, m.y + 1), pt(m.x - 6, m.y + 1)];
  const sail = [pt(m.x - 1, m.y - 4), pt(m.x - 1, m.y - 20), pt(m.x + 8, m.y - 5)];
  d.pen.fill(sail, PAPER_FILL, 1);
  d.pen.fill(hull, PAPER_FILL, 1);
  d.pen.stroke([...sail, sail[0]!], 0.9, d.ink, 0.9, false);
  d.pen.stroke([...hull, hull[0]!], 0.9, d.ink, 0.9, false);
}

/** A compass rose in the open water before the first island. */
function compass(d: Draw, x: number, y: number, r: number): void {
  const { pen } = d;
  pen.circle(x, y, r, 1, d.ink);
  pen.circle(x, y, r * 0.82, 0.6, d.ink);
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    pen.hair([pt(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82), pt(x + Math.cos(a) * r * (k % 4 ? 0.9 : 1), y + Math.sin(a) * r * (k % 4 ? 0.9 : 1))], 0.5, d.ink, 0.7);
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
    const len = k % 2 ? r * 0.5 : r * 0.95;
    const side = a + Math.PI / 2;
    const tip = pt(x + Math.cos(a) * len, y + Math.sin(a) * len);
    const l = pt(x + Math.cos(side) * r * 0.12, y + Math.sin(side) * r * 0.12);
    const rr = pt(x - Math.cos(side) * r * 0.12, y - Math.sin(side) * r * 0.12);
    pen.fill([l, tip, pt(x, y)], k === 0 ? '#b3322b' : PAPER_FILL, 0.95);
    pen.fill([rr, tip, pt(x, y)], d.ink, k === 0 ? 0.3 : 0.75);
    pen.stroke([l, tip, rr], 0.7, d.ink, 0.9, false);
  }
}

/** Paints the chart between x0 and x0 + w (world px) into a context already scaled and translated for that span. */
export function drawChartChunk(ctx: CanvasRenderingContext2D, layout: MapLayout, x0: number, w: number, chunk: number): void {
  sea(ctx, layout, x0, w);
  const d = makeDraw(ctx, 9000 + chunk, 0, 0, INK);
  waves(d, layout, x0, w);
  shoreRipples(d, layout, x0, w);
  layout.regions.forEach((r, i) => {
    if (r.x1 + MAP.shoal + REACH < x0 || r.x0 - MAP.shoal - REACH > x0 + w) return;
    island(ctx, layout, r, i);
  });
  draftWash(ctx, layout, x0, w);
  for (let i = 0; i < layout.regions.length - 1; i++) {
    const a = layout.regions[i]!;
    const b = layout.regions[i + 1]!;
    if (a.x1 > x0 + w + REACH || b.x0 < x0 - REACH) continue;
    seaRoute(makeDraw(ctx, 5000 + i, 0, 0, b.beach.built ? INK : PENCIL), layout, i);
  }
  if (x0 < MAP.start) compass(makeDraw(ctx, 77, 0, 0, INK), MAP.start * 0.45, layout.height - 170, 70);
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
