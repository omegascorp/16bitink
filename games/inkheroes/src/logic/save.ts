import { BAGS, fitsSlot, ITEM_IDS, MAX_BAG, SLOTS, type Gear, type ItemId } from './items';
import type { KeyValueStore } from '@16bitink/game-sdk';
import type { HeroDef, MapDef } from '../level/types';
import { DEFEND, GATE, gridOf, lyingItem, MAX_MONSTER, pickHero, queueLevelUps, RIVAL, townAt, townById, townGuards, type Adventure, type Prompt, type RivalState } from './adventure';
import { ARMY_SLOTS, type Army, type ArmySlot } from './army';
import { BUILDINGS, isBuildingId, type BuildingId } from './buildings';
import { buildingOf, buildsAt } from './factions';
import { parseDayReport } from './dayReport';
import { canManTower, isCreatureId, lineOf, type CreatureId, type TownFaction } from './creatures';
import { dailyMp, levelFor, maxMana, PRIMARIES } from './hero';
import { passable, STABLES_MP } from './map';
import { CHEST_XP, townCore, type MapObject } from './objects';
import { storeRoom } from './storage';
import { chestHoldsPiece, lairOfGroup } from './loot';
import { groupWeek, lairDoor } from './lairs';
import { SPOILS } from './spoils';
import { addTo, RESOURCES, type Purse } from './resources';
import { isSkillId, MAX_SKILLS, SKILL_IDS, type Rank } from './skills';
import { isSpellId, type SpellId } from './spells';
import { dwellings, SPELLBOOK_SOLD, type Town } from './town';
import { isLineId } from '../narration/lines';
import type { LordMemory } from './lord/knowledge';
import { lordRules } from './lord/turn';
import { rosterHero, specialtyOf } from './roster';

/** What the war machines since cut from the game cost, gold. */
const OLD_MACHINES: Readonly<Record<string, number>> = { ballista: 1500, tent: 750 };
/** Most Ankhs a hero or a town's temple may hold in a save. */
const MAX_ANKHS = 999;
/** Most cards a save may hold waiting. */
const MAX_PROMPTS = 20;
/** The latest week a save's town may have beaten its Portal's band in. */
const MAX_WEEK = 1e5;
/** The most a hero can have left today beyond a day's movement (a town's Stables, and one on the road). */
const MP_BONUS = STABLES_MP * 2;

/** Best result on one map. */
export interface MapRecord {
  /** Ink blots earned, 1..3. */
  readonly blots: number;
  /** Fewest days to win it. */
  readonly bestDays: number;
}

/** Saved progress through the campaign, keyed by map id (ids are permanent). */
export interface Progress {
  readonly maps: Readonly<Record<string, MapRecord>>;
}

export const EMPTY_PROGRESS: Progress = { maps: {} };
const PROGRESS_KEY = 'inkheroes.progress.v1';
const ADVENTURE_KEY = 'inkheroes.adventure.v1';
/** Where a chapter's game is saved: chapter 1's where it always was, each later chapter's in a slot of its own. */
export const adventureKey = (slot?: string): string => (slot ? `inkheroes.adventure.${slot}.v1` : ADVENTURE_KEY);
const MAX_MAPS = 200;

/** Blots for a won map: winning, winning within par, and losing no stack. */
export function blotsFor(days: number, parDays: number, lostStacks: number): number {
  return 1 + (days <= parDays ? 1 : 0) + (lostStacks === 0 ? 1 : 0);
}

const isInt = (v: unknown, min = 0, max = 1e9): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const safeId = (id: string): boolean => /^[a-z0-9-]{1,64}$/.test(id) && !(id in Object.prototype);

export function parseProgress(raw: unknown): Progress {
  if (!isObj(raw) || !isObj(raw.maps)) return EMPTY_PROGRESS;
  const kept = Object.entries(raw.maps)
    .filter(([id, r]) => safeId(id) && isObj(r) && isInt(r.blots, 1, 3) && isInt(r.bestDays, 1))
    .slice(0, MAX_MAPS)
    .map(([id, r]) => [id, { blots: (r as MapRecord).blots, bestDays: (r as MapRecord).bestDays }]);
  return { maps: Object.fromEntries(kept) as Record<string, MapRecord> };
}

export function recordWin(p: Progress, id: string, blots: number, days: number): Progress {
  const old = p.maps[id];
  const next = old ? { blots: Math.max(old.blots, blots), bestDays: Math.min(old.bestDays, days) } : { blots, bestDays: days };
  return { maps: { ...p.maps, [id]: next } };
}

/** Two copies combined: every map won on either, with the most blots and fewest days. */
export function mergeProgress(a: Progress, b: Progress): Progress {
  let out = a;
  for (const [id, r] of Object.entries(b.maps)) out = recordWin(out, id, r.blots, r.bestDays);
  return out;
}

/** Whether `a` already holds everything in `b`. */
export function coversProgress(a: Progress, b: Progress): boolean {
  return Object.entries(b.maps).every(([id, r]) => {
    const mine = a.maps[id];
    return !!mine && mine.blots >= r.blots && mine.bestDays <= r.bestDays;
  });
}

export function loadProgress(store: KeyValueStore | undefined): Progress {
  return parseProgress(readJson(store, PROGRESS_KEY));
}

export function saveProgress(store: KeyValueStore | undefined, p: Progress): void {
  writeJson(store, PROGRESS_KEY, p);
}

/** The map in play: as it is now, as it was when today began (a lost battle replays the day), and when this part of the chapter began. */
export interface AdventureSave {
  readonly current: Adventure;
  readonly dayStart: Adventure;
  readonly partStart?: Adventure;
}

/** Saves the game in play (`slot`: its chapter's; none for chapter 1). */
export function saveAdventure(store: KeyValueStore | undefined, save: AdventureSave | null, slot?: string): void {
  writeJson(store, adventureKey(slot), save);
}

/** The saved map in play, if there is one and it's sound; `defs` finds its map. */
export function loadAdventure(store: KeyValueStore | undefined, defs: (id: string) => MapDef | undefined, slot?: string): AdventureSave | null {
  const raw = readJson(store, adventureKey(slot));
  if (!isObj(raw)) return null;
  const id = isObj(raw.current) ? raw.current.mapId : null;
  const def = typeof id === 'string' ? defs(id) : undefined;
  if (!def) return null;
  const current = parseAdventure(raw.current, def);
  const dayStart = parseAdventure(raw.dayStart, def);
  const partStart = raw.partStart === undefined ? null : parseAdventure(raw.partStart, def);
  return current && dayStart ? { current, dayStart, ...(partStart ? { partStart } : {}) } : null;
}

/**
 * Untrusted saved data to an adventure on `def`, or null if anything is off.
 * The map's fixed parts (where things are, what they are) come from `def`;
 * only what play changes is read from the save.
 */
export function parseAdventure(raw: unknown, def: MapDef): Adventure | null {
  if (!isObj(raw) || raw.mapId !== def.id) return null;
  const g = gridOf(def);
  const { day, seed, purse, hero, objects, explored, status, prompts, lostStacks } = raw;
  // Saves from before a map could hold several towns keep the one as `town`.
  const towns = Array.isArray(raw.towns) ? raw.towns : [raw.town];
  if (!isInt(day, 1, 100000) || !isInt(seed, 0, 2 ** 32) || !isInt(lostStacks, 0, 10000)) return null;
  if (status !== 'playing' && status !== 'won' && status !== 'lost') return null;
  if (typeof explored !== 'string' || explored.length !== g.w * g.h || !/^[01]*$/.test(explored)) return null;
  const p = parsePurse(purse);
  const specs = [def.town, ...(def.towns ?? [])];
  if (!p || !isObj(hero) || towns.length !== specs.length || !towns.every(isObj) || !Array.isArray(objects) || !Array.isArray(prompts)) return null;
  const h = parseHero(hero, def, playerHeroDef(hero, def));
  const others = parseOthers(raw.others, def, h);
  const ts = towns.map((t, i) => parseTown(t as Record<string, unknown>, specs[i]!, i === 0, def));
  const objs = parseObjects(objects, def);
  if (!h || !others || !ts.every((t) => !!t) || !objs) return null;
  for (const one of [h, ...others]) {
    if (!passable(g, one.x, one.y)) return null;
    // Not inside a town's walls (its gate is fine), nor on a monster.
    if (ts.some((t) => townCore(t!.x, t!.y).some((f) => f.x === one.x && f.y === one.y))) return null;
    if (objs.some((o) => o.kind === 'monster' && !o.gone && o.x === one.x && o.y === one.y)) return null;
  }
  const kept = prompts.map((x) => parsePrompt(x, objs, def)).filter((x): x is Prompt => !!x).slice(0, MAX_PROMPTS);
  const rival = parseRival(raw.rival, def);
  if (def.rival && rival === undefined) return null;
  // A fight waits only while he rides: one he started against our hero or a town of ours, or the walls of his town after we won its gate.
  const waits = (f: string): boolean => f === RIVAL || ts.some((t) => (DEFEND + t!.id === f && t!.owner === 'player') || GATE + t!.id === f || (t!.id === f && t!.owner === 'rival'));
  const fight = typeof raw.rivalFight === 'string' && rival?.hero && waits(raw.rivalFight) ? raw.rivalFight : undefined;
  // Level-ups are never read from a save: they're dealt again from the hero's experience.
  return upgradeFight(queueLevelUps({
    mapId: def.id, day, seed, purse: refundMachines(hero, p), hero: h, ...(others.length ? { others } : {}), towns: ts as Town[], objects: objs, explored, status, prompts: kept, lostStacks,
    ...(isInt(raw.begun, 2, day) ? { begun: raw.begun } : {}),
    ...(rival ? { rival } : {}), ...(fight ? { rivalFight: fight } : {}),
  }));
}

/**
 * A night fight saved before a town's gate was fought first: the rival
 * storming a town of ours with a hero of ours at its gate (saved as the
 * walls, or as that hero met "in the field") is that gate fight now.
 */
function upgradeFight(adv: Adventure): Adventure {
  const f = adv.rivalFight;
  if (!f || f.startsWith(GATE)) return adv;
  const town = f.startsWith(DEFEND) ? townById(adv, f.slice(DEFEND.length)) : f === RIVAL ? townAt(adv, adv.hero.x, adv.hero.y) : undefined;
  if (!town || town.owner !== 'player') return adv;
  const { gate } = townGuards(adv, town);
  return gate ? { ...pickHero(adv, gate.id), rivalFight: GATE + town.id } : adv;
}

/** Which of the map's heroes a saved hero of ours is (the map's own hero for a save from before there were several). */
function playerHeroDef(raw: Record<string, unknown>, def: MapDef): HeroDef {
  return heroDefFor(raw, def, def.hero);
}

const HERO_ID = /^[A-Za-z0-9_-]{1,40}$/;
const isClass = (v: unknown): v is HeroDef['heroClass'] => v === 'knight' || v === 'cleric';
const isPeople = (v: unknown): v is TownFaction => v === 'crown' || v === 'kemet';

/**
 * Which hero a saved one is, by id: one the map names (its hero, recruits or
 * rival), else the roster's (a Tavern's hire, ours or a lord's, among them
 * the old LORD_RECRUITS ids), else one nobody knows any more, who still
 * loads under their saved name and class. No id at all: `fallback`.
 */
function heroDefFor(raw: Record<string, unknown>, def: MapDef, fallback: HeroDef): HeroDef {
  const id = raw.id;
  if (typeof id !== 'string' || !HERO_ID.test(id)) return fallback;
  const named = [def.hero, ...(def.recruits ?? []), ...(def.rival ? [def.rival.hero, ...(lordRules(def).recruits ?? [])] : [])];
  const known = named.find((h) => h.id === id) ?? rosterHero(id);
  if (known) return known;
  const name = typeof raw.name === 'string' && raw.name.trim().length > 0 && raw.name.length <= 24 ? raw.name.trim() : id;
  return {
    id, name, heroClass: isClass(raw.heroClass) ? raw.heroClass : 'knight', x: 0, y: 0, attack: 0, defense: 0, power: 0, knowledge: 0, skills: {}, spells: [], army: [],
    ...(isPeople(raw.faction) && raw.faction !== 'crown' ? { faction: raw.faction } : {}),
  };
}

/** The player's other heroes in a save: each one of the map's, none twice, none on another's tile (null: unreadable). */
function parseOthers(raw: unknown, def: MapDef, picked: Adventure['hero'] | null): Adventure['hero'][] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || !raw.every(isObj)) return null;
  const out = raw.map((h) => {
    const r = h as Record<string, unknown>;
    return typeof r.id === 'string' ? parseHero(r, def, heroDefFor(r, def, def.hero)) : null;
  });
  if (!out.every((h) => !!h)) return null;
  const all = [...(picked ? [picked] : []), ...(out as Adventure['hero'][])];
  if (new Set(all.map((h) => h.id)).size !== all.length) return null;
  // Two may share a tile only in a town's two places: one in its garrison (no companies of their own), one in its gate.
  const at = (h: Adventure['hero']): string => `${h.x},${h.y}`;
  for (const tile of new Set(all.map(at))) {
    const here = all.filter((h) => at(h) === tile);
    if (here.length === 1) continue;
    const town = def.town.x + ',' + def.town.y === tile || (def.towns ?? []).some((t) => `${t.x},${t.y}` === tile);
    if (!town || here.length > 2 || here.filter((h) => h.army.every((s) => !s)).length !== 1) return null;
  }
  return out as Adventure['hero'][];
}

/** The rival's saved state on a map with a rival (undefined: unreadable), null hero once beaten. */
function parseRival(raw: unknown, def: MapDef): RivalState | null | undefined {
  if (!def.rival) return null;
  if (!isObj(raw)) return undefined;
  const p = parsePurse(raw.purse);
  if (!p) return undefined;
  // A lord's (src/logic/lord): his other heroes, his fog and his memory; a save from before them has none.
  const lord = parseLord(raw, def);
  if (!lord) return undefined;
  if (raw.hero === null) return { hero: null, purse: p, ...lord };
  const hero = isObj(raw.hero) ? parseHero(raw.hero, def, lordHeroDef(raw.hero, def)) : null;
  return hero ? { hero, purse: p, ...lord } : undefined;
}

/** Which of the lord's heroes a saved one is: the map's rival, or one his Taverns hired. */
const lordHeroDef = (raw: Record<string, unknown>, def: MapDef): HeroDef => heroDefFor(raw, def, def.rival!.hero);

/** A lord's other heroes, fog and memory in a save (null: unreadable). */
function parseLord(raw: Record<string, unknown>, def: MapDef): Pick<RivalState, 'others' | 'explored' | 'memory' | 'fallen' | 'homeless'> | null {
  const g = gridOf(def);
  const out: { others?: Adventure['hero'][]; explored?: string; memory?: LordMemory; fallen?: { hero: Adventure['hero']; day: number }[]; homeless?: number } = {};
  if (raw.others !== undefined) {
    if (!Array.isArray(raw.others) || !raw.others.every(isObj)) return null;
    const others = raw.others.map((h) => parseHero(h as Record<string, unknown>, def, lordHeroDef(h as Record<string, unknown>, def)));
    if (!others.every((h) => !!h) || others.length > 10) return null;
    out.others = others as Adventure['hero'][];
  }
  if (raw.explored !== undefined) {
    if (typeof raw.explored !== 'string' || raw.explored.length !== g.w * g.h || !/^[01]*$/.test(raw.explored)) return null;
    out.explored = raw.explored;
  }
  if (isObj(raw.memory)) out.memory = parseMemory(raw.memory);
  if (isInt(raw.homeless, 1)) out.homeless = raw.homeless;
  if (raw.fallen !== undefined) {
    if (!Array.isArray(raw.fallen) || raw.fallen.length > 10) return null;
    const fallen = raw.fallen.map((f) => (isObj(f) && isObj(f.hero) && isInt(f.day, 1) ? { hero: parseHero(f.hero, def, lordHeroDef(f.hero, def)), day: f.day as number } : null));
    if (!fallen.every((f) => f?.hero)) return null;
    out.fallen = fallen as { hero: Adventure['hero']; day: number }[];
  }
  return out;
}

/** A lord's memory: what can't be read is forgotten, never fatal. */
function parseMemory(raw: Record<string, unknown>): LordMemory {
  const foes = isObj(raw.foes)
    ? Object.fromEntries(Object.entries(raw.foes).filter(([, v]) => isObj(v) && ['x', 'y', 'day'].every((k) => isInt((v as Record<string, unknown>)[k], 0)) && typeof v.strength === 'number' && v.strength >= 0))
    : {};
  const goals = isObj(raw.goals) ? Object.fromEntries(Object.entries(raw.goals).filter(([, v]) => isObj(v) && isInt(v.x, 0) && isInt(v.y, 0))) : undefined;
  return { foes: foes as LordMemory['foes'], savings: isInt(raw.savings, 0) ? raw.savings : 0, ...(typeof raw.main === 'string' ? { main: raw.main } : {}), ...(goals ? { goals: goals as LordMemory['goals'] } : {}) };
}

function parsePurse(raw: unknown): Purse | null {
  if (!isObj(raw)) return null;
  const out: Record<string, number> = {};
  for (const r of RESOURCES) {
    if (!isInt(raw[r], 0)) return null;
    out[r] = raw[r] as number;
  }
  return out as unknown as Purse;
}

export function parseArmy(raw: unknown): Army | null {
  if (!Array.isArray(raw) || raw.length !== ARMY_SLOTS) return null;
  const out: (ArmySlot | null)[] = [];
  for (const s of raw) {
    if (s === null) out.push(null);
    else if (isObj(s) && isCreatureId(s.creature) && isInt(s.count, 1, 1e6)) out.push({ creature: s.creature, count: s.count });
    else return null;
  }
  return out;
}

function parseHero(raw: Record<string, unknown>, def: MapDef, h: HeroDef = def.hero): Adventure['hero'] | null {
  const g = gridOf(def);
  if (!isInt(raw.x, 0, g.w - 1) || !isInt(raw.y, 0, g.h - 1)) return null;
  if (!PRIMARIES.every((k) => isInt(raw[k], 0, 999)) || !isInt(raw.mana, 0, 99999) || !isInt(raw.xp, 0) || !isInt(raw.level, 1, 999) || !isInt(raw.mp, 0, 99999)) return null;
  if (!isObj(raw.skills) || !Object.entries(raw.skills).every(([k, v]) => isSkillId(k) && isInt(v, 1, 3))) return null;
  if (Object.keys(raw.skills).length > MAX_SKILLS) return null;
  if (!Array.isArray(raw.spells) || !raw.spells.every(isSpellId)) return null;
  if (!Array.isArray(raw.visited) || !raw.visited.every((v) => typeof v === 'string' && def.objects.some((o) => o.id === v))) return null;
  const army = parseArmy(raw.army);
  if (!army) return null;
  const skills = Object.fromEntries(SKILL_IDS.filter((k) => (raw.skills as Record<string, unknown>)[k]).map((k) => [k, (raw.skills as Record<string, Rank>)[k]]));
  // Their people come from the map; Ankhs from the save (a save from before Egypt has none).
  const ankhs = isInt(raw.ankhs, 1, MAX_ANKHS) ? raw.ankhs : 0;
  // A Mead Hall's morale, still to spend in their next battle.
  const mead = isInt(raw.mead, 1, 3) ? raw.mead : 0;
  const hero = {
    id: h.id, name: h.name, heroClass: h.heroClass, x: raw.x, y: raw.y, ...(h.faction ? { faction: h.faction } : {}), ...(ankhs ? { ankhs } : {}), ...(mead ? { mead } : {}),
    attack: raw.attack as number, defense: raw.defense as number, power: raw.power as number, knowledge: raw.knowledge as number,
    mana: raw.mana, xp: raw.xp, level: Math.min(raw.level, levelFor(raw.xp)), skills, spells: [...new Set(raw.spells)], army, mp: raw.mp, visited: raw.visited as string[],
    ...bookFromFlag(raw, parseGear(raw)),
  };
  // The specialty is the roster's for their id, never the save's (an old save's heroes get theirs).
  const specialty = specialtyOf(h);
  return { ...hero, ...(specialty ? { specialty } : {}), mana: Math.min(hero.mana, maxMana(hero)), mp: Math.min(hero.mp, dailyMp(hero) + MP_BONUS) };
}

/** A hero saved when a spellbook was only a flag has the guild's book now. */
function bookFromFlag<W extends { gear?: Gear }>(raw: Record<string, unknown>, worn: W): W {
  return raw.hasBook === true && !worn.gear?.book ? { ...worn, gear: { ...worn.gear, book: SPELLBOOK_SOLD } } : worn;
}

/** A hero saved with a Ballista or a First Aid Tent gets their price back: both are gone from the game. */
function refundMachines(hero: unknown, p: Purse): Purse {
  const old = isObj(hero) && Array.isArray(hero.machines) ? hero.machines : [];
  return addTo(p, { gold: old.reduce<number>((n, m) => n + (OLD_MACHINES[String(m)] ?? 0), 0) });
}

const isItemId = (x: unknown): x is ItemId => typeof x === 'string' && (ITEM_IDS as readonly string[]).includes(x);

/**
 * A saved hero's gear, bag and the bag they carry it in: a piece only in its
 * own slot, the bag no bigger than the biggest. Older saves have none of it,
 * and saves from when every bag held 20 get a bag big enough for what they
 * carried, so nothing is lost.
 */
function parseGear(raw: Record<string, unknown>): { gear?: Gear; bag?: ItemId[]; pack?: number } {
  const gear = isObj(raw.gear) ? Object.fromEntries(SLOTS.flatMap((s) => {
    const id = (raw.gear as Record<string, unknown>)[s];
    return isItemId(id) && fitsSlot(id, s) ? [[s, id]] : [];
  })) as Gear : {};
  const bag = Array.isArray(raw.bag) ? raw.bag.filter(isItemId).slice(0, MAX_BAG) : [];
  const saved = isInt(raw.pack, 0, BAGS.length - 1) ? raw.pack : 0;
  const pack = Math.max(saved, BAGS.findIndex((b) => b.size >= bag.length));
  return { ...(Object.keys(gear).length ? { gear } : {}), ...(bag.length ? { bag } : {}), ...(pack ? { pack } : {}) };
}

/** A saved town on the map's town `t` (its place, name, guild and people come from the map: a town from before Egypt is Greek). The first town is always the player's. */
function parseTown(raw: Record<string, unknown>, t: { id: string; name: string; x: number; y: number; built: readonly BuildingId[]; guild: readonly SpellId[]; faction?: TownFaction }, first: boolean, def: MapDef): Town | null {
  if (!Array.isArray(raw.built) || !raw.built.every(isBuildingId) || typeof raw.builtToday !== 'boolean' || !isObj(raw.stock)) return null;
  if (!Object.entries(raw.stock).every(([k, v]) => isCreatureId(k) && isInt(v, 0, 1e6))) return null;
  // Any town can change hands; a save from before owners were kept has the first town as the player's.
  const owner = raw.owner === 'player' || raw.owner === 'neutral' || raw.owner === 'rival' ? raw.owner : first ? 'player' : null;
  if (!owner) return null;
  const garrison = parseArmy(raw.garrison);
  if (!garrison) return null;
  const people = t.faction ? { faction: t.faction } : {};
  const built = buildable(raw.built, t.built, def, t.faction);
  // Stock is kept by line (every level of a line hires from its base's), the town's people's own.
  const lines = new Set(dwellings({ built, ...people }).map(lineOf));
  const stock = Object.fromEntries(Object.entries(raw.stock).filter(([k]) => lines.has(k as CreatureId))) as Partial<Record<CreatureId, number>>;
  // Older saves have no towers; a company that can't stand on one comes down with its place lost.
  const up = raw.towers === undefined ? null : parseArmy(raw.towers);
  const towers = up?.some((s) => s && canManTower(s.creature)) ? { towers: up.map((s) => (s && canManTower(s.creature) ? s : null)) } : {};
  // Gear in its store, no more than its store keeps.
  const store = Array.isArray(raw.store) ? raw.store.filter(isItemId).slice(0, storeRoom({ built })) : [];
  const ankhs = isInt(raw.ankhs, 1, MAX_ANKHS) ? { ankhs: raw.ankhs } : {};
  // The week its Summoning Portal's band was beaten (saves from before the Portal have none).
  const mob = isInt(raw.mobBeaten, 1, MAX_WEEK) ? { mobBeaten: raw.mobBeaten } : {};
  return { id: t.id, name: t.name, owner, x: t.x, y: t.y, built, builtToday: raw.builtToday, stock, garrison, ...towers, guild: t.guild, ...people, ...ankhs, ...mob, ...(raw.ally === true && owner === 'neutral' ? { ally: true } : {}), ...(store.length ? { store } : {}) };
}

/** The saved buildings the map allows, the town's people build, and whose needs are met (the town's starting ones always). */
export function buildable(raw: readonly BuildingId[], start: readonly BuildingId[], def: MapDef, faction: TownFaction = 'crown'): BuildingId[] {
  let kept = new Set<BuildingId>(start);
  const wanted = new Set(raw.filter((b) => !def.off.includes(b) && buildsAt(faction, b)));
  for (let grew = true; grew;) {
    grew = false;
    for (const b of wanted) {
      if (!kept.has(b) && buildingOf(faction, b).needs.every((n) => kept.has(n))) {
        kept = new Set([...kept, b]);
        grew = true;
      }
    }
  }
  return [...kept];
}

/** Objects a save made before the map had them takes in fresh: monsters, and the training sites rarity brought (Nov 2026). */
const JOINS_FRESH: readonly MapObject['kind'][] = ['monster', 'arena', 'sanctum'];
/** Sites that keep the week they were last used. */
const WEEKLY: readonly MapObject['kind'][] = ['windmill', 'stables', 'lair', 'arena', 'sanctum'];

/** The map's objects with what play changed (owner, gone, count, week) read from the save. */
function parseObjects(raw: readonly unknown[], def: MapDef): MapObject[] | null {
  const byId = new Map(raw.filter(isObj).map((o) => [o.id, o]));
  const out: MapObject[] = [];
  for (const base of def.objects) {
    const s = byId.get(base.id);
    // A monster (or a training site) the map gained after this save was made joins it fresh; anything else missing means a bad save.
    if (!s && JOINS_FRESH.includes(base.kind)) {
      out.push(base);
      continue;
    }
    if (!s) return null;
    // A beaten monster's piece (or a chest's) left lying on the ground.
    if ((base.kind === 'monster' || base.kind === 'chest') && s.kind === 'item' && isItemId(s.item)) {
      out.push(lyingItem(base, s.item));
      continue;
    }
    const ownable = base.kind === 'mine' || base.kind === 'town' || base.kind === 'dwelling';
    const owner = ownable && (s.owner === 'player' || s.owner === 'neutral' || s.owner === 'rival') ? s.owner : base.owner;
    const count = base.kind === 'monster' && isInt(s.count, 1, MAX_MONSTER) ? s.count : base.count;
    const week = WEEKLY.includes(base.kind) && isInt(s.week, 1) ? s.week : undefined;
    out.push({ ...base, ...(owner ? { owner } : {}), ...(count !== undefined ? { count } : {}), ...(week !== undefined ? { week } : {}), ...siteState(base, s), ...(s.gone === true ? { gone: true } : {}) });
  }
  return [...out, ...grownObjects(raw, def)];
}

/** Most objects play may add to a map (lairs' groups, gear lying on the ground). */
const MAX_GROWN = 200;

/**
 * What play added to the map, read back: a lair's group standing at its
 * door (where it stands and who it is come from the lair), a piece one left
 * lying there, and a beaten rival's pieces left on open ground. A beaten
 * group is gone for good and isn't kept.
 */
function grownObjects(raw: readonly unknown[], def: MapDef): MapObject[] {
  const g = gridOf(def);
  const out: MapObject[] = [];
  const seen = new Set(def.objects.map((o) => o.id));
  for (const s of raw.filter(isObj)) {
    if (out.length >= MAX_GROWN || typeof s.id !== 'string' || s.id.length > 80 || seen.has(s.id) || s.gone === true) continue;
    const lair = def.objects.find((o) => o.kind === 'lair' && o.id === lairOfGroup(s.id as string));
    if (lair && groupWeek(s.id)) {
      const door = lairDoor(lair);
      if (s.kind === 'monster' && isInt(s.count, 1, MAX_MONSTER)) out.push({ id: s.id, kind: 'monster', ...door, creature: lair.creature!, count: s.count });
      else if (s.kind === 'item' && isItemId(s.item)) out.push(lyingItem({ id: s.id, ...door }, s.item));
      else continue;
    } else if (SPOILS.test(s.id) && s.kind === 'item' && isItemId(s.item) && isInt(s.x, 0, g.w - 1) && isInt(s.y, 0, g.h - 1) && passable(g, s.x, s.y)) {
      out.push({ id: s.id, kind: 'item', x: s.x, y: s.y, item: s.item });
    } else continue;
    seen.add(s.id);
  }
  return out;
}

/** What play changed at Othrys's new sites: a dwelling's stock, who read a learning stone, a keep emptied. */
function siteState(base: MapObject, s: Record<string, unknown>): Partial<MapObject> {
  if (base.kind === 'dwelling') return isInt(s.stock, 0, MAX_MONSTER) ? { stock: s.stock } : {};
  if (base.kind === 'learningStone') {
    const by = Array.isArray(s.visitedBy) ? s.visitedBy.filter((h): h is string => typeof h === 'string').slice(0, 20) : [];
    return by.length ? { visitedBy: [...new Set(by)] } : {};
  }
  if (base.kind === 'bank') return { ...(s.looted === true ? { looted: true } : {}), ...(isObj(s.prize) && Object.keys(s.prize).length === 0 ? { prize: {} } : {}) };
  if (base.kind === 'lair') return isInt(s.since, 1) ? { since: s.since } : {};
  return {};
}

/** A saved card: messages as text; a chest only for a real, unopened chest, with what that chest holds. */
function parsePrompt(raw: unknown, objects: readonly MapObject[], def: MapDef): Prompt | null {
  if (!isObj(raw)) return null;
  if (raw.kind === 'message' && typeof raw.title === 'string' && typeof raw.text === 'string') {
    const report = parseDayReport(raw.report);
    // A line the game no longer has is dropped: the card shows its words.
    const told = isLineId(raw.line) ? { line: raw.line, ...(typeof raw.brief === 'string' ? { brief: raw.brief.slice(0, 1000) } : {}) } : {};
    return { kind: 'message', title: raw.title.slice(0, 200), text: raw.text.slice(0, 2000), ...(isItemId(raw.item) ? { item: raw.item } : {}), ...(report ? { report } : {}), ...told };
  }
  if (raw.kind === 'chest' && typeof raw.id === 'string') {
    const chest = objects.find((o) => o.id === raw.id && o.kind === 'chest' && !o.gone);
    if (!chest) return null;
    const gold = chest.gold ?? 1000;
    // Its piece, for a chest that holds one (the roll's own, as it was dealt).
    const item = chestHoldsPiece(def, chest) && isItemId(raw.item) ? { item: raw.item } : {};
    return { kind: 'chest', id: chest.id, gold, xp: CHEST_XP[gold] ?? Math.floor(gold / 2), ...item };
  }
  if (raw.kind === 'train' && typeof raw.id === 'string') {
    const site = objects.find((o) => o.id === raw.id && (o.kind === 'arena' || o.kind === 'sanctum') && !o.gone);
    return site ? { kind: 'train', id: site.id } : null;
  }
  if (raw.kind === 'dwelling' && typeof raw.id === 'string') {
    const home = objects.find((o) => o.id === raw.id && o.kind === 'dwelling' && !o.gone);
    if (!home) return null;
    return { kind: 'dwelling', id: home.id, ...(typeof raw.text === 'string' ? { text: raw.text.slice(0, 500) } : {}) };
  }
  return null;
}

function readJson(store: KeyValueStore | undefined, key: string): unknown {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeJson(store: KeyValueStore | undefined, key: string, value: unknown): void {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[inkheroes] could not save', err);
  }
}
