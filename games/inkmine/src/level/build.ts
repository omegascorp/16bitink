import { placeCreatures } from '../logic/creatures';
import { hasTool } from '../logic/tools';
import { fuelsAt } from '../logic/worlds';
import type { Profile } from '../logic/economy';
import { Ladders } from '../logic/ladders';
import type { MineSetup } from '../logic/mine';
import { drillFor, jetFor, suitSpecFor } from '../logic/marks';
import { storeCapacity, winchKeeps } from '../logic/ship';
import { inside, setTile, TILE, type Terrain } from '../logic/terrain';
import { applyWorld, droppedBag, type WorldSave } from '../logic/worldSave';
import { roofRows } from '../art/ground';
import { Water } from '../logic/water';
import { carveSite, type CarvedSite } from './carve';
import type { PlanetDef, WorldDef } from './types';

export const TILE_SIZE = 32;

/** A world's ground as the builder carves it: from its site, with each item in rock set into its grade, nothing else in its tile. */
export function buildGround(def: WorldDef): Terrain {
  return buildSite(def).terrain;
}

/** The ground as `buildGround`, with its water. */
export function buildSite(def: WorldDef): CarvedSite {
  const site = carveSite(def.site);
  const t = site.terrain;
  for (const item of def.items) {
    const [x, depth] = item.at;
    const y = def.site.surface + depth;
    if (!inside(t, x, y) || !item.grade) continue;
    setTile(t, x, y, item.grade === 'stone' ? TILE.stone : TILE.soil);
    site.water[y * t.width + x] = 0;
  }
  return site;
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
  const site = buildSite(def);
  const terrain = site.terrain;
  const base = terrain.tiles.slice();
  const roof = roofRows(terrain);
  // On the ground as carved, so they stand in the same places every landing, however it's been dug.
  const creatures = placeCreatures(terrain, def.creatures ?? [], def.site.surface, TILE_SIZE, def.site.seed, def.giant && [def.giant.at[0], def.site.surface + def.giant.at[1]]);
  const ladders = new Ladders(terrain);
  if (save) applyWorld(terrain, ladders, save);
  const taken = new Set(save?.taken ?? []);
  // Water as it stood when saved; else as carved, with whatever's been dug since poured into.
  const wet = site.seaRow !== null || site.water.some((v) => v === 1);
  let water: Water | null = null;
  if (wet && save?.wet) water = Water.saved(terrain, site.seaRow, save.wet, site.dry, roof);
  else if (wet) {
    water = Water.carved(terrain, site.seaRow, site.water, site.dry, roof);
    if (save) {
      const dug: [number, number][] = [];
      for (let i = 0; i < save.dug.length; i++) if (save.dug[i]) dug.push([i % terrain.width, Math.floor(i / terrain.width)]);
      water.opened(dug);
      water.settle();
    }
  }
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
      fuels: fuelsAt(planet.world.id),
      dropped: droppedBag(terrain.width, save?.bag),
      pieces: save?.pieces,
      outpost: def.outpost === undefined ? undefined : { col: def.outpost, row: def.site.surface },
      creatures,
      armed: hasTool(p, 'pulse'),
      water,
      rebreather: hasTool(p, 'rebreather'),
    },
  };
}
