import { describe, expect, it } from 'vitest';
import { bodyProportions } from '../src/art/fishArt';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { canSwallow, PLAYER_ABILITY } from '../src/logic/abilities';
import { relationTo } from '../src/logic/sizing';
import {
  BITE_AT, CAPTIONS, captionAlpha, FANG_LEN, FANG_SIZE, fangAlarm, fangAt, fangMurk, GULP_AT, growthBar, insertion, LOOP_S, lureGlow, pullAt, SCALE, SOUNDS, SPURT,
  SUCK_FROM, VIPER_LEN, VIPER_SIZE, viewAt, viperBelly, viperEyes, viperFish, viperJaw, viperLength, type View, type WorldFish,
} from '../dev/promo/gape/story';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FOCUS = { x: 540, y: 800 };
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

/** What the camera shows of a fish: screen position and length. */
const seen = (f: WorldFish, v: View) => ({ x: FOCUS.x + v.zoom * (f.x - v.x), y: FOCUS.y + v.zoom * (f.y - v.y), length: v.zoom * f.length });

const fangFish = (t: number): WorldFish => {
  const f = fangAt(t);
  if (f.kind === 'gone') throw new Error(`no fangtooth at ${t}`);
  return f.fish;
};

function expectSameOnScreen(a: WorldFish, va: View, b: WorldFish, vb: View): void {
  const sa = seen(a, va);
  const sb = seen(b, vb);
  expect(sb.x).toBeCloseTo(sa.x, 1);
  expect(sb.y).toBeCloseTo(sa.y, 1);
  expect(sb.length).toBeCloseTo(sa.length, 1);
  expect(b.facing).toBe(a.facing);
  expect(b.tilt).toBeCloseTo(a.tilt, 3);
  expect(b.effort).toBeCloseTo(a.effort, 3);
  expect(wrap(b.beat - a.beat)).toBeCloseTo(0, 3);
}

describe('promo short: how did that fit', () => {
  it('loops: the next fangtooth at the end is the first at the start, scaled up by the camera’s pull-back', () => {
    expect(pullAt(END)).toBeCloseTo(pullAt(0) + 1, 6);
    expectSameOnScreen(viperFish(0), viewAt(0), viperFish(END), viewAt(END));
    expectSameOnScreen(fangFish(0), viewAt(0), fangFish(END), viewAt(END));
    expect(fangAt(0).kind).toBe('swimming');
    expect(fangAt(END).kind).toBe('swimming');
    expect(viperJaw(END)).toBeCloseTo(viperJaw(0), 3);
    expect(viperBelly(END).size).toBeCloseTo(0, 6);
    expect(viperBelly(0).size).toBe(0);
    expect(viperEyes(END)).toBe(viperEyes(0));
    expect(fangAlarm(END)).toBeCloseTo(fangAlarm(0), 4);
    expect(fangMurk(END)).toBeCloseTo(0, 6);
    expect(lureGlow(END)).toBeCloseTo(lureGlow(0), 4);
    expect(growthBar(END).alpha).toBe(0);
    expect(growthBar(0).alpha).toBe(0);
  });

  it('opens on the strike: the jaw already swinging wide and the fangtooth’s "!" up', () => {
    expect(viperJaw(0)).toBeGreaterThan(1.5);
    expect(viperJaw(FRAME)).toBeGreaterThan(viperJaw(0));
    expect(fangAlarm(0)).toBeGreaterThan(0.9);
  });

  it('moves smoothly on screen: no frame jumps further than a lunge, the camera included', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const next = (t + FRAME) % LOOP_S;
      const a = seen(viperFish(t), viewAt(t));
      const b = seen(viperFish(next), viewAt(next));
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(40);
      const v = viewAt(t);
      const w = viewAt(next);
      expect(Math.hypot(v.zoom * v.x - w.zoom * w.x, v.zoom * v.y - w.zoom * w.y)).toBeLessThan(40);
      const fa = fangAt(t);
      const fb = fangAt(next);
      if (fa.kind !== 'gone' && fb.kind !== 'gone') {
        const p = seen(fa.fish, viewAt(t));
        const q = seen(fb.fish, viewAt(next));
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThan(45);
      }
    }
  });

  it('keeps the viper big, in frame, and between the captions and the growth bar', () => {
    for (let t = 0; t < LOOP_S; t += 0.1) {
      const s = seen(viperFish(t), viewAt(t));
      expect(s.length).toBeGreaterThan(440);
      expect(s.x - s.length / 2).toBeGreaterThan(0);
      expect(s.x + s.length / 2).toBeLessThan(1080);
      expect(s.y).toBeGreaterThan(620);
      expect(s.y).toBeLessThan(960);
    }
  });

  it('is faithful to the game: a fangtooth the viper’s own size, which only the gape can swallow', () => {
    expect(PLAYER_ABILITY.viperfish).toBe('gape');
    expect(relationTo(VIPER_SIZE, FANG_SIZE)).toBe('peer');
    expect(FANG_SIZE).toBeGreaterThanOrEqual(VIPER_SIZE);
    expect(canSwallow('gape', relationTo(VIPER_SIZE, FANG_SIZE))).toBe(true);
    expect(canSwallow('ink', relationTo(VIPER_SIZE, FANG_SIZE))).toBe(false);
    // Chapter 8 spawns fangtooth at sizes 36 .. 54 (content/paid.ts): both meals are real ones.
    for (const size of [FANG_SIZE, FANG_SIZE * SCALE]) {
      expect(size).toBeGreaterThanOrEqual(36);
      expect(size).toBeLessThanOrEqual(54 * 1.15);
    }
    // Drawn the game's way, it is the deeper fish by far, and nearly as long.
    const fangDepth = (FANG_LEN * bodyProportions('fangtooth').hh) / bodyProportions('fangtooth').hl;
    const viperDepth = (VIPER_LEN * bodyProportions('viperfish').hh) / bodyProportions('viperfish').hl;
    expect(fangDepth).toBeGreaterThan(2 * viperDepth);
    expect(FANG_LEN).toBeGreaterThan(0.75 * VIPER_LEN);
  });

  it('swallows it whole: dragged in from where it was, stuck, all in by the gulp, and the belly balloons', () => {
    const before = fangFish(SUCK_FROM - 1e-6);
    const after = fangFish(SUCK_FROM);
    expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(1);
    expect(insertion(BITE_AT + 0.5)).toBeGreaterThan(0.2);
    expect(insertion(GULP_AT - 0.5)).toBeLessThan(0.8);
    expect(insertion(GULP_AT - 1e-6)).toBeGreaterThan(0.95);
    expect(fangAt(GULP_AT).kind).toBe('gone');
    expect(viperJaw(GULP_AT - 0.01)).toBeGreaterThan(2.5);
    expect(viperJaw(GULP_AT + 0.1)).toBeLessThan(0.05);
    expect(viperBelly(GULP_AT + 0.3).size).toBeGreaterThan(1);
    // The payoff lands 40-50% of the way in.
    expect(GULP_AT / LOOP_S).toBeGreaterThan(0.38);
    expect(GULP_AT / LOOP_S).toBeLessThan(0.5);
  });

  it('grows one stage on the meal: SCALE times longer, as the game steps sizes', () => {
    expect(viperLength(SPURT - 0.01)).toBeCloseTo(VIPER_LEN, 6);
    expect(viperLength(SPURT + 2)).toBeCloseTo(VIPER_LEN * SCALE, 2);
    expect(SCALE).toBeGreaterThan(1.3);
    expect(SCALE).toBeLessThan(1.5);
  });

  it('shows the same words either side of the loop point, with something to read in the first frame', () => {
    for (const c of CAPTIONS) {
      expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
      expect(c.y).toBeGreaterThan(270);
      expect(c.y).toBeLessThan(1250);
    }
    expect(CAPTIONS.some((c) => captionAlpha(c, 0) === 1)).toBe(true);
    // Never two at once.
    for (let t = 0; t < LOOP_S; t += 0.05) expect(CAPTIONS.filter((c) => captionAlpha(c, t) > 0).length).toBeLessThanOrEqual(1);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
