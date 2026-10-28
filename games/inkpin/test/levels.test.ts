import { describe, expect, it } from 'vitest';
import { CELLAR } from '../src/level/cellar';
import type { Stop } from '../src/logic/level';
import { World } from '../src/logic/world';
import { createRng } from '../src/logic/rng';
import { play } from './solver';

describe('The Gold Vault', () => {
  /** A shuffled pull order, the same every run. */
  const shuffled = (seed: number): string[] => {
    const rng = createRng(seed);
    const ids = CELLAR.pins.map((p) => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    }
    return ids;
  };
  const runs = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => play(CELLAR, shuffled(seed)));

  it('the hint’s order wins', () => {
    expect(play(CELLAR, CELLAR.solution).status.state).toBe('won');
  });

  it('is not won by pulling at random: most orders lose', () => {
    const wins = runs.filter((r) => r.status.state === 'won');
    expect(wins.length / runs.length).toBeLessThan(0.3);
  });

  it('every order ends the level, one way or the other', () => {
    expect(runs.every((r) => !r.possible || r.status.state !== 'playing')).toBe(true);
  });

  it('loses the obvious ways', () => {
    const cause = (order: string[]): string | undefined => {
      const s = play(CELLAR, order).status;
      return s.state === 'lost' ? s.cause : undefined;
    };
    // The gold into the moat before the water has made it stone.
    expect(cause(['C1', 'W1'])).toBe('melted');
    // The vault's lava before its water: it spills over the seed, and Nib waiting by it.
    expect(cause(['W1', 'C1', 'L2', 'W2', 'G1', 'B3', 'G2', 'C3', 'L', 'W', 'C'])).toBe('burnt');
  });
}, 120_000);

describe('the treasure', () => {
  /** Pulls the given order with the given waits, walking Nib along the stops (and up the vine) after each pull, and back. */
  const visit = (order: readonly string[], waits: readonly number[]): World => {
    const w = new World(CELLAR);
    const stops = CELLAR.stops ?? [];
    const walk = (list: readonly Stop[]): void => {
      for (const s of list) {
        w.command(s.y === undefined ? { kind: 'goto', x: s.x } : { kind: 'goto', x: s.x, y: s.y });
        for (let s = 0; s < 1500 && !w.finished; s++) {
          w.step();
          if (w.nibOrder.kind === 'stay') break;
        }
      }
    };
    order.forEach((id, i) => {
      w.pull(id);
      for (let s = 0; s < waits[i]!; s++) w.step();
      walk(stops);
    });
    walk([...stops].reverse());
    return w;
  };

  it('stays open after the goal, so the rest of the gold can be picked up, until Nib leaves', () => {
    const w = visit(CELLAR.solution, CELLAR.solution.map(() => 500));
    expect(w.goalMet).toBe(true);
    expect(w.coinsCollected).toBeGreaterThan(CELLAR.coinsNeeded);
    if (!w.finished) {
      expect(w.leave()).toBe(true);
    }
    expect(w.status.state).toBe('won');
  });

  it('cannot be left before the goal', () => {
    const w = new World(CELLAR);
    expect(w.leave()).toBe(false);
    expect(w.status.state).toBe('playing');
  });

  // However long the player waits between pulls, lava never burns the vine
  // to the chest and no gold is left stuck where Nib can't reach it.
  const timings: [string[], number][] = [
    [CELLAR.solution.slice(), 300],
    [CELLAR.solution.slice(), 1000],
    [['W1', 'C1', 'L2', 'W2', 'G1', 'B3', 'G2', 'W', 'C3', 'L', 'C'], 400],
  ];
  it.each(timings)('reaches the chest and nearly every coin: %j, %i steps between pulls', (order, wait) => {
    const w = visit(order, order.map(() => wait));
    expect(w.chestTaken).toBe(true);
    expect(w.coinsCollected).toBeGreaterThanOrEqual(w.coinsTotal - 20);
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
    // The vault's gold pin slides out through the lava's.
    const w = new World(CELLAR);
    expect(w.pull('C')).toBe(false);
    w.step();
    expect(w.events).toContainEqual({ type: 'blocked', id: 'C', by: 'L' });
    expect(w.pull('L')).toBe(true);
    expect(w.pull('C')).toBe(true);
  });

  it('pins that only touch at their tips do not block each other', () => {
    // The moat's water and gold pins overlap at their tips and slide apart.
    const w = new World(CELLAR);
    expect(w.pull('C1')).toBe(true);
    expect(w.pull('W1')).toBe(true);
  });
});

describe('Blots', () => {
  it('patrol back and forth while Nib is out of sight', () => {
    // A boar on the porcupine hall's floor, far from Nib.
    const w = new World({ ...CELLAR, blots: [{ x: 700, y: 1150 }] });
    const blot = w.blots[0]!;
    let lo = blot.x;
    let hi = blot.x;
    let turns = 0;
    let facing = blot.facing;
    for (let s = 0; s < 3000; s++) {
      w.step();
      lo = Math.min(lo, blot.x);
      hi = Math.max(hi, blot.x);
      if (blot.facing !== facing) turns++;
      facing = blot.facing;
    }
    expect(hi - lo).toBeGreaterThan(150);
    expect(turns).toBeGreaterThanOrEqual(2);
    expect(w.status.state).toBe('playing');
  });

  /** Drops Nib from above straight onto the first guard. */
  const dropOnGuard = (level: typeof CELLAR): World => {
    const w = new World(level);
    const blot = w.blots[0]!;
    w.nib.x = blot.x;
    w.nib.y = blot.y - 90;
    w.nib.vy = 0;
    for (let s = 0; s < 200 && !w.finished && !blot.gone; s++) w.step();
    return w;
  };

  it('is stomped flat when Nib lands on its head, and Nib bounces off', () => {
    const smooth = { ...CELLAR, blots: CELLAR.blots.map((b) => ({ ...b, spiky: false })) };
    const w = dropOnGuard(smooth);
    expect(w.blots[0]!.gone).toBe('stomped');
    expect(w.status.state).toBe('playing');
    expect(w.nib.vy).toBeLessThan(0);
  });

  it('can’t be stomped when it has spikes', () => {
    const spiky = { ...CELLAR, blots: CELLAR.blots.map((b) => ({ ...b, spiky: true })) };
    const w = dropOnGuard(spiky);
    expect(w.blots[0]!.gone).toBe(null);
    expect(w.status).toEqual({ state: 'lost', cause: 'pricked' });
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
