import type { SpriteArt } from '../types';
import { HONEY_BADGER_ART } from './jungleCrittersBadger';
import { JUNGLE_COILS } from './jungleCrittersCoil';
import { BULLFROG_ART } from './jungleCrittersFrog';
import { BANDICOOT_ART } from './jungleCrittersRat';
import { SKINK_ART } from './jungleCrittersSkink';

/** The Jungle's critters, by kind, as painted (poses as listed in jungle.ts; the mongoose boss is in jungleBoss.ts). */
export const JUNGLE_CRITTERS: Readonly<Record<string, SpriteArt>> = { ...JUNGLE_COILS, bullfrog: BULLFROG_ART, bandicoot: BANDICOOT_ART, skink: SKINK_ART, 'honey-badger': HONEY_BADGER_ART };
