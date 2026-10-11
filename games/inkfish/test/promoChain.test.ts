import { describe, expect, it } from 'vitest';
import {
  aliveAt, CHAIN, EATEN_AGE, GULP_AGE, LOOP_S, mouthOf, poseOf, speciesOf, STAGE_S, type Frame,
} from '../dev/promo/chain';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { BITE_SOUNDS, jawOpen, shake, SWALLOW } from '../dev/promo/eating';
import { realTime, storyTime } from '../dev/promo/timing';

const FRAME: Frame = { cx: 540, cy: 845, unit: 1150 };

describe('promo food-chain loop', () => {
  it('puts each predator\'s mouth on its prey at the moment of the gulp', () => {
    for (const j of [-1, 0, 1, 4, 5]) {
      const tau = j + EATEN_AGE;
      const prey = poseOf(j, tau, FRAME);
      const predator = poseOf(j + 1, tau, FRAME);
      expect(predator.age).toBeCloseTo(GULP_AGE);
      const mouth = mouthOf(predator);
      expect(mouth.x).toBeCloseTo(prey.x, 6);
      expect(mouth.y).toBeCloseTo(prey.y, 6);
    }
  });

  it('makes each predator GROWTH times its prey and has them meet head-on', () => {
    const prey = poseOf(2, 2 + EATEN_AGE, FRAME);
    const predator = poseOf(3, 2 + EATEN_AGE, FRAME);
    expect(predator.length / prey.length).toBeCloseTo(3);
    expect(predator.facing).toBe(-prey.facing);
  });

  it('loops: one whole chain later every fish is back where it was', () => {
    // Mirroring alternates each generation, so the loop needs an even chain.
    expect(CHAIN.length % 2).toBe(0);
    for (const t of [0, 0.37, 1.9, 5.25]) {
      const tau = t / STAGE_S;
      const later = tau + CHAIN.length;
      expect(aliveAt(later)).toEqual(aliveAt(tau).map((j) => j + CHAIN.length));
      for (const j of aliveAt(tau)) {
        const a = poseOf(j, tau, FRAME);
        const b = poseOf(j + CHAIN.length, later, FRAME);
        expect(b.shape).toBe(a.shape);
        expect(b.x).toBeCloseTo(a.x, 6);
        expect(b.y).toBeCloseTo(a.y, 6);
        expect(b.length).toBeCloseTo(a.length, 6);
        expect(b.facing).toBe(a.facing);
      }
    }
  });

  it('wraps species round the chain, the biggest eaten by the smallest one size up', () => {
    expect(speciesOf(-1)).toBe(CHAIN[CHAIN.length - 1]);
    expect(speciesOf(CHAIN.length)).toBe(CHAIN[0]);
  });

  it('lasts a whole number of video frames and line-boil frames', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
  });
});

describe('promo bite timing', () => {
  it('opens the jaw just before the gulp, shuts it on the gulp, and keeps it shut while cruising', () => {
    expect(jawOpen(GULP_AGE - 0.3)).toBe(0);
    expect(jawOpen(GULP_AGE - 0.01)).toBeCloseTo(1);
    expect(jawOpen(GULP_AGE + 0.02)).toBe(0);
    expect(jawOpen(GULP_AGE + 0.6)).toBe(0);
  });

  it('swallows the prey while the eater\'s mouth is wide open', () => {
    expect(jawOpen(GULP_AGE - SWALLOW)).toBeGreaterThan(0.9);
  });

  it('shakes the camera the same way every stage, so the loop stays seamless', () => {
    for (const tau of [GULP_AGE + 0.03, GULP_AGE + 0.1, 0.9]) {
      expect(shake(tau + 1).x).toBeCloseTo(shake(tau).x, 9);
      expect(shake(tau + CHAIN.length).y).toBeCloseTo(shake(tau).y, 9);
    }
    expect(shake(GULP_AGE + 0.5)).toEqual({ x: 0, y: 0 });
  });

  it('keeps every bite sound within one stage of its gulp', () => {
    for (const cue of BITE_SOUNDS) expect(Math.abs(cue.age - GULP_AGE)).toBeLessThan(1);
  });
});

describe('promo slow motion', () => {
  it('keeps the loop exact: one real stage is one story stage, and gulps stay put', () => {
    for (const tau of [0, 0.13, GULP_AGE, 0.71, 3.4]) {
      expect(storyTime(tau + 1)).toBeCloseTo(storyTime(tau) + 1, 9);
    }
    for (const j of [0, 1, 5]) expect(storyTime(j + GULP_AGE)).toBeCloseTo(j + GULP_AGE, 9);
  });

  it('only ever moves forwards, slowest at the gulp', () => {
    const speed = (tau: number): number => (storyTime(tau + 1e-4) - storyTime(tau - 1e-4)) / 2e-4;
    for (let tau = 0; tau < 1; tau += 0.01) expect(speed(tau)).toBeGreaterThan(0.3);
    expect(speed(GULP_AGE)).toBeLessThan(0.5);
    expect(speed(GULP_AGE + 0.5)).toBeGreaterThan(1);
  });

  it('maps story time back to real time', () => {
    for (const story of [0.05, GULP_AGE - 0.1, 2.9]) expect(storyTime(realTime(story))).toBeCloseTo(story, 9);
  });
});
