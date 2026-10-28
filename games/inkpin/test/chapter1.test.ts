import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/level';
import { DOOR } from '../src/level/door';
import { IDOL_HALL } from '../src/level/idolHall';
import type { LevelDef } from '../src/logic/level';
import { inRooms as inRoomsOf, outerRuns, standsInTheOpen } from '../src/logic/rooms';
import { World } from '../src/logic/world';

const inRooms = (level: LevelDef, x: number, y: number): boolean => inRoomsOf(level.rooms, x, y);

describe('Chapter 1', () => {
  it('has ten levels with their own ids, each opening at rest', () => {
    expect(LEVELS).toHaveLength(10);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(10);
    for (const level of LEVELS) {
      const w = new World(level);
      expect(w.status.state).toBe('playing');
      expect(w.coinsTotal).toBeGreaterThanOrEqual(level.coinsNeeded);
    }
  });

  it('draws every wall: the lip in The Door stands in the open, so it is painted as a bar', () => {
    const lip = DOOR.walls[5]!;
    expect(standsInTheOpen(DOOR.rooms, lip)).toBe(true);
    expect(standsInTheOpen(DOOR.rooms, DOOR.walls[1]!)).toBe(false); // the left wall is the room's own edge
  });

  it('leaves no seam where two rooms join', () => {
    // The Door's first two rooms share the edge x = 680 below the second room's bar (y 800 to 1100).
    const seam = outerRuns(DOOR.rooms).some((run) => run.some((p) => Math.abs(p.x - 680) < 1 && p.y > 810 && p.y < 1090));
    expect(seam).toBe(false);
  });

  it('starts with every grain inside the rooms (no fill spilling into the rock)', () => {
    for (const level of LEVELS) {
      const w = new World(level);
      const g = w.grains;
      const outside: string[] = [];
      for (let i = 0; i < g.count; i++) if (!inRooms(level, g.x[i]!, g.y[i]!)) outside.push(`${g.x[i]!.toFixed(0)},${g.y[i]!.toFixed(0)}`);
      expect(outside, level.name).toEqual([]);
    }
  });

  // Each level's own wins and tempting losses are in test/wide-<level>.test.ts.
}, 300_000);

describe('vines', () => {
  it('Nib climbs a tapped vine, steps off at the top, and climbs back down', () => {
    const w = new World(DOOR);
    const go = (x: number, y?: number): void => {
      w.command(y === undefined ? { kind: 'goto', x } : { kind: 'goto', x, y });
      for (let s = 0; s < 1500; s++) {
        w.step();
        if (s > 20 && w.nibOrder.kind === 'stay') break;
      }
    };
    go(232, 850);
    expect(w.onVine).toBe(true);
    expect(w.nib.y).toBeLessThan(860);
    go(70, 840);
    expect(w.onVine).toBe(false);
    expect(w.coinsCollected).toBeGreaterThan(15);
    go(232, 1090);
    go(150);
    expect(w.nib.y).toBeGreaterThan(1050);
  });
});

describe('the boss', () => {
  // However long the player waits between pulls, filling the cistern first washes the Great Boar away.
  it.each([300, 500, 800, 1100])('falls to the full flood with %i steps between pulls', (wait) => {
    const w = new World(IDOL_HALL);
    for (const id of ['B', 'A', 'R']) {
      w.pull(id);
      for (let s = 0; s < wait; s++) w.step();
    }
    for (let s = 0; s < 600; s++) w.step();
    expect(w.blots[0]!.gone).toBe('washed');
  });

  it('bounces Nib off its back instead of being squashed', () => {
    const w = new World(IDOL_HALL);
    const boss = w.blots[0]!;
    for (let s = 0; s < 600; s++) w.step();
    w.nib.x = boss.x;
    w.nib.y = boss.y - 110;
    w.nib.vy = 0;
    let bonked = false;
    for (let s = 0; s < 200 && !bonked; s++) {
      w.step();
      bonked = w.events.some((e) => e.type === 'bonk');
    }
    expect(bonked).toBe(true);
    expect(boss.gone).toBe(null);
  });
}, 300_000);

describe('hearts', () => {
  it('winds the level back exactly: replaying from a save gives the same world', () => {
    const level = LEVELS[3]!;
    const w = new World(level);
    for (let s = 0; s < 200; s++) w.step();
    const save = w.save();
    const run = (): string => {
      w.pull(level.solution[0]!);
      for (let s = 0; s < 600; s++) w.step();
      const g = w.grains;
      let sum = 0;
      for (let i = 0; i < g.count; i++) sum += g.x[i]! * 3 + g.y[i]! * 7 + g.kind[i]!;
      return `${g.count}:${sum.toFixed(4)}:${w.nib.x.toFixed(4)}:${w.coinsCollected}:${w.pins.filter((p) => p.pulledAt !== null).length}`;
    };
    const first = run();
    w.load(save);
    expect(w.pins.every((p) => p.pulledAt === null)).toBe(true);
    expect(run()).toBe(first);
  });
});
