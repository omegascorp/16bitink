import { describe, expect, it } from 'vitest';
import { COVER_DEBUT, HIDE_START, insidePatch, planCover, stepHide, ZONE_COVER, type HideState } from '../src/levels/cover';

const rules = { maxMs: 6000, cooldownMs: 4000 };

describe('hiding places', () => {
  it('grow where real fish shelter, and not in open water', () => {
    for (const zone of ['tidepool', 'seagrass', 'kelp', 'reef'] as const) expect(ZONE_COVER[zone].kinds.length).toBeGreaterThan(0);
    for (const zone of ['twilight', 'midnight', 'abyss', 'trench'] as const) expect(planCover('c9-l5', 85, zone, 3200)).toEqual([]);
  });

  it('only appear from their debut level on', () => {
    expect(planCover('c1-l2', COVER_DEBUT - 1, 'tidepool', 3200)).toEqual([]);
    expect(planCover('c1-l3', COVER_DEBUT, 'tidepool', 3200).length).toBeGreaterThan(0);
  });

  it('are spread across the level, inside the world, and differ per level', () => {
    const plan = planCover('c3-l4', 24, 'kelp', 3200);
    expect(plan.length).toBeGreaterThanOrEqual(3);
    for (const p of plan) expect(p.x - p.half > 0 && p.x + p.half < 3200).toBe(true);
    const xs = plan.map((p) => p.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThan(200);
    expect(planCover('c3-l5', 25, 'kelp', 3200)).not.toEqual(plan);
  });

  it('hide you only when you are down inside the patch', () => {
    const p = { kind: 'grass' as const, x: 1000, half: 120, height: 200 };
    const floor = 1700;
    expect(insidePatch(p, 1000, 1650, 20, floor)).toBe(true);
    expect(insidePatch(p, 1000, 1400, 20, floor)).toBe(false);
    expect(insidePatch(p, 1300, 1650, 20, floor)).toBe(false);
  });
});

describe('hiding', () => {
  const run = (frames: readonly boolean[], start: HideState = HIDE_START): { state: HideState; spotted: number } => {
    let state = start;
    let spotted = 0;
    frames.forEach((inside, i) => {
      const r = stepHide(state, inside, i * 1000, 1000, rules);
      state = r.state;
      spotted += r.spotted ? 1 : 0;
    });
    return { state, spotted };
  };

  it('hides you while inside, for a limited time', () => {
    expect(run([true, true]).state.hidden).toBe(true);
    const long = run(Array(7).fill(true));
    expect(long.spotted).toBe(1);
    expect(long.state.hidden).toBe(false);
  });

  it('makes you leave and wait before cover works again', () => {
    const spottedThenStay = run([...Array(6).fill(true), true, true, true, true, true, true]);
    expect(spottedThenStay.state.hidden).toBe(false);
    // Leave, then come back too soon: still exposed.
    const tooSoon = run([...Array(6).fill(true), false, true]);
    expect(tooSoon.state.hidden).toBe(false);
    // Leave, wait out the cooldown, come back: hidden again.
    const later = run([...Array(6).fill(true), false, false, false, false, false, true]);
    expect(later.state.hidden).toBe(true);
  });

  it('resets the timer each time you come out', () => {
    expect(run([true, true, true, false, true, true, true, true]).spotted).toBe(0);
  });
});
