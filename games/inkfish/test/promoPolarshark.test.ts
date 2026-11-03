import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/polarshark/script';
import {
  BACK_FROM, bearTagAt, bobAt, boilAt, BOIL_STEPS, BEAR_LEN, cameraAt, catchTagAt, deadQuestionAt, flashAt, foundTagAt, fragmentAt, gloomAt, hookBear, hookShark, huntQuestionAt, huntShark, jawFlashAt, LOOP_S,
  mphTagAt, needleAt, placeAt, said, SCENE_IDS, sceneAlpha, sharkTagAt, shrugQuestionAt, sinkingBear, sizeTagAt, SHARK_LEN, slowShark, snailX, speedTagAt, stomachGlowAt, stomachTagAt, wrap, xrayAt, yearAt,
} from '../dev/promo/polarshark/story';
import { TEMPO, WORDS } from '../dev/promo/polarshark/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

describe('promo short: the slowest shark had a polar bear in its stomach (narrated)', () => {
  it('loops: every clocked value at the loop point equals its value at the start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [s0, s1] = [hookShark(0), hookShark(END)];
    for (const k of ['x', 'y', 'len', 'rot', 'bend', 'open'] as const) expect(s1[k], k).toBeCloseTo(s0[k], 3);
    const [b0, b1] = [hookBear(0), hookBear(END)];
    for (const k of ['x', 'y', 'len', 'rot'] as const) expect(b1[k], k).toBeCloseTo(b0[k], 3);
    expect(Math.cos(s1.beat - s0.beat)).toBeCloseTo(1, 3);
    expect(Math.cos(b1.beat - b0.beat)).toBeCloseTo(1, 3);
    const [c0, c1] = [cameraAt(0), cameraAt(END)];
    for (const k of ['zoom', 'rot', 'dx', 'dy'] as const) expect(c1[k], k).toBeCloseTo(c0[k], 3);
    for (const id of SCENE_IDS) expect(sceneAlpha(id, END), id).toBeCloseTo(sceneAlpha(id, 0), 4);
    for (const f of [bearTagAt, stomachTagAt, stomachGlowAt, placeAt, yearAt, xrayAt, fragmentAt, jawFlashAt, sharkTagAt, sizeTagAt, speedTagAt, mphTagAt, needleAt, catchTagAt, huntQuestionAt, foundTagAt, deadQuestionAt, shrugQuestionAt, flashAt, gloomAt]) {
      expect(f(0), f.name).toBeCloseTo(0, 3);
      // A prop that stays up once it has shown (the jaw, the needle) is hidden by its scene's alpha, which is checked above.
      if (f !== fragmentAt && f !== needleAt) expect(f(END), f.name).toBeCloseTo(0, 3);
    }
  });

  it('never jumps: the hook and the camera move smoothly frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [wrap(t), wrap(t + FRAME)];
      expect(dist(hookShark(a), hookShark(b))).toBeLessThan(15);
      expect(dist(hookBear(a), hookBear(b))).toBeLessThan(15);
      expect(Math.abs(cameraAt(a).zoom - cameraAt(b).zoom)).toBeLessThan(0.1);
      for (const id of SCENE_IDS) expect(Math.abs(sceneAlpha(id, b) - sceneAlpha(id, a)), id).toBeLessThan(0.35);
    }
  });

  it('opens on the picture: the bear at the bright surface, the huge shark under it, nothing written for 2.5 s', () => {
    expect(sceneAlpha('hook', 0.3)).toBe(1);
    for (const id of SCENE_IDS.filter((x) => x !== 'hook')) expect(sceneAlpha(id, 0.3), id).toBe(0);
    const [s, b] = [hookShark(0.3), hookBear(0.3)];
    expect(s.len).toBe(SHARK_LEN);
    expect(b.len).toBe(BEAR_LEN);
    // About 2.5 times the bear's length, the shark in the lower half and the bear above it.
    expect(s.len / b.len).toBeGreaterThan(2.3);
    expect(s.len / b.len).toBeLessThan(2.7);
    expect(s.y).toBeGreaterThan(900);
    expect(b.y).toBeLessThan(s.y - 300);
    expect(s.open).toBeGreaterThan(0.2);
    for (let t = 0; t < 2.5; t += FRAME) {
      expect(bearTagAt(t) + stomachTagAt(t) + placeAt(t) + yearAt(t) + sizeTagAt(t) + sharkTagAt(t) + speedTagAt(t), `t=${t}`).toBe(0);
    }
    expect(captionAt(0.3)!.line.words.map((w) => w.text).join(' ')).toBe('The slowest shark');
  });

  it('is alive from the first frame: both animals move', () => {
    expect(dist(hookShark(0), hookShark(1))).toBeGreaterThan(5);
    expect(dist(hookBear(0), hookBear(0.5))).toBeGreaterThan(1);
    expect(Math.abs(hookBear(0.2).beat - hookBear(0).beat)).toBeGreaterThan(0.3);
  });

  it('puts every noun on screen as it is said', () => {
    // "had a POLAR BEAR in its stomach!": both animals from frame 1, the stomach glowing.
    expect(bearTagAt(said('BEAR') + 0.3)).toBe(1);
    expect(stomachGlowAt(said('stomach!') + 0.3)).toBeGreaterThan(0.9);
    expect(stomachTagAt(said('stomach!') + 0.3)).toBe(1);
    // "Svalbard, two thousand eight."
    expect(sceneAlpha('place', said('Svalbard,') + 0.2)).toBe(1);
    expect(placeAt(said('Svalbard,') + 0.3)).toBe(1);
    expect(yearAt(said('two thousand eight.') + 0.3)).toBe(1);
    // "Inside a Greenland shark, scientists found part of a young bear's JAW."
    expect(sceneAlpha('inside', said('Greenland') + 0.1)).toBe(1);
    expect(sharkTagAt(said('Greenland') + 0.3)).toBe(1);
    expect(xrayAt(said('found') + 0.1)).toBe(1);
    expect(fragmentAt(said('young'))).toBe(1);
    expect(jawFlashAt(said('JAW.') + 0.1)).toBeGreaterThan(0.5);
    expect(sizeTagAt(said('JAW.') + 0.3)).toBe(1);
    // "This shark cruises at under one mile an hour!"
    expect(sceneAlpha('slow', said('cruises'))).toBe(1);
    expect(speedTagAt(said('one') + 0.1)).toBe(1);
    expect(mphTagAt(said('hour!') - 0.1)).toBe(1);
    expect(needleAt(said('mile'))).toBeLessThan(0.08);
    expect(snailX(said('hour!'))).toBeGreaterThan(snailX(said('This')) + 300);
    expect(slowShark(said('hour!')).x - slowShark(said('This')).x).toBeLessThan(100);
    // "So did it catch the bear… or find it already dead?"
    expect(sceneAlpha('hunt', said('catch'))).toBe(1);
    expect(catchTagAt(said('bear…') + 0.1)).toBe(1);
    expect(huntShark(said('catch')).x).toBeGreaterThan(huntShark(said('So')).x + 100);
    expect(sceneAlpha('dead', said('dead?'))).toBe(1);
    expect(foundTagAt(said('already') + 0.1)).toBe(1);
    expect(deadQuestionAt(said('dead?') + 0.1)).toBe(1);
    expect(sinkingBear(said('dead?')).y).toBeGreaterThan(sinkingBear(said('or')).y);
    // "Nobody knows. But somehow,"
    expect(sceneAlpha('shrug', said('knows.'))).toBe(1);
    expect(shrugQuestionAt(said('knows.') + 0.3)).toBe(1);
    expect(Math.abs(bobAt(said('knows.')))).toBeLessThan(1);
  });

  it('shows each metric number with its US unit in a smaller line under it', () => {
    expect(TEXT.cm.y).toBeLessThan(TEXT.inch.y);
    expect(TEXT.cm.size).toBeGreaterThan(TEXT.inch.size);
    expect(TEXT.kmh.y).toBeLessThan(TEXT.mph.y);
    expect(TEXT.kmh.size).toBeGreaterThan(TEXT.mph.size);
    expect(sizeTagAt(said('JAW.') + 0.3)).toBe(1);
    expect(mphTagAt(said('hour!') - 0.1)).toBe(1);
  });

  it('comes back to frame 1 on "But": the hook is whole again by the loop point', () => {
    expect(sceneAlpha('hook', said('somehow,') + 0.1)).toBe(1);
    expect(sceneAlpha('shrug', said('somehow,') + 0.1)).toBe(0);
    expect(sceneAlpha('hook', said('knows.'))).toBe(0);
    expect(BACK_FROM).toBeLessThan(said('But'));
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('somehow,');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.7);
    expect(TEMPO).toBeLessThanOrEqual(1.15);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(19);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
    for (let t = 0; t < LOOP_S; t += FRAME) expect(captionAt(t), `t=${t}`).not.toBeNull();
  });

  it('keeps every text line inside the area the apps leave clear (y 270 to 1250)', () => {
    for (const [name, line] of Object.entries(TEXT)) {
      expect(line.y, name).toBeGreaterThanOrEqual(270);
      expect(line.y, name).toBeLessThanOrEqual(1250);
      expect(line.y - line.size * 0.72, name).toBeGreaterThanOrEqual(270);
    }
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
