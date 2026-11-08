import { BAG_SIZE, ITEM_IDS, ITEMS, SLOTS, type Gear, type ItemId } from './items';
import type { KeyValueStore } from '@16bitink/game-sdk';
import type { HeroDef, MapDef } from '../level/types';
import { DEFEND, gridOf, MAX_MONSTER, queueLevelUps, RIVAL, type Adventure, type Prompt, type RivalState } from './adventure';
import { ARMY_SLOTS, type Army, type ArmySlot } from './army';
import { BUILDINGS, isBuildingId, type BuildingId } from './buildings';
import { parseDayReport } from './dayReport';
import { canManTower, isCreatureId, lineOf, type CreatureId } from './creatures';
import { dailyMp, levelFor, maxMana, PRIMARIES } from './hero';
import { passable, STABLES_MP } from './map';
import { CHEST_XP, townCore, type MapObject } from './objects';
import { addTo, RESOURCES, type Purse } from './resources';
import { isSkillId, MAX_SKILLS, SKILL_IDS, type Rank } from './skills';
import { isSpellId, type SpellId } from './spells';
import { SPELLBOOK_SOLD, type Town } from './town';

/** What the war machines since cut from the game cost, gold. */
const OLD_MACHINES: Readonly<Record<string, number>> = { ballista: 1500, tent: 750 };
/** Most cards a save may hold waiting. */
const MAX_PROMPTS = 20;
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

export function saveAdventure(store: KeyValueStore | undefined, save: AdventureSave | null): void {
  writeJson(store, ADVENTURE_KEY, save);
}

/** The saved map in play, if there is one and it's sound; `defs` finds its map. */
export function loadAdventure(store: KeyValueStore | undefined, defs: (id: string) => MapDef | undefined): AdventureSave | null {
  const raw = readJson(store, ADVENTURE_KEY);
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
  const kept = prompts.map((x) => parsePrompt(x, objs)).filter((x): x is Prompt => !!x).slice(0, MAX_PROMPTS);
  const rival = parseRival(raw.rival, def);
  if (def.rival && rival === undefined) return null;
  // A fight the rival started waits only while he rides, against our hero or a town of ours.
  const fight = typeof raw.rivalFight === 'string' && rival?.hero && (raw.rivalFight === RIVAL || ts.some((t) => DEFEND + t!.id === raw.rivalFight && t!.owner === 'player')) ? raw.rivalFight : undefined;
  // Level-ups are never read from a save: they're dealt again from the hero's experience.
  return queueLevelUps({
    mapId: def.id, day, seed, purse: refundMachines(hero, p), hero: h, ...(others.length ? { others } : {}), towns: ts as Town[], objects: objs, explored, status, prompts: kept, lostStacks,
    ...(isInt(raw.begun, 2, day) ? { begun: raw.begun } : {}),
    ...(rival ? { rival } : {}), ...(fight ? { rivalFight: fight } : {}),
  });
}

/** Which of the map's heroes a saved hero of ours is (the map's own hero for a save from before there were several). */
function playerHeroDef(raw: Record<string, unknown>, def: MapDef): HeroDef {
  return (def.recruits ?? []).find((r) => r.id === raw.id) ?? def.hero;
}

/** The player's other heroes in a save: each one of the map's, none twice, none on another's tile (null: unreadable). */
function parseOthers(raw: unknown, def: MapDef, picked: Adventure['hero'] | null): Adventure['hero'][] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || !raw.every(isObj)) return null;
  const known = [def.hero, ...(def.recruits ?? [])];
  const out = raw.map((h) => {
    const d = known.find((k) => k.id === (h as Record<string, unknown>).id);
    return d ? parseHero(h as Record<string, unknown>, def, d) : null;
  });
  if (!out.every((h) => !!h)) return null;
  const all = [...(picked ? [picked] : []), ...(out as Adventure['hero'][])];
  if (new Set(all.map((h) => h.id)).size !== all.length || new Set(all.map((h) => `${h.x},${h.y}`)).size !== all.length) return null;
  return out as Adventure['hero'][];
}

/** The rival's saved state on a map with a rival (undefined: unreadable), null hero once beaten. */
function parseRival(raw: unknown, def: MapDef): RivalState | null | undefined {
  if (!def.rival) return null;
  if (!isObj(raw)) return undefined;
  const p = parsePurse(raw.purse);
  if (!p) return undefined;
  if (raw.hero === null) return { hero: null, purse: p };
  const hero = isObj(raw.hero) ? parseHero(raw.hero, def, def.rival.hero) : null;
  return hero ? { hero, purse: p } : undefined;
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
  const hero = {
    id: h.id, name: h.name, heroClass: h.heroClass, x: raw.x, y: raw.y,
    attack: raw.attack as number, defense: raw.defense as number, power: raw.power as number, knowledge: raw.knowledge as number,
    mana: raw.mana, xp: raw.xp, level: Math.min(raw.level, levelFor(raw.xp)), skills, spells: [...new Set(raw.spells)], army, mp: raw.mp, visited: raw.visited as string[],
    ...bookFromFlag(raw, parseGear(raw)),
  };
  return { ...hero, mana: Math.min(hero.mana, maxMana(hero)), mp: Math.min(hero.mp, dailyMp(hero) + MP_BONUS) };
}

/** A hero saved when a spellbook was only a flag has the guild's book now. */
function bookFromFlag(raw: Record<string, unknown>, worn: { gear?: Gear; bag?: ItemId[] }): { gear?: Gear; bag?: ItemId[] } {
  return raw.hasBook === true && !worn.gear?.book ? { ...worn, gear: { ...worn.gear, book: SPELLBOOK_SOLD } } : worn;
}

/** A hero saved with a Ballista or a First Aid Tent gets their price back: both are gone from the game. */
function refundMachines(hero: unknown, p: Purse): Purse {
  const old = isObj(hero) && Array.isArray(hero.machines) ? hero.machines : [];
  return addTo(p, { gold: old.reduce<number>((n, m) => n + (OLD_MACHINES[String(m)] ?? 0), 0) });
}

const isItemId = (x: unknown): x is ItemId => typeof x === 'string' && (ITEM_IDS as readonly string[]).includes(x);

/** A saved hero's gear and bag: a piece only in its own slot, the bag no bigger than it can be (older saves have neither). */
function parseGear(raw: Record<string, unknown>): { gear?: Gear; bag?: ItemId[] } {
  const gear = isObj(raw.gear) ? Object.fromEntries(SLOTS.flatMap((s) => {
    const id = (raw.gear as Record<string, unknown>)[s];
    return isItemId(id) && ITEMS[id].slot === s ? [[s, id]] : [];
  })) as Gear : {};
  const bag = Array.isArray(raw.bag) ? raw.bag.filter(isItemId).slice(0, BAG_SIZE) : [];
  return { ...(Object.keys(gear).length ? { gear } : {}), ...(bag.length ? { bag } : {}) };
}

/** A saved town on the map's town `t` (its place, name and guild come from the map). The first town is always the player's. */
function parseTown(raw: Record<string, unknown>, t: { id: string; name: string; x: number; y: number; built: readonly BuildingId[]; guild: readonly SpellId[] }, first: boolean, def: MapDef): Town | null {
  if (!Array.isArray(raw.built) || !raw.built.every(isBuildingId) || typeof raw.builtToday !== 'boolean' || !isObj(raw.stock)) return null;
  if (!Object.entries(raw.stock).every(([k, v]) => isCreatureId(k) && isInt(v, 0, 1e6))) return null;
  // Any town can change hands; a save from before owners were kept has the first town as the player's.
  const owner = raw.owner === 'player' || raw.owner === 'neutral' || raw.owner === 'rival' ? raw.owner : first ? 'player' : null;
  if (!owner) return null;
  const garrison = parseArmy(raw.garrison);
  if (!garrison) return null;
  const built = buildable(raw.built, t.built, def);
  // Stock is kept by line (every level of a line hires from its base's).
  const lines = new Set(built.map((b) => BUILDINGS[b].dwelling).filter((d): d is CreatureId => !!d).map(lineOf));
  const stock = Object.fromEntries(Object.entries(raw.stock).filter(([k]) => lines.has(k as CreatureId))) as Partial<Record<CreatureId, number>>;
  // Older saves have no towers; a company that can't stand on one comes down with its place lost.
  const up = raw.towers === undefined ? null : parseArmy(raw.towers);
  const towers = up?.some((s) => s && canManTower(s.creature)) ? { towers: up.map((s) => (s && canManTower(s.creature) ? s : null)) } : {};
  return { id: t.id, name: t.name, owner, x: t.x, y: t.y, built, builtToday: raw.builtToday, stock, garrison, ...towers, guild: t.guild, ...(raw.ally === true && owner === 'neutral' ? { ally: true } : {}) };
}

/** The saved buildings the map allows and whose needs are met (the town's starting ones always). */
export function buildable(raw: readonly BuildingId[], start: readonly BuildingId[], def: MapDef): BuildingId[] {
  let kept = new Set<BuildingId>(start);
  const wanted = new Set(raw.filter((b) => !def.off.includes(b)));
  for (let grew = true; grew;) {
    grew = false;
    for (const b of wanted) {
      if (!kept.has(b) && BUILDINGS[b].needs.every((n) => kept.has(n))) {
        kept = new Set([...kept, b]);
        grew = true;
      }
    }
  }
  return [...kept];
}

/** The map's objects with what play changed (owner, gone, count, week) read from the save. */
function parseObjects(raw: readonly unknown[], def: MapDef): MapObject[] | null {
  const byId = new Map(raw.filter(isObj).map((o) => [o.id, o]));
  const out: MapObject[] = [];
  for (const base of def.objects) {
    const s = byId.get(base.id);
    // A monster the map gained after this save was made joins it fresh; anything else missing means a bad save.
    if (!s && base.kind === 'monster') {
      out.push(base);
      continue;
    }
    if (!s) return null;
    const ownable = base.kind === 'mine' || base.kind === 'town';
    const owner = ownable && (s.owner === 'player' || s.owner === 'neutral' || s.owner === 'rival') ? s.owner : base.owner;
    const count = base.kind === 'monster' && isInt(s.count, 1, MAX_MONSTER) ? s.count : base.count;
    const week = (base.kind === 'windmill' || base.kind === 'stables') && isInt(s.week, 1) ? s.week : undefined;
    out.push({ ...base, ...(owner ? { owner } : {}), ...(count !== undefined ? { count } : {}), ...(week !== undefined ? { week } : {}), ...(s.gone === true ? { gone: true } : {}) });
  }
  return out;
}

/** A saved card: messages as text; a chest only for a real, unopened chest, with what that chest holds. */
function parsePrompt(raw: unknown, objects: readonly MapObject[]): Prompt | null {
  if (!isObj(raw)) return null;
  if (raw.kind === 'message' && typeof raw.title === 'string' && typeof raw.text === 'string') {
    const report = parseDayReport(raw.report);
    return { kind: 'message', title: raw.title.slice(0, 200), text: raw.text.slice(0, 2000), ...(isItemId(raw.item) ? { item: raw.item } : {}), ...(report ? { report } : {}) };
  }
  if (raw.kind === 'chest' && typeof raw.id === 'string') {
    const chest = objects.find((o) => o.id === raw.id && o.kind === 'chest' && !o.gone);
    if (!chest) return null;
    const gold = chest.gold ?? 1000;
    return { kind: 'chest', id: chest.id, gold, xp: CHEST_XP[gold] ?? Math.floor(gold / 2) };
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
