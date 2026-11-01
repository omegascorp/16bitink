import type { LevelDef } from '../logic/level';
import { parseStep } from '../logic/level';
import { CHAPTER_1 } from './index';

/**
 * The full game's levels arrive from the server as JSON, so they are checked
 * before the game reads them. This is a structural check, not a schema for
 * every optional field: it makes sure everything the scenes and the physics
 * index into is present and finite, so a malformed payload fails here with a
 * clear error and never crashes a scene half way through.
 */

/** Caps on what the server may send. */
const MAX_CHAPTERS = 20;
const MAX_LEVELS = 20;
const MAX_ITEMS = 400;
const MAX_POINTS = 400;
const MAX_STEPS = 200;
const COORD = 100_000;
const KINDS = [1, 2, 3, 4, 5];
const RUINS = ['jungle', 'volcano', 'tomb'];
const ANIMALS = ['boar', 'porcupine', 'salamander', 'armadillo', 'frog', 'toad'];
const SIDES = ['left', 'right', 'up', 'down'];

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= COORD;
const isStr = (v: unknown, max = 400): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;

function fail(where: string, what: string): never {
  throw new Error(`bad level data: ${where}: ${what}`);
}

/** An optional-or-required array of at most `max` items, each passing `item`. */
function items(o: Obj, key: string, where: string, item: (x: unknown, at: string) => void, opts: { required?: boolean; max?: number } = {}): void {
  const v = o[key];
  if (v === undefined) {
    if (opts.required) fail(where, `${key} is missing`);
    return;
  }
  if (!Array.isArray(v) || v.length > (opts.max ?? MAX_ITEMS)) fail(where, `${key} is not a list`);
  v.forEach((x, i) => item(x, `${where}.${key}[${i}]`));
}

function nums(o: Obj, keys: readonly string[], where: string): void {
  for (const k of keys) if (!isNum(o[k])) fail(where, `${k} is not a number`);
}

function optional(o: Obj, key: string, where: string, ok: (v: unknown) => boolean): void {
  if (o[key] !== undefined && !ok(o[key])) fail(where, `${key} is wrong`);
}

const point = (x: unknown, at: string): void => {
  if (!isObj(x)) fail(at, 'not a point');
  nums(x, ['x', 'y'], at);
};

const seg = (x: unknown, at: string): void => {
  if (!isObj(x)) fail(at, 'not a segment');
  nums(x, ['ax', 'ay', 'bx', 'by', 't'], at);
};

const room = (x: unknown, at: string): void => {
  if (!Array.isArray(x) || x.length < 3 || x.length > MAX_POINTS) fail(at, 'a room needs 3 or more corners');
  x.forEach((p, i) => {
    if (!Array.isArray(p) || p.length !== 2 || !isNum(p[0]) || !isNum(p[1])) fail(`${at}[${i}]`, 'a corner is [x, y]');
  });
};

const indexList = (o: Obj, key: string, where: string, size: number): void => {
  items(o, key, where, (x, at) => {
    if (!Number.isInteger(x) || (x as number) < 0 || (x as number) >= size) fail(at, 'not a wall index');
  });
};

const rect = (x: unknown, at: string): void => {
  if (!isObj(x)) fail(at, 'not an object');
  nums(x, ['x0', 'x1'], at);
};

/** One level from untrusted JSON. Throws on anything the game would trip over. */
export function parseLevel(v: unknown): LevelDef {
  if (!isObj(v) || typeof v.id !== 'string' || !/^[a-z0-9-]{1,64}$/.test(v.id)) fail('level', 'id is missing or not a slug');
  const w = v.id;
  for (const k of ['chapter', 'name', 'goal']) if (!isStr(v[k])) fail(w, `${k} is missing`);
  optional(v, 'tip', w, (t) => isStr(t, 600));
  items(v, 'rooms', w, room, { required: true, max: 60 });
  if ((v.rooms as unknown[]).length < 1) fail(w, 'no rooms');
  items(v, 'walls', w, seg, { required: true });
  const wallCount = (v.walls as unknown[]).length;
  indexList(v, 'bars', w, wallCount);
  if (!Array.isArray(v.bars)) fail(w, 'bars is missing');
  items(v, 'pins', w, (p, at) => {
    seg(p, at);
    if (!isStr((p as Obj).id, 40)) fail(at, 'a pin needs an id');
    optional(p as Obj, 'gate', at, (g) => typeof g === 'boolean');
  }, { required: true });
  const pinIds = (v.pins as Obj[]).map((p) => p.id);
  if (new Set(pinIds).size !== pinIds.length) fail(w, 'repeated pin id');
  items(v, 'fills', w, (f, at) => {
    if (!isObj(f)) fail(at, 'not a fill');
    nums(f, ['x0', 'x1', 'y1', 'count'], at);
    if (!KINDS.includes(f.kind as number)) fail(at, 'unknown grain kind');
    if (!Number.isInteger(f.count) || (f.count as number) < 0 || (f.count as number) > 20_000) fail(at, 'bad grain count');
  }, { required: true });
  point(v.nib, `${w}.nib`);
  items(v, 'blots', w, (g, at) => {
    point(g, at);
    optional(g as Obj, 'animal', at, (a) => ANIMALS.includes(a as string));
  }, { required: true });
  if (v.chest !== undefined) point(v.chest, `${w}.chest`);
  nums(v, ['coinsNeeded'], w);
  items(v, 'vines', w, (x, at) => {
    if (!isObj(x)) fail(at, 'not a vine');
    nums(x, ['x', 'top', 'bottom'], at);
  });
  for (const k of ['boulders', 'crates', 'rafts', 'rubies', 'braziers']) items(v, k, w, point);
  items(v, 'drains', w, (d, at) => {
    if (!isObj(d)) fail(at, 'not a drain');
    nums(d, ['x0', 'x1', 'y0', 'y1'], at);
  });
  optional(v, 'dark', w, (d) => typeof d === 'boolean');
  optional(v, 'clear', w, (d) => typeof d === 'boolean');
  optional(v, 'ruin', w, (r) => RUINS.includes(r as string));
  items(v, 'ledges', w, (l, at) => {
    rect(l, at);
    nums(l as Obj, ['y'], at);
  });
  items(v, 'plates', w, (p, at) => {
    rect(p, at);
    nums(p as Obj, ['y'], at);
    if (!isStr((p as Obj).id, 40)) fail(at, 'a plate needs an id');
  });
  items(v, 'doors', w, (d, at) => {
    seg(d, at);
    if (!isStr((d as Obj).id, 40) || !isStr((d as Obj).plate, 40)) fail(at, 'a door needs an id and a plate');
  });
  items(v, 'seals', w, (s, at) => {
    if (!isObj(s) || !SIDES.includes(s.side as string)) fail(at, 'a seal needs a side');
    optional(s, 'door', at, (d) => isStr(d, 40));
    optional(s, 'wall', at, (n) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < wallCount);
  });
  indexList(v, 'cracked', w, wallCount);
  if (v.breath !== undefined) {
    if (!isObj(v.breath)) fail(w, 'breath is wrong');
    nums(v.breath, ['every', 'count', 'max'], `${w}.breath`);
  }
  items(v, 'solution', w, (s, at) => {
    if (typeof s !== 'string') fail(at, 'a step is text');
    try {
      parseStep(s);
    } catch (err) {
      fail(at, err instanceof Error ? err.message : 'bad step');
    }
  }, { required: true, max: MAX_STEPS });
  items(v, 'stops', w, (s, at) => {
    if (!isObj(s)) fail(at, 'not a stop');
    nums(s, ['x'], at);
    optional(s, 'y', at, isNum);
  });
  items(v, 'torches', w, point, { required: true });
  if (!isObj(v.view)) fail(w, 'view is missing');
  nums(v.view, ['x', 'y', 'w', 'h'], `${w}.view`);
  if ((v.view.w as number) <= 0 || (v.view.h as number) <= 0) fail(w, 'view has no size');
  return v as unknown as LevelDef;
}

/** The full game's chapters from untrusted JSON. Ids may not repeat, nor clash with the free chapter's. */
export function parseChapters(v: unknown): LevelDef[][] {
  if (!Array.isArray(v) || v.length > MAX_CHAPTERS) throw new Error('bad level data: chapters is not a list');
  const chapters = v.map((c, i) => {
    if (!Array.isArray(c) || c.length < 1 || c.length > MAX_LEVELS) throw new Error(`bad level data: chapter ${i + 2} is not a list of levels`);
    return c.map(parseLevel);
  });
  const ids = new Set(CHAPTER_1.map((l) => l.id));
  for (const l of chapters.flat()) {
    if (ids.has(l.id)) throw new Error(`bad level data: repeated level id ${l.id}`);
    ids.add(l.id);
  }
  return chapters;
}
