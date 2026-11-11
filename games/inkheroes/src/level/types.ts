import type { Specialty } from '../logic/specialty';
import type { ArmySlot } from '../logic/army';
import type { BuildingId } from '../logic/buildings';
import type { TownFaction } from '../logic/creatures';
import type { HeroClass } from '../logic/hero';
import type { Gear } from '../logic/items';
import type { LineId } from '../narration/lines';
import type { MapObject } from '../logic/objects';
import type { Amount } from '../logic/resources';
import type { Skills } from '../logic/skills';
import type { SpellId } from '../logic/spells';

export type Goal =
  | { readonly kind: 'defeat'; readonly target: string; readonly text: string }
  | { readonly kind: 'capture'; readonly target: string; readonly text: string }
  /** Town `target` taken and the map's rival lord beaten, in either order. */
  | { readonly kind: 'overthrow'; readonly target: string; readonly text: string };

/** A picture on the map that is nothing to visit (src/scenes/map/pixelMapArt.ts has the same shape): its id, its art's name, its feet's tile. */
export interface MapLandmark {
  readonly id: string;
  readonly art: string;
  readonly x: number;
  readonly y: number;
}

/** A hand-made campaign map. */
export interface MapDef {
  readonly id: string;
  readonly name: string;
  /** Its place in the campaign (1-based). */
  readonly n: number;
  /** What the player needs to know as the part opens, short: the opening card shows it over the goal while the story is told aloud. */
  readonly brief: string;
  /** The part's story, told by the narrator as it opens (src/narration/lines.ts); with narration off, the opening card shows its words instead of the brief. */
  readonly story?: LineId;
  readonly goal: Goal;
  /** Win within this many days for the second blot. */
  readonly parDays: number;
  /** Rows of tile characters (see TILE_CHARS). */
  readonly rows: readonly string[];
  readonly objects: readonly MapObject[];
  /** Pictures that stand on the map and are nothing to visit (Uppsala's temple): feet on tile (x, y), drawn by `art` (src/scenes/map/pixelMapArt.ts). The ground under them is blocked by the map's own tiles. */
  readonly landmarks?: readonly MapLandmark[];
  readonly town: {
    readonly id: string;
    readonly name: string;
    readonly x: number;
    readonly y: number;
    readonly built: readonly BuildingId[];
    readonly guild: readonly SpellId[];
    /** Troops holding it on day one (none if left out). */
    readonly garrison?: readonly ArmySlot[];
    /** Its people (none: the Greeks'). */
    readonly faction?: TownFaction;
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
    /** Its people (none: the Greeks'). */
    readonly faction?: TownFaction;
    /** Both sides race for it from the part's third night (the rival rides for it then): it is never handed over, its garrison must be beaten. */
    readonly race?: boolean;
    /** Its own picture on the map (a key of TOWN_LOOKS in src/art/pixel/map.ts), when it isn't drawn as its people's town: Nubt flies Set's red banners. */
    readonly look?: string;
  }[];
  readonly hero: HeroDef;
  /** A rival lord: an AI hero who rides out from the map's rival-held towns. */
  readonly rival?: {
    readonly hero: HeroDef;
    /** What the rival builds, in order, one a day while the purse allows. */
    readonly build: readonly BuildingId[];
    readonly purse: Amount;
    /** The share of the days before the part that he had at home (src/logic/rival.ts HEAD_START, 0.75, when left out). */
    readonly headStart?: number;
    /** How he thinks: left out, the one-hero rival of rival.ts (picks the best thing in reach, with a head start); `lord`, a player's mind (src/logic/lord/), with no head start. */
    readonly mind?: 'lord';
    /** A lord: the most heroes he rides with, hired at his Taverns (3 when left out, src/logic/lord/turn.ts). */
    readonly heroes?: number;
    /** What his heroes start wearing, by hero id (his own and those his Taverns hire), at no cost to his balance: their four stats are lowered by what it adds (src/logic/lord/kit.ts). */
    readonly kit?: Readonly<Record<string, Gear>>;
    /** A lord's town whose garrison stays behind its walls: his heroes never take it along (Avaldsnes's huscarls), so storming it is a siege while he rides. */
    readonly holds?: string;
    /**
     * A lord's captains out of the story, riding with him from the part's
     * start (Eirik, fled north to Gunnhild): played fresh, always; ridden on,
     * only one the part before left alive (beaten in the field and fled, in
     * its rival's `fallen`; not gone with his banner). Never hired at a Tavern.
     */
    readonly captains?: readonly HeroDef[];
    /** What the narrator tells the first time a captain of his is seen (`captains`' first: Eirik's return). */
    readonly captainLine?: LineId;
    /** What the narrator tells the first time the lord himself is seen (Eirik's, Gunnhild's). */
    readonly line?: LineId;
  };
  readonly purse: Amount;
  /** What the Crown sends when the chapter rides on into this part (a part played straight on from the one before keeps its purse). */
  readonly grant?: Amount;
  /** The way into this part from the last: the land along it is seen from the start, and the map flies along it once the part's card is read. */
  readonly opening?: {
    readonly text: string;
    readonly way: readonly { readonly x: number; readonly y: number }[];
    /** The way's points are ways in of their own (Othrys's three): the land shows round each, not along the lines between. */
    readonly apart?: boolean;
  };
  /** The heroes a Tavern of ours can hire on this map, in order (each one once; x and y are where they stand when hired). */
  readonly recruits?: readonly HeroDef[];
  /** Set's sandstorms: every this many days of the part (its 4th, 8th…), sand costs double to cross for everyone, and the day card warns the morning before. */
  readonly stormEvery?: number;
  /** What the narrator tells as this part is won and the chapter rides on (on a chapter's last part, before the chapter's ending). */
  readonly won?: LineId;
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
  /** Their people (none: the Greeks'). */
  readonly faction?: TownFaction;
  /** Ankhs they carry from the start. */
  readonly ankhs?: number;
  /** A line about them, for the Tavern that hires them. */
  readonly blurb?: string;
  /** What they do best (src/logic/specialty.ts); left out, the roster's for their id (src/logic/roster). */
  readonly specialty?: Specialty;
}
