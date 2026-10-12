import { describe, expect, it } from 'vitest';
import {
  cameraAt, captionAt, wordAt, CATCH_AT, EYES_FORWARD, EYES_UP, fishAt, gazeOf, lensesAt, LINES, LOOP_S, mouthAt, preyAt, RISE_FROM, said, SETTLE_FROM, sight,
  SOUNDS, SPOT_AT, SWIVEL_TO,
} from '../dev/promo/barreleye/story';
import { TEMPO, WORDS } from '../dev/promo/barreleye/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

describe('promo short: the barreleye sees through its own head (narrated)', () => {
  it('loops: camera, fish, eyes and fins are where they began', () => {
    const [a, b] = [cameraAt(0), cameraAt(END)];
    expect(b.zoom).toBeCloseTo(a.zoom, 4);
    expect(b.x).toBeCloseTo(a.x, 2);
    expect(b.y).toBeCloseTo(a.y, 2);
    const [f0, f1] = [fishAt(0), fishAt(END)];
    expect(f1.x).toBeCloseTo(f0.x, 2);
    expect(f1.y).toBeCloseTo(f0.y, 2);
    expect(f1.tilt).toBeCloseTo(f0.tilt, 4);
    expect(f1.eyes).toBeCloseTo(f0.eyes, 4);
    expect(f1.effort).toBeCloseTo(f0.effort, 4);
    expect(f1.glow).toBeCloseTo(f0.glow, 3);
    expect(wrap(f1.fin - f0.fin)).toBeCloseTo(0, 3);
    // Nothing else on screen at either end: no prey, no sight lines.
    expect(preyAt(0)).toBeNull();
    expect(preyAt(END)).toBeNull();
    expect(sight(0)).toBe(0);
    expect(sight(END)).toBe(0);
  });

  it('moves smoothly through the loop point and everywhere else', () => {
    const step = (t: number, u: number): number => {
      const [a, b, fa, fb] = [cameraAt(t), cameraAt(u), fishAt(t), fishAt(u)];
      return Math.max(Math.abs(Math.log(b.zoom / a.zoom)) * 1000, Math.hypot(b.x - a.x, b.y - a.y), Math.hypot(fb.x - fa.x, fb.y - fa.y), Math.abs(fb.tilt - fa.tilt) * 400, Math.abs(fb.eyes - fa.eyes) * 400);
    };
    // Across the seam, the same as the frames either side of it.
    const seam = step(LOOP_S - FRAME, LOOP_S - 1e-9 + FRAME * 0) + step(0, FRAME);
    expect(seam).toBeLessThan(2);
    for (let t = 0; t + FRAME < LOOP_S; t += FRAME) expect(step(t, t + FRAME)).toBeLessThan(45);
  });

  it('opens with its eyes pointing straight up, and turns them forward when it spots the prey', () => {
    expect(fishAt(0).eyes).toBeCloseTo(EYES_UP, 5);
    expect(fishAt(SPOT_AT).eyes).toBeCloseTo(EYES_UP, 5);
    expect(fishAt(said('swivel')).eyes).toBeGreaterThan(EYES_UP + 0.05);
    expect(fishAt(SWIVEL_TO).eyes).toBeCloseTo(EYES_FORWARD, 3);
    expect(fishAt(SETTLE_FROM).eyes).toBeCloseTo(EYES_FORWARD, 3);
    // Up, in the world, at the start: the sight lines go straight up.
    expect(gazeOf(fishAt(0))).toBeCloseTo(-Math.PI / 2, 1);
  });

  it('keeps the eyes inside the clear shield, both ways round', () => {
    for (const t of [0, SWIVEL_TO]) {
      const f = fishAt(t);
      for (const lens of lensesAt(f)) expect(lens.y).toBeLessThan(f.y - 60);
    }
  });

  it('has the copepod drift over the up-turned eyes as it is spotted, and catches it nose up', () => {
    const f = fishAt(SPOT_AT);
    const prey = preyAt(SPOT_AT)!;
    expect(Math.abs(prey.x - lensesAt(f)[0]!.x)).toBeLessThan(40);
    expect(prey.y).toBeLessThan(lensesAt(f)[0]!.y - 150);
    const before = preyAt(CATCH_AT - 1e-4)!;
    const mouth = mouthAt(fishAt(CATCH_AT));
    expect(Math.hypot(before.x - mouth.x, before.y - mouth.y)).toBeLessThan(5);
    expect(fishAt(CATCH_AT).tilt).toBeLessThan(-0.7);
    expect(fishAt(CATCH_AT).y).toBeLessThan(fishAt(RISE_FROM).y - 200);
    expect(preyAt(CATCH_AT + 0.01)).toBeNull();
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('fish,');
    const gap = LOOP_S - last.end / TEMPO + wordAt(WORDS[0]!);
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(4);
    for (const w of WORDS) {
      const now = captionAt(wordAt(w) + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
