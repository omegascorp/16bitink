import { describe, expect, it } from 'vitest';
import { PEOPLE_LAYOUT } from '../dev/promo/conesnail/props';
import { captionAt, insulinLabel, LINES, SOUNDS, TEXT } from '../dev/promo/conesnail/script';
import { bellOf, SHELL } from '../dev/promo/conesnail/shape';
import {
  A_AT, AND_AT, ANYTHING_AT, AWAY_AT, BECAUSE_AT, bellAt, boilAt, cameraAt, CHASE_AT, cloudAt, CONE_AT, CUT_HOOK, cycles, DOZEN_AT, dotsAt, eyesAt, FISH2_AT,
  fishAt, flashAt, GOES_AT, H_SEAM, handAt, harpoonAt, hookTime, IN_AT, INSULIN_AT, ITS_AT, LOOP_S, moodAt, MOUTH_AT, NET_AT, NO_AT, PEOPLE_AT, PET_SPOT,
  peopleAt, POURS_AT, rostrumAt, said, shakeAt, shotAt, sleepAt, SLEEPY_AT, snailAt, SNAIL_AT, SO_AT, SO2_AT, STING_AT, THEN_AT, THREE_AT, toScreen, tryAt,
  WATER_AT, WHOLE_AT, wrap, zedsAt, zipAt,
} from '../dev/promo/conesnail/story';
import { TEMPO, WORDS } from '../dev/promo/conesnail/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);
const nemo = (t: number): ReturnType<typeof fishAt>[number] | undefined => fishAt(t).find((f) => f.id === 'nemo');
/** Every number a frame draws from that runs on the clock. */
const CLOCKED: readonly ((t: number) => number)[] = [
  (t) => cameraAt(t).x, (t) => cameraAt(t).y, (t) => cameraAt(t).zoom,
  (t) => rostrumAt(t).open, (t) => rostrumAt(t).spread, (t) => rostrumAt(t).pucker, (t) => rostrumAt(t).heading, (t) => rostrumAt(t).wall, (t) => rostrumAt(t).mesh,
  (t) => eyesAt(t).lid, (t) => eyesAt(t).slant, (t) => eyesAt(t).look.x, (t) => eyesAt(t).look.y, (t) => eyesAt(t).stalk,
  (t) => nemo(t)!.x, (t) => nemo(t)!.y, (t) => nemo(t)!.tilt, (t) => nemo(t)!.bell!.inside, (t) => nemo(t)!.bell!.seen, (t) => nemo(t)!.wide,
  (t) => shakeAt(t).x, (t) => shakeAt(t).y, flashAt, cloudAt, insulinLabel, sleepAt, tryAt, (t) => snailAt(t).x,
  (t) => dotsAt(t).reduce((s, v) => s + v, 0), (t) => peopleAt(t).flat().reduce((s, v) => s + v, 0),
  (t) => moodAt(t).u, (t) => creditAt(t, LOOP_S),
];

describe('promo short: this snail swallows fish whole (narrated)', () => {
  it('loops: the hook clock, the funnel, the fish and every clocked value are where they started', () => {
    expect(hookTime(0)).toBeCloseTo(H_SEAM, 9);
    expect(hookTime(END)).toBeCloseTo(H_SEAM, 5);
    expect(shotAt(END)).toBe(shotAt(0));
    expect(moodAt(END).to).toBe(moodAt(0).to);
    for (const f of CLOCKED) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(dist(bellAt(END).centre, bellAt(0).centre)).toBeLessThan(0.01);
    expect(harpoonAt(END)).toBeNull();
    expect(handAt(END)).toBeNull();
    expect(zedsAt(END)).toEqual(zedsAt(0));
  });

  it('never jumps within a shot: the camera, the funnel and the fish move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const q = t + FRAME;
      if (shotAt(t) !== shotAt(q)) continue;
      const [a, b] = [cameraAt(t), cameraAt(q)];
      expect(Math.abs(b.zoom - a.zoom)).toBeLessThan(0.02);
      expect(dist(a, b) * a.zoom).toBeLessThan(30);
      expect(dist(toScreen(a, bellAt(t).centre), toScreen(b, bellAt(q).centre))).toBeLessThan(90);
      const [r, s] = [rostrumAt(t), rostrumAt(q)];
      expect(Math.abs(s.open - r.open)).toBeLessThan(0.18);
      expect(Math.abs(s.pucker - r.pucker)).toBeLessThan(0.3);
      expect(Math.abs(s.heading - r.heading)).toBeLessThan(0.05);
      for (const f of fishAt(t)) {
        const g = fishAt(q).find((x) => x.id === f.id);
        if (!g) continue;
        // The wrasse zips past with speed lines; everyone else moves less than 90 px a frame.
        expect(dist(toScreen(a, f), toScreen(b, g))).toBeLessThan(f.id === 'zip' ? 130 : 90);
        expect(Math.abs(g.tilt - f.tilt)).toBeLessThan(0.2);
      }
      for (const fn of [cloudAt, insulinLabel, sleepAt, tryAt]) expect(Math.abs(fn(q) - fn(t))).toBeLessThan(0.35);
      const [e, k] = [eyesAt(t), eyesAt(q)];
      expect(Math.abs(k.lid - e.lid)).toBeLessThan(0.2);
    }
  });

  it('opens on the funnel-mouth stretched round a clownfish halfway in, eyes wide, big in the frame, nothing written but the words', () => {
    expect(shotAt(0)).toBe('hook');
    const f = nemo(0)!;
    expect(f.shape).toBe('clownfish');
    expect(f.bell!.inside).toBeGreaterThan(0.35);
    expect(f.bell!.inside).toBeLessThan(0.6);
    expect(f.bell!.seen).toBe(1);
    expect(f.wide).toBe(1);
    const cam = cameraAt(0);
    const bell = bellAt(0);
    // The rim hugs the fish: lips stretched round it, not a wide net.
    expect(bell.rim).toBeLessThan(0.45 * f.length);
    expect(bell.rim).toBeGreaterThan(0.33 * f.length);
    // From the shell's front on the left to the fish's head: at least 65% of the width, all in frame.
    const head = toScreen(cam, { x: f.x + Math.cos(f.tilt) * f.length * 0.5, y: f.y - Math.sin(f.tilt) * f.length * 0.5 });
    const shellFront = Math.max(0, toScreen(cam, { x: SHELL.apex, y: 0 }).x);
    expect(head.x - shellFront).toBeGreaterThan(0.65 * 1080);
    expect(head.x).toBeLessThan(1080);
    expect(head.y).toBeGreaterThan(350);
    const rim = toScreen(cam, bell.centre);
    expect(rim.y).toBeGreaterThan(350);
    expect(rim.y).toBeLessThan(1250);
    expect(toScreen(cam, { x: 0, y: 118 }).y).toBeLessThan(1250);
    expect(insulinLabel(0)).toBe(0);
    expect(peopleAt(0).flat().every((v) => v === 0)).toBe(true);
    expect(dotsAt(0)).toEqual([0, 0, 0]);
    expect(harpoonAt(0)).toBeNull();
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('slurps the fish in on "WHOLE.", closes the rim and sinks the lump before the cut', () => {
    expect(nemo(WHOLE_AT - 0.1)!.bell!.inside).toBeLessThan(0.75);
    expect(nemo(WHOLE_AT + 0.35)!.bell!.inside).toBeGreaterThan(1);
    expect(rostrumAt(WHOLE_AT + 0.4).pucker).toBeGreaterThan(0.9);
    expect(nemo(WHOLE_AT + 0.7)!.bell!.seen).toBe(0);
    expect(rostrumAt(A_AT - 0.15).open).toBeLessThan(0.1);
    expect(flashAt(WHOLE_AT + 0.17)).toBeGreaterThan(0.1);
  });

  it('puts each noun on screen as it is said', () => {
    expect(shotAt(SNAIL_AT)).toBe('hook');
    expect(shotAt(CONE_AT)).toBe('crawl');
    expect(zipAt(CHASE_AT)).not.toBeNull();
    expect(Math.abs(zipAt(CHASE_AT)!.x - snailAt(CHASE_AT).x)).toBeLessThan(400);
    expect(dotsAt(ANYTHING_AT - 0.05)).toEqual([0, 0, 0]);
    expect(dotsAt(ANYTHING_AT + 0.52)).toEqual([1, 1, 1]);
    expect(shotAt(SO_AT)).toBe('cloud');
    expect(cloudAt(POURS_AT + 0.4)).toBeGreaterThan(0.9);
    expect(insulinLabel(INSULIN_AT + 0.25)).toBe(1);
    expect(cloudAt(WATER_AT)).toBeGreaterThan(0.9);
    expect(shotAt(FISH2_AT)).toBe('drowsy');
    expect(fishAt(FISH2_AT).length).toBe(3);
    expect(sleepAt(SLEEPY_AT + 0.5)).toBeGreaterThan(0.8);
    expect(zedsAt(SLEEPY_AT + 0.6).length).toBeGreaterThan(0);
    expect(tryAt(AWAY_AT)).toBe(1);
    expect(shotAt(THEN_AT)).toBe('net');
    expect(rostrumAt(MOUTH_AT - 0.1).open).toBeLessThan(0.15);
    expect(rostrumAt(NET_AT + 0.1).open).toBeGreaterThan(0.95);
    expect(rostrumAt(NET_AT + 0.25).mesh).toBeGreaterThan(0.9);
    expect(nemo(GOES_AT + 0.1)!.wide).toBe(1);
    expect(nemo(GOES_AT + 0.1)!.bell).not.toBeNull();
    expect(nemo(IN_AT + 0.15)!.bell!.inside).toBeGreaterThan(1);
    expect(flashAt(IN_AT + 0.06)).toBeGreaterThan(0.3);
    expect(shotAt(ITS_AT)).toBe('sting');
    expect(harpoonAt(STING_AT - 0.05)).toBeNull();
    expect(harpoonAt(STING_AT + 0.15)!.len).toBeGreaterThan(150);
    expect(peopleAt(THREE_AT + 0.4)[0]!.every((v) => v === 1)).toBe(true);
    expect(peopleAt(PEOPLE_AT).flat().every((v) => v === 1)).toBe(true);
    expect(peopleAt(PEOPLE_AT).flat().length).toBe(36);
    expect(shotAt(SO2_AT)).toBe('pet');
    expect(handAt(SO2_AT + 0.2)).not.toBeNull();
    expect(dist(handAt(NO_AT - 0.02)!.tip, PET_SPOT)).toBeLessThan(60);
    expect(harpoonAt(NO_AT)).not.toBeNull();
    expect(handAt(NO_AT + 0.3) === null || dist(handAt(NO_AT + 0.3)!.tip, PET_SPOT) > 700).toBe(true);
    expect(shotAt(BECAUSE_AT)).toBe('hook');
    expect(CUT_HOOK).toBeLessThan(BECAUSE_AT);
  });

  it('changes the mood on every sentence', () => {
    const starts = [said('This'), A_AT, SO_AT, AND_AT, THEN_AT, GOES_AT, ITS_AT, SO2_AT, BECAUSE_AT].map((t) => t + 0.6);
    const moods = starts.map((t) => moodAt(t).to);
    for (let i = 1; i < moods.length - 1; i++) expect(moods[i]).not.toBe(moods[i - 1]);
    expect(moods[moods.length - 1]).toBe(moods[0]);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('Because');
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

  it('keeps every line of text, the "z"s and the little people between y 270 and 1250', () => {
    const inside = (y: number, size: number): void => {
      expect(y - 0.8 * size).toBeGreaterThanOrEqual(270);
      expect(y + 0.3 * size).toBeLessThanOrEqual(1250);
    };
    inside(TEXT.caption.y, TEXT.caption.size);
    inside(TEXT.insulin.y, TEXT.insulin.size);
    for (const t of FRAMES) {
      const cam = cameraAt(t);
      for (const z of zedsAt(t)) {
        if (z.alpha <= 0.01) continue;
        const p = toScreen(cam, z);
        inside(p.y, z.size * cam.zoom);
        expect(p.x).toBeGreaterThan(20);
        expect(p.x).toBeLessThan(1060);
      }
    }
    for (const y of PEOPLE_LAYOUT.rows) {
      expect(y - PEOPLE_LAYOUT.height).toBeGreaterThanOrEqual(270);
      expect(y).toBeLessThanOrEqual(1250);
    }
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(wrap(LOOP_S)).toBe(0);
    expect(Math.sin(cycles(7, LOOP_S))).toBeCloseTo(Math.sin(cycles(7, 0)), 9);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    // The tucked mouth is small; the net is wide.
    expect(bellOf({ heading: 0, open: 0, spread: 1, pucker: 0 }).rim).toBeLessThan(20);
    expect(bellOf({ heading: 0, open: 1, spread: 1, pucker: 0 }).rim).toBeGreaterThan(150);
  });
});
