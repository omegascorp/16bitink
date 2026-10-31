import { describe, expect, it } from 'vitest';
import { STONE_BRIDGE } from '../src/level/ch2/stoneBridge';
import type { Stop } from '../src/logic/level';
import { inRooms } from '../src/logic/rooms';
import { COIN, LAVA, STEPS_PER_SECOND, STONE } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { audit } from './audit';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(STONE_BRIDGE, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/** The river's end: the raft docks against it. */
const DOCK_X = 1180;

interface Watch {
  readonly won: boolean;
  readonly seconds: number;
  readonly ends: string[];
  /** Where the raft was, and the gold on its deck, once the lava had come. */
  readonly raftX: number;
  readonly cargo: number;
  /** Stone in the gap once it was cooled, and hot lava left in the river below it. */
  readonly bridge: number;
  readonly river: number;
}

/** Plays the hint step for step the way the bot does (test/solver.ts's play), noting what each stage left. */
function watchSolution(): Watch {
  const w = new World(STONE_BRIDGE);
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const stops = STONE_BRIDGE.stops ?? [];
  const visit = (list: readonly Stop[], steps: number): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command(s.y === undefined ? { kind: 'goto', x: s.x } : { kind: 'goto', x: s.x, y: s.y });
      run(steps);
    }
  };
  const count = (kind: number, test: (x: number, y: number) => boolean): number => {
    const g = w.grains;
    let n = 0;
    for (let i = 0; i < g.count; i++) if (g.kind[i] === kind && test(g.x[i]!, g.y[i]!)) n++;
    return n;
  };
  const raft = w.boulders.find((b) => b.raft)!;
  let raftX = 0;
  let cargo = 0;
  let bridge = 0;
  let river = 0;
  for (const id of STONE_BRIDGE.solution) {
    w.pull(id);
    run(STEPS_PER_SECOND * 8);
    visit(stops, STEPS_PER_SECOND * 8);
    if (id === 'L') {
      raftX = raft.x;
      cargo = count(COIN, (x, y) => Math.abs(x - raft.x) < raft.hw && y < raft.y);
    }
    if (id === 'W') {
      bridge = count(STONE, (x, y) => x > 380 && x < 600 && y < 900);
      river = count(LAVA, (x, y) => x > 608 && x < DOCK_X && y > 860);
    }
  }
  const back = [...stops].reverse();
  visit([...back, ...stops, ...back, ...stops], (STEPS_PER_SECOND * 25) / 4);
  w.leave();
  return { won: w.status.state === 'won', seconds: w.steps / STEPS_PER_SECOND, ends: w.blots.map((b) => b.gone ?? 'alive'), raftX, cargo, bridge, river };
}

describe('The Stone Bridge', () => {
  it('opens at rest, with every grain inside the rooms and the gold on the raft', () => {
    const w = new World(STONE_BRIDGE);
    expect(w.status.state).toBe('playing');
    expect(w.coinsTotal).toBe(STONE_BRIDGE.coinsNeeded);
    const g = w.grains;
    const outside: string[] = [];
    for (let i = 0; i < g.count; i++) if (!inRooms(STONE_BRIDGE.rooms, g.x[i]!, g.y[i]!)) outside.push(`${g.x[i]!.toFixed(0)},${g.y[i]!.toFixed(0)}`);
    expect(outside).toEqual([]);
    const raft = w.boulders.find((b) => b.raft)!;
    let onDeck = 0;
    for (let i = 0; i < g.count; i++) if (g.kind[i] === COIN && Math.abs(g.x[i]! - raft.x) < raft.hw && g.y[i]! < raft.y) onDeck++;
    expect(onDeck).toBe(3);
  });

  it('keeps to the grain budget', () => {
    expect(STONE_BRIDGE.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it('is won by its hint in a minute or more: the lava bridges the gap, ferries the gold and clears the hall', () => {
    const r = watchSolution();
    expect(r.won).toBe(true);
    expect(r.seconds).toBeGreaterThanOrEqual(60);
    // Both armadillos scorched: the one in the gap by the pour, the one in the hall by the overflow.
    expect(r.ends).toEqual(['scorched', 'scorched']);
    // The spill carried the raft and all three coins to the dock.
    expect(r.raftX).toBeGreaterThan(DOCK_X - 60);
    expect(r.cargo).toBe(3);
    // The cistern set the gap to stone, and the river under the slot stayed hot.
    expect(r.bridge).toBeGreaterThan(150);
    expect(r.river).toBeGreaterThan(150);
  }, 240_000);

  it.each([
    // Nib let out first: he drops into the empty gap, onto the armadillo's spikes.
    [['G', 'L', 'W', 'K'], 'pricked'],
    // Nib let out onto the hot pool before it is cooled.
    [['L', 'G', 'W', 'K'], 'burnt'],
    // Cooled too early: the lava lands on the cistern's water, stone tumbles down the slot with
    // the spill, the river sets around the raft, and its gold never reaches the dock.
    [['W', 'L', 'K', 'G'], 'melted'],
    // The hall's gold before the lava: the armadillo still pacing there kicks it down the drain.
    [['K', 'L', 'W', 'G'], 'drained'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  }, 240_000);

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(STONE_BRIDGE))), 3_600_000);
});
