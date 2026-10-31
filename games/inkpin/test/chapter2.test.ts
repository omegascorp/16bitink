import { describe, expect, it } from 'vitest';
import { CHAPTER_2 as LEVELS } from '../src/level';
import { inRooms } from '../src/logic/rooms';
import { World } from '../src/logic/world';

describe('Chapter 2', () => {
  it('has ten volcano levels with their own ids, each opening at rest', () => {
    expect(LEVELS).toHaveLength(10);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(10);
    for (const level of LEVELS) {
      expect(level.ruin, level.name).toBe('volcano');
      const w = new World(level);
      expect(w.status.state, level.name).toBe('playing');
      expect(w.coinsTotal, level.name).toBeGreaterThanOrEqual(level.coinsNeeded);
    }
  });

  it('starts with every grain inside the rooms (no fill spilling into the rock)', () => {
    for (const level of LEVELS) {
      const g = new World(level).grains;
      const outside: string[] = [];
      for (let i = 0; i < g.count; i++) if (!inRooms(level.rooms, g.x[i]!, g.y[i]!)) outside.push(`${g.x[i]!.toFixed(0)},${g.y[i]!.toFixed(0)}`);
      expect(outside, level.name).toEqual([]);
    }
  });

  it('gives every guard its animal (for the art and the loss line)', () => {
    for (const level of LEVELS) for (const guard of level.blots) expect(guard.animal, level.name).toBeDefined();
  });

  // Each level's own wins and tempting losses are in test/ch2-<level>.test.ts.
}, 300_000);
