import { describe, expect, it } from 'vitest';
import { creditAt, CREDIT as KIT_CREDIT } from '../dev/promo/credit';
import { CTA_TEXT, ctaAlpha } from '../dev/promo/cta';
import {
  at, CREDIT, CTA, CUT, digDown, giantIn, heightBar, LAST_END, LINE_WORDS, LOOP_S, PHRASES, RETURN_AT, returnAt, sceneAt, skullClock, skullPose,
  SOUNDS, stateAt, STRIKE_AT, TEXT, throwFrame, W, wrap, yearLabel,
} from '../dev/promo/cyclops/story';
import { TEMPO, WORDS } from '../dev/promo/cyclops/words';
import { UNIT_ART } from '../src/art/pixel/manifest';
import { ASHFORD_LAND } from '../src/level/chapter1';
import { chapterOfPart } from '../src/level/maps';
import { CREATURES } from '../src/logic/creatures';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

describe('promo short #113: the dwarf elephant skull and the Cyclops (narrated, InkHeroes)', () => {
  it('is 22.5 s, whole frames and a multiple of 1.5 s, and the voice ends about 0.3 s before the loop point', () => {
    expect(LOOP_S).toBe(22.5);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect((LOOP_S * 30) % 1).toBe(0);
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
    expect(WORDS[WORDS.length - 1]!.text).toBe('admit,');
    expect(LOOP_S - LAST_END).toBeCloseTo(0.3, 1);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.13);
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S', () => {
    const [start, end] = [stateAt(0), stateAt(END)];
    expect(Object.keys(end)).toEqual(Object.keys(start));
    for (const key of Object.keys(start)) expect(end[key], key).toBeCloseTo(start[key]!, 3);
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    expect(sceneAt(0)).toBe('skull');
    expect(returnAt(0)).toBe(1);
    expect(returnAt(END)).toBe(1);
  });

  it('runs the skull on its own clock through the loop point, so it never jumps', () => {
    expect(skullClock(END)).toBeCloseTo(0, 4);
    for (const t of FRAMES) {
      if (returnAt(t) <= 0 || returnAt(t + FRAME) <= 0) continue;
      expect(Math.abs(skullPose(t + FRAME).lift - skullPose(t).lift), `lift at ${t}`).toBeLessThanOrEqual(1);
    }
  });

  it('opens on the skull with the hook in full, and no call to action or credit', () => {
    expect(PHRASES.hookAlpha(0)).toBe(1);
    expect(PHRASES.lines[0]!.words.map((w) => w.text).join(' ')).toBe('This skull has');
    expect(PHRASES.lines[1]!.words.map((w) => w.text).join(' ')).toBe('ONE giant eye socket!');
    expect(ctaAlpha(0, CTA)).toBe(0);
    expect(creditAt(0, LOOP_S, CREDIT.from)).toBe(0);
    expect(skullPose(0).flesh).toBe(0);
    expect(skullPose(0).scale).toBe(8);
  });

  it('draws pixel art only at whole-number scales', () => {
    for (const t of FRAMES) expect(Number.isInteger(skullPose(t).scale), `scale at ${t}`).toBe(true);
  });

  it('cuts to each beat just before its first word, in story order', () => {
    expect(sceneAt(at(W.except))).toBe('skull');
    expect(sceneAt(at(W.tiny))).toBe('sicily');
    expect(sceneAt(at(W.and))).toBe('rock');
    expect(sceneAt(at(W.in))).toBe('scientist');
    expect(sceneAt(at(W.greeks))).toBe('greeks');
    expect(sceneAt(at(W.imagined))).toBe('giant');
    expect(sceneAt(at(W.nobody))).toBe('battle');
    const cuts = [CUT.sicily, CUT.rock, CUT.scientist, CUT.greeks, CUT.giant, CUT.battle, RETURN_AT];
    for (let i = 1; i < cuts.length; i++) expect(cuts[i]!).toBeGreaterThan(cuts[i - 1]!);
  });

  it('shows each thing as it is said: the trunk, ≈1 m · 3 ft, the bones, 1914, the Cyclops throwing on "GIANT!"', () => {
    expect(skullPose(at(W.trunk) + 0.5).flesh).toBe(1);
    expect(skullPose(at(W.trunk) - 0.2).flesh).toBe(0);
    expect(heightBar(at(W.feet))).toBe(1);
    expect(heightBar(at(W.tiny))).toBe(0);
    expect(digDown(at(W.down))).toBe(1);
    expect(yearLabel(at(W.year) + 0.3)).toBe(1);
    expect(giantIn(at(W.oneEyed))).toBe(1);
    const ogre = UNIT_ART.ogre!;
    expect(ogre.name).toBe('Cyclops');
    expect(throwFrame(STRIKE_AT + 0.01)).toBe(ogre.strike);
    expect(Math.abs(STRIKE_AT - at(W.giant))).toBeLessThan(0.15);
  });

  it('says "free" truthfully: Cyclopes are in chapter 1, part 1, which is free', () => {
    expect(CREATURES.ogre.name).toBe('Cyclops');
    expect(ASHFORD_LAND.n).toBe(1);
    expect(chapterOfPart(ASHFORD_LAND.n)).toMatchObject({ n: 1, paid: false });
    expect(ASHFORD_LAND.objects.some((o) => o.kind === 'monster' && o.creature === 'ogre')).toBe(true);
    expect(CTA.big).toBe('Chapter 1 free');
  });

  it('keeps the call to action and the credit to the last seconds, gone 0.6 s before the loop point', () => {
    for (const t of FRAMES.filter((f) => f < CTA.from)) {
      expect(ctaAlpha(t, CTA), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(LOOP_S - CTA.from).toBeGreaterThan(2);
    expect(LOOP_S - CTA.from).toBeLessThan(3);
    expect(CTA.to).toBe(LOOP_S - 0.6);
    expect(ctaAlpha((CTA.from + CTA.to) / 2, CTA)).toBe(1);
    for (const t of FRAMES.filter((f) => f >= CTA.to)) {
      expect(ctaAlpha(t, CTA), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(CREDIT.text).toBe('InkHeroes · 16bit.ink/heroes');
    expect(KIT_CREDIT.text).toBe(CREDIT.text);
  });

  it('captions in phrases that follow WORDS, lighting the word being said', () => {
    expect(LINE_WORDS.reduce((s, n) => s + n, 0)).toBe(WORDS.length);
    expect(PHRASES.lines.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of PHRASES.lines) expect(l.words.length).toBeLessThanOrEqual(4);
    expect(PHRASES.lines.filter((l) => l.words.length >= 2).length).toBeGreaterThan(PHRASES.lines.length * 0.75);
    for (const w of WORDS.slice(LINE_WORDS[0]! + LINE_WORDS[1]!)) {
      const now = PHRASES.captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end);
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
