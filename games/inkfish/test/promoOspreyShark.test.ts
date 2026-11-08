import { describe, expect, it } from 'vitest';
import { RIG_MID, SHARK_SNOUT, SPOTS } from '../dev/promo/ospreyshark/rig';
import { captionAt, LABEL_X, LINES, SHUTTERS, SOUNDS, TEXT } from '../dev/promo/ospreyshark/script';
import {
  AT, bangAt, BOIL_STEPS, ospreyTagAt, boilAt, camAt, CUTS, fishAt, fishRingAt, flashAt, floridaAt, heightAt, HOOK_CAM, LOOP_S, moodAt, ospreyAt,
  photoAt, sharkAt, shotAt, sweatAt, tailRingAt, toScreen, viewfinderAt, wrap,
} from '../dev/promo/ospreyshark/story';
import { TEMPO, WORDS } from '../dev/promo/ospreyshark/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const overlays = (t: number): number[] => [
  ospreyTagAt(t), floridaAt(t), heightAt(t), viewfinderAt(t), tailRingAt(t), fishRingAt(t), bangAt(t).alpha, photoAt(t).snap, photoAt(t).stamp, sweatAt(t),
];

describe('promo short: this bird caught a shark that caught a fish (narrated)', () => {
  it('loops: the camera, the three animals, the mood and the marks at the loop point equal their start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    expect(shotAt(0).name).toBe('hook');
    expect(shotAt(END).name).toBe('back');
    const [c0, c1] = [camAt(0), camAt(END)];
    expect(c1.z).toBeCloseTo(c0.z, 4);
    for (const k of ['x', 'y'] as const) {
      expect(c1.f[k], `f.${k}`).toBeCloseTo(c0.f[k], 2);
      expect(c1.a[k], `a.${k}`).toBeCloseTo(c0.a[k], 2);
    }
    const [o0, o1] = [ospreyAt(0), ospreyAt(END)];
    for (const k of ['x', 'y', 'k', 'flap', 'cry'] as const) expect(o1[k], k).toBeCloseTo(o0[k], 3);
    expect(Math.sin(o1.beat)).toBeCloseTo(Math.sin(o0.beat), 3);
    const [s0, s1] = [sharkAt(0), sharkAt(END)];
    expect(s1.jaw).toBeCloseTo(s0.jaw, 6);
    expect(s1.worried).toBeCloseTo(s0.worried, 3);
    expect(Math.sin(s1.tail)).toBeCloseTo(Math.sin(s0.tail), 2);
    expect(Math.cos(s1.tail)).toBeCloseTo(Math.cos(s0.tail), 2);
    const [f0, f1] = [fishAt(0), fishAt(END)];
    for (const k of ['worry', 'wiggle', 'look', 'swing'] as const) expect(f1[k], k).toBeCloseTo(f0[k], 3);
    const [m0, m1] = [moodAt(0), moodAt(END)];
    for (const k of ['drain', 'warm', 'vignette'] as const) expect(m1[k], k).toBeCloseTo(m0[k], 2);
    expect(flashAt(END)).toBeCloseTo(flashAt(0), 3);
    for (const v of [...overlays(0), ...overlays(END)]) expect(v).toBeCloseTo(0, 3);
  });

  it('opens on the hook, close: the osprey, the shark under it head first, the fish at the shark\'s jaws, all big in frame, nothing written but the caption', () => {
    for (let t = 0; t <= CUTS.wide - 0.05; t += FRAME) {
      expect(shotAt(t).name, `t=${t}`).toBe('hook');
      expect(overlays(t).every((v) => v === 0), `t=${t}`).toBe(true);
    }
    const cam = camAt(0.3);
    expect(cam.z).toBeGreaterThanOrEqual(HOOK_CAM.z);
    const inFrame = (p: { x: number; y: number }): boolean => p.x > 0 && p.x < 1080 && p.y > 200 && p.y < 1150;
    const bird = toScreen(cam, ospreyAt(0.3));
    const snout = toScreen(cam, SHARK_SNOUT);
    const tail = toScreen(cam, SPOTS.tail);
    const fish = toScreen(cam, SPOTS.fishMid);
    for (const p of [bird, snout, tail, fish]) expect(inFrame(p), JSON.stringify(p)).toBe(true);
    // The shark is under the bird, its snout forward (the way the bird flies), the fish ahead of and below the shark's head.
    expect(snout.y).toBeGreaterThan(bird.y);
    expect(snout.x).toBeGreaterThan(tail.x);
    expect(snout.x - tail.x).toBeGreaterThan(380);
    expect(fish.y).toBeGreaterThan(snout.y);
    expect(captionAt(0.3)!.line.words.map((w) => w.text).join(' ')).toBe('This bird caught a');
  });

  it('puts every noun on screen as it is said', () => {
    // "An osprey, 400 feet over Florida": the wide shot, "Florida", the height line and labels.
    expect(shotAt(AT.osprey).name).toBe('wide');
    expect(camAt(AT.osprey).z).toBeLessThan(0.2);
    expect(ospreyTagAt(AT.osprey + 0.2)).toBe(1);
    expect(floridaAt(AT.florida + 0.1)).toBe(1);
    expect(heightAt(AT.feet + 0.3)).toBe(1);
    // "The photographer zoomed in": the viewfinder, the zoom racking in.
    expect(viewfinderAt(AT.zoomed)).toBe(1);
    expect(camAt(AT.in + 0.2).z).toBeGreaterThan(camAt(AT.photographer).z * 5);
    // "a shark's TAIL!": close on the tail, ringed, a "!".
    expect(shotAt(AT.tail).name).toBe('tail');
    expect(tailRingAt(AT.tail + 0.4)).toBe(1);
    expect(bangAt(AT.tail + 0.2).alpha).toBe(1);
    const tailCam = camAt(AT.tail + 0.2);
    const tail = toScreen(tailCam, SPOTS.tail);
    expect(Math.abs(tail.x - 540)).toBeLessThan(300);
    // "in its mouth?": the jaws in shot; "Another FISH!": the fish, ringed, a flash.
    const mouthCam = camAt(AT.mouth + 0.2);
    expect(Math.abs(toScreen(mouthCam, SPOTS.jaws).x - 540)).toBeLessThan(300);
    expect(fishRingAt(AT.fish2 + 0.4)).toBe(1);
    expect(flashAt(AT.fish2 + 0.05)).toBeGreaterThan(0.2);
    const fishCam = camAt(AT.fish2 + 0.3);
    const fish = toScreen(fishCam, SPOTS.fishMid);
    expect(fish.y).toBeGreaterThan(270);
    expect(fish.y).toBeLessThan(1150);
    // "one-in-a-TRILLION shot": the print, the stamp down.
    expect(shotAt(AT.one).name).toBe('photo');
    expect(photoAt(AT.one).snap).toBe(1);
    expect(photoAt(AT.trillion - 0.3).stamp).toBe(0);
    expect(photoAt(AT.trillion + 0.2).stamp).toBe(1);
    // "Bad day to be the fish": close on its worried face, drained, sweating.
    expect(shotAt(AT.fishBad).name).toBe('bad');
    expect(fishAt(AT.fishBad).worry).toBeGreaterThan(0.9);
    expect(moodAt(AT.fishBad).drain).toBeGreaterThan(0.3);
    expect(sweatAt(AT.fishBad)).toBeGreaterThan(0.3);
    expect(camAt(AT.fishBad).z).toBeGreaterThan(3);
  });

  it('changes the mood at least three times, with matching sounds', () => {
    const moods = [AT.shark, AT.osprey, AT.tail, AT.fish2, AT.trillion, AT.fishBad].map((t) => moodAt(t));
    expect(moods[0]!.warm).toBeGreaterThan(0.15);
    expect(moods[1]!.warm).toBeLessThan(0.05);
    expect(moods[2]!.vignette).toBeGreaterThan(0.4);
    expect(moods[4]!.warm).toBeGreaterThan(0.1);
    expect(moods[5]!.drain).toBeGreaterThan(0.3);
    const near = (id: string, at: number, d = 0.15): boolean => SOUNDS.some((s) => s.id === id && Math.abs(s.t - at) < d);
    expect(near('powerup', AT.fish)).toBe(true);
    expect(near('splash', CUTS.wide, 0.3)).toBe(true);
    expect(near('spotted', AT.tail)).toBe(true);
    expect(near('smash', AT.fish2)).toBe(true);
    expect(near('smash', AT.trillion)).toBe(true);
    expect(near('lose', AT.bad, 0.4)).toBe(true);
    expect(SHUTTERS.some((s) => Math.abs(s - AT.in) < 0.2)).toBe(true);
    expect(SHUTTERS.some((s) => Math.abs(s - CUTS.photo) < 0.1)).toBe(true);
  });

  it('pulls back from the fish to frame 1 for the seam, after "because" begins', () => {
    expect(CUTS.back).toBeGreaterThan(AT.because - 0.2);
    expect(CUTS.back).toBeLessThan(LOOP_S - 0.6);
    expect(camAt(CUTS.back + 0.01).z).toBeGreaterThan(3);
    expect(camAt(LOOP_S - 0.05).z).toBeCloseTo(HOOK_CAM.z, 1);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('because');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO).toBeLessThanOrEqual(0.45);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.6);
    expect(TEMPO).toBeLessThanOrEqual(1.15);
  });

  it('captions every spoken word in short phrases, the right one at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(19);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    for (let t = 0; t < LOOP_S; t += FRAME) expect(captionAt(t), `t=${t}`).not.toBeNull();
  });

  it('keeps every text line inside the area the apps leave clear (y 270 to 1250)', () => {
    for (const [name, line] of Object.entries(TEXT)) {
      expect(line.y, name).toBeLessThanOrEqual(1250);
      expect(line.y - line.size * 0.72, name).toBeGreaterThanOrEqual(270);
    }
    expect(LABEL_X).toBeGreaterThan(200);
    expect(LABEL_X).toBeLessThan(880);
    // The "!" by the tail is clamped into the zone in render.ts; its anchor is on screen.
    const tail = toScreen(camAt(AT.tail + 0.2), SPOTS.tail);
    expect(tail.y).toBeGreaterThan(270);
    expect(tail.y).toBeLessThan(1250);
    expect(RIG_MID.y).toBeGreaterThan(270);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every word and sound inside the loop', () => {
    expect(LOOP_S % 1.5).toBeCloseTo(0, 9);
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const w of WORDS) {
      expect(w.start / TEMPO).toBeGreaterThanOrEqual(0);
      expect(w.end / TEMPO).toBeLessThan(LOOP_S);
    }
    for (const s of [...SOUNDS.map((x) => x.t), ...SHUTTERS]) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(LOOP_S);
    }
  });
});
