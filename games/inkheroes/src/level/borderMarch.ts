import type { MapObject } from '../logic/objects';
import { BLACK_BANNER_LAND } from './blackBanner';
import { ASHFORD_LAND } from './chapter1';
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
const AT: Readonly<Record<'ashford' | 'thornwood' | 'blackBanner', Place>> = {
  ashford: { x: 0, y: 0 },
  thornwood: { x: 32, y: 0 },
  blackBanner: { x: 24, y: 32 },
};
const WORLD = { w: 72, h: 68 } as const;
/** Between the lands: open water (it is never walked, and costs nothing to draw). */
const SEA = '~';
/** Where the lands meet: the north road on from the old bridge, and the forest trail down to the Black Banner's vale. */
const CARVE: readonly (Place & { readonly ch: string })[] = [
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((x) => ({ x: AT.thornwood.x + x, y: 12, ch: '=' })),
  ...[4, 5, 6].map((x) => ({ x: AT.thornwood.x + x, y: 31, ch: 'g' })),
  ...[12, 13, 14].map((x) => ({ x: AT.blackBanner.x + x, y: AT.blackBanner.y, ch: 'g' })),
];
/** One seed for the whole land, so its woods and ground look the same in every part. */
const SEED = ASHFORD_LAND.seed;

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

/** A land's objects in the chapter's tiles; an id another land already uses gets the land's name in front. */
function placed(objects: readonly MapObject[], at: Place, prefix: string, taken: readonly MapObject[]): MapObject[] {
  const used = new Set(taken.map((o) => o.id));
  return objects.map((o) => ({ ...o, id: used.has(o.id) ? `${prefix}-${o.id}` : o.id, x: o.x + at.x, y: o.y + at.y }));
}
const at = <T extends Place>(p: T, a: Place): T => ({ ...p, x: p.x + a.x, y: p.y + a.y });
const heroAt = (h: HeroDef, a: Place): HeroDef => at(h, a);

export const ASHFORD: MapDef = { ...ASHFORD_LAND, rows: cut(32, 24), seed: SEED };

const thornwoodObjects = placed(THORNWOOD_LAND.objects, AT.thornwood, 'thornwood', ASHFORD.objects);

/** Part 2. Played fresh (with nothing won before it), Rowan waits on the north road at the forest's edge. */
export const THORNWOOD: MapDef = {
  ...THORNWOOD_LAND,
  intro: [
    'The ogres are gone and the old bridge is open again. The north road runs on east, into Thornwood forest.',
    'Across the next river, brigands and their cyclops chief have taken Thornwood, the timber town. Take it back from its garrison, and its dwellings will be yours to hire from.',
  ],
  rows: cut(72, 32),
  seed: SEED,
  town: ASHFORD.town,
  towns: (THORNWOOD_LAND.towns ?? []).map((t) => at(t, AT.thornwood)),
  hero: { ...heroAt(THORNWOOD_LAND.hero, AT.thornwood), x: AT.thornwood.x + 1, y: 12 },
  grant: { gold: 2500, wood: 5, ore: 5 },
  objects: [...ASHFORD.objects, ...thornwoodObjects],
};

const bannerTowns = BLACK_BANNER_LAND.towns ?? [];
const rival = BLACK_BANNER_LAND.rival!;

/** Part 3: Eudora opens its gates to Rowan, and the Black Banner rides. Played fresh, Rowan starts at Eudora's gate. */
export const BLACK_BANNER: MapDef = {
  ...BLACK_BANNER_LAND,
  intro: [
    'Thornwood is free, and its foresters show you a trail south through the trees, down to Eudora. Eudora has kept its gates shut against the Black Banner; it opens them to you, and it is yours to build in and hire from.',
    'Kassander of Korax flies a black banner with a red raven, and he serves no crown. He builds and hires as you do, takes the mines, and will come for your towns when he thinks he can win. Beat him to the lakelands, then take Korax.',
    'Build a Blacksmith: a Ballista and a First Aid Tent from it ride with your hero into every battle.',
  ],
  rows: cut(72, 68),
  seed: SEED,
  town: ASHFORD.town,
  towns: [
    ...THORNWOOD.towns!,
    { ...at(BLACK_BANNER_LAND.town, AT.blackBanner), garrison: BLACK_BANNER_LAND.town.garrison ?? [], owner: 'player' },
    ...bannerTowns.map((t) => at(t, AT.blackBanner)),
  ],
  hero: heroAt(BLACK_BANNER_LAND.hero, AT.blackBanner),
  rival: { ...rival, hero: heroAt(rival.hero, AT.blackBanner) },
  grant: { gold: 3000, wood: 5, ore: 5, mercury: 2, sulfur: 2, crystal: 2, gems: 2 },
  objects: [...THORNWOOD.objects, ...placed(BLACK_BANNER_LAND.objects, AT.blackBanner, 'banner', THORNWOOD.objects)],
};
