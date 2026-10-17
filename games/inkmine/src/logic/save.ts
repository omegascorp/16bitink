import type { KeyValueStore } from '@16bitink/game-sdk';
import { fitInventories, NEW_PROFILE, type Profile } from './economy';
import { PIECES, type Loadout } from './gear';
import type { Inventory, Stack } from './inventory';
import { ORES } from './ore';
import { FUEL } from './fuel';
import { SHIP_TANK, STARSHIP_IDS, type StarshipId } from './starship';
import { REPAIR_IDS, type RepairId } from './repairs';
import { MODULE_KEYS, maxLevel, storeCapacity, type ShipModules } from './ship';
import { BEATS, type Beat } from './story';
import { isDesign } from './designs';
import { NEW_STATS, type PlayStats } from './playStats';
import { STEPS } from './progress';
import { TOOLS, type Tool } from './tools';
import { isWorldId, WORLD_IDS, type WorldId } from './worlds';

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
  // Locks only on real slots, once each, in order.
  const locked = Array.isArray(v.locked) ? [...new Set(v.locked.filter((i): i is number => intIn(i, 0, slots.length - 1)))].sort((a, b) => a - b) : [];
  return locked.length ? { slots, stack, locked } : { slots, stack };
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

/** Known story beats, once each. */
function parseBeats(v: unknown): Beat[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((b): b is Beat => typeof b === 'string' && (BEATS as readonly string[]).includes(b)))];
}

/** Known tools, once each. */
function parseTools(v: unknown): Tool[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((t): t is Tool => typeof t === 'string' && (TOOLS as readonly string[]).includes(t)))];
}

/** A tank level: a whole number of units, within the tank. */
function parseFuel(v: unknown, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
}

/** The lander's stores: each a level within its tank; missing (a save from before them) means full. */
function parseStores(v: unknown, cap: number): { air: number; power: number } {
  const o = isObj(v) ? v : {};
  const level = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(cap, x)) : cap);
  return { air: level(o.air), power: level(o.power) };
}

/** Known starship systems mended, once each. */
function parseStarship(v: unknown): StarshipId[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((id): id is StarshipId => typeof id === 'string' && (STARSHIP_IDS as readonly string[]).includes(id)))];
}

/** Known worlds landed on, once each and in order, Graphite always (it's where the game starts). */
function parseVisited(v: unknown): WorldId[] {
  const listed = Array.isArray(v) ? v.filter(isWorldId) : [];
  return WORLD_IDS.filter((id) => id === 'graphite' || listed.includes(id));
}

/** A century of play: no real save comes near it. */
const MAX_PLAYED = 100 * 365 * 24 * 3600;

/** Play time within bounds, the step only if the funnel lists it, and its start no later than now. */
function parseStats(v: unknown): PlayStats {
  if (!isObj(v)) return NEW_STATS;
  const seconds = (x: unknown, max: number): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(max, x)) : 0);
  const played = seconds(v.played, MAX_PLAYED);
  const step = STEPS.some((s) => s.key === v.step) ? (v.step as string) : '';
  return { played, step, since: seconds(v.since, played) };
}

/** Untrusted saved data to a profile: anything malformed is dropped, never thrown. */
export function parseProfile(raw: unknown): Profile {
  if (!isObj(raw)) return NEW_PROFILE;
  const found = Array.isArray(raw.found) ? [...new Set(raw.found.filter((id): id is string => typeof id === 'string' && isDesign(id)))] : [];
  // Sized to what the gear and ship give, whatever the save said.
  return fitInventories({
    suit: parseInventory(raw.suit, NEW_PROFILE.suit),
    cargo: parseInventory(raw.cargo, NEW_PROFILE.cargo),
    gear: parseGear(raw.gear),
    found,
    ship: parseShip(raw.ship),
    repaired: parseRepaired(raw.repaired),
    started: raw.started === true,
    beats: parseBeats(raw.beats),
    tools: parseTools(raw.tools),
    fuel: parseFuel(raw.fuel, FUEL.max),
    docked: raw.docked === true,
    starship: parseStarship(raw.starship),
    shipFuel: parseFuel(raw.shipFuel, SHIP_TANK.capacity),
    hold: parseInventory(raw.hold, NEW_PROFILE.hold),
    stores: parseStores(raw.stores, storeCapacity(parseShip(raw.ship))),
    at: isWorldId(raw.at) ? raw.at : 'graphite',
    visited: parseVisited(raw.visited),
    stats: parseStats(raw.stats),
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
