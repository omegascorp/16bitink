import { GRAPHITE } from '../art/palette';
import { OUTPOST } from '../logic/story';
import type { PlanetDef } from './types';

/**
 * Planet 1, Graphite (chapter 1, free): a grey moon of soft dark rock, one
 * small world you can walk all the way round (spec, "Graphite"). The lander
 * crash-landed at column 64.
 *
 * Regions, going east from the lander (the hand-placed parts came from the
 * first five landing sites, before the world was made one):
 *
 * - The crash site, round the lander: copper-rich soil, a cave, and a vault
 *   walled in stone with firedamp in its wall as the way in (the Pack).
 * - The fissure, to the east: a passage two tiles across through the stone,
 *   down to a cave at 58 m where the Drill's blueprint lies. The starter
 *   drill can follow it all the way.
 * - The helmet vault, further east: walled in deep rock under a soil plug in
 *   the stone, so it needs the new drill.
 * - The old charges, east again: an earlier crew's line of charges over a
 *   cave they never opened, silver round it.
 * - The lead seams, west of the lander: graphite and its firedamp, and a
 *   cave holding the Cell's blueprint.
 * - The jetpack vault, deep under the middle: stone walls, a soil door.
 * - The Lamplighters' outpost, on the crater's far rim at column 180: flat
 *   ground, kept clear of caves (story.ts).
 *
 * Water ice for life support lies in pockets all round, thickest in the
 * crater's shadow just west of the lander.
 *
 * The ground: soil to about 20 m, stone to about 90 m, deep rock below that
 * for a later drill (Graphite is worth a visit with better gear).
 */
export const PLANET_1: PlanetDef = {
  number: 1,
  name: 'Graphite',
  blurb: 'A grey moon of soft dark rock, pencil lead in its seams.',
  style: GRAPHITE,
  signature: 'graphite',
  // Graphite is in battery anodes; water ice is what real moon bases plan to make air from.
  fuels: { cell: 'graphite', air: 'ice' },
  world: {
    id: 'graphite',
    // 2: water ice added (it moved the random firedamp a little). 3: the outpost's ground flattened.
    version: 3,
    site: {
      // 256 columns round: a whole number of ground chunks (16) and hatch tiles (4), so both repeat cleanly at the join.
      width: 256, height: 160, wrap: true, seed: 1001, surface: 12, landerCol: 64, flats: [OUTPOST.col, OUTPOST.col + OUTPOST.domes],
      stone: 20, deep: 90, caves: 46, caveFrom: 6,
      ores: [
        // The crash site is rich in copper; there's a little everywhere.
        { ore: 'copper', from: 1, to: 16, veins: 34, size: [3, 5], cols: [36, 120] },
        { ore: 'copper', from: 1, to: 20, veins: 26, size: [2, 4] },
        // Graphite gathers in the lead seams west of the lander, and runs thinner all round.
        { ore: 'graphite', from: 4, to: 22, veins: 30, size: [2, 4], cols: [8, 58] },
        { ore: 'graphite', from: 6, to: 60, veins: 34, size: [2, 4] },
        { ore: 'galena', from: 6, to: 40, veins: 44, size: [2, 4] },
        { ore: 'quartz', from: 20, to: 80, veins: 34, size: [1, 2] },
        { ore: 'silver', from: 38, to: 88, veins: 26, size: [2, 4] },
        // Water ice, for life support: pockets near the surface all round, thicker in the crater's shadow west of the lander, and some deep down where trips are long.
        { ore: 'ice', from: 2, to: 18, veins: 34, size: [2, 4] },
        { ore: 'ice', from: 1, to: 12, veins: 14, size: [3, 5], cols: [40, 62] },
        { ore: 'ice', from: 25, to: 95, veins: 30, size: [2, 3] },
      ],
      firedamp: 34,
      rooms: [
        // A cave just east of the crash.
        { at: [90, 10], w: 8, h: 3 },
        // The Cell's cave in the lead seams.
        { at: [28, 12], w: 9, h: 3 },
        // The cave at the foot of the fissure.
        { at: [150, 58], w: 9, h: 3 },
        // The cave under the old charges.
        { at: [210, 42], w: 10, h: 4 },
      ],
      // The fissure: from the soil down through the stone to its cave.
      tunnels: [[[140, 12], [140, 20], [147, 29], [139, 38], [146, 47], [153, 53], [150, 58]]],
      vaults: [
        // The Pack, by the crash: walled in stone, the starter drill's way in is the firedamp in its west wall.
        { at: [100, 9], w: 4, h: 3, wall: 'stone' },
        // The Helmet: walled in deep rock under a soil plug in the stone.
        { at: [180, 34], w: 4, h: 3, wall: 'deep', door: 'top' },
        // The Jetpack, deep: stone walls, a soil door on the west.
        { at: [118, 80], w: 4, h: 3, wall: 'stone', door: 'left' },
      ],
      // Two pockets in the Pack vault's west wall, one behind the other.
      pockets: [[98, 10], [99, 10]],
      charges: [
        { kind: 'charge', at: [206, 37] },
        { kind: 'charge', at: [210, 37] },
        { kind: 'charge', at: [214, 37] },
      ],
    },
    items: [
      { id: 'crash-vault-pack', kind: 'blueprint', at: [101, 11], blueprint: 'pack-1', drill: 0 },
      { id: 'seams-cave-cell', kind: 'blueprint', at: [28, 13], blueprint: 'cell-1', drill: 0 },
      { id: 'fissure-cave-drill', kind: 'blueprint', at: [150, 59], blueprint: 'drill-1', drill: 0 },
      { id: 'deep-vault-helmet', kind: 'blueprint', at: [181, 36], blueprint: 'helmet-1', drill: 1 },
      { id: 'stone-vault-jetpack', kind: 'blueprint', at: [119, 82], blueprint: 'jetpack-1', drill: 1 },
    ],
    outpost: OUTPOST.col,
  },
};
