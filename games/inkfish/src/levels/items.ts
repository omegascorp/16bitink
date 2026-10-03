/**
 * Human-made things that sink from the surface to the seabed. Some give a
 * fish an edge, some are litter that hurts. New items arrive as you progress
 * (debut = the level number, 1..100, where an item first appears), and a level
 * never drops more than MAX_ITEMS_PER_LEVEL kinds.
 */
export type ItemId =
  | 'can' | 'chum' | 'bag' | 'battery' | 'tin' | 'rings' | 'duck' | 'firecracker' | 'lure' | 'bottle' | 'glowstick';

export interface ItemInfo {
  readonly name: string;
  /** Helps (true) or hurts (false) the fish that eats it. */
  readonly good: boolean;
  /** Level number (1-based, across the whole game) where it first falls. */
  readonly debut: number;
  /** Sinking speed in world units per second. */
  readonly sink: number;
  /** One line for the intro card the first time it appears. */
  readonly note: string;
  /** Only useful when it's dark (glow stick). */
  readonly darkOnly?: boolean;
}

export const ITEM_INFO: Readonly<Record<ItemId, ItemInfo>> = {
  can: { name: 'energy drink', good: true, debut: 1, sink: 70, note: 'A dented can of energy drink. A quick burst of speed.' },
  chum: { name: 'bag of chum', good: true, debut: 3, sink: 55, note: 'Fishing bait. It draws a school of small fish to you.' },
  bag: { name: 'plastic bag', good: false, debut: 5, sink: 18, note: 'Looks like a jellyfish. Eating it makes you sick and slow.' },
  battery: { name: 'battery', good: true, debut: 8, sink: 95, note: 'A leaking battery. It shocks fish nearby, and stunned fish can be eaten.' },
  tin: { name: 'tin can', good: true, debut: 12, sink: 80, note: 'Hide in it: it takes the next hit for you.' },
  rings: { name: 'six-pack rings', good: false, debut: 16, sink: 25, note: 'Plastic rings tangle you: slow, and no dash.' },
  duck: { name: 'rubber duck', good: true, debut: 22, sink: 30, note: 'A decoy. Hunters chase the duck instead of you.' },
  firecracker: { name: 'firecracker', good: true, debut: 27, sink: 90, note: 'A blast that knocks out fish around you. Anyone can eat them.' },
  lure: { name: 'spinner lure', good: false, debut: 35, sink: 60, note: 'Shiny, but it hides a hook. It costs a life.' },
  bottle: { name: 'message in a bottle', good: true, debut: 45, sink: 40, note: 'Someone’s treasure. Worth a lot of points.' },
  glowstick: { name: 'glow stick', good: true, debut: 69, sink: 50, note: 'Lights up more of the dark around you.', darkOnly: true },
};

export const ITEM_IDS = Object.keys(ITEM_INFO) as ItemId[];
/** A level drops at most two helpful kinds and one harmful kind. */
export const MAX_GOOD_ITEMS = 2;
export const MAX_BAD_ITEMS = 1;
export const MAX_ITEMS_PER_LEVEL = MAX_GOOD_ITEMS + MAX_BAD_ITEMS;

/**
 * Which items fall in level `number` (1-based across the game). Today's debut
 * always makes the cut; the rest rotate through what's been unlocked so far.
 * Once litter exists, every other level gets one harmful kind.
 */
export function itemsForLevel(number: number, dark: boolean): ItemId[] {
  const usable = ITEM_IDS.filter((id) => ITEM_INFO[id].debut <= number && (!ITEM_INFO[id].darkOnly || dark));
  const isDebut = (id: ItemId): boolean => ITEM_INFO[id].debut === number;
  const rotate = (list: readonly ItemId[]): ItemId[] => list.map((_, i) => list[(i + number) % list.length]!);
  const goods = usable.filter((id) => ITEM_INFO[id].good);
  const bads = usable.filter((id) => !ITEM_INFO[id].good);
  // A dark level with a glow stick unlocked always gets one: it's the point of it.
  const glow = goods.includes('glowstick') ? (['glowstick'] as const) : [];
  const good = [...new Set([...goods.filter(isDebut), ...glow, ...rotate(goods.filter((id) => !isDebut(id)))])].slice(0, MAX_GOOD_ITEMS);
  const badDebut = bads.filter(isDebut);
  const bad = badDebut.length ? badDebut : number % 2 === 0 ? rotate(bads) : [];
  return [...good, ...bad.slice(0, MAX_BAD_ITEMS)];
}
