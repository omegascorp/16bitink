import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { beakLabels, octoDisc, parrotDisc } from '../dev/promo/octopus/beak';
import { onDogfish } from '../dev/promo/octopus/dogfish';
import { eyeBody } from '../dev/promo/octopus/eye';
import { pailBody } from '../dev/promo/octopus/keeper';
import { CAPTION_SIZE, CAPTION_Y, captionAt, dogfishLabel, dogfishLabels, LINES, SOUNDS, type Label } from '../dev/promo/octopus/script';
import { resample } from '../dev/promo/octopus/geom';
import { countAlpha, countSpot, seaAt, seaToScreen, seaZoom, WRAP_ORDER, wrapOf, wrapStart } from '../dev/promo/octopus/sea';
import {
  BEAK_AT, BITES_AT, boilAt, BOIL_STEPS, CUTS, DOGFISH_AT, EATING_AT, EIGHT_AT, flashAt, hookClock, IT_AT, LOOP_S, PARROT_AT, punchAt, said, sceneAt, SEATTLE_AT,
  shakeAt, SHARKS2_AT, SO2_AT, WRAPS_AT, wrap,
} from '../dev/promo/octopus/story';
import { SIGN, SIGN_TEXT, toScreen } from '../dev/promo/octopus/tank';
import { closeShark, GRAB, lookAt, lungeAt } from '../dev/promo/octopus/tankStory';
import { TEMPO, WORDS } from '../dev/promo/octopus/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

type Pt = { readonly x: number; readonly y: number };

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: Pt, q: Pt): number => Math.hypot(q.x - p.x, q.y - p.y);
/** The largest distance between matching points of two paths (both resampled evenly, so their point counts don't matter). */
const pathGap = (a: readonly Pt[], b: readonly Pt[]): number => {
  const [ra, rb] = [resample(a, 40), resample(b, 40)];
  return Math.max(...ra.map((p, i) => dist(p, rb[i]!)));
};
/** A sea-scene point on screen (the catch's own zoom, the slow drift in and the cut's punch, about the frame's centre). */
const seaScreen = (p: Pt, t: number): Pt => {
  const q = seaToScreen(p);
  const k = punchAt(t) * seaZoom(hookClock(t));
  return { x: 540 + (q.x - 540) * k, y: 800 + (q.y - 800) * k };
};
const isSea = (t: number): boolean => ['sea', 'count'].includes(sceneAt(t).scene);
const seaState = (t: number): ReturnType<typeof seaAt> => seaAt(wrap(t), hookClock(t), sceneAt(t).scene === 'count');
/** Which stretch of continuous picture t is in: the hook runs on across the loop point, everything else breaks at a cut. */
const shotOf = (t: number): string => {
  const { scene, from } = sceneAt(t);
  return scene === 'sea' ? 'hook' : `${scene}@${from.toFixed(3)}`;
};

/** Every piece of text on screen at t (captions, the sign, labels, the count), with its alpha. */
function textAt(t: number): Label[] {
  const out: Label[] = [];
  const cap = captionAt(t);
  if (cap) out.push({ text: cap.line.words.map((w) => w.text).join(' '), x: 540, y: CAPTION_Y, size: CAPTION_SIZE, alpha: 1 });
  const { scene } = sceneAt(t);
  if (scene === 'tank') {
    const s = lookAt(wrap(t));
    const sign = toScreen(s.cam, { x: SIGN.x, y: SIGN.y + SIGN_TEXT.dy });
    out.push({ text: 'Seattle Aquarium', x: sign.x, y: sign.y, size: SIGN_TEXT.size * s.cam.zoom, alpha: s.sign });
    out.push(...dogfishLabels(t));
  }
  if (scene === 'count') {
    const s = seaState(t);
    for (const i of WRAP_ORDER) out.push({ text: '#', ...countSpot(s, i), size: 92, alpha: countAlpha(wrap(t)) * (wrapOf(i, wrap(t)) > 0.15 ? 1 : 0) });
  }
  if (scene === 'beak') out.push(...beakLabels(wrap(t)));
  return out.filter((l) => l.alpha > 0.001);
}

describe('promo short: this octopus eats sharks (narrated)', () => {
  it('loops: the hook clock, the zoom, the octopus, the shark, every arm and every overlay are where they started', () => {
    expect(hookClock(END)).toBeCloseTo(hookClock(0), 5);
    expect(sceneAt(END).scene).toBe('sea');
    expect(sceneAt(0).scene).toBe('sea');
    const [a, b] = [seaState(END), seaState(0)];
    for (const key of ['x', 'y', 'angle', 'scale', 'lean', 'breathe', 'lid', 'flush'] as const) expect(a.body[key]).toBeCloseTo(b.body[key], 4);
    expect(dist(a.body.gaze, b.body.gaze)).toBeLessThan(1e-4);
    for (const key of ['x', 'y', 'length', 'tilt', 'effort'] as const) expect(a.shark[key]).toBeCloseTo(b.shark[key], 4);
    expect(a.shark.facing).toBe(b.shark.facing);
    expect(Math.cos(a.shark.beat - b.shark.beat)).toBeCloseTo(1, 4);
    expect(a.squeeze).toBeCloseTo(b.squeeze, 4);
    a.arms.forEach((arm, i) => {
      expect(pathGap(arm.path, b.arms[i]!.path)).toBeLessThan(0.05);
      expect(arm.front.length).toBe(b.arms[i]!.front.length);
      arm.front.forEach(([from, to], k) => {
        expect(from).toBeCloseTo(b.arms[i]!.front[k]![0], 4);
        expect(to).toBeCloseTo(b.arms[i]!.front[k]![1], 4);
      });
    });
    for (const f of [seaZoom]) expect(f(hookClock(END))).toBeCloseTo(f(hookClock(0)), 5);
    for (const f of [punchAt, flashAt, dogfishLabel]) expect(f(END)).toBeCloseTo(f(0), 5);
    expect(shakeAt(END).x).toBeCloseTo(shakeAt(0).x, 5);
    expect(shakeAt(END).y).toBeCloseTo(shakeAt(0).y, 5);
    expect(textAt(END).filter((l) => l.y !== CAPTION_Y)).toEqual([]);
    expect(textAt(0).filter((l) => l.y !== CAPTION_Y)).toEqual([]);
    expect(creditAt(END, LOOP_S)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('never jumps: within each shot everything moves on smoothly, frame to frame and across the loop point; only the planned cuts change the picture', () => {
    const cuts = new Set<string>();
    for (const t of FRAMES) {
      const u = t + FRAME;
      if (shotOf(t) !== shotOf(u)) {
        cuts.add(sceneAt(u).scene + '@' + sceneAt(u).from.toFixed(3));
        continue;
      }
      const { scene } = sceneAt(t);
      if (scene === 'sea' || scene === 'count') {
        const [p, q] = [seaState(t), seaState(u)];
        expect(dist(seaScreen(p.body, t), seaScreen(q.body, u))).toBeLessThan(12);
        expect(dist(seaScreen(p.shark, t), seaScreen(q.shark, u))).toBeLessThan(12);
        // Wrapped arms writhe a little; in the count each one swings in round the shark in 0.4 s, its long tip sweeping fast.
        const limit = scene === 'count' ? 160 : 25;
        p.arms.forEach((arm, i) => {
          const [a, b] = [arm.path.map((x) => seaScreen(x, t)), q.arms[i]!.path.map((x) => seaScreen(x, u))];
          expect(pathGap(a, b)).toBeLessThan(limit);
        });
      } else if (scene === 'tank' || scene === 'lunge') {
        const [p, q] = [scene === 'tank' ? lookAt(wrap(t)) : lungeAt(wrap(t)), scene === 'tank' ? lookAt(wrap(u)) : lungeAt(wrap(u))];
        expect(Math.abs(Math.log(q.cam.zoom / p.cam.zoom))).toBeLessThan(0.06);
        expect(dist(p.cam, q.cam) * p.cam.zoom).toBeLessThan(40);
        // The pounce: off the den and onto the shark in a third of a second, the one fast move.
        const pounce = scene === 'lunge' && Math.abs(wrap(t) - EATING_AT) < 0.35;
        expect(dist(toScreen(p.cam, p.body), toScreen(q.cam, q.body))).toBeLessThan(pounce ? 130 : 20);
        p.arms.forEach((arm, i) => expect(pathGap(arm.map((x) => toScreen(p.cam, x)), q.arms[i]!.map((x) => toScreen(q.cam, x)))).toBeLessThan(pounce ? 200 : 45));
      } else if (scene === 'eye') {
        const [p, q] = [eyeBody(wrap(t)), eyeBody(wrap(u))];
        expect(dist(p, q)).toBeLessThan(5);
        expect(dist(p.gaze, q.gaze)).toBeLessThan(0.15);
      } else if (scene === 'keeper') {
        expect(dist(pailBody(wrap(t)), pailBody(wrap(u)))).toBeLessThan(30);
      } else {
        expect(dist(octoDisc(wrap(t)), octoDisc(wrap(u)))).toBeLessThan(40);
        expect(dist(parrotDisc(wrap(t)), parrotDisc(wrap(u)))).toBeLessThan(80);
      }
    }
    // Exactly the planned cuts, and none across the loop point.
    expect([...cuts].sort()).toEqual(CUTS.slice(1).map((c) => `${c.scene}@${c.at.toFixed(3)}`).sort());
  });

  it('opens on the octopus with its arms round the shark, filling the frame, nothing written but the words', () => {
    const s = seaState(0);
    const crown = seaScreen(s.body, 0);
    const nose = seaScreen(onDogfish(s.shark, 1, 0), 0);
    const tail = seaScreen(onDogfish(s.shark, -1, 0), 0);
    expect(dist(nose, tail)).toBeGreaterThan(780);
    expect(nose.x).toBeGreaterThan(20);
    expect(crown.y).toBeGreaterThan(700);
    expect(crown.y).toBeLessThan(1000);
    // The shark sits under the crown, drawn up to the mouth through the hook.
    expect(seaScreen(s.shark, 0).y).toBeGreaterThan(crown.y);
    expect(seaState(2).shark.y).toBeLessThan(seaState(-1.2).shark.y);
    expect(s.arms.every((a) => a.path.length > 10)).toBe(true);
    expect(textAt(0).map((l) => l.text)).toEqual(['This octopus EATS']);
  });

  it('shows each beat as it is said', () => {
    expect(sceneAt(SEATTLE_AT).scene).toBe('tank');
    expect(lookAt(SEATTLE_AT + 0.3).sign).toBe(1);
    expect(dogfishLabel(DOGFISH_AT + 0.3)).toBe(1);
    const close = closeShark(DOGFISH_AT + 0.4);
    expect(close.length).toBeGreaterThan(300);
    expect(Math.abs(toScreen(lookAt(DOGFISH_AT + 0.4).cam, close).x - 540)).toBeLessThan(300);
    expect(sceneAt(said('Bad')).scene).toBe('eye');
    expect(sceneAt(EATING_AT).scene).toBe('lunge');
    // The pounce lands on the shark on "EATING"; it's wrapped and gone by the end of "sharks!".
    expect(dist(lungeAt(EATING_AT + 0.3).body, GRAB)).toBeLessThan(150);
    expect(lungeAt(EATING_AT + 0.3).caught.length).toBe(1);
    expect(lungeAt(SHARKS2_AT + 0.6).caught.length + lungeAt(SHARKS2_AT + 0.6).front.length).toBe(0);
    expect(Math.hypot(shakeAt(EATING_AT + 0.12).x, shakeAt(EATING_AT + 0.12).y)).toBeGreaterThan(5);
    expect(sceneAt(said('keepers')).scene).toBe('keeper');
    expect(pailBody(said('octopuses', 3)).lid).toBeGreaterThan(0.3);
    expect(sceneAt(said('wraps')).scene).toBe('count');
    expect(wrapStart(0)).toBeCloseTo(WRAPS_AT - 0.06, 5);
    expect(Math.abs(wrapStart(7) - EIGHT_AT)).toBeLessThan(0.1);
    for (const i of WRAP_ORDER) expect(wrapOf(i, said('arms…') + 0.35)).toBe(1);
    expect(countAlpha(IT_AT - 0.01)).toBe(0);
    expect(sceneAt(BITES_AT).scene).toBe('beak');
    expect(sceneAt(BEAK_AT).scene).toBe('beak');
    expect(parrotDisc(PARROT_AT - 0.5).x).toBeGreaterThan(1080 + 240);
    expect(parrotDisc(PARROT_AT + 0.1).x).toBeLessThan(1080 - 240);
    expect(beakLabels(PARROT_AT + 0.2).map((l) => l.alpha)).toEqual([1, 1]);
    expect(sceneAt(SO2_AT).scene).toBe('sea');
  });

  it('keeps every piece of text between y 270 and 1240', () => {
    for (const t of FRAMES) {
      for (const l of textAt(t)) {
        expect(l.y - l.size * 0.75, `"${l.text}" at ${t.toFixed(3)}`).toBeGreaterThanOrEqual(270);
        expect(l.y + l.size * 0.28, `"${l.text}" at ${t.toFixed(3)}`).toBeLessThanOrEqual(1240);
      }
    }
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.6);
    expect(said('So', 2)).toBe(SO2_AT);
  });

  it('captions every spoken word, in short lines, the spoken word highlighted', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(18);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(LOOP_S % 1.5).toBe(0);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(wrap(LOOP_S)).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeGreaterThan(0);
      expect(s.gain).toBeLessThan(0.5);
    }
  });
});
