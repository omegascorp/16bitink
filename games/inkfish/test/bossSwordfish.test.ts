import { describe, expect, it } from 'vitest';
import { aimLocked, stepSwordfish, SWORDFISH, SWORDFISH_START, type SwordfishSense, type SwordfishState } from '../src/logic/bosses/swordfish';

const sense = (over: Partial<SwordfishSense> = {}): SwordfishSense => ({ now: 1000, dt: 0.1, rel: 'hunt', dist: 500, seen: true, ...over });

describe('swordfish: the slash', () => {
  it('lines up on you, holds the line just before it goes, slashes, then turns', () => {
    const aim = stepSwordfish(SWORDFISH_START, sense());
    expect(aim.mode).toBe('aim');
    expect(aimLocked(aim, 1000)).toBe(false);
    expect(aimLocked(aim, aim.until - SWORDFISH.lockMs)).toBe(true);
    const slash = stepSwordfish(aim, sense({ now: aim.until }));
    expect(slash.mode).toBe('slash');
    const turn = stepSwordfish(slash, sense({ now: slash.until }));
    expect(turn.mode).toBe('turn');
    const back = stepSwordfish(turn, sense({ now: turn.until }));
    expect(back.mode).toBe('cruise');
    expect(stepSwordfish(back, sense({ now: turn.until + 1 })).mode).toBe('cruise');
    expect(stepSwordfish(back, sense({ now: back.slashAt })).mode).toBe('aim');
  });

  it('only lines up on what it can see, in range', () => {
    expect(stepSwordfish(SWORDFISH_START, sense({ dist: SWORDFISH.aimRange + 1 })).mode).toBe('cruise');
    expect(stepSwordfish(SWORDFISH_START, sense({ seen: false })).mode).toBe('cruise');
  });
});

describe('swordfish: running out of breath', () => {
  it('sprints from you, and is winded once its stamina runs out', () => {
    let s: SwordfishState = stepSwordfish(SWORDFISH_START, sense({ rel: 'hide', dist: 200 }));
    expect(s.mode).toBe('sprint');
    let now = 1000;
    while (s.mode === 'sprint') {
      now += 100;
      s = stepSwordfish(s, sense({ rel: 'hide', dist: 200, now }));
    }
    expect(s.mode).toBe('winded');
    expect(now - 1000).toBeGreaterThanOrEqual(SWORDFISH.stamina * 1000 - 200);
    expect(stepSwordfish(s, sense({ rel: 'hide', dist: 200, now: s.until - 1 })).mode).toBe('winded');
    expect(stepSwordfish(s, sense({ rel: 'hide', dist: 900, now: s.until }))).toMatchObject({ mode: 'wary', stamina: SWORDFISH.stamina });
  });

  it('stops sprinting once clear of you, and gets its breath back', () => {
    const sprint = stepSwordfish(SWORDFISH_START, sense({ rel: 'hide', dist: 200 }));
    const tired = stepSwordfish(sprint, sense({ rel: 'hide', dist: 300, dt: 1.5 }));
    const clear = stepSwordfish(tired, sense({ rel: 'hide', dist: SWORDFISH.safeRange + 1 }));
    expect(clear.mode).toBe('wary');
    const rested = stepSwordfish(clear, sense({ rel: 'hide', dist: 900, dt: 1 }));
    expect(rested.stamina).toBeGreaterThan(clear.stamina);
  });
});
