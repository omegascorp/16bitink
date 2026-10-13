import { describe, expect, it } from 'vitest';
import { ORES } from '../src/logic/ore';
import { TILE, tileAt } from '../src/logic/terrain';
import { mine, run, standAt, T } from './helpers';

// Lander over column 1 on row 2; the prospector starts in column 3.
const SITE = [
  '..........',
  '..........',
  'ssssssssss',
  'sssssssscs',
  'ssssssssss',
  'ssssssssss',
  'ddddddddddd'.slice(0, 10),
  '##########',
];

describe('a dig site', () => {
  it('starts beside the lander on the surface', () => {
    const m = mine(SITE);
    expect(m.depth).toBe(0);
    expect(m.player.onGround).toBe(true);
    expect(Math.floor((m.player.x + m.player.w / 2) / T)).toBe(3);
  });

  it('holding down drills a shaft, a block of energy at a time', () => {
    const m = mine(SITE);
    const events = run(m, 2, { iy: 1 });
    expect(m.depth).toBe(4);
    expect(m.suit.energy).toBe(m.suit.maxEnergy - 4);
    expect(events.filter((e) => e.kind === 'drilled')).toHaveLength(4);
    // Deep rock is too hard for Graphite's own drill: a notice, and nothing spent.
    expect(events.some((e) => e.kind === 'tooHard')).toBe(true);
  });

  it('drilled ore flies into the bag and sells at the lander, which recharges the cell', () => {
    const m = mine(SITE);
    standAt(m, 8, 3);
    m.terrain.tiles[2 * m.terrain.width + 8] = TILE.air;
    run(m, 1, { iy: 1 });
    expect(m.suit.bag).toEqual([ORES.copper.id]);
    // Back to the lander.
    m.player = { ...m.player, x: 1 * T + 6, y: 2 * T - m.player.h, vy: 0 };
    const events = run(m, 0.1);
    expect(events).toContainEqual({ kind: 'bank', credits: ORES.copper.value, pieces: 1 });
    expect(m.credits).toBe(ORES.copper.value);
    expect(m.suit.bag).toEqual([]);
    expect(m.suit.energy).toBe(m.suit.maxEnergy);
  });

  it('a flat cell stops the drill until it is recharged', () => {
    const m = mine(SITE);
    m.suit = { ...m.suit, energy: 0 };
    const events = run(m, 1, { iy: 1 });
    expect(events.some((e) => e.kind === 'flat')).toBe(true);
    expect(m.depth).toBe(0);
  });

  it('recall winches the prospector up to the lander and loses the bag', () => {
    const m = mine(SITE);
    run(m, 2, { iy: 1 });
    m.suit = { ...m.suit, bag: [ORES.quartz.id, ORES.copper.id] };
    const events = run(m, 0.1, { recall: true });
    expect(events).toContainEqual({ kind: 'recall', lost: 2 });
    expect(m.depth).toBe(0);
    expect(m.suit.bag).toEqual([]);
    expect(m.credits).toBe(0);
  });

  it('a ladder gets you back out of a shaft', () => {
    const m = mine(SITE);
    run(m, 2, { iy: 1 });
    expect(m.depth).toBe(4);
    run(m, 0.05, { ladder: true });
    expect(m.laddersLeft).toBe(2);
    run(m, 2.5, { iy: -1 });
    run(m, 0.6, { ix: 1 });
    expect(m.depth).toBe(0);
  });

  it('a crate is set off by the drill and its blast costs a heart if you stand in it', () => {
    const m = mine(['..........', '..........', 'ssssssssss', 'ssbsssssss', '##########']);
    standAt(m, 2, 2);
    const events = run(m, 2, { iy: 1 });
    expect(events.some((e) => e.kind === 'lit')).toBe(true);
    expect(events.some((e) => e.kind === 'blast')).toBe(true);
    expect(m.suit.hearts).toBe(m.suit.maxHearts - 1);
    expect(tileAt(m.terrain, 3, 3)).toBe(TILE.air);
  });

  it('losing the last heart fails the level', () => {
    const m = mine(['..........', '..........', 'ssssssssss', 'ssbsssssss', '##########']);
    m.suit = { ...m.suit, hearts: 1 };
    standAt(m, 2, 2);
    const events = run(m, 2, { iy: 1 });
    expect(events.some((e) => e.kind === 'failed')).toBe(true);
    expect(m.state).toBe('failed');
  });
});

describe('drilling down', () => {
  it('drops straight into each block, so a shaft goes quickly (under 0.3 s a block of soil)', () => {
    const m = mine(SITE);
    run(m, 1.2, { iy: 1 });
    expect(m.depth).toBe(4);
  });
});
