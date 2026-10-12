import { describe, expect, it } from 'vitest';
import {
  atmospheresAt, boilAt, BOIL_STEPS, BREACH_AT, cameraAt, captionAt, CLOSE, dropsAt, ENTRY_AT, fishAt, fishY, FISH_LEN, LAND_AT, labelAt, LIFT_FROM, LINES, LOOP_S,
  metresAt, NORMAL_AT, readoutAt, sagAt, said, snowScroll, SOUNDS, squeezeAt, strikeAt, THIS_AT, wobbleAt,
} from '../dev/promo/blobfish/story';
import { TEMPO, WORDS } from '../dev/promo/blobfish/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;

describe('promo short: what a blobfish really looks like (narrated)', () => {
  it('loops: the last moment is the first, camera, fish, net, marks and snow alike', () => {
    const [a, b] = [cameraAt(0), cameraAt(END)];
    expect(b.zoom).toBeCloseTo(a.zoom, 4);
    expect(b.x).toBeCloseTo(a.x, 3);
    expect(b.y).toBeCloseTo(a.y, 3);
    const [f0, f1] = [fishAt(0), fishAt(END)];
    for (const key of ['x', 'y', 'angle', 'sag', 'swell', 'wobble', 'slack'] as const) expect(f1[key]).toBeCloseTo(f0[key], 4);
    expect(snowScroll(END)).toBeCloseTo(snowScroll(0), 3);
    expect(labelAt(END)).toBeCloseTo(labelAt(0), 4);
    expect(strikeAt(END)).toBe(strikeAt(0));
    expect(readoutAt(END)).toBeCloseTo(readoutAt(0), 4);
    expect(squeezeAt(END)).toBe(squeezeAt(0));
    // The drops in the air at the loop point carry on from where they were.
    const [d0, d1] = [dropsAt(0), dropsAt(END)];
    expect(d1).toHaveLength(d0.length);
    d0.forEach((d, i) => {
      expect(d1[i]!.x).toBeCloseTo(d.x, 2);
      expect(d1[i]!.y).toBeCloseTo(d.y, 0);
    });
  });

  it('moves smoothly through the loop point, and never jumps', () => {
    const step = (t: number): { zoom: number; y: number; sag: number } => {
      const [p, q] = [cameraAt(t), cameraAt(t + FRAME)];
      return { zoom: Math.abs(Math.log(q.zoom / p.zoom)), y: Math.abs(q.y - p.y) * p.zoom, sag: Math.abs(sagAt(t + FRAME) - sagAt(t)) };
    };
    // Across the loop point it moves on just as it does from one frame to the next.
    const end = LOOP_S - FRAME;
    expect(Math.abs(Math.log(cameraAt(FRAME).zoom / cameraAt(end).zoom))).toBeLessThan(0.01);
    const across = fishAt(0).x - fishAt(end).x;
    const within = fishAt(FRAME).x - fishAt(0).x;
    expect(Math.abs(across - within) * CLOSE).toBeLessThan(0.5);
    for (let t = 0; t + FRAME < LOOP_S; t += FRAME) {
      const s = step(t);
      expect(s.zoom).toBeLessThan(0.08);
      expect(s.sag).toBeLessThan(0.08);
      // The camera follows the fish: on screen, it never jumps further than a hard dive.
      expect(s.y).toBeLessThan(120);
    }
  });

  it('opens close on the blob, fully sagged, hanging over the sea in the net', () => {
    expect(sagAt(0)).toBe(1);
    expect(FISH_LEN * cameraAt(0).zoom).toBeGreaterThan(800);
    expect(fishY(0).at).toBeLessThan(0);
    expect(metresAt(0)).toBe(0);
    expect(labelAt(0)).toBe(1);
    expect(strikeAt(said('not'))).toBe(0);
    expect(strikeAt(said('what'))).toBeGreaterThan(0.5);
  });

  it('goes a kilometre down, where the pressure is a hundred times what it is up here', () => {
    expect(fishY(ENTRY_AT).at).toBeCloseTo(0, 3);
    expect(metresAt(LAND_AT)).toBe(1000);
    expect(Math.round(atmospheresAt(LAND_AT))).toBe(100);
    expect(Math.round(atmospheresAt(0))).toBe(1);
    // Still on its way down while the narrator says "a kilometre down", there by "here."
    expect(metresAt(said('down,'))).toBeLessThan(200);
    expect(LAND_AT).toBeLessThan(said('That'));
    expect(squeezeAt(said('hundred'))).toBeGreaterThan(0.5);
    // A hundred atmospheres on the readout as the narrator says "…a hundred times harder".
    expect(Math.round(atmospheresAt(said('harder') + 0.15))).toBe(100);
    expect(metresAt(said('hundred'))).toBeGreaterThan(500);
    for (let t = LAND_AT; t < LIFT_FROM; t += 0.1) expect(metresAt(t)).toBe(1000);
  });

  it('firms up into a normal fish under the pressure, by "normal", and stays so on the seafloor', () => {
    expect(sagAt(said('That'))).toBeGreaterThan(0.6);
    expect(sagAt(NORMAL_AT)).toBe(0);
    for (let t = NORMAL_AT; t <= LIFT_FROM; t += 0.05) expect(sagAt(t)).toBeLessThan(0.01);
    // Firming all the way: never sagging back on the way.
    for (let t = said('That'); t < NORMAL_AT; t += 0.05) expect(sagAt(t + 0.05)).toBeLessThanOrEqual(sagAt(t) + 1e-9);
  });

  it('is hauled up fast, the pressure gone by "gone", and melts back into the blob by "this"', () => {
    expect(BREACH_AT).toBeLessThan(said('gone,'));
    expect(LOOP_S - (LIFT_FROM - LAND_AT)).toBeGreaterThan(0);
    expect(BREACH_AT - LIFT_FROM).toBeLessThan(LAND_AT - ENTRY_AT);
    expect(squeezeAt(said('gone,'))).toBe(0);
    expect(metresAt(said('gone,'))).toBe(0);
    expect(sagAt(said('sags...'))).toBeLessThan(0.6);
    expect(sagAt(THIS_AT + 0.3)).toBe(1);
    for (let t = BREACH_AT; t < THIS_AT; t += 0.05) expect(sagAt(t + 0.05)).toBeGreaterThanOrEqual(sagAt(t) - 1e-9);
    // Its jelly has stopped wobbling long before the loop point.
    expect(Math.abs(wobbleAt(END))).toBeLessThan(0.001);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('you,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(4);
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    // As the recorder checks it.
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    // The boil steps whole cycles a loop, at the game's pace near enough.
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(Math.abs(BOIL_STEPS / LOOP_S / BOIL_FPS - 1)).toBeLessThan(0.01);
    expect(boilAt(END) % BOIL_FRAMES).toBe((BOIL_FRAMES - 1));
    expect(boilAt(0)).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
