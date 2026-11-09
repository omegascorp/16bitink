import { describe, expect, it } from 'vitest';
import { THORNWOOD } from '../src/level/borderMarch';
import { startAdventure, type Adventure } from '../src/logic/adventure';
import type { ItemId } from '../src/logic/items';
import { cantSell, forSale, sellPiece, sellPrice } from '../src/logic/sell';

/** Rowan in his first town, which has a Marketplace and a Storehouse, his bag and its store holding `bag` and `store`. */
function market(bag: ItemId[], store: ItemId[] = [], built = ['marketplace', 'storehouse']): Adventure {
  const adv = startAdventure(THORNWOOD);
  const town = adv.towns[0]!;
  return {
    ...adv,
    hero: { ...adv.hero, x: town.x, y: town.y, bag },
    towns: adv.towns.map((t) => (t.id === town.id ? { ...t, built: [...new Set([...t.built, ...built])] as typeof t.built, store } : t)),
  };
}

describe('selling gear at the Marketplace', () => {
  it('pays by grade; Legendary pieces, spellbooks and war machines aren\'t for sale', () => {
    expect(['bronzeHelm', 'bellCuirass', 'spartanHelm', 'myrmidonHelm'].map((id) => sellPrice(id as ItemId))).toEqual([100, 300, 800, 2000]);
    expect(sellPrice('kronosHelm')).toBeNull();
    expect(sellPrice('oracleSpellbook')).toBeNull();
    expect(sellPrice('catapult2')).toBeNull();
  });

  it('buys from the bag of a hero in town and from the town\'s store', () => {
    const adv = market(['spartanHelm', 'catapult'], ['bronzeHelm']);
    const town = adv.towns[0]!.id;
    expect(forSale(adv, town).map((l) => l.id)).toEqual(['bronzeHelm', 'spartanHelm']);
    const sold = sellPiece(adv, town, { kind: 'bag', heroId: adv.hero.id, i: 0 })!;
    expect(sold.purse.gold).toBe(adv.purse.gold + 800);
    expect(sold.hero.bag).toEqual(['catapult']);
    const store = sellPiece(sold, town, { kind: 'store', i: 0 })!;
    expect(store.purse.gold).toBe(sold.purse.gold + 100);
    expect(store.towns[0]!.store).toEqual([]);
    expect(sellPiece(store, town, { kind: 'bag', heroId: adv.hero.id, i: 0 })).toBeNull();
  });

  it('needs a Marketplace, and the hero in the town', () => {
    const none = market(['bronzeHelm'], [], []);
    const town = none.towns[0]!;
    const bare = { ...none, towns: none.towns.map((t) => (t.id === town.id ? { ...t, built: t.built.filter((b) => b !== 'marketplace') } : t)) };
    expect(cantSell(bare, town.id, { kind: 'bag', heroId: bare.hero.id, i: 0 })).toMatch(/Marketplace/);
    const away = market(['bronzeHelm']);
    const out = { ...away, hero: { ...away.hero, x: away.hero.x + 3 } };
    expect(forSale(out, town.id)).toEqual([]);
    expect(sellPiece(out, town.id, { kind: 'bag', heroId: out.hero.id, i: 0 })).toBeNull();
  });
});
