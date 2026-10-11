import type { MapLayout, MapRegion } from '../../scenes/map/layout';
import { MAP } from '../../scenes/map/layout';
import type { Islet, IslandPlan, Water } from '../../scenes/map/plan';
import { createRng } from '../../logic/rng';
import { pt } from '../kit';
import type { Pt } from '../pen';
import { INK, PAPER_FILL } from '../palette';
import { type IslandArt, islandArt, offsetShape, outside, PENCIL, type Span, touches, within } from './context';
import { islandBanner } from './banner';
import { rgba } from './colour';

/**
 * One biome's drawings, at three depths: `sea` under the island (reefs,
 * kelp beds, ice), `land` on it, `over` above everything (boats, fog).
 * `edge` is how the interior meets the sand.
 */
export interface BiomeArt {
  readonly sea?: (a: IslandArt) => void;
  readonly land: (a: IslandArt) => void;
  readonly over?: (a: IslandArt) => void;
  readonly edge?: 'scallop' | 'soft' | 'rock';
  /** Shallow water hugging the shore. */
  readonly shallows?: string;
  /** The island's inner waters (lagoon, creeks), if not its sea colour. */
  readonly inner?: string;
}

const outlines = new WeakMap<MapLayout, Map<MapRegion, { far: Pt[]; near: Pt[]; land: Pt[] }>>();

/** The island's outline from its two shores, west end to east end (computed once per layout, so its offsets are cached too). */
function outline(layout: MapLayout, r: MapRegion): { far: Pt[]; near: Pt[]; land: Pt[] } {
  let byRegion = outlines.get(layout);
  if (!byRegion) {
    byRegion = new Map();
    outlines.set(layout, byRegion);
  }
  const hit = byRegion.get(r);
  if (hit) return hit;
  const far: Pt[] = [];
  const near: Pt[] = [];
  for (let x = r.x0 - MAP.shoal; x <= r.x1 + MAP.shoal; x += 5) {
    if (layout.coastAt(x) - layout.topAt(x) <= 1) continue;
    far.push(pt(x, layout.topAt(x)));
    near.push(pt(x, layout.coastAt(x)));
  }
  const out = { far, near, land: [...far, ...[...near].reverse()] };
  byRegion.set(r, out);
  return out;
}

/** Water lines parallel to a shore, fading out to sea, and a pale band of shallows. */
function waterlines(a: IslandArt, shape: readonly Pt[], shallows: string, scale = 1): void {
  if (!touches(shape, a.span, 80)) return;
  const d = a.pen(900 + shape.length);
  d.pen.fill(offsetShape(shape, 30 * scale), rgba(shallows, 0.18), 1);
  d.pen.fill(offsetShape(shape, 14 * scale), rgba(shallows, 0.22), 1);
  const lines = scale < 1 ? [[5, 0.5], [12, 0.3], [21, 0.16]] : [[6, 0.55], [13, 0.42], [22, 0.3], [34, 0.2], [50, 0.12]];
  for (const [off, alpha] of lines) {
    const line = offsetShape(shape, off! * scale);
    d.pen.hair([...line, line[0]!], 0.6, a.ink, alpha!);
  }
}

/** Shoal dots: stippled sand just off the shore, densest at the waterline. */
function shoalDots(a: IslandArt, shape: readonly Pt[], density: number): void {
  const rng = createRng(shape.length * 13 + a.index);
  const { ctx } = a;
  ctx.save();
  ctx.fillStyle = a.ink;
  for (let i = 0; i < shape.length; i++) {
    const p = shape[i]!;
    const q = shape[(i + 1) % shape.length]!;
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const nx = (q.y - p.y) / len;
    const ny = -(q.x - p.x) / len;
    for (let k = 0; k < density; k++) {
      const t = rng();
      const off = 2 + rng() ** 2 * 20;
      const x = p.x + (q.x - p.x) * t;
      if (x < a.span.x0 - 4 || x > a.span.x1 + 4) continue;
      ctx.globalAlpha = 0.25 + rng() * 0.3;
      ctx.beginPath();
      ctx.arc(x + nx * off * orient(shape), p.y + (q.y - p.y) * t + ny * off * orient(shape), 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

const orientCache = new WeakMap<readonly Pt[], number>();
/** +1 if a shape's (dy, -dx) normals point out of it, else -1. */
function orient(shape: readonly Pt[]): number {
  const hit = orientCache.get(shape);
  if (hit !== undefined) return hit;
  let area = 0;
  for (let i = 0; i < shape.length; i++) {
    const p = shape[i]!;
    const q = shape[(i + 1) % shape.length]!;
    area += p.x * q.y - q.x * p.y;
  }
  const o = area > 0 ? 1 : -1;
  orientCache.set(shape, o);
  return o;
}

/** The land's washes: sand all over, the interior's colour above the sand, wet sand at the shore. */
function washes(a: IslandArt, far: readonly Pt[], near: readonly Pt[], art: BiomeArt): void {
  const { biome } = a.region.beach;
  const d = a.pen(1);
  const fade = a.draft ? 0.45 : 1;
  d.pen.fill(a.land, PAPER_FILL, 1);
  d.pen.fill(a.land, biome.sand, 0.85 * fade);
  within(a.ctx, a.land, () => {
    // Wet sand along the waterline.
    a.ctx.save();
    a.ctx.globalAlpha = 0.18 * fade;
    a.ctx.strokeStyle = '#6b5a3c';
    a.ctx.lineWidth = 10;
    a.ctx.beginPath();
    near.forEach((p, i) => (i === 0 ? a.ctx.moveTo(p.x, p.y + 2) : a.ctx.lineTo(p.x, p.y + 2)));
    a.ctx.stroke();
    a.ctx.restore();
    d.pen.stipple(a.land, near.length * 10, () => 0.5, 0.5, '#9c8a62');
  });
  const farSand = far.map((p, i) => pt(p.x, Math.min(p.y + 12, (p.y + near[i]!.y) / 2)));
  const scrub = far.map((p, i) => pt(p.x, Math.max(farSand[i]!.y, Math.min(near[i]!.y - 8, a.scrub(p.x)))));
  const green = [...farSand, ...[...scrub].reverse()];
  d.pen.fill(green, biome.land, 0.72 * fade);
  // Watercolour pooling darker at the wash's edge, and a few blooms across it.
  a.ctx.save();
  a.ctx.globalAlpha = 0.28 * fade;
  a.ctx.strokeStyle = biome.land;
  a.ctx.lineWidth = 5;
  a.ctx.beginPath();
  green.forEach((p, i) => (i === 0 ? a.ctx.moveTo(p.x, p.y) : a.ctx.lineTo(p.x, p.y)));
  a.ctx.closePath();
  a.ctx.stroke();
  a.ctx.restore();
  const rng = createRng(31 + a.index);
  within(a.ctx, green, () => {
    for (let i = 0; i < 26; i++) {
      const x = a.at(rng() * 1.1 - 0.05);
      const y = a.inland(x) + (rng() - 0.5) * 160;
      const r = 30 + rng() * 70;
      if (x + r < a.span.x0 || x - r > a.span.x1) continue;
      d.pen.fill([...Array(10)].map((_, k) => pt(x + Math.cos(k * 0.63) * r * (0.8 + rng() * 0.4), y + Math.sin(k * 0.63) * r * 0.5)), biome.land, 0.12 * fade);
    }
  });
  if (art.edge !== 'soft') {
    const edge: Pt[] = [];
    for (let i = 0; i < scrub.length - 1; i++) edge.push(scrub[i]!, pt((scrub[i]!.x + scrub[i + 1]!.x) / 2, Math.min(scrub[i]!.y, scrub[i + 1]!.y) - (art.edge === 'rock' ? 2 : 4)));
    d.pen.stroke(edge, 0.8, a.ink, 0.55, false);
  }
}

const WATER: Readonly<Record<Water['kind'], number>> = { lagoon: 0.55, pass: 0.5, creek: 0.55, fjord: 0.6, pool: 0.6, canal: 0.55, lake: 0.55 };

function innerWaters(a: IslandArt, art: BiomeArt): void {
  const { biome } = a.region.beach;
  const shore = offsetShape(a.land, 3);
  for (const [i, w] of a.plan.waters.entries()) {
    if (!touches(w.shape, a.span, 20)) continue;
    const d = a.pen(200 + i);
    const color = w.kind === 'pool' || w.kind === 'lake' ? '#7fb7c9' : w.kind === 'lagoon' || w.kind === 'pass' ? art.inner ?? biome.sea : art.inner ?? biome.sea;
    within(a.ctx, shore, () => {
      d.pen.fill(w.shape, PAPER_FILL, 1);
      d.pen.fill(w.shape, color, WATER[w.kind] * (a.draft ? 0.5 : 1));
      within(a.ctx, w.shape, () => {
        for (const [off, alpha] of [[-4, 0.4], [-9, 0.22]] as const) d.pen.hair([...offsetShape(w.shape, off, 2), offsetShape(w.shape, off, 2)[0]!], 0.5, a.ink, alpha);
      });
    });
    within(a.ctx, a.land, () => d.pen.stroke([...w.shape, w.shape[0]!], 1, a.ink, 0.85, false));
  }
}

const ISLET_WASH: Readonly<Record<Islet['kind'], string>> = {
  cay: '#f1e6c8', rock: '#a29d92', mangrove: '#55804b', cone: '#5e5850', stack: '#6f6a62', spit: '#f0dca8', breakwater: '#a8a49a',
};

function islets(a: IslandArt): void {
  for (const [i, s] of a.plan.islets.entries()) {
    if (!touches(s.shape, a.span, 30)) continue;
    const d = a.pen(300 + i);
    const wash = s.kind === 'spit' ? a.region.beach.biome.sand : ISLET_WASH[s.kind];
    d.pen.fill(s.shape, PAPER_FILL, 1);
    d.pen.fill(s.shape, wash, a.draft ? 0.4 : 0.85);
    if (s.kind === 'rock' || s.kind === 'stack' || s.kind === 'cone') {
      const xs = s.shape.map((p) => p.x);
      const r = (Math.max(...xs) - Math.min(...xs)) / 2;
      d.pen.crescent(s.shape, pt(-r * 0.35, -r * 0.3), () => d.pen.hatch(s.shape, 1.8, 0.9, 0.45, { color: a.ink, alpha: 0.55 }));
    } else if (s.kind === 'mangrove') {
      d.pen.stipple(s.shape, 160, () => 0.7, 0.55, a.ink);
    } else if (s.kind === 'breakwater') {
      for (let k = 2; k < s.spine.length - 1; k += 2) {
        const p = s.spine[k]!;
        const q = s.spine[k + 1]!;
        const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
        d.pen.hair([pt(p.x - ((q.y - p.y) / l) * 6, p.y + ((q.x - p.x) / l) * 6), pt(p.x + ((q.y - p.y) / l) * 6, p.y - ((q.x - p.x) / l) * 6)], 0.5, a.ink, 0.6);
      }
    } else {
      d.pen.stipple(s.shape, 80, () => 0.5, 0.45, '#9c8a62');
    }
    outside(a.ctx, [a.land], () => d.pen.stroke([...s.shape, s.shape[0]!], s.kind === 'stack' ? 0.9 : 1.2, a.ink, 0.9, false));
  }
}

/** Paints one island (its sea, land, waters, islets, landmarks and name cartouche) as far as it reaches into the chunk. */
export function drawIsland(ctx: CanvasRenderingContext2D, layout: MapLayout, r: MapRegion, plan: IslandPlan, index: number, span: Span, art: BiomeArt): void {
  const { far, near, land } = outline(layout, r);
  if (far.length < 2) return;
  const a = islandArt(ctx, layout, r, plan, index, span, r.beach.built ? INK : PENCIL, land);
  const shallows = art.shallows ?? '#d8f1ec';
  waterlines(a, land, shallows);
  for (const s of plan.islets) waterlines(a, s.shape, shallows, s.kind === 'stack' ? 0.4 : 0.6);
  if (touches(land, span)) shoalDots(a, land, 2);
  art.sea?.(a);
  washes(a, far, near, art);
  innerWaters(a, art);
  islets(a);
  art.land(a);
  // The shores, inked last over the washes, broken where a pass or fjord opens to the sea.
  const d = a.pen(2);
  const mouths = plan.waters.filter((w) => w.kind !== 'pool' && w.kind !== 'lake' && w.kind !== 'lagoon').map((w) => w.shape);
  outside(ctx, mouths, () => {
    d.pen.stroke(near, 1.7, a.ink, 0.95, false);
    d.pen.stroke(far, 1.4, a.ink, 0.88, false);
  });
  art.over?.(a);
  islandBanner(a);
}
