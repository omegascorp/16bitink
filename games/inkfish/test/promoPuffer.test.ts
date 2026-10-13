import { describe, expect, it } from 'vitest';
import {
  antidoteAt, ATTACKS_AT, beamAt, BLOWS_AT, boilAt, BOIL_STEPS, captionAt, cardAt, CUT_AT, CYANIDE_AT, DEADLIER_AT, DELICACY_AT, FIGURES, figureAt, counterAt,
  inflationAt, knifeAt, LAND_AT, LICENCE_AT, LINES, LOOP_S, MORAY_RECOIL_AT, morayAlarmAt, morayAt, NO_AT, panAt, PEOPLE_AT, plateAt, PETALS, PREDATOR_AT,
  pufferAlarmAt, pufferAt, rockAt, said, scaleShown, SOUNDS, suctionAt, THIRTY_AT, TTX_AT, ttxLabelAt, vialAt, WHEN_AT, type Puffer,
} from '../dev/promo/puffer/story';
import { TEMPO, WORDS } from '../dev/promo/puffer/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;

describe('promo short: one pufferfish can kill thirty people (narrated)', () => {
  it('loops: the ball, the stick figures, the tally and every prop are where they started', () => {
    const [a, b] = [pufferAt(END), pufferAt(0)];
    for (const key of ['x', 'y', 'len', 'inf', 'tilt', 'effort', 'jiggle'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
    expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
    FIGURES.forEach((_, i) => {
      const [p, q] = [figureAt(i, END), figureAt(i, 0)];
      expect(p.scale).toBeCloseTo(q.scale, 3);
      expect(p.alpha).toBeCloseTo(q.alpha, 3);
      expect(p.hop).toBeCloseTo(q.hop, 3);
    });
    expect(counterAt(END)).toEqual(counterAt(0));
    expect(morayAt(END)).toBeNull();
    expect(morayAt(0)).toBeNull();
    expect(vialAt(END)).toBeNull();
    expect(vialAt(0)).toBeNull();
    for (const shown of [rockAt, scaleShown, ttxLabelAt, suctionAt, pufferAlarmAt, morayAlarmAt]) {
      expect(shown(END)).toBeCloseTo(0, 4);
      expect(shown(0)).toBeCloseTo(0, 4);
    }
    for (const t of [0, END]) {
      expect(antidoteAt(t).alpha).toBe(0);
      expect(plateAt(t).alpha).toBe(0);
      expect(cardAt(t).alpha).toBe(0);
      expect(knifeAt(t).alpha).toBe(0);
    }
  });

  it('never jumps: the puffer, the moray and the vial move on smoothly, frame to frame and across the loop point', () => {
    const step = (p: Puffer, q: Puffer): void => {
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(40);
      expect(Math.abs(q.len - p.len)).toBeLessThan(15);
      expect(Math.abs(q.inf - p.inf)).toBeLessThan(0.15);
    };
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [u, v] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      step(pufferAt(u), pufferAt(v));
      const [m, n] = [morayAt(u), morayAt(v)];
      if (m && n) expect(Math.hypot(n.x - m.x, n.y - m.y)).toBeLessThan(80);
      const [p, q] = [vialAt(u), vialAt(v)];
      if (p && q) expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(80);
      if (scaleShown(u) > 0 || scaleShown(v) > 0) expect(Math.abs(beamAt(v) - beamAt(u))).toBeLessThan(0.15);
    }
  });

  it('opens on the puffer blown up into a ball, the thirty people popping up and all there by "people"', () => {
    expect(inflationAt(0)).toBe(1);
    const shown = (t: number): number => FIGURES.filter((_, i) => figureAt(i, t).alpha > 0.99 && figureAt(i, t).scale > 0.5).length;
    expect(shown(0)).toBeGreaterThan(5);
    expect(shown(0)).toBeLessThan(25);
    expect(shown(PEOPLE_AT + 0.1)).toBe(30);
    expect(counterAt(PEOPLE_AT + 0.1).n).toBe(30);
    expect(counterAt(THIRTY_AT).n).toBeGreaterThan(20);
    // Gone once the narrator moves on to the poison.
    expect(shown(TTX_AT)).toBe(0);
  });

  it('deflates for the poison, shows the vial glowing in its belly, and labels it on "tetrodotoxin"', () => {
    expect(inflationAt(TTX_AT)).toBe(0);
    const v = vialAt(TTX_AT + 0.2)!;
    expect(v.inside).toBe(true);
    expect(v.alpha).toBe(1);
    expect(ttxLabelAt(TTX_AT + 0.3)).toBe(1);
  });

  it('drops the vial on the scale on "deadlier", and it outweighs the cyanide', () => {
    expect(beamAt(DEADLIER_AT)).toBeLessThan(0);
    expect(scaleShown(DEADLIER_AT + 0.1)).toBe(1);
    expect(LAND_AT).toBeLessThan(CYANIDE_AT);
    const t = CYANIDE_AT + 0.5;
    expect(beamAt(t)).toBeGreaterThan(0.1);
    expect(panAt(-1, beamAt(t)).y).toBeGreaterThan(panAt(1, beamAt(t)).y);
    const v = vialAt(t)!;
    expect(v.inside).toBe(false);
    expect(v.x).toBeCloseTo(panAt(-1, beamAt(t)).x, 3);
  });

  it('strikes out "antidote" on "no"', () => {
    expect(antidoteAt(NO_AT - 0.05).write).toBeGreaterThan(0.95);
    expect(antidoteAt(NO_AT - 0.05).strike).toBe(0);
    expect(antidoteAt(said('antidote.') + 0.2).strike).toBe(1);
    expect(antidoteAt(said('antidote.') + 0.2).alpha).toBe(1);
  });

  it('lays out the fugu plate by "delicacy", then the licence stamped on "licence" and the knife cutting on "cut"', () => {
    const plate = plateAt(DELICACY_AT + 0.4);
    expect(plate.alpha).toBe(1);
    expect(plate.petal(PETALS - 1)).toBe(1);
    expect(plateAt(said('Japan,')).petal(PETALS - 1)).toBe(0);
    expect(pufferAlarmAt(DELICACY_AT + 0.4)).toBeGreaterThan(0.9);
    expect(cardAt(LICENCE_AT - 0.1).stamp).toBe(-1);
    expect(cardAt(LICENCE_AT + 0.3).stamp).toBe(1);
    expect(knifeAt(said('chefs') + 0.3).alpha).toBe(1);
    const k = knifeAt(CUT_AT + 0.15);
    expect(k.slash).toBeGreaterThan(0);
    expect(k.slash).toBeLessThan(1);
    expect(inflationAt(CUT_AT + 0.45)).toBeGreaterThan(0.15);
  });

  it('has the moray lunge on "attacks", the puffer gulp water and blow up, and the moray recoil', () => {
    expect(morayAt(WHEN_AT - 0.1)).toBeNull();
    expect(rockAt(PREDATOR_AT)).toBe(1);
    const lunge = morayAt(ATTACKS_AT + 0.35)!;
    const peek = morayAt(PREDATOR_AT + 0.35)!;
    expect(lunge.x).toBeGreaterThan(peek.x + 100);
    expect(lunge.jaw).toBeGreaterThan(0.9);
    expect(pufferAlarmAt(ATTACKS_AT + 0.4)).toBeGreaterThan(0.9);
    expect(suctionAt(said('water'))).toBe(1);
    expect(inflationAt(BLOWS_AT)).toBeLessThan(0.25);
    expect(inflationAt(said('ball.'))).toBeGreaterThan(0.95);
    expect(morayAt(MORAY_RECOIL_AT + 0.3)!.x).toBeLessThan(lunge.x - 100);
    expect(morayAlarmAt(said('spiky'))).toBeGreaterThan(0.9);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('because');
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
