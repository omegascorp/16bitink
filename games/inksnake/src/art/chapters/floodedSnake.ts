import { stripLength, type SnakeArt } from '../types';
import { HOG_TONGUE } from './barrensSnakeHead';
import { ANA_SNOUT, anacondaHead } from './floodedSnakeHead';
import { ANA_PERIOD, ANACONDA_TONE, type AnacondaTone } from './floodedSnakePaint';
import { drawAnaStrip } from './floodedSnakeStrip';

/**
 * An anaconda painted in tone `t` (the player's green anaconda, or the
 * bigger, older female rival): its back strip, head poses and tongue (the
 * slate-black forked tongue, as the hognose's).
 */
export function anacondaArt(t: AnacondaTone): SnakeArt {
  return {
    period: ANA_PERIOD,
    drawStrip: (d, length) => drawAnaStrip(d, Math.min(length, stripLength(ANA_PERIOD)), t),
    head: anacondaHead(t),
    tongue: HOG_TONGUE,
    snout: ANA_SNOUT,
    colours: { base: t.ground, mark: t.spot, belly: t.belly },
  };
}

/**
 * The green anaconda (Eunectes murinus, chapter 10), seen from above: thick
 * and olive-green, big black oval spots down the back, black-ringed ochre
 * spots along the sides, the eyes and nostrils on top of the head and an
 * orange stripe edged in black behind each eye.
 */
export const ANACONDA_ART: SnakeArt | undefined = anacondaArt(ANACONDA_TONE);
