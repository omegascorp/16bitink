import { describe, expect, it } from 'vitest';
import { STAIR } from '../src/level/stair';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { play } from './solver';

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(STAIR, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/** Pulls the pins in order, letting each settle, with Nib kept in his room: the world after. */
const pullAll = (order: readonly string[]): World => {
  const w = new World(STAIR);
  for (const id of order) {
    w.pull(id);
    for (let s = 0; s < 1500; s++) w.step();
  }
  return w;
};

/** The bodies: the boulder first, then the crates (the bridge, the well's raft). */
const BOULDER = 0;
const BRIDGE = 1;
const RAFT = 2;

describe('The Flooded Stair, wide', () => {
  it('is won by its hint, and takes the bot at least a minute', () => {
    const r = play(STAIR, STAIR.solution);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeGreaterThanOrEqual(60);
  });

  it('keeps to the grain budget', () => {
    expect(STAIR.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  // The flood carries the first crate down into the slot and lifts the well's crate; the far ledge stays dry beyond the curb.
  it('rides the crates down the flood', () => {
    const w = pullAll(['W']);
    const bridge = w.boulders[BRIDGE]!;
    expect(bridge.x).toBeGreaterThan(608);
    expect(bridge.x).toBeLessThan(664);
    expect(bridge.y).toBeGreaterThan(820);
    const raft = w.boulders[RAFT]!;
    expect(raft.y).toBeLessThan(STAIR.crates![1]!.y - 80);
    expect(raft.y - raft.r).toBeLessThan(900 - 8 + 30);
    const g = w.grains;
    let wetPit = 0;
    for (let i = 0; i < g.count; i++) if (g.kind[i] === 1 && g.x[i]! > 1120) wetPit++;
    expect(wetPit).toBe(0);
  });

  // The boulder run: down the run onto the shaft's pin, into the pit onto the trapdoor, and through it onto the porcupine.
  it('runs the boulder down to the porcupine, one floor at a time', () => {
    const w = pullAll(['B']);
    const b = w.boulders[BOULDER]!;
    expect(b.x).toBeGreaterThan(1300);
    expect(b.x).toBeLessThan(1365);
    expect(b.y).toBeLessThan(960);
    w.pull('K');
    for (let s = 0; s < 1500; s++) w.step();
    expect(b.y).toBeGreaterThan(1000);
    expect(b.y).toBeLessThan(1060);
    expect(w.blots[0]!.gone).toBe(null);
    w.pull('D');
    for (let s = 0; s < 1500; s++) w.step();
    expect(w.blots[0]!.gone).toBe('stomped');
    expect(b.y).toBeGreaterThan(1100);
  });

  it('is won with the trapdoor open before the boulder comes down, too', () => {
    expect(outcome(['B', 'D', 'K', 'W', 'N', 'G', 'H'])).toBe('won');
  });

  it.each([
    // Flood and door first: Nib walks down into the pit and waits right under the shaft, and the boulder comes down on him.
    [['W', 'N', 'B', 'K', 'H', 'D', 'G'], 'crushed'],
    // The same with the shaft opened first: the boulder rolls down the run and straight down the shaft onto him.
    [['W', 'N', 'K', 'B', 'H', 'D', 'G'], 'crushed'],
    // Nib's door before the flood changes nothing: he waits in the dry well, rides the raft up, and is in the pit when the boulder comes.
    [['N', 'W', 'B', 'K', 'H', 'D', 'G'], 'crushed'],
    // The trapdoor with Nib on it and the boulder still up in the shaft: Nib drops onto the porcupine.
    [['B', 'W', 'N', 'D', 'K', 'H', 'G'], 'pricked'],
    // The tempting lava tank over the porcupine: its lava pools on the trapdoor, round the boulder, and Nib walks down into it.
    [['B', 'K', 'L', 'W', 'N', 'H', 'D', 'G'], 'burnt'],
    // The lava with the gold already in the pit: it melts.
    [['H', 'L', 'B', 'K', 'W', 'N', 'D', 'G'], 'melted'],
    // The lava through the open trapdoor: it gets the porcupine, but runs on down onto the gold below the pen.
    [['B', 'K', 'D', 'G', 'L', 'W', 'N', 'H'], 'melted'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });
}, 900_000);
