import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import {
  BIRD_AT, boilAt, BOIL_STEPS, FIVE_AT, FORTY_ONE_END, HITS_AT, LOOP_S, MOODS, moodAt, RIGHT_AT, SCIENTISTS_AT, SEA_AT, SKY_AT, SO_AT, SOME_AT, SONGBIRDS_AT,
  TIGER_AT, wrap, YOUNG_AT,
} from '../dev/promo/tigershark/beats';
import { captionAt, chartAt, GRID, LINES, LIT_ORDER, litCount, litTime, ofTotalAt, SOUNDS } from '../dev/promo/tigershark/script';
import { paletteAt } from '../dev/promo/tigershark/sea';
import {
  birdsAt, BOLTS, boltAt, breachAt, cameraAt, circlerAt, floatingFeatherAt, heroAt, heroMouth, hookBirdAt, hookFeatherAt, LANDING, lidAt, littleFishAt, rainAt,
  SNAP_AT, splashesAt, sprayAt, toScreen,
} from '../dev/promo/tigershark/story';
import { TEMPO, WORDS } from '../dev/promo/tigershark/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);
const onScreen = (p: { x: number; y: number }, t: number, margin = 0): boolean => {
  const q = toScreen(cameraAt(t), p);
  return q.x > -margin && q.x < 1080 + margin && q.y > -margin && q.y < 1920 + margin;
};

describe('promo short: tiger sharks eat songbirds that fall into the sea (narrated)', () => {
  it('loops: the lunge, the shark, the bird, the camera, the weather and the colours are where they started', () => {
    expect(breachAt(END)).toBeCloseTo(breachAt(0)!, 3);
    const [a, b] = [heroAt(END)!, heroAt(0)!];
    for (const key of ['x', 'y', 'tilt', 'turn', 'jaw', 'length', 'effort', 'lid'] as const) expect(a.pose[key]).toBeCloseTo(b.pose[key], 2);
    expect(Math.cos(a.pose.beat - b.pose.beat)).toBeCloseTo(1, 4);
    const [p, q] = [hookBirdAt(END)!, hookBirdAt(0)!];
    expect(dist(p, q)).toBeLessThan(0.5);
    expect(p.pose).toBe(q.pose);
    for (const key of ['x', 'y', 'zoom'] as const) expect(cameraAt(END)[key]).toBeCloseTo(cameraAt(0)[key], 3);
    expect(rainAt(END)).toBeCloseTo(rainAt(0), 4);
    for (const bolt of BOLTS) {
      expect(boltAt(END, bolt.t).bolt).toBeCloseTo(boltAt(0, bolt.t).bolt, 2);
      expect(boltAt(END, bolt.t).flash).toBeCloseTo(boltAt(0, bolt.t).flash, 2);
    }
    const [c1, c2] = [paletteAt(END), paletteAt(0)];
    c1.skyTop.forEach((v, i) => expect(v).toBeCloseTo(c2.skyTop[i]!, 3));
    c1.seaTop.forEach((v, i) => expect(v).toBeCloseTo(c2.seaTop[i]!, 3));
    expect(moodAt(END)).toBe(moodAt(0));
    expect(splashesAt(END).map((s) => s.since)).toEqual(splashesAt(0).map((s) => s.since).map((s) => expect.closeTo(s, 2)));
    expect(sprayAt(END).length).toBe(sprayAt(0).length);
    for (const f of [chartAt, lidAt]) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(floatingFeatherAt(END)).toBeNull();
    expect(floatingFeatherAt(0)).toBeNull();
  });

  it('never jumps: the camera, the shark and the bird in the hook move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const [c, d] = [cameraAt(t), cameraAt(t + FRAME)];
      expect(Math.abs(Math.log(d.zoom / c.zoom))).toBeLessThan(0.08);
      expect(dist(c, d) * c.zoom).toBeLessThan(90);
      const [h1, h2] = [heroAt(t), heroAt(t + FRAME)];
      if (h1 && h2) {
        expect(dist(h1.pose, h2.pose) * c.zoom).toBeLessThan(110);
        expect(Math.abs(h2.pose.tilt - h1.pose.tilt)).toBeLessThan(0.2);
        // Only the snap shuts the jaws fast.
        if (Math.abs(wrap(t) - SNAP_AT) > 0.1) expect(Math.abs(h2.pose.jaw - h1.pose.jaw)).toBeLessThan(0.25);
      }
      const [b1, b2] = [hookBirdAt(t), hookBirdAt(t + FRAME)];
      // It drops in fast from above the picture (off screen), then hangs in the slow motion.
      if (b1 && b2 && onScreen(b1, t)) expect(dist(b1, b2) * c.zoom).toBeLessThan(80);
    }
  });

  it('opens on the hook, nothing written but the words: the shark bursting out of the sea, jaws wide, a songbird dropping into them, in a storm, in slow motion', () => {
    for (const t of [0, 0.3]) {
      const hero = heroAt(t)!;
      expect(hero.pose.jaw).toBeGreaterThan(0.9);
      const cam = cameraAt(t);
      // Half and half: the surface across the middle of the screen, the mouth above it, the shark big.
      const surface = toScreen(cam, { x: 0, y: 0 }).y;
      expect(surface).toBeGreaterThan(850);
      expect(surface).toBeLessThan(1150);
      const mouth = toScreen(cam, heroMouth(hero.pose));
      expect(mouth.y).toBeLessThan(surface - 200);
      expect(mouth.y).toBeGreaterThan(450);
      expect(Math.abs(mouth.x - 540)).toBeLessThan(200);
      expect(hero.pose.length * cam.zoom).toBeGreaterThan(900);
      // The bird just over the open jaws, big enough to see.
      const bird = hookBirdAt(t)!;
      const b = toScreen(cam, bird);
      expect(b.y).toBeLessThan(mouth.y);
      expect(dist(b, mouth)).toBeLessThan(330);
      expect(b.y).toBeGreaterThan(330);
      expect(bird.size * cam.zoom).toBeGreaterThan(200);
      expect(rainAt(t)).toBe(1);
      expect(moodAt(t)).toBe('shock');
      // Spray flying.
      expect(sprayAt(t).length).toBeGreaterThan(10);
      expect(splashesAt(t).some((s) => s.since > 0 && s.since < 1)).toBe(true);
      expect(chartAt(t)).toBe(0);
      expect(creditAt(t, LOOP_S)).toBe(0);
    }
    // Slow motion: the lunge's clock crawls through the opening.
    expect(breachAt(1.5)! - breachAt(0)!).toBeLessThan(0.15);
  });

  it('snaps the jaws shut on "SKY!": the bird is gone, a feather drifts, the shark falls back', () => {
    expect(SNAP_AT - SKY_AT).toBeGreaterThan(0);
    expect(SNAP_AT - SKY_AT).toBeLessThan(0.2);
    expect(hookBirdAt(SNAP_AT - 0.1)).not.toBeNull();
    expect(hookBirdAt(SNAP_AT - 0.03)).toBeNull();
    expect(heroAt(SNAP_AT + 0.02)!.pose.jaw).toBeLessThan(0.1);
    expect(hookFeatherAt(SNAP_AT + 0.5)).not.toBeNull();
    // The bird is in the mouth as it shuts.
    const bird = hookBirdAt(SNAP_AT - 0.06)!;
    expect(dist(bird, heroMouth({ ...heroAt(SNAP_AT - 0.06)!.pose, jaw: 1 }))).toBeLessThan(140);
  });

  it('flies a long flock over a sunset sea on "songbirds", then drops one bird onto the waves on "sea."', () => {
    const flock = birdsAt(SONGBIRDS_AT + 0.3).filter((b) => onScreen(b, SONGBIRDS_AT + 0.3));
    expect(flock.length).toBeGreaterThan(30);
    expect(moodAt(SONGBIRDS_AT)).toBe('tender');
    expect(paletteAt(SONGBIRDS_AT).sun).toBe(1);
    expect(rainAt(SONGBIRDS_AT)).toBe(0);
    expect(moodAt(HITS_AT)).toBe('storm');
    expect(boltAt(HITS_AT + 0.05, BOLTS[0].t).bolt).toBe(1);
    expect(rainAt(SOME_AT)).toBe(1);
    const landed = birdsAt(SEA_AT + 0.1).find((b) => b.pose === 'float')!;
    expect(dist(landed, LANDING)).toBeLessThan(15);
    expect(onScreen(landed, SEA_AT + 0.1)).toBe(true);
  });

  it('dips under the bird on "Right below:", and the tiger sharks circle out of the dark on "young tiger sharks"', () => {
    const cam = cameraAt(RIGHT_AT + 0.6);
    expect(toScreen(cam, { x: 0, y: 0 }).y).toBeLessThan(700);
    expect(toScreen(cam, { x: 0, y: 0 }).y).toBeGreaterThan(400);
    expect(moodAt(RIGHT_AT)).toBe('dread');
    expect(circlerAt(1, RIGHT_AT).murk).toBeGreaterThan(0.6);
    for (let i = 0; i < 3; i++) {
      const c = circlerAt(i, TIGER_AT + 0.4);
      expect(c.murk).toBeLessThan(0.2);
      expect(onScreen(c.pose, TIGER_AT + 0.4, 300)).toBe(true);
    }
    expect(birdsAt(YOUNG_AT).some((b) => b.pose === 'float')).toBe(true);
  });

  it('lights up 41 of 105 sharks with a bird inside, the count reaching 41 as "FORTY-ONE" ends, and "of 105" on "a hundred and five"', () => {
    expect(GRID.cols * GRID.rows).toBe(105);
    expect(new Set(LIT_ORDER).size).toBe(41);
    expect(chartAt(SCIENTISTS_AT + 0.3)).toBe(1);
    expect(litCount(SCIENTISTS_AT + 0.2)).toBe(0);
    expect(litCount(FORTY_ONE_END)).toBe(41);
    expect(litCount(FORTY_ONE_END - 0.4)).toBeLessThan(41);
    for (let k = 1; k < 41; k++) expect(litTime(k)).toBeGreaterThan(litTime(k - 1));
    expect(ofTotalAt(FIVE_AT)).toBe(1);
    expect(chartAt(BIRD_AT + 0.4)).toBe(0);
  });

  it('ends cheeky: a smug shark under a floating feather, a little fish passing on "fish…", then it looks up on "So" and lunges into frame 1', () => {
    const t = BIRD_AT + 0.4;
    expect(moodAt(t)).toBe('cheeky');
    expect(heroAt(t)!.pose.lid).toBeGreaterThan(0.5);
    expect(heroAt(t)!.murk).toBe(0);
    expect(floatingFeatherAt(t)!.alpha).toBe(1);
    expect(onScreen(floatingFeatherAt(t)!, t)).toBe(true);
    expect(onScreen(heroAt(t)!.pose, t, 200)).toBe(true);
    const fishT = (WORDS.find((w) => w.text === 'fish…')!.start / TEMPO) + 0.1;
    expect(onScreen(littleFishAt(fishT)!, fishT)).toBe(true);
    expect(breachAt(SO_AT)).not.toBeNull();
    expect(lidAt(SO_AT + 0.4)).toBe(0);
  });

  it('changes mood every sentence, and every sentence has its own sounds', () => {
    expect(new Set(MOODS.map((m) => m.mood)).size).toBe(6);
    for (let i = 1; i < MOODS.length - 1; i++) {
      const from = MOODS[i]!.from;
      const to = MOODS[i + 1]!.from;
      expect(SOUNDS.some((s) => s.t >= from && s.t < to)).toBe(true);
    }
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
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
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('shows the credit after the payoff, never in the hook or at the seam', () => {
    expect(creditAt(10, LOOP_S)).toBeGreaterThan(0);
    expect(creditAt(END, LOOP_S)).toBe(0);
    expect(creditAt(3, LOOP_S)).toBe(0);
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
