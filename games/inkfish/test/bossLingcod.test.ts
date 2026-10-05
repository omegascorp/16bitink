import { describe, expect, it } from 'vitest';
import { inSuctionCone, LINGCOD, LINGCOD_START, overheadOf, stepLingcod, suctionAt, type LingcodSense } from '../src/logic/bosses/lingcod';

const sense = (over: Partial<LingcodSense> = {}): LingcodSense => ({
  now: 1000, rel: 'hunt', dist: 300, inCone: true, overhead: false, seen: true, x: 0, side: 1, ...over,
});

describe('lingcod: the suction gulp', () => {
  it('opens up when you are in front of its mouth, then sucks, then rests', () => {
    const open = stepLingcod(LINGCOD_START, sense());
    expect(open.mode).toBe('open');
    const suck = stepLingcod(open, sense({ now: open.until, inCone: false }));
    expect(suck.mode).toBe('suck');
    const rest = stepLingcod(suck, sense({ now: suck.until }));
    expect(rest.mode).toBe('rest');
    const stalk = stepLingcod(rest, sense({ now: rest.until }));
    expect(stalk.mode).toBe('stalk');
    expect(stepLingcod(stalk, sense({ now: rest.until + 10 })).mode).toBe('stalk');
    expect(stepLingcod(stalk, sense({ now: stalk.gulpAt })).mode).toBe('open');
  });

  it('ignores you outside the cone, hidden, or your size', () => {
    expect(stepLingcod(LINGCOD_START, sense({ inCone: false })).mode).toBe('stalk');
    expect(stepLingcod(LINGCOD_START, sense({ seen: false })).mode).toBe('stalk');
    expect(stepLingcod(LINGCOD_START, sense({ rel: 'even' })).mode).toBe('stalk');
  });

  it('pulls hardest at the mouth and not at all beyond its reach', () => {
    expect(suctionAt(0)).toBe(LINGCOD.pull);
    expect(suctionAt(LINGCOD.reach * 0.5)).toBeLessThan(LINGCOD.pull);
    expect(suctionAt(LINGCOD.reach * 0.5)).toBeGreaterThan(0);
    expect(suctionAt(LINGCOD.reach)).toBe(0);
  });

  it('only reaches what is in front of it', () => {
    expect(inSuctionCone(200, 0, 1)).toBe(true);
    expect(inSuctionCone(200, -120, 1)).toBe(true);
    // Tipped up: not down into the sand.
    expect(inSuctionCone(200, 90, 1)).toBe(false);
    expect(inSuctionCone(-200, 0, 1)).toBe(false);
    expect(inSuctionCone(-200, 0, -1)).toBe(true);
    expect(inSuctionCone(60, 200, 1)).toBe(false);
    expect(inSuctionCone(LINGCOD.reach + 5, 0, 1)).toBe(false);
  });
});

describe('lingcod: launching off the bottom', () => {
  it('launches up at you when you hang above it, after a coil', () => {
    const above = { inCone: false, overhead: true };
    const watching = stepLingcod(LINGCOD_START, sense({ ...above, now: 1000 }));
    expect(watching).toMatchObject({ mode: 'stalk', overheadSince: 1000 });
    expect(stepLingcod(watching, sense({ ...above, now: 1000 + LINGCOD.hoverMs - 1 })).mode).toBe('stalk');
    const coil = stepLingcod(watching, sense({ ...above, now: 1000 + LINGCOD.hoverMs }));
    expect(coil.mode).toBe('coil');
    const launch = stepLingcod(coil, sense({ ...above, now: coil.until }));
    expect(launch.mode).toBe('launch');
    expect(stepLingcod(launch, sense({ now: launch.until })).mode).toBe('rest');
  });

  it('starts counting again when you move off', () => {
    const watching = stepLingcod(LINGCOD_START, sense({ inCone: false, overhead: true, now: 1000 }));
    const away = stepLingcod(watching, sense({ inCone: false, overhead: false, now: 1500 }));
    expect(away.overheadSince).toBe(0);
  });

  it('only counts you as overhead when you are above it and in reach', () => {
    expect(overheadOf(100, -400)).toBe(true);
    expect(overheadOf(100, 50)).toBe(false);
    expect(overheadOf(LINGCOD.launchReach + 1, -400)).toBe(false);
    expect(overheadOf(0, -LINGCOD.launchHeight - 1)).toBe(false);
  });
});

describe('lingcod: camouflage', () => {
  it('lies still on the sand until you come close, then bolts away along the bottom', () => {
    const camo = stepLingcod(LINGCOD_START, sense({ rel: 'hide', dist: 600 }));
    expect(camo.mode).toBe('camo');
    expect(stepLingcod(camo, sense({ rel: 'hide', dist: LINGCOD.boltRange + 1 })).mode).toBe('camo');
    const bolt = stepLingcod(camo, sense({ rel: 'hide', dist: 100, x: 500, side: 1 }));
    expect(bolt).toMatchObject({ mode: 'bolt', boltX: 500 - LINGCOD.boltDistance });
    expect(stepLingcod(bolt, sense({ rel: 'hide', dist: 100, now: bolt.until })).mode).toBe('camo');
  });
});
