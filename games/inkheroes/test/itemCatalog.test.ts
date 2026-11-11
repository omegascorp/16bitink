import { describe, expect, it } from 'vitest';
import { lootFaction, pickPiece } from '../src/logic/loot';
import { CATALOG_SETS, ITEMS, itemDef, type GearStat, type ItemDef, type Quality } from '../src/logic/items';
import { CROWN_ITEMS, CROWN_SETS } from '../src/logic/itemCatalog/crown';
import { KEMET_ITEMS, KEMET_SETS } from '../src/logic/itemCatalog/kemet';
import { NORSE_ITEMS, NORSE_SETS } from '../src/logic/itemCatalog/norse';

const ARMOR = ['helm', 'cuirass', 'bracers', 'belt', 'greaves', 'boots'];
const PERKS: GearStat[] = ['sight', 'gold', 'travel'];
const GRADES: Quality[] = ['gray', 'green', 'blue', 'purple'];
const FACTIONS = [
  { faction: 'crown', items: CROWN_ITEMS as Record<string, ItemDef>, sets: CROWN_SETS },
  { faction: 'kemet', items: KEMET_ITEMS as Record<string, ItemDef>, sets: KEMET_SETS },
  { faction: 'norse', items: NORSE_ITEMS as Record<string, ItemDef>, sets: NORSE_SETS },
] as const;

const stats = (d: ItemDef): [GearStat, number][] => Object.entries(d.gives) as [GearStat, number][];
/** Points a piece gives: the stat values, the gold perk counting 1. */
const points = (d: ItemDef): number => stats(d).reduce((n, [s, v]) => n + (s === 'gold' ? 1 : v), 0);

function inBudget(d: ItemDef): boolean {
  const s = stats(d);
  switch (d.quality) {
    case 'gray': return s.length === 1 && s[0]![1] === 1 && !PERKS.includes(s[0]![0]);
    case 'green': {
      const perks = s.filter(([k]) => PERKS.includes(k));
      const main = s.filter(([k]) => !PERKS.includes(k));
      const perkOk = perks.length === 1 && (perks[0]![0] === 'gold' ? perks[0]![1] === 50 : perks[0]![1] === 1) && (perks[0]![0] !== 'travel' || d.slot === 'boots');
      return perkOk && main.length === 1 && main[0]![1] === 1;
    }
    case 'blue': return points(d) === 2 && s.length <= 2 && !s.some(([k]) => k === 'gold');
    case 'purple': return points(d) === 3 && s.length <= 2 && !s.some(([k]) => k === 'gold');
    default: return false;
  }
}

describe('item catalog', () => {
  for (const { faction, items, sets } of FACTIONS) {
    const ids = Object.keys(items);
    const armor = ids.filter((i) => items[i]!.set);
    const other = ids.filter((i) => !items[i]!.set);

    describe(faction, () => {
      it('has 36 armor pieces and 20 other pieces', () => {
        expect(armor).toHaveLength(36);
        expect(other).toHaveLength(20);
        expect(ids.every((i) => items[i]!.faction === faction)).toBe(true);
      });

      it('has two sets of every grade, a fighter and a mystic, named once', () => {
        expect(sets).toHaveLength(8);
        for (const q of GRADES) expect(sets.filter((s) => s.quality === q).map((s) => s.role).sort(), q).toEqual(['fighter', 'mystic']);
        expect(new Set(sets.map((s) => s.name)).size).toBe(8);
        expect(sets.every((s) => s.faction === faction)).toBe(true);
      });

      it('keeps every new piece in its grade’s budget', () => {
        for (const id of ids) expect(inBudget(items[id]!), `${id} ${JSON.stringify(items[id]!.gives)}`).toBe(true);
      });

      it('has exactly one piece per armor slot in each new set, of the set’s grade and faction', () => {
        for (const set of sets.filter((s) => s.quality !== 'gray')) {
          const pieces = armor.map((i) => items[i]!).filter((p) => p.set === set.id);
          expect(pieces.map((p) => p.slot).sort(), set.id).toEqual([...ARMOR].sort());
          expect(pieces.every((p) => p.quality === set.quality && p.faction === faction), set.id).toBe(true);
        }
      });

      it('puts every armor piece in a set and no other piece', () => {
        const setIds = new Set(sets.map((s) => s.id));
        for (const id of armor) expect(setIds.has(items[id]!.set!) && ARMOR.includes(items[id]!.slot), id).toBe(true);
        for (const id of other) expect(ARMOR.includes(items[id]!.slot), id).toBe(false);
      });

      it('has a weapon, a shield, an amulet and two rings per grade', () => {
        for (const q of GRADES) {
          const slots = other.filter((i) => items[i]!.quality === q).map((i) => items[i]!.slot).sort();
          expect(slots, q).toEqual(['amulet', 'ring1', 'ring1', 'shield', 'weapon']);
        }
      });

      it('gives set bonuses by the contract’s table', () => {
        for (const set of sets) {
          if (set.quality === 'gray') { expect(set.bonus).toBeUndefined(); continue; }
          const b = set.bonus!;
          expect(Object.keys(b).sort(), set.id).toEqual(['2', '4', '6']);
          const main: GearStat[] = set.role === 'fighter' ? ['attack', 'defense'] : ['power', 'knowledge'];
          const side: GearStat = set.role === 'fighter' ? 'morale' : 'luck';
          const sum = (n: 2 | 4 | 6, keys: GearStat[]): number => keys.reduce((t, k) => t + (b[n]?.[k] ?? 0), 0);
          const only = (n: 2 | 4 | 6, keys: GearStat[]): boolean => Object.keys(b[n]!).every((k) => keys.includes(k as GearStat));
          if (set.quality === 'green') {
            expect(b[2]).toEqual({ [side]: 1 });
            expect(sum(4, main) === 1 && only(4, main)).toBe(true);
            expect(b[6]).toEqual(Object.fromEntries(main.map((k) => [k, 1])));
          } else if (set.quality === 'blue') {
            expect(sum(2, main) === 1 && only(2, main)).toBe(true);
            expect(sum(4, main) === 2 && only(4, main)).toBe(true);
            expect(b[6]).toEqual({ speed: 1 });
          } else {
            expect(sum(2, main) === 2 && only(2, main)).toBe(true);
            expect(b[4]).toEqual({ speed: 1 });
            expect(sum(6, main) === 2 && sum(6, [side]) === 1 && Object.keys(b[6]!).length <= 3).toBe(true);
          }
        }
      });
    });
  }

  it('has unique ids and names across all three catalogs and items.ts', () => {
    const all = [...Object.keys(CROWN_ITEMS), ...Object.keys(KEMET_ITEMS), ...Object.keys(NORSE_ITEMS)];
    expect(new Set(all).size).toBe(all.length);
    const names = Object.values(ITEMS).map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
    expect([...Object.values(CROWN_ITEMS), ...Object.values(KEMET_ITEMS), ...Object.values(NORSE_ITEMS)].every((i) => i.name.length <= 24)).toBe(true);
  });

  it('lists every set once in CATALOG_SETS, with unique ids', () => {
    expect(CATALOG_SETS).toHaveLength(24);
    expect(new Set(CATALOG_SETS.map((s) => s.id)).size).toBe(24);
    expect(itemDef('corinthianHelm').set).toBe('corinthian');
  });

  it('gives the Norse a gray fighter set of six, Hladir’s drops, and Tyrfing as the Legendary prize', () => {
    const hide = Object.entries(ITEMS).filter(([, d]) => (d as ItemDef).set === 'hide');
    expect(hide.map(([, d]) => d.slot).sort()).toEqual([...ARMOR].sort());
    expect(hide.every(([, d]) => d.quality === 'gray' && (d as ItemDef).faction === 'norse' && points(d as ItemDef) === 1)).toBe(true);
    expect(Object.values(ITEMS).filter((d) => (d as ItemDef).set === 'volva')).toHaveLength(6);
    expect(itemDef('tyrfing')).toMatchObject({ slot: 'weapon', quality: 'gold' });
    expect(Object.keys(NORSE_ITEMS)).not.toContain('tyrfing');
  });

  it('drops Norse pieces on a Norse hero’s map, never Tyrfing', () => {
    expect(lootFaction({ hero: { faction: 'norse' } } as Parameters<typeof lootFaction>[0])).toBe('norse');
    for (const grade of GRADES) for (let i = 0; i < 40; i++) {
      const id = pickPiece('norse', grade, i % 3 === 0, i / 40, []);
      expect(id && itemDef(id).faction, `${grade} ${i}`).toBe('norse');
      expect(id).not.toBe('tyrfing');
    }
  });
});
