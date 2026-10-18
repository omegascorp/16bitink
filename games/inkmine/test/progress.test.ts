import { describe, expect, it } from 'vitest';
import type { GameEvent } from '@16bitink/game-sdk';
import { NEW_PROFILE, type Profile } from '../src/logic/economy';
import { ROUND_TRIP } from '../src/logic/fuel';
import { advance, sessionStart, stepIndex, STEPS } from '../src/logic/progress';
import { BRINE_SET, MYCEL_SET } from '../src/logic/repairs';
import { parseProfile } from '../src/logic/save';
import { FIRST_COURSE, STARSHIP_IDS } from '../src/logic/starship';
import { withBeat } from '../src/logic/story';

const at = (p: Profile, step: string, played = 0, since = 0): Profile => ({ ...p, stats: { played, step, since } });
const beats = (p: Profile, ...bs: Parameters<typeof withBeat>[1][]): Profile => bs.reduce(withBeat, p);
const kinds = (events: readonly GameEvent[]): string[] => events.map((e) => (e.type === 'level_start' ? `start ${e.n}` : `${e.result} ${e.n} ${e.seconds}s`));

/** The whole story so far, one goal at a time, as a player goes through it. */
function walk(): Profile[] {
  const out: Profile[] = [NEW_PROFILE];
  const next = (f: (p: Profile) => Profile): void => void out.push(f(out[out.length - 1]!));
  next((p) => ({ ...p, repaired: ['printer'] }));
  next((p) => ({ ...p, repaired: [...p.repaired, 'hull'] }));
  next((p) => ({ ...p, found: ['drill-1'] }));
  next((p) => ({ ...p, gear: { ...p.gear, drill: 1 } }));
  next((p) => ({ ...p, repaired: [...p.repaired, 'thrusters'] }));
  next((p) => ({ ...p, repaired: [...p.repaired, 'comms'] }));
  next((p) => ({ ...p, tools: ['receiver'] }));
  next((p) => beats(p, 'called', 'met'));
  next((p) => beats(p, 'paid'));
  next((p) => beats(p, 'core'));
  next((p) => ({ ...p, repaired: [...p.repaired, 'core'] }));
  next((p) => ({ ...p, fuel: ROUND_TRIP }));
  next((p) => ({ ...beats(p, 'flown'), docked: true }));
  for (const id of STARSHIP_IDS) next((p) => ({ ...p, starship: [...p.starship, id] }));
  next((p) => ({ ...p, shipFuel: FIRST_COURSE.fuel }));
  next((p) => beats(p, 'course'));
  next((p) => ({ ...p, at: 'mycel' }));
  next((p) => ({ ...p, visited: ['graphite', 'mycel'], docked: false }));
  next((p) => beats(p, 'distress', 'asterFound'));
  next((p) => ({ ...p, found: [...p.found, 'pulse'] }));
  next((p) => ({ ...p, tools: [...p.tools, 'pulse'] }));
  next((p) => ({ ...p, found: [...p.found, 'drill-2'] }));
  next((p) => ({ ...p, gear: { ...p.gear, drill: 2 } }));
  next((p) => ({ ...p, found: [...new Set([...p.found, ...MYCEL_SET])] }));
  next((p) => beats(p, 'asterCamp'));
  next((p) => beats(p, 'asterWoken'));
  // Chapter 3: the Aster tank, the trip, and Brine.
  next((p) => ({ ...p, starship: [...p.starship, 'asterTank'] }));
  next((p) => ({ ...p, shipFuel: 14 }));
  next((p) => ({ ...p, at: 'brine', docked: true }));
  next((p) => ({ ...p, visited: [...p.visited, 'brine'], docked: false }));
  next((p) => beats(p, 'craftFound'));
  next((p) => beats(p, 'reefMet'));
  next((p) => ({ ...beats(p, 'reefPaid', 'crewMet'), found: [...p.found, 'drill-3', 'rebreather'] }));
  next((p) => ({ ...p, gear: { ...p.gear, drill: 3 } }));
  next((p) => ({ ...p, tools: [...p.tools, 'rebreather'] }));
  next((p) => ({ ...p, found: [...new Set([...p.found, ...BRINE_SET])] }));
  next((p) => beats(p, 'craftRaised'));
  next((p) => beats(p, 'craftMended'));
  next((p) => beats(p, 'crystalFound'));
  next((p) => ({ ...beats(p, 'craftFlown'), shipFuel: 0 }));
  next((p) => ({ ...p, shipFuel: 14 }));
  next((p) => ({ ...p, at: 'mycel', shipFuel: 0 }));
  next((p) => beats(p, 'asterReunion'));
  return out;
}

describe('the goal funnel', () => {
  it('lists every goal of the story once, in the order a player meets them', () => {
    expect(walk().map(stepIndex)).toEqual(STEPS.map((_, i) => i));
  });

  it('keeps within what the site accepts for a level', () => {
    expect(new Set(STEPS.map((s) => s.key)).size).toBe(STEPS.length);
    expect(STEPS.length).toBeLessThanOrEqual(500);
    for (const s of STEPS) {
      expect(s.key.length).toBeLessThanOrEqual(40);
      expect(s.name.length).toBeLessThanOrEqual(80);
    }
  });

  it('beats the step a goal moved past, timed by play time, and starts the next', () => {
    const p = at({ ...NEW_PROFILE, repaired: ['printer'] }, 'repair:printer', 100, 40);
    const r = advance(p, 130);
    expect(r.events).toEqual([
      { type: 'level_end', level: 'repair:printer', n: 1, name: 'Repair the printer', result: 'win', seconds: 90 },
      { type: 'level_start', level: 'repair:hull', n: 2, name: 'Repair the hull' },
    ]);
    expect(r.profile.stats).toEqual({ played: 130, step: 'repair:hull', since: 130 });
  });

  it('only keeps the clock when the goal stays the same', () => {
    const r = advance(at(NEW_PROFILE, 'repair:printer', 10, 0), 25);
    expect(r.events).toEqual([]);
    expect(r.profile.stats).toEqual({ played: 25, step: 'repair:printer', since: 0 });
  });

  it('counts a step gone straight past as started and beaten at once, so the funnel has no gap', () => {
    // The drill was studied before the hull was mended: its "find" goal never showed.
    const p = at({ ...NEW_PROFILE, repaired: ['printer', 'hull'], found: ['drill-1'] }, 'repair:hull', 50, 20);
    expect(kinds(advance(p, 60).events)).toEqual(['win 2 40s', 'start 3', 'win 3 0s', 'start 4']);
  });

  it('beats the last step as soon as it is reached', () => {
    const story = walk();
    const last = story[story.length - 1]!;
    const r = advance(at(last, STEPS[STEPS.length - 2]!.key, 500, 400), 520);
    expect(kinds(r.events)).toEqual([`win ${STEPS.length - 1} 120s`, `start ${STEPS.length}`, `win ${STEPS.length} 0s`]);
    expect(sessionStart(r.profile).events).toEqual([]);
  });

  it('starts the current step again each session', () => {
    const p = at({ ...NEW_PROFILE, repaired: ['printer'] }, 'repair:hull', 70, 30);
    const r = sessionStart(p);
    expect(r.events).toEqual([{ type: 'level_start', level: 'repair:hull', n: 2, name: 'Repair the hull' }]);
    expect(r.profile).toBe(p);
  });

  it('picks a save from before the stats up where it is, without reporting what it passed', () => {
    const old = { ...NEW_PROFILE, repaired: ['printer', 'hull'] } as Profile;
    const r = sessionStart(old);
    expect(kinds(r.events)).toEqual(['start 3']);
    expect(r.profile.stats).toEqual({ played: 0, step: 'find:drill-1', since: 0 });
    expect(advance(r.profile, 5).events).toEqual([]);
  });

  it('saves and loads the stats, and drops a step or time it does not know', () => {
    const p = at(NEW_PROFILE, 'repair:hull', 321.5, 300);
    expect(parseProfile(JSON.parse(JSON.stringify(p))).stats).toEqual(p.stats);
    expect(parseProfile({ ...p, stats: { played: -4, step: 'nap', since: 9 } }).stats).toEqual({ played: 0, step: '', since: 0 });
    expect(parseProfile({ ...p, stats: { played: 10, step: 'repair:hull', since: 99 } }).stats.since).toBe(10);
    expect(parseProfile({ ...p, stats: undefined }).stats).toEqual(NEW_PROFILE.stats);
  });
});
