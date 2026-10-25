import { BOSS_ENTRIES, CHAPTER_HINTS, ENEMY_ENTRIES } from '../logic/chapters/index';
import { isPreyKind } from '../logic/prey';
import { SNAKES, type SnakeId } from '../logic/species';
import type { Pt } from '../logic/vec';
import { CHAPTER_1 } from './chapter1';
import { BOARD, TEACH, ZONE_KINDS, type BossDef, type CoverDef, type EnemyDef, type GoalDef, type LevelDef, type PreyDef, type SolidDef, type Teach, type ZoneDef, type ZoneKind } from './types';

/** Caps on what the server may send. */
const MAX_CHAPTERS = 20;
const MAX_LEVELS = 20;
const MAX_THINGS = 40;
const MAX_PREY = 12;
const MAX_ENEMIES = 6;
const MAX_LENGTH = 2400;
const LOOK = /^[a-z][a-z0-9-]{0,23}$/;
const MAX_POINTS = 64;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const str = (v: unknown, re: RegExp): v is string => typeof v === 'string' && re.test(v);
const oneOf = <T extends string>(v: unknown, list: readonly T[]): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);
/** A kind registered in `registry` (an own key, never Object.prototype's). */
const known = (v: unknown, registry: Readonly<Record<string, unknown>>): v is string => typeof v === 'string' && Object.prototype.hasOwnProperty.call(registry, v);

function list<T>(v: unknown, max: number, what: string, item: (x: unknown) => T): T[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || v.length > max) throw new Error(`bad ${what}`);
  return v.map(item);
}

function point(v: unknown): Pt {
  if (!isObj(v) || !num(v.x, 0, BOARD.w) || !num(v.y, 0, BOARD.h)) throw new Error('bad point');
  return { x: v.x, y: v.y };
}

function solid(v: unknown): SolidDef {
  if (!isObj(v) || !str(v.look, LOOK)) throw new Error('bad solid');
  if (v.kind === 'circle' && num(v.x, 0, BOARD.w) && num(v.y, 0, BOARD.h) && num(v.r, 4, 200)) return { kind: 'circle', look: v.look, x: v.x, y: v.y, r: v.r };
  if (v.kind === 'rect' && num(v.x, -50, BOARD.w) && num(v.y, -50, BOARD.h) && num(v.w, 4, BOARD.w) && num(v.h, 4, BOARD.h)) return { kind: 'rect', look: v.look, x: v.x, y: v.y, w: v.w, h: v.h };
  throw new Error('bad solid');
}

function cover(v: unknown): CoverDef {
  if (!isObj(v) || !str(v.look, LOOK) || !num(v.x, 0, BOARD.w) || !num(v.y, 0, BOARD.h) || !num(v.r, 20, 240)) throw new Error('bad cover');
  return { look: v.look, x: v.x, y: v.y, r: v.r };
}

function zone(v: unknown): ZoneDef {
  if (!isObj(v) || !oneOf<ZoneKind>(v.kind, ZONE_KINDS)) throw new Error('bad zone');
  if (v.look !== undefined && !str(v.look, LOOK)) throw new Error('bad zone look');
  const base = { kind: v.kind, ...(v.look !== undefined ? { look: v.look as string } : {}) };
  if (v.shape === 'circle' && num(v.x, -200, BOARD.w + 200) && num(v.y, -200, BOARD.h + 200) && num(v.r, 4, 1200)) return { ...base, shape: 'circle', x: v.x, y: v.y, r: v.r };
  if (v.shape === 'rect' && num(v.x, -200, BOARD.w + 200) && num(v.y, -200, BOARD.h + 200) && num(v.w, 4, BOARD.w + 400) && num(v.h, 4, BOARD.h + 400)) return { ...base, shape: 'rect', x: v.x, y: v.y, w: v.w, h: v.h };
  if (v.shape === 'poly' && Array.isArray(v.points) && v.points.length >= 3 && v.points.length <= MAX_POINTS) {
    return { ...base, shape: 'poly', points: v.points.map((q) => {
      if (!isObj(q) || !num(q.x, -200, BOARD.w + 200) || !num(q.y, -200, BOARD.h + 200)) throw new Error('bad zone point');
      return { x: q.x, y: q.y };
    }) };
  }
  throw new Error('bad zone');
}

function prey(v: unknown): PreyDef {
  if (!isObj(v) || !isPreyKind(v.kind) || !num(v.count, 1, 12) || !Number.isInteger(v.count)) throw new Error('bad prey');
  return { kind: v.kind, count: v.count };
}

function enemy(v: unknown): EnemyDef {
  if (!isObj(v) || !known(v.kind, ENEMY_ENTRIES)) throw new Error('bad enemy');
  if (v.count !== undefined && (!num(v.count, 1, 4) || !Number.isInteger(v.count))) throw new Error('bad enemy count');
  if (v.from !== undefined && !num(v.from, 0, 120)) throw new Error('bad enemy arrival');
  return { kind: v.kind, ...(v.count !== undefined ? { count: v.count as number } : {}), ...(v.from !== undefined ? { from: v.from as number } : {}) };
}

function goal(v: unknown): GoalDef | undefined {
  if (v === undefined) return undefined;
  if (!isObj(v)) throw new Error('bad goal');
  if (v.kind === 'rush' && num(v.seconds, 20, 300)) return { kind: 'rush', seconds: v.seconds };
  if (v.kind === 'feast' && isPreyKind(v.food) && num(v.count, 1, 30) && Number.isInteger(v.count)) return { kind: 'feast', food: v.food, count: v.count };
  if (v.kind === 'boss') return { kind: 'boss' };
  throw new Error('bad goal');
}

function boss(v: unknown): BossDef | undefined {
  if (v === undefined) return undefined;
  if (!isObj(v) || !known(v.kind, BOSS_ENTRIES) || !num(v.hp, 1, 10) || !Number.isInteger(v.hp)) throw new Error('bad boss');
  return { kind: v.kind, hp: v.hp };
}

/** One level from untrusted JSON: every field checked, anything unknown dropped. Throws on anything wrong. */
export function parseLevel(v: unknown): LevelDef {
  if (!isObj(v) || !str(v.id, /^[a-z0-9-]{1,64}$/) || typeof v.name !== 'string' || v.name.length < 1 || v.name.length > 40) throw new Error('bad level');
  if (!oneOf<SnakeId>(v.snake, SNAKES)) throw new Error('bad snake');
  if (!num(v.heading, -7, 7) || !num(v.length, 60, MAX_LENGTH) || !num(v.target, 60, MAX_LENGTH) || !num(v.par, 10, 900)) throw new Error('bad numbers');
  if (v.target <= v.length) throw new Error('target not past start');
  const preyList = list(v.prey, MAX_PREY, 'prey', prey);
  if (!preyList?.length) throw new Error('no prey');
  const g = goal(v.goal);
  const b = boss(v.boss);
  if ((g?.kind === 'boss') !== (b !== undefined)) throw new Error('boss goal without boss');
  if (v.lives !== undefined && (!num(v.lives, 1, 5) || !Number.isInteger(v.lives))) throw new Error('bad lives');
  const teach = list(v.teach, 12, 'teach', (t): Teach => {
    if (!oneOf(t, TEACH) && !known(t, CHAPTER_HINTS)) throw new Error('bad teach');
    return t;
  });
  const enemies = list(v.enemies, MAX_ENEMIES, 'enemies', enemy);
  const solids = list(v.solids, MAX_THINGS, 'solids', solid);
  const covers = list(v.cover, MAX_THINGS, 'cover', cover);
  const nests = list(v.nests, MAX_THINGS, 'nests', point);
  const zones = list(v.zones, MAX_THINGS, 'zones', zone);
  const spots = list(v.spots, MAX_THINGS, 'spots', point);
  if (g?.kind === 'feast' && g.food === 'egg' && !nests?.length) throw new Error('eggs need nests');
  return {
    id: v.id, name: v.name, snake: v.snake, start: point(v.start), heading: v.heading, length: v.length, target: v.target, par: v.par,
    prey: preyList,
    ...(enemies ? { enemies } : {}),
    ...(solids ? { solids } : {}),
    ...(covers ? { cover: covers } : {}),
    ...(zones ? { zones } : {}),
    ...(spots ? { spots } : {}),
    ...(nests ? { nests } : {}),
    ...(g ? { goal: g } : {}),
    ...(b ? { boss: b } : {}),
    ...(v.lives !== undefined ? { lives: v.lives as number } : {}),
    ...(v.dark === true ? { dark: true } : {}),
    ...(teach ? { teach } : {}),
  };
}

/** The full game's chapters from untrusted JSON. Ids may not repeat, nor clash with the free chapter's. */
export function parseChapters(v: unknown): LevelDef[][] {
  if (!Array.isArray(v) || v.length > MAX_CHAPTERS) throw new Error('bad chapters');
  const chapters = v.map((c) => {
    if (!Array.isArray(c) || c.length < 1 || c.length > MAX_LEVELS) throw new Error('bad chapter');
    return c.map(parseLevel);
  });
  const ids = new Set(CHAPTER_1.map((l) => l.id));
  for (const l of chapters.flat()) {
    if (ids.has(l.id)) throw new Error(`repeated level id ${l.id}`);
    ids.add(l.id);
  }
  return chapters;
}
