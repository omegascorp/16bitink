import { describe, expect, it } from 'vitest';
import { planShore, SHORE_GAP } from '../src/levels/shore';
import { ZONE_IDS, ZONE_SKY } from '../src/levels/zones';

describe('shore scenery', () => {
  it('only rises above levels with open sky', () => {
    for (const zone of ZONE_IDS) expect(planShore('c1-l1', zone, 3200).length > 0).toBe(ZONE_SKY[zone]);
  });

  it('is the same every time a level loads, and differs between levels', () => {
    expect(planShore('c4-l2', 'reef', 3200)).toEqual(planShore('c4-l2', 'reef', 3200));
    expect(planShore('c4-l3', 'reef', 3200)).not.toEqual(planShore('c4-l2', 'reef', 3200));
  });

  it('spreads pieces out along the skyline instead of piling them up', () => {
    for (const id of ['c1-l1', 'c2-l5', 'c5-l9', 'c6-l4']) {
      const xs = planShore(id, 'wreck', 3200).map((p) => p.x).sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThan(SHORE_GAP);
    }
  });
});
