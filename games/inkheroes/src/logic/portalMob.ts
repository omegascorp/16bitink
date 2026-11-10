import type { MapDef } from '../level/types';
import { partNumber } from '../level/maps';
import { checkGoal, heroInGarrison, heroTown, itemLine, monsterArmy, ourHeroes, playerArmy, townById, weekOf, withTown, type Adventure, type Prompt } from './adventure';
import { armyOf, isEmptyArmy, type Army } from './army';
import type { BattleState } from './battleTypes';
import { playerSide } from './battle';
import { creature, strengthOf, type CreatureId } from './creatures';
import { townHeroes } from './heroes';
import { gainItem, itemDef, QUALITY_NAMES, type ItemId, type Quality } from './items';
import { gradeOn, lootFaction, LOOT_ROWS, partOf, pickPiece } from './loot';
import { LAIR_GROWTH } from './lairs';
import { roll } from './rng';
import { keepIn } from './storage';
import { armyStrength } from './strength';
import { buildingIn, has, type Town } from './town';

/**
 * The Portal's weekly mob (its second level, user Nov 9): each town with
 * one calls a band of the land's creatures each week, one of the kinds the
 * map's own guards are, about as strong as this part's middle guard and
 * growing each week of the part as a lair's groups do. The band, its grade
 * of gear and whether it carries one are fixed by the game's seed, the town
 * and the week, so a reload never rerolls them. A hero in the town (gate or
 * garrison) with an army and movement left fights it, which takes the rest
 * of their day; a win is a battle's experience and, half the time, a piece
 * of that grade, and the band is gone until next week. A loss costs the
 * army, but the Portal brings the hero home: they stay in the town, in its
 * garrison. Fought as battle PORTAL + the town's id (adventure.ts).
 */

/** The share of a week's band that carries a piece. */
export const MOB_DROP = 0.5;
/** A band's strength against an army's, and the word for it: weak below the first, about even below the second, else dangerous. */
export const MOB_ODDS = { weak: 0.6, even: 1.2 } as const;

export interface PortalMob {
  readonly creature: CreatureId;
  readonly count: number;
  readonly army: Army;
  readonly strength: number;
  /** The experience for beating all of it (the hit points it brings). */
  readonly xp: number;
  /** The grade of the piece it may carry. */
  readonly grade: Quality;
}

const hash = (s: string): number => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

/** The draws a town's band uses in `week`, in order: kind, grade, whether it carries a piece, which kind of piece, which piece. */
function draws(adv: Pick<Adventure, 'seed'>, townId: string, week: number): number[] {
  let seed = hash(`${adv.seed}|portal|${townId}|${week}`);
  return Array.from({ length: 5 }, () => {
    const r = roll(seed);
    seed = r.seed;
    return r.value;
  });
}

const guardsOf = (def: MapDef): MapDef['objects'] => def.objects.filter((o) => o.kind === 'monster' && o.creature && !o.brood);

/** The kinds a band can be: the creatures the map's guards are (bosses left out), in a fixed order. */
export const mobKinds = (def: MapDef): CreatureId[] => [...new Set(guardsOf(def).map((o) => o.creature!))].sort();

/** A band's strength in the part's first week: the middle guard of this part's own (the map's, if it has none of its own). */
export function mobBase(def: MapDef): number {
  const own = guardsOf(def).filter((o) => partOf(def, o.id) === partNumber(def));
  const strengths = (own.length ? own : guardsOf(def)).map((o) => strengthOf(o.creature!, o.count ?? 1)).sort((a, b) => a - b);
  return strengths[Math.floor(strengths.length / 2)] ?? 0;
}

/** This week's band at `town`, beaten or not; null without a Summoning Portal, or on a map with no guards to take after. */
export function weekMob(adv: Adventure, def: MapDef, town: Town): PortalMob | null {
  const kinds = mobKinds(def);
  if (!has(town, 'portal2') || !kinds.length) return null;
  const week = weekOf(adv.day);
  const [kind, grade] = draws(adv, town.id, week) as [number, number];
  const id = kinds[Math.floor(kind * kinds.length)]!;
  // Each week of the part adds a lair's growth.
  const weeks = Math.max(0, week - weekOf(adv.begun ?? 1));
  const count = Math.max(1, Math.round((mobBase(def) * (1 + LAIR_GROWTH * weeks)) / strengthOf(id, 1)));
  const army = monsterArmy({ id: town.id, kind: 'monster', x: town.x, y: town.y, creature: id, count });
  const row = Math.min(LOOT_ROWS.length, partNumber(def) + 1);
  return { creature: id, count, army, strength: armyStrength(army), xp: count * creature(id).hp, grade: gradeOn(row, grade) };
}

/** The band waiting at `town` now: this week's, unless it was beaten already. */
export const portalMob = (adv: Adventure, def: MapDef, town: Town): PortalMob | null => (town.mobBeaten === weekOf(adv.day) ? null : weekMob(adv, def, town));

/** How a band reads against an army of `strength`: "weak", "about even" or "dangerous". */
export function mobOdds(mob: Pick<PortalMob, 'strength'>, strength: number): 'weak' | 'about even' | 'dangerous' {
  const r = strength > 0 ? mob.strength / strength : Infinity;
  return r < MOB_ODDS.weak ? 'weak' : r < MOB_ODDS.even ? 'about even' : 'dangerous';
}

/** "may carry a Rare piece". */
export function mobLoot(mob: Pick<PortalMob, 'grade'>): string {
  const grade = QUALITY_NAMES[mob.grade];
  return `may carry ${/^[AEIOU]/.test(grade) ? 'an' : 'a'} ${grade} piece`;
}

/** Why the picked hero can't fight their town's band now, or null when they can. */
export function cantFightMob(adv: Adventure, def: MapDef): string | null {
  const { hero } = adv;
  const town = heroTown(adv);
  if (!town || !has(town, 'portal2')) return `${hero.name} must be in a town with a ${buildingIn(town ?? {}, 'portal2').name}`;
  if (!weekMob(adv, def, town)) return 'Nothing answers the call on this map';
  if (!portalMob(adv, def, town)) return 'Beaten this week: a new band comes on Monday';
  if (hero.mp <= 0) return `${hero.name} has no movement left today`;
  if (isEmptyArmy(playerArmy(adv))) return `${hero.name} has no army to fight with`;
  // Beaten, a hero comes home to the garrison: it must be free for them.
  const keeper = townHeroes(adv, town).garrison;
  if (!heroInGarrison(adv) && keeper) return `${keeper.name} holds the garrison, where a beaten hero comes home`;
  return null;
}

/** The band of town `townId` as the battle's other side. */
export function mobArmy(adv: Adventure, def: MapDef, townId: string): Army {
  const town = townById(adv, townId);
  const mob = town && portalMob(adv, def, town);
  if (!mob) throw new Error(`no portal mob at ${townId}`);
  return mob.army;
}

/**
 * After a won fight with `townId`'s band (afterBattle has counted the
 * survivors and the experience): the band is gone for the week, the hero's
 * day is over, and the piece it carried (if it did) is worn, bagged, put in
 * the town's store, or with no room anywhere lost.
 */
export function mobWon(adv: Adventure, def: MapDef, townId: string): Adventure {
  const town = townById(adv, townId);
  if (!town) return adv;
  const week = weekOf(adv.day);
  const mob = weekMob(adv, def, town);
  const done = withTown({ ...adv, hero: { ...adv.hero, mp: 0 } }, { ...town, mobBeaten: week });
  const [, , hit, loose, which] = draws(adv, town.id, week) as [number, number, number, number, number];
  const id = mob && hit < MOB_DROP ? pickPiece(lootFaction(def), mob.grade, loose < 1 / 3, which, ourHeroes(adv)) : undefined;
  return id ? claimPiece(done, townId, id) : done;
}

/** Piece `id` from the band: on the hero, in the bag, in the store (the Portal's shared one), or lost with a line saying so. */
function claimPiece(adv: Adventure, townId: string, id: ItemId): Adventure {
  const got = gainItem(adv.hero, id);
  const town = townById(adv, townId)!;
  const stored = got.kept ? null : keepIn(adv, town, id);
  const end = got.worn ? `${adv.hero.name} puts it on.` : got.kept ? 'It goes in the bag.' : stored ? `The bag is full, so it goes to ${town.name}'s store.` : `The bag and the store are full: it is lost.`;
  const prompt: Prompt = { kind: 'message', title: itemDef(id).name, text: `${itemLine(id)}\n${end}`, item: id };
  const next = stored ?? { ...adv, hero: got.hero };
  return { ...next, prompts: [...next.prompts, prompt] };
}

/**
 * A lost fight with `townId`'s band: the army that fought is gone (the
 * hero's, or the garrison's they led), but the Portal brings the hero home,
 * into the town's garrison, their day over; the band waits on.
 */
export function mobLost(adv: Adventure, def: MapDef, townId: string, battle: BattleState): Adventure {
  const town = townById(adv, townId);
  if (!town) return adv;
  const side = playerSide(battle);
  const fought = battle.heroes[side];
  const lost = playerArmy(adv).filter((s) => s).length;
  const inGarrison = heroInGarrison(adv);
  const { ankhs: _was, ...rest } = adv.hero;
  const ankhs = fought?.ankhs ?? adv.hero.ankhs ?? 0;
  const hero = { ...rest, army: armyOf([]), mp: 0, mana: fought?.mana ?? adv.hero.mana, ...(ankhs ? { ankhs } : {}) };
  const mob = weekMob(adv, def, town);
  const them = mob ? `The ${creature(mob.creature).plural}` : 'The band';
  const card: Prompt = { kind: 'message', title: `${adv.hero.name} comes home`, text: `${them} beat ${adv.hero.name}'s army, but the ${buildingIn(town, 'portal2').name} brings ${adv.hero.name} home to ${town.name}'s garrison.` };
  const home = withTown({ ...adv, hero, lostStacks: adv.lostStacks + lost, prompts: [...adv.prompts, card] }, inGarrison ? { ...town, garrison: armyOf([]) } : town);
  return checkGoal(home, def);
}
