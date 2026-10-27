import { describe, expect, it } from 'vitest';
import { CELLAR } from '../src/level/cellar';
import { World } from '../src/logic/world';
import { permutations, play } from './solver';

describe('The Gold Vault', () => {
  const orders = permutations(CELLAR.pins.map((p) => p.id));
  const runs = orders.map((order) => play(CELLAR, order));
  const wins = runs.filter((r) => r.status.state === 'won');

  it('can be won, and the hint’s order wins', () => {
    expect(wins.length).toBeGreaterThan(0);
    expect(play(CELLAR, CELLAR.solution).status.state).toBe('won');
  });

  it('is not won by pulling at random: most orders lose', () => {
    expect(wins.length / runs.length).toBeLessThan(0.3);
  });

  it('every order ends the level, one way or the other', () => {
    expect(runs.every((r) => r.status.state !== 'playing')).toBe(true);
  });

  it('loses the obvious ways', () => {
    const cause = (order: string[]): string | undefined => {
      const s = play(CELLAR, order).status;
      return s.state === 'lost' ? s.cause : undefined;
    };
    expect(cause(['gate', 'W', 'L', 'C'])).toBe('inked');
    expect(cause(['C', 'W', 'L', 'gate'])).toBe('melted');
    expect(cause(['L', 'gate', 'W', 'C'])).toBe('burnt');
  });
}, 120_000);

describe('the simulation', () => {
  it('is deterministic: the same pulls give the same world', () => {
    const run = (): string => {
      const w = new World(CELLAR);
      for (const id of ['W', 'L']) {
        w.pull(id);
        for (let s = 0; s < 400; s++) w.step();
      }
      const g = w.grains;
      let sum = 0;
      for (let i = 0; i < g.count; i++) sum += g.x[i]! * 3 + g.y[i]! * 7 + g.kind[i]!;
      return `${g.count}:${sum.toFixed(6)}`;
    };
    expect(run()).toBe(run());
  });

  it('opens a level at rest, with its coins asleep', () => {
    const w = new World(CELLAR);
    const g = w.grains;
    let coins = 0;
    let asleep = 0;
    for (let i = 0; i < g.count; i++) {
      if (g.kind[i] !== 3) continue;
      coins++;
      if (g.set[i]) asleep++;
    }
    expect(asleep / coins).toBeGreaterThan(0.9);
  });
});

describe('pins', () => {
  it('a pin in the way stops another pin sliding out, until it is pulled itself', () => {
    // The gate pulled upwards would slide into the water pin.
    const upward = { ...CELLAR, pins: CELLAR.pins.map((p) => (p.id === 'gate' ? { ...p, ay: 966, by: 1138 } : p)) };
    const w = new World(upward);
    expect(w.pull('gate')).toBe(false);
    w.step();
    expect(w.events).toContainEqual({ type: 'blocked', id: 'gate', by: 'W' });
    expect(w.pull('W')).toBe(true);
    expect(w.pull('gate')).toBe(true);
  });

  it('pins that only touch at their tips do not block each other', () => {
    const w = new World(CELLAR);
    expect(w.pull('W')).toBe(true);
    expect(w.pull('L')).toBe(true);
  });
});

describe('Nib', () => {
  it('walks only when told, and jumps off the ground', () => {
    const w = new World(CELLAR);
    const x0 = w.nib.x;
    for (let s = 0; s < 60; s++) w.step();
    expect(Math.abs(w.nib.x - x0)).toBeLessThan(1);
    w.command({ kind: 'walk', dir: -1 });
    for (let s = 0; s < 60; s++) w.step();
    expect(w.nib.x).toBeLessThan(x0 - 10);
    w.command({ kind: 'stay' });
    for (let s = 0; s < 30; s++) w.step();
    const ground = w.nib.y;
    expect(w.jump()).toBe(true);
    let top = ground;
    for (let s = 0; s < 150; s++) {
      w.step();
      top = Math.min(top, w.nib.y);
    }
    expect(ground - top).toBeGreaterThan(35);
    expect(Math.abs(w.nib.y - ground)).toBeLessThan(2);
  });
});
