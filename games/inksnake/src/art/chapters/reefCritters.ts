import type { SpriteArt } from '../types';
import { CONGER_ART } from './reefCrittersConger';
import { EAGLE_ART } from './reefCrittersEagle';
import { GOBY_ART } from './reefCrittersGoby';
import { JELLY_ART } from './reefCrittersJelly';
import { MORAY_ART } from './reefCrittersMoray';

/** The reef's painted critters, by kind (poses as listed in reef.ts; the shark boss is in reefBoss.ts). */
export const REEF_CRITTERS: Readonly<Record<string, SpriteArt>> = { goby: GOBY_ART, conger: CONGER_ART, moray: MORAY_ART, jelly: JELLY_ART, 'sea-eagle': EAGLE_ART };
