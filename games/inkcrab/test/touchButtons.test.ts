import { describe, expect, it } from 'vitest';
import { buttonAt, touchButtons } from '../src/scenes/hud/touchButtons';

const W = 844;
const H = 390;

describe('the touch buttons', () => {
  it('finds the grab button under a finger while it shows', () => {
    const grab = touchButtons(W, H).grab;
    expect(buttonAt(grab.x, grab.y, W, H)).toBe('grab');
    expect(buttonAt(grab.x, grab.y, W, H, true)).toBe('grab');
  });

  it('lets a press through where the grab button would be while it\'s hidden', () => {
    const grab = touchButtons(W, H).grab;
    expect(buttonAt(grab.x, grab.y, W, H, false)).toBeNull();
  });

  it('keeps the other buttons pressable while grab is hidden', () => {
    const spots = touchButtons(W, H);
    for (const name of ['jump', 'dig', 'hide'] as const) expect(buttonAt(spots[name].x, spots[name].y, W, H, false)).toBe(name);
  });
});
