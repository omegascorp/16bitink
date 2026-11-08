import { describe, expect, it } from 'vitest';
import { DOG_UNITS } from '../dev/promo/hagfish/art/dogfish';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/hagfish/script';
import {
  biteAt, boilAt, BOIL_STEPS, cameraAt, cloudAt, countAt, countShowAt, flashAt, gillsAt, gradeAt, HAG_LEN, knotAt, KNOT_ARC, LOOP_S, puffAge, said, SCENE_IDS, sceneAlpha, secondsAt, SHARK_LEN,
  slideAt, stopwatchAt, THRASH, tieAt, viewAt, wrap, zealandAt,
} from '../dev/promo/hagfish/story';
import { TEMPO, WORDS } from '../dev/promo/hagfish/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

describe('promo short: this shark bit a hagfish (narrated)', () => {
  it('loops: every clocked value at the loop point equals its value at the start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [a, b] = [biteAt(0), biteAt(END)];
    for (const k of ['x', 'y', 'len', 'rot'] as const) expect(b.shark[k], k).toBeCloseTo(a.shark[k], 3);
    expect(Math.cos(b.shark.beat - a.shark.beat)).toBeCloseTo(1, 3);
    for (const k of ['bend', 'gape', 'wide', 'flare', 'gel'] as const) expect(b.look[k] ?? 0, k).toBeCloseTo(a.look[k] ?? 0, 3);
    expect(b.held).toBeCloseTo(a.held, 4);
    expect(b.jets).toBeCloseTo(a.jets, 4);
    a.spine.forEach((p, i) => expect(dist(p, b.spine[i]!), `spine ${i}`).toBeLessThan(0.5));
    const [c0, c1] = [cameraAt(0), cameraAt(END)];
    for (const k of ['zoom', 'rot', 'dx', 'dy'] as const) expect(c1[k], k).toBeCloseTo(c0[k], 3);
    expect(dist(c1.pivot, c0.pivot)).toBeLessThan(0.01);
    const [g0, g1] = [gradeAt(0), gradeAt(END)];
    for (const k of ['violet', 'olive', 'cyan', 'warm', 'magenta'] as const) expect(g1[k], k).toBeCloseTo(g0[k], 4);
    for (const id of SCENE_IDS) expect(sceneAlpha(id, END), id).toBeCloseTo(sceneAlpha(id, 0), 4);
    for (const f of [cloudAt, stopwatchAt, viewAt, countShowAt, zealandAt, flashAt]) {
      expect(f(0), f.name).toBeCloseTo(0, 3);
      expect(f(END), f.name).toBeCloseTo(0, 3);
    }
    for (let i = 0; i < 3; i++) expect(Math.cos(2 * Math.PI * (puffAge(END, i) - puffAge(0, i))), `puff ${i}`).toBeCloseTo(1, 3);
    expect(THRASH).toBe(Math.round(THRASH));
  });

  it('never jumps: the bite and the camera move smoothly frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [wrap(t), wrap(t + FRAME)];
      if (sceneAlpha('bite', a) > 0.99 && sceneAlpha('bite', b) > 0.99 && a < 9 && b < 9) {
        expect(dist(biteAt(a).shark, biteAt(b).shark)).toBeLessThan(60);
        expect(dist(biteAt(a).hold, biteAt(b).hold)).toBeLessThan(60);
      }
      expect(Math.abs(cameraAt(a).zoom - cameraAt(b).zoom)).toBeLessThan(0.1);
      for (const id of SCENE_IDS) expect(Math.abs(sceneAlpha(id, b) - sceneAlpha(id, a)), id).toBeLessThan(0.35);
    }
  });

  it('opens on the bite: a small shark, big and close, its jaws round the middle of the hagfish, nothing written', () => {
    expect(sceneAlpha('bite', 0.3)).toBe(1);
    for (const id of SCENE_IDS.filter((x) => x !== 'bite')) expect(sceneAlpha(id, 0.3), id).toBe(0);
    const b = biteAt(0.3);
    expect(b.shark.len).toBe(SHARK_LEN);
    expect(b.shark.len / DOG_UNITS).toBeGreaterThan(3);
    // The hagfish is about half the shark's length, held at its middle by the jaws.
    expect(HAG_LEN / SHARK_LEN).toBeGreaterThan(0.3);
    expect(HAG_LEN / SHARK_LEN).toBeLessThan(0.55);
    expect(b.held).toBe(1);
    expect(b.look.gape).toBeGreaterThan(0.8);
    const mid = b.spine[Math.floor(b.spine.length / 2)]!;
    expect(dist(mid, b.hold)).toBeLessThan(40);
    // It thrashes in an S through the jaws: the head half runs forward and curls up in front of the snout, the tail half curls down below.
    const [head, tail] = [b.spine[0]!, b.spine[b.spine.length - 1]!];
    const front = b.spine.slice(0, Math.floor(b.spine.length / 2));
    expect(Math.max(...front.map((p) => p.x))).toBeGreaterThan(b.hold.x + 150);
    expect(head.x).toBeGreaterThan(b.hold.x);
    expect(head.y).toBeLessThan(b.hold.y - 100);
    expect(tail.y).toBeGreaterThan(b.hold.y + 150);
    expect(b.jets).toBeGreaterThan(0.05);
    expect(stopwatchAt(0.3) + viewAt(0.3) + countShowAt(0.3) + zealandAt(0.3) + cloudAt(0.3)).toBe(0);
    expect(captionAt(0.3)!.line.words.map((w) => w.text).join(' ')).toBe('This shark bit a');
    // The eye is just starting to widen at first (the "uh-oh"), and wide on "REGRETTED".
    expect(biteAt(0.3).look.wide ?? 0).toBeGreaterThan(0.1);
    expect(biteAt(0.3).look.wide ?? 0).toBeLessThan(0.4);
    expect(biteAt(said('REGRETTED') + 0.2).look.wide ?? 0).toBeGreaterThan(0.9);
  });

  it('is alive from the first frame: the shark and the hagfish thrash both ways', () => {
    let [lo, hi, ylo, yhi] = [Infinity, -Infinity, Infinity, -Infinity];
    for (let t = 0; t < 2; t += FRAME) {
      const b = biteAt(t);
      lo = Math.min(lo, b.look.bend ?? 0);
      hi = Math.max(hi, b.look.bend ?? 0);
      ylo = Math.min(ylo, b.spine[0]!.x);
      yhi = Math.max(yhi, b.spine[0]!.x);
    }
    expect(lo).toBeLessThan(-0.05);
    expect(hi).toBeGreaterThan(0.05);
    expect(yhi - ylo).toBeGreaterThan(10);
  });

  it('puts every noun on screen as it is said', () => {
    // "the hagfish shot out SLIME…": the stopwatch (0.4 s), then the cloud.
    expect(sceneAlpha('bite', said('hagfish', 1) + 0.1)).toBe(1);
    expect(stopwatchAt(said('half') + 0.1)).toBeGreaterThan(0.9);
    expect(secondsAt(said('second,') + 0.2)).toBeCloseTo(0.4, 5);
    expect(cloudAt(said('SLIME…') + 0.1)).toBeGreaterThan(0.9);
    expect(cloudAt(said('shot') - 0.3)).toBe(0);
    // "straight into the shark's gills!": the close-up of five slits, filling with slime.
    expect(sceneAlpha('gills', said('shark\'s') + 0.1)).toBe(1);
    expect(sceneAlpha('gills', said('gills!') + 0.1)).toBe(1);
    expect(gillsAt(said('gills!') + 0.1).look.gel ?? 0).toBeGreaterThan(0.9);
    expect(gillsAt(said('gills!') + 0.1).shark.len).toBeGreaterThan(gillsAt(said('straight')).shark.len);
    // Pulled back: the whole head (eye to snout) fits in frame.
    expect(gillsAt(said('gills!') + 0.1).shark.len / 300).toBeLessThan(10);
    // "It gagged, choked… and let go!": the shark convulses, the hagfish drops free.
    expect(sceneAlpha('bite', said('gagged,') + 0.1)).toBe(1);
    expect(biteAt(said('choked…') + 0.2).look.gape ?? 0).toBeGreaterThan(0.95);
    expect(biteAt(said('choked…') + 0.2).look.flare ?? 0).toBeGreaterThan(0.4);
    expect(biteAt(said('gagged,') + 0.5).look.gel ?? 0).toBeGreaterThan(0.9);
    expect(biteAt(said('gagged,') + 0.05).held).toBe(1);
    expect(biteAt(said('go!') + 0.3).held).toBeLessThan(0.05);
    expect(sceneAlpha('bite', said('go!') + 0.3)).toBe(1);
    // "Then the hagfish tied itself in a KNOT to wipe the slime off.": the knot, then the scrape.
    expect(sceneAlpha('knot', said('hagfish', 2) + 0.3)).toBe(1);
    expect(tieAt(said('tied') - 0.1)).toBe(0);
    expect(tieAt(said('KNOT') + 0.2)).toBe(1);
    expect(slideAt(said('wipe'))).toBeGreaterThan(0.1);
    expect(slideAt(said('off.') + 0.2)).toBe(1);
    const [early, late] = [knotAt(said('KNOT') + 0.2), knotAt(said('off.') + 0.1)];
    expect(KNOT_ARC).toBeGreaterThan(500);
    // The slime has been wiped off the head side, and is still on the tail side, when the knot is half way.
    const mid = knotAt(said('slime') + 0.1);
    expect(mid.coat(0.1)).toBeLessThan(0.3);
    expect(mid.coat(0.95)).toBeGreaterThan(0.7);
    expect(early.coat(0.5)).toBeGreaterThan(0.9);
    expect(late.coat(0.5)).toBeLessThan(0.3);
    // The depth runs over and under (a knot crosses itself).
    expect(Math.max(...early.depth)).toBeGreaterThan(0.5);
    expect(Math.min(...early.depth)).toBeLessThan(-0.5);
    // "Cameras caught this fourteen times. And yes,": the viewfinder, 14 ticking up, New Zealand.
    expect(viewAt(said('Cameras') + 0.4)).toBe(1);
    expect(sceneAlpha('bite', said('Cameras') + 0.4)).toBe(1);
    expect(countShowAt(said('fourteen') + 0.1)).toBe(1);
    expect(countAt(said('fourteen') - 0.2)).toBe(0);
    expect(countAt(said('times.') + 0.1)).toBe(14);
    expect(zealandAt(said('times.') + 0.4)).toBe(1);
    expect(viewAt(END)).toBe(0);
  });

  it('shows metric numbers only with their US unit: only 0.4 seconds (no unit needed) and a count of 14', () => {
    expect(Object.keys(TEXT).sort()).toEqual(['caption', 'count', 'countSub', 'rec', 'stopwatch', 'zealand']);
    expect(TEXT.count.y).toBeLessThan(TEXT.countSub.y);
    expect(TEXT.count.size).toBeGreaterThan(TEXT.countSub.size);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeLessThan(0.6);
    expect(TEMPO).toBeLessThanOrEqual(1.15);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(19);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
    for (let t = 0; t < LOOP_S; t += FRAME) expect(captionAt(t), `t=${t}`).not.toBeNull();
  });

  it('keeps every text line inside the area the apps leave clear (y 270 to 1250)', () => {
    for (const [name, line] of Object.entries(TEXT)) {
      expect(line.y, name).toBeGreaterThanOrEqual(270);
      expect(line.y, name).toBeLessThanOrEqual(1250);
      expect(line.y - line.size * 0.72, name).toBeGreaterThanOrEqual(270);
    }
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
