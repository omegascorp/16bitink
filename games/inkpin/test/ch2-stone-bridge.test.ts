import { describe, expect, it } from 'vitest';
import { STONE_BRIDGE } from '../src/level/ch2/stoneBridge';
import { inRooms } from '../src/logic/rooms';
import { COIN, STEPS_PER_SECOND, STONE } from '../src/logic/particles';
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
  /** Where the raft lay, and the gold on its deck, once the sluice was open and the bridge poured. */
  readonly raftX: number;
  readonly cargo: number;
  /** Stone in the gap once it was cooled. */
  readonly bridge: number;
}

/** Plays the hint with the bot (test/solver.ts's play), noting what the stage before the hall's gold left. */
function watchSolution(): Watch {
  let raftX = 0;
  let cargo = 0;
  let bridge = 0;
  const r = play(STONE_BRIDGE, STONE_BRIDGE.solution, false, (w, i) => {
    if (i !== 3) return;
    const g = w.grains;
    const raft = w.boulders.find((b) => b.raft)!;
    raftX = raft.x;
    for (let n = 0; n < g.count; n++) {
      const x = g.x[n]!;
      const y = g.y[n]!;
      if (g.kind[n] === COIN && Math.abs(x - raft.x) < raft.hw && y < raft.y) cargo++;
      if (g.kind[n] === STONE && x > 380 && x < 600 && y < 900) bridge++;
    }
  });
  return { won: r.status.state === 'won', seconds: r.steps / STEPS_PER_SECOND, ends: [], raftX, cargo, bridge };
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

  it('is won by its hint in a minute or more: the lava bridges the gap, the sluice lets it ferry the gold and clear the hall', () => {
    const r = watchSolution();
    expect(r.won).toBe(true);
    expect(r.seconds).toBeLessThan(120);
    expect(r.seconds).toBeLessThanOrEqual(120);
    // The raft docked at the river's end with all three coins on its deck.
    expect(r.raftX).toBeGreaterThan(DOCK_X - 60);
    expect(r.cargo).toBe(3);
    // The cistern set the gap to stone.
    expect(r.bridge).toBeGreaterThan(150);
  }, 240_000);

  it('is won with the sluice opened first, too', () => {
    expect(outcome(['P', 'L', 'W', 'K~30', 'G'])).toBe('won');
  }, 240_000);

  it.each([
    // The obvious order: Nib let out first drops into the empty gap, onto the armadillo's spikes.
    [['G', 'L', 'W', 'P', 'K'], 'inked'],
    // Nib let out onto the hot pool before it is cooled.
    [['L', 'G', 'P', 'W', 'K'], 'burnt'],
    // Looks right through three pulls: the lava, the sluice, the cistern are all done, but Nib
    // goes out to the raft while the river is still hot.
    [['L', 'W', 'P', 'G', 'K'], 'burnt'],
    // The gold dropped into the hall while the lava is still on its way: it melts.
    [['L', 'P', 'K', 'W', 'G'], 'melted'],
    // Cooled too early: the lava lands on the cistern's water, stone tumbles down the slot with
    // the spill, and the gold on the raft is lost.
    [['W', 'L', 'P', 'K~30', 'G'], 'drained'],
    // The hall's gold before the lava: the armadillo still pacing there kicks it down the drain.
    [['K', 'L', 'P', 'W', 'G'], 'drained'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  }, 240_000);

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(STONE_BRIDGE))), 3_600_000);
});
