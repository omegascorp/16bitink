import type { Look } from './gear';

/**
 * The lander's modules: the ship's own upgrades, bought with credits only
 * (gear takes blueprints and materials; the ship takes money, so credits
 * always have somewhere to go). Every price is fixed and the steps are
 * gentle, never exponential.
 *
 * The hull refit is the ship's look (the tin can, refitted, the deep
 * hauler, see landerArt.ts) and caps the other modules: each takes one level
 * more than the hull's refit, so a refit opens the next row of upgrades.
 *
 * Keys are saved: never rename one.
 */
export const MODULE_KEYS = ['winch', 'hopper', 'rack', 'hull'] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];
export type ShipModules = Readonly<Record<ModuleKey, number>>;

export interface ModuleKind {
  readonly name: string;
  /** What it does, in a few words. */
  readonly about: string;
  /** Credits for each level, from level 1 up. */
  readonly costs: readonly number[];
  /** What each level gives (index 0: none built). */
  readonly gives: readonly string[];
}

export const MODULES: Readonly<Record<ModuleKey, ModuleKind>> = {
  winch: {
    name: 'Winch',
    about: 'Recall keeps part of the bag',
    costs: [120, 300],
    gives: ['recall drops the bag', 'recall keeps half the bag', 'recall keeps the whole bag'],
  },
  hopper: {
    name: 'Assay hopper',
    about: 'Ore sells for more',
    costs: [150, 400, 900],
    gives: ['ore sells at the guild rate', 'ore sells for 10% more', 'ore sells for 20% more', 'ore sells for 30% more'],
  },
  rack: {
    name: 'Ladder rack',
    about: 'More ladders each landing',
    costs: [80, 200, 450],
    gives: ['4 ladders', '6 ladders', '8 ladders', '10 ladders'],
  },
  hull: {
    name: 'Hull refit',
    about: 'A bigger lander: opens the next row of upgrades',
    costs: [400, 1500],
    gives: ['the tin can', 'refitted', 'the deep hauler'],
  },
};

export const STARTER_SHIP: ShipModules = { winch: 0, hopper: 0, rack: 0, hull: 0 };

/** Share of the bag a recall keeps. */
export function winchKeeps(s: ShipModules): number {
  return [0, 0.5, 1][s.winch] ?? 1;
}

/** What banked ore sells for, as a multiple of the guild rate. */
export function saleRate(s: ShipModules): number {
  return 1 + 0.1 * s.hopper;
}

export function laddersFor(s: ShipModules): number {
  return 4 + 2 * s.rack;
}

export function landerLookOf(s: ShipModules): Look {
  return Math.min(2, s.hull) as Look;
}

export const maxLevel = (k: ModuleKey): number => MODULES[k].costs.length;

/** The highest level a module can reach with this hull. */
export function capOf(s: ShipModules, k: ModuleKey): number {
  return k === 'hull' ? maxLevel(k) : Math.min(maxLevel(k), s.hull + 1);
}

export type UpgradeCheck = 'ok' | 'max' | 'hull' | 'credits';

/** Credits for the next level of a module, or null at its top. */
export function nextCost(s: ShipModules, k: ModuleKey): number | null {
  return MODULES[k].costs[s[k]] ?? null;
}

export function canUpgrade(s: ShipModules, k: ModuleKey, credits: number): UpgradeCheck {
  const cost = nextCost(s, k);
  if (cost === null) return 'max';
  if (s[k] >= capOf(s, k)) return 'hull';
  return credits >= cost ? 'ok' : 'credits';
}

export function upgrade(s: ShipModules, k: ModuleKey): ShipModules {
  return { ...s, [k]: s[k] + 1 };
}
