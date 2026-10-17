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
 * caves until Mycel's own drill is printed. Another people fell through
 * the wormhole before you: the Aster (your name for them, for the star they
 * sign everything with). Their lander lies wrecked in the coal swamp, its
 * distress beacon still pulsing (heard first from orbit over Graphite, then
 * followed down here with the receiver). Its crew's gear, alien technology,
 * was thrown all round the wreck as it came down: each piece studied gives
 * a Mk 2 design, rebuilt in your own way.
 *
 * Regions, going east from the lander at column 40:
 *
 * - The landing glade, round the lander: soft peat, water pooled in pockets
 *   close under it.
 * - The cap forest (columns 60–120): cap mushrooms all along the surface to
 *   spring off, on the walk to the wreck.
 * - The coal swamp (120–170): lignite seams, and firedamp where they rot.
 *   The Aster lander lies at column 140, a furrow ploughed west of it, and its
 *   gear round it:
 *   - in the peat (Graphite's drill reaches these): the Drill in a cave west
 *     along the furrow, the Pack in the hollow under the wreck, the Cell in
 *     a cave to the east among spore pockets, and a second drill past it;
 *   - in the limestone under it (Mycel's drill): the Helmet in a sinkhole
 *     sealed in stone, the Suit in a grotto, and the Jetpack deep down in
 *     the amber, stone walls and a soil door on the west.
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
        { ore: 'water', from: 2, to: 20, veins: 54, size: [2, 4] },
        { ore: 'water', from: 1, to: 12, veins: 20, size: [2, 4], cols: [20, 62] },
        { ore: 'water', from: 26, to: 100, veins: 32, size: [2, 3] },
        // Lignite in the peat, richest in the coal swamp.
        { ore: 'lignite', from: 3, to: 22, veins: 52, size: [3, 5] },
        // A little close round the landing glade, for the first trips.
        { ore: 'lignite', from: 2, to: 10, veins: 8, size: [2, 4], cols: [24, 60] },
        { ore: 'lignite', from: 6, to: 18, veins: 18, size: [3, 6], cols: [120, 170] },
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
      // The Aster lander's ground is kept flat, as yours is.
      flats: [140],
      rooms: [
        // The hollow under the Aster lander.
        { at: [140, 8], w: 8, h: 3 },
        // The Drill's cave, west along the furrow it ploughed.
        { at: [127, 16], w: 8, h: 3 },
        // The Cell's cave east of the wreck, among the spore pockets.
        { at: [155, 12], w: 9, h: 3 },
        // A second broken drill's cave, past it.
        { at: [163, 19], w: 7, h: 3 },
        // The grotto in the stone under the wreck.
        { at: [150, 50], w: 10, h: 4 },
        // The Mother Mycel's chamber, deep in the limestone east of the wreck.
        { at: [200, 74], w: 14, h: 9 },
      ],
      vaults: [
        // The Helmet: down a sinkhole under the wreck, sealed in limestone all round, no soft way in.
        { at: [136, 36], w: 4, h: 3, wall: 'stone' },
        // The Jetpack, in the amber deep: stone walls, a soil door on the west.
        { at: [128, 72], w: 4, h: 3, wall: 'stone', door: 'left' },
      ],
    },
    crash: 140,
    creatures: [
      // Puffballs: none in the peat by the landing glade; round the wreck, in its caves.
      { kind: 'puffball', count: 12, from: 3, to: 23, cols: [108, 178] },
      // Deeper is fiercer: more in the limestone caves all round, and the tendrils there.
      { kind: 'puffball', count: 14, from: 24, to: 86 },
      { kind: 'tendril', count: 18, from: 24, to: 86 },
      // Grazers crawl the surface among the caps, away from the lander.
      { kind: 'grazer', count: 8, from: 0, to: 0, cols: [64, 230] },
    ],
    // The Mother Mycel, on her chamber's floor.
    giant: { at: [200, 78] },
    // The Aster crew's gear, lost on Mycel: touch a piece to study it (its design) and take it apart (half its materials).
    items: [
      // The Aster's resonator, lying in the open just east of the wreck: the pulse.
      { id: 'aster-pulse', kind: 'wreck', at: [146, -3], blueprint: 'pulse', drill: 1 },
      { id: 'furrow-drill', kind: 'wreck', at: [127, 17], blueprint: 'drill-2', drill: 1 },
      { id: 'spore-cave-cell', kind: 'wreck', at: [155, 13], blueprint: 'cell-2', drill: 1 },
      { id: 'aster-wreck-pack', kind: 'wreck', at: [141, 9], blueprint: 'pack-2', drill: 1 },
      { id: 'sinkhole-helmet', kind: 'wreck', at: [137, 38], blueprint: 'helmet-2', drill: 2 },
      { id: 'amber-vault-jetpack', kind: 'wreck', at: [129, 74], blueprint: 'jetpack-2', drill: 2 },
      { id: 'grotto-suit', kind: 'wreck', at: [150, 51], blueprint: 'suit-2', drill: 2 },
      // A repeat: a second drill east of the wreck, only salvage.
      { id: 'east-cave-drill-2', kind: 'wreck', at: [163, 20], blueprint: 'drill-2', drill: 1 },
    ],
  },
  arrival: {
    subtitle: 'a green moon, alive',
    paragraphs: [
      "The lander drops through haze so thick the light goes green, and settles in soft ground that gives under its legs. Outside, things grow: springy caps underfoot, giant stalks in the haze, threads of white running over everything, spores drifting in the air like slow snow.",
      "The suit tastes the air and won't open: heavy with carbon dioxide and thick with spores, nothing to breathe. Life signs everywhere. There's water here, pooled in the ground, and brown coal for the cell; ice and graphite won't be found.",
      "Your drill is a step behind on this moon: the peat costs double and the stone won't break. And the receiver picks up the Aster beacon's pulses at once, faint, from somewhere out in the jungle: follow them, stronger and closer.",
    ],
    button: 'Step out',
  },
};
