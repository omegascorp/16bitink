import type { Profile } from '../logic/economy';
import type { MineSetup } from '../logic/mine';
import { drillFor, jetFor, suitSpecFor } from '../logic/marks';
import { laddersFor, winchKeeps } from '../logic/ship';
import { inside, setTile, TILE, type Terrain } from '../logic/terrain';
import { carve } from './carve';
import type { LevelDef, PlanetDef } from './types';

export const TILE_SIZE = 32;

/** A level's map: carved from its site, with each item in rock set into its grade, nothing else in its tile. */
export function buildSite(def: LevelDef): Terrain {
  const t = carve(def.site);
  for (const item of def.items) {
    const [x, depth] = item.at;
    const y = def.site.surface + depth;
    if (!inside(t, x, y) || !item.grade) continue;
    setTile(t, x, y, item.grade === 'stone' ? TILE.stone : TILE.soil);
  }
  return t;
}

/** Everything a landing starts from: the map, and the player's gear and ship. */
export function levelSetup(def: LevelDef, planet: PlanetDef, p: Profile): MineSetup {
  return {
    terrain: buildSite(def),
    tileSize: TILE_SIZE,
    drill: drillFor(p.gear, planet.number),
    loadout: p.gear,
    suit: suitSpecFor(p.gear),
    jet: jetFor(p.gear.jetpack),
    ladders: laddersFor(p.ship),
    winchKeeps: winchKeeps(p.ship),
    lander: { col: def.site.landerCol, row: def.site.surface },
    items: def.items,
    cargo: p.cargo,
    bag: p.suit,
  };
}
