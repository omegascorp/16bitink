import { describe, expect, it } from 'vitest';
import { bodyFill, canWear, shellPx, SHELL_KINDS, SHELLS, speedFactor } from '../src/logic/shells';

describe('shells', () => {
  it('has a sane size range and stats for every kind', () => {
    for (const kind of SHELL_KINDS) {
      const s = SHELLS[kind];
      expect(s.kind).toBe(kind);
      expect(s.minSize).toBeGreaterThanOrEqual(1);
      expect(s.maxSize).toBeGreaterThan(s.minSize);
      expect([1, 2, 3]).toContain(s.weight);
      expect(s.durability).toBeGreaterThanOrEqual(1);
    }
  });

  it('fits bodies inside its range only', () => {
    expect(canWear(SHELLS.snail, 1)).toBe(true);
    expect(canWear(SHELLS.snail, 3)).toBe(true);
    expect(canWear(SHELLS.snail, 4)).toBe(false);
    expect(canWear(SHELLS.conch, 4)).toBe(false);
  });

  it('leaves room to bank for a shell that skips sizes', () => {
    // A size-2 crab capped in a bottle cap can move straight into a can that fits up to 5.
    expect(SHELLS.bottlecap.maxSize).toBe(2);
    expect(canWear(SHELLS.can, 2)).toBe(true);
    expect(SHELLS.can.maxSize).toBeGreaterThanOrEqual(5);
  });

  it('slows heavy shells and leaves naked crabs at full speed', () => {
    expect(speedFactor(null)).toBe(1);
    expect(speedFactor(SHELLS.bottlecap)).toBe(1);
    expect(speedFactor(SHELLS.conch)).toBeLessThan(speedFactor(SHELLS.whelk));
  });

  it('draws bigger shells bigger', () => {
    expect(shellPx(SHELLS.conch.maxSize)).toBeGreaterThan(shellPx(SHELLS.bottlecap.maxSize));
  });

  it('fills most of the opening even at the smallest size a shell fits', () => {
    for (const kind of SHELL_KINDS) {
      const spec = SHELLS[kind];
      expect(bodyFill(spec, spec.minSize)).toBeCloseTo(0.8);
      expect(bodyFill(spec, spec.maxSize)).toBeCloseTo(0.95);
      expect(bodyFill(spec, spec.maxSize + 3)).toBeCloseTo(0.95);
    }
  });

  it('grows within a shell', () => {
    expect(bodyFill(SHELLS.bulb, 3)).toBeGreaterThan(bodyFill(SHELLS.bulb, 2));
    expect(bodyFill(SHELLS.bulb, 3)).toBeLessThan(bodyFill(SHELLS.bulb, 4));
  });
});
