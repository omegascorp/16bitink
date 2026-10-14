import { describe, expect, it } from 'vitest';
import { contractBroken, contractDone, EMPTY_TALLY, goalLine, missionDone, oreTaken, rewardText, type ContractDef, type MissionDef } from '../src/logic/mission';
import { ORES } from '../src/logic/ore';
import { parseProfile } from '../src/logic/save';
import { NEW_PROFILE } from '../src/logic/economy';

describe('missions', () => {
  it('counts banked ore, its worth, and banked items', () => {
    const haul: MissionDef = { goals: [{ kind: 'credits', credits: 30 }], fee: 0 };
    expect(missionDone(haul, { ...EMPTY_TALLY, banked: { copper: 5 } })).toBe(ORES.copper.value * 5 >= 30);
    const core: MissionDef = { goals: [{ kind: 'core', depth: 60 }], fee: 0 };
    expect(missionDone(core, EMPTY_TALLY)).toBe(false);
    expect(missionDone(core, { ...EMPTY_TALLY, items: ['core'] })).toBe(true);
    const remix: MissionDef = { goals: [{ kind: 'ore', ore: 'graphite', count: 2 }, { kind: 'core', depth: 90 }], fee: 0 };
    expect(missionDone(remix, { ...EMPTY_TALLY, items: ['core'], banked: { graphite: 1 } })).toBe(false);
    expect(goalLine(remix.goals[0]!, { ...EMPTY_TALLY, banked: { graphite: 5 } })).toBe('graphite 2/2');
  });

  it('judges contracts about how it went only at lift-off, and knows when one is lost', () => {
    const clean: ContractDef = { kind: 'clean', pay: 1 };
    expect(contractDone(clean, EMPTY_TALLY, false)).toBe(false);
    expect(contractDone(clean, EMPTY_TALLY, true)).toBe(true);
    expect(contractBroken(clean, { ...EMPTY_TALLY, heartsLost: 1 })).toBe(true);
    const rush: ContractDef = { kind: 'rush', seconds: 60, pay: 1 };
    expect(contractDone(rush, { ...EMPTY_TALLY, time: 61 }, true)).toBe(false);
    expect(contractDone({ kind: 'careful', pay: 1 }, { ...EMPTY_TALLY, charges: 1 }, true)).toBe(false);
  });

  it('the guild takes ore goals and met orders only', () => {
    const m: MissionDef = { goals: [{ kind: 'ore', ore: 'graphite', count: 3 }], fee: 0 };
    const orders: ContractDef[] = [{ kind: 'order', ore: 'galena', count: 4, pay: 1 }, { kind: 'order', ore: 'silver', count: 2, pay: 1 }];
    expect(oreTaken(m, orders, { ...EMPTY_TALLY, banked: { graphite: 3, galena: 4, silver: 1 } })).toEqual({ graphite: 3, galena: 4 });
  });

  it('names the blueprint a mission hands over, and its recipe', () => {
    expect(rewardText({ goals: [], fee: 100, blueprint: 'drill-1' })).toBe('100 credits + the drill Mk 1 blueprint (needs 6 graphite, 4 galena)');
  });
});

describe('the saved profile', () => {
  it('drops anything malformed', () => {
    expect(parseProfile(null)).toEqual(NEW_PROFILE);
    const p = parseProfile({
      credits: 120, hold: { graphite: 3, gold: 2, copper: -1 }, gear: { cell: 1, drill: 99 }, found: ['cell-1', 'warp-9', 'cell-1'],
      ship: { winch: 1, hopper: 9 }, levels: { 'first-strike': { won: true, blots: 2, paid: ['order', 'bogus'] }, 'BAD ID': { won: true, blots: 1, paid: [] } },
    });
    expect(p.credits).toBe(120);
    expect(p.hold).toEqual({ graphite: 3 });
    expect(p.gear).toEqual({ drill: 0, cell: 1, pack: 0, suit: 0, helmet: 0, jetpack: 0 });
    expect(p.found).toEqual(['cell-1']);
    expect(p.ship).toEqual({ winch: 1, hopper: 0, rack: 0, hull: 0 });
    expect(p.levels).toEqual({ 'first-strike': { won: true, blots: 2, paid: ['order'] } });
  });

  it('round-trips through JSON', () => {
    const p = { ...NEW_PROFILE, credits: 5, found: ['drill-1'], levels: { 'lead-lines': { won: true, blots: 3, paid: ['clean' as const] } } };
    expect(parseProfile(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
});
