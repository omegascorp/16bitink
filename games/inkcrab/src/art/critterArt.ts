import type { SpeciesId } from '../logic/species';
import { antlion } from './critters/antlion';
import { beetle } from './critters/beetle';
import { darkling } from './critters/darkling';
import { ghostCrab } from './critters/ghostCrab';
import { raven } from './critters/raven';
import { skink } from './critters/skink';
import { slater } from './critters/slater';
import type { Draw } from './kit';

/**
 * The beach's other creatures, side-on and facing right. Ink colour carries
 * the meaning (red when it can eat you), so the washes stay the same.
 */
export const CRITTER_FRAME = 128;
export const CRITTER_GROUND = 34;
/** Texture px per frame unit. */
export const CRITTER_RES = 1.5;
/** Frame units across each kind's body, for scaling the drawing to its box. */
export const CRITTER_SPAN: Readonly<Record<SpeciesId, number>> = { ghostcrab: 70, slater: 72, beetle: 66, darkling: 64, antlion: 70, skink: 84, raven: 80 };

const DRAW: Readonly<Record<SpeciesId, (d: Draw) => void>> = {
  ghostcrab: ghostCrab, slater, beetle,
  darkling, antlion, skink, raven,
};

export function drawCritter(d: Draw, species: SpeciesId = 'ghostcrab'): void {
  DRAW[species](d);
}
