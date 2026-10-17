import { canBuild, recipeOf, type BuildCheck } from './blueprints';
import { STARTER_LOADOUT, type Loadout } from './gear';
import { addHold, holds, type Hold } from './hold';
import { contents, emptyInventory, resize, takeHoldFrom, type Inventory } from './inventory';
import { suitSpecFor } from './marks';
import { canUpgrade, CARGO_STACK, cargoSlots, nextRecipe, STARTER_SHIP, upgrade, type ModuleKey, type ShipModules, type UpgradeCheck } from './ship';
import type { RepairId } from './repairs';
import type { Beat } from './story';
import type { Tool } from './tools';
import { SUIT_STACK } from './suit';

/**
 * Everything the player owns, wherever they are on the planet. There's no
 * money: ore is kept as resources in two slot inventories, the suit's bag
 * and the ship's cargo, and every part is printed from them. (The world's
 * own changes, what's dug and what's taken, are kept apart: worldSave.ts.)
 */
export interface Profile {
  /** The suit's bag, as it was at the last save. */
  readonly suit: Inventory;
  readonly cargo: Inventory;
  readonly gear: Loadout;
  /** Blueprint ids found (built ones stay listed). */
  readonly found: readonly string[];
  readonly ship: ShipModules;
  /** The lander's systems put right since the crash (repairs.ts). */
  readonly repaired: readonly RepairId[];
  /** The opening card has been read. */
  readonly started: boolean;
  /** How far the story has come past the radio (story.ts). */
  readonly beats: readonly Beat[];
  /** One-off tools printed for the suit (tools.ts). */
  readonly tools: readonly Tool[];
  /** The lander's fuel tank, in units (fuel.ts): split from ice, burnt climbing to orbit. */
  readonly fuel: number;
}

/** Cargo slots out of use while the hull is breached (repairs.ts). */
const BREACHED = 6;

export const NEW_PROFILE: Profile = {
  suit: emptyInventory(suitSpecFor(STARTER_LOADOUT).slots, SUIT_STACK),
  cargo: emptyInventory(cargoSlots(STARTER_SHIP) - BREACHED, CARGO_STACK),
  gear: STARTER_LOADOUT,
  found: [],
  ship: STARTER_SHIP,
  repaired: [],
  started: false,
  beats: [],
  tools: [],
  fuel: 0,
};

/** Every resource on hand: the cargo and the suit's bag. */
export function onHand(p: Profile): Hold {
  return addHold(contents(p.cargo), contents(p.suit));
}

export const hasOnHand = (p: Profile) => (need: Hold): boolean => holds(onHand(p), need);

/** Takes `need` out, from the cargo first, then the suit's bag. Assumes it's all on hand (see hasOnHand). */
export function spend(p: Profile, need: Hold): Profile {
  const fromCargo = takeHoldFrom(p.cargo, need);
  const fromSuit = takeHoldFrom(p.suit, fromCargo.short);
  return { ...p, cargo: fromCargo.inv, suit: fromSuit.inv };
}

/** Cargo slots in use: what the ship gives, less those open to the dust while the hull is breached. */
export function cargoSlotsOf(p: Pick<Profile, 'ship' | 'repaired'>): number {
  return cargoSlots(p.ship) - (p.repaired.includes('hull') ? 0 : BREACHED);
}

/** Grows both inventories to what the gear, ship and repairs now give (after printing a Pack or a Cargo hold, or sealing the hull). */
export function fitInventories(p: Profile): Profile {
  return { ...p, suit: resize(p.suit, suitSpecFor(p.gear).slots, SUIT_STACK), cargo: resize(p.cargo, cargoSlotsOf(p), CARGO_STACK) };
}

/** Whether the printer works: it's the first thing the crash broke. */
export const printerWorks = (p: Profile): boolean => p.repaired.includes('printer');

/** A blueprint learnt (by studying a broken part): listed once, if it's a real one. */
export function findBlueprint(p: Profile, id: string): Profile {
  return recipeOf(id) && !p.found.includes(id) ? { ...p, found: [...p.found, id] } : p;
}

export type PrintResult<Why> = { readonly ok: true; readonly profile: Profile } | { readonly ok: false; readonly why: Why };

/** Prints a blueprint's part: materials out of the cargo (then the bag), the piece up a mark. */
export function printPart(p: Profile, id: string): PrintResult<BuildCheck | 'offline'> {
  if (!printerWorks(p)) return { ok: false, why: 'offline' };
  const r = recipeOf(id);
  if (!r) return { ok: false, why: 'notFound' };
  const why = canBuild(r, p.found, p.gear, hasOnHand(p));
  if (why !== 'ok') return { ok: false, why };
  const spent = spend(p, r.materials);
  return { ok: true, profile: fitInventories({ ...spent, gear: { ...spent.gear, [r.piece]: r.mk } }) };
}

/** Prints the next level of a lander module. */
export function printModule(p: Profile, k: ModuleKey): PrintResult<UpgradeCheck | 'offline'> {
  if (!printerWorks(p)) return { ok: false, why: 'offline' };
  const why = canUpgrade(p.ship, k, hasOnHand(p));
  if (why !== 'ok') return { ok: false, why };
  const spent = spend(p, nextRecipe(p.ship, k)!);
  return { ok: true, profile: fitInventories({ ...spent, ship: upgrade(spent.ship, k) }) };
}
