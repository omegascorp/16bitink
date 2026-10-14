import { canBuild, recipeOf, type BuildCheck } from './blueprints';
import { STARTER_LOADOUT, type Loadout } from './gear';
import { addHold, capHold, EMPTY_HOLD, holds, sumHolds, type Hold } from './hold';
import { addHoldTo, contents, emptyInventory, resize, takeHoldFrom, type Inventory } from './inventory';
import { suitSpecFor } from './marks';
import { blotsFor, contractDone, missionDone, oreTaken, type ContractDef, type ContractKind, type MissionDef, type Tally } from './mission';
import { canUpgrade, CARGO_STACK, cargoSlots, nextRecipe, STARTER_SHIP, upgrade, type ModuleKey, type ShipModules, type UpgradeCheck } from './ship';
import { SUIT_STACK } from './suit';

/** Best result in one level. */
export interface LevelRecord {
  readonly won: boolean;
  /** Ink blots, 0..3: the mission, and each contract ever paid. */
  readonly blots: number;
  /** Contracts paid (each pays once, ever). */
  readonly paid: readonly ContractKind[];
}

/**
 * Everything the player owns between landings. There's no money: ore is
 * kept as resources in two slot inventories, the suit's bag and the ship's
 * cargo, and every part is printed from them.
 */
export interface Profile {
  /** The suit's bag: whatever didn't fit in the cargo last time. */
  readonly suit: Inventory;
  readonly cargo: Inventory;
  /** Rewards the guild is holding until the cargo has room. */
  readonly pending: Hold;
  readonly gear: Loadout;
  /** Blueprint ids found (built ones stay listed). */
  readonly found: readonly string[];
  readonly ship: ShipModules;
  readonly levels: Readonly<Record<string, LevelRecord>>;
}

export const NEW_PROFILE: Profile = {
  suit: emptyInventory(suitSpecFor(STARTER_LOADOUT).slots, SUIT_STACK),
  cargo: emptyInventory(cargoSlots(STARTER_SHIP), CARGO_STACK),
  pending: EMPTY_HOLD,
  gear: STARTER_LOADOUT,
  found: [],
  ship: STARTER_SHIP,
  levels: {},
};

/** Every resource on hand: the cargo and the suit's bag. */
export function onHand(p: Profile): Hold {
  return addHold(contents(p.cargo), contents(p.suit));
}

export const hasOnHand = (p: Profile) => (need: Hold): boolean => holds(onHand(p), need);

/** Takes `need` out, from the cargo first, then the suit's bag. Assumes it's all on hand (see hasOnHand). */
function spend(p: Profile, need: Hold): Profile {
  const fromCargo = takeHoldFrom(p.cargo, need);
  const fromSuit = takeHoldFrom(p.suit, fromCargo.short);
  return { ...p, cargo: fromCargo.inv, suit: fromSuit.inv };
}

/** Grows both inventories to what the gear and ship now give (after printing a Pack or a Cargo hold). */
export function fitInventories(p: Profile): Profile {
  return { ...p, suit: resize(p.suit, suitSpecFor(p.gear).slots, SUIT_STACK), cargo: resize(p.cargo, cargoSlots(p.ship), CARGO_STACK) };
}

/** Moves whatever the guild is holding into the cargo, as far as it has room. */
export function claimPending(p: Profile): Profile {
  const r = addHoldTo(p.cargo, p.pending);
  return { ...p, cargo: r.inv, pending: r.left };
}

/** How one landing ended: lifted off with the mission done (won), left early, or the suit gave out. */
export type Ending = 'won' | 'left' | 'failed';

export interface Landing {
  readonly levelId: string;
  readonly ending: Ending;
  readonly tally: Tally;
  readonly mission: MissionDef;
  readonly contracts: readonly ContractDef[];
  /** Blueprints banked from the pouch. */
  readonly blueprints: readonly string[];
  /** The cargo and the suit's bag as the landing ended. */
  readonly cargo: Inventory;
  readonly bag: Inventory;
}

export interface ContractResult {
  readonly contract: ContractDef;
  readonly met: boolean;
  /** Paid this time (met, and never paid before). */
  readonly paid: boolean;
  /** Paid on an earlier landing. */
  readonly paidBefore: boolean;
}

/** The result card's numbers, and the profile after them. */
export interface Payout {
  readonly ending: Ending;
  /** Ore banked into the cargo this landing. */
  readonly banked: Hold;
  /** Taken from the cargo by the guild and clients for the mission and orders. */
  readonly taken: Hold;
  /** Lost with the suit's bag when it gave out. */
  readonly lost: Hold;
  /** Paid by the guild and clients: the mission's pay and new contracts'. */
  readonly rewards: Hold;
  /** Rewards that didn't fit in the cargo: the guild holds them. */
  readonly pending: Hold;
  readonly contracts: readonly ContractResult[];
  /** Blueprints new to the player. */
  readonly blueprints: readonly string[];
  readonly blots: number;
  readonly profile: Profile;
}

/**
 * Lift-off (or a failed landing). Ore banked in the cargo is yours whatever
 * happens; the guild takes what the mission asked for from it, and pays in
 * resources. A suit that gave out loses its bag. The mission's pay, the
 * contracts and the mission's blueprint come only with a won lift-off;
 * blueprints banked from the pouch are yours either way.
 */
export function settle(p: Profile, l: Landing): Payout {
  const won = l.ending === 'won' && missionDone(l.mission, l.tally);
  const reward = won && l.mission.blueprint ? [l.mission.blueprint] : [];
  const blueprints = [...new Set([...l.blueprints, ...reward])].filter((id) => recipeOf(id) && !p.found.includes(id));
  const record = p.levels[l.levelId];
  const taken = won ? capHold(oreTaken(l.mission, l.contracts, l.tally, record?.paid), l.tally.banked) : EMPTY_HOLD;
  const cargo = takeHoldFrom(l.cargo, taken).inv;
  const failed = l.ending === 'failed';
  const lost = failed ? contents(l.bag) : EMPTY_HOLD;
  const suit = failed ? emptyInventory(l.bag.slots.length, l.bag.stack) : l.bag;
  const contracts = l.contracts.map((c): ContractResult => {
    const met = won && contractDone(c, l.tally, true);
    const paidBefore = !!record?.paid.includes(c.kind);
    return { contract: c, met, paid: met && !paidBefore, paidBefore };
  });
  const rewards = won ? sumHolds([l.mission.pays, ...contracts.filter((c) => c.paid).map((c) => c.contract.pay)]) : EMPTY_HOLD;
  const paid = [...new Set([...(record?.paid ?? []), ...contracts.filter((c) => c.paid).map((c) => c.contract.kind)])];
  const wonEver = won || !!record?.won;
  const blots = Math.max(record?.blots ?? 0, blotsFor(wonEver, paid.length));
  const levels = { ...p.levels, [l.levelId]: { won: wonEver, blots, paid } };
  const profile = claimPending({ ...p, cargo, suit, pending: addHold(p.pending, rewards), found: [...p.found, ...blueprints], levels });
  return {
    ending: l.ending, banked: l.tally.banked, taken, lost, rewards, pending: profile.pending, contracts, blueprints,
    blots: blotsFor(won, contracts.filter((c) => c.met).length), profile,
  };
}

export type PrintResult<Why> = { readonly ok: true; readonly profile: Profile } | { readonly ok: false; readonly why: Why };

/** Prints a blueprint's part: materials out of the cargo (then the bag), the piece up a mark. */
export function printPart(p: Profile, id: string): PrintResult<BuildCheck> {
  const r = recipeOf(id);
  if (!r) return { ok: false, why: 'notFound' };
  const why = canBuild(r, p.found, p.gear, hasOnHand(p));
  if (why !== 'ok') return { ok: false, why };
  const spent = spend(p, r.materials);
  return { ok: true, profile: claimPending(fitInventories({ ...spent, gear: { ...spent.gear, [r.piece]: r.mk } })) };
}

/** Prints the next level of a lander module. */
export function printModule(p: Profile, k: ModuleKey): PrintResult<UpgradeCheck> {
  const why = canUpgrade(p.ship, k, hasOnHand(p));
  if (why !== 'ok') return { ok: false, why };
  const spent = spend(p, nextRecipe(p.ship, k)!);
  return { ok: true, profile: claimPending(fitInventories({ ...spent, ship: upgrade(spent.ship, k) })) };
}

/** The first level is always open; each next one once the one before it is won. */
export function isOpen(p: Profile, order: readonly string[], id: string): boolean {
  const i = order.indexOf(id);
  if (i < 0) return false;
  return i === 0 || !!p.levels[order[i - 1]!]?.won;
}
