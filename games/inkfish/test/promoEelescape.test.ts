import { describe, expect, it } from 'vitest';
import { oddsHeadAt } from '../dev/promo/eelescape/odds';
import { exitSpine, swallowSpine, toRiverScreen } from '../dev/promo/eelescape/river';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/eelescape/script';
import { EEL_LEN, SNOUT } from '../dev/promo/eelescape/shape';
import {
  ABOUT_AT, BACKWARDS_AT, boilAt, bonesAt, dramaAt, eelGlowAt, eelInAt, EELS_AT, escapeAt, ESCAPED_AT, excitedAt, faceAt, FISH_AT, flashAt, FOUR_AT, GILLS_AT,
  greyAt, gulpAt, INSIDE_AT, japanAt, JAPAN_AT, jawOf, LOOP_S, MADE_AT, ONE_AT, pathAt, ratioAt, riverCamAt, said, scanAt, sceneAt, SCIENTISTS_AT, scientistsAt,
  shakeAt, shockAt, shows, SHUT_T, SO_AT, SO_YES_AT, SQUEEZED_AT, stomachAt, STOMACH_AT, swimOffAt, THREE_AT, throbAt, THROAT_AT, THROAT_END, timerAt,
  timerSecondsAt, triumphAt, winnerAt, wrap, xCamAt, xEelAt, XRAYED_AT,
} from '../dev/promo/eelescape/story';
import { TEMPO, WORDS } from '../dev/promo/eelescape/words';
import { X_EEL_LEN, X_GILL_S } from '../dev/promo/eelescape/xshape';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
type P = { readonly x: number; readonly y: number };
const dist = (p: P, q: P): number => Math.hypot(q.x - p.x, q.y - p.y);
/** The swallowed eel's head and tail on screen at t. */
const eelOnScreen = (t: number): { head: P; tail: P } => {
  const spine = swallowSpine(gulpAt(t), t);
  const cam = riverCamAt(t);
  return { head: toRiverScreen(spine[0]!, cam), tail: toRiverScreen(spine[spine.length - 1]!, cam) };
};
/** Every value a frame draws from that runs on the clock. */
const CLOCKED = [
  escapeAt, flashAt, shockAt, triumphAt, excitedAt, xEelAt, pathAt, bonesAt, eelGlowAt, stomachAt, throbAt, dramaAt, scientistsAt, japanAt, timerAt,
  winnerAt, ratioAt, swimOffAt, greyAt, (t: number) => eelInAt(0, t), (t: number) => eelInAt(3, t),
] as const;

describe('promo short: this eel got swallowed alive and escaped (narrated)', () => {
  it('loops: the gulp, the camera, the face and every clocked value are where they started', () => {
    expect(gulpAt(0)).toBe(0);
    expect(gulpAt(END)).toBeCloseTo(gulpAt(0), 5);
    const h = 1e-3;
    expect((gulpAt(END) - gulpAt(END - h)) / h).toBeCloseTo((gulpAt(h) - gulpAt(0)) / h, 2);
    const [a, b] = [riverCamAt(END), riverCamAt(0)];
    expect(dist(a, b)).toBeLessThan(0.01);
    expect(a.zoom).toBeCloseTo(b.zoom, 5);
    expect((riverCamAt(END).zoom - riverCamAt(END - h).zoom) / h).toBeCloseTo((riverCamAt(h).zoom - riverCamAt(0).zoom) / h, 3);
    expect(xCamAt(END).zoom).toBeCloseTo(xCamAt(0).zoom, 5);
    expect(faceAt(END)).toEqual(faceAt(0));
    const [e1, e0] = [eelOnScreen(END), eelOnScreen(0)];
    expect(dist(e1.head, e0.head)).toBeLessThan(0.05);
    expect(dist(e1.tail, e0.tail)).toBeLessThan(0.05);
    for (const f of CLOCKED) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(timerSecondsAt(END)).toBe(timerSecondsAt(0));
    expect(sceneAt(END)).toEqual(sceneAt(0));
    expect(shakeAt(END)).toEqual(shakeAt(0));
    expect(creditAt(END, LOOP_S)).toBe(creditAt(0, LOOP_S));
  });

  it('never jumps: the gulp, the eels, the cameras and every value move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const q = t + FRAME;
      // The slurp as the jaws shut on "swallowed" moves fast.
      const slurp = wrap(t) > SHUT_T - 0.5 && wrap(t) < SHUT_T + 0.1 ? 2 : 1;
      if (shows('river', t) && shows('river', q)) {
        expect(Math.abs(gulpAt(q) - gulpAt(t))).toBeLessThan(0.08 * slurp);
        // The jaws snap shut in a few frames.
        expect(Math.abs(jawOf(gulpAt(q)) - jawOf(gulpAt(t)))).toBeLessThan(slurp > 1 ? 0.4 : 0.12);
        const [c0, c1] = [riverCamAt(t), riverCamAt(q)];
        expect(Math.abs(c1.zoom - c0.zoom)).toBeLessThan(0.03);
        // The quickest move is the push in to the gill on "ESCAPED!".
        expect(dist(c0, c1) * c0.zoom).toBeLessThan(25);
        if (gulpAt(t) < 1 && gulpAt(q) < 1) {
          const [e0, e1] = [eelOnScreen(t), eelOnScreen(q)];
          expect(dist(e0.head, e1.head)).toBeLessThan(60 * slurp);
          expect(dist(e0.tail, e1.tail)).toBeLessThan(80 * slurp);
        }
        expect(Math.abs(escapeAt(q) - escapeAt(t))).toBeLessThan(40);
        // (The white flash at the gill is meant to pop.)
        for (const f of [shockAt, triumphAt, excitedAt]) expect(Math.abs(f(q) - f(t))).toBeLessThan(0.35);
      }
      if (shows('xray', t) && shows('xray', q)) {
        expect(Math.abs(xEelAt(q) - xEelAt(t))).toBeLessThan(12);
        expect(Math.abs(xCamAt(q).zoom - xCamAt(t).zoom)).toBeLessThan(0.04);
        expect(dist(xCamAt(q), xCamAt(t))).toBeLessThan(12);
        for (const f of [pathAt, bonesAt, eelGlowAt, stomachAt, dramaAt, scientistsAt, japanAt, timerAt]) expect(Math.abs(f(q) - f(t))).toBeLessThan(0.35);
      }
      if (shows('odds', t) && shows('odds', q)) {
        for (let i = 0; i < 4; i++) expect(dist(oddsHeadAt(i, t), oddsHeadAt(i, q))).toBeLessThan(90);
        for (const f of [winnerAt, ratioAt, greyAt]) expect(Math.abs(f(q) - f(t))).toBeLessThan(0.35);
      }
    }
  });

  it('opens on the fish mid-gulp, its head filling the frame, the eel\'s tail whipping out of its open mouth, nothing written but the words', () => {
    expect(sceneAt(0)).toEqual({ a: 'river', b: null, mix: 0 });
    expect(jawOf(gulpAt(0))).toBeGreaterThan(0.95);
    const cam = riverCamAt(0);
    // The head runs from the snout off the right edge: well over 65% of the frame's width.
    const snout = toRiverScreen(SNOUT, cam);
    expect(VIDEO_W - snout.x).toBeGreaterThan(0.7 * VIDEO_W);
    expect(snout.y).toBeGreaterThan(350);
    expect(snout.y).toBeLessThan(1250);
    // About half the eel is still outside the lips, its tail in frame.
    const { tail } = eelOnScreen(0);
    expect(tail.x).toBeGreaterThan(0);
    expect(tail.x).toBeLessThan(snout.x);
    expect(tail.y).toBeGreaterThan(350);
    expect(tail.y).toBeLessThan(1250);
    for (const f of [japanAt, timerAt, ratioAt, scientistsAt, flashAt, winnerAt, pathAt]) expect(f(0)).toBe(0);
    expect(escapeAt(0)).toBeLessThan(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('puts each beat on screen as it is said', () => {
    // "swallowed": the jaws shut, the eel all in.
    expect(SHUT_T - said('swallowed')).toBeGreaterThan(0);
    expect(SHUT_T - said('swallowed')).toBeLessThan(0.35);
    expect(jawOf(gulpAt(SHUT_T + 0.05))).toBeLessThan(0.05);
    expect(gulpAt(SHUT_T + 0.05)).toBeGreaterThan(1);
    expect(Math.hypot(shakeAt(SHUT_T + 0.05).x, shakeAt(SHUT_T + 0.05).y)).toBeGreaterThan(5);
    // "ESCAPED!": the tail out of the gill, a flash.
    expect(escapeAt(ESCAPED_AT + 0.35)).toBeGreaterThan(150);
    expect(flashAt(ESCAPED_AT + 0.06)).toBeCloseTo(1, 6);
    expect(triumphAt(ESCAPED_AT + 0.2)).toBe(1);
    // The X-ray, the scientists, Japan, the scan, the fish, the young eels.
    expect(sceneAt(SCIENTISTS_AT).a).toBe('xray');
    expect(scientistsAt(SCIENTISTS_AT + 0.25)).toBeGreaterThan(0.9);
    expect(japanAt(JAPAN_AT + 0.2)).toBe(1);
    expect(scanAt(XRAYED_AT + 0.2)).not.toBeNull();
    expect(bonesAt(FISH_AT + 0.2)).toBe(1);
    expect(eelGlowAt(EELS_AT)).toBe(1);
    // The stomach, the stopwatch at 3:00 on "three minutes".
    expect(stomachAt(STOMACH_AT)).toBe(1);
    expect(stomachAt(INSIDE_AT - 0.2)).toBe(0);
    expect(timerAt(THREE_AT + 0.12)).toBe(1);
    expect(timerSecondsAt(THREE_AT + 0.12)).toBe(180);
    expect(timerSecondsAt(THROAT_END)).toBeLessThan(180);
    // "BACKWARDS, up the throat": the eel reverses tail first and its tail reaches the gill slit.
    expect(xEelAt(SO_AT)).toBe(X_EEL_LEN);
    expect(xEelAt(BACKWARDS_AT + 0.3)).toBeGreaterThan(X_EEL_LEN + 20);
    expect(xEelAt(THROAT_AT)).toBeLessThan(X_GILL_S);
    expect(xEelAt(THROAT_END)).toBeGreaterThan(X_GILL_S);
    expect(pathAt(BACKWARDS_AT)).toBe(1);
    // Back in colour: squeezing out, free on "GILLS".
    expect(sceneAt(SQUEEZED_AT).a).toBe('river');
    expect(escapeAt(GILLS_AT - 0.2)).toBeLessThan(EEL_LEN);
    expect(escapeAt(GILLS_AT + 0.3)).toBeGreaterThan(EEL_LEN);
    expect(flashAt(GILLS_AT + 0.06)).toBeCloseTo(1, 6);
    // One in four.
    expect(sceneAt(ABOUT_AT).a).toBe('odds');
    for (let i = 0; i < 4; i++) expect(eelInAt(i, ONE_AT)).toBe(1);
    expect(winnerAt(ONE_AT + 0.15)).toBe(1);
    expect(ratioAt(FOUR_AT + 0.1)).toBe(1);
    expect(ratioAt(FOUR_AT - 0.2)).toBe(0);
    expect(greyAt(MADE_AT + 0.5)).toBe(1);
    expect(swimOffAt(MADE_AT + 0.95)).toBe(1);
    // "So yes,": back to the gulp, the eel still outside.
    expect(sceneAt(SO_YES_AT).a).toBe('river');
    expect(gulpAt(SO_YES_AT)).toBeLessThan(0);
    expect(faceAt(said('yes,')).sly).toBeGreaterThan(0.9);
  });

  it('shows the escaping eel coming out of the gill slit tail first', () => {
    const spine = exitSpine(200, ESCAPED_AT + 0.3);
    const tail = spine[spine.length - 1]!;
    const head = spine[0]!;
    // The tail is out behind the gill cover; the head is still inside, forward of it.
    expect(tail.x).toBeGreaterThan(820);
    expect(head.x).toBeLessThan(700);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
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
    inside(TEXT.caption.y, TEXT.caption.size);
    inside(TEXT.japan.y, TEXT.japan.size);
    inside(TEXT.timer.y, TEXT.timer.size);
    inside(TEXT.ratio.y, TEXT.ratio.size, TEXT.pop);
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

const VIDEO_W = 1080;
