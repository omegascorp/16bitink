import { describe, expect, it } from 'vitest';
import { JET } from '../src/logic/mine';
import { mine, run, standAt, T } from './helpers';

const SITE = ['..........', '..........', 'ssssssssss', 'ssssssssss', 'ssssssssss', 'ssssssssss', 'ssssssssss', 'ssssssssss', '##########'];

describe('the jetpack', () => {
  it('flies the prospector up out of a shaft, burning fuel', () => {
    const m = mine(SITE);
    run(m, 3, { iy: 1 });
    expect(m.depth).toBe(6);
    run(m, 1.5, { jump: true, thrust: true });
    expect(m.depth).toBe(0);
    expect(m.suit.fuel).toBeLessThan(m.suit.maxFuel);
  });

  it('with an empty tank, holding jump is only a jump', () => {
    const m = mine(SITE);
    run(m, 3, { iy: 1 });
    m.suit = { ...m.suit, fuel: 0 };
    const events = run(m, 1.5, { jump: true, thrust: true });
    expect(m.depth).toBe(6);
    expect(events.some((e) => e.kind === 'noFuel')).toBe(true);
  });

  it('burns at JET.burn a second and stops when the tank is dry', () => {
    const m = mine(['..........', '..........', '..........', '..........', '..........', '..........', 'ssssssssss', '##########'], { lander: { col: 1, row: 6 } });
    standAt(m, 6, 6);
    m.suit = { ...m.suit, fuel: JET.burn * 0.5 };
    run(m, 1, { jump: true, thrust: true });
    expect(m.suit.fuel).toBe(0);
  });

  it('drills while hovering: up through a roof', () => {
    const m = mine(['..........', 'ssssssssss', '..........', '..........', 'ssssssssss', '##########'], { lander: { col: 1, row: 4 } });
    standAt(m, 6, 4);
    run(m, 1.5, { jump: true, thrust: true, iy: -1 });
    expect(m.terrain.tiles[1 * m.terrain.width + 6]).toBe(0);
  });
});
