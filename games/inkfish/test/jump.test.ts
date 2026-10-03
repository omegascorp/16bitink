import { describe, expect, it } from 'vitest';
import { JUMP, stepSurface, type AirState } from '../src/logic/jump';

const TOP = 100;
const fly = (start: AirState, steps: number, canLeap = true): { state: AirState; events: string[] } => {
  let state = start;
  const events: string[] = [];
  for (let i = 0; i < steps; i++) {
    const r = stepSurface(state, TOP, 1 / 60, canLeap);
    state = r.state;
    if (r.event) events.push(r.event);
  }
  return { state, events };
};

describe('leaping out of the water', () => {
  it('needs speed: a gentle swim up stops at the surface', () => {
    const r = stepSurface({ y: TOP + 2, vy: -JUMP.minSpeed * 0.9, airborne: false }, TOP, 0.05, true);
    expect(r.event).toBeNull();
    expect(r.state.airborne).toBe(false);
  });

  it('a fast rush at the surface carries you into the air', () => {
    const r = stepSurface({ y: TOP + 2, vy: -800, airborne: false }, TOP, 0.05, true);
    expect(r.event).toBe('leap');
    expect(r.state.airborne).toBe(true);
    expect(r.state.y).toBeLessThan(TOP);
  });

  it('a fresh dash still leaps after it has slowed to swimming speed', () => {
    const slowed = { y: TOP + 2, vy: -200, airborne: false };
    expect(stepSurface(slowed, TOP, 0.05, true).event).toBeNull();
    expect(stepSurface(slowed, TOP, 0.05, true, true).event).toBe('leap');
  });

  it('never happens where there is no open surface', () => {
    expect(stepSurface({ y: TOP + 2, vy: -800, airborne: false }, TOP, 0.05, false).event).toBeNull();
  });

  it('arcs up, falls back and splashes in, slowed by the water', () => {
    const { state, events } = fly({ y: TOP - 1, vy: -800, airborne: true }, 120);
    expect(events).toEqual(['splash']);
    expect(state.airborne).toBe(false);
    expect(state.vy).toBeGreaterThan(0);
    expect(state.vy).toBeLessThan(800 * JUMP.entryDamp + 1);
  });

  it('even a modest rush makes a real arc, and the fastest stays inside the sky', () => {
    const slow = stepSurface({ y: TOP + 2, vy: -(JUMP.minSpeed + 10), airborne: false }, TOP, 0.05, true).state;
    expect(-slow.vy).toBeGreaterThanOrEqual(JUMP.minLaunch);
    const fast = stepSurface({ y: TOP + 2, vy: -5000, airborne: false }, TOP, 0.01, true).state;
    expect(-fast.vy).toBe(JUMP.maxLaunch);
    expect((JUMP.maxLaunch * JUMP.maxLaunch) / (2 * JUMP.gravity)).toBeLessThan(JUMP.maxHeight);
  });

  it('a dash-speed leap stays inside the sky above the water', () => {
    let state: AirState = { y: TOP - 1, vy: -JUMP.maxLaunch, airborne: true };
    let highest = state.y;
    for (let i = 0; i < 120 && state.airborne; i++) {
      state = stepSurface(state, TOP, 1 / 60, true).state;
      highest = Math.min(highest, state.y);
    }
    expect(TOP - highest).toBeGreaterThan(150);
    expect(TOP - highest).toBeLessThan(JUMP.maxHeight);
  });
});
