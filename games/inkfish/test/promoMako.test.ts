import { describe, expect, it } from 'vitest';
import {
  BOAT_AT, BOAT2_AT, CUT_AT, FASTEST_AT, GREAT_AT, HOOKED_AT, LEAP_AT, NEW_AT, REMEMBER_AT, SHORTFIN_AT, SIX_AT, TRIP_AT, TWENTY_AT, WATER_AT, YOUR_AT,
} from '../dev/promo/mako/beats';
import { anglerAt, boatAt, CABIN, rodAt } from '../dev/promo/mako/crew';
import { ON_DECK, PX_PER_M, SHARK_LEN, sharkAt, SIX_M_Y } from '../dev/promo/mako/shark';
import {
  boilAt, BOIL_STEPS, cameraAt, captionAt, deckSplashAt, flopMarks, LINES, LOOP_S, makoLabel, placeLabel, rulerAt, said, shakeAt, sharkWorld, SOUNDS, SPLASHES,
  sprayAt, streakAt, thrashMarks, yourBoatLabel,
} from '../dev/promo/mako/story';
import { TEMPO, WORDS } from '../dev/promo/mako/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);
/** Does the step from t to t + FRAME cross the one cut? */
const crossesCut = (t: number): boolean => {
  const u = ((t % LOOP_S) + LOOP_S) % LOOP_S;
  return u < CUT_AT && u + FRAME >= CUT_AT;
};

describe('promo short: this shark can jump INTO your boat (narrated)', () => {
  it('loops: the mako, the camera, the boat, the anglers and the rod are where they started', () => {
    const [a, b] = [sharkWorld(END), sharkWorld(0)];
    for (const key of ['x', 'y', 'tilt', 'turn', 'jaw', 'effort'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
    expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 4);
    for (const key of ['zoom', 'x', 'y'] as const) expect(cameraAt(END)[key]).toBeCloseTo(cameraAt(0)[key], 3);
    for (const key of ['roll', 'heave'] as const) expect(boatAt(END)[key]).toBeCloseTo(boatAt(0)[key], 4);
    for (const who of ['A', 'B'] as const) {
      const [p, q] = [anglerAt(END, who), anglerAt(0, who)];
      expect(p.body.feet).toBeCloseTo(q.body.feet, 3);
      expect(dist(p.body.head, q.body.head)).toBeLessThan(0.01);
      expect(p.alarm).toBeCloseTo(q.alarm, 3);
    }
    expect(rodAt(END).broken).toBe(rodAt(0).broken);
    expect(rodAt(END).swing).toBeCloseTo(rodAt(0).swing, 3);
    expect(sprayAt(END).length).toBe(sprayAt(0).length);
    expect(shakeAt(END)).toEqual(shakeAt(0));
  });

  it('never jumps: the mako, the camera and the boat move on smoothly, except at the one cut', () => {
    for (const t of FRAMES) {
      if (crossesCut(t)) continue;
      const [p, q] = [sharkWorld(t), sharkWorld(t + FRAME)];
      expect(dist(p, q)).toBeLessThan(110);
      // Quickest: the head shakes on the line and the U-turn under the splash.
      expect(Math.abs(q.tilt - p.tilt)).toBeLessThan(0.36);
      // The quickest flip is the U-turn under the splash.
      expect(Math.abs(q.turn - p.turn)).toBeLessThan(0.42);
      const [c, d] = [cameraAt(t), cameraAt(t + FRAME)];
      expect(Math.abs(d.zoom - c.zoom)).toBeLessThan(0.05);
      expect(Math.hypot(d.x - c.x, d.y - c.y)).toBeLessThan(60);
      // The bow slams down hard on each landing; otherwise it barely sways.
      expect(Math.abs(boatAt(t + FRAME).roll - boatAt(t).roll)).toBeLessThan(0.05);
    }
  });

  it('opens on the mako high in the air over the boat, jaws wide, tipping down at it, spray streaming off it, and no labels', () => {
    const s = sharkWorld(0);
    expect(s.y).toBeLessThan(-400);
    expect(s.jaw).toBeGreaterThan(0.9);
    expect(s.turn).toBe(1);
    expect(s.tilt).toBeLessThan(-0.2);
    expect(s.onDeck).toBe(0);
    // Still above its own height over the sea, and heading down for the bow.
    expect(sharkWorld(0.5).y).toBeGreaterThan(s.y - 5);
    expect(sprayAt(0).length).toBeGreaterThan(10);
    expect(yourBoatLabel(0)).toBe(0);
    expect(makoLabel(0)).toBe(0);
    expect(rulerAt(0).shown).toBe(0);
    expect(placeLabel(0)).toBeNull();
  });

  it('points at "your boat" and crashes onto the bow on "boat!": spray, a jolt, the bow dips', () => {
    expect(yourBoatLabel(YOUR_AT + 0.25)).toBe(1);
    for (const at of [BOAT_AT, BOAT2_AT]) {
      expect(sharkAt(at - 0.3).onDeck).toBe(0);
      const s = sharkAt(at + 0.05);
      expect(s.onDeck).toBe(1);
      expect(Math.abs(s.x - ON_DECK.x)).toBeLessThan(10);
      expect(deckSplashAt(at + 0.1)).not.toBeNull();
      expect(Math.hypot(shakeAt(at + 0.05).x, shakeAt(at + 0.05).y)).toBeGreaterThan(3);
      expect(boatAt(at + 0.2).roll).toBeLessThan(-0.02);
    }
  });

  it('dives after it and streaks away under the sea as "the shortfin mako" and "fastest" are said', () => {
    expect(makoLabel(SHORTFIN_AT + 0.3)).toBe(1);
    const s = sharkWorld(FASTEST_AT + 0.2);
    expect(s.y).toBeGreaterThan(150);
    expect(s.turn).toBe(-1);
    expect(streakAt(FASTEST_AT + 0.3)).toBeGreaterThan(0.95);
    expect(cameraAt(FASTEST_AT).y).toBeGreaterThan(150);
    // Faster on "fastest" than before it.
    const speed = (t: number): number => dist(sharkWorld(t), sharkWorld(t + 0.1));
    expect(speed(FASTEST_AT + 0.2)).toBeGreaterThan(speed(FASTEST_AT - 0.6));
  });

  it('bursts out on "leap", up to 6 m, the ruler and "6 m" on "SIX", and falls back on "water."', () => {
    expect(sharkWorld(LEAP_AT - 0.1).y).toBeGreaterThan(0);
    expect(sharkWorld(LEAP_AT + 0.1).y).toBeLessThan(0);
    expect(SIX_M_Y).toBeCloseTo(-6 * PX_PER_M, 6);
    const top = Math.min(...Array.from({ length: 200 }, (_, i) => sharkWorld(LEAP_AT + (i / 200) * 2).y));
    expect(top).toBeCloseTo(SIX_M_Y, 0);
    expect(rulerAt(SIX_AT - 0.2).label).toBe(0);
    expect(rulerAt(SIX_AT + 0.2).label).toBe(1);
    expect(rulerAt(SIX_AT + 0.2).top).toBeCloseTo(SIX_M_Y, 3);
    expect(sharkWorld(WATER_AT + 0.1).y).toBeGreaterThan(0);
    expect(SPLASHES.some((sp) => Math.abs(sp.at - LOOP_S - WATER_AT) < 0.05)).toBe(true);
  });

  it('cuts to New Jersey, 2013: the labels as said, the rod bending on "hooked", the mako thrashing on the line', () => {
    expect(placeLabel(TWENTY_AT + 0.2)!.text).toBe('2013');
    expect(placeLabel(NEW_AT + 0.2)!.text).toBe('New Jersey, 2013');
    expect(rodAt(HOOKED_AT - 0.1).line).toBe(0);
    expect(rodAt(HOOKED_AT + 0.2).line).toBe(1);
    expect(rodAt(HOOKED_AT + 0.2).bend).toBeGreaterThan(0.65);
    expect(rodAt(HOOKED_AT + 0.2).broken).toBe(false);
    expect(sharkWorld(HOOKED_AT + 0.2).y).toBeGreaterThan(100);
    expect(thrashMarks(HOOKED_AT + 0.45)).toBe(1);
  });

  it('lands on their boat: "!" as it leaps, the rod snaps, the anglers scramble to the cabin', () => {
    expect(anglerAt(11.3, 'A').alarm).toBeGreaterThan(0.9);
    expect(anglerAt(11.3, 'B').alarm).toBeGreaterThan(0.9);
    expect(rodAt(BOAT2_AT + 0.05).broken).toBe(true);
    expect(rodAt(BOAT2_AT + 0.05).line).toBeNull();
    expect(anglerAt(BOAT2_AT - 0.3, 'A').body.feet).toBeGreaterThan(anglerAt(GREAT_AT, 'A').body.feet + 20);
  });

  it('"Great fishing trip.": flopping on the deck, the anglers clinging to the cabin, the rod broken', () => {
    for (const t of [GREAT_AT, TRIP_AT]) {
      expect(sharkAt(t).onDeck).toBe(1);
      expect(rodAt(t).broken).toBe(true);
      expect(anglerAt(t, 'A').body.feet - CABIN.back).toBeLessThan(45);
    }
    const hops = Array.from({ length: 60 }, (_, i) => sharkAt(GREAT_AT - 0.4 + i * 0.025).hop);
    expect(Math.max(...hops)).toBeGreaterThan(30);
    expect(flopMarks(GREAT_AT + 0.2)).toBe(1);
  });

  it('"So remember:": slides off the bow and leaps out again on "remember:", into the opening frame', () => {
    expect(sharkAt(REMEMBER_AT - 0.15).y).toBeGreaterThan(0);
    expect(sharkAt(REMEMBER_AT - 0.15).onDeck).toBe(0);
    expect(sharkAt(REMEMBER_AT + 0.25).y).toBeLessThan(-SHARK_LEN * 0.5);
    expect(sharkAt(REMEMBER_AT + 0.25).turn).toBe(1);
    expect(anglerAt(REMEMBER_AT + 0.5, 'A').alarm).toBeGreaterThan(0.9);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('remember:');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
    expect(said('remember:')).toBe(REMEMBER_AT);
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
    expect(LOOP_S % 1.5).toBe(0);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeLessThanOrEqual(0.35);
    }
  });
});
