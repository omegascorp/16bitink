import { describe, expect, it } from 'vitest';
import { salvageOf } from '../src/logic/blueprints';
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

  it('one on open ground lies loose and is picked up whole', () => {
    const m = mine(SITE, { items: [{ id: 'a-probe', kind: 'probe', at: [5, -1] }] });
    expect(m.items[0]!.state).toBe('loose');
    standAt(m, 5, 2);
    run(m, 0.5);
    expect(m.items[0]!.state).toBe('pouch');
  });

  it('a blast frees an item in its area', () => {
    const m = mine(SITE, { items: [{ id: 'a-fossil', kind: 'fossil', at: [5, 3] }] });
    m.blasts.light(4, 5, 0.01);
    run(m, 0.1);
    expect(m.items[0]!.state).not.toBe('rock');
  });
});

describe('broken parts', () => {
  const drillWreck = { id: 'a-drill', kind: 'wreck' as const, at: [5, -1] as const, blueprint: 'drill-1' };

  it('one on open ground is studied and taken apart when touched: its design, and about half its materials as ore', () => {
    const m = mine(SITE, { items: [drillWreck] });
    expect(m.items[0]!.state).toBe('loose');
    standAt(m, 5, 2);
    const events = run(m, 1.5);
    expect(events).toContainEqual(expect.objectContaining({ kind: 'salvage', item: expect.objectContaining({ id: 'a-drill', blueprint: 'drill-1' }) }));
    expect(m.items[0]!.state).toBe('salvaged');
    expect(bagHas(m.suit.bag)).toEqual({ graphite: 3, copper: 2 });
  });

  it('never goes to the pouch: there is nothing to bank, the design is learnt on the spot', () => {
    const m = mine(SITE, { items: [drillWreck] });
    standAt(m, 5, 2);
    const events = run(m, 1.5);
    expect(events.some((e) => e.kind === 'item' || e.kind === 'bankItem')).toBe(false);
  });

  it('one in the rock waits to be dug out, then comes apart like any other', () => {
    const m = mine(SITE, { items: [{ ...drillWreck, at: [3, 1] }] });
    expect(m.items[0]!.state).toBe('rock');
    const events = run(m, 2.5, { iy: 1 });
    expect(events.some((e) => e.kind === 'salvage')).toBe(true);
  });

  it('salvage is half of what the part takes to print, at least one of each', () => {
    expect(salvageOf('drill-1')).toEqual({ graphite: 3, copper: 2 });
    expect(salvageOf('helmet-1')).toEqual({ graphite: 2, quartz: 1 });
    expect(salvageOf('no-such')).toEqual({});
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
