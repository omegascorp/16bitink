import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { boilAt } from '../dev/promo/sprites';
import {
  backOff, BACKED_AT, BIT_AT, captionAt, cockAt, jawsOpen, clock2h, clock45, cobraLabel, crawlOut, CREDIT, CTA, CTA_AT, CTA_END, ctaAt, CUT, EATS_AT, FACED_AT, HEAD_AT, headInside,
  HOOK_DEPTH, HOOK_LINES, hookAlpha, hookClock, IRIS_AT, irisAt, LAST_END, latinName, LINE_WORDS, LINES, LOOP_S, MINUTES_END, monitorIn, monitorLabel,
  MOVING_END, placeLabel, pythonLabel, rear, sceneAt, snakeEater, SNAKE_EATER_AT, SOUNDS, stateAt, stir, strikeAt, swallowPose, TEXT, TWO_AT, VOICE_LIFT, wrap,
} from '../dev/promo/cobra/story';
import { endOf, startOf, TEMPO, WORDS } from '../dev/promo/cobra/words';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

describe('promo short: the king cobra that ate a python (narrated, InkSnake)', () => {
  it('is 21 s, a multiple of 1.5 s, and the voice ends about 0.3 s before the loop point', () => {
    expect(LOOP_S).toBe(21);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(LOOP_S)).toBe(boilAt(0));
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
    expect(WORDS[WORDS.length - 1]!.text).toBe('because');
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
  });

  it('runs the swallow on its own clock through the loop point, so the python never jumps', () => {
    expect(hookClock(END)).toBeCloseTo(0, 4);
    expect(swallowPose(END).depth).toBeCloseTo(swallowPose(0).depth, 3);
    expect(swallowPose(0).depth).toBeCloseTo(HOOK_DEPTH + 0.012 * 0.62, 6);
    for (const t of FRAMES) {
      if (irisAt(t) <= 0 || irisAt(t + FRAME) <= 0) continue;
      expect(Math.abs(swallowPose(t + FRAME).depth - swallowPose(t).depth), `depth at ${t}`).toBeLessThan(0.01);
      expect(Math.abs(swallowPose(t + FRAME).zoom - swallowPose(t).zoom), `zoom at ${t}`).toBeLessThan(0.02);
    }
  });

  it('opens mid-swallow with the hook in full, whatever the sound, and no call to action or credit', () => {
    expect(hookAlpha(0)).toBe(1);
    expect(LINES[0]!.words.map((w) => w.text).join(' ')).toBe('This snake EATS');
    expect(LINES[1]!.words.map((w) => w.text).join(' ')).toBe('other snakes!');
    expect(ctaAt(0)).toBe(0);
    expect(creditAt(0, LOOP_S, CREDIT.from)).toBe(0);
    expect(swallowPose(0).depth).toBeGreaterThan(0.3);
    expect(swallowPose(EATS_AT + 0.1).gulp).toBeGreaterThan(0.8);
  });

  it('cuts to each beat just before its first word, in story order', () => {
    expect(sceneAt(startOf(5))).toBe('flat');
    expect(sceneAt(startOf(27))).toBe('face');
    expect(sceneAt(startOf(37))).toBe('swallow');
    expect(sceneAt(startOf(49))).toBe('rest');
    const cuts = [CUT.flat, CUT.face, CUT.swallow, CUT.rest, IRIS_AT];
    for (let i = 1; i < cuts.length; i++) expect(cuts[i]!).toBeGreaterThan(cuts[i - 1]!);
  });

  it('tells it in order: the bite on "bit", the python out, the wait, the monitor, the face-off, the swallow', () => {
    expect(strikeAt(BIT_AT)).toBeGreaterThan(0.9);
    expect(strikeAt(BIT_AT - 0.3)).toBe(0);
    expect(cockAt(BIT_AT - 0.2)).toBe(1);
    expect(cockAt(BIT_AT)).toBe(0);
    expect(jawsOpen(BIT_AT - 0.05)).toBe(true);
    expect(jawsOpen(BIT_AT + 0.3)).toBe(false);
    expect(crawlOut(BIT_AT)).toBe(0);
    expect(crawlOut(TWO_AT)).toBe(1);
    expect(stir(TWO_AT)).toBe(1);
    expect(stir(MOVING_END)).toBe(0);
    expect(clock2h(TWO_AT + 0.4).show).toBe(1);
    expect(clock2h(MOVING_END).hand).toBeCloseTo(2, 3);
    expect(monitorIn(startOf(21) - 0.3)).toBe(0);
    expect(monitorIn(endOf(26) + 0.1)).toBe(1);
    expect(rear(FACED_AT + 0.2)).toBe(1);
    expect(backOff(BACKED_AT - 0.2)).toBe(0);
    expect(backOff(CUT.swallow - 0.01)).toBeGreaterThan(0.9);
    expect(headInside(HEAD_AT + 0.25)).toBe(1);
    expect(clock45(MINUTES_END).hand).toBe(1);
    expect(swallowPose(MINUTES_END + 0.3).depth).toBeGreaterThan(swallowPose(CUT.swallow + 0.05).depth + 0.5);
  });

  it('shows the facts as they are said: lengths in m with ft, the place and year, the name', () => {
    expect(cobraLabel(startOf(6) + 0.3)).toBe(1);
    expect(pythonLabel(startOf(10) + 0.3)).toBe(1);
    expect(pythonLabel(startOf(10) - 0.2)).toBe(0);
    expect(monitorLabel(startOf(24) + 0.3)).toBe(1);
    expect(placeLabel(CUT.flat + 0.5)).toBe(1);
    expect(placeLabel(0)).toBe(0);
    expect(latinName(startOf(51))).toBe(1);
    expect(snakeEater(SNAKE_EATER_AT + 0.3)).toBe(1);
    expect(snakeEater(SNAKE_EATER_AT - 0.2)).toBe(0);
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
    expect(CTA.small.text).toBe('tap the channel name');
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
  });

  it('never says what the paper does not: no jungle, no fight, no "alive"', () => {
    const text = WORDS.map((w) => w.text.toLowerCase()).join(' ');
    for (const word of ['jungle', 'fight', 'alive', 'chase']) expect(text).not.toContain(word);
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

  it('lifts the quiet sentences of the take with a gentle gain envelope, inside the voice', () => {
    expect(VOICE_LIFT.map((l) => l.db)).toEqual([4, 2.5]);
    expect(VOICE_LIFT[0]!.from).toBeCloseTo(startOf(5), 6);
    expect(VOICE_LIFT[0]!.to).toBeCloseTo(endOf(13), 6);
    expect(VOICE_LIFT[1]!.from).toBeCloseTo(startOf(14), 6);
    expect(VOICE_LIFT[1]!.to).toBeCloseTo(endOf(20), 6);
    // 80 ms ramps each side never overlap.
    expect(VOICE_LIFT[1]!.from - 0.08).toBeGreaterThan(VOICE_LIFT[0]!.to + 0.08);
  });

  it('plays every sound inside the loop, quietly under the voice', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeLessThanOrEqual(0.7);
    }
  });
});
