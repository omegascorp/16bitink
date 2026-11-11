import type { MapDef } from '../level/types';
import { partNumber, previousMap } from '../level/maps';
import { strengthOf } from './creatures';
import type { Hero } from './hero';
import { ITEM_IDS, itemDef, type ItemId, type Quality, type Slot } from './items';
import type { MapObject } from './objects';
import { roll } from './rng';

/**
 * Random loot (docs/inkheroes-design.md, Loot): what a beaten guard group
 * or a chest holds, rolled from the map's seed and the object's id, so a
 * reload can't reroll it. Hand-placed pieces (`drop`, a chest's `item`)
 * always win. The piece itself leans toward the sets the side's heroes
 * have started, so it reads what they hold, never the day.
 */

type Grades = readonly [gray: number, green: number, blue: number, purple: number];
/** The grade table by row: parts 1–4, then part 4's strongest quarter. */
export const LOOT_ROWS: readonly Grades[] = [
  [0.85, 0.15, 0, 0],
  [0.65, 0.3, 0.05, 0],
  [0.45, 0.38, 0.15, 0.02],
  [0.3, 0.4, 0.23, 0.07],
  [0.15, 0.4, 0.32, 0.13],
];
const GRADES: readonly Quality[] = ['gray', 'green', 'blue', 'purple'];
/** A guard group's chance to drop a piece: its part's weakest, its strongest. */
export const DROP_CHANCE = { weakest: 0.25, strongest: 0.75 } as const;
/** The share of random pieces that are never in a set (a weapon, a shield, an amulet or a ring). */
const LOOSE_SHARE = 1 / 3;
/** How much likelier a set already started is, and again a slot of it still missing. */
const STARTED = 3;
const MISSING = 3;
/** The share of chests that hold a piece instead of gold. */
export const CHEST_PIECE = 0.25;
/** The share of a lair's groups that drop a piece. */
export const LAIR_DROP = 0.25;
/** What separates a lair's id from the week in its group's id (`den@w3`). */
export const LAIR_MARK = '@w';

const hash = (s: string): number => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

/** The draws a roll uses, in order, from the seed of object `id`'s part's map and a key. */
function draws(def: MapDef, id: string, key: string, n: number): number[] {
  let seed = (hash(key) ^ (partInfo(def).seed.get(lairOfGroup(id) ?? id) ?? def.seed)) >>> 0;
  return Array.from({ length: n }, () => {
    const r = roll(seed);
    seed = r.seed;
    return r.value;
  });
}

interface PartInfo {
  /** Each object's part (1–4 in its chapter): the first part whose map has it. */
  readonly part: ReadonlyMap<string, number>;
  /** Each object's seed: its own part's map's, so a part played fresh rolls as one ridden into. */
  readonly seed: ReadonlyMap<string, number>;
  /** Each guard's drop chance and grade row (1-based). */
  readonly guard: ReadonlyMap<string, { readonly chance: number; readonly row: number }>;
}
const infos = new WeakMap<MapDef, PartInfo>();

/** The strength a guard stands with on its map, brood and all. */
const guardStrength = (o: MapObject): number => strengthOf(o.creature!, o.count ?? 1) + (o.brood ? strengthOf(o.brood.creature, o.brood.count) : 0);

/** Which part each object of `def` came with, and each guard's rank among its part's guards. */
function partInfo(def: MapDef): PartInfo {
  const known = infos.get(def);
  if (known) return known;
  const part = new Map<string, number>();
  const seed = new Map<string, number>();
  // Walk back through the chapter: an object a part before already had is that part's.
  const chain: MapDef[] = [];
  for (let m: MapDef | undefined = def; m && chain.length < 10; m = previousMap(m)) chain.unshift(m);
  for (const m of chain) {
    for (const o of m.objects) {
      if (part.has(o.id)) continue;
      part.set(o.id, partNumber(m));
      seed.set(o.id, m.seed);
    }
  }
  const guard = new Map<string, { chance: number; row: number }>();
  const byPart = new Map<number, MapObject[]>();
  for (const o of def.objects) {
    if (o.kind !== 'monster' || !o.creature) continue;
    const p = part.get(o.id) ?? partNumber(def);
    byPart.set(p, [...(byPart.get(p) ?? []), o]);
  }
  for (const [p, guards] of byPart) {
    const ranked = [...guards].sort((a, b) => guardStrength(a) - guardStrength(b) || (a.id < b.id ? -1 : 1));
    const n = ranked.length;
    ranked.forEach((o, rank) => {
      const chance = n <= 1 ? DROP_CHANCE.strongest : DROP_CHANCE.weakest + ((DROP_CHANCE.strongest - DROP_CHANCE.weakest) * rank) / (n - 1);
      // The strongest quarter rolls on the next row down (part 4's on the last).
      const row = Math.min(LOOT_ROWS.length, Math.max(1, p) + (rank >= Math.floor(n * 0.75) && n > 1 ? 1 : 0));
      guard.set(o.id, { chance, row });
    });
  }
  const info = { part, seed, guard };
  infos.set(def, info);
  return info;
}

/** The part (1–4 within its chapter) object `id` came with on `def`; a lair's group, its lair's. */
export function partOf(def: MapDef, id: string): number {
  return partInfo(def).part.get(lairOfGroup(id) ?? id) ?? partNumber(def);
}

/** The lair a weekly group came from (its id before LAIR_MARK), if it is one. */
export function lairOfGroup(id: string): string | undefined {
  const at = id.indexOf(LAIR_MARK);
  return at > 0 ? id.slice(0, at) : undefined;
}

/** The people whose pieces drop on `def`: chapter 3's Norse, chapter 2's Egyptian, else the Greeks'. */
export const lootFaction = (def: Pick<MapDef, 'hero'>): 'crown' | 'kemet' | 'norse' => (def.hero.faction === 'norse' ? 'norse' : def.hero.faction === 'kemet' ? 'kemet' : 'crown');

/** The grade a draw lands on in row `row` (1-based). */
export function gradeOn(row: number, draw: number): Quality {
  const odds = LOOT_ROWS[Math.min(LOOT_ROWS.length, Math.max(1, row)) - 1]!;
  let sum = 0;
  for (let i = 0; i < GRADES.length; i++) {
    sum += odds[i]!;
    if (draw < sum) return GRADES[i]!;
  }
  return 'gray';
}

const LOOSE_SLOTS: readonly Slot[] = ['weapon', 'shield', 'amulet', 'ring1', 'ring2'];

/** The random pool of `faction` at `grade`: set armor, or the pieces never in a set. */
function pool(faction: 'crown' | 'kemet' | 'norse', grade: Quality, loose: boolean): ItemId[] {
  return ITEM_IDS.filter((id) => {
    const d = itemDef(id);
    if (d.faction !== faction || d.quality !== grade) return false;
    return loose ? !d.set && LOOSE_SLOTS.includes(d.slot) : !!d.set;
  });
}

/** Everything the side's heroes wear and carry. */
const holdings = (heroes: readonly Pick<Hero, 'gear' | 'bag'>[]): ItemId[] => heroes.flatMap((h) => [...Object.values(h.gear ?? {}), ...(h.bag ?? [])]);

/** How likely piece `id` is beside the others: a set started by the side 3×, a slot of it still missing 3× again. */
function weight(id: ItemId, held: readonly ItemId[]): number {
  const { set, slot } = itemDef(id);
  if (!set) return 1;
  const mine = held.filter((h) => itemDef(h).set === set);
  if (!mine.length) return 1;
  return STARTED * (mine.some((h) => itemDef(h).slot === slot) ? 1 : MISSING);
}

/**
 * The piece a roll gives: `grade` first (else the grades below it), a
 * piece never in a set when `loose` (else armor), the other kind when the
 * catalog has none, weighted toward what `heroes` hold. None when the
 * faction has no random pieces at all.
 */
export function pickPiece(faction: 'crown' | 'kemet' | 'norse', grade: Quality, loose: boolean, draw: number, heroes: readonly Pick<Hero, 'gear' | 'bag'>[]): ItemId | undefined {
  const held = holdings(heroes);
  // Legendary pieces are never random: a gold roll is the best random grade.
  for (let g = grade === 'gold' ? GRADES.length - 1 : GRADES.indexOf(grade); g >= 0; g--) {
    for (const kind of [loose, !loose]) {
      const ids = pool(faction, GRADES[g]!, kind);
      if (!ids.length) continue;
      const weights = ids.map((id) => weight(id, held));
      let left = draw * weights.reduce((a, b) => a + b, 0);
      for (let i = 0; i < ids.length; i++) {
        left -= weights[i]!;
        if (left < 0) return ids[i];
      }
      return ids[ids.length - 1];
    }
  }
  return undefined;
}

/**
 * What beaten monster `o` leaves on `def`, for the side whose heroes are
 * `heroes`: its hand-placed `drop`, else a random piece by its strength
 * rank among its part's guards, or (a lair's weekly group) 1 in 4 on the
 * row of the part before the lair's.
 */
export function dropOf(def: MapDef, o: MapObject, heroes: readonly Pick<Hero, 'gear' | 'bag'>[]): ItemId | undefined {
  if (o.drop) return o.drop;
  if (o.kind !== 'monster') return undefined;
  const lair = lairOfGroup(o.id);
  const rule = lair ? { chance: LAIR_DROP, row: Math.max(1, partOf(def, lair) - 1) } : partInfo(def).guard.get(o.id);
  if (!rule) return undefined;
  const [hit, grade, kind, which] = draws(def, o.id, `drop:${o.id}`, 4) as [number, number, number, number];
  if (hit >= rule.chance) return undefined;
  return pickPiece(lootFaction(def), gradeOn(rule.row, grade), kind < LOOSE_SHARE, which, heroes);
}

/** Whether chest `o` holds a piece instead of gold: 1 in 4, fixed by the map's seed (a hand-placed `item` always). */
export function chestHoldsPiece(def: MapDef, o: Pick<MapObject, 'id' | 'kind' | 'item'>): boolean {
  if (o.kind !== 'chest') return false;
  return !!o.item || draws(def, o.id, `chest:${o.id}`, 1)[0]! < CHEST_PIECE;
}

/** The piece chest `o` holds for the side whose heroes are `heroes`, rolled on its part's row; none for a chest of gold. */
export function chestPiece(def: MapDef, o: MapObject, heroes: readonly Pick<Hero, 'gear' | 'bag'>[]): ItemId | undefined {
  if (!chestHoldsPiece(def, o)) return undefined;
  if (o.item) return o.item;
  const [, grade, kind, which] = draws(def, o.id, `chest:${o.id}`, 4) as [number, number, number, number];
  return pickPiece(lootFaction(def), gradeOn(partOf(def, o.id), grade), kind < LOOSE_SHARE, which, heroes);
}
