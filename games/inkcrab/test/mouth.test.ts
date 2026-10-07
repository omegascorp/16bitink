import { describe, expect, it } from 'vitest';
import { crabShift, MOUTH_X } from '../src/art/mouth';
import { SHELL_KINDS } from '../src/logic/shells';

describe('crab in the opening', () => {
  it('barely moves it for shells drawn around the crab', () => {
    expect(Math.abs(crabShift('snail', 1, 1))).toBeLessThan(2);
  });

  it('keeps the seat on the mouth whatever the two scales', () => {
    for (const kind of SHELL_KINDS) {
      const unit = 0.3;
      const body = 0.24;
      // The crab's seat (frame x 15) lands on the mouth, both relative to the anchor (frame x 20).
      expect((15 - 20) * body + crabShift(kind, unit, body)).toBeCloseTo((MOUTH_X[kind] - 20) * unit);
    }
  });
});
