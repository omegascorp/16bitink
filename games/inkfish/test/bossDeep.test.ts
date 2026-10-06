import { describe, expect, it } from 'vitest';
import { SLEEPER, SLEEPER_START, sleeperVisibility, stepSleeper, type SleeperSense } from '../src/logic/bosses/sleeper';
import { ambushSpot, lureBrightness, lureTug, SEADEVIL, SEADEVIL_START, stepSeadevil, type SeadevilSense } from '../src/logic/bosses/seadevil';
import { inLight } from '../src/logic/bosses/light';

const sl = (over: Partial<SleeperSense> = {}): SleeperSense => ({ now: 1000, rel: 'hunt', dist: 200, seen: true, ...over });
const sd = (over: Partial<SeadevilSense> = {}): SeadevilSense => ({ now: 1000, rel: 'hunt', dist: 400, seen: true, ...over });

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

describe('in the light', () => {
  it('shows fully inside, fades at the edge, hides beyond', () => {
    expect(inLight(0, 300)).toBe(1);
    expect(inLight(300, 300)).toBe(0);
    expect(inLight(250, 300)).toBeGreaterThan(0);
    expect(inLight(250, 300)).toBeLessThan(1);
    expect(inLight(250, 300, 0.5)).toBe(0);
  });
});

describe('giant black seadevil', () => {
  it('dangles its lure until you come near its mouth, then gapes, gulps, rests and lures again', () => {
    expect(stepSeadevil(SEADEVIL_START, sd()).mode).toBe('lure');
    const gape = stepSeadevil(SEADEVIL_START, sd({ dist: SEADEVIL.strikeRange - 1 }));
    expect(gape.mode).toBe('gape');
    // Committed: swimming off during the warning doesn't call it off.
    expect(stepSeadevil(gape, sd({ dist: 2000, now: gape.until - 1 })).mode).toBe('gape');
    const gulp = stepSeadevil(gape, sd({ now: gape.until }));
    expect(gulp.mode).toBe('gulp');
    const rest = stepSeadevil(gulp, sd({ now: gulp.until }));
    expect(rest.mode).toBe('rest');
    const lure = stepSeadevil(rest, sd({ now: rest.until }));
    expect(lure.mode).toBe('lure');
    // Not straight away again.
    expect(stepSeadevil(lure, sd({ now: rest.until + 1, dist: 50 })).mode).toBe('lure');
    expect(stepSeadevil(lure, sd({ now: lure.gulpAt, dist: 50 })).mode).toBe('gape');
  });

  it('never gulps at you hidden, or when you are not smaller', () => {
    expect(stepSeadevil(SEADEVIL_START, sd({ dist: 50, seen: false })).mode).toBe('lure');
    expect(stepSeadevil(SEADEVIL_START, sd({ dist: 50, rel: 'even' })).mode).toBe('lure');
  });

  it('douses its lure and moves ahead of you when left behind, then lights up again', () => {
    const creep = stepSeadevil(SEADEVIL_START, sd({ dist: SEADEVIL.creepRange + 1 }));
    expect(creep.mode).toBe('creep');
    expect(lureBrightness(creep.mode)).toBe(0);
    const lit = stepSeadevil(creep, sd({ now: creep.until, dist: 2000 }));
    expect(lit.mode).toBe('lure');
    // It waits a while before moving again.
    expect(stepSeadevil(lit, sd({ now: creep.until + 1, dist: 2000 })).mode).toBe('lure');
    expect(stepSeadevil(lit, sd({ now: lit.creepAt, dist: 2000 })).mode).toBe('creep');
  });

  it('once you are bigger, keeps dark, flashes now and then, and bolts when cornered', () => {
    const dark = stepSeadevil(SEADEVIL_START, sd({ rel: 'hide', dist: 900 }));
    expect(dark.mode).toBe('dark');
    expect(lureBrightness(dark.mode)).toBe(0);
    const flash = stepSeadevil(dark, sd({ rel: 'hide', dist: 900, now: dark.flashAt }));
    expect(flash.mode).toBe('flash');
    expect(lureBrightness(flash.mode)).toBe(1);
    const after = stepSeadevil(flash, sd({ rel: 'hide', dist: 900, now: flash.until }));
    expect(after.mode).toBe('dark');
    expect(after.flashAt).toBeGreaterThan(flash.until);
    const bolt = stepSeadevil(after, sd({ rel: 'hide', dist: SEADEVIL.boltRange - 1, now: flash.until + 10 }));
    expect(bolt.mode).toBe('bolt');
    expect(stepSeadevil(bolt, sd({ rel: 'hide', dist: 900, now: bolt.until })).mode).toBe('dark');
  });

  it('stops hunting the moment you outgrow it, even mid-gulp', () => {
    const gape = stepSeadevil(SEADEVIL_START, sd({ dist: 10 }));
    expect(stepSeadevil(gape, sd({ rel: 'hide', dist: 900 })).mode).toBe('dark');
  });

  it('tugs hardest right at the lure and not at all past its range', () => {
    expect(lureTug(0)).toBe(SEADEVIL.lurePull);
    expect(lureTug(SEADEVIL.lureRange / 2)).toBeCloseTo(SEADEVIL.lurePull / 2);
    expect(lureTug(SEADEVIL.lureRange + 10)).toBe(0);
  });

  it('waits ahead of the way you swim, or ahead of your nose when you keep still', () => {
    expect(ambushSpot(100, 200, 300, 0, -1, 400)).toEqual({ x: 500, y: 200 });
    const down = ambushSpot(0, 0, 0, -50, 1, 400);
    expect(down.x).toBeCloseTo(0);
    expect(down.y).toBeCloseTo(-400);
    expect(ambushSpot(100, 200, 5, 0, -1, 400)).toEqual({ x: -300, y: 200 });
  });
});
