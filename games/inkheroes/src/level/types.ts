import type { ArmySlot } from '../logic/army';
import type { BuildingId } from '../logic/buildings';
import type { MachineId } from '../logic/creatures';
import type { HeroClass } from '../logic/hero';
import type { Gear } from '../logic/items';
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
    /** Troops holding it on day one (none if left out). */
    readonly garrison?: readonly ArmySlot[];
  };
  /** The map's other towns, neutral and held by a garrison until a hero beats it and takes them. */
  readonly towns?: readonly {
    readonly id: string;
    readonly name: string;
    readonly x: number;
    readonly y: number;
    readonly built: readonly BuildingId[];
    readonly guild: readonly SpellId[];
    readonly garrison: readonly ArmySlot[];
    /** Held by the map's rival lord, or the player's from the start (else neutral). */
    readonly owner?: 'rival' | 'player';
    /** Ridden on into from the part before, it waits for the hero as an ally instead, so a new town isn't simply handed over. */
    readonly waits?: boolean;
  }[];
  readonly hero: HeroDef;
  /** A rival lord: an AI hero who rides out from the map's rival-held towns. */
  readonly rival?: {
    readonly hero: HeroDef;
    /** What the rival builds, in order, one a day while the purse allows. */
    readonly build: readonly BuildingId[];
    readonly purse: Amount;
  };
  readonly purse: Amount;
  /** What the Crown sends when the chapter rides on into this part (a part played straight on from the one before keeps its purse). */
  readonly grant?: Amount;
  /** The way into this part from the last: the land along it is seen from the start, and the map flies along it once the part's card is read. */
  readonly opening?: { readonly text: string; readonly way: readonly { readonly x: number; readonly y: number }[] };
  /** Buildings switched off on this map. */
  readonly off: readonly BuildingId[];
  readonly seed: number;
}

/** A hero as a map places it. */
export interface HeroDef {
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
  /** What they wear from the start: a `book` is what gives them magic. */
  readonly gear?: Gear;
  readonly army: readonly ArmySlot[];
  readonly machines?: readonly MachineId[];
}
