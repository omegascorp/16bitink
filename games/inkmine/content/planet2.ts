import type { PlanetDef } from '../src/level/types';

/**
 * Planet 2, Mycel (chapter 2, the full game): Graphite's sister moon round
 * the ringed giant, big enough to hold air, a fungal jungle under a thick
 * haze of carbon dioxide and spores (docs/inkmine-design.md, "The ten
 * planets"). Green from space, violet underground: its soil is peat of
 * fungal matter, its stone laid down as limestone where that air met water.
 * SERVER-ONLY data: shipped to owners by /api/content/inkmine (content/paid.ts).
 *
 * The prospector arrives with Graphite's Mk 1 drill, a step behind: soil
 * costs double and the stone won't break, so the way in is the soil and the
 * caves until Mycel's own drill is printed. The Aster crew came here too:
 * their second lander lies wrecked in the coal swamp, its crew's gear
 * scattered round the moon, each piece a Mk 2 design to study.
 *
 * Regions, going east from the lander at column 40:
 *
 * - The landing glade, round the lander: soft peat, water pooled in pockets
 *   close under it.
 * - The cap forest (columns 60–120): cap mushrooms all along the surface to
 *   spring off. A cave in the soil under it holds a broken Drill, the way
 *   to the stone (reachable through soil alone).
 * - The spore hollows (120–150): pockets of spores all through the soil
 *   round a cave with a broken Cell.
 * - The coal swamp (150–200): lignite seams, and firedamp where they rot;
 *   the Aster lander's wreck, a broken Pack in the hollow under it.
 * - The limestone vault, far east (215): sealed in stone all round (the
 *   Helmet; Mycel's drill).
 * - The amber deep, under the middle (120, 76): stone walls and a soil door
 *   on the west (the Jetpack).
 * - The grotto west of the lander (20, 58), in the stone (the Suit).
 *
 * The ground: peat soil to about 24 m, limestone to about 88 m, deep rock
 * below for a later drill.
 */
export const PLANET_2: PlanetDef = {
  number: 2,
  name: 'Mycel',
  blurb: 'A fungal moon under a green haze, its soil soft peat, its stone limestone.',
  // Violet peat and limestone under a hazy, greenish sky.
  style: {
    soil: '#9f8aab', stone: '#857591', deep: '#61557a', bedrock: '#352c42', grain: '#4b3d5a', shade: '#3c3149', tunnel: '#e4dae1', sky: '#e4e7cf',
  },
  signature: 'amber',
  world: {
    id: 'mycel',
    version: 1,
    site: {
      // 240 columns round: a whole number of ground chunks (16) and hatch tiles (4), so both repeat cleanly at the join.
      width: 240, height: 144, wrap: true, seed: 2002, surface: 14, landerCol: 40,
      stone: 24, deep: 88, caves: 52, caveFrom: 5,
      ores: [
        // Water pooled in sealed pockets: near the surface all round, thickest round the landing glade, and some deep.
        { ore: 'water', from: 2, to: 20, veins: 40, size: [2, 4] },
        { ore: 'water', from: 1, to: 12, veins: 14, size: [2, 4], cols: [20, 62] },
        { ore: 'water', from: 26, to: 100, veins: 26, size: [2, 3] },
        // Lignite in the peat, richest in the coal swamp.
        { ore: 'lignite', from: 3, to: 22, veins: 40, size: [3, 5] },
        { ore: 'lignite', from: 6, to: 18, veins: 14, size: [3, 6], cols: [150, 200] },
        // Pyrite grows where the peat rots without air, and in the limestone below.
        { ore: 'pyrite', from: 8, to: 23, veins: 24, size: [2, 3] },
        { ore: 'pyrite', from: 24, to: 80, veins: 40, size: [2, 4] },
        // Malachite where carbon dioxide-rich water met copper: a little in the deep peat, more in the stone.
        { ore: 'malachite', from: 10, to: 23, veins: 18, size: [2, 3] },
        { ore: 'malachite', from: 22, to: 60, veins: 34, size: [2, 4] },
        // Calcite through the limestone.
        { ore: 'calcite', from: 24, to: 86, veins: 40, size: [2, 4] },
        // Amber, rare: a few beads in the peat, more deep down where the old stalks were buried.
        { ore: 'amber', from: 6, to: 22, veins: 10, size: [1, 2] },
        { ore: 'amber', from: 40, to: 86, veins: 26, size: [1, 2] },
      ],
      firedamp: 22,
      seam: 'lignite',
      spores: 46,
      caps: [
        // The cap forest, then caps here and there along the surface, and on cave floors all through.
        { where: 'surface', clusters: 22, size: 4, cols: [60, 120] },
        { where: 'surface', clusters: 10, size: 2 },
        { where: 'caves', clusters: 44, size: 3 },
      ],
      rooms: [
        // The Drill's cave under the cap forest.
        { at: [92, 17], w: 9, h: 3 },
        // The Cell's cave in the spore hollows.
        { at: [135, 12], w: 10, h: 4 },
        // The hollow under the Aster lander's wreck.
        { at: [186, 8], w: 8, h: 3 },
        // A second broken drill's cave, nearer the glade.
        { at: [62, 20], w: 7, h: 3 },
        // The grotto in the stone west of the lander.
        { at: [20, 58], w: 10, h: 4 },
      ],
      vaults: [
        // The Helmet: sealed in limestone all round, no soft way in.
        { at: [215, 38], w: 4, h: 3, wall: 'stone' },
        // The Jetpack, in the amber deep: stone walls, a soil door on the west.
        { at: [120, 76], w: 4, h: 3, wall: 'stone', door: 'left' },
      ],
    },
    // The Aster crew's gear, lost on Mycel: touch a piece to study it (its design) and take it apart (half its materials).
    items: [
      { id: 'cap-cave-drill', kind: 'wreck', at: [92, 18], blueprint: 'drill-2', drill: 1 },
      { id: 'spore-cave-cell', kind: 'wreck', at: [135, 13], blueprint: 'cell-2', drill: 1 },
      { id: 'aster-wreck-pack', kind: 'wreck', at: [186, 9], blueprint: 'pack-2', drill: 1 },
      { id: 'limestone-vault-helmet', kind: 'wreck', at: [216, 40], blueprint: 'helmet-2', drill: 2 },
      { id: 'amber-vault-jetpack', kind: 'wreck', at: [121, 78], blueprint: 'jetpack-2', drill: 2 },
      { id: 'grotto-suit', kind: 'wreck', at: [20, 59], blueprint: 'suit-2', drill: 2 },
      // A repeat: a second drill near the glade, only salvage.
      { id: 'glade-cave-drill-2', kind: 'wreck', at: [62, 21], blueprint: 'drill-2', drill: 1 },
    ],
  },
  arrival: {
    subtitle: 'a green moon, alive',
    paragraphs: [
      "The lander drops through haze so thick the light goes green, and settles in soft ground that gives under its legs. Outside, things grow: springy caps underfoot, giant stalks in the haze, threads of white running over everything, spores drifting in the air like slow snow.",
      "The suit tastes the air and won't open: heavy with carbon dioxide and thick with spores, nothing to breathe. Life signs everywhere. There's water here, pooled in the ground, and brown coal for the cell; ice and graphite won't be found.",
      "Your drill is a step behind on this moon: the peat costs double and the stone won't break. Someone else came down here once. There's metal out in the jungle, broken and old.",
    ],
    button: 'Step out',
  },
};
