import { BAG_SIZE, gainItem, hasAsGood, hasSpellbook, itemDef, itemQuality, itemSays, machineOf, QUALITY_NAMES, SET_NAMES, wear, type ItemId, type SoldMachine } from './items';
import type { HeroDef, MapDef } from '../level/types';
import type { DayReport, GoldSource, TownRecruits } from './dayReport';
import { armyMorale, armyOf, emptyArmy, isEmptyArmy, moveAll, splitMonster, type Army } from './army';
import { experienceFor, playerSide, survivors, towerSurvivors, type SiegeSetup } from './battle';
import type { BattleSide } from './battle';
import type { BattleState, Side } from './battleTypes';
import { applyLevelUp, dailyMp, gainedXp, maxMana, nextLevelUp, sightOf, toBattleHero, type Hero, type LevelUp } from './hero';
import { parseGrid, STABLES_MP, tileIndex, tilesOf, type Grid } from './map';
import { creature } from './creatures';
import { MINE_OUTPUT, objectFootprint, townFootprint, type MapObject } from './objects';
import { canStep, findPath, type PathStep, type Terrainview } from './path';
import { addTo, canAfford, pay, purse, type Purse } from './resources';
import { fortification, type Fortification } from './siege';
import { skillValue, type SkillId } from './skills';
import { BUILDING_IDS } from './buildings';
import { cantBuild, dwellings, growthOf, has, income, manTowers, towersOf, undefended, weekly, type Town } from './town';
import { visitSite } from './visits';
import { CHAPTER1, lineText, LINES, narrated, type LineId } from '../narration/lines';

export type Prompt =
  | { readonly kind: 'chest'; readonly id: string; readonly gold: number; readonly xp: number }
  | { readonly kind: 'levelUp'; readonly offer: LevelUp }
  | {
    readonly kind: 'message';
    readonly title: string;
    /** The card's words (for a narrated card, the story, shown when it isn't heard). */
    readonly text: string;
    readonly item?: ItemId;
    readonly report?: DayReport;
    /** The narrator's line for it (src/narration/lines.ts): heard, it's told in the strip instead of on a card. */
    readonly line?: LineId;
    /** With a line: the short card shown while the story is heard (a part's brief and goal). None: no card while it's heard. */
    readonly brief?: string;
  };

export type Status = 'playing' | 'won' | 'lost';

/** One map being played: everything a save holds. */
export interface Adventure {
  readonly mapId: string;
  readonly day: number;
  readonly seed: number;
  readonly purse: Purse;
  /** The picked hero, the one the map moves and the town screen serves. */
  readonly hero: Hero;
  /** The player's other heroes, waiting where they stand (src/logic/heroes.ts picks and hires them). */
  readonly others?: readonly Hero[];
  /** Every town on the map: the player's first town first, then the others (neutral until taken). */
  readonly towns: readonly Town[];
  readonly objects: readonly MapObject[];
  /** '1' for each tile seen, row by row. */
  readonly explored: string;
  readonly status: Status;
  /** Cards waiting for the player, first one shown. */
  readonly prompts: readonly Prompt[];
  /** Army slots wiped out so far in this part (for the third blot). */
  readonly lostStacks: number;
  /** The day this part of the chapter began (1 when left out): its par counts from here. */
  readonly begun?: number;
  /** The map's rival lord, on a map that has one: their hero (null once beaten) and purse. */
  readonly rival?: RivalState;
  /** A fight the rival started in the night, waiting for the player to play it (RIVAL or DEFEND + town id). */
  readonly rivalFight?: string;
}

export interface RivalState {
  readonly hero: Hero | null;
  readonly purse: Purse;
}

/** The battle id for a fight with the rival lord in the field; `defend:<town>` is the rival storming a town of ours its hero isn't in. */
export const RIVAL = 'rival';
export const DEFEND = 'defend:';

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

/** A hero as the map places them, rested for day one. */
export function heroFromDef(h: HeroDef): Hero {
  const hero: Hero = {
    id: h.id, name: h.name, heroClass: h.heroClass, x: h.x, y: h.y,
    attack: h.attack, defense: h.defense, power: h.power, knowledge: h.knowledge,
    mana: h.knowledge * 10, xp: 0, level: 1, skills: h.skills, spells: h.spells,
    army: armyOf(h.army), mp: 0, visited: [], ...(h.gear ? { gear: h.gear } : {}),
  };
  return { ...hero, mp: dailyMp(hero) };
}

/** A message card that the narrator tells (line `id`): its title and words are the line's. */
export const toldPrompt = (id: LineId): Prompt => ({ kind: 'message', title: LINES[id].title, ...narrated(id) });

/**
 * The card a part opens with: the story (told by the narrator, or read on
 * the card when it isn't heard) and the goal; while the story is heard,
 * the card shows the brief and the goal.
 */
export function openingPrompt(def: MapDef): Prompt {
  const goal = `Goal: ${def.goal.text}`;
  const brief = `${def.brief}\n\n${goal}`;
  if (!def.story) return { kind: 'message', title: def.name, text: brief };
  return { kind: 'message', title: def.name, text: `${lineText(def.story)}\n\n${goal}`, line: def.story, brief };
}

export function startAdventure(def: MapDef): Adventure {
  const g = gridOf(def);
  const hero = heroFromDef(def.hero);
  const t = def.town;
  const town: Town = { id: t.id, name: t.name, owner: 'player', x: t.x, y: t.y, built: t.built, builtToday: false, stock: {}, garrison: armyOf(t.garrison ?? []), guild: t.guild };
  // The map's other towns stand neutral (or the rival's), held by their garrisons, until a hero takes them.
  const others = (def.towns ?? []).map((o): Town => ({ id: o.id, name: o.name, owner: o.owner ?? 'neutral', x: o.x, y: o.y, built: o.built, builtToday: false, stock: {}, garrison: armyOf(o.garrison), guild: o.guild }));
  const adv: Adventure = {
    mapId: def.id, day: 1, seed: def.seed, purse: purse(def.purse), hero,
    towns: [town, ...others].map(weekly), objects: def.objects, explored: '0'.repeat(g.w * g.h), status: 'playing',
    prompts: [openingPrompt(def)], lostStacks: 0,
    ...(def.rival ? { rival: { hero: heroFromDef(def.rival.hero), purse: purse(def.rival.purse) } } : {}),
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
/** The town whose gate is at (x, y). */
export const townAt = (adv: Adventure, x: number, y: number): Town | undefined => adv.towns.find((t) => t.x === x && t.y === y);
export const townById = (adv: Adventure, id: string): Town | undefined => adv.towns.find((t) => t.id === id);
/** The towns the player holds, the first town first. */
export const playerTowns = (adv: Adventure): Town[] => adv.towns.filter((t) => t.owner === 'player');
/** The player's town the hero stands in (at its gate), if any. */
export function heroTown(adv: Adventure): Town | undefined {
  const t = townAt(adv, adv.hero.x, adv.hero.y);
  return t?.owner === 'player' ? t : undefined;
}
/** `adv` with the town of `town`'s id replaced by it. */
export const withTown = (adv: Adventure, town: Town): Adventure => ({ ...adv, towns: adv.towns.map((t) => (t.id === town.id ? town : t)) });
export const heroInTown = (adv: Adventure): boolean => !!heroTown(adv);
/**
 * A hero in the town's garrison: standing in it with no companies of their
 * own (they all joined the garrison). Only that move leaves a hero with
 * nobody while the map is being played; losing a battle ends it.
 */
export const heroInGarrison = (adv: Adventure, town?: Town): boolean => heroInTown(adv) && isEmptyArmy(adv.hero.army) && (!town || heroTown(adv)!.id === town.id);
/** A hero visiting a town (`town`, or any): in it, leading their own army (the town screen's bottom row). */
export const heroVisiting = (adv: Adventure, town?: Town): boolean => heroInTown(adv) && !isEmptyArmy(adv.hero.army) && (!town || heroTown(adv)!.id === town.id);

/** The visiting hero goes into the garrison, every company with them (merged with like ones); null when it hasn't the room. */
export function garrisonHero(adv: Adventure): Adventure | null {
  const town = heroTown(adv);
  if (!town || !heroVisiting(adv)) return null;
  const r = moveAll(adv.hero.army, town.garrison);
  return r ? withTown({ ...adv, hero: { ...adv.hero, army: r.src } }, { ...town, garrison: r.dst }) : null;
}

/** The hero in the garrison steps out to visit, leading the whole garrison. */
export function leadOut(adv: Adventure): Adventure {
  const town = heroTown(adv);
  if (!town || !heroInGarrison(adv)) return adv;
  return withTown({ ...adv, hero: { ...adv.hero, army: town.garrison } }, { ...town, garrison: armyOf([]) });
}

/** The monster whose guard zone covers (x, y): the 8 tiles round it. */
export function guardAt(adv: Adventure, x: number, y: number): MapObject | undefined {
  return liveObjects(adv).find((o) => o.kind === 'monster' && Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1 && !(o.x === x && o.y === y));
}

/** The rival lord's hero, if one is riding (not yet beaten). */
export const rivalHero = (adv: Adventure): Hero | null => adv.rival?.hero ?? null;
/** Every hero of the player's, the picked one first. */
export const ourHeroes = (adv: Adventure): Hero[] => [adv.hero, ...(adv.others ?? [])];
/** The player's hero (not the picked one) standing at (x, y). */
export const otherHeroAt = (adv: Adventure, x: number, y: number): Hero | undefined => (adv.others ?? []).find((h) => h.x === x && h.y === y);
/** Whether the rival lord stands at (x, y). */
export const rivalAt = (adv: Adventure, x: number, y: number): boolean => {
  const r = rivalHero(adv);
  return !!r && r.x === x && r.y === y;
};

/**
 * What the pathfinder sees, for the player's hero or the rival's: walls and
 * footprints are solid, objects (and the other hero) are visited from beside
 * them, guard zones and gates end a path.
 */
export function terrainView(adv: Adventure, def: MapDef, who: 'player' | 'rival' = 'player'): Terrainview {
  const g = gridOf(def);
  const inside = (t: { x: number; y: number }): boolean => t.x >= 0 && t.y >= 0 && t.x < g.w && t.y < g.h;
  const solid = new Set(adv.towns.flatMap((town) => townFootprint(town.x, town.y)).filter(inside).map((t) => tileIndex(g, t.x, t.y)));
  const stopAt = new Set<number>();
  const visit = new Set<number>();
  for (const o of liveObjects(adv)) {
    visit.add(tileIndex(g, o.x, o.y));
    for (const t of objectFootprint(o).filter(inside)) solid.add(tileIndex(g, t.x, t.y));
    if (o.kind !== 'monster') continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inside({ x: o.x + dx, y: o.y + dy })) stopAt.add(tileIndex(g, o.x + dx, o.y + dy));
  }
  for (const town of adv.towns) stopAt.add(tileIndex(g, town.x, town.y));
  // Another hero is fought (or, if ours, met) from beside them, like a monster.
  const met = who === 'player' ? [...(rivalHero(adv) ? [rivalHero(adv)!] : []), ...(adv.others ?? [])] : ourHeroes(adv);
  for (const h of met) visit.add(tileIndex(g, h.x, h.y));
  const mover = who === 'player' ? adv.hero : rivalHero(adv);
  return { grid: g, solid, stopAt, visit, pathfinding: skillValue(mover?.skills ?? {}, 'pathfinding') };
}

export function planPath(adv: Adventure, def: MapDef, x: number, y: number): PathStep[] | null {
  const path = findPath(terrainView(adv, def), adv.hero, x, y, adv.hero.mp, dailyMp(adv.hero));
  const [step] = path ?? [];
  // A foe beside the hero is fought from where they stand: that takes no movement.
  return path?.length === 1 && step && foeAt(adv, step.x, step.y) ? [{ ...step, cost: 0, straight: 0, day: 0 }] : path;
}

/** Whether stepping to (x, y) means a fight, not a walk: a monster, the rival, a held gate, or a site with a monster guarding it. */
function foeAt(adv: Adventure, x: number, y: number): boolean {
  const gate = townAt(adv, x, y);
  const o = objectAt(adv, x, y);
  return rivalAt(adv, x, y) || !!(gate && gate.owner !== 'player' && !gate.ally && !undefended(gate)) || o?.kind === 'monster' || !!(o && guardAt(adv, o.x, o.y));
}

export interface StepResult {
  readonly adv: Adventure;
  /** The hero must stop walking. */
  readonly stop: boolean;
  /** A monster to fight now, or a town whose garrison bars the gate. */
  readonly battle?: string;
  /** The site to visit once that fight is won (it was guarded). */
  readonly then?: string;
  /** The hero walked into its town. */
  readonly town?: boolean;
  /** The hero met another of ours (their id): the two can trade companies. */
  readonly meet?: string;
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
  const gate = townAt(adv, step.x, step.y);
  // The rival lord, in the field or in his town's gate: a fight.
  if (rivalAt(adv, step.x, step.y)) return { adv, stop: true, battle: gate ? gate.id : RIVAL, notes: [] };
  const friend = otherHeroAt(adv, step.x, step.y);
  if (friend) return { adv, stop: true, meet: friend.id, notes: [] };
  if (!canStep(step, adv.hero.mp)) return { adv, stop: true, notes: [] };
  // A town not ours: its garrison must be beaten from beside the gate (an empty one is just walked into).
  if (gate && gate.owner !== 'player' && !gate.ally && !undefended(gate)) return { adv, stop: true, battle: gate.id, notes: [] };
  if (target) {
    const guard = guardAt(adv, target.x, target.y);
    if (guard) return { adv, stop: true, battle: guard.id, then: target.id, notes: [] };
    const r = visitSite({ ...adv, hero: { ...adv.hero, mp: Math.max(0, adv.hero.mp - step.cost) } }, target);
    return { adv: queueLevelUps(r.adv), stop: true, notes: r.notes };
  }
  const hero = { ...adv.hero, x: step.x, y: step.y, mp: Math.max(0, adv.hero.mp - step.cost) };
  let next = revealAround({ ...adv, hero }, def, step.x, step.y, sightOf(hero));
  if (gate) {
    if (gate.owner !== 'player') next = gate.ally ? joinTown(next, gate) : takeTown(next, gate.id);
    return { adv: checkGoal(enterTown(next), def), stop: true, town: true, notes: [] };
  }
  // A guarded tile is fought for first (as H3).
  const guard = guardAt(next, step.x, step.y);
  if (guard) {
    const site = goal && objectAt(next, goal.x, goal.y);
    const beside = site && site.kind !== 'monster' && Math.abs(site.x - step.x) <= 1 && Math.abs(site.y - step.y) <= 1;
    return { adv: next, stop: true, battle: guard.id, ...(beside ? { then: site.id } : {}), notes: [] };
  }
  return { adv: next, stop: false, notes: [] };
}

/** Town `id` is the player's now: its flag goes up, its gates open. */
export function takeTown(adv: Adventure, id: string): Adventure {
  const town = townById(adv, id);
  if (!town) return adv;
  const taken = withTown(adv, { ...town, owner: 'player', garrison: armyOf([]), towers: emptyArmy() });
  const foe = rivalHero(adv);
  if (town.owner !== 'rival' || !foe || taken.towns.some((t) => t.owner === 'rival')) return taken;
  const text = `${foe.name} has no town left to ride home to, and your scouts are on his trail. Hunt him down!`;
  const card: Prompt = town.id === CHAPTER1.korax && foe.id === CHAPTER1.kassander ? toldPrompt('korax-taken') : { kind: 'message', title: `${town.name} is yours`, text };
  return { ...taken, prompts: [...taken.prompts, card] };
}

/** An ally opens its gates: the town is the player's, garrison and all. */
function joinTown(adv: Adventure, { ally: _ally, ...town }: Town): Adventure {
  const text = `${town.name} has held out against the Black Banner, and now it stands with you: its garrison, its buildings and its dwellings are yours.`;
  const card: Prompt = town.id === CHAPTER1.eudora ? toldPrompt('eudora-joins') : { kind: 'message', title: `${town.name} opens its gates`, text };
  return withTown({ ...adv, prompts: [...adv.prompts, card] }, { ...town, owner: 'player' });
}

/** A hero entering its town learns the guild's spells (with a spellbook). */
export function enterTown(adv: Adventure): Adventure {
  const { hero } = adv;
  const town = heroTown(adv);
  if (!town || !hasSpellbook(hero)) return adv;
  const floors = has(town, 'mageGuild2') ? 5 : has(town, 'mageGuild1') ? 3 : 0;
  const learn = town.guild.slice(0, floors).filter((s) => !hero.spells.includes(s));
  return learn.length ? { ...adv, hero: { ...hero, spells: [...hero.spells, ...learn] } } : adv;
}

/** Why the visiting hero can't buy war machine `m` at this town's Blacksmith now, or null when they can. */
export function cantBuyMachine(adv: Adventure, m: SoldMachine): string | null {
  const town = heroTown(adv);
  if (!town || !has(town, 'blacksmith')) return 'No Blacksmith here';
  if (!heroVisiting(adv, town)) return `${adv.hero.name} must be in town, leading an army`;
  if (hasAsGood(adv.hero, m)) return `${adv.hero.name} has one as good`;
  if (!canAfford(adv.purse, creature(m).cost)) return 'Not enough gold';
  if ((adv.hero.bag?.length ?? 0) >= BAG_SIZE) return 'The bag is full';
  return null;
}

/** The visiting hero buys war machine `m` at the Blacksmith and rolls out with it; one it replaces goes to the bag (see cantBuyMachine). */
export function buyMachine(adv: Adventure, m: SoldMachine): Adventure {
  const why = cantBuyMachine(adv, m);
  if (why) throw new Error(why);
  const got = gainItem(adv.hero, m);
  const hero = got.worn ? got.hero : wear(got.hero, got.hero.bag!.length - 1);
  return { ...adv, purse: pay(adv.purse, creature(m).cost), hero };
}

/** Mines the player (or the rival) holds. */
export const ownedMines = (adv: Adventure, owner: 'player' | 'rival' = 'player'): MapObject[] => liveObjects(adv).filter((o) => o.kind === 'mine' && o.owner === owner);

/** What `owner`'s towns and mines bring in a day. */
export function incomeOf(adv: Adventure, owner: 'player' | 'rival'): Purse {
  let p = purse({ gold: adv.towns.filter((t) => t.owner === owner).reduce((n, t) => n + income(t), 0) });
  for (const m of ownedMines(adv, owner)) p = addTo(p, { [m.resource!]: MINE_OUTPUT[m.resource!] });
  return p;
}

/** Gold and resources the player gets each day: towns, mines and the hero's estates. */
export function dailyIncome(adv: Adventure): Purse {
  return addTo(incomeOf(adv, 'player'), { gold: skillValue(adv.hero.skills, 'estates') });
}

/** Whether the hero has the movement for at least one more step today (to any open tile beside it). */
export function canStillMove(adv: Adventure, def: MapDef): boolean {
  if (heroInGarrison(adv)) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const path = planPath(adv, def, adv.hero.x + dx, adv.hero.y + dy);
      if (path?.[0] && path[0].day === 0) return true;
    }
  }
  return false;
}

/** What the player could still do today: lines for the card that asks before the day ends (none: end it at once). Every hero of ours counts, picked or not. */
export function unfinished(adv: Adventure, def: MapDef): string[] {
  const out: string[] = [];
  for (const h of ourHeroes(adv)) if (canStillMove(asPicked(adv, h), def)) out.push(`${h.name} can still move today.`);
  for (const t of playerTowns(adv)) {
    if (BUILDING_IDS.some((b) => !cantBuild(t, b, adv.purse, def.off))) out.push(`${t.name} can still build today.`);
  }
  return out;
}

/** `adv` as if hero `h` (one of ours) were the one picked: for the rules that ask about "the hero". */
function asPicked(adv: Adventure, h: Hero): Adventure {
  if (h.id === adv.hero.id) return adv;
  return { ...adv, hero: h, others: [...(adv.others ?? []).filter((o) => o.id !== h.id), adv.hero] };
}

/** End of the day: income, rested heroes, and on a new week the dwellings fill and monsters grow. */
export function endDay(adv: Adventure): Adventure {
  const day = adv.day + 1;
  const newWeek = dayOfWeek(day) === 1;
  const hero = rested(adv, adv.hero);
  const others = adv.others?.map((h) => rested(adv, h));
  const towns = adv.towns.map((t) => (newWeek ? weekly(t) : { ...t, builtToday: false }));
  const objects = newWeek
    ? adv.objects.map((o) => (o.kind === 'monster' && !o.gone ? { ...o, count: Math.min(MAX_MONSTER, Math.round((o.count ?? 1) * 1.1)) } : o))
    : adv.objects;
  // The rival rests and is paid too (the rival's turn itself is rivalTurn's, after the night).
  const r = adv.rival;
  const rival = r ? { hero: r.hero ? { ...r.hero, mp: dailyMp(r.hero) } : null, purse: addTo(r.purse, incomeOf(adv, 'rival')) } : undefined;
  const next = { ...adv, day, hero, ...(others ? { others } : {}), towns, objects, purse: addTo(adv.purse, dailyIncome(adv)), ...(rival ? { rival } : {}) };
  return { ...next, prompts: [...adv.prompts, { kind: 'message', title: calendar(day), text: '', report: dayReport(adv, next) }] };
}

/** A hero of ours after the night: moves back (more from a town's Stables), mana back (all of it in a town with a guild). */
function rested(adv: Adventure, h: Hero): Hero {
  const regen = Math.max(1, skillValue(h.skills, 'mysticism'));
  const here = townAt(adv, h.x, h.y);
  const ours = here?.owner === 'player' ? here : undefined;
  const inGuild = !!ours && has(ours, 'mageGuild1');
  return { ...h, mp: dailyMp(h) + (ours && has(ours, 'stables') ? STABLES_MP : 0), mana: inGuild ? Math.max(h.mana, maxMana(h)) : Math.min(maxMana(h), h.mana + regen) };
}

/** What the night brought, for the card that opens the new day: the income by source, the hero rested, a new week's recruits. */
export function dayReport(before: Adventure, after: Adventure): DayReport {
  const towns = playerTowns(before);
  const estates = skillValue(before.hero.skills, 'estates');
  const goldMines = ownedMines(before).filter((m) => m.resource === 'gold').length;
  const sources: GoldSource[] = [
    ...towns.map((t): GoldSource => ({ kind: 'town', label: t.name, gold: income(t) })),
    { kind: 'mines', label: goldMines === 1 ? 'Gold mine' : `Gold mines ×${goldMines}`, gold: goldMines * MINE_OUTPUT.gold },
    { kind: 'estates', label: 'Estates', gold: estates },
  ];
  const h = after.hero;
  const hero = { id: h.id, name: h.name, tiles: tilesOf(h.mp), horses: tilesOf(Math.max(0, h.mp - dailyMp(h))), mana: h.mana, maxMana: maxMana(h), gained: Math.max(0, h.mana - before.hero.mana) };
  const report = { income: dailyIncome(before), sources: sources.filter((s) => s.gold > 0), hero };
  if (dayOfWeek(after.day) !== 1) return report;
  const recruits = towns.flatMap((t): TownRecruits[] => {
    // By level, so each town's recruits line up under the last's.
    const units = [...dwellings(t)].sort((a, b) => creature(a).level - creature(b).level).map((d) => ({ creature: d, count: growthOf(t, d) }));
    return units.length ? [{ town: t.name, units }] : [];
  });
  return { ...report, week: { recruits } };
}

/** The army the player's hero fights with: their own, or the garrison's when they sit in it. */
export const playerArmy = (adv: Adventure): Army => (heroInGarrison(adv) ? heroTown(adv)!.garrison : adv.hero.army);

/** A hero's side of a battle: the hero, the army they lead and their war machine. */
export function heroSide(h: Hero, army: Army = h.army): BattleSide {
  return { hero: toBattleHero(h), army, armyMorale: armyMorale(army), machine: machineOf(h) };
}

/** The rival lord's side in the field: with a town of his to ride to, he can leave a lost battle. */
export function lordSide(adv: Adventure, foe: Hero, army: Army = foe.army): BattleSide {
  const side = heroSide(foe, army);
  return refuge(adv, foe) ? { ...side, hero: { ...side.hero!, canFlee: true } } : side;
}

/** The rival town nearest `foe`, where he rides when he leaves a battle (none: he must fight to the end). */
export function refuge(adv: Adventure, foe: { x: number; y: number }): Town | undefined {
  const far = (t: Town): number => Math.max(Math.abs(t.x - foe.x), Math.abs(t.y - foe.y));
  return adv.towns.filter((t) => t.owner === 'rival').sort((a, b) => far(a) - far(b))[0];
}

/** The rival lord left the field: he is back in his nearest town with no army and no move left; null if he has none. */
export function fledHome(adv: Adventure, foe: Hero): { adv: Adventure; town: Town } | null {
  const town = refuge(adv, foe);
  if (!town) return null;
  return { adv: { ...adv, rival: { ...adv.rival!, hero: { ...foe, x: town.x, y: town.y, mp: 0, army: armyOf([]) } } }, town };
}

/** The rival lord fled from the player: where to, and what it means. */
function rivalFled(adv: Adventure, foe: Hero): Adventure {
  const r = fledHome(adv, foe);
  if (!r) return beatRival(adv, foe);
  const many = r.adv.towns.filter((t) => t.owner === 'rival').length > 1;
  const text = `${foe.name} has left the field and ridden hard for ${r.town.name}, leaving his army behind. He will hire another there. Take ${many ? 'his towns' : r.town.name}, and he will have nowhere left to run.`;
  // The line says "his town": told while he has just the one.
  const card: Prompt = foe.id === CHAPTER1.kassander && !many ? toldPrompt('kassander-flees') : { kind: 'message', title: `${foe.name} flees`, text };
  return { ...r.adv, prompts: [...r.adv.prompts, card] };
}

/** The two sides of a fight, and the walls between them if there are any. */
export interface BattleSetup {
  readonly attacker: BattleSide;
  readonly defender: BattleSide;
  readonly seed: number;
  readonly siege?: SiegeSetup;
}

/** A side defending `fort` with nobody to place its towers for it: it mans them itself. */
function manned(side: BattleSide, fort: Fortification): BattleSide {
  return { ...side, ...manTowers(side.army, fort.places) };
}

/** Two armies as one, where they fit (the hero's first): a garrison joining the hero who defends it. */
function joined(a: Army, b: Army): Army {
  return moveAll(b, a)?.dst ?? a;
}

/**
 * The two sides of a fight, the player always on the left: with map monster
 * `id`, the garrison of town `id` (with the rival lord if he's in it), the
 * rival lord in the field (RIVAL), or a town of ours the rival storms with
 * no hero of ours inside (DEFEND + its id: the garrison fights alone). At a
 * town with a Fort the attacker has the left, whoever it is, and the walls
 * stand on the right; our towers hold whom we placed there, theirs man
 * themselves.
 */
export function battleSides(adv: Adventure, id: string): BattleSetup {
  const seed = (adv.seed ^ (adv.day * 7919) ^ hashId(id)) >>> 0;
  const foe = rivalHero(adv);
  if (id.startsWith(DEFEND)) {
    const held = townById(adv, id.slice(DEFEND.length));
    if (!held || !foe) throw new Error(`no defence of ${id}`);
    const garrison = { hero: null, army: held.garrison };
    const fort = fortification(held.built);
    if (!fort) return { attacker: garrison, defender: lordSide(adv, foe), seed };
    return { attacker: lordSide(adv, foe), defender: { ...garrison, towers: towersOf(held) }, seed, siege: { fort, me: 1 } };
  }
  const me = heroSide(adv.hero, playerArmy(adv));
  if (id === RIVAL) {
    if (!foe) throw new Error('no rival in the field');
    const home = heroTown(adv);
    const fort = home?.owner === 'player' ? fortification(home.built) : null;
    if (!fort) return { attacker: me, defender: lordSide(adv, foe), seed };
    return { attacker: lordSide(adv, foe), defender: { ...me, towers: towersOf(home!) }, seed, siege: { fort, me: 1 } };
  }
  const town = townById(adv, id);
  const m = adv.objects.find((o) => o.id === id);
  if (!town && (!m || m.kind !== 'monster' || !m.creature)) throw new Error(`no monster or town ${id}`);
  const lord = town && foe && rivalAt(adv, town.x, town.y) ? heroSide(foe, joined(foe.army, town.garrison)) : null;
  const defender = lord ?? { hero: null, army: town ? town.garrison : splitMonster(m!.creature!, m!.count ?? 1) };
  const fort = town ? fortification(town.built) : null;
  return fort ? { attacker: me, defender: manned(defender, fort), seed, siege: { fort, me: 0 } } : { attacker: me, defender, seed };
}

const hashId = (s: string): number => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

/** The map after a fight `id` (see battleSides) ends as `battle`; `then` is the site a monster guarded, taken on a win. */
export function afterBattle(played: Adventure, def: MapDef, id: string, battle: BattleState, then?: string): Adventure {
  // Whatever the fight was, none waits any more.
  const { rivalFight: _done, ...adv } = played;
  if (id.startsWith(DEFEND)) return afterDefence(adv, def, id.slice(DEFEND.length), battle);
  const side = playerSide(battle);
  if (battle.winner !== side) return heroFell(adv, def);
  const garrisoned = heroInGarrison(adv) ? heroTown(adv)! : null;
  const before = playerArmy(adv);
  const army = survivors(battle, side, before);
  const lost = before.filter((s, i) => s && !army[i]).length;
  const xp = gainedXp(adv.hero, experienceFor(battle, side));
  const hero = { ...adv.hero, army: garrisoned ? adv.hero.army : army, xp: adv.hero.xp + xp, mana: battle.heroes[side]?.mana ?? adv.hero.mana };
  const objects = adv.objects.map((o) => (o.id === id ? { ...o, gone: true } : o));
  const beaten = adv.objects.find((o) => o.id === id && !o.gone);
  let next: Adventure = claimDrop({ ...adv, hero, objects, lostStacks: adv.lostStacks + lost }, beaten?.drop);
  if (garrisoned) next = withTown(next, { ...garrisoned, garrison: army });
  // Holding a town of ours, its towers count their dead too.
  const home = side === 1 ? heroTown(next) : undefined;
  if (home) next = withTown(next, { ...home, towers: towerSurvivors(battle, side, towersOf(home)) });
  const town = townById(next, id);
  // The rival lord beaten, in the field or at his town's gate: he rides no more.
  const foe = rivalHero(adv);
  if (foe && (id === RIVAL || (town && rivalAt(adv, town.x, town.y)))) next = battle.fled !== undefined && battle.fled !== side ? rivalFled(next, foe) : beatRival(next, foe);
  // A town's garrison beaten: the town is taken and the hero rides in through its gate.
  if (town) next = enterTown(takeTown({ ...next, hero: { ...next.hero, x: town.x, y: town.y } }, id));
  // The site the hero was fighting for is theirs now, unless another monster still guards it.
  const site = then ? liveObjects(next).find((o) => o.id === then) : undefined;
  if (site && site.kind !== 'monster' && !guardAt(next, site.x, site.y)) next = visitSite(next, site).adv;
  return checkGoal(queueLevelUps(next), def);
}

/**
 * The picked hero lost a battle: with another hero still riding, the fallen
 * one is gone (army, gear and all) and the next is picked; the last hero
 * falling loses the map, as before.
 */
function heroFell(adv: Adventure, def: MapDef): Adventure {
  const [next, ...rest] = adv.others ?? [];
  if (!next) return { ...adv, status: 'lost', hero: { ...adv.hero, army: armyOf([]) } };
  const text = `${adv.hero.name} has fallen in battle, and the army is lost. ${next.name} rides on.`;
  const left = { ...adv, hero: next, others: rest, prompts: [...adv.prompts, { kind: 'message' as const, title: `${adv.hero.name} has fallen`, text }] };
  return checkGoal(left, def);
}

/** What a beaten monster left, on the hero or in the bag, and the card that shows it. */
function claimDrop(adv: Adventure, id: ItemId | undefined): Adventure {
  if (!id) return adv;
  const got = gainItem(adv.hero, id);
  const end = got.worn ? `${adv.hero.name} puts it on.` : got.kept ? 'It goes in the bag.' : 'The bag is full, so it stays behind.';
  const { name, set } = itemDef(id);
  const prompt: Prompt = { kind: 'message', title: name, text: `${QUALITY_NAMES[itemQuality(id)]}: ${itemSays(id)}${set ? ` · ${SET_NAMES[set]}` : ''}\n${end}`, item: id };
  return { ...adv, hero: got.hero, prompts: [...adv.prompts, prompt] };
}

/** The rival lord is gone from the map; his towns still stand. */
function beatRival(adv: Adventure, foe: Hero): Adventure {
  const left = adv.towns.filter((t) => t.owner === 'rival').map((t) => t.name);
  const text = left.length ? `${foe.name} rides no more. ${left.join(' and ')} still stand${left.length === 1 ? 's' : ''} behind ${left.length === 1 ? 'its' : 'their'} walls.` : `${foe.name} rides no more.`;
  // The line says the banner is down for good: told once no town of his is left standing.
  const card: Prompt = foe.id === CHAPTER1.kassander && !left.length ? toldPrompt('kassander-beaten') : { kind: 'message', title: `${foe.name} is beaten`, text };
  return { ...adv, rival: { ...adv.rival!, hero: null }, prompts: [...adv.prompts, card] };
}

/** The map after the rival storms town `townId` with only its garrison in it: held, or taken (and the map lost with the last town). */
function afterDefence(adv: Adventure, def: MapDef, townId: string, battle: BattleState): Adventure {
  const town = townById(adv, townId);
  const foe = rivalHero(adv);
  if (!town || !foe) return adv;
  const side = playerSide(battle);
  const his: Side = side === 0 ? 1 : 0;
  if (battle.winner === side) {
    const held = withTown(adv, { ...town, garrison: survivors(battle, side, town.garrison), towers: towerSurvivors(battle, side, towersOf(town)) });
    return checkGoal(battle.fled === his ? rivalFled(held, foe) : beatRival(held, foe), def);
  }
  // The town falls: the rival rides in through its gate.
  const rival = { ...foe, x: town.x, y: town.y, army: survivors(battle, his, foe.army) };
  const next = withTown({ ...adv, rival: { ...adv.rival!, hero: rival } }, { ...town, owner: 'rival', garrison: armyOf([]), towers: emptyArmy() });
  const fell: Adventure = { ...next, prompts: [...next.prompts, { kind: 'message', title: `${town.name} has fallen`, text: `${foe.name}'s banner flies over ${town.name}. Take it back!` }] };
  return checkGoal(fell, def);
}

/** The town behind walls fight `id` would storm when the hero rides with no war machine, for the warning first. */
export function wallsToStorm(adv: Adventure, id: string): Town | undefined {
  const town = townById(adv, id);
  return town && town.owner !== 'player' && fortification(town.built) && !machineOf(adv.hero) ? town : undefined;
}

/** Whether the map's goal is met, or lost with the player's last town. */
export function checkGoal(adv: Adventure, def: MapDef): Adventure {
  if (adv.status !== 'playing') return adv;
  if (!playerTowns(adv).length) return { ...adv, status: 'lost' };
  const { kind, target } = def.goal;
  const held = (): boolean => (townById(adv, target) ?? adv.objects.find((o) => o.id === target))?.owner === 'player';
  const done = kind === 'defeat' ? !!adv.objects.find((o) => o.id === target)?.gone : held() && (kind === 'capture' || !rivalHero(adv));
  return done ? { ...adv, status: 'won' } : adv;
}

/** Adds a level-up card if the hero has the experience for one and none is waiting. */
export function queueLevelUps(adv: Adventure): Adventure {
  if (adv.prompts.some((p) => p.kind === 'levelUp')) return adv;
  // Each level's offer comes from the map's seed and that level alone (the seed never moves), so a reload deals the same one again.
  const r = nextLevelUp(adv.hero, (adv.seed ^ Math.imul(adv.hero.level + 1, 0x9e3779b1)) >>> 0);
  if (!r) return adv;
  return { ...adv, prompts: [...adv.prompts, { kind: 'levelUp', offer: r.offer }] };
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
