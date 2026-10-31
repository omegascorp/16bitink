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
/**
 * When the audit pushes a gate back in after pulling it: never, or this many
 * seconds after the pull. Each gate also tries the solution's own wait for
 * it, and half and twice that (see pushBacksFor).
 */
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
  /** For a loss: true when it came after the order's second tap or later (not on its first). */
  readonly late?: boolean;
  /** Taps made when it ended, and the steps it took (for the lab's deepest wrong orders). */
  readonly taps?: number;
  readonly steps?: number;
  /** For 'stuck': true when things were still moving at the end (a timeout, 'playing'), not settled. */
  readonly playing?: boolean;
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
  let taps = 0;
  const late = (): boolean => taps >= 2;
  for (let i = 0; i < steps.length; i++) {
    const { id, wait, walk } = steps[i]!;
    if (wait !== null) for (let s = Math.round(wait * STEPS_PER_SECOND); s > 0 && !w.finished; s--) w.step();
    if (walk !== undefined && !w.finished) {
      w.command({ kind: 'goto', x: walk });
      run(MAX_WAIT);
    } else if (!w.finished) {
      const pin = w.pins.find((p) => p.def.id === id);
      const pushing = pin?.def.gate === true && pin.pulledAt !== null;
      if (!w.tap(id)) return { order, end: pushing ? 'jammed' : 'blocked', at: id, prefix: prefixKey(order, i) };
      last = pushing ? `${id}↩` : id;
      taps++;
      const next = steps[i + 1];
      if (next?.wait != null) continue;
      run(MAX_WAIT);
      visit(stops, MAX_WAIT);
    }
    if (w.finished) {
      const s = w.status;
      const lost = s.state === 'lost';
      return { order, end: lost ? s.cause : s.state, at: lost ? last : '', prefix: lost ? prefixKey(order, i) : undefined, late: lost && late(), taps, steps: w.steps };
    }
  }
  const back = [...stops].reverse();
  visit([...back, ...stops, ...back, ...stops], MAX_TAIL / 4);
  w.leave();
  const s = w.status;
  if (s.state === 'lost') return { order, end: s.cause, at: last, late: late(), taps, steps: w.steps };
  return { order, end: s.state === 'won' ? 'won' : 'stuck', at: '', playing: s.state !== 'won' && w.calm < 20 };
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

/**
 * The solution's walk steps ('@x'), each with how many pins the solution
 * has pulled before it: the audit keeps them there in every order it tries.
 */
function walksOf(level: LevelDef): { readonly step: string; readonly after: number }[] {
  const pulled = new Set<string>();
  const out: { step: string; after: number }[] = [];
  for (const s of level.solution) {
    const st = parseStep(s);
    if (st.walk !== undefined) out.push({ step: s, after: pulled.size });
    else pulled.add(st.id);
  }
  return out;
}

/** Puts the solution's walks into an order, each after as many first pulls as in the solution. */
function withWalks(order: readonly string[], walks: ReturnType<typeof walksOf>): string[] {
  if (!walks.length) return order.slice();
  const out: string[] = [];
  const pulled = new Set<string>();
  const place = (): void => {
    for (const w of walks) if (w.after === pulled.size && !out.includes(w.step)) out.push(w.step);
  };
  place();
  for (const s of order) {
    out.push(s);
    const { id } = parseStep(s);
    if (!pulled.has(id)) {
      pulled.add(id);
      place();
    }
  }
  for (const w of walks) if (!out.includes(w.step)) out.push(w.step);
  return out;
}

/** The orders the audit tries: all of them for a few pins, else the hint and a seeded sample; the solution's walks stay in place. */
export function ordersFor(level: LevelDef): string[][] {
  const walks = walksOf(level);
  const hint = level.solution.join();
  return pinOrders(level).map((o) => (o.join() === hint ? o : withWalks(o, walks)));
}

function pinOrders(level: LevelDef): string[][] {
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
  const backsOf = gates.map((g) => pushBacksFor(level, g));
  const build = (perm: readonly string[], backs: readonly (number | null)[]): string[] =>
    perm.flatMap((id) => {
      const d = backs[gates.indexOf(id)];
      return d === undefined || d === null ? [id] : [id, `${id}~${d}`];
    });
  const choices = (n: number): (number | null)[][] => (n === 0 ? [[]] : choices(n - 1).flatMap((c) => backsOf[n - 1]!.map((d) => [...c, d])));
  const total = permutations(ids).length * backsOf.reduce((n, b) => n * b.length, 1);
  if (total <= FULL_GATED_UP_TO) return permutations(ids).flatMap((perm) => choices(gates.length).map((backs) => build(perm, backs)));
  const rng = createRng(ids.length * 7919 + gates.length * 104729 + level.id.length);
  const seen = new Set<string>([level.solution.join()]);
  const out: string[][] = [level.solution.slice()];
  while (out.length < SAMPLE) {
    const o = build(
      shuffled(ids, rng),
      backsOf.map((b) => b[Math.floor(rng() * b.length)]!),
    );
    if (!seen.has(o.join())) {
      seen.add(o.join());
      out.push(o);
    }
  }
  return out;
}

/** A gate's push-back delays: PUSH_BACKS, plus each wait the solution pushes it back after, and half and twice that. */
export function pushBacksFor(level: LevelDef, gate: string): (number | null)[] {
  const out = new Set<number | null>(PUSH_BACKS);
  let pulled = false;
  for (const s of level.solution) {
    const { id, wait } = parseStep(s);
    if (id !== gate) continue;
    if (pulled && wait !== null) for (const d of [wait / 2, wait, wait * 2]) out.add(Math.round(d * 100) / 100);
    pulled = !pulled;
  }
  return [...out];
}

/** The pin's midpoint. */
export const mid = (p: LevelDef['pins'][number]): { x: number; y: number } => ({ x: (p.ax + p.bx) / 2, y: (p.ay + p.by) / 2 });

/**
 * The two orders a reader tries first: the pins nearest Nib's start first
 * (by distance to each pin's midpoint), and left to right (by midpoint x).
 * With gates, each gate is pushed back in as the solution does it (its push
 * step, with its wait, right after the pull). The solution's walks stay in place.
 */
/** An order that taps the pins in this order, each gate pushed back as the solution does it, with the solution's walks in place. */
export function orderOf(level: LevelDef, pins: readonly LevelDef['pins'][number][]): string[] {
  const pushOf = new Map<string, string>();
  const out = new Set<string>();
  for (const s of level.solution) {
    const { id } = parseStep(s);
    if (!level.pins.find((p) => p.id === id)?.gate) continue;
    if (out.has(id)) {
      pushOf.set(id, s);
      out.delete(id);
    } else out.add(id);
  }
  return withWalks(pins.flatMap((p) => (pushOf.has(p.id) ? [p.id, pushOf.get(p.id)!] : [p.id])), walksOf(level));
}

export function obviousOrders(level: LevelDef): { readonly nearest: string[]; readonly leftToRight: string[] } {
  const d = (p: LevelDef['pins'][number]): number => Math.hypot(mid(p).x - level.nib.x, mid(p).y - level.nib.y);
  return {
    nearest: orderOf(level, [...level.pins].sort((x, y) => d(x) - d(y))),
    leftToRight: orderOf(level, [...level.pins].sort((x, y) => mid(x).x - mid(y).x)),
  };
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
  /** The share of losses that came on the order's second tap or later (not on its first). */
  readonly lateLossShare: number;
  /** Of the orders whose pins could all come out: those still moving at the end (timeouts), a part of stuckShare. */
  readonly playingShare: number;
  /** The first five orders ending stuck (settled) and playing (timed out). */
  readonly deadEnds: { readonly stuck: readonly string[]; readonly playing: readonly string[] };
  /** The three losses that came at the latest tap: order, tap index, cause, time (steps). */
  readonly deepest: readonly { readonly order: string; readonly tap: number; readonly end: string; readonly steps: number }[];
  /** How the two orders a reader tries first end (see obviousOrders): 'won', a loss cause, 'stuck', 'blocked' or 'jammed'. */
  readonly obvious: { readonly nearest: string; readonly leftToRight: string };
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
  const obv = obviousOrders(level);
  return {
    id: level.id,
    pins: level.pins.length,
    tried: endings.length,
    winShare: possible.length ? possible.filter((e) => e.end === 'won').length / possible.length : 0,
    blockedShare: (endings.length - possible.length) / endings.length,
    stuckShare: possible.length ? possible.filter((e) => e.end === 'stuck').length / possible.length : 0,
    lessons,
    topLessonShare: losses.length ? top / losses.length : 0,
    lateLossShare: losses.length ? losses.filter((e) => e.late).length / losses.length : 0,
    obvious: { nearest: playNoting(level, obv.nearest).end, leftToRight: playNoting(level, obv.leftToRight).end },
    playingShare: possible.length ? possible.filter((e) => e.end === 'stuck' && e.playing).length / possible.length : 0,
    deadEnds: {
      stuck: possible.filter((e) => e.end === 'stuck' && !e.playing).slice(0, 5).map((e) => e.order.join()),
      playing: possible.filter((e) => e.end === 'stuck' && e.playing).slice(0, 5).map((e) => e.order.join()),
    },
    deepest: [...losses]
      .sort((a, b) => (b.taps ?? 0) - (a.taps ?? 0) || (b.steps ?? 0) - (a.steps ?? 0))
      .slice(0, 3)
      .map((e) => ({ order: e.order.join(), tap: e.taps ?? 0, end: e.end, steps: e.steps ?? 0 })),
  };
}
