import { describe, expect, it } from 'vitest';
import {
  captionAt, cardAt, chefAt, chefIn, chefLabel, equalsSign, graterAt, japanAt, LINES, noseLabel, sandpaperAt, scaleCut, skinLabel, smoothLabel, SOUNDS, sushiAt, tailArrowDrawn,
  tailArrowShown, tailLabel, teethLabel, toothCut, wasabiAt,
} from '../dev/promo/sharkskin/script';
import {
  arrowsAt, AWAY_TO, boilAt, BOIL_STEPS, DOWN_FROM, handAt, lensAt, liftAt, LOOP_S, NOSE_ALONG, pasteAt, ROUGH_FROM, ROUGH_TO, roughTrail, rubAt, said, sharkAt,
  SMOOTH_FROM, SMOOTH_TO, smoothTrail, TAIL_ALONG, type Fish,
} from '../dev/promo/sharkskin/story';
import { TEMPO, WORDS } from '../dev/promo/sharkskin/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'len', 'face', 'tilt', 'effort', 'content'] as const;
const NOTES = [teethLabel, chefLabel, cardAt, scaleCut, equalsSign, toothCut, tailArrowShown, tailLabel, noseLabel, smoothLabel, sandpaperAt, japanAt, chefAt, graterAt, wasabiAt, skinLabel, sushiAt];

const same = (a: Fish, b: Fish): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
};

describe('promo short: shark skin is covered in tiny teeth (narrated)', () => {
  it('loops: the shark, the magnifier and every note are where they were at the start', () => {
    same(sharkAt(END), sharkAt(0));
    expect(lensAt(END)).toBeCloseTo(lensAt(0), 4);
    for (const f of [arrowsAt, ...NOTES]) expect(f(END)).toBeCloseTo(f(0), 4);
    for (const f of [handAt, smoothTrail, roughTrail]) {
      expect(f(0)).toBeNull();
      expect(f(END)).toBeNull();
    }
  });

  it('never jumps: the shark, the hand and the magnifier move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [p, q] = [sharkAt(a), sharkAt(b)];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(10);
      expect(Math.abs(lensAt(b) - lensAt(a))).toBeLessThan(0.25);
      for (const f of NOTES) expect(Math.abs(f(b) - f(a))).toBeLessThan(0.35);
      const [g, h] = [handAt(a), handAt(b)];
      if (g && h) {
        expect(Math.hypot(h.x - g.x, h.y - g.y)).toBeLessThan(70);
        expect(Math.abs(h.face - g.face)).toBeLessThan(0.3);
      }
      // The hand only comes and goes faded out.
      if (!g && h) expect(h.alpha).toBeLessThan(0.2);
      if (g && !h) expect(g.alpha).toBeLessThan(0.2);
    }
  });

  it('opens on the hook itself: the magnifier on the shark\'s flank, "tiny teeth", the first line up', () => {
    expect(lensAt(0)).toBe(1);
    expect(teethLabel(0)).toBe(1);
    expect(arrowsAt(0)).toBe(0);
    expect(sharkAt(0).face).toBe(-1);
    expect(handAt(0)).toBeNull();
    expect(cardAt(0)).toBe(0);
    expect(captionAt(0)!.line.words[0]!.text).toBe('Shark');
    // Still there as "tiny TEETH" is said.
    expect(lensAt(said('TEETH.'))).toBe(1);
    expect(teethLabel(said('TEETH.'))).toBe(1);
  });

  it('builds the scale like a tooth on "Every scale is built like a tooth", and points them all to the tail', () => {
    expect(scaleCut(said('scale') - 0.15)).toBe(0);
    expect(scaleCut(said('scale') + 0.2)).toBe(1);
    expect(equalsSign(said('like') + 0.15)).toBe(1);
    expect(toothCut(said('tooth,') - 0.15)).toBe(0);
    expect(toothCut(said('tooth,') + 0.2)).toBe(1);
    expect(teethLabel(said('scale'))).toBe(0);
    expect(arrowsAt(said('point') - 0.2)).toBe(0);
    expect(arrowsAt(said('point') + 0.4)).toBe(1);
    expect(lensAt(said('tail.'))).toBe(1);
    expect(tailArrowDrawn(said('tail.') + 0.1)).toBe(1);
    expect(tailLabel(said('tail.') + 0.15)).toBe(1);
    // All of it gone before the hand comes down.
    expect(lensAt(said('Stroke'))).toBe(0);
    expect(cardAt(said('Stroke'))).toBe(0);
    expect(liftAt(said('Stroke') - 0.1)).toBeGreaterThan(0.5);
  });

  it('strokes the shark nose to tail on "from nose to tail", and it feels smooth', () => {
    expect(handAt(DOWN_FROM - 0.01)).toBeNull();
    const atNose = handAt(said('nose'))!;
    expect(atNose.along).toBeLessThan(NOSE_ALONG + 0.05);
    expect(liftAt(said('nose'))).toBe(0);
    expect(atNose.face).toBe(1);
    expect(noseLabel(said('nose') + 0.15)).toBe(1);
    const atTail = handAt(said('tail,'))!;
    expect(atTail.along).toBeGreaterThan(0.4);
    expect(atTail.x).toBeGreaterThan(atNose.x + 200);
    expect(tailLabel(said('tail,') + 0.15)).toBe(1);
    expect(handAt(SMOOTH_TO)!.along).toBeCloseTo(TAIL_ALONG, 3);
    for (let t = SMOOTH_FROM; t < SMOOTH_TO; t += FRAME) expect(handAt(t + FRAME)!.along).toBeGreaterThanOrEqual(handAt(t)!.along);
    expect(smoothTrail(said('tail,'))).not.toBeNull();
    expect(smoothLabel(said('smooth.') + 0.2)).toBe(1);
    expect(sharkAt(said('smooth.') + 0.2).content).toBe(1);
  });

  it('turns the hand round on "The other way?" and drags it back in fits and starts, "Like SANDPAPER"', () => {
    expect(handAt(said('way?'))!.face).toBe(-1);
    expect(liftAt(ROUGH_FROM)).toBe(0);
    for (let t = ROUGH_FROM; t < ROUGH_TO; t += FRAME) {
      expect(handAt(t + FRAME)!.along).toBeLessThanOrEqual(handAt(t)!.along + 1e-9);
      expect(liftAt(t)).toBe(0);
    }
    expect(handAt(ROUGH_TO)!.along).toBeCloseTo(NOSE_ALONG, 3);
    expect(roughTrail(said('SANDPAPER.'))).not.toBeNull();
    expect(sandpaperAt(said('SANDPAPER.') - 0.15)).toBe(0);
    expect(sandpaperAt(said('SANDPAPER.') + 0.1)).toBe(1);
    expect(sharkAt(said('SANDPAPER.')).content).toBe(0);
    expect(smoothLabel(said('SANDPAPER.'))).toBe(0);
    expect(AWAY_TO).toBeLessThan(said('Japan,'));
  });

  it('grates wasabi on shark skin in Japan: each prop on its word', () => {
    expect(japanAt(said('Japan,') + 0.15)).toBe(1);
    expect(sandpaperAt(said('Japan,'))).toBe(0);
    // The chef steps in from the left from "Japan", so the picture keeps moving, and is in place and named on "chefs".
    expect(chefAt(said('Japan,') - 0.15)).toBe(0);
    expect(chefAt(said('Japan,') + 0.25)).toBe(1);
    for (let t = said('Japan,'); t < said('chefs'); t += FRAME) expect(chefIn(t + FRAME)).toBeGreaterThan(chefIn(t));
    expect(chefIn(said('chefs') + 0.1)).toBe(1);
    expect(chefLabel(said('chefs') - 0.2)).toBe(0);
    expect(chefLabel(said('chefs') + 0.1)).toBe(1);
    expect(graterAt(said('grate') + 0.05)).toBe(1);
    expect(wasabiAt(said('wasabi'))).toBe(1);
    expect(skinLabel(said('shark', 2) + 0.15)).toBe(1);
    expect(pasteAt(said('wasabi'))).toBe(0);
    expect(pasteAt(said('skin.') + 0.6)).toBe(1);
    const [a, b] = [rubAt(said('grate') + 0.5), rubAt(said('grate') + 0.7)];
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThan(5);
    for (const f of [japanAt, chefAt, graterAt, wasabiAt, skinLabel]) expect(f(said('sushi,'))).toBe(0);
  });

  it('serves the sushi on "sushi", and brings the magnifier back on "remember:" for the loop', () => {
    expect(sushiAt(said('sushi,'))).toBe(1);
    expect(sushiAt(said('So'))).toBe(0);
    expect(lensAt(said('remember:') - 0.15)).toBe(0);
    expect(lensAt(said('remember:') + 0.35)).toBe(1);
    expect(teethLabel(said('remember:') + 0.4)).toBe(1);
    expect(arrowsAt(said('remember:') + 0.4)).toBe(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('remember:');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeLessThan(0.5);
    expect(TEMPO).toBeLessThanOrEqual(1.15);
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

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop and fitting its mood', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    // A bright ding on "TEETH", soft sounds for the smooth stroke, a low rasp against the grain.
    expect(SOUNDS.some((s) => s.id === 'clang' && Math.abs(s.t - said('TEETH.')) < 0.05)).toBe(true);
    for (const s of SOUNDS.filter((c) => c.t > SMOOTH_FROM && c.t < said('The'))) expect(['dash', 'grow']).toContain(s.id);
    const rasp = SOUNDS.filter((s) => s.id === 'rustle' && s.t > ROUGH_FROM && s.t < ROUGH_TO);
    expect(rasp.length).toBeGreaterThanOrEqual(4);
    for (const s of rasp) expect(s.pitch).toBeLessThan(0.6);
  });
});
