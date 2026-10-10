import type { BirdSpecies } from '../../logic/birds';
import { HAWK_SPAN } from './hawk';
import { KESTREL_SPAN } from './kestrel';

/** Frame units across each sky hunter's widest hovering drawing, for scaling it to its box. */
export const BIRD_SPAN: Readonly<Record<BirdSpecies, number>> = { kestrel: KESTREL_SPAN, hawk: HAWK_SPAN };
