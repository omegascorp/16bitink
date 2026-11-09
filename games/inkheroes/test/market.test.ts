import { describe, expect, it } from 'vitest';
import { OTHRYS } from '../src/level/borderMarch';
import { startAdventure } from '../src/logic/adventure';
import { marketEffect, marketOffer, marketsOf, marketTrade, maxLots, trade } from '../src/logic/market';
import { purse } from '../src/logic/resources';

describe('the Marketplace’s rates (H3’s, by VCMI’s numbers)', () => {
  it('trades common for common at 10, 7, 5, 4, 3, 3, 3, 2, 2 to one as Marketplaces grow', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => marketOffer(n, 'wood', 'ore')!.give)).toEqual([10, 7, 5, 4, 3, 3, 3, 2, 2]);
    expect(marketOffer(1, 'wood', 'ore')!.get).toBe(1);
  });

  it('sells for gold and buys with gold at H3’s prices', () => {
    expect(marketOffer(1, 'wood', 'gold')).toEqual({ give: 1, get: 25 });
    expect(marketOffer(1, 'gems', 'gold')).toEqual({ give: 1, get: 50 });
    expect(marketOffer(1, 'gold', 'wood')).toEqual({ give: 2500, get: 1 });
    expect(marketOffer(1, 'gold', 'crystal')).toEqual({ give: 5000, get: 1 });
    expect(marketOffer(9, 'wood', 'gold')).toEqual({ give: 1, get: 125 });
    expect(marketOffer(9, 'gold', 'gems')).toEqual({ give: 1000, get: 1 });
    // Rare for common and common for rare.
    expect(marketOffer(1, 'mercury', 'wood')).toEqual({ give: 5, get: 1 });
    expect(marketOffer(1, 'wood', 'mercury')).toEqual({ give: 20, get: 1 });
  });

  it('stops getting better at nine Marketplaces, and trades nothing without one or for the same thing', () => {
    expect(marketEffect(9)).toBe(0.5);
    expect(marketOffer(20, 'wood', 'ore')).toEqual(marketOffer(9, 'wood', 'ore'));
    expect(marketOffer(0, 'wood', 'ore')).toBeNull();
    expect(marketOffer(3, 'ore', 'ore')).toBeNull();
  });
});

describe('a trade', () => {
  const p = purse({ gold: 6000, wood: 23 });

  it('pays lots of what is given for what is wanted, never past the purse', () => {
    expect(maxLots(p, 1, 'wood', 'ore')).toBe(2);
    expect(trade(p, 1, 'wood', 'ore', 2)).toMatchObject({ wood: 3, ore: 2, gold: 6000 });
    expect(trade(p, 1, 'wood', 'ore', 3)).toBeNull();
    expect(trade(p, 1, 'wood', 'ore', 0)).toBeNull();
    expect(trade(p, 1, 'gold', 'gems', 1)).toMatchObject({ gold: 1000, gems: 1 });
    expect(trade(p, 0, 'gold', 'gems', 1)).toBeNull();
  });

  it('counts the side’s own Marketplaces, the same rule for the player and the rival', () => {
    const adv = startAdventure(OTHRYS);
    // Lykosoura has one; the player's towns none yet on a fresh start.
    expect(marketsOf(adv, 'rival')).toBe(1);
    expect(marketsOf(adv, 'player')).toBe(0);
    expect(marketTrade(adv, 'gold', 'wood', 1)).toBeNull();
    const two = { ...adv, purse: purse({ gold: 9000 }), towns: adv.towns.map((t, i) => (i < 2 ? { ...t, built: [...t.built, 'marketplace' as const] } : t)) };
    expect(marketsOf(two, 'player')).toBe(2);
    expect(marketTrade(two, 'gold', 'wood', 2)!.purse).toMatchObject({ gold: 9000 - 2 * 1667, wood: 2 });
  });
});

describe('the market’s window', () => {
  it('fits a 320 px phone and a laptop, the seven goods in a row each way', async () => {
    const { marketLayout } = await import('../src/scenes/town/marketLayout');
    for (const area of [{ w: 320, h: 400 }, { w: 390, h: 430 }, { w: 1400, h: 700 }]) {
      const l = marketLayout(area);
      expect(l.w).toBeLessThanOrEqual(area.w - 8);
      expect(7 * l.tile.w + 6 * 3 + 12).toBeLessThanOrEqual(l.w);
      expect(l.h).toBeLessThanOrEqual(area.h);
    }
    expect(marketLayout({ w: 1400, h: 700 }).scale).toBe(2);
  });
});
