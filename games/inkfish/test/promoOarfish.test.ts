import { describe, expect, it } from 'vitest';
import { spineOf, tailOf } from '../dev/promo/oarfish/body';
import {
  ASHORE_AT, beachedAt, BIG_AT, CALM_FROM, cameraAt, captionAt, CHART_FROM, chartOn, crack, DEEP_FROM, deepFishAt, dimension, DIVER_H, diver, DIVE_FROM,
  EIGHT_AT, gauge, LEGEND_AT, legendLabel, LINES, LOOP_S, MATCH_AT, MATCH_INDEX, OAR_LEN, ONE_AT, onScreen, quake, ringed, said, seismograph, SHORE_AT,
  SIGHTINGS, sightingsShown, snowShift, SOUNDS, visitor, washed, waveHeight, wipeAt,
} from '../dev/promo/oarfish/story';
import { TEMPO, WORDS } from '../dev/promo/oarfish/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));
/** Text and labels stay in the band the Shorts buttons leave clear; captions sit at the bottom of it. */
const CAPTION_TOP = 1095;

describe('promo short: the oarfish, "the doomsday fish" (narrated)', () => {
  it('loops: camera, the swimming fish and everything on screen are as they were at the start', () => {
    const [a, b] = [cameraAt(0), cameraAt(END)];
    expect(b.zoom).toBeCloseTo(a.zoom, 3);
    expect(b.x).toBeCloseTo(a.x, 4);
    expect(b.y).toBeCloseTo(a.y, 4);
    const [f0, f1] = [deepFishAt(0), deepFishAt(END)];
    expect(f1.x).toBeCloseTo(f0.x, 5);
    expect(f1.y).toBeCloseTo(f0.y, 5);
    for (const k of ['phase', 'fin', 'crest'] as const) expect(wrap(f1[k] - f0[k])).toBeCloseTo(0, 4);
    const [t0, t1] = [tailOf(spineOf(f0)), tailOf(spineOf(f1))];
    expect(t1.x).toBeCloseTo(t0.x, 4);
    expect(t1.y).toBeCloseTo(t0.y, 4);
    expect(snowShift(END).x).toBeCloseTo(snowShift(0).x, 3);
    expect(snowShift(END).y).toBeCloseTo(snowShift(0).y, 3);
    for (const show of [diver, dimension, gauge, legendLabel, seismograph, visitor, quake, crack, ringed]) {
      expect(show(0)).toBe(0);
      expect(show(END)).toBe(0);
    }
    expect(beachedAt(0)).toBeNull();
    expect(beachedAt(END)).toBeNull();
    expect(waveHeight(0)).toBe(0);
    expect(wipeAt(0)).toBeNull();
    expect(wipeAt(END)).toBeNull();
    expect(chartOn(0) || chartOn(END)).toBe(false);
  });

  it('keeps the camera moving smoothly, through the loop point too', () => {
    const before = cameraAt(END).zoom / cameraAt(END - FRAME).zoom;
    const after = cameraAt(FRAME).zoom / cameraAt(0).zoom;
    expect(Math.abs(before - after)).toBeLessThan(0.01);
    // The head barely moves on screen across the seam.
    const head = (t: number): { x: number; y: number } => onScreen(cameraAt(t), deepFishAt(t));
    const [h0, h1, h2] = [head(END - FRAME), head(0), head(FRAME)];
    expect(Math.hypot(h1.x - h0.x, h1.y - h0.y)).toBeLessThan(6);
    expect(Math.hypot(h2.x - h1.x, h2.y - h1.y)).toBeLessThan(6);
    for (let t = 0; t + FRAME < LOOP_S; t += FRAME) {
      expect(Math.abs(Math.log(cameraAt(t + FRAME).zoom / cameraAt(t).zoom))).toBeLessThan(0.13);
    }
  });

  it('opens close on the head, above the captions, crest and all', () => {
    const cam = cameraAt(0);
    const head = onScreen(cam, deepFishAt(0));
    expect(head.y).toBeGreaterThan(300);
    expect(head.y).toBeLessThan(CAPTION_TOP - 400);
    expect(head.x).toBeGreaterThan(300);
    expect(head.x).toBeLessThan(780);
    // Body depth on screen: a close-up, not a ribbon.
    expect((OAR_LEN / 24) * cam.zoom).toBeGreaterThan(180);
  });

  it('shows all eight metres, with a 1.8 m diver, clear of the captions on "eight metres"', () => {
    expect(OAR_LEN).toBe(8);
    expect(DIVER_H).toBe(1.8);
    for (const t of [EIGHT_AT, said('metres.')]) {
      const cam = cameraAt(t);
      const fish = deepFishAt(t);
      const head = onScreen(cam, fish);
      const tail = onScreen(cam, tailOf(spineOf(fish)));
      expect(head.y).toBeGreaterThan(230);
      expect(tail.y).toBeLessThan(CAPTION_TOP);
      // Hanging upright: nearly all of its length is height.
      expect((tail.y - head.y) / cam.zoom).toBeGreaterThan(7.6);
      expect(diver(t)).toBe(1);
    }
    expect(dimension(EIGHT_AT - 0.4)).toBe(0);
    expect(dimension(said('metres.') + 0.2)).toBe(1);
  });

  it('keeps the spine its full length however it bends', () => {
    for (const t of [0, 3, 7.7]) {
      const spine = spineOf(deepFishAt(t));
      let len = 0;
      for (let i = 1; i < spine.length; i++) len += Math.hypot(spine[i]!.x - spine[i - 1]!.x, spine[i]!.y - spine[i - 1]!.y);
      expect(len).toBeCloseTo(OAR_LEN, 2);
    }
  });

  it('marks the deep, then rises to the shore for the legend', () => {
    expect(gauge(DEEP_FROM + 0.6)).toBe(1);
    expect(cameraAt(DEEP_FROM + 0.6).y).toBeGreaterThan(9);
    expect(cameraAt(LEGEND_AT).y).toBeLessThan(1);
    expect(gauge(SHORE_AT)).toBe(0);
    expect(legendLabel(LEGEND_AT + 0.5)).toBe(1);
  });

  it('washes one ashore before the quake, and shakes the shore on "earthquake" only', () => {
    expect(washed(LEGEND_AT)).toBe(0);
    expect(washed(said('earthquake'))).toBe(1);
    const fish = beachedAt(said('earthquake'))!;
    expect(fish.x).toBeGreaterThan(3);
    expect(fish.limp).toBe(1);
    expect(ASHORE_AT).toBeLessThan(said('earthquake'));
    expect(quake(said('ashore,'))).toBe(0);
    expect(quake(said('coming.'))).toBeGreaterThan(0.3);
    expect(quake(CALM_FROM + 1)).toBe(0);
    expect(seismograph(said('coming.'))).toBe(1);
    expect(seismograph(said("don't"))).toBe(1);
  });

  it('charts 336 sightings and rings the one that matched a big quake', () => {
    expect(SIGHTINGS).toBe(336);
    expect(MATCH_INDEX).toBeLessThan(SIGHTINGS);
    expect(chartOn(said('eighty'))).toBe(true);
    expect(sightingsShown(said('eighty'))).toBe(0);
    expect(sightingsShown(MATCH_AT)).toBe(SIGHTINGS);
    expect(ringed(ONE_AT - 0.1)).toBe(0);
    expect(ringed(BIG_AT)).toBeGreaterThan(0.5);
    expect(chartOn(said('beach,'))).toBe(false);
    // The wave washes the shore away before "But" is done, and the chart away as "So" begins.
    expect(wipeAt(CHART_FROM)).not.toBeNull();
    expect(wipeAt(CALM_FROM)).not.toBeNull();
  });

  it('is calm on the beach for "don\'t panic", and back in the deep by the loop point', () => {
    expect(visitor(said('panic.'))).toBe(1);
    expect(waveHeight(said('panic.'))).toBe(0);
    expect(cameraAt(DIVE_FROM - 0.05).y).toBeLessThan(1);
    expect(cameraAt(LOOP_S - 0.7).y).toBeGreaterThan(9);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('if');
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
    // No line ends on "the".
    for (const l of LINES.slice(0, -1)) expect(l.words[l.words.length - 1]!.text.toLowerCase()).not.toBe('the');
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
