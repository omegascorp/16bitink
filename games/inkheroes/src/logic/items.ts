import { creature, type MachineId } from './creatures';
import type { Hero } from './hero';

/** What a hero wears: armor (always part of a set), and the pieces that never are. */
export const SLOTS = ['helm', 'cuirass', 'bracers', 'belt', 'greaves', 'boots', 'weapon', 'shield', 'amulet', 'ring1', 'ring2', 'book', 'machine'] as const;
export type Slot = (typeof SLOTS)[number];

/**
 * What a hero carries spare pieces in, smallest first: everyone starts with
 * the Satchel, and a town's Storehouse sells the bigger ones (`bags.ts`).
 */
export type BagId = 'satchel' | 'saddlebags' | 'packMule';
export interface Bag {
  readonly id: BagId;
  readonly name: string;
  readonly size: number;
}
export const BAGS: readonly Bag[] = [
  { id: 'satchel', name: 'Leather Satchel', size: 4 },
  { id: 'saddlebags', name: 'Saddlebags', size: 8 },
  { id: 'packMule', name: 'Pack Mule', size: 12 },
];
/** The most any bag holds. */
export const MAX_BAG = 12;

/** The hero's bag (0 the Satchel, 1 the Saddlebags, 2 the Pack Mule). */
export const bagOf = (h: Pick<Hero, 'pack'>): Bag => BAGS[Math.min(h.pack ?? 0, BAGS.length - 1)]!;
/** How many spare pieces `h` can carry. */
export const bagSize = (h: Pick<Hero, 'pack'>): number => bagOf(h).size;
/** Whether `h`'s bag has room for one more. */
export const bagRoom = (h: Pick<Hero, 'pack' | 'bag'>): boolean => (h.bag?.length ?? 0) < bagSize(h);

export const QUALITIES = ['gray', 'green', 'blue', 'purple', 'gold'] as const;
export type Quality = (typeof QUALITIES)[number];
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
  /** A war machine: the unit that stands on the field for it. */
  readonly machine?: MachineId;
}

export const SET_NAMES: Readonly<Record<string, string>> = { bronze: 'Bronze set', linen: 'Linen set', faience: 'Faience set', scale: 'Scale set' };

/** Every piece. Numbers in docs/inkheroes-design.md. */
export const ITEMS = {
  bronzeHelm: { name: 'Bronze Helm', slot: 'helm', quality: 'gray', set: 'bronze', gives: { defense: 1 } },
  bronzeCuirass: { name: 'Bronze Cuirass', slot: 'cuirass', quality: 'gray', set: 'bronze', gives: { defense: 1 } },
  bronzeBracers: { name: 'Bronze Bracers', slot: 'bracers', quality: 'gray', set: 'bronze', gives: { attack: 1 } },
  warBelt: { name: 'War Belt', slot: 'belt', quality: 'gray', set: 'bronze', gives: { morale: 1 } },
  bronzeGreaves: { name: 'Bronze Greaves', slot: 'greaves', quality: 'gray', set: 'bronze', gives: { defense: 1 } },
  warSandals: { name: 'War Sandals', slot: 'boots', quality: 'gray', set: 'bronze', gives: { attack: 1 } },
  linenHood: { name: 'Linen Hood', slot: 'helm', quality: 'gray', set: 'linen', gives: { knowledge: 1 } },
  linenChiton: { name: 'Linen Chiton', slot: 'cuirass', quality: 'gray', set: 'linen', gives: { power: 1 } },
  linenArmbands: { name: 'Linen Armbands', slot: 'bracers', quality: 'gray', set: 'linen', gives: { power: 1 } },
  cordSash: { name: 'Cord Sash', slot: 'belt', quality: 'gray', set: 'linen', gives: { luck: 1 } },
  linenLeggings: { name: 'Linen Leggings', slot: 'greaves', quality: 'gray', set: 'linen', gives: { knowledge: 1 } },
  templeSandals: { name: 'Temple Sandals', slot: 'boots', quality: 'gray', set: 'linen', gives: { knowledge: 1 } },
  // Egypt's mystic set (chapter 2, part 4): Neferet's, as the Linen set is Ianthe's.
  faienceDiadem: { name: 'Faience Diadem', slot: 'helm', quality: 'gray', set: 'faience', gives: { knowledge: 1 } },
  faienceCollar: { name: 'Faience Collar', slot: 'cuirass', quality: 'gray', set: 'faience', gives: { power: 1 } },
  faienceBangles: { name: 'Faience Bangles', slot: 'bracers', quality: 'gray', set: 'faience', gives: { power: 1 } },
  scarabGirdle: { name: 'Scarab Girdle', slot: 'belt', quality: 'gray', set: 'faience', gives: { luck: 1 } },
  faienceAnklets: { name: 'Faience Anklets', slot: 'greaves', quality: 'gray', set: 'faience', gives: { knowledge: 1 } },
  reedSandals: { name: 'Reed Sandals', slot: 'boots', quality: 'gray', set: 'faience', gives: { knowledge: 1 } },
  // Egypt's fighter's set (part 5): Paser's, as the Bronze set is Rowan's.
  scaleHelm: { name: 'Scale Helm', slot: 'helm', quality: 'gray', set: 'scale', gives: { defense: 1 } },
  scaleCoat: { name: 'Scale Coat', slot: 'cuirass', quality: 'gray', set: 'scale', gives: { defense: 1 } },
  scaleBracers: { name: 'Scale Bracers', slot: 'bracers', quality: 'gray', set: 'scale', gives: { attack: 1 } },
  captainsSash: { name: 'Captain’s Sash', slot: 'belt', quality: 'gray', set: 'scale', gives: { morale: 1 } },
  scaleGreaves: { name: 'Scale Greaves', slot: 'greaves', quality: 'gray', set: 'scale', gives: { defense: 1 } },
  chariotSandals: { name: 'Chariot Sandals', slot: 'boots', quality: 'gray', set: 'scale', gives: { attack: 1 } },
  noviceSpellbook: { name: 'Novice’s Spellbook', slot: 'book', quality: 'gray', gives: { knowledge: 1 } },
  // Egypt's spellbook: the same grade as the Greeks' first.
  novicePapyrus: { name: 'Novice’s Papyrus', slot: 'book', quality: 'gray', gives: { knowledge: 1 } },
  oracleSpellbook: { name: 'Oracle’s Spellbook', slot: 'book', quality: 'green', gives: { knowledge: 1, power: 1 } },
  alexandrianCodex: { name: 'Alexandrian Codex', slot: 'book', quality: 'blue', gives: { knowledge: 2, power: 1 } },
  // Othrys's prize (part 4): forged by the Titans, kept by the Gigantes on the summit. The chapter's first Legendary piece.
  kronosHelm: { name: 'Helm of Kronos', slot: 'helm', quality: 'gold', gives: { attack: 2, defense: 3, morale: 1 } },
  catapult: { name: 'Catapult', slot: 'machine', quality: 'gray', gives: {}, machine: 'catapult' },
  catapult2: { name: 'Bronze Catapult', slot: 'machine', quality: 'green', gives: {}, machine: 'catapult2' },
  catapult3: { name: 'Syracusan Catapult', slot: 'machine', quality: 'blue', gives: {}, machine: 'catapult3' },
  // Egypt's war machine: an earthen ramp its workers raise against the wall (chapter 2, part 5).
  ramp: { name: 'Earth Ramp', slot: 'machine', quality: 'gray', gives: {}, machine: 'ramp' },
  ramp2: { name: 'Brick Ramp', slot: 'machine', quality: 'green', gives: {}, machine: 'ramp2' },
  ramp3: { name: 'Ramp of the Pyramid Builders', slot: 'machine', quality: 'blue', gives: {}, machine: 'ramp3' },
} as const satisfies Record<string, ItemDef>;

export type ItemId = keyof typeof ITEMS;
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export type Gear = Readonly<Partial<Record<Slot, ItemId>>>;

export const itemDef = (id: ItemId): ItemDef => ITEMS[id];

/** What the Blacksmith sells; finer machines are prizes. */
export const SOLD_MACHINES = ['catapult', 'catapult2', 'ramp', 'ramp2'] as const satisfies readonly ItemId[];
export type SoldMachine = (typeof SOLD_MACHINES)[number];

/** A piece's grade. */
export const itemQuality = (id: ItemId): Quality => itemDef(id).quality;

/** Whether `h` wears a spellbook: without one a hero has no magic at all. */
export const hasSpellbook = (h: Pick<Hero, 'gear'>): boolean => !!h.gear?.book;

/** A machine in words: "Breaks walls: 2 stones a round", "A ramp where you choose, ready on round 3". */
function machineSays(id: MachineId): string {
  const ramp = creature(id).ramp;
  if (ramp) return `A ramp up the wall where you choose, ready on round ${ramp.ready}${ramp.second ? `, and a second on round ${ramp.second}` : ''}`;
  const { throws, crit } = creature(id).stones!;
  return `Breaks walls: ${throws === 1 ? '1 stone' : `${throws} stones`} a round${crit > 0.5 ? ', hits harder' : ''}`;
}

/** What a piece gives, in words: "+1 Defense". */
export function itemSays(id: ItemId): string {
  const { machine, gives } = itemDef(id);
  return machine ? machineSays(machine) : (Object.entries(gives) as [GearStat, number][]).map(([s, n]) => `+${n} ${GEAR_STAT_NAMES[s]}`).join(', ');
}

/** The war machine `h` brings to a siege, if any. */
export function machineOf(h: Pick<Hero, 'gear'>): MachineId | undefined {
  const id = h.gear?.machine;
  return id ? itemDef(id).machine : undefined;
}

/** Whether `h` already has `id` or a finer piece for its slot. */
export function hasAsGood(h: Pick<Hero, 'gear' | 'bag'>, id: ItemId): boolean {
  const { slot, quality } = itemDef(id);
  const rank = (q: Quality): number => QUALITIES.indexOf(q);
  return [h.gear?.[slot], ...(h.bag ?? [])].some((x) => !!x && itemDef(x).slot === slot && rank(itemDef(x).quality) >= rank(quality));
}

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
  if (!bagRoom(h)) return { hero: h, worn: false, kept: false };
  return { hero: { ...h, bag: [...(h.bag ?? []), id] }, worn: false, kept: true };
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
  if (!id || !bagRoom(h)) return h;
  const { [slot]: _off, ...gear } = h.gear!;
  return { ...h, gear, bag: [...(h.bag ?? []), id] };
}
