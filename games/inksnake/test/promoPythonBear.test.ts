import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { boilAt } from '../dev/promo/sprites';
import {
  ADMIT_AT, BEAR_AT, bearLabel, bulgeAt, calendarAt, CALENDAR_PAGES, captionAt, collarLift, CREDIT, CTA, CTA_AT, CTA_END, ctaAt, CUT, FOOT_AT, HOOK_LINES,
  hookAlpha, hookClock, hookPose, INSIDE_AT, insideShown, IRIS_AT, irisAt, IT_AT, LAST_END, lengthBar, LINES, LOOP_S, OPERATED_AT, OUT_END, sceneAt,
  SOUNDS, stateAt, STILL_AT, stillSignal, TEXT, wrap,
} from '../dev/promo/pythonbear/story';
import { endOf, LINE_WORDS, startOf, TEMPO, WORDS } from '../dev/promo/pythonbear/words';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

describe('promo short: the python that swallowed a sun bear (narrated, InkSnake)', () => {
  it('is 16.5 s, a multiple of 1.5 s, and the voice ends about 0.3 s before the loop point', () => {
    expect(LOOP_S).toBe(16.5);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(LOOP_S)).toBe(boilAt(0));
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
    expect(WORDS[WORDS.length - 1]!.text).toBe('admit,');
    expect(LOOP_S - LAST_END).toBeCloseTo(0.3, 2);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.13);
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S', () => {
    const [start, end] = [stateAt(0), stateAt(END)];
    expect(Object.keys(end)).toEqual(Object.keys(start));
    for (const key of Object.keys(start)) expect(end[key], key).toBeCloseTo(start[key]!, 3);
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    expect(sceneAt(0)).toBe('hook');
    expect(irisAt(0)).toBe(1);
    expect(irisAt(END)).toBe(1);
  });

  it('runs the hook on its own clock through the loop point, so the bear never jumps', () => {
    expect(hookClock(END)).toBeCloseTo(0, 4);
    expect(hookPose(END).slide).toBeCloseTo(hookPose(0).slide, 3);
    for (const t of FRAMES) {
      if (irisAt(t) <= 0 || irisAt(t + FRAME) <= 0) continue;
      expect(Math.abs(hookPose(t + FRAME).slide - hookPose(t).slide), `slide at ${t}`).toBeLessThan(3);
      expect(Math.abs(hookPose(t + FRAME).zoom - hookPose(t).zoom), `zoom at ${t}`).toBeLessThan(0.02);
    }
  });

  it('opens on the swallow with the hook in full, whatever the sound, and no call to action or credit', () => {
    expect(hookAlpha(0)).toBe(1);
    expect(LINES[0]!.words.map((w) => w.text).join(' ')).toBe('This python swallowed');
    expect(LINES[1]!.words.map((w) => w.text).join(' ')).toBe('a whole BEAR!');
    expect(ctaAt(0)).toBe(0);
    expect(creditAt(0, LOOP_S, CREDIT.from)).toBe(0);
    expect(hookPose(BEAR_AT + 0.1).gulp).toBeGreaterThan(0.8);
  });

  it('cuts to each beat just before its first word, in story order', () => {
    expect(sceneAt(startOf(6))).toBe('jungle');
    expect(sceneAt(startOf(14))).toBe('signal');
    expect(sceneAt(startOf(23))).toBe('wait');
    expect(sceneAt(startOf(33))).toBe('vet');
    expect(sceneAt(startOf(36))).toBe('free');
    expect(sceneAt(STILL_AT)).toBe('free');
    const cuts = [CUT.jungle, CUT.signal, CUT.wait, CUT.vet, CUT.free, IRIS_AT];
    for (let i = 1; i < cuts.length; i++) expect(cuts[i]!).toBeGreaterThan(cuts[i - 1]!);
  });

  it('shows every noun as it is said: the bear\'s weight, INSIDE, 7 m / 23 ft, the collar coming out', () => {
    expect(bearLabel(startOf(10) + 0.3)).toBe(1);
    expect(insideShown(INSIDE_AT)).toBe(1);
    expect(insideShown(INSIDE_AT - 0.2)).toBe(0);
    expect(lengthBar(FOOT_AT + 0.3)).toBe(1);
    expect(lengthBar(FOOT_AT - 0.3)).toBe(0);
    expect(collarLift(OPERATED_AT + 0.5)).toBe(1);
    expect(collarLift(OPERATED_AT - 0.2)).toBe(0);
  });

  it('flies the calendar while they wait, the bulge going down, and the signal still comes on "It didn\'t."', () => {
    expect(calendarAt(startOf(24) - 0.01)).toBe(0);
    expect(calendarAt(OUT_END)).toBe(CALENDAR_PAGES);
    expect(bulgeAt(startOf(23))).toBe(1);
    expect(bulgeAt(IT_AT)).toBe(0);
    expect(stillSignal(IT_AT + 0.3)).toBe(1);
    expect(stillSignal(startOf(25))).toBe(0);
  });

  it('keeps the call to action to the last seconds, gone 0.6 s before the loop point', () => {
    for (const t of FRAMES.filter((f) => f < CTA_AT)) {
      expect(ctaAt(t), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(LOOP_S - CTA_AT).toBeGreaterThan(2);
    expect(LOOP_S - CTA_AT).toBeLessThan(3);
    expect(CTA_END).toBe(LOOP_S - 0.6);
    expect(ctaAt((CTA_AT + CTA_END) / 2)).toBe(1);
    expect(creditAt((CTA_AT + CTA_END) / 2, LOOP_S, CREDIT.from)).toBeGreaterThan(0);
    for (const t of FRAMES.filter((f) => f >= CTA_END)) {
      expect(ctaAt(t), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(CREDIT.text).toBe('InkSnake · 16bit.ink/snake');
    expect(IRIS_AT).toBeGreaterThanOrEqual(CTA_END - 0.05);
  });

  it('cuts the voice into lines that follow WORDS, highlighting the word being said, and they fit the loop', () => {
    expect(LINE_WORDS.reduce((s, n) => s + n, 0)).toBe(WORDS.length);
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(4);
    for (let i = HOOK_LINES + 1; i < LINES.length; i++) expect(LINES[i]!.from).toBeCloseTo(LINES[i - 1]!.to, 6);
    for (const w of WORDS.slice(LINE_WORDS[0]! + LINE_WORDS[1]!)) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    for (let i = 1; i < WORDS.length; i++) {
      expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end);
      expect(endOf(i)).toBeGreaterThan(WORDS[i]!.start / TEMPO);
    }
    expect(startOf(0)).toBeGreaterThanOrEqual(0);
    expect(endOf(WORDS.length - 1)).toBeLessThan(LOOP_S);
    expect(ADMIT_AT).toBeLessThan(LOOP_S - 0.3);
  });

  it('keeps every word between y 270 and 1250', () => {
    const top = (baseline: number, size: number): number => baseline - size * 0.8;
    const bottom = (baseline: number, size: number): number => baseline + size * 0.3;
    expect(top(TEXT.hook.y, TEXT.hook.size)).toBeGreaterThan(270);
    expect(bottom(TEXT.hook.y + TEXT.hook.gap, TEXT.hook.size)).toBeLessThan(1250);
    expect(top(TEXT.line.y, TEXT.line.size)).toBeGreaterThan(270);
    for (const l of [CTA.big, CTA.small]) {
      expect(top(l.y, l.size)).toBeGreaterThan(270);
      expect(bottom(l.y, l.size)).toBeLessThan(1250);
    }
  });

  it('plays every sound inside the loop, never "beeping": no sound is named for one', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    expect(WORDS.some((w) => /beep/i.test(w.text))).toBe(false);
  });
});
