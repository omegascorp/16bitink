import type { MapObject } from '../logic/objects';
import { BLACK_BANNER_LAND } from './blackBanner';
import { ASHFORD_LAND } from './chapter1';
import { BORDER_RECRUITS } from './recruits';
import { OTHRYS_LAND } from './othrys';
import { THORNWOOD_LAND } from './thornwood';
import type { HeroDef, MapDef } from './types';

/**
 * Chapter 1, the Border March, as one land that grows as it is played:
 * Ashford's hills in the north-west, Thornwood forest east of the old
 * bridge, and the Black Banner's lakes and hills south of the forest. Each
 * part of the chapter is the land cut to what is open by then (every cut
 * starts at the top-left corner, so a tile keeps its place from part to
 * part); winning a part opens the next around the hero, who rides straight
 * on with everything the chapter has won so far (src/logic/chapter.ts).
 */

interface Place {
  readonly x: number;
  readonly y: number;
}

/** Where each land lies in the chapter. */
const AT: Readonly<Record<'ashford' | 'thornwood' | 'blackBanner' | 'othrys', Place>> = {
  ashford: { x: 0, y: 0 },
  thornwood: { x: 32, y: 0 },
  blackBanner: { x: 24, y: 32 },
  // East of everything won by the Black Banner, the whole height of the land.
  othrys: { x: 72, y: 0 },
};
const WORLD = { w: 72, h: 68 } as const;
/** Between the lands: open water (it is never walked, and costs nothing to draw). */
const SEA = '~';
/** The forest trail: from the south road, west of the river, down through the gap to the vale's own road. */
const TRAIL_X = AT.thornwood.x + 6;
const TRAIL: readonly Place[] = [
  ...[26, 27, 28, 29, 30].map((y) => ({ x: TRAIL_X + 1, y })),
  ...[30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40].map((y) => ({ x: TRAIL_X, y })),
];
/** Where the lands meet: the north road on from the old bridge, and the forest trail down to the Black Banner's vale. */
const CARVE: readonly (Place & { readonly ch: string })[] = [
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((x) => ({ x: AT.thornwood.x + x, y: 12, ch: '=' })),
  ...[4, 5, 6].map((x) => ({ x: AT.thornwood.x + x, y: 31, ch: 'g' })),
  ...[12, 13, 14].map((x) => ({ x: AT.blackBanner.x + x, y: AT.blackBanner.y, ch: 'g' })),
  ...TRAIL.map((p) => ({ ...p, ch: '#' })),
  // Othrys's three ways in (part 4), at the old land's east edge: the coast road on from Thornwood's north-east, the ford east of Korax, the sand of the pass from the Black Banner's south-east corner.
  { x: 70, y: 7, ch: '=' }, { x: 71, y: 7, ch: '=' },
  { x: 71, y: 40, ch: '=' }, { x: 71, y: 41, ch: '=' },
  { x: 70, y: 64, ch: 's' }, { x: 71, y: 64, ch: 's' }, { x: 71, y: 65, ch: 's' },
];
/** One seed for the whole land, so its woods and ground look the same in every part. */
const SEED = ASHFORD_LAND.seed;

/** The chapter's whole land once Othrys is open: 128 × 68. */
const OTHRYS_WORLD = { w: AT.othrys.x + OTHRYS_LAND.rows[0]!.length, h: OTHRYS_LAND.rows.length } as const;

const WORLD_ROWS: readonly string[] = (() => {
  const grid = Array.from({ length: WORLD.h }, () => Array.from({ length: WORLD.w }, () => SEA));
  for (const [land, at] of [[ASHFORD_LAND, AT.ashford], [THORNWOOD_LAND, AT.thornwood], [BLACK_BANNER_LAND, AT.blackBanner]] as const) {
    land.rows.forEach((row, y) => [...row].forEach((ch, x) => { grid[at.y + y]![at.x + x] = ch; }));
  }
  for (const c of CARVE) grid[c.y]![c.x] = c.ch;
  return grid.map((r) => r.join(''));
})();

/** The land cut to its first `w` columns and `h` rows. */
const cut = (w: number, h: number): string[] => WORLD_ROWS.slice(0, h).map((r) => r.slice(0, w));

/** The land with Othrys laid east of it. */
const OTHRYS_ROWS: readonly string[] = (() => {
  const grid = Array.from({ length: OTHRYS_WORLD.h }, (_, y) => [...(WORLD_ROWS[y] ?? '').padEnd(OTHRYS_WORLD.w, SEA)]);
  OTHRYS_LAND.rows.forEach((row, y) => [...row].forEach((ch, x) => { grid[AT.othrys.y + y]![AT.othrys.x + x] = ch; }));
  return grid.map((r) => r.join(''));
})();

/** A land's objects in the chapter's tiles; an id another land already uses gets the land's name in front. */
function placed(objects: readonly MapObject[], at: Place, prefix: string, taken: readonly MapObject[]): MapObject[] {
  const used = new Set(taken.map((o) => o.id));
  return objects.map((o) => ({ ...o, id: used.has(o.id) ? `${prefix}-${o.id}` : o.id, x: o.x + at.x, y: o.y + at.y }));
}
const at = <T extends Place>(p: T, a: Place): T => ({ ...p, x: p.x + a.x, y: p.y + a.y });
const heroAt = (h: HeroDef, a: Place): HeroDef => at(h, a);

/** Part 1: its Tavern hires nobody yet (an empty list of its own, so the roster isn't offered). */
export const ASHFORD: MapDef = { ...ASHFORD_LAND, rows: cut(32, 24), seed: SEED, recruits: [] };

const thornwoodObjects = placed(THORNWOOD_LAND.objects, AT.thornwood, 'thornwood', ASHFORD.objects);

/** Part 2. Played fresh (with nothing won before it), Rowan waits on the north road at the forest's edge. */
export const THORNWOOD: MapDef = {
  ...THORNWOOD_LAND,
  brief: 'Take Thornwood back from the brigands. A spellbook waits on the altar by the road. Ianthe waits at your Tavern: a second hero for 2500 gold.',
  story: 'part-thornwood',
  rows: cut(72, 32),
  seed: SEED,
  town: ASHFORD.town,
  towns: (THORNWOOD_LAND.towns ?? []).map((t) => at(t, AT.thornwood)),
  hero: { ...heroAt(THORNWOOD_LAND.hero, AT.thornwood), x: AT.thornwood.x + 1, y: 12 },
  grant: { gold: 2500, wood: 5, ore: 5 },
  recruits: BORDER_RECRUITS,
  objects: [...ASHFORD.objects, ...thornwoodObjects],
};

const bannerTowns = BLACK_BANNER_LAND.towns ?? [];
const rival = BLACK_BANNER_LAND.rival!;

/**
 * Part 3: the Black Banner rides, and Eudora waits somewhere south of the
 * forest for whoever reaches it first: its gates open to Rowan, or
 * Kassander takes it. Only the trail's way through the trees is shown, so
 * the town has to be found. Played fresh, Rowan starts at Eudora's gate.
 */
export const BLACK_BANNER: MapDef = {
  ...BLACK_BANNER_LAND,
  brief: "Find Eudora, somewhere south down the forest trail, before Kassander's riders do. Then take Korax and hunt him down.",
  story: 'part-blackBanner',
  rows: cut(72, 68),
  seed: SEED,
  town: ASHFORD.town,
  towns: [
    ...THORNWOOD.towns!,
    { ...at(BLACK_BANNER_LAND.town, AT.blackBanner), garrison: BLACK_BANNER_LAND.town.garrison ?? [], owner: 'player', waits: true },
    ...bannerTowns.map((t) => at(t, AT.blackBanner)),
  ],
  hero: heroAt(BLACK_BANNER_LAND.hero, AT.blackBanner),
  rival: { ...rival, hero: heroAt(rival.hero, AT.blackBanner) },
  grant: { gold: 3000, wood: 5, ore: 5, mercury: 2, sulfur: 2, crystal: 2, gems: 2 },
  recruits: BORDER_RECRUITS,
  // Won, the chapter rides on east to Othrys: the narrator tells of Kassander's master.
  won: 'blackBanner-won',
  opening: {
    text: 'The forest trail south, into the lands beyond',
    way: [{ x: TRAIL_X, y: 30 }, { x: TRAIL_X, y: 41 }],
  },
  objects: [...THORNWOOD.objects, ...placed(BLACK_BANNER_LAND.objects, AT.blackBanner, 'banner', THORNWOOD.objects)],
};

type TownSpec = NonNullable<MapDef['towns']>[number];
const othrysAt = <T extends Place>(p: T): T => at(p, AT.othrys);
/** Where each way into Othrys starts: its first tiles past the old land's edge (the coast road, the ford, the pass). */
const WAYS_IN: readonly Place[] = [{ x: 73, y: 7 }, { x: 73, y: 40 }, { x: 73, y: 64 }];

/**
 * Part 4, the chapter's last: Othrys, east of the land won so far, where
 * Lykaon of Lykosoura rides for the Titans' forge. Three ways lead in and
 * none is forced; the opening shows only where each starts. The towns of
 * the parts before are ours. Played fresh, Rowan waits east of Korax, by
 * the ford.
 */
export const OTHRYS: MapDef = {
  ...OTHRYS_LAND,
  story: 'part-othrys',
  rows: OTHRYS_ROWS,
  seed: SEED,
  town: ASHFORD.town,
  towns: [
    // Played fresh, our old towns keep their garrisons on the map, as a player who rode on would leave them (ridden on, a town keeps what it had).
    ...THORNWOOD.towns!.map((t) => ({ ...t, owner: 'player' as const })),
    ...BLACK_BANNER.towns!.slice(THORNWOOD.towns!.length).map((t): TownSpec => {
      const { waits: _waits, ...town } = t;
      return { ...town, owner: 'player' };
    }),
    // Iolkos, the port: both sides race for it from the part's third night.
    { ...othrysAt(OTHRYS_LAND.town as TownSpec), race: true },
    ...(OTHRYS_LAND.towns ?? []).map(othrysAt),
  ],
  hero: { ...othrysAt(OTHRYS_LAND.hero), x: AT.blackBanner.x + 42, y: AT.blackBanner.y + 9 },
  rival: { ...OTHRYS_LAND.rival!, hero: othrysAt(OTHRYS_LAND.rival!.hero) },
  // The Crown's grant, for the chapter's last and biggest part.
  grant: { gold: 4000, wood: 10, ore: 10, mercury: 3, sulfur: 3, crystal: 3, gems: 3 },
  // No recruits of its own: from Othrys on the Taverns offer two of the Greek roster a week, to both sides (Ianthe among them if not hired in part 2).
  // Won, the narrator tells of the Titans' oath, then the chapter's ending.
  won: 'othrys-won',
  opening: { text: 'Three ways into Othrys: the coast road, the ford, the mountain pass', way: WAYS_IN, apart: true },
  // Played fresh, Kassander's old mines by Korax fly the rival's banner, Lykaon's now, a ride from Rowan (ridden on into, the land keeps what was won).
  objects: [...BLACK_BANNER.objects, ...placed(OTHRYS_LAND.objects, AT.othrys, 'othrys', BLACK_BANNER.objects)],
};
