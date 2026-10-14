/**
 * Ore: real minerals, each with its own highlighter colour and its own
 * glyph in the rock, so it reads without colour. Ids are stored in the
 * terrain's content layer, so never renumber one.
 */
export type OreGlyph = 'nugget' | 'cube' | 'flake' | 'prism' | 'wire';

export interface OreKind {
  readonly id: number;
  readonly key: string;
  readonly name: string;
  /** Credits a piece sells for when banked. */
  readonly value: number;
  /** Highlighter colour. */
  readonly color: string;
  /** How it's drawn in the rock: native copper in nuggets, galena in cubes, graphite in flakes, quartz in prisms, silver in wires, as they grow. */
  readonly glyph: OreGlyph;
}

export const ORES = {
  copper: { id: 1, key: 'copper', name: 'native copper', value: 5, color: '#ffa94d', glyph: 'nugget' },
  galena: { id: 2, key: 'galena', name: 'galena', value: 6, color: '#74c7f2', glyph: 'cube' },
  graphite: { id: 3, key: 'graphite', name: 'graphite', value: 8, color: '#f3e04a', glyph: 'flake' },
  quartz: { id: 4, key: 'quartz', name: 'quartz', value: 15, color: '#ff8fc4', glyph: 'prism' },
  silver: { id: 5, key: 'silver', name: 'native silver', value: 12, color: '#8fe388', glyph: 'wire' },
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
