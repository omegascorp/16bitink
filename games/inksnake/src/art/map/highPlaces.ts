import type { Rng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { pt } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { type BandMaker, leftLimit, rightLimit } from './band';
import { blob, type Brush, note, polar } from './brush';
import type { Geo } from './common';
import { type CanopyLook, paintCanopy } from './canopy';
import { stoneWall } from './fences';
import { type PlaceKit, placeBand } from './placeBand';
import { bamboo, bush, gorse, grassClump, heather } from './plants';
import { boulder, crag, scree, templeRuin, tor } from './rocks';
import { frondTop, giant } from './trees';

/**
 * The high and old chapters' bands: the Mountains (limestone crags and
 * scree fans on slopes ruled with contours and hachures, alpine cushions),
 * the Heath (heather and gorse, a granite tor, dry-stone field walls) and
 * the Jungle (bamboo groves, great crowns, a ruined stepped temple).
 */
const TWIG_NEST: readonly [string, string, string] = ['#9a7a5a', '#5a4030', '#c0a080'];

/** A contour line across the band at y, broken near the trail and the labels, little hachures hanging off it downhill. */
function contour(b: Brush, y: number, geo: Geo, rng: Rng): void {
  const [p1, p2, amp] = [rng() * 6.28, rng() * 6.28, 18 + rng() * 26];
  let run: Pt[] = [];
  const flush = (): void => {
    if (run.length > 3) {
      b.line(run, 0.7, b.draft ? 0.4 : 0.45, '#7a6a52');
      for (let k = 1; k < run.length; k += 2) b.line([run[k]!, pt(run[k]!.x + 1, run[k]!.y + 5 + rng() * 5)], 0.4, 0.3, '#7a6a52');
    }
    run = [];
  };
  for (let x = -40; x <= MAP.width + 40; x += 12) {
    const p = pt(x, y + Math.sin(x / 260 + p1) * amp + Math.sin(x / 95 + p2) * 9);
    if (geo.dist(p.x, p.y, 80) < 60 || geo.onLabel(p.x, p.y, 8)) flush();
    else run.push(p);
  }
  flush();
}

/** A crag with scree fanning down below it. */
function cragAndScree(b: Brush, c: Pt, s: number, rng: Rng): void {
  scree(b, pt(c.x + s * 0.2, c.y + s * 0.4), s * 0.9, Math.PI / 2 + (rng() - 0.5) * 0.6, rng);
  crag(b, c, s * 0.6, rng);
}

const mountains: PlaceKit = {
  salt: 7000,
  wash: { colour: '#bcb89e', alpha: 0.42, deep: ['#8a8a70', '#9aa888'] },
  marks: { tick: mix('#6a7a5a', '#26316a', 0.25), grain: '#6a6a5a', density: 0.3, flower: ['#e8a0c0', '#f2e060', 0.04] },
  notes: ['limestone crag', 'scree', 'crag'],
  trail: { bed: '#c8bca8', mark: '#7a7062', fringe: mix('#8a9a6a', '#26316a', 0.2), nest: TWIG_NEST },
  lay: ({ under, rng, region, geo }) => {
    for (let y = region.top + 70; y < region.bottom - 60; y += 64 + rng() * 26) under.add(y, 70, (b, r) => contour(b, y, geo, r));
  },
  tiers: [
    { motifs: [cragAndScree], count: 9, size: 90, busy: 0.45 },
    { motifs: [(b, c, s, r) => crag(b, c, s * 0.6, r), (b, c, s, r) => boulder(b, c, s * 0.4, r), (b, c, s, r) => scree(b, c, s, Math.PI / 2, r), (b, c, s, r) => bush(b, c, s * 0.4, r, '#6a8a4a')], count: 22, size: 40, busy: 0.25 },
    { motifs: [(b, c, s, r) => boulder(b, c, s * 0.4, r), (b, c, s, r) => bush(b, c, s * 0.6, r, '#7a9a5a', '#e8a0c0')], count: 26, size: 18, busy: 0.2 },
  ],
};

const heath: PlaceKit = {
  salt: 8000,
  wash: { colour: '#a69c7a', alpha: 0.42, deep: ['#7a6a7a', '#8a8a5a'] },
  marks: { tick: mix('#6a6a4a', '#26316a', 0.25), grain: '#5a4a5a', density: 0.5, flower: ['#a070a8', '#6a3a6a', 0.05] },
  notes: ['granite tor', 'gorse', 'tor', 'gorse in flower'],
  trail: { bed: '#8a7050', mark: '#4a3a2a', fringe: mix('#7a7a4a', '#26316a', 0.2), nest: TWIG_NEST },
  lay: ({ over, under, rng, region, geo, place }) => {
    // Swathes of heather in flower, washed in purple.
    for (let k = 0; k < 9; k++) {
      const c = pt(rng() * MAP.width, region.top + 100 + rng() * (region.bottom - region.top - 300));
      const s = 90 + rng() * 120;
      under.add(c.y, s, (b, r) => {
        const shape = blob(c, s, s * 0.55, r, 0.35, 28, r());
        b.tint(shape, '#8a6a92', 0.12);
        if (!b.draft) b.pen.stipple(shape, Math.round(s * 4), () => 0.85, 1.1, '#9a5f9a');
        for (let i = 0; i < 6; i++) heather(b, pt(c.x + (r() - 0.5) * s * 1.4, c.y + (r() - 0.5) * s * 0.7), 9 + r() * 8, r);
      });
    }
    // Old field walls running in from the edges, stopping short of the trail.
    for (let k = 0; k < 4; k++) {
      const y = region.top + 200 + k * ((region.bottom - region.top - 520) / 3) + (rng() - 0.5) * 60;
      const leftSide = k % 2 === 0;
      const x0 = leftSide ? -30 : Math.max(MAP.mid + 140, rightLimit(geo, y - 40, y + 20, 90));
      const x1 = leftSide ? Math.min(MAP.mid - 140, leftLimit(geo, y - 40, y + 20, 90)) : MAP.width + 30;
      if (x1 - x0 < 120) continue;
      for (let x = x0; x < x1; x += 50) place.reserve(pt(x, y - 10), 26);
      over.add(y, 60, (b, r) => stoneWall(b, x0, x1, y, r));
    }
  },
  tiers: [
    { motifs: [(b, c, s, r) => tor(b, c, s, r), (b, c, s, r) => clusterOf(gorse, 4, 0.3)(b, c, s, r)], count: 5, size: 80, busy: 0.5 },
    { motifs: [(b, c, s, r) => heather(b, c, s * 0.6, r), (b, c, s, r) => gorse(b, c, s * 0.55, r)], count: 22, size: 36, busy: 0.3 },
    { motifs: [(b, c, s, r) => heather(b, c, s * 0.6, r), (b, c, s, r) => grassClump(b, c, s * 0.8, r, '#8a8a4a')], count: 28, size: 18, busy: 0.2 },
  ],
};

/** `motif` repeated a few times round c, each `k` of the size. */
function clusterOf(motif: (b: Brush, c: Pt, s: number, rng: Rng) => void, n: number, k: number) {
  return (b: Brush, c: Pt, s: number, rng: Rng): void => {
    const spots = Array.from({ length: n }, () => polar(c, rng() * 6.28, s * 0.6 * Math.sqrt(rng())));
    spots.sort((p, q) => p.y - q.y);
    for (const p of spots) motif(b, p, s * k * (0.8 + rng() * 0.4), rng);
  };
}

const JUNGLE_CANOPY: CanopyLook = { leaf: '#5a9a4a', deep: '#24502c', lit: '#cce08a', r: [22, 40], fill: 0.62, clear: 120 };

const jungle: PlaceKit = {
  salt: 9000,
  ground: (ctx, geo, span, region, draft) => paintCanopy(ctx, geo, span, region, JUNGLE_CANOPY, draft, 9100),
  wash: { colour: '#669a50', alpha: 0.44, deep: ['#2f5a33', '#8ab060'], bloom: 1.4 },
  marks: { tick: '#2f5a33', grain: '#2f4a2a', density: 0.45 },
  notes: ['bamboo', 'fig', 'bamboo grove', 'banyan'],
  trail: { bed: '#7a5a3a', mark: '#3a2a1a', fringe: '#3f6b3a', nest: ['#8a7a3a', '#5a4a20', '#c0b070'] },
  lay: ({ over, place, rng, region }) => {
    const s = 105;
    const y0 = region.top + 260;
    const y1 = region.bottom - 520;
    const c = place.take(rng, { x0: 120, x1: 380, y0, y1 }, s * 1.45, 50, 40) ?? place.take(rng, { x0: MAP.width - 380, x1: MAP.width - 120, y0, y1 }, s * 1.45, 50, 40);
    if (c) over.add(c.y, s * 1.8, (b, r) => {
      templeRuin(b, c, s, r);
      if (b.draft) note(b, pt(c.x, c.y + s * 1.25 + 24), pt(c.x, c.y + s * 1.05), 'ruined temple');
    });
  },
  tiers: [
    { motifs: [clusterOf(bamboo, 4, 0.4), (b, c, s, r) => giant(b, c, s, r, '#4f8a46')], count: 12, size: 84, busy: 0.4 },
    { motifs: [(b, c, s, r) => bamboo(b, c, s, r), (b, c, s, r) => giant(b, c, s, r, '#5f9a4e'), (b, c, s, r) => frondTop(b, c, s * 0.9, r)], count: 20, size: 40, busy: 0.28 },
    { motifs: [(b, c, s, r) => frondTop(b, c, s, r, '#6fa05a'), (b, c, s, r) => bush(b, c, s, r, '#4f8a46')], count: 24, size: 18, busy: 0.16 },
  ],
};

const make = (kit: PlaceKit): BandMaker => (geo: Geo, region: MapRegion, draft: boolean) => placeBand(kit, geo, region, draft);

export const HIGH_BANDS = { mountains: make(mountains), heath: make(heath), jungle: make(jungle) } as const;
