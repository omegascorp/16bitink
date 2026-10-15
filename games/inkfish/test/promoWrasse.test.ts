import { describe, expect, it } from 'vitest';
import type { Fish } from '../dev/promo/wrasse/cleaner';
import {
  alarmAt, blindCrossAt, blindSightAt, boilAt, BOIL_STEPS, captionAt, cardAt, failAt, glintAt, lensAt, LINES, LOOP_S, markAt, MIRROR, mirrorSightAt,
  mostAt, pipetteAt, PUFFS, reflectionOf, ROWS, rowAt, said, SAND_Y, SCRAPE_FROM, SCRAPE_TO, scrapingAt, SOUNDS, stampAt, titleAt, wrasseAt,
} from '../dev/promo/wrasse/story';
import { TEMPO, WORDS } from '../dev/promo/wrasse/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'len', 'face', 'tilt', 'effort'] as const;

const same = (a: Fish, b: Fish): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
};

/** How low its throat is: the bottom of its body near the nose. */
const throatY = (f: Fish): number => f.y + f.len * 0.1 - Math.sin(f.tilt) * f.len * 0.33;

describe('promo short: this fish passed a test your dog fails (narrated)', () => {
  it('loops: everything at the loop point is where it was at the start', () => {
    same(wrasseAt(END), wrasseAt(0));
    for (const f of [markAt, cardAt, titleAt, mostAt, failAt, pipetteAt, alarmAt, blindSightAt, blindCrossAt, mirrorSightAt, glintAt, scrapingAt]) {
      expect(f(END)).toBeCloseTo(f(0), 4);
    }
    for (const id of ROWS) {
      expect(rowAt(id, END)).toBeCloseTo(rowAt(id, 0), 4);
      expect(stampAt(id, END)).toBeCloseTo(stampAt(id, 0), 4);
    }
    expect(lensAt(0)).toBeNull();
    expect(lensAt(END)).toBeNull();
  });

  it('never jumps: the wrasse, the card and the lenses move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [p, q] = [wrasseAt(a), wrasseAt(b)];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(20);
      expect(Math.abs(q.face - p.face)).toBeLessThan(0.3);
      expect(Math.abs(q.tilt - p.tilt)).toBeLessThan(0.08);
      expect(Math.abs(cardAt(b) - cardAt(a))).toBeLessThan(0.2);
      expect(Math.abs(markAt(b) - markAt(a))).toBeLessThan(0.2);
      const [la, lb] = [lensAt(a), lensAt(b)];
      if (la && lb) expect(la.lens.id === lb.lens.id ? Math.abs(lb.open - la.open) : 1).toBeLessThan(0.25);
      else expect((la ?? lb)?.open ?? 0).toBeLessThan(0.25);
    }
  });

  it('opens on the hook: the wrasse facing its reflection, and the card with the dog failing and the wrasse passing', () => {
    const f = wrasseAt(0);
    expect(f.face).toBe(1);
    expect(f.x).toBeLessThan(MIRROR.x);
    expect(reflectionOf(f).face).toBe(-1);
    expect(reflectionOf(f).x).toBeGreaterThan(MIRROR.x);
    expect(cardAt(0)).toBe(1);
    expect(stampAt('dog', 0)).toBe(1);
    expect(stampAt('wrasse', 0)).toBe(1);
    expect(captionAt(0)!.line.words.map((w) => w.text).join(' ')).toBe('This fish passed a');
    // Already moving in the first frame.
    const g = wrasseAt(FRAME);
    expect(Math.hypot(g.x - f.x, g.y - f.y)).toBeGreaterThan(0.1);
    // The card is gone before "Scientists".
    expect(cardAt(said('Scientists'))).toBeLessThan(0.05);
  });

  it('marks its throat on "brown mark", with its back to the mirror, and magnifies the spot', () => {
    expect(markAt(said('brown') - 0.05)).toBe(0);
    expect(markAt(said('mark'))).toBeGreaterThan(0.8);
    expect(pipetteAt(said('brown'))).toBeGreaterThan(0.9);
    expect(pipetteAt(said('Scientists') + 0.1)).toBeGreaterThan(0);
    expect(pipetteAt(said('cleaner') + 0.5)).toBe(0);
    expect(wrasseAt(said('brown')).face).toBe(-1);
    expect(lensAt(said('cleaner'))?.lens.id).toBe('throat');
    expect(lensAt(said('throat,'))?.open).toBe(1);
  });

  it('can only see the spot in a mirror: a ✗ on "could only see", then it turns and sees the reflection on "mirror", and on "looked" a "!"', () => {
    expect(wrasseAt(said('only')).face).toBe(-1);
    expect(blindSightAt(said('spot') + 0.3)).toBe(1);
    expect(blindCrossAt(said('only'))).toBe(1);
    expect(wrasseAt(said('mirror.')).face).toBe(1);
    expect(mirrorSightAt(said('mirror.') + 0.1)).toBe(1);
    expect(lensAt(said('looked…'))?.lens.id).toBe('mirror');
    expect(alarmAt(said('looked…') - 0.2)).toBe(0);
    expect(alarmAt(said('looked…') + 0.2)).toBeGreaterThan(0.9);
    expect(glintAt(said('mirror.') + 0.2)).toBe(1);
  });

  it('scrapes its throat on the sand on "scraped", kicking up sand, but the mark stays ("trying to rub it off")', () => {
    for (const w of ['its', 'sand,', 'rub']) {
      const f = wrasseAt(said(w));
      expect(throatY(f)).toBeGreaterThan(SAND_Y - 35);
    }
    expect(scrapingAt(said('throat') + 0.2)).toBe(1);
    expect(SCRAPE_FROM).toBeLessThan(said('scraped'));
    expect(SCRAPE_TO).toBeGreaterThan(said('off!'));
    expect(PUFFS.length).toBeGreaterThanOrEqual(4);
    expect(PUFFS.some((at) => Math.abs(at - said('sand,')) < 0.3)).toBe(true);
    expect(markAt(said('off!') + 0.2)).toBeGreaterThan(0.3);
    expect(markAt(said('off!') + 0.2)).toBeLessThan(markAt(said('scraped')));
    expect(lensAt(said('trying') + 0.2)?.lens.id).toBe('scrape');
    // Back up at the mirror for "That's the mirror test", and the mark faded away under the card's turn.
    expect(wrasseAt(said('test.')).face).toBe(1);
    expect(markAt(said('Dogs'))).toBe(0);
  });

  it('brings the card back on "That\'s the mirror test" and ticks it off as the narrator goes: dog ✗, cat ✗, wrasse ✓', () => {
    expect(cardAt(said("That's") + 0.35)).toBe(1);
    expect(titleAt(said("That's"))).toBe(0);
    expect(titleAt(said('mirror'))).toBeGreaterThan(0.8);
    expect(titleAt(said('test.'))).toBe(1);
    expect(failAt(said('fail') - 0.1)).toBe(0);
    expect(failAt(said('fail') + 0.2)).toBe(1);
    const named = [['dog', 'Dogs', 1], ['cat', 'Cats', 2], ['wrasse', 'But', 0]] as const;
    for (const [id, word] of named) {
      expect(rowAt(id, said(word) - 0.2)).toBe(0);
      expect(rowAt(id, said(word) + 0.2)).toBe(1);
    }
    expect(stampAt('dog', said('do.', 1) - 0.1)).toBe(0);
    expect(stampAt('dog', said('do.', 1) + 0.3)).toBe(1);
    expect(stampAt('cat', said('do.', 2) - 0.1)).toBe(0);
    expect(stampAt('cat', said('do.', 2) + 0.3)).toBe(1);
    expect(stampAt('wrasse', said('somehow,') - 0.1)).toBe(0);
    expect(stampAt('wrasse', said('somehow,') + 0.3)).toBe(1);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('somehow,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(gap).toBeLessThan(0.5);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.15);
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
