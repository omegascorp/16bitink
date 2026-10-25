import { describe, expect, it } from 'vitest';
import { DEEP_CAM, toDeepScreen } from '../dev/promo/alpha/deep';
import { mawAt, sharkAt, tipsOf } from '../dev/promo/alpha/maw';
import { captionAt, LINES, placeLabel, sizeBar, SOUNDS, TEXT } from '../dev/promo/alpha/script';
import {
  AND_AT, AUSTRALIA_AT, BIGGER_AT, boilAt, depthAt, depthReadoutAt, DUNK, fallAt, FEET_AT, gulpAt, IT_AT, KNOWS_AT, LOOP_S, MONTHS_AT, NINE_AT, NOBODY_AT, ORCA_AT,
  PLUNGED_AT, rewindAt, said, sceneAt, shakeAt, SHARK_AT, SHUT_T, STOMACH_AT, TAGGED_AT, tempAt, thermoAt, TWO_AT, WARM_AT, warmAt, wrap,
} from '../dev/promo/alpha/story';
import { sizeBarY, surfaceSharkAt } from '../dev/promo/alpha/surface';
import { onShark, TAG_ON_FIN } from '../dev/promo/alpha/tag';
import { TEMPO, WORDS } from '../dev/promo/alpha/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);
const shark = (t: number): ReturnType<typeof sharkAt> => sharkAt(gulpAt(t), t);
const maw = (t: number): ReturnType<typeof mawAt> => mawAt(gulpAt(t), t);
const tagOf = (t: number): { x: number; y: number } => onShark(shark(t).pose, TAG_ON_FIN);
/** Every value a frame draws from that runs on the clock. */
const CLOCKED = [rewindAt, placeLabel, sizeBar, depthAt, fallAt, tempAt, warmAt, depthReadoutAt, thermoAt] as const;

describe('promo short: something ate a great white shark (narrated)', () => {
  it('loops: the gulp clock, the maw, the shark, its tag and every clocked value are where they started', () => {
    expect(gulpAt(0)).toBe(0);
    expect(gulpAt(END)).toBeCloseTo(gulpAt(0), 5);
    const h = 1e-3;
    expect((gulpAt(END) - gulpAt(END - h)) / h).toBeCloseTo((gulpAt(h) - gulpAt(0)) / h, 2);
    const [a, b] = [maw(END), maw(0)];
    expect(dist(a.hinge, b.hinge)).toBeLessThan(0.01);
    expect(a.axis).toBeCloseTo(b.axis, 4);
    expect(a.half).toBeCloseTo(b.half, 4);
    expect(dist(tipsOf(a).upper, tipsOf(b).upper)).toBeLessThan(0.01);
    const [s1, s2] = [shark(END), shark(0)];
    expect(dist(s1.pose, s2.pose)).toBeLessThan(0.05);
    expect(s1.pose.angle).toBeCloseTo(s2.pose.angle, 4);
    expect(s1.worried).toBeCloseTo(s2.worried, 4);
    expect(dist(tagOf(END), tagOf(0))).toBeLessThan(0.05);
    for (const f of CLOCKED) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(sceneAt(END)).toEqual(sceneAt(0));
    expect(shakeAt(END)).toEqual(shakeAt(0));
    expect(creditAt(END, LOOP_S)).toBe(creditAt(0, LOOP_S));
  });

  it('never jumps: the maw, the shark and every value move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const q = t + FRAME;
      // On screen px a frame. Two quick moves: the slurp as the jaws shut on "shark!", and the head lunging up out of the dark in the last second.
      const slurp = wrap(t) > SHUT_T - 0.5 && wrap(t) < SHUT_T + 0.1 ? 1.8 : 1;
      const lunge = wrap(t) > LOOP_S - 1 ? 1.35 : 1;
      const px = 85 * slurp * lunge;
      // The gulp is only on screen in the deep (the hook and the end); its clock resets while other scenes play.
      const deep = [sceneAt(t), sceneAt(q)].every((n) => n.a === 'deep' || n.b === 'deep');
      if (deep) {
        expect(Math.abs(gulpAt(q) - gulpAt(t))).toBeLessThan(0.1);
        expect(dist(maw(t).hinge, maw(q).hinge) * DEEP_CAM.zoom).toBeLessThan(px);
        expect(Math.abs(maw(q).half - maw(t).half)).toBeLessThan(0.08);
        expect(dist(shark(t).pose, shark(q).pose) * DEEP_CAM.zoom).toBeLessThan(px);
        expect(dist(tagOf(t), tagOf(q)) * DEEP_CAM.zoom).toBeLessThan(px * 1.2);
      }
      // The dive's readings, while the dive is on screen (they go back to the surface's values behind the suspects).
      const dive = [sceneAt(t), sceneAt(q)].some((n) => n.a === 'dive' || n.b === 'dive');
      if (dive) {
        expect(Math.abs(depthAt(q) - depthAt(t))).toBeLessThan(40);
        expect(Math.abs(tempAt(q) - tempAt(t))).toBeLessThan(2.5);
        for (const f of [fallAt, warmAt, depthReadoutAt, thermoAt]) expect(Math.abs(f(q) - f(t))).toBeLessThan(0.35);
      }
      for (const f of [rewindAt, placeLabel, sizeBar]) expect(Math.abs(f(q) - f(t))).toBeLessThan(0.35);
      expect(dist(surfaceSharkAt(wrap(t)), surfaceSharkAt(wrap(t) + FRAME))).toBeLessThan(5);
    }
  });

  it('opens on the shark caught across a vast open mouth, big in the frame, its tag showing, nothing written but the words', () => {
    expect(sceneAt(0)).toEqual({ a: 'deep', b: null, mix: 0 });
    const m = maw(0);
    const s = shark(0);
    expect(m.half).toBeGreaterThan(0.35);
    expect(s.worried).toBe(1);
    const tips = tipsOf(m);
    const [u, l] = [toDeepScreen(tips.upper), toDeepScreen(tips.lower)];
    // The open jaws and the shark fill about three quarters of the width.
    expect(l.x - u.x).toBeGreaterThan(0.7 * 1080);
    expect(s.pose.length * DEEP_CAM.zoom).toBeGreaterThan(0.75 * 1080);
    // The shark is between the jaws, a little above the middle of the frame, and its tag is in frame.
    const c = toDeepScreen(s.pose);
    expect(c.x).toBeGreaterThan(u.x);
    expect(c.x).toBeLessThan(l.x);
    expect(c.y).toBeGreaterThan(450);
    expect(c.y).toBeLessThan(960);
    const tag = toDeepScreen(tagOf(0));
    expect(tag.x).toBeGreaterThan(40);
    expect(tag.x).toBeLessThan(1040);
    expect(tag.y).toBeGreaterThan(300);
    expect(tag.y).toBeLessThan(1200);
    for (const f of [placeLabel, sizeBar, rewindAt, depthReadoutAt, thermoAt]) expect(f(0)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('shuts the jaws on "shark!", with a jolt', () => {
    expect(SHUT_T - SHARK_AT).toBeGreaterThan(0);
    expect(SHUT_T - SHARK_AT).toBeLessThan(0.3);
    expect(maw(SHUT_T - 0.3).half).toBeGreaterThan(0.2);
    expect(maw(SHUT_T + 0.02).half).toBeLessThan(0.02);
    expect(Math.hypot(shakeAt(SHUT_T + 0.05).x, shakeAt(SHUT_T + 0.05).y)).toBeGreaterThan(5);
  });

  it('puts each beat on screen as it is said', () => {
    expect(rewindAt(2.5)).toBe(1);
    expect(sceneAt(TWO_AT).a).toBe('surface');
    expect(placeLabel(TWO_AT + 0.3)).toBe(1);
    expect(placeLabel(AUSTRALIA_AT)).toBe(1);
    expect(sizeBar(NINE_AT - 0.2)).toBe(0);
    expect(sizeBar(NINE_AT + 0.3)).toBe(1);
    expect(TAGGED_AT).toBeLessThan(NINE_AT);
    expect(sceneAt(MONTHS_AT + 0.05).a).toBe('dive');
    expect(depthAt(PLUNGED_AT - 0.05)).toBe(0);
    expect(depthAt(FEET_AT + 0.1)).toBeCloseTo(580, 3);
    expect(depthReadoutAt(FEET_AT)).toBe(1);
    expect(tempAt(AND_AT + 0.1)).toBe(8);
    expect(thermoAt(AND_AT + 0.3)).toBe(1);
    expect(tempAt(WARM_AT + 0.3)).toBeCloseTo(26, 6);
    expect(warmAt(WARM_AT + 0.6)).toBe(1);
    expect(sceneAt(IT_AT + 0.15).a).toBe('belly');
    expect(sceneAt(STOMACH_AT).a).toBe('belly');
    expect(sceneAt(BIGGER_AT).a).toBe('suspects');
    expect(sceneAt(ORCA_AT).a).toBe('suspects');
    expect(sceneAt(NOBODY_AT).a).toBe('beach');
    expect(sceneAt(KNOWS_AT).a).toBe('beach');
    expect(sceneAt(DUNK.to + 0.01).a).toBe('deep');
    expect(said('All')).toBeGreaterThan(DUNK.from);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('is,');
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

  it('keeps every line of text between y 270 and 1240', () => {
    const inside = (y: number, size: number, pop = 1): void => {
      expect(y - 0.8 * size * pop).toBeGreaterThanOrEqual(270);
      expect(y + 0.3 * size * pop).toBeLessThanOrEqual(1240);
    };
    for (const k of ['caption', 'place', 'depth', 'depthFt', 'temp'] as const) inside(TEXT[k].y, TEXT[k].size);
    for (const q of TEXT.questions) inside(q.y, q.size, TEXT.questionPop);
    for (let t = NINE_AT; t < MONTHS_AT; t += FRAME) inside(sizeBarY(surfaceSharkAt(t)) + TEXT.sizeBar.dy, TEXT.sizeBar.size);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(((LOOP_S * BOIL_FPS) % BOIL_FRAMES)).toBe(0);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(wrap(LOOP_S)).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
