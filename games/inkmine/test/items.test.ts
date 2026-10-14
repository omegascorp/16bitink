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
    m.suit = { ...m.suit, bag: bagOf(ORES.copper.id, ORES.copper.id, ORES.graphite.id) };
    toLander(m);
    run(m, 0.1);
    expect(m.tally().banked).toEqual({ copper: 2, graphite: 1 });
    expect(m.bankedPieces).toBe(3);
    expect(bagHas(m.cargo)).toEqual({ copper: 2, graphite: 1 });
    expect(bagHas(m.suit.bag)).toEqual({});
    standAt(m, 3, 2);
    run(m, 1.5, { iy: 1 });
    expect(m.tally().deepest).toBeGreaterThanOrEqual(2);
  });

  it('lifts off only at the lander, banking on the way in', () => {
    const m = mine(SITE);
    standAt(m, 7, 2);
    run(m, 0.05, { liftoff: true } as never);
    expect(m.state).toBe('playing');
    m.suit = { ...m.suit, bag: bagOf(ORES.copper.id) };
    toLander(m);
    const events = m.step(1 / 60, { ix: 0, iy: 0, jump: false, thrust: false, ladder: false, recall: false, liftoff: true });
    expect(events.map((e) => e.kind)).toContain('liftoff');
    expect(m.state).toBe('lifted');
    expect(m.tally().banked).toEqual({ copper: 1 });
  });
});

describe('the winch', () => {
  it('keeps half of each stack on a recall', () => {
    const m = mine(SITE, { winchKeeps: 0.5 });
    m.suit = { ...m.suit, bag: bagOf(ORES.copper.id, ORES.copper.id, ORES.copper.id, ORES.copper.id, ORES.quartz.id, ORES.galena.id, ORES.galena.id) };
    const events = run(m, 0.05, { recall: true });
    // Copper 4 keeps 2, galena 2 keeps 1, a lone quartz is lost.
    expect(events).toContainEqual({ kind: 'recall', lost: 4 });
    expect(bagHas(m.suit.bag)).toEqual({ copper: 2, galena: 1 });
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
    expect(m.tally().banked).toEqual({ copper: 1 });
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
