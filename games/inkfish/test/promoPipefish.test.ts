import { describe, expect, it } from 'vitest';
import { ageOf, BABIES, babyAlpha, babyAt, babyGone, CAPTION_TOP, copepodAt, LIFE, SNACKS, snackTime, snoutOf } from '../dev/promo/pipefish/brood';
import { SOUNDS } from '../dev/promo/pipefish/sounds';
import {
  babiesLabel, BIRTH_AT, boilAt, BOIL_STEPS, BURSTS, calendarAt, captionAt, cardAt, CLOUD, CLOUD_AT, dadAt, dadLabel, eggFlight, EGG_COUNT, eggLaunch,
  embryoAt, femaleAt, hookLabel, lensAt, LINES, LOOP_S, momLabel, onlyLabel, pagesAt, pipefishLabel, pouchAt, pouchLabel, said, seahorseAt, seahorseLabel,
  squeezeAt, type Fish,
} from '../dev/promo/pipefish/story';
import { TEMPO, WORDS } from '../dev/promo/pipefish/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'len', 'face', 'up', 'tilt', 'effort'] as const;

const same = (a: Fish, b: Fish): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
};

/** The babies out at time t, by index. */
const out = (t: number): number[] => BABIES.flatMap((b, i) => (ageOf(b, t) === null ? [] : [i]));

describe('promo short: in this family, dads get pregnant (narrated)', () => {
  it('loops: the dad, his pouch, the brood and every note at the loop point are as they were at the start', () => {
    same(dadAt(END), dadAt(0));
    expect(pouchAt(END)).toBeCloseTo(pouchAt(0), 3);
    expect(squeezeAt(END)).toBeCloseTo(squeezeAt(0), 3);
    expect(out(END)).toEqual(out(0));
    for (const i of out(0)) {
      const [p, q] = [babyAt(BABIES[i]!, ageOf(BABIES[i]!, END)!), babyAt(BABIES[i]!, ageOf(BABIES[i]!, 0)!)];
      expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThan(1);
    }
    for (const f of [hookLabel, pipefishLabel, seahorseLabel, onlyLabel, dadLabel, momLabel, pouchLabel, lensAt, calendarAt, babiesLabel, cardAt]) {
      expect(f(END)).toBeCloseTo(f(0), 3);
    }
    expect(femaleAt(0)).toBeNull();
    expect(femaleAt(END)).toBeNull();
    expect(seahorseAt(0)).toBeNull();
    expect(seahorseAt(END)).toBeNull();
    for (const s of SNACKS) expect(copepodAt(s, END) === null).toBe(copepodAt(s, 0) === null);
  });

  it('never jumps: the dad, the female, the pouch and every baby move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [p, q] = [dadAt(a), dadAt(b)];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(10);
      expect(Math.abs(pouchAt(b) - pouchAt(a))).toBeLessThan(0.06);
      const [m, n] = [femaleAt(a), femaleAt(b)];
      if (m && n) {
        expect(Math.hypot(n.x - m.x, n.y - m.y)).toBeLessThan(80);
        expect(Math.abs(n.up - m.up)).toBeLessThan(0.3);
      }
      for (const baby of BABIES) {
        const [u, v] = [ageOf(baby, a), ageOf(baby, b)];
        if (u === null || v === null) continue;
        const [r, s] = [babyAt(baby, u), babyAt(baby, v)];
        expect(Math.hypot(s.x - r.x, s.y - r.y)).toBeLessThan(45);
        expect(s.facing).toBe(r.facing);
      }
    }
  });

  it('opens on the hook: a dad, ♂ DAD, his pouch swollen and labelled pregnant, babies bursting out of it', () => {
    expect(hookLabel(0)).toBe(1);
    expect(pouchAt(0)).toBeGreaterThan(0.45);
    // A burst just before the loop point: babies fresh out of the pouch in frame 1.
    expect(BABIES.filter((b) => (ageOf(b, 0) ?? 9) < 0.4).length).toBeGreaterThanOrEqual(4);
    // Not a crowd: a few babies about, not the whole cloud still lingering.
    const seen = out(0).filter((i) => !babyGone(babyAt(BABIES[i]!, ageOf(BABIES[i]!, 0)!)));
    expect(seen.length).toBeGreaterThanOrEqual(5);
    expect(seen.length).toBeLessThanOrEqual(14);
    expect(captionAt(0)!.line).toBe(LINES[0]);
  });

  it('names the pipefish and the seahorse as they are said, ♂ over both on "males"', () => {
    expect(pipefishLabel(said('Pipefish') + 0.3)).toBe(1);
    expect(hookLabel(said('Pipefish') + 0.3)).toBe(0);
    expect(seahorseAt(said('seahorses'))).not.toBeNull();
    expect(seahorseLabel(said('seahorses') + 0.3)).toBe(1);
    expect(onlyLabel(said('only') + 0.3)).toBe(1);
    expect(seahorseLabel(said('males') + 0.1)).toBe(1);
    // The pouch is empty before she comes.
    expect(pouchAt(said('female') - 0.2)).toBeLessThan(0.02);
  });

  it('brings the female on "female" and puts her eggs into his pouch on "lays her eggs in a pouch"', () => {
    expect(femaleAt(said('female'))).not.toBeNull();
    expect(momLabel(said('female') + 0.3)).toBe(1);
    // Belly to belly while she lays.
    expect(femaleAt(said('eggs'))!.up).toBeLessThan(-0.9);
    expect(eggFlight(0, said('eggs'))).not.toBeNull();
    expect(eggLaunch(EGG_COUNT - 1)).toBeLessThan(said('belly.'));
    expect(pouchLabel(said('pouch') + 0.3)).toBe(1);
    expect(pouchAt(said('belly.') + 0.3)).toBeGreaterThan(0.35);
    // Off to the right as he starts on the oxygen.
    expect(femaleAt(said('oxygen') + 0.1)?.x ?? 2000).toBeGreaterThan(1080 + 200);
  });

  it('opens the lens on "oxygen", grows the embryos, flips the calendar on "weeks later", then shuts both for the birth', () => {
    expect(lensAt(said('oxygen') + 0.1)).toBe(1);
    expect(embryoAt(said('oxygen'))).toBeLessThan(0.2);
    expect(embryoAt(said('later,') + 0.4)).toBe(1);
    expect(calendarAt(said('weeks'))).toBeGreaterThan(0.5);
    expect(pagesAt(said('later,') + 0.4)).toBe(3);
    expect(pouchAt(BIRTH_AT)).toBeCloseTo(1, 2);
    expect(lensAt(CLOUD_AT)).toBe(0);
    expect(calendarAt(CLOUD_AT + 0.2)).toBe(0);
  });

  it('bursts a cloud of dozens of babies on "cloud" (the payoff), and some snap up plankton', () => {
    expect(CLOUD.at).toBe(said('cloud'));
    expect(CLOUD.n).toBeGreaterThanOrEqual(30);
    const t = said('fish!');
    const cloud = BABIES.filter((b) => b.born >= CLOUD.at && b.born < CLOUD.at + 0.3);
    expect(cloud.length).toBe(CLOUD.n);
    for (const b of cloud) {
      const p = babyAt(b, ageOf(b, t)!);
      expect(p.x).toBeGreaterThan(-100);
      expect(p.x).toBeLessThan(1180);
    }
    expect(babiesLabel(t)).toBe(1);
    expect(pouchAt(t)).toBeLessThan(pouchAt(BIRTH_AT));
    // Born: the pouch hangs nearly empty, only a few young left in it.
    for (let u = CLOUD_AT + 0.5; u < 14.5; u += 0.1) expect(pouchAt(u)).toBeLessThan(0.18);
    expect(SNACKS.length).toBe(5);
    for (const s of SNACKS) {
      const when = snackTime(s);
      const c = copepodAt(s, when - 0.5)!;
      expect(c.size).toBe(1);
      const mouth = snoutOf(babyAt(BABIES[s.baby]!, s.at));
      const there = copepodAt(s, when + 1e-6)!;
      expect(Math.hypot(there.x - mouth.x, there.y - mouth.y)).toBeLessThan(2);
      expect(copepodAt(s, when + 0.3)).toBeNull();
    }
  });

  it('every baby is gone off screen before it is born again', () => {
    expect(LIFE).toBeLessThan(LOOP_S);
    for (const b of BABIES) expect(babyGone(babyAt(b, LIFE - 0.01))).toBe(true);
  });

  it('swims every baby out and away from his body, never up across it, and keeps the captions clear', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const dad = dadAt(t);
      for (const b of BABIES) {
        const a = ageOf(b, t);
        if (a === null) continue;
        const p = babyAt(b, a);
        // Never above his belly line while within his length.
        if (Math.abs(p.x - dad.x) < dad.len / 2) expect(p.y).toBeGreaterThan(dad.y + 20);
        if (p.y >= CAPTION_TOP) expect(babyAlpha(p)).toBe(0);
        expect(p.len).toBeLessThan(90);
      }
      for (const s of SNACKS) {
        const c = copepodAt(s, t);
        if (c) expect(c.y).toBeLessThan(CAPTION_TOP - 60);
      }
    }
  });

  it('shows the Father’s Day card on "So happy Father’s Day", gone by the loop point', () => {
    expect(cardAt(said('happy') + 0.3)).toBe(1);
    expect(cardAt(said('because'))).toBe(1);
    expect(cardAt(0)).toBe(0);
    expect(hookLabel(said('because') + 0.3)).toBe(1);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('because');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeLessThan(0.6);
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
    for (const b of BURSTS) expect(b.at).toBeLessThan(LOOP_S);
  });
});
