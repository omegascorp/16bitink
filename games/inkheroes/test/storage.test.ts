import { describe, expect, it } from 'vitest';
import { THORNWOOD } from '../src/level/borderMarch';
import { mapById } from '../src/level/maps';
import { afterBattle, battleSides, garrisonHero, liveObjects, ourHeroes, startAdventure, stepHero, townById, type Adventure } from '../src/logic/adventure';
import { createBattle } from '../src/logic/battle';
import { hireHero } from '../src/logic/heroes';
import { bagSize, type ItemId } from '../src/logic/items';
import { loadAdventure, saveAdventure } from '../src/logic/save';
import { buyBag, canSwapGear, cantBuyBag, cantGive, cantStore, cantTakeStored, giveItem, heroesIn, nextBag, storeItem, storeOf, storeRoom, takeStored } from '../src/logic/storage';
import { visitSite } from '../src/logic/visits';

const ashford = 'ashford-town';
const full = (n: number): ItemId[] => Array.from({ length: n }, () => 'warBelt' as const);

/** Part 2 with Rowan at Ashford's gate, rich, and Ashford built as given. */
function atHome(built: readonly string[] = ['storehouse']): Adventure {
  const a = startAdventure(THORNWOOD);
  const t = townById(a, ashford)!;
  const towns = a.towns.map((x) => (x.id === ashford ? { ...x, built: [...x.built, ...built] as typeof x.built } : x));
  return { ...a, prompts: [], purse: { ...a.purse, gold: 20000 }, towns, hero: { ...a.hero, x: t.x, y: t.y } };
}

/** Rowan garrisoned and Ianthe hired into the gate: two heroes in Ashford. */
function twoInTown(): Adventure {
  const a = garrisonHero(atHome())!;
  return hireHero(a, THORNWOOD, ashford)!;
}

describe('a town\'s Storehouse', () => {
  it('keeps 8 pieces, a Treasury 20, and nothing without one', () => {
    const t = townById(atHome([]), ashford)!;
    expect(storeRoom(t)).toBe(0);
    expect(storeRoom({ built: ['storehouse'] })).toBe(8);
    expect(storeRoom({ built: ['storehouse', 'treasury'] })).toBe(20);
  });

  it('takes a piece from the bag or off the hero, and gives it back: worn at once in an empty slot, else in the bag', () => {
    const a = atHome();
    const rowan = { ...a.hero, gear: { helm: 'bronzeHelm' as const }, bag: ['warBelt' as const] };
    const b = { ...a, hero: rowan };
    const kept = storeItem(b, ashford, rowan.id, { bag: 0 })!;
    expect(kept.hero.bag).toEqual([]);
    expect(storeOf(townById(kept, ashford)!)).toEqual(['warBelt']);
    const off = storeItem(kept, ashford, rowan.id, { slot: 'helm' })!;
    expect(off.hero.gear).toEqual({});
    expect(storeOf(townById(off, ashford)!)).toEqual(['warBelt', 'bronzeHelm']);
    const back = takeStored(off, ashford, rowan.id, 1)!;
    expect(back.hero.gear).toEqual({ helm: 'bronzeHelm' });
    expect(storeOf(townById(back, ashford)!)).toEqual(['warBelt']);
    // The state it came from is untouched.
    expect(b.hero.bag).toEqual(['warBelt']);
  });

  it('says why not: no Storehouse, the hero away, the store full, the bag full', () => {
    const none = { ...atHome([]), hero: { ...atHome([]).hero, bag: ['warBelt' as const] } };
    expect(cantStore(none, ashford, none.hero.id, { bag: 0 })).toMatch(/Build a Storehouse/);
    const a = { ...atHome(), hero: { ...atHome().hero, bag: ['warBelt' as const] } };
    const away = { ...a, hero: { ...a.hero, x: a.hero.x + 3 } };
    expect(cantStore(away, ashford, a.hero.id, { bag: 0 })).toMatch(/must be in/);
    expect(cantStore(a, ashford, a.hero.id, { bag: 3 })).toMatch(/Nothing/);
    const packed = { ...a, towns: a.towns.map((t) => (t.id === ashford ? { ...t, store: full(8) } : t)) };
    expect(cantStore(packed, ashford, a.hero.id, { bag: 0 })).toMatch(/Storehouse is full/);
    const heavy = { ...packed, hero: { ...a.hero, gear: { belt: 'warBelt' as const }, bag: full(4) } };
    expect(cantTakeStored(heavy, ashford, a.hero.id, 0)).toMatch(/bag is full/);
    expect(takeStored(heavy, ashford, a.hero.id, 0)).toBeNull();
  });

  it('serves both heroes in the town, the garrison\'s and the gate\'s, so they can pass pieces through it', () => {
    const a = twoInTown();
    const t = townById(a, ashford)!;
    expect(heroesIn(a, t).map((h) => h.id).sort()).toEqual(['ianthe', 'rowan']);
    const rowan = ourHeroes(a).find((h) => h.id === 'rowan')!;
    const b = { ...a, others: a.others!.map((h) => (h.id === 'rowan' ? { ...rowan, bag: ['linenHood' as const] } : h)) };
    const kept = storeItem(b, ashford, 'rowan', { bag: 0 })!;
    const worn = takeStored(kept, ashford, 'ianthe', 0)!;
    expect(ourHeroes(worn).find((h) => h.id === 'ianthe')!.gear?.helm).toBe('linenHood');
  });

  it('keeps its store in a save, no more than it has room for', () => {
    const a = atHome();
    const kept = { ...a, towns: a.towns.map((t) => (t.id === ashford ? { ...t, store: ['warBelt', 'linenHood'] as ItemId[] } : t)) };
    const m = new Map<string, string>();
    const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as unknown as Storage;
    saveAdventure(s, { current: kept, dayStart: kept, partStart: kept });
    expect(storeOf(townById(loadAdventure(s, mapById)!.current, ashford)!)).toEqual(['warBelt', 'linenHood']);
  });
});

describe('a bigger bag', () => {
  it('starts as a Satchel of 4, and the Storehouse sells Saddlebags (8), the Treasury a Pack Mule (12)', () => {
    const a = atHome();
    expect(bagSize(a.hero)).toBe(4);
    expect(nextBag(a.hero)).toMatchObject({ name: 'Saddlebags', size: 8 });
    const bought = buyBag(a, ashford, a.hero.id)!;
    expect(bagSize(bought.hero)).toBe(8);
    expect(bought.purse.gold).toBe(a.purse.gold - 750);
    expect(cantBuyBag(bought, ashford, a.hero.id)).toMatch(/Treasury sells the Pack Mule/);
    const rich = { ...bought, towns: bought.towns.map((t) => (t.id === ashford ? { ...t, built: [...t.built, 'treasury' as const] } : t)) };
    const mule = buyBag(rich, ashford, a.hero.id)!;
    expect(bagSize(mule.hero)).toBe(12);
    expect(cantBuyBag(mule, ashford, a.hero.id)).toMatch(/biggest bag/);
  });

  it('needs the gold and a Storehouse', () => {
    const a = atHome();
    expect(cantBuyBag({ ...a, purse: { ...a.purse, gold: 100 } }, ashford, a.hero.id)).toBe('Not enough gold');
    expect(cantBuyBag(atHome([]), ashford, a.hero.id)).toMatch(/Build a Storehouse/);
  });
});

describe('handing gear between heroes', () => {
  it('works side by side or in the same town, not apart', () => {
    expect(canSwapGear({ x: 3, y: 3 }, { x: 4, y: 4 })).toBe(true);
    expect(canSwapGear({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(true);
    expect(canSwapGear({ x: 3, y: 3 }, { x: 5, y: 3 })).toBe(false);
  });

  it('gives from the bag or off the body: worn at once in an empty slot, else into the bag', () => {
    const a = twoInTown();
    const ianthe = a.hero;
    const withHood = { ...a, hero: { ...ianthe, bag: ['linenHood' as const, 'bronzeHelm' as const] } };
    const rowan = (x: Adventure) => ourHeroes(x).find((h) => h.id === 'rowan')!;
    const one = giveItem(withHood, 'ianthe', { bag: 1 }, 'rowan')!;
    expect(one.hero.bag).toEqual(['linenHood']);
    // Rowan wore no helm on part 2's fresh start: it goes on.
    expect(rowan(one).gear?.helm ?? rowan(one).bag?.at(-1)).toBe('bronzeHelm');
    const book = giveItem(one, 'ianthe', { slot: 'book' }, 'rowan')!;
    expect(book.hero.gear?.book).toBeUndefined();
    expect([rowan(book).gear?.book, ...(rowan(book).bag ?? [])]).toContain('noviceSpellbook');
  });

  it('says why not: too far, nothing there, the other bag full', () => {
    const a = twoInTown();
    const far = { ...a, hero: { ...a.hero, x: a.hero.x + 4, bag: ['linenHood' as const] } };
    expect(cantGive(far, 'ianthe', { bag: 0 }, 'rowan')).toMatch(/too far/);
    expect(cantGive(a, 'ianthe', { bag: 0 }, 'rowan')).toMatch(/Nothing/);
    const packed = { ...a, hero: { ...a.hero, bag: ['bronzeHelm' as const] }, others: a.others!.map((h) => ({ ...h, gear: { helm: 'linenHood' as const }, bag: full(4) })) };
    expect(cantGive(packed, 'ianthe', { bag: 0 }, 'rowan')).toMatch(/Rowan's bag is full/);
    expect(giveItem(packed, 'ianthe', { bag: 0 }, 'rowan')).toBeNull();
  });
});

describe('a piece the bag has no room for', () => {
  const won = (a: Adventure, id: string): Adventure => {
    const o = a.objects.find((x) => x.id === id)!;
    const near = { ...a, hero: { ...a.hero, x: o.x - 1, y: o.y } };
    const s = battleSides(near, id);
    const battle = { ...createBattle(s.attacker, s.defender, s.seed).state, winner: 0 as const };
    return afterBattle(near, THORNWOOD, id, battle);
  };

  it('lies on the ground where the monster stood, and is picked up once there is room', () => {
    const a = startAdventure(THORNWOOD);
    const packed = { ...a, prompts: [], hero: { ...a.hero, gear: { helm: 'bronzeHelm' as const }, bag: full(4) } };
    const after = won(packed, 'meadow-satyrs');
    const lying = liveObjects(after).find((o) => o.id === 'meadow-satyrs')!;
    expect(lying).toMatchObject({ kind: 'item', item: 'linenHood' });
    expect(JSON.stringify(after.prompts.at(-1))).toMatch(/lies here on the ground/);
    // Still full: it stays.
    expect(liveObjects(visitSite(after, lying).adv).some((o) => o.id === lying.id)).toBe(true);
    // Room made: it's taken.
    const roomy = { ...after, hero: { ...after.hero, bag: full(3) } };
    const picked = visitSite(roomy, lying).adv;
    expect(liveObjects(picked).some((o) => o.id === lying.id)).toBe(false);
    expect(picked.hero.bag).toContain('linenHood');
    // And it's still there after a save.
    const m = new Map<string, string>();
    const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as unknown as Storage;
    saveAdventure(s, { current: after, dayStart: after, partStart: after });
    expect(liveObjects(loadAdventure(s, mapById)!.current).find((o) => o.id === lying.id)).toMatchObject({ kind: 'item', item: 'linenHood' });
  });

  it('blocks its tile like any site: the hero stops beside it and picks it up', () => {
    const a = won({ ...startAdventure(THORNWOOD), prompts: [], hero: { ...startAdventure(THORNWOOD).hero, gear: { helm: 'bronzeHelm' as const }, bag: full(4) } }, 'meadow-satyrs');
    const o = a.objects.find((x) => x.id === 'meadow-satyrs')!;
    const roomy = { ...a, hero: { ...a.hero, bag: [], x: o.x - 1, y: o.y, mp: 9999 } };
    const r = stepHero(roomy, THORNWOOD, { x: o.x, y: o.y, cost: 100, straight: 100, day: 0 });
    expect(r.adv.hero.x).toBe(o.x - 1);
    expect(r.adv.hero.gear?.helm === 'linenHood' || r.adv.hero.bag?.includes('linenHood')).toBe(true);
  });
});

describe('the Storehouse room', () => {
  it('picks a piece with one tap and sends it with the next: to the store, to a bag, from hero to hero', async () => {
    const { storeTap, storeView } = await import('../src/scenes/town/storeData');
    const a = twoInTown();
    const b = { ...a, hero: { ...a.hero, bag: ['linenHood' as const] } };
    const picked = storeTap(b, ashford, null, { kind: 'bag', heroId: 'ianthe', i: 0 });
    expect(picked).toMatchObject({ moved: false, picked: { kind: 'bag', heroId: 'ianthe', i: 0 } });
    // Tapping it again lets go; tapping an empty place first picks nothing.
    expect(storeTap(b, ashford, picked.picked, picked.picked!).picked).toBeNull();
    expect(storeTap(b, ashford, null, { kind: 'store', i: 3 }).picked).toBeNull();
    const stored = storeTap(b, ashford, picked.picked, { kind: 'store', i: 5 });
    expect(stored.moved).toBe(true);
    expect(storeOf(townById(stored.adv, ashford)!)).toEqual(['linenHood']);
    const toRowan = storeTap(stored.adv, ashford, { kind: 'store', i: 0 }, { kind: 'bag', heroId: 'rowan', i: 2 });
    expect(ourHeroes(toRowan.adv).find((h) => h.id === 'rowan')!.gear?.helm).toBe('linenHood');
    expect(toRowan.note).toBe('Rowan puts on the Linen Hood');
    const view = storeView(toRowan.adv, ashford);
    expect(view).toMatchObject({ title: 'Storehouse', kept: 'Kept here: 0 / 8', room: 8 });
    expect(view.heroes.map((h) => h.hero.id).sort()).toEqual(['ianthe', 'rowan']);
    expect(view.heroes[0]!.upgrade).toMatchObject({ label: 'Saddlebags (8)', price: '750 gold', enabled: true });
  });

  it('says why a move is refused, and lets go of the piece', async () => {
    const { storeTap } = await import('../src/scenes/town/storeData');
    const a = twoInTown();
    const packed = { ...a, hero: { ...a.hero, bag: ['linenHood' as const] }, towns: a.towns.map((t) => (t.id === ashford ? { ...t, store: full(8) } : t)) };
    const r = storeTap(packed, ashford, { kind: 'bag', heroId: 'ianthe', i: 0 }, { kind: 'store', i: 0 });
    expect(r).toMatchObject({ moved: false, picked: null, note: 'The Storehouse is full' });
  });

  it('fits the window it is given, a store of 20 and two heroes with the biggest bags, on a phone and a desktop', async () => {
    const { storeLayout } = await import('../src/scenes/town/storeLayout');
    for (const [w, h] of [[1280, 520], [900, 400], [320, 640]] as const) {
      const l = storeLayout({ w, h }, 20, [12, 12]);
      expect(l.w, `${w}`).toBeLessThanOrEqual(w);
      expect(l.h, `${w}x${h}`).toBeLessThanOrEqual(h);
    }
    expect(storeLayout({ w: 1280, h: 520 }, 8, [4]).heroes[0]!.buyBelow).toBe(false);
    expect(storeLayout({ w: 320, h: 640 }, 8, [4]).heroes[0]!.buyBelow).toBe(true);
  });
});
