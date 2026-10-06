import { meterGoal, type Growth } from './growth';
import { SHELLS, type ShellKind } from './shells';

/**
 * A level is won by growing to the biggest size it allows: the largest
 * maximum among the shell you start in and the shells lying in the level.
 */
export function goalSize(startShell: ShellKind | null, startSize: number, shells: readonly ShellKind[]): number {
  return Math.max(startSize, startShell ? SHELLS[startShell].maxSize : startSize, ...shells.map((k) => SHELLS[k].maxSize));
}

/** How far along the level's growth bar the crab is, 0..1: whole sizes plus its meter towards the next. */
export function levelProgress(g: Growth, start: number, goal: number): number {
  if (goal <= start || g.size >= goal) return g.size >= goal ? 1 : 0;
  const part = Math.min(1, g.meter / meterGoal(g.size));
  return Math.max(0, Math.min(1, (g.size - start + part) / (goal - start)));
}

/** Where each size between start and goal sits on the bar, 0..1, start and goal excluded. */
export function sizeMarks(start: number, goal: number): number[] {
  const n = goal - start;
  return Array.from({ length: Math.max(0, n - 1) }, (_, i) => (i + 1) / n);
}

/** Where on the bar the crab's shell stops it growing (1 when it can make it to the goal). */
export function capMark(cap: number, start: number, goal: number): number {
  if (goal <= start) return 1;
  return Math.max(0, Math.min(1, (cap - start) / (goal - start)));
}
