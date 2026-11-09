import type { ItemId } from './items';
import { addTroops, armyOf, emptyArmy, isEmptyArmy, type Army, type ArmySlot } from './army';
import { BUILDINGS, type BuildingDef, type BuildingId } from './buildings';
import { canManTower, creature, lineOf, strengthOf, tierOf, type CreatureId, type TownFaction } from './creatures';
import { buildingIdsOf, buildingOf, buildsAt, FACTIONS, factionOf } from './factions';
import type { Owner } from './objects';
import { affordable, canAfford, pay, RESOURCES, shortfall, type Amount, type Purse } from './resources';
import { fortification } from './siege';
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
  /** The companies placed on its towers, place by place; only one-hex shooters go up there. */
  readonly towers?: Army;
  /** Spells its mage guild teaches, floor by floor (from the map). */
  readonly guild: readonly SpellId[];
  /** A neutral town on our side: it opens its gates to our hero, and its garrison joins us. */
  readonly ally?: boolean;
  /** Gear kept in its Storehouse for any hero of ours. */
  readonly store?: readonly ItemId[];
  /** Its people (none: the Greeks', as every town before chapter 2): names its buildings and hires its own units. */
  readonly faction?: TownFaction;
  /** Ankhs its Temple of Osiris has made and no hero has taken yet. */
  readonly ankhs?: number;
}

export const has = (t: Town, b: BuildingId): boolean => t.built.includes(b);
/** Building `b` as this town's people have it. */
export const buildingIn = (t: Pick<Town, 'faction'>, b: BuildingId): BuildingDef => buildingOf(factionOf(t), b);

/** The tower places the town's Fort, Citadel and Castle have opened. */
export const towerPlaces = (t: Pick<Town, 'built'>): number => fortification(t.built)?.places ?? 0;
export const towersOf = (t: Pick<Town, 'towers'>): Army => t.towers ?? emptyArmy();
/** Nobody at all to bar the gate: no garrison, and no one on the towers. */
export const undefended = (t: Pick<Town, 'garrison' | 'towers'>): boolean => isEmptyArmy(t.garrison) && isEmptyArmy(towersOf(t));

/** How an army with no one to place them for it mans `places` towers: its strongest one-hex shooters go up, the rest fight on the ground. */
export function manTowers(army: Army, places: number): { army: Army; towers: Army } {
  const shooters = army.filter((s): s is ArmySlot => !!s && canManTower(s.creature)).sort((a, b) => strengthOf(b.creature, b.count) - strengthOf(a.creature, a.count));
  const up = shooters.slice(0, places);
  // A garrison of nothing but shooters keeps one on the ground, to hold the gate.
  const left = army.filter((s) => s && !up.includes(s));
  const towers = left.length ? up : up.slice(1);
  return { army: army.map((s) => (s && towers.includes(s) ? null : s)), towers: armyOf(towers) };
}

/** Why `b` can't be built now, or null when it can. */
export function cantBuild(t: Town, b: BuildingId, p: Purse, off: readonly BuildingId[]): string | null {
  const def = buildingIn(t, b);
  if (has(t, b)) return 'Built';
  if (!buildsAt(factionOf(t), b)) return `Not built by ${FACTIONS[factionOf(t)].name}`;
  if (off.includes(b)) return 'Not on this map';
  const missing = def.needs.filter((n) => !has(t, n));
  if (missing.length) return `Needs ${missing.map((n) => buildingIn(t, n).name).join(', ')}`;
  if (t.builtToday) return 'Already built today';
  if (!canAfford(p, def.cost)) return 'Not enough resources';
  return null;
}

/** The building `b` starts from: itself, or the first thing still in its way; null when the map keeps it out of reach. */
function firstStep(t: Town, b: BuildingId, off: readonly BuildingId[]): BuildingId | null {
  if (off.includes(b) || !buildsAt(factionOf(t), b)) return null;
  const steps = buildingIn(t, b).needs.filter((n) => !has(t, n)).map((n) => firstStep(t, n, off));
  if (steps.includes(null)) return null;
  return steps[0] ?? b;
}

/**
 * What to build next, so a player who'd rather not choose never has to: the
 * first step of the plan this map allows, null once the town is finished.
 * It waits for gold, which comes every day, but passes over what the purse
 * has no wood, ore or rare goods for, which might never come.
 */
export function suggestBuilding(t: Town, p: Purse, off: readonly BuildingId[]): BuildingId | null {
  const steps = BUILD_PLANS[factionOf(t)].filter((b) => !has(t, b)).flatMap((b) => firstStep(t, b, off) ?? []);
  const inReach = (b: BuildingId): boolean => Object.keys(shortfall(p, BUILDINGS[b].cost)).every((r) => r === 'gold');
  return steps.find(inReach) ?? steps[0] ?? null;
}

/** Builds `b`: the town and the purse after paying. A new dwelling opens with a week's growth. */
export function build(t: Town, b: BuildingId, p: Purse, off: readonly BuildingId[]): { town: Town; purse: Purse } {
  const why = cantBuild(t, b, p, off);
  if (why) throw new Error(why);
  const def = buildingIn(t, b);
  const built = [...t.built, b];
  const next = { ...t, built, builtToday: true };
  // A new dwelling opens with a week's growth; upgrading it hires better units from the same stock. A new temple has its first Ankh ready.
  const opens = def.dwelling && tierOf(def.dwelling) === 1;
  const stock = opens ? { ...t.stock, [def.dwelling!]: (t.stock[def.dwelling!] ?? 0) + growthOf(next, def.dwelling!) } : t.stock;
  return { town: { ...next, stock, ...(def.ankhs ? { ankhs: (t.ankhs ?? 0) + def.ankhs } : {}) }, purse: pay(p, def.cost) };
}

/**
 * The testing cheat: every building this map allows goes up at once and free,
 * each dwelling opening with its week's growth as usual. The same town back when nothing is left.
 */
export function buildAll(t: Town, off: readonly BuildingId[]): Town {
  const next = buildingIdsOf(factionOf(t)).find((b) => !has(t, b) && !off.includes(b) && buildingIn(t, b).needs.every((n) => has(t, n)));
  if (!next) return t;
  const free = Object.fromEntries(RESOURCES.map((r) => [r, Infinity])) as Purse;
  return buildAll({ ...build({ ...t, builtToday: false }, next, free, off).town, builtToday: t.builtToday }, off);
}

export function income(t: Town): number {
  return Math.max(0, ...t.built.map((b) => BUILDINGS[b].income ?? 0));
}

/** A line's weekly growth (`id`: any of its levels), with the walls' bonus. */
export function growthOf(t: Town, id: CreatureId): number {
  const bonus = t.built.reduce((n, b) => n + (BUILDINGS[b].growth ?? 0), 0);
  return Math.floor(creature(lineOf(id)).growth * (1 + bonus));
}

/** The units the town's built dwellings hire, its people's own. */
const hiredBy = (t: Pick<Town, 'built' | 'faction'>): CreatureId[] => t.built.map((b) => buildingIn(t, b).dwelling).filter((d): d is CreatureId => !!d);

/** The lines the town hires, by their base units, in the order their dwellings were built. */
export const dwellings = (t: Pick<Town, 'built' | 'faction'>): CreatureId[] => [...new Set(hiredBy(t).map(lineOf))];

/** The best level of `base`'s line the town hires (its highest dwelling built), or null when it hires none. */
export function bestUnit(t: Town, base: CreatureId): CreatureId | null {
  const units = hiredBy(t).filter((d) => lineOf(d) === base);
  return units.length ? units.reduce((a, b) => (tierOf(b) > tierOf(a) ? b : a)) : null;
}

/** The units waiting in `id`'s line. */
export const stockOf = (t: Town, id: CreatureId): number => t.stock[lineOf(id)] ?? 0;

/** Ankhs a town's temples make a week. */
export const ankhsAWeek = (t: Pick<Town, 'built'>): number => t.built.reduce((n, b) => n + (BUILDINGS[b].ankhs ?? 0), 0);

/** Monday: every dwelling gains a week's growth (unhired units stay), and a temple makes its Ankh. */
export function weekly(t: Town): Town {
  const stock = { ...t.stock };
  for (const d of dwellings(t)) stock[d] = (stock[d] ?? 0) + growthOf(t, d);
  const made = ankhsAWeek(t);
  return { ...t, stock, builtToday: false, ...(made ? { ankhs: (t.ankhs ?? 0) + made } : {}) };
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

/**
 * Hires every unit `t` has that the purse affords (beyond `keep` gold) into
 * `army`, the strongest lines first, so the gold goes to the best troops; a
 * kind with no room in the army waits in its dwelling. With `room`, no more
 * than that much strength is hired in all.
 */
export function hireAll(t: Town, army: Army, p: Purse, keep = 0, room = Infinity): { town: Town; army: Army; purse: Purse; hired: { id: CreatureId; count: number }[] } {
  let town = t;
  let a = army;
  let purse = p;
  let left = room;
  const hired: { id: CreatureId; count: number }[] = [];
  for (const base of [...dwellings(t)].sort((x, y) => creature(y).level - creature(x).level)) {
    const id = bestUnit(town, base);
    if (!id) continue;
    const spare = { ...purse, gold: Math.max(0, purse.gold - keep) };
    // No more than `room` of strength in all (the rest wait in the dwellings).
    const n = Math.min(hireable(town, id, spare), left === Infinity ? Infinity : Math.floor(left / strengthOf(id, 1)));
    if (n <= 0 || !addTroops(a, id, n)) continue;
    const r = hire(town, id, n, spare, a);
    town = r.town;
    a = r.army;
    purse = { ...r.purse, gold: r.purse.gold + Math.min(keep, purse.gold) };
    left -= strengthOf(id, n);
    hired.push({ id, count: n });
  }
  return { town, army: a, purse, hired };
}

/** What upgrading `count` of `from` to `to` costs: the difference in their prices. */
export function upgradeCost(from: CreatureId, to: CreatureId, count: number): Amount {
  const a = creature(from).cost;
  const b = creature(to).cost;
  return Object.fromEntries(RESOURCES.map((r) => [r, Math.max(0, (b[r] ?? 0) - (a[r] ?? 0)) * count]).filter(([, n]) => (n as number) > 0));
}

/** What `id` can be raised to in this town: its line's best level built, when that's higher. */
export function upgradeTo(t: Town, id: CreatureId): CreatureId | null {
  const best = bestUnit(t, lineOf(id));
  return best && tierOf(best) > tierOf(id) ? best : null;
}

/** The company in slot `i` of `army` raised to its line's best level built, for the difference in price; null when it can't be. */
export function upgradeSlot(t: Town, army: Army, i: number, p: Purse): { army: Army; purse: Purse } | null {
  const s = army[i];
  const to = s ? upgradeTo(t, s.creature) : null;
  if (!s || !to) return null;
  const cost = upgradeCost(s.creature, to, s.count);
  if (!canAfford(p, cost)) return null;
  return { army: army.map((x, j) => (j === i ? { creature: to, count: s.count } : x)), purse: pay(p, cost) };
}

/**
 * Every company in `armies` that `t` can raise, the strongest first, so the
 * purse goes to the best troops; one it can't afford waits at its level.
 * `upgraded` and `eligible` count units: done, and what could be with the gold.
 */
export function upgradeAll(t: Town, armies: readonly Army[], p: Purse): { armies: Army[]; purse: Purse; upgraded: number; eligible: number } {
  const slots = armies
    .flatMap((army, a) => army.flatMap((s, i) => (s && upgradeTo(t, s.creature) ? [{ a, i, level: creature(s.creature).level, count: s.count }] : [])))
    .sort((x, y) => y.level - x.level);
  let next = [...armies];
  let purse = p;
  let upgraded = 0;
  for (const { a, i, count } of slots) {
    const r = upgradeSlot(t, next[a]!, i, purse);
    if (!r) continue;
    next = next.map((army, j) => (j === a ? r.army : army));
    purse = r.purse;
    upgraded += count;
  }
  return { armies: next, purse, upgraded, eligible: slots.reduce((n, s) => n + s.count, 0) };
}

/** The spells a guild of this town teaches now. */
export function guildSpells(t: Town): SpellId[] {
  const floors = has(t, 'mageGuild2') ? 2 : has(t, 'mageGuild1') ? 1 : 0;
  return t.guild.filter((_, i) => (i < 3 ? floors >= 1 : floors >= 2));
}

export const SPELLBOOK_COST = 500;
/** What a Greek Mage Guild sells for that. */
export const SPELLBOOK_SOLD: ItemId = FACTIONS.crown.book;
/** The book a town's guild sells: its people's own. */
export const spellbookSold = (t: Pick<Town, 'faction'>): ItemId => FACTIONS[factionOf(t)].book;

/** Buildings in the order the town screen lists them (a Greek town's: see buildOrderOf). */
export const BUILD_ORDER: readonly BuildingId[] = buildingIdsOf('crown');
/** The buildings a town's hall lists, in order: every one its people build. */
export const buildOrderOf = (t: Pick<Town, 'faction'>): readonly BuildingId[] => BUILD_ORDERS[factionOf(t)];
const BUILD_ORDERS: Readonly<Record<TownFaction, readonly BuildingId[]>> = { crown: BUILD_ORDER, kemet: buildingIdsOf('kemet') };

/** The order a town grows in: income, the best troops, their growth, spells, then upgrades; whatever else there is comes last. */
const plan = (f: TownFaction, first: readonly BuildingId[]): readonly BuildingId[] => [...new Set<BuildingId>([...first, ...BUILD_ORDERS[f]])];
const CORE_PLAN: readonly BuildingId[] = [
  'townHall', 'barracks', 'archeryRange', 'citadel', 'griffinTower', 'mageGuild1', 'blacksmith',
  'guardhouse2', 'archeryRange2', 'barracks2', 'griffinTower2', 'cityHall', 'stables', 'monastery',
  'castle', 'guardhouse3', 'archeryRange3', 'barracks3', 'griffinTower3', 'tiltyard',
  // The top of the tree (Othrys opens it): the Capitol's income first, then the Titans, the last upgrades, the Titans' own.
  'capitol', 'mageGuild2', 'monastery2', 'tiltyard2', 'seraphSpire', 'monastery3', 'tiltyard3', 'seraphSpire2', 'seraphSpire3',
];
/** Each people's plan, in the order its dwellings stand: Egypt's jackals before its chariots, and its Temple of Osiris once the House of Life is up. */
export const BUILD_PLANS: Readonly<Record<TownFaction, readonly BuildingId[]>> = {
  crown: plan('crown', CORE_PLAN),
  kemet: plan('kemet', [
    'townHall', 'archeryRange', 'griffinTower', 'citadel', 'barracks', 'mageGuild1', 'templeOsiris', 'blacksmith',
    'guardhouse2', 'archeryRange2', 'griffinTower2', 'barracks2', 'cityHall', 'stables', 'monastery',
    'castle', 'guardhouse3', 'archeryRange3', 'griffinTower3', 'barracks3', 'tiltyard',
  ]),
};
/** The Greek plan (every town's before chapter 2). */
export const BUILD_PLAN: readonly BuildingId[] = BUILD_PLANS.crown;
