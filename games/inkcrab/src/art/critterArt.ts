import type { SpeciesId } from '../logic/species';
import { antlion } from './critters/antlion';
import { arcticFox } from './critters/arcticFox';
import { beetle } from './critters/beetle';
import { blenny } from './critters/blenny';
import { blueCrab } from './critters/blueCrab';
import { bubbler } from './critters/bubbler';
import { darkling } from './critters/darkling';
import { dungeness } from './critters/dungeness';
import { fiddler } from './critters/fiddler';
import { ghostCrab } from './critters/ghostCrab';
import { gull } from './critters/gull';
import { heron, heronBody } from './critters/heron';
import { kelpCrab } from './critters/kelpCrab';
import { lavaLizard } from './critters/lavaLizard';
import { monitor } from './critters/monitor';
import { mudCrab } from './critters/mudCrab';
import { mudskipper } from './critters/mudskipper';
import { octopus } from './critters/octopus';
import { porcelainCrab } from './critters/porcelainCrab';
import { raccoon } from './critters/raccoon';
import { raven } from './critters/raven';
import { sallyCrab } from './critters/sallyCrab';
import { sculpin } from './critters/sculpin';
import { seaSpider } from './critters/seaSpider';
import { shoreCrab } from './critters/shoreCrab';
import { skink } from './critters/skink';
import { slater } from './critters/slater';
import { snowCrab } from './critters/snowCrab';
import { stoneCrab } from './critters/stoneCrab';
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
export const CRITTER_SPAN: Readonly<Record<SpeciesId, number>> = { ghostcrab: 70, slater: 72, beetle: 66, darkling: 64, antlion: 70, skink: 84, raven: 80, shorecrab: 66, blenny: 74, sculpin: 80, octopus: 72, gull: 80, fiddler: 60, mudskipper: 70, heron: 60, treecrab: 64, lavalizard: 84, sallycrab: 66, kelpcrab: 58, dungeness: 72, raccoon: 76, porcelaincrab: 64, stonecrab: 72, bluecrab: 84, hermit: 70, bubbler: 60, mudcrab: 76, monitor: 104, seaspider: 64, snowcrab: 84, arcticfox: 80 };

const DRAW: Readonly<Record<SpeciesId, (d: Draw) => void>> = {
  ghostcrab: ghostCrab, slater, beetle,
  darkling, antlion, skink, raven,
  shorecrab: shoreCrab, blenny, sculpin, octopus, gull,
  fiddler, mudskipper, heron, treecrab: treeCrab,
  lavalizard: lavaLizard, sallycrab: sallyCrab,
  kelpcrab: kelpCrab, dungeness, raccoon,
  // The rival hermit is drawn at runtime from the player crab's art and its shell; this is only a stand-in.
  porcelaincrab: porcelainCrab, stonecrab: stoneCrab, bluecrab: blueCrab, hermit: porcelainCrab,
  bubbler, mudcrab: mudCrab, monitor,
  seaspider: seaSpider, snowcrab: snowCrab, arcticfox: arcticFox,
};

export function drawCritter(d: Draw, species: SpeciesId = 'ghostcrab'): void {
  DRAW[species](d);
}

/** The heron mid-strike: its body alone, the neck, head and bill drawn in code from HERON_NECK. */
export function drawHeronStrike(d: Draw): void {
  heronBody(d);
}
