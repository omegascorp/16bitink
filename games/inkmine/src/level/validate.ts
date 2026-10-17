import { isDesign } from '../logic/designs';
import { ORES } from '../logic/ore';
import { CREATURE_KINDS } from '../logic/creatures';
import { isWorldId } from '../logic/worlds';
import type { PlanetDef } from './types';

/*
 * Checks the full game's planets fetched from the server before the game
 * trusts them: every field the builder reads, with caps on sizes and counts
 * so a bad response can't make it carve a world too big to hold. Anything
 * malformed throws; nothing is half-installed.
 */
type Check = (v: unknown) => boolean;
type Obj = Record<string, unknown>;

/** The most a world may be round and deep, and the most of anything it may scatter. */
const MAX = { width: 1024, height: 512, count: 1000 } as const;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const intIn = (lo: number, hi: number): Check => (v) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
const isCount = intIn(0, MAX.count);
const isText = (max: number): Check => (v) => typeof v === 'string' && v.length > 0 && v.length <= max;
const isHex: Check = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const isSlug: Check = (v) => typeof v === 'string' && /^[a-z0-9-]{1,64}$/.test(v);
const keyOf = (record: object): Check => (v) => typeof v === 'string' && Object.hasOwn(record, v);
const oneOf = (...values: readonly unknown[]): Check => (v) => values.includes(v);
const optional = (v: unknown, ok: Check): boolean => v === undefined || ok(v);
const listOf = (ok: Check, max: number = MAX.count): Check => (v) => Array.isArray(v) && v.length <= max && v.every(ok);
const tuple = (...checks: readonly Check[]): Check => (v) => Array.isArray(v) && v.length === checks.length && v.every((x, i) => checks[i]!(x));
const shape = (fields: Readonly<Record<string, Check>>, optionals: Readonly<Record<string, Check>> = {}): Check => (v) =>
  isObj(v) && Object.entries(fields).every(([k, ok]) => ok(v[k])) && Object.entries(optionals).every(([k, ok]) => optional(v[k], ok));

const col = intIn(-MAX.width, MAX.width * 2);
const depth = intIn(-MAX.height, MAX.height);
const at = tuple(col, depth);
const isOre = keyOf(ORES);

const isStyle = shape(Object.fromEntries(['soil', 'stone', 'deep', 'bedrock', 'grain', 'shade', 'tunnel', 'sky'].map((k) => [k, isHex])));
const isOreRule = shape({ ore: isOre, from: depth, to: depth, veins: isCount, size: tuple(intIn(1, 64), intIn(1, 64)) }, { cols: tuple(col, col) });
const isSite = shape({
  width: intIn(16, MAX.width), height: intIn(16, MAX.height), seed: intIn(0, 2 ** 31), surface: intIn(1, MAX.height),
  stone: depth, deep: depth, caves: isCount, caveFrom: depth, ores: listOf(isOreRule, 64), firedamp: isCount, landerCol: col,
}, {
  wrap: (v) => typeof v === 'boolean',
  seam: isOre,
  spores: isCount,
  caps: listOf(shape({ where: oneOf('surface', 'caves'), clusters: isCount, size: intIn(1, 16) }, { cols: tuple(col, col) }), 16),
  charges: listOf(shape({ kind: oneOf('charge', 'lineCharge'), at })),
  flats: listOf(col, 16),
  rooms: listOf(shape({ at, w: intIn(1, 64), h: intIn(1, 64) }), 200),
  tunnels: listOf(listOf(at, 64), 64),
  vaults: listOf(shape({ at, w: intIn(1, 32), h: intIn(1, 32), wall: oneOf('stone', 'deep') }, { door: oneOf('left', 'right', 'top') }), 64),
  pockets: listOf(at, 200),
});
const isItem = shape({ id: isSlug, kind: oneOf('core', 'probe', 'fossil', 'wreck'), at }, {
  blueprint: (v) => typeof v === 'string' && isDesign(v), grade: oneOf('soil', 'stone'), drill: intIn(0, 10),
});
const isPlanet = shape({
  number: intIn(2, 10),
  name: isText(40),
  blurb: isText(400),
  style: isStyle,
  signature: isOre,
  world: shape({ id: (v) => isWorldId(v) && v !== 'graphite', version: intIn(1, 10_000), site: isSite, items: listOf(isItem, 200) }, {
    outpost: col,
    crash: col,
    creatures: listOf(shape({ kind: oneOf(...CREATURE_KINDS), count: intIn(0, 64), from: depth, to: depth }, { cols: tuple(col, col) }), 16),
    giant: shape({ at }),
  }),
}, {
  arrival: shape({ subtitle: isText(120), paragraphs: listOf(isText(2000), 8), button: isText(40) }),
});

/** Validates the full game's planets (Mycel onwards) fetched from the server. Throws on anything malformed. */
export function parsePlanets(data: unknown): PlanetDef[] {
  if (!Array.isArray(data) || data.length === 0 || data.length > 9) throw new Error('Expected a list of planets');
  const worlds = new Set<string>();
  return data.map((planet, i) => {
    if (!isPlanet(planet)) throw new Error(`Planet ${i + 2} is malformed`);
    const def = planet as unknown as PlanetDef;
    if (worlds.has(def.world.id)) throw new Error(`World "${def.world.id}" is given twice`);
    worlds.add(def.world.id);
    // A world that wraps meets itself at a whole number of ground chunks.
    if (def.world.site.wrap && def.world.site.width % 16 !== 0) throw new Error(`${def.name} wraps at a width that isn't a whole number of chunks`);
    const items = new Set<string>();
    for (const it of def.world.items) {
      if (items.has(it.id)) throw new Error(`Item "${it.id}" on ${def.name} is used twice`);
      items.add(it.id);
    }
    return def;
  });
}
