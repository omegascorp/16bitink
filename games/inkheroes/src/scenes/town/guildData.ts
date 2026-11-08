import { heroTown, type Adventure } from '../../logic/adventure';
import { hasSpellbook, itemDef, itemSays, QUALITY_NAMES, type ItemId } from '../../logic/items';
import { canAfford } from '../../logic/resources';
import { SPELLBOOK_COST, spellbookSold, type Town } from '../../logic/town';
import { SPELLS, type SpellId } from '../../logic/spells';

/** What the guild's book stand shows: always the book it sells. */
export interface BookStand {
  readonly item: ItemId;
  readonly name: string;
  /** Its grade and what it gives. */
  readonly says: string;
  readonly price: string;
  /** Who is, or isn't, in the market for it. */
  readonly note: string | null;
  /** A hero without a book is in town: the Buy button, lit if the purse reaches. */
  readonly buy: { readonly enabled: boolean } | null;
}

/** The guild's book, and whether the hero in town can buy it. */
export function bookStand(adv: Adventure, town: Town): BookStand {
  const { hero } = adv;
  const sold = spellbookSold(town);
  const def = itemDef(sold);
  const stand = { item: sold, name: def.name, says: `${QUALITY_NAMES[def.quality]}: ${itemSays(sold)}`, price: `${SPELLBOOK_COST} gold` };
  if (heroTown(adv)?.id !== town.id) return { ...stand, note: null, buy: null };
  if (hasSpellbook(hero)) return { ...stand, note: `${hero.name} has a spellbook`, buy: null };
  if (hero.bag?.some((id) => itemDef(id).slot === 'book')) return { ...stand, note: `${hero.name} has one in the bag: wear it from the Gear tab`, buy: null };
  const afford = canAfford(adv.purse, { gold: SPELLBOOK_COST });
  return { ...stand, note: afford ? null : 'Not enough gold', buy: { enabled: afford } };
}

/** A spell's level and cost, in a line. */
export const spellFacts = (id: SpellId): string => `Level ${SPELLS[id].level} · ${SPELLS[id].mana} mana${SPELLS[id].ankhs ? ` + ${SPELLS[id].ankhs} Ankh` : ''}`;

/** Whether the hero has `id`, or what they still need. */
export function spellNote(adv: Adventure, town: Town, id: SpellId): { readonly text: string; readonly known: boolean } {
  const { hero } = adv;
  if (hasSpellbook(hero) && hero.spells.includes(id)) return { text: `${hero.name} knows this spell`, known: true };
  if (!hasSpellbook(hero)) return { text: `${hero.name} needs a spellbook to learn it`, known: false };
  return { text: heroTown(adv)?.id === town.id ? `${hero.name} can learn it here` : `${hero.name} learns it on entering the town`, known: false };
}
