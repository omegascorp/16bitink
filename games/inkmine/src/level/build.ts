import type { Profile } from '../logic/economy';
import { Ladders } from '../logic/ladders';
import type { MineSetup } from '../logic/mine';
import { drillFor, jetFor, suitSpecFor } from '../logic/marks';
import { storeCapacity, winchKeeps } from '../logic/ship';
import { inside, setTile, TILE, type Terrain } from '../logic/terrain';
import { applyWorld, droppedBag, type WorldSave } from '../logic/worldSave';
import { carve } from './carve';
import type { PlanetDef, WorldDef } from './types';

export const TILE_SIZE = 32;

/** A world's ground as the builder carves it: from its site, with each item in rock set into its grade, nothing else in its tile. */
export function buildGround(def: WorldDef): Terrain {
  const t = carve(def.site);
  for (const item of def.items) {
    const [x, depth] = item.at;
    const y = def.site.surface + depth;
    if (!inside(t, x, y) || !item.grade) continue;
    setTile(t, x, y, item.grade === 'stone' ? TILE.stone : TILE.soil);
  }
  return t;
}

/** A world ready to play: the ground with the save's changes on it, and what it was before them. */
export interface BuiltWorld {
  readonly setup: MineSetup;
  /** The ground's tiles as carved, before any digging: what the save is measured against. */
  readonly base: Uint8Array;
}

/**
 * Everything a session on a planet starts from: its world, carved and then
 * changed by the save (dug ground, ladders, items taken), and the player's
 * gear and ship. The prospector starts at the lander.
 */
export function buildWorld(planet: PlanetDef, p: Profile, save: WorldSave | null): BuiltWorld {
  const def = planet.world;
  const terrain = buildGround(def);
  const base = terrain.tiles.slice();
  const ladders = new Ladders(terrain);
  if (save) applyWorld(terrain, ladders, save);
  const taken = new Set(save?.taken ?? []);
  return {
    base,
    setup: {
      terrain,
      tileSize: TILE_SIZE,
      drill: drillFor(p.gear, planet.number),
      loadout: p.gear,
      suit: suitSpecFor(p.gear),
      jet: jetFor(p.gear.jetpack),
      placedLadders: ladders,
      winchKeeps: winchKeeps(p.ship),
      lander: { col: def.site.landerCol, row: def.site.surface },
      items: def.items.filter((it) => !taken.has(it.id)),
      cargo: p.cargo,
      stores: p.stores,
      storesCap: storeCapacity(p.ship),
      bag: p.suit,
      fuels: planet.fuels,
      dropped: droppedBag(terrain.width, save?.bag),
      pieces: save?.pieces,
      outpost: def.outpost === undefined ? undefined : { col: def.outpost, row: def.site.surface },
    },
  };
}
