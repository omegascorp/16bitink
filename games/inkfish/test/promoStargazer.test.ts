import { describe, expect, it } from 'vitest';
import { cornerXAt, FACE, lowerLip, upperLip } from '../dev/promo/stargazer/face';
import {
  arrowAt, cardAt, captionAt, glintAt, handAt, LINES, ringsAt, shockAt, SOUNDS, spinesAt, STAMP_HALF_H, stampAt, stampScale, starsAt, TEXT, voltsAt, zapAt,
} from '../dev/promo/stargazer/script';
import {
  BLINK_AT, boilAt, BURSTS, burstAge, cameraAt, dustAt, EYES_AT, FIFTY_AT, flashAt, gapeAt, GONE_AT, headAt, HONESTLY_AT, lidsAt, lookAt, LOOP_S, moodAt,
  MOUTH_AT, OVER_AT, preyAt, riseAt, said, shakeAt, SNAP_T, SPINES_AT, STARGAZER_AT, STRIKE_SNAP, STRIKE_T, toScreen, UNFAIR_AT, UP_AT, VENOM_AT, wrap, ZAP_AT,
} from '../dev/promo/stargazer/story';
import { TEMPO, WORDS } from '../dev/promo/stargazer/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
/** Every value a frame draws from that runs on the clock. */
const CLOCKED = [riseAt, gapeAt, lidsAt, dustAt, flashAt, starsAt, ringsAt, arrowAt, zapAt, handAt, shockAt, voltsAt, spinesAt, glintAt, cardAt, stampAt, stampScale] as const;
const angleGap = (a: number, b: number): number => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

describe('promo short: the stargazer eats whatever swims over it (narrated)', () => {
  it('loops: the head, the jaws, the camera, the fish in its mouth and every clocked value are where they started', () => {
    for (const f of CLOCKED) expect(f(END)).toBeCloseTo(f(0), 4);
    const h = 1e-3;
    for (const f of [riseAt, gapeAt]) expect((f(END) - f(END - h)) / h).toBeCloseTo((f(h) - f(0)) / h, 0);
    expect(lookAt(END).x).toBeCloseTo(lookAt(0).x, 4);
    expect(lookAt(END).y).toBeCloseTo(lookAt(0).y, 4);
    const [c1, c0] = [cameraAt(END), cameraAt(0)];
    expect(c1.x).toBeCloseTo(c0.x, 3);
    expect(c1.y).toBeCloseTo(c0.y, 3);
    expect(c1.zoom).toBeCloseTo(c0.zoom, 5);
    expect(shakeAt(END)).toEqual(shakeAt(0));
    expect(moodAt(END).to).toBe(moodAt(0).to);
    expect(moodAt(END).u).toBeCloseTo(1, 6);
    const [p1, p0] = [preyAt(END), preyAt(0)];
    expect(p1.length).toBe(p0.length);
    p1.forEach((a, i) => {
      const b = p0[i]!;
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(0.05);
      expect(a.length).toBeCloseTo(b.length, 3);
      expect(a.tilt).toBeCloseTo(b.tilt, 4);
      expect(a.effort).toBeCloseTo(b.effort, 4);
      expect(a.mouth).toBeCloseTo(b.mouth, 4);
      expect(a.deep).toBeCloseTo(b.deep, 4);
      expect(angleGap(a.beat, b.beat)).toBeLessThan(0.01);
    });
    for (const b of BURSTS) {
      const [x, y] = [burstAge(b, END), burstAge(b, 0)];
      if (x === null || y === null) expect(x).toBe(y);
      else expect(x).toBeCloseTo(y, 5);
    }
    expect(creditAt(END, LOOP_S)).toBe(creditAt(0, LOOP_S));
  });

  it('never jumps: the head, the camera and the fish move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const q = t + FRAME;
      const zoom = Math.max(cameraAt(t).zoom, cameraAt(q).zoom);
      // On screen px a frame: the strikes are lunges (the one on "gone" is over in three frames, as fast as the real fish).
      const strike = (u: number): boolean => (u > STRIKE_T - 0.05 && u < STRIKE_SNAP + 0.1) || u > LOOP_S - 0.7 || u < SNAP_T + 0.1;
      const px = strike(wrap(t)) ? 160 : 55;
      expect(Math.abs(riseAt(q) - riseAt(t)) * zoom).toBeLessThan(px);
      // The jaws open and snap in a couple of frames: that's the strike.
      expect(Math.abs(gapeAt(q) - gapeAt(t))).toBeLessThan(strike(wrap(t)) ? 0.65 : 0.2);
      const [a, b] = [cameraAt(t), cameraAt(q)];
      expect(Math.hypot(a.x - b.x, a.y - b.y) * zoom).toBeLessThan(45);
      expect(Math.abs(a.zoom - b.zoom)).toBeLessThan(strike(wrap(t)) ? 0.08 : 0.05);
      for (const f of [lidsAt, starsAt, ringsAt, arrowAt, voltsAt, cardAt, spinesAt]) expect(Math.abs(f(q) - f(t))).toBeLessThan(0.55);
      const [pa, pb] = [preyAt(t), preyAt(q)];
      if (pa.length === pb.length) {
        pa.forEach((p, i) => {
          const r = pb[i]!;
          expect(Math.hypot(p.x - r.x, p.y - r.y) * zoom).toBeLessThan(px * 1.4);
          expect(Math.abs(p.mouth - r.mouth)).toBeLessThan(strike(wrap(t)) ? 0.65 : 0.2);
        });
      }
    }
  });

  it('opens on the stargazer bursting up, big, its mouth wide round a silver fish, nothing written but the words', () => {
    const cam = cameraAt(0);
    const head = headAt(0);
    // The head fills most of the width.
    expect(2 * FACE.halfWidth * cam.zoom).toBeGreaterThan(0.65 * 1080);
    // Up out of the sand to the chin, the mouth gaping.
    expect(riseAt(0)).toBeGreaterThan(250);
    expect(gapeAt(0)).toBeGreaterThan(0.85);
    expect(dustAt(0)).toBe(0);
    // The mouth and the eyes sit inside the frame's safe band.
    const top = toScreen(cam, { x: 0, y: head.y + upperLip(gapeAt(0))[11]!.y });
    const bottom = toScreen(cam, { x: 0, y: head.y + lowerLip(gapeAt(0))[11]!.y });
    const eye = toScreen(cam, { x: 0, y: head.y + FACE.eyeY - FACE.eyeR });
    expect(eye.y).toBeGreaterThan(350);
    expect(top.y).toBeGreaterThan(350);
    expect(bottom.y).toBeLessThan(1250);
    expect(bottom.y - top.y).toBeGreaterThan(350);
    // The fish is held across the mouth, its ends out past the corners.
    const fish = preyAt(0);
    expect(fish.length).toBe(1);
    const f = fish[0]!;
    expect(f.mouth).toBe(1);
    expect(f.x).toBeCloseTo(0, 6);
    expect(f.y).toBeGreaterThan(head.y + upperLip(gapeAt(0))[11]!.y);
    expect(f.y).toBeLessThan(head.y + lowerLip(gapeAt(0))[11]!.y);
    expect(f.length / 2).toBeGreaterThan(cornerXAt(gapeAt(0)));
    expect(moodAt(0).to).toBe('terror');
    for (const fn of [starsAt, ringsAt, arrowAt, zapAt, voltsAt, glintAt, cardAt, stampAt, flashAt]) expect(fn(0)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('puts each beat on screen as it is said', () => {
    // The jaws snap on "fish", and it's buried by the end of "sand…".
    expect(gapeAt(SNAP_T)).toBe(0);
    expect(preyAt(SNAP_T + 0.01).length).toBe(0);
    expect(riseAt(2.05)).toBeLessThan(5);
    expect(dustAt(2.05)).toBeGreaterThan(0.9);
    // A fish swims over the eyes on "OVER", and they follow it.
    const over = preyAt(OVER_AT);
    expect(over.length).toBe(1);
    expect(Math.abs(over[0]!.x)).toBeLessThan(250);
    expect(over[0]!.y).toBeLessThan(headAt(OVER_AT).y + FACE.eyeY - FACE.eyeR);
    // The stargazer: stars, then rings round the eyes, then the arrow up as the mouth opens.
    expect(starsAt(STARGAZER_AT + 0.3)).toBe(1);
    expect(riseAt(EYES_AT)).toBeGreaterThan(150);
    expect(ringsAt(EYES_AT + 0.3)).toBe(1);
    expect(arrowAt(MOUTH_AT + 0.2)).toBe(1);
    expect(gapeAt(UP_AT)).toBeGreaterThan(0.5);
    // Gone, in a blink: the strike opens wide and snaps shut, the fish gone; then the innocent blink.
    expect(STRIKE_T).toBeLessThan(GONE_AT);
    expect(gapeAt(STRIKE_T + 0.1)).toBeGreaterThan(0.9);
    expect(gapeAt(STRIKE_SNAP)).toBe(0);
    expect(flashAt(STRIKE_SNAP + 0.1)).toBeGreaterThan(0.4);
    expect(preyAt(STRIKE_SNAP + 0.02).length).toBe(0);
    expect(lidsAt(BLINK_AT + 0.15)).toBe(1);
    // Zap: the arcs and the hand on "zap", "50 V" on "fifty".
    expect(zapAt(ZAP_AT + 0.1)).toBeGreaterThan(0.7);
    expect(handAt(ZAP_AT)).toBeGreaterThan(0.95);
    expect(voltsAt(FIFTY_AT + 0.2)).toBe(1);
    // The spines jut out and glint on "venom spines".
    expect(spinesAt(VENOM_AT + 0.2)).toBe(1);
    expect(glintAt(SPINES_AT + 0.2)).toBe(1);
    // The card on "Honestly?", the stamp slammed down on "unfair".
    expect(cardAt(HONESTLY_AT + 0.2)).toBe(1);
    expect(stampAt(UNFAIR_AT - 0.1)).toBe(0);
    expect(stampAt(UNFAIR_AT + 0.15)).toBe(1);
    expect(stampScale(UNFAIR_AT + 0.15)).toBe(1);
    expect(said('Remember,')).toBeGreaterThan(17);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('Remember,');
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
    const inside = (top: number, bottom: number): void => {
      expect(top).toBeGreaterThanOrEqual(270);
      expect(bottom).toBeLessThanOrEqual(1240);
    };
    inside(TEXT.caption.y - 0.8 * TEXT.caption.size, TEXT.caption.y + 0.3 * TEXT.caption.size);
    // "50 V" is chalk strokes 0.62 of its size tall, sitting on its baseline.
    inside(TEXT.volts.y - 0.75 * TEXT.volts.size, TEXT.volts.y + 0.1 * TEXT.volts.size);
    // The stamp: its box (half height, plus its turn across a wide word) at its biggest.
    const { y, size } = TEXT.stamp;
    const half = (STAMP_HALF_H * size + 1.8 * size * Math.sin(0.16)) * TEXT.stampPop;
    inside(y - size * 0.35 - half, y - size * 0.35 + half);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(wrap(LOOP_S)).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
