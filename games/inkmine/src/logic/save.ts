import type { KeyValueStore } from '@16bitink/game-sdk';
import { recipeOf } from './blueprints';
import type { LevelRecord, Profile } from './economy';
import { NEW_PROFILE } from './economy';
import { PIECES, type Loadout } from './gear';
import type { Hold } from './hold';
import type { ContractKind } from './mission';
import { ORES } from './ore';
import { MODULE_KEYS, maxLevel, type ShipModules } from './ship';

const KEY = 'inkmine.profile.v1';
/** Caps on what an untrusted save can hold. */
const MAX_CREDITS = 10_000_000;
const MAX_COUNT = 100_000;
const MAX_MARK = 10;
const MAX_LEVELS = 200;
const LEVEL_ID = /^[a-z0-9-]{1,64}$/;
const CONTRACTS: Readonly<Record<ContractKind, true>> = { order: true, specimen: true, deep: true, clean: true, careful: true, rush: true };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const intIn = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

function parseHold(v: unknown): Hold {
  if (!isObj(v)) return {};
  return Object.fromEntries(Object.entries(v).filter(([k, n]) => Object.hasOwn(ORES, k) && intIn(n, 1, MAX_COUNT)));
}

function parseGear(v: unknown): Loadout {
  const o = isObj(v) ? v : {};
  return Object.fromEntries(PIECES.map((p) => [p, intIn(o[p], 0, MAX_MARK) ? o[p] : 0])) as unknown as Loadout;
}

function parseShip(v: unknown): ShipModules {
  const o = isObj(v) ? v : {};
  return Object.fromEntries(MODULE_KEYS.map((k) => [k, intIn(o[k], 0, maxLevel(k)) ? o[k] : 0])) as unknown as ShipModules;
}

function parseRecord(v: unknown): LevelRecord | null {
  if (!isObj(v) || typeof v.won !== 'boolean' || !intIn(v.blots, 0, 3)) return null;
  const paid = Array.isArray(v.paid) ? [...new Set(v.paid.filter((k): k is ContractKind => typeof k === 'string' && Object.hasOwn(CONTRACTS, k)))] : [];
  return { won: v.won, blots: v.blots, paid };
}

/** Untrusted saved data to a profile: anything malformed is dropped, never thrown. */
export function parseProfile(raw: unknown): Profile {
  if (!isObj(raw)) return NEW_PROFILE;
  const levels = isObj(raw.levels)
    ? Object.entries(raw.levels).slice(0, MAX_LEVELS).flatMap(([id, r]) => {
      const rec = LEVEL_ID.test(id) ? parseRecord(r) : null;
      return rec ? [[id, rec] as const] : [];
    })
    : [];
  const found = Array.isArray(raw.found) ? [...new Set(raw.found.filter((id): id is string => typeof id === 'string' && !!recipeOf(id)))] : [];
  return {
    credits: intIn(raw.credits, 0, MAX_CREDITS) ? raw.credits : 0,
    hold: parseHold(raw.hold),
    gear: parseGear(raw.gear),
    found,
    ship: parseShip(raw.ship),
    levels: Object.fromEntries(levels),
  };
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
