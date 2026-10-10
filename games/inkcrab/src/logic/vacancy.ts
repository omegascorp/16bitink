import type { Critter } from './critters';
import { centre, type Item } from './items';
import { canWear, type Shell } from './shells';

/**
 * Vacancy chains (Wreck Cove, beach 7), as real hermit crabs make them.
 *
 * Smaller crabs that would like the player's shell follow it in a line by
 * size, each after the shell of the one ahead: right behind the player the
 * one that wants its shell, behind that one the crab that wants that one's,
 * and so on. When the player moves house, the shell it leaves goes to the
 * first in line, whose old shell goes to the next, all down the line at
 * once.
 *
 * Any loose shell does the same: the biggest rival nearby it would suit
 * goes to take it, and the ones that want its old shell line up behind.
 */
export const CHAIN = {
  /** Tiles either side a rival notices an empty shell, or a line to join. */
  seek: 12,
  /** Px between neighbours in a line. */
  gap: 3,
} as const;

export const FOLLOW = {
  /** Tiles off a rival notices the player wears a shell it would like, and falls in behind. */
  notice: 8,
  /** Tiles off a follower gives up and stays where it is. */
  lose: 14,
  /** Px the first in line keeps behind the player: out of reach of a rap. */
  gap: 12,
} as const;

/** Where a rival in a line is going: to take `take`, or (null) to keep its place in line at `x`, facing `face`. */
export interface ChainStep {
  readonly take: Item | null;
  /** World x for the middle of the rival. */
  readonly x: number;
  readonly face: 1 | -1;
  /** In the player's line, rather than one at a loose shell. */
  readonly follow: boolean;
}

/** The player, as the head of a line: where it is, how wide, its shell, and the side its line trails on. */
export interface Leader {
  readonly x: number;
  readonly w: number;
  readonly shell: Shell | null;
  readonly side: 1 | -1;
}

/** Whether `shell` fits a rival and gives it more room than the shell it's in. */
export function roomier(k: Critter, shell: Shell): boolean {
  return !!k.shell && canWear(shell, k.size) && shell.size > k.shell.size;
}

/** The biggest of `free` that would like `kind`, within `reach(k)` px of `x` (nearest first among equals). */
function biggestFor(free: readonly Critter[], kind: Shell, x: number, reach: (k: Critter) => number): Critter | null {
  let best: Critter | null = null;
  for (const k of free) {
    const d = Math.abs(centre(k).x - x);
    if (d > reach(k) || !roomier(k, kind)) continue;
    if (!best || k.size > best.size || (k.size === best.size && d < Math.abs(centre(best).x - x))) best = k;
  }
  return best;
}

/**
 * Lines `free` rivals up behind a head at `x` (`w` wide) wearing `kind`,
 * on `side` of it, each the biggest that would like the shell of the one
 * ahead. `first` is the gap behind the head. Returns who's in it.
 */
function line(
  plan: Map<number, ChainStep>, free: readonly Critter[], head: { x: number; w: number; kind: Shell },
  side: 1 | -1, first: number, follow: boolean, reach: (k: Critter, ahead: number) => number,
): Critter[] {
  const taken: Critter[] = [];
  let pool = free;
  let { x, w, kind } = head;
  let gap = first;
  for (let next = biggestFor(pool, kind, x, (k) => reach(k, taken.length)); next?.shell; next = biggestFor(pool, kind, x, (k) => reach(k, taken.length))) {
    x += side * (w / 2 + next.w / 2 + gap);
    plan.set(next.id, { take: null, x, face: side === 1 ? -1 : 1, follow });
    taken.push(next);
    pool = pool.filter((k) => k !== next);
    ({ w } = next);
    kind = next.shell;
    gap = CHAIN.gap;
  }
  return taken;
}

/**
 * Every line on the beach now. First the player's: smaller crabs that
 * would like its shell (or are following already) fall in behind it. Then,
 * for each loose shell (not buried, not one in `skip`, which the player is
 * after), the biggest free rival it would suit goes to take it and the rest
 * line up behind. Rivals in no line aren't in the plan.
 */
export function planChains(
  rivals: readonly Critter[], items: Iterable<Item>, tile: number, skip: ReadonlySet<number>, leader: Leader | null = null,
): ReadonlyMap<number, ChainStep> {
  const plan = new Map<number, ChainStep>();
  let free = rivals.filter((k) => k.shell && k.bored <= 0);
  if (leader?.shell) {
    const near = (k: Critter, ahead: number): number => (k.following ? FOLLOW.lose : ahead === 0 ? FOLLOW.notice : CHAIN.seek) * tile;
    const following = line(plan, free, { x: leader.x, w: leader.w, kind: leader.shell }, leader.side, FOLLOW.gap, true, near);
    free = free.filter((k) => !following.includes(k));
  }
  for (const item of items) {
    if (item.buried || item.kind.type !== 'shell' || skip.has(item.id)) continue;
    const at = centre(item).x;
    const lead = biggestFor(free, item.kind.shell, at, () => CHAIN.seek * tile);
    if (!lead?.shell) continue;
    const side: 1 | -1 = centre(lead).x >= at ? 1 : -1;
    plan.set(lead.id, { take: item, x: at, face: side === 1 ? -1 : 1, follow: false });
    free = free.filter((k) => k !== lead);
    const queued = line(plan, free, { x: at, w: lead.w, kind: lead.shell }, side, CHAIN.gap, false, () => CHAIN.seek * tile);
    free = free.filter((k) => !queued.includes(k));
  }
  return plan;
}
