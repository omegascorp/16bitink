import { describe, expect, it } from 'vitest';
import { CLOSE_GAP, initialCloseCall, trackCloseCall } from '../src/logic/clips/closeCalls';

/** Feeds gaps one frame (0.1 s) apart from `t0`; returns every escape reported. */
function run(gaps: readonly (number | null)[], hurtAt?: number, t0 = 0): number[] {
  let state = initialCloseCall;
  const escapes: number[] = [];
  gaps.forEach((gap, i) => {
    const now = t0 + i * 0.1;
    const step = trackCloseCall(state, now, gap, hurtAt !== undefined && Math.abs(hurtAt - now) < 1e-6);
    state = step.state;
    if (step.escapedAt !== null) escapes.push(step.escapedAt);
  });
  return escapes;
}

describe('close calls', () => {
  it('report an escape once a hunter that came close falls back', () => {
    const escapes = run([200, 100, CLOSE_GAP / 2, CLOSE_GAP / 3, CLOSE_GAP, 200, null]);
    expect(escapes).toHaveLength(1);
    // Timed at the closest moment, where the clip should centre.
    expect(escapes[0]).toBeCloseTo(0.3);
  });

  it('report nothing when the hunter never got close', () => {
    expect(run([300, 200, CLOSE_GAP * 2, 300, null])).toEqual([]);
  });

  it('report nothing when the fish was bitten after all', () => {
    expect(run([CLOSE_GAP / 2, CLOSE_GAP / 3, 300, null], 0.1)).toEqual([]);
  });

  it('report nothing while the hunter is still on the fish', () => {
    expect(run([CLOSE_GAP / 2, CLOSE_GAP / 2, CLOSE_GAP / 2])).toEqual([]);
  });
});
