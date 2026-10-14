import { describe, expect, it } from 'vitest';
import { ORES } from '../src/logic/ore';
import { mine, run, standAt, T } from './helpers';

// Lander over column 1 on row 2; the prospector starts in column 3.
const SITE = [
  '..........',
  '..........',
  'ssssssssss',
  'ssssssssss',
  'ssssssssss',
  'ttttbttttt',
  'ssssssssss',
  '##########',
];

const toLander = (m: ReturnType<typeof mine>): void => {
  m.player = { ...m.player, x: 1 * T + 6, y: 2 * T - m.player.h, vx: 0, vy: 0, onGround: true };
};

describe('mission items', () => {
  it('a core in the rock breaks out when drilled, flies to the pouch and counts once banked', () => {
    const m = mine(SITE, { items: [{ kind: 'core', at: [3, 1] }] });
    expect(m.items[0]!.state).toBe('rock');
    const events = run(m, 1.5, { iy: 1 });
    expect(events.some((e) => e.kind === 'item')).toBe(true);
    expect(m.items[0]!.state).toBe('pouch');
    expect(m.tally().items).toEqual([]);
    toLander(m);
    const banked = run(m, 0.1);
    expect(banked.some((e) => e.kind === 'bankItem')).toBe(true);
    expect(m.tally().items).toEqual(['core']);
  });

  it('an item on open ground lies loose, and a blueprint banked is listed', () => {
    const m = mine(SITE, { items: [{ kind: 'blueprint', at: [5, -1], blueprint: 'pack-1' }] });
    expect(m.items[0]!.state).toBe('loose');
    standAt(m, 5, 2);
    run(m, 0.5);
    expect(m.items[0]!.state).toBe('pouch');
    toLander(m);
    run(m, 0.1);
    expect(m.bankedBlueprints()).toEqual(['pack-1']);
  });

  it('a blast frees an item in its area', () => {
    const m = mine(SITE, { items: [{ kind: 'fossil', at: [5, 3] }] });
    m.blasts.light(4, 5, 0.01);
    run(m, 0.1);
    expect(m.items[0]!.state).not.toBe('rock');
    expect(m.chargesFired).toBe(1);
  });
});

describe('the landing tally', () => {
  it('banks ore by kind and tracks the deepest point', () => {
    const m = mine(SITE);
    m.suit = { ...m.suit, bag: [ORES.copper.id, ORES.copper.id, ORES.graphite.id] };
    toLander(m);
    run(m, 0.1);
    expect(m.tally().banked).toEqual({ copper: 2, graphite: 1 });
    expect(m.credits).toBe(2 * ORES.copper.value + ORES.graphite.value);
    standAt(m, 3, 2);
    run(m, 1.5, { iy: 1 });
    expect(m.tally().deepest).toBeGreaterThanOrEqual(2);
  });

  it('lifts off only at the lander, banking on the way in', () => {
    const m = mine(SITE);
    standAt(m, 7, 2);
    run(m, 0.05, { liftoff: true } as never);
    expect(m.state).toBe('playing');
    m.suit = { ...m.suit, bag: [ORES.copper.id] };
    toLander(m);
    const events = m.step(1 / 60, { ix: 0, iy: 0, jump: false, thrust: false, ladder: false, recall: false, liftoff: true });
    expect(events.map((e) => e.kind)).toContain('liftoff');
    expect(m.state).toBe('lifted');
    expect(m.tally().banked).toEqual({ copper: 1 });
  });
});

describe('the winch', () => {
  it('keeps the most valuable share of the bag on a recall', () => {
    const m = mine(SITE, { winchKeeps: 0.5 });
    m.suit = { ...m.suit, bag: [ORES.copper.id, ORES.quartz.id, ORES.galena.id, ORES.silver.id] };
    const events = run(m, 0.05, { recall: true });
    expect(events).toContainEqual({ kind: 'recall', lost: 2 });
    expect(m.suit.bag).toEqual([ORES.quartz.id, ORES.silver.id]);
  });
});
