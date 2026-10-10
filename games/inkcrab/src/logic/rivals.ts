import { moveBody, type Box } from './body';
import { makeCritter, stepCritter, type Critter, type Surroundings } from './critters';
import type { Rng } from './rng';
import { centre, overlaps, type Item } from './items';
import { canWear, crabBox, SHELLS, type ShellKind } from './shells';
import type { ChainStep } from './vacancy';
import { surfaceRow, type Terrain } from './terrain';

/**
 * Rival hermit crabs (Wreck Cove, beach 7): purple pinchers after the same
 * shells you are. They never catch you and are never food. One no bigger
 * than you tucks into its shell when it sees you coming; rap on it (E, or
 * tap it) and it lets go of the shell and scuttles off. Out of a shell, a
 * rival makes for the nearest loose one that fits it, and moves in: often
 * the one you just left. In a shell, it trades up into a roomier one, in a
 * vacancy chain with its neighbours (see vacancy.ts). A bigger rival
 * ignores you, and never takes yours.
 */
export type RivalSpec = readonly [shell: ShellKind, size: number, col: number];

export const RIVAL = {
  /** Tiles off a rival no bigger than you tucks into its shell at the sight of you. */
  shy: 4,
  /** Tiles either side a rival out of a shell spots one that fits it. */
  seek: 10,
  /** Px round the crab within which it can rap on a shell. */
  reach: 10,
  /** Seconds a rapped rival runs from you before it goes looking for a shell. */
  fleeFor: 2,
  /** Seconds a rival gives up on a shell it can't get to (a wall or a drop in the way) and wanders. */
  giveUp: 3,
  /** Tiles a rival with nothing to do wanders from its home spot before it turns back, so neighbours stay neighbours. */
  roam: 3,
} as const;

export const isRival = (k: Critter): boolean => k.species === 'hermit';

/** A rival at column `col`, standing on the sand, in `shell`. */
export function makeRival(t: Terrain, id: number, [shell, size, col]: RivalSpec, tile: number): Critter {
  return inShell({ ...makeCritter(id, size, col * tile + tile / 2, surfaceRow(t, col) * tile, 1, 2, 'hermit'), shell, home: col * tile + tile / 2 }, shell);
}

/** A rival moved into `shell` (or out of one, null), its box refitted round its feet: as big as the shell, as the player's is. */
export function inShell(k: Critter, shell: ShellKind | null): Critter {
  const { w, h } = crabBox(k.size, shell);
  return { ...k, shell, x: k.x + k.w / 2 - w / 2, y: k.y + k.h - h, w, h };
}

/** What the player is, as far as a rival cares. */
export interface Rapper {
  readonly box: Box;
  readonly size: number;
}

/** Whether the crab could rap on this rival's shell now: it's in one, no bigger than the crab, and within reach. */
export function canRap(k: Critter, crab: Rapper): boolean {
  return isRival(k) && !!k.shell && k.size <= crab.size && overlaps(crab.box, k, RIVAL.reach);
}

/** Whether a rival keeps still in its shell: no bigger than the crab, which is close. */
export function tucks(k: Critter, crab: Rapper, tile: number): boolean {
  if (!k.shell || k.size > crab.size) return false;
  const a = centre(k);
  const b = centre(crab.box);
  return Math.abs(a.x - b.x) < RIVAL.shy * tile && Math.abs(a.y - b.y) < RIVAL.shy * tile;
}

/** The nearest loose shell that fits a rival out of one, within RIVAL.seek tiles across; `skip`: shells the player is at or moving into. */
export function shellFor(k: Critter, items: Iterable<Item>, tile: number, skip: ReadonlySet<number>): Item | null {
  if (k.shell !== null) return null;
  const at = centre(k).x;
  let best: Item | null = null;
  for (const i of items) {
    if (i.buried || i.kind.type !== 'shell' || skip.has(i.id) || !canWear(SHELLS[i.kind.shell], k.size)) continue;
    const d = Math.abs(centre(i).x - at);
    if (d < RIVAL.seek * tile && (!best || d < Math.abs(centre(best).x - at))) best = i;
  }
  return best;
}

/** Px from its spot a rival waiting in line counts as there. */
const IN_PLACE = 2;

/** What happened to a rival this step: `took` a loose shell it moved into, `left` the shell it moved out of (to drop where it stands). */
export interface RivalStep {
  readonly rival: Critter;
  readonly took: Item | null;
  readonly left: ShellKind | null;
}

/**
 * One step for a rival. In a vacancy chain (`chain`, see vacancy.ts) it's
 * too busy to be shy: it walks to the empty shell and trades up, or to its
 * place in line and waits. Otherwise: tucked still in its shell while a
 * crab no bigger than it is close by; out of a shell, making for the
 * nearest one that fits and moving in once it reaches it; or wandering
 * like any walker.
 */
export function stepRival(
  t: Terrain, k: Critter, crab: Rapper, items: Iterable<Item>, dt: number, tile: number, rng: Rng, env: Surroundings, skip: ReadonlySet<number>,
  chain?: ChainStep,
): RivalStep {
  if (chain) return chainStep(t, k, chain, dt, tile, rng, env);
  if (tucks(k, crab, tile)) return { rival: { ...k, ...moveBody(t, k, 0, 0, dt, tile), tucked: true }, took: null, left: null };
  // Just rapped, it runs before it looks for another shell (`bored` counts down in stepCritter).
  const target = k.bored > 0 ? null : shellFor(k, items, tile, skip);
  if (!target) return { rival: { ...wander(t, k, dt, tile, rng, env), tucked: false }, took: null, left: null };
  const moved = walkTo(t, k, centre(target).x, dt, tile, rng, env);
  if (!moved) return { rival: { ...k, tucked: false, bored: RIVAL.giveUp }, took: null, left: null };
  if (!overlaps(moved, target) || target.kind.type !== 'shell') return { rival: { ...moved, tucked: false }, took: null, left: null };
  return { rival: { ...inShell(moved, target.kind.shell), tucked: false }, took: target, left: null };
}

/** A rival in a vacancy chain: off to trade up into the empty shell, or to wait its turn in line. */
function chainStep(t: Terrain, k: Critter, chain: ChainStep, dt: number, tile: number, rng: Rng, env: Surroundings): RivalStep {
  const at = centre(k).x;
  if (!chain.take && Math.abs(chain.x - at) <= IN_PLACE) {
    // In its place: it waits, facing up the line.
    const dir: 1 | -1 = chain.x > at ? 1 : k.dir;
    return { rival: { ...k, ...moveBody(t, k, 0, 0, dt, tile), tucked: false, dir }, took: null, left: null };
  }
  const moved = walkTo(t, k, chain.x, dt, tile, rng, env);
  if (!moved) return { rival: { ...k, tucked: false, bored: RIVAL.giveUp }, took: null, left: null };
  const take = chain.take;
  if (!take || take.kind.type !== 'shell' || !overlaps(moved, take)) return { rival: { ...moved, tucked: false }, took: null, left: null };
  return { rival: { ...inShell(moved, take.kind.shell), tucked: false }, took: take, left: k.shell ?? null };
}

/** Ambling about, as any walker does, but never far from home: past RIVAL.roam tiles off, it heads back. */
function wander(t: Terrain, k: Critter, dt: number, tile: number, rng: Rng, env: Surroundings): Critter {
  const off = k.home === undefined ? 0 : centre(k).x - k.home;
  if (k.bored > 0 || Math.abs(off) <= RIVAL.roam * tile) return stepCritter(t, k, null, dt, tile, rng, env);
  return walkTo(t, k, k.home!, dt, tile, rng, env) ?? stepCritter(t, k, null, dt, tile, rng, env);
}

/** A step towards world x; null when a wall or a drop turns it back (it can't get there from here). */
function walkTo(t: Terrain, k: Critter, x: number, dt: number, tile: number, rng: Rng, env: Surroundings): Critter | null {
  const dir: 1 | -1 = x >= centre(k).x ? 1 : -1;
  const moved = stepCritter(t, { ...k, dir, turnIn: Math.max(k.turnIn, 1) }, null, dt, tile, rng, env);
  return moved.dir === dir ? moved : null;
}
