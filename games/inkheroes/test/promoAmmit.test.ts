import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { CTA_TEXT, ctaAlpha } from '../dev/promo/cta';
import {
  at, biteFrame, CREDIT, CTA, CUT, featherDrop, GAPE_FRAME, heartDrop, heartLeft, hookClock, hookPose, LAST_END, LINE_WORDS, LOOP_S, mergeAt,
  partLabels, PHRASES, RETURN_AT, returnAt, sceneAt, SOUNDS, stateAt, STRIKE_AT, TEXT, tiltAt, W, wrap,
} from '../dev/promo/ammit/story';
import { TEMPO, WORDS } from '../dev/promo/ammit/words';
import { UNIT_ART } from '../src/art/pixel/manifest';
import { chapterOfPart, MAPS } from '../src/level/maps';
import { DELTA_LAND } from '../src/level/delta';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

describe('promo short #114: Ammit and the weighing of the heart (narrated, InkHeroes)', () => {
  it('is 21 s, whole frames and a multiple of 1.5 s, and the voice ends about 0.3 s before the loop point', () => {
    expect(LOOP_S).toBe(21);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect((LOOP_S * 30) % 1).toBe(0);
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
    expect(WORDS[WORDS.length - 1]!.text).toBe('because');
    expect(LOOP_S - LAST_END).toBeCloseTo(0.3, 1);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.13);
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S', () => {
    const [start, end] = [stateAt(0), stateAt(END)];
    expect(Object.keys(end)).toEqual(Object.keys(start));
    for (const key of Object.keys(start)) expect(end[key], key).toBeCloseTo(start[key]!, 3);
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    expect(sceneAt(0)).toBe('hook');
    expect(returnAt(0)).toBe(1);
    expect(returnAt(END)).toBe(1);
  });

  it('runs the hook on its own clock through the loop point: the jaws gape over a whole heart at both ends', () => {
    expect(hookClock(END)).toBeCloseTo(0, 4);
    for (const t of [0, END, RETURN_AT + 0.01]) {
      expect(hookPose(t).frame, `frame at ${t}`).toBe(GAPE_FRAME);
      expect(hookPose(t).heart, `heart at ${t}`).toBe(1);
    }
    for (const t of FRAMES) {
      if (returnAt(t) <= 0 || returnAt(t + FRAME) <= 0) continue;
      expect(Math.abs(hookPose(t + FRAME).dy - hookPose(t).dy), `dy at ${t}`).toBeLessThanOrEqual(8);
    }
  });

  it('opens on the jaws and the heart with the hook in full, and no call to action or credit', () => {
    expect(PHRASES.hookAlpha(0)).toBe(1);
    expect(PHRASES.lines[0]!.words.map((w) => w.text).join(' ')).toBe('If your heart');
    expect(PHRASES.lines[1]!.words.map((w) => w.text).join(' ')).toBe('was too heavy…');
    expect(ctaAlpha(0, CTA)).toBe(0);
    expect(creditAt(0, LOOP_S, CREDIT.from)).toBe(0);
    expect(hookPose(at(W.it) + 0.3).heart).toBe(0);
  });

  it('cuts to each beat just before its first word, in story order', () => {
    expect(sceneAt(at(W.meet))).toBe('meet');
    expect(sceneAt(at(W.croc))).toBe('croc');
    expect(sceneAt(at(W.lion))).toBe('lion');
    expect(sceneAt(at(W.hippo))).toBe('hippo');
    expect(sceneAt(at(W.three))).toBe('three');
    expect(sceneAt(at(W.when))).toBe('weigh');
    expect(sceneAt(at(W.gobbled))).toBe('weigh');
    expect(sceneAt(at(W.so))).toBe('battle');
    const cuts = [CUT.meet, CUT.croc, CUT.lion, CUT.hippo, CUT.three, CUT.weigh, CUT.battle, RETURN_AT];
    for (let i = 1; i < cuts.length; i++) expect(cuts[i]!).toBeGreaterThan(cuts[i - 1]!);
  });

  it('follows the words: the three become one on "ONE", heart and feather on their words, the tilt on "Heavier?", the gulp on "gobbled"', () => {
    expect(mergeAt(at(W.three))).toBe(0);
    expect(mergeAt(at(W.one) + 0.3)).toBe(1);
    expect(partLabels(at(W.one) + 0.5)).toBe(1);
    expect(heartDrop(at(W.heart) + 0.4)).toBe(1);
    expect(featherDrop(at(W.feather) + 0.5)).toBe(1);
    expect(Math.abs(tiltAt(at(W.heavier) - 0.1))).toBe(0);
    expect(tiltAt(at(W.heavier) + 0.4)).toBeLessThan(-0.15);
    const ammit = UNIT_ART.ammit!;
    expect(biteFrame(STRIKE_AT + 0.01)).toBe(ammit.strike);
    expect(Math.abs(STRIKE_AT - at(W.gobbled))).toBeLessThan(0.15);
    expect(heartLeft(STRIKE_AT - 0.05)).toBe(1);
    expect(heartLeft(STRIKE_AT + 0.2)).toBe(0);
  });

  it('says it truthfully: Ammit is in chapter 2 (the Delta), and the call to action offers chapter 1 free', () => {
    expect(DELTA_LAND.objects.some((o) => o.kind === 'monster' && o.creature === 'ammit')).toBe(true);
    expect(chapterOfPart(DELTA_LAND.n)).toMatchObject({ n: 2, paid: true });
    expect(chapterOfPart(1)).toMatchObject({ n: 1, paid: false });
    expect(MAPS.some((m) => m.objects.some((o) => o.kind === 'monster' && o.creature === 'ammit'))).toBe(false);
    expect(CTA.big).toBe('Chapter 1 free');
  });

  it('keeps the call to action and the credit to the last seconds, gone 0.6 s before the loop point', () => {
    for (const t of FRAMES.filter((f) => f < CTA.from)) {
      expect(ctaAlpha(t, CTA), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(LOOP_S - CTA.from).toBeGreaterThan(1.8);
    expect(LOOP_S - CTA.from).toBeLessThan(3);
    expect(CTA.to).toBe(LOOP_S - 0.6);
    expect(ctaAlpha((CTA.from + CTA.to) / 2, CTA)).toBe(1);
    for (const t of FRAMES.filter((f) => f >= CTA.to)) {
      expect(ctaAlpha(t, CTA), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(CREDIT.text).toBe('InkHeroes · 16bit.ink/heroes');
  });

  it('captions in phrases that follow WORDS, lighting the word being said', () => {
    expect(LINE_WORDS.reduce((s, n) => s + n, 0)).toBe(WORDS.length);
    expect(PHRASES.lines.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of PHRASES.lines) expect(l.words.length).toBeLessThanOrEqual(4);
    for (const w of WORDS.slice(LINE_WORDS[0]! + LINE_WORDS[1]!)) {
      const now = PHRASES.captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
  });

  it('keeps every caption between y 270 and 1250', () => {
    const top = (baseline: number, size: number): number => baseline - size * 0.8;
    const bottom = (baseline: number, size: number): number => baseline + size * 0.3;
    expect(top(TEXT.hook.y, TEXT.hook.size)).toBeGreaterThan(270);
    expect(bottom(TEXT.hook.y + TEXT.hook.gap, TEXT.hook.size)).toBeLessThan(1250);
    expect(top(TEXT.line.y, TEXT.line.size)).toBeGreaterThan(270);
    for (const l of [CTA_TEXT.big, CTA_TEXT.small]) {
      expect(top(l.y, l.size)).toBeGreaterThan(270);
      expect(bottom(l.y, l.size)).toBeLessThan(1252);
    }
  });

  it('plays every sound inside the loop', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
