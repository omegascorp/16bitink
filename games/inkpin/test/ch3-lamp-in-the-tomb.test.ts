import { describe, expect, it } from 'vitest';
import { LAMP_IN_THE_TOMB } from '../src/level/ch3/lampInTheTomb';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { inRooms } from '../src/logic/rooms';
import { World } from '../src/logic/world';
import { play } from './solver';

/** How an order ends: 'won', the loss cause, 'playing' (a dead end), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(LAMP_IN_THE_TOMB, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('Lamp in the Tomb', () => {
  it('is won by its hint: W douses the bowl, B opens the shaft once its dense gas has gone, A after the ledge, then C, K', () => {
    const r = play(LAMP_IN_THE_TOMB, LAMP_IN_THE_TOMB.solution);
    expect(r.possible).toBe(true);
    expect(r.status.state).toBe('won');
    const seconds = r.steps / STEPS_PER_SECOND;
    expect(seconds).toBeLessThan(120);
    expect(seconds).toBeGreaterThanOrEqual(25);
  });

  it('keeps to the grain budget', () => {
    expect(LAMP_IN_THE_TOMB.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it('starts with every grain inside the rooms', () => {
    const g = new World(LAMP_IN_THE_TOMB).grains;
    expect(g.count).toBe(LAMP_IN_THE_TOMB.fills.reduce((n, f) => n + f.count, 0));
    for (let i = 0; i < g.count; i++) expect(inRooms(LAMP_IN_THE_TOMB.rooms, g.x[i]!, g.y[i]!)).toBe(true);
  });

  it('is full size', () => {
    expect(LAMP_IN_THE_TOMB.view.h).toBeGreaterThanOrEqual(1000);
  });

  it('loses to the trap T wherever it is pulled: Nib walks into its lava (melted if the gold is already down)', () => {
    const hint = LAMP_IN_THE_TOMB.solution;
    for (const at of [0, 2, 4, 6]) expect(outcome([...hint.slice(0, at), 'T', ...hint.slice(at)])).toBe('burnt');
    expect(outcome([...hint.slice(0, 7), 'T', ...hint.slice(7)])).toBe('melted');
  });

  it.each([
    // The obvious order: B (nearest) first, the upper bowl still lit: the gas lights round Nib.
    [['B', 'W', '@410', '@750', 'C', 'K', 'A', '@620~0.5', '@960'], 'blasted'],
    // B without ever dousing the bowl.
    [['B', '@410', '@750', 'A', 'C', 'K', '@620~0.5', '@960'], 'blasted'],
    // Nib drops in with the gas: W, B, then the walk before the gas has gone.
    [['W', 'B', '@410~0', '@750', 'A', 'C', 'K', '@620~0.5', '@960'], 'gassed'],
    // C before the blast (every pin used, as a player would): C's water douses the lower bowl and lies on the cracked floor.
    [['W', 'B', '@410', '@750', 'C', 'A', 'K', 'T', '@620', '@960'], 'sealed'],
    [['W', 'B', '@410', '@750', 'C', 'K', 'A', 'T', '@620', '@960'], 'sealed'],
    // Never C: no water to set the pool, and Nib drops into the lava. Here K before C is the same fall of gold into hot lava.
    [['W', 'B', '@410', '@750', 'A', 'K', '@620~0.5', '@960'], 'melted'],
    // K before C: its gold falls into hot lava.
    [['W', 'B', '@410', '@750', 'A', 'K', 'C', '@620~0.5', '@960'], 'melted'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });
}, 300_000);
