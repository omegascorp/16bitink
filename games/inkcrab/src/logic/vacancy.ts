import type { Critter } from './critters';
import { centre, type Item } from './items';
import { canWear, SHELLS, type ShellKind } from './shells';

/**
 * Vacancy chains (Wreck Cove, beach 7), as real hermit crabs make them. A
 * rival in a shell trades up into any loose shell nearby that fits it and
 * gives it more room. Where several want the same empty shell, the biggest
 * that fits takes it, and the smaller ones line up behind it by size, each
 * waiting for the shell the one ahead will leave: when it moves in, its old
 * shell drops right in front of the next, and so on down the line.
 */
export const CHAIN = {
  /** Tiles either side a rival notices an empty shell, or a line to join. */
  seek: 12,
  /** Px between neighbours waiting in line. */
  gap: 3,
} as const;

/** Where a rival in a chain is going: to take `take`, or (null) to wait in line at `x`. */
export interface ChainStep {
  readonly take: Item | null;
  /** World x for the middle of the rival. */
  readonly x: number;
}

/** Whether `kind` fits a rival and gives it more room than the shell it's in. */
export function roomier(k: Critter, kind: ShellKind): boolean {
  return !!k.shell && canWear(SHELLS[kind], k.size) && SHELLS[kind].maxSize > SHELLS[k.shell].maxSize;
}

/** The biggest of `free` for whom `kind` would be roomier, within CHAIN.seek tiles of `x` (nearest first among equals). */
function nextInLine(free: readonly Critter[], kind: ShellKind, x: number, tile: number): Critter | null {
  let best: Critter | null = null;
  for (const k of free) {
    const d = Math.abs(centre(k).x - x);
    if (d > CHAIN.seek * tile || !roomier(k, kind)) continue;
    if (!best || k.size > best.size || (k.size === best.size && d < Math.abs(centre(best).x - x))) best = k;
  }
  return best;
}

/**
 * Every chain on the beach now: for each loose shell (not buried, not one
 * in `skip`, which the player is at or moving into), the biggest rival it
 * would suit goes to take it, then the rival its old shell would suit lines
 * up behind it, and so on. Rivals not in a chain aren't in the plan.
 */
export function planChains(rivals: readonly Critter[], items: Iterable<Item>, tile: number, skip: ReadonlySet<number>): ReadonlyMap<number, ChainStep> {
  const plan = new Map<number, ChainStep>();
  let free = rivals.filter((k) => k.shell && k.bored <= 0);
  for (const item of items) {
    if (item.buried || item.kind.type !== 'shell' || skip.has(item.id)) continue;
    const at = centre(item).x;
    const lead = nextInLine(free, item.kind.shell, at, tile);
    if (!lead) continue;
    plan.set(lead.id, { take: item, x: at });
    free = free.filter((k) => k !== lead);
    let ahead = lead;
    let x = at;
    let side = 0;
    for (let next = nextInLine(free, lead.shell!, at, tile); next; next = nextInLine(free, ahead.shell!, x, tile)) {
      // The line runs out from the shell on the side the first in line came from.
      side ||= Math.sign(centre(next).x - at) || 1;
      x += side * (ahead.w / 2 + next.w / 2 + CHAIN.gap);
      plan.set(next.id, { take: null, x });
      free = free.filter((k) => k !== next);
      ahead = next;
    }
  }
  return plan;
}
