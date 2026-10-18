import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS } from '../dev/promo/dragon/script';
import { BUNCHES, fanOf, MOUTH } from '../dev/promo/dragon/shape';
import {
  AIR_AT, BLUE_AT, boilAt, BOIL_STEPS, bubbleAt, cameraAt, CAPSULES, CELLS_AT, CHOMPS, dangerAt, DOWN_AT, dragonLabelAt, EATS_AT, eyesAt, FILL_ORDER,
  FINGERTIPS_AT, floatAt, gripAt, GULP_AT, happyAt, insideAt, IT_AT, jawAt, labelTurnAt, litAt, litFrom, LOOP_S, menaceAt, moodAt, moodWeight, mouthAt,
  NOT_AT, onSlug, OFF_AT, pluckedAt, PLUCKS, pluckStart, redFlashAt, reelAt, REEL_TOTAL, BEAD_GAP, riseAt, said, shakeAt, slugAt, slyAt, SMALLER_AT,
  sparksAt, STEALS_AT, STING_AT, STINGERS_AT, storeStart, STORES_AT, SURFACE_Y, SWALLOWS_AT, swallowStart, tentacleAt, THUMB_AT, thumbAt, THUMB_TIP, tipAt,
  trembleAt, UPSIDE_AT, WITHOUT_AT, WORSE_AT, wrap, xrayAt, YES_AT, SO_YES_AT, SO_AT, MANS_AT,
} from '../dev/promo/dragon/story';
import { TEMPO, WORDS } from '../dev/promo/dragon/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);
const allTips = (t: number): number[] => Array.from({ length: BUNCHES }, (_, i) => Array.from({ length: fanOf(i).fingers }, (_, j) => litAt(t, i, j))).flat();

describe('promo short: this tiny slug eats the man o’ war (narrated)', () => {
  it('loops: the slug, its jaws, the tentacle, the float, the camera and every effect are where they started', () => {
    const [a, b] = [slugAt(END), slugAt(0)];
    for (const key of ['x', 'y', 'tilt', 'sx', 'sy'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
    expect(jawAt(END)).toBeCloseTo(jawAt(0), 3);
    for (const key of ['zoom', 'x', 'y'] as const) expect(cameraAt(END)[key]).toBeCloseTo(cameraAt(0)[key], 3);
    const [f, g] = [floatAt(END), floatAt(0)];
    for (const key of ['x', 'y', 'tilt', 'squash'] as const) expect(f[key]).toBeCloseTo(g[key], 3);
    const [te, t0] = [tentacleAt(END), tentacleAt(0)];
    te.lower.forEach((p, i) => expect(dist(p, t0.lower[i]!)).toBeLessThan(0.5));
    // The beads reeled in come round to where they started, a whole number of gaps on.
    expect(REEL_TOTAL % BEAD_GAP).toBe(0);
    expect(reelAt(END) % BEAD_GAP).toBeCloseTo(reelAt(0) % BEAD_GAP, 3);
    for (const fn of [xrayAt, dangerAt, redFlashAt, menaceAt, dragonLabelAt, slyAt, happyAt, trembleAt, gripAt, riseAt]) expect(fn(END)).toBeCloseTo(fn(0), 4);
    expect(eyesAt(END).lid).toBeCloseTo(eyesAt(0).lid, 3);
    expect(allTips(END).every((k) => k === 0)).toBe(true);
    expect(shakeAt(END).x).toBeCloseTo(shakeAt(0).x, 2);
    expect(moodAt(END).to).toBe(moodAt(0).to);
    for (const fn of [thumbAt, bubbleAt]) {
      expect(fn(END)).toBeNull();
      expect(fn(0)).toBeNull();
    }
    expect(pluckedAt(END)).toHaveLength(0);
    expect(insideAt(END)).toHaveLength(0);
  });

  it('never jumps: the camera, the slug and the float move on smoothly; only a chomp snaps the jaws shut', () => {
    let snaps = 0;
    for (const t of FRAMES) {
      const [c, d] = [cameraAt(t), cameraAt(t + FRAME)];
      expect(Math.abs(Math.log(d.zoom / c.zoom))).toBeLessThan(0.07);
      expect(Math.hypot(d.x - c.x, d.y - c.y)).toBeLessThan(45);
      expect(dist(slugAt(t), slugAt(t + FRAME))).toBeLessThan(25);
      expect(Math.abs(slugAt(t + FRAME).tilt - slugAt(t).tilt)).toBeLessThan(0.08);
      expect(dist(floatAt(t), floatAt(t + FRAME))).toBeLessThan(5);
      const step = jawAt(t + FRAME) - jawAt(t);
      if (step < -0.25) snaps++;
      else expect(Math.abs(step)).toBeLessThan(0.25);
    }
    // The chomps (hard on "EATS"), and the gulp shutting on the air.
    expect(snaps).toBeGreaterThanOrEqual(CHOMPS.length);
    expect(snaps).toBeLessThanOrEqual(CHOMPS.length * 2 + 2);
  });

  it('opens on the bite: the slug big in frame, its jaws on a tentacle hanging from the float at the surface, no labels', () => {
    const cam = cameraAt(0.3);
    expect(cam.zoom).toBeGreaterThanOrEqual(1);
    // Most of the screen's width.
    const s = slugAt(0.3);
    const head = onSlug(s, { x: -101, y: 0 });
    const tail = onSlug(s, { x: 105, y: 0 });
    expect((tail.x - head.x) * cam.zoom).toBeGreaterThan(600);
    // Gripping: the tentacle runs from the float's underside into the mouth.
    expect(gripAt(0.3)).toBe(1);
    const ten = tentacleAt(0.3);
    expect(dist(ten.upper[ten.upper.length - 1]!, mouthAt(0.3))).toBeLessThan(20);
    const top = ten.upper[0]!;
    expect(Math.abs(top.y - SURFACE_Y)).toBeLessThan(40);
    expect(Math.abs(floatAt(0.3).y - SURFACE_Y)).toBeLessThan(6);
    // Just under the surface.
    expect(s.y).toBeGreaterThan(SURFACE_Y + 150);
    expect(s.y).toBeLessThan(SURFACE_Y + 350);
    for (const note of [dragonLabelAt, xrayAt, dangerAt, redFlashAt, menaceAt, slyAt, happyAt]) expect(note(0.3)).toBe(0);
    expect(thumbAt(0.3)).toBeNull();
    expect(bubbleAt(0.3)).toBeNull();
    expect(allTips(0.3).every((k) => k === 0)).toBe(true);
    expect(moodAt(0.3).to).toBe('shock');
  });

  it('CHOMPS on "EATS": jaws wide just before, shut just after, with a jolt and the float flinching', () => {
    const big = CHOMPS[1]!;
    expect(Math.abs(big - EATS_AT)).toBeLessThan(0.1);
    expect(jawAt(big - 0.06)).toBeGreaterThan(0.85);
    expect(jawAt(big + 0.03)).toBeLessThan(0.15);
    expect(Math.hypot(shakeAt(big + 0.06).x, shakeAt(big + 0.06).y)).toBeGreaterThan(5);
    expect(floatAt(big + 0.15).squash).not.toBeCloseTo(1, 2);
    // Reeling the tentacle in while it chews.
    expect(reelAt(said('war…'))).toBeGreaterThan(reelAt(0.05) + BEAD_GAP);
  });

  it('steals its stingers on "steals its stingers!": capsules fly off the tentacle into its mouth, and it side-eyes us', () => {
    expect(moodAt(STEALS_AT).to).toBe('cheeky');
    expect(slyAt(STEALS_AT + 0.3)).toBe(1);
    expect(eyesAt(STEALS_AT + 0.3).slant).toBeGreaterThan(0.9);
    expect(pluckedAt(STEALS_AT + 0.1).length).toBeGreaterThan(0);
    for (let i = 0; i < PLUCKS; i++) {
      const a = pluckedAt(pluckStart(i) + 0.02).find((c) => c.alpha < 0.5)!;
      expect(a).toBeDefined();
    }
    // Every one ends at the mouth, before "stingers!" is over.
    expect(pluckStart(PLUCKS - 1) + 0.42).toBeLessThan(STINGERS_AT + 0.75);
    const last = pluckedAt(pluckStart(PLUCKS - 1) + 0.41).at(-1)!;
    expect(dist(last, mouthAt(pluckStart(PLUCKS - 1) + 0.41))).toBeLessThan(15);
    expect(jawAt(STINGERS_AT)).toBeGreaterThan(0.35);
    // Closer than the opening, on the head.
    expect(cameraAt(STINGERS_AT).zoom).toBeGreaterThan(1.4);
  });

  it('floats in sunlit water, "blue dragon" turning upside down on "upside down", then gulps a bubble of air at the surface', () => {
    expect(moodAt(BLUE_AT).to).toBe('calm');
    expect(cameraAt(UPSIDE_AT).zoom).toBeLessThan(0.7);
    expect(dragonLabelAt(BLUE_AT + 0.3)).toBe(1);
    expect(labelTurnAt(UPSIDE_AT - 0.05)).toBe(0);
    expect(labelTurnAt(DOWN_AT + 0.25)).toBeCloseTo(Math.PI, 5);
    // It lets go of the tentacle and its mouth reaches the surface as it gulps.
    expect(gripAt(GULP_AT)).toBe(0);
    expect(Math.abs(mouthAt(GULP_AT).y - SURFACE_Y)).toBeLessThan(25);
    const at = bubbleAt(GULP_AT)!;
    expect(at.inside).toBe(false);
    expect(Math.abs(at.y - SURFACE_Y)).toBeLessThan(80);
    const belly = bubbleAt(AIR_AT + 0.4)!;
    expect(belly.inside).toBe(true);
    expect(belly.x).toBeGreaterThan(MOUTH.x + 30);
    expect(jawAt(GULP_AT - 0.02)).toBeGreaterThan(0.7);
    // Back at the tentacle for the next sentence.
    expect(gripAt(IT_AT + 0.4)).toBe(1);
    expect(riseAt(IT_AT + 0.3)).toBe(0);
  });

  it('turns see-through on "It swallows the stinging cells": the capsules slide down its gut unfired, trembling on "WITHOUT"', () => {
    expect(moodAt(SWALLOWS_AT).to).toBe('tension');
    expect(xrayAt(CELLS_AT)).toBe(1);
    const inside = insideAt(CELLS_AT);
    expect(inside.length).toBeGreaterThan(0);
    expect(insideAt(SWALLOWS_AT - 0.2)).toHaveLength(0);
    // Down the gut, mouth to stomach.
    const early = insideAt(swallowStart(0) + 0.2)[0]!;
    const late = insideAt(swallowStart(0) + 1.1)[0]!;
    expect(late.x).toBeGreaterThan(early.x + 30);
    expect(trembleAt(WITHOUT_AT + 0.3)).toBe(1);
    expect(trembleAt(CELLS_AT)).toBe(0);
    // All swallowed before they are stored.
    for (let i = 0; i < CAPSULES; i++) expect(swallowStart(i) + 1.25).toBeLessThan(storeStart(i));
    expect(cameraAt(OFF_AT).zoom).toBeGreaterThan(1.2);
  });

  it('stores them in its fingertips: one bunch after another lights up, front to back, by the end of "fingertips."', () => {
    expect(moodAt(STORES_AT).to).toBe('dramatic');
    expect(allTips(STORES_AT - 0.1).every((k) => k === 0)).toBe(true);
    for (let k = 1; k < FILL_ORDER.length; k++) expect(litFrom(FILL_ORDER[k]!)).toBeGreaterThan(litFrom(FILL_ORDER[k - 1]!));
    const done = FINGERTIPS_AT + 0.6;
    expect(allTips(done).every((k) => k === 1)).toBe(true);
    // A capsule glows on its way out to each bunch.
    expect(insideAt(storeStart(0) + 0.2).some((c) => c.glow > 0)).toBe(true);
    // The tips are at the ends of the fingers, out beyond the body.
    expect(dist(tipAt(done, 0, 0), slugAt(done))).toBeGreaterThan(150);
    expect(xrayAt(FINGERTIPS_AT + 0.8)).toBe(0);
  });

  it('turns to danger on "So its sting can be even WORSE": red, sparks on "sting", a red flash and a jolt on "WORSE", the float beside it', () => {
    expect(moodAt(SO_AT + 0.5).to).toBe('danger');
    expect(dangerAt(STING_AT)).toBe(1);
    expect(sparksAt(STING_AT + 0.1)).not.toBeNull();
    expect(sparksAt(STING_AT - 0.05)).toBeNull();
    expect(redFlashAt(WORSE_AT + 0.05)).toBeGreaterThan(0.3);
    expect(Math.hypot(shakeAt(WORSE_AT + 0.05).x, shakeAt(WORSE_AT + 0.05).y)).toBeGreaterThan(5);
    expect(menaceAt(WORSE_AT)).toBe(1);
    expect(eyesAt(WORSE_AT).slant).toBeLessThan(-0.5);
    expect(slugAt(WORSE_AT + 0.2).sx).toBeGreaterThan(1.05);
    // Punched in on "WORSE", and the man o' war's float in the picture on "man o' war's".
    expect(cameraAt(WORSE_AT + 0.25).zoom).toBeGreaterThan(cameraAt(STING_AT + 0.2).zoom);
    const cam = cameraAt(MANS_AT);
    const f = floatAt(MANS_AT);
    const onScreen = (f.y - cam.y) * cam.zoom + 800;
    expect(onScreen).toBeGreaterThan(270);
    expect(onScreen).toBeLessThan(1250);
    expect(allTips(WORSE_AT).every((k) => k === 1)).toBe(true);
  });

  it('laughs on "Not bad for something smaller than your thumb.": the thumb slides in under it, boing on "thumb"', () => {
    expect(moodAt(NOT_AT + 0.5).to).toBe('laugh');
    expect(dangerAt(NOT_AT + 0.5)).toBe(0);
    expect(thumbAt(NOT_AT)).toBeNull();
    const th = thumbAt(SMALLER_AT + 0.3)!;
    expect(dist(th, THUMB_TIP)).toBeLessThan(2);
    expect(happyAt(THUMB_AT)).toBe(1);
    // About twice the slug's length? It runs off the screen; its tip is level with the slug's head, just below it.
    const s = slugAt(SMALLER_AT + 0.3);
    expect(Math.abs(th.x - onSlug(s, { x: -101, y: 0 }).x)).toBeLessThan(40);
    expect(th.y).toBeGreaterThan(s.y + 300);
    // Boing: the slug squashes as the thumb nudges it.
    expect(Math.abs(slugAt(THUMB_AT + 0.12).sy - 1)).toBeGreaterThan(0.05);
    expect(allTips(NOT_AT + 0.8).every((k) => k === 0)).toBe(true);
    expect(thumbAt(YES_AT + 0.4)).toBeNull();
  });

  it('bites the tentacle again on "So yes," back in close, into the opening frame', () => {
    expect(gripAt(SO_YES_AT)).toBe(1);
    expect(moodWeight(YES_AT + 0.5, 'shock')).toBe(1);
    expect(cameraAt(YES_AT + 0.4).zoom).toBeCloseTo(cameraAt(0).zoom, 3);
    const last = CHOMPS[CHOMPS.length - 1]!;
    expect(last).toBeGreaterThan(SO_YES_AT);
    expect(jawAt(last - 0.06)).toBeGreaterThan(0.6);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
    expect(said('yes,')).toBe(YES_AT);
  });

  it('changes mood on every sentence, never the same mood twice in a row', () => {
    const sentences = ['This', 'and', 'The', 'It', 'stores', 'So', 'Not', 'yes,'];
    const moods = sentences.map((w) => moodAt(said(w) + 0.5).to);
    for (let i = 1; i < moods.length - 1; i++) expect(moods[i]).not.toBe(moods[i - 1]);
    expect(new Set(moods).size).toBe(7);
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
    expect(LOOP_S % 1.5).toBe(0);
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    // The big chomp on "EATS", a pluck for every stinger, a boom on "WORSE", a boing on "thumb".
    expect(SOUNDS.filter((s) => s.id === 'eatBig' && Math.abs(s.t - EATS_AT) < 0.15)).toHaveLength(1);
    expect(SOUNDS.filter((s) => s.id === 'drop' && s.t > STEALS_AT - 0.3 && s.t < STINGERS_AT + 0.6)).toHaveLength(PLUCKS);
    expect(SOUNDS.filter((s) => s.id === 'boom' && Math.abs(s.t - WORSE_AT) < 0.1)).toHaveLength(1);
    expect(SOUNDS.filter((s) => s.id === 'free' && Math.abs(s.t - THUMB_AT) < 0.3).length).toBeGreaterThanOrEqual(1);
    // Ticking through the tension.
    expect(SOUNDS.filter((s) => s.id === 'click' && s.t > IT_AT - 0.01 && s.t < OFF_AT + 0.4).length).toBeGreaterThan(6);
    expect(wrap(LOOP_S + 1)).toBeCloseTo(1, 6);
  });
});
