import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/diver/script';
import {
  A_AT, blackoutAt, boilAt, BOIL_STEPS, cameraAt, CUT_B, clockShownAt, clockValueAt, coldAt, depthAt, diverAt, dipAt, familyBubbleAt, FLOOR_Y, insideShowAt, INSIDE, LAND_AT, LOOP_S,
  mouthSpot, placeAt, questionAt, RETURN_AT, sceneAt, sharkAt, SHUT_AT, SPAT_AT, STAND_Y, torchAt, warmAt, whaleAt, wrap, yearAt, FORTY_AT, SECONDS_AT, FORTY_FIVE_AT,
} from '../dev/promo/diver/story';
import { TEMPO, WORDS } from '../dev/promo/diver/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

describe('promo short: this diver spent forty seconds inside a whale (narrated)', () => {
  it('loops: every clocked value at the loop point equals its value at the start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [w0, w1] = [whaleAt(0)!, whaleAt(END)!];
    for (const k of ['x', 'y', 'tilt', 'gape', 'balloon', 'fin'] as const) expect(w1[k]).toBeCloseTo(w0[k], 3);
    expect(w1.eye).toBe(w0.eye);
    const [d0, d1] = [diverAt(0)!, diverAt(END)!];
    for (const k of ['x', 'y', 'rot', 'kick'] as const) expect(d1[k]).toBeCloseTo(d0[k], 2);
    expect([d1.face, d1.arms, d1.inMouth, d1.maskUp, d1.bag]).toEqual([d0.face, d0.arms, d0.inMouth, d0.maskUp, d0.bag]);
    const [c0, c1] = [cameraAt(0), cameraAt(END)];
    for (const k of ['x', 'y', 'zoom'] as const) expect(c1[k]).toBeCloseTo(c0[k], 2);
    // Nothing written or washed at either end.
    for (const f of [placeAt, yearAt, depthAt, sharkAt, questionAt, familyBubbleAt, warmAt, coldAt, blackoutAt, dipAt, insideShowAt, clockShownAt, torchAt]) {
      expect(f(0)).toBe(0);
      expect(f(END)).toBeCloseTo(0, 3);
    }
    expect(clockValueAt(0)).toBe(0);
    expect(clockValueAt(END)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
    expect(creditAt(END, LOOP_S)).toBe(0);
  });

  it('opens on the hook alone: the humpback close up, jaws nearly shut, the diver\'s legs and fins out between the lips, no labels', () => {
    expect(sceneAt(0)).toBe('hook');
    const w = whaleAt(0)!;
    expect(w.gape).toBeGreaterThan(0.05);
    expect(w.gape).toBeLessThan(0.3);
    const d = diverAt(0)!;
    expect(d.inMouth).toBe(true);
    expect(dist(d, mouthSpot(w).at)).toBeLessThan(3);
    expect(cameraAt(0).zoom).toBeGreaterThan(1.7);
    expect(clockShownAt(0)).toBe(0);
  });

  it('shows the stopwatch from "seconds", not in frame 1, 0:00 in the hook then counting to 0:40 inside, stopping at the spit', () => {
    expect(FORTY_AT).toBeLessThan(SECONDS_AT);
    expect(clockShownAt(SECONDS_AT + 0.3)).toBe(1);
    expect(clockValueAt(SECONDS_AT + 0.3)).toBe(0);
    expect(clockValueAt(SPAT_AT)).toBeCloseTo(40, 6);
    expect(clockValueAt(SPAT_AT + 0.5)).toBe(40);
    expect(clockValueAt((INSIDE.from + SPAT_AT) / 2)).toBeCloseTo(20, 6);
    expect(clockShownAt(SPAT_AT + 0.3)).toBe(1);
    expect(clockShownAt(CUT_B + 1)).toBe(0);
  });

  it('puts the place, the depth and the dive in order: boat, the diver on the sand at 45 ft, then the lunge', () => {
    expect(placeAt(CUT_B + 0.3)).toBe(1);
    expect(yearAt(CUT_B + 0.3)).toBe(0);
    expect(depthAt(FORTY_FIVE_AT + 0.3)).toBe(1);
    expect(cameraAt(CUT_B + 0.05).y).toBeLessThan(0);
    expect(diverAt(FORTY_FIVE_AT - 0.2)!.y).toBeLessThan(STAND_Y);
    expect(Math.abs(diverAt(SHUT_AT - 0.6)!.y - STAND_Y)).toBeLessThan(1);
    expect(STAND_Y).toBeLessThan(FLOOR_Y);
    expect(whaleAt(CUT_B + 0.5)).toBeNull();
  });

  it('shuts the jaws on him as the picture goes black on "DARK", then lights the torch inside', () => {
    expect(whaleAt(SHUT_AT)!.gape).toBeLessThan(0.3);
    expect(dist(diverAt(SHUT_AT)!, mouthSpot(whaleAt(SHUT_AT)!).at)).toBeLessThan(3);
    expect(blackoutAt(INSIDE.from)).toBeCloseTo(1, 6);
    expect(torchAt(INSIDE.from)).toBe(0);
    expect(torchAt(INSIDE.from + 0.6)).toBe(1);
    expect(insideShowAt(INSIDE.from + 1)).toBe(1);
  });

  it('thinks a shark, then finds baleen: the bubble comes and goes before the "?"', () => {
    const [s0, s1] = [0.1, 0.5].map((k) => sharkAt(INSIDE.from + 1.2 + k));
    expect(Math.max(s0!, s1!)).toBeGreaterThan(0);
    expect(sharkAt(WORDS.find((w) => w.text === 'teeth?')!.start / TEMPO)).toBe(0);
    expect(questionAt(WORDS.find((w) => w.text === 'teeth?')!.start / TEMPO + 0.3)).toBe(1);
  });

  it('reveals the humpback, rises, spits him out in an arc and lands him by the boat, then he floats with his family in mind', () => {
    expect(sceneAt(A_AT + 0.1)).toBe('reveal');
    expect(whaleAt(A_AT + 0.1)!.gape).toBeGreaterThan(0.5);
    expect(diverAt(SPAT_AT - 0.1)!.inMouth).toBe(true);
    const flying = diverAt(SPAT_AT + 0.3)!;
    expect(flying.inMouth).toBe(false);
    expect(flying.y).toBeLessThan(-100);
    expect(diverAt(LAND_AT + 0.05)!.y).toBeLessThan(120);
    expect(diverAt(LAND_AT + 1)!.maskUp).toBe(true);
    expect(familyBubbleAt(LAND_AT + 1.5)).toBe(1);
    expect(warmAt(LAND_AT + 1.5)).toBe(1);
  });

  it('never jumps within a scene: the camera, the whale and the diver move smoothly frame to frame (cuts aside)', () => {
    const cuts = [CUT_B, SHUT_AT, INSIDE.from, A_AT - 0.05, RETURN_AT, LOOP_S];
    const near = (t: number): boolean => cuts.some((c) => Math.abs(wrap(t) - c) < 0.2) || wrap(t) < 0.05 || wrap(t) > LOOP_S - 0.05;
    for (const t of FRAMES) {
      if (near(t) || near(t + FRAME) || sceneAt(t) === 'inside') continue;
      const [v0, v1] = [cameraAt(t), cameraAt(t + FRAME)];
      expect(Math.abs(Math.log(v1.zoom / v0.zoom)), `zoom at ${t.toFixed(3)}`).toBeLessThan(0.06);
      expect(dist(v0, v1) * v0.zoom).toBeLessThan(90);
      const [w0, w1] = [whaleAt(t), whaleAt(t + FRAME)];
      if (w0 && w1) expect(dist(w0, w1) * v0.zoom).toBeLessThan(110);
      const [a, b] = [diverAt(t), diverAt(t + FRAME)];
      if (a && b && sceneAt(t) === sceneAt(t + FRAME)) expect(dist(a, b) * v0.zoom).toBeLessThan(120);
    }
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('how');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
  });

  it('captions every spoken word in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(18);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('keeps every text line inside the area the apps leave clear (y 270 to 1250)', () => {
    for (const [name, line] of Object.entries(TEXT)) {
      expect(line.y, name).toBeGreaterThanOrEqual(270);
      expect(line.y, name).toBeLessThanOrEqual(1250);
    }
    // The top of the tallest text (its baseline up one size) stays under the buttons.
    for (const [name, line] of Object.entries(TEXT)) expect(line.y - line.size * 0.72, name).toBeGreaterThanOrEqual(270);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
