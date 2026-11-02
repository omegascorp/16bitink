import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/orcasave/script';
import {
  boilAt, BOIL_STEPS, brightAt, cameraAt, coldAt, countAt, counterAt, CHEST_AT, duskAt, flashAt, HOOK_BACK, HUNDRED_AT, LOOP_S, markAt, placeAt, plusAt, said, SCENE_IDS, sceneAlpha, wrap, yearAt,
  MONTAGE_FROM, SAVE_FROM, WAVE_FROM, FLOE_FROM, WHY_FROM, LANDED_AT, ORCAS_HOOK_AT, TICK_AT,
} from '../dev/promo/orcasave/story';
import { circlingFins, hookSeal, hookWhale, onWhale, saveSeal, saveWhale, waveSeal, waterAt, WF, W, CHEST_LOCAL } from '../dev/promo/orcasave/motion';
import { pairAt } from '../dev/promo/orcasave/scenes';
import { TEMPO, WORDS } from '../dev/promo/orcasave/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;

describe('promo short: this whale saved a seal from orcas (narrated)', () => {
  it('loops: every clocked value at the loop point equals its value at the start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [w0, w1] = [hookWhale(0), hookWhale(END)];
    for (const k of ['cx', 'cy', 'roll', 'tilt', 'spread', 'pour'] as const) expect(w1[k], k).toBeCloseTo(w0[k], 3);
    const [s0, s1] = [hookSeal(0), hookSeal(END)];
    for (const k of ['x', 'y', 'rot', 'smile'] as const) expect(s1[k], k).toBeCloseTo(s0[k], 3);
    expect(Math.cos(s1.beat - s0.beat)).toBeCloseTo(1, 3);
    circlingFins(0).forEach((f, i) => {
      const g = circlingFins(END)[i]!;
      for (const k of ['x', 'y', 'h', 'lean'] as const) expect(g[k], `fin ${i} ${k}`).toBeCloseTo(f[k], 3);
    });
    const [c0, c1] = [cameraAt(0), cameraAt(END)];
    for (const k of ['zoom', 'rot', 'dx', 'dy'] as const) expect(c1[k], k).toBeCloseTo(c0[k], 3);
    for (const id of SCENE_IDS) expect(sceneAlpha(id, END), id).toBeCloseTo(sceneAlpha(id, 0), 4);
    // Nothing written or washed at either end.
    for (const f of [placeAt, yearAt, counterAt, markAt, flashAt, coldAt, brightAt, duskAt]) {
      expect(f(0), f.name).toBe(0);
      expect(f(END), f.name).toBeCloseTo(0, 3);
    }
  });

  it('never jumps across the loop point or between frames in the hook', () => {
    for (let t = -FRAME; t < FLOE_FROM; t += FRAME) {
      const [a, b] = [wrap(t), wrap(t + FRAME)];
      expect(Math.abs(hookWhale(a).cy - hookWhale(b).cy)).toBeLessThan(6);
      expect(Math.hypot(hookSeal(a).x - hookSeal(b).x, hookSeal(a).y - hookSeal(b).y)).toBeLessThan(8);
      for (let i = 0; i < 3; i++) expect(Math.abs(circlingFins(a)[i]!.x - circlingFins(b)[i]!.x)).toBeLessThan(15);
    }
    for (let t = SAVE_FROM; t < MONTAGE_FROM; t += FRAME) {
      const [a, b] = [saveSeal(t), saveSeal(t + FRAME)];
      expect(Math.hypot(a.x - b.x, a.y - b.y), `t=${t}`).toBeLessThan(60);
      expect(Math.abs(saveWhale(t).cy - saveWhale(t + FRAME).cy)).toBeLessThan(40);
    }
    for (let t = WAVE_FROM; t < SAVE_FROM; t += FRAME) {
      const [a, b] = [waveSeal(t), waveSeal(t + FRAME)];
      expect(Math.hypot(a.x - b.x, a.y - b.y), `t=${t}`).toBeLessThan(90);
    }
  });

  it('opens on the hook: a huge humpback belly-up, the seal on its chest, orca fins round it, nothing written', () => {
    expect(sceneAlpha('hook', 0.3)).toBe(1);
    for (const id of SCENE_IDS.filter((x) => x !== 'hook')) expect(sceneAlpha(id, 0.3), id).toBe(0);
    const w = hookWhale(0.3);
    expect(w.roll).toBe(-1);
    expect(w.spread).toBe(1);
    const chest = onWhale(w, CHEST_LOCAL);
    const seal = hookSeal(0.3);
    expect(Math.abs(seal.x - chest.x)).toBeLessThan(40);
    expect(seal.y).toBeLessThan(chest.y);
    expect(chest.y).toBeLessThan(W);
    expect(circlingFins(0.3)).toHaveLength(3);
    for (const f of circlingFins(0.3)) expect(f.h).toBeGreaterThan(150);
    expect(placeAt(0.3) + yearAt(0.3) + counterAt(0.3) + markAt(0.3)).toBe(0);
    expect(captionAt(0.3)!.line.words.map((x) => x.text).join(' ')).toBe('This whale saved a');
  });

  it('puts every noun on screen as it is said', () => {
    expect(placeAt(said('Antarctica,') + 0.3)).toBe(1);
    expect(yearAt(said('two thousand nine.') + 0.3)).toBe(1);
    expect(yearAt(said('Antarctica,'))).toBe(0);
    expect(sceneAlpha('floe', said('Antarctica,') + 0.3)).toBe(1);
    expect(sceneAlpha('wave', said('washed'))).toBe(1);
    expect(sceneAlpha('save', said('humpback'))).toBe(1);
    expect(sceneAlpha('save', said('CHEST!'))).toBe(1);
    expect(sceneAlpha('save', said('water!'))).toBe(1);
    expect(sceneAlpha('montage', said('orca'))).toBe(1);
    expect(sceneAlpha('why', said('Nobody'))).toBe(1);
    expect(counterAt(said('a HUNDRED'))).toBe(1);
    // The writing is gone before the wave.
    expect(placeAt(said('washed'))).toBe(0);
  });

  it('tells the story in order: the wave tips the seal off, the humpback rolls under it, the seal lands on the chest, the chest lifts it', () => {
    // The seal starts on the floe and ends in the water.
    const wet = waveSeal(SAVE_FROM - 0.05);
    expect(waveSeal(WAVE_FROM + 0.2).y).toBeLessThan(WF - 100);
    expect(wet.y).toBeGreaterThan(WF - 120);
    expect(Math.abs(wet.y - (waterAt(wet.x, SAVE_FROM - 0.05) - 36))).toBeLessThan(2);
    // The humpback rolls from back-up to belly-up between "rolled" and "over".
    expect(saveWhale(said('humpback')).roll).toBe(1);
    expect(saveWhale(said('rolled')).roll).toBeGreaterThan(0.5);
    expect(saveWhale(said('over,') + 0.4).roll).toBeLessThan(-0.99);
    // It rises under the seal: the chest meets it as it lands, on the beat of "CHEST".
    const at = saveSeal(CHEST_AT + 0.7);
    const chest = onWhale(saveWhale(CHEST_AT + 0.7), CHEST_LOCAL);
    expect(Math.abs(at.x - chest.x)).toBeLessThan(10);
    expect(at.y).toBeLessThan(chest.y);
    expect(saveSeal(LANDED_AT - 0.1).mood).toBe('nervous');
    expect(saveSeal(CHEST_AT + 0.7).smile).toBeGreaterThan(0.9);
    // The lift: the whole whale rises out of the sea and the flippers open.
    const [before, after] = [saveWhale(said('It')), saveWhale(said('water!') + 0.1)];
    expect(after.cy).toBeLessThan(before.cy - 150);
    expect(after.spread).toBe(1);
    expect(before.spread).toBe(0);
    expect(saveWhale(MONTAGE_FROM).pour).toBeGreaterThan(0.5);
  });

  it('counts to 100+ as the humpbacks charge the orcas, landing on "HUNDRED"', () => {
    expect(countAt(said('Humpbacks'))).toBe(0);
    expect(countAt(said('a HUNDRED') + 0.1)).toBe(100);
    expect(countAt(said('crashed'))).toBeGreaterThan(0);
    expect(countAt(said('crashed'))).toBeLessThan(100);
    expect(plusAt(said('a HUNDRED') - 0.1)).toBe(0);
    expect(plusAt(said('times.'))).toBe(1);
    expect(TICK_AT).toHaveLength(10);
    expect(TICK_AT[9]).toBeLessThanOrEqual(HUNDRED_AT + 0.06);
    // Several pairs of humpback and orca are on screen at once, the humpback behind the orca.
    const live = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => pairAt(i, said('a HUNDRED'))).filter((p) => p !== null);
    expect(live.length).toBeGreaterThanOrEqual(5);
    for (const p of live) expect((p!.ox - p!.x) * p!.dir).toBeGreaterThan(200);
  });

  it('closes on the eye and a big "?", then whips back to the hook on "But"', () => {
    expect(markAt(said('Why?') + 0.4)).toBe(1);
    expect(sceneAlpha('why', said('Why?') + 0.15)).toBe(1);
    expect(duskAt(said('Nobody'))).toBeGreaterThan(0.95);
    expect(HOOK_BACK).toBeLessThan(said('But'));
    expect(sceneAlpha('hook', said('But') + 0.2)).toBeGreaterThan(0.95);
    expect(sceneAlpha('why', said('But') + 0.2)).toBeLessThan(0.05);
    expect(cameraAt(HOOK_BACK + 0.15).dx).toBeLessThan(-50);
  });

  it('has a shove on "ORCAS!", a jolt on "CHEST!" and a punch on "HUNDRED"', () => {
    expect(cameraAt(ORCAS_HOOK_AT + 0.05).zoom).toBeGreaterThan(cameraAt(0.3).zoom + 0.03);
    expect(cameraAt(CHEST_AT + 0.03).zoom).toBeGreaterThan(1.03);
    expect(cameraAt(HUNDRED_AT + 0.03).zoom).toBeGreaterThan(1.03);
    expect(flashAt(CHEST_AT)).toBeGreaterThan(0.2);
    expect(WHY_FROM).toBeGreaterThan(MONTAGE_FROM);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('But');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeLessThan(0.5);
    expect(TEMPO).toBeLessThanOrEqual(1.15);
    expect(TEMPO).toBeCloseTo(last.end / (LOOP_S - 0.3), 3);
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
