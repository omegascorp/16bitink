import { describe, expect, it } from 'vitest';
import { ASHFORD } from '../src/level/borderMarch';
import { startAdventure } from '../src/logic/adventure';
import { xpForLevel } from '../src/logic/hero';
import { heroSheet } from '../src/scenes/hud/heroSheetData';

const hero = startAdventure(ASHFORD).hero;

describe('the hero sheet', () => {
  it('names the hero and shows the four stats with what each one does', () => {
    const s = heroSheet({ ...hero, attack: 5, defense: 3, power: 2, knowledge: 4 });
    expect(s.name).toBe(hero.name);
    expect(s.title).toBe('Knight · level 1');
    expect(s.stats.map((r) => [r.label, r.value])).toEqual([['Attack', '5'], ['Defense', '3'], ['Spell Power', '2'], ['Knowledge', '4']]);
    expect(s.stats.every((r) => r.says.length > 0)).toBe(true);
    expect(s.stats[3]!.says).toContain('10 mana');
  });

  it('counts what the hero wears, and shows how much of a stat is gear', () => {
    const s = heroSheet({ ...hero, attack: 3, gear: { bracers: 'bronzeBracers', boots: 'warSandals', belt: 'warBelt' } });
    expect(s.stats[0]!.value).toBe('5 (+2)');
    expect(s.stats[1]!.value).toBe(String(hero.defense));
    expect(s.lines.find((r) => r.label === 'Morale')?.value).toBe('+2');
  });

  it('counts experience within the level, for its bar', () => {
    const s = heroSheet({ ...hero, level: 3, xp: xpForLevel(3) + 300 });
    const span = xpForLevel(4) - xpForLevel(3);
    expect(s.xp.value).toBe(`${xpForLevel(3) + 300} / ${xpForLevel(4)}`);
    expect(s.xp.part).toBeCloseTo(300 / span);
    expect(heroSheet({ ...hero, level: 3, xp: xpForLevel(4) + 900 }).xp.part).toBe(1);
  });

  it('measures travel in tiles, and shows mana, morale, luck and sight', () => {
    const s = heroSheet({ ...hero, mp: 340, mana: 3, skills: { leadership: 2, luck: 1 } });
    const row = (label: string): string | undefined => s.lines.find((r) => r.label === label)?.value;
    expect(row('Movement')).toMatch(/^3 \/ \d+ tiles$/);
    expect(row('Mana')).toMatch(/^3 \/ \d+$/);
    expect(row('Morale')).toBe('+2');
    expect(row('Luck')).toBe('+1');
    expect(row('Sight')).toBe('5 tiles');
  });

  it('lists skills by rank with what they do, and spells only with a book', () => {
    const s = heroSheet({ ...hero, skills: { leadership: 2 }, spells: ['magicArrow'], hasBook: true });
    expect(s.skills).toEqual([{ name: 'Advanced Leadership', says: '+2 morale' }]);
    expect(s.spells).toEqual([{ id: 'magicArrow', name: 'Magic Arrow' }]);
    expect(s.spellsNote).toBeNull();
    const none = heroSheet({ ...hero, hasBook: false, spells: ['magicArrow'] });
    expect(none.spells).toEqual([]);
    expect(none.spellsNote).toBe('No spellbook yet');
  });
});
