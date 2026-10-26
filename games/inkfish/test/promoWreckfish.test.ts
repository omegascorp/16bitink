import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { readoutText } from '../dev/promo/wreckfish/descent';
import { captionAt, LINES, SOUNDS, SYNTHS, TEXT } from '../dev/promo/wreckfish/script';
import {
  alarmAt, BUMPS, boilAt, DROP, cameraAt, COULD_AT, depthAt01, DOWN_END, ELEVEN_AT, frozenAt, gazeAt, gradeAt, GULP_AT, GUY_AT, heldAt, jawAt, LOOP_S, mouthAt, murkAt,
  NOSERS, noserAt, ONE_AT, popAt, readoutAt, said, sceneAt, scatterAt, shakeAt, SHARK_AT, SHARK0_LEN, shark0At, sharkDepthAt, SHARKS_AT, SHOWED_AT, SHUT_T,
  suctionAt, swordAt, SWORDFISH_AT, TAIL_AT, toScreen, UP_AT, WRECK_LEN, wreckAt, wrap, WRECKFISH_AT, ALMOST_AT, AND_AT, IT_AT, SO_AT, THEN_AT, WIGGLING_AT,
} from '../dev/promo/wreckfish/story';
import { TEMPO, WORDS } from '../dev/promo/wreckfish/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
type P = { readonly x: number; readonly y: number };
const dist = (p: P, q: P): number => Math.hypot(q.x - p.x, q.y - p.y);
const onScreen = (t: number, p: P): P => toScreen(cameraAt(t), p);
/** Every value a frame draws from that runs on the clock, as numbers. */
const CLOCKED: readonly ((t: number) => number)[] = [
  jawAt, murkAt, scatterAt, depthAt01, readoutAt, alarmAt, suctionAt, frozenAt, heldAt, sharkDepthAt,
  (t) => cameraAt(t).x, (t) => cameraAt(t).y, (t) => cameraAt(t).zoom,
  (t) => wreckAt(t).x, (t) => wreckAt(t).y, (t) => wreckAt(t).tilt,
  (t) => shark0At(t).x, (t) => shark0At(t).y, (t) => shark0At(t).tilt, (t) => shark0At(t).effort,
  (t) => gazeAt(t).x, (t) => gazeAt(t).y, (t) => gazeAt(t).lid,
  (t) => gradeAt(t).strength, (t) => gradeAt(t).vignette, ...[0, 1, 2].map((c) => (t: number) => gradeAt(t).rgb[c]!),
  (t) => swordAt(t).y, (t) => swordAt(t).tilt,
  ...Array.from({ length: 11 }, (_, i) => (t: number) => popAt(i, t)),
  ...NOSERS.flatMap((_, i) => [(t: number) => noserAt(i, t).x, (t: number) => noserAt(i, t).y, (t: number) => noserAt(i, t).tilt]),
];
const deepOn = (t: number): boolean => [sceneAt(t), sceneAt(t + FRAME)].every((n) => n.a === 'deep' || n.b === 'deep');

describe('promo short: the wreckfish that swallowed a whole shark (narrated)', () => {
  it('loops: every clocked value is where it started, moving the same way', () => {
    for (const f of CLOCKED) expect(f(END)).toBeCloseTo(f(0), 4);
    const h = 1e-3;
    for (const f of [jawAt, (t: number) => cameraAt(t).zoom, (t: number) => wreckAt(t).x, (t: number) => shark0At(t).x, sharkDepthAt]) {
      expect((f(END) - f(END - h)) / h).toBeCloseTo((f(h) - f(0)) / h, 1);
    }
    expect(sceneAt(END)).toEqual(sceneAt(0));
    expect(shakeAt(END)).toEqual(shakeAt(0));
    expect(creditAt(END, LOOP_S)).toBe(creditAt(0, LOOP_S));
  });

  it('never jumps: the fish, the camera and every value move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const q = t + FRAME;
      if (deepOn(t)) {
        // Two quick moves: the jaws snapping shut on "SHARK!" and the lunge on "gulp".
        const snap = [SHUT_T, GULP_AT].some((at) => Math.abs(wrap(t) - at) < 0.35) ? 2.2 : 1;
        // And the camera falling away as the descent fades in.
        const drop = wrap(t) > DROP.from - FRAME && wrap(t) < DROP.to ? 1.5 : 1;
        const px = 70 * snap * drop;
        expect(dist(onScreen(t, wreckAt(t)), onScreen(q, wreckAt(q)))).toBeLessThan(px);
        expect(dist(onScreen(t, mouthAt(t)), onScreen(q, mouthAt(q)))).toBeLessThan(px);
        expect(dist(onScreen(t, shark0At(t)), onScreen(q, shark0At(q)))).toBeLessThan(px * 1.3);
        expect(Math.abs(cameraAt(q).zoom - cameraAt(t).zoom)).toBeLessThan(0.06);
        expect(Math.abs(jawAt(q) - jawAt(t))).toBeLessThan(snap > 1 ? 0.6 : 0.25);
        for (let i = 0; i < NOSERS.length; i++) expect(dist(onScreen(t, noserAt(i, t)), onScreen(q, noserAt(i, q)))).toBeLessThan(px);
      }
      for (const f of [readoutAt, alarmAt, frozenAt, (u: number) => gradeAt(u).strength]) expect(Math.abs(f(q) - f(t))).toBeLessThan(0.35);
    }
  });

  it('opens on the wreckfish mid-gulp: jaws wide round a shark half in, big in the frame, nothing written but the words', () => {
    expect(sceneAt(0)).toEqual({ a: 'deep', b: null, mix: 0 });
    expect(jawAt(0)).toBeGreaterThan(0.8);
    expect(heldAt(0)).toBe(1);
    const depth = sharkDepthAt(0);
    expect(depth).toBeGreaterThan(0.3);
    expect(depth).toBeLessThan(0.6);
    const v = cameraAt(0);
    const w = wreckAt(0);
    const d = { x: Math.cos(w.tilt), y: -Math.sin(w.tilt) };
    const mouth = onScreen(0, mouthAt(0));
    // From the back of its head (a third of its length behind the lips) to the shark's tail.
    const gills = { x: mouth.x - d.x * 0.33 * WRECK_LEN * v.zoom, y: mouth.y - d.y * 0.33 * WRECK_LEN * v.zoom };
    const s = onScreen(0, shark0At(0));
    const tail = { x: s.x + d.x * 0.5 * SHARK0_LEN * v.zoom, y: s.y + d.y * 0.5 * SHARK0_LEN * v.zoom };
    expect(tail.x - Math.max(0, gills.x)).toBeGreaterThan(0.65 * 1080);
    expect(tail.x).toBeLessThan(1080);
    for (const p of [mouth, s]) {
      expect(p.y).toBeGreaterThan(350);
      expect(p.y).toBeLessThan(1250);
    }
    expect(mouth.x).toBeGreaterThan(350);
    expect(mouth.x).toBeLessThan(750);
    for (const f of [readoutAt, alarmAt, frozenAt, murkAt]) expect(f(0)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('shuts the jaws on "SHARK!", with a jolt, the tail left wiggling out of the lips', () => {
    expect(SHUT_T - SHARK_AT).toBeGreaterThan(0);
    expect(SHUT_T - SHARK_AT).toBeLessThan(0.3);
    expect(jawAt(SHUT_T - 0.1)).toBeGreaterThan(0.8);
    expect(jawAt(SHUT_T + 0.02)).toBeLessThan(0.2);
    expect(sharkDepthAt(SHUT_T + 0.1)).toBeGreaterThan(0.8);
    expect(sharkDepthAt(SHUT_T + 0.1)).toBeLessThan(1);
    expect(Math.hypot(shakeAt(SHUT_T + 0.05).x, shakeAt(SHUT_T + 0.05).y)).toBeGreaterThan(5);
  });

  it('puts each beat on screen as it is said', () => {
    // "Almost fifteen hundred feet down,": the drop and the readout, US units first.
    expect(sceneAt(ALMOST_AT).a).toBe('descent');
    expect(readoutAt(ALMOST_AT + 0.2)).toBe(1);
    expect(readoutText(DOWN_END)).toEqual({ ft: '1,500 ft', m: '450 m' });
    // "eleven sharks …": all eleven pop in one at a time, from "eleven", round the swordfish.
    expect(sceneAt(ELEVEN_AT).a).toBe('deep');
    for (let i = 0; i < 11; i++) {
      expect(popAt(i, ELEVEN_AT - 0.05)).toBe(0);
      expect(popAt(i, SHARKS_AT + 0.4)).toBeCloseTo(1, 1);
      expect(popAt(i, said('dead'))).toBeCloseTo(1, 2);
    }
    expect(murkAt(SWORDFISH_AT)).toBe(1);
    // "then a wreckfish showed up!": out of the dark, the sharks backing off, "!"s.
    expect(murkAt(WRECKFISH_AT)).toBeGreaterThan(0.9);
    expect(murkAt(UP_AT + 0.1)).toBe(0);
    expect(scatterAt(UP_AT + 0.3)).toBe(1);
    expect(alarmAt(SHOWED_AT + 0.2)).toBe(1);
    expect(alarmAt(THEN_AT)).toBe(0);
    // "It couldn't bite the swordfish…": two bumps, mouth open, the swordfish rocking.
    expect(BUMPS[0]).toBeGreaterThan(said('bite'));
    expect(BUMPS[1]).toBeGreaterThan(said('swordfish…', 2));
    for (const b of BUMPS) {
      expect(jawAt(b)).toBeGreaterThan(0.3);
      expect(dist(mouthAt(b), { x: swordAt(b).x, y: swordAt(b).y })).toBeLessThan(260);
      expect(Math.abs(swordAt(b + 0.1).tilt - swordAt(0).tilt)).toBeGreaterThan(0.005);
    }
    // "so it ate the guy who COULD.": the eye turns to the shark, which freezes.
    expect(gazeAt(COULD_AT).x).toBeGreaterThan(0.8);
    expect(gazeAt(COULD_AT).lid).toBeGreaterThan(0.4);
    expect(frozenAt(GUY_AT + 0.2)).toBe(1);
    expect(heldAt(COULD_AT)).toBe(0);
    // "One gulp.": sucked in and held; "Tail still wiggling.": half in, the tail lashing.
    expect(heldAt(ONE_AT + 0.25)).toBe(1);
    expect(jawAt(ONE_AT + 0.3)).toBeGreaterThan(0.9);
    expect(sharkDepthAt(TAIL_AT)).toBeGreaterThan(0.35);
    expect(shark0At(TAIL_AT).effort).toBeGreaterThan(1);
    expect(jawAt(TAIL_AT)).toBeLessThan(0.4);
    // A new grade for every sentence.
    const moods = [0.5, ALMOST_AT + 0.6, ELEVEN_AT + 1, UP_AT, IT_AT + 0.8, SO_AT + 0.8, WIGGLING_AT, AND_AT + 0.8].map((t) => gradeAt(t).rgb);
    for (let i = 1; i < moods.length; i++) expect(Math.hypot(...moods[i]!.map((c, k) => c - moods[i - 1]![k]!))).toBeGreaterThan(40);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('how');
    const tail = LOOP_S - last.end / TEMPO;
    expect(tail).toBeGreaterThan(0.2);
    expect(tail).toBeLessThan(0.5);
  });

  it('captions every spoken word in short lines, the spoken word highlighted', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      if (l.words.length > 1) expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(18);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('keeps every line of text between y 270 and 1250', () => {
    const inside = (y: number, size: number, pop = 1): void => {
      expect(y - 0.8 * size * pop).toBeGreaterThanOrEqual(270);
      expect(y + 0.3 * size * pop).toBeLessThanOrEqual(1250);
    };
    for (const k of ['caption', 'depth', 'depthM'] as const) inside(TEXT[k].y, TEXT[k].size);
    inside(TEXT.alarm.top, TEXT.alarm.size, TEXT.alarm.pop);
    inside(TEXT.alarm.bottom, TEXT.alarm.size, TEXT.alarm.pop);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(wrap(LOOP_S)).toBe(0);
    for (const s of [...SOUNDS, ...SYNTHS]) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
