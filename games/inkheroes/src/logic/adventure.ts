import { bagRoom, gainItem, gearGold, hasAsGood, hasSpellbook, itemDef, itemQuality, itemSays, machineOf, QUALITY_NAMES, SET_NAMES, wear, type ItemId, type SoldMachine } from './items';
import { dropOf } from './loot';
import { lairsOut } from './lairs';
import { stripped, takeSpoils } from './spoils';
import { setLine } from './itemCompare';
import { kitOf, kitted } from './lord/kit';
import type { HeroDef, MapDef } from '../level/types';
import type { DayReport, GoldSource, TownRecruits } from './dayReport';
import { ARMY_SLOTS, armyMorale, armyOf, emptyArmy, isEmptyArmy, moveAll, splitMonster, type Army, type ArmySlot } from './army';
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
import { isLying, pickUpInPassing } from './lying';
import { specialtyOf } from './roster';
import { specialtyGold } from './specialty';
import type { LordMemory } from './lord/knowledge';
import { growDwellings, hireAtDwelling } from './dwellings';
import { mobArmy, mobLost, mobWon } from './portalMob';
import { previousMap } from '../level/maps';
import { CHAPTER1, lineText, LINES, narrated, STORM_WORDS, type LineId } from '../narration/lines';

export type Prompt =
  /** A chest: gold or experience, or (`item`: 1 chest in 4, src/logic/loot.ts) a piece to take. */
  | { readonly kind: 'chest'; readonly id: string; readonly gold: number; readonly xp: number; readonly item?: ItemId }
  | { readonly kind: 'levelUp'; readonly offer: LevelUp }
  /** An outer dwelling of ours with creatures waiting: hire them, or leave them. `text`: news to show first (its flag just went up). */
  | { readonly kind: 'dwelling'; readonly id: string; readonly text?: string }
  /** A training site (an Arena of Heroes, a legendary site) with companies it can train: pick one, or leave (src/logic/training.ts). */
  | { readonly kind: 'train'; readonly id: string }
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
  /**
   * A fight waiting for the player to play: one the rival started in the
   * night (RIVAL, GATE or DEFEND + a town of ours), or the walls of a town
   * of his after we beat the hero at its gate (the town's id).
   */
  readonly rivalFight?: string;
}

export interface RivalState {
  /** His hero in the field (a lord's first; null once all are beaten). */
  readonly hero: Hero | null;
  readonly purse: Purse;
  /** A lord's other heroes (`rival.mind: 'lord'`, src/logic/lord): hired at his Taverns. */
  readonly others?: readonly Hero[];
  /** What a lord has seen, '1' for each tile, as `explored` is ours (none: Kassander's rules). */
  readonly explored?: string;
  /** What a lord remembers of us, and his plans (src/logic/lord/knowledge.ts). */
  readonly memory?: LordMemory;
  /** A lord's heroes beaten in the field, and the day: the lord himself hires again at a town of his the next week. */
  readonly fallen?: readonly { readonly hero: Hero; readonly day: number }[];
  /** The day a lord lost his last town: with none taken back in TOWNLESS_DAYS his banner falls (H3's rule, src/logic/lord/turn.ts). */
  readonly homeless?: number;
  /** The player's side seen from the lord's chair (src/logic/lord/mirror.ts), never saved: beaten, their gear isn't taken (the rival never takes ours). */
  readonly mirror?: true;
}

/**
 * Battle ids beside a monster's or a town's own: RIVAL, the rival lord in
 * the field; `defend:<town>`, the rival storming the walls of a town of
 * ours (its garrison, and the hero in it if any); `gate:<town>`, the hero
 * standing at a town's gate fought first, in the open, by whoever storms it
 * (the rival at ours, or we at his).
 */
export const RIVAL = 'rival';
export const DEFEND = 'defend:';
export const GATE = 'gate:';
/** `portal:<town>`: the week's band at a town of ours with a Summoning Portal, fought by the hero in it (src/logic/portalMob.ts). */
export const PORTAL = 'portal:';

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
    ...(h.faction ? { faction: h.faction } : {}), ...(h.ankhs ? { ankhs: h.ankhs } : {}),
  };
  const specialty = specialtyOf(h);
  return { ...hero, mp: dailyMp(hero), ...(specialty ? { specialty } : {}) };
}

/** The map's rival lord's hero as the map places him, wearing his kit (src/logic/lord/kit.ts). */
export const rivalFromDef = (def: MapDef): Hero => kitted(heroFromDef(def.rival!.hero), kitOf(def, def.rival!.hero.id));

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
  const town: Town = { id: t.id, name: t.name, owner: 'player', x: t.x, y: t.y, built: t.built, builtToday: false, stock: {}, garrison: armyOf(t.garrison ?? []), guild: t.guild, ...(t.faction ? { faction: t.faction } : {}) };
  // The map's other towns stand neutral (or the rival's), held by their garrisons, until a hero takes them.
  const others = (def.towns ?? []).map((o): Town => ({ id: o.id, name: o.name, owner: o.owner ?? 'neutral', x: o.x, y: o.y, built: o.built, builtToday: false, stock: {}, garrison: armyOf(o.garrison), guild: o.guild, ...(o.faction ? { faction: o.faction } : {}) }));
  const adv: Adventure = {
    mapId: def.id, day: 1, seed: def.seed, purse: purse(def.purse), hero,
    towns: [town, ...others].map(weekly), objects: def.objects, explored: '0'.repeat(g.w * g.h), status: 'playing',
    prompts: [openingPrompt(def)], lostStacks: 0,
    ...(def.rival ? { rival: { hero: rivalFromDef(def), purse: purse(def.rival.purse) } } : {}),
  };
  return revealAround(revealAround(lordsBefore(lairsOut(adv), def), def, hero.x, hero.y, sightOf(hero)), def, t.x, t.y, 5);
}

/**
 * A lord gone from the land, beaten in a part before: what he still held
 * (objects and towns with ids in `his`) turns neutral, his towns keeping
 * their garrisons (H3: a beaten player's mines go neutral).
 */
export function oldLordGone(adv: Adventure, his: ReadonlySet<string>): Adventure {
  const was = (o: { id: string; owner?: string }): boolean => his.has(o.id) && o.owner === 'rival';
  return {
    ...adv,
    objects: adv.objects.map((o) => (was(o) ? { ...o, owner: 'neutral' as const } : o)),
    towns: adv.towns.map((t) => (was(t) ? { ...t, owner: 'neutral' as const } : t)),
  };
}

/** A part played fresh whose lord is new: the earlier lords' holdings stand neutral, as they would ridden on. */
function lordsBefore(adv: Adventure, def: MapDef): Adventure {
  const lord = def.rival?.hero.id;
  if (!lord) return adv;
  let before = previousMap(def);
  while (before && !before.rival) before = previousMap(before);
  if (!before || before.rival!.hero.id === lord) return adv;
  return oldLordGone(adv, new Set([...before.objects.map((o) => o.id), ...(before.towns ?? []).map((t) => t.id)]));
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
  if (!town || !heroVisiting(adv) || inGarrisonOf(adv, town)) return null;
  const r = moveAll(adv.hero.army, town.garrison);
  return r ? withTown({ ...adv, hero: { ...adv.hero, army: r.src } }, { ...town, garrison: r.dst }) : null;
}

/** Another hero of ours already holding `town`'s garrison (only one can). */
const inGarrisonOf = (adv: Adventure, town: Town): Hero | undefined => (adv.others ?? []).find((h) => h.x === town.x && h.y === town.y && isEmptyArmy(h.army));

/** The hero in the garrison steps out to visit, leading the whole garrison. */
export function leadOut(adv: Adventure): Adventure {
  const town = heroTown(adv);
  if (!town || !heroInGarrison(adv) || (adv.others ?? []).some((h) => h.x === town.x && h.y === town.y && !isEmptyArmy(h.army))) return adv;
  return withTown({ ...adv, hero: { ...adv.hero, army: town.garrison } }, { ...town, garrison: armyOf([]) });
}

/** The monster whose guard zone covers (x, y): the 8 tiles round it. */
export function guardAt(adv: Adventure, x: number, y: number): MapObject | undefined {
  return liveObjects(adv).find((o) => o.kind === 'monster' && Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1 && !(o.x === x && o.y === y));
}

/** The rival lord's hero, if one is riding (not yet beaten): a lord's first, or the one fighting. */
export const rivalHero = (adv: Adventure): Hero | null => adv.rival?.hero ?? null;
/** Every hero of the rival's, the first one first. */
export const rivalHeroes = (adv: Adventure): Hero[] => [...(adv.rival?.hero ? [adv.rival.hero] : []), ...(adv.rival?.others ?? [])];
/**
 * The rival's hero at (x, y) becomes his first (`rival.hero`), the others
 * waiting in `rival.others`, as selectHero does ours: every rule written for
 * "the rival" then works on the one met.
 */
export function frontRival(adv: Adventure, x: number, y: number): Adventure {
  const r = adv.rival;
  // At a town the one in the gate is met first.
  const here = rivalHeroes(adv).filter((h) => h.x === x && h.y === y);
  const first = here.find((h) => !isEmptyArmy(h.army)) ?? here[0];
  const met = r?.others?.find((h) => h.id === first?.id);
  if (!r || !met) return adv;
  return { ...adv, rival: { ...r, hero: met, others: [...r.others!.filter((h) => h.id !== met.id), ...(r.hero ? [r.hero] : [])] } };
}
/** Every hero of the player's, the picked one first. */
export const ourHeroes = (adv: Adventure): Hero[] => [adv.hero, ...(adv.others ?? [])];
/** The player's hero (not the picked one) standing at (x, y). */
export function otherHeroAt(adv: Adventure, x: number, y: number): Hero | undefined {
  const here = (adv.others ?? []).filter((h) => h.x === x && h.y === y);
  // At a town the one in the gate comes first; the one in the garrison is inside.
  return here.find((h) => !isEmptyArmy(h.army)) ?? here[0];
}
/** Whether the rival lord stands at (x, y). */
export const rivalAt = (adv: Adventure, x: number, y: number): boolean => rivalHeroes(adv).some((r) => r.x === x && r.y === y);

/** A town's two places for its holder's heroes (heroes.ts townHeroes, for either side): the gate (leading an army) and the garrison (no companies of their own). */
export function townGuards(adv: Adventure, town: Town): { readonly gate?: Hero; readonly garrison?: Hero } {
  const side = town.owner === 'player' ? ourHeroes(adv) : town.owner === 'rival' ? rivalHeroes(adv) : [];
  const here = side.filter((h) => h.x === town.x && h.y === town.y);
  return { gate: here.find((h) => !isEmptyArmy(h.army)), garrison: here.find((h) => isEmptyArmy(h.army)) };
}

/** Hero `id` of ours becomes the picked one (heroes.ts selectHero, kept here for the fights). */
export function pickHero(adv: Adventure, id: string): Adventure {
  const next = (adv.others ?? []).find((h) => h.id === id);
  return next ? { ...adv, hero: next, others: [...(adv.others ?? []).filter((h) => h.id !== id), adv.hero] } : adv;
}

/**
 * The first fight for `town` stormed by the side that doesn't hold it: the
 * hero at its gate, in the open (GATE), and only then its walls (the town's
 * id for his towns, DEFEND for ours). Null when nobody at all holds it.
 */
export function stormOf(adv: Adventure, town: Town): string | null {
  const { gate, garrison } = townGuards(adv, town);
  if (gate) return GATE + town.id;
  if (!garrison && undefended(town)) return null;
  return town.owner === 'player' ? DEFEND + town.id : town.id;
}

/**
 * What the pathfinder sees, for the player's hero or the rival's: walls and
 * footprints are solid, objects (and the other hero) are visited from beside
 * them, guard zones and gates end a path. Gear lying on the ground is open
 * ground: ridden over, and picked up in passing when there is room.
 */
export function terrainView(adv: Adventure, def: MapDef, who: 'player' | 'rival' = 'player'): Terrainview {
  const g = gridOf(def);
  const inside = (t: { x: number; y: number }): boolean => t.x >= 0 && t.y >= 0 && t.x < g.w && t.y < g.h;
  const solid = new Set(adv.towns.flatMap((town) => townFootprint(town.x, town.y)).filter(inside).map((t) => tileIndex(g, t.x, t.y)));
  const stopAt = new Set<number>();
  const visit = new Set<number>();
  for (const o of liveObjects(adv)) {
    // Gear lying on the ground is ridden over, never in the way (src/logic/lying.ts).
    if (isLying(o)) continue;
    visit.add(tileIndex(g, o.x, o.y));
    for (const t of objectFootprint(o).filter(inside)) solid.add(tileIndex(g, t.x, t.y));
    if (o.kind !== 'monster') continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inside({ x: o.x + dx, y: o.y + dy })) stopAt.add(tileIndex(g, o.x + dx, o.y + dy));
  }
  for (const town of adv.towns) stopAt.add(tileIndex(g, town.x, town.y));
  // Another hero is fought (or, if ours, met) from beside them, like a monster.
  const met = who === 'player' ? [...rivalHeroes(adv), ...(adv.others ?? [])] : ourHeroes(adv);
  for (const h of met) visit.add(tileIndex(g, h.x, h.y));
  const mover = who === 'player' ? adv.hero : rivalHero(adv);
  return { grid: g, solid, stopAt, visit, pathfinding: skillValue(mover?.skills ?? {}, 'pathfinding'), ...(stormOn(def, adv, adv.day) ? { storm: true } : {}) };
}

/** Whether Set's storm blows on `day` of the map (its part's 4th, 8th… day with `stormEvery: 4`), for both sides alike. */
export function stormOn(def: Pick<MapDef, 'stormEvery'>, adv: Pick<Adventure, 'begun'>, day: number): boolean {
  const every = def.stormEvery;
  return !!every && (day - (adv.begun ?? 1) + 1) % every === 0;
}

/** The day card's words about the weather: the storm today, or one rising for tomorrow. */
function stormNews(def: Pick<MapDef, 'stormEvery'> | undefined, adv: Adventure): string {
  if (!def) return '';
  if (stormOn(def, adv, adv.day)) return STORM_WORDS.blowing;
  return stormOn(def, adv, adv.day + 1) ? STORM_WORDS.rising : '';
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
  // The rival lord, in the field or in his town (the one at its gate first, in the open; then its walls): a fight.
  if (rivalAt(adv, step.x, step.y)) {
    const fronted = frontRival(adv, step.x, step.y);
    return { adv: fronted, stop: true, battle: gate ? stormOf(fronted, gate) ?? gate.id : RIVAL, notes: [] };
  }
  const friend = otherHeroAt(adv, step.x, step.y);
  // A friend in the gate is met; one in our town's garrison is inside, and the hero rides in.
  if (friend && !(gate?.owner === 'player' && isEmptyArmy(friend.army))) return { adv, stop: true, meet: friend.id, notes: [] };
  if (!canStep(step, adv.hero.mp)) return { adv, stop: true, notes: [] };
  // A town not ours: its garrison must be beaten from beside the gate (an empty one is just walked into).
  if (gate && gate.owner !== 'player' && !gate.ally && !undefended(gate)) return { adv, stop: true, battle: gate.id, notes: [] };
  // A piece lying on the ground is ridden onto, not visited from beside (src/logic/lying.ts).
  const lying = target && isLying(target) ? target : undefined;
  if (target && !lying) {
    const guard = guardAt(adv, target.x, target.y);
    if (guard) return { adv, stop: true, battle: guard.id, then: target.id, notes: [] };
    const r = visitSite({ ...adv, hero: { ...adv.hero, mp: Math.max(0, adv.hero.mp - step.cost) } }, target, def);
    return { adv: queueLevelUps(r.adv), stop: true, notes: r.notes };
  }
  const hero = { ...adv.hero, x: step.x, y: step.y, mp: Math.max(0, adv.hero.mp - step.cost) };
  let next = revealAround({ ...adv, hero }, def, step.x, step.y, sightOf(hero));
  if (gate) {
    if (gate.owner !== 'player') next = gate.ally ? joinTown(next, gate) : takeTown(next, gate.id);
    return { adv: checkGoal(enterTown(next), def), stop: true, town: true, notes: [] };
  }
  // A guarded tile is fought for first (as H3); a piece lying on it is taken once the fight is won.
  const guard = guardAt(next, step.x, step.y);
  if (guard) {
    const site = lying ?? (goal && objectAt(next, goal.x, goal.y));
    const beside = site && site.kind !== 'monster' && Math.abs(site.x - step.x) <= 1 && Math.abs(site.y - step.y) <= 1;
    return { adv: next, stop: true, battle: guard.id, ...(beside ? { then: site.id } : {}), notes: [] };
  }
  if (!lying) return { adv: next, stop: false, notes: [] };
  const passed = pickUpInPassing(next, lying);
  return { adv: passed.adv, stop: false, notes: passed.notes };
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

/** A hero entering its town takes the Ankhs its temple has made, and learns the guild's spells (with a spellbook). */
export function enterTown(played: Adventure): Adventure {
  const adv = takeAnkhs(played);
  const { hero } = adv;
  const town = heroTown(adv);
  if (!town || !hasSpellbook(hero)) return adv;
  const floors = has(town, 'mageGuild2') ? 5 : has(town, 'mageGuild1') ? 3 : 0;
  const learn = town.guild.slice(0, floors).filter((s) => !hero.spells.includes(s));
  return learn.length ? { ...adv, hero: { ...hero, spells: [...hero.spells, ...learn] } } : adv;
}

/** The hero in a town of ours takes the Ankhs waiting in its temple. */
export function takeAnkhs(adv: Adventure): Adventure {
  const town = heroTown(adv);
  if (!town?.ankhs) return adv;
  const { ankhs, ...emptied } = town;
  return withTown({ ...adv, hero: { ...adv.hero, ankhs: (adv.hero.ankhs ?? 0) + ankhs } }, emptied);
}

/** Why the visiting hero can't buy war machine `m` at this town's Blacksmith now, or null when they can. */
export function cantBuyMachine(adv: Adventure, m: SoldMachine): string | null {
  const town = heroTown(adv);
  if (!town || !has(town, 'blacksmith')) return 'No Blacksmith here';
  if (!heroVisiting(adv, town)) return `${adv.hero.name} must be in town, leading an army`;
  if (hasAsGood(adv.hero, m)) return `${adv.hero.name} has one as good`;
  if (!canAfford(adv.purse, creature(m).cost)) return 'Not enough gold';
  if (!bagRoom(adv.hero)) return 'The bag is full';
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

/** Gold and resources the player gets each day: towns, mines, the hero's estates, and gear that pays (src/logic/items.ts gearGold). */
export function dailyIncome(adv: Adventure): Purse {
  return addTo(incomeOf(adv, 'player'), { gold: skillValue(adv.hero.skills, 'estates') + specialtyGold(ourHeroes(adv)) + gearGold(ourHeroes(adv)) });
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

/** End of the day: income, rested heroes, and on a new week the dwellings fill and monsters grow; on a map with storms (`def`), the day card tells the weather. */
export function endDay(adv: Adventure, def?: MapDef): Adventure {
  const day = adv.day + 1;
  const newWeek = dayOfWeek(day) === 1;
  const hero = rested(adv, adv.hero);
  const others = adv.others?.map((h) => rested(adv, h));
  const towns = adv.towns.map((t) => (newWeek ? weekly(t) : { ...t, builtToday: false }));
  const objects = newWeek
    ? growDwellings(adv.objects.map((o) => (o.kind === 'monster' && !o.gone ? { ...o, count: Math.min(MAX_MONSTER, Math.round((o.count ?? 1) * 1.1)) } : o)))
    : adv.objects;
  // The rival rests and is paid too (the rival's turn itself is rivalTurn's, after the night).
  const r = adv.rival;
  const rival = r ? { ...r, hero: r.hero ? { ...r.hero, mp: dailyMp(r.hero) } : null, purse: addTo(addTo(r.purse, incomeOf(adv, 'rival')), { gold: specialtyGold(rivalHeroes(adv)) + gearGold(rivalHeroes(adv)) }), ...(r.others ? { others: r.others.map((h) => ({ ...h, mp: dailyMp(h) })) } : {}) } : undefined;
  // A hero waiting in a town takes the Ankh its temple makes on Monday.
  const paid = takeAnkhs({ ...adv, day, hero, ...(others ? { others } : {}), towns, objects, purse: addTo(adv.purse, dailyIncome(adv)), ...(rival ? { rival } : {}) });
  // On Monday each lair with its group gone sends out a new one.
  const next = newWeek ? lairsOut(paid) : paid;
  return { ...next, prompts: [...adv.prompts, { kind: 'message', title: calendar(day), text: stormNews(def, next), report: dayReport(adv, next) }] };
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
    ...ourHeroes(before).filter((h) => specialtyGold([h]) > 0).map((h): GoldSource => ({ kind: 'estates', label: `${h.name}'s herds`, gold: specialtyGold([h]) })),
    ...ourHeroes(before).filter((h) => gearGold([h]) > 0).map((h): GoldSource => ({ kind: 'estates', label: `${h.name}'s gear`, gold: gearGold([h]) })),
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

/** The rival lord fled from the player: where to, and what it means (he keeps all his gear). */
function rivalFled(adv: Adventure, foe: Hero, def: MapDef, town?: Town): Adventure {
  const r = fledHome(adv, foe);
  if (!r) return beatRival(adv, foe, def, town);
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
 * `id`, the garrison of town `id` behind its walls (commanded by the rival's
 * hero in it), the rival lord in the field (RIVAL), the hero at a town's
 * gate (GATE + its id: in the open, whoever storms it), or a town of ours
 * the rival storms past its gate (DEFEND + its id: the garrison, commanded
 * by the hero of ours in it, if any), or the week's band at a town of ours
 * (PORTAL + its id: in the open, needs `def`). At a town with a Fort the
 * attacker has the left, whoever it is, and the walls stand on the right;
 * towers hold whom the town placed there, else they man themselves.
 */
export function battleSides(adv: Adventure, id: string, def?: MapDef): BattleSetup {
  const seed = (adv.seed ^ (adv.day * 7919) ^ hashId(id)) >>> 0;
  const foe = rivalHero(adv);
  // A pending fight from an old save: our hero in the garrison was met "in the field".
  if (id === RIVAL && heroInGarrison(adv)) return { ...battleSides(adv, DEFEND + heroTown(adv)!.id), seed };
  if (id.startsWith(DEFEND)) {
    const held = townById(adv, id.slice(DEFEND.length));
    if (!held || !foe) throw new Error(`no defence of ${id}`);
    const lead = townGuards(adv, held).garrison;
    const garrison: BattleSide = lead ? heroSide(lead, held.garrison) : { hero: null, army: held.garrison };
    const fort = fortification(held.built);
    if (!fort) return { attacker: garrison, defender: lordSide(adv, foe), seed };
    return { attacker: lordSide(adv, foe), defender: { ...garrison, towers: towersOf(held) }, seed, siege: { fort, me: 1 } };
  }
  if (id.startsWith(GATE)) {
    const town = townById(adv, id.slice(GATE.length));
    if (!town || !foe) throw new Error(`no gate fight ${id}`);
    // Ours stormed: the hero at our gate; his: our picked hero against his at the gate.
    const ours = town.owner === 'player' ? townGuards(adv, town).gate ?? adv.hero : adv.hero;
    return { attacker: heroSide(ours), defender: lordSide(adv, foe), seed };
  }
  const me = heroSide(adv.hero, playerArmy(adv));
  if (id.startsWith(PORTAL)) {
    if (!def) throw new Error(`a portal fight needs its map: ${id}`);
    return { attacker: me, defender: { hero: null, army: mobArmy(adv, def, id.slice(PORTAL.length)) }, seed };
  }
  if (id === RIVAL) {
    if (!foe) throw new Error('no rival in the field');
    return { attacker: me, defender: lordSide(adv, foe), seed };
  }
  const town = townById(adv, id);
  const m = adv.objects.find((o) => o.id === id);
  if (!town && (!m || m.kind !== 'monster' || !m.creature)) throw new Error(`no monster or town ${id}`);
  // His hero in the garrison commands it (one still at the gate, from an old save, joins it).
  const guards = town ? townGuards(adv, town) : {};
  const lead = guards.garrison ?? guards.gate;
  const lord = town && lead ? heroSide(lead, joined(lead.army, town.garrison)) : null;
  const defender = lord ?? { hero: null, army: town ? town.garrison : monsterArmy(m!) };
  const fort = town ? fortification(town.built) : null;
  if (!fort) return { attacker: me, defender, seed };
  // A town of ours (stormed as the lord, on the mirrored map) holds its towers as placed.
  const placed = town && !isEmptyArmy(towersOf(town)) ? { ...defender, towers: towersOf(town) } : manned(defender, fort);
  return { attacker: me, defender: placed, seed, siege: { fort, me: 0 } };
}

const hashId = (s: string): number => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

/** A map monster's army: its own stacks, and its brood's beside them (a boss's brood takes up to 3 stacks). */
export function monsterArmy(m: MapObject): Army {
  const own = splitMonster(m.creature!, m.count ?? 1, m.brood ? 2 : 4);
  if (!m.brood) return own;
  // Stacks of their own (two armies joined would merge the brood into one).
  const slots = [...own, ...splitMonster(m.brood.creature, m.brood.count, 3)].filter((s): s is ArmySlot => !!s);
  return armyOf(slots.slice(0, ARMY_SLOTS));
}

/** The map after a fight `id` (see battleSides) ends as `battle`; `then` is the site a monster guarded, taken on a win. */
export function afterBattle(played: Adventure, def: MapDef, id: string, battle: BattleState, then?: string): Adventure {
  // Whatever the fight was, none waits any more.
  const { rivalFight: _done, ...was } = played;
  if (id === RIVAL && heroInGarrison(was)) return afterBattle(was, def, DEFEND + heroTown(was)!.id, battle);
  if (id.startsWith(DEFEND)) return afterDefence(was, def, id.slice(DEFEND.length), battle);
  const atGate = id.startsWith(GATE) ? townById(was, id.slice(GATE.length)) : undefined;
  // Our town's gate held by a hero of ours: the fight was theirs, so they are the one picked.
  const ourGate = atGate?.owner === 'player' ? townGuards(was, atGate).gate : undefined;
  const adv = ourGate ? pickHero(was, ourGate.id) : was;
  const side = playerSide(battle);
  // A Summoning Portal's band: won as a monster is, lost with the hero coming home.
  const mob = id.startsWith(PORTAL) ? id.slice(PORTAL.length) : undefined;
  if (battle.winner !== side) {
    if (mob) return mobLost(adv, def, mob, battle);
    if (ourGate) return gateLost(adv, def, atGate!, battle);
    // Beaten by his hero in the field or at his gate: he keeps only what lived, as in every fight.
    const fell = heroFell(adv, def);
    return id === RIVAL || atGate ? rivalKeeps(fell, battle, side === 0 ? 1 : 0) : fell;
  }
  const garrisoned = heroInGarrison(adv) ? heroTown(adv)! : null;
  const before = playerArmy(adv);
  const army = survivors(battle, side, before);
  const lost = before.filter((s, i) => s && !army[i]).length;
  const xp = gainedXp(adv.hero, experienceFor(battle, side));
  const ankhs = battle.heroes[side]?.ankhs ?? adv.hero.ankhs ?? 0;
  const { ankhs: _was, ...fought } = adv.hero;
  const hero = { ...fought, army: garrisoned ? adv.hero.army : army, xp: adv.hero.xp + xp, mana: battle.heroes[side]?.mana ?? adv.hero.mana, ...(ankhs ? { ankhs } : {}) };
  const objects = adv.objects.map((o) => (o.id === id ? { ...o, gone: true } : o));
  const beaten = adv.objects.find((o) => o.id === id && !o.gone);
  let next: Adventure = claimDrop({ ...adv, hero, objects, lostStacks: adv.lostStacks + lost }, beaten, def);
  if (garrisoned) next = withTown(next, { ...garrisoned, garrison: army });
  // Holding a town of ours, its towers count their dead too.
  const home = side === 1 ? heroTown(next) : undefined;
  if (home) next = withTown(next, { ...home, towers: towerSurvivors(battle, side, towersOf(home)) });
  const town = townById(next, id);
  // The rival lord beaten, in the field, at a town's gate or in his town: he rides no more.
  const foe = rivalHero(adv);
  if (foe && (id === RIVAL || atGate || (town && rivalAt(adv, town.x, town.y)))) next = battle.fled !== undefined && battle.fled !== side ? rivalFled(next, foe, def) : beatRival(next, foe, def);
  // His gate won: now his walls, unless nobody is left to hold them.
  if (atGate && atGate.owner !== 'player') next = toHisWalls(next, atGate.id);
  // A town's garrison beaten: the town is taken and the hero rides in through its gate.
  if (town) next = enterTown(takeTown({ ...next, hero: { ...next.hero, x: town.x, y: town.y } }, id));
  // The site the hero was fighting for is theirs now, unless another monster still guards it.
  const site = then ? liveObjects(next).find((o) => o.id === then) : undefined;
  if (site && site.kind !== 'monster' && !guardAt(next, site.x, site.y)) next = visitSite(next, site, def).adv;
  if (mob) next = mobWon(next, def, mob);
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

/**
 * What a beaten monster left (its hand-placed piece, or the random roll's,
 * src/logic/loot.ts), on the hero or in the bag, and the card that shows it.
 * With the bag full it lies on the ground where the monster stood, to be
 * picked up later.
 */
function claimDrop(adv: Adventure, beaten: MapObject | undefined, def: MapDef): Adventure {
  const id = beaten && dropOf(def, beaten, ourHeroes(adv));
  if (!beaten || !id) return adv;
  const got = gainItem(adv.hero, id);
  const end = got.worn ? `${adv.hero.name} puts it on.` : got.kept ? 'It goes in the bag.' : 'The bag is full, so it lies here on the ground: make room and come back for it.';
  const prompt: Prompt = { kind: 'message', title: itemDef(id).name, text: `${itemLine(id)}\n${end}`, item: id };
  const objects = got.kept ? adv.objects : adv.objects.map((o) => (o.id === beaten.id ? lyingItem(beaten, id) : o));
  return { ...adv, hero: got.hero, objects, prompts: [...adv.prompts, prompt] };
}

/** A piece's grade and what it gives, and on a line of its own its set's bonuses. */
export function itemLine(id: ItemId): string {
  const set = setLine(id);
  return `${QUALITY_NAMES[itemQuality(id)]}: ${itemSays(id)}${set ? `\n${set}` : ''}`;
}

/** Piece `id` lying where `o` stood (a beaten monster's place). */
export const lyingItem = (o: Pick<MapObject, 'id' | 'x' | 'y'>, id: ItemId): MapObject => ({ id: o.id, kind: 'item', x: o.x, y: o.y, item: id });

/**
 * The rival lord is gone from the map; his towns still stand. The hero who
 * beat him (or `town`'s store, held by its garrison alone) takes his gear
 * (src/logic/spoils.ts), and a lord's hero is remembered without it.
 */
function beatRival(played: Adventure, foe: Hero, def: MapDef, town?: Town): Adventure {
  const adv = takeSpoils(played, def, foe, { x: foe.x, y: foe.y }, town);
  const left = adv.towns.filter((t) => t.owner === 'rival').map((t) => t.name);
  const text = left.length ? `${foe.name} rides no more. ${left.join(' and ')} still stand${left.length === 1 ? 's' : ''} behind ${left.length === 1 ? 'its' : 'their'} walls.` : `${foe.name} rides no more.`;
  // The line says the banner is down for good: told once no town of his is left standing.
  const card: Prompt = foe.id === CHAPTER1.kassander && !left.length ? toldPrompt('kassander-beaten') : { kind: 'message', title: `${foe.name} is beaten`, text };
  // A lord's next hero rides on as his first; the beaten one is remembered, to hire again at a town of his next week (src/logic/lord/turn.ts).
  const r = adv.rival!;
  const [next, ...rest] = r.others ?? [];
  const lord = r.others !== undefined || r.explored !== undefined;
  const fallen = lord ? { fallen: [...(r.fallen ?? []), { hero: { ...stripped(foe), army: armyOf([]) }, day: adv.day }] } : {};
  return { ...adv, rival: { ...r, hero: next ?? null, ...(r.others ? { others: rest } : {}), ...fallen }, prompts: [...adv.prompts, card] };
}

/** The rival's hero who won a fight on `his` side keeps only its survivors. */
function rivalKeeps(adv: Adventure, battle: BattleState, his: Side): Adventure {
  const foe = rivalHero(adv);
  return foe ? { ...adv, rival: { ...adv.rival!, hero: { ...foe, army: survivors(battle, his, foe.army) } } } : adv;
}

/** The card between a town's two battles: the gate is broken, the walls are next. */
const wallsCard = (attacker: string, town: Town): Prompt => ({ kind: 'message', title: `${town.name}: the walls`, text: `${attacker} broke through at the gate: now the walls.` });

/**
 * We beat the hero at the gate of his town `townId`: its walls are fought
 * next (the card, then the siege, waiting as `rivalFight`), commanded by his
 * hero in its garrison if any. Nobody left in it: it is just ridden into.
 */
function toHisWalls(adv: Adventure, townId: string): Adventure {
  const town = townById(adv, townId);
  if (!town || town.owner === 'player' || adv.status !== 'playing') return adv;
  if (!townGuards(adv, town).garrison && undefended(town)) return enterTown(takeTown({ ...adv, hero: { ...adv.hero, x: town.x, y: town.y } }, townId));
  const fronted = frontRival(adv, town.x, town.y);
  return { ...fronted, prompts: [...fronted.prompts, wallsCard(adv.hero.name, town)], rivalFight: townId };
}

/**
 * The rival beat the hero of ours at the gate of our town: the hero falls
 * as anywhere else, he keeps what lived, and the walls are fought next (the
 * hero in the garrison picked to command them); with nobody left in it the
 * town falls at once.
 */
function gateLost(adv: Adventure, def: MapDef, town: Town, battle: BattleState): Adventure {
  const foe = rivalHero(adv);
  if (!foe) return heroFell(adv, def);
  const next = rivalKeeps(heroFell(adv, def), battle, playerSide(battle) === 0 ? 1 : 0);
  const after = rivalHero(next)!;
  if (next.status !== 'playing') return next;
  const lead = townGuards(next, town).garrison;
  if (!lead && undefended(town)) return townFalls(next, def, town, after);
  const picked = lead ? pickHero(next, lead.id) : next;
  return { ...picked, prompts: [...picked.prompts, wallsCard(foe.name, town)], rivalFight: DEFEND + town.id };
}

/** The rival rides into our town `town` through its gate: his banner over it (and the map lost with the last town). */
function townFalls(adv: Adventure, def: MapDef, town: Town, foe: Hero): Adventure {
  const rival = { ...foe, x: town.x, y: town.y };
  const next = withTown({ ...adv, rival: { ...adv.rival!, hero: rival } }, { ...town, owner: 'rival', garrison: armyOf([]), towers: emptyArmy() });
  const fell: Adventure = { ...next, prompts: [...next.prompts, { kind: 'message', title: `${town.name} has fallen`, text: `${foe.name}'s banner flies over ${town.name}. Take it back!` }] };
  return checkGoal(fell, def);
}

/**
 * The map after the rival storms the walls of town `townId`: its garrison,
 * commanded by the hero of ours in it if any, holds it or the town falls
 * (that hero falling with it, as a hero beaten anywhere).
 */
function afterDefence(played: Adventure, def: MapDef, townId: string, battle: BattleState): Adventure {
  const town = townById(played, townId);
  const foe = rivalHero(played);
  if (!town || !foe) return played;
  const lead = townGuards(played, town).garrison;
  const adv = lead ? pickHero(played, lead.id) : played;
  const side = playerSide(battle);
  const his: Side = side === 0 ? 1 : 0;
  // A hero who fought carries his spent Ankhs and mana back (as afterBattle does), and his experience.
  const fought = battle.heroes[side];
  const ankhs = fought?.ankhs ?? adv.hero.ankhs ?? 0;
  const { ankhs: _was, ...rest } = adv.hero;
  const xp = lead ? gainedXp(adv.hero, experienceFor(battle, side)) : 0;
  const back: Adventure = fought ? { ...adv, hero: { ...rest, mana: fought.mana, xp: rest.xp + xp, ...(ankhs ? { ankhs } : {}) } } : adv;
  if (battle.winner === side) {
    const held = withTown(back, { ...town, garrison: survivors(battle, side, town.garrison), towers: towerSurvivors(battle, side, towersOf(town)) });
    // Held by its garrison alone, his gear goes to the town's store.
    const store = lead ? undefined : townById(held, townId);
    return checkGoal(queueLevelUps(battle.fled === his ? rivalFled(held, foe, def, store) : beatRival(held, foe, def, store)), def);
  }
  // The town falls: the rival rides in through its gate, over the hero who held it.
  const fallen = lead ? heroFell(back, def) : back;
  return townFalls(fallen, def, town, { ...foe, army: survivors(battle, his, foe.army) });
}

/** The walls of his town left for later (the player's "Not yet" after winning its gate): no fight waits. Night fights can't be put off. */
export function holdOff(adv: Adventure): Adventure {
  const f = adv.rivalFight;
  if (!f || townById(adv, f)?.owner !== 'rival') return adv;
  const { rivalFight: _later, ...rest } = adv;
  return rest;
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
  if (kind === 'overthrow' && def.rival?.mind === 'lord') return lordOverthrown(adv, def);
  const done = kind === 'defeat' ? !!adv.objects.find((o) => o.id === target)?.gone : held() && (kind === 'capture' || !rivalHero(adv));
  return done ? { ...adv, status: 'won' } : adv;
}

/**
 * A lord is overthrown with every town of his taken and he himself beaten
 * (his own hero, the map's rival, whoever leads): his hired captains then
 * leave the field. Beaten while he still holds a town, he hires again there
 * next week.
 */
function lordOverthrown(adv: Adventure, def: MapDef): Adventure {
  const lord = def.rival!.hero;
  if (adv.towns.some((t) => t.owner === 'rival') || rivalHeroes(adv).some((h) => h.id === lord.id)) return adv;
  const captains = rivalHeroes(adv);
  const card: Prompt[] = captains.length ? [{ kind: 'message', title: `${lord.name}'s captains`, text: `With ${lord.name} beaten and his towns taken, ${captains.map((h) => h.name).join(' and ')} lay down ${lord.name}'s banner and ride home.` }] : [];
  return { ...adv, status: 'won', rival: { ...adv.rival!, hero: null, others: [] }, prompts: [...adv.prompts, ...card] };
}

/** Adds a level-up card if the hero has the experience for one and none is waiting. */
export function queueLevelUps(adv: Adventure): Adventure {
  if (adv.prompts.some((p) => p.kind === 'levelUp')) return adv;
  // Each level's offer comes from the map's seed and that level alone (the seed never moves), so a reload deals the same one again.
  const r = nextLevelUp(adv.hero, (adv.seed ^ Math.imul(adv.hero.level + 1, 0x9e3779b1)) >>> 0);
  if (!r) return adv;
  return { ...adv, prompts: [...adv.prompts, { kind: 'levelUp', offer: r.offer }] };
}

/** Answers the first card. `choice` is the chest's 'gold' / 'xp', the skill picked on a level-up, or a dwelling's 'hire' (all the purse and army allow). */
export function answerPrompt(adv: Adventure, choice?: 'gold' | 'xp' | 'hire' | SkillId): Adventure {
  const [first, ...rest] = adv.prompts;
  if (!first) return adv;
  const base = { ...adv, prompts: rest };
  if (first.kind === 'dwelling') {
    const o = adv.objects.find((x) => x.id === first.id);
    if (choice !== 'hire' || !o) return base;
    const r = hireAtDwelling(o, adv.purse, adv.hero.army);
    return { ...base, purse: r.purse, hero: { ...adv.hero, army: r.army }, objects: adv.objects.map((x) => (x.id === o.id ? r.dwelling : x)) };
  }
  if (first.kind === 'chest') {
    if (first.item) return takeChestPiece(base, first.id, first.item);
    const objects = adv.objects.map((o) => (o.id === first.id ? { ...o, gone: true } : o));
    if (choice === 'xp') return queueLevelUps({ ...base, objects, hero: { ...adv.hero, xp: adv.hero.xp + gainedXp(adv.hero, first.xp) } });
    return { ...base, objects, purse: addTo(adv.purse, { gold: first.gold }) };
  }
  if (first.kind === 'levelUp') {
    const skill = choice && choice !== 'gold' && choice !== 'xp' && choice !== 'hire' ? choice : null;
    return queueLevelUps({ ...base, hero: applyLevelUp(adv.hero, first.offer, skill) });
  }
  return base;
}

/** A chest's piece taken: worn or in the bag, or (the bag full) left lying where the chest stood. */
function takeChestPiece(adv: Adventure, chestId: string, id: ItemId): Adventure {
  const chest = adv.objects.find((o) => o.id === chestId);
  if (!chest) return adv;
  const got = gainItem(adv.hero, id);
  const objects = adv.objects.map((o) => (o.id !== chestId ? o : got.kept ? { ...o, gone: true } : lyingItem(o, id)));
  if (got.kept) return { ...adv, hero: got.hero, objects };
  const full: Prompt = { kind: 'message', title: itemDef(id).name, text: `${itemLine(id)}\nThe bag is full, so it lies here on the ground: make room and come back for it.`, item: id };
  return { ...adv, objects, prompts: [full, ...adv.prompts] };
}
