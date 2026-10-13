import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS } from '../dev/promo/parrotfish/cues';
import { plumeAt, PUFFS, sandTopAt } from '../dev/promo/parrotfish/sand';
import { CLOSE, CORAL, CORAL_DOME, groundAt, PALMS, WATER_Y, WIDE } from '../dev/promo/parrotfish/stage';
import {
  alarmAt, BITES, biteShown, boilAt, BOIL_STEPS, cameraAt, chompAt, counterAt, CRUNCHES, FISH_LEN, fishAt, KG_A_YEAR, labelsAt, LOOP_S, mouthAt,
  onFish, palmAt, pileAt, said, sitAt, sweepAt, ventOf, xrayAt,
} from '../dev/promo/parrotfish/story';
import { TEMPO, WORDS } from '../dev/promo/parrotfish/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const frames = (from = 0, to = LOOP_S): number[] => Array.from({ length: Math.round((to - from) / FRAME) }, (_, i) => from + i * FRAME);

describe('promo short: white sand beaches are fish poop (narrated)', () => {
  it('loops: the fish, camera, sunbather, notes, pile and plume are where they started', () => {
    const [a, b] = [fishAt(END), fishAt(0)];
    for (const key of ['x', 'y', 'len', 'face', 'tilt', 'effort', 'jaw'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
    expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
    for (const key of ['zoom', 'cx', 'cy'] as const) expect(cameraAt(END)[key]).toBeCloseTo(cameraAt(0)[key], 5);
    expect(sitAt(END)).toBeCloseTo(sitAt(0), 4);
    expect(alarmAt(END)).toBeCloseTo(alarmAt(0), 3);
    const [la, lb] = [labelsAt(END), labelsAt(0)];
    for (const key of ['you', 'parrotfish', 'maldives', 'poop'] as const) expect(la[key]).toBeCloseTo(lb[key], 4);
    expect(pileAt(END).h).toBeCloseTo(pileAt(0).h, 4);
    expect(counterAt(END).alpha).toBeCloseTo(counterAt(0).alpha, 4);
    expect(xrayAt(END)).toBeCloseTo(xrayAt(0), 4);
    expect(sweepAt(END).across * sweepAt(END).alpha).toBeCloseTo(sweepAt(0).across * sweepAt(0).alpha, 4);
    PALMS.forEach((_, i) => expect(palmAt(i, END)).toBeCloseTo(palmAt(i, 0), 4));
    BITES.forEach((_, i) => expect(biteShown(i, END)).toBeCloseTo(biteShown(i, 0), 4));
    // The plume carries on across the seam: the same grains, a hair apart.
    const [p, q] = [plumeAt(END), plumeAt(0)];
    expect(p.grains.length).toBe(q.grains.length);
    expect(p.clouds.length).toBe(q.clouds.length);
    p.grains.forEach((g, i) => expect(Math.hypot(g.x - q.grains[i]!.x, g.y - q.grains[i]!.y)).toBeLessThan(1));
  });

  it('never jumps: the fish and the camera move on smoothly, frame to frame and across the loop point', () => {
    for (const t of frames(-FRAME)) {
      const [p, q] = [fishAt(t), fishAt(t + FRAME)];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(30);
      expect(Math.abs(q.len - p.len)).toBeLessThan(10);
      expect(Math.abs(q.face - p.face)).toBeLessThan(0.3);
      const [c, d] = [cameraAt((t + LOOP_S) % LOOP_S), cameraAt((t + FRAME) % LOOP_S)];
      expect(Math.abs(Math.log(d.zoom / c.zoom))).toBeLessThan(0.12);
      expect(Math.abs(sitAt(t + FRAME) - sitAt(t))).toBeLessThan(0.25);
    }
  });

  it('keeps the fish in the water: nose, tail and belly between the waterline and the sand', () => {
    for (const t of frames()) {
      const f = fishAt(t);
      // Half its depth at the nose, the belly, the tail stalk and the tail fin's tip, in body lengths.
      for (const [along, half] of [[0.45, 0.08], [0, 0.27], [-0.5, 0.1], [-0.72, 0.16]] as const) {
        const p = onFish(f, along, 0);
        const at = `t=${t.toFixed(2)}, ${along} along`;
        expect(p.y - f.len * half, at).toBeGreaterThan(WATER_Y);
        expect(p.y + f.len * half, at).toBeLessThan(sandTopAt(p.x, t));
      }
    }
  });

  it('opens mid-poop beside the beach, the sunbather sat bolt upright with a "!" and "you" over them', () => {
    const f = fishAt(0);
    expect(f.face).toBe(-1);
    expect(f.len).toBe(FISH_LEN);
    const vent = ventOf(f);
    const { clouds, grains } = plumeAt(0);
    expect(clouds.some((c) => Math.hypot(c.x - vent.x, c.y - vent.y) < 40 && c.alpha > 0.5)).toBe(true);
    expect(grains.length).toBeGreaterThan(40);
    expect(sitAt(0)).toBe(1);
    expect(alarmAt(0)).toBeGreaterThan(0.9);
    expect(labelsAt(0).you).toBe(1);
    expect(cameraAt(0)).toEqual(CLOSE);
  });

  it('bites two chunks out of the coral on "chunks" and "coral", then grinds them in its throat', () => {
    expect(CRUNCHES[0]).toBeGreaterThan(said('chunks'));
    expect(CRUNCHES[1]).toBeGreaterThan(said('coral,'));
    BITES.forEach((b, i) => {
      // The mouth is at the coral's dome when it bites.
      const m = mouthAt(fishAt(b.at));
      const inside = ((m.x - CORAL.x) / CORAL_DOME.rx) ** 2 + ((m.y - CORAL.y) / CORAL_DOME.ry) ** 2;
      expect(inside).toBeLessThan(1.25);
      expect(biteShown(i, b.at - 0.01)).toBe(0);
      expect(biteShown(i, b.at + 0.5)).toBe(1);
      expect(chompAt(i, b.at + 0.05)).toBeGreaterThan(0);
      expect(fishAt(b.at - 0.15).jaw).toBeGreaterThan(0.5);
      expect(fishAt(b.at + 0.06).jaw).toBe(0);
    });
    expect(Math.hypot(BITES[0]!.x - BITES[1]!.x, BITES[0]!.y - BITES[1]!.y)).toBeGreaterThan(20);
    expect(xrayAt(said('grind') + 0.3)).toBe(1);
    expect(xrayAt(said('throats,') + 0.2)).toBe(1);
    expect(xrayAt(said('poop') + 0.2)).toBe(0);
    expect(labelsAt(said('Parrotfish') + 0.3).parrotfish).toBe(1);
  });

  it('poops out sand on "poop out fine white sand", piling up on the seabed', () => {
    const poop = said('poop');
    expect(PUFFS.some((p) => p.at > poop && p.at < poop + 0.15)).toBe(true);
    expect(PUFFS.some((p) => p.at > said('throats,') && p.at < poop)).toBe(false);
    expect(plumeAt(said('sand.')).clouds.length).toBeGreaterThan(5);
    expect(pileAt(said('sand.') + 0.5).h).toBeGreaterThan(20);
  });

  it('grows on "big", and on "hundreds of kilos a year" races the counter Jan to Dec up to 320 kg as the pile grows', () => {
    expect(fishAt(said('big') + 0.5).len).toBeGreaterThan(FISH_LEN * 1.15);
    expect(counterAt(said('hundreds') - 0.1).kg).toBe(0);
    expect(counterAt(said('hundreds')).month).toBe('Jan');
    const done = counterAt(said('year.') + 0.3);
    expect(done).toMatchObject({ kg: KG_A_YEAR, month: 'Dec', alpha: 1 });
    expect(pileAt(said('year.') + 0.4).h).toBeGreaterThan(pileAt(said('hundreds')).h + 80);
    expect(counterAt(said('island') + 0.2).alpha).toBe(0);
  });

  it('pulls back over the whole island on "One island in the Maldives", palms up, most of it marked as poop', () => {
    expect(cameraAt(said('Maldives') + 0.1)).toEqual(WIDE);
    expect(cameraAt(said('One') - 0.15)).toEqual(CLOSE);
    PALMS.forEach((_, i) => expect(palmAt(i, said('Maldives') + 0.3)).toBeCloseTo(1, 2));
    expect(labelsAt(said('Maldives') + 0.3).maldives).toBe(1);
    const swept = sweepAt(said('it.') + 0.15);
    expect(swept.across).toBeCloseTo(0.85, 3);
    expect(swept.alpha).toBe(1);
    expect(labelsAt(said('it.') + 0.2).poop).toBe(1);
    // The pile has spread flat and the bites healed while it was too small to see.
    expect(pileAt(said('it.')).h).toBeLessThan(0.5);
    BITES.forEach((_, i) => expect(biteShown(i, said('it.'))).toBe(0));
  });

  it('comes back in on "So next time you…": "you" over the sunbather, the fish back by the beach', () => {
    expect(cameraAt(said('you'))).toEqual(CLOSE);
    expect(labelsAt(said('you') + 0.3).you).toBe(1);
    expect(fishAt(said('tropical')).face).toBe(1);
    expect(sitAt(said('tropical'))).toBe(0);
    expect(fishAt(said('remember:') + 0.4).face).toBe(-1);
    // Off screen by then: the palms are gone.
    PALMS.forEach((_, i) => expect(palmAt(i, said('remember:'))).toBe(0));
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('remember:');
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
    // The sand stays put where nothing is going on.
    expect(groundAt(-100)).toBeGreaterThan(WATER_Y);
  });
});
