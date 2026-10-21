import { createRng, type Rng } from '../../logic/rng';
import type { MapRegion } from '../../scenes/map/layout';
import { type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import { type Feature, type Geo, PATH_HALF, seedOf, type Span } from './common';

/**
 * What a painted chapter's band hands the map painter, beyond the shared
 * lawn and path: its own ground (painted over the lawn), where the lawn's
 * grass marks must stay off, where the paved path gives way to the band's
 * own floor, a floor pass laid just before the path, and its drawings
 * (`under` before the path and groove, `over` after them).
 */
export interface Band {
  readonly region: MapRegion;
  ground(ctx: CanvasRenderingContext2D, span: Span): void;
  /** True where the lawn's grass and daisies don't belong. */
  bare(x: number, y: number): boolean;
  /** World rows [low, high] (high > low in y) where the paved path gives way to the band's own floor. */
  readonly unpaved: readonly (readonly [number, number])[];
  floor(ctx: CanvasRenderingContext2D, span: Span): void;
  readonly under: readonly Feature[];
  readonly over: readonly Feature[];
}

/** A list of features seeded from (salt, kind, index), each drawn with a fresh seeded rng. */
export class FeatureList {
  readonly list: Feature[] = [];

  constructor(private readonly salt: number, private readonly kind: number) {}

  add(y: number, r: number, draw: (d: Draw, rng: Rng) => void): void {
    const seed = seedOf(this.salt, this.kind, this.list.length);
    this.list.push({ y, r, seed, draw: (d) => draw(d, createRng(seed)) });
  }
}

interface Spot {
  readonly c: Pt;
  readonly r: number;
}

/**
 * Places round things so that they keep clear of each other, of the
 * groove's path (and the calm round it) and of whatever `blocked` rejects.
 */
export class Placer {
  private readonly spots: Spot[] = [];

  constructor(private readonly geo: Geo, private readonly blocked: (x: number, y: number, r: number) => boolean = () => false) {}

  /** Marks a spot as taken without placing anything (signs, gates). */
  reserve(c: Pt, r: number): void {
    this.spots.push({ c, r });
  }

  /** True if a thing of radius r at c keeps `clear` px beyond the path's edge and overlaps nothing. */
  fits(c: Pt, r: number, clear: number, gap = 1): boolean {
    if (this.geo.dist(c.x, c.y, r + PATH_HALF + clear + 20) < r + PATH_HALF + clear) return false;
    if (this.blocked(c.x, c.y, r)) return false;
    return !this.spots.some((s) => Math.hypot(s.c.x - c.x, s.c.y - c.y) < (s.r + r) * gap);
  }

  /** Tries up to `tries` random spots in the box, taking the first that fits. */
  take(rng: Rng, box: { x0: number; x1: number; y0: number; y1: number }, r: number, clear: number, tries = 30, gap = 1): Pt | null {
    for (let i = 0; i < tries; i++) {
      const c = pt(box.x0 + rng() * (box.x1 - box.x0), box.y0 + rng() * (box.y1 - box.y0));
      if (!this.fits(c, r, clear, gap)) continue;
      this.spots.push({ c, r });
      return c;
    }
    return null;
  }

  /** Takes a given spot if it fits. */
  claim(c: Pt, r: number, clear: number, gap = 1): boolean {
    if (!this.fits(c, r, clear, gap)) return false;
    this.spots.push({ c, r });
    return true;
  }
}

/** Corners of an axis-aligned box as points every `step` px (so the pen keeps its corners). */
export function boxPts(x0: number, y0: number, x1: number, y1: number, step = 10): Pt[] {
  const out: Pt[] = [];
  const edge = (a: Pt, b: Pt): void => {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 0; k < n; k++) out.push(pt(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n));
  };
  edge(pt(x0, y0), pt(x1, y0));
  edge(pt(x1, y0), pt(x1, y1));
  edge(pt(x1, y1), pt(x0, y1));
  edge(pt(x0, y1), pt(x0, y0));
  return out;
}

/** A box w × h centred on c and turned by `rot`, as points every `step` px. */
export function turnedBox(c: Pt, w: number, h: number, rot: number, step = 10): Pt[] {
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  return boxPts(-w / 2, -h / 2, w / 2, h / 2, step).map((p) => pt(c.x + p.x * cs - p.y * sn, c.y + p.x * sn + p.y * cs));
}
