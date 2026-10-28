import { describe, expect, it } from 'vitest';
import { STAIR } from '../src/level/stair';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { play } from './solver';

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[], patient = false): string => {
  const r = play(STAIR, order, patient);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/** Pulls the pins in order, letting each settle, with Nib kept in its room: the world after. */
const pullAll = (order: readonly string[]): World => {
  const w = new World(STAIR);
  for (const id of order) {
    w.pull(id);
    for (let s = 0; s < 1500; s++) w.step();
  }
  return w;
};

/** The crates (the level has no boulders): the bridge, the well's raft, the porcupine's. */
const BRIDGE = 0;
const RAFT = 1;
const SQUASH = 2;

describe('The Flooded Stair, wide', () => {
  it('is won by its hint, and takes the bot at least a minute', () => {
    const r = play(STAIR, STAIR.solution);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeGreaterThanOrEqual(60);
  });

  it('keeps to the grain budget', () => {
    expect(STAIR.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  // The signature: the flood carries the first crate down into the slot and lifts the well's crate; the last one squashes the porcupine.
  it('rides the crates down the flood', () => {
    const w = pullAll(['W', 'X']);
    const bridge = w.boulders[BRIDGE]!;
    expect(bridge.x).toBeGreaterThan(608);
    expect(bridge.x).toBeLessThan(664);
    expect(bridge.y).toBeGreaterThan(820);
    const raft = w.boulders[RAFT]!;
    expect(raft.y).toBeLessThan(STAIR.crates![RAFT]!.y - 80);
    expect(raft.y - raft.r).toBeLessThan(900 - 8 + 30);
    expect(w.boulders[SQUASH]!.y).toBeGreaterThan(860);
    expect(w.blots[0]!.gone).toBe('stomped');
  });

  it('is won with the porcupine squashed first, too', () => {
    expect(outcome(['X', 'W', 'N'])).toBe('won');
  });

  // Nib's door first: Nib goes on ahead of the flood, down into the dry well, and the flood floats it on into the porcupine.
  it('loses Nib when the door opens first', () => {
    expect(['pricked', 'inked', 'crushed']).toContain(outcome(['N', 'W', 'X']));
  });

  // Nib's door before the porcupine's crate: Nib crosses the stair and walks into the porcupine.
  it('sends Nib into the porcupine before its crate falls', () => {
    expect(['pricked', 'inked']).toContain(outcome(['W', 'N', 'X']));
  });
}, 300_000);
