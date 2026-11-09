import { ABU, NEKHEN, RED_LAND } from '../src/level/twoLands';
import type { MapDef } from '../src/level/types';
import type { Adventure } from '../src/logic/adventure';
import { rideOn } from '../src/logic/chapter';
import { playPart, rideOnInto } from './partBot';

/**
 * Chapter 2 played up to a part, for the lord balance runs (as
 * othrysBalance.test.ts's riddenOn for chapter 1): the bot plays Nekhen and
 * Abu, as redLandBalance.test.ts does.
 */

/** Nekhen and Abu played by the bot, ridden on into the Red Land (or `def`). Null when Abu isn't won. */
export function redRiddenOn(seed: number, def: MapDef = RED_LAND): Adventure | null {
  const opts = { seed, edge: 1.6, bossEdge: 1.3, wise: true } as const;
  const nekhen = playPart(NEKHEN, opts);
  const abu = rideOnInto(nekhen, NEKHEN, ABU, { ...opts, goalFirst: true });
  return abu.won ? rideOn(abu.adv, ABU, def) : null;
}
