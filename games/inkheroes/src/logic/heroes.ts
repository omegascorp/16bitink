import type { HeroDef, MapDef } from '../level/types';
import { kitOf, kitted } from './lord/kit';
import { heroFromDef, ourHeroes, playerTowns, revealAround, townById, weekOf, withTown, type Adventure } from './adventure';
import { factionOf } from './factions';
import { rosterOf } from './roster';
import { chapterOf, partsOf } from '../level/maps';
import { isEmptyArmy, moveAll, type Army } from './army';
import { has, type Town } from './town';
import { sightOf, type Hero } from './hero';
import { canAfford, pay, type Purse } from './resources';

/**
 * The player's heroes. The one being moved is `adv.hero`, the rest wait in
 * `adv.others`; picking another swaps them, so every rule written for "the
 * hero" works on whichever is picked. More heroes are hired at a town's
 * Tavern: from the map's own list (`MapDef.recruits`), one each, or on a
 * map without one, a choice of two from the town's people's roster.
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

/** The heroes the map's own list (`MapDef.recruits`) can still hire: its list less those already riding. */
export function recruitsLeft(adv: Adventure, def: MapDef): HeroDef[] {
  const riding = new Set(ourHeroes(adv).map((h) => h.id));
  return (def.recruits ?? []).filter((r) => !riding.has(r.id));
}

/** How many heroes a Tavern hiring from the roster offers at once (H3's two). */
export const TAVERN_CHOICE = 2;

/**
 * Every hero in play: ours, the rival's (riding or beaten and coming back),
 * and the map's own story heroes (Rowan, the rival lord). A hero is in play
 * at most once a game, so these are in no Tavern.
 */
export function heroesInPlay(adv: Adventure, def: MapDef): Set<string> {
  const r = adv.rival;
  return new Set([
    def.hero.id, ...(def.rival ? [def.rival.hero.id] : []),
    ...ourHeroes(adv).map((h) => h.id),
    ...(r?.hero ? [r.hero.id] : []), ...(r?.others ?? []).map((h) => h.id), ...(r?.fallen ?? []).map((f) => f.hero.id),
  ]);
}

/** Whose Taverns: the player's, or a lord's (played on the mirrored map). */
export type TavernSide = 'player' | 'lord';

/**
 * The story's villains on a campaign map: every rival lord of its chapter's
 * parts (Kassander, Lykaon), and those the chapter names (Eirik, Gunnhild). The player's Taverns never offer them; they stay
 * in the roster for custom maps, and a lord's Taverns may hire them.
 */
export function storyVillains(def: MapDef): Set<string> {
  const chapter = chapterOf(def);
  const parts = chapter ? partsOf(chapter) : [];
  // A map not among the chapter's parts (a custom map) has no story villains.
  if (!parts.some((m) => m.id === def.id)) return new Set();
  // And the chapter's own (the Norse name theirs before their parts are built).
  return new Set([...parts.flatMap((m) => (m.rival ? [m.rival.hero.id] : [])), ...(chapter?.villains ?? [])]);
}

/** A number for hero `id` at `town` in `week`, from the game's seed: the offer takes the lowest. */
function offerRank(seed: number, week: number, townId: string, id: string): number {
  return [...`${townId}|${id}`].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, (seed ^ Math.imul(week, 0x9e3779b1)) >>> 0);
}

/**
 * The roster's heroes `town`'s Tavern offers: TAVERN_CHOICE of its
 * people's, none in play, ranked from the game's seed, the week and the
 * town (the seed never moves, so a reload offers the same). Each Tavern of
 * the side has its own pair, dealt in the side's town order, and no hero
 * stands in two at once; one hired, the next in rank fills the place at once.
 */
export function weekOffer(adv: Adventure, def: MapDef, town: Pick<Town, 'id' | 'faction'>, side: TavernSide = 'player'): HeroDef[] {
  const taken = heroesInPlay(adv, def);
  if (side === 'player') for (const id of storyVillains(def)) taken.add(id);
  const week = weekOf(adv.day);
  const ours = playerTowns(adv);
  const at = ours.findIndex((t) => t.id === town.id);
  // The side's Taverns dealt before this one (a town not of ours is dealt last).
  const before = (at < 0 ? ours : ours.slice(0, at)).filter((t) => has(t, 'tavern'));
  const deal = (t: Pick<Town, 'id' | 'faction'>): HeroDef[] => {
    const rank = (h: HeroDef): number => offerRank(adv.seed, week, t.id, h.id);
    const pair = rosterOf(factionOf(t)).filter((h) => !taken.has(h.id)).sort((a, b) => rank(a) - rank(b)).slice(0, TAVERN_CHOICE);
    for (const h of pair) taken.add(h.id);
    return pair;
  };
  for (const t of before) deal(t);
  return deal(town);
}

/** Who `town`'s Tavern offers now: the map's own next recruit (its list, in order), or, on a map without one, two from the roster. */
export function tavernHeroes(adv: Adventure, def: MapDef, town: Pick<Town, 'id' | 'faction'>, side: TavernSide = 'player'): HeroDef[] {
  return def.recruits ? recruitsLeft(adv, def).slice(0, 1) : weekOffer(adv, def, town, side);
}

/** Whether `def`'s Taverns ever have a hero to offer (map 1's don't, nor a roster still empty). */
export function tavernsHire(def: MapDef, people: Pick<Town, 'faction'>): boolean {
  return def.recruits ? def.recruits.length > 0 : rosterOf(factionOf(people)).length > 0;
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

/** The most heroes a side may have in play (H3's eight), those in a garrison too. */
export const MAX_HEROES = 8;

/** Why `town` can't hire a hero now, or null when it can. */
export function cantHireHero(adv: Adventure, def: MapDef, town: Town, side: TavernSide = 'player'): string | null {
  if (town.owner !== 'player') return 'Only your own towns hire heroes.';
  if (!has(town, 'tavern')) return 'Build a Tavern to hire heroes.';
  if (ourHeroes(adv).length >= MAX_HEROES) return `${MAX_HEROES} heroes already ride with you: the most a lord may lead.`;
  if (!tavernHeroes(adv, def, town, side).length) return tavernsHire(def, town) ? 'Every hero here already rides.' : 'No hero comes to the Tavern yet.';
  const { visitor } = townHeroes(adv, town);
  if (visitor) return `${visitor.name} stands in the gate. Move them into the garrison, or ride out, to make room.`;
  if (!canAfford(adv.purse, HERO_COST)) return `A hero costs ${HERO_COST.gold} gold.`;
  return null;
}

/** Hires hero `id` (none: the first offered) at `town`'s Tavern: paid for, in the town's gate (its visiting place), and picked. Null when they can't be hired. */
export function hireHero(adv: Adventure, def: MapDef, townId: string, id?: string, side: TavernSide = 'player'): Adventure | null {
  const town = townById(adv, townId);
  if (!town || cantHireHero(adv, def, town, side)) return null;
  const offered = tavernHeroes(adv, def, town, side);
  const pick = id === undefined ? offered[0] : offered.find((h) => h.id === id);
  if (!pick) return null;
  // A lord's hire wears what his map gives him (src/logic/lord/kit.ts).
  const placed = heroFromDef({ ...pick, x: town.x, y: town.y });
  const hero = side === 'lord' ? kitted(placed, kitOf(def, pick.id)) : placed;
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
