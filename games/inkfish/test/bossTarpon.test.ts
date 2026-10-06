import { describe, expect, it } from 'vitest';
import { stepTarpon, TARPON, TARPON_START, tarponAirborne, type TarponSense, type TarponState } from '../src/logic/bosses/tarpon';

const sense = (over: Partial<TarponSense> = {}): TarponSense => ({
  now: 1000, rel: 'hunt', dist: 400, x: 0, px: 400, pvx: 0, playerDepth: 120, seen: true, side: 1, atSurface: false, landed: false, ...over,
});
const run = (start: TarponState, steps: readonly Partial<TarponSense>[]): TarponState => steps.reduce((s, o) => stepTarpon(s, sense(o)), start);

describe('tarpon: the belly-flop', () => {
  it('rises to leap at you when you swim near the surface, aiming ahead of you', () => {
    const rising = stepTarpon(TARPON_START, sense({ pvx: 200 }));
    expect(rising).toMatchObject({ mode: 'rise', flop: true });
    expect(rising.landX).toBeCloseTo(400 + 200 * (TARPON.leadMs / 1000), 5);
  });

  it("can't flop on you down deep, or when it can't see you", () => {
    expect(stepTarpon(TARPON_START, sense({ playerDepth: TARPON.huntDepth + 10 })).mode).toBe('cruise');
    expect(stepTarpon(TARPON_START, sense({ seen: false })).mode).toBe('cruise');
  });

  it('leaps at the surface, dives through after landing, then rests', () => {
    const air = run(TARPON_START, [{}, { atSurface: true }]);
    expect(air.mode).toBe('air');
    expect(tarponAirborne(air.mode)).toBe(true);
    expect(stepTarpon(air, sense({ now: 1500 })).mode).toBe('air');
    const dive = stepTarpon(air, sense({ now: 1900, landed: true }));
    expect(dive.mode).toBe('dive');
    const tired = stepTarpon(dive, sense({ now: dive.until }));
    expect(tired.mode).toBe('recover');
    const back = stepTarpon(tired, sense({ now: tired.until }));
    expect(back.mode).toBe('cruise');
    // Not straight into another flop.
    expect(stepTarpon(back, sense({ now: tired.until + 10 })).mode).toBe('cruise');
    expect(stepTarpon(back, sense({ now: back.leapAt })).mode).toBe('rise');
  });

  it('gives up a leap it can\'t get up to the surface for', () => {
    const rising = stepTarpon(TARPON_START, sense());
    expect(stepTarpon(rising, sense({ now: rising.until })).mode).toBe('cruise');
  });
});

describe('tarpon: leaping away', () => {
  it('leaps far away from you when you get close, then wears out after a few', () => {
    let s = stepTarpon(TARPON_START, sense({ rel: 'hide', dist: 800 }));
    expect(s.mode).toBe('wary');
    let now = 1000;
    for (let leap = 1; leap <= TARPON.escapeLeaps; leap++) {
      s = stepTarpon(s, sense({ rel: 'hide', dist: 200, now, x: 1000, side: 1 }));
      expect(s).toMatchObject({ mode: 'rise', flop: false, landX: 1000 - TARPON.escapeLeap });
      s = stepTarpon(s, sense({ rel: 'hide', now, atSurface: true }));
      s = stepTarpon(s, sense({ rel: 'hide', now: now + 900, landed: true }));
      expect(s.mode).toBe('wary');
      now = s.leapAt;
    }
    const spent = stepTarpon(s, sense({ rel: 'hide', dist: 200, now }));
    expect(spent.mode).toBe('spent');
    expect(stepTarpon(spent, sense({ rel: 'hide', dist: 200, now: spent.until })).mode).toBe('wary');
  });

  it('waits out its cooldown between escape leaps', () => {
    const s = run(TARPON_START, [{ rel: 'hide' }, { rel: 'hide', dist: 200 }, { rel: 'hide', atSurface: true }, { rel: 'hide', landed: true }]);
    expect(stepTarpon(s, sense({ rel: 'hide', dist: 200, now: s.leapAt - 1 })).mode).toBe('wary');
  });
});
