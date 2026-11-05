import { describe, expect, it } from 'vitest';
import { ASHFORD, THORNWOOD } from '../src/level/borderMarch';
import { startAdventure, type Adventure } from '../src/logic/adventure';
import { act, conquer, createBattle, experienceFor } from '../src/logic/battle';
import { armyOf } from '../src/logic/army';
import type { Hero } from '../src/logic/hero';
import { addTo } from '../src/logic/resources';
import { bookStand, spellFacts, spellNote } from '../src/scenes/town/guildData';
import { guildLayout, ROOM, wareLayout } from '../src/scenes/town/guildLayout';
import { firstWare, heroMachine, wareOf } from '../src/scenes/town/smithData';

// The room above the strip, as each screen leaves it.
const ROOMS = [[1504, 492], [1016, 500], [836, 238], [659, 235], [382, 490], [352, 300]] as const;

describe('the guild room’s layout', () => {
  for (const [w, h] of ROOMS) {
    for (const count of [3, 5]) {
      it(`fits ${count} spells in ${w} x ${h}`, () => {
        const l = guildLayout({ w, h }, count);
        expect(l.h).toBeLessThanOrEqual(h);
        expect(l.w).toBeLessThanOrEqual(Math.min(w, ROOM.w));
        expect(l.tiles).toHaveLength(count);
        for (const t of l.tiles) {
          expect(t.x).toBeGreaterThanOrEqual(0);
          expect(t.x + l.tile.w).toBeLessThanOrEqual(l.stand.side ? l.stand.x : l.w);
          expect(t.y + l.tile.h).toBeLessThanOrEqual(l.detail.y);
        }
        expect(l.detail.y + l.detail.h).toBeLessThanOrEqual(l.h);
        expect(l.stand.y + l.stand.h).toBeLessThanOrEqual(l.h);
      });
    }
  }

  it('shows spells at full size on every screen with the room', () => {
    for (const [w, h] of ROOMS.slice(0, 5)) expect(guildLayout({ w, h }, 5).icon).toBe(64);
  });

  it('opens to the whole painted room when the screen has the height', () => {
    expect(guildLayout({ w: 1504, h: 492 }, 3).h).toBe(ROOM.h);
    expect(guildLayout({ w: 1504, h: 492 }, 5).h).toBe(ROOM.h);
  });

  it('names the floors on a tall enough room', () => {
    expect(guildLayout({ w: 1504, h: 492 }, 5).floors.map((f) => f.text)).toEqual(['First floor', 'Second floor']);
    expect(guildLayout({ w: 1504, h: 492 }, 3).floors.map((f) => f.text)).toEqual(['First floor']);
  });

  it('keeps a real second floor in the chapter’s home town', () => {
    expect(ASHFORD.town.guild).toHaveLength(5);
  });

  it('keeps the stand beside the spells when wide, under them when narrow', () => {
    expect(guildLayout({ w: 1504, h: 492 }, 5).stand.side).toBe(true);
    expect(guildLayout({ w: 382, h: 490 }, 5).stand.side).toBe(false);
  });
});

describe('the book stand', () => {
  const adv = startAdventure(THORNWOOD);
  const town = adv.towns[0]!;
  const inTown = (patch: Partial<Hero> = {}): Adventure => ({ ...adv, hero: { ...adv.hero, x: town.x, y: town.y, ...patch } });
  const sold = { item: 'noviceSpellbook', name: 'Novice’s Spellbook', says: 'Common: +1 Knowledge', price: '500 gold' };

  it('sells to a hero in town without a book', () => {
    expect(bookStand(inTown(), town)).toEqual({ ...sold, note: null, buy: { enabled: true } });
  });

  it('greys the button without the gold', () => {
    expect(bookStand({ ...inTown(), purse: addTo(adv.purse, { gold: -adv.purse.gold + 100 }) }, town)).toEqual({ ...sold, note: 'Not enough gold', buy: { enabled: false } });
  });

  it('shows what it sells with no button when no hero is in town', () => {
    expect(bookStand({ ...adv, hero: { ...adv.hero, x: 40, y: 12 } }, town)).toEqual({ ...sold, note: null, buy: null });
  });

  it('shows what it sells, not the hero’s book, to a hero who has one', () => {
    expect(bookStand(inTown({ gear: { book: 'alexandrianCodex' } }), town)).toEqual({ ...sold, note: 'Rowan has a spellbook', buy: null });
  });

  it('points to a book left in the bag rather than selling another', () => {
    const bagged = bookStand(inTown({ bag: ['bronzeHelm', 'alexandrianCodex'] }), town);
    expect(bagged).toMatchObject({ ...sold, buy: null });
    expect(bagged.note).toContain('Gear tab');
  });
});

describe('a spell in the guild', () => {
  const adv = startAdventure(ASHFORD);
  const town = adv.towns[0]!;

  it('gives its level and cost', () => {
    expect(spellFacts('lightningBolt')).toBe('Level 2 · 10 mana');
  });

  it('says what the hero still needs', () => {
    expect(spellNote(adv, town, 'slow')).toEqual({ text: 'Rowan needs a spellbook to learn it', known: false });
    expect(spellNote({ ...adv, hero: { ...adv.hero, gear: { book: 'noviceSpellbook' }, spells: ['slow'] } }, town, 'slow')).toEqual({ text: 'Rowan knows this spell', known: true });
  });
});

describe('the testing cheat', () => {
  const { state } = createBattle({ hero: null, army: armyOf([{ creature: 'spearman', count: 20 }]) }, { hero: null, army: armyOf([{ creature: 'goblin', count: 30 }]) }, 7);

  it('ends the battle in a win with every enemy gone and ours untouched', () => {
    const won = conquer(state);
    expect(won.winner).toBe(0);
    expect(won.stacks.filter((s) => s.side === 1).every((s) => s.count === 0)).toBe(true);
    expect(won.stacks.filter((s) => s.side === 0)).toEqual(state.stacks.filter((s) => s.side === 0));
  });

  it('pays experience for the enemies it beat', () => {
    expect(experienceFor(conquer(state), 0)).toBeGreaterThan(0);
  });

  it('leaves nothing more to play', () => {
    expect(() => act(conquer(state), { type: 'wait' })).toThrow();
  });
});

describe('the Blacksmith’s room', () => {
  // The room above the strip, with the fifth button on a landscape phone that stacks.
  const SHOP_ROOMS = [...ROOMS, [659, 165]] as const;
  for (const [w, h] of SHOP_ROOMS) {
    it(`fits two machines in ${w} x ${h}`, () => {
      const l = wareLayout({ w, h }, 2);
      expect(l.h).toBeLessThanOrEqual(h);
      expect(l.w).toBeLessThanOrEqual(Math.min(w, ROOM.w));
      expect(l.tile.w).toBeGreaterThanOrEqual(120);
      for (const t of l.tiles) {
        expect(t.x + l.tile.w).toBeLessThanOrEqual(l.stand.side ? l.stand.x : l.w);
        expect(t.y + l.tile.h).toBeLessThanOrEqual(l.detail.y);
      }
      expect(l.detail.y + l.detail.h).toBeLessThanOrEqual(l.h);
      expect(l.stand.y + l.stand.h).toBeLessThanOrEqual(l.h);
    });
  }

  it('never stacks the wares beside the stand, where their words would not fit', () => {
    for (const [w, h] of SHOP_ROOMS) {
      const l = wareLayout({ w, h }, 2);
      expect(l.detail.w).toBeGreaterThanOrEqual(300);
    }
  });

  const inTown = (gear: Hero['gear'], gold = 10000): Adventure => {
    const adv = startAdventure(ASHFORD);
    const town = { ...adv.towns[0]!, built: [...adv.towns[0]!.built, 'blacksmith' as const] };
    return { ...adv, towns: [town, ...adv.towns.slice(1)], hero: { ...adv.hero, x: town.x, y: town.y, gear }, purse: addTo(adv.purse, { gold: gold - adv.purse.gold }) };
  };

  it('sells to a hero in town with no machine', () => {
    const adv = inTown({});
    const w = wareOf(adv, adv.towns[0]!, 'catapult');
    expect(w).toMatchObject({ name: 'Catapult', price: '1500 gold', grade: 'Common', owned: false, buy: { enabled: true } });
  });

  it('says a finer machine replaces the one the hero has', () => {
    const adv = inTown({ machine: 'catapult' });
    const town = adv.towns[0]!;
    expect(wareOf(adv, town, 'catapult')).toMatchObject({ owned: true, buy: null });
    expect(wareOf(adv, town, 'catapult2').note).toBe('Replaces the Catapult, which goes to the bag');
  });

  it('greys Buy when the purse falls short', () => {
    const adv = inTown({}, 100);
    expect(wareOf(adv, adv.towns[0]!, 'catapult')).toMatchObject({ note: 'Not enough gold', buy: { enabled: false } });
  });

  it('shows the wares but sells nothing while the hero is away', () => {
    const adv = inTown({});
    const away = { ...adv, hero: { ...adv.hero, x: adv.hero.x + 3 } };
    expect(wareOf(away, away.towns[0]!, 'catapult')).toMatchObject({ buy: null, note: `${adv.hero.name} must be here to buy it` });
  });

  it('opens on the first machine the hero doesn’t have', () => {
    const adv = inTown({ machine: 'catapult' });
    const wares = (['catapult', 'catapult2'] as const).map((m) => wareOf(adv, adv.towns[0]!, m));
    expect(firstWare(wares)?.item).toBe('catapult2');
  });

  it('names what the hero brings', () => {
    expect(heroMachine(inTown({}))).toEqual({ item: null, name: 'No war machine' });
    expect(heroMachine(inTown({ machine: 'catapult2' }))).toEqual({ item: 'catapult2', name: 'Bronze Catapult' });
  });
});
