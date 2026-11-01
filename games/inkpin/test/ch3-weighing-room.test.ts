import { describe, expect, it } from 'vitest';
import { WEIGHING_ROOM } from '../src/level/ch3/weighingRoom';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { play } from './solver';

/** How an order ends: 'won', the loss cause, 'playing' (a dead end), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(WEIGHING_ROOM, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('The Weighing Room', () => {
  it('is won by its hint: the water weighs the pan, the hatch, the gold and the gas, the drop, the second gold', () => {
    const r = play(WEIGHING_ROOM, WEIGHING_ROOM.solution);
    expect(r.possible).toBe(true);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeLessThan(120);
  });

  it('keeps to the grain budget', () => {
    expect(WEIGHING_ROOM.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it('is full size', () => {
    expect(WEIGHING_ROOM.view.w).toBeGreaterThanOrEqual(1300);
  });

  it.each([
    // The gold first (the tempting pull): it weighs the pan and shuts the sluice; once Nib takes it, A drops.
    [['X', 'W', 'H', 'S', '@860', 'K', '@1310', 'D'], 'sealed'],
    // K's gold first: the same weighing.
    [['K', 'W', 'H', 'S', 'X', '@860', '@1310', 'D'], 'sealed'],
    // Nib first (the nearest pin): he weighs the dry pan himself and the water never comes in.
    [['S', 'W', 'H', 'X', '@860', 'K', '@1310', 'D'], 'sealed'],
    // The gas before the hatch: it pools under H and leaks out of the cracked nook; the bar stands.
    [['W', 'X', 'H', 'S', '@860', 'K', '@1310', 'D'], 'sealed'],
    // The trap early: the bowl goes out, and its basin's plate drops the chest's door.
    [['D', 'W', 'H', 'S', 'X', '@860', 'K', '@1310'], 'sealed'],
    // The trap after the blast: its basin's plate still drops the chest's door.
    [['W', 'H', 'S', 'X', '@860', 'K', 'D', '@1310'], 'sealed'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  it('wins with W and H either way round', () => {
    expect(outcome(['H', 'W', 'S', 'X', '@860', 'K', '@1310'])).toBe('won');
  });
}, 300_000);
