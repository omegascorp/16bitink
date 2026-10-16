import { describe, expect, it } from 'vitest';
import {
  brainLabel, captionAt, depthShown, eyeLabel, heaterLit, hookLabel, insetsShown, LINES, muscleLabel, nameLabel, seatShown, seatStruck, SOUNDS, tempText,
  tenShown, thermoShown,
} from '../dev/promo/swordfish/script';
import {
  boilAt, BOIL_STEPS, brainGlowAt, CLOSE_EYE, closeAt, deepAt, depthAt, eyeGlowAt, eyeOf, type Fish, frostAt, HOOK, LOOP_S, muscleGlowAt, preyAt, said,
  shakeAt, shimmerAt, sunkAt, swordfishAt, tempAt, wavesAt,
} from '../dev/promo/swordfish/story';
import { TEMPO, WORDS } from '../dev/promo/swordfish/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'len', 'tilt', 'effort'] as const;

const same = (a: Fish, b: Fish): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
};

const BEATS = [
  hookLabel, nameLabel, depthShown, thermoShown, muscleLabel, eyeLabel, brainLabel, insetsShown, tenShown, seatShown, deepAt, sunkAt, eyeGlowAt, shimmerAt,
  muscleGlowAt, wavesAt, brainGlowAt, frostAt,
];

describe('promo short: this fish has heated eyes (narrated)', () => {
  it('loops: the swordfish, the water and every note are where they were at the start', () => {
    same(swordfishAt(END), swordfishAt(0));
    for (const f of BEATS) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(sunkAt(0)).toBe(0);
    expect(preyAt(0)).toBeNull();
    expect(preyAt(END)).toBeNull();
    expect(shakeAt(0)).toEqual({ x: 0, y: 0 });
    expect(shakeAt(END)).toEqual({ x: 0, y: 0 });
    // The heated seat is gone by the loop point, the hook's label back up.
    expect(seatShown(END)).toBe(0);
    expect(hookLabel(END)).toBe(1);
  });

  it('never jumps: the swordfish and the mackerel move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [p, q] = [swordfishAt(a), swordfishAt(b)];
      // The camera swoops in on the head and out again (the eye moves ~10 px a frame), but never teleports.
      const [e, g] = [eyeOf(p), eyeOf(q)];
      expect(Math.hypot(g.x - e.x, g.y - e.y)).toBeLessThan(30);
      expect(Math.abs(q.len - p.len)).toBeLessThan(80);
      expect(Math.abs(q.tilt - p.tilt)).toBeLessThan(0.02);
      for (const f of [deepAt, eyeGlowAt, shimmerAt, frostAt]) expect(Math.abs(f(b) - f(a))).toBeLessThan(0.2);
      const [m, n] = [preyAt(a), preyAt(b)];
      if (m && n) expect(Math.hypot(n.x - m.x, n.y - m.y)).toBeLessThan(60);
    }
  });

  it('opens on the hook: the swordfish big in frame and swimming, its eye glowing under shimmering heat, "heated eyes" on it', () => {
    const f = swordfishAt(0);
    expect(f.len).toBe(HOOK.len);
    expect(eyeOf(f).x).toBeGreaterThan(600);
    expect(eyeOf(f).x).toBeLessThan(900);
    expect(eyeGlowAt(0)).toBe(1);
    expect(shimmerAt(0)).toBe(1);
    expect(hookLabel(0)).toBe(1);
    expect(deepAt(0)).toBeLessThan(0.2);
    // Moving from the first frame: its tail beating, the fish drifting on.
    expect(Math.abs(swordfishAt(0.3).x - f.x)).toBeGreaterThan(2);
    expect(Math.cos(swordfishAt(0.1).beat - f.beat)).toBeLessThan(0.95);
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(0)!.line.words[0]!.text).toBe('This');
    expect(WORDS[0]!.start / TEMPO).toBeLessThan(0.1);
  });

  it('names it on "Swordfish", then sinks into the cold: 550 m on "deep down", 3 °C and frost on "freezing"', () => {
    expect(nameLabel(said('Swordfish') + 0.2)).toBe(1);
    expect(hookLabel(said('Swordfish') + 0.15)).toBe(0);
    expect(depthShown(said('deep'))).toBeGreaterThan(0.4);
    expect(depthAt(said('deep') - 0.1)).toBe(0);
    expect(depthAt(said('down,') + 0.6)).toBe(550);
    expect(thermoShown(said('water'))).toBe(1);
    expect(tempAt(said('water') - 0.1)).toBeCloseTo(24, 1);
    expect(tempText(said('freezing.') + 0.1)).toBe('3 °C');
    expect(frostAt(said('freezing.') - 0.1)).toBe(0);
    expect(frostAt(said('freezing.') + 0.5)).toBe(1);
    expect(deepAt(said('freezing.'))).toBeGreaterThan(0.9);
    expect(sunkAt(said('freezing.') + 0.3)).toBe(1);
  });

  it('goes in close on the head for "a muscle next to each eye", lighting the heater muscle and labelling it, the eye and the brain on their words', () => {
    expect(closeAt(swordfishAt(said('So') - 0.2).len)).toBe(0);
    const f = swordfishAt(said('muscle') + 0.4);
    expect(closeAt(f.len)).toBe(1);
    expect(Math.hypot(eyeOf(f).x - CLOSE_EYE.x, eyeOf(f).y - CLOSE_EYE.y)).toBeLessThan(20);
    expect(muscleGlowAt(said('muscle') + 0.25)).toBe(1);
    expect(muscleLabel(said('muscle') - 0.1)).toBe(0);
    expect(muscleLabel(said('muscle') + 0.2)).toBe(1);
    expect(eyeLabel(said('eye') - 0.1)).toBe(0);
    expect(eyeLabel(said('eye') + 0.2)).toBe(1);
    expect(heaterLit(said('heater,') - 0.1)).toBe(0);
    expect(heaterLit(said('heater,') + 0.2)).toBe(1);
    expect(wavesAt(said('heater,') + 0.4)).toBe(1);
    // The heater melts the frost.
    expect(frostAt(said('eyes') + 0.6)).toBe(0);
  });

  it('warms the eyes and brain on their words, and climbs the thermometer to "+15 °C" on "fifteen degrees warmer"', () => {
    expect(eyeGlowAt(said('eyes') - 0.1)).toBeLessThan(0.6);
    expect(eyeGlowAt(said('eyes') + 0.3)).toBe(1);
    expect(brainGlowAt(said('brain') - 0.1)).toBe(0);
    expect(brainGlowAt(said('brain') + 0.3)).toBe(1);
    expect(brainLabel(said('brain') + 0.2)).toBe(1);
    expect(tempText(said('fifteen') - 0.1)).toBe('3 °C');
    expect(tempText(said('warmer.'))).toBe('+15 °C');
    expect(thermoShown(said('warmer.'))).toBe(1);
  });

  it('pulls out for "Warm eyes follow fast prey…": a mackerel darts past, cold eye against warm eye, and "×10" lands on "TEN"', () => {
    expect(closeAt(swordfishAt(said('Warm') + 0.1).len)).toBe(0);
    expect(insetsShown(said('Warm') + 0.2)).toBe(1);
    expect(shimmerAt(said('Warm') + 0.3)).toBe(1);
    for (const w of ['fast', 'prey']) {
      const p = preyAt(said(w))!;
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1080);
    }
    expect(tenShown(said('TEN') - 0.05)).toBe(0);
    expect(tenShown(said('TEN') + 0.3)).toBe(1);
    expect(Math.hypot(shakeAt(said('TEN') + 0.02).x, shakeAt(said('TEN') + 0.02).y)).toBeGreaterThan(2);
    expect(insetsShown(said('Forget'))).toBe(0);
  });

  it('pops in the heated seat on "Forget heated…", strikes it out on "seats", and the swordfish is home in the opening pose', () => {
    expect(seatShown(said('Forget') - 0.1)).toBe(0);
    expect(seatShown(said('heated') + 0.1)).toBe(1);
    expect(seatStruck(said('seats.') - 0.05)).toBe(0);
    expect(seatStruck(said('seats.') + 0.15)).toBe(1);
    expect(hookLabel(said('seats.') + 0.25)).toBe(1);
    const f = swordfishAt(said('Forget'));
    expect(f.len).toBeCloseTo(HOOK.len, 0);
    expect(Math.abs(f.y - HOOK.y)).toBeLessThan(20);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('seats.');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeLessThan(0.5);
    // Sped up harder than the usual 1.15 cap: neither of Mark's two takes fits the loop at 1.15 (flagged).
    expect(TEMPO).toBeLessThanOrEqual(1.25);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(18);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop and matching its mood', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    // A big boom as "×10" lands, a warm swell on the heater, an icy ding on "freezing".
    expect(SOUNDS.some((s) => s.id === 'boom' && Math.abs(s.t - said('TEN')) < 0.05)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'grow' && Math.abs(s.t - said('muscle')) < 0.05)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'clang' && Math.abs(s.t - said('freezing.')) < 0.05 && s.pitch > 1.5)).toBe(true);
  });
});
