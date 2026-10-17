/**
 * The prospector's gear (spec, "Gear: blueprints, materials, the
 * fabricator"): six pieces, each with a mark from 0 (the starter set) to 10
 * (Cardia's). How a piece looks changes in three steps, so progress shows
 * on the character: a patched prospector's kit (Mk 0–3), guild contractor's
 * issue (Mk 4–7), deep-space gear (Mk 8–10). Each piece changes on its own,
 * so a half-upgraded prospector looks it.
 */
export const PIECES = ['drill', 'cell', 'pack', 'suit', 'helmet', 'jetpack'] as const;
export type Piece = (typeof PIECES)[number];

export type Loadout = Readonly<Record<Piece, number>>;

/** 0 patched prospector, 1 guild contractor, 2 deep-space. */
export type Look = 0 | 1 | 2;

export const LOOK_NAMES: readonly string[] = ['prospector', 'guild contractor', 'deep-space'];

export const STARTER_LOADOUT: Loadout = { drill: 0, cell: 0, pack: 0, suit: 0, helmet: 0, jetpack: 0 };

export function lookOf(mk: number): Look {
  return mk >= 8 ? 2 : mk >= 4 ? 1 : 0;
}

/** The pieces that show on the character, and how each looks. */
export interface ProspectorLook {
  readonly drill: Look;
  readonly suit: Look;
  readonly helmet: Look;
  readonly jetpack: Look;
}

export function prospectorLook(l: Loadout): ProspectorLook {
  return { drill: lookOf(l.drill), suit: lookOf(l.suit), helmet: lookOf(l.helmet), jetpack: lookOf(l.jetpack) };
}

/** A short key for a look, for texture names. */
export function lookKey(l: ProspectorLook): string {
  return `${l.drill}${l.suit}${l.helmet}${l.jetpack}`;
}

/** Every piece at the same mark (for previews and the test mine). */
export function evenLoadout(mk: number): Loadout {
  return { drill: mk, cell: mk, pack: mk, suit: mk, helmet: mk, jetpack: mk };
}
