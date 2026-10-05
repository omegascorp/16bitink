import { describe, expect, it } from 'vitest';
import { SHARK, SHARK_START, stepShark, type SharkSense, type SharkState } from '../src/logic/bosses/shark';

const sense = (over: Partial<SharkSense> = {}): SharkSense => ({
  now: 1000, dt: 0.1, rel: 'hunt', dist: 400, seen: true, dashed: false, blood: null, ...over,
});

/** Circles for `seconds`, one step per 0.1 s, from `now`. */
function circle(s: SharkState, seconds: number, now: number, over: Partial<SharkSense> = {}): SharkState {
  let out = s;
  for (let k = 1; k <= seconds * 10 && out.mode === 'circle'; k++) out = stepShark(out, sense({ now: now + k * 100, ...over }));
  return out;
}

describe('reef shark: circling', () => {
  it('starts circling when you come near and tightens lap by lap', () => {
    const c = stepShark(SHARK_START, sense());
    expect(c.mode).toBe('circle');
    const tighter = circle(c, 1, 1000);
    expect(tighter.radius).toBeLessThan(c.radius);
  });

  it('flexes and strikes once the circle is tight, then rests', () => {
    const c = stepShark(SHARK_START, sense());
    const time = (c.radius - SHARK.strikeRadius) / SHARK.tighten + 0.2;
    const flex = circle(c, Math.ceil(time), 1000);
    expect(flex.mode).toBe('flex');
    const strike = stepShark(flex, sense({ now: flex.until }));
    expect(strike.mode).toBe('strike');
    const rest = stepShark(strike, sense({ now: strike.until }));
    expect(rest.mode).toBe('rest');
    expect(stepShark(rest, sense({ now: rest.until }))).toMatchObject({ mode: 'cruise', radius: SHARK.circleStart });
  });

  it('starts wide again when you dash', () => {
    const tight = circle(stepShark(SHARK_START, sense()), 2, 1000);
    expect(stepShark(tight, sense({ now: 4000, dashed: true })).radius).toBe(SHARK.circleStart);
  });
});

describe('reef shark: blood in the water', () => {
  it('rushes to blood it smells, then goes back to hunting', () => {
    const frenzy = stepShark(SHARK_START, sense({ blood: { x: 50, y: 60, dist: 700 } }));
    expect(frenzy).toMatchObject({ mode: 'frenzy', bloodX: 50, bloodY: 60 });
    expect(stepShark(frenzy, sense({ now: frenzy.until, dist: 2000 })).mode).toBe('cruise');
  });

  it('settles down for a while after a frenzy before blood draws it again', () => {
    const frenzy = stepShark(SHARK_START, sense({ blood: { x: 0, y: 0, dist: 300 } }));
    const calm = stepShark(frenzy, sense({ now: frenzy.until, dist: 2000 }));
    expect(stepShark(calm, sense({ now: frenzy.until + 100, dist: 2000, blood: { x: 0, y: 0, dist: 300 } })).mode).toBe('cruise');
    expect(stepShark(calm, sense({ now: calm.smellAt, dist: 2000, blood: { x: 0, y: 0, dist: 300 } })).mode).toBe('frenzy');
  });

  it("doesn't smell blood too far away, or break off a strike for it", () => {
    expect(stepShark(SHARK_START, sense({ dist: 2000, blood: { x: 0, y: 0, dist: SHARK.smell + 1 } })).mode).toBe('cruise');
    const strike = { ...SHARK_START, mode: 'strike' as const, until: 5000 };
    expect(stepShark(strike, sense({ blood: { x: 0, y: 0, dist: 100 } })).mode).toBe('strike');
  });

  it('keeps away once you are bigger, but blood still draws it in', () => {
    const wary = stepShark(SHARK_START, sense({ rel: 'hide' }));
    expect(wary.mode).toBe('wary');
    const lured = stepShark(wary, sense({ rel: 'hide', blood: { x: 0, y: 0, dist: 500 } }));
    expect(lured.mode).toBe('frenzy');
    expect(stepShark(lured, sense({ rel: 'hide', now: lured.until })).mode).toBe('wary');
  });
});
