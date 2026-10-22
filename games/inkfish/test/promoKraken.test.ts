import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { apply, CROWN, SCARS, squidInJaws, WRAPS } from '../dev/promo/kraken/rig';
import { captionAt, LINES, SOUNDS } from '../dev/promo/kraken/script';
import {
  BACK_AT, beamAt, BITE, blowAt, boilAt, BOIL_STEPS, bubblesAt, cameraAt, chompAt, DAYS, daysAt, DEPTH, DIVE_AT, diving, DOWN_AT, EVERY_AT, FACE_AT, FIGHTS_AT,
  FILMED_AT, GIANT_AT, gazeAt, glintAt, IT2_AT, jawAt, KILOMETER_AT, LOOP_S, metresAt, moodAt, NOBODY_AT, onWhale, poolAt, readoutAt, said, scarAt, SCARS_AT,
  shakeAt, skyAt, SPERM_AT, squidFrame, subAt, SWAP, toScreen, type View, WHIP, whaleAt, wrapAt, SUB,
} from '../dev/promo/kraken/story';
import { BODY, EYE as WHALE_EYE, FLUKES } from '../dev/promo/kraken/whale';
import { TEMPO, WORDS } from '../dev/promo/kraken/words';
import { EYE as SQUID_EYE } from '../src/art/squidArt';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
type P = { readonly x: number; readonly y: number };
const dist = (p: P, q: P): number => Math.hypot(q.x - p.x, q.y - p.y);
const wrapT = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
const onScreen = (v: View, p: P, margin = 0): boolean => {
  const q = toScreen(v, p);
  return q.x > -margin && q.x < 1080 + margin && q.y > -margin && q.y < 1920 + margin;
};
/** Points round the whale (its outline, flukes) and the squid (its body, crown, the arms' tips), world px. */
function fightPoints(t: number): P[] {
  const w = whaleAt(t);
  const sq = squidFrame(t);
  return [
    ...[...BODY, ...FLUKES].filter((_, i) => i % 6 === 0).map((p) => onWhale(w, p)),
    ...[-124, 0, 110].map((x) => apply(sq, { x, y: 0 })),
  ];
}
const squidEye = (t: number): P => apply(squidFrame(t), SQUID_EYE);

describe('promo short: the Kraken is real, and this whale eats it (narrated)', () => {
  it('loops: the camera, the whale, the squid, the light and every note are where they started', () => {
    for (const key of ['x', 'y', 'zoom', 'vy'] as const) expect(cameraAt(END)[key]).toBeCloseTo(cameraAt(0)[key], 3);
    const [a, b] = [whaleAt(END), whaleAt(0)];
    for (const key of ['x', 'y', 'tilt', 'wag'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
    expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 4);
    const [s1, s2] = [squidFrame(END), squidFrame(0)];
    for (const key of ['x', 'y', 'angle', 'scale'] as const) expect(s1[key]).toBeCloseTo(s2[key], 3);
    for (const f of [jawAt, wrapAt, poolAt, skyAt, readoutAt, glintAt]) expect(f(END)).toBeCloseTo(f(0), 4);
    for (const key of ['curious', 'tense', 'surprised', 'sarcastic', 'mischievous'] as const) expect(moodAt(END)[key]).toBeCloseTo(moodAt(0)[key], 4);
    for (const s of SCARS) expect(scarAt(s, END)).toBe(scarAt(s, 0));
    expect(dist(gazeAt(END), gazeAt(0))).toBeLessThan(1e-3);
    expect(subAt(END)).toBeNull();
    expect(shakeAt(END)).toEqual(shakeAt(0));
    const [u, v] = [bubblesAt(END), bubblesAt(0)];
    expect(u.length).toBe(v.length);
    // A bubble may start a new rise at the seam, but only where it's invisible (alpha 0 at both ends of its rise).
    u.forEach((p, i) => {
      if (p.alpha > 1e-3 || v[i]!.alpha > 1e-3) expect(dist(p, v[i]!)).toBeLessThan(1);
    });
  });

  it('never jumps: the camera, the whale and the squid move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const [p, q] = [cameraAt(t), cameraAt(t + FRAME)];
      const u = wrapT(t);
      const whip = u > WHIP.from - FRAME && u < WHIP.to + FRAME;
      expect(Math.abs(Math.log(q.zoom / p.zoom))).toBeLessThan(whip ? 0.15 : 0.06);
      // On screen px a frame: the whip pan up to the surface is the fastest thing in it, then the plunge.
      const limit = whip ? 420 : u > DIVE_AT && u < GIANT_AT ? 170 : 70;
      expect(dist(p, q) * p.zoom).toBeLessThan(limit);
      // The whale and the squid on screen, except where the diver takes the fighter's place.
      const swapping = Math.abs(u - SWAP) < FRAME * 1.5 || Math.abs(u + FRAME - SWAP) < FRAME * 1.5 || Math.abs(u - BITE) < FRAME * 1.5;
      if (swapping) continue;
      // Where they're on screen, they never move further than the camera lets them.
      const pairs: [P, P][] = [
        [onWhale(whaleAt(t), { x: 0, y: 0 }), onWhale(whaleAt(t + FRAME), { x: 0, y: 0 })],
        [squidEye(t), squidEye(t + FRAME)],
      ];
      for (const [a, b] of pairs) {
        if (!onScreen(p, a) && !onScreen(q, b)) continue;
        expect(dist(toScreen(p, a), toScreen(q, b))).toBeLessThan(Math.max(limit, 75));
      }
    }
  });

  it('swaps the fighter for the diver while neither is on screen, and the diver reaches the fight just as the jaws shut', () => {
    for (const t of [SWAP - FRAME, SWAP, SWAP + FRAME]) {
      const v = cameraAt(t);
      for (const p of fightPoints(t - 1e-6)) expect(onScreen(v, p, 150)).toBe(false);
      for (const p of fightPoints(t + 1e-6)) expect(onScreen(v, p, 150)).toBe(false);
    }
    expect(diving(SWAP + 1e-3)).toBe(true);
    expect(diving(BITE - 1e-3)).toBe(true);
    expect(diving(BITE + 1e-3)).toBe(false);
    const [a, b] = [whaleAt(BITE - 1e-4), whaleAt(BITE + 1e-4)];
    expect(dist(a, b)).toBeLessThan(2);
    expect(Math.abs(a.tilt - b.tilt)).toBeLessThan(0.01);
    expect(dist(squidEye(BITE - 1e-4), squidEye(BITE + 1e-4))).toBeLessThan(2);
  });

  it('opens on the fight itself: the jaw clamped on the squid, its arms wrapped round the head, its eye wide on screen, no labels', () => {
    const v = cameraAt(0);
    expect(diving(0)).toBe(false);
    expect(jawAt(0)).toBeGreaterThan(0.05);
    expect(wrapAt(0)).toBe(1);
    // The squid's crown of arms is held at the front of the jaws.
    expect(dist(apply(squidInJaws(0), { x: 110, y: 0 }), CROWN)).toBeLessThan(1e-6);
    expect(CROWN.x).toBeLessThan(0);
    expect(CROWN.x).toBeGreaterThan(-200);
    // Its eye, the whale's eye and the front of the head are all in the clear band between the Shorts buttons.
    for (const p of [squidEye(0), onWhale(whaleAt(0), WHALE_EYE), onWhale(whaleAt(0), { x: 0, y: -200 })]) {
      const q = toScreen(v, p);
      expect(q.x).toBeGreaterThan(40);
      expect(q.x).toBeLessThan(1040);
      expect(q.y).toBeGreaterThan(270);
      expect(q.y).toBeLessThan(1150);
    }
    // Arms wrap over the head: most of the near arms' paths are over the case.
    expect(WRAPS.length).toBe(10);
    // Nothing on screen but the fight and the caption.
    for (const f of [readoutAt, skyAt]) expect(f(0)).toBe(0);
    expect(subAt(0)).toBeNull();
    expect(creditAt(0, LOOP_S)).toBe(0);
    expect(blowAt(0)).toBeLessThan(0);
    expect(poolAt(0)).toBe(1);
  });

  it('whips up to the surface for "Sperm whales", dives a kilometre "down", and finds the squid on "giant squid"', () => {
    const top = cameraAt(SPERM_AT + 0.1);
    expect(onScreen(top, { x: 0, y: 0 })).toBe(true);
    expect(Math.abs(whaleAt(SPERM_AT + 0.1).tilt)).toBeLessThan(0.05);
    expect(blowAt(SPERM_AT + 0.3)).toBeGreaterThan(0);
    // Head down by "KILOMETER" .. "down", the readout ticking to 1,000 m.
    expect(whaleAt(DOWN_AT).tilt).toBeLessThan(-1.3);
    expect(readoutAt(KILOMETER_AT + 0.2)).toBe(1);
    expect(metresAt(DOWN_AT + 0.35)).toBe(1000);
    expect(metresAt(KILOMETER_AT - 0.1)).toBe(0);
    expect(cameraAt(DOWN_AT + 0.3).y).toBeGreaterThan(DEPTH / 3);
    // The squid in view on "giant", the jaws wide, then shut on it.
    expect(onScreen(cameraAt(GIANT_AT + 0.3), squidEye(GIANT_AT + 0.3))).toBe(true);
    expect(jawAt(GIANT_AT + 0.6)).toBeGreaterThan(0.2);
    expect(jawAt(BITE + 0.05)).toBeLessThan(0.1);
    expect(chompAt(BITE + 0.1)[0]).toBeGreaterThan(0);
    expect(chompAt(BITE + 0.1)[0]).toBeLessThan(1);
  });

  it('wraps its arms round the head on "fights back", and leaves scars popping up "all over the whale\'s face"', () => {
    expect(wrapAt(FIGHTS_AT - 0.2)).toBe(0);
    expect(wrapAt(BACK_AT + 0.35)).toBe(1);
    expect(moodAt(FIGHTS_AT).tense).toBe(1);
    for (const s of SCARS) {
      expect(scarAt(s, SCARS_AT - 0.1)).toBe(0);
      expect(scarAt(s, FACE_AT + 0.6)).toBe(1);
    }
    expect(SCARS.filter((s) => scarAt(s, SCARS_AT + 0.4) > 0).length).toBeGreaterThan(0);
    expect(SCARS.filter((s) => scarAt(s, SCARS_AT + 0.4) > 0).length).toBeLessThan(SCARS.length);
    expect(SCARS.length).toBeGreaterThan(20);
  });

  it('races the sun and moon over the sea on "EVERY day", while the fight goes on below', () => {
    expect(skyAt(EVERY_AT)).toBe(1);
    expect(daysAt(DAYS.to) - daysAt(DAYS.from)).toBeGreaterThan(2.5);
    expect(diving(EVERY_AT)).toBe(false);
    const v = cameraAt(EVERY_AT);
    expect(onScreen(v, squidEye(EVERY_AT))).toBe(true);
    expect(toScreen(v, squidEye(EVERY_AT)).y).toBeGreaterThan(600);
  });

  it('sweeps the submarine\'s searchlight through the dark on "nobody has ever filmed it", missing the fight', () => {
    expect(subAt(NOBODY_AT)).not.toBeNull();
    expect(subAt(NOBODY_AT + 0.3)!.rec).toBe(1);
    for (let t = SUB.from; t < SUB.to; t += FRAME) {
      const beam = beamAt(t)!;
      if (beam.on < 0.2) continue;
      // The pool of light never lands on the whale's head or the squid.
      for (const p of fightPoints(t)) expect(dist(beam.pool, p)).toBeGreaterThan(280);
      expect(dist(beam.pool, squidEye(t))).toBeGreaterThan(280);
    }
    expect(subAt(FILMED_AT)!.facing).toBe(1);
    expect(subAt(IT2_AT + 0.5)!.facing).toBeLessThan(0);
    expect(gazeAt(FILMED_AT).y).toBeLessThan(-0.4);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('there,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
    expect(said('Kraken')).toBeCloseTo(WORDS[1]!.start / TEMPO, 6);
    expect(() => said('octopus')).toThrow();
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
