import type { HeroDef, MapDef } from '../level/types';
import { gridOf, heroFromDef, liveObjects, ourHeroes, revealAround, townById, type Adventure } from './adventure';
import { moveAll, type Army } from './army';
import { has, type Town } from './town';
import { sightOf, type Hero } from './hero';
import { passable, tileIndex } from './map';
import { objectFootprint, townFootprint } from './objects';
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

/** Why `town` can't hire a hero now, or null when it can. */
export function cantHireHero(adv: Adventure, def: MapDef, town: Town): string | null {
  if (town.owner !== 'player') return 'Only your own towns hire heroes.';
  if (!has(town, 'tavern')) return 'Build a Tavern to hire heroes.';
  if (!recruitsLeft(adv, def).length) return (def.recruits ?? []).length ? 'Every hero here already rides with you.' : 'No hero comes to the Tavern yet.';
  if (!canAfford(adv.purse, HERO_COST)) return `A hero costs ${HERO_COST.gold} gold.`;
  if (!arrivalTile(adv, def, town)) return 'There is no room at the gate.';
  return null;
}

/** Hires the next hero at `town`'s Tavern: paid for, standing at its gate (or beside it), picked. Null when they can't be hired. */
export function hireHero(adv: Adventure, def: MapDef, townId: string): Adventure | null {
  const town = townById(adv, townId);
  if (!town || cantHireHero(adv, def, town)) return null;
  const at = arrivalTile(adv, def, town)!;
  const hero = heroFromDef({ ...recruitsLeft(adv, def)[0]!, ...at });
  const hired: Adventure = { ...adv, purse: pay(adv.purse, HERO_COST), hero, others: [...(adv.others ?? []), adv.hero] };
  return revealAround(hired, def, at.x, at.y, sightOf(hero));
}

/** Where a hero hired at `town` stands: its gate if no hero is there, else the nearest free tile outside its walls. */
function arrivalTile(adv: Adventure, def: MapDef, town: Town): { x: number; y: number } | null {
  const g = gridOf(def);
  const key = (x: number, y: number): number => tileIndex(g, x, y);
  const taken = new Set<number>([...ourHeroes(adv), ...(adv.rival?.hero ? [adv.rival.hero] : [])].map((h) => key(h.x, h.y)));
  if (!taken.has(key(town.x, town.y))) return { x: town.x, y: town.y };
  const blocked = new Set<number>(taken);
  for (const t of adv.towns) for (const f of townFootprint(t.x, t.y)) if (passable(g, f.x, f.y)) blocked.add(key(f.x, f.y));
  for (const o of liveObjects(adv)) for (const f of [o, ...objectFootprint(o)]) blocked.add(key(f.x, f.y));
  // Rings out from the gate, nearest first.
  for (let r = 1; r <= ARRIVAL_REACH; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = town.x + dx;
        const y = town.y + dy;
        if (passable(g, x, y) && !blocked.has(key(x, y))) return { x, y };
      }
    }
  }
  return null;
}
/** How far from a gate a new hero may stand, tiles. */
const ARRIVAL_REACH = 3;

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
