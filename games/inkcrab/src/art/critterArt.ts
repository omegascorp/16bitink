import type { SpeciesId } from '../logic/species';
import { beetle } from './critters/beetle';
import { ghostCrab } from './critters/ghostCrab';
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
export const CRITTER_SPAN: Readonly<Record<SpeciesId, number>> = { ghostcrab: 70, slater: 72, beetle: 66 };

const DRAW: Readonly<Record<SpeciesId, (d: Draw) => void>> = { ghostcrab: ghostCrab, slater, beetle };

export function drawCritter(d: Draw, species: SpeciesId = 'ghostcrab'): void {
  DRAW[species](d);
}
