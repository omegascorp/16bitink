import { describe, expect, it } from 'vitest';
import type { LevelDef } from '../src/level/types';
import { Glide } from '../src/logic/abilities/flying';
import { NO_INPUT } from '../src/logic/snake';
import { dist, pt } from '../src/logic/vec';
import { World } from '../src/logic/world';

/** One crown on an open floor, the flying snake starting at `start`. */
const level = (start: { x: number; y: number }): LevelDef => ({
  id: 'rainforest-test', name: 'Test', snake: 'flying', start, heading: 0, length: 100, target: 900, par: 60, prey: [],
  zones: [{ kind: 'tree', look: 'crown', shape: 'circle', x: 300, y: 270, r: 100 }],
});
const toward = (x: number, y: number) => ({ ...NO_INPUT, toward: pt(x, y) });

describe('the flying snake up in the canopy', () => {
  it('can’t slither off its tree: the end of the branches stops it', () => {
    const w = new World(level({ x: 300, y: 270 }), 0);
    for (let i = 0; i < 180; i++) w.step(toward(900, 270), 1 / 60);
    expect(dist(w.snake.head, pt(300, 270))).toBeLessThanOrEqual(100);
    expect((w.ability as Glide).down).toBe(false);
    expect((w.ability as Glide).prompt()?.mouse).toMatch(/glide/i);
  });

  it('down on the floor is slow, and climbs the first tree it reaches', () => {
    const w = new World(level({ x: 560, y: 270 }), 0);
    w.step(toward(300, 270), 1 / 60);
    const glide = w.ability as Glide;
    expect(glide.down).toBe(true);
    expect(glide.prompt()?.mouse).toMatch(/floor/i);
    for (let i = 0; i < 600 && glide.down; i++) w.step(toward(300, 270), 1 / 60);
    expect(glide.down).toBe(false);
    expect(dist(w.snake.head, pt(300, 270))).toBeLessThanOrEqual(100);
  });
});
