import type { SpriteArt } from '../types';
import { AGAMA_ART } from './mountainsCrittersAgama';
import { SNAKE_EAGLE_ART } from './mountainsCrittersEagle';
import { ROCKFALL_ART } from './mountainsCrittersRockfall';
import { FINCH_ART, LARK_ART, SHRIKE_ART, WARBLER_ART } from './mountainsCrittersBirds';

/** The Mountains' critters, by kind, once painted (the boar is in mountainsBoss.ts; poses as listed in mountains.ts). */
export const MOUNTAINS_CRITTERS: Readonly<Record<string, SpriteArt>> = {
  lark: LARK_ART,
  warbler: WARBLER_ART,
  'desert-finch': FINCH_ART,
  shrike: SHRIKE_ART,
  agama: AGAMA_ART,
  'snake-eagle': SNAKE_EAGLE_ART,
  rockfall: ROCKFALL_ART,
};
