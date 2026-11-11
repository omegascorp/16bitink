import { MAP_COVER, type MapCover } from '../../art/pixel/map';
import { TOWN_ART } from '../../art/pixel/town';
import { cellRandom } from '../battle/pixelScenery';
import type { BuildingId } from '../../logic/buildings';
import type { TownPeople } from './townKit';
import { spriteOf, townKit, type PieceId, type TownKit } from './townKit';

type TownArt = PieceId;
/** A Greek city's drawing (no Temple of Osiris or palms among them). */
type GreekArt = keyof typeof TOWN_ART;

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

type Has = (art: string) => boolean;

const one = (id: BuildingId & TownArt): readonly (readonly [TownArt, BuildingId])[] => [[id, id]];

/** A dwelling and its two upgrades, best first: each upgrade drawn as `<dwelling>-2` / `-3` (its own art once made, else the dwelling's). */
const dwelling = (id: BuildingId & TownArt, has: Has): readonly (readonly [TownArt, BuildingId])[] =>
  ([3, 2] as const).map((n) => {
    const art = `${id}-${n}`;
    return [has(art) ? (art as TownArt) : id, `${id}${n}` as BuildingId] as const;
  }).concat([[id, id]]);

/** The Portal's three levels, both peoples': on the free block behind the hall. */
const PORTAL_PLOT: Plot = { a: 17, b: 9, n: 4 };
/** A people's own building (Egypt's Temple of Osiris, the Norse Mead Hall): on a free plot before the hall's right flank. */
const OWN_PLOT: Plot = { a: 22, b: 14, n: 4 };

/** The city's plots for a set of drawings: the same ones for both peoples, Egypt's with the Temple of Osiris besides. */
const lotsFor = (has: Has, faction: TownPeople): readonly Lot[] => {
  const own = townKit(faction).own;
  return [
  { plot: { a: 4, b: 4, n: 8 }, ladder: [['walls-castle', 'castle'], ['walls-citadel', 'citadel'], ['walls-fort', 'fort']] },
  { plot: { a: 2, b: 16, n: 3 }, ladder: dwelling('seraphSpire', has) },
  { plot: { a: 15, b: 2, n: 6 }, ladder: dwelling('monastery', has) },
  { plot: { a: 14, b: 14, n: 7 }, ladder: [['hall-capitol', 'capitol'], ['hall-city', 'cityHall'], ['hall-town', 'townHall'], ['hall-village', 'villageHall']] },
  { plot: { a: 22, b: 9, n: 4 }, ladder: [['guild-2', 'mageGuild2'], ['guild-1', 'mageGuild1']] },
  { plot: { a: 7, b: 22, n: 6 }, ladder: dwelling('barracks', has) },
  { plot: { a: 2, b: 24, n: 4 }, ladder: dwelling('griffinTower', has) },
  { plot: { a: 24, b: 2, n: 6 }, ladder: dwelling('tiltyard', has) },
  { plot: { a: 14, b: 24, n: 5 }, ladder: one('tavern') },
  { plot: { a: 9, b: 28, n: 4 }, ladder: one('blacksmith') },
  { plot: { a: 8, b: 15, n: 4 }, ladder: [['treasury', 'treasury'], ['storehouse', 'storehouse']] },
  { plot: { a: 21, b: 26, n: 4 }, ladder: dwelling('guardhouse', has) },
  { plot: { a: 24, b: 20, n: 5 }, ladder: one('marketplace') },
  { plot: { a: 27, b: 14, n: 5 }, ladder: dwelling('archeryRange', has) },
  { plot: { a: 27, b: 8, n: 5 }, ladder: one('stables') },
  // Behind the hall, between the walls and the guild: its arch rises over the square.
  { plot: PORTAL_PLOT, ladder: [['portal-3', 'portal3'], ['portal-2', 'portal2'], ['portal', 'portal']] },
  ...(own ? [{ plot: OWN_PLOT, ladder: [[own.piece, own.building]] as const }] : []),
  ];
};

const LOT_SETS = new Map<TownPeople, readonly Lot[]>();
/** The plots of a people's city. */
export function lotsOf(faction: TownPeople = 'crown'): readonly Lot[] {
  let lots = LOT_SETS.get(faction);
  if (!lots) {
    const kit = townKit(faction);
    lots = lotsFor((a) => a in kit.art, faction);
    LOT_SETS.set(faction, lots);
  }
  return lots;
}

export const LOTS: readonly Lot[] = lotsOf('crown');
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
export function housePlots(faction: TownPeople = 'crown'): { art: TownArt; plot: Plot }[] {
  const kit = townKit(faction);
  const taken = new Uint8Array(CITY * CITY);
  for (const p of [...lotsOf(faction).map((l) => l.plot), FOUNTAIN]) mark(taken, p, 0);
  // The Portal's arch rises well above its plot: a row of open paving along its side towards the hall's back, so no house stands there half hidden behind it.
  mark(taken, { a: PORTAL_PLOT.a - 1, b: PORTAL_PLOT.b - 1, n: 1 }, 0);
  for (let k = 0; k < PORTAL_PLOT.n; k++) mark(taken, { a: PORTAL_PLOT.a - 1, b: PORTAL_PLOT.b + k, n: 1 }, 0);
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
      const n = Math.max(2, Math.round(spriteOf(kit, art).w / TILE_W));
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
export function emptyPlots(built: readonly BuildingId[], faction: TownPeople = 'crown'): { plot: Plot; building: BuildingId }[] {
  return lotsOf(faction).filter((l) => !l.ladder.some(([, b]) => built.includes(b))).map((l) => ({ plot: l.plot, building: l.ladder[l.ladder.length - 1]![1] }));
}

/** What a town with `built` shows: its buildings, the houses and the fountain, back to front. */
export function stagePieces(built: readonly BuildingId[], faction: TownPeople = 'crown'): StagePiece[] {
  const kit = townKit(faction);
  const out: StagePiece[] = [];
  for (const lot of lotsOf(faction)) {
    const top = lot.ladder.find(([, b]) => built.includes(b));
    if (top) out.push({ art: top[0], building: top[1], spot: standIn(lot.plot, spriteOf(kit, top[0]).w) });
  }
  for (const h of housePlots(faction)) out.push({ art: h.art, building: null, spot: standIn(h.plot, spriteOf(kit, h.art).w) });
  out.push({ art: 'fountain', building: null, spot: standIn(FOUNTAIN, spriteOf(kit, 'fountain').w) });
  return out.sort((p, q) => p.spot.y - q.spot.y || p.spot.x - q.spot.x);
}

/** The art that shows `building` on its own (a picture in the hall's ledger). */
export function buildingArt(building: BuildingId): GreekArt;
export function buildingArt(building: BuildingId, faction: TownPeople): TownArt;
export function buildingArt(building: BuildingId, faction: TownPeople = 'crown'): TownArt {
  for (const lot of lotsOf(faction)) {
    const step = lot.ladder.find(([, b]) => b === building);
    if (step) return step[0];
  }
  const borrowed = ART_STAND_IN[building];
  return borrowed && faction === 'crown' ? buildingArt(borrowed, faction) : (building as BuildingId & TownArt);
}

/** Buildings with no drawing or plot of their own yet (Egypt's art is still to come) show another's picture in the hall. */
const ART_STAND_IN: Readonly<Partial<Record<BuildingId, BuildingId>>> = { templeOsiris: 'mageGuild1' };

/** The upgrade ladders, lowest first: the hall's ledger shows one card for each, its next step. */
const LADDERS: readonly (readonly BuildingId[])[] = [
  ['villageHall', 'townHall', 'cityHall', 'capitol'],
  ['fort', 'citadel', 'castle'],
  ['mageGuild1', 'mageGuild2'],
  ['portal', 'portal2', 'portal3'],
  ...(['guardhouse', 'archeryRange', 'griffinTower', 'barracks', 'monastery', 'tiltyard', 'seraphSpire'] as const).map((d) => [d, `${d}2`, `${d}3`] as BuildingId[]),
];

/**
 * The hall's ledger, as Heroes III's: a card per building, an upgrade
 * ladder as one card showing its next step (its top once all is built), in
 * the build order. Buildings this map has off still show (greyed, for a
 * later map), the ones it opens first.
 */
export function ledgerOf(built: readonly BuildingId[], order: readonly BuildingId[], off: readonly BuildingId[]): BuildingId[] {
  const out: BuildingId[] = [];
  for (const id of order) {
    const ladder = LADDERS.find((l) => l.includes(id));
    if (!ladder) {
      out.push(id);
      continue;
    }
    if (ladder[0] !== id) continue;
    out.push(ladder.find((b) => !built.includes(b)) ?? ladder[ladder.length - 1]!);
  }
  const later = (b: BuildingId): number => (off.includes(b) && !built.includes(b) ? 1 : 0);
  return out.map((b, i) => ({ b, i })).sort((p, q) => later(p.b) - later(q.b) || p.i - q.i).map((p) => p.b);
}

/** Trees in the garden round the city's edge and on the plots not built on yet: how likely a tile grows one, and which kinds. */
const TREE_CHANCE = 0.45;
const PLOT_TREE_CHANCE = 0.16;
const TREE_KINDS: readonly MapCover[] = ['tree', 'olive', 'pine', 'olive'];

export interface Tree {
  readonly kind: MapCover;
  /** A tree the town's own set draws (Egypt's palms): its piece, in place of `kind`. */
  readonly piece?: PieceId;
  readonly pick: number;
  readonly x: number;
  readonly y: number;
}

/** Egypt's canal: the street down the middle of the city (tile column i = CANAL_I), water from the back wall to the front. */
export const CANAL_I = 13;
/** Whether tile (i, j) is canal water in a town of `faction`. */
export const isCanal = (i: number, j: number, faction: TownPeople = 'crown'): boolean => townKit(faction).canal && i === CANAL_I && j >= 0 && j < CITY;


/** The city's trees, the same every time for `seed`: feet on the stage. Egypt's are date palms, and none grow in the canal. */
export function cityTrees(bare: readonly Plot[], seed: number, faction: TownPeople = 'crown'): Tree[] {
  const out: Tree[] = [];
  const kit = townKit(faction);
  // Palms are tall and thick-crowned: fewer of them make the same green.
  const thin = kit.treeDensity;
  const palms = kit.trees.filter((p) => kit.art[p] && kit.art[p] !== townKit('crown').art[p]);
  const onBare = (i: number, j: number): boolean => bare.some((p) => i > p.a && j > p.b && i < p.a + p.n - 1 && j < p.b + p.n - 1);
  for (let i = 0; i < CITY; i++) {
    for (let j = 0; j < CITY; j++) {
      if (isCanal(i, j, faction)) continue;
      const chance = (isGarden(i, j) ? TREE_CHANCE : onBare(i, j) ? PLOT_TREE_CHANCE : 0) * thin;
      if (cellRandom(seed, i, j, 1) >= chance) continue;
      const kind = TREE_KINDS[Math.floor(cellRandom(seed, i, j, 2) * TREE_KINDS.length)]!;
      const at = toStage(i + 0.5, j + 1);
      const pick = Math.floor(cellRandom(seed, i, j, 3) * MAP_COVER[kind].length);
      const piece = palms.length ? palms[Math.floor(cellRandom(seed, i, j, 4) * palms.length)] : undefined;
      out.push({ kind, ...(piece ? { piece } : {}), pick, x: Math.round(at.x), y: Math.round(at.y) });
    }
  }
  return out;
}
