import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { BODY_UNITS, type FishPose, gapeOf } from '../dev/promo/fringehead/fringehead';
import { CAPTION, captionAt, LINES, NAME_LABEL, QUESTION, SOUNDS } from '../dev/promo/fringehead/script';
import {
  BIGGER_AT, BOIL_STEPS, boilAt, BOTTLE_FROM, bottleAt, CLASH_FROM, CLASH_ZOOM, clashAt, clashHitAge, clashZoomAt, DART_AT, DUEL_FROM, duelAt, flashAt, GAG_FROM,
  gagAt, IMPACT, LOOP_S, MOUTHS_AT, REPEAT, said, sceneAt, type SceneId, shakeAt, SLAM_AT, SLAM_HIT, SO_AT, SOLO_FROM, soloAt, STRETCH_AT, THAT_AT, TRY_AT, wrap,
} from '../dev/promo/fringehead/story';
import { TEMPO, WORDS } from '../dev/promo/fringehead/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

/** The fish on screen at time t and the zoom they're seen through. */
function fishAt(t: number): { scene: SceneId; zoom: number; fish: FishPose[] } {
  const scene = sceneAt(t);
  if (scene === 'clash') {
    const c = clashAt(t);
    return { scene, zoom: clashZoomAt(t), fish: [c.a, c.b] };
  }
  if (scene === 'solo') {
    const s = soloAt(t);
    return { scene, zoom: s.view.zoom, fish: [s.fish] };
  }
  if (scene === 'duel') {
    const d = duelAt(t);
    return { scene, zoom: d.view.zoom, fish: [d.a, d.b] };
  }
  if (scene === 'bottle') {
    const b = bottleAt(t);
    return { scene, zoom: b.view.zoom, fish: [b.fish] };
  }
  return { scene, zoom: 1, fish: [] };
}

function expectSamePose(a: FishPose, b: FishPose): void {
  for (const key of ['x', 'y', 'len', 'tilt', 'jaw', 'press', 'puff', 'wag'] as const) expect(a[key]).toBeCloseTo(b[key], 2);
  expect(a.dir).toBe(b.dir);
  expect(a.mood).toBe(b.mood);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 4);
  const [ga, gb] = [gapeOf(a.jaw, a.press, a.puff), gapeOf(b.jaw, b.press, b.puff)];
  for (const key of ['cx', 'r', 'rx'] as const) expect(ga[key]).toBeCloseTo(gb[key], 3);
}

describe('promo short: these fish fight by comparing mouth size (narrated)', () => {
  it('loops: the scene, the camera, both fish and their gapes, and every time-driven value are where they started', () => {
    expect(sceneAt(END)).toBe('clash');
    expect(sceneAt(0)).toBe('clash');
    expect(clashZoomAt(END)).toBeCloseTo(clashZoomAt(0), 6);
    const [c1, c2] = [clashAt(END), clashAt(0)];
    expect(c1.seam).toBeCloseTo(c2.seam, 2);
    expectSamePose(c1.a, c2.a);
    expectSamePose(c1.b, c2.b);
    expect(clashHitAge(END)!).toBeCloseTo(clashHitAge(0)!, 5);
    const [s1, s2] = [shakeAt(END), shakeAt(0)];
    expect(s1.x).toBeCloseTo(s2.x, 3);
    expect(s1.y).toBeCloseTo(s2.y, 3);
    expect(flashAt(END)).toBeCloseTo(flashAt(0), 6);
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
  });

  it('never jumps: the camera and the fish move on smoothly frame to frame within each scene and across the loop point', () => {
    for (const t of FRAMES) {
      const [p, q] = [fishAt(t), fishAt(t + FRAME)];
      if (p.scene !== q.scene) continue;
      expect(Math.abs(Math.log(q.zoom / p.zoom))).toBeLessThan(0.06);
      p.fish.forEach((a, i) => {
        const b = q.fish[i]!;
        expect(dist(a, b) * p.zoom).toBeLessThan(90);
        expect(Math.abs(b.tilt - a.tilt)).toBeLessThan(0.15);
        expect(Math.abs(b.len - a.len)).toBeLessThan(10);
        expect(Math.abs(b.jaw - a.jaw)).toBeLessThan(0.5);
      });
      if (p.scene === 'gag') {
        const [g, h] = [gagAt(t), gagAt(t + FRAME)];
        expect(Math.abs(h.jaw - g.jaw)).toBeLessThan(0.5);
        expect(Math.abs(h.lean - g.lean)).toBeLessThan(0.05);
      }
    }
  });

  it('cuts to a new picture with each sentence', () => {
    const order: SceneId[] = ['clash', 'solo', 'duel', 'gag', 'bottle', 'clash'];
    const starts = [0, SOLO_FROM, DUEL_FROM, GAG_FROM, BOTTLE_FROM, CLASH_FROM];
    starts.forEach((s, i) => expect(sceneAt(s + 0.01)).toBe(order[i]));
    expect(SOLO_FROM).toBeLessThan(said('The'));
    expect(CLASH_FROM).toBeLessThan(SO_AT);
  });

  it('opens on the two gapes flared and pressed together, close up, and nothing written but the words', () => {
    const c = clashAt(0);
    for (const f of [c.a, c.b]) {
      expect(f.jaw).toBeGreaterThanOrEqual(1);
      expect(f.press).toBe(1);
    }
    expect(c.a.dir).toBe(1);
    expect(c.b.dir).toBe(-1);
    expect(clashZoomAt(0)).toBe(CLASH_ZOOM);
    // Each gape at least a quarter of the frame tall on screen: the mouths fill the picture.
    const g = gapeOf(c.a.jaw, c.a.press, c.a.puff);
    expect(((2 * g.r * c.a.len) / BODY_UNITS) * clashZoomAt(0)).toBeGreaterThan(480);
    expect(soloAt(0).label).toBe(0);
    expect(gagAt(0).ask).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('rams on the loop point and again on "MOUTHS!", with a jolt each time', () => {
    expect(IMPACT).toBeLessThan(LOOP_S);
    expect(IMPACT).toBeGreaterThan(LOOP_S - 0.3);
    expect(REPEAT - MOUTHS_AT).toBeGreaterThanOrEqual(0);
    expect(REPEAT - MOUTHS_AT).toBeLessThan(0.2);
    expect(clashAt(REPEAT - 0.2).a.press).toBe(0);
    expect(clashAt(REPEAT + 0.02).a.press).toBe(1);
    for (const t of [IMPACT + 0.05, REPEAT + 0.05]) expect(Math.hypot(shakeAt(t).x, shakeAt(t).y)).toBeGreaterThan(2);
  });

  it('flares the jaw on "stretch" and outlines the head past which it reaches', () => {
    expect(soloAt(STRETCH_AT - 0.05).fish.jaw).toBe(0);
    expect(soloAt(STRETCH_AT + 0.6).fish.jaw).toBeGreaterThan(0.95);
    expect(soloAt(said('head.')).outline).toBe(1);
    expect(soloAt(said('jaws') + 0.3).trace).toBeGreaterThan(0.5);
  });

  it('slams the mouths on "SLAM", then the bigger fish wins and the smaller backs into its shell', () => {
    const before = duelAt(SLAM_AT - 0.3);
    expect(before.seam).toBeNull();
    expect(before.tension).toBeGreaterThan(0.5);
    expect(SLAM_HIT - SLAM_AT).toBeLessThan(0.15);
    expect(duelAt(SLAM_HIT + 0.1).seam).not.toBeNull();
    expect(flashAt(SLAM_HIT + 0.02)).toBeGreaterThan(0);
    expect(Math.hypot(shakeAt(SLAM_HIT + 0.05).x, shakeAt(SLAM_HIT + 0.05).y)).toBeGreaterThan(5);
    const late = duelAt(GAG_FROM - 0.05);
    expect(late.a.len).toBeGreaterThan(late.b.len);
    expect(late.b.jaw).toBe(0);
    expect(late.home).toBe(1);
    expect(late.a.mood).toBe('smug');
    expect(duelAt(BIGGER_AT + 0.4).b.mood).toBe('worried');
  });

  it('drops both jaws on "try" and bonks them on "that."', () => {
    expect(gagAt(TRY_AT - 0.2).jaw).toBe(0);
    expect(gagAt(TRY_AT + 0.25).jaw).toBe(1);
    expect(gagAt(THAT_AT + 0.05).bonk).toBeCloseTo(0, 6);
    expect(gagAt(said('Honestly?') + 0.2).ask).toBe(1);
  });

  it('darts out of the bottle at the diver on "fights", and the diver is in the picture', () => {
    const peek = bottleAt(BOTTLE_FROM + 0.6);
    const dart = bottleAt(DART_AT + 0.2);
    expect(dart.fish.x - peek.fish.x).toBeGreaterThan(80);
    expect(dart.fish.jaw).toBeGreaterThan(0.9);
    expect(bottleAt(DART_AT).diverIn).toBe(1);
    expect(bottleAt(said('divers.')).diverIn).toBe(1);
    expect(bottleAt(said('cans,') + 0.4).canPeek).toBe(1);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.6);
    expect(said('So')).toBe(SO_AT);
  });

  it('captions every spoken word, in short lines, the spoken word highlighted', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      if (l.words.length > 1) expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(18);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
  });

  it('keeps all text between y 270 and 1240', () => {
    // Baseline text: ascenders reach about 0.8 of the size above it, descenders about 0.3 below.
    for (const t of [CAPTION, NAME_LABEL]) {
      expect(t.y - 0.8 * t.size).toBeGreaterThan(270);
      expect(t.y + 0.3 * t.size).toBeLessThan(1240);
    }
    // The "?" is centred on its y, and pops in at up to 1.05 times its size.
    expect(QUESTION.y - 0.55 * QUESTION.size).toBeGreaterThan(270);
    expect(QUESTION.y + 0.55 * QUESTION.size).toBeLessThan(1240);
  });

  it('shows the credit in the middle, never in the hook or at the seam', () => {
    expect(creditAt(SLAM_HIT, LOOP_S)).toBeGreaterThan(0);
    expect(creditAt(END, LOOP_S)).toBe(0);
    expect(creditAt(2, LOOP_S)).toBe(0);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(wrap(LOOP_S)).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t + (s.dur ?? 0)).toBeLessThan(LOOP_S);
    }
  });
});
