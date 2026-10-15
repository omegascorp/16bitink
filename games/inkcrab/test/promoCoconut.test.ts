import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS } from '../dev/promo/coconut/cues';
import {
  almostLabel, armourAt, barAt, BARS, bigAt, boilAt, BOIL_STEPS, cardAt, crackAt, dialAt, ghostAt, gripAt, hermitAlphaAt, hermitSizeAt, kgPopAt, LOOP_S,
  metreLabel, nakedAt, nameLabel, needleAt, type Pose, rewindAt, said, scaleAt, SHELLS, shellAt, splitAt, strainAt, tapeAt,
} from '../dev/promo/coconut/story';
import { TEMPO, WORDS } from '../dev/promo/coconut/words';
import { BOIL } from '../src/art/palette';
import { BOIL_FPS } from '../dev/promo/sprites';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'scale', 'alpha', 'rot'] as const;

const same = (a: Pose, b: Pose): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
};

/** The shell the young crab is in at t (landed, not on its way out), or null. */
const shellIn = (t: number): string | null => {
  const i = SHELLS.findIndex((_, k) => {
    const st = shellAt(k, t);
    return st !== null && st.out === 0 && st.drop < 0.05;
  });
  return i < 0 ? null : SHELLS[i]!.kind;
};

describe('promo short: this crab cracks open coconuts (narrated)', () => {
  it('loops: everything at the loop point is where it was at the start', () => {
    same(bigAt(END), bigAt(0));
    for (const f of [crackAt, splitAt, gripAt, scaleAt, dialAt, cardAt, tapeAt, rewindAt, hermitAlphaAt, nakedAt, nameLabel, metreLabel]) {
      expect(f(END)).toBeCloseTo(f(0), 4);
    }
    for (const id of BARS) expect(barAt(id, END)).toBeCloseTo(barAt(id, 0), 4);
    expect(hermitAlphaAt(0)).toBe(0);
    expect(ghostAt(0)).toBeNull();
  });

  it('never jumps: the crabs, the coconut and the card move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [p, q] = [bigAt(a), bigAt(b)];
      expect(Math.abs(q.alpha - p.alpha)).toBeLessThan(0.2);
      if (p.alpha > 0.01 && q.alpha > 0.01) {
        expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(20);
        // The quick shrink on the rewind is the fastest change.
        expect(Math.abs(q.scale - p.scale)).toBeLessThan(0.8);
        expect(Math.abs(q.rot - p.rot)).toBeLessThan(0.03);
      }
      // The cracks only show on the whole nut.
      if (splitAt(a) === 0 && splitAt(b) === 0) expect(Math.abs(crackAt(b) - crackAt(a))).toBeLessThan(0.3);
      expect(Math.abs(splitAt(b) - splitAt(a))).toBeLessThan(0.3);
      expect(Math.abs(cardAt(b) - cardAt(a))).toBeLessThan(0.2);
      expect(Math.abs(scaleAt(b) - scaleAt(a))).toBeLessThan(0.2);
      if (hermitAlphaAt(a) > 0 && hermitAlphaAt(b) > 0) expect(Math.abs(hermitSizeAt(b) - hermitSizeAt(a))).toBeLessThan(0.15);
      expect(Math.abs(hermitAlphaAt(b) - hermitAlphaAt(a))).toBeLessThan(0.2);
    }
  });

  it('opens on the hook: the coconut crab already squeezing a cracking coconut, the whole hook line on screen', () => {
    const p = bigAt(0);
    expect(p.alpha).toBe(1);
    expect(gripAt(0)).toBe(1);
    expect(crackAt(0)).toBeGreaterThan(0.2);
    expect(crackAt(0)).toBeLessThan(1);
    expect(splitAt(0)).toBe(0);
    expect(captionAt(0)!.line.words.map((w) => w.text).join(' ')).toBe('This crab cracks open COCONUTS.');
    // Already moving in the first frame.
    expect(Math.abs(bigAt(FRAME).rot - p.rot)).toBeGreaterThan(1e-4);
  });

  it('cracks it on "COCONUTS", names it, and brings a ghost crab in for scale on "biggest"', () => {
    expect(crackAt(said('cracks') + 0.2)).toBeCloseTo(1, 5);
    expect(splitAt(said('COCONUTS.') - 0.05)).toBe(0);
    expect(splitAt(said('COCONUTS.') + 0.3)).toBe(1);
    expect(nameLabel(said('coconut') + 0.2)).toBe(1);
    expect(ghostAt(said('biggest') + 0.2)?.x).toBeGreaterThan(0);
  });

  it('weighs it on "four kilos" and measures its legs on "a metre"', () => {
    expect(scaleAt(said('up'))).toBeGreaterThan(0.4);
    expect(scaleAt(said('four'))).toBe(1);
    expect(dialAt(said('four'))).toBe(1);
    expect(needleAt(said('kilos,') + 0.3)).toBeCloseTo(4, 3);
    expect(kgPopAt(said('kilos,'))).toBeGreaterThan(0);
    expect(kgPopAt(said('kilos,') - 0.1)).toBeLessThan(0);
    expect(tapeAt(said('metre'))).toBe(1);
    expect(tapeAt(said('legs'))).toBe(0);
    expect(metreLabel(said('metre') + 0.2)).toBe(1);
    expect(scaleAt(said('pinch'))).toBe(0);
  });

  it('charts its pinch on "pinch": its bar above every land predator but the crocodile on "almost"', () => {
    expect(cardAt(said('pinch') + 0.25)).toBe(1);
    expect(barAt('crab', said('beats') + 0.3)).toBeGreaterThan(0.7);
    const t = said('predator.');
    for (const id of ['fox', 'raccoon', 'monitor'] as const) expect(barAt(id, t)).toBeLessThan(barAt('crab', t) / 3);
    expect(barAt('croc', said('almost') - 0.1)).toBe(0);
    expect(barAt('croc', t)).toBeGreaterThan(barAt('crab', t));
    expect(almostLabel(said('any', 1))).toBe(1);
    expect(cardAt(said('Yet') + 0.1)).toBe(0);
  });

  it('rewinds on "Yet it starts life" to a tiny hermit crab in a snail shell', () => {
    expect(rewindAt(said('starts'))).toBe(1);
    expect(bigAt(said('starts') + 0.2).alpha).toBe(0);
    expect(splitAt(said('tiny'))).toBe(0);
    expect(hermitAlphaAt(said('tiny'))).toBe(1);
    expect(shellIn(said('snail'))).toBe('periwinkle');
    expect(hermitSizeAt(said('tiny'))).toBeLessThan(0.7);
  });

  it('grows up the shell ladder ("until it grows too big…"), out of the last on "at all", and hardens into the coconut crab', () => {
    expect(shellIn(said('grows') + 0.1)).toBe('snail');
    expect(shellIn(said('big') + 0.1)).toBe('whelk');
    expect(shellIn(said('any', 2) + 0.1)).toBe('conch');
    expect(hermitSizeAt(said('big') + 0.1)).toBeGreaterThan(hermitSizeAt(said('grows') + 0.1));
    expect(strainAt(said('at'))).toBe(1);
    expect(nakedAt(said('all.') + 0.1)).toBe(1);
    expect(shellIn(said('No') + 0.1)).toBeNull();
    expect(armourAt(said('no') - 0.15)).toBe(0);
    expect(armourAt(said('problem,'))).toBeGreaterThan(0.1);
    expect(bigAt(said('because')).alpha).toBe(1);
    expect(bigAt(said('because')).scale).toBeGreaterThan(bigAt(0).scale * 0.97);
    expect(gripAt(said('because') + 0.3)).toBe(1);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('because');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.5);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.15);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES.slice(1)) expect(l.words.length).toBeLessThanOrEqual(4);
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END)).toBe(BOIL - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
