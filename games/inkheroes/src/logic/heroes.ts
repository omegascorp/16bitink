import type { HeroDef, MapDef } from '../level/types';
import { heroFromDef, ourHeroes, revealAround, townById, withTown, type Adventure } from './adventure';
import { isEmptyArmy, moveAll, type Army } from './army';
import { has, type Town } from './town';
import { sightOf, type Hero } from './hero';
import { canAfford, pay, type Purse } from './resources';

/**
 * The player's heroes. The one being moved is `adv.hero`, the rest wait in
 * `adv.others`; picking another swaps them, so every rule written for "the
 * hero" works on whichever is picked. More heroes are hired at a town's
 * Tavern from the map's own list (`MapDef.recruits`), one each.
 */

/** What a hero costs at the Tavern (H3's price). */
export const HERO_COST: Purse = { gold: 2500, wood: 0, ore: 0, mercury: 0, sulfur: 0, crystal: 0, gems: 0 };

/** `id` becomes the picked hero; the one picked before waits with the others. */
export function selectHero(adv: Adventure, id: string): Adventure {
  const others = adv.others ?? [];
  const next = others.find((h) => h.id === id);
  if (!next) return adv;
  return { ...adv, hero: next, others: [...others.filter((h) => h.id !== id), adv.hero] };
}

/** `adv` with hero `h` (picked or not) replaced by its new self. */
export function withHero(adv: Adventure, h: Hero): Adventure {
  if (adv.hero.id === h.id) return { ...adv, hero: h };
  return { ...adv, others: (adv.others ?? []).map((o) => (o.id === h.id ? h : o)) };
}

/** The heroes the map's Taverns can still hire: its list less those already riding. */
export function recruitsLeft(adv: Adventure, def: MapDef): HeroDef[] {
  const riding = new Set(ourHeroes(adv).map((h) => h.id));
  return (def.recruits ?? []).filter((r) => !riding.has(r.id));
}

/**
 * A town's two places for heroes, after Heroes III's: the garrison (a hero
 * whose companies all stand in the town's garrison row) and the gate (a
 * visiting hero leading their own army). Both stand on the town's tile;
 * the one in the garrison isn't drawn on the map.
 */
export interface TownHeroes {
  readonly garrison?: Hero;
  readonly visitor?: Hero;
}

export function townHeroes(adv: Adventure, town: Pick<Town, 'x' | 'y'>): TownHeroes {
  const here = ourHeroes(adv).filter((h) => h.x === town.x && h.y === town.y);
  return { garrison: here.find((h) => isEmptyArmy(h.army)), visitor: here.find((h) => !isEmptyArmy(h.army)) };
}

/** Why `town` can't hire a hero now, or null when it can. */
export function cantHireHero(adv: Adventure, def: MapDef, town: Town): string | null {
  if (town.owner !== 'player') return 'Only your own towns hire heroes.';
  if (!has(town, 'tavern')) return 'Build a Tavern to hire heroes.';
  if (!recruitsLeft(adv, def).length) return (def.recruits ?? []).length ? 'Every hero here already rides with you.' : 'No hero comes to the Tavern yet.';
  const { visitor } = townHeroes(adv, town);
  if (visitor) return `${visitor.name} stands in the gate. Move them into the garrison, or ride out, to make room.`;
  if (!canAfford(adv.purse, HERO_COST)) return `A hero costs ${HERO_COST.gold} gold.`;
  return null;
}

/** Hires the next hero at `town`'s Tavern: paid for, in the town's gate (its visiting place), and picked. Null when they can't be hired. */
export function hireHero(adv: Adventure, def: MapDef, townId: string): Adventure | null {
  const town = townById(adv, townId);
  if (!town || cantHireHero(adv, def, town)) return null;
  const hero = heroFromDef({ ...recruitsLeft(adv, def)[0]!, x: town.x, y: town.y });
  const hired: Adventure = { ...adv, purse: pay(adv.purse, HERO_COST), hero, others: [...(adv.others ?? []), adv.hero] };
  return revealAround(hired, def, town.x, town.y, sightOf(hero));
}

/**
 * The heroes in `town`'s garrison and gate change places, as Heroes III's
 * swap: the garrison's companies ride out with the one leaving it, and the
 * visitor's companies become the garrison. Null without both.
 */
export function swapTownHeroes(adv: Adventure, townId: string): Adventure | null {
  const town = townById(adv, townId);
  if (!town || town.owner !== 'player') return null;
  const { garrison, visitor } = townHeroes(adv, town);
  if (!garrison || !visitor) return null;
  const out = withHero(withHero(adv, { ...garrison, army: town.garrison }), { ...visitor, army: garrison.army });
  return withTown(out, { ...town, garrison: visitor.army });
}

/** Two of our heroes side by side: they can trade companies. */
export const besideEachOther = (a: Hero, b: Hero): boolean => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1;

/**
 * Two heroes who meet trade companies: `a` and `b` are their armies after
 * the trade. Each must still lead at least one company, and nothing may be
 * made or lost on the way.
 */
export function trade(adv: Adventure, aId: string, a: Army, bId: string, b: Army): Adventure | null {
  const ha = ourHeroes(adv).find((h) => h.id === aId);
  const hb = ourHeroes(adv).find((h) => h.id === bId);
  if (!ha || !hb || !besideEachOther(ha, hb)) return null;
  if (!a.some((s) => s) || !b.some((s) => s)) return null;
  if (!sameTroops([...ha.army, ...hb.army], [...a, ...b])) return null;
  return withHero(withHero(adv, { ...ha, army: a }), { ...hb, army: b });
}

/** Whether two lists of companies hold the same creatures in the same numbers. */
function sameTroops(x: Army, y: Army): boolean {
  const count = (army: Army): Map<string, number> => army.reduce((m, s) => (s ? m.set(s.creature, (m.get(s.creature) ?? 0) + s.count) : m), new Map<string, number>());
  const a = count(x);
  const b = count(y);
  return a.size === b.size && [...a].every(([k, n]) => b.get(k) === n);
}

/** All of `from`'s companies join `to` where they fit, `from` keeping the first so it still leads one; null when there's no room. */
export function sendAll(from: Army, to: Army): { from: Army; to: Army } | null {
  const first = from.findIndex((s) => s);
  if (first < 0) return null;
  const rest = from.map((s, i) => (i === first ? null : s));
  const moved = moveAll(rest, to);
  if (!moved) return null;
  return { from: from.map((s, i) => (i === first ? s : null)), to: moved.dst };
}
