import { ourHeroes, townById, withTown, type Adventure } from './adventure';
import { withHero } from './heroes';
import { itemDef, type ItemId, type Quality } from './items';
import { addTo } from './resources';
import { storeOf } from './storage';
import { has, type Town } from './town';

/**
 * Selling spare pieces at the Marketplace (docs/inkheroes-design.md,
 * Loot): it buys from the bag of a hero of ours in the town and from the
 * town's store, at a price by grade. Legendary pieces, spellbooks and war
 * machines can't be sold.
 */

/** What the Marketplace pays for a piece of each grade (none: never sold). */
export const SELL_PRICE: Readonly<Partial<Record<Quality, number>>> = { gray: 100, green: 300, blue: 800, purple: 2000 };

/** Where a piece for sale lies: a hero's bag, or the town's store. */
export type SellRef = { readonly kind: 'bag'; readonly heroId: string; readonly i: number } | { readonly kind: 'store'; readonly i: number };

/** What the Marketplace pays for `id`, or null when it can't be sold. */
export function sellPrice(id: ItemId): number | null {
  const d = itemDef(id);
  if (d.slot === 'book' || d.slot === 'machine') return null;
  return SELL_PRICE[d.quality] ?? null;
}

/** The town of ours with a Marketplace where selling happens, or why not. */
function market(adv: Adventure, townId: string): Town | string {
  const town = townById(adv, townId);
  if (!town || town.owner !== 'player') return 'Not your town';
  if (!has(town, 'marketplace')) return 'Build a Marketplace to sell gear';
  return town;
}

/** The piece at `ref` in `townId`, if any (a bag's only while its hero stands in the town). */
export function pieceAt(adv: Adventure, townId: string, ref: SellRef): ItemId | undefined {
  const town = townById(adv, townId);
  if (!town) return undefined;
  if (ref.kind === 'store') return storeOf(town)[ref.i];
  const hero = ourHeroes(adv).find((h) => h.id === ref.heroId && h.x === town.x && h.y === town.y);
  return hero?.bag?.[ref.i];
}

/** Every piece the Marketplace of `townId` would buy now: the store's, then each hero's in town. */
export function forSale(adv: Adventure, townId: string): { ref: SellRef; id: ItemId; price: number }[] {
  const town = townById(adv, townId);
  if (!town) return [];
  const refs: SellRef[] = [
    ...storeOf(town).map((_, i): SellRef => ({ kind: 'store', i })),
    ...ourHeroes(adv).filter((h) => h.x === town.x && h.y === town.y).flatMap((h) => (h.bag ?? []).map((_, i): SellRef => ({ kind: 'bag', heroId: h.id, i }))),
  ];
  return refs.flatMap((ref) => {
    const id = pieceAt(adv, townId, ref);
    const price = id ? sellPrice(id) : null;
    return id && price ? [{ ref, id, price }] : [];
  });
}

/** Why the piece at `ref` can't be sold in `townId` now, or null when it can. */
export function cantSell(adv: Adventure, townId: string, ref: SellRef): string | null {
  const town = market(adv, townId);
  if (typeof town === 'string') return town;
  const id = pieceAt(adv, townId, ref);
  if (!id) return 'Nothing there to sell';
  return sellPrice(id) ? null : `${itemDef(id).name} can't be sold`;
}

/** The piece at `ref` sold at `townId`'s Marketplace: gone from the bag or store, its price in the purse. Null when it can't be (see cantSell). */
export function sellPiece(adv: Adventure, townId: string, ref: SellRef): Adventure | null {
  if (cantSell(adv, townId, ref)) return null;
  const town = townById(adv, townId)!;
  const price = sellPrice(pieceAt(adv, townId, ref)!)!;
  const paid = { ...adv, purse: addTo(adv.purse, { gold: price }) };
  if (ref.kind === 'store') return withTown(paid, { ...town, store: storeOf(town).filter((_, i) => i !== ref.i) });
  const hero = ourHeroes(adv).find((h) => h.id === ref.heroId)!;
  return withHero(paid, { ...hero, bag: hero.bag!.filter((_, i) => i !== ref.i) });
}
