import { describe, expect, it } from 'vitest';
import { JUMP, stepSurface } from '../src/logic/jump';
import { SKY } from '../src/logic/water';
import { PLAYER_STATS } from '../src/levels/playerStats';
import { PLAYER_FISH } from '../src/levels/zones';

const leapHeight = (leap: number): number => {
  const launch = -stepSurface({ y: 102, vy: -5000, airborne: false }, 100, 0.001, true, false, leap).state.vy;
  return (launch * launch) / (2 * JUMP.gravity);
};

describe('player fish stats', () => {
  it('stay close enough to the base tuning not to break levels', () => {
    for (const id of PLAYER_FISH) {
      const s = PLAYER_STATS[id];
      expect(s.speed).toBeGreaterThanOrEqual(0.88);
      expect(s.speed).toBeLessThanOrEqual(1.22);
      for (const v of [s.agility, s.dash, s.leap]) expect(v).toBeGreaterThanOrEqual(0.75);
      expect(s.trait.length).toBeGreaterThan(0);
    }
  });

  it('give every new fish something it does better than the first one', () => {
    for (const id of PLAYER_FISH.slice(1)) {
      const s = PLAYER_STATS[id];
      expect(Math.max(s.speed, s.agility, s.dash, s.leap)).toBeGreaterThanOrEqual(1.05);
    }
  });

  it('never leap out of the drawn sky', () => {
    for (const id of PLAYER_FISH) expect(leapHeight(PLAYER_STATS[id].leap)).toBeLessThanOrEqual(JUMP.maxHeight);
    expect(SKY.height).toBeGreaterThanOrEqual(JUMP.maxHeight + 30);
  });

  it('a better leaper jumps higher', () => {
    expect(leapHeight(PLAYER_STATS.tuna.leap)).toBeGreaterThan(leapHeight(PLAYER_STATS.goby.leap));
  });
});
