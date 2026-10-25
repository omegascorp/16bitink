import type { SpriteArt } from '../types';
import { BAT_ART } from './rainforestCrittersBat';
import { FLYING_FROG_ART } from './rainforestCrittersFrog';
import { FLYING_GECKO_ART } from './rainforestCrittersGecko';
import { HORNBILL_ART } from './rainforestCrittersHornbill';
import { MONITOR_ART } from './rainforestCrittersMonitor';
import { TOKAY_ART } from './rainforestCrittersTokay';

/** The Rainforest's critters, by kind (the eagle boss is in rainforestBoss.ts; poses as listed in rainforest.ts; kinds not here yet still have stand-ins there). */
export const RAINFOREST_CRITTERS: Readonly<Record<string, SpriteArt>> = { gecko: FLYING_GECKO_ART, treefrog: FLYING_FROG_ART, tokay: TOKAY_ART, bat: BAT_ART, monitor: MONITOR_ART, hornbill: HORNBILL_ART };
