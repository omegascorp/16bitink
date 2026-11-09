import type { Adventure } from './adventure';
import { creature } from './creatures';
import { LAIR_MARK, lairOfGroup } from './loot';
import { LAIR_NAMES, type LairLook, type MapObject } from './objects';

/**
 * Lairs (docs/inkheroes-design.md, Loot): a den or a tomb that sends out
 * one new group of its creature on the first day of each week its last
 * group is gone, so there is always something to come back for without
 * the whole map refilling. The group stands at its door, a tile in front,
 * and grows with the weeks since the lair's part opened. A lair is never
 * taken or destroyed; either side fights its groups as any monster.
 */

/** Each week since its part opened adds this share of its base count to a new group. */
export const LAIR_GROWTH = 0.2;

const weekOf = (day: number): number => Math.floor((day - 1) / 7) + 1;

/** Where a lair's group stands: the tile in front of its door. */
export const lairDoor = (o: Pick<MapObject, 'x' | 'y'>): { x: number; y: number } => ({ x: o.x, y: o.y + 1 });

/** The id of the group lair `lairId` sends out in `week`: the lair's id and the week, so its drop is fixed by both. */
export const lairGroupId = (lairId: string, week: number): string => `${lairId}${LAIR_MARK}${week}`;

/** The week in a lair group's id, if it is one. */
export function groupWeek(id: string): number | undefined {
  if (!lairOfGroup(id)) return undefined;
  const week = Number(id.slice(id.lastIndexOf(LAIR_MARK) + LAIR_MARK.length));
  return Number.isInteger(week) && week >= 1 ? week : undefined;
}

/** How many come out of `lair` on `day`: its base count × (1 + 0.2 × the weeks since its part opened). */
export function lairGroupSize(lair: Pick<MapObject, 'count' | 'since'>, day: number): number {
  const weeks = Math.max(0, weekOf(day) - weekOf(lair.since ?? 1));
  return Math.max(1, Math.round((lair.count ?? 1) * (1 + LAIR_GROWTH * weeks)));
}

/** The lair's name on the map: "Den", "Tomb". */
export const lairName = (o: Pick<MapObject, 'look'>): string => LAIR_NAMES[(o.look as LairLook | undefined) === 'tomb' ? 'tomb' : 'den'];

/** A lair in words, for the status line and its card. */
export function lairWords(o: MapObject): string {
  return `${lairName(o)} of the ${creature(o.creature!).plural}: a new group comes out each week it has none`;
}

/** Whether lair `lair`'s last group still stands. */
const groupStands = (adv: Adventure, lair: MapObject): boolean =>
  lair.week !== undefined && adv.objects.some((o) => o.id === lairGroupId(lair.id, lair.week!) && o.kind === 'monster' && !o.gone);

/** Whether anyone stands at (x, y): a live object, or a hero of either side. */
function taken(adv: Adventure, x: number, y: number): boolean {
  const heroes = [adv.hero, ...(adv.others ?? []), ...(adv.rival?.hero ? [adv.rival.hero] : []), ...(adv.rival?.others ?? [])];
  return adv.objects.some((o) => !o.gone && o.x === x && o.y === y) || heroes.some((h) => h.x === x && h.y === y) || adv.towns.some((t) => t.x === x && t.y === y);
}

/**
 * Each lair whose group is gone (or never came) sends out a new one at
 * its door, unless one already came this week or someone stands there.
 * A lair seen for the first time counts its weeks from the part's first
 * day. Beaten groups of old weeks are cleared away.
 */
export function lairsOut(adv: Adventure): Adventure {
  const lairs = adv.objects.filter((o) => o.kind === 'lair' && !o.gone);
  if (!lairs.length) return adv;
  const week = weekOf(adv.day);
  let objects = adv.objects;
  for (const lair of lairs) {
    const since = lair.since ?? adv.begun ?? 1;
    const door = lairDoor(lair);
    const due = !groupStands({ ...adv, objects }, lair) && lair.week !== week && !taken({ ...adv, objects }, door.x, door.y);
    if (!due) {
      if (lair.since === undefined) objects = objects.map((o) => (o.id === lair.id ? { ...o, since } : o));
      continue;
    }
    const group: MapObject = { id: lairGroupId(lair.id, week), kind: 'monster', x: door.x, y: door.y, creature: lair.creature!, count: lairGroupSize({ ...lair, since }, adv.day) };
    // A beaten group of an old week is gone for good: drop it (a piece left lying on the ground stays, as an `item`).
    const old = (o: MapObject): boolean => o.gone === true && o.kind === 'monster' && lairOfGroup(o.id) === lair.id;
    objects = [...objects.filter((o) => !old(o)).map((o) => (o.id === lair.id ? { ...o, since, week } : o)), group];
  }
  return objects === adv.objects ? adv : { ...adv, objects };
}
