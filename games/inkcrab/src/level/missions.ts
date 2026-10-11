import { findOf } from '../logic/finds';
import { PLAIN, missionPar, type Mission, type MissionKind } from '../logic/mission';
import type { RivalSpec } from '../logic/rivals';
import { SHELLS, type ShellKind } from '../logic/shells';
import type { MarkedSpec } from '../logic/sim';
import { movementOf, SPECIES, type SpeciesId } from '../logic/species';
import { levelGoal } from './goal';
import { BEACHES } from './levels';
import type { LevelDef } from './types';

/**
 * Every beach runs the same arc of missions, as InkFish's chapters do: a
 * plain opener, then one level per mission with the beach's own debuts
 * left plain, a remix of two, and the giant to finish. The shell chain is
 * always the fifth level, the beach's chain of shells.
 */
const ARC: readonly (MissionKind | 'remix')[] = ['grow', 'collect', 'grow', 'bounty', 'chain', 'grow', 'survive', 'remix', 'grow', 'giant'];

/** Two missions paired, a different pair each beach in turn. */
const REMIXES: readonly (readonly [MissionKind, MissionKind])[] = [['collect', 'bounty'], ['bounty', 'survive'], ['collect', 'survive']];

/** Marked hunters to eat on a bounty. */
const MARKED = 3;
/** Tiles from the start nothing a mission places comes closer than. */
const AWAY = 12;

/** Where a level sits: its beach (0-based) and its place in the beach (0-based); null for a level in no beach. */
export function slotOf(def: LevelDef): { readonly beach: number; readonly index: number } | null {
  for (let beach = 0; beach < BEACHES.length; beach++) {
    const index = BEACHES[beach]!.findIndex((l) => l.id === def.id);
    if (index >= 0) return { beach, index };
  }
  return null;
}

/** The missions for a beach and a place in it. */
export function missionKinds(beach: number, index: number): readonly MissionKind[] {
  const slot = ARC[index % ARC.length]!;
  return slot === 'remix' ? REMIXES[beach % REMIXES.length]! : [slot];
}

/**
 * The level's walking creature to put a price on: its biggest walker or
 * climber that hunts (any walker when none hunts, a ghost crab when there
 * are none). Fish, burrowers and what sits in pits and dens can't be
 * walked down and eaten, and gulls fly off.
 */
export function quarrySpecies(def: LevelDef): SpeciesId {
  const groups = (def.critters ?? []).filter((g) => {
    const s = g.species ?? 'ghostcrab';
    const move = movementOf(s);
    return (move === 'walk' || move === 'climb') && !SPECIES[s].lowTide && s !== 'hermit';
  });
  const hunters = groups.filter((g) => SPECIES[g.species ?? 'ghostcrab'].hunts);
  const pool = hunters.length ? hunters : groups;
  const best = [...pool].sort((a, b) => b.sizes[1] - a.sizes[1])[0];
  return best?.species ?? 'ghostcrab';
}

/** A level's mission, from where it sits in its beach. */
export function missionOf(def: LevelDef): Mission {
  const slot = slotOf(def);
  if (!slot) return PLAIN;
  const kinds = missionKinds(slot.beach, slot.index);
  const has = (k: MissionKind): boolean => kinds.includes(k);
  const goal = levelGoal(def);
  const species = quarrySpecies(def);
  return {
    kinds,
    // A few more each beach: three on the first two, six by the eighth.
    finds: has('collect') ? 3 + Math.floor(slot.beach / 2) : 0,
    find: findOf(slot.beach),
    // Edible once grown past them: a size under the goal's, so the hunt comes late.
    marked: has('bounty') ? { species, size: Math.max(2, goal - 2), count: MARKED } : null,
    giant: has('giant') ? { species, size: goal - 1, count: 1 } : null,
    // A follower for every shell left behind on the way up from the periwinkle.
    chain: has('chain') ? Math.max(1, goal - 2) : 0,
    lives: has('survive') ? 1 : PLAIN.lives,
  };
}

/** Par time with the mission's task on top. */
export function parTimeOf(def: LevelDef): number {
  return def.parTime + missionPar(missionOf(def));
}

/** Which way the level runs from its start: towards the far end. */
const heading = (def: LevelDef): 1 | -1 => (def.startCol < def.width / 2 ? 1 : -1);

/** The column a share `u` (0..1) of the way from `AWAY` past the start to the far end. */
function along(def: LevelDef, u: number, from = AWAY): number {
  const dir = heading(def);
  const first = def.startCol + dir * from;
  const last = dir === 1 ? def.width - 5 : 4;
  return Math.round(first + (last - first) * u);
}

/** The beach's finds: spread along the beach past the start, each a few digs down (deeper on later beaches). */
export function findSpots(def: LevelDef, m: Mission): (readonly [col: number, depth: number])[] {
  const beach = slotOf(def)?.beach ?? 0;
  const deepest = 2 + Math.floor(beach / 2);
  return Array.from({ length: m.finds }, (_, i) => [along(def, (i + 0.5) / m.finds, AWAY / 2), 2 + ((i * 2 + beach) % deepest)] as const);
}

/** Marked hunters spread along the beach; the giant far off towards the end. */
export function markedSpecs(def: LevelDef, m: Mission): MarkedSpec[] {
  const specs: MarkedSpec[] = [];
  const q = m.marked;
  if (q) for (let i = 0; i < q.count; i++) specs.push({ species: q.species, size: q.size, col: along(def, (i + 1) / (q.count + 1)) });
  if (m.giant) specs.push({ species: m.giant.species, size: m.giant.size, col: along(def, 0.8), giant: true });
  return specs;
}

/** The smallest shell kind the level has that comes in size 1, for its recruits (periwinkles if none does). */
function tinyKind(def: LevelDef): ShellKind {
  return def.shells.map(([kind]) => kind).find((k) => SHELLS[k].minSize === 1) ?? 'periwinkle';
}

/**
 * A shell chain's recruits: small crabs, full in size-1 shells, one for
 * each move up. Each waits a few columns short of the shell it lets the
 * crab move into, so it's find a crab, then a shell, then the next crab.
 */
export function recruitSpecs(def: LevelDef, m: Mission): RivalSpec[] {
  if (!m.chain) return [];
  const dir = heading(def);
  const kind = tinyKind(def);
  const cols: number[] = [];
  for (let i = 0; i < m.chain; i++) {
    const shell = def.shells.filter(([, size]) => size === i + 3).map(([, , col]) => col).sort((a, b) => dir * (a - b))[0];
    let col = shell !== undefined ? shell - dir * 6 : along(def, (i + 0.5) / m.chain, 4);
    // Never right by the start, and never on top of the one before.
    if (dir * (col - def.startCol) < 4) col = def.startCol + dir * 4;
    while (cols.some((c) => Math.abs(c - col) < 3)) col += dir * 3;
    cols.push(Math.max(3, Math.min(def.width - 4, col)));
  }
  return cols.map((col) => [kind, 1, col, 1] as const);
}
