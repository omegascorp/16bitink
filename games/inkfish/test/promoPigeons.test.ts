import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/pigeons/script';
import {
  albiAt, BURST_AT, boilAt, BOIL_STEPS, camAt, featherAt, fishAt, flashAt, FIVEFOOT_AT, FOUR_AT, HOOK_CAM, LOOP_S, metricAt, moodAt, MOVE_AT, pigeonAt, said, shadowAlpha, SLOTS, sprayAges,
  timerAt, timerValue, wrap,
} from '../dev/promo/pigeons/story';
import { TEMPO, WORDS } from '../dev/promo/pigeons/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const IDS = SLOTS.map((_, i) => i);

describe('promo short: this fish hunts pigeons on land (narrated)', () => {
  it('loops: the camera, the fish, every bird, the mood and the writing at the loop point equal their start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [c0, c1] = [camAt(0), camAt(END)];
    for (const k of ['zoom', 'cx', 'cy'] as const) expect(c1[k], k).toBeCloseTo(c0[k], 2);
    const [f0, f1] = [fishAt(0), fishAt(END)];
    expect(f1.mode).toBe(f0.mode);
    expect(f1.holds).toBe(f0.holds);
    for (const k of ['x', 'y', 'len', 'rot'] as const) expect(f1.pose[k], k).toBeCloseTo(f0.pose[k], 1);
    expect(Math.cos(f1.pose.beat - f0.pose.beat)).toBeCloseTo(1, 3);
    for (const k of ['gape', 'sub', 'whisker'] as const) expect(f1[k], k).toBeCloseTo(f0[k], 2);
    for (const id of IDS) {
      const [a, b] = [pigeonAt(id, 0), pigeonAt(id, END)];
      expect(b.visible, `bird ${id}`).toBe(a.visible);
      for (const k of ['x', 'y', 'wings', 'bow', 'look', 'foot', 'alarm'] as const) expect(b.pose[k], `bird ${id} ${k}`).toBeCloseTo(a.pose[k] ?? 0, 1);
      expect(Math.cos((b.pose.flap ?? 0) - (a.pose.flap ?? 0)), `bird ${id} flap`).toBeCloseTo(1, 3);
    }
    const [m0, m1] = [moodAt(0), moodAt(END)];
    for (const k of ['drain', 'cool', 'warm'] as const) expect(m1[k], k).toBeCloseTo(m0[k], 3);
    expect(flashAt(END)).toBeCloseTo(flashAt(0), 3);
    expect(sprayAges(END).hook).toBeCloseTo(sprayAges(0).hook, 3);
    for (const f of [albiAt, metricAt, timerAt, (t: number) => featherAt(t).alpha]) {
      expect(f(0)).toBeCloseTo(0, 3);
      expect(f(END)).toBeCloseTo(0, 3);
    }
  });

  it('never jumps: the camera moves smoothly frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [camAt(wrap(t)), camAt(wrap(t + FRAME))];
      expect(Math.abs(a.zoom - b.zoom)).toBeLessThan(0.12);
      expect(Math.hypot(a.cx - b.cx, a.cy - b.cy)).toBeLessThan(60);
    }
  });

  it('opens on the hook: the catfish huge, jaws wide round a pigeon, nothing written', () => {
    expect(camAt(0.3).zoom).toBeGreaterThanOrEqual(2.4);
    expect(HOOK_CAM.zoom).toBeGreaterThanOrEqual(2.4);
    for (const t of [0.05, 0.5, 1.2, 1.6]) {
      const f = fishAt(t);
      expect(f.mode, `t=${t}`).toBe('side');
      expect(f.sub).toBe(0);
      expect(f.holds).toBe(0);
      expect(f.gape).toBeGreaterThan(0.4);
      expect(f.pose.len).toBeGreaterThanOrEqual(900);
    }
    for (let t = 0; t <= 2.5; t += FRAME) expect(albiAt(t) + metricAt(t) + timerAt(t), `t=${t}`).toBe(0);
    expect(captionAt(0.3)!.line.words.map((w) => w.text).join(' ')).toBe('This fish comes');
  });

  it('is alive from the first frame: the jaws work and the mouth moves', () => {
    let [lo, hi] = [Infinity, -Infinity];
    for (let t = 0; t < 1.6; t += FRAME) {
      lo = Math.min(lo, fishAt(t).gape);
      hi = Math.max(hi, fishAt(t).gape);
    }
    expect(hi - lo).toBeGreaterThan(0.08);
  });

  it('puts every noun on screen as it is said', () => {
    // "pigeons!": the pigeon is in the mouth. "Albi, France": written. "Pigeons washing on a gravel island": five birds, wings out.
    expect(fishAt(said('pigeons!')).holds).toBe(0);
    expect(albiAt(said('Albi,') + 0.3)).toBe(1);
    for (const id of IDS) expect(pigeonAt(id, said('gravel')).visible, `bird ${id}`).toBe(true);
    expect(IDS.some((id) => pigeonAt(id, said('washing') + 0.3).pose.bow! > 0.3)).toBe(true);
    // "something huge sliding up behind them": the long dark fish in the channel, whiskers ahead of it, one eye turned.
    expect(fishAt(said('huge') + 0.3).mode).toBe('top');
    expect(fishAt(said('huge') + 0.3).tips).toHaveLength(2);
    expect(shadowAlpha(said('huge') + 0.3)).toBeGreaterThan(0.5);
    expect(pigeonAt(2, said('them.')).pose.look!).toBeLessThan(0);
    // "WHAM! A five-foot catfish, half out of the river!": the fish on the gravel with a bird, 1.5 m over 5 ft.
    expect(fishAt(said('catfish,') + 0.1).mode).toBe('side');
    expect(fishAt(said('catfish,') + 0.1).holds).toBe(1);
    expect(fishAt(said('catfish,') + 0.1).sub).toBe(0);
    expect(metricAt(said('five-foot') + 0.3)).toBe(1);
    // "Four seconds, tops": the timer reads 4 s by "lunch".
    expect(timerAt(said('seconds,'))).toBe(1);
    expect(timerValue(said('lunch!') + 0.1)).toBe(4);
    expect(timerValue(said('Four'))).toBe(0);
    // ... and the fish is in view with the bird, sliding back, the flock in the air.
    const sliding = fishAt(said('tops,'));
    expect(sliding.mode).toBe('side');
    expect(sliding.pose.len).toBeLessThan(fishAt(said('catfish,')).pose.len);
    expect(sliding.holds).toBe(1);
    expect(sliding.sub).toBeLessThan(0.1);
    for (const id of [0, 2, 3, 4]) expect(pigeonAt(id, said('tops,')).pose.wings, `bird ${id}`).toBe(1);
    // "and it's gone, with lunch!": the fish is under, the feather is left.
    expect(fishAt(said('lunch!') + 0.3).sub).toBeGreaterThan(0.9);
    expect(featherAt(said('lunch!') + 0.3).alpha).toBeGreaterThan(0.5);
    // "Pigeons that stand still": every bird frozen, wings folded.
    for (const id of IDS.filter((i) => i !== 1)) expect(pigeonAt(id, said('still') + 0.2).pose.wings).toBe(0);
    // "MOVE": a foot jerks.
    expect(pigeonAt(2, MOVE_AT + 0.02).pose.foot!).toBeGreaterThan(0.5);
  });

  it('writes the narrated length (1.5 m) big with the US figure (5 ft) under it, smaller', () => {
    expect(TEXT.metric.y).toBeLessThan(TEXT.us.y);
    expect(TEXT.metric.size).toBeGreaterThan(TEXT.us.size);
    expect(metricAt(FIVEFOOT_AT + 0.3)).toBe(1);
    expect(metricAt(FOUR_AT + 0.3)).toBe(0);
  });

  it('comes back to frame 1 for the seam: the fish rises on "it\'s because" and the bird is in its mouth', () => {
    expect(fishAt(BURST_AT - 0.2).sub).toBe(1);
    expect(fishAt(BURST_AT + 0.3).sub).toBeLessThan(1);
    expect(fishAt(END).holds).toBe(0);
    expect(pigeonAt(0, said('nervous…')).visible).toBe(true);
    expect(pigeonAt(0, END).visible).toBe(false);
    expect(pigeonAt(0, said('nervous…')).pose.look!).toBeLessThan(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('because');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.6);
    expect(TEMPO).toBeLessThanOrEqual(1.15);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(19);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    for (let t = 0; t < LOOP_S; t += FRAME) expect(captionAt(t), `t=${t}`).not.toBeNull();
  });

  it('keeps every text line inside the area the apps leave clear (y 270 to 1250)', () => {
    for (const [name, line] of Object.entries(TEXT)) {
      expect(line.y, name).toBeGreaterThanOrEqual(270);
      expect(line.y, name).toBeLessThanOrEqual(1250);
      expect(line.y - line.size * 0.72, name).toBeGreaterThanOrEqual(270);
    }
  });

  it('lasts a whole number of video frames and line-boil cycles, with every word and sound inside the loop', () => {
    expect(LOOP_S % 1.5).toBeCloseTo(0, 9);
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const w of WORDS) {
      expect(w.start / TEMPO).toBeGreaterThanOrEqual(0);
      expect(w.end / TEMPO).toBeLessThan(LOOP_S);
    }
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });

  it('changes the sound with the mood: a smash for the WHAM, a low drop for the dread, ticks for the timer', () => {
    expect(SOUNDS.some((s) => s.id === 'smash' && Math.abs(s.t - said('WHAM!')) < 0.1)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'drop' && s.pitch < 0.5 && s.t > 5.5 && s.t < 7)).toBe(true);
    expect(SOUNDS.filter((s) => s.id === 'click' && s.t > FOUR_AT && s.t < FOUR_AT + 2).length).toBeGreaterThanOrEqual(6);
  });
});
