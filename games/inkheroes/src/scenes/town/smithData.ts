import { cantBuyMachine, heroTown, type Adventure } from '../../logic/adventure';
import { creature } from '../../logic/creatures';
import { hasAsGood, itemDef, itemQuality, itemSays, QUALITY_NAMES, type ItemId, type SoldMachine } from '../../logic/items';
import type { Town } from '../../logic/town';

/** A machine on the Blacksmith's floor, as things stand. */
export interface Ware {
  readonly item: SoldMachine;
  readonly name: string;
  readonly price: string;
  /** Its grade and what it does. */
  readonly grade: string;
  readonly says: string;
  /** Whether the hero has it or a finer one: nothing to sell them. */
  readonly owned: boolean;
  /** What buying it means, or why it can't be bought. */
  readonly note: string;
  /** The hero is here and could use it: the Buy button, lit if the purse reaches. */
  readonly buy: { readonly enabled: boolean } | null;
}

/** War machine `m` as the Blacksmith of `town` shows it. */
export function wareOf(adv: Adventure, town: Town, m: SoldMachine): Ware {
  const { hero } = adv;
  const def = itemDef(m);
  const owned = hasAsGood(hero, m);
  const ware = { item: m, name: def.name, price: `${creature(m).cost.gold} gold`, grade: QUALITY_NAMES[itemQuality(m)], says: itemSays(m), owned };
  if (heroTown(adv)?.id !== town.id) return { ...ware, note: `${hero.name} must be here to buy it`, buy: null };
  const why = cantBuyMachine(adv, m);
  if (why === 'Not enough gold') return { ...ware, note: why, buy: { enabled: false } };
  if (why) return { ...ware, note: why, buy: null };
  const worn = hero.gear?.machine;
  return { ...ware, note: worn ? `Replaces the ${itemDef(worn).name}, which goes to the bag` : 'Rides with the hero and works by itself in battle', buy: { enabled: true } };
}

/** The ware to show first: the first the hero doesn't have, else the first. */
export const firstWare = (wares: readonly Ware[]): Ware | undefined => wares.find((w) => !w.owned) ?? wares[0];

/** What the hero brings to a siege now. */
export function heroMachine(adv: Adventure): { readonly item: ItemId | null; readonly name: string } {
  const item = adv.hero.gear?.machine ?? null;
  return { item, name: item ? itemDef(item).name : 'No war machine' };
}
