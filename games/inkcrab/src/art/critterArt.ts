import type { SpeciesId } from '../logic/species';
import { antlion } from './critters/antlion';
import { beetle } from './critters/beetle';
import { blenny } from './critters/blenny';
import { darkling } from './critters/darkling';
import { fiddler } from './critters/fiddler';
import { ghostCrab } from './critters/ghostCrab';
import { gull } from './critters/gull';
import { heron, heronBody } from './critters/heron';
import { lavaLizard } from './critters/lavaLizard';
import { mudskipper } from './critters/mudskipper';
import { octopus } from './critters/octopus';
import { raven } from './critters/raven';
import { sallyCrab } from './critters/sallyCrab';
import { sculpin } from './critters/sculpin';
import { shoreCrab } from './critters/shoreCrab';
import { skink } from './critters/skink';
import { slater } from './critters/slater';
import { treeCrab } from './critters/treeCrab';
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
export const CRITTER_SPAN: Readonly<Record<SpeciesId, number>> = { ghostcrab: 70, slater: 72, beetle: 66, darkling: 64, antlion: 70, skink: 84, raven: 80, shorecrab: 66, blenny: 74, sculpin: 80, octopus: 72, gull: 80, fiddler: 60, mudskipper: 70, heron: 60, treecrab: 64, lavalizard: 84, sallycrab: 66 };

const DRAW: Readonly<Record<SpeciesId, (d: Draw) => void>> = {
  ghostcrab: ghostCrab, slater, beetle,
  darkling, antlion, skink, raven,
  shorecrab: shoreCrab, blenny, sculpin, octopus, gull,
  fiddler, mudskipper, heron, treecrab: treeCrab,
  lavalizard: lavaLizard, sallycrab: sallyCrab,
};

export function drawCritter(d: Draw, species: SpeciesId = 'ghostcrab'): void {
  DRAW[species](d);
}

/** The heron mid-strike: its body alone, the neck, head and bill drawn in code from HERON_NECK. */
export function drawHeronStrike(d: Draw): void {
  heronBody(d);
}
