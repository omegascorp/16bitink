import { describe, expect, it } from 'vitest';
import {
  ABOVE_AT, BOIL_STEPS, boilAt, BURST_AT, FINS_AT, GET_AT, KEEP_AT, LOOP_S, MAHI_AT, METRES_AT, RECORD_AT, SEABIRDS_AT, SECONDS_END, SPREAD_AT, TAILS_AT, TV_AT,
  WATER_AT, WINGS_AT, YEAR_AT,
} from '../dev/promo/flyingfish/beats';
import { BREACHES, CAMERA, DIVES, fishAt, FISH_SPLASHES, FLICKS, PERIOD, screenX, SURFACE_Y } from '../dev/promo/flyingfish/flight';
import { ferryAt, gannetAt, mahiAt, PLUNGE_AT } from '../dev/promo/flyingfish/hunters';
import {
  alarmAt, badgeAt, captionAt, finsNoteAt, LINES, metresAt, recAt, rulerAt, SOUNDS, stopwatchAt, wingGlowAt,
} from '../dev/promo/flyingfish/story';
import { TEMPO, WORDS } from '../dev/promo/flyingfish/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;

describe('promo short: this fish flew for forty-five seconds (narrated)', () => {
  it('loops: the fish, the camera, the hunters and the notes are where they began', () => {
    const [a, b] = [fishAt(END), fishAt(0)];
    for (const key of ['x', 'y', 'tilt', 'effort', 'fold', 'length'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
    expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
    // The camera travels a whole number of wave periods a loop, at the same speed.
    expect(CAMERA.perLoop % PERIOD).toBe(0);
    expect(CAMERA.at(LOOP_S) - CAMERA.at(0)).toBeCloseTo(CAMERA.perLoop, 3);
    expect(CAMERA.rate(END)).toBeCloseTo(CAMERA.rate(0), 2);
    // Left behind across the loop point: the mahi and the gannet go on moving smoothly.
    for (const at of [mahiAt, gannetAt] as const) {
      const [p, q] = [at(END)!, at(0)!];
      expect(p).not.toBeNull();
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(1);
    }
    expect(ferryAt(0)).toBeNull();
    expect(ferryAt(END)).toBeNull();
    const [w0, w1] = [stopwatchAt(0), stopwatchAt(END)];
    expect(w1.seconds).toBe(0);
    expect(w0.seconds).toBeCloseTo(0, 5);
    expect(w1.alpha).toBeCloseTo(w0.alpha, 3);
    for (const note of [rulerAt, recAt, wingGlowAt, alarmAt] as const) expect(note(END)).toBeCloseTo(note(0), 3);
    expect(badgeAt(END).alpha).toBeCloseTo(badgeAt(0).alpha, 3);
  });

  it('never jumps: the fish, the hunters and the ferry move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [u, v] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [p, q] = [fishAt(u), fishAt(v)];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(25);
      expect(Math.abs(q.tilt - p.tilt)).toBeLessThan(0.2);
      expect(Math.abs(q.fold - p.fold)).toBeLessThan(0.25);
      for (const at of [mahiAt, gannetAt, ferryAt] as const) {
        const [m, n] = [at(u), at(v)];
        if (m && n) expect(Math.hypot(n.x - m.x, n.y - m.y)).toBeLessThan(60);
      }
      // Splashes slide with the world, never leaping.
      for (const s of FISH_SPLASHES) {
        const age = (u - s.at + LOOP_S) % LOOP_S;
        if (age < 3 && age + FRAME < LOOP_S) expect(Math.abs(screenX(s.wx, s.at, v) - screenX(s.wx, s.at, u))).toBeLessThan(25);
      }
    }
  });

  it('opens mid-glide, wings spread, the stopwatch racing to 45 s by "seconds."', () => {
    const f = fishAt(0);
    expect(f.y).toBeLessThan(SURFACE_Y - 100);
    expect(f.fold).toBe(1);
    expect(stopwatchAt(0).alpha).toBe(1);
    expect(stopwatchAt(1).seconds).toBeGreaterThan(20);
    expect(stopwatchAt(1).seconds).toBeLessThan(45);
    expect(stopwatchAt(SECONDS_END).seconds).toBe(45);
  });

  it('films the record from a ferry on "TV crew", with the badge on "record" and the year on "2008"', () => {
    const ferry = ferryAt(TV_AT + 0.3)!;
    expect(ferry.x).toBeLessThan(1080);
    expect(recAt(RECORD_AT)).toBe(1);
    expect(badgeAt(RECORD_AT + 0.4).alpha).toBe(1);
    expect(badgeAt(RECORD_AT + 0.2).year).toBe(0);
    expect(badgeAt(YEAR_AT + 0.3).year).toBe(1);
    // Still airborne all the while.
    for (let t = 0; t < YEAR_AT; t += 0.1) expect(fishAt(t).y).toBeLessThan(SURFACE_Y);
  });

  it('drops back in, then bursts out of the water on "burst out of the water", wings tucked until "spread"', () => {
    expect(DIVES[0]).toBeGreaterThan(YEAR_AT);
    expect(DIVES[0]).toBeLessThan(BURST_AT);
    expect(BREACHES[0]).toBeGreaterThan(BURST_AT);
    expect(BREACHES[0]).toBeLessThan(WATER_AT + 0.1);
    for (const t of [DIVES[0] + 0.1, (DIVES[0] + BREACHES[0]) / 2, BREACHES[0] + 0.2, SPREAD_AT - 0.05]) expect(fishAt(t).fold).toBeLessThan(0.05);
    expect(fishAt(FINS_AT + 0.1).fold).toBeGreaterThan(0.85);
    expect(fishAt(WINGS_AT).fold).toBe(1);
    expect(wingGlowAt(FINS_AT + 0.5)).toBeGreaterThan(0.9);
    expect(finsNoteAt(WINGS_AT + 0.3)).toEqual({ fins: 1, wings: 1 });
  });

  it('flicks its tail on the waves between "tails" and "keep going", the lower lobe dipping in', () => {
    expect(FLICKS[0]).toBeGreaterThanOrEqual(TAILS_AT - 0.1);
    expect(FLICKS[FLICKS.length - 1]).toBeLessThanOrEqual(KEEP_AT + 0.05);
    for (const t of FLICKS) {
      const f = fishAt(t);
      expect(f.y).toBeLessThan(SURFACE_Y);
      expect(f.y + f.length * 0.25).toBeGreaterThan(SURFACE_Y);
      expect(f.effort).toBeGreaterThan(0.9);
    }
    expect(fishAt(KEEP_AT + 0.6).y).toBeLessThan(SURFACE_Y - 100);
  });

  it('measures out 400 m by "metres."', () => {
    expect(rulerAt(METRES_AT)).toBe(1);
    expect(metresAt(METRES_AT + 0.1)).toBe(400);
    expect(metresAt(METRES_AT - 0.8)).toBe(0);
  });

  it('hunted from below on "Mahi-mahi" and from above on "seabirds", it escapes on "get away"', () => {
    expect(DIVES[1]).toBeLessThan(MAHI_AT + 0.1);
    expect(mahiAt(MAHI_AT + 0.6)!.x).toBeGreaterThan(0);
    expect(mahiAt(MAHI_AT + 0.6)!.y).toBeGreaterThan(fishAt(MAHI_AT + 0.6).y + 100);
    expect(gannetAt(SEABIRDS_AT + 0.2)!.y).toBeLessThan(SURFACE_Y - 200);
    expect(PLUNGE_AT).toBe(ABOVE_AT);
    expect(gannetAt(ABOVE_AT + 0.3)!.under).toBe(true);
    expect(alarmAt(SEABIRDS_AT)).toBeGreaterThan(0.9);
    expect(BREACHES[1]).toBeGreaterThan(GET_AT - 0.1);
    expect(BREACHES[1]).toBeLessThan(GET_AT + 0.2);
    expect(fishAt(LOOP_S - 0.3).fold).toBe(1);
    // The stopwatch is back, at zero, for the flight that opens the loop.
    expect(stopwatchAt(LOOP_S - 0.3)).toEqual({ alpha: 1, seconds: 0 });
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('away,');
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
