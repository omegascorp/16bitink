import { evenLoadout } from '../logic/gear';
import type { MineSetup } from '../logic/mine';
import { STARTER } from '../logic/suit';
import { carve, type CarveSpec } from './carve';

/**
 * The goal-less test mine on Graphite (build order step 1–2): enough
 * ground to try drilling, all three grades, caves, every Graphite ore,
 * firedamp by the graphite seams and an old crew's unfired charges. It uses Graphite's own drill (Mk 1), so soil and
 * stone drill and deep rock is too hard, the three cases side by side.
 */
export const TEST_MINE: CarveSpec = {
  width: 56,
  height: 96,
  seed: 4101,
  surface: 12,
  stone: 14,
  deep: 54,
  caves: 8,
  caveFrom: 5,
  ores: [
    { ore: 'copper', from: 2, to: 30, veins: 10, size: [3, 6] },
    { ore: 'graphite', from: 6, to: 45, veins: 8, size: [2, 4] },
    { ore: 'galena', from: 14, to: 50, veins: 7, size: [3, 5] },
    { ore: 'quartz', from: 30, to: 80, veins: 5, size: [1, 2] },
    { ore: 'silver', from: 45, to: 82, veins: 5, size: [2, 4] },
  ],
  firedamp: 12,
  // An earlier crew's blasting line along a seam, never fired: three charges and a line charge.
  charges: [
    { kind: 'charge', at: [30, 20] },
    { kind: 'charge', at: [33, 20] },
    { kind: 'charge', at: [36, 20] },
    { kind: 'lineCharge', at: [42, 26] },
  ],
  landerCol: 7,
};

export const TILE_SIZE = 32;

export function testMineSetup(): MineSetup {
  return {
    terrain: carve(TEST_MINE),
    tileSize: TILE_SIZE,
    drill: { mk: 1, planet: 1 },
    loadout: evenLoadout(1),
    suit: STARTER,
    lander: { col: TEST_MINE.landerCol, row: TEST_MINE.surface },
  };
}
