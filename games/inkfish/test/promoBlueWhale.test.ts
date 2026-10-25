import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/bluewhale/script';
import {
  BALANCE_IN, BALANCE_OUT, balanceZoomAt, beamAt, BODY_AT, boilAt, BOIL_STEPS, CALORIES_AT, caloriesAt, CAM0, cameraAt, FOUR_AT, FULL_S, gapeAt, GULP_AT,
  HOOK_SHUT, IT_AT, krillAt, LOOP_S, MORE_AT, NEARLY_AT, ONE_AT, OPENING, OPENS_AT, PARACHUTE_AT, parachuteAt, POUNDS_AT, poundsAt, REWINDS, rewindAt, sceneAt,
  SHUT_S, storyAt, storyRate, swarmShownAt, toScreen, waterDropAt, whaleAt, wrap, balloonAt, SO_AT, WATER_LANDS,
} from '../dev/promo/bluewhale/story';
import { TEMPO, WORDS } from '../dev/promo/bluewhale/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);
const rewinding = (t: number): boolean => rewindAt(t) > 0 || rewindAt(t + FRAME) > 0;

/** Every time-driven value the picture is drawn from, at video time t. */
function snapshot(t: number): Record<string, number> {
  const s = storyAt(t);
  const w = whaleAt(s, t);
  const v = cameraAt(t);
  const p = poundsAt(t);
  const c = caloriesAt(t);
  const drop = waterDropAt(t);
  const krill = krillAt(w, t);
  return {
    story: s, rate: storyRate(t), camX: v.x, camY: v.y, zoom: v.zoom,
    x: w.x, y: w.y, tilt: w.tilt, scale: w.scale, gape: w.gape, balloon: w.balloon, beat: Math.sin(w.beat), stroke: w.stroke, krill: w.krill, squirt: w.squirt,
    krillX: krill.reduce((sum, k) => sum + k.x, 0), krillY: krill.reduce((sum, k) => sum + k.y, 0), swarm: swarmShownAt(t),
    scene: sceneAt(t), rewind: rewindAt(t), parachute: parachuteAt(t), beam: beamAt(t), fall: drop.fall, squash: drop.squash, balanceZoom: balanceZoomAt(t),
    poundsShown: p.shown, pounds: p.value, unit: p.unit, poundsPop: p.pop, calShown: c.shown, calories: c.value, calPop: c.pop, burgers: c.burgers,
    credit: creditAt(wrap(t), LOOP_S), boil: boilAt(t) % BOIL_FRAMES,
  };
}

describe('promo short: this whale\'s mouthful is bigger than its body (narrated)', () => {
  it('loops: every time-driven value at the loop point is where it was at the start', () => {
    const [a, b] = [snapshot(END), snapshot(0)];
    for (const key of Object.keys(b)) {
      if (key === 'boil') continue;
      expect(a[key], key).toBeCloseTo(b[key]!, 3);
    }
    expect(whaleAt(storyAt(END), END).eye).toBe(whaleAt(storyAt(0), 0).eye);
    // The line boil steps on to frame 0 on the next frame.
    expect((a.boil! + 1) % BOIL_FRAMES).toBe(b.boil);
    expect(storyAt(0)).toBe(OPENING);
    for (const key of ['x', 'y', 'zoom'] as const) expect(cameraAt(0)[key]).toBeCloseTo(CAM0[key], 6);
  });

  it('never jumps: frame to frame and across the loop point (allowing for the rewinds and the whip pans)', () => {
    for (const t of FRAMES) {
      const [s0, s1] = [storyAt(t), storyAt(t + FRAME)];
      const back = rewinding(t);
      expect(Math.abs(s1 - s0)).toBeLessThan(back ? 0.6 : 0.12);
      const [v0, v1] = [cameraAt(t), cameraAt(t + FRAME)];
      expect(Math.abs(Math.log(v1.zoom / v0.zoom))).toBeLessThan(0.06);
      expect(dist(v0, v1) * v0.zoom).toBeLessThan(60);
      expect(Math.abs(sceneAt(t + FRAME) - sceneAt(t))).toBeLessThan(0.2);
      expect(Math.abs(rewindAt(t + FRAME) - rewindAt(t))).toBeLessThan(0.4);
      expect(Math.abs(swarmShownAt(t + FRAME) - swarmShownAt(t))).toBeLessThan(0.2);
      if (back) continue;
      const [w0, w1] = [whaleAt(s0, t), whaleAt(s1, t + FRAME)];
      if (sceneAt(t) < 1) {
        expect(dist(toScreen(v0, w0), toScreen(v1, w1))).toBeLessThan(60);
        expect(Math.abs(w1.gape - w0.gape)).toBeLessThan(0.25);
        expect(Math.abs(w1.balloon - w0.balloon)).toBeLessThan(0.2);
        expect(Math.abs(w1.tilt - w0.tilt)).toBeLessThan(0.05);
        const [k0, k1] = [krillAt(w0, t), krillAt(w1, t + FRAME)];
        for (let i = 0; i < k0.length; i += 7) expect(dist(toScreen(v0, k0[i]!), toScreen(v1, k1[i]!))).toBeLessThan(60);
      }
      if (sceneAt(t) > 0 || sceneAt(t + FRAME) > 0) {
        expect(Math.abs(beamAt(t + FRAME) - beamAt(t))).toBeLessThan(0.08);
        expect(Math.abs(balanceZoomAt(t + FRAME) - balanceZoomAt(t))).toBeLessThan(0.01);
      }
      expect(Math.abs(poundsAt(t + FRAME).shown - poundsAt(t).shown)).toBeLessThan(0.4);
      expect(Math.abs(caloriesAt(t + FRAME).shown - caloriesAt(t).shown)).toBeLessThan(0.4);
    }
  });

  it('opens on the gulp alone: jaw wide, the pouch ballooned, krill pouring in, nothing written but the words', () => {
    const s = storyAt(0);
    expect(gapeAt(s)).toBeGreaterThan(0.9);
    expect(balloonAt(s)).toBeGreaterThan(0.9);
    expect(whaleAt(s, 0).krill).toBeGreaterThan(0.5);
    expect(whaleAt(s, 0).eye).toBe('wide');
    expect(sceneAt(0)).toBe(0);
    for (const v of [rewindAt(0), parachuteAt(0), poundsAt(0).shown, caloriesAt(0).shown, creditAt(0, LOOP_S)]) expect(v).toBe(0);
    // The whale's head and the pouch in the frame's clear middle.
    const head = toScreen(CAM0, whaleAt(s, 0));
    expect(head.x).toBeGreaterThan(200);
    expect(head.x).toBeLessThan(900);
    expect(head.y).toBeGreaterThan(400);
    expect(head.y).toBeLessThan(1000);
  });

  it('times each beat to its words', () => {
    // The jaws shut on "body!" in the hook, then rewind to the lunge.
    expect(HOOK_SHUT).toBeGreaterThan(BODY_AT);
    expect(gapeAt(storyAt(HOOK_SHUT + 0.05))).toBeLessThan(0.05);
    expect(rewindAt((REWINDS[0].from + REWINDS[0].to) / 2)).toBe(1);
    expect(storyRate((REWINDS[0].from + REWINDS[0].to) / 2)).toBeLessThan(-1);
    // The jaw drops on "opens", the throat is full on "parachute!", the parachute pops then.
    expect(gapeAt(storyAt(OPENS_AT - 0.05))).toBe(0);
    expect(gapeAt(storyAt(OPENS_AT + 0.9))).toBeGreaterThan(0.9);
    expect(Math.abs(FULL_S - PARACHUTE_AT)).toBeLessThan(0.2);
    expect(parachuteAt(PARACHUTE_AT - 0.2)).toBe(0);
    expect(parachuteAt(PARACHUTE_AT + 0.3)).toBeGreaterThan(0.9);
    // The jaws shut on "One"; the balance is in on "gulp:" and out on "It".
    expect(Math.abs(SHUT_S - ONE_AT)).toBeLessThan(0.15);
    expect(BALANCE_IN.from).toBeLessThan(GULP_AT);
    expect(sceneAt(GULP_AT + 0.4)).toBe(1);
    expect(sceneAt(IT_AT + 0.1)).toBe(0);
    expect(BALANCE_OUT.to).toBeLessThan(IT_AT + 0.15);
    // The water lands on "more" and outweighs the whale.
    expect(Math.abs(WATER_LANDS - MORE_AT)).toBeLessThan(0.2);
    expect(waterDropAt(MORE_AT + 0.1).fall).toBe(1);
    expect(beamAt(MORE_AT + 1.5)).toBeGreaterThan(0.1);
    // ≈ 400,000 lb counts up from "Four" and lands on "POUNDS!".
    expect(poundsAt(FOUR_AT + 0.1).shown).toBe(1);
    expect(poundsAt(POUNDS_AT + 0.05).value).toBe(400000);
    expect(poundsAt(POUNDS_AT - 0.4).value).toBeLessThan(400000);
    expect(poundsAt(POUNDS_AT + 0.3).unit).toBe(1);
    // The water goes out through the baleen while the narrator says so; the krill stay in.
    const squeeze = whaleAt(storyAt(IT_AT + 0.8), IT_AT + 0.8);
    expect(squeeze.squirt).toBe(1);
    expect(squeeze.krill).toBeGreaterThan(0.5);
    expect(squeeze.eye).toBe('happy');
    expect(swarmShownAt(IT_AT + 0.5)).toBe(0);
    // ≈ 450,000 calories by "calories.", the burgers stacked.
    expect(caloriesAt(NEARLY_AT + 0.1).shown).toBe(1);
    expect(caloriesAt(CALORIES_AT + 0.1).value).toBe(450000);
    expect(caloriesAt(CALORIES_AT + 0.1).burgers).toBeCloseTo(9, 5);
    expect(whaleAt(storyAt(CALORIES_AT), CALORIES_AT).eye).toBe('smug');
    // "So yes,": the rewind back into the lunge.
    expect(rewindAt(SO_AT + 0.1)).toBe(1);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
  });

  it('captions every spoken word in short lines, the word being spoken highlighted', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(18);
    }
    for (const [i, w] of WORDS.entries()) {
      const next = WORDS[i + 1];
      for (const t of [w.start / TEMPO + 0.005, next ? (w.start + next.start) / 2 / TEMPO : w.start / TEMPO + 0.1]) {
        const now = captionAt(t)!;
        expect(now.line.words[now.word]).toBe(w);
      }
    }
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('keeps every line of text between y 270 and 1240, even as the numbers pop', () => {
    const maxPop = (f: (t: number) => number): number => Math.max(...FRAMES.map(f));
    const popOf: Record<keyof typeof TEXT, number> = {
      caption: 0,
      pounds: maxPop((t) => poundsAt(t).pop),
      tonnes: maxPop((t) => poundsAt(t).pop),
      calories: maxPop((t) => caloriesAt(t).pop),
      caloriesUnit: maxPop((t) => caloriesAt(t).pop),
    };
    for (const [key, line] of Object.entries(TEXT) as [keyof typeof TEXT, { y: number; size: number }][]) {
      const size = line.size * (1 + popOf[key]);
      // Caveat's caps and ascenders reach ~0.75 of the size above the baseline, descenders ~0.3 below.
      expect(line.y - 0.75 * size, key).toBeGreaterThanOrEqual(270);
      expect(line.y + 0.3 * size, key).toBeLessThanOrEqual(1240);
    }
  });

  it('shows the credit around the payoff, never in the hook or at the seam', () => {
    expect(creditAt(PARACHUTE_AT + 1, LOOP_S)).toBeGreaterThan(0);
    expect(creditAt(2, LOOP_S)).toBe(0);
    expect(creditAt(END, LOOP_S)).toBe(0);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(SOUNDS.length).toBeGreaterThan(20);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeGreaterThan(0);
      expect(s.gain).toBeLessThanOrEqual(0.5);
    }
  });
});
