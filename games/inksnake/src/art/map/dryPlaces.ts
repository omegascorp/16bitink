import type { Rng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { closed, pt } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import type { BandMaker } from './band';
import { blob, type Brush, note, polar, scalloped } from './brush';
import { type Geo } from './common';
import { type PlaceKit, placeBand } from './placeBand';
import { bush, creosote, grassClump, pricklyPear, saguaro } from './plants';
import { boulder, termiteMound } from './rocks';
import { acacia, pine } from './trees';

/**
 * The dry chapters' bands: the Pine Barrens (pitch pines over white sand
 * clearings, scrub oak, reindeer lichen), the Dunes (long dune ridges with
 * their shaded lee faces and wind ripples, saguaros, creosote, prickly
 * pear) and the Savanna (acacias, termite mounds, tall gold grass).
 */
const GRASS_NEST: readonly [string, string, string] = ['#c8b070', '#8a7040', '#e8d8a0'];

/** A few pines standing together, the furthest first. */
function pineStand(b: Brush, c: Pt, s: number, rng: Rng): void {
  for (let i = 0; i < 6; i++) bush(b, polar(c, rng() * Math.PI * 2, s * 0.8 * Math.sqrt(rng())), s * (0.1 + rng() * 0.08), rng, '#7a8048');
  const trees = Array.from({ length: 7 + Math.floor(rng() * 5) }, () => ({ p: polar(c, rng() * Math.PI * 2, s * 0.75 * Math.sqrt(rng())), r: s * (0.24 + rng() * 0.12) }));
  trees.sort((p, q) => p.p.y - q.p.y);
  for (const t of trees) pine(b, t.p, t.r, rng);
}

/** Scrub oak and huckleberry: a few low bushes together. */
function clusterBush(b: Brush, c: Pt, s: number, rng: Rng): void {
  for (let i = 0; i < 4; i++) bush(b, polar(c, rng() * Math.PI * 2, s * 0.5 * Math.sqrt(rng())), s * (0.3 + rng() * 0.15), rng, i % 2 ? '#7a8048' : '#6a7a3e', rng() < 0.3 ? '#3a4a8a' : null);
}

/** Reindeer lichen: pale grey-green cushions, stippled. */
function lichen(b: Brush, c: Pt, s: number, rng: Rng): void {
  for (let i = 0; i < 3; i++) {
    const p = polar(c, rng() * Math.PI * 2, s * 0.6);
    const shape = scalloped(p, s * (0.35 + rng() * 0.2), 7, rng, 0.25);
    b.body(shape, '#c8cdb0', 0.7);
    b.shade(shape, s * 0.15, '#8a9078', 0.3);
    b.line(closed(shape), 0.45, 0.55);
  }
}

/** A sandy clearing: a pale blot of bare sand, its edge stippled. */
function clearing(b: Brush, c: Pt, s: number, rng: Rng): void {
  const turn = rng();
  const shape = blob(c, s * 1.3, s * 0.8, rng, 0.25, 26, turn);
  // A soft edge: the sand whitening towards the middle, as bare ground does.
  b.tint(blob(c, s * 1.45, s * 0.95, rng, 0.3, 26, turn), '#efe4c4', 0.4);
  b.tint(shape, '#f7f0da', 0.75);
  b.tint(blob(pt(c.x - s * 0.1, c.y - s * 0.08), s * 0.8, s * 0.45, rng, 0.3, 20, turn), '#fffaf0', 0.45);
  b.pen.clipped(shape, () => {
    for (let k = -s; k < s; k += 9) b.line([pt(c.x - s * 1.3, c.y + k), pt(c.x, c.y + k + 3), pt(c.x + s * 1.3, c.y + k - 1)], 0.4, b.draft ? 0.18 : 0.22, '#a89870');
  });
  b.line(closed(shape).filter((_, i) => i % 4 !== 3), 0.5, 0.3, '#a89870');
  for (let i = 0; i < 50; i++) {
    const p = polar(c, rng() * Math.PI * 2, s * Math.sqrt(rng()) * 1.2);
    b.dot(p.x, c.y + (p.y - c.y) * 0.65, 0.7, '#a89870', 0.55);
  }
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2;
    grassClump(b, pt(c.x + Math.cos(a) * s * 1.2, c.y + Math.sin(a) * s * 0.75), 9 + rng() * 5, rng, '#8a9a5a');
  }
}

const barrens: PlaceKit = {
  salt: 2000,
  wash: { colour: '#d6cf9e', alpha: 0.42, deep: ['#9aa070', '#b8a878'] },
  marks: { tick: mix('#8a6a40', '#26316a', 0.25), grain: '#8a7a5a', density: 0.4, flower: ['#5a68a8', '#2a3a6a', 0.035] },
  notes: ['pitch pines', 'old pines on sand', 'pitch pines'],
  trail: { bed: '#e8dcbc', mark: '#a89870', fringe: mix('#8a9a5a', '#26316a', 0.2), nest: ['#b08a50', '#7a5a30', '#d8b880'] },
  lay: ({ under, place, rng, region }) => {
    for (let i = 0; i < 5; i++) {
      const s = 45 + rng() * 35;
      const c = place.take(rng, { x0: 0, x1: MAP.width, y0: region.top + 80, y1: region.bottom - 80 }, s, 10, 30, 0.6);
      const k = i;
      if (c) under.add(c.y, s * 1.4, (b, r) => {
        clearing(b, c, s, r);
        if (b.draft && k < 2 && c.x > 120 && c.x < MAP.width - 120) note(b, pt(c.x, c.y + s * 0.95 + 18), pt(c.x, c.y + s * 0.6), 'white sand');
      });
    }
  },
  tiers: [
    { motifs: [pineStand], count: 9, size: 120, busy: 0.5 },
    { motifs: [(b, c, s, r) => pine(b, c, s, r), (b, c, s, r) => clusterBush(b, c, s, r), (b, c, s, r) => pine(b, c, s * 0.8, r)], count: 26, size: 36, busy: 0.3 },
    { motifs: [lichen, (b, c, s, r) => grassClump(b, c, s, r, '#8a9a5a'), (b, c, s, r) => pine(b, c, s * 0.7, r), (b, c, s, r) => bush(b, c, s * 0.6, r, '#7a8048')], count: 34, size: 18, busy: 0.18 },
  ],
};

/** One dune's crest across the map near y: a long wandering line. */
function crestOf(y: number, rng: Rng): Pt[] {
  const [p1, p2, amp] = [rng() * 6.28, rng() * 6.28, 30 + rng() * 30];
  return Array.from({ length: 86 }, (_, i) => {
    const x = -40 + i * 20;
    return pt(x, y + Math.sin(x / 230 + p1) * amp + Math.sin(x / 87 + p2) * 12);
  });
}

/** A dune ridge: its crest, the steep lee face below it shaded, wind ripples on the gentle side above. */
function dune(b: Brush, crest: readonly Pt[], geo: Geo, rng: Rng): void {
  const depth = crest.map((_, i) => 26 + 22 * Math.sin(i * 0.21 + rng() * 0.2) ** 2);
  const lee = [...crest, ...[...crest].reverse().map((p, k) => pt(p.x + 6, p.y + depth[crest.length - 1 - k]!))];
  if (b.draft) {
    b.pen.hatch(lee, 4, 1.1, 0.4, { color: b.ink, alpha: 0.22 });
  } else {
    b.pen.fill(lee, '#c89a5a', 0.3);
    b.pen.fill(crest.map((p, i) => pt(p.x + 3, p.y + depth[i]! * 0.45)).concat([...crest].reverse()), '#a8783a', 0.18);
  }
  // The crest, drawn in pieces, broken where a level's label sits.
  let run: Pt[] = [];
  const flush = (): void => {
    if (run.length > 2) b.stroke(run, 1, 0.7);
    run = [];
  };
  for (const p of crest) {
    if (geo.onLabel(p.x, p.y, 10)) flush();
    else run.push(p);
  }
  flush();
  // Ripples: short wavy lines above the crest, following it.
  for (let i = 0; i < 40; i++) {
    const k = Math.floor(rng() * (crest.length - 4));
    const off = -14 - rng() * 70;
    const line = crest.slice(k, k + 3 + Math.floor(rng() * 3)).map((p) => pt(p.x, p.y + off));
    if (line.some((p) => geo.onLabel(p.x, p.y, 6) || geo.dist(p.x, p.y, 60) < 40)) continue;
    b.line(line, 0.45, b.draft ? 0.3 : 0.4, '#a8844a');
  }
}

const dunes: PlaceKit = {
  salt: 3000,
  wash: { colour: '#ecd29c', alpha: 0.5, deep: ['#d8aa6a', '#e0b880'] },
  notes: ['saguaro', 'saguaro & prickly pear', 'saguaro'],
  trail: { bed: '#d8b47a', mark: '#a8844a', fringe: null, nest: GRASS_NEST },
  lay: ({ under, rng, region, geo }) => {
    for (let y = region.top + 140; y < region.bottom - 120; y += 230 + rng() * 80) {
      const crest = crestOf(y, rng);
      under.add(y, 140, (b, r) => dune(b, crest, geo, r));
    }
  },
  tiers: [
    {
      motifs: [(b, c, s, r) => {
        saguaro(b, c, s, r);
        pricklyPear(b, pt(c.x + s * 0.6, c.y + s * 0.2), s * 0.3, r);
      }],
      count: 6,
      size: 74,
      busy: 0.55,
    },
    { motifs: [(b, c, s, r) => creosote(b, c, s * 0.6, r), (b, c, s, r) => saguaro(b, c, s * 1.4, r), (b, c, s, r) => pricklyPear(b, c, s * 0.5, r)], count: 14, size: 36, busy: 0.35 },
    { motifs: [(b, c, s, r) => creosote(b, c, s * 0.7, r), (b, c, s, r) => boulder(b, c, s * 0.4, r, '#c8a878'), (b, c, s, r) => grassClump(b, c, s * 0.8, r, '#b0a060')], count: 24, size: 18, busy: 0.2 },
  ],
};

const savanna: PlaceKit = {
  salt: 4000,
  wash: { colour: '#dcc67a', alpha: 0.46, deep: ['#b8a050', '#c89a5a'] },
  marks: { tick: mix('#9a8a3a', '#26316a', 0.25), grain: '#8a7a3a', density: 0.95, height: 1.8 },
  notes: ['acacia', 'termite mound', 'umbrella thorn', 'termite mound'],
  trail: { bed: '#c48a5a', mark: '#7a4a2a', fringe: mix('#a89a4a', '#26316a', 0.2), nest: GRASS_NEST },
  tiers: [
    { motifs: [(b, c, s, r) => acacia(b, c, s, r), (b, c, s, r) => termiteMound(b, c, s * 0.7, r)], count: 10, size: 80, busy: 0.45 },
    { motifs: [(b, c, s, r) => acacia(b, c, s * 0.8, r), (b, c, s, r) => grassClump(b, c, s * 0.7, r, '#b0a050', '#e8d890'), (b, c, s, r) => termiteMound(b, c, s, r)], count: 14, size: 38, busy: 0.35 },
    { motifs: [(b, c, s, r) => grassClump(b, c, s, r, '#a89a4a', '#e8d890'), (b, c, s, r) => boulder(b, c, s * 0.5, r, '#b8a080'), (b, c, s, r) => grassClump(b, c, s * 1.2, r, '#b0a050')], count: 40, size: 20, busy: 0.12 },
  ],
};

const make = (kit: PlaceKit): BandMaker => (geo: Geo, region: MapRegion, draft: boolean) => placeBand(kit, geo, region, draft);

export const DRY_BANDS = { barrens: make(barrens), dunes: make(dunes), savanna: make(savanna) } as const;
