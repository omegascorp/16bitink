import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { arrowPoint } from '../dev/promo/heartbeat/arrow';
import {
  arrowDraw, BLOOM_AT, bloomAt, bulbShown, captionAt, clockShown, clockTurns, CLOSE_AT, coilProgress, coilShown, coilZoom, CREDIT, CTA, CTA_AT, CTA_END, ctaAt, DEAD_AT, FAKE_AT, GAME_AT, gameSqueeze, heartAt, HOOK_LINES,
  hookAlpha, inExperiment, kickAt, LAST_END, LEFT_AT, LET_GO_AT, LINES, LOOP_S, OFF_AT, pulseAt, pumpAt, pumpOn, SCIENCE_AT, sceneAt, SO_AT, SOONER_END, SOUNDS, stateAt, STOPS_AT, SWITCHED_AT, switchFlip, TEXT, tightAt, TWICE_AT, wrap,
} from '../dev/promo/heartbeat/story';
import { endOf, LINE_WORDS, TEMPO, WORDS } from '../dev/promo/heartbeat/words';
import { boilAt } from '../dev/promo/sprites';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

describe('promo short: the boa feels the heartbeat (narrated, InkSnake)', () => {
  it('is 16.5 s, a multiple of 1.5 s, and the voice ends about 0.3 s before the loop point', () => {
    expect(LOOP_S).toBe(16.5);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(LOOP_S)).toBe(boilAt(0));
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
    expect(WORDS[WORDS.length - 1]!.text).toBe('because');
    expect(LOOP_S - LAST_END).toBeCloseTo(0.3, 2);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.13);
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

  it('never jumps within a shot: tightness and the zoom move on smoothly, round the loop', () => {
    for (const t of FRAMES) {
      if (sceneAt(t) !== sceneAt(t + FRAME) || inExperiment(t) !== inExperiment(t + FRAME)) continue;
      expect(Math.abs(tightAt(t + FRAME) - tightAt(t)), `tight at ${t}`).toBeLessThan(0.25);
      expect(Math.abs(coilZoom(t + FRAME) - coilZoom(t)), `zoom at ${t}`).toBeLessThan(0.02);
    }
  });

  it('opens mid-beat with the hook in full, whatever the sound, and no call to action', () => {
    expect(pulseAt(0)).toBeGreaterThan(0.85);
    expect(heartAt(0).glow).toBeGreaterThan(0.8);
    expect(hookAlpha(0)).toBe(1);
    expect(LINES[0]!.words.map((w) => w.text).join(' ')).toBe('This snake squeezes');
    expect(LINES[1]!.words.map((w) => w.text).join(' ')).toBe('until the heart STOPS.');
    expect(inExperiment(0)).toBe(false);
    expect(ctaAt(0)).toBe(0);
  });

  it('tightens on the living heart\'s beats, up to the cut to the experiment', () => {
    expect(tightAt(SCIENCE_AT - 0.1)).toBeGreaterThan(tightAt(0.5) + 0.3);
    expect(kickAt(STOPS_AT + 0.02)).toBeGreaterThan(0.8);
  });

  it('gives "Scientists hid a fake heart in a dead rat!" its own calm shot, with no snake and no beating heart', () => {
    expect(sceneAt(SCIENCE_AT + 0.01)).toBe('table');
    expect(sceneAt(LEFT_AT - 0.01)).toBe('table');
    expect(pulseAt(SCIENCE_AT + 0.5)).toBe(0);
    expect(bulbShown(FAKE_AT - 0.3)).toBe(0);
    expect(bulbShown(FAKE_AT + 0.2)).toBe(1);
    expect(DEAD_AT).toBeGreaterThan(FAKE_AT);
  });

  it('never shows a living rat in the experiment: its whole span has no real heartbeat and the bulb in its place', () => {
    for (const t of FRAMES) {
      if (t < SCIENCE_AT + 1e-6 || t >= GAME_AT) continue;
      expect(inExperiment(t), `at ${t}`).toBe(true);
      expect(pulseAt(t), `heart at ${t}`).toBe(0);
    }
  });

  it('pumps the bulb on "Left beating", holds the coils, and turns the clock twice by "long"', () => {
    expect(sceneAt(LEFT_AT)).toBe('coil');
    expect(Math.max(...FRAMES.filter((t) => t >= LEFT_AT && t < OFF_AT).map(pumpAt))).toBeGreaterThan(0.8);
    expect(tightAt(LEFT_AT + 0.5)).toBeGreaterThan(0.8);
    expect(tightAt(SWITCHED_AT - 0.05)).toBeGreaterThan(0.8);
    expect(clockShown(TWICE_AT)).toBe(1);
    expect(clockTurns(TWICE_AT)).toBeGreaterThan(0.8);
    expect(clockTurns(SWITCHED_AT - 0.2)).toBe(2);
  });

  it('switches off on "off", then pauses, and only then do the coils let go', () => {
    expect(pumpOn(OFF_AT - 0.01)).toBe(true);
    expect(pumpOn(OFF_AT + 0.01)).toBe(false);
    expect(pumpAt(OFF_AT + 0.01)).toBe(0);
    expect(switchFlip(OFF_AT + 0.1)).toBe(1);
    expect(LET_GO_AT - OFF_AT).toBeGreaterThan(0.5);
    expect(tightAt(LET_GO_AT - 0.01)).toBeGreaterThan(0.8);
    expect(tightAt(SOONER_END)).toBeLessThan(0);
  });

  it('plays "So it just waits, because" over the real game, which closes the loop, squeezes, and blooms into frame 1', () => {
    expect(GAME_AT).toBeGreaterThan(SOONER_END);
    expect(GAME_AT).toBeLessThan(SO_AT);
    expect(sceneAt(SO_AT)).toBe('game');
    expect(coilProgress(CLOSE_AT)).toBe(1);
    expect(gameSqueeze(CLOSE_AT)).toBe(0);
    expect(gameSqueeze(BLOOM_AT)).toBe(1);
    expect(bloomAt(BLOOM_AT)).toBe(0);
    expect(bloomAt(END)).toBe(1);
    expect(coilShown(BLOOM_AT - 0.2)).toBe(0);
  });

  it('keeps the call to action to the last 3 s, gone 0.6 s before the loop point', () => {
    for (const t of FRAMES.filter((f) => f < LOOP_S - 3)) {
      expect(ctaAt(t), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(CTA_AT).toBeGreaterThanOrEqual(LOOP_S - 3);
    expect(CTA_END).toBe(LOOP_S - 0.6);
    expect(ctaAt((CTA_AT + CTA_END) / 2)).toBe(1);
    expect(creditAt((CTA_AT + CTA_END) / 2, LOOP_S, CREDIT.from)).toBeGreaterThan(0);
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
    expect(arrowPoint(1).x).toBeCloseTo(170, 0);
    expect(arrowPoint(1).y).toBeCloseTo(1470, 0);
  });

  it('cuts the voice into lines that follow WORDS, highlighting the word being said', () => {
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

  it('plays every sound inside the loop', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
