import type { MapObject } from '../logic/objects';
import { ABU_LAND } from './abu';
import { DELTA_LAND } from './delta';
import { NEKHEN_LAND } from './nekhen';
import { RED_LAND_LAND } from './redLand';
import { TWO_LANDS_RECRUITS } from './recruits';
import type { HeroDef, MapDef } from './types';

/**
 * Chapter 2, the Two Lands, as one land that grows as it is played (as the
 * Border March in borderMarch.ts): Nekhen on the Upper Nile first, then Abu
 * at the cataract south of it, the Nile running on from one into the other;
 * then the Red Land east of Abu (part 3), and last the Delta (part 4), laid
 * in the sea north of the Red Land and on round its east. Each part is cut
 * from the top-left corner so a tile keeps its place from part to part, and
 * src/logic/chapter.ts rides the hero on into them. Part of the full game:
 * never imported by the game's client code (content/paid.ts serves it).
 */

interface Place {
  readonly x: number;
  readonly y: number;
}

/** Where each land lies in the chapter. */
const AT: Readonly<Record<'nekhen' | 'abu' | 'redLand' | 'delta', Place>> = {
  nekhen: { x: 0, y: 0 },
  // South of Nekhen, its river under Nekhen's: the river road runs on down the west bank.
  abu: { x: 0, y: 24 },
  // East of Abu, through a pass in the dunes of Abu's east bank.
  redLand: { x: 40, y: 24 },
  // The north: the sea east of Nekhen and north of the Red Land, then on down east of the Red Land (an L round the land won so far).
  delta: { x: 32, y: 0 },
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

/** Parts 1 and 2: the Nile's land, 40 × 56. */
const NILE_ROWS = stitch([[NEKHEN_LAND, AT.nekhen], [ABU_LAND, AT.abu]], 40, 56);

/** Where the way east through Abu's dunes opens on part 3 (its rows match the Red Land's own gap in its west edge). */
const PASS_ROWS = [16, 17, 18] as const;
/** Part 3: the Red Land laid east of Abu, the dunes between opened at the pass, 80 × 56. */
const RED_ROWS = stitch([[NEKHEN_LAND, AT.nekhen], [ABU_LAND, AT.abu], [RED_LAND_LAND, AT.redLand]], 80, 56,
  PASS_ROWS.map((y) => ({ x: AT.redLand.x - 1, y: AT.redLand.y + y, ch: 's' })));

/** The pass through Abu's dunes, as part 3 opened it. */
const PASS = PASS_ROWS.map((y) => ({ x: AT.redLand.x - 1, y: AT.redLand.y + y, ch: 's' }));
/** The Delta's three ways in, cut through the old land's edge: Nekhen's east desert, the head of the Red Land's north wadi, Nubt's basin to the east. */
const DELTA_CUTS: readonly (Place & { ch: string })[] = [
  { x: 31, y: 21, ch: 's' }, { x: 31, y: 22, ch: 's' },
  { x: AT.redLand.x + 16, y: AT.redLand.y, ch: 's' }, { x: AT.redLand.x + 17, y: AT.redLand.y, ch: 's' },
  { x: AT.redLand.x + 39, y: AT.redLand.y + 8, ch: 's' }, { x: AT.redLand.x + 39, y: AT.redLand.y + 9, ch: 's' },
];
/** Part 4: the Delta laid first and the land won so far over it (the Delta's hole is theirs), 112 × 56. */
const DELTA_ROWS = stitch([[DELTA_LAND, AT.delta], [NEKHEN_LAND, AT.nekhen], [ABU_LAND, AT.abu], [RED_LAND_LAND, AT.redLand]], AT.delta.x + DELTA_LAND.rows[0]!.length, 56,
  [...PASS, ...DELTA_CUTS]);

/** A land cut to its first `w` columns and `h` rows. */
const cut = (rows: readonly string[], w: number, h: number): string[] => rows.slice(0, h).map((r) => r.slice(0, w));

/** A land's objects in the chapter's tiles. */
const placed = (objects: readonly MapObject[], at: Place): MapObject[] => objects.map((o) => ({ ...o, x: o.x + at.x, y: o.y + at.y }));
const at = <T extends Place>(p: T, a: Place): T => ({ ...p, x: p.x + a.x, y: p.y + a.y });

/** Part 1: Neferet holds Nekhen, on the west bank. */
export const NEKHEN: MapDef = { ...NEKHEN_LAND, rows: cut(NILE_ROWS, 32, 24), seed: SEED };

/** Where the way south begins: Nekhen's west bank running on into the river road. */
const WAY_SOUTH: readonly Place[] = [{ x: 14, y: 21 }, { x: 13, y: AT.abu.y + 1 }, { x: 12, y: AT.abu.y + 6 }];

/**
 * Part 2: up the river road to the cataract, where Abu stands on its island.
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
 * Played fresh from the Red Land on, Nekhen stands as a rider leaves it (the
 * balance bot's Nekhen when it rides on from Abu, Nov 9): with Sethi a lord
 * who plays from his first day, a bare Nekhen and the old land's mines
 * unflagged lost every fresh run (docs/inkheroes-design.md, "Part 3 as
 * built", Sethi on the lord mind).
 */
const NEKHEN_RIDDEN = {
  ...NEKHEN.town,
  built: [
    'villageHall', 'tavern', 'guardhouse', 'townHall', 'archeryRange', 'griffinTower', 'fort', 'citadel', 'barracks', 'mageGuild1', 'templeOsiris',
    'blacksmith', 'guardhouse2', 'archeryRange2', 'griffinTower2', 'barracks2', 'marketplace', 'cityHall', 'stables', 'storehouse',
  ],
} as MapDef['town'];
/** The old land's mines (an old lord's too), flying our banner on a fresh start as a rider leaves them (ridden on, the land keeps what was won). */
const flagged = (objects: readonly MapObject[]): MapObject[] => objects.map((o) => (o.kind === 'mine' && o.owner !== 'player' ? { ...o, owner: 'player' } : o));

/**
 * Part 3: across Abu's east bank and through the dunes into the Red Land,
 * where Sethi holds Nubt and both race for Gebtu. Played fresh, Neferet
 * comes through the pass and Abu is already ours. Won, the chapter rides
 * on north into the Delta.
 */
export const RED_LAND: MapDef = {
  ...RED_LAND_LAND,
  rows: RED_ROWS,
  seed: SEED,
  town: NEKHEN_RIDDEN,
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
  // No recruits of its own: from the Red Land on the Taverns offer two of Egypt's roster a week, to both sides (Paser among them if not hired in part 2).
  opening: { text: 'The desert road east, into the Red Land', way: WAY_EAST },
  // Won, the chapter rides on north: the narrator tells of the Hyksos king in the Delta.
  won: 'redLand-won',
  objects: [...flagged(ABU.objects), ...placed(RED_LAND_LAND.objects, AT.redLand)],
};

const deltaAt = <T extends Place>(p: T): T => at(p, AT.delta);
/** Where each way into the Delta starts: its first tile past the old land's edge (from Nekhen, up the north wadi, out of Nubt's basin). */
const WAYS_NORTH: readonly Place[] = [{ x: AT.delta.x + 1, y: 21 }, { x: AT.redLand.x + 16, y: AT.redLand.y - 2 }, { x: AT.redLand.x + 41, y: AT.redLand.y + 8 }];

/**
 * Part 4, the chapter's last: the Delta, north of the Red Land and east of
 * Nekhen, where Apepi of Avaris rides for Iunu and the Benben stone. Three
 * ways lead in and none is forced; the opening shows only where each
 * starts. The towns of the parts before are ours. Played fresh, Neferet
 * waits at the head of the Red Land's north wadi.
 */
export const DELTA: MapDef = {
  ...DELTA_LAND,
  rows: DELTA_ROWS,
  seed: SEED,
  town: NEKHEN_RIDDEN,
  towns: [
    // Played fresh, our old towns keep their garrisons on the map, as a player who rode on would leave them (ridden on, a town keeps what it had).
    ...RED_LAND.towns!.map((t): TownSpec => {
      const { race: _race, ...town } = t;
      return { ...town, owner: 'player' };
    }),
    // Men-nefer, the White Walls: both sides race for it from the part's third night.
    { ...deltaAt(DELTA_LAND.town as TownSpec), race: true },
    ...(DELTA_LAND.towns ?? []).map(deltaAt),
  ],
  hero: { ...deltaAt(DELTA_LAND.hero), x: AT.redLand.x + 17, y: AT.redLand.y + 2 },
  rival: { ...DELTA_LAND.rival!, hero: deltaAt(DELTA_LAND.rival!.hero) },
  // Pharaoh's grant, for the chapter's last and biggest part.
  grant: { gold: 4000, wood: 10, ore: 10, mercury: 3, sulfur: 3, crystal: 3, gems: 3 },
  // No recruits of its own: the Taverns offer two of Egypt's roster a week, to both sides (Apepi never to ours: a story villain).
  opening: { text: 'Three ways into the Delta: past the White Walls, up the north wadi, the desert road behind Nubt', way: WAYS_NORTH, apart: true },
  // Its win ends the chapter (no `won` line of its own): the narrator tells the chapter's ending, the Two Lands one.
  objects: [...flagged(RED_LAND.objects), ...placed(DELTA_LAND.objects, AT.delta)],
};

/** The chapter's parts, in order (what content/paid.ts serves). */
export const TWO_LANDS_PARTS: readonly MapDef[] = [NEKHEN, ABU, RED_LAND, DELTA];
