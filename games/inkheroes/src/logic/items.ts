import { creature, type MachineId } from './creatures';
import type { Hero } from './hero';
import { CROWN_ITEMS, CROWN_SETS } from './itemCatalog/crown';
import { KEMET_ITEMS, KEMET_SETS } from './itemCatalog/kemet';

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
/** `speed`: +n speed to every company in battle; `gold`: n gold a day. */
export type GearStat = 'attack' | 'defense' | 'power' | 'knowledge' | 'morale' | 'luck' | 'sight' | 'travel' | 'speed' | 'gold';

export const GEAR_STAT_NAMES: Readonly<Record<GearStat, string>> = {
  attack: 'Attack', defense: 'Defense', power: 'Spell Power', knowledge: 'Knowledge', morale: 'Morale', luck: 'Luck', sight: 'Sight', travel: 'tile a day', speed: 'Speed to every company', gold: 'gold a day',
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
  /** The faction whose random drops it is found in (`src/logic/itemCatalog/`); hand-placed pieces leave it out. */
  readonly faction?: 'crown' | 'kemet';
}

/** A set of six armor pieces, one per armor slot, all of one grade (`src/logic/itemCatalog/`). */
export interface SetDef {
  readonly id: string;
  readonly name: string;
  readonly quality: Quality;
  readonly faction: 'crown' | 'kemet';
  /** Who it suits: the fighter (Attack, Defense, Morale) or the mystic (Spell Power, Knowledge, Luck). */
  readonly role: 'fighter' | 'mystic';
  /** What wearing 2, 4 and 6 of its pieces adds (each on top of the last); gray sets give none. */
  readonly bonus?: Readonly<Partial<Record<2 | 4 | 6, Readonly<Partial<Record<GearStat, number>>>>>>;
}

/** The random-drop sets, every faction's. */
export const CATALOG_SETS: readonly SetDef[] = [...CROWN_SETS, ...KEMET_SETS];

/** The gray sets' names, for a catalog without their SetDefs. */
const GRAY_SET_NAMES: Readonly<Record<string, string>> = { bronze: 'Bronze set', linen: 'Linen set', faience: 'Faience set', scale: 'Scale set' };
const setWords = (name: string): string => (/\bset$/i.test(name) ? name : `${name} set`);
/** Every set's name ("Bronze set"): the catalog's, and the gray ones'. */
export const SET_NAMES: Readonly<Record<string, string>> = { ...GRAY_SET_NAMES, ...Object.fromEntries(CATALOG_SETS.map((s) => [s.id, setWords(s.name)])) };
/** Set `id`'s definition, if the catalog has one. */
export const setDef = (id: string): SetDef | undefined => CATALOG_SETS.find((s) => s.id === id);
/** How many pieces wear a set bonus, smallest first. */
export const SET_TIERS = [2, 4, 6] as const;

/** Every piece. Numbers in docs/inkheroes-design.md. */
export const ITEMS = {
  ...CROWN_ITEMS,
  ...KEMET_ITEMS,
  bronzeHelm: { name: 'Bronze Helm', slot: 'helm', quality: 'gray', set: 'bronze', faction: 'crown', gives: { defense: 1 } },
  bronzeCuirass: { name: 'Bronze Cuirass', slot: 'cuirass', quality: 'gray', set: 'bronze', faction: 'crown', gives: { defense: 1 } },
  bronzeBracers: { name: 'Bronze Bracers', slot: 'bracers', quality: 'gray', set: 'bronze', faction: 'crown', gives: { attack: 1 } },
  warBelt: { name: 'War Belt', slot: 'belt', quality: 'gray', set: 'bronze', faction: 'crown', gives: { morale: 1 } },
  bronzeGreaves: { name: 'Bronze Greaves', slot: 'greaves', quality: 'gray', set: 'bronze', faction: 'crown', gives: { defense: 1 } },
  warSandals: { name: 'War Sandals', slot: 'boots', quality: 'gray', set: 'bronze', faction: 'crown', gives: { attack: 1 } },
  linenHood: { name: 'Linen Hood', slot: 'helm', quality: 'gray', set: 'linen', faction: 'crown', gives: { knowledge: 1 } },
  linenChiton: { name: 'Linen Chiton', slot: 'cuirass', quality: 'gray', set: 'linen', faction: 'crown', gives: { power: 1 } },
  linenArmbands: { name: 'Linen Armbands', slot: 'bracers', quality: 'gray', set: 'linen', faction: 'crown', gives: { power: 1 } },
  cordSash: { name: 'Cord Sash', slot: 'belt', quality: 'gray', set: 'linen', faction: 'crown', gives: { luck: 1 } },
  linenLeggings: { name: 'Linen Leggings', slot: 'greaves', quality: 'gray', set: 'linen', faction: 'crown', gives: { knowledge: 1 } },
  templeSandals: { name: 'Temple Sandals', slot: 'boots', quality: 'gray', set: 'linen', faction: 'crown', gives: { knowledge: 1 } },
  // Egypt's mystic set (chapter 2, part 4): Neferet's, as the Linen set is Ianthe's.
  faienceDiadem: { name: 'Faience Diadem', slot: 'helm', quality: 'gray', set: 'faience', faction: 'kemet', gives: { knowledge: 1 } },
  faienceCollar: { name: 'Faience Collar', slot: 'cuirass', quality: 'gray', set: 'faience', faction: 'kemet', gives: { power: 1 } },
  faienceBangles: { name: 'Faience Bangles', slot: 'bracers', quality: 'gray', set: 'faience', faction: 'kemet', gives: { power: 1 } },
  scarabGirdle: { name: 'Scarab Girdle', slot: 'belt', quality: 'gray', set: 'faience', faction: 'kemet', gives: { luck: 1 } },
  faienceAnklets: { name: 'Faience Anklets', slot: 'greaves', quality: 'gray', set: 'faience', faction: 'kemet', gives: { knowledge: 1 } },
  reedSandals: { name: 'Reed Sandals', slot: 'boots', quality: 'gray', set: 'faience', faction: 'kemet', gives: { knowledge: 1 } },
  // Egypt's fighter's set (Abu): Paser's, as the Bronze set is Rowan's.
  scaleHelm: { name: 'Scale Helm', slot: 'helm', quality: 'gray', set: 'scale', faction: 'kemet', gives: { defense: 1 } },
  scaleCoat: { name: 'Scale Coat', slot: 'cuirass', quality: 'gray', set: 'scale', faction: 'kemet', gives: { defense: 1 } },
  scaleBracers: { name: 'Scale Bracers', slot: 'bracers', quality: 'gray', set: 'scale', faction: 'kemet', gives: { attack: 1 } },
  captainsSash: { name: 'Captain’s Sash', slot: 'belt', quality: 'gray', set: 'scale', faction: 'kemet', gives: { morale: 1 } },
  scaleGreaves: { name: 'Scale Greaves', slot: 'greaves', quality: 'gray', set: 'scale', faction: 'kemet', gives: { defense: 1 } },
  chariotSandals: { name: 'Chariot Sandals', slot: 'boots', quality: 'gray', set: 'scale', faction: 'kemet', gives: { attack: 1 } },
  noviceSpellbook: { name: 'Novice’s Spellbook', slot: 'book', quality: 'gray', gives: { knowledge: 1 } },
  // Egypt's spellbook: the same grade as the Greeks' first.
  novicePapyrus: { name: 'Novice’s Papyrus', slot: 'book', quality: 'gray', gives: { knowledge: 1 } },
  // The Norse spellbook: a staff the runes are cut on (chapter 3, part 2).
  noviceRuneStaff: { name: 'Novice’s Rune Staff', slot: 'book', quality: 'gray', gives: { knowledge: 1 } },
  oracleSpellbook: { name: 'Oracle’s Spellbook', slot: 'book', quality: 'green', gives: { knowledge: 1, power: 1 } },
  alexandrianCodex: { name: 'Alexandrian Codex', slot: 'book', quality: 'blue', gives: { knowledge: 2, power: 1 } },
  // Othrys's prize (part 4): forged by the Titans, kept by the Gigantes on the summit. The chapter's first Legendary piece.
  kronosHelm: { name: 'Helm of Kronos', slot: 'helm', quality: 'gold', gives: { attack: 2, defense: 3, morale: 1 } },
  // The Delta's prize (chapter 2's part 4): the pharaohs' own crook and flail, kept by Ammit at the House of the Benben. Chapter 2's Legendary piece.
  crookAndFlail: { name: 'Crook and Flail', slot: 'weapon', quality: 'gold', gives: { attack: 3, defense: 2, morale: 1 } },
  catapult: { name: 'Catapult', slot: 'machine', quality: 'gray', gives: {}, machine: 'catapult' },
  catapult2: { name: 'Bronze Catapult', slot: 'machine', quality: 'green', gives: {}, machine: 'catapult2' },
  catapult3: { name: 'Syracusan Catapult', slot: 'machine', quality: 'blue', gives: {}, machine: 'catapult3' },
  // Egypt's war machine: an earthen ramp its workers raise against the wall (chapter 2, from Abu).
  ramp: { name: 'Earth Ramp', slot: 'machine', quality: 'gray', gives: {}, machine: 'ramp' },
  ramp2: { name: 'Brick Ramp', slot: 'machine', quality: 'green', gives: {}, machine: 'ramp2' },
  ramp3: { name: 'Ramp of the Pyramid Builders', slot: 'machine', quality: 'blue', gives: {}, machine: 'ramp3' },
  // The Norse war machine: a battering ram that breaks the gate (chapter 3, from part 3).
  ram: { name: 'Ram', slot: 'machine', quality: 'gray', gives: {}, machine: 'ram' },
  ram2: { name: 'Iron Ram', slot: 'machine', quality: 'green', gives: {}, machine: 'ram2' },
  ram3: { name: 'Ram of the Sea-Kings', slot: 'machine', quality: 'blue', gives: {}, machine: 'ram3' },
} as const satisfies Record<string, ItemDef>;

export type ItemId = keyof typeof ITEMS;
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export type Gear = Readonly<Partial<Record<Slot, ItemId>>>;

export const itemDef = (id: ItemId): ItemDef => ITEMS[id];

/** What the Blacksmith sells; finer machines are prizes. */
export const SOLD_MACHINES = ['catapult', 'catapult2', 'ramp', 'ramp2', 'ram', 'ram2'] as const satisfies readonly ItemId[];
export type SoldMachine = (typeof SOLD_MACHINES)[number];

/** A piece's grade. */
export const itemQuality = (id: ItemId): Quality => itemDef(id).quality;

/** Whether `h` wears a spellbook: without one a hero has no magic at all. */
export const hasSpellbook = (h: Pick<Hero, 'gear'>): boolean => !!h.gear?.book;

/** A machine in words: "Breaks walls: 2 stones a round", "A ramp where you choose, ready on round 3". */
function machineSays(id: MachineId): string {
  const ram = creature(id).ram;
  if (ram) return `Breaks the gate at the end of round ${ram.round}${ram.towers ? ', and cracks the wall beside it' : ''}`;
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

/** The slots piece `id` can be worn in: a ring on either hand, anything else its own. */
export const slotsFor = (id: ItemId): readonly Slot[] => {
  const { slot } = itemDef(id);
  return slot === 'ring1' || slot === 'ring2' ? ['ring1', 'ring2'] : [slot];
};
/** Whether piece `id` can be worn in `slot`. */
export const fitsSlot = (id: ItemId, slot: Slot): boolean => slotsFor(id).includes(slot);
/** The first slot `h` could put `id` on in without taking anything off, if any. */
export const freeSlotFor = (h: Pick<Hero, 'gear'>, id: ItemId): Slot | undefined => slotsFor(id).find((s) => !h.gear?.[s]);

/** Whether `h` already has `id` or a finer piece for its slot (either hand, for a ring). */
export function hasAsGood(h: Pick<Hero, 'gear' | 'bag'>, id: ItemId): boolean {
  const { slot, quality } = itemDef(id);
  const rank = (q: Quality): number => QUALITIES.indexOf(q);
  return [...slotsFor(id).map((s) => h.gear?.[s]), ...(h.bag ?? [])].some((x) => !!x && fitsSlot(x, slot) && rank(itemDef(x).quality) >= rank(quality));
}

/** How many pieces of each set `h` wears. */
export function setsWorn(h: Pick<Hero, 'gear'>): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const id of Object.values(h.gear ?? {})) {
    const { set } = itemDef(id);
    if (set) out[set] = (out[set] ?? 0) + 1;
  }
  return out;
}

const addStats = (into: Partial<Record<GearStat, number>>, gives: Readonly<Partial<Record<GearStat, number>>>): void => {
  for (const [s, n] of Object.entries(gives) as [GearStat, number][]) into[s] = (into[s] ?? 0) + n;
};

/** What everything `h` wears adds up to: each piece, and each set's bonus at 2, 4 and 6 pieces worn (a set the catalog has no SetDef for gives none). */
export function gearBonus(h: Pick<Hero, 'gear'>): Partial<Record<GearStat, number>> {
  const out: Partial<Record<GearStat, number>> = {};
  for (const id of Object.values(h.gear ?? {})) addStats(out, itemDef(id).gives);
  for (const [set, worn] of Object.entries(setsWorn(h))) {
    const bonus = setDef(set)?.bonus;
    for (const tier of SET_TIERS) if (bonus?.[tier] && worn >= tier) addStats(out, bonus[tier]);
  }
  return out;
}

/** Gold a day the side's heroes' gear brings. */
export const gearGold = (heroes: readonly Pick<Hero, 'gear'>[]): number => heroes.reduce((n, h) => n + (gearBonus(h).gold ?? 0), 0);

/** `h` with the four stats raised by what they wear. */
export function withGear<H extends Pick<Hero, 'gear' | 'attack' | 'defense' | 'power' | 'knowledge'>>(h: H): H {
  const b = gearBonus(h);
  return { ...h, attack: h.attack + (b.attack ?? 0), defense: h.defense + (b.defense ?? 0), power: h.power + (b.power ?? 0), knowledge: h.knowledge + (b.knowledge ?? 0) };
}

/** A new piece: worn at once in an empty slot (a ring on either hand), else into the bag, else (the bag full) left behind. */
export function gainItem(h: Hero, id: ItemId): { hero: Hero; worn: boolean; kept: boolean } {
  const slot = freeSlotFor(h, id);
  if (slot) return { hero: { ...h, gear: { ...h.gear, [slot]: id } }, worn: true, kept: true };
  if (!bagRoom(h)) return { hero: h, worn: false, kept: false };
  return { hero: { ...h, bag: [...(h.bag ?? []), id] }, worn: false, kept: true };
}

/** The bag's piece `i` put on (in `on`, else an empty slot it fits, else its own); what was in that slot goes to the bag. */
export function wear(h: Hero, i: number, on?: Slot): Hero {
  const id = h.bag?.[i];
  if (!id || (on && !fitsSlot(id, on))) return h;
  const slot = on ?? freeSlotFor(h, id) ?? slotsFor(id)[0]!;
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
