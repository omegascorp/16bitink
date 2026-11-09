import type { HeroDef, MapDef } from '../../level/types';
import { soldOn } from '../../level/unlocks';
import { dailyIncome, enterTown, heroTown, ourHeroes, playerTowns, townAt, withTown, type Adventure } from '../adventure';
import { creature } from '../creatures';
import { armyOf, isEmptyArmy, moveAll } from '../army';
import { HERO_COST, hireHero, selectHero, withHero } from '../heroes';
import { maxMana, type Hero } from '../hero';
import { gainItem, hasAsGood, hasSpellbook } from '../items';
import { pay, RARE, type Amount } from '../resources';
import { marketOffer, marketsOf, trade } from '../market';
import { armyStrength } from '../strength';
import { build, buildingIn, has, hireAll, SPELLBOOK_COST, spellbookSold, upgradeAll, type Town } from '../town';
import { goalOf, keepFor, planBuild, SAVE_SHARE } from './build';
import { knownFoes, type LordMemory } from './knowledge';
import { GHOST } from './mirror';

/**
 * A lord's towns (rules 2, 3, 4 and 7): each builds to the plan, a hero in
 * one hires its best, upgrades his stacks, buys the best war machine and a
 * spellbook and learns the guild's spells; the Taverns hire more heroes;
 * a town a stronger foe draws near hires into its own garrison.
 */

export interface LordRules {
  /** The heroes his Taverns hire, in order (the player's: the map's recruits). */
  readonly recruits: readonly HeroDef[];
  /** The most heroes he rides with. */
  readonly maxHeroes: number;
  /** His heroes rest in the morning (the rival's: the night rests only ours). */
  readonly rest: boolean;
  /** A hero riding out takes the garrison along even with a foe about (a person's way; the lord keeps it home then, rule 7). */
  readonly takeAll?: boolean;
}

/** The second hero is hired from this day of the part, the third once the side's gold a day reaches THIRD_INCOME. */
const SECOND_DAY = 2;
const THIRD_INCOME = 3000;
/** Gold kept after a war machine, to hire with. */
const MACHINE_RESERVE = 2000;
/** A foe this many days' ride (tiles a day) from a town, stronger than its garrison, makes it hire into the garrison. */
const DANGER_DAYS = 2;
const TILES_A_DAY = 15;

/** The side's heroes, its ghost left out. */
export const lordHeroes = (adv: Adventure): Hero[] => ourHeroes(adv).filter((h) => h.id !== GHOST);

/** Gold the purse may spend on troops today: what's above the savings. */
export const spendable = (adv: Adventure, memory: LordMemory): number => Math.max(0, adv.purse.gold - memory.savings);

/** The morning in every town of the side's: a building each, the heroes in them outfitted, and a new hero at a Tavern. */
export function townsMorning(adv: Adventure, def: MapDef, memory: LordMemory, rules: LordRules): { adv: Adventure; memory: LordMemory } {
  let a = rules.rest ? rested(adv) : adv;
  const towns = playerTowns(a);
  const main = towns.find((t) => goalOf(t, def.off)) ?? towns[0];
  const goal = main ? goalOf(main, def.off) : null;
  // A share of the day's gold goes to the savings while there is a goal, never more than its price; the goal built, they are spent.
  let savings = goal ? Math.min(a.purse.gold, buildingIn(main!, goal).cost.gold ?? 0, memory.savings + dailyIncome(a).gold * SAVE_SHARE) : 0;
  // Saved up for the goal and short only of rare goods: buy them at the Marketplace, as a player would.
  if (main && goal) a = tradeFor(a, buildingIn(main, goal).cost);
  for (const town of towns) {
    const keep = keepFor(goal, savings);
    const b = planBuild(town, a.purse, def.off, keep, town.id === main?.id ? goal : null);
    if (!b) continue;
    const r = build(town, b, a.purse, def.off);
    a = { ...withTown(a, r.town), purse: r.purse };
    if (b === goal) savings = 0;
    else savings = Math.min(savings, a.purse.gold);
  }
  const mem = { ...memory, savings };
  for (const h of lordHeroes(a)) a = outfit(a, def, h.id, mem, rules);
  return { adv: hireHeroes(a, def, mem, rules), memory: mem };
}

/** The rare goods `cost` still lacks, bought with gold at the side's Marketplaces once the gold for it all is in the purse. */
function tradeFor(adv: Adventure, cost: Amount): Adventure {
  const markets = marketsOf(adv, 'player');
  let purse = adv.purse;
  for (const r of RARE) {
    const short = (cost[r] ?? 0) - purse[r];
    const lot = short > 0 ? marketOffer(markets, 'gold', r) : null;
    if (!lot) continue;
    const lots = Math.ceil(short / lot.get);
    if (purse.gold - lot.give * lots < (cost.gold ?? 0)) continue;
    purse = trade(purse, markets, 'gold', r, lots) ?? purse;
  }
  return purse === adv.purse ? adv : { ...adv, purse };
}

/** Heroes after the night: mana back in a town with a guild, else a point. */
function rested(adv: Adventure): Adventure {
  return lordHeroes(adv).reduce((a, h) => {
    const t = townAt(a, h.x, h.y);
    const mana = t?.owner === 'player' && has(t, 'mageGuild1') ? Math.max(h.mana, maxMana(h)) : Math.min(maxMana(h), h.mana + 1);
    return withHero(a, { ...h, mana });
  }, adv);
}

/**
 * Hero `id`, in a town of the side's: a spellbook and the guild's spells,
 * the best war machine the Blacksmith sells, every unit the town hires (the
 * best level built, out of what's above the savings), and his stacks raised.
 */
export function outfit(adv: Adventure, def: MapDef, id: string, memory: LordMemory, rules?: Pick<LordRules, 'takeAll'>): Adventure {
  const picked = adv.hero.id;
  let a = selectHero(adv, id);
  const town = heroTown(a);
  // Another of ours already leads an army out of this gate: he waits his turn.
  if (!town || ourHeroes(a).some((h) => h.id !== id && h.x === town.x && h.y === town.y && !isEmptyArmy(h.army))) return adv;
  if (has(town, 'mageGuild1') && !hasSpellbook(a.hero) && spendable(a, memory) >= SPELLBOOK_COST * 3) {
    a = { ...a, purse: pay(a.purse, { gold: SPELLBOOK_COST }), hero: gainItem(a.hero, spellbookSold(town)).hero };
  }
  a = enterTown(a);
  if (has(town, 'blacksmith')) {
    const best = soldOn(def.n).filter((m) => !hasAsGood(a.hero, m) && spendable(a, memory) >= (creature(m).cost.gold ?? 0) + MACHINE_RESERVE).at(-1);
    if (best) a = { ...a, purse: pay(a.purse, creature(best).cost), hero: { ...a.hero, gear: { ...a.hero.gear, machine: best } } };
  }
  a = hireInto(a, heroTown(a)!, memory);
  a = takeGarrison(a, memory, !!rules?.takeAll);
  return a.hero.id === picked ? a : selectHero(a, picked);
}

/** The picked hero hires all `town` has with the spendable gold, then raises his stacks with what's left of it. */
function hireInto(adv: Adventure, town: Town, memory: LordMemory): Adventure {
  const keep = adv.purse.gold - spendable(adv, memory);
  const r = hireAll(town, adv.hero.army, adv.purse, keep);
  const spare = { ...r.purse, gold: Math.max(0, r.purse.gold - keep) };
  const up = upgradeAll(r.town, [r.army], spare);
  const purse = { ...up.purse, gold: up.purse.gold + Math.min(keep, r.purse.gold) };
  return withTown({ ...adv, purse, hero: { ...adv.hero, army: up.armies[0]! } }, r.town);
}

/** A town with no foe in reach gives its garrison to the hero riding out of it (the evening hires a new one with spare gold). */
function takeGarrison(adv: Adventure, memory: LordMemory, always: boolean): Adventure {
  const town = heroTown(adv);
  if (!town || isEmptyArmy(town.garrison) || (!always && foeNear(adv, memory, town, DANGER_DAYS + 1))) return adv;
  const r = moveAll(town.garrison, adv.hero.army);
  return r ? withTown({ ...adv, hero: { ...adv.hero, army: r.dst } }, { ...town, garrison: r.src }) : adv;
}

/** The strongest foe the side knows of within `days` of a day's ride of `t` (0: none). */
function foeNear(adv: Adventure, memory: LordMemory, t: { x: number; y: number }, days: number): number {
  const reach = (f: { x: number; y: number; age: number }): boolean => Math.max(Math.abs(f.x - t.x), Math.abs(f.y - t.y)) <= TILES_A_DAY * (days + f.age);
  return knownFoes(adv, memory).filter(reach).reduce((n, f) => Math.max(n, f.strength), 0);
}

/** A new hero at a Tavern of the side's: the second from SECOND_DAY of the part, the third with THIRD_INCOME a day, up to `maxHeroes`. */
function hireHeroes(adv: Adventure, def: MapDef, memory: LordMemory, rules: LordRules): Adventure {
  const riding = lordHeroes(adv);
  const day = adv.day - (adv.begun ?? 1) + 1;
  const wanted = riding.length === 0 || (riding.length === 1 && day >= SECOND_DAY) || (riding.length === 2 && dailyIncome(adv).gold >= THIRD_INCOME);
  // The second hero is worth dipping into the savings for (rule 2: by about the part's third day); a third waits for spare gold.
  const gold = riding.length <= 1 ? adv.purse.gold : spendable(adv, memory);
  if (!wanted || riding.length >= rules.maxHeroes || gold < HERO_COST.gold) return adv;
  const left = rules.recruits.filter((r) => !riding.some((h) => h.id === r.id));
  if (!left.length) return adv;
  const picked = adv.hero.id;
  for (const t of playerTowns(adv).filter((x) => has(x, 'tavern'))) {
    const hired = hireHero(adv, { ...def, recruits: left }, t.id);
    if (!hired) continue;
    // The ghost (no hero riding before) is gone once a hero is hired.
    const others = (hired.others ?? []).filter((h) => h.id !== GHOST);
    const next = { ...hired, others };
    const out = picked === GHOST ? next : selectHero(next, picked);
    return outfit(out, def, hired.hero.id, memory, rules);
  }
  return adv;
}

/**
 * The evening (rule 7): a town of the side's with a foe in reach who is
 * stronger than its garrison hires everything it can into the garrison,
 * savings and all; the side's first town is never left empty while a foe
 * is known near.
 */
export function townsEvening(adv: Adventure, def: MapDef, memory: LordMemory): Adventure {
  let a = adv;
  for (const t of playerTowns(a)) {
    const spec = [def.town, ...(def.towns ?? [])].find((x) => x.id === t.id);
    const cap = Math.max(IDLE_FLOOR, armyStrength(armyOf(spec?.garrison ?? [])) * GARRISON_GROWTH);
    const near = foeNear(a, memory, t, DANGER_DAYS);
    const inside = lordHeroes(a).filter((h) => h.x === t.x && h.y === t.y).reduce((n, h) => n + armyStrength(h.army), 0);
    const threatened = near > 0 && armyStrength(t.garrison) + inside < near;
    // Threatened: everything, savings and all. Else idle gold beyond IDLE_KEEP buys a garrison for a hero to collect.
    const keep = threatened ? 0 : a.purse.gold - Math.max(0, spendable(a, memory) - IDLE_KEEP);
    if (!threatened && keep >= a.purse.gold) continue;
    // Idle gold builds a garrison only up to `cap` (as Kassander's, rival.ts GARRISON_GROWTH): the rest waits for a hero to collect.
    const r = hireAll(t, t.garrison, a.purse, keep, threatened ? Infinity : Math.max(0, cap - armyStrength(t.garrison)));
    a = { ...withTown(a, { ...r.town, garrison: r.army }), purse: r.purse };
  }
  return a;
}

/** A garrison hired from idle gold grows to this many times its strength on the map (at least IDLE_FLOOR). */
const GARRISON_GROWTH = 1.5;
const IDLE_FLOOR = 600;
/** Gold the evening leaves unspent for the next morning's building. */
const IDLE_KEEP = 4000;
