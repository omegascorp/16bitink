import type { SpriteArt } from '../types';
import { COYOTE_ART } from './dunesCrittersCoyote';
import { DUST_DEVIL_ART } from './dunesCrittersDevil';
import { SIDE_LIZARD_ART } from './dunesCrittersLizard';
import { POCKET_MOUSE_ART } from './dunesCrittersMouse';
import { KANGAROO_RAT_ART } from './dunesCrittersRat';

/** The Dunes' critters, by kind (poses as listed in dunes.ts; kinds not here yet are stand-ins there). */
export const DUNES_CRITTERS: Readonly<Record<string, SpriteArt>> = {
  'kangaroo-rat': KANGAROO_RAT_ART,
  'pocket-mouse': POCKET_MOUSE_ART,
  'side-lizard': SIDE_LIZARD_ART,
  coyote: COYOTE_ART,
  'dust-devil': DUST_DEVIL_ART,
};
