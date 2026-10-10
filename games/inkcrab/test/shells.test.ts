import { describe, expect, it } from 'vitest';
import { bodyFill, canWear, sandCapacity, shellName, shellOf, shellPx, SHELL_KINDS, SHELLS, speedFactor } from '../src/logic/shells';

describe('shells', () => {
  it('has a sane range of sizes it comes in, and stats, for every kind', () => {
    for (const kind of SHELL_KINDS) {
      const s = SHELLS[kind];
      expect(s.kind).toBe(kind);
      expect(s.minSize).toBeGreaterThanOrEqual(1);
      expect(s.maxSize).toBeGreaterThan(s.minSize);
      expect([1, 2, 3]).toContain(s.weight);
      expect(s.durability).toBeGreaterThanOrEqual(1);
    }
  });

  it('comes in any size, the biggest its kind is found in by default', () => {
    expect(shellOf('tulip')).toEqual({ kind: 'tulip', size: 6 });
    expect(shellOf('tulip', 4)).toEqual({ kind: 'tulip', size: 4 });
    expect(shellName(shellOf('tulip', 4))).toBe('size-4 tulip shell');
  });

  it('fits a crab its size, or one a size smaller that will grow into it: so a crab moves house at every size', () => {
    const s = shellOf('whelk', 4);
    expect(canWear(s, 4)).toBe(true);
    expect(canWear(s, 3)).toBe(true);
    expect(canWear(s, 2)).toBe(false);
    expect(canWear(s, 5)).toBe(false);
  });

  it('slows heavy shells and leaves naked crabs at full speed', () => {
    expect(speedFactor(null)).toBe(1);
    expect(speedFactor(shellOf('periwinkle'))).toBe(1);
    expect(speedFactor(shellOf('conch', 5))).toBeLessThan(speedFactor(shellOf('whelk', 5)));
  });

  it('draws bigger shells bigger, whatever their kind', () => {
    expect(shellPx(shellOf('conch', 8).size)).toBeGreaterThan(shellPx(shellOf('conch', 5).size));
  });

  it('fills most of the opening even when it has only just moved in', () => {
    for (const size of [2, 4, 8]) {
      const s = shellOf('tun', size);
      expect(bodyFill(s, size - 1)).toBeCloseTo(0.8);
      expect(bodyFill(s, size)).toBeCloseTo(0.95);
      expect(bodyFill(s, size + 3)).toBeCloseTo(0.95);
      expect(bodyFill(s, size - 0.5)).toBeGreaterThan(0.8);
    }
  });

  it('carries more sand in a bigger shell, and a little without one', () => {
    expect(sandCapacity(shellOf('periwinkle', 2))).toBe(10);
    expect(sandCapacity(shellOf('conch', 8))).toBeGreaterThan(sandCapacity(shellOf('triton', 7)));
    expect(sandCapacity(null)).toBeLessThan(sandCapacity(shellOf('periwinkle', 2)));
    expect(sandCapacity(null)).toBeGreaterThan(0);
  });

  it('draws the starting shell small enough that its crab fits one tile (16 px)', () => {
    expect(shellPx(2) * 0.85).toBeLessThan(16);
    expect(shellPx(2) * 0.7).toBeLessThan(16);
  });
});
