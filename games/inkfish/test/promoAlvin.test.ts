import { describe, expect, it } from 'vitest';
import { cameraOf, hookAt, IMPACT, plateAt, bowLightAt, swordAt } from '../dev/promo/alvin/poses';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/alvin/script';
import {
  ALVIN_AT, boilAt, BOIL_STEPS, bangFlashAt, BANG_AT, depthAt, FISH_AT, LOOP_S, nameAt, placeAt, said, SCENE_IDS, sceneAlpha, shockAt, sizeAt, STEAKS_AT, STUCK_AT, TITANIC_AT,
  usDepthAt, usSizeAt, wrap, yearAt, yearLaterAt,
} from '../dev/promo/alvin/story';
import { TEMPO, WORDS } from '../dev/promo/alvin/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const WRITTEN = [yearAt, depthAt, usDepthAt, placeAt, nameAt, sizeAt, usSizeAt, yearLaterAt];

describe('promo short: this fish stabbed a submarine (narrated)', () => {
  it('loops: every clocked value at the loop point equals its value at the start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [a, b] = [hookAt(0), hookAt(END)];
    expect(b.tip.x).toBeCloseTo(a.tip.x, 3);
    expect(b.tip.y).toBeCloseTo(a.tip.y, 3);
    for (const k of ['a', 'off', 'bend', 'tail', 'wide', 'cross', 'crack', 'flash', 'dark', 'zoom', 'subRot'] as const) expect(b[k], k).toBeCloseTo(a[k], 3);
    expect(b.faces[0]!.shock).toBeCloseTo(a.faces[0]!.shock, 3);
    for (const id of SCENE_IDS) {
      expect(sceneAlpha(id, END), id).toBeCloseTo(sceneAlpha(id, 0), 4);
    }
    // Only the hook is on screen at the seam, so only its camera has to match.
    const [c0, c1] = [cameraOf('hook', 0), cameraOf('hook', END)];
    for (const k of ['zoom', 'rot', 'dx', 'dy'] as const) expect(c1[k], k).toBeCloseTo(c0[k], 3);
    for (const f of WRITTEN) {
      expect(f(0), f.name).toBe(0);
      expect(f(END), f.name).toBeCloseTo(0, 3);
    }
    expect(bangFlashAt(0)).toBe(0);
    expect(bangFlashAt(END)).toBeLessThan(1e-3);
  });

  it('never jumps: the fish, the camera and the scene fades move smoothly frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [wrap(t), wrap(t + FRAME)];
      const at = (u: number) => { const h = hookAt(u); return { x: h.tip.x - Math.cos(h.a) * h.off, y: h.tip.y - Math.sin(h.a) * h.off }; };
      if (sceneAlpha('hook', a) > 0 && sceneAlpha('hook', b) > 0) expect(Math.hypot(at(b).x - at(a).x, at(b).y - at(a).y), `t=${t}`).toBeLessThan(230);
      for (const id of SCENE_IDS) expect(sceneAlpha(id, b) - sceneAlpha(id, a), id).toBeLessThan(0.35);
    }
  });

  it('opens on the hook: the fish big, its sword in the sub, the crack made, nothing written', () => {
    expect(sceneAlpha('hook', 0.3)).toBe(1);
    for (const id of SCENE_IDS.filter((x) => x !== 'hook')) expect(sceneAlpha(id, 0.3), id).toBe(0);
    for (const t of [0, 0.5, 1.5]) {
      const h = hookAt(t);
      expect(h.fishLen).toBeGreaterThanOrEqual(1000);
      expect(h.off).toBe(0);
      expect(h.crack).toBeGreaterThan(0.99);
      expect(h.faces[0]!.shock).toBeGreaterThan(0.9);
    }
    for (let t = 0; t <= 1.9; t += FRAME) for (const f of WRITTEN) expect(f(t), `${f.name} t=${t}`).toBe(0);
    expect(captionAt(0.3)!.line.words.map((w) => w.text).join(' ')).toBe('This fish stabbed');
  });

  it('puts every noun on screen as it is said', () => {
    // "This fish stabbed a SUBMARINE!": the swordfish, the sub, in frame 1.
    expect(sceneAlpha('hook', FISH_AT)).toBe(1);
    // "1967. Two thousand feet down, off Florida,": the sub going down, the year, 610 m over 2,000 ft, the place.
    expect(sceneAlpha('descent', said('Two') + 0.3)).toBe(1);
    expect(yearAt(said('1967.') + 0.4)).toBe(1);
    expect(depthAt(said('Two') + 0.4)).toBe(1);
    expect(usDepthAt(said('feet') + 0.1)).toBe(1);
    expect(placeAt(said('Florida,') + 0.1)).toBe(1);
    // "three men sit inside a tiny sub called Alvin…": the portholes with the three faces, the name on the hull.
    expect(sceneAlpha('ports', said('three') + 0.3)).toBe(1);
    expect(nameAt(ALVIN_AT + 0.1)).toBe(1);
    // "then BANG!": the white flash and the gasp.
    expect(bangFlashAt(BANG_AT + 0.03)).toBeGreaterThan(0.3);
    expect(shockAt(BANG_AT + 0.2)).toBeGreaterThan(0.95);
    expect(shockAt(BANG_AT - 0.3)).toBe(0);
    // "An eight-foot swordfish rams it, and the sword gets STUCK!": the fish, 2.4 m over 8 ft, the sword in.
    expect(sceneAlpha('sword', said('swordfish') + 0.1)).toBe(1);
    expect(sizeAt(said('eight-foot') + 0.4)).toBe(1);
    expect(usSizeAt(said('eight-foot') + 0.5)).toBe(1);
    expect(swordAt(STUCK_AT).off).toBe(0);
    expect(swordAt(STUCK_AT + 0.2).cross).toBeGreaterThan(0.5);
    // "They head up… with the fish still attached!": the fish dangling from the rising sub.
    expect(sceneAlpha('rise', said('fish', 2) + 0.1)).toBe(1);
    // "Next day? Steaks. For the whole crew.": the deck, three plates, the three crew.
    expect(sceneAlpha('steaks', STEAKS_AT + 0.3)).toBe(1);
    for (const i of [0, 1, 2]) expect(plateAt(STEAKS_AT + 0.8, i)).toBe(1);
    // "that same sub reached the TITANIC.": the bow in the lamps.
    expect(sceneAlpha('titanic', TITANIC_AT + 0.2)).toBe(1);
    expect(bowLightAt(TITANIC_AT + 0.3)).toBeGreaterThan(0.95);
    expect(yearLaterAt(TITANIC_AT)).toBe(1);
  });

  it('writes the metric figures big with the US figures under them, smaller', () => {
    expect(TEXT.depth.y).toBeLessThan(TEXT.depthUs.y);
    expect(TEXT.depth.size).toBeGreaterThan(TEXT.depthUs.size);
    expect(TEXT.size.y).toBeLessThan(TEXT.sizeUs.y);
    expect(TEXT.size.size).toBeGreaterThan(TEXT.sizeUs.size);
  });

  it('comes back to frame 1 for the seam: the sword flashes in out of the dark just before the loop point', () => {
    expect(sceneAlpha('hook', said('But') + 0.4)).toBeGreaterThan(0.5);
    expect(hookAt(said('But') + 0.1).off).toBeGreaterThan(900);
    expect(hookAt(LOOP_S + IMPACT - 0.3).off).toBeGreaterThan(50);
    expect(hookAt(LOOP_S + IMPACT + 0.01).off).toBe(0);
    expect(hookAt(said('But') + 0.1).dark).toBeGreaterThan(0.5);
    expect(hookAt(0).dark).toBe(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('first,');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeLessThan(0.5);
    expect(TEMPO).toBeLessThanOrEqual(1.2);
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

  it('lasts a whole number of video frames and line-boil cycles (a multiple of 1.5 s), with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(Math.abs(LOOP_S / 1.5 - Math.round(LOOP_S / 1.5))).toBeLessThan(1e-9);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    for (const w of WORDS) expect(w.end / TEMPO).toBeLessThan(LOOP_S);
  });

  it('changes the sound with the mood: a hard smash on the BANG, a low drop before it, a bright pop for each plate', () => {
    expect(SOUNDS.some((s) => s.id === 'smash' && Math.abs(s.t - BANG_AT) < 0.1 && s.gain >= 0.15)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'drop' && s.pitch < 0.5 && Math.abs(s.t - said('then')) < 0.1)).toBe(true);
    expect(SOUNDS.filter((s) => s.id === 'powerup' && s.t > STEAKS_AT && s.t < STEAKS_AT + 0.6)).toHaveLength(3);
    expect(SOUNDS.some((s) => s.id === 'smash' && s.t > LOOP_S - 0.5)).toBe(true);
  });
});
