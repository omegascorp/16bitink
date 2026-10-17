/**
 * Ore: real minerals, each drawn in its true colour (copper's orange,
 * galena's lead grey, graphite's black, rose quartz's pink, silver's white
 * metal, ice's pale blue) with a highlighter swipe of a matching tint behind
 * it, and its own glyph in the rock, so it reads without colour. Ids are stored in the
 * terrain's content layer, so never renumber one.
 *
 * Graphite's six come first; Mycel's (chapter 2) follow: malachite, pyrite,
 * calcite, amber, lignite and water, then carbon, which never lies in the
 * rock: it comes off Mycel's cap mushrooms (with their water) when they're
 * drilled. Brine's (chapter 3) come after: manganese nodules, halite,
 * magnetite and brine pearls (it shares native copper and water). They
 * ship with the game even though the paid worlds come from the server, as
 * saves keep only ores they know.
 */
export type OreGlyph = 'nugget' | 'cube' | 'flake' | 'prism' | 'wire' | 'rime' | 'botryoid' | 'rhomb' | 'resin' | 'chunk' | 'bead' | 'char' | 'nodule' | 'salt' | 'octahedron' | 'pearl';

export interface OreKind {
  readonly id: number;
  readonly key: string;
  readonly name: string;
  /** Credits a piece sells for when banked. */
  readonly value: number;
  /** The mineral's own colour, as it really looks: the glyph is painted in it. */
  readonly color: string;
  /** The highlighter swipe behind it in the rock and the wash of its inventory slot: a brighter tint of the same colour, to spot it on grey ground. */
  readonly mark: string;
  /** How it's drawn in the rock: native copper in nuggets, galena in cubes, graphite in flakes, quartz in prisms, silver in wires, as they grow; ice in frosted lumps. */
  readonly glyph: OreGlyph;
  /** Real facts, for the cargo card: what it is, how it forms, what it's good for. */
  readonly about: string;
}

export const ORES = {
  copper: { id: 1, key: 'copper', name: 'native copper', value: 5, color: '#d97a3e', mark: '#ffa94d', glyph: 'nugget', about: 'Pure copper metal, grown in branching nuggets where hot water once ran through cracked rock. Soft enough to bend, and it carries current better than almost any metal, so every circuit wants it.' },
  galena: { id: 2, key: 'galena', name: 'galena', value: 6, color: '#6c7586', mark: '#8fb0e0', glyph: 'cube', about: 'Lead sulfide in neat grey cubes, startlingly heavy in the hand. The main ore of lead, and one of the first crystals ever used to pick up radio signals.' },
  graphite: { id: 3, key: 'graphite', name: 'graphite', value: 8, color: '#45484f', mark: '#7d8294', glyph: 'flake', about: 'Pure carbon in soft, greasy flakes that mark whatever they touch. It conducts, shrugs off heat and holds charge in its layers, which is why batteries are built round it and the drill\'s cell runs on it.' },
  quartz: { id: 4, key: 'quartz', name: 'quartz', value: 15, color: '#f4cadb', mark: '#ffb0d0', glyph: 'prism', about: 'Silicon and oxygen grown into six-sided prisms, hard enough to scratch glass. Pure, it is as clear as glass; a trace of other elements tints it, and Graphite\'s grows rose pink. Squeeze it and it gives a tiny voltage, so a sliver of it keeps a radio on frequency.' },
  silver: { id: 5, key: 'silver', name: 'native silver', value: 12, color: '#e4e8ee', mark: '#dfe6f0', glyph: 'wire', about: 'Pure silver metal, grown in curling wires inside the rock. The best conductor of any metal, and rarer and deeper than copper.' },
  /** Water ice: what life support is fed (real moon bases plan to make air from it). */
  ice: { id: 6, key: 'ice', name: 'water ice', value: 2, color: '#e2f5fa', mark: '#b9ecf5', glyph: 'rime', about: 'Water, frozen as hard as rock where the sun never warms it. Split, it gives air to breathe, which is why the suit takes it for life support.' },
  malachite: { id: 7, key: 'malachite', name: 'malachite', value: 9, color: '#2f8f5b', mark: '#6fdc9a', glyph: 'botryoid', about: 'Copper carbonate in banded green bubbles, grown where water heavy with carbon dioxide seeped through copper-bearing rock. Ground, it was one of the first green paints; heated, it gives up its copper.' },
  pyrite: { id: 8, key: 'pyrite', name: 'pyrite', value: 7, color: '#c9b35c', mark: '#f2dc62', glyph: 'cube', about: 'Iron sulfide in brassy cubes, the fool\'s gold. It grows where living things rot away from the air, so the deep peat of a living world is full of it. Real batteries use it for their cathodes.' },
  calcite: { id: 9, key: 'calcite', name: 'calcite', value: 8, color: '#efe4cc', mark: '#f7d993', glyph: 'rhomb', about: 'Calcium carbonate, laid down as limestone where carbon dioxide-rich water met the rock. Its clear crystals split light in two; seafarers may once have used them to find the sun through cloud.' },
  amber: { id: 10, key: 'amber', name: 'amber', value: 18, color: '#e39b2c', mark: '#ffc04d', glyph: 'resin', about: 'Resin wept by Mycel\'s giant stalks long ago and hardened over ages into a warm, light stone. Some pieces hold tiny six-legged fliers caught in it, whole. As a binder it makes a strong, light composite.' },
  lignite: { id: 11, key: 'lignite', name: 'lignite', value: 3, color: '#5b4733', mark: '#b48e64', glyph: 'chunk', about: 'Brown coal: dead growth pressed underground until it turned half to carbon, soft and still woody in its grain. The suit\'s cell burns it in a little carbon fuel cell to charge, so here it feeds the drill.' },
  /** Water: on Mycel it lies liquid, and life support and the tanks are split from it as they are from ice. */
  water: { id: 12, key: 'water', name: 'water', value: 2, color: '#8cc6e6', mark: '#a6e0f7', glyph: 'bead', about: 'Liquid water, pooled in sealed pockets in the soil and seeping from cave walls. Split, it gives air to breathe and fuel to fly, as ice does on a dead moon.' },
  /** Carbon: a cap's flesh, dried and charred by the drill's heat as it comes off: no vein of it lies in the rock. */
  carbon: { id: 13, key: 'carbon', name: 'carbon', value: 2, color: '#34303b', mark: '#b7a6cf', glyph: 'char', about: "A cap's flesh, charred by the drill's heat as it comes off: porous, light and almost pure carbon, the gills still showing in it. A cap is nine parts water; the rest is chitin, which chars to carbon, and a carbon fuel cell burns that as it burns coal. So every cap drilled gives carbon for the cell and water for the air." },
  /** Manganese nodules: Brine's cell fuel (manganese dioxide is a real battery's cathode). */
  nodule: { id: 14, key: 'nodule', name: 'manganese nodule', value: 6, color: '#3d3a40', mark: '#a59bd0', glyph: 'nodule', about: "Black lumps of manganese and iron oxide, grown a few millimetres in a million years round a shell or a shark's tooth on the seabed. Real abyssal plains are paved with them. Manganese dioxide is the cathode of an alkaline battery, so here the cell runs on them." },
  /** Halite: rock salt, from seas that dried up long ago. */
  halite: { id: 15, key: 'halite', name: 'halite', value: 4, color: '#f0c7c9', mark: '#ffb9c0', glyph: 'salt', about: "Rock salt in pink cubes, left where a shallow sea dried out and was buried. Sodium from salt makes a sodium-ion cell, and caustic soda made from it scrubs carbon dioxide out of a rebreather's air. Its clear crystals let heat light through, so infrared instruments have salt windows." },
  /** Magnetite: black iron oxide in the basalt, magnetic enough to pull a needle. */
  magnetite: { id: 16, key: 'magnetite', name: 'magnetite', value: 9, color: '#2e3036', mark: '#8fa3c4', glyph: 'octahedron', about: "Iron oxide in black eight-sided crystals, the most magnetic mineral there is: a lump of it swings a compass. Sea-floor lava is full of it, and as each flow cooled its crystals froze pointing at the poles of the day. Smelted, it's iron." },
  /** Brine pearls: nacre from old shell beds, Brine's signature. */
  pearl: { id: 17, key: 'pearl', name: 'brine pearl', value: 20, color: '#efe6f2', mark: '#e2c6f5', glyph: 'pearl', about: "Nacre, laid down layer on layer round a grain of grit inside a shell, and buried with the shell beds when the sea moved on. Nacre is chalk and a little protein stacked like bricks and mortar, and it's thousands of times tougher than the chalk alone: the toughest ceramic in nature." },
} as const satisfies Record<string, OreKind>;

export type OreKey = keyof typeof ORES;

const BY_ID: ReadonlyMap<number, OreKind> = new Map(Object.values(ORES).map((o) => [o.id, o]));

export function oreById(id: number): OreKind | null {
  return BY_ID.get(id) ?? null;
}

export const ORE_KINDS: readonly OreKind[] = [...BY_ID.values()];

/** The key of an ore id (as stored in the terrain), or null for none. */
export function oreKeyOf(id: number): OreKey | null {
  return (oreById(id)?.key as OreKey | undefined) ?? null;
}
