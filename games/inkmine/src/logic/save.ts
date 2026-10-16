import type { KeyValueStore } from '@16bitink/game-sdk';
import { recipeOf } from './blueprints';
import { fitInventories, NEW_PROFILE, type Profile } from './economy';
import { PIECES, type Loadout } from './gear';
import type { Inventory, Stack } from './inventory';
import { ORES } from './ore';
import { REPAIR_IDS, type RepairId } from './repairs';
import { MODULE_KEYS, maxLevel, type ShipModules } from './ship';

/**
 * v3: one open world, no levels (v2's level records and pending rewards are
 * from before release and are dropped, as v1's credits were). The world's own
 * changes are saved apart (worldSave.ts).
 */
const KEY = 'inkmine.profile.v3';
/** Caps on what an untrusted save can hold. */
const MAX_SLOTS = 128;
const MAX_STACK = 1000;
const MAX_MARK = 10;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const intIn = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

/** An inventory: up to MAX_SLOTS slots, each empty or a stack of a known ore within the stack size. */
export function parseInventory<F extends Inventory | null>(v: unknown, fallback: F): Inventory | F {
  if (!isObj(v) || !intIn(v.stack, 1, MAX_STACK) || !Array.isArray(v.slots)) return fallback;
  const stack = v.stack;
  const slots = v.slots.slice(0, MAX_SLOTS).map((x): Stack | null => {
    if (!isObj(x) || typeof x.ore !== 'string' || !Object.hasOwn(ORES, x.ore) || !intIn(x.n, 1, stack)) return null;
    return { ore: x.ore as Stack['ore'], n: x.n };
  });
  return { slots, stack };
}

function parseGear(v: unknown): Loadout {
  const o = isObj(v) ? v : {};
  return Object.fromEntries(PIECES.map((p) => [p, intIn(o[p], 0, MAX_MARK) ? o[p] : 0])) as unknown as Loadout;
}

function parseShip(v: unknown): ShipModules {
  const o = isObj(v) ? v : {};
  return Object.fromEntries(MODULE_KEYS.map((k) => [k, intIn(o[k], 0, maxLevel(k)) ? o[k] : 0])) as unknown as ShipModules;
}

/** Known repairs, once each. */
function parseRepaired(v: unknown): RepairId[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((id): id is RepairId => typeof id === 'string' && (REPAIR_IDS as readonly string[]).includes(id)))];
}

/** Untrusted saved data to a profile: anything malformed is dropped, never thrown. */
export function parseProfile(raw: unknown): Profile {
  if (!isObj(raw)) return NEW_PROFILE;
  const found = Array.isArray(raw.found) ? [...new Set(raw.found.filter((id): id is string => typeof id === 'string' && !!recipeOf(id)))] : [];
  // Sized to what the gear and ship give, whatever the save said.
  return fitInventories({
    suit: parseInventory(raw.suit, NEW_PROFILE.suit),
    cargo: parseInventory(raw.cargo, NEW_PROFILE.cargo),
    gear: parseGear(raw.gear),
    found,
    ship: parseShip(raw.ship),
    repaired: parseRepaired(raw.repaired),
    started: raw.started === true,
  });
}

export function loadProfile(store: KeyValueStore | undefined): Profile {
  try {
    const raw = store?.getItem(KEY);
    return raw ? parseProfile(JSON.parse(raw)) : NEW_PROFILE;
  } catch (err) {
    console.warn('[inkmine] could not read the saved profile', err);
    return NEW_PROFILE;
  }
}

export function saveProfile(store: KeyValueStore | undefined, p: Profile): void {
  try {
    store?.setItem(KEY, JSON.stringify(p));
  } catch (err) {
    console.warn('[inkmine] could not save the profile', err);
  }
}
