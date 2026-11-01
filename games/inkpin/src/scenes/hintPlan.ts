import { parseStep } from '../logic/level';

/**
 * The hint's plan, kept apart from the scene so it can be tested: which of
 * the solution's steps are left, and which to number now. A gate's id can
 * come up twice in a solution: first it's pulled, then pushed back in.
 */

export type Act = 'pull' | 'push' | 'walk';

/** A walk step is done once Nib is this close (px) to its destination. */
export const WALK_REACH = 48;

/** What the player did: a pin pulled, a gate pushed or a walk made, and the world step it happened at. */
export interface Done {
  readonly id: string;
  readonly act: Act;
  readonly step: number;
}

export interface PlanStep {
  readonly id: string;
  readonly act: Act;
  /** Seconds after the step before (null: once things settle). */
  readonly wait: number | null;
  /** For a walk: the x Nib walks to. */
  readonly x?: number;
  /** For a walk on a stacked board: the floor the marker belongs to. */
  readonly y?: number;
}

/** A step to number on the board: `n` counts from 1 over the steps left. */
export interface HintMark extends PlanStep {
  readonly n: number;
}

/** The solution as acts: a gate's id is a pull while it's in and a push while it's out; '@x' is a walk. */
export function planSteps(solution: readonly string[], gates: ReadonlySet<string>, walkHeights: readonly number[] = []): PlanStep[] {
  const out = new Set<string>();
  let walkIndex = 0;
  return solution.map((s) => {
    const { id, wait, walk } = parseStep(s);
    if (walk !== undefined) {
      const y = walkHeights[walkIndex++];
      return { id, act: 'walk' as const, wait, x: walk, ...(y === undefined ? {} : { y }) };
    }
    const act: Act = gates.has(id) && out.has(id) ? 'push' : 'pull';
    if (gates.has(id)) {
      if (act === 'pull') out.add(id);
      else out.delete(id);
    }
    return { id, act, wait };
  });
}

/** How far through the plan the player is, including acts already done in another valid order. */
export function planProgress(plan: readonly PlanStep[], done: readonly Done[]): { count: number; lastStep: number } {
  const available = [...done];
  let count = 0;
  let lastStep = 0;
  for (const want of plan) {
    const i = available.findIndex((d) => d.id === want.id && d.act === want.act);
    if (i < 0) break;
    const matched = available.splice(i, 1)[0]!;
    lastStep = Math.max(lastStep, matched.step);
    count++;
  }
  return { count, lastStep };
}

export const stepsDone = (plan: readonly PlanStep[], done: readonly Done[]): number => planProgress(plan, done).count;

/**
 * The steps to number now: the rest of the plan, in order. A step with a
 * wait shows only once that many seconds have passed since the step
 * before it was done, and nothing after it shows until it does, so the
 * board never suggests skipping ahead.
 */
export function hintsNow(plan: readonly PlanStep[], doneCount: number, sinceLast: number): HintMark[] {
  const marks: HintMark[] = [];
  for (let k = doneCount; k < plan.length; k++) {
    const step = plan[k]!;
    if (step.wait !== null && (k > doneCount || sinceLast < step.wait)) break;
    marks.push({ ...step, n: k - doneCount + 1 });
  }
  return marks;
}

/** The walk the player should make now, if the next step is one and Nib has got there: the scene notes it as done. */
export function walkDone(plan: readonly PlanStep[], doneCount: number, nibX: number, nibY?: number): PlanStep | null {
  const step = plan[doneCount];
  return step?.act === 'walk' && step.x !== undefined && Math.abs(nibX - step.x) <= WALK_REACH &&
    (step.y === undefined || (nibY !== undefined && Math.abs(nibY - step.y) <= WALK_REACH)) ? step : null;
}
