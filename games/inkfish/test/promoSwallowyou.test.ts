import { describe, expect, it } from 'vitest';
import { bedAt, CUES } from '../dev/promo/swallowyou/audio';
import { gradeAt, MOODS } from '../dev/promo/swallowyou/grade';
import {
  activeTest, CARD, GAUGE_BOX, GROUND_Y, H, inFrame, lineupCamera, MARGIN, MEASURE_S, NAME_CARD, rulerSteps, slotOf, slotStampAt, STAGES, STAMP_CARD,
  stageCamera, tapeAt, tapeTicks, testAt, toScreen, verdictsIn, W, YOU_X,
} from '../dev/promo/swallowyou/layout';
import { SHOULDERS_IN, SPECIES, YOU_FT } from '../dev/promo/swallowyou/species';
import {
  ANIMALS, CAPE_COD, CARD_HOLD_S, CLIPPING, CROC_EYES, DIVERS, END_HOLD_S, FLORIDA, ICE_WALK, said, SEAL, SECTION_OF, sectionEnd, sectionStart, T, TESTS, VIDEO_S,
} from '../dev/promo/swallowyou/timeline';
import { FPS_LONG } from '../dev/promo/descent/frame';
import { SECTIONS, VOICE_S, WORDS } from '../dev/promo/swallowyou/words';

const CUTS = [FLORIDA, DIVERS, SEAL, CROC_EYES, ICE_WALK, CAPE_COD, CLIPPING];

describe('long-form: every ocean animal that could swallow you', () => {
  it('has its narration in order, twelve sections, and ends 5 s after the last word', () => {
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.start);
    for (let i = 1; i < SECTIONS.length; i++) expect(SECTIONS[i]!.start).toBeGreaterThan(SECTIONS[i - 1]!.end);
    expect(SECTIONS).toHaveLength(12);
    expect(Math.abs(VIDEO_S * FPS_LONG - Math.round(VIDEO_S * FPS_LONG))).toBeLessThan(1e-6);
    expect(VIDEO_S - Math.max(WORDS[WORDS.length - 1]!.end, VOICE_S - 0.2)).toBeCloseTo(END_HOLD_S, 1);
  });

  it('finds every beat in the narration, inside the video', () => {
    expect(() => said('a word nobody says')).toThrow();
    for (const [name, t] of Object.entries(T)) {
      expect(Number.isFinite(t), name).toBe(true);
      expect(t, name).toBeGreaterThanOrEqual(0);
      expect(t, name).toBeLessThan(VIDEO_S);
    }
    // A few beats in the section that names them.
    expect(T.kayakAll).toBeLessThan(sectionEnd(0));
    expect(T.grouperBite).toBeGreaterThan(sectionStart(2));
    expect(T.rocks).toBeGreaterThan(sectionStart(6));
    expect(T.reindeer).toBeGreaterThan(sectionStart(7));
    expect(T.spat9).toBeGreaterThan(sectionStart(9));
    expect(T.fake).toBeGreaterThan(sectionStart(10));
    expect(T.could).toBeLessThan(T.fake);
  });

  it('meets the animals smallest to biggest, each in its own section', () => {
    expect(STAGES.map((s) => s.animal)).toEqual([...ANIMALS]);
    for (let i = 1; i < STAGES.length; i++) {
      expect(SPECIES[STAGES[i]!.animal].feet).toBeGreaterThan(SPECIES[STAGES[i - 1]!.animal].feet);
      expect(STAGES[i]!.close).toBeGreaterThan(STAGES[i - 1]!.close);
    }
    for (const s of STAGES) {
      const sec = SECTION_OF[s.animal];
      expect(s.close, s.animal).toBeGreaterThanOrEqual(sectionStart(sec) - 1);
      expect(s.close).toBeLessThanOrEqual(s.pullFrom);
      expect(s.pullFrom).toBeLessThan(s.pullTo);
      expect(s.name, s.animal).toBeGreaterThanOrEqual(s.close);
      expect(s.measure + MEASURE_S, s.animal).toBeLessThan(sectionEnd(sec));
    }
  });

  it('pulls back from the mouth to the line-up, with "you" and the whole animal on screen', () => {
    for (const s of STAGES) {
      const close = stageCamera(s, s.close);
      const line = stageCamera(s, s.pullTo + 0.01);
      expect(close.ppf, s.animal).toBeGreaterThan(line.ppf * 2);
      const cam = lineupCamera(s.animal);
      const you = toScreen(cam, { x: YOU_X, y: 0 });
      const tail = toScreen(cam, { x: SPECIES[s.animal].feet, y: 0 });
      expect(you.x, s.animal).toBeGreaterThan(MARGIN);
      expect(tail.x, s.animal).toBeLessThan(W - MARGIN);
      expect(you.y).toBeCloseTo(GROUND_Y, 6);
      // "You" stand below the name card.
      expect(you.y - YOU_FT * cam.ppf, s.animal).toBeGreaterThan(NAME_CARD.metric.y);
    }
  });

  it('grows the ruler step to step: ticks far enough apart, the tape out to the length, a tick sound per label', () => {
    let last = Infinity;
    for (const s of STAGES) {
      const { ppf } = lineupCamera(s.animal);
      expect(ppf, s.animal).toBeLessThan(last);
      last = ppf;
      const { step, label } = rulerSteps(ppf);
      expect(step * ppf).toBeGreaterThanOrEqual(36);
      expect(label * ppf).toBeGreaterThanOrEqual(120);
      expect(tapeAt(s, s.measure - 0.1)).toBe(0);
      expect(tapeAt(s, s.measure + MEASURE_S)).toBeCloseTo(SPECIES[s.animal].feet, 6);
      const ticks = tapeTicks(s);
      expect(ticks.length).toBeGreaterThan(1);
      for (let i = 1; i < ticks.length; i++) expect(ticks[i]!).toBeGreaterThanOrEqual(ticks[i - 1]!);
    }
  });

  it('runs one shoulder test per animal, in its section, and only the sperm whale fits', () => {
    for (const a of ANIMALS) {
      const test = TESTS[a];
      expect(test.card, a).toBeLessThan(test.drop);
      expect(test.drop, a).toBeLessThan(test.stamp);
      expect(test.card, a).toBeGreaterThan(sectionStart(SECTION_OF[a]));
      expect(test.stamp, a).toBeLessThan(sectionEnd(SECTION_OF[a]) + 0.5);
      expect(testAt(a, test.drop + 2).fits, a).toBe(a === 'sperm');
      expect(SPECIES[a].throat > SHOULDERS_IN, a).toBe(SPECIES[a].verdict === 'COULD');
      // Hovering, falling, landed; the stamp thumps down then settles.
      expect(testAt(a, test.card - 0.01).phase).toBe('off');
      expect(testAt(a, test.drop - 0.05).phase).toBe('hover');
      expect(testAt(a, test.stamp - 0.05).phase).toBe('drop');
      expect(testAt(a, test.stamp + 0.05).stamp).toBeGreaterThan(1);
      expect(testAt(a, test.stamp + 0.5).stamp).toBe(1);
      if (a !== 'sperm') expect(testAt(a, test.drop + 0.36 + 0.29).lift).toBeLessThan(5);
      expect(activeTest(test.drop)).toBe(a);
    }
    // The cards never overlap: each one has gone before the next arrives.
    for (let i = 1; i < ANIMALS.length; i++) {
      expect(TESTS[ANIMALS[i - 1]!].stamp + CARD_HOLD_S + 0.4).toBeLessThan(TESTS[ANIMALS[i]!].card);
    }
  });

  it('fills the stamp card one verdict at a time: seven NOs, then one COULD', () => {
    expect(verdictsIn(T.testIt)).toBe(0);
    ANIMALS.forEach((a, i) => {
      expect(verdictsIn(TESTS[a].stamp - 0.01)).toBe(i);
      expect(verdictsIn(TESTS[a].stamp)).toBe(i + 1);
      expect(slotStampAt(a, TESTS[a].stamp)).toBe(0);
      expect(slotStampAt(a, TESTS[a].stamp + 1)).toBe(1);
    });
    expect(ANIMALS.filter((a) => SPECIES[a].verdict === 'NO')).toHaveLength(7);
    expect(SPECIES.sperm.verdict).toBe('COULD');
    expect(verdictsIn(T.noRecord)).toBe(8);
  });

  it('keeps the HUD and its text inside the frame, readable', () => {
    for (const box of Object.values(NAME_CARD)) {
      expect(inFrame(box)).toBe(true);
      expect(box.size).toBeGreaterThanOrEqual(40);
    }
    const inside = (r: { x: number; y: number; width: number; height: number }): void => {
      expect(r.x).toBeGreaterThanOrEqual(MARGIN - 1);
      expect(r.y).toBeGreaterThanOrEqual(MARGIN - 1);
      expect(r.x + r.width).toBeLessThanOrEqual(W - MARGIN + 1);
      expect(r.y + r.height).toBeLessThanOrEqual(H - MARGIN + 1);
    };
    inside(CARD);
    inside(STAMP_CARD);
    inside(GAUGE_BOX);
    for (let i = 0; i < ANIMALS.length; i++) {
      const s = slotOf(i);
      expect(s.x).toBeGreaterThanOrEqual(STAMP_CARD.x);
      expect(s.x + s.width).toBeLessThanOrEqual(STAMP_CARD.x + STAMP_CARD.width + 1e-6);
      expect(s.y + s.height).toBeLessThanOrEqual(STAMP_CARD.y + STAMP_CARD.height + 1e-6);
    }
    // The name card and the stamp card don't meet.
    expect(NAME_CARD.name.x + NAME_CARD.name.maxWidth).toBeLessThan(STAMP_CARD.x);
  });

  it('cuts away in order, never over a shoulder test', () => {
    for (let i = 1; i < CUTS.length; i++) expect(CUTS[i]!.from).toBeGreaterThanOrEqual(CUTS[i - 1]!.to - 1e-9);
    for (const c of CUTS) {
      expect(c.from).toBeLessThan(c.to);
      for (const a of ANIMALS) {
        const test = TESTS[a];
        const overlap = Math.min(c.to, test.stamp + CARD_HOLD_S) - Math.max(c.from, test.card);
        expect(overlap, `${a} vs cut at ${c.from.toFixed(1)}`).toBeLessThanOrEqual(0);
      }
    }
  });

  it('changes the grade with every sentence and sounds every verdict', () => {
    for (let i = 1; i < MOODS.length; i++) expect(MOODS[i]!.t).toBeGreaterThan(MOODS[i - 1]!.t);
    expect(gradeAt(T.grouperNo).final).toBeGreaterThan(0.5);
    expect(gradeAt(T.kayakAll + 1).shock).toBeGreaterThan(0.5);
    for (const c of CUES) {
      expect(c.t).toBeGreaterThanOrEqual(0);
      expect(c.t).toBeLessThan(VIDEO_S);
    }
    for (const a of ANIMALS) expect(CUES.some((c) => c.id === 'thump' && Math.abs(c.t - TESTS[a].stamp) < 1e-9), a).toBe(true);
    // The bed grows with the animals.
    const levels = STAGES.map((s) => bedAt(s.close + 0.1));
    for (let i = 1; i < levels.length; i++) expect(levels[i]!).toBeGreaterThan(levels[i - 1]!);
  });
});
