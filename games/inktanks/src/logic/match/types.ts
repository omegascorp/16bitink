import type { CrateContent } from '../loot';
import type { DriveFamily, Family, GunFamily, HullFamily, Loadout, Part, ShotKind } from '../parts';
import type { Research, TankStats } from '../stats';
import type { StructureDef } from '../land';
import type { IntelBag } from '../workshop';

export type Clan = 'boars' | 'weasels' | 'crows' | 'ink';
/** The body: a tank, a truck (no gun), the boss and its turrets, or a freed crew on foot. */
export type TankRole = 'tank' | 'truck' | 'boss' | 'bossTurret' | 'crew';

/** The fourth slot (design doc, Tactics §3): picked in the briefing, 2 charges a level. */
export type GadgetKind = 'mines' | 'oil' | 'smoke';
export const GADGETS: readonly GadgetKind[] = ['mines', 'oil', 'smoke'];

/** What drives a tank this step: the player's controls or a bot's. */
export interface TankInput {
  /** 'tank': A/D turn, W/S throttle. 'point': steer towards an angle (thumbstick, bots). */
  readonly move: { readonly kind: 'tank'; readonly throttle: number; readonly turn: number } | { readonly kind: 'point'; readonly angle: number; readonly mag: number } | null;
  /** Turret aim, world radians; null keeps it. */
  readonly aim: number | null;
  readonly fire: boolean;
  /** Held to swap onto the part underneath. */
  readonly swap: boolean;
  /** Pressed to start a repair kit. */
  readonly repair: boolean;
  /** Pressed to use the gadget (lay a mine, spill oil, pop smoke). */
  readonly gadget?: boolean;
}

export const IDLE: TankInput = { move: null, aim: null, fire: false, swap: false, repair: false };

export interface Tank {
  readonly id: number;
  readonly name: string;
  readonly crew: string;
  readonly clan: Clan;
  readonly team: number;
  readonly role: TankRole;
  readonly isPlayer: boolean;
  readonly ace: boolean;
  loadout: Loadout;
  research: Research;
  stats: TankStats;
  /** HP bonus kept across part swaps (aces). */
  readonly hpMult: number;
  x: number;
  y: number;
  heading: number;
  turret: number;
  /** Signed, native px per second along the heading. */
  speed: number;
  hp: number;
  alive: boolean;
  /** Left the map by its exit (a convoy truck, a runner) or reached home (a crew). */
  escaped: boolean;
  reload: number;
  /** Belt guns: rounds left, seconds left of a belt reload, and seconds since the trigger was last held. */
  ammo: number;
  beltT: number;
  idleT: number;
  /** Rocket pairs: shots still to fire, and the gap before the next. */
  burst: number;
  burstT: number;
  kits: number;
  maxKits: number;
  repairT: number;
  firedAt: number;
  kills: number;
  lastHitBy: number | null;
  lastHitAt: number;
  lastHitDrive: DriveFamily | null;
  usedKit: boolean;
  hullsUsed: HullFamily[];
  picks: Part[];
  swapT: number;
  onPart: number | null;
  /** Touching a repair kit it can't take: its kit bag is full. */
  onFullKit: boolean;
  carrying: boolean;
  /** Distance rolled, for the drive's rolling frames. */
  rolled: number;
  /** A boss turret's body, and where on it the turret sits (body frame). */
  parent: number | null;
  mount: { readonly dx: number; readonly dy: number } | null;
  /** Kills by this tank's victims' parts (for bonus objectives). */
  victims: { hull: HullFamily; drive: DriveFamily; gun: GunFamily; by: GunFamily }[];
  deadAt: number;
  /** The gadget slot: null for enemies and a player without one. */
  gadget: GadgetKind | null;
  gadgetCharges: number;
  /** No second gadget before this time (one press, one use). */
  gadgetT: number;
  /** A mine broke a track: slow until then. */
  trackBrokenUntil: number;
  /** Sim counters. */
  ambushHits: number;
  gadgetsUsed: number;
  shotsFired: number;
  shotsHit: number;
  dealt: number;
}

export interface Shot {
  readonly id: number;
  readonly owner: number;
  readonly team: number;
  x: number;
  y: number;
  readonly vx: number;
  readonly vy: number;
  travelled: number;
  readonly range: number;
  readonly damage: number;
  readonly gun: GunFamily;
  readonly splash: number;
  readonly breaksBrick: boolean;
  readonly kind: ShotKind;
  alive: boolean;
}

export type PickupKind =
  | { readonly kind: 'crate'; readonly content: CrateContent }
  | { readonly kind: 'part'; readonly part: Part }
  | { readonly kind: 'kit' }
  /** One gadget charge (from a crate). */
  | { readonly kind: 'gadget' }
  | { readonly kind: 'intel'; readonly bag: IntelBag; readonly from: string; readonly ace: boolean }
  | { readonly kind: 'proto' };

export type Pickup = PickupKind & { readonly id: number; readonly x: number; readonly y: number; taken: boolean };

export interface StructRt {
  readonly def: StructureDef;
  hp: number;
  /** 2 whole, 1 cracked, 0 breached (no longer blocks). */
  state: 2 | 1 | 0;
}

export type MatchEvent =
  | { readonly kind: 'fire'; readonly tank: number; readonly x: number; readonly y: number; readonly angle: number; readonly shot: ShotKind }
  | { readonly kind: 'hit'; readonly x: number; readonly y: number; readonly target: number | null; readonly dmg: number; readonly shot: ShotKind }
  | { readonly kind: 'explode'; readonly x: number; readonly y: number; readonly r: number }
  | { readonly kind: 'kill'; readonly killer: number | null; readonly victim: number; readonly by: GunFamily | 'artillery' }
  | { readonly kind: 'struct'; readonly id: string; readonly state: 2 | 1 | 0 }
  | { readonly kind: 'swap'; readonly tank: number; readonly part: Part; readonly dropped: Part }
  | { readonly kind: 'pickup'; readonly tank: number; readonly what: 'kit' | 'intel' | 'proto' | 'gadget'; readonly amount: number; /** For blueprints: the part family (a pickup holds one). */ readonly family?: Family }
  | { readonly kind: 'crate'; readonly x: number; readonly y: number }
  | { readonly kind: 'alarm'; readonly x: number; readonly y: number; readonly by: number }
  | { readonly kind: 'escape'; readonly tank: number }
  /** An enemy's shot hit one of its own side. */
  | { readonly kind: 'friendly'; readonly x: number; readonly y: number; readonly target: number }
  | { readonly kind: 'mark'; readonly x: number; readonly y: number; readonly r: number; readonly at: number }
  | { readonly kind: 'objective'; readonly text: string }
  | { readonly kind: 'spawn'; readonly tank: number }
  /** A hit on a calm or suspicious enemy: ×2 damage. */
  | { readonly kind: 'ambush'; readonly x: number; readonly y: number; readonly target: number; readonly dmg: number }
  /** A big gun's telegraph: the aim line held until `until` (match time), then the shot. */
  | { readonly kind: 'aim'; readonly tank: number; readonly angle: number; readonly len: number; readonly until: number }
  | { readonly kind: 'gadget'; readonly tank: number; readonly gadget: GadgetKind; readonly x: number; readonly y: number }
  | { readonly kind: 'mine'; readonly x: number; readonly y: number; readonly target: number }
  | { readonly kind: 'over'; readonly passed: boolean; readonly reason: string };

export interface MatchOver {
  readonly passed: boolean;
  readonly reason: string;
  readonly time: number;
}
