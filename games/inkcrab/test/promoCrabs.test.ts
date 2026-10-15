import { describe, expect, it } from 'vitest';
import {
  ancestorLabelAt, armourLabelAt, arrowAt, captionAt, fiveAt, foldAt, FOLDS, headingAt, hermitAt, kingAt, kingTitleAt, laneFigure, LANES, lanesAt,
  LINES, LOOP_S, marchAt, marchFigure, MARCH_M, nameAt, nameSwapAt, probablyAt, said, shapeCalloutAt, shellLabelAt, SOUNDS, stampAt, STAMPS,
  tallyAt, voiceTime, writeAt,
} from '../dev/promo/crabs/story';
import { TEMPO, TRIM, WORDS } from '../dev/promo/crabs/words';
import { BOIL_FPS, boilAt } from '../dev/promo/sprites';
import { BOIL } from '../src/art/palette';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;

/** Every number that places something on screen at time t, by name. */
function state(t: number): Record<string, number> {
  const s: Record<string, number> = {};
  const head = headingAt(t);
  s.headAlpha = head.alpha;
  s.headReveal = head.reveal * head.alpha;
  s.march = marchAt(t);
  MARCH_M.forEach((_, i) => {
    const f = marchFigure(i, t);
    s[`march${i}x`] = f.x;
    s[`march${i}y`] = f.y;
    s[`march${i}m`] = f.m * f.alpha;
    s[`march${i}name`] = nameSwapAt(i, t) * f.alpha;
  });
  s.callout = shapeCalloutAt(t);
  s.lanes = lanesAt(t);
  LANES.forEach((_, k) => {
    s[`lane${k}m`] = laneFigure(k, 'result', t).m * lanesAt(t);
    s[`lane${k}x`] = laneFigure(k, 'result', t).x;
    s[`tally${k}`] = tallyAt(k, t);
    s[`ancestor${k}`] = ancestorLabelAt(k, t);
  });
  s.five = fiveAt(t);
  const k = kingAt(t);
  // Where the king crab is only matters while it shows.
  s.kingX = k.alpha > 0 ? k.x : Number.NaN;
  s.kingY = k.alpha > 0 ? k.y : Number.NaN;
  s.kingScale = k.alpha > 0 ? k.scale : Number.NaN;
  s.kingAlpha = k.alpha;
  s.kingTitle = kingTitleAt(t);
  s.probably = probablyAt(t);
  s.arrow = arrowAt(t);
  const h = hermitAt(t);
  s.shell = h.shell;
  s.crab = h.crab;
  s.crabDx = h.dx * h.crab;
  s.shellLabel = shellLabelAt(t);
  s.armour = armourLabelAt(t);
  STAMPS.forEach((_, i) => {
    s[`stamp${i}`] = stampAt(i, t);
  });
  s.name = nameAt(t);
  s.write = writeAt(t);
  return s;
}

/** How far each thing may move in one frame. */
const STEP: Readonly<Record<string, number>> = { x: 25, y: 25, kingX: 40, kingY: 40, kingScale: 0.8, crabDx: 30 };
/** Stamps (the "×5", the king crab, the hermit, the gallery's crabs) land in a few frames, with a bounce. */
const stepFor = (key: string): number => STEP[key] ?? (/x$/.test(key) ? 25 : /y$/.test(key) ? 25 : /^(five|stamp|kingAlpha|shell$|crab$)/.test(key) ? 0.6 : 0.35);

describe('promo short: evolution keeps making crabs (narrated)', () => {
  it('loops: everything at the loop point is where it was at the start', () => {
    const [a, b] = [state(0), state(END)];
    for (const key of Object.keys(a)) {
      if (Number.isNaN(a[key]!)) expect(b[key], key).toBeNaN();
      else expect(b[key], key).toBeCloseTo(a[key]!, 3);
    }
  });

  it('never jumps: everything moves on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [state((t + LOOP_S) % LOOP_S), state((t + FRAME + LOOP_S) % LOOP_S)];
      for (const key of Object.keys(a)) {
        const step = Math.abs(b[key]! - a[key]!);
        if (!Number.isNaN(step)) expect(step, `${key} at ${t.toFixed(3)}`).toBeLessThan(stepFor(key));
      }
    }
  });

  it('opens on the hook: the heading written out over a march from shrimp-like to crab, already walking', () => {
    expect(headingAt(0)).toEqual({ alpha: 1, reveal: 1 });
    expect(marchAt(0)).toBe(1);
    expect(MARCH_M.map((_, i) => marchFigure(i, 0).m)).toEqual([0, 0.3, 0.62, 1]);
    expect(captionAt(0)!.line.words.map((w) => w.text).join(' ')).toBe('Evolution keeps');
    expect(captionAt(0)!.word).toBe(0);
    const [f0, f1] = [marchFigure(0, 0), marchFigure(0, FRAME)];
    expect(Math.hypot(f1.x - f0.x, f1.y - f0.y)).toBeGreaterThan(0.1);
    // Nothing from later in the story is on the page.
    expect(lanesAt(0) + kingAt(0).alpha + nameAt(0) + stampAt(0, 0)).toBe(0);
  });

  it('turns every one of them into a crab on "CRABS", and calls out the shape on "crab-shaped"', () => {
    for (let i = 0; i < 4; i++) {
      expect(foldAt(i, said('making'))).toBe(0);
      expect(marchFigure(i, said('crab-shaped')).m).toBe(1);
    }
    expect(nameSwapAt(0, said('A'))).toBe(1);
    expect(shapeCalloutAt(said('crab-shaped') + 0.15)).toBe(1);
    expect(shapeCalloutAt(said('making'))).toBe(0);
  });

  it('counts five separate times: a lane folds into a crab with each tally stroke, the fifth and "×5" on "five"', () => {
    expect(lanesAt(said('evolved'))).toBe(1);
    expect(FOLDS[0]).toBeCloseTo(said('evolved'), 6);
    expect(FOLDS[4]).toBeCloseTo(said('five'), 6);
    expect(tallyAt(4, said('five') - 0.1)).toBe(0);
    expect(tallyAt(4, said('five') + 0.15)).toBe(1);
    expect(fiveAt(said('five') - 0.1)).toBe(0);
    expect(fiveAt(said('five') + 0.3)).toBeCloseTo(1, 2);
    for (let k = 0; k < LANES.length; k++) {
      expect(laneFigure(k, 'result', said('crab-shaped') + 0.8).m).toBeCloseTo(LANES[k]!.m0, 6);
      expect(laneFigure(k, 'result', said('separate')).m).toBe(1);
      expect(laneFigure(k, 'ancestor', said('separate')).m).toBe(LANES[k]!.m0);
    }
    // The ancestors are named as "animals that started out as something else" is said.
    expect(ancestorLabelAt(0, said('in'))).toBe(0);
    for (let k = 0; k < LANES.length; k++) expect(ancestorLabelAt(k, said('something'))).toBe(1);
    expect(lanesAt(said('King'))).toBe(0);
  });

  it('lands the king crab on "King crabs", traces it back to the hermit crab, and turns the hermit into it on "armour"', () => {
    expect(kingAt(said('King') - 0.2).alpha).toBe(0);
    expect(kingAt(said('crabs', 1)).alpha).toBe(1);
    expect(kingTitleAt(said('crabs', 1))).toBe(1);
    expect(kingAt(said('crabs', 1)).x).toBe(540);
    // Payoff in the middle of the loop.
    expect(said('King') / LOOP_S).toBeGreaterThan(0.4);
    expect(said('King') / LOOP_S).toBeLessThan(0.55);
    expect(probablyAt(said('probably') + 0.15)).toBe(1);
    expect(hermitAt(said('hermit') - 0.15).shell).toBe(0);
    expect(hermitAt(said('crabs,')).shell).toBeGreaterThan(0.95);
    expect(arrowAt(said('crabs,'))).toBe(1);
    expect(kingAt(said('crabs,')).x).toBeGreaterThan(700);
    // Out of the borrowed shell on "swapped … shell".
    expect(hermitAt(said('swapped') - 0.1).dx).toBe(0);
    expect(hermitAt(said('for')).dx).toBeGreaterThan(150);
    expect(hermitAt(said('for')).shell).toBe(1);
    expect(shellLabelAt(said('shell'))).toBe(1);
    // Armour of their own: the hermit gone, the king crab where it stood.
    expect(hermitAt(said('own.')).crab).toBe(0);
    expect(kingAt(said('own.')).x).toBeLessThan(600);
    expect(armourLabelAt(said('of'))).toBe(1);
  });

  it('stamps the game\'s crabs on "so often", then writes the name in on "carcinization"', () => {
    for (let i = 0; i < STAMPS.length; i++) {
      expect(stampAt(i, said('It') - 0.1)).toBe(0);
      expect(stampAt(i, said('scientists'))).toBeGreaterThan(0.95);
    }
    expect(nameAt(said('gave'))).toBe(1);
    expect(kingAt(said('name:')).alpha).toBe(0);
    expect(writeAt(said('carcinization.') - 0.1)).toBe(0);
    expect(writeAt(said('Face') - 0.4)).toBe(1);
    // And clears back to the opening for "Face it:".
    expect(nameAt(LOOP_S - 0.3)).toBe(0);
    expect(marchAt(LOOP_S - 0.3)).toBe(1);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('it:');
    expect(LOOP_S - voiceTime(last.end)).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - voiceTime(last.end) + voiceTime(WORDS[0]!.start)).toBeLessThan(0.5);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.15);
    expect(TRIM).toBeLessThan(WORDS[0]!.start);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(4);
    for (const w of WORDS) {
      const now = captionAt(voiceTime(w.start) + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect((LOOP_S * BOIL_FPS) % BOIL).toBe(0);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END)).toBe(BOIL - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
