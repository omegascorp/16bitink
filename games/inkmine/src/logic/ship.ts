import type { Look } from './gear';
import type { Hold } from './hold';

/**
 * The lander's modules: the ship's own upgrades, printed from resources
 * like every other part (no money in the game: what you dig is what you
 * build with). Every level has its own fixed recipe and the steps are
 * gentle, never exponential.
 *
 * The hull refit is the ship's look (the tin can, refitted, the deep
 * hauler, see landerArt.ts) and caps the other modules: each takes one level
 * more than the hull's refit, so a refit opens the next row of upgrades.
 *
 * Keys are saved: never rename one.
 */
export const MODULE_KEYS = ['cargo', 'winch', 'stores', 'hull'] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];
export type ShipModules = Readonly<Record<ModuleKey, number>>;

export interface ModuleKind {
  readonly name: string;
  /** What it does, in a few words. */
  readonly about: string;
  /** Materials for each level, from level 1 up. */
  readonly recipes: readonly Hold[];
  /** What each level gives (index 0: none built). */
  readonly gives: readonly string[];
}

/** The ship's cargo: slots at the start and per Cargo hold level, and pieces a slot stacks. */
export const CARGO_SLOTS = { base: 16, per: 6 } as const;
export const CARGO_STACK = 50;
/** Units the lander's air tank and battery each hold, by the supply tanks' level (stores.ts). */
export const STORE_CAPACITY = [600, 1200, 2000] as const;

export const MODULES: Readonly<Record<ModuleKey, ModuleKind>> = {
  cargo: {
    name: 'Cargo hold',
    about: 'More slots in the ship',
    recipes: [{ copper: 12, galena: 6 }, { copper: 20, galena: 10, silver: 4 }, { galena: 24, silver: 10, quartz: 4 }],
    gives: ['16 slots', '22 slots', '28 slots', '34 slots'],
  },
  winch: {
    name: 'Winch',
    about: 'Recall keeps part of the bag',
    recipes: [{ galena: 8, copper: 6 }, { galena: 16, silver: 4 }],
    gives: ['recall drops the bag', 'recall keeps half of each stack', 'recall keeps the whole bag'],
  },
  stores: {
    name: 'Supply tanks',
    about: "A bigger air tank and battery for topping up the suit",
    recipes: [{ copper: 10, graphite: 8, galena: 4 }, { galena: 14, silver: 6, quartz: 3 }],
    gives: STORE_CAPACITY.map((n) => `${n.toLocaleString('en-GB')} units each`),
  },
  hull: {
    name: 'Hull refit',
    about: 'A bigger lander: opens the next row of upgrades',
    recipes: [{ copper: 30, galena: 20, graphite: 10, quartz: 4 }, { galena: 40, silver: 20, quartz: 12, graphite: 20 }],
    gives: ['the tin can', 'refitted', 'the deep hauler'],
  },
};

export const STARTER_SHIP: ShipModules = { cargo: 0, winch: 0, stores: 0, hull: 0 };

/** What the lander's air tank and battery each hold with these modules. */
export function storeCapacity(s: Pick<ShipModules, 'stores'>): number {
  return STORE_CAPACITY[Math.min(s.stores, STORE_CAPACITY.length - 1)]!;
}

export function cargoSlots(s: ShipModules): number {
  return CARGO_SLOTS.base + CARGO_SLOTS.per * s.cargo;
}

/** Share of each stack a recall keeps. */
export function winchKeeps(s: ShipModules): number {
  return [0, 0.5, 1][s.winch] ?? 1;
}

export function landerLookOf(s: ShipModules): Look {
  return Math.min(2, s.hull) as Look;
}

export const maxLevel = (k: ModuleKey): number => MODULES[k].recipes.length;

/** The highest level a module can reach with this hull. */
export function capOf(s: ShipModules, k: ModuleKey): number {
  return k === 'hull' ? maxLevel(k) : Math.min(maxLevel(k), s.hull + 1);
}

/** Materials for the next level of a module, or null at its top. */
export function nextRecipe(s: ShipModules, k: ModuleKey): Hold | null {
  return MODULES[k].recipes[s[k]] ?? null;
}

export type UpgradeCheck = 'ok' | 'max' | 'hull' | 'materials';

/** Whether the next level can be printed, given what's on hand. */
export function canUpgrade(s: ShipModules, k: ModuleKey, has: (need: Hold) => boolean): UpgradeCheck {
  const recipe = nextRecipe(s, k);
  if (recipe === null) return 'max';
  if (s[k] >= capOf(s, k)) return 'hull';
  return has(recipe) ? 'ok' : 'materials';
}

export function upgrade(s: ShipModules, k: ModuleKey): ShipModules {
  return { ...s, [k]: s[k] + 1 };
}
