import { describe, expect, it } from 'vitest';
import type { Mine } from '../src/logic/mine';
import { ORES } from '../src/logic/ore';
import { AIR, FEED } from '../src/logic/suit';
import { settle } from '../src/logic/flag';
import { bagHas, bagOf, grid, mine, run, standAt, T } from './helpers';

// Lander over column 1 on row 2; the prospector starts in column 3.
const SITE = [
  '..........',
  '..........',
  'ssssssssss',
  'ssssssssss',
  'ssssssssss',
  'ssssssssss',
  'ssssssssss',
  '##########',
];

const toLander = (m: Mine): void => {
  m.player = { ...m.player, x: 1 * T + 6, y: 2 * T - m.player.h, vx: 0, vy: 0, onGround: true };
};

describe('life support in the field', () => {
  it('drains away from the lander and fills up at it', () => {
    const m = mine(SITE);
    standAt(m, 8, 2);
    run(m, 10);
    expect(m.suit.air).toBeLessThan(m.suit.maxAir);
    expect(m.suit.air).toBeCloseTo(m.suit.maxAir - (10 * 100) / AIR.seconds, 0);
    toLander(m);
    const events = run(m, 0.1);
    expect(m.suit.air).toBe(m.suit.maxAir);
    expect(events.some((e) => e.kind === 'restock')).toBe(true);
  });

  it("fills up from the lander's stores, and says so once when they run short", () => {
    const m = mine(SITE);
    standAt(m, 8, 2);
    m.suit = { ...m.suit, air: 40 };
    m.stores = { air: 30, power: 500 };
    toLander(m);
    const events = run(m, 0.5);
    expect(m.suit.air).toBe(70);
    expect(m.stores.air).toBe(0);
    expect(events.filter((e) => e.kind === 'storesShort')).toHaveLength(1);
    expect(events.filter((e) => e.kind === 'restock')).toHaveLength(1);
  });

  it("charges the lander's battery from its panels while the world runs", () => {
    const m = mine(SITE);
    standAt(m, 8, 2);
    m.stores = { air: 0, power: 100 };
    run(m, 10);
    expect(m.stores.power).toBeGreaterThan(100);
    expect(m.stores.air).toBe(0);
  });

  it('warns once the air runs low, and again when it is gone', () => {
    const m = mine(SITE);
    standAt(m, 8, 2);
    m.suit = { ...m.suit, air: m.suit.maxAir * AIR.low - 0.01 };
    expect(run(m, 0.1).some((e) => e.kind === 'airLow')).toBe(true);
    m.suit = { ...m.suit, air: 0 };
    expect(run(m, 0.1).some((e) => e.kind === 'airOut')).toBe(true);
  });

  it('with no air the hearts go one by one, and the suit gives out', () => {
    const m = mine(SITE);
    standAt(m, 8, 2);
    m.suit = { ...m.suit, air: 0 };
    const events = run(m, AIR.choke * m.suit.hearts + 0.5);
    expect(events.filter((e) => e.kind === 'hurt' && e.cause === 'air')).toHaveLength(3);
    expect(m.state).toBe('failed');
  });
});

describe('feeding the suit', () => {
  it('the feed key tops up the lower gauge from the bag', () => {
    const m = mine(SITE);
    standAt(m, 8, 2);
    m.suit = { ...m.suit, energy: 10, bag: bagOf(ORES.graphite.id, ORES.ice.id) };
    const events = run(m, 0.05, { feed: 'lowest' });
    expect(events).toContainEqual({ kind: 'fed', gauge: 'cell', ore: 'graphite' });
    expect(m.suit.energy).toBe(10 + FEED.cell);
    expect(bagHas(m.suit.bag)).toEqual({ ice: 1 });
  });

  it('a tapped gauge is fed even when it is not the lower one', () => {
    const m = mine(SITE);
    standAt(m, 8, 2);
    m.suit = { ...m.suit, energy: 10, air: 50, bag: bagOf(ORES.ice.id) };
    run(m, 0.05, { feed: 'air' });
    expect(m.suit.air).toBeGreaterThan(70);
  });

  it('the feed key will not waste a piece on a nearly full gauge', () => {
    const m = mine(SITE);
    standAt(m, 8, 2);
    m.suit = { ...m.suit, energy: m.suit.maxEnergy - 5, air: m.suit.maxAir - 5, bag: bagOf(ORES.graphite.id, ORES.ice.id) };
    const events = run(m, 0.02, { feed: 'lowest' });
    expect(events.some((e) => e.kind === 'cantFeed' && e.why === 'full')).toBe(true);
    expect(bagHas(m.suit.bag)).toEqual({ graphite: 1, ice: 1 });
  });

  it('says so when there is nothing to feed it', () => {
    const m = mine(SITE);
    standAt(m, 8, 2);
    m.suit = { ...m.suit, energy: 10 };
    expect(run(m, 0.05, { feed: 'lowest' })).toContainEqual({ kind: 'cantFeed', gauge: 'cell', ore: 'graphite', why: 'none' });
  });
});

describe('the jetpack charges itself', () => {
  it('but not while it is firing', () => {
    const m = mine(SITE);
    standAt(m, 8, 2);
    run(m, 0.6, { jump: true, thrust: true });
    expect(m.suit.fuel).toBeLessThan(m.suit.maxFuel - 3);
  });

  it('back up on the ground, anywhere', () => {
    const m = mine(SITE);
    standAt(m, 8, 2);
    m.suit = { ...m.suit, fuel: 0 };
    run(m, 3);
    expect(m.suit.fuel).toBe(m.suit.maxFuel);
  });
});

describe('the shield in the field', () => {
  it('takes the first blast; the next costs a heart', () => {
    const m = mine(['..........', '..........', 'ssssssssss', 'ssfsssssss', '##########']);
    standAt(m, 2, 2);
    const events = run(m, 2, { iy: 1 });
    expect(events.some((e) => e.kind === 'shielded')).toBe(true);
    expect(m.suit.hearts).toBe(m.suit.maxHearts);
    expect(m.suit.shield).toBe(0);
  });
});

describe('when the suit gives out', () => {
  it('the bag stays where you fell, flagged on the ground', () => {
    const m = mine(SITE);
    standAt(m, 8, 2);
    m.suit = { ...m.suit, hearts: 0, bag: bagOf(ORES.copper.id, ORES.copper.id, ORES.quartz.id) };
    const events = run(m, 0.05);
    expect(m.state).toBe('failed');
    expect(events).toContainEqual({ kind: 'failed', dropped: 3 });
    expect(m.dropped).toMatchObject({ col: 8, row: 1 });
    expect(bagHas(m.dropped!.bag)).toEqual({ copper: 2, quartz: 1 });
    expect(bagHas(m.suit.bag)).toEqual({});
  });

  it('a flag falls to the ground under where you were', () => {
    const m = mine(['..........', '..........', '..........', '..........', 'ssssssssss', '##########'], { lander: { col: 1, row: 4 } });
    m.player = { ...m.player, x: 6 * T + 6, y: 1 * T, vy: 0, onGround: false };
    m.suit = { ...m.suit, hearts: 0, bag: bagOf(ORES.copper.id) };
    run(m, 0.02);
    expect(m.dropped).toMatchObject({ col: 6, row: 3 });
  });

  it('an empty bag leaves no flag, and the old one stays', () => {
    const old = { col: 7, row: 1, bag: bagOf(ORES.silver.id) };
    const m = mine(SITE, { dropped: old });
    standAt(m, 5, 2);
    m.suit = { ...m.suit, hearts: 0 };
    run(m, 0.05);
    expect(m.dropped).toEqual(old);
  });

  it('dying again moves the flag, and the old bag goes under it too: nothing is lost', () => {
    const m = mine(SITE, { dropped: { col: 7, row: 1, bag: bagOf(ORES.silver.id, ORES.silver.id) } });
    standAt(m, 5, 2);
    m.suit = { ...m.suit, hearts: 0, bag: bagOf(ORES.copper.id) };
    run(m, 0.05);
    expect(m.dropped).toMatchObject({ col: 5, row: 1 });
    expect(bagHas(m.dropped!.bag)).toEqual({ copper: 1, silver: 2 });
  });
});

describe('the flag', () => {
  it('never rests in rock: it comes up out of it, or falls to the ground', () => {
    const t = grid(['....', '....', 's...', 's...', 'ssss']);
    expect(settle(t, 0, 3)).toEqual([0, 1]);
    expect(settle(t, 2, 0)).toEqual([2, 3]);
    // Round a wrapping world's join.
    expect(settle(grid(['....', '....', 's...', 's...', 'ssss'], true), 5, 0)).toEqual([1, 3]);
  });

  it('touching it puts everything back in the bag', () => {
    const m = mine(SITE, { dropped: { col: 8, row: 1, bag: bagOf(ORES.copper.id, ORES.quartz.id) } });
    standAt(m, 8, 2);
    const events = run(m, 0.05);
    expect(events).toContainEqual({ kind: 'bagBack', pieces: 2 });
    expect(bagHas(m.suit.bag)).toEqual({ copper: 1, quartz: 1 });
    expect(m.dropped).toBeNull();
  });

  it('what does not fit stays flagged', () => {
    const m = mine(SITE, { dropped: { col: 8, row: 1, bag: bagOf(ORES.copper.id, ORES.quartz.id) } });
    standAt(m, 8, 2);
    m.suit = { ...m.suit, bag: bagOf(ORES.galena.id, ORES.silver.id, ORES.graphite.id, ORES.ice.id) };
    run(m, 0.05);
    expect(bagHas(m.dropped!.bag)).toEqual({ copper: 1, quartz: 1 });
  });
});

describe('recall', () => {
  it('winches you up; the bag stays where you were, flagged', () => {
    const m = mine(SITE);
    run(m, 2, { iy: 1 });
    m.suit = { ...m.suit, bag: bagOf(ORES.quartz.id, ORES.copper.id) };
    const events = run(m, 0.1, { recall: true });
    expect(events).toContainEqual({ kind: 'recall', left: 2 });
    expect(m.depth).toBe(0);
    expect(bagHas(m.suit.bag)).toEqual({});
    // At the foot of the shaft (the drill may have opened one more block before the winch).
    expect(m.dropped!.col).toBe(3);
    expect(m.dropped!.row).toBeGreaterThanOrEqual(5);
    expect(bagHas(m.dropped!.bag)).toEqual({ quartz: 1, copper: 1 });
  });

  it('recalled at the lander, the bag stays flagged (it is not picked straight back up)', () => {
    const m = mine(SITE);
    m.suit = { ...m.suit, bag: bagOf(ORES.copper.id) };
    const events = run(m, 0.02, { recall: true });
    expect(events.some((e) => e.kind === 'bagBack')).toBe(false);
    expect(bagHas(m.dropped!.bag)).toEqual({ copper: 1 });
  });

  it('the winch keeps its share in the bag; only the rest is left', () => {
    const m = mine(SITE, { winchKeeps: 0.5 });
    standAt(m, 8, 2);
    m.suit = { ...m.suit, bag: bagOf(ORES.copper.id, ORES.copper.id, ORES.copper.id, ORES.copper.id, ORES.quartz.id) };
    const events = run(m, 0.05, { recall: true });
    expect(events).toContainEqual({ kind: 'recall', left: 3 });
    expect(bagHas(m.suit.bag)).toEqual({ copper: 2 });
    expect(bagHas(m.dropped!.bag)).toEqual({ copper: 2, quartz: 1 });
  });
});
