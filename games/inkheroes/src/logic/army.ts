import { creature, type CreatureId } from './creatures';

export const ARMY_SLOTS = 7;

export interface ArmySlot {
  readonly creature: CreatureId;
  readonly count: number;
}

/** Seven slots, empty ones null. */
export type Army = readonly (ArmySlot | null)[];

export const emptyArmy = (): Army => Array.from({ length: ARMY_SLOTS }, () => null);

/** An army from a list of slots (padded to seven). */
export function armyOf(slots: readonly (ArmySlot | null)[]): Army {
  return Array.from({ length: ARMY_SLOTS }, (_, i) => slots[i] ?? null);
}

export const armySize = (a: Army): number => a.reduce((n, s) => n + (s ? s.count : 0), 0);
export const isEmptyArmy = (a: Army): boolean => a.every((s) => !s || s.count <= 0);

/** Where `count` of `id` would go: a slot already holding them, else the first free one, else -1. */
export function slotFor(a: Army, id: CreatureId): number {
  const same = a.findIndex((s) => s?.creature === id);
  return same >= 0 ? same : a.findIndex((s) => !s);
}

/** The army with `count` more of `id` (merged into its slot), or null when there's no room. */
export function addTroops(a: Army, id: CreatureId, count: number): Army | null {
  const i = slotFor(a, id);
  if (i < 0) return null;
  return a.map((s, k) => (k === i ? { creature: id, count: (s?.count ?? 0) + count } : s));
}

export function setSlot(a: Army, i: number, slot: ArmySlot | null): Army {
  return a.map((s, k) => (k === i ? (slot && slot.count > 0 ? slot : null) : s));
}

/**
 * Moves slot `from` of army `src` onto slot `to` of army `dst` (the same army
 * when src === dst): merges like units, swaps different ones. Returns both
 * armies; `keepOne` refuses moves that would leave `src` empty (a hero
 * can't walk off with nobody).
 */
export function moveSlot(src: Army, from: number, dst: Army, to: number, same: boolean, keepOne: boolean): { src: Army; dst: Army } | null {
  const a = src[from];
  if (!a) return null;
  if (same && from === to) return null;
  const b = dst[to] ?? null;
  if (b && b.creature === a.creature) {
    const merged = { creature: a.creature, count: a.count + b.count };
    if (same) return { src: setSlot(setSlot(src, from, null), to, merged), dst: setSlot(setSlot(src, from, null), to, merged) };
    const nextSrc = setSlot(src, from, null);
    if (keepOne && isEmptyArmy(nextSrc)) return null;
    return { src: nextSrc, dst: setSlot(dst, to, merged) };
  }
  if (same) {
    const swapped = setSlot(setSlot(src, to, a), from, b);
    return { src: swapped, dst: swapped };
  }
  const nextSrc = setSlot(src, from, b);
  if (keepOne && isEmptyArmy(nextSrc)) return null;
  return { src: nextSrc, dst: setSlot(dst, to, a) };
}

/** The speed of the army's slowest unit (it sets a hero's daily movement). */
export function slowest(a: Army): number {
  const speeds = a.filter((s): s is ArmySlot => !!s).map((s) => creature(s.creature).speed);
  return speeds.length ? Math.min(...speeds) : 0;
}

/** Morale from what the army is made of: −1 for two factions, −2 for three or more; units that raise it (the Seraph) add. */
export function armyMorale(a: Army): number {
  const units = a.filter((s): s is ArmySlot => !!s && !creature(s.creature).undead);
  const factions = new Set(units.map((s) => creature(s.creature).faction));
  const mix = factions.size >= 3 ? -2 : factions.size === 2 ? -1 : 0;
  const lift = Math.max(0, ...units.map((s) => creature(s.creature).morale ?? 0));
  return mix + lift;
}

/** A map monster of `count` split into near-even stacks for battle: about √count of them, at most `max`. */
export function splitMonster(id: CreatureId, count: number, max = 4): Army {
  const n = Math.max(1, Math.min(max, count, Math.round(Math.sqrt(count))));
  const base = Math.floor(count / n);
  const extra = count % n;
  return armyOf(Array.from({ length: n }, (_, i) => ({ creature: id, count: base + (i < extra ? 1 : 0) })));
}
