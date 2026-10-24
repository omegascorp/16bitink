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
  /** Shrine: the spell it teaches. */
  readonly spell?: SpellId;
  /** Mines and towns: who flies the flag. */
  readonly owner?: Owner;
  /** Weekly sites: the week last emptied. */
  readonly week?: number;
  /** Picked up or beaten: gone from the map. */
  readonly gone?: boolean;
}

/** Sites a hero walks onto and keeps standing on (pickups vanish instead). */
export const PICKUPS: readonly ObjectKind[] = ['pile', 'chest', 'campfire'];
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

/** Tiles a town covers besides its gate (x, y): three wide, two deep, gate in the middle of the front row. */
export function townFootprint(x: number, y: number): { x: number; y: number }[] {
  return [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0]].map(([dx, dy]) => ({ x: x + dx!, y: y + dy! }));
}
