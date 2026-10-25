import type { SpriteArt } from '../types';
import { WILDFIRE_ART } from './barrensCrittersFire';
import { LIZARD_ART } from './barrensCrittersLizard';
import { OPOSSUM_ART } from './barrensCrittersOpossum';
import { RACCOON_ART } from './barrensCrittersRaccoon';
import { TOAD_ART } from './barrensCrittersToad';

/** The Pine Barrens' critters, by kind (the fox boss is in barrensFoxArt.ts; poses as listed in barrens.ts). */
export const BARRENS_CRITTERS: Readonly<Record<string, SpriteArt>> = { toad: TOAD_ART, lizard: LIZARD_ART, raccoon: RACCOON_ART, opossum: OPOSSUM_ART, wildfire: WILDFIRE_ART };
