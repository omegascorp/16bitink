import type { Adventure } from './adventure';
import { has } from './town';
import { addTo, RESOURCES, type Purse, type Resource } from './resources';

/**
 * The Marketplace (H3's): any resource for any other, at rates that get
 * better with every Marketplace the side holds. The numbers are VCMI's
 * (lib/mapObjects/IMarket.cpp, config/resources.json), which match H3:
 * each resource has a price (gold 1, wood and ore 250, the rare four 500);
 * a side with `n` Marketplaces trades at an effectiveness of (n + 1) / 20,
 * at most a half; what is wanted costs its price over that. One market
 * trades 10 wood for an ore, 2500 gold for a wood, a wood for 25 gold; nine
 * or more trade 2 for 1 and a wood for 125 gold. The same rules for either
 * side: the rival's planner calls these with its own purse and count.
 */

/** What each resource is worth at market. */
export const MARKET_PRICE: Readonly<Record<Resource, number>> = { gold: 1, wood: 250, ore: 250, mercury: 500, sulfur: 500, crystal: 500, gems: 500 };

/** How much of a wanted resource's worth a trade gives, with `markets` Marketplaces (none trade nothing). */
export const marketEffect = (markets: number): number => (markets <= 0 ? 0 : Math.min((markets + 1) / 20, 0.5));

/** One lot of a trade: `give` of the resource offered for `get` of the one wanted. */
export interface Offer {
  readonly give: number;
  readonly get: number;
}

/** The rate of `give` for `get` with `markets` Marketplaces: one lot. Null when they're the same or there is no market. */
export function marketOffer(markets: number, give: Resource, get: Resource): Offer | null {
  const e = marketEffect(markets);
  if (give === get || e <= 0) return null;
  const r = MARKET_PRICE[give];
  const g = MARKET_PRICE[get] / e;
  // The dearer side is one unit; the cheaper side is how many of it that unit is worth (VCMI rounds as here).
  return r > g ? { give: 1, get: Math.ceil(r / g) } : { give: Math.round(g / r), get: 1 };
}

/** How many lots of `give` for `get` the purse can pay for. */
export function maxLots(p: Purse, markets: number, give: Resource, get: Resource): number {
  const o = marketOffer(markets, give, get);
  return o ? Math.floor(p[give] / o.give) : 0;
}

/** The purse after trading `lots` lots of `give` for `get`; null if it can't (no market, the same resource, not enough to give). */
export function trade(p: Purse, markets: number, give: Resource, get: Resource, lots: number): Purse | null {
  const o = marketOffer(markets, give, get);
  if (!o || !Number.isInteger(lots) || lots <= 0 || lots > maxLots(p, markets, give, get)) return null;
  return addTo(p, { [give]: -o.give * lots, [get]: o.get * lots });
}

/** How many Marketplaces `owner`'s towns have. */
export const marketsOf = (adv: Pick<Adventure, 'towns'>, owner: 'player' | 'rival'): number => adv.towns.filter((t) => t.owner === owner && has(t, 'marketplace')).length;

/** The player trades at their Marketplaces: the adventure after, or null if the trade can't be made. */
export function marketTrade(adv: Adventure, give: Resource, get: Resource, lots: number): Adventure | null {
  const purse = trade(adv.purse, marketsOf(adv, 'player'), give, get, lots);
  return purse ? { ...adv, purse } : null;
}

/** The resources in the market's order (the purse's). */
export const MARKET_GOODS: readonly Resource[] = RESOURCES;
