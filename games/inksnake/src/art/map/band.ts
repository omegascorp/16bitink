import { createRng, type Rng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { pt } from '../kit';
import type { Pt } from '../pen';
import { Brush } from './brush';
import { type Feature, type Geo, NEST_R, seedOf, type Span, TRAIL_HALF } from './common';

/**
 * What a chapter's band hands the map painter: its ground (washes and small
 * marks, painted before the trail), its drawings (`under` lie flat and go
 * before the trail, `over` stand up and go after it), and how its stretch
 * of the trail and its nests look. Every band paints in colour or, while
 * its chapter isn't built, as a pencil draft.
 */
export interface Band {
  readonly region: MapRegion;
  readonly draft: boolean;
  readonly trail: TrailLook;
  ground(ctx: CanvasRenderingContext2D, span: Span): void;
  readonly under: readonly Feature[];
  readonly over: readonly Feature[];
}

/** The trail's worn bed in a place, and the nest material at its levels. */
export interface TrailLook {
  /** The worn earth or sand of the track. */
  readonly bed: string;
  /** The S-shaped trace the snake's belly leaves, and the ridges it pushes up. */
  readonly mark: string;
  /** What grows over its edges (null: bare ground either side). */
  readonly fringe: string | null;
  /** The nest's material: mid, deep and lit. */
  readonly nest: readonly [string, string, string];
}

/** Makes a band for a region: its painter's plan, placed once per layout. */
export type BandMaker = (geo: Geo, region: MapRegion, draft: boolean) => Band;

/** A list of drawings seeded from (salt, kind, index), each drawn with a fresh seeded rng and a Brush in the band's hand. */
export class FeatureList {
  readonly list: Feature[] = [];

  constructor(private readonly salt: number, private readonly draft: boolean) {}

  add(y: number, r: number, draw: (b: Brush, rng: Rng) => void): void {
    const seed = seedOf(this.salt, 77, this.list.length);
    const draft = this.draft;
    this.list.push({
      y,
      r,
      seed,
      draw: (d) => {
        const rng = createRng(seed);
        const b = new Brush(d, draft);
        if (draft) b.done = rng() < 0.45 ? 1 : 0.55 + rng() * 0.45;
        draw(b, rng);
      },
    });
  }
}

interface Spot {
  readonly c: Pt;
  readonly r: number;
}

export interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

/**
 * Places round things so that they keep clear of each other, of the trail
 * (and the calm round it), of the levels' nests and labels, of the gate and
 * name board, and of whatever `blocked` rejects.
 */
export class Placer {
  private readonly spots: Spot[] = [];

  constructor(private readonly geo: Geo, region: MapRegion, private readonly blocked: (x: number, y: number, r: number) => boolean = () => false) {
    this.spots.push({ c: region.sign, r: 175 }, { c: pt(region.sign.x - 80, region.sign.y), r: 130 }, { c: region.gate, r: 90 });
    for (const n of geo.layout.nodes) if (n.region === region.index) this.spots.push({ c: pt(n.x, n.y), r: NEST_R + 10 });
  }

  /** Marks a spot as taken without placing anything. */
  reserve(c: Pt, r: number): void {
    this.spots.push({ c, r });
  }

  /** True if a thing of radius r at c keeps `clear` px beyond the trail's edge, off the labels, and overlaps nothing. */
  fits(c: Pt, r: number, clear: number, gap = 1): boolean {
    if (this.geo.dist(c.x, c.y, r + TRAIL_HALF + clear + 20) < r + TRAIL_HALF + clear) return false;
    if (this.labelHit(c, r * 0.8)) return false;
    if (this.blocked(c.x, c.y, r)) return false;
    return !this.spots.some((s) => Math.hypot(s.c.x - c.x, s.c.y - c.y) < (s.r + r) * gap);
  }

  /** Whether a circle reaches into any level's label. */
  labelHit(c: Pt, r: number): boolean {
    return this.geo.onLabel(c.x, c.y, r);
  }

  /** Tries up to `tries` random spots in the box, taking the first that fits. */
  take(rng: Rng, box: Box, r: number, clear: number, tries = 30, gap = 1): Pt | null {
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

/** The band's rows, inset: where its things may stand. */
export const bandBox = (region: MapRegion, inset = 30): Box => ({ x0: -40, x1: MAP.width + 40, y0: region.top + inset, y1: region.bottom - inset });

/** The left and right sides of the map in a band's rows (away from the middle the trail swings through). */
export const sideBoxes = (region: MapRegion, inset = 30): readonly [Box, Box] => [
  { x0: -40, x1: MAP.mid - 260, y0: region.top + inset, y1: region.bottom - inset },
  { x0: MAP.mid + 260, x1: MAP.width + 40, y0: region.top + inset, y1: region.bottom - inset },
];

/** How far right things on the left of the trail may reach over rows y0..y1: clear of the trail by `pad` and of the labels. */
export function leftLimit(geo: Geo, y0: number, y1: number, pad = 120): number {
  let lim = Infinity;
  for (let y = y0; y <= y1; y += 8) lim = Math.min(lim, geo.trailX(y) - pad);
  for (const n of geo.layout.nodes) {
    if (n.y + 34 < y0 || n.y - 34 > y1) continue;
    const lx = n.x >= MAP.mid ? n.x - MAP.nodeRadius - 250 : n.x - NEST_R - 40;
    lim = Math.min(lim, lx);
  }
  return lim;
}

/** How far left things on the right of the trail may reach over rows y0..y1. */
export function rightLimit(geo: Geo, y0: number, y1: number, pad = 120): number {
  let lim = -Infinity;
  for (let y = y0; y <= y1; y += 8) lim = Math.max(lim, geo.trailX(y) + pad);
  for (const n of geo.layout.nodes) {
    if (n.y + 34 < y0 || n.y - 34 > y1) continue;
    const rx = n.x < MAP.mid ? n.x + MAP.nodeRadius + 250 : n.x + NEST_R + 40;
    lim = Math.max(lim, rx);
  }
  return lim;
}
