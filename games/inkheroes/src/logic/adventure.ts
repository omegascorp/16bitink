import type { MapDef } from '../level/types';
import { armyMorale, armyOf, splitMonster } from './army';
import { survivors, experienceFor } from './battle';
import type { BattleSide } from './battle';
import type { BattleState } from './battleTypes';
import { applyLevelUp, dailyMp, gainedXp, maxMana, nextLevelUp, sightOf, toBattleHero, type Hero, type LevelUp } from './hero';
import { parseGrid, tileIndex, type Grid } from './map';
import { MINE_OUTPUT, objectFootprint, townFootprint, type MapObject } from './objects';
import { canStep, findPath, type PathStep, type Terrainview } from './path';
import { addTo, purse, type Purse } from './resources';
import { skillValue, type SkillId } from './skills';
import { has, income, weekly, type Town } from './town';
import { visitSite } from './visits';

export type Prompt =
  | { readonly kind: 'chest'; readonly id: string; readonly gold: number; readonly xp: number }
  | { readonly kind: 'levelUp'; readonly offer: LevelUp }
  | { readonly kind: 'message'; readonly title: string; readonly text: string };

export type Status = 'playing' | 'won' | 'lost';

/** One map being played: everything a save holds. */
export interface Adventure {
  readonly mapId: string;
  readonly day: number;
  readonly seed: number;
  readonly purse: Purse;
  readonly hero: Hero;
  readonly town: Town;
  readonly objects: readonly MapObject[];
  /** '1' for each tile seen, row by row. */
  readonly explored: string;
  readonly status: Status;
  /** Cards waiting for the player, first one shown. */
  readonly prompts: readonly Prompt[];
  /** Army slots wiped out so far (for the third blot). */
  readonly lostStacks: number;
}

const grids = new WeakMap<MapDef, Grid>();
export function gridOf(def: MapDef): Grid {
  let g = grids.get(def);
  if (!g) {
    g = parseGrid(def.rows);
    grids.set(def, g);
  }
  return g;
}

/** Map monsters never grow past this many. */
export const MAX_MONSTER = 4000;

export const weekOf = (day: number): number => Math.floor((day - 1) / 7) + 1;
export const monthOf = (day: number): number => Math.floor((day - 1) / 28) + 1;
export const dayOfWeek = (day: number): number => ((day - 1) % 7) + 1;
export const calendar = (day: number): string => `Month ${monthOf(day)}, Week ${((weekOf(day) - 1) % 4) + 1}, Day ${dayOfWeek(day)}`;

export function startAdventure(def: MapDef): Adventure {
  const g = gridOf(def);
  const h = def.hero;
  const hero: Hero = {
    id: h.id, name: h.name, heroClass: h.heroClass, x: h.x, y: h.y,
    attack: h.attack, defense: h.defense, power: h.power, knowledge: h.knowledge,
    mana: h.knowledge * 10, xp: 0, level: 1, skills: h.skills, spells: h.spells, hasBook: h.hasBook,
    army: armyOf(h.army), mp: 0, visited: [],
  };
  const t = def.town;
  const town: Town = { id: t.id, name: t.name, owner: 'player', x: t.x, y: t.y, built: t.built, builtToday: false, stock: {}, garrison: armyOf([]), guild: t.guild };
  const adv: Adventure = {
    mapId: def.id, day: 1, seed: def.seed, purse: purse(def.purse), hero: { ...hero, mp: dailyMp(hero) },
    town: weekly(town), objects: def.objects, explored: '0'.repeat(g.w * g.h), status: 'playing',
    prompts: [{ kind: 'message', title: def.name, text: [...def.intro, '', `Goal: ${def.goal.text}`].join('\n') }], lostStacks: 0,
  };
  return revealAround(revealAround(adv, def, hero.x, hero.y, sightOf(hero)), def, t.x, t.y, 5);
}

/** Marks tiles within `r` of (cx, cy) as seen. */
export function revealAround(adv: Adventure, def: MapDef, cx: number, cy: number, r: number): Adventure {
  const g = gridOf(def);
  const seen = adv.explored.split('');
  for (let y = Math.max(0, cy - r); y <= Math.min(g.h - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(g.w - 1, cx + r); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + r) seen[tileIndex(g, x, y)] = '1';
    }
  }
  return { ...adv, explored: seen.join('') };
}

export const isSeen = (adv: Adventure, def: MapDef, x: number, y: number): boolean => adv.explored[tileIndex(gridOf(def), x, y)] === '1';

export const liveObjects = (adv: Adventure): MapObject[] => adv.objects.filter((o) => !o.gone);
export const objectAt = (adv: Adventure, x: number, y: number): MapObject | undefined => liveObjects(adv).find((o) => o.x === x && o.y === y);
/** The live object whose picture stands on (x, y): its own tile or the rest of its footprint. */
export const objectCovering = (adv: Adventure, x: number, y: number): MapObject | undefined =>
  objectAt(adv, x, y) ?? liveObjects(adv).find((o) => objectFootprint(o).some((t) => t.x === x && t.y === y));
export const heroInTown = (adv: Adventure): boolean => adv.hero.x === adv.town.x && adv.hero.y === adv.town.y;

/** The monster whose guard zone covers (x, y): the 8 tiles round it. */
export function guardAt(adv: Adventure, x: number, y: number): MapObject | undefined {
  return liveObjects(adv).find((o) => o.kind === 'monster' && Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1 && !(o.x === x && o.y === y));
}

/** What the pathfinder sees: walls and footprints are solid, objects are visited from beside them, guard zones and the gate end a path. */
export function terrainView(adv: Adventure, def: MapDef): Terrainview {
  const g = gridOf(def);
  const inside = (t: { x: number; y: number }): boolean => t.x >= 0 && t.y >= 0 && t.x < g.w && t.y < g.h;
  const solid = new Set(townFootprint(adv.town.x, adv.town.y).map((t) => tileIndex(g, t.x, t.y)));
  const stopAt = new Set<number>();
  const visit = new Set<number>();
  for (const o of liveObjects(adv)) {
    visit.add(tileIndex(g, o.x, o.y));
    for (const t of objectFootprint(o).filter(inside)) solid.add(tileIndex(g, t.x, t.y));
    if (o.kind !== 'monster') continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inside({ x: o.x + dx, y: o.y + dy })) stopAt.add(tileIndex(g, o.x + dx, o.y + dy));
  }
  stopAt.add(tileIndex(g, adv.town.x, adv.town.y));
  return { grid: g, solid, stopAt, visit, pathfinding: skillValue(adv.hero.skills, 'pathfinding') };
}

export function planPath(adv: Adventure, def: MapDef, x: number, y: number): PathStep[] | null {
  return findPath(terrainView(adv, def), adv.hero, x, y, adv.hero.mp, dailyMp(adv.hero));
}

export interface StepResult {
  readonly adv: Adventure;
  /** The hero must stop walking. */
  readonly stop: boolean;
  /** A monster to fight now. */
  readonly battle?: string;
  /** The site to visit once that fight is won (it was guarded). */
  readonly then?: string;
  /** The hero walked into its town. */
  readonly town?: boolean;
  /** Short notes to float over the map ("+5 wood"). */
  readonly notes: readonly string[];
}

/**
 * Takes one step of a planned path (the scene animates each). A step onto
 * an object is a visit: the hero stays where it is (as H3) and attacks the
 * monster, or takes the site, after first fighting any monster guarding it.
 * `goal` is where the path ends: a site there is taken after a fight that
 * stops the hero beside it.
 */
export function stepHero(adv: Adventure, def: MapDef, step: PathStep, goal?: { x: number; y: number }): StepResult {
  const target = objectAt(adv, step.x, step.y);
  if (target?.kind === 'monster') return { adv, stop: true, battle: target.id, notes: [] };
  if (!canStep(step, adv.hero.mp)) return { adv, stop: true, notes: [] };
  if (target) {
    const guard = guardAt(adv, target.x, target.y);
    if (guard) return { adv, stop: true, battle: guard.id, then: target.id, notes: [] };
    const r = visitSite({ ...adv, hero: { ...adv.hero, mp: Math.max(0, adv.hero.mp - step.cost) } }, target);
    return { adv: queueLevelUps(r.adv), stop: true, notes: r.notes };
  }
  const hero = { ...adv.hero, x: step.x, y: step.y, mp: Math.max(0, adv.hero.mp - step.cost) };
  let next = revealAround({ ...adv, hero }, def, step.x, step.y, sightOf(hero));
  if (step.x === adv.town.x && step.y === adv.town.y) return { adv: enterTown(next), stop: true, town: true, notes: [] };
  // A guarded tile is fought for first (as H3).
  const guard = guardAt(next, step.x, step.y);
  if (guard) {
    const site = goal && objectAt(next, goal.x, goal.y);
    const beside = site && site.kind !== 'monster' && Math.abs(site.x - step.x) <= 1 && Math.abs(site.y - step.y) <= 1;
    return { adv: next, stop: true, battle: guard.id, ...(beside ? { then: site.id } : {}), notes: [] };
  }
  return { adv: next, stop: false, notes: [] };
}

/** A hero entering its town learns the guild's spells (with a spellbook). */
export function enterTown(adv: Adventure): Adventure {
  const { hero, town } = adv;
  if (!hero.hasBook) return adv;
  const floors = has(town, 'mageGuild2') ? 5 : has(town, 'mageGuild1') ? 3 : 0;
  const learn = town.guild.slice(0, floors).filter((s) => !hero.spells.includes(s));
  return learn.length ? { ...adv, hero: { ...hero, spells: [...hero.spells, ...learn] } } : adv;
}

/** Mines the player holds. */
export const ownedMines = (adv: Adventure): MapObject[] => liveObjects(adv).filter((o) => o.kind === 'mine' && o.owner === 'player');

/** Gold and resources the player gets each day. */
export function dailyIncome(adv: Adventure): Purse {
  let p = purse({ gold: income(adv.town) + skillValue(adv.hero.skills, 'estates') });
  for (const m of ownedMines(adv)) p = addTo(p, { [m.resource!]: MINE_OUTPUT[m.resource!] });
  return p;
}

/** End of the day: income, rested heroes, and on a new week the dwellings fill and monsters grow. */
export function endDay(adv: Adventure): Adventure {
  const day = adv.day + 1;
  const newWeek = dayOfWeek(day) === 1;
  const h = adv.hero;
  const regen = Math.max(1, skillValue(h.skills, 'mysticism'));
  const inTown = heroInTown(adv) && has(adv.town, 'mageGuild1');
  const hero = { ...h, mp: dailyMp(h), mana: inTown ? Math.max(h.mana, maxMana(h)) : Math.min(maxMana(h), h.mana + regen) };
  const town = newWeek ? weekly(adv.town) : { ...adv.town, builtToday: false };
  const objects = newWeek
    ? adv.objects.map((o) => (o.kind === 'monster' && !o.gone ? { ...o, count: Math.min(MAX_MONSTER, Math.round((o.count ?? 1) * 1.1)) } : o))
    : adv.objects;
  const prompts = newWeek
    ? [...adv.prompts, { kind: 'message' as const, title: `Week ${weekOf(day)}`, text: `A new week begins. ${adv.town.name}'s dwellings have fresh recruits, and the monsters of the wilds have grown in number.` }]
    : adv.prompts;
  return { ...adv, day, hero, town, objects, prompts, purse: addTo(adv.purse, dailyIncome(adv)) };
}

/** The two sides for a fight with map monster `id`. */
export function battleSides(adv: Adventure, id: string): { attacker: BattleSide; defender: BattleSide; seed: number } {
  const m = adv.objects.find((o) => o.id === id);
  if (!m || m.kind !== 'monster' || !m.creature) throw new Error(`no monster ${id}`);
  return {
    attacker: { hero: toBattleHero(adv.hero), army: adv.hero.army, armyMorale: armyMorale(adv.hero.army) },
    defender: { hero: null, army: splitMonster(m.creature, m.count ?? 1) },
    seed: (adv.seed ^ (adv.day * 7919) ^ hashId(id)) >>> 0,
  };
}

const hashId = (s: string): number => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

/** The map after a fight with monster `id` ends as `battle`; `then` is the site the monster guarded, taken on a win. */
export function afterBattle(adv: Adventure, def: MapDef, id: string, battle: BattleState, then?: string): Adventure {
  if (battle.winner !== 0) return { ...adv, status: 'lost', hero: { ...adv.hero, army: armyOf([]) } };
  const before = adv.hero.army;
  const army = survivors(battle, 0, before);
  const lost = before.filter((s, i) => s && !army[i]).length;
  const xp = gainedXp(adv.hero, experienceFor(battle, 0));
  const hero = { ...adv.hero, army, xp: adv.hero.xp + xp, mana: battle.heroes[0]?.mana ?? adv.hero.mana };
  const objects = adv.objects.map((o) => (o.id === id ? { ...o, gone: true } : o));
  let next: Adventure = { ...adv, hero, objects, lostStacks: adv.lostStacks + lost };
  // The site the hero was fighting for is theirs now, unless another monster still guards it.
  const site = then ? liveObjects(next).find((o) => o.id === then) : undefined;
  if (site && site.kind !== 'monster' && !guardAt(next, site.x, site.y)) next = visitSite(next, site).adv;
  return checkGoal(queueLevelUps(next), def);
}

/** Whether the map's goal is met. */
export function checkGoal(adv: Adventure, def: MapDef): Adventure {
  const target = adv.objects.find((o) => o.id === def.goal.target);
  const done = def.goal.kind === 'defeat' ? !!target?.gone : target?.owner === 'player';
  return done && adv.status === 'playing' ? { ...adv, status: 'won' } : adv;
}

/** Adds a level-up card if the hero has the experience for one and none is waiting. */
export function queueLevelUps(adv: Adventure): Adventure {
  if (adv.prompts.some((p) => p.kind === 'levelUp')) return adv;
  const r = nextLevelUp(adv.hero, adv.seed);
  if (!r) return adv;
  return { ...adv, seed: r.seed, prompts: [...adv.prompts, { kind: 'levelUp', offer: r.offer }] };
}

/** Answers the first card. `choice` is the chest's 'gold' / 'xp', or the skill picked on a level-up. */
export function answerPrompt(adv: Adventure, choice?: 'gold' | 'xp' | SkillId): Adventure {
  const [first, ...rest] = adv.prompts;
  if (!first) return adv;
  const base = { ...adv, prompts: rest };
  if (first.kind === 'chest') {
    const objects = adv.objects.map((o) => (o.id === first.id ? { ...o, gone: true } : o));
    if (choice === 'xp') return queueLevelUps({ ...base, objects, hero: { ...adv.hero, xp: adv.hero.xp + gainedXp(adv.hero, first.xp) } });
    return { ...base, objects, purse: addTo(adv.purse, { gold: first.gold }) };
  }
  if (first.kind === 'levelUp') {
    const skill = choice && choice !== 'gold' && choice !== 'xp' ? choice : null;
    return queueLevelUps({ ...base, hero: applyLevelUp(adv.hero, first.offer, skill) });
  }
  return base;
}
