import { describe, expect, it } from 'vitest';
import { knobOffset, stickDirection, STICK } from '../src/logic/joystick';

describe('the touch stick', () => {
  it('reads nothing while the thumb rests near the centre', () => {
    expect(stickDirection(0, 0)).toEqual({ ix: 0, iy: 0 });
    expect(stickDirection(STICK.radius * 0.2, -STICK.radius * 0.2)).toEqual({ ix: 0, iy: 0 });
  });

  it('walks left and right, and drills down and up, as the arrow keys do', () => {
    expect(stickDirection(STICK.radius, 0)).toEqual({ ix: 1, iy: 0 });
    expect(stickDirection(-STICK.radius, 0)).toEqual({ ix: -1, iy: 0 });
    expect(stickDirection(0, STICK.radius)).toEqual({ ix: 0, iy: 1 });
    expect(stickDirection(0, -STICK.radius)).toEqual({ ix: 0, iy: -1 });
  });

  it('keeps a pull that is mostly sideways a walk, and takes a true diagonal as both', () => {
    expect(stickDirection(STICK.radius, STICK.radius * 0.25)).toEqual({ ix: 1, iy: 0 });
    expect(stickDirection(STICK.radius * 0.7, STICK.radius * 0.7)).toEqual({ ix: 1, iy: 1 });
  });

  it('draws the knob no further out than the rim', () => {
    expect(knobOffset(10, 0)).toEqual({ x: 10, y: 0 });
    const far = knobOffset(STICK.radius * 3, 0);
    expect(far.x).toBeCloseTo(STICK.radius);
    expect(far.y).toBeCloseTo(0);
  });
});
