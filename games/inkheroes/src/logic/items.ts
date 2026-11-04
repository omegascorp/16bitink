import type { Hero } from './hero';

/** What a hero wears: armor (always part of a set), and the pieces that never are. */
export const SLOTS = ['helm', 'cuirass', 'bracers', 'belt', 'greaves', 'boots', 'weapon', 'shield', 'amulet', 'ring1', 'ring2', 'book'] as const;
export type Slot = (typeof SLOTS)[number];

/** How many spare pieces a hero carries. */
export const BAG_SIZE = 20;

export type Quality = 'gray' | 'green' | 'blue' | 'purple' | 'gold';
export const QUALITY_NAMES: Readonly<Record<Quality, string>> = { gray: 'Common', green: 'Uncommon', blue: 'Rare', purple: 'Epic', gold: 'Legendary' };
export type GearStat = 'attack' | 'defense' | 'power' | 'knowledge' | 'morale' | 'luck' | 'sight' | 'travel';

export const GEAR_STAT_NAMES: Readonly<Record<GearStat, string>> = {
  attack: 'Attack', defense: 'Defense', power: 'Spell Power', knowledge: 'Knowledge', morale: 'Morale', luck: 'Luck', sight: 'Sight', travel: 'tile a day',
};

export interface ItemDef {
  readonly name: string;
  readonly slot: Slot;
  readonly quality: Quality;
  /** The set it belongs to (gray sets give no set bonus). */
  readonly set?: string;
  readonly gives: Readonly<Partial<Record<GearStat, number>>>;
}

export const SET_NAMES: Readonly<Record<string, string>> = { bronze: 'Bronze set' };

/** Every piece. Numbers in docs/inkheroes-design.md. */
export const ITEMS = {
  bronzeHelm: { name: 'Bronze Helm', slot: 'helm', quality: 'gray', set: 'bronze', gives: { defense: 1 } },
  bronzeCuirass: { name: 'Bronze Cuirass', slot: 'cuirass', quality: 'gray', set: 'bronze', gives: { defense: 1 } },
  bronzeBracers: { name: 'Bronze Bracers', slot: 'bracers', quality: 'gray', set: 'bronze', gives: { attack: 1 } },
  warBelt: { name: 'War Belt', slot: 'belt', quality: 'gray', set: 'bronze', gives: { morale: 1 } },
  bronzeGreaves: { name: 'Bronze Greaves', slot: 'greaves', quality: 'gray', set: 'bronze', gives: { defense: 1 } },
  warSandals: { name: 'War Sandals', slot: 'boots', quality: 'gray', set: 'bronze', gives: { attack: 1 } },
  noviceSpellbook: { name: 'Novice’s Spellbook', slot: 'book', quality: 'gray', gives: { knowledge: 1 } },
  oracleSpellbook: { name: 'Oracle’s Spellbook', slot: 'book', quality: 'green', gives: { knowledge: 1, power: 1 } },
  alexandrianCodex: { name: 'Alexandrian Codex', slot: 'book', quality: 'blue', gives: { knowledge: 2, power: 1 } },
} as const satisfies Record<string, ItemDef>;

export type ItemId = keyof typeof ITEMS;
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export type Gear = Readonly<Partial<Record<Slot, ItemId>>>;

export const itemDef = (id: ItemId): ItemDef => ITEMS[id];

/** A piece's grade. */
export const itemQuality = (id: ItemId): Quality => itemDef(id).quality;

/** Whether `h` wears a spellbook: without one a hero has no magic at all. */
export const hasSpellbook = (h: Pick<Hero, 'gear'>): boolean => !!h.gear?.book;

/** What a piece gives, in words: "+1 Defense". */
export const itemSays = (id: ItemId): string => (Object.entries(itemDef(id).gives) as [GearStat, number][]).map(([s, n]) => `+${n} ${GEAR_STAT_NAMES[s]}`).join(', ');

/** What everything `h` wears adds up to. */
export function gearBonus(h: Pick<Hero, 'gear'>): Partial<Record<GearStat, number>> {
  const out: Partial<Record<GearStat, number>> = {};
  for (const id of Object.values(h.gear ?? {})) {
    for (const [s, n] of Object.entries(itemDef(id).gives) as [GearStat, number][]) out[s] = (out[s] ?? 0) + n;
  }
  return out;
}

/** `h` with the four stats raised by what they wear. */
export function withGear<H extends Pick<Hero, 'gear' | 'attack' | 'defense' | 'power' | 'knowledge'>>(h: H): H {
  const b = gearBonus(h);
  return { ...h, attack: h.attack + (b.attack ?? 0), defense: h.defense + (b.defense ?? 0), power: h.power + (b.power ?? 0), knowledge: h.knowledge + (b.knowledge ?? 0) };
}

/** A new piece: worn at once in an empty slot, else into the bag, else (the bag full) left behind. */
export function gainItem(h: Hero, id: ItemId): { hero: Hero; worn: boolean; kept: boolean } {
  const { slot } = itemDef(id);
  if (!h.gear?.[slot]) return { hero: { ...h, gear: { ...h.gear, [slot]: id } }, worn: true, kept: true };
  const bag = h.bag ?? [];
  if (bag.length >= BAG_SIZE) return { hero: h, worn: false, kept: false };
  return { hero: { ...h, bag: [...bag, id] }, worn: false, kept: true };
}

/** The bag's piece `i` put on; what was in its slot goes to the bag. */
export function wear(h: Hero, i: number): Hero {
  const id = h.bag?.[i];
  if (!id) return h;
  const { slot } = itemDef(id);
  const was = h.gear?.[slot];
  return { ...h, gear: { ...h.gear, [slot]: id }, bag: [...h.bag!.filter((_, j) => j !== i), ...(was ? [was] : [])] };
}

/** The piece in `slot` taken off into the bag, if the bag has room. */
export function takeOff(h: Hero, slot: Slot): Hero {
  const id = h.gear?.[slot];
  const bag = h.bag ?? [];
  if (!id || bag.length >= BAG_SIZE) return h;
  const { [slot]: _off, ...gear } = h.gear!;
  return { ...h, gear, bag: [...bag, id] };
}
