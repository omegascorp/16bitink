import type { BuildingId } from '../buildings';
import { BUILDINGS } from '../buildings';
import { buildsAt, factionOf } from '../factions';
import { canAfford, RESOURCES, type Amount, type Purse } from '../resources';
import { BUILD_PLANS, buildingIn, cantBuild, has, income, type Town } from '../town';

/**
 * A lord builds to a plan, not a list (Lykaon's rule 3): first a hall that
 * pays itself back within PAYBACK days, then his people's plan (the one the
 * player's suggested build follows: troops, their growth, spells, upgrades),
 * while he saves for one big goal (the Seraph Spire, then the Capitol and
 * the Titans' upgrades): a share of each day's gold goes into his savings,
 * and nothing small is bought out of them.
 */

/** A hall is worth building first when it pays its gold back in this many days. */
export const PAYBACK = 10;
/** The big buildings worth saving for, in order. */
export const BIG_GOALS: readonly BuildingId[] = ['seraphSpire', 'capitol', 'seraphSpire2', 'seraphSpire3'];
/** The share of each day's gold set aside for the big goal. */
export const SAVE_SHARE = 0.35;
const HALLS: readonly BuildingId[] = ['townHall', 'cityHall', 'capitol'];

/** The first building on the way to `b` (itself when nothing is missing); null when this map or people keep it out of reach. */
export function stepToward(t: Town, b: BuildingId, off: readonly BuildingId[]): BuildingId | null {
  if (off.includes(b) || !buildsAt(factionOf(t), b)) return null;
  if (has(t, b)) return null;
  for (const n of buildingIn(t, b).needs) {
    if (has(t, n)) continue;
    return stepToward(t, n, off);
  }
  return b;
}

/** The big building the town saves for next (none: nothing left to save for on this map). */
export function goalOf(t: Town, off: readonly BuildingId[]): BuildingId | null {
  return BIG_GOALS.find((b) => !has(t, b) && stepToward(t, b, off) !== null) ?? null;
}

/** What the purse must keep for the goal: the savings in gold, and its rare goods. */
export function keepFor(goal: BuildingId | null, savings: number): Amount {
  if (!goal) return {};
  const cost = BUILDINGS[goal].cost;
  return { ...Object.fromEntries(RESOURCES.filter((r) => r !== 'gold').map((r) => [r, cost[r] ?? 0])), gold: savings };
}

/** Whether `p` can pay `cost` and still hold `keep` (of what it has: rare goods not yet gathered aren't kept). */
const spare = (p: Purse, cost: Amount, keep: Amount): boolean => RESOURCES.every((r) => (cost[r] ?? 0) <= p[r] - Math.min(keep[r] ?? 0, p[r]));

/** A hall that pays back within PAYBACK days: the first step toward it. */
function hallStep(t: Town, off: readonly BuildingId[]): BuildingId | null {
  for (const hall of HALLS) {
    if (has(t, hall)) continue;
    const gain = (BUILDINGS[hall].income ?? 0) - income(t);
    const gold = BUILDINGS[hall].cost.gold ?? 0;
    if (gain <= 0 || gold / gain > PAYBACK) return null;
    return stepToward(t, hall, off);
  }
  return null;
}

/**
 * What town `t` builds today, out of `p`, keeping `keep` (keepFor) unless
 * it is the goal itself: a hall that pays, else the next step of the plan
 * that the spare purse allows. Null: nothing today.
 */
export function planBuild(t: Town, p: Purse, off: readonly BuildingId[], keep: Amount, goal: BuildingId | null): BuildingId | null {
  if (t.builtToday) return null;
  const ok = (b: BuildingId | null): b is BuildingId => !!b && !cantBuild(t, b, p, off) && (b === goal || spare(p, buildingIn(t, b).cost, keep));
  if (goal && stepToward(t, goal, off) === goal && ok(goal)) return goal;
  // A hall that pays waits only for gold; short of other goods it goes on with the plan.
  const hall = hallStep(t, off);
  if (hall && (ok(hall) || canAfford({ ...p, gold: Infinity }, buildingIn(t, hall).cost))) return ok(hall) ? hall : null;
  // The plan's steps in order; the first the spare purse allows (one waiting for gold holds the rest back, as the player's suggestion does).
  const steps = BUILD_PLANS[factionOf(t)].filter((b) => !has(t, b)).map((b) => stepToward(t, b, off)).filter((b): b is BuildingId => !!b && !BIG_GOALS.includes(b));
  const first = steps[0];
  if (!first) return null;
  if (ok(first)) return first;
  // Only gold is short: wait for it. Short of wood, ore or rare goods (which may never come): the next that can go up.
  const goldOnly = canAfford({ ...p, gold: Infinity }, buildingIn(t, first).cost);
  return goldOnly ? null : steps.find(ok) ?? null;
}
