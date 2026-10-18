import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS } from '../dev/promo/pistol/script';
import {
  BANG_AT, bangAt, bedShowAt, bedSnapTimes, BELIEVE_AT, boilAt, BOIL_STEPS, bubbleAt, bubbleLabel, BURSTS_AT, cameraAt, CLAW_AT, clawOpenAt, clawRing, degreesAt,
  DEGREES_AT, FIRES_AT, fishAt, FIVE_AT, FLASH_AT, flashAt, heatAt, HID_AT, HOT_C, IT_AT, jetAt, jetFromAt, LOOP_S, NOISE_AT, pistolLabel, PISTOL_AT, PREY_AT,
  said, shakeAt, shhAt, shrimpAt, SNAP_HOT, snapArrow, SNAPS_AT, starsAt, STUNS_AT, SUBMARINES_AT, subAt, SUN_AT, sunAt, thermoAt, whiteAt, WORLD_AT, wwiiLabel,
} from '../dev/promo/pistol/story';
import { TEMPO, WORDS } from '../dev/promo/pistol/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

describe('promo short: this shrimp’s snap is almost as hot as the sun (narrated)', () => {
  it('loops: the claw, the shrimp, the camera, the flash and every note are where they started', () => {
    expect(clawOpenAt(END)).toBeCloseTo(clawOpenAt(0), 4);
    const [a, b] = [shrimpAt(END), shrimpAt(0)];
    for (const key of ['x', 'y', 'tilt'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
    for (const key of ['zoom', 'x', 'y'] as const) expect(cameraAt(END)[key]).toBeCloseTo(cameraAt(0)[key], 3);
    // The flash that opens the loop started just before the loop point.
    const [fe, f0] = [flashAt(END)!, flashAt(0)!];
    expect(fe.u).toBeCloseTo(f0.u, 4);
    expect(dist(fe, f0)).toBeLessThan(0.5);
    for (const f of [whiteAt, heatAt, thermoAt, sunAt, bangAt, pistolLabel, snapArrow, bubbleLabel, wwiiLabel, shhAt, starsAt, bedShowAt]) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(clawRing(END).drawn * clawRing(END).alpha).toBeCloseTo(clawRing(0).drawn * clawRing(0).alpha, 4);
    expect(shakeAt(END).x).toBeCloseTo(shakeAt(0).x, 3);
    expect(shakeAt(END).y).toBeCloseTo(shakeAt(0).y, 3);
    for (const f of [fishAt, bubbleAt, subAt]) {
      expect(f(END)).toBeNull();
      expect(f(0)).toBeNull();
    }
  });

  it('never jumps: the camera, the shrimp and the fish move on smoothly; only the snaps slam the claw shut', () => {
    let slams = 0;
    for (const t of FRAMES) {
      const [c, d] = [cameraAt(t), cameraAt(t + FRAME)];
      expect(Math.abs(Math.log(d.zoom / c.zoom))).toBeLessThan(0.06);
      expect(Math.hypot(d.x - c.x, d.y - c.y)).toBeLessThan(40);
      // It kicks back as it snaps: the quickest it moves.
      expect(dist(shrimpAt(t), shrimpAt(t + FRAME))).toBeLessThan(12);
      const [f, g] = [fishAt(t), fishAt(t + FRAME)];
      if (f && g) {
        expect(dist(f, g)).toBeLessThan(60);
        // Knocked spinning by the bang: fast, but never more than a quarter turn a frame.
        expect(Math.abs(g.spin - f.spin)).toBeLessThan(Math.PI / 4);
      }
      const step = clawOpenAt(t + FRAME) - clawOpenAt(t);
      if (step < -0.3) slams++;
      else expect(Math.abs(step)).toBeLessThan(0.15);
    }
    // Three snaps a loop (on "hot as the", "fires", and into the loop point), each slammed in a frame or two.
    expect(slams).toBeGreaterThanOrEqual(3);
    expect(slams).toBeLessThanOrEqual(6);
  });

  it('opens on the action: the claw just slammed shut and the flash going off in front of it, no labels or numbers', () => {
    expect(clawOpenAt(0)).toBe(0);
    const f = flashAt(0)!;
    expect(f.big).toBe(false);
    expect(f.u).toBeLessThan(0.1);
    // In front of the claw.
    const from = jetFromAt(0);
    const s = shrimpAt(0);
    expect((f.x - from.x) * Math.cos(s.tilt) - (f.y - from.y) * Math.sin(s.tilt)).toBeGreaterThan(50);
    for (const note of [pistolLabel, thermoAt, wwiiLabel, bubbleLabel, sunAt, bangAt, snapArrow]) expect(note(0)).toBe(0);
    expect(clawRing(0).drawn).toBe(0);
    expect(fishAt(0)).toBeNull();
    expect(bedShowAt(0)).toBe(0);
    // It stays lit through the first few frames.
    expect(flashAt(0.3)!.u).toBeLessThan(0.5);
  });

  it('snaps again on "hot as the", and an ink sun pops up beside the flash on "SUN!"', () => {
    expect(clawOpenAt(SNAP_HOT - 0.05)).toBeGreaterThan(0.9);
    expect(clawOpenAt(SNAP_HOT + 0.06)).toBe(0);
    expect(jetAt(SNAP_HOT + 0.1)).not.toBeNull();
    expect(flashAt(SUN_AT)!.u).toBeLessThan(0.2);
    expect(sunAt(SUN_AT - 0.1)).toBe(0);
    expect(sunAt(SUN_AT + 0.25)).toBeGreaterThanOrEqual(1);
    expect(sunAt(PISTOL_AT)).toBe(0);
  });

  it('cocks the claw on "The pistol shrimp", labels it, and rings the claw on "claw"', () => {
    expect(clawOpenAt(PISTOL_AT + 0.1)).toBeGreaterThan(0.9);
    expect(pistolLabel(PISTOL_AT + 0.3)).toBe(1);
    expect(snapArrow(SNAPS_AT + 0.25)).toBe(1);
    expect(clawRing(CLAW_AT - 0.1).drawn).toBe(0);
    expect(clawRing(CLAW_AT + 0.45).drawn).toBe(1);
    const fish = fishAt(CLAW_AT + 0.5)!;
    expect(fish.alpha).toBe(1);
    // Zoomed out from the close-up so the fish is in the picture.
    expect(cameraAt(CLAW_AT).zoom).toBeLessThan(cameraAt(0).zoom);
  });

  it('fires a bubble at the fish on "fires", which flies out of the claw and stops in front of it', () => {
    expect(clawOpenAt(FIRES_AT + 0.12)).toBe(0);
    expect(jetAt(FIRES_AT + 0.15)).not.toBeNull();
    const from = jetFromAt(FIRES_AT);
    const early = bubbleAt(FIRES_AT + 0.2)!;
    const late = bubbleAt(BURSTS_AT - 0.05)!;
    expect(dist(late, from)).toBeGreaterThan(dist(early, from) + 100);
    // Between the claw and the fish.
    const fish = fishAt(BURSTS_AT)!;
    expect(dist(late, fish)).toBeLessThan(dist(from, fish));
    expect(dist(late, fish)).toBeGreaterThan(late.r);
    expect(bubbleLabel(said('bubble…') + 0.2)).toBe(1);
  });

  it('bursts on "bursts" into a white-hot point, the thermometer climbing to 4,700 °C on "FIVE thousand degrees"', () => {
    expect(HOT_C).toBe(4700);
    expect(bubbleAt(BURSTS_AT + 0.15)!.r).toBeLessThan(bubbleAt(BURSTS_AT)!.r);
    expect(bubbleAt(BURSTS_AT + 0.35)).toBeNull();
    expect(thermoAt(BURSTS_AT - 0.05)).toBe(0);
    expect(heatAt(FIVE_AT)).toBe(1);
    expect(thermoAt(FIVE_AT)).toBe(1);
    expect(degreesAt(FIVE_AT - 0.2)).toBeLessThan(100);
    expect(degreesAt(DEGREES_AT + 0.3)).toBe(HOT_C);
  });

  it('flashes white on "flash", inks a BANG on "BANG", and knocks the fish spinning, dizzy, before the shrimp tugs it in', () => {
    expect(whiteAt(FLASH_AT + 0.06)).toBeGreaterThan(0.5);
    expect(flashAt(FLASH_AT + 0.1)!.big).toBe(true);
    expect(heatAt(FLASH_AT + 0.1)).toBe(0);
    expect(bangAt(BANG_AT - 0.05)).toBe(0);
    expect(bangAt(BANG_AT + 0.25)).toBeGreaterThanOrEqual(1);
    expect(fishAt(BANG_AT)!.spin).toBeLessThan(0.2);
    expect(fishAt(STUNS_AT)!.spin).toBeGreaterThan(1);
    expect(starsAt(PREY_AT)).toBe(1);
    const held = fishAt(PREY_AT + 0.8)!;
    expect(dist(held, jetFromAt(PREY_AT))).toBeLessThan(220);
    expect(bangAt(PREY_AT + 0.4)).toBe(0);
  });

  it('pulls back to a crackling bed of shrimp, "WWII", and a submarine sneaking along behind the noise', () => {
    expect(wwiiLabel(WORLD_AT + 0.3)).toBe(1);
    expect(cameraAt(SUBMARINES_AT).zoom).toBeLessThan(0.6);
    expect(bedShowAt(HID_AT)).toBe(1);
    const sub = subAt(HID_AT)!;
    expect(sub.alpha).toBe(1);
    expect(subAt(NOISE_AT)!.x).toBeGreaterThan(sub.x);
    expect(shhAt(HID_AT + 0.3)).toBe(1);
    const snaps = bedSnapTimes();
    expect(snaps.length).toBeGreaterThan(40);
    for (const s of snaps) {
      expect(s.t).toBeGreaterThan(WORLD_AT - 1);
      expect(s.t).toBeLessThan(IT_AT);
    }
    expect(fishAt(SUBMARINES_AT + 0.4)).toBeNull();
  });

  it('cocks the claw on "So believe it:", back in close, and slams it shut into the opening frame', () => {
    expect(clawOpenAt(BELIEVE_AT - 0.35)).toBe(0);
    expect(clawOpenAt(IT_AT + 0.1)).toBeGreaterThan(0.9);
    expect(cameraAt(IT_AT + 0.15).zoom).toBeCloseTo(cameraAt(0).zoom, 3);
    expect(clawOpenAt(LOOP_S - 0.1)).toBe(0);
    expect(bedShowAt(IT_AT)).toBe(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('it:');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
    expect(said('it:')).toBe(IT_AT);
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
    // A crack on every snap of the claw, and a big one on "BANG".
    expect(SOUNDS.filter((s) => s.id === 'boom' && Math.abs(s.t - BANG_AT) < 0.1)).toHaveLength(1);
    expect(SOUNDS.filter((s) => s.id === 'smash').length).toBeGreaterThanOrEqual(3);
  });
});
