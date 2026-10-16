import { describe, expect, it } from 'vitest';
import { ORES } from '../src/logic/ore';
import { bagHas, bagOf, mine, run, standAt, T } from './helpers';

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

describe('things to find', () => {
  it('one in the rock breaks out when drilled, flies to the pouch and is banked at the lander', () => {
    const m = mine(SITE, { items: [{ id: 'a-core', kind: 'core', at: [3, 1] }] });
    expect(m.items[0]!.state).toBe('rock');
    const events = run(m, 1.5, { iy: 1 });
    expect(events.some((e) => e.kind === 'item')).toBe(true);
    expect(m.items[0]!.state).toBe('pouch');
    toLander(m);
    const banked = run(m, 0.1);
    expect(banked).toContainEqual(expect.objectContaining({ kind: 'bankItem', item: expect.objectContaining({ id: 'a-core', state: 'banked' }) }));
  });

  it('one on open ground lies loose; a blueprint keeps its id', () => {
    const m = mine(SITE, { items: [{ id: 'a-pack', kind: 'blueprint', at: [5, -1], blueprint: 'pack-1' }] });
    expect(m.items[0]!.state).toBe('loose');
    standAt(m, 5, 2);
    run(m, 0.5);
    expect(m.items[0]!.state).toBe('pouch');
    toLander(m);
    const events = run(m, 0.1);
    const banked = events.flatMap((e) => (e.kind === 'bankItem' ? [e.item] : []));
    expect(banked.map((it) => [it.id, it.blueprint])).toEqual([['a-pack', 'pack-1']]);
  });

  it('a blast frees an item in its area', () => {
    const m = mine(SITE, { items: [{ id: 'a-fossil', kind: 'fossil', at: [5, 3] }] });
    m.blasts.light(4, 5, 0.01);
    run(m, 0.1);
    expect(m.items[0]!.state).not.toBe('rock');
  });
});

describe('banking', () => {
  it('banks ore by kind into the cargo', () => {
    const m = mine(SITE);
    m.suit = { ...m.suit, bag: bagOf(ORES.copper.id, ORES.copper.id, ORES.graphite.id) };
    toLander(m);
    const events = run(m, 0.1);
    expect(events).toContainEqual({ kind: 'bank', moved: { copper: 2, graphite: 1 }, pieces: 3 });
    expect(bagHas(m.cargo)).toEqual({ copper: 2, graphite: 1 });
    expect(bagHas(m.suit.bag)).toEqual({});
  });
});

describe('the cargo', () => {
  it('takes what fits at the lander; the rest stays in the bag', () => {
    const m = mine(SITE, { cargo: { stack: 50, slots: [{ ore: 'copper', n: 49 }] } });
    m.suit = { ...m.suit, bag: bagOf(ORES.copper.id, ORES.copper.id, ORES.galena.id) };
    toLander(m);
    const events = run(m, 0.1);
    expect(events.map((e) => e.kind)).toContain('cargoFull');
    expect(bagHas(m.cargo)).toEqual({ copper: 50 });
    expect(bagHas(m.suit.bag)).toEqual({ copper: 1, galena: 1 });
  });

  it('a piece with no room in the bag stays where it fell', () => {
    const m = mine(SITE);
    m.suit = { ...m.suit, bag: { stack: 10, slots: [{ ore: 'galena', n: 10 }, { ore: 'galena', n: 10 }, { ore: 'galena', n: 10 }, { ore: 'quartz', n: 10 }] } };
    standAt(m, 8, 2);
    m.terrain.content[3 * m.terrain.width + 8] = ORES.copper.id;
    const events = run(m, 1.2, { iy: 1 });
    expect(events.some((e) => e.kind === 'ore')).toBe(false);
    expect(m.pieces).toHaveLength(1);
  });
});
