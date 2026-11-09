import { describe, expect, it } from 'vitest';
import { CREATURE_IDS, creature, lineOf, lineUnits, tierOf, type CreatureId } from '../src/logic/creatures';
import { FACTIONS } from '../src/logic/factions';
import { canCompare, compareColumns, compareLayout, columnWidth, lineUpTo, textWidth, type CompareText } from '../src/scenes/battle/unitCompare';

const bases = CREATURE_IDS.filter((id) => !creature(id).line && !creature(id).machine && creature(id).faction !== 'neutral' && lineUnits(id).length > 1);

describe('line of a unit', () => {
  it('every Greek and Egyptian line has three levels, in order', () => {
    const greek = bases.filter((b) => creature(b).faction === 'crown');
    const egypt = bases.filter((b) => creature(b).faction === 'kemet');
    expect(greek.length).toBeGreaterThanOrEqual(7);
    expect(egypt.length).toBeGreaterThanOrEqual(7);
    for (const b of [...greek, ...egypt]) {
      const line = lineUnits(b);
      expect(line).toHaveLength(3);
      expect(line.map(tierOf)).toEqual([1, 2, 3]);
      expect(line.every((u) => lineOf(u) === b)).toBe(true);
    }
    expect(Object.keys(FACTIONS)).toContain('kemet');
  });

  it('lineUpTo stops at the tapped level; a base unit gets no Compare', () => {
    expect(lineUpTo('spearman')).toEqual(['spearman']);
    expect(lineUpTo('spearman2')).toEqual(['spearman', 'spearman2']);
    expect(lineUpTo('levy3')).toEqual(['levy', 'levy2', 'levy3']);
    expect(canCompare('spearman')).toBe(false);
    expect(canCompare('levy2')).toBe(true);
    expect(compareColumns('spearman')).toEqual([]);
  });
});

describe('compareColumns', () => {
  it('has a column per level, the tapped one last and flagged', () => {
    const cols = compareColumns('chariot3');
    expect(cols.map((c) => c.id)).toEqual(['chariot', 'chariot2', 'chariot3']);
    expect(cols.map((c) => c.tapped)).toEqual([false, false, true]);
    expect(cols.map((c) => c.level)).toEqual([1, 2, 3]);
  });

  it('marks a number up only when it rose above the column to its left', () => {
    const cols = compareColumns('levy3');
    expect(cols[0]!.cells.every((c) => !c.up)).toBe(true);
    const def = (i: number) => cols[i]!.cells.find((c) => c.stat === 'defense')!;
    expect(def(1).up).toBe(creature('levy2').defense > creature('levy').defense);
    expect(def(2).up).toBe(true);
    expect(cols[2]!.cells.find((c) => c.stat === 'speed')!.up).toBe(false);
  });

  it('shows shots for every column of a shooting line and not for others', () => {
    expect(compareColumns('bowman3')[0]!.cells.map((c) => c.stat)).toContain('shots');
    expect(compareColumns('levy2')[0]!.cells.map((c) => c.stat)).not.toContain('shots');
    expect(compareColumns('nubian3')[2]!.cells.find((c) => c.stat === 'shots')!.up).toBe(true);
  });

  it('marks a trait new at the level that gains it, and never in the first column', () => {
    const cols = compareColumns('levy3');
    expect(cols[0]!.traits.every((t) => !t.isNew)).toBe(true);
    expect(cols[2]!.traits.find((t) => /half/.test(t.text))?.isNew).toBe(true);
    const jackal = compareColumns('jackal3');
    expect(jackal[2]!.traits.find((t) => /never answered/.test(t.text))?.isNew).toBe(true);
    expect(jackal[1]!.traits.some((t) => t.isNew)).toBe(false);
  });

  it('shows the rare goods in the cost and the growth', () => {
    const cols = compareColumns('bennu3');
    expect(cols[2]!.cost).toBe('4400 gold, 3 gems');
    expect(cols[0]!.growth).toBe('1');
  });

  it('works for every unit of every line above level 1', () => {
    for (const id of CREATURE_IDS.filter((c) => bases.includes(lineOf(c)) && tierOf(c) > 1)) {
      const cols = compareColumns(id as CreatureId);
      expect(cols).toHaveLength(tierOf(id));
      expect(cols.filter((c) => c.tapped)).toHaveLength(1);
    }
  });
});

/** A worst case for the text, as the pixel font wraps it: names two lines, a price two, abilities eight lines of four. */
const text = (w: number): CompareText => {
  const k = textWidth(columnWidth({ w }, 3)) < 100 ? 2 : 1;
  return { nameLines: 2, costLines: 2, traitLines: 5 * k, traitCount: 3 };
};

describe('compareLayout', () => {
  for (const [w, h, n] of [[320, 568, 3], [320, 568, 2], [390, 844, 3], [390, 844, 2], [1400, 900, 3], [1400, 900, 2]] as const) {
    it(`fits ${w} × ${h} with ${n} columns`, () => {
      const l = compareLayout({ w, h }, n, text(w));
      expect(l.fits).toBe(true);
      expect(l.left).toBeGreaterThanOrEqual(0);
      expect(l.left + l.w).toBeLessThanOrEqual(w);
      expect(l.top).toBeGreaterThanOrEqual(0);
      expect(l.top + l.h).toBeLessThanOrEqual(h);
      expect(l.colX).toHaveLength(n);
      for (let i = 1; i < n; i++) expect(l.colX[i]! - l.colX[i - 1]!).toBeGreaterThanOrEqual(l.colW);
      expect(l.colX[n - 1]! + l.colW).toBeLessThanOrEqual(l.left + l.w);
      expect(l.closeY + 30).toBeLessThan(l.h);
    });
  }

  it('shrinks to faces on a narrow screen and keeps figures on a wide one', () => {
    expect(compareLayout({ w: 320, h: 568 }, 3, text(320)).mode).toBe('face');
    expect(compareLayout({ w: 390, h: 844 }, 2, text(390)).mode).toBe('figure');
    expect(compareLayout({ w: 1400, h: 900 }, 3, text(1400)).mode).toBe('figure');
  });

  it('puts the rows in order down the panel', () => {
    const l = compareLayout({ w: 1400, h: 900 }, 3, text(1400));
    const order = [l.picY, l.nameY, l.levelY, l.rowsY, l.growthY, l.costY, l.traitsY, l.closeY];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
