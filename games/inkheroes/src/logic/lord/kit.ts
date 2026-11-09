import type { MapDef } from '../../level/types';
import { dailyMp, PRIMARIES, type Hero } from '../hero';
import { withGear, type Gear } from '../items';

/**
 * Lords wear gear at no cost to their balance (docs/inkheroes-design.md,
 * Loot): what a lord's hero starts wearing comes from his map's
 * `rival.kit` (by hero id), and his four stats are lowered by what it adds,
 * so withGear gives the numbers the map was tuned with. Only the four stats
 * can be paid back this way: morale, luck, sight, travel, speed and gold
 * from a kit are a real gain. Beaten, the gear is ours and he is rehired
 * without it, weaker.
 */

/** What lord hero `heroId` starts wearing on `def`, if the map gives him anything. */
export const kitOf = (def: Pick<MapDef, 'rival'>, heroId: string): Gear | undefined => def.rival?.kit?.[heroId];

/** How much `kit` raises each of `h`'s four stats, on top of what they wear already (set bonuses included). */
export function kitGain(h: Hero, kit: Gear): Readonly<Record<(typeof PRIMARIES)[number], number>> {
  const before = withGear(h);
  const after = withGear({ ...h, gear: { ...h.gear, ...kit } });
  return { attack: after.attack - before.attack, defense: after.defense - before.defense, power: after.power - before.power, knowledge: after.knowledge - before.knowledge };
}

/** `h` wearing `kit` too, their four stats lowered by what it adds (never below 0), and rested for it. */
export function kitted(h: Hero, kit: Gear | undefined): Hero {
  if (!kit || !Object.keys(kit).length) return h;
  const gain = kitGain(h, kit);
  const low = (k: (typeof PRIMARIES)[number]): number => Math.max(0, h[k] - gain[k]);
  const worn: Hero = { ...h, gear: { ...h.gear, ...kit }, attack: low('attack'), defense: low('defense'), power: low('power'), knowledge: low('knowledge') };
  return { ...worn, mp: dailyMp(worn) };
}
