import { describe, expect, it } from 'vitest';
import { momentScore, pickHighlights, type Moment } from '../src/logic/clips/moments';

const m = (kind: Moment['kind'], at: number, weight?: number): Moment => ({ kind, at, weight });

describe('clip moments', () => {
  it('rank eating the giant above a plain stage-up', () => {
    expect(momentScore(m('giant', 0))).toBeGreaterThan(momentScore(m('grow', 0)));
    expect(momentScore(m('birdCombo', 0))).toBeGreaterThan(momentScore(m('bird', 0)));
  });

  it('score a bigger combo higher', () => {
    expect(momentScore(m('birdCombo', 0, 3))).toBeGreaterThan(momentScore(m('birdCombo', 0, 2)));
  });

  it('pick the best windows, in the order they happened', () => {
    const moments = [m('grow', 5), m('bird', 20), m('birdCombo', 21, 2), m('giant', 40), m('frenzy', 60)];
    const picked = pickHighlights(moments, { before: 100, max: 2 });
    expect(picked.map((p) => p.kind)).toEqual(['birdCombo', 'giant']);
    expect(picked[0]!.at).toBeLessThan(picked[1]!.at);
  });

  it('count moments close together as one richer window', () => {
    // A bird, then a combo a second later, beats a lone escape.
    const picked = pickHighlights([m('escape', 10), m('bird', 30), m('birdCombo', 30.8, 2)], { before: 100, max: 1 });
    expect(picked[0]!.at).toBeGreaterThanOrEqual(30);
  });

  it('never pick two windows that overlap', () => {
    const picked = pickHighlights([m('giant', 10), m('giant', 11), m('giant', 30)], { before: 100, max: 3 });
    expect(picked).toHaveLength(2);
  });

  it('leave out anything too close to the ending, which the lead-in already shows', () => {
    const picked = pickHighlights([m('giant', 48), m('grow', 10)], { before: 47, max: 3 });
    expect(picked.map((p) => p.kind)).toEqual(['grow']);
  });

  it('leave out moments whose footage is gone', () => {
    const footage = [{ from: 0, to: 15 }];
    const picked = pickHighlights([m('giant', 30), m('grow', 10)], { before: 100, max: 3, footage });
    expect(picked.map((p) => p.kind)).toEqual(['grow']);
  });
});
