import type { LevelDef, Stop } from '../src/logic/level';
import { createRng } from '../src/logic/rng';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { permutations } from './solver';

/** Longest the bot waits for things to settle after a pull (as in solver.ts). */
const MAX_WAIT = STEPS_PER_SECOND * 8;
const MAX_TAIL = STEPS_PER_SECOND * 25;
/** Up to this many pins, every order is tried; above it, a fixed sample. */
const FULL_UP_TO = 5;
const SAMPLE = 60;

/** How one pull order ended, and which pull it went wrong on. */
export interface Ending {
  readonly order: readonly string[];
  /** 'won', a loss cause, 'stuck' (all pins out, nothing happened), or 'blocked'. */
  readonly end: string;
  /** The pin pulled last before the loss (or the one that wouldn't come out); '' for a win or a dead end. */
  readonly at: string;
}

/**
 * Plays an order like solver.ts's eager player, but notes the pull after
 * which the level was lost: that pull plus the cause is the lesson a loss
 * teaches ("the gate before the lava cooled: burnt").
 */
export function playNoting(level: LevelDef, order: readonly string[]): Ending {
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
  for (const id of order) {
    if (!w.pull(id)) return { order, end: 'blocked', at: id };
    run(MAX_WAIT);
    visit(stops, MAX_WAIT);
    if (w.finished) {
      const s = w.status;
      return { order, end: s.state === 'lost' ? s.cause : s.state, at: s.state === 'lost' ? id : '' };
    }
  }
  const back = [...stops].reverse();
  visit([...back, ...stops, ...back, ...stops], MAX_TAIL / 4);
  w.leave();
  const s = w.status;
  if (s.state === 'lost') return { order, end: s.cause, at: order[order.length - 1] ?? '' };
  return { order, end: s.state === 'won' ? 'won' : 'stuck', at: '' };
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** The orders the audit tries: all of them for a few pins, else the hint and a seeded sample. */
export function ordersFor(level: LevelDef): string[][] {
  const ids = level.pins.map((p) => p.id);
  if (ids.length <= FULL_UP_TO) return permutations(ids);
  const rng = createRng(ids.length * 7919 + level.id.length);
  const seen = new Set<string>([level.solution.join()]);
  const out: string[][] = [level.solution.slice()];
  while (out.length < SAMPLE) {
    const o = shuffled(ids, rng);
    if (!seen.has(o.join())) {
      seen.add(o.join());
      out.push(o);
    }
  }
  return out;
}

export interface Audit {
  readonly id: string;
  readonly pins: number;
  readonly tried: number;
  /** Of the orders whose pins could all come out. */
  readonly winShare: number;
  readonly blockedShare: number;
  readonly stuckShare: number;
  /** Distinct (pin, cause) lessons among the losses. */
  readonly lessons: Record<string, number>;
  /** The biggest single lesson's share of all losses. */
  readonly topLessonShare: number;
}

/**
 * Plays the orders and sums them up. Orders sharing a prefix that already
 * ended are not replayed: the eager player's result can't change after it.
 */
export function audit(level: LevelDef): Audit {
  const orders = ordersFor(level);
  const ended = new Map<string, Ending>();
  const endings: Ending[] = [];
  for (const order of orders) {
    let known: Ending | undefined;
    for (let k = 1; k < order.length && !known; k++) known = ended.get(order.slice(0, k).join());
    const e = known ? { ...known, order } : playNoting(level, order);
    if (!known && e.end !== 'won' && e.end !== 'stuck') ended.set(order.slice(0, order.indexOf(e.at) + 1).join(), e);
    endings.push(e);
  }
  const possible = endings.filter((e) => e.end !== 'blocked');
  const losses = possible.filter((e) => e.end !== 'won' && e.end !== 'stuck');
  const lessons: Record<string, number> = {};
  for (const e of losses) lessons[`${e.at}:${e.end}`] = (lessons[`${e.at}:${e.end}`] ?? 0) + 1;
  const top = Math.max(0, ...Object.values(lessons));
  return {
    id: level.id,
    pins: level.pins.length,
    tried: endings.length,
    winShare: possible.length ? possible.filter((e) => e.end === 'won').length / possible.length : 0,
    blockedShare: (endings.length - possible.length) / endings.length,
    stuckShare: possible.length ? possible.filter((e) => e.end === 'stuck').length / possible.length : 0,
    lessons,
    topLessonShare: losses.length ? top / losses.length : 0,
  };
}
