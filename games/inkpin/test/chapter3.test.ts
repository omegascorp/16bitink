import { describe, expect, it } from 'vitest';
import { CHAPTER_3 as LEVELS } from '../src/level/paid';
import { inRooms } from '../src/logic/rooms';
import { World } from '../src/logic/world';

const GRAIN_LIMIT = 700;

describe('Chapter 3', () => {
  it('has up to ten tomb levels with their own ids, each opening at rest', () => {
    expect(LEVELS.length).toBeLessThanOrEqual(10);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
    for (const level of LEVELS) {
      expect(level.ruin, level.name).toBe('tomb');
      const w = new World(level);
      expect(w.status.state, level.name).toBe('playing');
      expect(w.coinsTotal, `${level.name}: coin blot`).toBeGreaterThan(0);
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

  it('draws only walls that exist as stone bars (a bad index breaks the board art)', () => {
    for (const level of LEVELS) expect(level.bars.filter((b) => !level.walls[b]), level.name).toEqual([]);
  });

  it('keeps within the grain budget, counting the boss breath cap', () => {
    for (const level of LEVELS) expect(level.fills.reduce((n, f) => n + f.count, 0) + (level.breath?.max ?? 0), level.name).toBeLessThanOrEqual(GRAIN_LIMIT);
  });

  it('fits every fill: no grain starts in the rock (see the kit\'s fill rule)', () => {
    for (const level of LEVELS) {
      const g = new World(level).grains;
      expect(g.count, level.name).toBe(level.fills.reduce((n, f) => n + f.count, 0));
    }
  });

  it('makes every cracked wall a bar, and names real doors, plates and walls', () => {
    for (const level of LEVELS) {
      for (const c of level.cracked ?? []) expect(level.bars, `${level.name}: cracked wall ${c}`).toContain(c);
      const plates = new Set((level.plates ?? []).map((p) => p.id));
      for (const d of level.doors ?? []) expect(plates.has(d.plate), `${level.name}: door ${d.id}'s plate ${d.plate}`).toBe(true);
      const doors = new Set((level.doors ?? []).map((d) => d.id));
      for (const s of level.seals ?? []) expect(s.door !== undefined ? doors.has(s.door) : level.walls[s.wall ?? -1] !== undefined, `${level.name}: a seal`).toBe(true);
    }
  });

  // Each level's own wins and tempting losses are in test/ch3-<level>.test.ts.
}, 600_000);
