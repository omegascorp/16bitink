import type { MapObject } from '../logic/objects';
import { ABU_LAND } from './abu';
import { NEKHEN_LAND } from './nekhen';
import { RED_LAND_LAND } from './redLand';
import { TWO_LANDS_RECRUITS } from './recruits';
import type { HeroDef, MapDef } from './types';

/**
 * Chapter 2, the Two Lands, as one land that grows as it is played (as the
 * Border March in borderMarch.ts): Nekhen on the Upper Nile first, then Abu
 * at the cataract south of it, the Nile running on from one into the other;
 * then the Red Land east of Abu (part 6), each cut from the
 * top-left corner so a tile keeps its place from part to part, and
 * src/logic/chapter.ts rides the hero on into them. Part of the full game:
 * never imported by the game's client code (content/paid.ts serves it).
 */

interface Place {
  readonly x: number;
  readonly y: number;
}

/** Where each land lies in the chapter. */
const AT: Readonly<Record<'nekhen' | 'abu' | 'redLand', Place>> = {
  nekhen: { x: 0, y: 0 },
  // South of Nekhen, its river under Nekhen's: the river road runs on down the west bank.
  abu: { x: 0, y: 24 },
  // East of Abu, through a pass in the dunes of Abu's east bank.
  redLand: { x: 40, y: 24 },
};
/** Between the lands: open water (it is never walked, and costs nothing to draw). */
const SEA = '~';
/** One seed for the whole land, so its ground looks the same in every part. */
const SEED = NEKHEN_LAND.seed;

/** The lands laid on one sea `w` × `h`, the later over the earlier, then single tiles changed (`patch`). */
function stitch(lands: readonly (readonly [MapDef, Place])[], w: number, h: number, patch: readonly (Place & { ch: string })[] = []): string[] {
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => SEA));
  for (const [land, at] of lands) {
    land.rows.forEach((row, y) => [...row].forEach((ch, x) => { grid[at.y + y]![at.x + x] = ch; }));
  }
  for (const p of patch) grid[p.y]![p.x] = p.ch;
  return grid.map((r) => r.join(''));
}

/** Parts 4 and 5: the Nile's land, 40 × 56. */
const NILE_ROWS = stitch([[NEKHEN_LAND, AT.nekhen], [ABU_LAND, AT.abu]], 40, 56);

/** Where the way east through Abu's dunes opens on part 6 (its rows match the Red Land's own gap in its west edge). */
const PASS_ROWS = [16, 17, 18] as const;
/** Part 6: the Red Land laid east of Abu, the dunes between opened at the pass, 80 × 56. */
const RED_ROWS = stitch([[NEKHEN_LAND, AT.nekhen], [ABU_LAND, AT.abu], [RED_LAND_LAND, AT.redLand]], 80, 56,
  PASS_ROWS.map((y) => ({ x: AT.redLand.x - 1, y: AT.redLand.y + y, ch: 's' })));

/** A land cut to its first `w` columns and `h` rows. */
const cut = (rows: readonly string[], w: number, h: number): string[] => rows.slice(0, h).map((r) => r.slice(0, w));

/** A land's objects in the chapter's tiles. */
const placed = (objects: readonly MapObject[], at: Place): MapObject[] => objects.map((o) => ({ ...o, x: o.x + at.x, y: o.y + at.y }));
const at = <T extends Place>(p: T, a: Place): T => ({ ...p, x: p.x + a.x, y: p.y + a.y });

/** Part 4: Neferet holds Nekhen, on the west bank. */
export const NEKHEN: MapDef = { ...NEKHEN_LAND, rows: cut(NILE_ROWS, 32, 24), seed: SEED };

/** Where the way south begins: Nekhen's west bank running on into the river road. */
const WAY_SOUTH: readonly Place[] = [{ x: 14, y: 21 }, { x: 13, y: AT.abu.y + 1 }, { x: 12, y: AT.abu.y + 6 }];

/**
 * Part 5: up the river road to the cataract, where Abu stands on its island.
 * Played fresh, Neferet waits at the head of the road. The opening shows
 * where the road south begins, not Abu: the fort has to be found.
 */
export const ABU: MapDef = {
  ...ABU_LAND,
  rows: cut(NILE_ROWS, 40, 56),
  seed: SEED,
  town: NEKHEN.town,
  towns: [at(ABU_LAND.town as NonNullable<MapDef['towns']>[number], AT.abu)],
  hero: at<HeroDef>(ABU_LAND.hero, AT.abu),
  // Pharaoh's grant, as the Crown's on chapter 1's second part.
  grant: { gold: 2500, wood: 5, ore: 5 },
  recruits: TWO_LANDS_RECRUITS,
  opening: { text: 'The river road south, toward the First Cataract', way: WAY_SOUTH },
  // Won, the chapter rides on east: the narrator tells of the lord in the Red Land.
  won: 'abu-won',
  objects: [...NEKHEN.objects, ...placed(ABU_LAND.objects, AT.abu)],
};

type TownSpec = NonNullable<MapDef['towns']>[number];

/** Where the desert road begins: Abu's east bank, through the pass, the first tiles of the road (not Gebtu: it has to be found). */
const WAY_EAST: readonly Place[] = [{ x: 30, y: AT.redLand.y + 17 }, { x: AT.redLand.x, y: AT.redLand.y + 17 }, { x: AT.redLand.x + 4, y: AT.redLand.y + 17 }];

/**
 * Part 6: across Abu's east bank and through the dunes into the Red Land,
 * where Sethi holds Nubt and both race for Gebtu. Played fresh, Neferet
 * comes through the pass and Abu is already ours. The chapter's last part.
 */
export const RED_LAND: MapDef = {
  ...RED_LAND_LAND,
  rows: RED_ROWS,
  seed: SEED,
  town: NEKHEN.town,
  towns: [
    { ...(ABU.towns![0] as TownSpec), owner: 'player', garrison: [] },
    // Gebtu: both race for it from the part's third night; it is never handed over.
    { ...(at(RED_LAND_LAND.town as TownSpec, AT.redLand)), race: true },
    ...(RED_LAND_LAND.towns ?? []).map((t) => at(t, AT.redLand)),
  ],
  hero: at<HeroDef>(RED_LAND_LAND.hero, AT.redLand),
  rival: { ...RED_LAND_LAND.rival!, hero: at<HeroDef>(RED_LAND_LAND.rival!.hero, AT.redLand) },
  // Pharaoh's grant: gold and a little of everything.
  grant: { gold: 3000, wood: 5, ore: 5, mercury: 2, sulfur: 2, crystal: 2, gems: 2 },
  recruits: TWO_LANDS_RECRUITS,
  opening: { text: 'The desert road east, into the Red Land', way: WAY_EAST },
  objects: [...ABU.objects, ...placed(RED_LAND_LAND.objects, AT.redLand)],
};

/** The chapter's parts, in order (what content/paid.ts serves). */
export const TWO_LANDS_PARTS: readonly MapDef[] = [NEKHEN, ABU, RED_LAND];
