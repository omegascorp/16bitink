import type { BirdSpecies } from '../../logic/birds';
import { BRAHMINY_SPAN } from './brahminy';
import { HAWK_SPAN } from './hawk';
import { KINGFISHER_SPAN } from './kingfisher';
import { KESTREL_SPAN } from './kestrel';
import { OSPREY_SPAN } from './osprey';
import { SNOWY_OWL_SPAN } from './snowyOwl';

/** Frame units across each sky hunter's widest hovering drawing, for scaling it to its box. */
export const BIRD_SPAN: Readonly<Record<BirdSpecies, number>> = { kestrel: KESTREL_SPAN, hawk: HAWK_SPAN, kingfisher: KINGFISHER_SPAN, osprey: OSPREY_SPAN, brahminy: BRAHMINY_SPAN, snowyowl: SNOWY_OWL_SPAN };
