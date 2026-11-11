import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { boilAt } from '../dev/promo/sprites';
import {
  beamTilt, BIGGEST_AT, captionAt, CREDIT, CTA, CTA_AT, CTA_END, ctaAt, CUT, endOf, FAWN_AT, FAWN_DOWN_AT, fawnDrop, fawnWeight, gapeAt, HEAVIER_AT,
  HOOK_LINES, hookAlpha, hookClock, hookPose, IRIS_AT, irisAt, LAND_AT, LAST_END, lengthLabel, liftAt, LINE_WORDS, LINES, LOOP_S, lumpPulse, percentAt,
  PICKED_AT, RECORDED_AT, ribbonAt, sceneAt, snakeWeight, SOUNDS, startle, startOf, stateAt, SWALLOWED_AT, TEXT, THIRTY_FIVE_AT, THIRTY_ONE_AT, THREW_AT,
  throwUp, UP_AT, wrap,
} from '../dev/promo/deer/story';
import { TEMPO, WORDS } from '../dev/promo/deer/words';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);
const text = (i: number): string => LINES[i]!.words.map((w) => w.text).join(' ');

describe('promo short: the python that swallowed a fawn heavier than itself (narrated, InkSnake)', () => {
  it('is 21 s, a multiple of 1.5 s, and the voice ends about 0.3 s before the loop point', () => {
    expect(LOOP_S).toBe(21);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(LOOP_S)).toBe(boilAt(0));
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
    expect(WORDS[WORDS.length - 1]!.text).toBe('remember:');
    expect(LOOP_S - LAST_END).toBeCloseTo(0.3, 1);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.15);
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S', () => {
    const [start, end] = [stateAt(0), stateAt(END)];
    expect(Object.keys(end)).toEqual(Object.keys(start));
    for (const key of Object.keys(start)) expect(end[key], key).toBeCloseTo(start[key]!, 3);
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    expect(sceneAt(0)).toBe('hook');
    expect(irisAt(0)).toBe(1);
    expect(irisAt(END)).toBe(1);
    expect(hookClock(END)).toBeCloseTo(0, 4);
  });

  it('runs frame 1 on its own clock through the loop point, so nothing jumps', () => {
    for (const t of FRAMES) {
      if (irisAt(t) <= 0 || irisAt(t + FRAME) <= 0) continue;
      expect(Math.abs(hookPose(t + FRAME).zoom - hookPose(t).zoom), `zoom at ${t}`).toBeLessThan(0.02);
      expect(Math.abs(hookPose(t + FRAME).walk - hookPose(t).walk), `walk at ${t}`).toBeLessThan(0.5);
    }
    expect(hookPose(SWALLOWED_AT + 0.1).gulp).toBeGreaterThan(0.8);
    expect(hookPose(HEAVIER_AT + 0.1).gulp).toBeGreaterThan(0.8);
  });

  it('opens on the hook in full, whatever the sound, with no numbers, call to action or credit', () => {
    expect(hookAlpha(0)).toBe(1);
    expect([text(0), text(1), text(2)]).toEqual(['This python swallowed', 'a deer HEAVIER', 'than itself!']);
    expect(ctaAt(0)).toBe(0);
    expect(creditAt(0, LOOP_S, CREDIT.from)).toBe(0);
    const s = stateAt(0);
    for (const key of ['w31', 'w35', 'length', 'percent', 'ribbon', 'cta']) expect(s[key], key).toBe(0);
  });

  it('cuts to each beat just before its first word, in story order', () => {
    expect(sceneAt(startOf(8))).toBe('scale');
    expect(sceneAt(startOf(15))).toBe('spot');
    expect(sceneAt(startOf(25))).toBe('lift');
    expect(sceneAt(startOf(38))).toBe('record');
    expect(sceneAt(startOf(53))).toBe('rest');
    const cuts = [CUT.scale, CUT.spot, CUT.lift, CUT.record, CUT.rest, IRIS_AT];
    for (let i = 1; i < cuts.length; i++) expect(cuts[i]!).toBeGreaterThan(cuts[i - 1]!);
    for (const c of Object.values(CUT)) expect(c).toBeGreaterThan(0);
  });

  it('tells it in order: the weights, the drop and thunk, the lump, the lift, the fawn thrown up, the record', () => {
    expect(snakeWeight(THIRTY_ONE_AT - 0.2)).toBe(0);
    expect(snakeWeight(THIRTY_ONE_AT + 0.2)).toBe(1);
    expect(fawnDrop(FAWN_AT - 0.2)).toBe(0);
    expect(fawnDrop(LAND_AT + 0.01)).toBe(1);
    expect(LAND_AT).toBeLessThan(THIRTY_FIVE_AT);
    expect(beamTilt(FAWN_AT)).toBeLessThan(0);
    expect(beamTilt(THIRTY_FIVE_AT + 0.5)).toBeGreaterThan(0.1);
    expect(fawnWeight(THIRTY_FIVE_AT - 0.2)).toBe(0);
    expect(fawnWeight(THIRTY_FIVE_AT + 0.2)).toBe(1);
    expect(lumpPulse(startOf(20) + 0.1)).toBeGreaterThan(0.8);
    expect(lengthLabel(startOf(17))).toBe(1);
    expect(liftAt(PICKED_AT - 0.3)).toBe(0);
    expect(liftAt(endOf(29) + 0.1)).toBe(1);
    expect(gapeAt(THREW_AT - 0.3)).toBe(0);
    expect(gapeAt(THREW_AT + 0.1)).toBe(1);
    expect(throwUp(THREW_AT - 0.1)).toBe(0);
    expect(throwUp(FAWN_DOWN_AT)).toBe(1);
    expect(FAWN_DOWN_AT).toBeLessThan(UP_AT);
    expect(startle(UP_AT)).toBe(1);
    expect(percentAt(BIGGEST_AT - 0.2)).toBe(0);
    expect(percentAt(BIGGEST_AT + 0.2)).toBe(1);
    expect(ribbonAt(RECORDED_AT - 0.2)).toBe(0);
    expect(ribbonAt(RECORDED_AT + 0.2)).toBe(1);
  });

  it('keeps the call to action to the last seconds, gone 0.6 s before the loop point', () => {
    for (const t of FRAMES.filter((f) => f < CTA_AT)) {
      expect(ctaAt(t), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(LOOP_S - CTA_AT).toBeGreaterThan(2);
    expect(LOOP_S - CTA_AT).toBeLessThan(3.6);
    expect(CTA_END).toBe(LOOP_S - 0.6);
    expect(ctaAt((CTA_AT + CTA_END) / 2)).toBe(1);
    expect(creditAt((CTA_AT + CTA_END) / 2, LOOP_S, CREDIT.from)).toBeGreaterThan(0);
    for (const t of FRAMES.filter((f) => f >= CTA_END)) {
      expect(ctaAt(t), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(CREDIT.text).toBe('InkSnake · 16bit.ink/snake');
    expect(CTA.big.text).toBe('16bit.ink/snake');
    expect(CTA.small.text).toBe('tap the channel name');
    expect(IRIS_AT).toBeGreaterThanOrEqual(CTA_END - 0.05);
  });

  it('cuts the voice into lines that follow WORDS, highlighting the word being said', () => {
    expect(LINE_WORDS.reduce((s, n) => s + n, 0)).toBe(WORDS.length);
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(4);
    for (let i = HOOK_LINES + 1; i < LINES.length; i++) expect(LINES[i]!.from).toBeCloseTo(LINES[i - 1]!.to, 6);
    for (const w of WORDS.slice(LINE_WORDS.slice(0, HOOK_LINES).reduce((s, n) => s + n, 0))) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end);
    expect(startOf(0)).toBeGreaterThanOrEqual(0);
    expect(endOf(WORDS.length - 1)).toBeLessThan(LOOP_S);
  });

  it('never says what the paper does not', () => {
    const said = WORDS.map((w) => w.text.toLowerCase()).join(' ');
    for (const word of ['adult', 'kilo', 'dissect', 'died', 'dead', 'head first', 'digest']) expect(said).not.toContain(word);
  });

  it('keeps every word and the call to action between y 270 and 1250', () => {
    const top = (baseline: number, size: number): number => baseline - size * 0.8;
    const bottom = (baseline: number, size: number): number => baseline + size * 0.3;
    expect(top(TEXT.hook.y, TEXT.hook.size)).toBeGreaterThan(270);
    expect(bottom(TEXT.hook.y + (HOOK_LINES - 1) * TEXT.hook.gap, TEXT.hook.size)).toBeLessThan(1250);
    expect(top(TEXT.line.y, TEXT.line.size)).toBeGreaterThan(270);
    expect(bottom(TEXT.line.y, TEXT.line.size)).toBeLessThan(1250);
    for (const l of [CTA.big, CTA.small]) {
      expect(top(l.y, l.size)).toBeGreaterThan(270);
      expect(bottom(l.y, l.size)).toBeLessThan(1250);
    }
    expect(CTA.arrow.from.y).toBeGreaterThan(CTA.small.y);
  });

  it('plays every sound inside the loop, quietly under the voice', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeLessThanOrEqual(0.7);
    }
  });
});
