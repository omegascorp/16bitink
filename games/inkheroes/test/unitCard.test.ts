import { describe, expect, it } from 'vitest';
import { CREATURE_IDS, creature, lineUnits, type CreatureId } from '../src/logic/creatures';
import { BUILDINGS, BUILDING_IDS } from '../src/logic/buildings';
import { dwellingPreview, newTraits, previousUnit, upgradeInfo } from '../src/scenes/battle/unitCard';

const row = (from: CreatureId, to: CreatureId, stat: string) => upgradeInfo(from, to).find((r) => r.stat === stat);

describe('upgradeInfo', () => {
  it('lists the stats of a non-shooter without shots', () => {
    const stats = upgradeInfo('swordsman', 'swordsman2').map((r) => r.stat);
    expect(stats).toEqual(['attack', 'defense', 'damage', 'health', 'speed', 'cost']);
  });

  it('adds shots for a shooter', () => {
    expect(upgradeInfo('bowman', 'bowman2').map((r) => r.stat)).toContain('shots');
    const shots = row('bowman', 'bowman2', 'shots')!;
    expect(shots.before).toBe(`${creature('bowman').shots}`);
    expect(shots.after).toBe(`${creature('bowman2').shots}`);
  });

  it('marks a raised stat as better and shows before and after', () => {
    const a = creature('swordsman');
    const b = creature('swordsman2');
    const r = row('swordsman', 'swordsman2', 'attack')!;
    expect(r.before).toBe(`${a.attack}`);
    expect(r.after).toBe(`${b.attack}`);
    expect(r.better).toBe(b.attack > a.attack);
    expect(r.changed).toBe(b.attack !== a.attack);
  });

  it('does not mark an unchanged stat as better', () => {
    const pair = lineUnits('spearman').slice(0, 2) as [CreatureId, CreatureId];
    const unchanged = upgradeInfo(...pair).filter((r) => r.before === r.after);
    for (const r of unchanged) {
      expect(r.better).toBe(false);
      expect(r.changed).toBe(false);
    }
  });

  it('shows damage as a range', () => {
    const r = row('spearman', 'spearman2', 'damage')!;
    const a = creature('spearman');
    const b = creature('spearman2');
    expect(r.before).toBe(a.minDmg === a.maxDmg ? `${a.minDmg}` : `${a.minDmg}–${a.maxDmg}`);
    expect(r.after).toBe(b.minDmg === b.maxDmg ? `${b.minDmg}` : `${b.minDmg}–${b.maxDmg}`);
    expect(r.better).toBe(b.minDmg + b.maxDmg > a.minDmg + a.maxDmg);
  });

  it('shows speed', () => {
    const r = row('griffin', 'griffin2', 'speed')!;
    expect(r.before).toBe(`${creature('griffin').speed}`);
    expect(r.after).toBe(`${creature('griffin2').speed}`);
  });

  it('shows cost as words, and a dearer unit is not better', () => {
    const r = row('swordsman', 'swordsman2', 'cost')!;
    expect(r.before).toMatch(/gold/);
    const dearer = creature('swordsman2').cost.gold! > creature('swordsman').cost.gold!;
    if (dearer) expect(r.better).toBe(false);
  });

  it('marks a worse stat as not better, in both directions', () => {
    const down = upgradeInfo('swordsman2', 'swordsman');
    for (const r of down) if (r.stat !== 'cost') expect(r.better).toBe(false);
    const cost = down.find((r) => r.stat === 'cost')!;
    expect(cost.changed).toBe(true);
    expect(cost.better).toBe(true);
  });
});

describe('newTraits', () => {
  it('lists an ability the new unit gains', () => {
    const gained = CREATURE_IDS.filter((id) => creature(id).line).filter((id) => newTraits(previousUnit(id)!, id).length > 0);
    expect(gained.length).toBeGreaterThan(0);
  });

  it('lists nothing when nothing is gained, and never what the old unit had', () => {
    expect(newTraits('swordsman', 'swordsman')).toEqual([]);
  });

  it('finds the no-retaliation ability of the Great Labyrinth', () => {
    const t = newTraits('swordsman2', 'swordsman3');
    expect(t.join(' ')).toBe(creature('swordsman3').noRetaliation && !creature('swordsman2').noRetaliation ? 'Strikes are never answered' : t.join(' '));
  });
});

describe('previousUnit', () => {
  it('is the previous level of the line, null for a base unit', () => {
    expect(previousUnit('swordsman')).toBeNull();
    expect(previousUnit('swordsman2')).toBe('swordsman');
    expect(previousUnit('swordsman3')).toBe('swordsman2');
  });
});

describe('dwellingPreview', () => {
  it('is null for a building that hires nothing', () => {
    expect(dwellingPreview('fort')).toBeNull();
  });

  it('shows a base dwelling as one unit with its weekly growth and cost', () => {
    const p = dwellingPreview('guardhouse')!;
    expect(p.kind).toBe('base');
    expect(p.to).toBe('spearman');
    expect(p.from).toBeNull();
    expect(p.growth).toBe(creature('spearman').growth);
    expect(p.rows.map((r) => r.stat)).toContain('attack');
  });

  it('shows an upgrade dwelling as old and new', () => {
    const p = dwellingPreview('barracks2')!;
    expect(p.kind).toBe('upgrade');
    expect(p.from).toBe('swordsman');
    expect(p.to).toBe('swordsman2');
    expect(p.rows.some((r) => r.stat === 'attack')).toBe(true);
  });

  it('covers every dwelling building', () => {
    for (const id of BUILDING_IDS) if (BUILDINGS[id].dwelling) expect(dwellingPreview(id)).not.toBeNull();
  });
});
