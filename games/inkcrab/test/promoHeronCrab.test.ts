import { describe, expect, it } from 'vitest';
import {
  afterCrab, afterHeron, AT, closeCrab, closeHeron, CTA, ctaAt, eyeOf, hangingCrab, holdHeron, LINES, LOOP_S, marshCrab, marshHeron, ROW, said, SCORE, scoreCrabAt,
  scoreHeronAt, shotsAt, spokenAt, starAt, stateAt,
} from '../dev/promo/heroncrab/story';
import { inVoice, TEMPO, WORDS } from '../dev/promo/heroncrab/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS } from '../dev/promo/sprites';
import { BOIL } from '../src/art/palette';

const FRAME = 1 / 30;
const SCRIPT = 'This heron picked the WRONG crab! A young night heron spots a crab in the marsh… It strikes, and the crab pokes it in the EYE! Second try? The crab clamps BOTH claws on its bill! The heron shakes… and flies off. Crab, one. Heron, zero. Which proves';
const TEXT_TOP = 270;
const TEXT_BOTTOM = 1250;

describe('promo short: this heron picked the wrong crab (narrated)', () => {
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
    expect(inVoice(WORDS[0]!.start)).toBeGreaterThanOrEqual(0);
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
    const [a, b] = [holdHeron(-1e-6), holdHeron(0)];
    expect(a.head.x).toBeCloseTo(b.head.x, 3);
    expect(a.head.a).toBeCloseTo(b.head.a, 3);
    const [ca, cb] = [hangingCrab(a, -1e-6, 0.06 * Math.sin(-1e-6 * 2.4)), hangingCrab(b, 0, 0)];
    expect(ca.x).toBeCloseTo(cb.x, 2);
    expect(ca.y).toBeCloseTo(cb.y, 2);
    expect(ctaAt(0)).toBe(0);
    expect(ctaAt(LOOP_S)).toBe(0);
    expect(scoreCrabAt(0)).toBe(0);
    expect(scoreCrabAt(LOOP_S)).toBe(0);
  });

  it('frame 1 proves the title: the crab hangs from the bill by both claws, the heron wide-eyed', () => {
    const heron = holdHeron(0.3);
    const crab = hangingCrab(heron, 0.3, 0);
    expect(heron.head.alarm).toBe(1);
    expect(crab.dangle).toBe(1);
    expect(crab.glare).toBe(1);
    expect(crab.claws.every((c) => c.open < 0.2)).toBe(true);
    // Below the bill, and big.
    expect(crab.y).toBeGreaterThan(heron.y + heron.head.y * heron.k);
    expect(crab.k * 236).toBeGreaterThan(400);
  });

  it('matches the picture to the words', () => {
    // The stab on "strikes", the claw on the eye on "pokes", the eye shut and the star after it.
    expect(marshHeron(AT.strike - 0.05).lean).toBeLessThan(marshHeron(AT.strike + 0.1).lean);
    const atPoke = marshHeron(AT.poke + 0.2);
    const jab = marshCrab(AT.poke + 0.2, eyeOf(atPoke), { x: 0, y: 0 }).claws[1].tip;
    expect(Math.hypot(jab.x - eyeOf(atPoke).x, jab.y - eyeOf(atPoke).y)).toBeLessThan(80);
    expect(marshHeron(AT.poke - 0.05).head.wince).toBe(0);
    expect(marshHeron(AT.poke + 0.3).head.wince).toBe(1);
    expect(starAt(AT.poke - 0.02)).toBe(0);
    expect(starAt(said('EYE!'))).toBeGreaterThan(0);
    // Wings up for the stand-off, the crab's claws up too.
    expect(marshHeron(said('Second')).wings.open).toBeGreaterThan(0.9);
    expect(marshCrab(said('Second'), { x: 0, y: 0 }, { x: 0, y: 0 }).glare).toBe(1);
    // In close on the clamp; the first claw shuts on "clamps", the second on "BOTH".
    expect(shotsAt(said('clamps')).under.id).toBe('close');
    const before = closeCrab(AT.clamp2 - 0.2);
    const after = closeCrab(AT.clamp2 + 0.05);
    expect(before.claws[1].open).toBeGreaterThan(after.claws[1].open);
    // Lifted clear by "bill!", shaken on "shakes", gone on "flies".
    expect(closeCrab(said('bill!')).dangle).toBe(1);
    expect(Math.abs(closeHeron(AT.shake + 0.3).head.a - closeHeron(AT.shake + 0.45).head.a)).toBeGreaterThan(0.05);
    expect(shotsAt(said('flies')).under.id).toBe('after');
    expect(afterHeron(said('one.')).k).toBeLessThan(afterHeron(AT.after).k);
    expect(afterCrab(said('one.')).claws[0].tip.y).toBeLessThan(afterCrab(said('one.')).y);
    // The score on its words.
    expect(scoreCrabAt(said('one.') - 0.05)).toBe(0);
    expect(scoreCrabAt(said('one.') + 0.2)).toBe(1);
    expect(scoreHeronAt(said('zero.') - 0.05)).toBe(0);
    expect(scoreHeronAt(said('zero.') + 0.2)).toBe(1);
  });

  it('shows the spoken line from frame 1, word by word, with every word covered', () => {
    expect(spokenAt(0).map((r) => r.words.join(' '))).toEqual(['This heron picked', 'the WRONG crab!']);
    expect(spokenAt(0)[0]!.current).toBe(0);
    expect(LINES.flat().map((w) => w.text)).toEqual(WORDS.map((w) => w.text));
    for (const w of WORDS) {
      const rows = spokenAt(inVoice(w.start) + 1e-3);
      expect(rows.some((r) => r.current >= 0 && r.words[r.current] === w.text)).toBe(true);
    }
    expect(spokenAt(LOOP_S - FRAME).map((r) => r.words.join(' '))).toEqual(['Which proves']);
  });

  it('keeps its words between y 270 and 1250', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      for (const r of spokenAt(t)) {
        expect(r.y).toBeLessThanOrEqual(TEXT_BOTTOM);
        expect(r.y - r.size * 0.8).toBeGreaterThanOrEqual(TEXT_TOP - 30);
      }
    }
    expect(ROW.y).toBeLessThanOrEqual(TEXT_BOTTOM);
    expect(SCORE.y - SCORE.size * 0.8).toBeGreaterThanOrEqual(TEXT_TOP);
    expect(SCORE.y).toBeLessThanOrEqual(TEXT_BOTTOM);
    expect(CTA.y).toBeLessThanOrEqual(TEXT_BOTTOM);
    expect(CTA.subY).toBeLessThanOrEqual(TEXT_BOTTOM);
    expect(CTA.card.y).toBeGreaterThanOrEqual(TEXT_TOP);
    expect(CTA.card.y + CTA.card.h).toBeLessThanOrEqual(TEXT_BOTTOM);
    expect(CTA.card.x + CTA.card.w).toBeLessThanOrEqual(1080);
  });

  it('shows the invitation only at the end: off frame 1, gone 0.6 s before the loop point', () => {
    for (let t = 0; t < LOOP_S - 2.6; t += FRAME) expect(ctaAt(t)).toBe(0);
    for (let t = LOOP_S - 0.6; t <= LOOP_S; t += FRAME) expect(ctaAt(t)).toBe(0);
    expect(ctaAt(LOOP_S - 1.5)).toBe(1);
    // After the payoff: the heron has already flown off.
    expect(AT.ctaStart).toBeGreaterThan(AT.after);
  });

  it('keeps the credit (with the short link) to the invitation', () => {
    const inAt = (AT.ctaStart + 0.3) / LOOP_S;
    for (let t = 0; t < AT.ctaStart + 0.3; t += FRAME) expect(creditAt(t, LOOP_S, inAt)).toBe(0);
    expect(creditAt(LOOP_S - 1.5, LOOP_S, inAt)).toBeGreaterThan(0.7);
    expect(creditAt(LOOP_S - 0.6, LOOP_S, inAt)).toBe(0);
    expect(creditAt(0, LOOP_S, inAt)).toBe(0);
  });
});
