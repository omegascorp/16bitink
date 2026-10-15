import { describe, expect, it } from 'vitest';
import {
  arrowAt, BRAZIL, BRAZIL_AT, brazilAt, CAROLINAS, CAROLINAS_AT, carolinasAt, DOTS, dotAt, FLORIDA, indianAt, pacificAt, viewAt,
} from '../dev/promo/lionfish/atlas';
import { SOUNDS } from '../dev/promo/lionfish/cues';
import { bodyPoint, finTipsOf, type Fish } from '../dev/promo/lionfish/fish';
import { captionAt, LINES } from '../dev/promo/lionfish/lines';
import {
  EATEN, fiveWeeksAt, GULPS, MEALS, oneLabel, percentAt, readoutAt, reefLabel, SCHOOL_SIZE, weekAt, YOUNG, youngAt, youngEatenAt,
} from '../dev/promo/lionfish/school';
import {
  boilAt, BOIL_STEPS, cardAt, EAT_AT, EIGHTY_AT, EATS_AT, grouperAt, HOME, jabAt, lionfishAt, LOOP_S, MEAL_GULP, mealAlarm, mealAt, mealEatenAt,
  meatAt, puzzledAt, SAFE_AT, said, signAt, SO_AT, spinesAt, suctionAt, THERE_AT, venomLabel, VENOMOUS_AT,
} from '../dev/promo/lionfish/story';
import { TEMPO, WORDS } from '../dev/promo/lionfish/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'len', 'face', 'tilt', 'effort', 'jaw', 'lump', 'alpha'] as const;
const lion = (t: number): Fish => lionfishAt(t, MEALS);

const same = (a: Fish, b: Fish): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
};

/** Where the lionfish's mouth is (NOSE = 0.46 body lengths ahead, as in chain.ts). */
const mouth = (f: Fish): { x: number; y: number } => ({ x: f.x + Math.sign(f.face) * Math.cos(f.tilt) * 0.46 * f.len, y: f.y - Math.sin(f.tilt) * 0.46 * f.len });

/** A place on the map card (map.ts: 1000 × 700 at (40, 290)). */
const onCard = (p: readonly [number, number], t: number): { x: number; y: number } => {
  const v = viewAt(t);
  return { x: 540 + (p[0] - v.lon) * v.k, y: 640 - (p[1] - v.lat) * v.k };
};
const inCard = (q: { x: number; y: number }): boolean => q.x > 60 && q.x < 1020 && q.y > 310 && q.y < 970;

describe('promo short: to save the reef, eat this fish (narrated)', () => {
  it('loops: everything at the loop point is where it was at the start', () => {
    same(lion(END), lion(0));
    same(mealAt(END)!, mealAt(0)!);
    expect(mealEatenAt(END)!).toBeCloseTo(mealEatenAt(0)!, 3);
    expect(signAt(END)).toEqual(signAt(0));
    for (const f of [suctionAt, mealAlarm, cardAt, spinesAt, venomLabel, meatAt, puzzledAt, jabAt, readoutAt, reefLabel]) expect(f(END)).toBeCloseTo(f(0), 3);
    expect(grouperAt(0)).toBeNull();
    expect(grouperAt(END)).toBeNull();
    YOUNG.forEach((_, i) => {
      expect(youngAt(i, 0)).toBeNull();
      expect(youngAt(i, END)).toBeNull();
    });
  });

  it('never jumps: the lionfish, the chromis, the grouper and the school move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [p, q] = [lion(a), lion(b)];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(30);
      expect(Math.abs(q.face - p.face)).toBeLessThan(0.4);
      expect(Math.abs(q.lump - p.lump)).toBeLessThan(0.2);
      for (const at of [mealAt, grouperAt]) {
        const [m, n] = [at(a), at(b)];
        if (m && n) expect(Math.hypot(n.x - m.x, n.y - m.y)).toBeLessThan(30);
      }
      YOUNG.forEach((_, i) => {
        const [m, n] = [youngAt(i, a), youngAt(i, b)];
        if (m && n) expect(Math.hypot(n.x - m.x, n.y - m.y)).toBeLessThan(15);
      });
      expect(Math.abs(cardAt(b) - cardAt(a))).toBeLessThan(0.2);
    }
  });

  it('keeps the lionfish, fins and all, above the captions (y < 1100) the whole loop', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const f = lion(t);
      const lowest = Math.max(...finTipsOf(f).map((p) => p.y), bodyPoint('lionfish', f, 0.4, 1).y + f.lump * 40);
      expect(lowest).toBeLessThan(1100);
    }
  });

  it('opens on the hook: the lionfish sucking in a reef fish under an "EAT this fish" sign, the fork and knife jabbing on "EAT"', () => {
    const sign = signAt(0);
    expect(sign).toMatchObject({ face: 'eat', shown: 1, width: 1 });
    expect(mealEatenAt(0)).toBeGreaterThan(0.2);
    expect(mealEatenAt(0)).toBeLessThan(0.8);
    expect(lion(0).jaw).toBeGreaterThan(0.5);
    expect(suctionAt(0)).toBeGreaterThan(0.5);
    expect(mealAlarm(0)).toBe(1);
    // It's down by "save the reef", with something always moving.
    expect(mealAt(said('save') + 0.2)).toBeNull();
    expect(MEAL_GULP).toBeLessThan(said('save') + 0.2);
    expect(jabAt(EAT_AT + 0.15)).toBeGreaterThan(0.8);
    expect(jabAt(EAT_AT - 0.3)).toBe(0);
    expect(lion(0).x).toBeCloseTo(HOME.x, 0);
  });

  it('opens the map on "Lionfish", hatching each home ocean as it is named, and an arrow to Florida, 1985', () => {
    expect(cardAt(said('Lionfish') + 0.3)).toBe(1);
    expect(pacificAt(said('Pacific') - 0.15)).toBe(0);
    expect(pacificAt(said('and', 1) + 0.1)).toBe(1);
    expect(indianAt(said('Indian') - 0.15)).toBe(0);
    expect(indianAt(said('Oceans,'))).toBe(1);
    expect(arrowAt(said('since') - 0.2)).toBe(0);
    expect(arrowAt(said("they've"))).toBe(1);
    const florida = DOTS.find((d) => d.at === FLORIDA)!;
    expect(florida.t).toBeCloseTo(said('1980s'), 5);
  });

  it('spreads the dots as the places are said: the Carolinas on "Carolinas", Brazil on "Brazil", all on screen', () => {
    for (const d of DOTS) {
      if (d.at !== FLORIDA) expect(d.t).toBeGreaterThanOrEqual(said('spread') - 1e-6);
      expect(d.t).toBeLessThanOrEqual(BRAZIL_AT + 1e-6);
      if (d.at[1] > 33) expect(d.t).toBeGreaterThan(CAROLINAS_AT - 0.25);
      if (d.at[1] < -4) expect(d.t).toBeGreaterThan(BRAZIL_AT - 0.2);
    }
    expect(DOTS.find((d) => d.at === CAROLINAS)!.t).toBeCloseTo(CAROLINAS_AT, 5);
    expect(DOTS.find((d) => d.at === BRAZIL)!.t).toBeCloseTo(BRAZIL_AT, 5);
    expect(carolinasAt(CAROLINAS_AT + 0.2)).toBe(1);
    expect(brazilAt(BRAZIL_AT + 0.2)).toBe(1);
    expect(inCard(onCard(CAROLINAS, CAROLINAS_AT))).toBe(true);
    expect(inCard(onCard(BRAZIL, BRAZIL_AT))).toBe(true);
    expect(inCard(onCard(FLORIDA, said('1980s')))).toBe(true);
    expect(cardAt(BRAZIL_AT + 0.3)).toBe(1);
    for (const d of DOTS) expect(dotAt(d, BRAZIL_AT + 0.3)).toBe(1);
    expect(cardAt(said('nothing'))).toBe(0);
  });

  it('brings a grouper up to it on "nothing there": it flinches at the glowing spines, "?", and backs off on "eats them"', () => {
    const g = grouperAt(THERE_AT)!;
    const l = lion(THERE_AT);
    expect(mouth(l).x - (g.x + 0.46 * g.len)).toBeLessThan(160);
    expect(spinesAt(THERE_AT)).toBeGreaterThan(0.7);
    expect(puzzledAt(THERE_AT - 0.2)).toBe(0);
    expect(puzzledAt(THERE_AT + 0.3)).toBe(1);
    expect(grouperAt(EATS_AT + 0.5)!.x).toBeLessThan(grouperAt(EATS_AT)!.x - 40);
    expect(grouperAt(said('one') + 0.2)).toBeNull();
  });

  it('runs the experiment as it is told: one lionfish gulps 11 of 14 young fish (79%) by "EIGHTY", over five weeks', () => {
    expect(EATEN).toBe(11);
    expect(Math.round((100 * EATEN) / SCHOOL_SIZE)).toBe(79);
    expect(YOUNG.filter((_, i) => youngAt(i, said('reef,') + 0.5) !== null).length).toBe(SCHOOL_SIZE);
    expect(reefLabel(said('reef,') + 0.2)).toBe(1);
    expect(oneLabel(said('lionfish') + 0.1)).toBe(1);
    expect(percentAt(EIGHTY_AT)).toBe(79);
    expect(percentAt(EIGHTY_AT - 0.3)).toBeLessThan(79);
    expect(percentAt(said('lionfish'))).toBe(0);
    expect(readoutAt(EIGHTY_AT)).toBe(1);
    expect(weekAt(said('one') + 0.1)).toBe(1);
    expect(weekAt(GULPS[GULPS.length - 1]!)).toBe(5);
    expect(fiveWeeksAt(said('weeks.'))).toBe(1);
    // Each one waits in front of the lionfish's mouth, is sucked in as the jaw opens, and is gone.
    YOUNG.forEach((y, i) => {
      if (y.gulp === null) return;
      const before = youngAt(i, y.gulp - 0.2)!;
      const m = mouth(lion(y.gulp));
      expect(Math.hypot(before.x - m.x, before.y - m.y)).toBeLessThan(90);
      expect(youngEatenAt(i, y.gulp - 0.05)).not.toBeNull();
      expect(lion(y.gulp - 0.04).jaw).toBeGreaterThan(0.3);
      expect(youngAt(i, y.gulp)).toBeNull();
    });
    // The survivors are gone before "Its spines".
    YOUNG.forEach((_, i) => expect(youngAt(i, said('Its'))).toBeNull());
  });

  it('lights up the venomous spines on "venomous", rings its meat on "meat" and puts up "safe to eat" on "safe"; "So," flips it back to "EAT"', () => {
    expect(spinesAt(said('spines') + 0.25)).toBe(1);
    expect(venomLabel(VENOMOUS_AT - 0.2)).toBe(0);
    expect(venomLabel(VENOMOUS_AT + 0.25)).toBe(1);
    expect(meatAt(said('meat') + 0.2)).toBe(1);
    expect(signAt(SAFE_AT - 0.2).shown).toBe(0);
    expect(signAt(SAFE_AT + 0.25)).toMatchObject({ face: 'safe', shown: 1 });
    expect(signAt(SO_AT + 0.4)).toMatchObject({ face: 'eat', shown: 1 });
    expect(mealAt(SO_AT)).not.toBeNull();
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('So,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(4);
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
  });

  it('matches the sounds to the beats: cutlery on "EAT", the alarm on −79%, a ding on "safe"', () => {
    const near = (id: string, t: number): boolean => SOUNDS.some((s) => s.id === id && Math.abs(s.t - t) < 0.1);
    expect(near('clang', EAT_AT)).toBe(true);
    expect(near('spotted', EIGHTY_AT)).toBe(true);
    expect(near('clang', SAFE_AT)).toBe(true);
    expect(near('eat', MEAL_GULP)).toBe(true);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
