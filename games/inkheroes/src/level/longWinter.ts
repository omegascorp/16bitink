import type { MapObject } from '../logic/objects';
import { BLOODAXE_LAND } from './bloodaxe';
import { HALOGALAND_LAND } from './halogaland';
import { HLADIR_LAND } from './hladir';
import type { HeroDef, MapDef } from './types';
import { HEID_RECRUIT, UPPSALA_LAND } from './uppsala';

/**
 * Chapter 3, the Long Winter (docs/inkheroes-design.md, "Chapter 3: The Long
 * Winter"), as one land that grows as it is played, as the Two Lands in
 * twoLands.ts: Hladir first, at the head of its frozen fjord. Each later
 * part is laid into the land beside the parts before (`stitch`, as
 * twoLands.ts does), cut from the top-left corner so a tile keeps its place
 * from part to part (their objects `placed` as twoLands.ts does), and src/logic/chapter.ts rides the hero on into them.
 * Hladir's fjord opens west to the sea, so the land grows south (Uppsala,
 * over the mountains) and east; the far north (part 4) can be laid as the
 * Delta was, round the land won so far.
 * Part of the full game: never imported by the game's client code
 * (content/paid.ts serves it; test/twoLands.test.ts checks).
 */

interface Place {
  readonly x: number;
  readonly y: number;
}

/** Where each land lies in the chapter. */
const AT: Readonly<Record<'hladir' | 'uppsala' | 'bloodaxe' | 'halogaland', Place>> = {
  hladir: { x: 0, y: 0 },
  // South of Hladir, over the fells along its south edge (the pass at PASS).
  uppsala: { x: 0, y: 24 },
  // South of Uppsala, over its south fells (the pass at PASS_SOUTH): Avaldsnes on the western sea, Kaupang on its frozen bay in the east.
  bloodaxe: { x: 0, y: 54 },
  // The far north, laid round the land won (as the Delta was): over the sea east of Hladir and Uppsala and on east, north of Kaupang's bay.
  halogaland: { x: 32, y: 0 },
};
/** Between the lands: open water (it is never walked, and costs nothing to draw). */
const SEA = '~';
/** One seed for the whole land, so its ground looks the same in every part. */
const SEED = HLADIR_LAND.seed;

/** The lands laid on one sea `w` × `h`, the later over the earlier, then single tiles changed (`patch`). */
function stitch(lands: readonly (readonly [MapDef, Place])[], w: number, h: number, patch: readonly (Place & { ch: string })[] = []): string[] {
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => SEA));
  for (const [land, at] of lands) {
    land.rows.forEach((row, y) => [...row].forEach((ch, x) => { grid[at.y + y]![at.x + x] = ch; }));
  }
  for (const p of patch) grid[p.y]![p.x] = p.ch;
  return grid.map((r) => r.join(''));
}

/** Part 1: Hervor holds Hladir; Hrimgrimnir sits on the ice at the fjord's mouth. Won, the chapter rides on south over the mountains (the narrator tells of Uppsala). Its own tiles only: the land south is cut off, as Nekhen's is in twoLands.ts. */
export const HLADIR: MapDef = {
  ...HLADIR_LAND,
  rows: stitch([[HLADIR_LAND, AT.hladir]], 32, 24),
  seed: SEED,
  won: 'hladir-won',
};

/** A land's objects in the chapter's tiles. */
const placed = (objects: readonly MapObject[], at: Place): MapObject[] => objects.map((o) => ({ ...o, x: o.x + at.x, y: o.y + at.y }));
const at = <T extends Place>(p: T, a: Place): T => ({ ...p, x: p.x + a.x, y: p.y + a.y });

/** The pass over the mountains: Hladir's south fells opened where Uppsala's own pass meets them. */
const PASS: readonly (Place & { ch: string })[] = [{ x: 19, y: 23, ch: 'n' }, { x: 20, y: 23, ch: 'n' }];
/** Parts 1 and 2: Hladir and Uppsala under it, 32 × 54. */
const SOUTH_ROWS = stitch([[HLADIR_LAND, AT.hladir], [UPPSALA_LAND, AT.uppsala]], 32, 54, PASS);

/** Where the way south begins: Hladir's south shore, the pass, the road down to the river. */
const WAY_SOUTH: readonly Place[] = [{ x: 19, y: 21 }, { x: 19, y: AT.uppsala.y }, { x: 19, y: AT.uppsala.y + 6 }];

type TownSpec = NonNullable<MapDef['towns']>[number];

/**
 * Part 2: over the mountains to Uppsala, where the king's mounds have opened
 * and the dead walk. Uppsala's ring fort waits for Hervor as an ally (Heid
 * at its Tavern); the Novice's Rune Staff lies on the temple's altar behind
 * its Barrow Kings, and Aun the Old holds the temple: the goal. Played
 * fresh, Hervor waits at the top of the pass. Won, the chapter rides on to
 * the Bloodaxe (the narrator tells of Eirik at Avaldsnes).
 */
export const UPPSALA: MapDef = {
  ...UPPSALA_LAND,
  rows: SOUTH_ROWS,
  seed: SEED,
  town: HLADIR.town,
  towns: [{ ...at(UPPSALA_LAND.town as TownSpec, AT.uppsala), garrison: UPPSALA_LAND.town.garrison ?? [], waits: true }],
  hero: at<HeroDef>(UPPSALA_LAND.hero, AT.uppsala),
  // The jarl's grant, as Pharaoh's on chapter 2's second part.
  grant: { gold: 2500, wood: 5, ore: 5 },
  recruits: [HEID_RECRUIT],
  opening: { text: 'The road south over the mountains, toward Uppsala', way: WAY_SOUTH },
  won: 'uppsala-won',
  objects: [...HLADIR.objects, ...placed(UPPSALA_LAND.objects, AT.uppsala)],
};

/** The second pass: Uppsala's south fells opened where the Bloodaxe's own pass meets them, by the river's last bend. */
const PASS_SOUTH: readonly (Place & { ch: string })[] = [{ x: 18, y: 52 }, { x: 19, y: 52 }, { x: 18, y: 53 }, { x: 19, y: 53 }].map((p) => ({ ...p, ch: 'n' }));
/** Parts 1 to 3: Hladir, Uppsala under it and the Bloodaxe under that, 40 × 86 (the sea east of the first two, never walked). */
const BLOODAXE_ROWS = stitch([[HLADIR_LAND, AT.hladir], [UPPSALA_LAND, AT.uppsala], [BLOODAXE_LAND, AT.bloodaxe]], 40, 86, [...PASS, ...PASS_SOUTH]);

/** Where the way on south begins: below the temple's yard, Uppsala's south pass, the road down to the crossroads (not Kaupang or Avaldsnes: they have to be found). */
const WAY_ON_SOUTH: readonly Place[] = [{ x: 19, y: 48 }, { x: 19, y: AT.bloodaxe.y }, { x: 19, y: AT.bloodaxe.y + 8 }];

/**
 * Played fresh from the Bloodaxe on, Hladir stands as a rider leaves it
 * (the halls, walls and the first upgrades of lines 1–4, as the balance
 * bot's Hladir when it rides on from Uppsala), as the Red Land's Nekhen.
 */
const HLADIR_RIDDEN = {
  ...HLADIR.town,
  built: [...new Set([...HLADIR.town.built, 'townHall', 'fort', 'citadel', 'meadHall', 'archeryRange', 'griffinTower', 'barracks', 'mageGuild1', 'cityHall', 'marketplace', 'storehouse', 'guardhouse2', 'archeryRange2', 'griffinTower2', 'barracks2', 'monastery'])],
} as MapDef['town'];
/** A town of the parts before, ours: no longer waiting for us. */
const ours = ({ waits: _waits, ...t }: TownSpec): TownSpec => ({ ...t, owner: 'player' });
/** The old land's mines, flying our banner on a fresh start as a rider leaves them (ridden on, the land keeps what was won). */
const flagged = (objects: readonly MapObject[]): MapObject[] => objects.map((o) => (o.kind === 'mine' && o.owner !== 'player' ? { ...o, owner: 'player' } : o));

/**
 * Part 3: over Uppsala's south fells to the Bloodaxe. Eirik rides from
 * Avaldsnes, his ring fort on the western sea; from the part's third night
 * he races us for Kaupang, the market town on the frozen bay (never handed
 * over), whose Shipwright sells the Ram. Goal: Avaldsnes taken and Eirik
 * beaten. No recruits of its own: the Taverns offer two of the Norse roster
 * a week (Eirik and Gunnhild never). Played fresh, Hervor comes down from
 * the pass. Won, the chapter rides on north to Halogaland (the narrator
 * tells of Eirik fled to Gunnhild).
 */
export const BLOODAXE: MapDef = {
  ...BLOODAXE_LAND,
  rows: BLOODAXE_ROWS,
  seed: SEED,
  town: HLADIR_RIDDEN,
  towns: [
    // Uppsala is ours (played fresh, its gates open as a rider leaves it).
    { ...ours(UPPSALA.towns![0] as TownSpec), garrison: [] },
    // Kaupang: both race for it from the part's third night; it is never handed over.
    { ...at(BLOODAXE_LAND.town as TownSpec, AT.bloodaxe), race: true },
    ...(BLOODAXE_LAND.towns ?? []).map((t) => at(t, AT.bloodaxe)),
  ],
  hero: at<HeroDef>(BLOODAXE_LAND.hero, AT.bloodaxe),
  rival: { ...BLOODAXE_LAND.rival!, hero: at<HeroDef>(BLOODAXE_LAND.rival!.hero, AT.bloodaxe) },
  // The jarls' grant, for the part with a rival king.
  grant: { gold: 3000, wood: 5, ore: 5, mercury: 2, sulfur: 2, crystal: 2, gems: 2 },
  opening: { text: 'The road south over the fells, toward the western sea', way: WAY_ON_SOUTH },
  won: 'bloodaxe-won',
  objects: [...flagged(UPPSALA.objects), ...placed(BLOODAXE_LAND.objects, AT.bloodaxe)],
};

/**
 * Halogaland's three ways in, cut through the old land's edge: Hladir's east
 * pines, Uppsala's east pines (both onto the frozen sound), and the fells
 * north of Kaupang's bay (its ice runs on north into the sound).
 */
const HALOGALAND_CUTS: readonly (Place & { ch: string })[] = [
  { x: 31, y: 7, ch: 'n' },
  { x: 31, y: 38, ch: 'n' },
  ...[54, 55, 56].flatMap((y) => [{ x: 36, y, ch: 'i' }, { x: 37, y, ch: 'i' }]),
];
/** Part 4: Halogaland laid first and the land won so far over it (its west strip lies under nothing but the sound), 72 × 86. */
const HALOGALAND_ROWS = stitch([[HALOGALAND_LAND, AT.halogaland], [HLADIR_LAND, AT.hladir], [UPPSALA_LAND, AT.uppsala], [BLOODAXE_LAND, AT.bloodaxe]], AT.halogaland.x + HALOGALAND_LAND.rows[0]!.length, 86,
  [...PASS, ...PASS_SOUTH, ...HALOGALAND_CUTS]);

/** Where each way into Halogaland starts: its first tile past the old land's edge (from Hladir, from Uppsala, up the ice from Kaupang). */
const WAYS_NORTH: readonly Place[] = [{ x: 33, y: 7 }, { x: 33, y: 38 }, { x: 37, y: 52 }];

/** Played fresh from Halogaland on, Hladir stands as a rider leaves the Bloodaxe: the Castle, the Shipwright, the Shield Hall and the second upgrades too. */
const HLADIR_RIDDEN_NORTH = {
  ...HLADIR_RIDDEN,
  built: [...new Set([...HLADIR_RIDDEN.built, 'castle', 'treasury', 'blacksmith', 'tiltyard', 'monastery2', 'guardhouse3', 'archeryRange3', 'griffinTower3', 'barracks3'])],
} as MapDef['town'];

const haloAt = <T extends Place>(p: T): T => at(p, AT.halogaland);

/**
 * Part 4, the chapter's last: Halogaland, the far north, where Gunnhild sings
 * the winter from Bjarkoy and Steigen, Eirik her captain if he lived (he
 * fled north from the Bloodaxe). Three ways lead in over the frozen sound and
 * none is forced; the opening shows only where each starts. The towns of
 * the parts before are ours. Played fresh, Hervor comes up the ice from
 * Kaupang's bay. Its win ends the chapter (no `won` line of its own): the
 * narrator tells the chapter's ending, the sunrise.
 */
export const HALOGALAND: MapDef = {
  ...HALOGALAND_LAND,
  rows: HALOGALAND_ROWS,
  seed: SEED,
  town: HLADIR_RIDDEN_NORTH,
  towns: [
    // Played fresh, our old towns are ours as a rider leaves them (ridden on, a town keeps what it had).
    ...BLOODAXE.towns!.map((t): TownSpec => {
      const { race: _race, waits: _waits, ...town } = t;
      return { ...town, owner: 'player', garrison: [] };
    }),
    // Trondenes in the north and Vagar in the south: both sides race for them from the part's third night.
    { ...haloAt(HALOGALAND_LAND.town as TownSpec), race: true },
    ...(HALOGALAND_LAND.towns ?? []).map(haloAt),
  ],
  hero: haloAt<HeroDef>(HALOGALAND_LAND.hero),
  rival: {
    ...HALOGALAND_LAND.rival!,
    hero: haloAt<HeroDef>(HALOGALAND_LAND.rival!.hero),
    captains: (HALOGALAND_LAND.rival!.captains ?? []).map((c) => haloAt<HeroDef>(c)),
  },
  // The jarls' grant, for the chapter's last and biggest part.
  grant: { gold: 4000, wood: 10, ore: 10, mercury: 3, sulfur: 3, crystal: 3, gems: 3 },
  // No recruits of its own: the Taverns offer two of the Norse roster a week (Eirik and Gunnhild never to ours; Hervor and Heid never to hers).
  opening: { text: 'Three ways north over the frozen sound: from Hladir, from Uppsala, up the ice from Kaupang', way: WAYS_NORTH, apart: true },
  objects: [...flagged(BLOODAXE.objects), ...placed(HALOGALAND_LAND.objects, AT.halogaland)],
};

/** The chapter's parts, in order (what content/paid.ts serves). */
export const LONG_WINTER_PARTS: readonly MapDef[] = [HLADIR, UPPSALA, BLOODAXE, HALOGALAND];
