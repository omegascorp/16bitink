import { describe, expect, it } from 'vitest';
import { CROWD, hermitPose, leadPose, motherPose, type Pose, walkerPose, walkerX } from '../dev/promo/redcrab/crowd';
import { BRIDGE, GROUND, shoreX, WORLD } from '../dev/promo/redcrab/layout';
import {
  barrierAt, boilAt, BOIL_STEPS, builtAt, cameraAt, captionAt, carAt, counterAt, EGG_PUFFS, eggPuffAt, HOOK_X, HOUSE_CRABS, houseCrabAt, labelAt,
  type LabelId, LINES, LOOP_S, mapAt, moonAt, MOTHERS, motherWalkAt, mothersAt, nightAt, phasesAt, pinAt, rangerAt, said, seaLabelAt, shakeAt, SOUNDS,
  surgeAt,
} from '../dev/promo/redcrab/story';
import { TEMPO, WORDS } from '../dev/promo/redcrab/words';
import { BOIL_FPS } from '../dev/promo/sprites';
import { BOIL } from '../src/art/palette';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const WIDTH = 1080;
const LABELS: readonly LabelId[] = ['redcrab', 'forest', 'coast', 'road', 'garden', 'house', 'rangers', 'bridge', 'moon', 'mothers', 'eggs', 'next'];

const samePose = (a: Pose, b: Pose): void => {
  expect(a.x).toBeCloseTo(b.x, 2);
  expect(a.y).toBeCloseTo(b.y, 2);
  expect(a.scale).toBeCloseTo(b.scale, 3);
  expect(a.alpha).toBeCloseTo(b.alpha, 3);
  expect(a.tilt).toBeCloseTo(b.tilt, 3);
};
const onScreen = (worldX: number, t: number): boolean => worldX - cameraAt(t) > 100 && worldX - cameraAt(t) < WIDTH - 100;

describe('promo short: fifty million crabs march to the sea (narrated)', () => {
  it('loops: the camera, the crowd and every beat are where they were at the start', () => {
    expect(cameraAt(END)).toBeCloseTo(cameraAt(0), 2);
    CROWD.forEach((w, i) => samePose(walkerPose(w, i, END), walkerPose(w, i, 0)));
    samePose(leadPose(END), leadPose(0));
    samePose(hermitPose(END), hermitPose(0));
    MOTHERS.forEach((_, i) => expect(motherPose(i, END).alpha).toBeCloseTo(motherPose(i, 0).alpha, 3));
    for (const f of [counterAt, seaLabelAt, mapAt, nightAt, moonAt, phasesAt, builtAt, mothersAt, shakeAt, surgeAt, barrierAt, rangerAt]) {
      expect(f(END)).toBeCloseTo(f(0), 3);
    }
    for (const id of LABELS) expect(labelAt(id, END)).toBeCloseTo(labelAt(id, 0), 3);
    for (let i = 0; i < HOUSE_CRABS; i++) expect(houseCrabAt(i, END)).toBe(houseCrabAt(i, 0));
    // The car is off the road at both ends, and no cloud of eggs is in the water.
    for (const t of [0, END]) {
      expect(carAt(t) <= 0 || carAt(t) >= 1).toBe(true);
      EGG_PUFFS.forEach((_, i) => expect(eggPuffAt(i, t) <= 0 || eggPuffAt(i, t) >= 1).toBe(true));
    }
  });

  it('never jumps: crabs walk on smoothly frame to frame and across the loop point (only the camera whips)', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      CROWD.forEach((w, i) => {
        const [p, q] = [walkerPose(w, i, a), walkerPose(w, i, b)];
        const step = walkerX(w, b) - walkerX(w, a);
        // Walking right a few px a frame, except where it wraps out of the sea back into the forest (unseen there).
        if (Math.abs(step) < 1000) {
          expect(step).toBeGreaterThan(0);
          expect(step).toBeLessThan(15);
          expect(Math.abs(q.y - p.y)).toBeLessThan(30);
          expect(Math.abs(q.alpha - p.alpha)).toBeLessThan(0.3);
        } else {
          expect(p.alpha).toBeLessThan(0.01);
          expect(q.alpha).toBeLessThan(0.01);
        }
      });
      expect(Math.abs(cameraAt(b) - cameraAt(a))).toBeLessThan(300);
      for (const f of [counterAt, seaLabelAt, mapAt, nightAt, builtAt]) expect(Math.abs(f(b) - f(a))).toBeLessThan(0.25);
    }
  });

  it('opens on the hook: a river of red crabs pouring into the sea under "50,000,000" and "→ sea", already moving', () => {
    expect(cameraAt(0)).toBe(HOOK_X);
    expect(counterAt(0)).toBe(1);
    expect(seaLabelAt(0)).toBe(1);
    expect(mapAt(0)).toBe(0);
    expect(nightAt(0)).toBe(0);
    const shown = CROWD.map((w, i) => walkerPose(w, i, 0)).filter((p) => p.alpha > 0.5 && p.x > 0 && p.x < WIDTH);
    expect(shown.length).toBeGreaterThan(40);
    // The sea is in the frame, and crabs are walking into it.
    expect(shoreX(0.5, surgeAt(0)) - HOOK_X).toBeLessThan(WIDTH * 0.7);
    const wading = CROWD.filter((w) => walkerX(w, 0) > shoreX(w.depth, surgeAt(0)) && walkerX(w, 0) - HOOK_X < WIDTH);
    expect(wading.length).toBeGreaterThan(3);
    expect(walkerX(CROWD[0]!, FRAME) - walkerX(CROWD[0]!, 0)).toBeGreaterThan(1);
    expect(captionAt(0)!.line.words.map((w) => w.text).join(' ')).toBe('FIFTY million crabs');
  });

  it('shows each place as it is named: Christmas Island on the map, the forest, a road, a garden, a house', () => {
    expect(mapAt(said('Every') + 0.3)).toBe(1);
    expect(pinAt(said('Christmas') - 0.15)).toBe(0);
    expect(pinAt(said('Christmas') + 0.2)).toBe(1);
    expect(mapAt(said('red') + 0.1)).toBe(0);
    expect(labelAt('redcrab', said('red') + 0.2)).toBe(1);
    expect(cameraAt(said('forest'))).toBeLessThan(WORLD.forestEnd - WIDTH / 2);
    expect(labelAt('forest', said('forest') + 0.2)).toBe(1);
    expect(labelAt('coast', said('coast,') + 0.2)).toBe(1);
    expect(onScreen(WORLD.roadA, said('roads,', 1))).toBe(true);
    expect(labelAt('road', said('roads,', 1) + 0.2)).toBe(1);
    expect(onScreen((WORLD.garden[0] + WORLD.garden[1]) / 2, said('gardens,'))).toBe(true);
    expect(labelAt('garden', said('gardens,') + 0.2)).toBe(1);
    expect(onScreen(WORLD.house, said('houses.'))).toBe(true);
    expect(houseCrabAt(0, said('even') - 0.05)).toBe(0);
    for (let i = 0; i < HOUSE_CRABS; i++) expect(houseCrabAt(i, said('houses.') + 0.4)).toBe(1);
  });

  it('closes the road on "Rangers close the roads", then raises the crab bridge under the crowd on "built crab BRIDGES"', () => {
    expect(rangerAt(said('Rangers') - 0.25)).toBe(0);
    expect(rangerAt(said('Rangers') + 0.3)).toBe(1);
    expect(barrierAt(said('close') - 0.1)).toBe(0);
    expect(barrierAt(said('close') + 0.35)).toBe(1);
    expect(onScreen(WORLD.roadB, said('close'))).toBe(true);
    expect(builtAt(said('built') - 0.1)).toBe(0);
    expect(builtAt(said('BRIDGES'))).toBe(1);
    expect(onScreen((BRIDGE.up + BRIDGE.down) / 2, said('BRIDGES'))).toBe(true);
    expect(labelAt('bridge', said('BRIDGES'))).toBe(1);
    // Crabs on the deck at the payoff, lifted the bridge's full height.
    const t = said('BRIDGES') + 0.1;
    const onDeck = CROWD.filter((w) => {
      const x = walkerX(w, t);
      return x > BRIDGE.up && x < BRIDGE.down;
    });
    expect(onDeck.length).toBeGreaterThan(10);
    for (const w of onDeck) expect(walkerPose(w, CROWD.indexOf(w), t).y).toBeLessThan(GROUND.near - BRIDGE.height + 1);
    // A car drives under while it fills.
    expect(carAt(said('across.'))).toBeGreaterThan(0);
    expect(carAt(said('across.'))).toBeLessThan(1);
  });

  it('brings night and the moon on "moon", the mothers to the waterline, and their eggs into the waves', () => {
    expect(nightAt(said('moon,'))).toBeGreaterThan(0.6);
    expect(moonAt(said('moon,') + 0.4)).toBe(1);
    expect(phasesAt(said('moon,') + 0.3)).toBe(1);
    MOTHERS.forEach((_, i) => expect(motherWalkAt(i, said('mothers') + 0.3)).toBe(1));
    expect(labelAt('mothers', said('mothers') + 0.2)).toBe(1);
    expect(shakeAt(said('release') + 0.1)).toBe(1);
    expect(EGG_PUFFS.every((p) => p.t >= said('release'))).toBe(true);
    const live = (t: number): number => EGG_PUFFS.filter((_, i) => eggPuffAt(i, t) > 0 && eggPuffAt(i, t) < 1).length;
    expect(live(said('release') - 0.05)).toBe(0);
    expect(live(said('eggs'))).toBeGreaterThan(2);
    expect(labelAt('eggs', said('eggs') + 0.2)).toBe(1);
    // Most of the crowd has gone into the sea under the moon, and it comes back with the day.
    const shown = (t: number): number => CROWD.filter((w, i) => walkerPose(w, i, t).alpha > 0.5).length;
    expect(shown(said('eggs'))).toBeLessThan(shown(0) * 0.2);
    expect(nightAt(said('again:') + 0.2)).toBe(0);
    expect(counterAt(said('again:') + 0.3)).toBe(1);
    expect(labelAt('next', said('Next') + 0.2)).toBe(1);
  });

  it('keeps the crowd out of the caption band and the text inside the safe area', () => {
    for (let t = 0; t < LOOP_S; t += 0.25) {
      CROWD.forEach((w, i) => expect(walkerPose(w, i, t).y).toBeLessThan(1100));
      expect(leadPose(t).y).toBeLessThan(1100);
      MOTHERS.forEach((_, i) => expect(motherPose(i, t).y).toBeLessThan(1100));
    }
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('again:');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.5);
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
    expect(BOIL_STEPS % BOIL).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL).toBe(BOIL - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeGreaterThan(0);
    }
  });
});
