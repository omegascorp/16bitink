/**
 * The prospector's gear (spec, "Gear: blueprints, materials, the
 * fabricator"): six pieces, each with a mark from 0 (the starter set) to 10
 * (Cardia's). Every mark looks its own: its shape comes in three families,
 * so progress shows on the character in big steps (a patched prospector's
 * kit, Mk 0–3; guild contractor's issue, Mk 4–7; deep-space gear, Mk 8–10),
 * and within a family each mark is printed from its planet's materials and
 * has its own touches (art/prospector/marks.ts). Each piece changes on its
 * own, so a half-upgraded prospector looks it.
 */
export const PIECES = ['drill', 'cell', 'pack', 'suit', 'helmet', 'jetpack'] as const;
export type Piece = (typeof PIECES)[number];

export type Loadout = Readonly<Record<Piece, number>>;

/** The highest mark: Cardia's set. */
export const MAX_MK = 10;

/** 0 patched prospector, 1 guild contractor, 2 deep-space. */
export type Look = 0 | 1 | 2;

export const LOOK_NAMES: readonly string[] = ['prospector', 'guild contractor', 'deep-space'];

export const STARTER_LOADOUT: Loadout = { drill: 0, cell: 0, pack: 0, suit: 0, helmet: 0, jetpack: 0 };

export function lookOf(mk: number): Look {
  return mk >= 8 ? 2 : mk >= 4 ? 1 : 0;
}

/** How the character looks: the mark of every piece, as each one shows on them, and whether the pulse is on their wrist. */
export type ProspectorLook = Loadout & { readonly armed?: boolean };

const clampMk = (mk: number): number => Math.max(0, Math.min(MAX_MK, Math.floor(mk)));

/** The look for a loadout; `armed` puts the pulse (the Aster's weapon, as we print it) on the front wrist. */
export function prospectorLook(l: Loadout, armed = false): ProspectorLook {
  const pieces = { drill: clampMk(l.drill), cell: clampMk(l.cell), pack: clampMk(l.pack), suit: clampMk(l.suit), helmet: clampMk(l.helmet), jetpack: clampMk(l.jetpack) };
  return armed ? { ...pieces, armed: true } : pieces;
}

/** A short key for a look, for texture names: one base-11 digit per piece, in PIECES order, then 'w' when armed. */
export function lookKey(l: ProspectorLook): string {
  return PIECES.map((p) => clampMk(l[p]).toString(11)).join('') + (l.armed ? 'w' : '');
}

/** Every piece at the same mark (for previews and the test mine). */
export function evenLoadout(mk: number): Loadout {
  return { drill: mk, cell: mk, pack: mk, suit: mk, helmet: mk, jetpack: mk };
}
