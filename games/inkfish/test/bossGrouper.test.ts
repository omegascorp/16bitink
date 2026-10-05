import { describe, expect, it } from 'vitest';
import { GROUPER, GROUPER_START, stepGrouper, type GrouperSense } from '../src/logic/bosses/grouper';
import { flushHide, HIDE_START } from '../src/levels/cover';

const sense = (over: Partial<GrouperSense> = {}): GrouperSense => ({ now: 1000, rel: 'hunt', dist: 200, seen: true, hidden: false, ...over });

describe('grouper: the boom', () => {
  it('swells up when you come close, booms into a lunge, then rests', () => {
    const swell = stepGrouper(GROUPER_START, sense());
    expect(swell.mode).toBe('swell');
    const lunge = stepGrouper(swell, sense({ now: swell.until, dist: 600 }));
    expect(lunge.mode).toBe('lunge');
    const rest = stepGrouper(lunge, sense({ now: lunge.until }));
    expect(rest.mode).toBe('rest');
    const roam = stepGrouper(rest, sense({ now: rest.until }));
    expect(roam.mode).toBe('roam');
    expect(stepGrouper(roam, sense({ now: rest.until + 1 })).mode).toBe('roam');
    expect(stepGrouper(roam, sense({ now: roam.boomAt })).mode).toBe('swell');
  });

  it('holds its boom when you are out of range or hidden', () => {
    expect(stepGrouper(GROUPER_START, sense({ dist: GROUPER.boomRange + 1 })).mode).toBe('roam');
    expect(stepGrouper(GROUPER_START, sense({ seen: false })).mode).toBe('roam');
  });

  it('booms to defend itself once you are bigger, then flees, with a quicker swell', () => {
    const wary = stepGrouper(GROUPER_START, sense({ rel: 'hide', dist: 800 }));
    expect(wary.mode).toBe('wary');
    const swell = stepGrouper(wary, sense({ rel: 'hide' }));
    expect(swell).toMatchObject({ mode: 'swell', until: 1000 + GROUPER.defendSwellMs });
    const flee = stepGrouper(swell, sense({ rel: 'hide', now: swell.until }));
    expect(flee.mode).toBe('flee');
    const back = stepGrouper(flee, sense({ rel: 'hide', now: flee.until }));
    expect(back.mode).toBe('wary');
    expect(stepGrouper(back, sense({ rel: 'hide', now: flee.until + 1 })).mode).toBe('wary');
  });
});

describe('grouper: the moray partner', () => {
  it('calls when you hide nearby, and not again for a while', () => {
    const calling = stepGrouper(GROUPER_START, sense({ hidden: true, seen: false, dist: 500 }));
    expect(calling.called).toBe(1000);
    const later = stepGrouper(calling, sense({ hidden: true, seen: false, dist: 500, now: 5000 }));
    expect(later.called).toBe(1000);
    expect(stepGrouper(later, sense({ hidden: true, seen: false, dist: 500, now: calling.callAt })).called).toBe(calling.callAt);
  });

  it("doesn't call for a hider far away", () => {
    expect(stepGrouper(GROUPER_START, sense({ hidden: true, dist: GROUPER.callRange + 1 })).called).toBe(0);
  });

  it('flushing someone out of cover spots them and keeps cover shut for a while', () => {
    const rules = { maxMs: 6000, cooldownMs: 4000 };
    const hidden = { ...HIDE_START, hidden: true, usedMs: 900 };
    const out = flushHide(hidden, 2000, rules);
    expect(out.spotted).toBe(true);
    expect(out.state).toMatchObject({ hidden: false, mustLeave: true, blockedUntil: 6000 });
    expect(flushHide(HIDE_START, 2000, rules).spotted).toBe(false);
  });
});
