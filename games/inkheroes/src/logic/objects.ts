import type { ItemId } from './items';
import type { CreatureId } from './creatures';
import type { Resource } from './resources';
import type { SpellId } from './spells';

export type Owner = 'player' | 'neutral' | 'rival';

export type ObjectKind =
  | 'town' | 'mine' | 'pile' | 'chest' | 'campfire'
  | 'mercCamp' | 'watchtower' | 'standingStone' | 'shrine' | 'windmill' | 'stables'
  | 'monster';

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
  /** Monster: who and how many. */
  readonly creature?: CreatureId;
  readonly count?: number;
  /** Monster: the piece it leaves when beaten. */
  readonly drop?: ItemId;
  /** Shrine: the spell it teaches. */
  readonly spell?: SpellId;
  /** Mines and towns: who flies the flag. */
  readonly owner?: Owner;
  /** Weekly sites: the week last emptied. */
  readonly week?: number;
  /** Picked up or beaten: gone from the map. */
  readonly gone?: boolean;
}

/** Things that vanish once visited. */
export const PICKUPS: readonly ObjectKind[] = ['pile', 'chest', 'campfire'];
/** Sites drawn a building tall: they also block the tile behind their own. */
const TALL: readonly ObjectKind[] = ['mine', 'mercCamp', 'watchtower', 'windmill', 'stables'];

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
  windmill: 'Windmill', stables: 'Stables', monster: 'Monster',
};

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
