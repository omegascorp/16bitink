import { describe, expect, it } from 'vitest';
import { fitInventories, NEW_PROFILE, type Profile } from '../src/logic/economy';
import { oreNeeds } from '../src/logic/needs';

const at = (over: Partial<Profile>): Profile => fitInventories({ ...NEW_PROFILE, ...over });

describe('what an ore is still needed for', () => {
  it('lists the repairs still waiting on it first, the locked ones too', () => {
    expect(oreNeeds(at({}), 'copper').slice(0, 2)).toEqual([
      { kind: 'tech', tech: { kind: 'repair', id: 'printer' }, n: 6 },
      { kind: 'tech', tech: { kind: 'repair', id: 'thrusters' }, n: 6 },
    ]);
  });

  it('drops a repair once it is done', () => {
    const needs = oreNeeds(at({ repaired: ['printer', 'comms', 'thrusters'] }), 'copper');
    expect(needs.some((n) => n.kind === 'tech' && n.tech.kind === 'repair')).toBe(false);
  });

  it('counts a gear mark only once its blueprint is found, and not once it is built', () => {
    const cell = { kind: 'tech', tech: { kind: 'gear', piece: 'cell' }, mk: 1, n: 6 };
    expect(oreNeeds(at({}), 'copper')).not.toContainEqual(cell);
    expect(oreNeeds(at({ found: ['cell-1'] }), 'copper')).toContainEqual(cell);
    expect(oreNeeds(at({ found: ['cell-1'], gear: { ...NEW_PROFILE.gear, cell: 1 } }), 'copper')).not.toContainEqual(cell);
  });

  it("adds the Lamplighters' silver from when they ask until they are paid", () => {
    const trade = { kind: 'trade', n: 10 };
    expect(oreNeeds(at({}), 'silver')).not.toContainEqual(trade);
    expect(oreNeeds(at({ beats: ['met'] }), 'silver')).toContainEqual(trade);
    expect(oreNeeds(at({ beats: ['met', 'paid'] }), 'silver')).not.toContainEqual(trade);
  });

  it('lists the next level of a module that takes it', () => {
    const needs = oreNeeds(at({}), 'galena');
    expect(needs.some((n) => n.kind === 'tech' && n.tech.kind === 'module')).toBe(true);
  });

  it('is empty for an ore nothing wants', () => {
    expect(oreNeeds(at({}), 'ice')).toEqual([]);
  });
});
