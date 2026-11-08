import { describe, expect, it } from 'vitest';
import { cycleOf, LEVEL, LOOP_S, playSegment, segmentAt, BEATS, RIGHT_FIRST, ACTIONS, SWAP_C } from '../dev/promo/plan';
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
    for (const t of [0, 2, 4, 6, 8, 10, 12, 13.4]) expect(overlayAt(cycleOf(t)).cta + overlayAt(cycleOf(t)).credit).toBe(0);
    expect(overlayAt(cycleOf(LOOP_S - 0.6)).cta).toBe(0);
    expect(overlayAt(cycleOf(14.5)).cta).toBe(1);
    // The wipe is done before the last frame, so the seam is clean.
    expect(overlayAt(cycleOf(LOOP_S - 1 / 30)).wipe).toBeNull();
  });

  it('wrong try: the big water first loses Nib to the boar, as staged', () => {
    let lostAt = -1;
    const w = playSegment('wrong', 11.6, (world, f) => {
      if (lostAt < 0 && world.status.state === 'lost') lostAt = f / 30;
    });
    expect(w.status).toMatchObject({ state: 'lost', cause: 'inked' });
    expect(lostAt).toBeGreaterThan(BEATS.failed - 0.3);
    expect(lostAt).toBeLessThanOrEqual(BEATS.failed + 0.05);
    expect(ACTIONS.wrong[0]).toMatchObject({ kind: 'tap', pin: 'W' });
  });

  it('right try: the lava first scorches the boar', () => {
    let scorchedAt = -1;
    const w: World = playSegment('right', 4.8, (world, f) => {
      if (scorchedAt < 0 && world.blots[0]!.gone) scorchedAt = f / 30;
    });
    expect(ACTIONS.right[0]).toMatchObject({ kind: 'tap', pin: RIGHT_FIRST });
    expect(scorchedAt).toBeGreaterThan(0);
    expect(scorchedAt).toBeLessThan(BEATS.scorched - SWAP_C + 0.1);
    expect(w.status.state).toBe('playing');
  });
});

describe('the narration', () => {
  it('has timings in order, inside the loop, from the pauses', async () => {
    const { WORDS, PHRASES, inVoice } = await import('../dev/promo/whichpin/words');
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end);
    for (const p of PHRASES) expect(inVoice(p.end)).toBeLessThan(LOOP_S - 0.3);
    // The beats fall inside their phrases: "Bye, Nib." holds the fail, "pull the LAVA first" the second pull.
    const bye = PHRASES[5]!;
    expect(BEATS.failed).toBeGreaterThan(inVoice(bye.start) + 0.5);
    expect(BEATS.failed - 0.5).toBeLessThan(inVoice(bye.end) + 0.2);
    const lava = PHRASES[6]!;
    const tapL = SWAP_C + ACTIONS.right[0]!.at - 0.5;
    expect(tapL).toBeGreaterThan(inVoice(lava.start));
    expect(tapL).toBeLessThanOrEqual(inVoice(lava.end));
    // "So, one question:" lands on the call to action.
    expect(inVoice(PHRASES[8]!.start)).toBeGreaterThan(LOOP_S - 3.0);
  });
});
