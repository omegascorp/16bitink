import type { SpeciesId } from '../logic/species';
import { antlion } from './critters/antlion';
import { beetle } from './critters/beetle';
import { blenny } from './critters/blenny';
import { darkling } from './critters/darkling';
import { ghostCrab } from './critters/ghostCrab';
import { gull } from './critters/gull';
import { octopus } from './critters/octopus';
import { raven } from './critters/raven';
import { sculpin } from './critters/sculpin';
import { shoreCrab } from './critters/shoreCrab';
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
export const CRITTER_SPAN: Readonly<Record<SpeciesId, number>> = { ghostcrab: 70, slater: 72, beetle: 66, darkling: 64, antlion: 70, skink: 84, raven: 80, shorecrab: 66, blenny: 74, sculpin: 80, octopus: 72, gull: 80 };

const DRAW: Readonly<Record<SpeciesId, (d: Draw) => void>> = {
  ghostcrab: ghostCrab, slater, beetle,
  darkling, antlion, skink, raven,
  shorecrab: shoreCrab, blenny, sculpin, octopus, gull,
};

export function drawCritter(d: Draw, species: SpeciesId = 'ghostcrab'): void {
  DRAW[species](d);
}
