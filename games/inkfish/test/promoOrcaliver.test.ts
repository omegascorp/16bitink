import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { flipSharkAt, ramOrcaAt } from '../dev/promo/orcaliver/flip';
import { HOOK_FOCUS, orcaHookAt, sharkHookAt, toHookScreen } from '../dev/promo/orcaliver/hook';
import { chargeOrcaAt, limpSharkAt } from '../dev/promo/orcaliver/limp';
import { pickyOrcaAt } from '../dev/promo/orcaliver/picky';
import { type BodyPose, LIVER_NEAR, onBody, ORCA_EYE, ORCA_SNOUT, SHARK_BELLY } from '../dev/promo/orcaliver/pose';
import { captionAt, LINES, liverLabel, placeLabel, quarterLabel, SOUNDS, TEXT, zAges, zAlpha } from '../dev/promo/orcaliver/script';
import {
  ALL_AT, AND_AT, boilAt, boltAt, chargeAt, chargeLevelAt, DOWN_AT, EATERS_AT, ENERGY_AT, ENERGY_END, FAT_AT, flashAt, FLIPPED_AT, glintAt, GREAT_AT, hookInAt, hookJawAt,
  hookZoomAt, LIMP_AT, limpAt, LIVER_AT, liverAt, LOOP_S, MEXICO_AT, ONE_AT, ORCAS_AT, PICKY_AT, POD_AT, QUARTER_AT, ramAt, rollAt, sceneAt, shakeAt, SHARK_AT,
  SHARKS_AT, sniffAt, splitAt, THEN_AT, UPSIDE_AT, WHITES_AT, wrap, YES_AT, YOUNG_AT,
} from '../dev/promo/orcaliver/story';
import { TEMPO, WORDS } from '../dev/promo/orcaliver/words';
import { CUTS_LOCAL, XRAY_SHARK } from '../dev/promo/orcaliver/xray';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);
const samePose = (a: BodyPose, b: BodyPose): void => {
  expect(dist(a, b)).toBeLessThan(0.05);
  expect(a.angle).toBeCloseTo(b.angle, 4);
  expect(a.length).toBe(b.length);
  expect(a.flip).toBe(b.flip);
};
/** Every value a frame draws from that runs on the clock. */
const CLOCKED = [
  hookJawAt, hookZoomAt, hookInAt, glintAt, rollAt, ramAt, limpAt, chargeAt, flashAt, liverAt, splitAt, chargeLevelAt, boltAt, sniffAt,
  placeLabel, liverLabel, quarterLabel, zAlpha,
] as const;
/** The animals' poses, each only checked while its scene is on screen, and how far each may move a frame (the ram is a quick lunge). */
const POSES = [
  { scene: 'hook', at: orcaHookAt, px: 40 }, { scene: 'hook', at: sharkHookAt, px: 40 },
  { scene: 'flip', at: flipSharkAt, px: 40 }, { scene: 'flip', at: ramOrcaAt, px: 70 },
  { scene: 'limp', at: limpSharkAt, px: 40 }, { scene: 'picky', at: pickyOrcaAt, px: 40 },
] as const;
const showing = (t: number, scene: string): boolean => [sceneAt(t), sceneAt(t + FRAME)].some((n) => n.a === scene || n.b === scene);

describe('promo short: orcas only eat one part of a great white (narrated)', () => {
  it('loops: the hook clocks, the animals and every clocked value are where they started', () => {
    const h = 1e-4;
    for (const f of [hookJawAt, hookZoomAt, hookInAt]) {
      expect(f(END)).toBeCloseTo(f(0), 4);
      // Moving at the same rate either side of the loop point.
      const [before, after] = [(f(END) - f(END - h)) / h, (f(h) - f(0)) / h];
      expect(Math.abs(before - after)).toBeLessThan(0.02 * Math.abs(after) + 0.01);
    }
    for (const f of CLOCKED) expect(f(END)).toBeCloseTo(f(0), 4);
    for (const p of POSES) samePose(p.at(END), p.at(0));
    samePose(chargeOrcaAt(END), chargeOrcaAt(0));
    expect(sceneAt(END)).toEqual(sceneAt(0));
    expect(shakeAt(END)).toEqual(shakeAt(0));
    expect(zAges(END).every((a) => a > 0)).toBe(true);
    expect(creditAt(END, LOOP_S)).toBe(creditAt(0, LOOP_S));
  });

  it('never jumps: every value and every animal moves on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const q = t + FRAME;
      // The flash on "LIVER!" is meant to be sudden; everything else eases. The hook's clocks are checked while the hook is on screen.
      const eased = CLOCKED.filter((f) => f !== flashAt && f !== hookJawAt && f !== hookZoomAt && f !== hookInAt);
      for (const f of eased) expect(Math.abs(f(q) - f(t))).toBeLessThan(0.36);
      if (showing(t, 'hook')) {
        expect(Math.abs(hookJawAt(q) - hookJawAt(t))).toBeLessThan(0.05);
        expect(Math.abs(hookZoomAt(q) - hookZoomAt(t))).toBeLessThan(0.01);
        expect(Math.abs(hookInAt(q) - hookInAt(t))).toBeLessThan(10);
      }
      for (const p of POSES) {
        if (!showing(t, p.scene)) continue;
        expect(dist(p.at(t), p.at(q))).toBeLessThan(p.px);
        expect(Math.abs(p.at(q).angle - p.at(t).angle)).toBeLessThan(0.06);
      }
    }
  });

  it('opens on the orca\'s open jaws over a young great white on its back, both big, nothing written but the words', () => {
    expect(sceneAt(0)).toEqual({ a: 'hook', b: null, mix: 0 });
    expect(hookZoomAt(0)).toBe(1);
    expect(hookJawAt(0)).toBeGreaterThan(0.7);
    const shark = sharkHookAt(0);
    const orca = orcaHookAt(0);
    // The shark is on its back (mirrored, heading right), across most of the width, in the middle of the frame.
    expect(shark.flip).toBe(true);
    expect(Math.abs(shark.angle)).toBeLessThan(0.1);
    expect(shark.length).toBeGreaterThan(0.75 * 1080);
    expect(shark.y).toBeGreaterThan(350);
    expect(shark.y).toBeLessThan(1250);
    // The orca is bigger, its eye in frame, its snout just above the shark's belly (on top now).
    expect(orca.length).toBeGreaterThan(2 * shark.length);
    const eye = toHookScreen(onBody(orca, ORCA_EYE), 0);
    expect(eye.x).toBeGreaterThan(100);
    expect(eye.x).toBeLessThan(980);
    expect(eye.y).toBeGreaterThan(350);
    expect(eye.y).toBeLessThan(1250);
    const snout = onBody(orca, ORCA_SNOUT);
    const belly = onBody(shark, SHARK_BELLY);
    expect(snout.y).toBeLessThan(belly.y);
    expect(dist(snout, belly)).toBeLessThan(300);
    expect(dist(HOOK_FOCUS, onBody(orcaHookAt(0), ORCA_EYE))).toBeLessThan(0.01);
    for (const f of [placeLabel, liverLabel, quarterLabel, zAlpha, glintAt, flashAt, liverAt, splitAt, boltAt]) expect(f(0)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('puts each beat on screen as it is said', () => {
    for (const w of [ORCAS_AT, ONE_AT, GREAT_AT]) expect(sceneAt(w).a).toBe('hook');
    expect(glintAt(ONE_AT + 0.25)).toBe(1);
    expect(sceneAt(MEXICO_AT).a).toBe('gulf');
    expect(placeLabel(MEXICO_AT)).toBe(1);
    for (const w of [POD_AT, FLIPPED_AT, YOUNG_AT, WHITES_AT, UPSIDE_AT, DOWN_AT]) expect(sceneAt(w).a).toBe('flip');
    expect(ramAt(FLIPPED_AT + 0.1)).toBe(1);
    expect(rollAt(UPSIDE_AT - 0.45)).toBe(0);
    expect(rollAt(DOWN_AT + 0.1)).toBe(1);
    expect(flipSharkAt(DOWN_AT + 0.1).flip).toBe(true);
    for (const w of [SHARK_AT, LIMP_AT, THEN_AT]) expect(sceneAt(w).a).toBe('limp');
    expect(limpSharkAt(SHARK_AT).flip).toBe(true);
    expect(limpAt(LIMP_AT - 0.1)).toBe(0);
    expect(limpAt(LIMP_AT + 0.4)).toBe(1);
    expect(zAlpha(LIMP_AT + 0.5)).toBe(1);
    expect(chargeAt(THEN_AT - 0.3)).toBe(0);
    expect(chargeAt(LIVER_AT - 0.3)).toBeGreaterThan(0.8);
    expect(flashAt(LIVER_AT)).toBeGreaterThan(0.9);
    expect(sceneAt(LIVER_AT + 0.05).a).toBe('xray');
    expect(liverAt(LIVER_AT + 0.35)).toBe(1);
    expect(liverLabel(LIVER_AT + 0.4)).toBe(1);
    for (const w of [QUARTER_AT, SHARKS_AT]) expect(sceneAt(w).a).toBe('xray');
    expect(splitAt(QUARTER_AT - 0.15)).toBe(0);
    expect(splitAt(QUARTER_AT + 0.35)).toBe(1);
    expect(quarterLabel(QUARTER_AT + 0.2)).toBe(1);
    for (const w of [FAT_AT, ENERGY_AT]) expect(sceneAt(w).a).toBe('energy');
    expect(chargeLevelAt(ALL_AT)).toBe(0);
    expect(chargeLevelAt(ENERGY_END)).toBe(1);
    expect(boltAt(ENERGY_AT + 0.2)).toBe(1);
    for (const w of [PICKY_AT, EATERS_AT]) expect(sceneAt(w).a).toBe('picky');
    expect(sniffAt(EATERS_AT)).toBe(1);
    expect(pickyOrcaAt(EATERS_AT).angle).toBeLessThan(-0.25);
    expect(sceneAt(YES_AT).a).toBe('hook');
    expect(sceneAt(AND_AT).a).toBe('limp');
  });

  it('lights the whole liver inside one of the four pieces', () => {
    const [head, back] = [CUTS_LOCAL[0], CUTS_LOCAL[1]];
    for (const p of LIVER_NEAR) {
      expect(p.x).toBeLessThan(head);
      expect(p.x).toBeGreaterThan(back);
    }
    expect(XRAY_SHARK.flip).toBe(false);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    const tail = LOOP_S - last.end / TEMPO;
    expect(tail).toBeGreaterThan(0.2);
    expect(tail).toBeLessThan(0.5);
  });

  it('captions every spoken word in short lines, the spoken word highlighted', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      if (l.words.length > 1) expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(18);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('keeps every line of text between y 270 and 1250', () => {
    const inside = (y: number, size: number, pop = 1): void => {
      expect(y - 0.8 * size * pop).toBeGreaterThanOrEqual(270);
      expect(y + 0.3 * size * pop).toBeLessThanOrEqual(1250);
    };
    for (const k of ['caption', 'place', 'placeSub', 'liver'] as const) inside(TEXT[k].y, TEXT[k].size);
    inside(TEXT.quarter.y, TEXT.quarter.size, TEXT.quarterPop);
    // The "z"s: the biggest one at the top of its rise.
    inside(TEXT.z.y, TEXT.z.size * 1.06);
    inside(TEXT.z.y - TEXT.zRise, TEXT.z.size * 1.06);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(((LOOP_S * BOIL_FPS) % BOIL_FRAMES)).toBe(0);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(wrap(LOOP_S)).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
