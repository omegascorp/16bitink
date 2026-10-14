import { describe, expect, it } from 'vitest';
import { contractBroken, contractDone, EMPTY_TALLY, goalLine, missionDone, oreTaken, rewardText, type ContractDef, type MissionDef } from '../src/logic/mission';

describe('missions', () => {
  it('counts banked ore, its worth, and banked items', () => {
    const haul: MissionDef = { goals: [{ kind: 'pieces', count: 6 }], pays: {} };
    expect(missionDone(haul, { ...EMPTY_TALLY, banked: { copper: 5 } })).toBe(false);
    expect(missionDone(haul, { ...EMPTY_TALLY, banked: { copper: 5, galena: 1 } })).toBe(true);
    const core: MissionDef = { goals: [{ kind: 'core', depth: 60 }], pays: {} };
    expect(missionDone(core, EMPTY_TALLY)).toBe(false);
    expect(missionDone(core, { ...EMPTY_TALLY, items: ['core'] })).toBe(true);
    const remix: MissionDef = { goals: [{ kind: 'ore', ore: 'graphite', count: 2 }, { kind: 'core', depth: 90 }], pays: {} };
    expect(missionDone(remix, { ...EMPTY_TALLY, items: ['core'], banked: { graphite: 1 } })).toBe(false);
    expect(goalLine(remix.goals[0]!, { ...EMPTY_TALLY, banked: { graphite: 5 } })).toBe('graphite 2/2');
  });

  it('judges contracts about how it went only at lift-off, and knows when one is lost', () => {
    const clean: ContractDef = { kind: 'clean', pay: {} };
    expect(contractDone(clean, EMPTY_TALLY, false)).toBe(false);
    expect(contractDone(clean, EMPTY_TALLY, true)).toBe(true);
    expect(contractBroken(clean, { ...EMPTY_TALLY, heartsLost: 1 })).toBe(true);
    const rush: ContractDef = { kind: 'rush', seconds: 60, pay: {} };
    expect(contractDone(rush, { ...EMPTY_TALLY, time: 61 }, true)).toBe(false);
    expect(contractDone({ kind: 'careful', pay: {} }, { ...EMPTY_TALLY, charges: 1 }, true)).toBe(false);
  });

  it('the guild takes ore goals and met orders only', () => {
    const m: MissionDef = { goals: [{ kind: 'ore', ore: 'graphite', count: 3 }], pays: {} };
    const orders: ContractDef[] = [{ kind: 'order', ore: 'galena', count: 4, pay: {} }, { kind: 'order', ore: 'silver', count: 2, pay: {} }];
    expect(oreTaken(m, orders, { ...EMPTY_TALLY, banked: { graphite: 3, galena: 4, silver: 1 } })).toEqual({ graphite: 3, galena: 4 });
  });

  it('names the blueprint a mission hands over, and its recipe', () => {
    expect(rewardText({ goals: [], pays: { silver: 2 }, blueprint: 'drill-1' })).toBe('2 native silver + the drill Mk 1 blueprint (needs 6 graphite, 4 galena)');
  });
});

