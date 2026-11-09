import type { ItemId } from './items';
import type { CreatureId } from './creatures';
import type { Amount, Resource } from './resources';
import type { SpellId } from './spells';

export type Owner = 'player' | 'neutral' | 'rival';

export type ObjectKind =
  | 'town' | 'mine' | 'pile' | 'chest' | 'campfire'
  | 'mercCamp' | 'watchtower' | 'standingStone' | 'shrine' | 'windmill' | 'stables' | 'spellbook'
  | 'monster'
  /** A piece of gear on the ground: a beaten monster's, left there while the hero's bag was full. */
  | 'item'
  /** Old carvings: +1000 experience, once for each hero (H3's Learning Stone). */
  | 'learningStone'
  /** A creature's home on the map: beaten guard, then it flies a flag and fills every week, to hire there (H3's outer dwelling). */
  | 'dwelling'
  /** A treasure keep: a ruin with a strong guard (a monster beside it) and a big prize inside (H3's creature bank). */
  | 'bank'
  /** A lair: a den or a tomb that sends out a new group of its creature each week it has none (src/logic/lairs.ts); never taken, never destroyed. */
  | 'lair'
  /** An Arena of Heroes: once a week it trains one Rare company of the visiting hero's up to Epic (src/logic/training.ts). */
  | 'arena'
  /** A chapter's legendary site (the Forge of Hephaestus, the Temple of Ra): once a week it trains one Epic company up to Legendary. */
  | 'sanctum';

/** How an outer dwelling is drawn (a map sprite key of the same name; src/scenes/map/pixelMapArt.ts falls back while one isn't drawn). */
export type DwellingLook = 'cyclopsCave' | 'griffinCliff' | 'titanForge' | 'crocodileMarsh' | 'lionRocks' | 'benbenHouse';
export const DWELLING_LOOKS: readonly DwellingLook[] = ['cyclopsCave', 'griffinCliff', 'titanForge', 'crocodileMarsh', 'lionRocks', 'benbenHouse'];
/** How a treasure keep is drawn: Othrys's ruined keep, or the Delta's mastaba (a tomb). */
export type BankLook = 'keep' | 'mastaba';
export const BANK_LOOKS: readonly BankLook[] = ['keep', 'mastaba'];
/** How a lair is drawn: a cave in a Greek hillside, or a half-buried Egyptian tomb (a map sprite key of the same name, src/scenes/map/pixelMapArt.ts falls back while one isn't drawn). */
export type LairLook = 'den' | 'tomb';
export const LAIR_LOOKS: readonly LairLook[] = ['den', 'tomb'];

/** How a legendary site is drawn and named: Othrys's forge of the smith god, or the Delta's temple of the sun (a map sprite key of the same name, src/scenes/map/pixelMapArt.ts falls back while one isn't drawn). */
export type SanctumLook = 'hephaestusForge' | 'raTemple';
export const SANCTUM_LOOKS: readonly SanctumLook[] = ['hephaestusForge', 'raTemple'];

/** A thing on the map. Fields beyond kind/x/y depend on the kind. */
export interface MapObject {
  readonly id: string;
  readonly kind: ObjectKind;
  readonly x: number;
  readonly y: number;
  /** Mine/pile/campfire/windmill: what it gives; pile: how much. */
  readonly resource?: Resource;
  readonly amount?: number;
  /** Chest: gold on offer (the XP choice is gold / 2 − 0, see CHEST). */
  readonly gold?: number;
  /** Monster: who and how many; dwelling: who it hires; lair: who it sends out, and its first group's size. */
  readonly creature?: CreatureId;
  readonly count?: number;
  /** Monster: others fighting beside it, as they stand (a boss's brood: they never grow). */
  readonly brood?: { readonly creature: CreatureId; readonly count: number };
  /** Monster: the piece it leaves when beaten. */
  readonly drop?: ItemId;
  /** Spellbook: the book itself; item: the piece lying there; bank: the piece in its prize. */
  readonly item?: ItemId;
  /** Shrine or spellbook: the spell it teaches. */
  readonly spell?: SpellId;
  /** Mines, dwellings and towns: who flies the flag. */
  readonly owner?: Owner;
  /** Dwelling: creatures that join its stock each week (the first visit finds a week's). */
  readonly growth?: number;
  /** Dwelling: creatures waiting to be hired. */
  readonly stock?: number;
  /** Dwelling: its picture; bank: 'keep' or 'mastaba'; lair: 'den' or 'tomb'; sanctum: its picture and name. */
  readonly look?: DwellingLook | BankLook | LairLook | SanctumLook;
  /** Learning stone: the heroes who have read it (each may once). */
  readonly visitedBy?: readonly string[];
  /** Bank: its prize, taken once its guard is beaten: gold and goods (and `item`, a piece of gear). */
  readonly prize?: Amount;
  /** Bank: emptied, it stands as a ruin. */
  readonly looted?: boolean;
  /** Weekly sites: the week last emptied (an arena or a sanctum: last trained); lair: the week its last group came out. */
  readonly week?: number;
  /** Lair: the day its part opened, which its groups grow from. */
  readonly since?: number;
  /** Picked up or beaten: gone from the map. */
  readonly gone?: boolean;
}

/** Things that vanish once visited. */
export const PICKUPS: readonly ObjectKind[] = ['pile', 'chest', 'campfire', 'spellbook', 'item'];
/** Sites drawn a building tall: they also block the tile behind their own. */
const TALL: readonly ObjectKind[] = ['mine', 'mercCamp', 'watchtower', 'windmill', 'stables', 'dwelling', 'bank', 'lair', 'arena'];

/**
 * Tiles an object blocks besides its own (x, y). As in H3 a hero never
 * walks onto or through an object: it stops beside one and visits it
 * from there (see stepHero).
 */
export function objectFootprint(o: Pick<MapObject, 'kind' | 'x' | 'y'>): { x: number; y: number }[] {
  return TALL.includes(o.kind) ? [{ x: o.x, y: o.y - 1 }] : [];
}
export const ONCE_PER_HERO: readonly ObjectKind[] = ['mercCamp', 'watchtower', 'standingStone', 'shrine'];

/** Mines' daily output. */
export const MINE_OUTPUT: Readonly<Record<Resource, number>> = { gold: 1000, wood: 2, ore: 2, mercury: 1, sulfur: 1, crystal: 1, gems: 1 };

export const MINE_NAMES: Readonly<Record<Resource, string>> = {
  gold: 'Gold Mine', wood: 'Sawmill', ore: 'Ore Pit', mercury: 'Alchemist’s Lab', sulfur: 'Sulfur Dune', crystal: 'Crystal Cavern', gems: 'Gem Pond',
};

/** Treasure chest offers (H3): gold, or this much experience instead. */
export const CHEST_XP: Readonly<Record<number, number>> = { 1000: 500, 1500: 1000, 2000: 1500 };

export const SITE_NAMES: Readonly<Record<ObjectKind, string>> = {
  town: 'Town', mine: 'Mine', pile: 'Pile', chest: 'Treasure Chest', campfire: 'Campfire',
  mercCamp: 'Mercenary Camp', watchtower: 'Old Watchtower', standingStone: 'Standing Stone', shrine: 'Wayside Shrine',
  windmill: 'Windmill', stables: 'Stables', spellbook: 'Spellbook Altar', monster: 'Monster', item: 'Gear on the ground',
  learningStone: 'Learning Stone', dwelling: 'Dwelling', bank: 'Treasure Keep', lair: 'Lair',
  arena: 'Arena of Heroes', sanctum: 'Legendary Site',
};
/** Each legendary site's name on the map. */
export const SANCTUM_NAMES: Readonly<Record<SanctumLook, string>> = { hephaestusForge: 'Forge of Hephaestus', raTemple: 'Temple of Ra' };
/** Each lair's name on the map. */
export const LAIR_NAMES: Readonly<Record<LairLook, string>> = { den: 'Den', tomb: 'Tomb' };

/** Each outer dwelling's name on the map. */
export const DWELLING_NAMES: Readonly<Record<DwellingLook, string>> = {
  cyclopsCave: 'Cyclops Cave', griffinCliff: 'Griffin Cliff', titanForge: 'The Titans’ Forge',
  crocodileMarsh: 'Crocodile Marsh', lionRocks: 'Lion Rocks', benbenHouse: 'The House of the Benben',
};
/** Each treasure keep's name on the map. */
export const BANK_NAMES: Readonly<Record<BankLook, string>> = { keep: 'Treasure Keep', mastaba: 'Mastaba' };
export const bankName = (o: Pick<MapObject, 'look'>): string => BANK_NAMES[o.look === 'mastaba' ? 'mastaba' : 'keep'];

/** Experience a learning stone gives (before Learning). */
export const LEARNING_XP = 1000;

/** The tiles right round a town's gate (x, y), which no hero has ever been able to stand on. */
const TOWN_CORE: readonly (readonly [number, number])[] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0]];
/**
 * The rest of the ground its picture stands on. The picture is a diamond with the gate halfway up its front-left wall, so
 * it spreads to the right of the gate: the city, its right, front and back towers, and the back walls.
 */
const TOWN_WALLS: readonly (readonly [number, number])[] = [[2, 0], [3, 0], [4, 0], [2, -1], [3, -1], [4, -1], [1, 1], [0, -2], [1, -2], [2, -2], [1, -3]];

const offsetBy = (x: number, y: number, tiles: readonly (readonly [number, number])[]): { x: number; y: number }[] =>
  tiles.map(([dx, dy]) => ({ x: x + dx, y: y + dy }));

/** Inside the town proper. A hero is never here, even in a game saved before the walls blocked their whole picture. */
export function townCore(x: number, y: number): { x: number; y: number }[] {
  return offsetBy(x, y, TOWN_CORE);
}

/** Tiles a town blocks besides its gate (x, y): all the ground under its picture, so nothing stands behind its walls. */
export function townFootprint(x: number, y: number): { x: number; y: number }[] {
  return offsetBy(x, y, [...TOWN_CORE, ...TOWN_WALLS]);
}
