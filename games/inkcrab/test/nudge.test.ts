import { describe, expect, it } from 'vitest';
import { LOST_SECONDS, MissionNudge } from '../src/logic/nudge';

describe('the mission nudge', () => {
  it('waits a while before deciding the player is lost', () => {
    const n = new MissionNudge();
    n.update(0, 0);
    expect(n.lost(LOST_SECONDS - 1)).toBe(false);
    n.update(0, LOST_SECONDS);
    expect(n.lost(LOST_SECONDS)).toBe(true);
  });

  it('starts the wait again with every task done', () => {
    const n = new MissionNudge();
    n.update(0, 0);
    n.update(1, LOST_SECONDS + 5);
    expect(n.lost(LOST_SECONDS + 6)).toBe(false);
    expect(n.lost(2 * LOST_SECONDS + 5)).toBe(true);
  });

  it('counts from the first look, not from zero, when a level is joined late', () => {
    const n = new MissionNudge();
    n.update(2, 40);
    expect(n.lost(41)).toBe(false);
  });
});
