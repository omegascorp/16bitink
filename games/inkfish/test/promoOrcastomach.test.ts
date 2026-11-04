import { describe, expect, it } from 'vitest';
import { rideCurve } from '../dev/promo/orcastomach/audio';
import { captionAt, COUNTER_X, LINES, SOUNDS, TEXT } from '../dev/promo/orcastomach/script';
import {
  boilAt, BOIL_STEPS, cameraAt, counterAt, flashAt, handsAt, hookAt, LOOP_S, placeAt, porpoisesAt, questionAt, said, SCENE_IDS, sceneAlpha, sealsAt, shownAt, skyShownAt, stomachLabelAt, TOTAL, wrap, windowAt, yearAt,
  QUIET_FROM, QUIET_TO, driftersAt,
} from '../dev/promo/orcastomach/story';
import { TEMPO, WORDS } from '../dev/promo/orcastomach/words';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;

describe('promo short: this orca ate 13 porpoises and 14 seals (narrated)', () => {
  it('loops: every clocked value at the loop point equals its value at the start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [a, b] = [hookAt(0), hookAt(END)];
    for (const k of ['x', 'y', 'size', 'tilt', 'jaw', 'lid'] as const) expect(b.orca[k], k).toBeCloseTo(a.orca[k], 3);
    for (const k of ['bright', 'sweat'] as const) expect(b[k], k).toBeCloseTo(a[k], 3);
    expect(b.food.length).toBe(a.food.length);
    b.food.forEach((f, i) => {
      expect(f.kind).toBe(a.food[i]!.kind);
      for (const k of ['x', 'y', 'len', 'rot', 'fade'] as const) expect(f[k], k).toBeCloseTo(a.food[i]![k], 2);
    });
    const [c0, c1] = [cameraAt(0), cameraAt(END)];
    for (const k of ['zoom', 'rot', 'dx', 'dy'] as const) expect(c1[k], k).toBeCloseTo(c0[k], 3);
    for (const id of SCENE_IDS) expect(sceneAlpha(id, END), id).toBeCloseTo(sceneAlpha(id, 0), 4);
    for (const f of [placeAt, yearAt, stomachLabelAt, counterAt, questionAt, windowAt, handsAt, flashAt, skyShownAt]) {
      expect(f(0), f.name).toBeCloseTo(0, 3);
      expect(f(END), f.name).toBeCloseTo(0, 3);
    }
    expect(shownAt(0)).toBe(0);
  });

  it('never jumps: the orca, the camera and the scene fades move smoothly frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [x, y] = [wrap(t), wrap(t + FRAME)];
      const [h, k] = [hookAt(x), hookAt(y)];
      if (sceneAlpha('hook', x) > 0.01 && sceneAlpha('hook', y) > 0.01) {
        expect(Math.abs(h.orca.x - k.orca.x)).toBeLessThan(60);
        expect(Math.abs(h.orca.size - k.orca.size)).toBeLessThan(80);
      }
      expect(Math.abs(cameraAt(x).zoom - cameraAt(y).zoom)).toBeLessThan(0.1);
      for (const id of SCENE_IDS) expect(Math.abs(sceneAlpha(id, y) - sceneAlpha(id, x)), id).toBeLessThan(0.35);
    }
  });

  it('opens on the hook: the orca huge, jaws wide round a seal, nothing written', () => {
    expect(sceneAlpha('hook', 0.3)).toBe(1);
    for (const id of SCENE_IDS.filter((x) => x !== 'hook')) expect(sceneAlpha(id, 0.3), id).toBe(0);
    const h = hookAt(0);
    // The head spans most of the 1080 width, centred in the band of text (270 to 1250), jaws past drawOrca's limit.
    expect(h.orca.size).toBeGreaterThanOrEqual(1000);
    expect(Math.abs(h.orca.y - 760)).toBeLessThan(100);
    expect(h.orca.jaw).toBeGreaterThan(0.9);
    expect(h.food.map((f) => f.kind)).toEqual(['seal']);
    // The seal sits in the middle of the mouth, in full view.
    expect(Math.abs(h.food[0]!.x - 44)).toBeLessThan(12);
    expect(h.food[0]!.fade).toBe(1);
    expect(placeAt(0.3) + yearAt(0.3) + counterAt(0.3) + questionAt(0.3) + stomachLabelAt(0.3)).toBe(0);
    expect(captionAt(0.3)!.line.words.map((w) => w.text).join(' ')).toBe('This orca ate');
  });

  it('puts every noun on screen as it is said', () => {
    // "THIRTEEN porpoises… and FOURTEEN seals!": a porpoise in the mouth's reach, then a seal.
    const porpoiseTime = said('porpoises…') + 0.1;
    expect(hookAt(porpoiseTime).food.some((f) => f.kind === 'porpoise')).toBe(true);
    expect(hookAt(said('seals!')).food.some((f) => f.kind === 'seal')).toBe(true);
    expect(hookAt(said('orca')).orca.size).toBeGreaterThanOrEqual(1000);
    // "Denmark, 1861.": the place and the year.
    expect(placeAt(said('Denmark,') + 0.4)).toBe(1);
    expect(yearAt(said('1861.') + 0.4)).toBe(1);
    expect(sceneAlpha('shore', said('Denmark,') + 0.3)).toBe(1);
    // "A scientist opens one killer whale's stomach": the scientist is on the shore, the window opens, the label shows.
    expect(sceneAlpha('shore', said('scientist') + 0.1)).toBe(1);
    expect(windowAt(said('stomach,') + 0.3)).toBe(1);
    expect(stomachLabelAt(said('stomach,') + 0.3)).toBe(1);
    // "starts counting what's left inside": counters running, both on screen.
    expect(counterAt(said('counting') + 0.2)).toBe(1);
    expect(shownAt(said('counting') + 0.2)).toBeGreaterThan(0);
    // "Ten fingers": both hands up, ten fingers (5 a hand, drawn in art/scientist.ts), and the counters are past ten.
    expect(sceneAlpha('fingers', said('fingers') + 0.1)).toBe(1);
    expect(handsAt(said('fingers') + 0.1)).toBe(1);
    expect(porpoisesAt(said('enough.'))).toBeGreaterThan(10);
    expect(sealsAt(said('enough.'))).toBeGreaterThan(10);
    // "Was it all one meal?": the dark sea and the question.
    expect(sceneAlpha('sea', said('meal?'))).toBe(1);
    expect(questionAt(said('meal?'))).toBe(1);
    expect(driftersAt(said('meal?')).length).toBeGreaterThan(3);
    // "how long it took": the sky strip with the sun and moon.
    expect(skyShownAt(said('how') + 0.2)).toBe(1);
    // "that orca never skipped lunch": the orca back, a seal in view, the jaws open on "lunch".
    expect(sceneAlpha('hook', said('orca', 2))).toBe(1);
    expect(hookAt(said('orca', 2)).food.length).toBe(1);
    expect(hookAt(said('lunch.') - 0.5).orca.jaw).toBeLessThan(0.2);
    expect(hookAt(said('lunch.') + 0.5).orca.jaw).toBeGreaterThan(0.8);
  });

  it('counts to 13 porpoises and 14 seals and never shows a total', () => {
    expect(TOTAL).toBe(27);
    const end = said('enough.') + 0.2;
    expect(shownAt(end)).toBe(TOTAL);
    expect(porpoisesAt(end)).toBe(13);
    expect(sealsAt(end)).toBe(14);
    // Each counter only ever rises, and the pair never exceeds 13 and 14.
    let [p, s] = [0, 0];
    for (let t = 0; t < LOOP_S; t += FRAME) {
      expect(porpoisesAt(t)).toBeGreaterThanOrEqual(p);
      expect(sealsAt(t)).toBeGreaterThanOrEqual(s);
      [p, s] = [porpoisesAt(t), sealsAt(t)];
      expect(p).toBeLessThanOrEqual(13);
      expect(s).toBeLessThanOrEqual(14);
    }
    // "27" is never one of the words written over the picture.
    expect(JSON.stringify(TEXT)).not.toContain('27');
  });

  it('writes the captions word by word, in order, covering every word', () => {
    const spoken = LINES.flatMap((l) => l.words.map((w) => w.text));
    expect(spoken).toEqual(WORDS.map((w) => w.text));
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.to).toBeGreaterThan(l.from);
    }
    for (let i = 1; i < LINES.length; i++) expect(LINES[i]!.from).toBeCloseTo(LINES[i - 1]!.to, 6);
    expect(LINES[0]!.from).toBe(0);
    expect(LINES[LINES.length - 1]!.to).toBe(LOOP_S);
    const mid = captionAt(said('FOURTEEN') + 0.05)!;
    expect(mid.line.words[mid.word]!.text).toBe('FOURTEEN');
  });

  it('keeps every text inside the area the apps leave clear (y 270 to 1250), and the counters on screen', () => {
    for (const [name, t] of Object.entries(TEXT)) {
      expect(t.y - t.size * 0.7, `${name} top`).toBeGreaterThanOrEqual(270);
      expect(t.y, `${name} baseline`).toBeLessThanOrEqual(1250);
    }
    for (const x of Object.values(COUNTER_X)) {
      expect(x - 150).toBeGreaterThan(0);
      expect(x + 150).toBeLessThan(1080);
    }
  });

  it('has a loop that is a multiple of 1.5 s and words that fit it', () => {
    expect(LOOP_S % 1.5).toBe(0);
    expect(BOIL_STEPS).toBe(LOOP_S * 8);
    expect(boilAt(END)).toBe(BOIL_STEPS - 1);
    let prev = 0;
    for (const w of WORDS) {
      expect(w.start).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(w.end).toBeGreaterThan(w.start);
      prev = w.end;
    }
    expect(WORDS[WORDS.length - 1]!.end / TEMPO).toBeLessThanOrEqual(LOOP_S);
  });

  it('keeps the sound cues inside the loop', () => {
    expect(SOUNDS.length).toBeGreaterThan(30);
    for (const c of SOUNDS) {
      expect(c.t).toBeGreaterThanOrEqual(0);
      expect(c.t).toBeLessThan(LOOP_S);
      expect(c.gain).toBeLessThanOrEqual(0.2);
    }
  });

  it('lifts the voice about 6 dB across "but nobody knows how long it took, either" and nowhere else', () => {
    const curve = rideCurve();
    const gainAt = (t: number): number => {
      for (let i = 1; i < curve.length; i++) {
        const [t0, g0] = curve[i - 1]!;
        const [t1, g1] = curve[i]!;
        if (t <= t1) return g0 + ((g1 - g0) * (t - t0)) / (t1 - t0 || 1);
      }
      return curve[curve.length - 1]![1];
    };
    const base = gainAt(0);
    expect(QUIET_FROM).toBeCloseTo(said('but'), 6);
    expect(gainAt((QUIET_FROM + QUIET_TO) / 2) / base).toBeCloseTo(2, 2);
    expect(gainAt(QUIET_FROM - 0.2)).toBe(base);
    expect(gainAt(QUIET_TO + 0.2)).toBe(base);
    // 40 ms ramps.
    expect(gainAt(QUIET_FROM - 0.02)).toBeGreaterThan(base);
    expect(gainAt(QUIET_FROM - 0.02)).toBeLessThan(2 * base);
  });
});
