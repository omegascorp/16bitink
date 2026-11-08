import { describe, expect, it } from 'vitest';
import { barryAt, tagPlacement, tankCamAt, roomToScreen } from '../dev/promo/bobbit/barry';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/bobbit/script';
import {
  AND_AT, BARRY_AT, FRAME1_JAW, fishPanicAt, barAt, barLabelAt, boilAt, BRUSHES_AT, coralFallAt, DARK_AT, darkAt, diverAt, eerieAt, ENGLISH_AT, FEELERS_AT, FEET_AT, FISH2_AT, flagAt,
  flashAt, FLIPS, GONE_AT, HALF_AT, HID_AT, HOLE, JAWS2_AT, KNOWS_AT, laughAt, LOOP_S, lungeAt, LURK_SNAP_T, lurkCamAt, lurkFishAt, lurkWormAt, MONTHS_AT,
  MONTHS_END, ONE_AT, pagesAt, peekAt, REACH, revealAt, SAND_AT, sceneAt, settleAt, shakeAt, sinkAt, SNAP_T, STRIKE_CAM, strikeClock, STRIKE_FISH_LEN,
  strikeFishAt, strikeWormAt, tagAt, tankZoomAt, TEN_AT, tensionAt, THEY_AT, toScreen, twitchAt, UP_AT, waveAt, WITH_AT, wrap,
} from '../dev/promo/bobbit/story';
import { TEMPO, WORDS } from '../dev/promo/bobbit/words';
import { jawExtent, jawTips } from '../dev/promo/bobbit/worm';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);
const strikeWorm = (t: number): ReturnType<typeof strikeWormAt> => strikeWormAt(strikeClock(t), t);
const strikeFish = (t: number): ReturnType<typeof strikeFishAt> => strikeFishAt(strikeClock(t), t);
const onStrike = (p: { x: number; y: number }): { x: number; y: number } => toScreen(STRIKE_CAM, p);
/** Every value a frame draws from that runs on the clock. */
const CLOCKED = [
  flashAt, tensionAt, eerieAt, darkAt, twitchAt, lungeAt, sinkAt, revealAt, barAt, barLabelAt, diverAt, tankZoomAt, pagesAt, flagAt, coralFallAt, peekAt, tagAt,
  laughAt, waveAt, settleAt,
] as const;
const visible = (t: number, id: string): boolean => [sceneAt(t), sceneAt(t + FRAME)].some((n) => n.a === id || (n.b === id && n.mix > 0));

describe('promo short: this worm\'s jaws can slice a fish in half (narrated)', () => {
  it('loops: the strike clock, the worm, the fish and every clocked value are where they started', () => {
    expect(strikeClock(0)).toBe(0);
    expect(strikeClock(END)).toBeCloseTo(strikeClock(0), 5);
    const h = 1e-3;
    expect((strikeClock(END) - strikeClock(END - h)) / h).toBeCloseTo((strikeClock(h) - strikeClock(0)) / h, 2);
    const [a, b] = [strikeWorm(END), strikeWorm(0)];
    expect(dist(a.head, b.head)).toBeLessThan(0.01);
    expect(a.jaw).toBeCloseTo(b.jaw, 4);
    expect(a.axis).toBeCloseTo(b.axis, 4);
    const [f1, f2] = [strikeFish(END)!, strikeFish(0)!];
    expect(dist(f1, f2)).toBeLessThan(0.05);
    expect(f1.tilt).toBeCloseTo(f2.tilt, 4);
    for (const f of CLOCKED) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(sceneAt(END)).toEqual(sceneAt(0));
    expect(shakeAt(END)).toEqual(shakeAt(0));
    expect(creditAt(END, LOOP_S)).toBe(creditAt(0, LOOP_S));
  });

  it('never jumps: the worm, the fish and every value move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const q = t + FRAME;
      if (visible(t, 'strike')) {
        // The snap shuts the jaws in a few frames; otherwise they ease.
        const snap = Math.abs(wrap(t) - SNAP_T) < 0.2 ? 0.7 : 0.12;
        expect(Math.abs(strikeWorm(q).jaw - strikeWorm(t).jaw)).toBeLessThan(snap);
        expect(dist(onStrike(strikeWorm(t).head), onStrike(strikeWorm(q).head))).toBeLessThan(60);
        const [f, g] = [strikeFish(t), strikeFish(q)];
        if (f && g) expect(dist(onStrike(f), onStrike(g))).toBeLessThan(25);
      }
      if (visible(t, 'lurk')) {
        // The lunge and the yank down are quick; the lurk is still.
        const fast = wrap(t) > LURK_SNAP_T - 0.25 && wrap(t) < GONE_AT + 0.5;
        const px = fast ? 140 : 25;
        const [a, b] = [lurkWormAt(t), lurkWormAt(q)];
        expect(dist(toScreen(lurkCamAt(t), a.head), toScreen(lurkCamAt(q), b.head))).toBeLessThan(px);
        expect(Math.abs(b.jaw - a.jaw)).toBeLessThan(fast ? 0.75 : 0.1);
        const [f, g] = [lurkFishAt(t), lurkFishAt(q)];
        if (f && g) expect(dist(f, g)).toBeLessThan(fast ? 160 : 45);
        expect(Math.abs(lurkCamAt(q).zoom - lurkCamAt(t).zoom)).toBeLessThan(0.05);
      }
      const pages = (u: number): number => pagesAt(u) / FLIPS;
      for (const f of [tensionAt, eerieAt, darkAt, twitchAt, revealAt, barAt, barLabelAt, diverAt, flagAt, coralFallAt, peekAt, tagAt, laughAt, waveAt, pages]) {
        expect(Math.abs(f(q) - f(t))).toBeLessThan(0.4);
      }
      if (visible(t, 'tank')) expect(Math.abs(tankZoomAt(q) - tankZoomAt(t)) / tankZoomAt(t)).toBeLessThan(0.2);
    }
  });

  it('opens close on the head: the claws slammed round a panicked fish, tips on its back and belly, nothing written but the words', () => {
    expect(sceneAt(0)).toEqual({ a: 'strike', b: null, mix: 0 });
    const w = strikeWorm(0);
    expect(w.jaw).toBeCloseTo(FRAME1_JAW, 3);
    // The claws span about 85% of the width, between y 450 and 1150.
    const ext = jawExtent(w);
    const left = onStrike({ x: ext.left, y: 0 }).x;
    const right = onStrike({ x: ext.right, y: 0 }).x;
    expect(right - left).toBeGreaterThan(0.83 * 1080);
    expect(left).toBeGreaterThan(0);
    expect(right).toBeLessThan(1080);
    expect(onStrike({ x: 0, y: ext.top }).y).toBeGreaterThan(450);
    const head = onStrike(w.head);
    expect(head.y).toBeLessThan(1150);
    expect(head.y).toBeGreaterThan(950);
    // Only the top of the body shows, rising out of the sand at the bottom.
    expect(onStrike(HOLE).y).toBeGreaterThan(1250);
    expect(onStrike(HOLE).y).toBeLessThan(1450);
    expect(HOLE.y - w.head.y).toBeLessThan(0.3 * REACH);
    expect(strikeWorm(0.3).head.y).toBeLessThan(w.head.y);
    // The fish between the claws' tips, which press on its sides; it's panicking, and small beside the jaws.
    const f = strikeFish(0)!;
    const fs = onStrike(f);
    const fishLen = STRIKE_FISH_LEN * STRIKE_CAM.zoom;
    const tips = jawTips(w);
    const [l, r] = [onStrike(tips.left), onStrike(tips.right)];
    expect(l.x).toBeLessThan(fs.x);
    expect(r.x).toBeGreaterThan(fs.x);
    for (const p of [l, r]) {
      expect(Math.abs(p.x - fs.x)).toBeLessThan(0.3 * fishLen);
      expect(Math.abs(p.y - fs.y)).toBeLessThan(0.35 * fishLen);
    }
    expect(fs.y).toBeLessThan(head.y);
    expect(fishPanicAt(strikeClock(0))).toBe(1);
    expect(f.tilt).toBeGreaterThan(0.9);
    expect(fishLen).toBeLessThan(0.4 * (right - left));
    for (const g of [barAt, barLabelAt, diverAt, tagAt, flagAt, pagesAt, flashAt, tensionAt, eerieAt, darkAt]) expect(g(0)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('snaps the jaws shut on "HALF", with a jolt and a flash; the fish is gone, never cut', () => {
    expect(SNAP_T - HALF_AT).toBeGreaterThan(0);
    expect(SNAP_T - HALF_AT).toBeLessThan(0.2);
    expect(strikeWorm(SNAP_T - 0.3).jaw).toBeGreaterThan(0.2);
    expect(strikeWorm(SNAP_T + 0.02).jaw).toBeLessThan(0.05);
    expect(strikeFish(SNAP_T - 0.3)).not.toBeNull();
    expect(strikeFish(SNAP_T)).toBeNull();
    expect(Math.hypot(shakeAt(SNAP_T + 0.05).x, shakeAt(SNAP_T + 0.05).y)).toBeGreaterThan(5);
    expect(flashAt(SNAP_T)).toBeGreaterThan(0.4);
  });

  it('puts each beat on screen as it is said', () => {
    // "Up to ten feet of worm hides in the sand": the cut-away, the bar on "ten", the diver.
    expect(sceneAt(UP_AT + 0.05).a).toBe('burrow');
    expect(barAt(TEN_AT - 0.1)).toBe(0);
    expect(barAt(FEET_AT + 0.2)).toBe(1);
    expect(barLabelAt(FEET_AT + 0.1)).toBe(1);
    expect(diverAt(FEET_AT + 0.2)).toBe(1);
    expect(revealAt(TEN_AT + 0.2)).toBe(1);
    expect(sceneAt(SAND_AT).a).toBe('burrow');
    // "with only its jaws showing…": back above, the head just out of the hole.
    expect(sceneAt(JAWS2_AT).a).toBe('lurk');
    const lurk = lurkWormAt(JAWS2_AT);
    expect(lurk.head.y).toBeLessThan(HOLE.y);
    expect(HOLE.y - lurk.head.y).toBeLessThan(0.2 * REACH);
    // "a fish brushes its feelers…": the fish is in, the antennae twitch.
    const fish = lurkFishAt(FISH2_AT)!;
    expect(toScreen(lurkCamAt(FISH2_AT), fish).x).toBeGreaterThan(60);
    expect(twitchAt(FEELERS_AT)).toBe(1);
    expect(lurkFishAt(BRUSHES_AT + 0.2)!.x).toBeGreaterThan(280);
    // "SNAP!": the jaws shut on it in a flash; it's gone.
    expect(lungeAt(LURK_SNAP_T)).toBeGreaterThan(0.9);
    expect(lurkWormAt(LURK_SNAP_T + 0.01).jaw).toBeLessThan(0.05);
    expect(flashAt(LURK_SNAP_T)).toBeGreaterThan(0.8);
    expect(lurkFishAt(LURK_SNAP_T)).toBeNull();
    // "Gone, down into the dark.": under the sand, the dark closing in.
    expect(lurkWormAt(GONE_AT + 0.5).head.y).toBeGreaterThan(HOLE.y);
    expect(eerieAt(GONE_AT + 0.5)).toBe(1);
    expect(darkAt(DARK_AT + 0.3)).toBeGreaterThan(0.4);
    // The aquarium: a toppled coral on "hid", the flag on "English", the calendar on "MONTHS".
    expect(sceneAt(ONE_AT).a).toBe('tank');
    expect(coralFallAt(HID_AT - 0.05)).toBe(0);
    expect(coralFallAt(HID_AT + 0.35)).toBe(1);
    expect(flagAt(ENGLISH_AT + 0.25)).toBe(1);
    expect(pagesAt(MONTHS_AT)).toBeGreaterThan(0);
    expect(pagesAt(MONTHS_END + 0.3)).toBe(FLIPS);
    // "They named him Barry.": he peeks out with his tag; laughter.
    expect(tankZoomAt(THEY_AT - 0.1)).toBeCloseTo(1, 3);
    expect(tankZoomAt(BARRY_AT)).toBeGreaterThan(2.3);
    expect(peekAt(BARRY_AT)).toBe(1);
    expect(tagAt(BARRY_AT + 0.15)).toBe(1);
    expect(laughAt(BARRY_AT + 0.2)).toBe(1);
    expect(barryAt(BARRY_AT).head.y).toBeLessThan(barryAt(HID_AT + 0.5).head.y);
    // "And Barry knows:": back in the dark, the worm still under the sand, rising into frame 1.
    expect(sceneAt(AND_AT + 0.15).a).toBe('strike');
    expect(sceneAt(KNOWS_AT).a).toBe('strike');
    expect(strikeClock(AND_AT + 0.15)).toBeLessThan(-1);
    expect(strikeWorm(AND_AT + 0.15).head.y).toBeGreaterThan(HOLE.y);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('knows:');
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

  it('keeps every line of text between y 270 and 1250, US units first', () => {
    const inside = (y: number, size: number, top = 0.8): void => {
      expect(y - top * size).toBeGreaterThanOrEqual(270);
      expect(y + 0.3 * size).toBeLessThanOrEqual(1250);
    };
    for (const k of ['caption', 'barFt', 'barM'] as const) inside(TEXT[k].y, TEXT[k].size);
    expect(TEXT.barFt.y).toBeLessThan(TEXT.barM.y);
    // The calendar's month, while the room is pulled back (pages flying off drop no higher than it).
    for (let t = ONE_AT - 0.3; t < THEY_AT; t += FRAME) inside(roomToScreen(tankCamAt(t), { x: 0, y: TEXT.month.y }).y, TEXT.month.size * tankCamAt(t).zoom);
    // The name tag, with its "HELLO, my name is" above the name.
    for (let t = BARRY_AT - 0.1; t < AND_AT; t += FRAME) {
      if (tagAt(t) <= 0.01) continue;
      const p = tagPlacement(t);
      inside(p.y, p.size, 1.25);
      expect(p.x - 1.7 * p.size).toBeGreaterThan(0);
      expect(p.x + 1.7 * p.size).toBeLessThan(1080);
    }
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(wrap(LOOP_S)).toBe(0);
    for (const s of SOUNDS) {
      // The shink's swish starts 0.06 s before its cue.
      expect(s.t).toBeGreaterThanOrEqual(s.id === 'shink' ? 0.06 : 0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    expect(WITH_AT).toBeGreaterThan(UP_AT);
  });
});
