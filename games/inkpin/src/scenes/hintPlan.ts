import { parseStep } from '../logic/level';

/**
 * The hint's plan, kept apart from the scene so it can be tested: which of
 * the solution's steps are left, and which to number now. A gate's id can
 * come up twice in a solution: first it's pulled, then pushed back in.
 */

export type Act = 'pull' | 'push';

/** What the player did: a pin pulled or a gate pushed, and the world step it happened at. */
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
}

/** A step to number on the board: `n` counts from 1 over the steps left. */
export interface HintMark extends PlanStep {
  readonly n: number;
}

/** The solution as acts: a gate's id is a pull while it's in and a push while it's out. */
export function planSteps(solution: readonly string[], gates: ReadonlySet<string>): PlanStep[] {
  const out = new Set<string>();
  return solution.map((s) => {
    const { id, wait } = parseStep(s);
    const act: Act = gates.has(id) && out.has(id) ? 'push' : 'pull';
    if (gates.has(id)) {
      if (act === 'pull') out.add(id);
      else out.delete(id);
    }
    return { id, act, wait };
  });
}

/** How far through the plan the player is: its steps matched in order by what they did (other taps are skipped). */
export function stepsDone(plan: readonly PlanStep[], done: readonly Done[]): number {
  let k = 0;
  for (const d of done) {
    const want = plan[k];
    if (want && want.id === d.id && want.act === d.act) k++;
  }
  return k;
}

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
