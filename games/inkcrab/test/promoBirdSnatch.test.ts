import { describe, expect, it } from 'vitest';
import {
  AT, alarmAt, captionAt, CAPTION_Y, CUES, GROUND_Y, hiddenAt, hopAt, LOOP_S, loopOf, ospreyAt, rattleAt, shadowAt, T0, tauOf,
} from '../dev/promo/birdsnatch/story';
import { BOIL_FPS } from '../dev/promo/sprites';
import { BOIL } from '../src/art/palette';

const FRAME = 1 / 30;
const END = LOOP_S - 1e-7;

describe('promo short: this crab hid from an osprey (silent)', () => {
  it('lasts a whole number of video frames, line-boil cycles and 1.5 s beats', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect((LOOP_S * BOIL_FPS) % BOIL).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
  });

  it('loops: the last frame flows into the first, nothing jumps', () => {
    for (const t of [0, 5.4]) expect(loopOf(tauOf(t))).toBeCloseTo(t, 6);
    expect(tauOf(T0)).toBe(0);
    const [a, b] = [ospreyAt(tauOf(END)), ospreyAt(tauOf(0))];
    // The osprey of frame 1 is the one that flew in earlier: mid-dive at loop time 0.3, over the sea of frame 1's world, and nothing pops.
    for (const key of ['x', 'y', 'dive', 'tilt'] as const) expect(a[key]).toBeCloseTo(b[key], 2);
    for (const f of [hiddenAt, rattleAt, alarmAt, hopAt]) expect(f(tauOf(END))).toBeCloseTo(f(tauOf(0)), 3);
    expect(shadowAt(tauOf(END)).alpha).toBe(shadowAt(tauOf(0)).alpha);
    expect(captionAt(tauOf(END))).toEqual(captionAt(tauOf(0)));
  });

  it('frame 1 (t = 0.3) shows the story: osprey mid-dive over the crab, red shadow on the sand, the crab alarmed and not yet hidden', () => {
    const tau = tauOf(0.3);
    const osprey = ospreyAt(tau);
    expect(osprey.visible).toBe(true);
    expect(osprey.dive).toBe(1);
    expect(osprey.y).toBeGreaterThan(250);
    expect(osprey.y).toBeLessThan(GROUND_Y - 500);
    expect(shadowAt(tau).alpha).toBe(1);
    expect(shadowAt(tau).settle).toBe(1);
    expect(hiddenAt(tau)).toBe(0);
    expect(alarmAt(tau)).toBe(1);
    expect(captionAt(tau)?.text).toBe('lunch?');
  });

  it('plays the escape in order: dive, hide, strike, off, out, smug', () => {
    const order = [AT.fold, AT.dive, AT.alarm, AT.hide, AT.hidden, AT.hit, AT.out, AT.smug];
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(hiddenAt(AT.hit - 0.05)).toBe(1);
    expect(hiddenAt(AT.hit + 0.5)).toBe(1);
    expect(hiddenAt(AT.smug + 0.5)).toBe(0);
    expect(rattleAt(AT.hit - 0.01)).toBe(0);
    expect(Math.abs(rattleAt(AT.hit + 0.03))).toBeGreaterThan(0.05);
    // The cue sounds sit on the picture.
    expect(CUES.tok).toBe(AT.hit);
    expect(CUES.hide).toBeGreaterThanOrEqual(AT.hide);
    expect(CUES.hide).toBeLessThan(AT.hidden);
    // Gone from the sky before it's all over, back out of the crab only after it left.
    expect(ospreyAt(AT.out - 0.5).y).toBeLessThan(ospreyAt(AT.hit).y - 150);
    expect(ospreyAt(10.5).visible).toBe(false);
    expect(ospreyAt(AT.hit).dive).toBe(1);
    expect(shadowAt(AT.hit + 0.5).alpha).toBe(0);
  });

  it('shows only the three captions, each alone, in order', () => {
    const seen: string[] = [];
    for (let tau = 0; tau < LOOP_S; tau += FRAME) {
      const c = captionAt(tau);
      if (c && seen[seen.length - 1] !== c.text) seen.push(c.text);
    }
    expect(seen).toEqual(['lunch?', 'NOPE', 'still mine']);
    expect(captionAt(tauOf(0.3))?.alpha).toBe(1);
  });

  it('keeps its text inside the safe area (y 270..1250 of 1920)', () => {
    expect(CAPTION_Y).toBeLessThanOrEqual(1250);
    for (let tau = 0; tau < LOOP_S; tau += FRAME) {
      const c = captionAt(tau);
      if (c) expect(CAPTION_Y - c.size * 0.8).toBeGreaterThanOrEqual(270);
    }
  });
});
