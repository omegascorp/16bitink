import { describe, expect, it } from 'vitest';
import { ICE_DEEPEST, toScreen } from '../dev/promo/greenland/scenery';
import { EYE, halfHeight, waveAt } from '../dev/promo/greenland/shark';
import {
  ageCount, ageMarks, ageMode, BIRTH, birthPulse, CAMEO, cameraAt, captionAt, COUNT_FROM, eyeAt, FLY_TO, grownM, GROW_TO, ICE_PERIOD, iceShift, LENS, lensOpen,
  LIFE, LINES, LOOP_S, NEWTON_BORN, onShark, TAPE_ACROSS, newtonName, newtonPulse, PULL_FROM, PUPS_AGE, PUPS_AT, pupsAt, RIBBON, ribbonShow, ribbonX, said, SHARK_LEN, sharkAt,
  sinkAt, SNOW_LAPS, SOUNDS, STAMP_AT, STAMP_HOME, STAMP_RIBBON, stampAt, tapeShow, TODAY, WIDE, yearsAt, ZOOM_FROM, ZOOM_TO,
} from '../dev/promo/greenland/story';
import { TEMPO, WORDS } from '../dev/promo/greenland/words';
import { VIDEO } from '../dev/promo/short';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));
/** Text must stay clear of the platforms' buttons. */
const SAFE = { top: 270, bottom: 1250 } as const;

describe('promo short: the Greenland shark may be older than Newton (narrated)', () => {
  it('loops: the camera, the shark, the drifting ice and every mark are where the loop opens', () => {
    const [a, b] = [cameraAt(0), cameraAt(END)];
    expect(b.x).toBeCloseTo(a.x, 4);
    expect(b.y).toBeCloseTo(a.y, 4);
    expect(b.zoom).toBeCloseTo(a.zoom, 6);
    const [s0, s1] = [sharkAt(0), sharkAt(END)];
    expect(s1.x).toBeCloseTo(s0.x, 4);
    expect(s1.y).toBeCloseTo(s0.y, 3);
    expect(s1.tilt).toBeCloseTo(s0.tilt, 5);
    expect(wrap(s1.beat - s0.beat)).toBeCloseTo(0, 4);
    expect(s1.effort).toBe(s0.effort);
    // The ice drifts a whole strip, and the snow whole screen widths: back where they started.
    const strips = (iceShift(END) - iceShift(0)) / ICE_PERIOD;
    expect(strips - Math.round(strips)).toBeCloseTo(0, 6);
    expect(Number.isInteger(SNOW_LAPS)).toBe(true);
    for (const f of [ribbonShow, newtonPulse, birthPulse, newtonName, ageMode, ageMarks, tapeShow, lensOpen, sinkAt]) {
      expect(f(END)).toBeCloseTo(f(0), 4);
    }
    expect(stampAt(0).show).toBe(0);
    expect(stampAt(END).show).toBeCloseTo(0, 6);
  });

  it('keeps everything moving smoothly through the loop point', () => {
    const cam = (t: number): number[] => {
      const c = cameraAt(t);
      return [c.x, c.y, Math.log(c.zoom) * 1000];
    };
    const before = cam(END).map((v, i) => v - cam(END - FRAME)[i]!);
    const after = cam(FRAME).map((v, i) => v - cam(0)[i]!);
    before.forEach((v, i) => expect(Math.abs(v - after[i]!)).toBeLessThan(0.05));
    const sinkBefore = sharkAt(END).y - sharkAt(END - FRAME).y;
    const sinkAfter = sharkAt(FRAME).y - sharkAt(0).y;
    expect(Math.abs(sinkBefore - sinkAfter)).toBeLessThan(0.05);
    for (let t = 0; t + FRAME < LOOP_S; t += FRAME) {
      const [c0, c1] = [cameraAt(t), cameraAt(t + FRAME)];
      expect(Math.abs(Math.log(c1.zoom / c0.zoom))).toBeLessThan(0.12);
      expect(Math.hypot(c1.x - c0.x, c1.y - c0.y) * c0.zoom).toBeLessThan(80);
    }
  });

  it('opens on the shark big in frame under the ice, the ribbon of history already showing', () => {
    expect(cameraAt(0)).toEqual(WIDE);
    // Nose to tail tip (its tail fin reaches about a sixth past the tail base).
    expect(SHARK_LEN * 1.18 * WIDE.zoom).toBeGreaterThan(VIDEO.width * 0.9);
    expect(ribbonShow(0)).toBe(1);
    // The ice hangs above the ribbon (Newton's cameo is its top), never over it.
    expect(toScreen(WIDE, 0, ICE_DEEPEST).y).toBeLessThan(CAMEO.y - CAMEO.h * 0.56);
    // Newton's name beside it (60 px tall, its baseline 8 px below the cameo's middle) starts inside the safe area.
    expect(CAMEO.y + 8 - 60 * 0.8).toBeGreaterThan(SAFE.top);
  });

  it('is drawn as a Greenland shark: heavy and round-bodied, blunt-snouted, bending only behind the head', () => {
    const deepest = Math.max(...Array.from({ length: 101 }, (_, i) => halfHeight(i / 100)));
    expect(deepest * 2).toBeGreaterThan(0.2);
    // A short, blunt, rounded snout: already deep a twentieth of the way back.
    expect(halfHeight(0.05)).toBeGreaterThan(deepest * 0.5);
    expect(halfHeight(1)).toBeLessThan(deepest * 0.35);
    // The wave leaves the head (and the eye under the magnifier) alone, and swings the tail.
    expect(waveAt(EYE.along, 1.3, 1)).toBe(0);
    expect(Math.abs(waveAt(1, Math.PI / 2 + 2.3, 0.3))).toBeGreaterThan(0.01);
    // The eye and the tape lie on its body.
    expect(Math.abs(EYE.across) + EYE.r / halfHeight(EYE.along)).toBeLessThan(1);
    expect(Math.abs(TAPE_ACROSS)).toBeLessThan(0.5);
    const eye = eyeAt(0);
    const tip = onShark(0, 0, 0);
    expect(tip.x - eye.x).toBeGreaterThan(0);
    expect(tip.x - eye.x).toBeLessThan(SHARK_LEN * 0.12);
  });

  it('starts its life, about 400 years ago, before Newton was born', () => {
    expect(TODAY - BIRTH).toBe(LIFE);
    expect(LIFE).toBe(400);
    expect(BIRTH).toBeLessThan(NEWTON_BORN);
    expect(ribbonX(BIRTH)).toBeLessThan(ribbonX(NEWTON_BORN));
    expect(ribbonX(RIBBON.from)).toBe(RIBBON.left);
    expect(ribbonX(TODAY)).toBeLessThanOrEqual(RIBBON.right);
    expect(newtonPulse(said('Newton.'))).toBeGreaterThan(0.5);
  });

  it('grows a metre in a century: about a centimetre a year', () => {
    expect(yearsAt(GROW_TO)).toBe(100);
    expect(grownM(GROW_TO)).toBe(1);
    expect(grownM(GROW_TO) / yearsAt(GROW_TO)).toBeCloseTo(0.01, 6);
    expect(tapeShow(said('grow'))).toBe(1);
    expect(tapeShow(ZOOM_TO + 0.5)).toBe(0);
  });

  it('opens the magnifier right over the eye, and only while the camera is close on it', () => {
    for (let t = ZOOM_TO; t < PULL_FROM; t += 0.1) {
      const cam = cameraAt(t);
      const eye = eyeAt(t);
      const p = toScreen(cam, eye.x, eye.y);
      expect(p.x).toBeCloseTo(LENS.x, 3);
      expect(p.y).toBeCloseTo(LENS.y, 3);
    }
    expect(lensOpen(said('lenses'))).toBe(1);
    expect(lensOpen(ZOOM_FROM)).toBe(0);
    expect(lensOpen(said('They'))).toBe(0);
    expect(LENS.y - LENS.r).toBeGreaterThanOrEqual(SAFE.top);
    // Room under it for the core's label, above the captions.
    expect(LENS.y + LENS.r + 78).toBeLessThan(1100);
  });

  it('stamps "≈ 400 years" as the narrator says four hundred, then hangs it on the ribbon', () => {
    expect(stampAt(STAMP_AT - 0.01).show).toBe(0);
    const s = stampAt(said('hundred') + 0.3);
    expect(s.show).toBe(1);
    expect(s.pop).toBeCloseTo(1, 1);
    expect(stampAt(FLY_TO).x).toBeCloseTo(STAMP_RIBBON.x, 6);
    expect(stampAt(FLY_TO).y).toBeCloseTo(STAMP_RIBBON.y, 6);
    for (const p of [STAMP_HOME, STAMP_RIBBON]) {
      expect(p.y - 210 * p.size).toBeGreaterThan(SAFE.top);
      expect(p.y + 140 * p.size).toBeLessThan(SAFE.bottom);
    }
  });

  it('counts its age up to its first pups at 150 as the narrator gets there', () => {
    expect(ageCount(COUNT_FROM)).toBe(0);
    expect(ageCount(PUPS_AT + 0.1)).toBe(PUPS_AGE);
    expect(PUPS_AGE).toBe(150);
    expect(ageMode(said('babies') + 0.2)).toBe(1);
    expect(pupsAt(PUPS_AT - 0.01)).toHaveLength(0);
    expect(pupsAt(PUPS_AT + 0.5)).toHaveLength(2);
    // Gone again by the time the loop comes round.
    expect(ageMarks(said('meet'))).toBe(0);
  });

  it('sinks while the ribbon counts, and rises back under the ice as the narrator says so', () => {
    expect(sinkAt(said('babies'))).toBeGreaterThan(100);
    expect(sinkAt(said('remember:'))).toBeCloseTo(0, 6);
    expect(cameraAt(said('remember:'))).toEqual(WIDE);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('remember:');
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
    expect(LOOP_S).toBe(18);
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
