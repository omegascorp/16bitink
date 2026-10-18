import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS } from '../dev/promo/axolotl/script';
import {
  AND_AT, axolotlAt, beatAt, blockyAt, BONES_AT, bonesAt, boilAt, BOIL_STEPS, BRAIN_AT, brainAt, BUD, budGlowAt, BUT_AT, cameraAt, cityAt, CUTER_AT, DAYS,
  ghostLegAt, GONE_END, gradeAt, GROWS_AT, HEART_AT, heartAt, heartsAt, hmphAt, HONESTLY_AT, LAPSE, LEG_AT, legGrowAt, LEGS_AT, legXrayAt, LOOP_S, MEXICO_AT,
  MUSCLES_AT, musclesAt, nightAt, PLACE_AT, PULSE_S, PUPPY_AT, puppyAt, REAL_AT, RESET_AT, said, skyClockAt, sparkleAt, SURFACE_Y, toeAt, TOE_COUNT, TOES_AT,
  toesAt, toScreen, WHAT_AT, WILD_AT, xrayAt, YES_AT,
} from '../dev/promo/axolotl/story';
import { TEMPO, WORDS } from '../dev/promo/axolotl/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

describe('promo short: this animal can grow back its own legs (narrated)', () => {
  it('loops: the axolotl, its bud, the camera, the colour and every overlay are where they started', () => {
    const [a, b] = [axolotlAt(END), axolotlAt(0)];
    for (const key of ['x', 'y', 'tilt', 'alpha', 'scale', 'smile', 'squint', 'droop', 'smug', 'wiggle', 'gills'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
    expect(Math.cos(a.wave)).toBeCloseTo(Math.cos(b.wave), 3);
    for (const key of ['zoom', 'x', 'y'] as const) expect(cameraAt(END)[key]).toBeCloseTo(cameraAt(0)[key], 3);
    for (const key of ['drain', 'dark', 'warm', 'rosy'] as const) expect(gradeAt(END)[key]).toBeCloseTo(gradeAt(0)[key], 4);
    for (const f of [legGrowAt, budGlowAt, sparkleAt, ghostLegAt, legXrayAt, xrayAt, nightAt, hmphAt, heartsAt, cityAt, beatAt]) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(toesAt(END)).toEqual(toesAt(0));
    expect(skyClockAt(END).alpha).toBeCloseTo(skyClockAt(0).alpha, 4);
    // The bud's pulse rings come round a whole number of times.
    expect(Math.abs(Math.round(LOOP_S / PULSE_S) - LOOP_S / PULSE_S)).toBeLessThan(1e-9);
    for (const f of [blockyAt, puppyAt]) {
      expect(f(END)).toBeNull();
      expect(f(0)).toBeNull();
    }
  });

  it('never jumps: the camera and the axolotl move on smoothly, the leg only ever grows (until it is out of sight)', () => {
    for (const t of FRAMES) {
      const [c, d] = [cameraAt(t), cameraAt(t + FRAME)];
      // The fastest moves are the pull back on "Yes," and the zip back in on "Honestly?".
      expect(Math.abs(Math.log(d.zoom / c.zoom))).toBeLessThan(0.1);
      // The centre of the picture moves under a sixth of the screen a frame.
      expect(dist(toScreen(c, d), toScreen(c, c))).toBeLessThan(180);
      const [a, b] = [axolotlAt(t), axolotlAt(t + FRAME)];
      expect(dist(a, b)).toBeLessThan(8);
      const step = legGrowAt(t + FRAME) - legGrowAt(t);
      if (step < 0) {
        // The reset to a bud, only once it has faded from sight.
        expect(axolotlAt(t + FRAME).alpha).toBeLessThan(0.01);
      } else expect(step).toBeLessThan(0.05);
    }
  });

  it('opens on the hook: a small glowing leg bud sprouting with sparkles, no puppy, no blocky one, no night or grey', () => {
    expect(legGrowAt(0)).toBe(BUD);
    expect(BUD).toBeLessThan(0.7);
    expect(toesAt(0).every((s) => s === 0)).toBe(true);
    expect(budGlowAt(0.3)).toBeGreaterThan(0.7);
    expect(sparkleAt(0.3)).toBeGreaterThan(0.7);
    expect(axolotlAt(0.3).alpha).toBe(1);
    // Close: the axolotl's units come out at over 4 px each.
    expect(cameraAt(0.3).zoom).toBeGreaterThan(1.8);
    const g = gradeAt(0.3);
    expect(g.drain).toBe(0);
    expect(g.dark).toBe(0);
    expect(xrayAt(0.3)).toBe(0);
    expect(legXrayAt(0.3)).toBe(0);
    // The surface is far off the top of the picture.
    expect(toScreen(cameraAt(0.3), { x: 0, y: SURFACE_Y }).y).toBeLessThan(-1000);
  });

  it('shines on "LEGS!", and a blocky axolotl pops in on "Yes," as the camera pulls back, and bursts after "real."', () => {
    expect(budGlowAt(LEGS_AT + 0.15)).toBeGreaterThan(budGlowAt(0.3));
    expect(blockyAt(YES_AT - 0.1)).toBeNull();
    expect(blockyAt(YES_AT + 0.4)!.scale).toBeGreaterThan(0.9);
    expect(axolotlAt(YES_AT + 0.5).squint).toBeGreaterThan(0.5);
    expect(cameraAt(YES_AT + 0.6).zoom).toBeLessThan(cameraAt(0).zoom * 0.5);
    expect(blockyAt(REAL_AT + 0.6)!.poof).toBeGreaterThan(0.5);
    expect(blockyAt(REAL_AT + 1)).toBeNull();
  });

  it('outlines the missing leg on "leg", then grows it a step a day through a time-lapse of days and nights', () => {
    expect(ghostLegAt(LEG_AT + 0.3)).toBe(1);
    expect(legGrowAt(LAPSE[0] - 0.01)).toBe(BUD);
    expect(DAYS).toBeGreaterThanOrEqual(3);
    const span = LAPSE[1] - LAPSE[0];
    // Dark at each night, light at each dawn.
    for (let d = 0; d < DAYS; d++) {
      expect(nightAt(LAPSE[0] + ((d + 0.5) / DAYS) * span)).toBeGreaterThan(0.95);
      expect(nightAt(LAPSE[0] + (d / DAYS) * span)).toBeLessThan(0.05);
    }
    expect(skyClockAt(LAPSE[0] + span / 2).alpha).toBe(1);
    expect(legGrowAt(LAPSE[0] + span / 2)).toBeGreaterThan(BUD);
    expect(legGrowAt(GROWS_AT + 0.5)).toBe(1);
  });

  it('shows the bones forming, then the muscles, then pops out the four toes one by one on "TOES!"', () => {
    expect(legXrayAt(BONES_AT + 0.1)).toBe(1);
    expect(bonesAt(BONES_AT - 0.2)).toBe(0);
    expect(bonesAt(BONES_AT + 0.6)).toBe(1);
    expect(musclesAt(MUSCLES_AT - 0.2)).toBe(0);
    expect(musclesAt(MUSCLES_AT + 0.6)).toBe(1);
    expect(toesAt(TOES_AT - 0.1).every((s) => s === 0)).toBe(true);
    expect(TOE_COUNT).toBe(4);
    for (let i = 1; i < TOE_COUNT; i++) {
      // Each toe is out before the next starts.
      expect(toesAt(toeAt(i))[i - 1]).toBeGreaterThan(0.5);
      expect(toesAt(toeAt(i))[i]).toBeCloseTo(0, 6);
    }
    expect(toesAt(TOES_AT + 1).every((s) => Math.abs(s - 1) < 1e-6)).toBe(true);
    // The leg close-up is the closest shot.
    expect(cameraAt(TOES_AT).zoom).toBeGreaterThan(cameraAt(0).zoom);
  });

  it('turns see-through in darker water, mending a glowing heart on "HEART" and then the brain', () => {
    expect(xrayAt(HEART_AT)).toBe(1);
    expect(gradeAt(HEART_AT).dark).toBeGreaterThan(0.4);
    expect(heartAt(HEART_AT - 0.1).mend).toBe(0);
    expect(heartAt(HEART_AT + 0.5).mend).toBe(1);
    expect(heartAt(HEART_AT + 0.4).burst).not.toBeNull();
    expect(brainAt(HEART_AT + 0.4).mend).toBe(0);
    expect(brainAt(BRAIN_AT + 0.5).mend).toBe(1);
    expect(xrayAt(BUT_AT + 0.2)).toBe(0);
  });

  it('drains the colour and pulls back out of the water to the canals and the city, where the one axolotl fades away', () => {
    expect(gradeAt(PLACE_AT).drain).toBeGreaterThan(0.7);
    const wide = cameraAt(WILD_AT + 1);
    expect(wide.zoom).toBeLessThan(0.4);
    // The surface and the boats are in the picture, the bed below it.
    const surface = toScreen(wide, { x: 0, y: SURFACE_Y }).y;
    expect(surface).toBeGreaterThan(300);
    expect(surface).toBeLessThan(800);
    expect(cityAt(MEXICO_AT - 0.4)).toBe(0);
    expect(cityAt(MEXICO_AT + 0.7)).toBe(1);
    expect(axolotlAt(PLACE_AT).droop).toBe(1);
    expect(axolotlAt(PLACE_AT).alpha).toBe(1);
    expect(axolotlAt(GONE_END + 0.2).alpha).toBe(0);
    expect(RESET_AT).toBeLessThan(HONESTLY_AT);
  });

  it('snaps back to colour on "Honestly?", grins on "cuter", and a puppy floats in and looks offended on "puppy."', () => {
    expect(gradeAt(HONESTLY_AT + 0.3).drain).toBe(0);
    expect(gradeAt(HONESTLY_AT + 0.5).rosy).toBe(1);
    expect(axolotlAt(HONESTLY_AT + 0.3).alpha).toBe(1);
    expect(legGrowAt(HONESTLY_AT)).toBe(BUD);
    expect(axolotlAt(CUTER_AT + 0.3).smile).toBeGreaterThan(1.3);
    expect(heartsAt(CUTER_AT + 0.3)).toBe(1);
    expect(puppyAt(said('than') - 0.1)).toBeNull();
    const p = puppyAt(PUPPY_AT)!;
    expect(p.scale).toBeGreaterThan(0.9);
    expect(p.huff).toBe(0);
    expect(puppyAt(PUPPY_AT + 0.35)!.huff).toBe(1);
    expect(hmphAt(PUPPY_AT + 0.4)).toBe(1);
  });

  it('warms back into the opening shot on "And no matter what," as the puppy floats off', () => {
    expect(puppyAt(WHAT_AT)!.y).toBeLessThan(puppyAt(AND_AT)!.y - 300);
    expect(gradeAt(WHAT_AT + 0.2).warm).toBe(1);
    expect(budGlowAt(WHAT_AT + 0.2)).toBeGreaterThan(0.7);
    for (const key of ['zoom', 'x', 'y'] as const) expect(cameraAt(WHAT_AT + 0.2)[key]).toBeCloseTo(cameraAt(0)[key], 3);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('what,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
    expect(said('what,')).toBe(WHAT_AT);
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
      // Quiet under the voice.
      expect(s.gain).toBeLessThanOrEqual(0.3);
    }
    // A ding for each toe, and a sad falling tune when the colour drains.
    expect(SOUNDS.filter((s) => s.id === 'clang' && s.t >= TOES_AT - 0.1 && s.t < TOES_AT + 0.6)).toHaveLength(TOE_COUNT);
    expect(SOUNDS.filter((s) => s.id === 'lose' && Math.abs(s.t - BUT_AT) < 0.1)).toHaveLength(1);
  });
});
