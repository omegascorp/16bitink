import { LONG_WINTER_PARTS } from '../src/level/longWinter';
import { TWO_LANDS_PARTS } from '../src/level/twoLands';
import type { MapDef } from '../src/level/types';

/**
 * The full game's maps (chapter 2 onwards), in order. SERVER-ONLY: imported
 * by the website's content registry and served to verified owners. Never
 * import this, or the paid lands (src/level/twoLands.ts, nekhen.ts, longWinter.ts), from
 * the game's client code or they ship to everyone (test/twoLands.test.ts checks).
 */
export const INKHEROES_PAID_MAPS: readonly MapDef[] = [...TWO_LANDS_PARTS, ...LONG_WINTER_PARTS];
