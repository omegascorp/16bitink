import { parseStep, type LevelDef, type Stop } from '../src/logic/level';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { World, type Status } from '../src/logic/world';

/** Longest the bot waits for things to settle after a pull. */
const MAX_WAIT = STEPS_PER_SECOND * 8;
/** Longest it lets the level play out after the last pull. */
const MAX_TAIL = STEPS_PER_SECOND * 25;

export interface Run {
  readonly order: readonly string[];
  readonly status: Status;
  readonly treasure: number;
  readonly steps: number;
  /** False when a pin in the order couldn't be pulled (another pin was in its way), or a gate couldn't go back in. */
  readonly possible: boolean;
}

/**
 * Plays one pull order the way an eager player would: after each pull, once
 * things settle, Nib is sent to the chest, or along the level's stops (as
 * the ads' hero walks as soon as the way opens). After the last pull Nib
 * goes back and forth along them to pick up the gold, and leaves. A patient
 * player keeps Nib where it is until every pin is out.
 *
 * The order is in steps (see parseStep): a step is a tap, a pull or (on a
 * gate that's out) a push back in. A step with a wait, 'G~1.5', comes that
 * long after the step before it, with no settling or walking in between.
 */
export function play(level: LevelDef, order: readonly string[], patient = false, onStep?: (w: World, stepIndex: number) => void): Run {
  const w = new World(level);
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const stops = level.stops ?? [level.chest ?? { x: level.nib.x }];
  const visit = (list: readonly Stop[], steps: number): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command(s.y === undefined ? { kind: 'goto', x: s.x } : { kind: 'goto', x: s.x, y: s.y });
      run(steps);
    }
  };
  const steps = order.map(parseStep);
  for (let i = 0; i < steps.length; i++) {
    const { id, wait } = steps[i]!;
    if (wait !== null) for (let s = Math.round(wait * STEPS_PER_SECOND); s > 0 && !w.finished; s--) w.step();
    if (!w.finished && !w.tap(id)) return { order, status: w.status, treasure: w.treasure, steps: w.steps, possible: false };
    // The next step comes on a timer: no settling, no walking until it's done.
    if (steps[i + 1]?.wait != null) continue;
    run(MAX_WAIT);
    if (!patient) visit(stops, MAX_WAIT);
    onStep?.(w, i);
    if (w.finished) break;
  }
  const back = [...stops].reverse();
  const sweep = level.stops ? [...back, ...stops, ...back, ...stops] : [{ x: level.nib.x }, ...stops, { x: level.nib.x }, ...stops];
  visit(sweep, MAX_TAIL / 4);
  w.leave();
  return { order, status: w.status, treasure: w.treasure, steps: w.steps, possible: true };
}

export function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}
