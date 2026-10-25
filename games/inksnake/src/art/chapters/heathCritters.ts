import type { SpriteArt } from '../types';
import { BUZZARD_ART } from './heathBuzzard';
import { HERON_ART } from './heathHeron';
import { HEDGEHOG_ART } from './heathHedgehog';
import { COMMON_LIZARD_ART } from './heathCrittersLizard';
import { VOLE_ART, WOODMOUSE_ART } from './heathCrittersRodents';

/** The Heath's critters, by kind, once painted (the badger boss goes in heathBoss.ts; poses as listed in heath.ts). */
export const HEATH_CRITTERS: Readonly<Record<string, SpriteArt>> = {
  woodmouse: WOODMOUSE_ART, 'common-lizard': COMMON_LIZARD_ART, vole: VOLE_ART, buzzard: BUZZARD_ART, hedgehog: HEDGEHOG_ART, heron: HERON_ART,
};
