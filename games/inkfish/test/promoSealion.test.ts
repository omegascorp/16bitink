import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/sealion/script';
import {
  boilAt, BOIL_STEPS, brightAt, cameraAt, dramaAt, fistAt, fistTagAt, flashAt, guideAt, hookAt, HOOK_BACK, lensAt, LOOP_S, nervousAt, placeAt, said, SCENE_IDS, sceneAlpha, slipAt, SPLASH_AT,
  throatTagAt, whipAt, wrap, yearAt, mouthGape,
} from '../dev/promo/sealion/story';
import { TEMPO, WORDS } from '../dev/promo/sealion/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;

describe('promo short: this whale caught a sea lion by mistake (narrated)', () => {
  it('loops: every clocked value at the loop point equals its value at the start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [h0, h1] = [hookAt(0), hookAt(END)];
    for (const k of ['bob', 'gape', 'throat', 'wobble'] as const) expect(h1[k], k).toBeCloseTo(h0[k], 3);
    expect(Math.cos(h1.tail - h0.tail)).toBeCloseTo(1, 3);
    expect(h0.foam).toBe(0);
    expect(h1.foam).toBeGreaterThan(0.999);
    const [c0, c1] = [cameraAt(0), cameraAt(END)];
    for (const k of ['zoom', 'rot', 'dx', 'dy'] as const) expect(c1[k], k).toBeCloseTo(c0[k], 3);
    for (const id of SCENE_IDS) expect(sceneAlpha(id, END), id).toBeCloseTo(sceneAlpha(id, 0), 4);
    for (const f of [placeAt, yearAt, lensAt, throatTagAt, fistTagAt, guideAt, fistAt, brightAt, nervousAt, dramaAt, whipAt, flashAt]) {
      expect(f(0), f.name).toBeCloseTo(0, 3);
      expect(f(END), f.name).toBeCloseTo(0, 3);
    }
  });

  it('never jumps: the hook and the camera move smoothly frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [wrap(t), wrap(t + FRAME)];
      expect(Math.abs(hookAt(a).bob - hookAt(b).bob)).toBeLessThan(8);
      expect(Math.abs(hookAt(a).gape - hookAt(b).gape)).toBeLessThan(0.03);
      expect(Math.abs(cameraAt(a).zoom - cameraAt(b).zoom)).toBeLessThan(0.06);
      for (const id of SCENE_IDS) expect(Math.abs(sceneAlpha(id, b) - sceneAlpha(id, a)), id).toBeLessThan(0.4);
    }
  });

  it('opens on the hook: the humpback with the sea lion in its open mouth, nothing written', () => {
    expect(sceneAlpha('hook', 0.3)).toBe(1);
    for (const id of SCENE_IDS.filter((x) => x !== 'hook')) expect(sceneAlpha(id, 0.3), id).toBe(0);
    expect(hookAt(0.3).gape).toBeGreaterThan(0.8);
    expect(hookAt(0.3).throat).toBeGreaterThan(0.8);
    expect(placeAt(0.3) + yearAt(0.3) + lensAt(0.3)).toBe(0);
    expect(captionAt(0.3)!.line.words.map((w) => w.text).join(' ')).toBe('This whale caught');
  });

  it('puts every noun on screen as it is said', () => {
    // Monterey Bay, twenty nineteen, then humpbacks and anchovies in the school.
    expect(placeAt(said('Monterey') + 0.3)).toBe(1);
    expect(yearAt(said('twenty nineteen:') + 0.3)).toBe(1);
    expect(sceneAlpha('school', said('humpbacks'))).toBe(1);
    expect(sceneAlpha('school', said('anchovies…'))).toBe(1);
    // The sea lion in its mouth.
    expect(sceneAlpha('mouth', said('MOUTH!'))).toBe(1);
    expect(sceneAlpha('mouth', said('sea', 2))).toBe(1);
    // The throat and the fist.
    expect(sceneAlpha('throat', said('throat'))).toBe(1);
    expect(throatTagAt(said('throat') + 0.3)).toBe(1);
    expect(guideAt(said('wide') + 0.4)).toBe(1);
    expect(fistAt(said('fist.'))).toBe(1);
    expect(fistTagAt(said('fist.') + 0.3)).toBe(1);
    // The writing is gone before the slip.
    expect(placeAt(said('But'))).toBe(0);
    expect(throatTagAt(said('So') + 0.2)).toBe(0);
  });

  it('closes the jaws a little on the sea lion in the push-in, never shut', () => {
    expect(mouthGape(said('and'))).toBeGreaterThan(0.85);
    expect(mouthGape(said('MOUTH!') + 0.6)).toBeLessThan(0.6);
    expect(mouthGape(said('MOUTH!') + 0.6)).toBeGreaterThan(0.4);
    expect(nervousAt(said('MOUTH!'))).toBe(1);
  });

  it('pauses, slides the sea lion over the lip and plops it in the water on "out", then whips back', () => {
    const pause = slipAt(said('paused…') + 0.2);
    expect(pause.frozen).toBe(1);
    expect(pause.slide).toBe(0);
    expect(slipAt(said('slipped') + 0.2).slide).toBeGreaterThan(0);
    expect(slipAt(said('right') + 0.1).slide).toBe(1);
    expect(slipAt(said('out!') - 0.2).fly).toBeLessThan(1);
    expect(slipAt(SPLASH_AT).fly).toBe(1);
    expect(SPLASH_AT).toBeGreaterThan(said('out!'));
    expect(SPLASH_AT).toBeLessThan(said('out!') + 0.3);
    expect(sceneAlpha('slip', said('out!'))).toBe(1);
    expect(flashAt(SPLASH_AT + 0.02)).toBeGreaterThan(0.05);
    expect(sceneAlpha('hook', said('So', 2))).toBe(1);
    expect(HOOK_BACK).toBeLessThan(said('So', 2));
    expect(whipAt(HOOK_BACK + 0.1)).toBeGreaterThan(0.5);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.6);
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
