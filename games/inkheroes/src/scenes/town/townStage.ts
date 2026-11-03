import { TOWN_ART, type TownArt } from '../../art/pixel/town';
import type { BuildingId } from '../../logic/buildings';

/**
 * The town screen's city, after Heroes III's townscape but drawn
 * isometric: a raised square of paved streets seen from its front corner,
 * the walls and keep at the back, the hall on the square in the middle,
 * the dwellings and trades on their plots round it, and ordinary houses,
 * a fountain and trees filling every other block, so it reads as a whole
 * city from the first day. A plot not built on yet is a garden with a few
 * trees; the building stands on it the day it is built.
 *
 * The city is a CITY × CITY grid of isometric tiles (2:1, TILE_W × TILE_H);
 * grid vertex (i, j) is at stage pixel (CX + (i − j)·TILE_W/2,
 * TOP + (i + j)·TILE_H/2), so i runs down to the right and j down to the
 * left, and (0, 0) is the back corner. A sprite stands with the middle of
 * its bottom row (the front corner of its paving) on its spot.
 */
export const CITY = 32;
export const TILE_W = 32;
export const TILE_H = 16;
export const STAGE = { w: 1180, h: 740 } as const;
export const CITY_ORIGIN = { x: STAGE.w / 2, y: 200 } as const;
/** How much of the stage, from its top, a screen tall enough shows (the city's front corner runs off below). */
export const STAGE_SHOWN = 660;
/** Where the ground behind the city meets the hills, stage row. */
export const STAGE_HORIZON = 232;

/** A grid point on the stage. */
export function toStage(i: number, j: number): { x: number; y: number } {
  return { x: CITY_ORIGIN.x + ((i - j) * TILE_W) / 2, y: CITY_ORIGIN.y + ((i + j) * TILE_H) / 2 };
}

/** A stage point in grid units (fractional). */
export function toGrid(x: number, y: number): { i: number; j: number } {
  const dx = (x - CITY_ORIGIN.x) / (TILE_W / 2);
  const dy = (y - CITY_ORIGIN.y) / (TILE_H / 2);
  return { i: (dy + dx) / 2, j: (dy - dx) / 2 };
}

/** A square plot: its back corner (a, b) and its side in tiles. */
export interface Plot {
  readonly a: number;
  readonly b: number;
  readonly n: number;
}

export interface Spot {
  readonly x: number;
  readonly y: number;
  readonly flip?: boolean;
}

/** Where a sprite `w` wide stands to sit in the middle of `plot`: its paving's front corner, a quarter of its width below the plot's centre. */
export function standIn(plot: Plot, w: number): Spot {
  const c = toStage(plot.a + plot.n / 2, plot.b + plot.n / 2);
  return { x: Math.round(c.x), y: Math.round(c.y + w / 4) };
}

/** A plot, with the ladder of drawings that can stand on it (best first) and the building each shows. */
interface Lot {
  readonly plot: Plot;
  readonly ladder: readonly (readonly [TownArt, BuildingId])[];
}

const one = (id: BuildingId & TownArt): readonly (readonly [TownArt, BuildingId])[] => [[id, id]];

export const LOTS: readonly Lot[] = [
  { plot: { a: 4, b: 4, n: 8 }, ladder: [['walls-castle', 'castle'], ['walls-citadel', 'citadel'], ['walls-fort', 'fort']] },
  { plot: { a: 2, b: 16, n: 3 }, ladder: one('seraphSpire') },
  { plot: { a: 15, b: 2, n: 6 }, ladder: one('monastery') },
  { plot: { a: 14, b: 14, n: 7 }, ladder: [['hall-capitol', 'capitol'], ['hall-city', 'cityHall'], ['hall-town', 'townHall'], ['hall-village', 'villageHall']] },
  { plot: { a: 22, b: 9, n: 4 }, ladder: [['guild-2', 'mageGuild2'], ['guild-1', 'mageGuild1']] },
  { plot: { a: 7, b: 22, n: 6 }, ladder: one('barracks') },
  { plot: { a: 2, b: 24, n: 4 }, ladder: one('griffinTower') },
  { plot: { a: 24, b: 2, n: 6 }, ladder: one('tiltyard') },
  { plot: { a: 14, b: 24, n: 5 }, ladder: one('tavern') },
  { plot: { a: 9, b: 28, n: 4 }, ladder: one('blacksmith') },
  { plot: { a: 21, b: 26, n: 4 }, ladder: one('guardhouse') },
  { plot: { a: 24, b: 20, n: 5 }, ladder: one('marketplace') },
  { plot: { a: 27, b: 14, n: 5 }, ladder: one('archeryRange') },
  { plot: { a: 27, b: 8, n: 5 }, ladder: one('stables') },
];
/** The square before the hall. */
const FOUNTAIN: Plot = { a: 22, b: 22, n: 3 };
const HOUSES: readonly TownArt[] = ['house-a', 'house-b', 'house-c', 'house-d', 'house-e', 'house-f'];
/** The city's edge: a ring this wide is garden (trees), not built on. */
const VERGE = 1;
const SEED = 4271;

/** One sprite on the stage, and the building a tap on it opens (none for the city's houses). */
export interface StagePiece {
  readonly art: TownArt;
  readonly building: BuildingId | null;
  readonly spot: Spot;
}

/** A small seeded random generator. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mark(taken: Uint8Array, p: Plot, margin: number): void {
  for (let i = p.a - margin; i < p.a + p.n + margin; i++) for (let j = p.b - margin; j < p.b + p.n + margin; j++) if (i >= 0 && j >= 0 && i < CITY && j < CITY) taken[i * CITY + j] = 1;
}

/** The streets between the blocks of houses: every STREET_EVERY tiles each way. */
const STREET_EVERY = 7;
const isStreet = (i: number, j: number): boolean => i % STREET_EVERY === STREET_EVERY - 1 || j % STREET_EVERY === STREET_EVERY - 1;

/** The city's houses: as many as fit in the blocks left between the plots and the streets, the same every time. */
export function housePlots(): { art: TownArt; plot: Plot }[] {
  const taken = new Uint8Array(CITY * CITY);
  for (const p of [...LOTS.map((l) => l.plot), FOUNTAIN]) mark(taken, p, 0);
  const rand = rng(SEED);
  const out: { art: TownArt; plot: Plot }[] = [];
  const fits = (a: number, b: number, n: number): boolean => {
    if (a < VERGE || b < VERGE || a + n > CITY - VERGE || b + n > CITY - VERGE) return false;
    for (let i = a; i < a + n; i++) for (let j = b; j < b + n; j++) if (taken[i * CITY + j] || isStreet(i, j)) return false;
    return true;
  };
  // Back to front, so the blocks fill in rows; a shuffled house for each spot that takes one.
  for (let s = 0; s < CITY * 2; s++) {
    for (let a = 0; a <= s; a++) {
      const b = s - a;
      const art = HOUSES[Math.floor(rand() * HOUSES.length)]!;
      const n = Math.max(2, Math.round(TOWN_ART[art].w / TILE_W));
      if (!fits(a, b, n)) continue;
      const plot = { a, b, n };
      out.push({ art, plot });
      // Houses stand wall to wall in their block; the streets run between the blocks.
      mark(taken, plot, 0);
    }
  }
  return out;
}

/** Whether tile (i, j) is garden (grass) rather than paving. */
export const isGarden = (i: number, j: number): boolean => Math.min(i, j, CITY - 1 - i, CITY - 1 - j) < VERGE;

/** The plots nothing stands on yet, with the first building of their ladder (what tapping one offers). */
export function emptyPlots(built: readonly BuildingId[]): { plot: Plot; building: BuildingId }[] {
  return LOTS.filter((l) => !l.ladder.some(([, b]) => built.includes(b))).map((l) => ({ plot: l.plot, building: l.ladder[l.ladder.length - 1]![1] }));
}

/** What a town with `built` shows: its buildings, the houses and the fountain, back to front. */
export function stagePieces(built: readonly BuildingId[]): StagePiece[] {
  const out: StagePiece[] = [];
  for (const lot of LOTS) {
    const top = lot.ladder.find(([, b]) => built.includes(b));
    if (top) out.push({ art: top[0], building: top[1], spot: standIn(lot.plot, TOWN_ART[top[0]].w) });
  }
  for (const h of housePlots()) out.push({ art: h.art, building: null, spot: standIn(h.plot, TOWN_ART[h.art].w) });
  out.push({ art: 'fountain', building: null, spot: standIn(FOUNTAIN, TOWN_ART.fountain.w) });
  return out.sort((p, q) => p.spot.y - q.spot.y || p.spot.x - q.spot.x);
}

/** The art that shows `building` on its own (a picture in the hall's ledger). */
export function buildingArt(building: BuildingId): TownArt {
  for (const lot of LOTS) {
    const step = lot.ladder.find(([, b]) => b === building);
    if (step) return step[0];
  }
  return building as BuildingId & TownArt;
}

/** The upgrade ladders, lowest first: the hall's ledger shows one card for each, its next step. */
const LADDERS: readonly (readonly BuildingId[])[] = [
  ['villageHall', 'townHall', 'cityHall', 'capitol'],
  ['fort', 'citadel', 'castle'],
  ['mageGuild1', 'mageGuild2'],
];

/**
 * The hall's ledger, as Heroes III's: a card per building on this map, an
 * upgrade ladder as one card showing its next step (its top once all is
 * built), in the build order.
 */
export function ledgerOf(built: readonly BuildingId[], order: readonly BuildingId[], off: readonly BuildingId[]): BuildingId[] {
  const out: BuildingId[] = [];
  for (const id of order) {
    if (off.includes(id)) continue;
    const ladder = LADDERS.find((l) => l.includes(id));
    if (!ladder) {
      out.push(id);
      continue;
    }
    if (ladder[0] !== id) continue;
    const open = ladder.filter((b) => !off.includes(b));
    const next = open.find((b) => !built.includes(b)) ?? open[open.length - 1];
    if (next) out.push(next);
  }
  return out;
}
