import type { PlanetDef } from '../src/level/types';

/**
 * Planet 4, Talus (chapter 4, the full game): a red world at the warm edge
 * of the habitable zone, losing the last of its water (docs/inkmine-design.md,
 * "Talus"). Its seas dried to white flats of salt and gypsum; red mesas
 * stand up out of them, capped with hard stone, with slopes of loose rock
 * that fell from their cliffs heaped at their feet. Loose rock falls when
 * what holds it up is dug out (logic/rocks.ts). Dust storms sweep the flats
 * (logic/storm.ts). It's a planet, not a moon: twice the way round of
 * Graphite or Mycel.
 * SERVER-ONLY data: shipped to owners by /api/content/inkmine (content/paid.ts).
 *
 * The prospector arrives with Brine's Mk 3 drill, a step behind: the soil
 * costs double and the stone won't break.
 *
 * Going east from the lander at column 40 (depths are rows below the flat
 * the lander stands on; a mesa rises above it, so its top is a negative
 * depth):
 *
 * - The Landing Flat (470–70, round the join): gypsum crusts and desert
 *   roses near the surface (the air and the tanks' water), sulfur in the
 *   gypsum beds below (the cell), nitre crusting the top, native copper.
 *   Nothing lives near the lander.
 * - The Anvil (78–96): a small mesa, 9 high; hematite spherules weather
 *   out of the loose rock at its feet, and boulder crabs sit among it.
 * - The Wash (104–132): a dry gully, a few barrel plants and dew beetles.
 * - The big mesa (140–196): 15 high, with the search party's ship lying
 *   nose-first in the loose rock at its west foot, its hatch buried at
 *   column 136.
 * - The Skate Flats (204–258): open crust where sand skates cruise.
 * - The Shard (262–284), a third mesa.
 * - The Barrel Garden (292–356): stands of barrel plants, the water they
 *   hold, dew beetles among them, a few skates.
 * - The Teeth (364–392): two small buttes.
 * - The Throne (400–456): the biggest mesa, 18 high. Deep under it, in
 *   the stone (the Mk 4 drill's), the Rockslide sleeps at the west end of
 *   a long cave, with an opal bed at the east end.
 * - Underground everywhere: hematite through the stone, opal deep, and a
 *   little water in sealed pockets far down.
 *
 * The ground: soil (sandstone) to about 20 m under the flats, stone to
 * about 100 m, deep rock below.
 */
export const PLANET_4: PlanetDef = {
  number: 4,
  name: 'Talus',
  blurb: 'A red world losing the last of its water: salt flats where its seas were, mesas heaped with loose rock, and dust storms.',
  // Rust sandstone, red-brown stone, under a dusty peach sky.
  style: {
    soil: '#c98f66', stone: '#93533d', deep: '#6a3a2e', bedrock: '#311f1e', grain: '#6d3a2a', shade: '#4d2b28', tunnel: '#f1e1cd', sky: '#f3dcc4',
  },
  signature: 'hematite',
  world: {
    id: 'talus',
    version: 2,
    site: {
      // 512 columns round: a whole number of ground chunks (16) and hatch tiles (4).
      width: 512, height: 224, wrap: true, seed: 4004, surface: 34, landerCol: 40,
      stone: 20, deep: 100, caves: 96, caveFrom: 6,
      // The dry seabeds lie flat.
      roll: 0.45,
      mesas: [
        { cols: [78, 96], height: 9, cap: 2, talus: 6 },
        { cols: [140, 196], height: 15, cap: 3, talus: 9 },
        { cols: [262, 284], height: 11, cap: 2, talus: 7 },
        { cols: [364, 372], height: 7, cap: 2, talus: 4 },
        { cols: [382, 392], height: 8, cap: 2, talus: 5 },
        { cols: [400, 456], height: 18, cap: 3, talus: 10 },
      ],
      ores: [
        // Gypsum crusts the flats, the air's and the tanks' water; selenite grows deeper down.
        { ore: 'gypsum', from: 0, to: 10, veins: 40, size: [3, 5], cols: [14, 70] },
        { ore: 'gypsum', from: 0, to: 12, veins: 72, size: [2, 4] },
        { ore: 'gypsum', from: 22, to: 80, veins: 38, size: [2, 3] },
        // Sulfur in the gypsum beds, the cell's fuel; some close round the lander.
        { ore: 'sulfur', from: 3, to: 18, veins: 16, size: [2, 3], cols: [20, 64] },
        { ore: 'sulfur', from: 4, to: 40, veins: 80, size: [2, 3] },
        // Nitre crusting the top of the flats, thickest on the Skate Flats.
        { ore: 'nitre', from: 0, to: 4, veins: 40, size: [2, 4] },
        { ore: 'nitre', from: 0, to: 3, veins: 16, size: [2, 4], cols: [204, 258] },
        // Native copper: in the sandstone, and in veins through the stone.
        { ore: 'copper', from: 4, to: 19, veins: 48, size: [2, 3] },
        { ore: 'copper', from: 4, to: 16, veins: 10, size: [2, 3], cols: [24, 70] },
        { ore: 'copper', from: 22, to: 90, veins: 58, size: [2, 4] },
        // Hematite spherules weathering out near the surface, richest round the mesas; and all through the stone.
        { ore: 'hematite', from: 1, to: 14, veins: 60, size: [2, 3] },
        { ore: 'hematite', from: -12, to: 10, veins: 30, size: [2, 4], cols: [70, 104] },
        { ore: 'hematite', from: -12, to: 10, veins: 40, size: [2, 4], cols: [126, 210] },
        { ore: 'hematite', from: -16, to: 10, veins: 44, size: [2, 4], cols: [356, 466] },
        { ore: 'hematite', from: 22, to: 96, veins: 96, size: [2, 4] },
        // Opal: a little in the deep sandstone, more in the stone, and a bed past the Rockslide.
        { ore: 'opal', from: 12, to: 19, veins: 18, size: [1, 2] },
        { ore: 'opal', from: 22, to: 80, veins: 40, size: [1, 3] },
        { ore: 'opal', from: 70, to: 80, veins: 10, size: [2, 3], cols: [436, 446] },
        // The last of the water, far down.
        { ore: 'water', from: 50, to: 150, veins: 32, size: [2, 3] },
      ],
      // Methane is scarce on a dry world: a little, by the sulfur, where microbes live.
      firedamp: 10,
      seam: 'sulfur',
      waterPockets: { count: 48, from: 40, to: 150, size: [2, 4] },
      // The Rockslide's cave, deep under the Throne.
      rooms: [{ at: [428, 74], w: 28, h: 7 }],
      // Barrel plants: a few in the Wash and out on the flats, stands of them in the Barrel Garden.
      plants: [
        { clusters: 4, size: 3, tall: [1, 2], cols: [104, 132] },
        { clusters: 14, size: 4, tall: [1, 3], cols: [292, 356] },
        { clusters: 3, size: 2, tall: [1, 2], cols: [204, 258] },
        { clusters: 3, size: 2, tall: [1, 2], cols: [458, 500] },
      ],
    },
    searchShip: { at: [136, -1] },
    // The Rockslide, asleep at the west end of its cave; opal past it at the east end.
    giant: { at: [418, 77], kind: 'rockslide' },
    weather: 'dust',
    creatures: [
      // Boulder crabs among the loose rock under every mesa (none by the search ship's hatch).
      { kind: 'rockcrab', count: 4, from: -8, to: 1, cols: [70, 104] },
      { kind: 'rockcrab', count: 5, from: -14, to: 1, cols: [176, 212] },
      { kind: 'rockcrab', count: 4, from: -10, to: 1, cols: [254, 292] },
      { kind: 'rockcrab', count: 8, from: -16, to: 1, cols: [358, 468] },
      // Sand skates under the open crust, away from the lander.
      { kind: 'skate', count: 7, from: 0, to: 0, cols: [204, 258] },
      { kind: 'skate', count: 3, from: 0, to: 0, cols: [292, 356] },
      { kind: 'skate', count: 3, from: 0, to: 0, cols: [470, 500] },
      // Dew beetles among the plants.
      { kind: 'beetle', count: 3, from: 0, to: 0, cols: [104, 132] },
      { kind: 'beetle', count: 8, from: 0, to: 0, cols: [292, 356] },
      { kind: 'beetle', count: 2, from: 0, to: 0, cols: [204, 258] },
    ],
    items: [],
  },
  arrival: {
    subtitle: 'the red world',
    paragraphs: [
      "The lander comes down on a dry seabed, white with salt and cracked into plates as far as the haze. Red mesas stand up out of it like islands that lost their sea. The dust settling on the visor is rust: iron oxide, as fine as flour.",
      "The suit won't open: thin carbon dioxide. There's no water to drink or split, but the white crust is gypsum, and baked it gives up the water locked inside it. Yellow sulfur grows in it, for the cell.",
      "Your drill is a step behind here: the soil costs double and the stone won't break. Mind the slopes under the mesas: they're loose rock, and dig under it and it comes down. At the foot of the big mesa to the east, the ship of your own kind is waiting.",
    ],
    button: 'Step out',
  },
};
