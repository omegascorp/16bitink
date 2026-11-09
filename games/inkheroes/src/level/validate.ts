import type { ArmySlot } from '../logic/army';
import { ARMY_SLOTS } from '../logic/army';
import { isBuildingId, type BuildingId } from '../logic/buildings';
import { isCreatureId } from '../logic/creatures';
import { isTownFaction } from '../logic/factions';
import type { HeroClass } from '../logic/hero';
import { fitsSlot, ITEM_IDS, SLOTS, type Gear, type ItemId } from '../logic/items';
import { TILE_CHARS } from '../logic/map';
import { BANK_LOOKS, DWELLING_LOOKS, LAIR_LOOKS, objectFootprint, type BankLook, type DwellingLook, type LairLook, type MapObject, type ObjectKind, type Owner } from '../logic/objects';
import { parseGrid, passable } from '../logic/map';
import { lairDoor } from '../logic/lairs';
import { heroFromDef } from '../logic/adventure';
import { kitGain } from '../logic/lord/kit';
import { partNumber } from './maps';
import { rosterHero } from '../logic/roster';
import { RESOURCES, type Amount, type Resource } from '../logic/resources';
import { isSkillId, type Rank, type Skills } from '../logic/skills';
import { isSpellId, type SpellId } from '../logic/spells';
import { isLineId } from '../narration/lines';
import { CHAPTERS, MAPS } from './maps';
import type { Goal, HeroDef, MapDef } from './types';

/**
 * The full game's maps as the server sends them (untrusted JSON) to
 * MapDefs, or a throw: every field is checked and capped, every id must be
 * one the game knows, so a bad payload can't reach the rules.
 */

const MAX_MAPS = 30;
const MAX_SIDE = 160;
const MAX_OBJECTS = 600;
const MAX_TOWNS = 12;
const MAX_TEXT = 600;
const MAX_COUNT = 4000;
const MAX_GOLD = 1e6;
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HERO_CLASSES: readonly HeroClass[] = ['knight', 'cleric'];
const KINDS: readonly ObjectKind[] = ['mine', 'pile', 'chest', 'campfire', 'mercCamp', 'watchtower', 'standingStone', 'shrine', 'windmill', 'stables', 'spellbook', 'monster', 'item', 'learningStone', 'dwelling', 'bank', 'lair'];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
const id = (v: unknown, what: string): string => {
  if (typeof v !== 'string' || !ID.test(v) || v in Object.prototype) throw new Error(`bad ${what} id`);
  return v;
};
const text = (v: unknown, what: string): string => {
  if (typeof v !== 'string' || v.length === 0 || v.length > MAX_TEXT) throw new Error(`bad ${what}`);
  return v;
};
const isResource = (v: unknown): v is Resource => typeof v === 'string' && (RESOURCES as readonly string[]).includes(v);
const isItemId = (v: unknown): v is ItemId => typeof v === 'string' && (ITEM_IDS as readonly string[]).includes(v);

function list<T>(v: unknown, max: number, what: string, item: (x: unknown) => T): T[] {
  if (!Array.isArray(v) || v.length > max) throw new Error(`bad ${what}`);
  return v.map(item);
}

const ids = <T extends string>(v: unknown, max: number, what: string, ok: (x: unknown) => x is T): T[] =>
  list(v, max, what, (x) => {
    if (!ok(x)) throw new Error(`bad ${what}`);
    return x;
  });

function amount(v: unknown, what: string): Amount {
  if (!isObj(v)) throw new Error(`bad ${what}`);
  const out: Partial<Record<Resource, number>> = {};
  for (const [k, n] of Object.entries(v)) {
    if (!isResource(k) || !int(n, 0, MAX_GOLD)) throw new Error(`bad ${what}`);
    out[k] = n;
  }
  return out;
}

function slot(v: unknown): ArmySlot {
  if (!isObj(v) || !isCreatureId(v.creature) || !int(v.count, 1, MAX_COUNT)) throw new Error('bad army');
  return { creature: v.creature, count: v.count };
}
const army = (v: unknown): ArmySlot[] => list(v, ARMY_SLOTS, 'army', slot);

function gear(v: unknown): Gear {
  if (!isObj(v)) throw new Error('bad gear');
  const out: Partial<Record<(typeof SLOTS)[number], ItemId>> = {};
  for (const [s, item] of Object.entries(v)) {
    const where = SLOTS.find((x) => x === s);
    if (!where || !isItemId(item) || !fitsSlot(item, where)) throw new Error('bad gear');
    out[where] = item;
  }
  return out;
}

function skills(v: unknown): Skills {
  if (!isObj(v)) throw new Error('bad skills');
  const out: Record<string, Rank> = {};
  for (const [k, r] of Object.entries(v)) {
    if (!isSkillId(k) || !int(r, 1, 3)) throw new Error('bad skills');
    out[k] = r as Rank;
  }
  return out as Skills;
}

function hero(v: unknown, g: { w: number; h: number }): HeroDef {
  if (!isObj(v) || typeof v.heroClass !== 'string' || !HERO_CLASSES.includes(v.heroClass as HeroClass)) throw new Error('bad hero');
  const stat = (k: string): number => {
    if (!int(v[k], 0, 99)) throw new Error(`bad hero ${k}`);
    return v[k] as number;
  };
  if (!int(v.x, 0, g.w - 1) || !int(v.y, 0, g.h - 1)) throw new Error('bad hero place');
  if (v.faction !== undefined && !isTownFaction(v.faction)) throw new Error('bad hero people');
  if (v.ankhs !== undefined && !int(v.ankhs, 0, 99)) throw new Error('bad hero ankhs');
  return {
    id: id(v.id, 'hero'), name: text(v.name, 'hero name'), heroClass: v.heroClass as HeroClass, x: v.x, y: v.y,
    attack: stat('attack'), defense: stat('defense'), power: stat('power'), knowledge: stat('knowledge'),
    skills: skills(v.skills), spells: ids<SpellId>(v.spells, 40, 'spells', isSpellId), army: army(v.army),
    ...(v.gear !== undefined ? { gear: gear(v.gear) } : {}),
    ...(v.faction !== undefined ? { faction: v.faction } : {}),
    ...(v.ankhs !== undefined ? { ankhs: v.ankhs as number } : {}),
    ...(v.blurb !== undefined ? { blurb: text(v.blurb, 'blurb') } : {}),
  };
}

function goal(v: unknown): Goal {
  if (!isObj(v) || (v.kind !== 'defeat' && v.kind !== 'capture' && v.kind !== 'overthrow')) throw new Error('bad goal');
  return { kind: v.kind, target: id(v.target, 'goal'), text: text(v.text, 'goal text') };
}

function object(v: unknown, g: { w: number; h: number }): MapObject {
  if (!isObj(v) || typeof v.kind !== 'string' || !KINDS.includes(v.kind as ObjectKind)) throw new Error('bad object');
  if (!int(v.x, 0, g.w - 1) || !int(v.y, 0, g.h - 1)) throw new Error('bad object place');
  const kind = v.kind as ObjectKind;
  const o: Record<string, unknown> = { id: id(v.id, 'object'), kind, x: v.x, y: v.y };
  if (v.resource !== undefined) {
    if (!isResource(v.resource)) throw new Error('bad resource');
    o.resource = v.resource;
  }
  for (const k of ['amount', 'gold'] as const) {
    if (v[k] === undefined) continue;
    if (!int(v[k], 1, MAX_GOLD)) throw new Error(`bad ${k}`);
    o[k] = v[k];
  }
  if (kind === 'monster') {
    if (!isCreatureId(v.creature) || !int(v.count, 1, MAX_COUNT)) throw new Error('bad monster');
    Object.assign(o, { creature: v.creature, count: v.count });
    if (v.brood !== undefined) o.brood = slot(v.brood);
  }
  if (v.drop !== undefined || v.item !== undefined) {
    for (const k of ['drop', 'item'] as const) if (v[k] !== undefined && !isItemId(v[k])) throw new Error(`bad ${k}`);
    Object.assign(o, v.drop !== undefined ? { drop: v.drop } : {}, v.item !== undefined ? { item: v.item } : {});
  }
  if (v.spell !== undefined) {
    if (!isSpellId(v.spell)) throw new Error('bad spell');
    o.spell = v.spell;
  }
  if ((kind === 'shrine' || kind === 'spellbook') && !o.spell) throw new Error(`a ${kind} needs a spell`);
  if (kind === 'spellbook' && !o.item) throw new Error('a spellbook needs its book');
  if ((kind === 'mine' || kind === 'pile') && !o.resource) throw new Error(`a ${kind} needs a resource`);
  if (v.owner !== undefined) {
    if (v.owner !== 'player' && v.owner !== 'neutral' && v.owner !== 'rival') throw new Error('bad owner');
    o.owner = v.owner as Owner;
  }
  if (kind === 'dwelling') {
    if (!isCreatureId(v.creature) || !int(v.growth, 1, 99) || !DWELLING_LOOKS.includes(v.look as DwellingLook)) throw new Error('bad dwelling');
    if (v.stock !== undefined && !int(v.stock, 0, MAX_COUNT)) throw new Error('bad dwelling stock');
    Object.assign(o, { creature: v.creature, growth: v.growth, look: v.look }, v.stock !== undefined ? { stock: v.stock } : {});
  }
  if (kind === 'bank') {
    if (!BANK_LOOKS.includes(v.look as BankLook)) throw new Error('bad keep');
    o.look = v.look;
    if (v.prize !== undefined) o.prize = amount(v.prize, 'prize');
  }
  if (kind === 'lair') {
    if (!isCreatureId(v.creature) || !int(v.count, 1, MAX_COUNT) || !LAIR_LOOKS.includes(v.look as LairLook)) throw new Error('bad lair');
    Object.assign(o, { creature: v.creature, count: v.count, look: v.look });
  }
  if (kind === 'learningStone' && v.visitedBy !== undefined) o.visitedBy = ids<string>(v.visitedBy, 20, 'visited by', (h): h is string => typeof h === 'string' && ID.test(h));
  return o as unknown as MapObject;
}

const LOOK = /^[a-zA-Z][a-zA-Z0-9]{0,31}$/;

function town(v: unknown, g: { w: number; h: number }, other: boolean): MapDef['town'] & { owner?: 'rival' | 'player'; waits?: boolean; race?: boolean; look?: string } {
  if (!isObj(v) || !int(v.x, 1, g.w - 1) || !int(v.y, 1, g.h - 1)) throw new Error('bad town');
  if (v.faction !== undefined && !isTownFaction(v.faction)) throw new Error('bad town people');
  if (other && v.owner !== undefined && v.owner !== 'rival' && v.owner !== 'player') throw new Error('bad town owner');
  if (v.look !== undefined && (typeof v.look !== 'string' || !LOOK.test(v.look) || v.look in Object.prototype)) throw new Error('bad town look');
  if (v.race !== undefined && v.race !== true) throw new Error('bad town race');
  return {
    id: id(v.id, 'town'), name: text(v.name, 'town name'), x: v.x, y: v.y,
    built: ids<BuildingId>(v.built, 60, 'built', isBuildingId), guild: ids<SpellId>(v.guild, 10, 'guild', isSpellId),
    ...(v.garrison !== undefined || other ? { garrison: army(v.garrison ?? []) } : {}),
    ...(v.faction !== undefined ? { faction: v.faction } : {}),
    ...(other && v.owner !== undefined ? { owner: v.owner as 'rival' | 'player' } : {}),
    ...(other && v.waits === true ? { waits: true } : {}),
    ...(other && v.race === true ? { race: true } : {}),
    ...(other && v.look !== undefined ? { look: v.look as string } : {}),
  };
}

/** A map's rival lord: his hero, his build order and his purse. */
function rival(v: unknown, g: { w: number; h: number }): NonNullable<MapDef['rival']> {
  if (!isObj(v)) throw new Error('bad rival');
  if (v.headStart !== undefined && (typeof v.headStart !== 'number' || !(v.headStart >= 0 && v.headStart <= 1))) throw new Error('bad rival head start');
  if (v.heroes !== undefined && (!Number.isInteger(v.heroes) || !((v.heroes as number) >= 1 && (v.heroes as number) <= 8))) throw new Error('bad rival hero count');
  if (v.mind !== undefined && v.mind !== 'lord') throw new Error('bad rival mind');
  return {
    hero: hero(v.hero, g), build: ids<BuildingId>(v.build, 60, 'rival build', isBuildingId), purse: amount(v.purse, 'rival purse'),
    ...(v.headStart !== undefined ? { headStart: v.headStart as number } : {}),
    ...(v.heroes !== undefined ? { heroes: v.heroes as number } : {}),
    ...(v.mind !== undefined ? { mind: 'lord' as const } : {}),
    ...(v.kit !== undefined ? { kit: kit(v.kit) } : {}),
  };
}

/** A lord's kit: what each of his heroes wears from the start, by hero id. */
function kit(v: unknown): Readonly<Record<string, Gear>> {
  if (!isObj(v) || Object.keys(v).length > 12) throw new Error('bad rival kit');
  return Object.fromEntries(Object.entries(v).map(([h, g]) => [id(h, 'kit hero'), gear(g)]));
}

/** How far (tiles) a lair stands from any town at least. */
export const LAIR_TOWN_GAP = 6;

/**
 * What's wrong with `def`'s lairs (src/logic/lairs.ts), if anything: each
 * needs open ground at its door with nothing on it, stands at least
 * LAIR_TOWN_GAP tiles from every town, and none is in a chapter's part 1.
 */
export function lairProblems(def: MapDef): string[] {
  const g = parseGrid(def.rows);
  const towns = [def.town, ...(def.towns ?? [])];
  const covered = new Set(def.objects.filter((o) => o.kind !== 'lair').flatMap((o) => [{ x: o.x, y: o.y }, ...objectFootprint(o)]).map((t) => `${t.x},${t.y}`));
  return def.objects.filter((o) => o.kind === 'lair').flatMap((o) => {
    const out: string[] = [];
    const door = lairDoor(o);
    if (!passable(g, door.x, door.y) || covered.has(`${door.x},${door.y}`)) out.push(`lair ${o.id}: its door (${door.x}, ${door.y}) must be open ground`);
    if (towns.some((t) => Math.max(Math.abs(t.x - o.x), Math.abs(t.y - o.y)) < LAIR_TOWN_GAP)) out.push(`lair ${o.id}: within ${LAIR_TOWN_GAP} tiles of a town`);
    if (partNumber(def) === 1) out.push(`lair ${o.id}: part 1 has no lairs`);
    return out;
  });
}

/** What's wrong with `def`'s lord kit (src/logic/lord/kit.ts), if anything: it may not lower a stat of a hero it names (his own, or the roster's) below 0. */
export function kitProblems(def: MapDef, heroes: readonly HeroDef[] = def.rival ? [def.rival.hero] : []): string[] {
  return Object.entries(def.rival?.kit ?? {}).flatMap(([who, g]) => {
    const h = heroes.find((x) => x.id === who) ?? rosterHero(who);
    if (!h) return [];
    const gain = kitGain(heroFromDef(h), g);
    return (['attack', 'defense', 'power', 'knowledge'] as const).filter((k) => h[k] - gain[k] < 0).map((k) => `kit for ${who}: ${k} would drop below 0`);
  });
}

function map(v: unknown): MapDef {
  if (!isObj(v)) throw new Error('bad map');
  const rows = list(v.rows, MAX_SIDE, 'rows', (r) => {
    if (typeof r !== 'string' || r.length === 0 || r.length > MAX_SIDE || ![...r].every((ch) => Object.hasOwn(TILE_CHARS, ch))) throw new Error('bad row');
    return r;
  });
  const g = { w: rows[0]?.length ?? 0, h: rows.length };
  if (g.h === 0 || rows.some((r) => r.length !== g.w)) throw new Error('bad rows');
  const n = v.n;
  if (!int(n, 1, 99) || !CHAPTERS.some((c) => c.paid && n >= c.first && n <= c.last)) throw new Error('bad part number');
  if (!int(v.parDays, 1, 999) || !int(v.seed, 0, 2 ** 32)) throw new Error('bad map numbers');
  if (v.story !== undefined && !isLineId(v.story)) throw new Error('bad story');
  if (v.won !== undefined && !isLineId(v.won)) throw new Error('bad won line');
  if (v.stormEvery !== undefined && !int(v.stormEvery, 2, 28)) throw new Error('bad storms');
  if (v.opening !== undefined) {
    const o = v.opening;
    if (!isObj(o)) throw new Error('bad opening');
    text(o.text, 'opening');
    if (o.apart !== undefined && o.apart !== true) throw new Error('bad opening');
    list(o.way, 20, 'way', (p) => {
      if (!isObj(p) || !int(p.x, 0, g.w - 1) || !int(p.y, 0, g.h - 1)) throw new Error('bad way');
      return p;
    });
  }
  const out: MapDef = {
    id: id(v.id, 'map'), name: text(v.name, 'map name'), n, brief: text(v.brief, 'brief'),
    ...(v.story !== undefined ? { story: v.story } : {}),
    goal: goal(v.goal), parDays: v.parDays, rows,
    objects: list(v.objects, MAX_OBJECTS, 'objects', (o) => object(o, g)),
    town: town(v.town, g, false),
    ...(v.towns !== undefined ? { towns: list(v.towns, MAX_TOWNS, 'towns', (t) => town(t, g, true) as NonNullable<MapDef['towns']>[number]) } : {}),
    hero: hero(v.hero, g),
    purse: amount(v.purse, 'purse'),
    ...(v.grant !== undefined ? { grant: amount(v.grant, 'grant') } : {}),
    ...(v.opening !== undefined ? { opening: v.opening as MapDef['opening'] } : {}),
    ...(v.recruits !== undefined ? { recruits: list(v.recruits, 8, 'recruits', (h) => hero(h, g)) } : {}),
    ...(v.rival !== undefined ? { rival: rival(v.rival, g) } : {}),
    ...(v.stormEvery !== undefined ? { stormEvery: v.stormEvery as number } : {}),
    ...(v.won !== undefined ? { won: v.won } : {}),
    off: ids<BuildingId>(v.off, 80, 'off', isBuildingId),
    seed: v.seed,
  };
  const problems = [...lairProblems(out), ...kitProblems(out)];
  if (problems.length) throw new Error(problems[0]);
  return out;
}

/** The server's maps, checked: a throw on anything off. Ids must be new (never chapter 1's) and unique. */
export function parseMaps(raw: unknown): MapDef[] {
  const maps = list(raw, MAX_MAPS, 'maps', map);
  const seen = new Set(MAPS.map((m) => m.id));
  for (const m of maps) {
    if (seen.has(m.id)) throw new Error(`map ${m.id} twice`);
    seen.add(m.id);
  }
  return maps;
}
