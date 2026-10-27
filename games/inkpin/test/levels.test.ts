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
    // Gate first drops Nib into the pit: on the boar's head (a stomp) or into its path, and then the lava.
    expect(['inked', 'burnt']).toContain(cause(['gate', 'W', 'L', 'C']));
    expect(cause(['C', 'W', 'L', 'gate'])).toBe('melted');
    expect(cause(['L', 'gate', 'W', 'C'])).toBe('burnt');
  });
}, 120_000);

describe('the treasure', () => {
  /** Pulls a winning order with the given waits, then walks Nib across the room and back. */
  const visit = (order: readonly string[], waits: readonly number[]): World => {
    const w = new World(CELLAR);
    order.forEach((id, i) => {
      w.pull(id);
      for (let s = 0; s < waits[i]!; s++) w.step();
    });
    for (const x of [650, 60, 650]) {
      w.command({ kind: 'goto', x });
      for (let s = 0; s < 1200 && !w.finished; s++) {
        w.step();
        if (w.nibOrder.kind === 'stay') break;
      }
    }
    return w;
  };

  it('stays open after the goal, so the rest of the gold can be picked up, until Nib leaves', () => {
    const w = visit(CELLAR.solution, [500, 500, 500, 500]);
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

  // However long the player waits between pulls, lava never walls off the
  // chest and no gold is left stuck where Nib can't reach it.
  const timings: [string[], number[]][] = [
    [['L', 'W', 'C', 'gate'], [293, 296, 994, 348]],
    [['W', 'L', 'C', 'gate'], [1069, 382, 393, 1115]],
    [['W', 'L', 'C', 'gate'], [604, 397, 1004, 1000]],
    [['L', 'W', 'C', 'gate'], [250, 700, 300, 250]],
    [['W', 'L', 'C', 'gate'], [300, 300, 300, 300]],
  ];
  it.each(timings)('reaches the chest and nearly every coin: %j after %j steps', (order, waits) => {
    const w = visit(order, waits);
    expect(w.chestTaken).toBe(true);
    expect(w.coinsCollected).toBeGreaterThanOrEqual(w.coinsTotal - 8);
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

describe('Blots', () => {
  it('patrol back and forth while Nib is out of sight', () => {
    const w = new World(CELLAR);
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
    const w = dropOnGuard(CELLAR);
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
