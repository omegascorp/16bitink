import type { PlanetDef } from '../src/level/types';

/**
 * Planet 3, Brine (chapter 3, the full game): a sea world a little bigger
 * than the prospector's own, its sea purple with floating microbes, dotted
 * with islands of salt-crusted basalt (docs/inkmine-design.md, "Brine").
 * Under the islands and the seabed, sediment over basalt, full of water.
 * SERVER-ONLY data: shipped to owners by /api/content/inkmine (content/paid.ts).
 *
 * The prospector arrives with Mycel's Mk 2 drill, a step behind: the
 * sediment costs double and the basalt won't break, until the Tidesingers
 * show you how they bore stone (the Mk 3 drill) for the copper you bring.
 *
 * Going east from the lander at column 48 (every depth here is rows below
 * the islands' ground, `surface`; the sea stands 2 below it, and the seabed
 * lies 7 to 18 below it):
 *
 * - The Landing Isle (24–76): fresh water floating under the island (an
 *   island's rain lies on the sea water under it as a lens), halite beds,
 *   copper washed into the sediment and nodules: everything the first
 *   trips need.
 * - The drowned village (90–132): the Tidesingers' old homes under the
 *   shelf, joined to the seabed and flooded: their broken tools lie in them,
 *   three in the sediment and two in cellars cut into the basalt (Brine's
 *   drill).
 * - The reef (140–162): it rises to 2 m under the sea, with the Aster
 *   crew's craft sunk on its top at column 150.
 * - The Tidesingers' reef (196–222, 30–40 m down): a flooded cave reached
 *   through a fissure in the seabed at column 200, their air bell for the
 *   crew in its upper corner.
 * - The pearl banks (230–310): old shell beds deep in the sediment and the
 *   top of the basalt.
 * - Salt Isle (300–340): halite and fresh water again.
 * - The Leviathan's cave (158–193, 83–92 m down): the biggest of the
 *   flooded caves sealed in the basalt, under the reef. The Leviathan
 *   sleeps at its west end; the crew's drive crystal lies at its east end,
 *   where it fell, far enough off to dig down to quietly.
 * - The underworld, all round: more flooded caves sealed in the basalt,
 *   and small water pockets everywhere.
 *
 * Its creatures: shore crabs on the islands and the seabed (harmless),
 * bubble jellies in the open sea and the flooded caves, rasp eels in the
 * flooded caves' walls; none round the lander or at the Tidesingers' reef.
 *
 * The ground: sediment to about 22 m under the seabed, basalt to about
 * 110 m, deep rock below for a later drill.
 */
export const PLANET_3: PlanetDef = {
  number: 3,
  name: 'Brine',
  blurb: 'A sea world, purple with life, its islands salt-crusted basalt over rock full of water.',
  // Sandy sediment, dark basalt, under a hazy lilac sky.
  style: {
    soil: '#b3a28f', stone: '#5d5f6e', deep: '#454657', bedrock: '#272632', grain: '#5c4c47', shade: '#33344a', tunnel: '#e2dde4', sky: '#ece0e6',
  },
  signature: 'pearl',
  world: {
    id: 'brine',
    version: 1,
    site: {
      // 384 columns round: a whole number of ground chunks (16) and hatch tiles (4).
      width: 384, height: 200, wrap: true, seed: 3003, surface: 20, landerCol: 48,
      stone: 22, deep: 110, caves: 80, caveFrom: 6,
      sea: {
        level: 2,
        islands: [[24, 76], [300, 340]],
        bed: [7, 18],
        shore: 7,
        // The reef the crew's craft sank on: 2 m of water over it.
        shoals: [{ cols: [138, 162], depth: 4 }],
      },
      ores: [
        // Fresh water under the islands (and a little deep down), for the air and the tanks.
        { ore: 'water', from: 2, to: 16, veins: 26, size: [2, 4], cols: [24, 76] },
        { ore: 'water', from: 2, to: 16, veins: 16, size: [2, 4], cols: [300, 340] },
        { ore: 'water', from: 30, to: 140, veins: 24, size: [2, 3] },
        // Nodules lie in the top of the sediment everywhere, the cell's fuel; some close round the lander.
        { ore: 'nodule', from: 1, to: 9, veins: 80, size: [2, 4] },
        { ore: 'nodule', from: 2, to: 10, veins: 14, size: [2, 3], cols: [20, 80] },
        // Halite beds under both islands.
        { ore: 'halite', from: 4, to: 20, veins: 28, size: [3, 5], cols: [24, 76] },
        { ore: 'halite', from: 4, to: 20, veins: 20, size: [3, 5], cols: [300, 340] },
        { ore: 'halite', from: 6, to: 21, veins: 14, size: [2, 3] },
        // Native copper: washed into the sediment, and in its veins through the basalt.
        { ore: 'copper', from: 3, to: 21, veins: 44, size: [2, 3] },
        { ore: 'copper', from: 3, to: 14, veins: 12, size: [2, 3], cols: [20, 92] },
        { ore: 'copper', from: 22, to: 100, veins: 46, size: [2, 4] },
        // Magnetite all through the basalt.
        { ore: 'magnetite', from: 22, to: 106, veins: 64, size: [2, 4] },
        // Pearls from old shell beds: a few anywhere, the banks rich.
        { ore: 'pearl', from: 12, to: 21, veins: 14, size: [1, 2] },
        { ore: 'pearl', from: 10, to: 21, veins: 18, size: [1, 3], cols: [230, 310] },
        { ore: 'pearl', from: 22, to: 60, veins: 20, size: [1, 2], cols: [230, 310] },
      ],
      // Methane from the sediment, as real seabeds make it.
      firedamp: 14,
      seam: 'nodule',
      rooms: [
        // The drowned village under the shelf: three homes in the sediment (its two cellars are vaults, below).
        { at: [96, 15], w: 10, h: 4 },
        { at: [110, 17], w: 12, h: 4 },
        { at: [124, 15], w: 8, h: 3 },
        // The Tidesingers' reef: a big flooded cave.
        { at: [209, 34], w: 22, h: 8 },
      ],
      tunnels: [
        // The village's ways in from the seabed, and between its homes.
        [[96, 6], [96, 14]],
        [[100, 16], [106, 17]],
        [[115, 17], [121, 15]],
        [[124, 14], [126, 6]],
        // Down to the Tidesingers' reef from the seabed.
        [[200, 8], [200, 28], [203, 32]],
      ],
      // The drowned village's two cellars, cut into the basalt: walled in stone all round, for Brine's drill.
      vaults: [
        { at: [100, 44], w: 6, h: 3, wall: 'stone' },
        { at: [117, 50], w: 6, h: 3, wall: 'stone' },
      ],
      // The air bell the Tidesingers keep full for the crew, in the cave's upper corner.
      bells: [{ at: [216, 31], w: 7, h: 3 }],
      // The underworld: big caves full of water, sealed in the basalt. The second is the Leviathan's.
      aquifers: [
        { at: [60, 70], w: 24, h: 8 },
        { at: [176, 88], w: 36, h: 10 },
        { at: [268, 78], w: 22, h: 9 },
        { at: [352, 100], w: 26, h: 8 },
        { at: [16, 124], w: 30, h: 10 },
        { at: [140, 140], w: 36, h: 12 },
      ],
      waterPockets: { count: 70, from: 8, to: 150, size: [2, 5] },
    },
    craft: 150,
    // The Tidesingers' home: the floor of their cave.
    reef: { at: [209, 37] },
    // The Leviathan, asleep on the floor at the west end of its cave; the craft's drive crystal at the east end, 18 tiles past it.
    giant: { at: [165, 92], kind: 'leviathan' },
    crystal: { at: [188, 92] },
    creatures: [
      // Shore crabs walk the islands (away from the lander) and the seabed.
      { kind: 'crab', count: 4, from: 0, to: 0, cols: [62, 78] },
      { kind: 'crab', count: 4, from: 0, to: 0, cols: [300, 340] },
      { kind: 'crab', count: 10, from: 7, to: 18, cols: [80, 296] },
      // Bubble jellies in the open sea, east of the Landing Isle, and more down in the flooded caves (none under the Landing Isle).
      { kind: 'jelly', count: 12, from: 3, to: 18, cols: [84, 296] },
      { kind: 'jelly', count: 18, from: 40, to: 150, cols: [66, 372] },
      // Rasp eels in the walls of the flooded caves (none in the Tidesingers' reef): deeper is fiercer.
      { kind: 'lamprey', count: 4, from: 20, to: 60, cols: [84, 190] },
      { kind: 'lamprey', count: 4, from: 20, to: 60, cols: [228, 380] },
      { kind: 'lamprey', count: 16, from: 60, to: 150, cols: [66, 372] },
    ],
    // The Tidesingers' old tools, in their drowned village: each a Mk 3 design (the drill comes from them alive, for copper).
    items: [
      { id: 'village-cell', kind: 'wreck', at: [96, 16], blueprint: 'cell-3', drill: 2 },
      { id: 'village-pack', kind: 'wreck', at: [110, 18], blueprint: 'pack-3', drill: 2 },
      { id: 'village-helmet', kind: 'wreck', at: [124, 16], blueprint: 'helmet-3', drill: 2 },
      { id: 'basalt-jetpack', kind: 'wreck', at: [102, 46], blueprint: 'jetpack-3', drill: 3 },
      { id: 'basalt-suit', kind: 'wreck', at: [119, 52], blueprint: 'suit-3', drill: 3 },
      // A spare: an old drill on the pearl banks, only salvage.
      { id: 'banks-drill', kind: 'wreck', at: [262, 16], blueprint: 'drill-3', drill: 2 },
    ],
  },
  arrival: {
    subtitle: 'the sea world',
    paragraphs: [
      "The lander comes down on the only kind of ground there is: an island of black rock crusted white with salt, and all round it, to the edge of the haze, a sea the colour of wine. Little waves slap the shore. The water is thick with something living, too small to see, that turns the light purple.",
      "The suit won't open: nitrogen and carbon dioxide, nothing to breathe. Fresh water lies under the island, floating on the salt sea below it, and dark lumps of manganese lie in the seabed for the cell.",
      "Your drill is a step behind here: the sediment costs double and the basalt won't break. Out on the reef to the east, something bright catches the light, half under the water.",
    ],
    button: 'Wade in',
  },
};
