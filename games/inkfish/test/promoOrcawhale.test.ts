import { describe, expect, it } from 'vitest';
import { chaseWhaleAt, SIZE_BAR_Y } from '../dev/promo/orcawhale/chase';
import { jawTipOf, MOUTH_CORNER, mouthOf, SNOUT_TIP } from '../dev/promo/orcawhale/blueWhale';
import { mawCamAt, onWhale, ORCA_LEN, orcaAt, snoutOf, toMawScreen } from '../dev/promo/orcawhale/maw';
import { captionAt, LINES, MOANS, SOUNDS, TEXT, WHISTLES } from '../dev/promo/orcawhale/script';
import { liftAt, smugZoomAt } from '../dev/promo/orcawhale/smug';
import {
  AUSTRALIA_AT, boatAt, boilAt, browAt, clockAt, clockShowAt, diveAt, EARTH_AT, earthAt, flashAt, gapeAt, HEAD_AT, HEAD_END, HOUR_END, HOUR_FOR_AT, huhAt,
  hushAt, KILL_AT, killAt, LOOP_S, mawZoomAt, placeAt, POD_AT, PREY_AT, SAW_AT, sceneAt, shakeAt, SIXTY_AT, sizeBarAt, SO_AT, tailPhaseAt, THEN_AT,
  TONGUE2_AT, TONGUE_AT, tongueGlowAt, tonguePushAt, wrap,
} from '../dev/promo/orcawhale/story';
import { TEMPO, WORDS } from '../dev/promo/orcawhale/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
type P = { readonly x: number; readonly y: number };
const dist = (p: P, q: P): number => Math.hypot(q.x - p.x, q.y - p.y);
/** The orca's middle and snout on screen. */
const orcaOnScreen = (t: number): P => toMawScreen(orcaAt(t), t);
const snoutOnScreen = (t: number): P => toMawScreen(snoutOf(orcaAt(t)), t);
const mouthOnScreen = (t: number): P[] => mouthOf(gapeAt(t)).map((p) => toMawScreen(onWhale(p), t));
function inside(p: P, poly: readonly P[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}
/** Every value a frame draws from that runs on the clock. */
const CLOCKED = [
  diveAt, gapeAt, mawZoomAt, hushAt, tonguePushAt, tongueGlowAt, placeAt, sizeBarAt, clockAt, clockShowAt, killAt, boatAt, flashAt, tailPhaseAt,
  earthAt, browAt, huhAt, liftAt, smugZoomAt,
] as const;
const onScreen = (t: number, id: string): boolean => [sceneAt(t), sceneAt(t + FRAME)].some((n) => n.a === id || n.b === id);

describe('promo short: an orca swam inside a blue whale\'s mouth (narrated)', () => {
  it('loops: the orca, the jaw, the camera and every clocked value are where they started', () => {
    for (const f of CLOCKED) expect(f(END)).toBeCloseTo(f(0), 4);
    const h = 1e-3;
    expect((diveAt(END) - diveAt(END - h)) / h).toBeCloseTo((diveAt(h) - diveAt(0)) / h, 2);
    expect((mawZoomAt(END) - mawZoomAt(END - h)) / h).toBeCloseTo((mawZoomAt(h) - mawZoomAt(0)) / h, 2);
    expect(dist(orcaOnScreen(END), orcaOnScreen(0))).toBeLessThan(0.05);
    expect(orcaAt(END).angle).toBeCloseTo(orcaAt(0).angle, 4);
    expect(dist(mawCamAt(END).focus, mawCamAt(0).focus)).toBeLessThan(0.01);
    expect(sceneAt(END)).toEqual(sceneAt(0));
    expect(shakeAt(END)).toEqual(shakeAt(0));
    expect(creditAt(END, LOOP_S)).toBe(creditAt(0, LOOP_S));
  });

  it('never jumps: the orca, the jaw, the camera and the chase move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const q = t + FRAME;
      if (onScreen(t, 'maw')) {
        expect(dist(orcaOnScreen(t), orcaOnScreen(q))).toBeLessThan(40);
        expect(dist(snoutOnScreen(t), snoutOnScreen(q))).toBeLessThan(40);
        expect(Math.abs(gapeAt(q) - gapeAt(t))).toBeLessThan(0.02);
        expect(Math.abs(mawZoomAt(q) - mawZoomAt(t))).toBeLessThan(0.03);
        expect(dist(mawCamAt(t).focus, mawCamAt(q).focus)).toBeLessThan(25);
      }
      if (onScreen(t, 'chase')) {
        const [a, b] = [chaseWhaleAt(t), chaseWhaleAt(q)];
        expect(dist(a, b)).toBeLessThan(12);
        expect(Math.abs(a.angle - b.angle)).toBeLessThan(0.03);
        expect(Math.abs(a.tail - b.tail)).toBeLessThan(0.2);
      }
      for (const f of [placeAt, sizeBarAt, clockShowAt, boatAt, earthAt, huhAt, hushAt, tongueGlowAt]) expect(Math.abs(f(q) - f(t))).toBeLessThan(0.35);
    }
  });

  it('opens on the orca half inside the whale\'s gaping mouth, big in the frame, nothing written but the words', () => {
    expect(sceneAt(0)).toEqual({ a: 'maw', b: null, mix: 0 });
    expect(diveAt(0)).toBe(0);
    expect(gapeAt(0)).toBeGreaterThan(0.7);
    const mouth = mouthOnScreen(0);
    const xs = mouth.map((p) => p.x);
    const ys = mouth.map((p) => p.y);
    // The open mouth fills about three quarters of the width, between y 350 and 1250.
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.65 * 1080);
    expect(Math.min(...ys)).toBeGreaterThan(330);
    expect(Math.max(...ys)).toBeLessThan(1260);
    // The orca: its head past the mouth's open front (in the mouth, its snout behind the throat), its tail out in the water, in frame.
    const [a, b] = [toMawScreen(onWhale(SNOUT_TIP), 0), toMawScreen(onWhale(jawTipOf(gapeAt(0))), 0)];
    /** Which side of the open front a point is on: < 0 in the mouth, > 0 out in the water. */
    const cross = (p: P): number => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    const throat = toMawScreen(onWhale(MOUTH_CORNER), 0);
    const side = (p: P): number => -cross(p) * Math.sign(cross(throat));
    expect(side(snoutOnScreen(0))).toBeLessThan(0);
    const along = (k: number): P => toMawScreen({ x: orcaAt(0).x + Math.cos(orcaAt(0).angle) * ORCA_LEN * k, y: orcaAt(0).y + Math.sin(orcaAt(0).angle) * ORCA_LEN * k }, 0);
    expect(inside(along(0.25), mouth)).toBe(true);
    const tail = along(-0.45);
    expect(inside(tail, mouth)).toBe(false);
    expect(side(tail)).toBeGreaterThan(0);
    expect(tail.x).toBeLessThan(1080);
    const mid = orcaOnScreen(0);
    expect(mid.y).toBeGreaterThan(350);
    expect(mid.y).toBeLessThan(1250);
    for (const f of [placeAt, sizeBarAt, clockShowAt, boatAt, earthAt, huhAt, hushAt, tongueGlowAt]) expect(f(0)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('puts each beat on screen as it is said', () => {
    expect(diveAt(2.5)).toBeGreaterThan(diveAt(0.5));
    expect(sceneAt(AUSTRALIA_AT).a).toBe('surface');
    expect(placeAt(AUSTRALIA_AT + 0.2)).toBe(1);
    expect(sceneAt(POD_AT).a).toBe('chase');
    expect(sizeBarAt(SIXTY_AT - 0.15)).toBe(0);
    expect(sizeBarAt(SIXTY_AT + 0.2)).toBe(1);
    expect(clockShowAt(HOUR_FOR_AT + 0.1)).toBe(1);
    expect(clockAt(HOUR_END + 0.2)).toBe(1);
    expect(flashAt(SAW_AT + 0.1)).toBeGreaterThan(0.5);
    expect(boatAt(SAW_AT)).toBe(1);
    expect(killAt(KILL_AT - 0.1)).toBe(0);
    expect(killAt(KILL_AT + 0.8)).toBe(1);
    expect(Math.hypot(shakeAt(KILL_AT + 0.05).x, shakeAt(KILL_AT + 0.05).y)).toBeGreaterThan(5);
    expect(chaseWhaleAt(KILL_AT + 0.8).y - chaseWhaleAt(KILL_AT - 0.2).y).toBeGreaterThan(100);
    expect(sceneAt(THEN_AT).a).toBe('maw');
    expect(diveAt(THEN_AT)).toBeLessThan(-0.6);
    expect(hushAt(THEN_AT)).toBeGreaterThan(0.9);
    expect(diveAt(HEAD_AT)).toBeGreaterThan(-0.2);
    expect(diveAt(HEAD_END)).toBeGreaterThan(0.1);
    expect(sceneAt(TONGUE_AT).a).toBe('maw');
    expect(tongueGlowAt(TONGUE_AT + 0.2)).toBe(1);
    expect(tonguePushAt(TONGUE_AT + 0.5)).toBe(1);
    expect(sceneAt(PREY_AT).a).toBe('prey');
    expect(earthAt(EARTH_AT + 0.15)).toBe(1);
    expect(sceneAt(TONGUE2_AT).a).toBe('smug');
    expect(huhAt(TONGUE2_AT + 0.2)).toBe(1);
    expect(browAt(TONGUE2_AT)).toBe(1);
    expect(sceneAt(SO_AT + 0.05).a).toBe('maw');
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
    const within = (y: number, size: number, pop = 1): void => {
      expect(y - 0.8 * size * pop).toBeGreaterThanOrEqual(270);
      expect(y + 0.3 * size * pop).toBeLessThanOrEqual(1250);
    };
    for (const k of ['caption', 'place', 'sizeFt', 'sizeM'] as const) within(TEXT[k].y, TEXT[k].size, k === 'place' ? 1.15 : 1);
    within(TEXT.huh.y, TEXT.huh.size, TEXT.huhPop);
    expect(SIZE_BAR_Y).toBeLessThan(TEXT.sizeFt.y - 0.8 * TEXT.sizeFt.size);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(wrap(LOOP_S)).toBe(0);
    for (const at of [...SOUNDS.map((s) => s.t), ...MOANS.map((m) => m[0]), ...WHISTLES.map((w) => w[0])]) {
      expect(at).toBeGreaterThanOrEqual(0);
      expect(at).toBeLessThan(LOOP_S);
    }
  });
});
