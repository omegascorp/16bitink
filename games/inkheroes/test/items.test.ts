import { describe, expect, it } from 'vitest';
import { ASHFORD, BLACK_BANNER, THORNWOOD } from '../src/level/borderMarch';
import { mapById } from '../src/level/maps';
import { startAdventure } from '../src/logic/adventure';
import { rideOn } from '../src/logic/chapter';
import { dailyMp, maxMana, sightOf, toBattleHero } from '../src/logic/hero';
import { loadAdventure, saveAdventure } from '../src/logic/save';
import { BAG_SIZE, gainItem, gearBonus, ITEMS, SLOTS, takeOff, wear, withGear } from '../src/logic/items';
import { gearLayout } from '../src/scenes/hud/gearLayout';

const hero = startAdventure(ASHFORD).hero;

describe('items', () => {
  it('has the six pieces of the gray Bronze set, one for each armor slot', () => {
    const bronze = Object.values(ITEMS).filter((i) => i.set === 'bronze');
    expect(bronze.map((i) => i.slot).sort()).toEqual(['belt', 'boots', 'bracers', 'cuirass', 'greaves', 'helm']);
    expect(bronze.every((i) => i.quality === 'gray')).toBe(true);
    expect(SLOTS).toHaveLength(11);
  });

  it('adds up what a hero wears, and nothing from the bag', () => {
    const h = { ...hero, gear: { helm: 'bronzeHelm', bracers: 'bronzeBracers', belt: 'warBelt' } as const, bag: ['warSandals'] as const };
    expect(gearBonus(h)).toEqual({ attack: 1, defense: 1, morale: 1 });
    expect(gearBonus(hero)).toEqual({});
  });

  it('fights, casts and scouts with what the hero wears', () => {
    const plain = toBattleHero(hero);
    const worn = toBattleHero({ ...hero, gear: { helm: 'bronzeHelm', bracers: 'bronzeBracers', belt: 'warBelt' } });
    expect(worn.attack).toBe(plain.attack + 1);
    expect(worn.defense).toBe(plain.defense + 1);
    expect(worn.morale).toBe(plain.morale + 1);
    expect(withGear({ ...hero, gear: { helm: 'bronzeHelm' } }).defense).toBe(hero.defense + 1);
    expect(maxMana(hero)).toBe(hero.knowledge * 10);
    expect(sightOf(hero)).toBe(5);
    expect(dailyMp({ ...hero, gear: {} })).toBe(dailyMp(hero));
  });

  it('wears a new piece at once in an empty slot, and bags it when the slot is taken', () => {
    const a = gainItem(hero, 'bronzeHelm');
    expect(a.hero.gear).toEqual({ helm: 'bronzeHelm' });
    expect(a.worn).toBe(true);
    const b = gainItem(a.hero, 'bronzeHelm');
    expect(b.hero.gear).toEqual({ helm: 'bronzeHelm' });
    expect(b.hero.bag).toEqual(['bronzeHelm']);
    expect(b.worn).toBe(false);
    expect(hero.gear).toBeUndefined();
  });

  it('turns away what a full bag has no room for', () => {
    const full = { ...hero, gear: { helm: 'bronzeHelm' as const }, bag: Array.from({ length: BAG_SIZE }, () => 'warBelt' as const) };
    expect(gainItem(full, 'bronzeHelm').kept).toBe(false);
    expect(gainItem(full, 'bronzeHelm').hero).toBe(full);
  });

  it('swaps a bag piece with what is worn, and takes a piece off into the bag', () => {
    const h = { ...hero, gear: { helm: 'bronzeHelm' as const }, bag: ['warBelt', 'bronzeHelm'] as const };
    const belted = wear(h, 0);
    expect(belted.gear).toEqual({ helm: 'bronzeHelm', belt: 'warBelt' });
    expect(belted.bag).toEqual(['bronzeHelm']);
    const swapped = wear(belted, 0);
    expect(swapped.gear?.helm).toBe('bronzeHelm');
    expect(swapped.bag).toEqual(['bronzeHelm']);
    const off = takeOff(belted, 'belt');
    expect(off.gear).toEqual({ helm: 'bronzeHelm' });
    expect(off.bag).toEqual(['bronzeHelm', 'warBelt']);
    expect(takeOff(belted, 'boots')).toBe(belted);
    expect(wear(hero, 0)).toBe(hero);
  });

  it('leaves a piece on when the bag has no room for it', () => {
    const h = { ...hero, gear: { helm: 'bronzeHelm' as const }, bag: Array.from({ length: BAG_SIZE }, () => 'warBelt' as const) };
    expect(takeOff(h, 'helm')).toBe(h);
  });

  it('puts the six Bronze pieces on map 1, the cuirass on the final fight, and none of it twice', () => {
    const drops = ASHFORD.objects.filter((o) => o.drop);
    expect(drops.map((o) => [o.id, o.drop])).toEqual(expect.arrayContaining([['goblins', 'bronzeHelm'], ['ogres', 'bronzeCuirass']]));
    expect(new Set(drops.map((o) => o.drop)).size).toBe(6);
    expect(drops).toHaveLength(6);
    expect(BLACK_BANNER.objects.filter((o) => o.drop)).toHaveLength(6);
  });
});

describe('gear in a save', () => {
  const storage = (): Storage => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as unknown as Storage;
  };
  const roundTrip = (h: typeof hero): typeof hero | undefined => {
    const adv = { ...startAdventure(ASHFORD), hero: h };
    const s = storage();
    saveAdventure(s, { current: adv, dayStart: adv, partStart: adv });
    return loadAdventure(s, mapById)?.current.hero;
  };

  it('comes back as it went in', () => {
    const h = roundTrip({ ...hero, gear: { helm: 'bronzeHelm' }, bag: ['warBelt'] })!;
    expect(h.gear).toEqual({ helm: 'bronzeHelm' });
    expect(h.bag).toEqual(['warBelt']);
  });

  it('loads a game saved before there was gear', () => {
    const h = roundTrip(hero)!;
    expect(h.gear).toBeUndefined();
    expect(h.bag).toBeUndefined();
  });

  it('drops anything a save claims that the game does not have', () => {
    const forged = { ...hero, gear: { helm: 'warBelt', boots: 'excalibur' }, bag: ['excalibur', 'warBelt', ...Array.from({ length: 40 }, () => 'warBelt')] } as unknown as typeof hero;
    const h = roundTrip(forged)!;
    expect(h.gear).toBeUndefined();
    expect(h.bag).toHaveLength(BAG_SIZE);
  });
});

describe('gear from map to map', () => {
  it('rides on with the hero', () => {
    const adv = { ...startAdventure(ASHFORD), hero: { ...hero, gear: { helm: 'bronzeHelm' as const }, bag: ['warBelt'] as const } };
    const next = rideOn(adv, ASHFORD, THORNWOOD);
    expect(next.hero.gear).toEqual({ helm: 'bronzeHelm' });
    expect(next.hero.bag).toEqual(['warBelt']);
  });
});

describe('the gear panel', () => {
  const fits = (l: ReturnType<typeof gearLayout>, w: number, h: number): boolean => l.w <= w && l.h <= h;

  it('draws everything at double size wherever it fits', () => {
    expect(gearLayout({ w: 1300, h: 800 })).toMatchObject({ scale: 2, doll: 'tall' });
    expect(gearLayout({ w: 818, h: 287 })).toMatchObject({ scale: 2, doll: 'broad' });
    expect(gearLayout({ w: 364, h: 745 })).toMatchObject({ scale: 2, doll: 'broad' });
  });

  it('falls back to single size only on the smallest screens', () => {
    expect(gearLayout({ w: 641, h: 272 }).scale).toBe(1);
    expect(gearLayout({ w: 334, h: 540 }).scale).toBe(1);
  });

  it('always fits the room it was given, and holds every slot and the whole bag', () => {
    for (const [w, h] of [[1300, 800], [818, 287], [364, 745], [641, 272], [334, 540]] as const) {
      const l = gearLayout({ w, h });
      expect(fits(l, w, h), `${w}x${h}`).toBe(true);
      expect(l.slots).toHaveLength(SLOTS.length);
      expect(new Set(l.slots.map((s) => `${s.x},${s.y}`)).size).toBe(SLOTS.length);
      expect(l.bag).toHaveLength(BAG_SIZE);
      const right = Math.max(...[...l.slots, ...l.bag].map((c) => c.x)) + l.cell;
      expect(right).toBeLessThanOrEqual(l.w);
    }
  });
});
