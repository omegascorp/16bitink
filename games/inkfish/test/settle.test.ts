import { describe, expect, it } from 'vitest';
import { settleFacing } from '../src/logic/settle';

describe('settling after a win', () => {
  it('keeps swimming the way it is going', () => {
    expect(settleFacing(120, -0.4)).toBe(1);
    expect(settleFacing(-120, 0.4)).toBe(-1);
  });

  it('finishes a half-done turn the way it was turning when it has stopped', () => {
    expect(settleFacing(0, 0.1)).toBe(1);
    expect(settleFacing(3, -0.1)).toBe(-1);
  });

  it('never stays edge-on', () => {
    expect(settleFacing(0, 0)).toBe(1);
  });
});
