/**
 * Ore: real minerals, each with its own highlighter colour and its own
 * glyph in the rock, so it reads without colour. Ids are stored in the
 * terrain's content layer, so never renumber one.
 */
export type OreGlyph = 'nugget' | 'cube' | 'flake' | 'prism' | 'wire' | 'rime';

export interface OreKind {
  readonly id: number;
  readonly key: string;
  readonly name: string;
  /** Credits a piece sells for when banked. */
  readonly value: number;
  /** Highlighter colour. */
  readonly color: string;
  /** How it's drawn in the rock: native copper in nuggets, galena in cubes, graphite in flakes, quartz in prisms, silver in wires, as they grow; ice in frosted lumps. */
  readonly glyph: OreGlyph;
  /** Real facts, for the cargo card: what it is, how it forms, what it's good for. */
  readonly about: string;
}

export const ORES = {
  copper: { id: 1, key: 'copper', name: 'native copper', value: 5, color: '#ffa94d', glyph: 'nugget', about: 'Pure copper metal, grown in branching nuggets where hot water once ran through cracked rock. Soft enough to bend, and it carries current better than almost any metal, so every circuit wants it.' },
  galena: { id: 2, key: 'galena', name: 'galena', value: 6, color: '#74c7f2', glyph: 'cube', about: 'Lead sulfide in neat grey cubes, startlingly heavy in the hand. The main ore of lead, and one of the first crystals ever used to pick up radio signals.' },
  graphite: { id: 3, key: 'graphite', name: 'graphite', value: 8, color: '#f3e04a', glyph: 'flake', about: 'Pure carbon in soft, greasy flakes that mark whatever they touch. It conducts, shrugs off heat and holds charge in its layers, which is why batteries are built round it and the drill\'s cell runs on it.' },
  quartz: { id: 4, key: 'quartz', name: 'quartz', value: 15, color: '#ff8fc4', glyph: 'prism', about: 'Silicon and oxygen grown into six-sided prisms, hard enough to scratch glass. Squeeze it and it gives a tiny voltage, so a sliver of it keeps a radio on frequency.' },
  silver: { id: 5, key: 'silver', name: 'native silver', value: 12, color: '#8fe388', glyph: 'wire', about: 'Pure silver metal, grown in curling wires inside the rock. The best conductor of any metal, and rarer and deeper than copper.' },
  /** Water ice: what life support is fed (real moon bases plan to make air from it). */
  ice: { id: 6, key: 'ice', name: 'water ice', value: 2, color: '#b9ecf5', glyph: 'rime', about: 'Water, frozen as hard as rock where the sun never warms it. Split, it gives air to breathe, which is why the suit takes it for life support.' },
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
