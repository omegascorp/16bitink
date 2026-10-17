import { describe, expect, it } from 'vitest';
import { NO_INPUT } from '../src/logic/mine';
import { ORES } from '../src/logic/ore';
import { toggleLock } from '../src/logic/inventory';
import { TILE, tileAt } from '../src/logic/terrain';
import { bagHas, bagOf, mine, run, standAt, T } from './helpers';

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

  it('drilled ore flies into the bag and goes into the cargo at the lander, which recharges the cell', () => {
    const m = mine(SITE);
    standAt(m, 8, 3);
    m.terrain.tiles[2 * m.terrain.width + 8] = TILE.air;
    run(m, 1, { iy: 1 });
    expect(bagHas(m.suit.bag)).toEqual({ copper: 1 });
    // Back to the lander.
    m.player = { ...m.player, x: 1 * T + 6, y: 2 * T - m.player.h, vy: 0 };
    const events = run(m, 0.1);
    expect(events).toContainEqual({ kind: 'bank', moved: { copper: 1 }, pieces: 1 });
    expect(bagHas(m.cargo)).toEqual({ copper: 1 });
    expect(bagHas(m.suit.bag)).toEqual({});
    expect(m.suit.energy).toBe(m.suit.maxEnergy);
  });

  it('a flat cell stops the drill until it is recharged', () => {
    const m = mine(SITE);
    m.suit = { ...m.suit, energy: 0 };
    const events = run(m, 1, { iy: 1 });
    expect(events.some((e) => e.kind === 'flat')).toBe(true);
    expect(m.depth).toBe(0);
  });

  it('has no ladders to place: there is no ladder input', () => {
    expect(Object.keys(NO_INPUT)).not.toContain('ladder');
    expect(mine(SITE)).not.toHaveProperty('laddersLeft');
  });

  it('the drill sets off a firedamp pocket, and its blast costs a heart if you stand in it with the shield down', () => {
    // Away from the lander, which would put the shield right.
    const m = mine(['..........', '..........', 'ssssssssss', 'ssfsssssss', '##########'], { lander: { col: 8, row: 2 } });
    m.suit = { ...m.suit, shield: 0, hitAt: 0 };
    standAt(m, 2, 2);
    const events = run(m, 2, { iy: 1 });
    expect(events.some((e) => e.kind === 'lit')).toBe(true);
    expect(events.some((e) => e.kind === 'blast')).toBe(true);
    expect(m.suit.hearts).toBe(m.suit.maxHearts - 1);
    expect(tileAt(m.terrain, 3, 3)).toBe(TILE.air);
  });

  it('losing the last heart: the suit gives out', () => {
    const m = mine(['..........', '..........', 'ssssssssss', 'ssfsssssss', '##########'], { lander: { col: 8, row: 2 } });
    m.suit = { ...m.suit, hearts: 1, shield: 0, hitAt: 0 };
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

describe('digging diagonally', () => {
  const ROCK = ['....................', '....................', ...Array.from({ length: 8 }, () => 'ssssssssssssssssssss'), '####################'];
  const open = (m: ReturnType<typeof mine>, x: number, y: number): boolean => m.terrain.tiles[y * m.terrain.width + x] === 0;

  it('down and sideways cuts a joined-up slope: each step the diagonal and the block ahead of it', () => {
    const m = mine(ROCK);
    run(m, 2.5, { ix: 1, iy: 1 });
    expect(m.depth).toBeGreaterThanOrEqual(4);
    expect([open(m, 5, 2), open(m, 6, 3), open(m, 7, 4), open(m, 8, 5)]).toEqual([true, true, true, true]);
    // Joined up: the elbow between each step is open too, never two holes touching at a corner.
    expect([open(m, 6, 2), open(m, 7, 3), open(m, 8, 4)]).toEqual([true, true, true]);
    // A slope, not a shaft: the treads under each step are still there.
    expect([open(m, 5, 3), open(m, 6, 4)]).toEqual([false, false]);
  });

  it('up and sideways cuts stairs back up', () => {
    const m = mine(ROCK);
    run(m, 2.5, { ix: 1, iy: 1 });
    const deep = m.depth;
    run(m, 3, { ix: 1, iy: -1 });
    expect(m.depth).toBeLessThanOrEqual(deep - 3);
  });

  it('never leaves a hole touching the tunnel only at a corner, wherever you stop', () => {
    const saddle = (m: ReturnType<typeof mine>): boolean => {
      const t = m.terrain;
      for (let y = 0; y + 1 < t.height; y++) {
        for (let x = 0; x + 1 < t.width; x++) {
          const [a, b, c, d] = [open(m, x, y), open(m, x + 1, y), open(m, x, y + 1), open(m, x + 1, y + 1)];
          if ((a && d && !b && !c) || (b && c && !a && !d)) return true;
        }
      }
      return false;
    };
    for (let stop = 0.05; stop < 2.5; stop += 0.07) {
      const down = mine(ROCK);
      run(down, stop, { ix: 1, iy: 1 });
      expect(saddle(down), `down, stopped at ${stop.toFixed(2)} s`).toBe(false);
      const up = mine(ROCK);
      run(up, 2.5, { ix: 1, iy: 1 });
      run(up, stop, { ix: -1, iy: -1 });
      expect(saddle(up), `up, stopped at ${stop.toFixed(2)} s`).toBe(false);
    }
  });

  it('keeps locked slots, and the ores it is asked to keep, in the bag at the lander', () => {
    const s = (ore: 'silver' | 'copper' | 'graphite', n: number) => ({ ore, n });
    const bag = toggleLock({ stack: 10, slots: [s('silver', 4), s('copper', 3), s('graphite', 2), null] }, 1);
    const m = mine(SITE, { bag });
    m.keep = ['silver'];
    m.player = { ...m.player, x: 1 * T + 6, y: 2 * T - m.player.h, vy: 0 };
    run(m, 0.1);
    expect(bagHas(m.suit.bag)).toEqual({ silver: 4, copper: 3 });
    expect(bagHas(m.cargo)).toEqual({ graphite: 2 });
  });
});
