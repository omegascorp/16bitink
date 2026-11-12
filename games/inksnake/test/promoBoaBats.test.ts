import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { boilAt } from '../dev/promo/sprites';
import {
  ALONE_SNAP, aloneStrike, askAt, BOA_X, captionAt, CREDIT, CTA, CTA_AT, CTA_END, ctaAt, CUT, DISSOLVE_AT, dropAt, endOf, EVERY_AT, HOOK_LINES,
  hookAlpha, hookClock, hookMix, hookPose, LAST_END, LINE_WORDS, LINES, LOOP_S, missBat, sceneAt, SECOND_AT, SNATCH_AT, SOUNDS, startOf,
  stateAt, streamAt, strikeOf, tallyAt, TEXT, THIRD_AT, TOGETHER_SNAPS, turnAt, wrap,
} from '../dev/promo/boabats/story';
import { TEMPO, WORDS } from '../dev/promo/boabats/words';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);
const text = (i: number): string => LINES[i]!.words.map((w) => w.text).join(' ');

describe('promo short: Cuban boas catching bats in mid-air (narrated, InkSnake)', () => {
  it('is 22.5 s, a multiple of 1.5 s, and the voice ends about 0.3 s before the loop point', () => {
    expect(LOOP_S).toBe(22.5);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(LOOP_S)).toBe(boilAt(0));
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
    expect(WORDS[WORDS.length - 1]!.text).toBe('way,');
    expect(LOOP_S - LAST_END).toBeCloseTo(0.3, 1);
    expect(LOOP_S - LAST_END).toBeGreaterThanOrEqual(0.2);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.15);
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S', () => {
    const [start, end] = [stateAt(0), stateAt(END)];
    expect(Object.keys(end)).toEqual(Object.keys(start));
    for (const key of Object.keys(start)) expect(end[key], key).toBeCloseTo(start[key]!, 3);
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    expect(sceneAt(0)).toBe('hook');
    expect(hookMix(0)).toBe(1);
    expect(hookMix(END)).toBeCloseTo(1, 3);
    expect(hookClock(END)).toBeCloseTo(0, 4);
  });

  it('runs frame 1 on its own clock through the dissolve and the loop point, so nothing jumps', () => {
    for (const t of FRAMES) {
      if (hookMix(t) <= 0 || hookMix(t + FRAME) <= 0) continue;
      const [a, b] = [hookPose(t), hookPose(t + FRAME)];
      expect(Math.abs(b.zoom - a.zoom), `zoom at ${t}`).toBeLessThan(0.02);
      expect(Math.abs(b.sway - a.sway), `sway at ${t}`).toBeLessThan(1);
      expect(Math.abs(b.wiggle - a.wiggle), `wiggle at ${t}`).toBeLessThan(0.05);
    }
  });

  it('opens on the hook in full, whatever the sound, with no call to action or credit', () => {
    expect(hookAlpha(0)).toBe(1);
    expect([text(0), text(1)]).toEqual(['This snake catches BATS', 'right out of the air!']);
    expect(ctaAt(0)).toBe(0);
    expect(creditAt(0, LOOP_S, CREDIT.from)).toBe(0);
    expect(stateAt(0).cta).toBe(0);
    expect(streamAt(0)).toEqual([]);
  });

  it('cuts to each beat just before its words, in story order', () => {
    expect(sceneAt(startOf(9))).toBe('cave');
    expect(sceneAt(startOf(36))).toBe('wall');
    expect(sceneAt(startOf(47))).toBe('alone');
    expect(sceneAt(startOf(52))).toBe('together');
    expect(sceneAt(startOf(56))).toBe('question');
    expect(sceneAt(endOf(46) + 0.05)).toBe('wall');
    const cuts = [CUT.cave, CUT.wall, CUT.alone, CUT.together, CUT.question, DISSOLVE_AT];
    for (let i = 1; i < cuts.length; i++) expect(cuts[i]!).toBeGreaterThan(cuts[i - 1]!);
  });

  it('tells it in order: one boa, the bats pour out, a second and a third drop in, the snatch, the miss, three catches, the question', () => {
    expect(streamAt(startOf(17)).length).toBe(0);
    expect(streamAt(startOf(23)).length).toBeGreaterThan(10);
    expect(dropAt(SECOND_AT - 0.3, 1)).toBe(0);
    expect(dropAt(SECOND_AT + 0.5, 1)).toBeCloseTo(1, 1);
    expect(dropAt(THIRD_AT - 0.3, 2)).toBe(0);
    expect(dropAt(THIRD_AT + 0.5, 2)).toBeCloseTo(1, 1);
    expect(new Set(BOA_X).size).toBe(3);
    expect(strikeOf(SNATCH_AT - 0.3, 0).caught).toBe(false);
    expect(strikeOf(SNATCH_AT + 0.1, 0).caught).toBe(true);
    expect(aloneStrike(ALONE_SNAP).lunge).toBeCloseTo(1, 2);
    expect(missBat(ALONE_SNAP)).toBeGreaterThan(0.4);
    expect(missBat(ALONE_SNAP)).toBeLessThan(0.6);
    expect(tallyAt(startOf(51), 0)).toBe(1);
    expect(tallyAt(startOf(51), 2)).toBe(1);
    for (const i of [0, 1, 2]) {
      expect(strikeOf(EVERY_AT - 0.3, i).caught).toBe(false);
      expect(strikeOf(TOGETHER_SNAPS[2]! + 0.05, i).caught).toBe(true);
      expect(turnAt(startOf(58), i)).toBe(1);
      expect(strikeOf(startOf(57), i).caught).toBe(false);
    }
    expect(askAt(startOf(58))).toBe(1);
  });

  it('keeps the call to action to the last seconds, gone 0.6 s before the loop point', () => {
    for (const t of FRAMES.filter((f) => f < CTA_AT)) {
      expect(ctaAt(t), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(LOOP_S - CTA_AT).toBeGreaterThan(2.5);
    expect(LOOP_S - CTA_AT).toBeLessThan(3.6);
    expect(CTA_END).toBe(LOOP_S - 0.6);
    expect(ctaAt((CTA_AT + CTA_END) / 2)).toBe(1);
    for (const t of FRAMES.filter((f) => f >= CTA_END)) expect(ctaAt(t), `cta at ${t}`).toBe(0);
    expect(CREDIT.text).toBe('InkSnake · 16bit.ink/snake');
    expect(CTA.big.text).toBe('16bit.ink/snake');
    expect(CTA.free.text).toBe('10 levels free');
    expect(CTA.small.text).toBe('tap the channel name');
  });

  it('cuts the voice into lines that follow WORDS, highlighting the word being said', () => {
    expect(LINE_WORDS.reduce((s, n) => s + n, 0)).toBe(WORDS.length);
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(5);
    for (let i = HOOK_LINES + 1; i < LINES.length; i++) expect(LINES[i]!.from).toBeCloseTo(LINES[i - 1]!.to, 6);
    for (const w of WORDS.slice(LINE_WORDS.slice(0, HOOK_LINES).reduce((s, n) => s + n, 0))) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end);
    expect(startOf(0)).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < WORDS.length; i++) expect(endOf(i), WORDS[i]!.text).toBeLessThanOrEqual(LOOP_S - 0.2);
  });

  it('never says what the paper does not', () => {
    const said = WORDS.map((w) => w.text.toLowerCase()).join(' ');
    for (const word of ['squeez', 'constrict', 'pack', 'team', 'plan to', 'talk', 'blood', 'hundreds of snakes']) expect(said).not.toContain(word);
  });

  it('keeps every word and the call to action between y 270 and 1250', () => {
    const top = (baseline: number, size: number): number => baseline - size * 0.8;
    const bottom = (baseline: number, size: number): number => baseline + size * 0.3;
    expect(top(TEXT.hook.y, TEXT.hook.size)).toBeGreaterThan(270);
    expect(bottom(TEXT.hook.y + (HOOK_LINES - 1) * TEXT.hook.gap, TEXT.hook.size)).toBeLessThan(1250);
    expect(top(TEXT.line.y, TEXT.line.size)).toBeGreaterThan(270);
    expect(bottom(TEXT.line.y, TEXT.line.size)).toBeLessThan(1250);
    for (const l of [CTA.big, CTA.free, CTA.small]) {
      expect(top(l.y, l.size)).toBeGreaterThan(bottom(TEXT.line.y, TEXT.line.size));
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
