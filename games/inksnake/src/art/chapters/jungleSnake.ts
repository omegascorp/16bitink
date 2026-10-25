import type { Draw } from '../kit';
import { stripLength, type SnakeArt } from '../types';
import { COBRA_PAINT, COBRA_PERIOD, paintCobraTile } from './jungleSnakeCobra';
import { COBRA_HEAD, COBRA_SNOUT, COBRA_TONGUE } from './jungleSnakeCobraHead';
import { layTile } from './jungleSnakePaint';

/**
 * The king cobra (Ophiophagus hannah, chapter 9), seen from above: a long,
 * glossy olive-brown body crossed by thin pale chevron bands
 * (jungleSnakeCobra.ts), a big head with large shields, two big occipitals
 * behind the parietals (jungleSnakeCobraHead.ts). Its hood, spread as it
 * rears, is jungleHood.ts (drawn by jungleView.ts).
 */
function drawStrip(d: Draw, length: number): void {
  layTile(d.pen.ctx, COBRA_PERIOD, length, (tile) => paintCobraTile(tile, d.ink, d.f));
}

export const COBRA_ART: SnakeArt | undefined = {
  period: COBRA_PERIOD,
  drawStrip: (d, length) => drawStrip(d, Math.min(length, stripLength(COBRA_PERIOD))),
  head: COBRA_HEAD,
  tongue: COBRA_TONGUE,
  snout: COBRA_SNOUT,
  colours: { base: COBRA_PAINT.ground, mark: COBRA_PAINT.band, belly: COBRA_PAINT.belly },
};
