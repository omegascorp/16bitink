import { describe, expect, it } from 'vitest';
import {
  BITE_AT, bellyAt, BITE_ALONG, cameraAt, captionAt, DIVE_FROM, HER_LEN, heAt, HIS_LEN, LINES, LOOP_S, MALE_COUNT, mouthOfMale, nextMaleAt, othersAt,
  PAN_TO, PULL_FROM, snowShift, SOUNDS,
} from '../dev/promo/mates/story';
import { TEMPO, WORDS } from '../dev/promo/mates/words';
import { VIDEO } from '../dev/promo/short';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

describe('promo short: male anglerfish fuse to females (narrated)', () => {
  it('loops: the next male ends up framed exactly as the loop opens on him', () => {
    const [a, b] = [cameraAt(0), cameraAt(END)];
    expect(b.zoom).toBeCloseTo(a.zoom, 3);
    const [he, next] = [heAt(0), nextMaleAt(END)!];
    expect((next.x - b.x) * b.zoom).toBeCloseTo((he.x - a.x) * a.zoom, 1);
    expect((next.y - b.y) * b.zoom).toBeCloseTo((he.y - a.y) * a.zoom, 1);
    expect(next.angle).toBeCloseTo(he.angle, 4);
    expect(wrap(next.beat - he.beat)).toBeCloseTo(0, 3);
    // The snow the pan carried along is a whole screen over: back where it started.
    expect((snowShift(END) - snowShift(0)) % VIDEO.width).toBeCloseTo(0, 3);
  });

  it('pans her clean out of the picture before zooming in on the next male', () => {
    for (let t = PAN_TO; t < LOOP_S; t += FRAME) {
      const cam = cameraAt(t);
      const off = Math.max(Math.abs(cam.x) * cam.zoom - VIDEO.width / 2, Math.abs(cam.y) * cam.zoom - VIDEO.height / 2);
      expect(off).toBeGreaterThan(HER_LEN * 0.8 * cam.zoom);
    }
  });

  it('keeps the camera moving smoothly through the loop point', () => {
    const before = cameraAt(END).zoom / cameraAt(END - FRAME).zoom;
    const after = cameraAt(FRAME).zoom / cameraAt(0).zoom;
    expect(Math.abs(before - after)).toBeLessThan(0.01);
    for (let t = 0; t + FRAME < LOOP_S; t += FRAME) {
      expect(Math.abs(Math.log(cameraAt(t + FRAME).zoom / cameraAt(t).zoom))).toBeLessThan(0.12);
    }
  });

  it('opens close on him with her out of the picture', () => {
    const cam = cameraAt(0);
    expect(HIS_LEN * cam.zoom).toBeGreaterThan(250);
    const herOffset = Math.hypot(cam.x, cam.y) * cam.zoom;
    expect(herOffset - HER_LEN * 0.8 * cam.zoom).toBeGreaterThan(VIDEO.height / 2);
  });

  it('bites her belly mouth first, and stays on', () => {
    const at = bellyAt(BITE_ALONG, BITE_AT).at;
    expect(Math.hypot(mouthOfMale(heAt(BITE_AT)).x - at.x, mouthOfMale(heAt(BITE_AT)).y - at.y)).toBeLessThan(HIS_LEN * 0.2);
    for (let t = BITE_AT; t < LOOP_S; t += 0.5) {
      const belly = bellyAt(BITE_ALONG, t).at;
      expect(Math.hypot(mouthOfMale(heAt(t)).x - belly.x, mouthOfMale(heAt(t)).y - belly.y)).toBeLessThan(HIS_LEN * 0.2);
    }
  });

  it('puts eight males on her by the time the narrator says so', () => {
    expect(MALE_COUNT).toBe(8);
    expect(othersAt(PULL_FROM)).toHaveLength(0);
    expect(othersAt(DIVE_FROM).length + 1).toBe(MALE_COUNT);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('that');
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
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
