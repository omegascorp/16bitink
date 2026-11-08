import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/croc/script';
import {
  BACK_FROM, BITE_SHARK_LEN, boilAt, BOIL_STEPS, burpTextAt, cameraAt, CROC_LEN, faceoffAt, feetAt, flashAt, gloomAt, hookAt, jawsAge, LOOP_S, metresAt, nameAt, placeAt, placeRiverAt, questionAt,
  riseUpAt, said, SCENE_IDS, sceneAlpha, sharkTagAt, sharkTagUnderAt, sizeBarAt, sizeCrocAt, smugAt, SMUG_LEN, underShark, upriverAt, vsAt, wrap, wrongScene, wrongTextAt, yearAt,
} from '../dev/promo/croc/story';
import { TEMPO, WORDS } from '../dev/promo/croc/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

describe('promo short: this crocodile ate a shark (narrated)', () => {
  it('loops: every clocked value at the loop point equals its value at the start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [a, b] = [hookAt(0), hookAt(END)];
    for (const k of ['x', 'y', 'len', 'rot'] as const) {
      expect(b.croc[k], k).toBeCloseTo(a.croc[k], 3);
      expect(b.shark[k], k).toBeCloseTo(a.shark[k], 3);
    }
    expect(b.gape).toBeCloseTo(a.gape, 3);
    expect(b.shark.bend).toBeCloseTo(a.shark.bend, 3);
    expect(Math.cos(b.croc.beat - a.croc.beat)).toBeCloseTo(1, 3);
    expect(Math.cos(b.shark.beat - a.shark.beat)).toBeCloseTo(1, 3);
    const [c0, c1] = [cameraAt(0), cameraAt(END)];
    for (const k of ['zoom', 'rot', 'dx', 'dy'] as const) expect(c1[k], k).toBeCloseTo(c0[k], 3);
    for (const id of SCENE_IDS) expect(sceneAlpha(id, END), id).toBeCloseTo(sceneAlpha(id, 0), 4);
    for (const f of [placeAt, placeRiverAt, yearAt, feetAt, metresAt, nameAt, sharkTagAt, sharkTagUnderAt, upriverAt, wrongTextAt, burpTextAt, questionAt, flashAt, gloomAt, sizeBarAt, riseUpAt]) {
      expect(f(0), f.name).toBeCloseTo(f === riseUpAt ? 0 : 0, 3);
    }
    for (const f of [placeAt, placeRiverAt, yearAt, feetAt, metresAt, nameAt, sharkTagAt, sharkTagUnderAt, upriverAt, wrongTextAt, burpTextAt, questionAt, flashAt, gloomAt]) {
      expect(f(END), f.name).toBeCloseTo(0, 3);
    }
  });

  it('never jumps: the hook and the camera move smoothly frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [wrap(t), wrap(t + FRAME)];
      expect(dist(hookAt(a).croc, hookAt(b).croc)).toBeLessThan(30);
      expect(dist(hookAt(a).shark, hookAt(b).shark)).toBeLessThan(40);
      expect(Math.abs(cameraAt(a).zoom - cameraAt(b).zoom)).toBeLessThan(0.1);
      for (const id of SCENE_IDS) expect(Math.abs(sceneAlpha(id, b) - sceneAlpha(id, a)), id).toBeLessThan(0.35);
    }
  });

  it('opens on the hook: the croc reared out of the river, the bull shark across its jaws, nothing written', () => {
    expect(sceneAlpha('hook', 0.3)).toBe(1);
    for (const id of SCENE_IDS.filter((x) => x !== 'hook')) expect(sceneAlpha(id, 0.3), id).toBe(0);
    const r = hookAt(0.3);
    expect(r.croc.len).toBeGreaterThanOrEqual(1500);
    expect(r.shark.len).toBeGreaterThanOrEqual(600);
    expect(r.shark.len).toBe(BITE_SHARK_LEN);
    expect(r.croc.len).toBe(CROC_LEN);
    // Rearing: the nose is up, and the shark lies across the snout, not along it.
    expect(r.croc.rot).toBeLessThan(-0.7);
    const across = Math.abs(Math.sin(r.shark.rot - r.croc.rot));
    expect(across).toBeGreaterThan(0.85);
    expect(r.gape).toBeGreaterThan(0.3);
    expect(dist(r.mouth, r.shark)).toBeLessThan(1);
    expect(r.mouth.x).toBeGreaterThan(300);
    expect(r.mouth.x).toBeLessThan(800);
    expect(placeAt(0.3) + feetAt(0.3) + nameAt(0.3) + sharkTagAt(0.3) + questionAt(0.3)).toBe(0);
    expect(captionAt(0.3)!.line.words.map((w) => w.text).join(' ')).toBe('This crocodile ate');
  });

  it('is alive from the first frame: the head tosses and the shark thrashes both ways', () => {
    let [lo, hi, rlo, rhi] = [Infinity, -Infinity, Infinity, -Infinity];
    for (let t = 0; t < 2; t += FRAME) {
      lo = Math.min(lo, hookAt(t).shark.bend);
      hi = Math.max(hi, hookAt(t).shark.bend);
      rlo = Math.min(rlo, hookAt(t).croc.rot);
      rhi = Math.max(rhi, hookAt(t).croc.rot);
    }
    expect(lo).toBeLessThan(-0.1);
    expect(hi).toBeGreaterThan(0.2);
    expect(rhi - rlo).toBeGreaterThan(0.05);
  });

  it('puts every noun on screen as it is said', () => {
    // "Australia's Adelaide River, twenty fourteen."
    expect(sceneAlpha('river', said('Adelaide') + 0.2)).toBe(1);
    expect(placeAt(said('Australia\'s') + 0.3)).toBe(1);
    expect(placeRiverAt(said('River,') + 0.2)).toBe(1);
    expect(yearAt(said('twenty fourteen.') + 0.3)).toBe(1);
    expect(placeAt(said('An') + 0.4)).toBe(0);
    // "An eighteen-foot saltwater croc called Brutus…": the whole croc, 18 ft over 5.5 m, the name.
    expect(sceneAlpha('size', said('croc') + 0.1)).toBe(1);
    expect(feetAt(said('eighteen-foot') + 0.3)).toBe(1);
    expect(metresAt(said('saltwater') + 0.1)).toBe(1);
    expect(nameAt(said('Brutus…') + 0.1)).toBe(1);
    expect(sizeBarAt(said('saltwater'))).toBe(1);
    expect(sizeCrocAt(said('croc')).len).toBeGreaterThan(800);
    // "rose up with a bull shark in his JAWS!"
    expect(sceneAlpha('rise', said('shark'))).toBe(1);
    expect(sharkTagAt(said('shark'))).toBe(1);
    expect(riseUpAt(said('rose') - 0.3)).toBe(0);
    expect(riseUpAt(said('JAWS!'))).toBe(1);
    expect(jawsAge(said('JAWS!') + 0.2)).toBeCloseTo(0.2, 5);
    // "Bull sharks swim up rivers…": under the water, the shark gliding upstream.
    expect(sceneAlpha('under', said('sharks'))).toBe(1);
    expect(sharkTagUnderAt(said('sharks') + 0.1)).toBe(1);
    expect(upriverAt(said('rivers…') + 0.1)).toBe(1);
    expect(underShark(said('rivers…')).x).toBeGreaterThan(underShark(said('Bull')).x + 50);
    // "and this one picked the wrong river.": the croc creeping up behind, sly.
    expect(sceneAlpha('wrong', said('wrong'))).toBe(1);
    expect(wrongTextAt(said('wrong') + 0.1)).toBe(1);
    expect(wrongScene(said('wrong')).croc.x).toBeLessThan(wrongScene(said('wrong')).shark.x);
    expect(wrongScene(said('wrong') + 0.5).lid).toBeGreaterThan(0.4);
    expect(wrongScene(said('and') + 0.05).croc.x).toBeLessThan(wrongScene(said('river.')).croc.x);
    // "Crocs will eat almost anything.": the smug head, a burp.
    expect(sceneAlpha('smug', said('anything.'))).toBe(1);
    expect(smugAt(said('anything.')).lid).toBeGreaterThan(0.4);
    expect(smugAt(said('anything.')).croc.len).toBe(SMUG_LEN);
    expect(burpTextAt(said('anything.') + 0.2)).toBeGreaterThan(0.9);
    expect(SOUNDS.some((s) => s.id === 'suck' && s.pitch < 0.6 && Math.abs(s.t - said('anything.')) < 0.2)).toBe(true);
    // "Shark or croc: who would YOU bet on?": both on screen, a VS, a question.
    expect(sceneAlpha('vs', said('YOU'))).toBe(1);
    expect(vsAt(said('croc:') + 0.4)).toBe(1);
    expect(questionAt(said('YOU') + 0.2)).toBe(1);
    const f = faceoffAt(said('YOU'));
    expect(f.shark.x).toBeLessThan(f.croc.x);
    expect(f.croc.face).toBe(-1);
    expect(f.shark.face).toBe(1);
  });

  it('shows every number on screen only inside the picture: 18 ft over 5.5 m, in US units first', () => {
    expect(TEXT.feet.y).toBeLessThan(TEXT.metres.y);
    expect(TEXT.feet.size).toBeGreaterThan(TEXT.metres.size);
  });

  it('comes back to the jaws on "Because": frame 1 again', () => {
    expect(sceneAlpha('hook', said('Because') + 0.1)).toBe(1);
    expect(sceneAlpha('vs', said('Because') + 0.1)).toBe(0);
    expect(sceneAlpha('hook', said('on?'))).toBe(0);
    expect(BACK_FROM).toBeLessThan(said('Because'));
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('Because');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeLessThan(0.5);
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
