import { describe, expect, it } from 'vitest';
import { LOSS_TIPS, blotReasons, catchTip, isNewBest, lossTip } from '../src/logic/resultCard';
import { blotsFor } from '../src/logic/save';

describe('result card', () => {
  it('names what earned each blot, matching the blots awarded', () => {
    for (const [time, par, lost] of [[50, 60, 0], [70, 60, 0], [50, 60, 2], [70, 60, 1]] as const) {
      const reasons = blotReasons(time, par, lost);
      expect(reasons).toHaveLength(3);
      expect(reasons.filter((r) => r.earned)).toHaveLength(blotsFor(time, par, lost));
    }
  });

  it('says what to aim for when a blot is missed', () => {
    expect(blotReasons(50, 120, 0).map((r) => r.label)).toEqual(['finished', 'under par 2:00', 'no lives lost']);
    expect(blotReasons(130, 120, 1).map((r) => r.label)).toEqual(['finished', 'par 2:00', '1 life lost']);
    expect(blotReasons(130, 120, 2)[2]!.label).toBe('2 lives lost');
  });

  it('calls only a faster repeat finish a new best', () => {
    expect(isNewBest(undefined, 40)).toBe(false);
    expect(isNewBest(60, 40)).toBe(true);
    expect(isNewBest(40, 40)).toBe(false);
    expect(isNewBest(30, 40)).toBe(false);
  });

  it('cycles through the tips on each try', () => {
    expect(lossTip(0)).toBe(LOSS_TIPS[0]);
    expect(lossTip(LOSS_TIPS.length)).toBe(LOSS_TIPS[0]);
    expect(lossTip(1)).toBe(LOSS_TIPS[1]);
    expect(lossTip(-1)).toBe(LOSS_TIPS.at(-1));
  });
});

describe('the tip after being caught', () => {
  it('speaks to what did the catching', () => {
    expect(catchTip('kestrel', 0)).toMatch(/kestrel/);
    expect(catchTip('octopus', 3)).toMatch(/octopus/);
  });

  it('falls back to the general tips for a hunter with nothing particular to say', () => {
    expect(catchTip('ghostcrab', 2)).toBe(lossTip(2));
    expect(catchTip(null, 1)).toBe(lossTip(1));
  });
});
