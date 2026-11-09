import { itemLine, type Adventure, type Prompt } from './adventure';
import type { Hero } from './hero';
import { gainItem, itemDef, type ItemId } from './items';
import type { MapObject } from './objects';

/**
 * Gear lying on the ground (a drop a full bag had no room for, a chest's
 * piece, the beaten rival's spoils) never blocks a way: a hero, ours or the
 * rival's, rides over its tile as over open ground. Passing over it or
 * stopping on it picks it up when there is room (a free slot it fits, else
 * the bag); otherwise it stays where it lies and the hero is told so, once
 * for that pass. A piece is never lost, and a one-tile ford is never shut.
 */

/** Whether `o` is a piece lying on the ground. */
export const isLying = (o: Pick<MapObject, 'kind'>): boolean => o.kind === 'item';

/** Whether `h` could take piece `id` now: worn in a free slot it fits, or in the bag. */
export const roomFor = (h: Hero, id: ItemId): boolean => gainItem(h, id).kept;

/** What a hero with no room is told, riding over piece `id`. */
export const noRoomWords = (id: ItemId): string => `No room in the bag for the ${itemDef(id).name}`;

export interface Passed {
  readonly hero: Hero;
  readonly objects: readonly MapObject[];
  /** Picked up (gone from the map); false: it still lies there. */
  readonly taken: boolean;
  /** Picked up and put on at once. */
  readonly worn: boolean;
}

/** Hero `h` over lying piece `o`: taken when there is room, else left where it lies. */
export function passOver(h: Hero, objects: readonly MapObject[], o: MapObject): Passed {
  const got = gainItem(h, o.item!);
  if (!got.kept) return { hero: h, objects, taken: false, worn: false };
  return { hero: got.hero, objects: objects.map((x) => (x.id === o.id ? { ...x, gone: true } : x)), taken: true, worn: got.worn };
}

/** Our picked hero, just on lying piece `o`'s tile: taken (a card says how, after the ride), or left with a note. */
export function pickUpInPassing(adv: Adventure, o: MapObject): { adv: Adventure; notes: string[] } {
  const id = o.item!;
  const p = passOver(adv.hero, adv.objects, o);
  if (!p.taken) return { adv, notes: [noRoomWords(id)] };
  const end = p.worn ? `${adv.hero.name} puts it on.` : 'It goes in the bag.';
  const card: Prompt = { kind: 'message', title: itemDef(id).name, text: `${itemLine(id)}\n${end}`, item: id };
  return { adv: { ...adv, hero: p.hero, objects: [...p.objects], prompts: [...adv.prompts, card] }, notes: [`+${itemDef(id).name}`] };
}
