import { describe, expect, it } from 'vitest';
import { isLongPress, LONG_PRESS_MS, pressStep, type PressEvent } from '../src/scenes/press';

/** Runs a button's pointer events in order; the events that ended a click. */
function clicks(events: readonly PressEvent[], enabled = true): number {
  let pressed = false;
  let n = 0;
  for (const ev of events) {
    const step = pressStep(pressed, ev, enabled);
    pressed = step.pressed;
    if (step.click) n++;
  }
  return n;
}

describe('button press', () => {
  it('clicks for a mouse: over, down, up', () => {
    expect(clicks(['over', 'down', 'up'])).toBe(1);
  });

  it('clicks for a touch, where Phaser sends over after down and out after up', () => {
    expect(clicks(['down', 'over', 'up', 'out'])).toBe(1);
  });

  it('does not click when the pointer slid off before letting go', () => {
    expect(clicks(['over', 'down', 'out', 'up'])).toBe(0);
  });

  it('does not click on a release that never pressed here', () => {
    expect(clicks(['over', 'up'])).toBe(0);
  });

  it('clicks once per press', () => {
    expect(clicks(['down', 'over', 'up', 'up'])).toBe(1);
    expect(clicks(['down', 'up', 'down', 'up'])).toBe(2);
  });

  it('never clicks while off', () => {
    expect(clicks(['down', 'over', 'up'], false)).toBe(0);
  });
});

describe('long press', () => {
  it('is a finger held still for half a second', () => {
    expect(isLongPress(LONG_PRESS_MS, 0)).toBe(true);
    expect(isLongPress(LONG_PRESS_MS + 400, 8)).toBe(true);
  });

  it('is not a quick tap or a drag', () => {
    expect(isLongPress(LONG_PRESS_MS - 1, 0)).toBe(false);
    expect(isLongPress(LONG_PRESS_MS + 400, 20)).toBe(false);
  });
});
