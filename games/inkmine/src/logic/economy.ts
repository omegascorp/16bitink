import { canBuild, recipeOf, reserveFor, signatureReserve, type BuildCheck } from './blueprints';
import { STARTER_LOADOUT, type Loadout } from './gear';
import { addHold, capHold, EMPTY_HOLD, holdEntries, holdValue, takeHold, type Hold } from './hold';
import { blotsFor, contractDone, missionDone, oreTaken, type ContractDef, type ContractKind, type MissionDef, type Tally } from './mission';
import type { OreKey } from './ore';
import { canUpgrade, nextCost, saleRate, STARTER_SHIP, upgrade, type ModuleKey, type ShipModules, type UpgradeCheck } from './ship';

/** Best result in one level. */
export interface LevelRecord {
  readonly won: boolean;
  /** Ink blots, 0..3: the mission, and each contract ever paid. */
  readonly blots: number;
  /** Contracts paid (each pays once, ever). */
  readonly paid: readonly ContractKind[];
}

/** Everything the player owns between landings. */
export interface Profile {
  readonly credits: number;
  /** Ore kept on the ship for gear not yet built. */
  readonly hold: Hold;
  readonly gear: Loadout;
  /** Blueprint ids found (built ones stay listed). */
  readonly found: readonly string[];
  readonly ship: ShipModules;
  readonly levels: Readonly<Record<string, LevelRecord>>;
}

export const NEW_PROFILE: Profile = { credits: 0, hold: EMPTY_HOLD, gear: STARTER_LOADOUT, found: [], ship: STARTER_SHIP, levels: {} };

/** How one landing ended: lifted off with the mission done (won), left early, or the suit gave out. */
export type Ending = 'won' | 'left' | 'failed';

export interface Landing {
  readonly levelId: string;
  readonly ending: Ending;
  readonly tally: Tally;
  readonly mission: MissionDef;
  readonly contracts: readonly ContractDef[];
  /** The planet's signature material (kept for its gear). */
  readonly signature: OreKey;
  /** Blueprints banked from the pouch. */
  readonly blueprints: readonly string[];
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
  /** Ore banked this landing. */
  readonly banked: Hold;
  /** Taken by the guild and clients for the mission and orders. */
  readonly taken: Hold;
  /** Sold at lift-off, and what it fetched. */
  readonly sold: Hold;
  readonly soldFor: number;
  /** In the hold after lift-off, for gear. */
  readonly kept: Hold;
  readonly fee: number;
  readonly contracts: readonly ContractResult[];
  /** Blueprints new to the player. */
  readonly blueprints: readonly string[];
  readonly blots: number;
  readonly credits: number;
  readonly profile: Profile;
}

/** The larger count of each ore. */
function maxHold(a: Hold, b: Hold): Hold {
  const out: Partial<Record<OreKey, number>> = { ...a };
  for (const [ore, n] of holdEntries(b)) out[ore] = Math.max(out[ore] ?? 0, n);
  return out;
}

/**
 * Lift-off (or a failed landing): the guild takes what the mission asked
 * for, the hold keeps what found blueprints still need (and the planet's
 * signature material, up to what its unbuilt gear needs), and the rest is
 * sold. Banked ore always pays, even on a failed landing; the fee and the
 * contracts pay only for a won one.
 */
export function settle(p: Profile, l: Landing): Payout {
  const won = l.ending === 'won' && missionDone(l.mission, l.tally);
  const reward = won && l.mission.blueprint ? [l.mission.blueprint] : [];
  const blueprints = [...new Set([...l.blueprints, ...reward])].filter((id) => recipeOf(id) && !p.found.includes(id));
  const found = [...p.found, ...blueprints];
  const record = p.levels[l.levelId];
  const taken = won ? capHold(oreTaken(l.mission, l.contracts, l.tally, record?.paid), l.tally.banked) : EMPTY_HOLD;
  const pool = addHold(p.hold, takeHold(l.tally.banked, taken));
  const kept = capHold(maxHold(reserveFor(found, p.gear), signatureReserve(l.signature, p.gear)), pool);
  const sold = takeHold(pool, kept);
  const soldFor = holdValue(sold, saleRate(p.ship));
  const contracts = l.contracts.map((c): ContractResult => {
    const met = won && contractDone(c, l.tally, true);
    const paidBefore = !!record?.paid.includes(c.kind);
    return { contract: c, met, paid: met && !paidBefore, paidBefore };
  });
  const fee = won ? l.mission.fee : 0;
  const earned = soldFor + fee + contracts.reduce((n, c) => n + (c.paid ? c.contract.pay : 0), 0);
  const paid = [...new Set([...(record?.paid ?? []), ...contracts.filter((c) => c.paid).map((c) => c.contract.kind)])];
  const wonEver = won || !!record?.won;
  const blots = Math.max(record?.blots ?? 0, blotsFor(wonEver, paid.length));
  const levels = { ...p.levels, [l.levelId]: { won: wonEver, blots, paid } };
  const profile: Profile = { ...p, credits: p.credits + earned, hold: kept, found, levels };
  return { ending: l.ending, banked: l.tally.banked, taken, sold, soldFor, kept, fee, contracts, blueprints, blots: blotsFor(won, contracts.filter((c) => c.met).length), credits: earned, profile };
}

export type BuildResult = { readonly ok: true; readonly profile: Profile } | { readonly ok: false; readonly why: BuildCheck };

/** Fabricates a blueprint's part: materials out of the hold, the fee paid, the piece up a mark. */
export function build(p: Profile, id: string): BuildResult {
  const r = recipeOf(id);
  if (!r) return { ok: false, why: 'notFound' };
  const why = canBuild(r, p.found, p.gear, p.hold, p.credits);
  if (why !== 'ok') return { ok: false, why };
  return { ok: true, profile: { ...p, hold: takeHold(p.hold, r.materials), credits: p.credits - r.fee, gear: { ...p.gear, [r.piece]: r.mk } } };
}

export type UpgradeResult = { readonly ok: true; readonly profile: Profile } | { readonly ok: false; readonly why: UpgradeCheck };

export function upgradeShip(p: Profile, k: ModuleKey): UpgradeResult {
  const why = canUpgrade(p.ship, k, p.credits);
  if (why !== 'ok') return { ok: false, why };
  return { ok: true, profile: { ...p, credits: p.credits - (nextCost(p.ship, k) ?? 0), ship: upgrade(p.ship, k) } };
}

/** The first level is always open; each next one once the one before it is won. */
export function isOpen(p: Profile, order: readonly string[], id: string): boolean {
  const i = order.indexOf(id);
  if (i < 0) return false;
  return i === 0 || !!p.levels[order[i - 1]!]?.won;
}
