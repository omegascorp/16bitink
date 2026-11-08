import { townById, type Adventure } from '../../logic/adventure';
import { bagOf, bagSize, BAGS, itemDef, type ItemId } from '../../logic/items';
import { has } from '../../logic/town';
import type { Hero } from '../../logic/hero';
import { BAG_SHOP, cantBuyBag, cantGive, cantStore, cantTakeStored, giveItem, heroesIn, nextBag, storeItem, storeOf, storeRoom, takeStored } from '../../logic/storage';
import { BUILDINGS } from '../../logic/buildings';

/** A place in the Storehouse room: one of the store's, or one in a hero's bag. */
export type StoreRef = { readonly kind: 'store'; readonly i: number } | { readonly kind: 'bag'; readonly heroId: string; readonly i: number };

/** What a move did: the game after it, or why not; null when there's nothing to do (a piece moved onto its own side). */
export type StoreMove = { readonly adv: Adventure } | { readonly why: string } | null;

/** The piece at `from` sent to the side `to` is on: into the store, into a hero's bag, or from one hero to the other. */
export function storeMove(adv: Adventure, townId: string, from: StoreRef, to: StoreRef): StoreMove {
  if (from.kind === 'store') {
    if (to.kind === 'store') return null;
    const why = cantTakeStored(adv, townId, to.heroId, from.i);
    return why ? { why } : { adv: takeStored(adv, townId, to.heroId, from.i)! };
  }
  if (to.kind === 'store') {
    const why = cantStore(adv, townId, from.heroId, { bag: from.i });
    return why ? { why } : { adv: storeItem(adv, townId, from.heroId, { bag: from.i })! };
  }
  if (to.heroId === from.heroId) return null;
  const why = cantGive(adv, from.heroId, { bag: from.i }, to.heroId);
  return why ? { why } : { adv: giveItem(adv, from.heroId, { bag: from.i }, to.heroId)! };
}

/** One hero's row in the room: their bag, and the bigger one on sale here (or why not). */
export interface StoreHero {
  readonly hero: Hero;
  /** "Leather Satchel 1 / 4". */
  readonly bag: string;
  /** The next bag up, and whether it can be bought now; null when they have the biggest. */
  readonly upgrade: { readonly label: string; readonly price: string; readonly enabled: boolean; readonly why: string | null } | null;
}

export interface StoreView {
  readonly title: string;
  /** "Kept here: 3 / 8". */
  readonly kept: string;
  readonly room: number;
  readonly heroes: readonly StoreHero[];
}

/** The room as things stand in town `townId`. */
export function storeView(adv: Adventure, townId: string): StoreView {
  const town = townById(adv, townId)!;
  const room = storeRoom(town);
  const heroes = heroesIn(adv, town).map((hero): StoreHero => {
    const next = nextBag(hero);
    const why = next && cantBuyBag(adv, townId, hero.id);
    const sold = next && has(town, BAG_SHOP[next.id].needs);
    return {
      hero,
      bag: `${bagOf(hero).name} ${hero.bag?.length ?? 0} / ${bagSize(hero)}`,
      upgrade: !next ? null : {
        label: `${next.name} (${next.size})`,
        price: sold ? `${BAG_SHOP[next.id].cost.gold} gold` : `Needs a ${BUILDINGS[BAG_SHOP[next.id].needs].name}`,
        enabled: !why,
        why,
      },
    };
  });
  return { title: has(town, 'treasury') ? 'Treasury' : 'Storehouse', kept: `Kept here: ${storeOf(town).length} / ${room}`, room, heroes };
}

/** The biggest bag a hero can have: rows are laid out for it. */
export const BIGGEST_BAG = BAGS[BAGS.length - 1]!.size;

/** The piece at `ref`, if any. */
export function itemAt(adv: Adventure, townId: string, ref: StoreRef): ItemId | undefined {
  if (ref.kind === 'store') return storeOf(townById(adv, townId)!)[ref.i];
  return heroesIn(adv, townById(adv, townId)!).find((h) => h.id === ref.heroId)?.bag?.[ref.i];
}

/** After a tap: the game (changed when a piece moved), what's picked now, and a word on a move refused. */
export interface StoreTap {
  readonly adv: Adventure;
  readonly moved: boolean;
  readonly picked: StoreRef | null;
  readonly note: string;
}

const same = (a: StoreRef, b: StoreRef): boolean => a.kind === b.kind && a.i === b.i && (a.kind === 'store' || a.heroId === (b as { heroId: string }).heroId);

/**
 * A tap in the room, as companies move in a town: the first picks a piece,
 * the second sends it to the side tapped (the store, or a hero's bag); a
 * tap on the picked one lets go, and one on another piece of the same side
 * picks that instead.
 */
export function storeTap(adv: Adventure, townId: string, picked: StoreRef | null, ref: StoreRef): StoreTap {
  const here = itemAt(adv, townId, ref);
  if (!picked || same(picked, ref)) return { adv, moved: false, picked: !picked && here ? ref : null, note: '' };
  const r = storeMove(adv, townId, picked, ref);
  if (!r) return { adv, moved: false, picked: here ? ref : null, note: '' };
  if ('why' in r) return { adv, moved: false, picked: null, note: r.why };
  return { adv: r.adv, moved: true, picked: null, note: wentTo(r.adv, townId, itemAt(adv, townId, picked)!, ref) };
}

/** Where piece `id` went, in words: a hero putting it on (it may not show in their bag), else nothing to say. */
function wentTo(adv: Adventure, townId: string, id: ItemId, to: StoreRef): string {
  if (to.kind === 'store') return '';
  const hero = heroesIn(adv, townById(adv, townId)!).find((h) => h.id === to.heroId);
  return hero && Object.values(hero.gear ?? {}).includes(id) && !hero.bag?.includes(id) ? `${hero.name} puts on the ${itemDef(id).name}` : '';
}
