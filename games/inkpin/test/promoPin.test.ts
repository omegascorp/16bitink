import { describe, expect, it } from 'vitest';
import { cycleOf, LEVEL, LOOP_S, playSegment, segmentAt, BEATS, RIGHT_FIRST, ACTIONS } from '../dev/promo/plan';
import { overlayAt } from '../dev/promo/overlay';
import { World } from '../src/logic/world';

describe('InkPin "Which pin first?" promo', () => {
  it('is on The Guard, with its three pins in the first hall', () => {
    expect(LEVEL.id).toBe('guard');
    expect(LEVEL.chapter).toContain('Chapter 1');
  });

  it('shows the same board and overlay at t=0 and t=LOOP', () => {
    const a = segmentAt(cycleOf(0));
    const b = segmentAt(cycleOf(LOOP_S));
    expect(b).toEqual(a);
    const save = (t: number) => {
      const { segment, local } = segmentAt(cycleOf(t));
      return JSON.stringify(playSegment(segment, local).save());
    };
    expect(save(LOOP_S)).toBe(save(0));
    expect(overlayAt(cycleOf(LOOP_S))).toEqual(overlayAt(cycleOf(0)));
    // The ink wipe has finished by t=0, and nothing about the call to action shows early.
    expect(overlayAt(cycleOf(0)).wipe).toBeNull();
    for (const t of [0, 2, 4, 6, 7.9]) expect(overlayAt(cycleOf(t)).cta + overlayAt(cycleOf(t)).credit).toBe(0);
    expect(overlayAt(cycleOf(LOOP_S - 0.6)).cta).toBe(0);
    expect(overlayAt(cycleOf(13)).cta).toBe(1);
  });

  it('wrong try: the big water first loses Nib to the boar, as staged', () => {
    let lostAt = -1;
    const w = playSegment('wrong', 7.5, (world, f) => {
      if (lostAt < 0 && world.status.state === 'lost') lostAt = f / 30;
    });
    expect(w.status).toMatchObject({ state: 'lost', cause: 'inked' });
    expect(lostAt).toBeGreaterThan(5.5);
    expect(lostAt).toBeLessThanOrEqual(BEATS.failed);
    expect(ACTIONS.wrong[0]).toMatchObject({ kind: 'tap', pin: 'W' });
  });

  it('right try: the lava first scorches the boar and Nib takes the ledge gold', () => {
    let scorchedAt = -1;
    const w: World = playSegment('right', 6.2, (world, f) => {
      if (scorchedAt < 0 && world.blots[0]!.gone) scorchedAt = f / 30;
    });
    expect(ACTIONS.right[0]).toMatchObject({ kind: 'tap', pin: RIGHT_FIRST });
    expect(scorchedAt).toBeGreaterThan(0);
    expect(scorchedAt).toBeLessThan(BEATS.scorched - 7.8 + 0.2);
    expect(w.status.state).toBe('playing');
    expect(w.coinsCollected).toBeGreaterThanOrEqual(6);
  });
});
