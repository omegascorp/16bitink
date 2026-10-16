import { describe, expect, it } from 'vitest';
import { noseOf, type Fish } from '../dev/promo/goldfish/goldfish';
import {
  captionAt, dingAt, failMark, foodLabel, hourLabel, leverLabel, LINES, monthsLabel, scientistsLabel, SOUNDS,
} from '../dev/promo/goldfish/script';
import {
  BOIL_STEPS, boilAt, BOWL, bowlFishAt, calendarAt, calendarShown, camAt, CHUTE, clockHandAt, clockShown, crossAt, DROPS, FAIL_AT, FLIPS, handAt, hourShaded, inHour,
  LAB_X, labFishAt, LEVER, leverAngleAt, LOOP_S, MONTHS, paddleAt, pelletAt, PUSHES, said, TANK,
} from '../dev/promo/goldfish/story';
import { TEMPO, WORDS } from '../dev/promo/goldfish/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'len', 'face', 'tilt', 'effort', 'jaw'] as const;
/** The bowl is on screen while the camera is short of the lab, the lab once it has left home. */
const bowlSeen = (t: number): boolean => camAt(t) < 900;
const labSeen = (t: number): boolean => camAt(t) > 180;

const same = (a: Fish, b: Fish): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
  expect(a.happy).toBe(b.happy);
};

describe('promo short: your goldfish does NOT have a three-second memory (narrated)', () => {
  it('loops: the camera, both goldfish and every note are where they were at the start', () => {
    expect(camAt(END)).toBeCloseTo(camAt(0), 4);
    same(bowlFishAt(END), bowlFishAt(0));
    same(labFishAt(END), labFishAt(0));
    expect(leverAngleAt(END)).toBeCloseTo(leverAngleAt(0), 6);
    expect(crossAt(0)).toEqual([0, 0]);
    expect(crossAt(END)).toEqual([0, 0]);
    for (const f of [scientistsLabel, leverLabel, foodLabel, hourLabel, failMark, monthsLabel, clockShown, calendarShown, handAt]) {
      expect(f(0)).toBe(0);
      expect(f(END)).toBe(0);
    }
    for (const d of DROPS) {
      expect(pelletAt(d, 0)).toBeNull();
      expect(pelletAt(d, END)).toBeNull();
    }
    expect(dingAt(0)).toBeNull();
  });

  it('never jumps: the camera and whichever goldfish is on screen move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      // The pan is fast (~70 px a frame at its quickest) but never teleports.
      expect(Math.abs(camAt(b) - camAt(a))).toBeLessThan(80);
      for (const [fishAt, seen] of [[bowlFishAt, bowlSeen], [labFishAt, labSeen]] as const) {
        if (!seen(a)) continue;
        const [p, q] = [fishAt(a), fishAt(b)];
        expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(30);
        expect(Math.abs(q.face - p.face)).toBeLessThan(0.3);
        expect(Math.abs(q.tilt - p.tilt)).toBeLessThan(0.08);
      }
      for (const d of DROPS) {
        const [m, n] = [pelletAt(d, a), pelletAt(d, b)];
        if (m && n) expect(Math.hypot(n.x - m.x, n.y - m.y)).toBeLessThan(20);
      }
      // The paddle is shoved over in about four frames.
      expect(Math.abs(leverAngleAt(b) - leverAngleAt(a))).toBeLessThan(0.15);
    }
  });

  it('opens on the hook itself: the goldfish in its bowl under the "3-second memory?" tag, struck through on "NOT"', () => {
    expect(camAt(0)).toBe(0);
    const f = bowlFishAt(0);
    expect(f.face).toBe(1);
    expect(Math.hypot(f.x - BOWL.x, f.y - BOWL.y)).toBeLessThan(BOWL.r * 0.5);
    // Moving from the first frame.
    expect(bowlFishAt(0.5).x - f.x).toBeGreaterThan(20);
    expect(crossAt(said('NOT') - 0.05)).toEqual([0, 0]);
    expect(crossAt(said('NOT') + 0.3)).toEqual([1, 1]);
    expect(camAt(said('memory.'))).toBe(0);
    expect(captionAt(0)!.line.words[0]!.text).toBe('Your');
  });

  it('keeps the bowl\'s goldfish inside the glass, fan tail and all, whenever the bowl is on screen', () => {
    // Nose to tail tip is about 1.9 body lengths' half: the fan tail trails ~0.85 of a body length behind the stalk.
    for (let t = 0; t < LOOP_S; t += FRAME) {
      if (!bowlSeen(t)) continue;
      const f = bowlFishAt(t);
      const reach = Math.abs(f.face);
      const nose = f.x + f.face * f.len * 0.5;
      const tail = f.x - f.face * f.len * 0.93;
      const inside = Math.sqrt(BOWL.r ** 2 - (f.y - BOWL.y) ** 2) - 10;
      for (const x of [nose, tail]) expect(Math.abs(x - BOWL.x) * reach).toBeLessThan(inside);
      expect(f.y).toBeGreaterThan(BOWL.water + 100);
    }
  });

  it('pans to the lab for "Scientists": the sleeve and hand point out the lever on "taught", and are gone as the fish pushes', () => {
    expect(camAt(said('Scientists'))).toBeGreaterThan(0.97 * LAB_X);
    expect(scientistsLabel(said('Scientists') + 0.2)).toBe(1);
    expect(handAt(said('taught'))).toBeGreaterThan(0.95);
    expect(handAt(said('push') + 0.4)).toBe(0);
    expect(leverLabel(said('lever') + 0.25)).toBe(1);
    expect(leverLabel(said('lever', 2))).toBe(1);
  });

  it('nudges the lever on "push", and one pellet drops on "food" and is eaten from the chute', () => {
    const push = said('push');
    const nose = noseOf(labFishAt(push));
    const paddle = paddleAt(leverAngleAt(push));
    expect(Math.hypot(nose.x - (paddle.x - LEVER.paddle), nose.y - paddle.y)).toBeLessThan(15);
    expect(leverAngleAt(push + 0.08)).toBeGreaterThan(LEVER.rest + 0.2);
    const food = pelletAt(DROPS[0]!, said('food.'));
    expect(food).not.toBeNull();
    expect(foodLabel(said('food.') + 0.15)).toBe(1);
    for (const d of DROPS) {
      const p = pelletAt(d, d.eaten - 0.01)!;
      const n = noseOf(labFishAt(d.eaten - 0.01));
      expect(Math.hypot(p.x - n.x, p.y - n.y)).toBeLessThan(25);
      expect(labFishAt(d.eaten - 0.05).jaw).toBeGreaterThan(0.2);
      expect(pelletAt(d, d.from + 0.01)!.y).toBeCloseTo(CHUTE.y, -1);
      // Every pellet sinks inside the tank's water.
      expect(p.y).toBeGreaterThan(TANK.water);
    }
  });

  it('shows the clock on "only…", shades its one hour on "one hour", and the push outside it gets a ✕, no food', () => {
    expect(clockShown(said('only') + 0.3)).toBe(1);
    expect(hourShaded(said('one') - 0.1)).toBe(0);
    expect(hourShaded(said('hour') + 0.3)).toBe(1);
    expect(hourLabel(said('day…'))).toBe(1);
    expect(inHour(clockHandAt(FAIL_AT))).toBe(false);
    expect(DROPS.some((d) => d.from > FAIL_AT - 0.5 && d.from < said('WHEN'))).toBe(false);
    expect(failMark(said('day…') + 0.4)).toBe(1);
    const nose = noseOf(labFishAt(FAIL_AT));
    expect(Math.abs(nose.x - (paddleAt(leverAngleAt(FAIL_AT)).x - LEVER.paddle))).toBeLessThan(15);
  });

  it('learns WHEN: it waits by the lever, the hand enters its hour on "WHEN", it pushes, and a pellet drops with a ding on "it."', () => {
    const wait = labFishAt(said('learned'));
    expect(wait.face).toBe(1);
    expect(noseOf(wait).x).toBeLessThan(paddleAt(LEVER.rest).x - LEVER.paddle - 30);
    expect(inHour(clockHandAt(said('WHEN') - 0.08))).toBe(false);
    expect(inHour(clockHandAt(said('WHEN') + 0.05))).toBe(true);
    const push = said('push', 2);
    expect(inHour(clockHandAt(push))).toBe(true);
    expect(pelletAt(DROPS[1]!, said('it.'))).not.toBeNull();
    expect(dingAt(said('it.'))).not.toBeNull();
    expect(SOUNDS.some((s) => s.id === 'clang' && s.pitch > 1.5 && Math.abs(s.t - said('it.')) < 0.15)).toBe(true);
    expect(labFishAt(DROPS[1]!.eaten + 0.2).happy).toBe(true);
  });

  it('flips the calendar through the months from "remember", and every push still lands in its hour', () => {
    expect(calendarShown(said('Goldfish') + 0.3)).toBe(1);
    expect(calendarAt(said('remember') - 0.05)).toEqual({ month: 0, flip: null });
    const last = calendarAt(said('So,'));
    expect(last.month).toBe(MONTHS.length - 1);
    expect(last.flip).toBeNull();
    expect(FLIPS.length).toBe(MONTHS.length - 1);
    expect(monthsLabel(said('MONTHS.') + 0.3)).toBe(1);
    // From the clock on, only pushes in its hour pay (the first, before the rule, always did).
    for (const p of PUSHES.slice(2)) expect(inHour(clockHandAt(p))).toBe(true);
    // Each paying push has its pellet just after, and the fish is in the lab to push.
    for (const p of PUSHES.slice(2)) {
      expect(DROPS.some((d) => d.from > p && d.from < p + 0.3)).toBe(true);
      expect(labSeen(p)).toBe(true);
    }
  });

  it('pans home on "So, for the record:", back to the bowl as it was at the start', () => {
    expect(camAt(said('record:'))).toBe(0);
    expect(camAt(said('MONTHS.'))).toBe(LAB_X);
    expect(bowlFishAt(said('So,')).face).toBe(-1);
    // The lab keeps its clock as the camera leaves it.
    expect(clockShown(said('So,'))).toBe(1);
    expect(crossAt(said('So,'))).toEqual([0, 0]);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('record:');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeLessThan(0.5);
    expect(TEMPO).toBeLessThanOrEqual(1.15);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      if (l.words.length > 1) expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(18);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop and no bright sound on the failed push', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    const flop = SOUNDS.filter((s) => s.t > FAIL_AT - 0.05 && s.t < said('WHEN') - 0.05);
    for (const s of flop) expect(['click', 'spotted']).toContain(s.id);
  });
});
