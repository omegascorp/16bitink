import type { MapLayout, MapRegion } from '../scenes/map/layout';
import { MAP } from '../scenes/map/layout';
import { createRng } from '../logic/rng';
import { blob, wash } from './atlasWash';

/**
 * Where things may go on the Ink Atlas, and the list of everything painted
 * on it. The whole page is planned once per layout: each feature knows its
 * own bounds and seed, so a band of the page paints only what reaches into
 * it, and a feature cut by two bands is painted the same in both.
 */

/** Paint order: ground washes, then water and lava, then ground detail, then standing things (by their foot). */
export const Layer = { Ground: 0, Water: 1, Detail: 2, Standing: 3 } as const;
export type Layer = (typeof Layer)[keyof typeof Layer];

export interface Feature {
  readonly layer: Layer;
  /** Sort key within the layer: the foot of the thing, so nearer (lower) ones overlap. */
  readonly y: number;
  /** World y bounds of everything it paints. */
  readonly top: number;
  readonly bottom: number;
  readonly seed: number;
  readonly paint: (ctx: CanvasRenderingContext2D, seed: number) => void;
}

export type Biome = 'jungle' | 'ash' | 'sand' | 'pencil';

/** How far either side of a boundary between chapters their lands blend. */
export const BLEND = 230;

export function biomeOf(r: MapRegion): Biome {
  if (!r.chapter.built) return 'pencil';
  return (['jungle', 'ash', 'sand'] as const)[r.index] ?? 'pencil';
}

const smooth = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/**
 * Where the land of region i meets the one above it (i + 1): the y the blend
 * centres on and its half-width. A painted land fades out on its own side
 * before a pencil draft starts, so washes never run over the draft.
 */
function seam(layout: MapLayout, lower: MapRegion): { c: number; half: number } {
  const upper = layout.regions[lower.index + 1]!;
  const drafty = biomeOf(lower) === 'pencil' || biomeOf(upper) === 'pencil';
  if (!drafty || (biomeOf(lower) === 'pencil' && biomeOf(upper) === 'pencil')) return { c: lower.top, half: BLEND };
  // Into whichever side is painted.
  return { c: lower.top + (biomeOf(upper) === 'pencil' ? BLEND * 0.8 : -BLEND * 0.8), half: BLEND * 0.8 };
}

/** How much of a region's land is at world y: 1 inside it, fading out across the boundary (none past the page's ends). */
export function regionWeight(layout: MapLayout, r: MapRegion, y: number): number {
  const first = r.index === 0;
  const last = r.index === layout.regions.length - 1;
  let below = 1;
  if (!first) {
    const s = seam(layout, layout.regions[r.index - 1]!);
    below = smooth((s.c + s.half - y) / (s.half * 2));
  }
  let above = 1;
  if (!last) {
    const s = seam(layout, r);
    above = smooth((y - (s.c - s.half)) / (s.half * 2));
  }
  return Math.min(below, above);
}

/** The y range a region's land reaches, blending included. */
export function regionSpan(layout: MapLayout, r: MapRegion): { top: number; bottom: number } {
  const last = r.index === layout.regions.length - 1;
  return { top: last ? 0 : r.top - BLEND * 1.6, bottom: r.index === 0 ? layout.height : r.bottom + BLEND * 1.6 };
}

interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

/** Clear-of-the-trail, the level names and the ruins tests, with the trail bucketed by y for speed. */
export class Clearance {
  private readonly buckets = new Map<number, { x: number; y: number }[]>();
  private readonly labels: Box[] = [];
  private readonly keepOuts: ((x: number, y: number, gap: number) => boolean)[] = [];
  private static readonly B = 100;

  constructor(private readonly layout: MapLayout) {
    const pts = layout.path.pts;
    for (let i = 0; i < pts.length; i += 2) {
      const p = pts[i]!;
      const k = Math.floor(p.y / Clearance.B);
      const list = this.buckets.get(k) ?? [];
      list.push(p);
      this.buckets.set(k, list);
    }
    for (const n of layout.nodes) {
      // The name sits towards the page's middle; blots under it once won.
      const side = n.x >= MAP.mid ? -1 : 1;
      const a = n.x + side * (MAP.nodeRadius + 6);
      const b = n.x + side * (MAP.nodeRadius + 230);
      this.labels.push({ x0: Math.min(a, b), x1: Math.max(a, b), y0: n.y - 30, y1: n.y + 28 });
    }
    for (const r of layout.regions) this.labels.push({ x0: r.ruin.x - 170, x1: r.ruin.x + 170, y0: r.ruin.y + 70, y1: r.ruin.y + 145 });
  }

  /** At least `gap` from the trail. */
  trail(x: number, y: number, gap: number): boolean {
    const B = Clearance.B;
    for (let k = Math.floor((y - gap) / B); k <= Math.floor((y + gap) / B); k++) {
      for (const p of this.buckets.get(k) ?? []) if (Math.hypot(p.x - x, p.y - y) < gap) return false;
    }
    return true;
  }

  /** A box of half-width w and height h standing on (x, y) is clear of the level names and chapter titles. */
  label(x: number, y: number, w: number, h: number): boolean {
    return !this.labels.some((b) => x + w > b.x0 && x - w < b.x1 && y > b.y0 && y - h < b.y1);
  }

  /** A box of half-width w and height h standing on (x, y) keeps clear of every level's stop. */
  stops(x: number, y: number, w: number, h: number): boolean {
    const r = MAP.nodeRadius + 16;
    return this.layout.nodes.every((n) => {
      if (Math.abs(n.y - y) > h + 200) return true;
      const nx = Math.max(x - w, Math.min(n.x, x + w));
      const ny = Math.max(y - h, Math.min(n.y, y));
      return Math.hypot(n.x - nx, n.y - ny) >= r;
    });
  }

  /** At least `gap` from every chapter's ruin. */
  ruin(x: number, y: number, gap: number): boolean {
    return this.layout.regions.every((r) => Math.hypot(x - r.ruin.x, (y - r.ruin.y) * 1.25) >= gap);
  }

  /** Keeps everything off a river or lava course: `clear(x, y, gap)` is true where a thing may stand. */
  avoid(clear: (x: number, y: number, gap: number) => boolean): void {
    this.keepOuts.push(clear);
  }

  /** Clear of rivers and lava by `gap`. */
  dry(x: number, y: number, gap: number): boolean {
    return this.keepOuts.every((f) => f(x, y, gap));
  }

  /** Clear for a standing thing of half-width w and height h: its foot, corners and top all off the trail. */
  ok(x: number, y: number, w: number, h: number, gap = 50): boolean {
    return (
      this.trail(x, y, gap + w * 0.5) && this.trail(x, y - h, gap) && this.trail(x - w, y, gap * 0.7) && this.trail(x + w, y, gap * 0.7) &&
      this.stops(x, y, w, h) && this.label(x, y, w, h) && this.ruin(x, y, 170 + w) && this.dry(x, y, w + 14)
    );
  }
}

/** Collects features while a land is planned. */
export class Plan {
  readonly list: Feature[] = [];
  private next = 1;

  constructor(readonly layout: MapLayout, readonly clear: Clearance) {}

  add(layer: Layer, y: number, top: number, bottom: number, paint: Feature['paint']): void {
    this.list.push({ layer, y, top, bottom, seed: 9000 + this.next++ * 7919, paint });
  }
}

/** The ground of a land: broad overlapping glazes in its colours, thinning out where it blends into the next. */
export function groundWashes(plan: Plan, r: MapRegion, colors: readonly string[], alpha: number, rng: () => number, tide = 0.2): void {
  const { layout } = plan;
  const span = regionSpan(layout, r);
  for (let y = span.top + 40; y < span.bottom; y += 190) {
    for (let x = layout.left - 60; x < layout.left + layout.width + 100; x += 230) {
      const cx = x + (rng() - 0.5) * 140;
      const cy = y + (rng() - 0.5) * 120;
      const rr = 140 + rng() * 130;
      const c = colors[Math.floor(rng() * colors.length)]!;
      const a = alpha * (0.75 + rng() * 0.5);
      if (rng() > regionWeight(layout, r, cy)) continue;
      plan.add(Layer.Ground, cy, cy - rr * 1.2, cy + rr * 1.2, (ctx, seed) => {
        const g = createRng(seed);
        wash(ctx, g, blob(g, cx, cy, rr, rr * 0.72, 9, 0.35), c, a, 2, tide);
      });
    }
  }
}
