import { createRng, type Rng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { pt } from '../kit';
import type { Pt } from '../pen';
import { type Band, FeatureList, Placer, type TrailLook } from './band';
import { type Brush, note } from './brush';
import { type Geo, seedOf, type Span } from './common';
import { groundMarks, type MarkLook, paintWash, pencilGround, type WashLook } from './paper';

/**
 * The common shape of chapters 2–10's bands: the place's ground wash and
 * marks (or a draft's pencil ticks), any big flat structures the place
 * lays across the band (dune ridges, a river, contours, water), then its
 * motifs placed either side of the trail, big landmarks furthest out,
 * clear of the trail, the labels, the gate, the sign and each other.
 */
export type Motif = (b: Brush, c: Pt, s: number, rng: Rng) => void;

export interface Tier {
  readonly motifs: readonly Motif[];
  readonly count: number;
  readonly size: number;
  /** How far from the trail's calm it must be (geo.busy, 0..1). */
  readonly busy: number;
  /** Drawn before the trail (flat things) instead of after. */
  readonly flat?: boolean;
}

export interface PlaceKit {
  readonly salt: number;
  readonly wash: WashLook;
  readonly marks?: MarkLook;
  readonly trail: TrailLook;
  readonly tiers: readonly Tier[];
  /** Big flat structures across the band, before the motifs are placed (they may reserve room on the placer). */
  readonly lay?: (ctx: LayCtx) => void;
  /** Extra ground painting after the wash (a water sheet, a bank along the trail), colour or pencil. */
  readonly ground?: (ctx: CanvasRenderingContext2D, geo: Geo, span: Span, region: MapRegion, draft: boolean) => void;
  /** Pencilled notes a draft letters beside its biggest things (the place's key features). */
  readonly notes?: readonly string[];
  /** Where ground marks don't go. */
  readonly bare?: (x: number, y: number) => boolean;
}

/** How many of each tier's motifs a band places, against its kit's counts. */
const DENSITY = 2.2;
/** Half the width of the map's middle column that most screens show, world px. */
const VIEW = 520;

export interface LayCtx {
  readonly geo: Geo;
  readonly region: MapRegion;
  readonly draft: boolean;
  readonly rng: Rng;
  readonly under: FeatureList;
  readonly over: FeatureList;
  readonly place: Placer;
}

export function placeBand(kit: PlaceKit, geo: Geo, region: MapRegion, draft: boolean): Band {
  const salt = kit.salt + region.index * 101;
  const rng = createRng(seedOf(salt, 1));
  const under = new FeatureList(salt + 1, draft);
  const over = new FeatureList(salt + 2, draft);
  const place = new Placer(geo, region, (_x, y) => y < region.top + 24 || y > region.bottom - 24);
  kit.lay?.({ geo, region, draft, rng, under, over, place });
  for (const tier of kit.tiers) {
    const count = Math.round(tier.count * DENSITY);
    for (let i = 0, tries = 0; i < count && tries < count * 14; tries++) {
      const s = tier.size * (0.8 + rng() * 0.4);
      // Most things go where a screen shows them: within the column the trail swings through.
      const x = rng() < 0.7 ? MAP.mid - VIEW + rng() * VIEW * 2 : -s * 0.3 + rng() * (MAP.width + s * 0.6);
      const c = pt(x, region.top + s * 0.6 + 20 + rng() * (region.bottom - region.top - s * 1.2 - 40));
      if (geo.busy(c.x, c.y) < tier.busy * 0.6 || !place.claim(c, s, 18, 0.85)) continue;
      const motif = tier.motifs[i % tier.motifs.length]!;
      const text = tier === kit.tiers[0] && draft ? kit.notes?.[i] : undefined;
      const at = pt(c.x + (c.x < MAP.mid ? -1 : 1) * s * 0.3, c.y + s * 0.95 + 26);
      const noted = text !== undefined && !geo.onLabel(at.x, at.y, 70) && geo.dist(at.x, at.y, 200) > 90 && at.x > 150 && at.x < MAP.width - 150;
      (tier.flat ? under : over).add(c.y, s * 1.8 + 60, (b, r) => {
        motif(b, c, s, r);
        if (noted) note(b, at, pt(c.x + (at.x - c.x) * 0.3, c.y + s * 0.7), text!);
      });
      i++;
    }
  }
  // Things that stand are drawn top to bottom, so the nearer (lower) overlaps the further.
  over.list.sort((p, q) => p.y - q.y);
  const top = region.top + 14;
  const bottom = region.bottom + 10;
  return {
    region,
    draft,
    trail: kit.trail,
    under: under.list,
    over: over.list,
    ground: (ctx, span) => {
      if (draft) pencilGround(ctx, geo, span, top, bottom, salt, kit.bare);
      else paintWash(ctx, span, top, bottom, kit.wash, salt);
      kit.ground?.(ctx, geo, span, region, draft);
      if (!draft && kit.marks) groundMarks(ctx, geo, span, top, bottom, kit.marks, salt, kit.bare ?? (() => false));
    },
  };
}
