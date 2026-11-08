import { describe, expect, it } from 'vitest';
import { insectsAt } from '../dev/promo/crabbird/audio';
import {
  AT, cardCrabAt, climbAt, CTA, ctaAt, EYE_PAIRS, groundLiftAt, hookBird, hookCrab, LINES, LOOP_S, nightBird, nightCrab, said, shotsAt, SNAP_MARK, snapMarkAt, spokenAt, stateAt,
} from '../dev/promo/crabbird/story';
import { inVoice, TEMPO, WORDS } from '../dev/promo/crabbird/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS } from '../dev/promo/sprites';
import { BOIL } from '../src/art/palette';

const FRAME = 1 / 30;
const SCRIPT = 'This crab took down a sleeping BIRD. Middle of the night. A booby dozes on a low branch… and a coconut crab climbs up! It grabs the wing, and SNAPS it! The bird falls… and five MORE crabs arrive. A scientist saw the whole thing, the night';

describe('promo short: this crab took down a bird (narrated)', () => {
  it('lasts a whole number of video frames, line-boil cycles and 1.5 s beats', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect((LOOP_S * BOIL_FPS) % BOIL).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
  });

  it('has the script word for word, in order, ending 0.3 s before the loop point', () => {
    expect(WORDS.map((w) => w.text).join(' ')).toBe(SCRIPT);
    WORDS.forEach((w, i) => {
      expect(w.end).toBeGreaterThan(w.start);
      if (i > 0) expect(w.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end);
    });
    expect(inVoice(WORDS[WORDS.length - 1]!.end)).toBeCloseTo(LOOP_S - 0.3, 1);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.13);
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S', () => {
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    expect(stateAt(0).shots.under.id).toBe('hook');
    expect(stateAt(0).shots.over).toBeNull();
  });

  it('flows into the loop point: the last wash lands on frame 1, nothing jumps', () => {
    const last = shotsAt(LOOP_S - 1e-6);
    expect(last.over?.id).toBe('hook');
    expect(last.u).toBeCloseTo(1, 4);
    const [a, b] = [hookCrab(-1e-6), hookCrab(0)];
    expect(a.bigClaw.wrist.x).toBeCloseTo(b.bigClaw.wrist.x, 3);
    expect(a.bigClaw.open).toBeCloseTo(b.bigClaw.open, 3);
    expect(hookBird(-1e-6).breath).toBeCloseTo(hookBird(0).breath, 3);
    expect(insectsAt(LOOP_S)).toBe(insectsAt(0));
    expect(ctaAt(0)).toBe(0);
    expect(ctaAt(LOOP_S)).toBe(0);
  });

  it('climbs back into the pose of frame 1, and the crab never jumps on the way', () => {
    const [end, hook] = [nightCrab(AT.climbEnd + 1e-6)!, hookCrab(AT.climbEnd)];
    expect(end.x).toBeCloseTo(hook.x, 1);
    expect(end.y).toBeCloseTo(hook.y, 1);
    expect(end.heading).toBeCloseTo(hook.heading, 2);
    end.feet.forEach((f, i) => expect(Math.hypot(f.x - hook.feet[i]!.x, f.y - hook.feet[i]!.y)).toBeLessThan(4));
    const atWing = nightCrab(AT.wing)!;
    expect(atWing.bigClaw.wrist.x).toBeCloseTo(hookCrab(AT.wing).bigClaw.wrist.x, 0);
    for (let t = AT.reach; t < AT.fall; t += FRAME) {
      const [p, q] = [nightCrab(t)!, nightCrab(t + FRAME)!];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(60);
      // The strike of the snap itself is the fastest thing in the short.
      expect(Math.hypot(q.bigClaw.wrist.x - p.bigClaw.wrist.x, q.bigClaw.wrist.y - p.bigClaw.wrist.y)).toBeLessThan(70);
    }
  });

  it('starts below the frame: legs reach up the trunk before the body comes', () => {
    expect(climbAt(0).y).toBeGreaterThan(2000);
    expect(nightCrab(AT.reach - 0.01)).toBeNull();
  });

  it('matches the picture to the words', () => {
    // Asleep on the hook and on "dozes".
    expect(hookBird(0).eye).toBe(0);
    expect(nightBird(said('dozes')).eye).toBe(0);
    // The crab is on the way on "coconut", at the bird by "grabs".
    expect(AT.reach).toBeLessThan(said('coconut'));
    expect(AT.climbEnd).toBeLessThanOrEqual(said('grabs'));
    // The snap lands on its word, awake only after it.
    expect(AT.snap).toBe(said('SNAPS'));
    expect(nightBird(AT.snap - 0.01).eye).toBe(0);
    expect(nightBird(AT.snap + 0.1).eye).toBeGreaterThan(0.9);
    expect(snapMarkAt(AT.snap + 0.2)).toBe(1);
    expect(snapMarkAt(AT.snap - 0.05)).toBe(0);
    // Falling on "falls", on the ground by the five.
    expect(nightBird(said('falls…')).y).toBeGreaterThan(nightBird(AT.fall).y + 100);
    expect(shotsAt(AT.moreEyes).under.id).toBe('ground');
    // The last line stays on the night, ending in the wash back to frame 1.
    for (const w of ['scientist', 'saw', 'whole', 'thing,']) expect(shotsAt(said(w)).under.id).toBe('ground');
    expect(shotsAt(said('night')).over?.id ?? shotsAt(said('night')).under.id).not.toBe('night');
  });

  it('keeps to the checked facts: one pair of eyes, then five more', () => {
    expect(EYE_PAIRS).toHaveLength(6);
    expect(EYE_PAIRS.filter((p) => p.at === AT.firstEyes)).toHaveLength(1);
    expect(EYE_PAIRS.slice(1).every((p) => p.at >= said('five'))).toBe(true);
    // All six are up before "A scientist".
    expect(EYE_PAIRS.every((p) => p.at + 0.32 <= said('A', 2))).toBe(true);
  });

  it('shows the spoken line from frame 1, word by word, with every word covered', () => {
    expect(spokenAt(0).map((r) => r.words.join(' '))).toEqual(['This crab took down', 'a sleeping BIRD.']);
    expect(spokenAt(0)[0]!.current).toBe(0);
    expect(LINES.flat().map((w) => w.text)).toEqual(WORDS.map((w) => w.text));
    for (const w of WORDS) {
      const rows = spokenAt(inVoice(w.start) + 1e-3);
      expect(rows.some((r) => r.current >= 0 && r.words[r.current] === w.text)).toBe(true);
    }
    expect(spokenAt(LOOP_S - FRAME).map((r) => r.words.join(' '))).toEqual(['the night']);
  });

  it('keeps its words inside the safe area', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      for (const r of spokenAt(t)) {
        expect(r.y).toBeLessThanOrEqual(1250);
        expect(r.y - r.size * 0.8).toBeGreaterThanOrEqual(240);
      }
    }
    expect(SNAP_MARK.y).toBeLessThanOrEqual(1250);
    expect(CTA.y).toBeLessThanOrEqual(1250);
    expect(CTA.subY).toBeLessThanOrEqual(1250);
    expect(CTA.card.y + CTA.card.h).toBeLessThanOrEqual(1250);
    expect(CTA.card.x + CTA.card.w).toBeLessThanOrEqual(1080);
  });

  it('holds the invitation for the last 3 s, gone 0.6 s before the loop point', () => {
    for (let t = 0; t < LOOP_S - 3; t += FRAME) expect(ctaAt(t)).toBe(0);
    for (let t = LOOP_S - 0.6; t <= LOOP_S; t += FRAME) expect(ctaAt(t)).toBe(0);
    expect(ctaAt(14.5)).toBe(1);
    expect(groundLiftAt(0)).toBe(0);
    expect(cardCrabAt(LOOP_S - 1)).toBeGreaterThan(cardCrabAt(AT.ctaStart));
  });

  it('points the arrow down-left at the channel name, above the phone UI line', () => {
    for (const p of CTA.arrow) {
      expect(p.y).toBeLessThanOrEqual(1480);
      expect(p.x).toBeGreaterThanOrEqual(60);
    }
    const [from, tip] = [CTA.arrow[0]!, CTA.arrow[CTA.arrow.length - 1]!];
    expect(tip).toEqual({ x: 170, y: 1470 });
    expect(tip.x).toBeLessThan(from.x);
    expect(tip.y).toBeGreaterThan(from.y);
  });

  it('keeps the credit out of the first 10 s when asked, default unchanged', () => {
    const inAt = (AT.ctaStart + 0.3) / LOOP_S;
    for (let t = 0; t < 10; t += FRAME) expect(creditAt(t, LOOP_S, inAt)).toBe(0);
    expect(creditAt(14.5, LOOP_S, inAt)).toBeGreaterThan(0.7);
    expect(creditAt(LOOP_S - 0.6, LOOP_S, inAt)).toBe(0);
    expect(creditAt(0.6 * LOOP_S, LOOP_S, undefined)).toBe(creditAt(0.6 * LOOP_S, LOOP_S));
  });
});
