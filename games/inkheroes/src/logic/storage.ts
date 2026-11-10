import { ourHeroes, townById, withTown, type Adventure } from './adventure';
import { BUILDINGS, type BuildingId } from './buildings';
import { withHero } from './heroes';
import { withinMana, type Hero } from './hero';
import { BAGS, bagRoom, freeSlotFor, gainItem, type ItemId, type Slot } from './items';
import { canAfford, pay, type Amount } from './resources';
import { has, type Town } from './town';

/**
 * Gear kept off the heroes: each town's Storehouse (a Treasury holds more,
 * a Portal joins it to the other Portal towns' as one store), the bigger
 * bags it sells, and pieces handed from one hero to another. A hero carries
 * little (`BAGS`), so the store is where the rest waits.
 */

/** Where a piece is taken from: a place in the bag, or a slot it is worn in. */
export type ItemFrom = { readonly bag: number } | { readonly slot: Slot };

/** What the Storehouse sells to carry more, by the bag it gives, and the building that sells it. */
export const BAG_SHOP: Readonly<Record<'saddlebags' | 'packMule', { readonly cost: Amount; readonly needs: BuildingId }>> = {
  saddlebags: { cost: { gold: 750 }, needs: 'storehouse' },
  packMule: { cost: { gold: 2000 }, needs: 'treasury' },
};

/** How many pieces `t` keeps: its best store's room, 0 without one. */
export const storeRoom = (t: Pick<Town, 'built'>): number => Math.max(0, ...t.built.map((b) => BUILDINGS[b].store ?? 0));
export const storeOf = (t: Pick<Town, 'store'>): readonly ItemId[] => t.store ?? [];

/**
 * The towns whose stores `town`'s Storehouse reaches: with a Portal, every
 * town of its holder's that has one (itself first, then the map's order),
 * kept as one store; without, itself alone. Each piece still lies in one
 * town's own store, so a Portal town taken takes its own pieces with it.
 */
export function sharedWith(adv: Adventure, town: Pick<Town, 'id'>): Town[] {
  const here = townById(adv, town.id);
  if (!here) return [];
  if (!has(here, 'portal')) return [here];
  return [here, ...adv.towns.filter((t) => t.id !== here.id && t.owner === here.owner && has(t, 'portal'))];
}

/** Every piece `town`'s Storehouse reaches, its own first (sharedWith's order): the store's places count through it. */
export const keptIn = (adv: Adventure, town: Pick<Town, 'id'>): ItemId[] => sharedWith(adv, town).flatMap((t) => [...storeOf(t)]);
/** The room of every store `town`'s reaches, together. */
export const sharedRoom = (adv: Adventure, town: Pick<Town, 'id'>): number => sharedWith(adv, town).reduce((n, t) => n + storeRoom(t), 0);

/** Where the shared store's piece `i` lies: the town that holds it, and its place in that town's own store. */
function keptAt(adv: Adventure, town: Pick<Town, 'id'>, i: number): { town: Town; i: number } | null {
  let at = i;
  for (const t of sharedWith(adv, town)) {
    if (at < storeOf(t).length) return at >= 0 ? { town: t, i: at } : null;
    at -= storeOf(t).length;
  }
  return null;
}

/** `adv` without the shared store's piece `i` (reached from `town`), taken from whichever town holds it. */
export function withoutKept(adv: Adventure, town: Pick<Town, 'id'>, i: number): Adventure {
  const at = keptAt(adv, town, i);
  return at ? withTown(adv, { ...at.town, store: storeOf(at.town).filter((_, j) => j !== at.i) }) : adv;
}

/** `adv` with piece `id` kept in `town`'s store, or (it full) the first town sharing it with room; null when all are full. */
export function keepIn(adv: Adventure, town: Pick<Town, 'id'>, id: ItemId): Adventure | null {
  const room = sharedWith(adv, town).find((t) => storeOf(t).length < storeRoom(t));
  return room ? withTown(adv, { ...room, store: [...storeOf(room), id] }) : null;
}

/** Our heroes standing in `t`: the one in its garrison and the one in its gate. */
export const heroesIn = (adv: Adventure, t: Pick<Town, 'x' | 'y'>): Hero[] => ourHeroes(adv).filter((h) => h.x === t.x && h.y === t.y);

const heroById = (adv: Adventure, id: string): Hero | undefined => ourHeroes(adv).find((h) => h.id === id);

/** `h` without the piece at `from`, and the piece; null when nothing is there. */
export function takeFrom(h: Hero, from: ItemFrom): { hero: Hero; id: ItemId } | null {
  if ('bag' in from) {
    const id = h.bag?.[from.bag];
    if (!id) return null;
    const bag = h.bag!.filter((_, i) => i !== from.bag);
    return { hero: { ...h, bag }, id };
  }
  const id = h.gear?.[from.slot];
  if (!id) return null;
  const { [from.slot]: _off, ...gear } = h.gear!;
  return { hero: { ...h, gear }, id };
}

/** Whether hero `h` can take `id`: an empty slot to wear it in, or room in the bag. */
const canTake = (h: Hero, id: ItemId): boolean => !!freeSlotFor(h, id) || bagRoom(h);

/** The town and hero a Storehouse errand is about, or why it can't happen. */
function atStore(adv: Adventure, townId: string, heroId: string): { town: Town; hero: Hero } | string {
  const town = townById(adv, townId);
  const hero = heroById(adv, heroId);
  if (!town || town.owner !== 'player' || !hero) return 'Not here';
  if (!storeRoom(town)) return 'Build a Storehouse to keep gear here';
  if (hero.x !== town.x || hero.y !== town.y) return `${hero.name} must be in ${town.name}`;
  return { town, hero };
}

/** Why hero `heroId` can't leave the piece at `from` in `townId`'s store, or null when they can. */
export function cantStore(adv: Adventure, townId: string, heroId: string, from: ItemFrom): string | null {
  const at = atStore(adv, townId, heroId);
  if (typeof at === 'string') return at;
  if (!takeFrom(at.hero, from)) return 'Nothing there';
  if (keptIn(adv, at.town).length >= sharedRoom(adv, at.town)) return `The ${has(at.town, 'treasury') ? 'Treasury' : 'Storehouse'} is full`;
  return null;
}

/** Hero `heroId` leaves the piece at `from` in the town's store; null when they can't (see cantStore). */
export function storeItem(adv: Adventure, townId: string, heroId: string, from: ItemFrom): Adventure | null {
  if (cantStore(adv, townId, heroId, from)) return null;
  const left = takeFrom(heroById(adv, heroId)!, from)!;
  // Into this town's own store while it has room, else another the Portal joins.
  return keepIn(withHero(adv, withinMana(left.hero)), townById(adv, townId)!, left.id);
}

/** Why hero `heroId` can't take the store's piece `i`, or null when they can. */
export function cantTakeStored(adv: Adventure, townId: string, heroId: string, i: number): string | null {
  const at = atStore(adv, townId, heroId);
  if (typeof at === 'string') return at;
  const id = keptIn(adv, at.town)[i];
  if (!id) return 'Nothing there';
  return canTake(at.hero, id) ? null : `${at.hero.name}'s bag is full`;
}

/** Hero `heroId` takes the store's piece `i`: worn at once in an empty slot, else into the bag. Null when they can't. */
export function takeStored(adv: Adventure, townId: string, heroId: string, i: number): Adventure | null {
  if (cantTakeStored(adv, townId, heroId, i)) return null;
  const town = townById(adv, townId)!;
  const got = gainItem(heroById(adv, heroId)!, keptIn(adv, town)[i]!);
  return withoutKept(withHero(adv, got.hero), town, i);
}

/** The bag a hero would buy next, if a bigger one exists. */
export function nextBag(h: Pick<Hero, 'pack'>): { readonly pack: number; readonly id: 'saddlebags' | 'packMule'; readonly name: string; readonly size: number } | null {
  const pack = (h.pack ?? 0) + 1;
  const bag = BAGS[pack];
  return bag && bag.id !== 'satchel' ? { pack, id: bag.id, name: bag.name, size: bag.size } : null;
}

/** Why hero `heroId` can't buy a bigger bag in `townId` now, or null when they can. */
export function cantBuyBag(adv: Adventure, townId: string, heroId: string): string | null {
  const at = atStore(adv, townId, heroId);
  if (typeof at === 'string') return at;
  const next = nextBag(at.hero);
  if (!next) return `${at.hero.name} has the biggest bag`;
  const shop = BAG_SHOP[next.id];
  if (!has(at.town, shop.needs)) return `A ${BUILDINGS[shop.needs].name} sells the ${next.name}`;
  if (!canAfford(adv.purse, shop.cost)) return 'Not enough gold';
  return null;
}

/** Hero `heroId` buys the next bag up; null when they can't (see cantBuyBag). */
export function buyBag(adv: Adventure, townId: string, heroId: string): Adventure | null {
  if (cantBuyBag(adv, townId, heroId)) return null;
  const hero = heroById(adv, heroId)!;
  const next = nextBag(hero)!;
  return withHero({ ...adv, purse: pay(adv.purse, BAG_SHOP[next.id].cost) }, { ...hero, pack: next.pack });
}

/** Two of our heroes who can hand each other gear: side by side, or both in the same town (garrison and gate). */
export function canSwapGear(a: Pick<Hero, 'x' | 'y'>, b: Pick<Hero, 'x' | 'y'>): boolean {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 1;
}

/** Why hero `fromId` can't hand the piece at `from` to hero `toId`, or null when they can. */
export function cantGive(adv: Adventure, fromId: string, from: ItemFrom, toId: string): string | null {
  const giver = heroById(adv, fromId);
  const taker = heroById(adv, toId);
  if (!giver || !taker || giver.id === taker.id) return 'Not here';
  if (!canSwapGear(giver, taker)) return `${taker.name} is too far away`;
  const left = takeFrom(giver, from);
  if (!left) return 'Nothing there';
  return canTake(taker, left.id) ? null : `${taker.name}'s bag is full`;
}

/** Hero `fromId` hands the piece at `from` to hero `toId`: worn at once in an empty slot, else into the bag. Null when they can't. */
export function giveItem(adv: Adventure, fromId: string, from: ItemFrom, toId: string): Adventure | null {
  if (cantGive(adv, fromId, from, toId)) return null;
  const left = takeFrom(heroById(adv, fromId)!, from)!;
  const got = gainItem(heroById(adv, toId)!, left.id);
  return withHero(withHero(adv, withinMana(left.hero)), got.hero);
}
