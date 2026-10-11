/**
 * Beachcomber's finds: what a dig-up mission (`collect`, see mission.ts)
 * sends the crab digging for. Each beach has its own, something real a
 * beachcomber would turn up there: cowries on the atoll, desert roses in
 * the dunes, gold doubloons from the wreck, labradorite on its own coast.
 */
export type FindId = 'cowrie' | 'desertrose' | 'urchin' | 'seabean' | 'olivine' | 'agate' | 'doubloon' | 'pearl' | 'labradorite' | 'opal';

export interface FindSpec {
  readonly id: FindId;
  /** One of them, as the pop-up says it ("a cowrie!"), and more than one ("3 cowries"). */
  readonly one: string;
  readonly many: string;
  /** Where it comes from, a line for the intro card. */
  readonly lore: string;
}

export const FINDS: Readonly<Record<FindId, FindSpec>> = {
  cowrie: { id: 'cowrie', one: 'cowrie', many: 'cowries', lore: 'Glossy cowries, once traded as money across the Indian Ocean.' },
  desertrose: { id: 'desertrose', one: 'desert rose', many: 'desert roses', lore: 'Desert roses: crystals of gypsum grown into petals in the damp sand.' },
  urchin: { id: 'urchin', one: 'urchin test', many: 'urchin tests', lore: 'Sea urchin tests: the dotted shells left when the spines are gone.' },
  seabean: { id: 'seabean', one: 'sea bean', many: 'sea beans', lore: 'Sea beans: drift seeds, carried down the rivers and out to sea.' },
  olivine: { id: 'olivine', one: 'olivine', many: 'olivines', lore: 'Olivine: green crystals the volcano threw out, that turn black sand green.' },
  agate: { id: 'agate', one: 'agate', many: 'agates', lore: 'Agates: banded stones that glow like honey when the light comes through.' },
  doubloon: { id: 'doubloon', one: 'gold doubloon', many: 'gold doubloons', lore: 'Gold doubloons, washed out of the old wreck after every storm.' },
  pearl: { id: 'pearl', one: 'pearl', many: 'pearls', lore: 'Pearls, from the oyster beds the divers here have fished for centuries.' },
  labradorite: { id: 'labradorite', one: 'labradorite', many: 'labradorites', lore: 'Labradorite, named for this coast: grey stone that flashes blue and gold.' },
  opal: { id: 'opal', one: 'opal', many: 'opals', lore: 'Opals: stones with fire inside them, brightest by moonlight.' },
};

/** Each beach's find, beach 1 first. */
export const BEACH_FINDS: readonly FindId[] = ['cowrie', 'desertrose', 'urchin', 'seabean', 'olivine', 'agate', 'doubloon', 'pearl', 'labradorite', 'opal'];

/** The find of a beach (0-based); past the last, the first beach's. */
export function findOf(beach: number): FindId {
  return BEACH_FINDS[beach] ?? BEACH_FINDS[0]!;
}
