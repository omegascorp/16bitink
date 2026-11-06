import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { arrowPoint } from '../dev/promo/heartbeat/arrow';
import {
  arrowDraw, BEATS, bloomAt, BLOOM_AT, captionAlpha, CAPTIONS, coilProgress, coilShown, coilZoom, CREDIT, CTA, CTA_AT, CTA_END, ctaAt, GAME_AT, gameSqueeze, GULP_AT, heartAt, HOOK, LEADING, lifeAt, LOOP_S, LOOSEN_AT,
  OPEN_AT, pulseAt, ratEyeShut, RAT_END, RAT_LEN, ratHalf, rimAt, sceneAt, SOUNDS, stateAt, STOP_AT, SWALLOW_AT, swallowGape, tightAt, wrap,
} from '../dev/promo/heartbeat/story';
import { boilAt } from '../dev/promo/sprites';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

describe('promo short: the boa feels the heartbeat (no voice, InkSnake)', () => {
  it('is 13.5 s, a multiple of 1.5 s, so the line boil loops too', () => {
    expect(LOOP_S).toBe(13.5);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(LOOP_S)).toBe(boilAt(0));
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S', () => {
    const [start, end] = [stateAt(0), stateAt(END)];
    expect(Object.keys(end)).toEqual(Object.keys(start));
    for (const key of Object.keys(start)) expect(end[key], key).toBeCloseTo(start[key]!, 3);
    expect(start.coil).toBe(1);
    expect(end.coil).toBe(1);
    expect(sceneAt(0)).toBe('coil');
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
  });

  it('never jumps within a shot: tightness, the heart and the zoom move on smoothly, frame to frame, round the loop', () => {
    for (const t of FRAMES) {
      if (sceneAt(t) !== sceneAt(t + FRAME)) continue;
      expect(Math.abs(tightAt(t + FRAME) - tightAt(t)), `tight at ${t}`).toBeLessThan(0.2);
      expect(Math.abs(coilZoom(t + FRAME) - coilZoom(t)), `zoom at ${t}`).toBeLessThan(0.02);
      expect(Math.abs(lifeAt(t + FRAME) - lifeAt(t)), `life at ${t}`).toBeLessThan(0.13);
    }
  });

  it('opens mid-beat on the coils, with the hook in full and no call to action', () => {
    expect(pulseAt(0)).toBeGreaterThan(0.85);
    expect(heartAt(0).glow).toBeGreaterThan(0.8);
    expect(captionAlpha(HOOK, 0)).toBe(1);
    expect(ctaAt(0)).toBe(0);
  });

  it('tightens on each beat, in bursts, as long as the heart beats', () => {
    const beats = BEATS.filter((b) => b.t > 0 && b.t < 5);
    for (const b of beats) expect(tightAt(b.t + 0.25), `beat at ${b.t}`).toBeGreaterThan(tightAt(b.t - 0.01));
    expect(tightAt(5.5)).toBeGreaterThan(tightAt(1));
  });

  it('slows: the beats drift further apart and fainter, then stop', () => {
    const late = BEATS.filter((b) => b.t > 3).map((b) => b.t);
    const gaps = late.slice(1).map((t, i) => t - late[i]!);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]!).toBeGreaterThan(gaps[i - 1]!);
    const kicks = BEATS.filter((b) => b.t > 3.5).map((b) => b.k);
    for (let i = 1; i < kicks.length; i++) expect(kicks[i]!).toBeLessThan(kicks[i - 1]!);
    expect(lifeAt(STOP_AT)).toBe(0);
    expect(heartAt(STOP_AT + 0.3).glow).toBe(0);
    expect(pulseAt(STOP_AT + 0.4)).toBeLessThan(0.01);
    expect(ratEyeShut(STOP_AT + 0.3)).toBe(1);
  });

  it('lets go soon after the heart stops, not at once: a pause, then the coils loosen', () => {
    expect(LOOSEN_AT - STOP_AT).toBeGreaterThan(0.5);
    expect(tightAt(LOOSEN_AT - 0.01)).toBeCloseTo(tightAt(STOP_AT + 0.4), 2);
    expect(tightAt(LOOSEN_AT + 0.85)).toBeLessThan(0);
    expect(OPEN_AT).toBeGreaterThan(LOOSEN_AT);
    expect(SWALLOW_AT).toBeGreaterThan(OPEN_AT);
  });

  it('is silent on the stop: no sound starts between the last faint beat and the letting go', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.t > 5.7 && s.t < LOOSEN_AT, `${s.id} at ${s.t}`).toBe(false);
    }
    expect(BEATS.some((b) => b.t > STOP_AT)).toBe(false);
  });

  it('swallows head first: the rim runs from the rat\'s head to past its tail, the gape following its outline, and the jaws shut', () => {
    expect(rimAt(SWALLOW_AT)).toBeLessThan(200);
    expect(rimAt(GULP_AT)).toBeGreaterThanOrEqual(RAT_END);
    expect(ratHalf(RAT_LEN / 2)).toBeGreaterThan(ratHalf(100));
    expect(swallowGape(9.7)).toBeGreaterThan(120);
    expect(swallowGape(GAME_AT - 0.01)).toBeLessThan(10);
    for (const t of FRAMES) if (t > SWALLOW_AT && t < GAME_AT) expect(rimAt(t + FRAME)).toBeGreaterThanOrEqual(rimAt(t));
  });

  it('ends on the real game for the last 3 s: the loop closes, then squeezes, then frame 1 blooms out of the prey', () => {
    expect(LOOP_S - GAME_AT).toBe(3);
    expect(sceneAt(GAME_AT)).toBe('game');
    expect(coilProgress(GAME_AT + 1.25)).toBe(1);
    expect(gameSqueeze(GAME_AT + 1.2)).toBe(0);
    expect(gameSqueeze(BLOOM_AT)).toBe(1);
    expect(bloomAt(BLOOM_AT)).toBe(0);
    expect(bloomAt(END)).toBe(1);
    expect(coilShown(12)).toBe(0);
  });

  it('keeps the call to action to the last 3 s, gone 0.6 s before the loop point, and nothing of it in the first 10 s', () => {
    for (const t of FRAMES.filter((f) => f < 10)) {
      expect(ctaAt(t), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(ctaAt(11.5)).toBe(1);
    expect(creditAt(11.5, LOOP_S, CREDIT.from)).toBeGreaterThan(0);
    expect(CTA_AT).toBe(LOOP_S - 3);
    expect(CTA_END).toBe(LOOP_S - 0.6);
    for (const t of FRAMES.filter((f) => f >= CTA_END)) {
      expect(ctaAt(t), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(CREDIT.text).toBe('InkSnake · 16bit.ink/snake');
    expect(arrowDraw(CTA_END - 0.5)).toBe(1);
  });

  it('leaves the credit of the other shorts as it was', () => {
    expect(creditAt(0.39 * 20, 20)).toBe(0);
    expect(creditAt(0.5 * 20, 20)).toBeCloseTo(0.75, 6);
  });

  it('keeps the arrow above y = 1480 and right of x = 60, its tip by the channel name', () => {
    for (let i = 0; i <= 60; i++) {
      const p = arrowPoint(i / 60);
      expect(p.y).toBeLessThan(1480);
      expect(p.x).toBeGreaterThanOrEqual(60);
    }
    const tip = arrowPoint(1);
    expect(tip.x).toBeCloseTo(170, 0);
    expect(tip.y).toBeCloseTo(1470, 0);
  });

  it('keeps every word between y 270 and 1250', () => {
    const top = (baseline: number, size: number): number => baseline - size * 0.8;
    const bottom = (baseline: number, size: number): number => baseline + size * 0.3;
    for (const c of CAPTIONS) {
      expect(top(c.y, c.size), c.lines[0]).toBeGreaterThan(270);
      expect(bottom(c.y + (c.lines.length - 1) * c.size * LEADING, c.size), c.lines[0]).toBeLessThan(1250);
    }
    for (const l of [CTA.big, CTA.small]) {
      expect(top(l.y, l.size)).toBeGreaterThan(270);
      expect(bottom(l.y, l.size)).toBeLessThan(1250);
    }
  });

  it('says only the checked facts: no crushing, no suffocating, no pythons', () => {
    const words = CAPTIONS.flatMap((c) => c.lines).join(' ').toLowerCase();
    for (const banned of ['bone', 'crush', 'suffocat', 'python', 'blood', 'boa']) expect(words).not.toContain(banned);
  });
});
