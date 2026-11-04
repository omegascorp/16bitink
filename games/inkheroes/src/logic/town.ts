import { addTroops, type Army } from './army';
import { BUILDINGS, BUILDING_IDS, type BuildingId } from './buildings';
import { creature, lineOf, tierOf, type CreatureId } from './creatures';
import type { Owner } from './objects';
import { affordable, canAfford, pay, RESOURCES, type Amount, type Purse } from './resources';
import type { SpellId } from './spells';

export interface Town {
  readonly id: string;
  readonly name: string;
  readonly owner: Owner;
  readonly x: number;
  readonly y: number;
  readonly built: readonly BuildingId[];
  readonly builtToday: boolean;
  /** Units waiting to be hired, by line (its base creature): every level of a line hires from it. */
  readonly stock: Readonly<Partial<Record<CreatureId, number>>>;
  readonly garrison: Army;
  /** Spells its mage guild teaches, floor by floor (from the map). */
  readonly guild: readonly SpellId[];
}

export const has = (t: Town, b: BuildingId): boolean => t.built.includes(b);

/** Why `b` can't be built now, or null when it can. */
export function cantBuild(t: Town, b: BuildingId, p: Purse, off: readonly BuildingId[]): string | null {
  const def = BUILDINGS[b];
  if (has(t, b)) return 'Built';
  if (off.includes(b)) return 'Not on this map';
  const missing = def.needs.filter((n) => !has(t, n));
  if (missing.length) return `Needs ${missing.map((n) => BUILDINGS[n].name).join(', ')}`;
  if (t.builtToday) return 'Already built today';
  if (!canAfford(p, def.cost)) return 'Not enough resources';
  return null;
}

/** Builds `b`: the town and the purse after paying. A new dwelling opens with a week's growth. */
/** The first building of `order` this town hasn't built and the map allows, or null when it's all done. */
export function advisedNext(t: Town, order: readonly BuildingId[], off: readonly BuildingId[]): BuildingId | null {
  return order.find((b) => !has(t, b) && !off.includes(b)) ?? null;
}

export function build(t: Town, b: BuildingId, p: Purse, off: readonly BuildingId[]): { town: Town; purse: Purse } {
  const why = cantBuild(t, b, p, off);
  if (why) throw new Error(why);
  const def = BUILDINGS[b];
  const built = [...t.built, b];
  const next = { ...t, built, builtToday: true };
  // A new dwelling opens with a week's growth; upgrading it hires better units from the same stock.
  const opens = def.dwelling && tierOf(def.dwelling) === 1;
  const stock = opens ? { ...t.stock, [def.dwelling!]: (t.stock[def.dwelling!] ?? 0) + growthOf(next, def.dwelling!) } : t.stock;
  return { town: { ...next, stock }, purse: pay(p, def.cost) };
}

export function income(t: Town): number {
  return Math.max(0, ...t.built.map((b) => BUILDINGS[b].income ?? 0));
}

/** A line's weekly growth (`id`: any of its levels), with the walls' bonus. */
export function growthOf(t: Town, id: CreatureId): number {
  const bonus = t.built.reduce((n, b) => n + (BUILDINGS[b].growth ?? 0), 0);
  return Math.floor(creature(lineOf(id)).growth * (1 + bonus));
}

/** The lines the town hires, by their base units, in the order their dwellings were built. */
export const dwellings = (t: Town): CreatureId[] => [...new Set(t.built.map((b) => BUILDINGS[b].dwelling).filter((d): d is CreatureId => !!d).map(lineOf))];

/** The best level of `base`'s line the town hires (its highest dwelling built), or null when it hires none. */
export function bestUnit(t: Town, base: CreatureId): CreatureId | null {
  const units = t.built.map((b) => BUILDINGS[b].dwelling).filter((d): d is CreatureId => !!d && lineOf(d) === base);
  return units.length ? units.reduce((a, b) => (tierOf(b) > tierOf(a) ? b : a)) : null;
}

/** The units waiting in `id`'s line. */
export const stockOf = (t: Town, id: CreatureId): number => t.stock[lineOf(id)] ?? 0;

/** Monday: every dwelling gains a week's growth (unhired units stay). */
export function weekly(t: Town): Town {
  const stock = { ...t.stock };
  for (const d of dwellings(t)) stock[d] = (stock[d] ?? 0) + growthOf(t, d);
  return { ...t, stock, builtToday: false };
}

/** How many of `id` the player can hire now: stock and purse permitting. */
export function hireable(t: Town, id: CreatureId, p: Purse): number {
  return Math.min(stockOf(t, id), affordable(p, creature(id).cost));
}

/** Hires `count` of `id` into `army` (the visiting hero's, or the garrison). */
export function hire(t: Town, id: CreatureId, count: number, p: Purse, army: Army): { town: Town; purse: Purse; army: Army } {
  if (count <= 0 || count > hireable(t, id, p)) throw new Error('cannot hire that many');
  const next = addTroops(army, id, count);
  if (!next) throw new Error('No room in the army');
  const line = lineOf(id);
  return { town: { ...t, stock: { ...t.stock, [line]: stockOf(t, id) - count } }, purse: pay(p, creature(id).cost, count), army: next };
}

/** What upgrading `count` of `from` to `to` costs: the difference in their prices. */
export function upgradeCost(from: CreatureId, to: CreatureId, count: number): Amount {
  const a = creature(from).cost;
  const b = creature(to).cost;
  return Object.fromEntries(RESOURCES.map((r) => [r, Math.max(0, (b[r] ?? 0) - (a[r] ?? 0)) * count]).filter(([, n]) => (n as number) > 0));
}

/**
 * Every stack of `base`'s line in `army` below the town's best level, raised
 * to it, whole stacks only, in slot order while the purse lasts. Returns the
 * army, the purse and how many units were upgraded.
 */
export function upgradeStacks(t: Town, base: CreatureId, army: Army, p: Purse): { army: Army; purse: Purse; upgraded: number } {
  const best = bestUnit(t, base);
  let purse = p;
  let upgraded = 0;
  const next = army.map((s) => {
    if (!best || !s || lineOf(s.creature) !== base || tierOf(s.creature) >= tierOf(best)) return s;
    const cost = upgradeCost(s.creature, best, s.count);
    if (!canAfford(purse, cost)) return s;
    purse = pay(purse, cost);
    upgraded += s.count;
    return { creature: best, count: s.count };
  });
  return { army: next, purse, upgraded };
}

/** The stacks of `base`'s line in `army` that the town could upgrade, and what all of them would cost. */
export function upgradable(t: Town, base: CreatureId, army: Army): { count: number; cost: Amount } {
  const best = bestUnit(t, base);
  let count = 0;
  let cost: Amount = {};
  for (const s of army) {
    if (!best || !s || lineOf(s.creature) !== base || tierOf(s.creature) >= tierOf(best)) continue;
    count += s.count;
    const c = upgradeCost(s.creature, best, s.count);
    cost = Object.fromEntries(RESOURCES.map((r) => [r, (cost[r] ?? 0) + (c[r] ?? 0)]).filter(([, n]) => (n as number) > 0));
  }
  return { count, cost };
}

/** The spells a guild of this town teaches now. */
export function guildSpells(t: Town): SpellId[] {
  const floors = has(t, 'mageGuild2') ? 2 : has(t, 'mageGuild1') ? 1 : 0;
  return t.guild.filter((_, i) => (i < 3 ? floors >= 1 : floors >= 2));
}

export const SPELLBOOK_COST = 500;

/** Buildings in the order the town screen lists them. */
export const BUILD_ORDER: readonly BuildingId[] = BUILDING_IDS;
