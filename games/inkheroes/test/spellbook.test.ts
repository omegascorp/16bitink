import { describe, expect, it } from 'vitest';
import { ASHFORD, BLACK_BANNER, THORNWOOD } from '../src/level/borderMarch';
import { enterTown, guardAt, startAdventure, withTown, type Adventure } from '../src/logic/adventure';
import { maxMana, nextLevelUp, toBattleHero, xpForLevel, type Hero } from '../src/logic/hero';
import { gainItem, gearBonus, hasSpellbook, ITEMS, takeOff, wear, type ItemId } from '../src/logic/items';
import { parseAdventure } from '../src/logic/save';
import { SPELLBOOK_SOLD } from '../src/logic/town';
import { visitSite } from '../src/logic/visits';
import { heroSheet } from '../src/scenes/hud/heroSheetData';

const MAGIC_SKILLS = ['wisdom', 'intelligence', 'mysticism', 'sorcery'];
const altar = THORNWOOD.objects.find((o) => o.kind === 'spellbook')!;
const withHero = (adv: Adventure, patch: Partial<Hero>): Adventure => ({ ...adv, hero: { ...adv.hero, ...patch } });
const wearing = (book: ItemId): Partial<Hero> => ({ gear: { book } });

describe('the book gate', () => {
  it('keeps map 1 free of magic', () => {
    expect(hasSpellbook(ASHFORD.hero)).toBe(false);
    expect(ASHFORD.hero.spells).toEqual([]);
    expect(ASHFORD.off).toContain('mageGuild1');
    expect(ASHFORD.objects.some((o) => o.kind === 'shrine' || o.kind === 'spellbook')).toBe(false);
  });

  it('opens the guild on map 2 and every map after', () => {
    expect(THORNWOOD.off).not.toContain('mageGuild1');
    expect(BLACK_BANNER.off).not.toContain('mageGuild1');
    expect(hasSpellbook(THORNWOOD.hero)).toBe(false);
  });

  it('guards the book on map 2', () => {
    expect(guardAt(startAdventure(THORNWOOD), altar.x, altar.y)?.id).toBe('book-birds');
  });
});

describe('the spellbook as an item', () => {
  it('climbs in grades, each better than the last', () => {
    const score = (id: ItemId): number => Object.values(ITEMS[id].gives).reduce((a, b) => a + b, 0);
    expect(['noviceSpellbook', 'oracleSpellbook', 'alexandrianCodex'].map((id) => ITEMS[id as ItemId].quality)).toEqual(['gray', 'green', 'blue']);
    expect(score('oracleSpellbook')).toBeGreaterThan(score('noviceSpellbook'));
    expect(score('alexandrianCodex')).toBeGreaterThan(score('oracleSpellbook'));
  });

  it('is never part of a set', () => {
    expect(Object.values(ITEMS).filter((i) => i.slot === 'book' && 'set' in i)).toEqual([]);
  });

  it('starts at the bottom of the ladder: the altar and the guild both give the Common book', () => {
    expect(SPELLBOOK_SOLD).toBe('noviceSpellbook');
    expect(altar.item).toBe('noviceSpellbook');
  });

  it('keeps the Uncommon book for the far east of map 2', () => {
    const holder = THORNWOOD.objects.find((o) => o.drop === 'oracleSpellbook')!;
    expect(holder.id).toBe('chest-birds');
    expect(holder.x).toBeGreaterThan(altar.x + 20);
  });

  it('puts the blue book behind the hydras on map 3', () => {
    expect(BLACK_BANNER.objects.find((o) => o.drop === 'alexandrianCodex')?.creature).toBe('hydra');
  });

  it('counts towards mana and Spell Power as any gear does', () => {
    const { hero } = startAdventure(ASHFORD);
    const worn = { ...hero, ...wearing('oracleSpellbook') };
    expect(gearBonus(worn)).toEqual({ knowledge: 1, power: 1 });
    expect(maxMana(worn)).toBe((hero.knowledge + 1) * 10);
    expect(toBattleHero(worn).power).toBe(hero.power + 1);
  });

  it('takes the magic away with it when it comes off, and gives it back', () => {
    const { hero } = startAdventure(ASHFORD);
    const worn = { ...hero, spells: ['slow' as const], ...wearing('noviceSpellbook') };
    expect(toBattleHero(worn).spells).toEqual(['slow']);
    const off = takeOff(worn, 'book');
    expect(toBattleHero(off).spells).toEqual([]);
    expect(toBattleHero(wear(off, 0)).spells).toEqual(['slow']);
  });

  it('teaches a town’s guild only to a hero wearing one', () => {
    const adv = startAdventure(THORNWOOD);
    const town = { ...adv.towns[0]!, built: [...adv.towns[0]!.built, 'mageGuild1' as const] };
    const inTown = withTown(withHero(adv, { x: town.x, y: town.y }), town);
    expect(enterTown(inTown).hero.spells).toEqual([]);
    const taught = enterTown(withHero(inTown, wearing('noviceSpellbook'))).hero.spells;
    expect(taught).toEqual(town.guild.slice(0, 3));
  });
});

describe('the altar', () => {
  it('gives a bookless hero the book, worn, its spell and full mana, and leaves the map', () => {
    const { adv } = visitSite(startAdventure(THORNWOOD), altar);
    expect(adv.hero.gear?.book).toBe('noviceSpellbook');
    expect(adv.hero.spells).toEqual(['magicArrow']);
    expect(adv.hero.mana).toBe(maxMana(adv.hero));
    expect(adv.objects.find((o) => o.id === altar.id)?.gone).toBe(true);
    expect(adv.prompts.at(-1)).toMatchObject({ kind: 'message', title: 'Novice’s Spellbook', item: 'noviceSpellbook' });
  });

  it('bags the book for a hero who bought one, and still teaches the spell', () => {
    const { adv } = visitSite(withHero(startAdventure(THORNWOOD), { ...wearing('oracleSpellbook'), spells: ['slow'] }), altar);
    expect(adv.hero.gear?.book).toBe('oracleSpellbook');
    expect(adv.hero.bag).toEqual(['noviceSpellbook']);
    expect(adv.hero.spells).toEqual(['slow', 'magicArrow']);
  });

  it('teaches nothing twice', () => {
    const { adv, notes } = visitSite(withHero(startAdventure(THORNWOOD), { ...wearing('noviceSpellbook'), spells: ['magicArrow'] }), altar);
    expect(adv.hero.spells).toEqual(['magicArrow']);
    expect(notes).toEqual([]);
  });

  it('says so when the bag is full', () => {
    const bag = Array.from({ length: 20 }, (): ItemId => 'bronzeHelm');
    const { adv } = visitSite(withHero(startAdventure(THORNWOOD), { ...wearing('noviceSpellbook'), bag }), altar);
    expect(adv.hero.bag).toHaveLength(20);
    expect(adv.prompts.at(-1)).toMatchObject({ text: expect.stringContaining('stays behind') });
  });
});

describe('saves', () => {
  const saved = (patch: Record<string, unknown>): Adventure | null => {
    const adv = startAdventure(THORNWOOD);
    const raw = JSON.parse(JSON.stringify(adv)) as Adventure;
    return parseAdventure({ ...raw, hero: { ...raw.hero, ...patch } }, THORNWOOD);
  };

  it('gives a hero saved with the old flag the guild’s book', () => {
    expect(saved({ hasBook: true })?.hero.gear?.book).toBe('noviceSpellbook');
    expect(saved({ hasBook: false })?.hero.gear?.book).toBeUndefined();
  });

  it('keeps a better book over the old flag', () => {
    expect(saved({ hasBook: true, gear: { book: 'oracleSpellbook' } })?.hero.gear?.book).toBe('oracleSpellbook');
  });

});

describe('level-ups', () => {
  const due = (book: boolean): Hero => ({ ...startAdventure(ASHFORD).hero, ...(book ? wearing('noviceSpellbook') : {}), xp: xpForLevel(2) });
  const rolls = (h: Hero) => Array.from({ length: 300 }, (_, seed) => nextLevelUp(h, seed + 1)!.offer);

  it('offer no magic to a hero without a book', () => {
    for (const offer of rolls(due(false))) {
      expect(['attack', 'defense']).toContain(offer.primary);
      expect(offer.choices.some((id) => MAGIC_SKILLS.includes(id))).toBe(false);
    }
  });

  it('do offer it once the hero has one', () => {
    const offers = rolls(due(true));
    expect(offers.some((o) => o.primary === 'power' || o.primary === 'knowledge')).toBe(true);
    expect(offers.some((o) => o.choices.some((id) => MAGIC_SKILLS.includes(id)))).toBe(true);
  });
});

describe('the hero sheet', () => {
  const { hero } = startAdventure(ASHFORD);

  it('says nothing of magic without a book', () => {
    const sheet = heroSheet(hero);
    expect(sheet.magic).toBe(false);
    expect(sheet.stats.map((s) => s.label)).toEqual(['Attack', 'Defense']);
    expect(sheet.lines.map((l) => l.label)).not.toContain('Mana');
  });

  it('shows it all with one', () => {
    const sheet = heroSheet({ ...hero, ...wearing('noviceSpellbook') });
    expect(sheet.stats).toHaveLength(4);
    expect(sheet.lines.map((l) => l.label)).toContain('Mana');
    expect(sheet.spellsNote).toBe('No spells learned yet');
  });
});

it('a new book fills an empty slot and bags a second', () => {
  const { hero } = startAdventure(ASHFORD);
  const one = gainItem(hero, 'noviceSpellbook');
  expect(one.worn).toBe(true);
  expect(gainItem(one.hero, 'oracleSpellbook').worn).toBe(false);
});
