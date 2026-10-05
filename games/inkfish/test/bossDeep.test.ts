import { describe, expect, it } from 'vitest';
import { SLEEPER, SLEEPER_START, sleeperVisibility, stepSleeper, type SleeperSense } from '../src/logic/bosses/sleeper';
import { GOBLIN, GOBLIN_START, inJawReach, stepGoblin, type GoblinSense } from '../src/logic/bosses/goblin';

const sl = (over: Partial<SleeperSense> = {}): SleeperSense => ({ now: 1000, rel: 'hunt', dist: 200, seen: true, ...over });
const gb = (over: Partial<GoblinSense> = {}): GoblinSense => ({ now: 1000, rel: 'hunt', inFront: true, seen: true, ...over });

describe('sleeper shark', () => {
  it('flares its eyes, lurches, rests, then drifts on', () => {
    const flare = stepSleeper(SLEEPER_START, sl());
    expect(flare.mode).toBe('flare');
    const lurch = stepSleeper(flare, sl({ now: flare.until }));
    expect(lurch.mode).toBe('lurch');
    const rest = stepSleeper(lurch, sl({ now: lurch.until }));
    expect(rest.mode).toBe('rest');
    const drift = stepSleeper(rest, sl({ now: rest.until }));
    expect(drift.mode).toBe('drift');
    expect(stepSleeper(drift, sl({ now: rest.until + 1 })).mode).toBe('drift');
    expect(stepSleeper(drift, sl({ now: drift.lurchAt })).mode).toBe('flare');
  });

  it('sleeps once you are bigger, wakes when you come close, lumbers off, sleeps again', () => {
    const asleep = stepSleeper(SLEEPER_START, sl({ rel: 'hide', dist: 900 }));
    expect(asleep.mode).toBe('sleep');
    expect(stepSleeper(asleep, sl({ rel: 'hide', dist: SLEEPER.wakeRange + 1 })).mode).toBe('sleep');
    const lumber = stepSleeper(asleep, sl({ rel: 'hide', dist: 100 }));
    expect(lumber.mode).toBe('lumber');
    expect(stepSleeper(lumber, sl({ rel: 'hide', now: lumber.until })).mode).toBe('sleep');
  });

  it('only shows inside your light, and needs more of it asleep', () => {
    expect(sleeperVisibility(100, 400, false)).toBe(1);
    expect(sleeperVisibility(500, 400, false)).toBe(0);
    expect(sleeperVisibility(320, 400, false)).toBeGreaterThan(0);
    expect(sleeperVisibility(320, 400, true)).toBe(0);
    expect(sleeperVisibility(100, 400, true)).toBe(1);
  });
});

describe('goblin shark', () => {
  it('aims when you are in front, fires its jaws, recoils, then stalks again', () => {
    const aim = stepGoblin(GOBLIN_START, gb());
    expect(aim.mode).toBe('aim');
    const snap = stepGoblin(aim, gb({ now: aim.until, inFront: false }));
    expect(snap.mode).toBe('snap');
    const recoil = stepGoblin(snap, gb({ now: snap.until }));
    expect(recoil.mode).toBe('recoil');
    const stalk = stepGoblin(recoil, gb({ now: recoil.until }));
    expect(stalk.mode).toBe('stalk');
    expect(stepGoblin(stalk, gb({ now: recoil.until + 1 })).mode).toBe('stalk');
  });

  it('ignores you beside or behind it', () => {
    expect(stepGoblin(GOBLIN_START, gb({ inFront: false })).mode).toBe('stalk');
  });

  it('turns to face a chaser now and then, snapping if they come head-on', () => {
    const fleeing = stepGoblin(GOBLIN_START, gb({ rel: 'hide', inFront: false }));
    expect(fleeing.mode).toBe('flee');
    const turn = stepGoblin(fleeing, gb({ rel: 'hide', inFront: false, now: fleeing.turnAt }));
    expect(turn.mode).toBe('turn');
    expect(stepGoblin(turn, gb({ rel: 'hide', inFront: true, now: fleeing.turnAt + 100 })).mode).toBe('snap');
    const passed = stepGoblin(turn, gb({ rel: 'hide', inFront: false, now: turn.until }));
    expect(passed.mode).toBe('flee');
  });

  it('only reaches what is in front of its snout, within reach', () => {
    expect(inJawReach(100, 10, 1, 150)).toBe(true);
    expect(inJawReach(-100, 10, 1, 150)).toBe(false);
    expect(inJawReach(-100, 10, -1, 150)).toBe(true);
    expect(inJawReach(200, 0, 1, 150)).toBe(false);
    expect(inJawReach(40, 100, 1, 150)).toBe(false);
  });

  it('keeps its reach a little over twice its size', () => {
    expect(GOBLIN.reach).toBeGreaterThan(2);
  });
});
