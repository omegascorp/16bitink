import { parseStep, type LevelDef, type Stop } from '../src/logic/level';
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
/** With gate pins: every order up to this many, else a fixed sample. */
const FULL_GATED_UP_TO = 120;
/** When the audit pushes a gate back in after pulling it: never, or this many seconds after the pull. */
const PUSH_BACKS: readonly (number | null)[] = [null, 0.75, 1.5, 3];

/** How one pull order ended, and which pull it went wrong on. */
export interface Ending {
  readonly order: readonly string[];
  /** 'won', a loss cause, 'stuck' (all pins out, nothing happened), 'blocked', or 'jammed' (a gate that wouldn't go back in). */
  readonly end: string;
  /** The pin pulled last before the loss (or the one that wouldn't come out), 'G↩' for a gate pushed back in; '' for a win or a dead end. */
  readonly at: string;
  /**
   * For a loss on the way (not in the final sweep): the order's steps up to
   * the loss, plus the next step if it was on a timer (it shaped the run);
   * any order starting the same way ends the same.
   */
  readonly prefix?: string;
}

/**
 * Plays an order like solver.ts's eager player, but notes the pull after
 * which the level was lost: that pull plus the cause is the lesson a loss
 * teaches ("the gate before the lava cooled: burnt").
 */
export function playNoting(level: LevelDef, order: readonly string[]): Ending {
  const steps = order.map(parseStep);
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
  let last = '';
  for (let i = 0; i < steps.length; i++) {
    const { id, wait } = steps[i]!;
    if (wait !== null) for (let s = Math.round(wait * STEPS_PER_SECOND); s > 0 && !w.finished; s--) w.step();
    if (!w.finished) {
      const pin = w.pins.find((p) => p.def.id === id);
      const pushing = pin?.def.gate === true && pin.pulledAt !== null;
      if (!w.tap(id)) return { order, end: pushing ? 'jammed' : 'blocked', at: id, prefix: prefixKey(order, i) };
      last = pushing ? `${id}↩` : id;
      const next = steps[i + 1];
      if (next?.wait != null) continue;
      run(MAX_WAIT);
      visit(stops, MAX_WAIT);
    }
    if (w.finished) {
      const s = w.status;
      const lost = s.state === 'lost';
      return { order, end: lost ? s.cause : s.state, at: lost ? last : '', prefix: lost ? prefixKey(order, i) : undefined };
    }
  }
  const back = [...stops].reverse();
  visit([...back, ...stops, ...back, ...stops], MAX_TAIL / 4);
  w.leave();
  const s = w.status;
  if (s.state === 'lost') return { order, end: s.cause, at: last };
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

/**
 * The key an ending is known by: the steps through the i-th, and the next
 * one if it was on a timer (it came before things settled). Chapter 1's
 * orders have no timers, so theirs is just the pulls so far.
 */
function prefixKey(order: readonly string[], i: number): string {
  const next = order[i + 1];
  return [...order.slice(0, i + 1), next !== undefined && parseStep(next).wait !== null ? next : ''].join();
}

/** The orders the audit tries: all of them for a few pins, else the hint and a seeded sample. */
export function ordersFor(level: LevelDef): string[][] {
  const ids = level.pins.map((p) => p.id);
  if (level.pins.some((p) => p.gate)) return gatedOrders(level);
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

/**
 * For a level with gate pins: each order is a permutation of the pins, with
 * each gate, right after its pull, pushed back in after one of PUSH_BACKS
 * (or never). All of them if there are few, else the hint and a seeded sample.
 */
function gatedOrders(level: LevelDef): string[][] {
  const ids = level.pins.map((p) => p.id);
  const gates = level.pins.filter((p) => p.gate).map((p) => p.id);
  const build = (perm: readonly string[], backs: readonly (number | null)[]): string[] =>
    perm.flatMap((id) => {
      const d = backs[gates.indexOf(id)];
      return d === undefined || d === null ? [id] : [id, `${id}~${d}`];
    });
  const choices = (n: number): (number | null)[][] => (n === 0 ? [[]] : choices(n - 1).flatMap((c) => PUSH_BACKS.map((d) => [...c, d])));
  const total = permutations(ids).length * PUSH_BACKS.length ** gates.length;
  if (total <= FULL_GATED_UP_TO) return permutations(ids).flatMap((perm) => choices(gates.length).map((backs) => build(perm, backs)));
  const rng = createRng(ids.length * 7919 + gates.length * 104729 + level.id.length);
  const seen = new Set<string>([level.solution.join()]);
  const out: string[][] = [level.solution.slice()];
  while (out.length < SAMPLE) {
    const o = build(
      shuffled(ids, rng),
      gates.map(() => PUSH_BACKS[Math.floor(rng() * PUSH_BACKS.length)]!),
    );
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
  /** Distinct (pin, cause) lessons among the losses ('G↩:cause' for a gate pushed back in). */
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
    for (let k = 0; k < order.length - 1 && !known; k++) known = ended.get(prefixKey(order, k));
    const e = known ? { ...known, order } : playNoting(level, order);
    if (!known && e.prefix !== undefined) ended.set(e.prefix, e);
    endings.push(e);
  }
  const possible = endings.filter((e) => e.end !== 'blocked' && e.end !== 'jammed');
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
