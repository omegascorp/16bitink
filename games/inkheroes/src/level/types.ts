import type { ArmySlot } from '../logic/army';
import type { BuildingId } from '../logic/buildings';
import type { HeroClass } from '../logic/hero';
import type { MapObject } from '../logic/objects';
import type { Amount } from '../logic/resources';
import type { Skills } from '../logic/skills';
import type { SpellId } from '../logic/spells';

export type Goal =
  | { readonly kind: 'defeat'; readonly target: string; readonly text: string }
  | { readonly kind: 'capture'; readonly target: string; readonly text: string };

/** A hand-made campaign map. */
export interface MapDef {
  readonly id: string;
  readonly name: string;
  /** Its place in the campaign (1-based). */
  readonly n: number;
  /** The scroll read before the map starts. */
  readonly intro: readonly string[];
  readonly goal: Goal;
  /** Win within this many days for the second blot. */
  readonly parDays: number;
  /** Rows of tile characters (see TILE_CHARS). */
  readonly rows: readonly string[];
  readonly objects: readonly MapObject[];
  readonly town: {
    readonly id: string;
    readonly name: string;
    readonly x: number;
    readonly y: number;
    readonly built: readonly BuildingId[];
    readonly guild: readonly SpellId[];
  };
  readonly hero: {
    readonly id: string;
    readonly name: string;
    readonly heroClass: HeroClass;
    readonly x: number;
    readonly y: number;
    readonly attack: number;
    readonly defense: number;
    readonly power: number;
    readonly knowledge: number;
    readonly skills: Skills;
    readonly spells: readonly SpellId[];
    readonly hasBook: boolean;
    readonly army: readonly ArmySlot[];
  };
  readonly purse: Amount;
  /** Buildings switched off on this map. */
  readonly off: readonly BuildingId[];
  readonly seed: number;
}
