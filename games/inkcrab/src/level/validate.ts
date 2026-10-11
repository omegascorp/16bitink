import type { BirdSpecies } from '../logic/birds';
import type { Lesson } from '../logic/coach';
import type { DeckKind } from '../logic/decks';
import { SHELL_KINDS } from '../logic/shells';
import { SPECIES } from '../logic/species';
import { freeLevelIds } from './levels';
import type { LevelDef } from './types';

/*
 * Checks the full game's beaches fetched from the server before the game
 * trusts them. Records keyed by each union make the compiler flag a new
 * bird, lesson or deck kind missing here.
 */
const BIRDS: Readonly<Record<BirdSpecies, true>> = { kestrel: true, hawk: true, kingfisher: true, osprey: true, brahminy: true, snowyowl: true };
const DECKS: Readonly<Record<DeckKind, true>> = { boat: true, house: true, rack: true };
const GROUNDS: Readonly<Record<NonNullable<LevelDef['ground']>, true>> = { black: true, grey: true, shingle: true, moonlit: true };
const LESSONS: Readonly<Record<Lesson, true>> = {
  move: true, swap: true, dig: true, drop: true, hide: true, buried: true, sky: true, pit: true, sandfish: true, tide: true, octopus: true,
  climb: true, heron: true, vent: true, kelp: true, fog: true, raccoon: true, rival: true, rain: true, deck: true, monitor: true,
  wind: true, ice: true, fox: true, moon: true, glow: true, chain: true, line: true,
};

type Check = (v: unknown) => boolean;
type Obj = Record<string, unknown>;

const isNum: Check = (v) => typeof v === 'number' && Number.isFinite(v);
const isPos: Check = (v) => isNum(v) && (v as number) > 0;
const isCount: Check = (v) => Number.isInteger(v) && (v as number) >= 0;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const keyOf = (record: object): Check => (v) => typeof v === 'string' && Object.hasOwn(record, v);
const isShell = keyOf(Object.fromEntries(SHELL_KINDS.map((k) => [k, true])));
const isSpecies = keyOf(SPECIES);
const optional = (v: unknown, ok: Check): boolean => v === undefined || ok(v);
const listOf = (ok: Check): Check => (v) => Array.isArray(v) && v.every(ok);
/** A tuple: one check per slot; slots past `required` may be missing. */
const tuple = (checks: readonly Check[], required = checks.length): Check => (v) =>
  Array.isArray(v) && v.length >= required && v.length <= checks.length && v.every((x, i) => checks[i]!(x));
const nums = (n: number): Check => listOf(tuple(Array.from({ length: n }, () => isNum)));
const shape = (fields: Readonly<Record<string, Check>>, optionals: Readonly<Record<string, Check>> = {}): Check => (v) =>
  isObj(v) && Object.entries(fields).every(([k, ok]) => ok(v[k])) && Object.entries(optionals).every(([k, ok]) => optional(v[k], ok));

const isFood = shape({ surface: isCount, buried: isCount, shallow: isCount }, { start: isCount, clams: nums(2) });
const isCritters = listOf(shape({ count: isCount, sizes: tuple([isPos, isPos]) }, { species: isSpecies, cols: tuple([isNum, isNum]) }));
const isBirds = listOf(shape({ count: isCount, size: isPos }, { species: keyOf(BIRDS) }));

/** Optional level fields and how each is checked. */
const OPTIONALS: Readonly<Record<string, Check>> = {
  loose: isCount, granite: isCount,
  pits: nums(2), pools: nums(3), dens: nums(2), mud: nums(3), columns: nums(3), vents: nums(4), ice: nums(3), rocks: nums(3), trees: nums(3),
  kelp: nums(2), glow: nums(2),
  tide: shape({ low: isNum, high: isNum, period: isPos }),
  tideBrings: shape({ food: isCount }, { shells: listOf(tuple([isShell, isPos, isNum])) }),
  fog: shape({ banks: nums(2), drift: isNum }),
  rain: shape({ period: isPos, pour: isPos }, { offset: isNum }),
  wind: shape({ period: isPos, gust: isPos }, { dir: (v) => v === 1 || v === -1, turns: (v) => typeof v === 'boolean', offset: isNum }),
  moon: shape({ period: isPos, dark: isPos }, { offset: isNum }),
  rivals: listOf(tuple([isShell, isPos, isNum, isPos], 3)),
  decks: listOf(tuple([isNum, isPos, isNum, keyOf(DECKS)])),
  critters: isCritters,
  birds: isBirds,
  fry: isSpecies,
  ground: keyOf(GROUNDS),
  teach: listOf(keyOf(LESSONS)),
};

const isLevel = shape({
  id: (v) => typeof v === 'string' && /^[a-z0-9-]{1,64}$/.test(v),
  name: (v) => typeof v === 'string' && v.length > 0,
  hint: (v) => typeof v === 'string',
  width: isPos, height: isPos, seed: isNum, parTime: isPos, startCol: isNum,
  profile: (v) => nums(2)(v) && (v as unknown[]).length > 0,
  shells: listOf(tuple([isShell, isPos, isNum, isNum])),
  food: isFood,
}, OPTIONALS);

/** Validates the full game's beaches (beach 2 onwards) fetched from the server. Throws on anything malformed. */
export function parseBeaches(data: unknown): LevelDef[][] {
  if (!Array.isArray(data) || data.length === 0) throw new Error('Expected a list of beaches');
  const seen = new Set(freeLevelIds());
  return data.map((beach, b) => {
    if (!Array.isArray(beach) || beach.length === 0) throw new Error(`Beach ${b + 2} is malformed`);
    return beach.map((level, i) => {
      if (!isLevel(level)) throw new Error(`Beach ${b + 2} level ${i + 1} is malformed`);
      const def = level as unknown as LevelDef;
      if (seen.has(def.id)) throw new Error(`Level id "${def.id}" is used twice`);
      seen.add(def.id);
      return def;
    });
  });
}
