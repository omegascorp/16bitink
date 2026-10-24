import { addTroops, type Army } from './army';
import { BUILDINGS, BUILDING_IDS, type BuildingId } from './buildings';
import { creature, type CreatureId } from './creatures';
import type { Owner } from './objects';
import { affordable, canAfford, pay, type Purse } from './resources';
import type { SpellId } from './spells';

export interface Town {
  readonly id: string;
  readonly name: string;
  readonly owner: Owner;
  readonly x: number;
  readonly y: number;
  readonly built: readonly BuildingId[];
  readonly builtToday: boolean;
  /** Units waiting to be hired, by creature. */
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
export function build(t: Town, b: BuildingId, p: Purse, off: readonly BuildingId[]): { town: Town; purse: Purse } {
  const why = cantBuild(t, b, p, off);
  if (why) throw new Error(why);
  const def = BUILDINGS[b];
  const built = [...t.built, b];
  const next = { ...t, built, builtToday: true };
  const stock = def.dwelling ? { ...t.stock, [def.dwelling]: (t.stock[def.dwelling] ?? 0) + growthOf(next, def.dwelling) } : t.stock;
  return { town: { ...next, stock }, purse: pay(p, def.cost) };
}

export function income(t: Town): number {
  return Math.max(0, ...t.built.map((b) => BUILDINGS[b].income ?? 0));
}

/** A dwelling's weekly growth, with the walls' bonus. */
export function growthOf(t: Town, id: CreatureId): number {
  const bonus = t.built.reduce((n, b) => n + (BUILDINGS[b].growth ?? 0), 0);
  return Math.floor(creature(id).growth * (1 + bonus));
}

export const dwellings = (t: Town): CreatureId[] => t.built.map((b) => BUILDINGS[b].dwelling).filter((d): d is CreatureId => !!d);

/** Monday: every dwelling gains a week's growth (unhired units stay). */
export function weekly(t: Town): Town {
  const stock = { ...t.stock };
  for (const d of dwellings(t)) stock[d] = (stock[d] ?? 0) + growthOf(t, d);
  return { ...t, stock, builtToday: false };
}

/** How many of `id` the player can hire now: stock and purse permitting. */
export function hireable(t: Town, id: CreatureId, p: Purse): number {
  return Math.min(t.stock[id] ?? 0, affordable(p, creature(id).cost));
}

/** Hires `count` of `id` into `army` (the visiting hero's, or the garrison). */
export function hire(t: Town, id: CreatureId, count: number, p: Purse, army: Army): { town: Town; purse: Purse; army: Army } {
  if (count <= 0 || count > hireable(t, id, p)) throw new Error('cannot hire that many');
  const next = addTroops(army, id, count);
  if (!next) throw new Error('No room in the army');
  return { town: { ...t, stock: { ...t.stock, [id]: (t.stock[id] ?? 0) - count } }, purse: pay(p, creature(id).cost, count), army: next };
}

/** The spells a guild of this town teaches now. */
export function guildSpells(t: Town): SpellId[] {
  const floors = has(t, 'mageGuild2') ? 2 : has(t, 'mageGuild1') ? 1 : 0;
  return t.guild.filter((_, i) => (i < 3 ? floors >= 1 : floors >= 2));
}

export const SPELLBOOK_COST = 500;

/** Buildings in the order the town screen lists them. */
export const BUILD_ORDER: readonly BuildingId[] = BUILDING_IDS;
