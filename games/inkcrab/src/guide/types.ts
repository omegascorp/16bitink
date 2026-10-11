import type { BirdSpecies } from '../logic/birds';
import type { ShellKind } from '../logic/shells';
import type { SpeciesId } from '../logic/species';

/** Everything the field guide describes that moves: creatures on the sand and in the water, and birds overhead. */
export type CreatureId = SpeciesId | BirdSpecies;

/**
 * One real-life fact card for a creature. Short phrases, not sentences, so a
 * card reads at a glance; figures are typical adult maximums, approximate
 * ("~", "up to"), as in InkFish's fish guide.
 */
export interface CreatureEntry {
  /** Scientific name of the species (or genus/family when the game means a group). */
  readonly latin: string;
  /** Maximum size: body or shell width for crabs, length for the rest, wingspan for birds; e.g. "up to 10 cm across". */
  readonly size: string;
  /** Maximum weight, e.g. "up to 25 g". */
  readonly weight: string;
  /** Typical maximum lifespan, e.g. "up to 3 years". */
  readonly lifespan: string;
  /** How fast or how it moves, e.g. "sprints up to 1.6 m/s". */
  readonly speed: string;
  /** Where on the shore (or off it) it lives, e.g. "sandy beaches above the tide line". */
  readonly habitat: string;
  /** Where in the world it lives. */
  readonly range: string;
  /** What it eats. */
  readonly eats: string;
  /** One striking true fact. */
  readonly fact: string;
}

/** One real-life fact card for a shell: the sea or land snail that grew it. */
export interface ShellEntry {
  /** Scientific name of the snail (or genus/family when the game means a group). */
  readonly latin: string;
  /** Typical adult shell length, e.g. "2-3 cm long". */
  readonly size: string;
  /** Where on the shore (or how deep) the living snail is found. */
  readonly habitat: string;
  /** Where in the world it lives. */
  readonly range: string;
  /** What the living snail eats. */
  readonly eats: string;
  /** One striking true fact. */
  readonly fact: string;
}

/** Field limits, so every card fits its panel. */
export const GUIDE_LIMITS = { field: 64, fact: 120 } as const;

export type CreatureGuide = Readonly<Record<CreatureId, CreatureEntry>>;
export type ShellGuide = Readonly<Record<ShellKind, ShellEntry>>;
