import { describe, expect, it } from 'vitest';
import {
  breedLabel, captionAt, countShown, distanceLabel, europeLabel, femaleLabel, freudLabel, laterLabel, LINES, maleLabel, puzzleAt, sargassoLabel, SOUNDS,
} from '../dev/promo/eels/script';
import {
  boilAt, BOIL_STEPS, chalkWritten, countAt, deepAt, type Fish, hookAt, JAR_AT, JAR_COUNT, labAt, LOOP_S, magAt, magPos, mapAt, mapZoomAt, MIGRANTS, migrantAt,
  pairAt, pairEel, said, SARGASSO, TAG_AT, yearAt, yearShown,
} from '../dev/promo/eels/story';
import { TEMPO, WORDS } from '../dev/promo/eels/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'len', 'face', 'tilt', 'effort', 'alpha'] as const;
const onScreen = (f: Fish): boolean => f.x > 0 && f.x < 1080 && f.y > 270 && f.y < 1250;
const inOval = (f: Fish): boolean => ((f.x - SARGASSO.x) / SARGASSO.rx) ** 2 + ((f.y - SARGASSO.y) / SARGASSO.ry) ** 2 < 1;

const same = (a: Fish, b: Fish): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
};

describe('promo short: nobody has ever seen eels mate (narrated)', () => {
  it('loops: the deep, the circling pair and every sign are where they were at the start, the lab and the map gone', () => {
    for (const k of [0, 1]) same(pairEel(k, END), pairEel(k, 0));
    for (const f of [deepAt, labAt, mapAt, pairAt, hookAt, yearShown, laterLabel, freudLabel, magAt, breedLabel]) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(deepAt(0)).toBe(1);
    expect(labAt(0)).toBe(0);
    expect(mapAt(0)).toBe(0);
    for (let k = 0; k < MIGRANTS; k++) {
      expect(migrantAt(k, 0).alpha).toBe(0);
      expect(migrantAt(k, END).alpha).toBe(0);
    }
  });

  it('never jumps: the eels, the magnifier and the scenes move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      for (const k of [0, 1]) {
        const [p, q] = [pairEel(k, a), pairEel(k, b)];
        expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(30);
        expect(Math.abs(q.face - p.face)).toBeLessThan(0.3);
      }
      for (let k = 0; k < MIGRANTS; k++) {
        const [p, q] = [migrantAt(k, a), migrantAt(k, b)];
        if (p.alpha > 0 && q.alpha > 0) expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(40);
      }
      if (magAt(a) > 0 && magAt(b) > 0) expect(Math.hypot(magPos(b).x - magPos(a).x, magPos(b).y - magPos(a).y)).toBeLessThan(60);
      for (const f of [deepAt, labAt, mapAt, pairAt, hookAt]) expect(Math.abs(f(b) - f(a))).toBeLessThan(0.25);
      // The map zooms in smoothly while it shows (it starts over, unseen, at the loop point).
      if (mapAt(a) > 0 || mapAt(b) > 0) expect(Math.abs(mapZoomAt(b).scale - mapZoomAt(a).scale)).toBeLessThan(0.15);
    }
  });

  it('opens on the hook itself: two eels circling the "?" in the deep, "never seen", the first words up', () => {
    expect(hookAt(0)).toBe(1);
    expect(pairAt(0)).toBe(1);
    for (const k of [0, 1]) {
      const e = pairEel(k, 0);
      expect(onScreen(e)).toBe(true);
      // Seen from the side, not edge-on mid-turn.
      expect(Math.abs(e.face)).toBeGreaterThan(0.5);
    }
    // Moving from the first frame.
    expect(Math.hypot(pairEel(0, 0.5).x - pairEel(0, 0).x, pairEel(0, 0.5).y - pairEel(0, 0).y)).toBeGreaterThan(60);
    expect(captionAt(0)!.line.words[0]!.text).toBe('Nobody');
  });

  it('opens the lab on "Sigmund Freud", puzzles on "solve", and chalks up the year on "1876"', () => {
    expect(labAt(said('Sigmund'))).toBeGreaterThan(0.8);
    expect(pairAt(said('Sigmund') + 0.1)).toBe(0);
    expect(freudLabel(said('Sigmund') + 0.15)).toBe(1);
    expect(puzzleAt(said('solve') + 0.25)).toBe(1);
    expect(chalkWritten(said('1876,') - 0.1)).toBe(0);
    // "1876" is the first ~40% of "1876 · Trieste": written while it's said.
    expect(chalkWritten(said('1876,') + 0.5)).toBeGreaterThan(0.4);
    expect(chalkWritten(said('he'))).toBe(1);
  });

  it('fills the shelves as the count ticks up to 400 on "FOUR HUNDRED eels", then sweeps them for a male', () => {
    expect(countShown(said('cut'))).toBeGreaterThan(0.4);
    expect(countAt(said('cut'))).toBe(0);
    expect(countAt(said('FOUR'))).toBeGreaterThan(250);
    expect(countAt(said('eels,') + 0.1)).toBe(JAR_COUNT);
    for (const at of JAR_AT) {
      expect(at).toBeGreaterThan(said('cut'));
      expect(at).toBeLessThan(said('eels,') + 0.1);
    }
    expect(magAt(said('looking') + 0.1)).toBe(1);
    expect(magAt(said('male.'))).toBe(1);
    expect(maleLabel(said('male.') + 0.2)).toBe(1);
    expect(magAt(said('Every') + 0.01)).toBe(0);
  });

  it('stamps a ♀ on every jar from "Every" to "female" (the surprise, ~half way), with a ding each', () => {
    expect(Math.abs(TAG_AT[0]! - said('Every'))).toBeLessThan(0.05);
    for (let k = 1; k < TAG_AT.length; k++) expect(TAG_AT[k]!).toBeGreaterThan(TAG_AT[k - 1]!);
    expect(TAG_AT[TAG_AT.length - 1]!).toBeLessThan(said('female.') + 0.3);
    expect(femaleLabel(said('female.') + 0.3)).toBe(1);
    expect(said('female.') / LOOP_S).toBeGreaterThan(0.45);
    expect(said('female.') / LOOP_S).toBeLessThan(0.6);
    for (const at of TAG_AT) expect(SOUNDS.some((s) => s.id === 'clang' && Math.abs(s.t - at) < 0.01)).toBe(true);
  });

  it('swims the eels along the map from Europe on "Eels…" into the Sargasso Sea by "breed"', () => {
    const go = said('Eels') + 0.2;
    expect(labAt(go)).toBe(0);
    expect(mapAt(said('Eels'))).toBeGreaterThan(0.9);
    expect(europeLabel(go)).toBe(1);
    for (let k = 0; k < MIGRANTS; k++) {
      const e = migrantAt(k, go);
      expect(e.alpha).toBeGreaterThan(0.5);
      // Setting off from Europe, on the right of the map.
      expect(e.x).toBeGreaterThan(800);
      expect(inOval(migrantAt(k, said('breed…') + 0.6))).toBe(true);
    }
    expect(distanceLabel(said('thousands') + 0.25)).toBe(1);
    expect(sargassoLabel(said('Sargasso') + 0.25)).toBe(1);
    expect(breedLabel(said('breed…') + 0.25)).toBe(1);
  });

  it('lets them vanish into the deep on "vanish", and rolls the year from 1876 to 2026 on "A hundred and fifty years later"', () => {
    for (let k = 0; k < MIGRANTS; k++) expect(migrantAt(k, said('vanish.') + 0.4).alpha).toBe(0);
    expect(mapZoomAt(said('vanish.')).scale).toBeGreaterThan(1.2);
    expect(mapAt(said('vanish.') + 0.65)).toBe(0);
    expect(deepAt(said('vanish.') + 0.5)).toBe(1);
    expect(yearAt(said('A'))).toBe(1876);
    expect(yearShown(said('A'))).toBeGreaterThan(0.5);
    expect(yearAt(said('fifty'))).toBeGreaterThan(1876);
    expect(yearAt(said('later,') + 0.2)).toBe(2026);
    expect(laterLabel(said('later,') + 0.3)).toBe(1);
    // "still…": the year makes way for the hook's signs, and the pair comes back.
    expect(yearShown(said('still…'))).toBe(0);
    expect(hookAt(said('still…') + 0.3)).toBe(1);
    expect(pairAt(said('still…') + 0.25)).toBe(1);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('still…');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeLessThan(0.5);
    // Sped up harder than the usual 1.15 cap: neither of Mark's two takes fits the loop at 1.15 (flagged).
    expect(TEMPO).toBeLessThanOrEqual(1.25);
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

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop and nothing comic', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(['yuck', 'squawk', 'hurt', 'lose', 'eat', 'eatBig']).not.toContain(s.id);
    }
    // A low boom as 2026 lands: the dramatic close.
    expect(SOUNDS.some((s) => s.id === 'boom' && s.pitch < 1 && Math.abs(s.t - said('later,')) < 0.3)).toBe(true);
  });
});
