import { describe, expect, it } from 'vitest';
import { FPS_LONG } from '../dev/promo/descent/frame';
import { bedAt, CUES } from '../dev/promo/seamonsters/audio';
import { LEGEND_BEATS } from '../dev/promo/seamonsters/cards';
import { CUTS } from '../dev/promo/seamonsters/cutaways';
import { counterAt, MEASURES, ROLL_S, stampsAt, STAMP_TIMES } from '../dev/promo/seamonsters/hud';
import { between, frame, toScreen, viewAt, zoomOf } from '../dev/promo/seamonsters/lineup';
import { MONSTERS, SIPHONOPHORE, SPECIES, YOU_FT, yousLabel } from '../dev/promo/seamonsters/species';
import { ARRIVE, END_HOLD_S, said, sectionEnd, sectionStart, T, VIDEO_S } from '../dev/promo/seamonsters/timeline';
import { SECTIONS, VOICE_S, WORDS } from '../dev/promo/seamonsters/words';

describe('long-form: sea monsters size comparison', () => {
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
    expect(T.oneAnimal).toBeLessThan(sectionEnd(0));
    expect(T.teeth).toBeGreaterThan(sectionStart(2));
    expect(T.rude).toBeGreaterThan(sectionStart(3));
    expect(T.plesiosaur).toBeGreaterThan(sectionStart(6));
    expect(T.watching).toBeLessThan(sectionEnd(7));
    expect(T.mobyDick).toBeGreaterThan(sectionStart(8));
    expect(T.weirder).toBeGreaterThan(sectionStart(10));
  });

  it('lines the animals up smallest to biggest, each arriving in its own section, the siphonophore longest', () => {
    for (let i = 1; i < MONSTERS.length; i++) {
      expect(SPECIES[MONSTERS[i]!].feet).toBeGreaterThan(SPECIES[MONSTERS[i - 1]!].feet);
      expect(ARRIVE[MONSTERS[i]!]).toBeGreaterThan(ARRIVE[MONSTERS[i - 1]!]);
    }
    for (const m of MONSTERS) {
      const sec = SPECIES[m].section;
      expect(ARRIVE[m], m).toBeGreaterThanOrEqual(sectionStart(sec) - 0.5);
      expect(ARRIVE[m], m).toBeLessThan(sectionEnd(sec));
    }
    expect(SIPHONOPHORE.feet).toBeGreaterThan(SPECIES.blue.feet);
  });

  it('counts "you"s as the script says them', () => {
    expect(yousLabel(SPECIES.frilled.feet)).toBe('= 1.1 of you');
    expect(yousLabel(SPECIES.oarfish.feet)).toBe('= 4.5 of you');
    expect(yousLabel(SPECIES.sperm.feet)).toBe('= 9 of you');
    expect(yousLabel(SPECIES.blue.feet)).toBe('= 17 of you');
    expect(yousLabel(SIPHONOPHORE.feet)).toBe('= 26 of you');
    expect(YOU_FT).toBe(5.75);
  });

  it('rolls the counter up through every length and lands on each', () => {
    for (let i = 1; i < MEASURES.length; i++) {
      expect(MEASURES[i]!.at).toBeGreaterThan(MEASURES[i - 1]!.at + ROLL_S);
      expect(MEASURES[i]!.feet).toBeGreaterThan(MEASURES[i - 1]!.feet);
    }
    expect(counterAt(0).step).toBeNull();
    for (const m of MEASURES) {
      const landed = counterAt(m.at + ROLL_S + 0.01);
      expect(landed.feet).toBeCloseTo(m.feet, 6);
      expect(landed.roll).toBe(1);
    }
    let last = 0;
    for (let t = MEASURES[0]!.at; t < VIDEO_S; t += 0.1) {
      const shown = counterAt(t).feet;
      expect(shown).toBeGreaterThanOrEqual(last - 1e-9);
      last = shown;
    }
  });

  it('stamps every legend REAL in order, each joining the map before its stamp', () => {
    for (let i = 1; i < STAMP_TIMES.length; i++) expect(STAMP_TIMES[i]!).toBeGreaterThan(STAMP_TIMES[i - 1]!);
    expect(Object.keys(stampsAt(0))).toHaveLength(0);
    const end = stampsAt(T.allReal);
    expect(Object.values(end).every((v) => v === 1)).toBe(true);
    expect(Object.keys(end)).toHaveLength(STAMP_TIMES.length);
  });

  it('shows each legend card, stamps it, then tears it, with no two cards or cut-aways overlapping', () => {
    for (const b of LEGEND_BEATS) {
      expect(b.stamp, b.legend).toBeGreaterThan(b.from);
      expect(b.tear, b.legend).toBeGreaterThan(b.stamp);
    }
    const spans = [...LEGEND_BEATS.map((b) => [b.from, b.tear + 0.8] as const), ...CUTS.map((c) => [c.from, c.to] as const)].sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < spans.length; i++) expect(spans[i]![0]).toBeGreaterThanOrEqual(spans[i - 1]![1] - 1e-9);
    for (const c of CUTS) expect(c.to).toBeGreaterThan(c.from);
  });

  it('keeps every sound inside the video, and the bed growing with the row', () => {
    for (const c of CUES) {
      expect(Number.isFinite(c.t), c.id).toBe(true);
      expect(c.t, c.id).toBeGreaterThanOrEqual(0);
      expect(c.t, c.id).toBeLessThan(VIDEO_S);
    }
    expect(bedAt(ARRIVE.blue + 0.1)).toBeGreaterThan(bedAt(ARRIVE.frilled + 0.1));
    expect(bedAt(sectionStart(5) + 1)).toBeLessThan(bedAt(sectionStart(4) + 1));
  });

  it('frames, eases and maps the camera consistently', () => {
    const a = frame(0, 10, 0);
    expect(a.right - a.left).toBeCloseTo(10, 9);
    expect(toScreen(a, 0, 0).x).toBeCloseTo(0, 9);
    expect(toScreen(a, 10, 0).x).toBeCloseTo(1920, 9);
    const b = frame(0, 100, 0);
    const start = between(a, b, 0);
    expect(start.left).toBeCloseTo(a.left, 9);
    expect(start.right).toBeCloseTo(a.right, 9);
    const end = between(a, b, 1);
    expect(end.left).toBeCloseTo(b.left, 9);
    expect(end.right).toBeCloseTo(b.right, 9);
    // The zoom eases steadily (in log space): halfway is the geometric mean of the widths.
    const mid = between(a, b, 0.5);
    expect(mid.right - mid.left).toBeCloseTo(Math.sqrt(10 * 100), 6);
    const shots = [{ at: 0, view: a, ease: 0.01 }, { at: 5, view: b, ease: 1 }];
    expect(zoomOf(viewAt(shots, 2))).toBeCloseTo(zoomOf(a), 6);
    expect(zoomOf(viewAt(shots, 7))).toBeCloseTo(zoomOf(b), 6);
  });
});
