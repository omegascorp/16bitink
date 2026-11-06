import { describe, expect, it } from 'vitest';
import { insectsAt } from '../dev/promo/crabbird/audio';
import {
  AT, captionsAt, climbAt, CRAB_SCALE, CTA, ctaAt, EYE_PAIRS, gameAt, GAME_LINE, hookBird, hookCrab, LOOP_S, nightBird, nightCrab, shotsAt, stateAt,
} from '../dev/promo/crabbird/story';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS } from '../dev/promo/sprites';
import { BOIL } from '../src/art/palette';

const FRAME = 1 / 30;

describe('promo short: this crab took down a bird (no voice)', () => {
  it('lasts a whole number of video frames, line-boil cycles and 1.5 s beats', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect((LOOP_S * BOIL_FPS) % BOIL).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S', () => {
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    expect(stateAt(0).shots.under.id).toBe('hook');
    expect(stateAt(0).shots.over).toBeNull();
  });

  it('flows into the loop point: the last wash lands on frame 1, nothing jumps', () => {
    const last = shotsAt(LOOP_S - 1e-6);
    expect(last.over?.id).toBe('hook');
    expect(last.u).toBeCloseTo(1, 4);
    const [a, b] = [hookCrab(-1e-6), hookCrab(0)];
    expect(a.bigClaw.wrist.x).toBeCloseTo(b.bigClaw.wrist.x, 3);
    expect(a.bigClaw.open).toBeCloseTo(b.bigClaw.open, 3);
    expect(hookBird(-1e-6).breath).toBeCloseTo(hookBird(0).breath, 3);
    expect(insectsAt(LOOP_S)).toBe(insectsAt(0));
    expect(ctaAt(0)).toBe(0);
    expect(ctaAt(LOOP_S)).toBe(0);
  });

  it('climbs back into the pose of frame 1, and the crab never jumps on the way', () => {
    const [end, hook] = [nightCrab(AT.climbEnd - 1e-6)!, hookCrab(AT.climbEnd)];
    expect(end.x).toBeCloseTo(hook.x, 1);
    expect(end.y).toBeCloseTo(hook.y, 1);
    expect(end.heading).toBeCloseTo(hook.heading, 2);
    end.feet.forEach((f, i) => expect(Math.hypot(f.x - hook.feet[i]!.x, f.y - hook.feet[i]!.y)).toBeLessThan(4));
    for (let t = AT.reach; t < AT.fall; t += FRAME) {
      const [p, q] = [nightCrab(t)!, nightCrab(t + FRAME)!];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(60);
      // The claw's fast reach for the wing peaks near 60 px a frame; a pop would be far more.
      expect(Math.hypot(q.bigClaw.wrist.x - p.bigClaw.wrist.x, q.bigClaw.wrist.y - p.bigClaw.wrist.y)).toBeLessThan(70);
    }
  });

  it('starts below the frame: legs reach up the trunk before the body comes', () => {
    expect(climbAt(0).y).toBeGreaterThan(2000);
    expect(nightCrab(AT.reach - 0.01)).toBeNull();
  });

  it('wakes the bird only at the snap, and it falls after', () => {
    expect(hookBird(0).eye).toBe(0);
    expect(nightBird(AT.snap - 0.01).eye).toBe(0);
    expect(nightBird(AT.snap + 0.1).eye).toBeGreaterThan(0.9);
    expect(nightBird(AT.fall + 0.5).y).toBeGreaterThan(nightBird(AT.fall).y + 200);
  });

  it('keeps to the checked facts: one pair of eyes, then five more; no size or pinch numbers', () => {
    expect(EYE_PAIRS).toHaveLength(6);
    expect(EYE_PAIRS.filter((p) => p.at === AT.firstEyes)).toHaveLength(1);
    expect(EYE_PAIRS.slice(1).every((p) => p.at >= AT.moreEyes)).toBe(true);
    const words = Array.from({ length: LOOP_S * 30 }, (_, i) => captionsAt(i / 30).map((c) => c.text)).flat();
    const seen = new Set(words);
    expect(seen).toEqual(new Set([
      'THIS CRAB TOOK', 'DOWN A BIRD', 'Middle of the night', 'SNAP', '5 more arrived', 'A scientist watched it all.', 'Chagos, 2016',
    ]));
    expect(GAME_LINE.join(' ')).toBe('Eat. Grow. Find a bigger shell.');
  });

  it('keeps its words inside the safe area', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      for (const c of captionsAt(t)) {
        expect(c.y).toBeLessThanOrEqual(1250);
        expect(c.y - c.size * 0.8).toBeGreaterThanOrEqual(240);
      }
    }
    expect(CTA.y).toBeLessThanOrEqual(1250);
    expect(CTA.subY).toBeLessThanOrEqual(1250);
  });

  it('holds the invitation for the last 3 s, gone 0.6 s before the loop point', () => {
    for (let t = 0; t < LOOP_S - 3; t += FRAME) expect(ctaAt(t)).toBe(0);
    for (let t = LOOP_S - 0.6; t <= LOOP_S; t += FRAME) expect(ctaAt(t)).toBe(0);
    expect(ctaAt(11.5)).toBe(1);
  });

  it('points the arrow down-left at the channel name, above the phone UI line', () => {
    for (const p of CTA.arrow) {
      expect(p.y).toBeLessThanOrEqual(1480);
      expect(p.x).toBeGreaterThanOrEqual(60);
    }
    const [from, tip] = [CTA.arrow[0]!, CTA.arrow[CTA.arrow.length - 1]!];
    expect(tip).toEqual({ x: 170, y: 1470 });
    expect(tip.x).toBeLessThan(from.x);
    expect(tip.y).toBeGreaterThan(from.y);
  });

  it('keeps the credit out of the first 10 s when asked, default unchanged', () => {
    const inAt = (AT.gameIn + 0.05) / LOOP_S;
    for (let t = 0; t < 10; t += FRAME) expect(creditAt(t, LOOP_S, inAt)).toBe(0);
    expect(creditAt(11.5, LOOP_S, inAt)).toBeGreaterThan(0.7);
    expect(creditAt(LOOP_S - 0.6, LOOP_S, inAt)).toBe(0);
    expect(creditAt(0.6 * LOOP_S, LOOP_S)).toBeGreaterThan(0.7);
    expect(creditAt(0.6 * LOOP_S, LOOP_S, undefined)).toBe(creditAt(0.6 * LOOP_S, LOOP_S));
  });

  it('shows the game: its crab eats, grows and moves up a shell', () => {
    const [start, end] = [gameAt(AT.game), gameAt(AT.wash)];
    expect(end.size).toBeGreaterThan(start.size * 1.3);
    expect(start.moved).toBe(0);
    expect(end.moved).toBe(1);
    expect(end.food.every((f) => f.left === 0)).toBe(true);
    expect(CRAB_SCALE).toBeGreaterThan(0);
  });
});
