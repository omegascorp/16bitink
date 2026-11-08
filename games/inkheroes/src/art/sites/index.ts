import { RESOURCES } from '../../logic/resources';
import { drawFlag, drawResourceIcon } from './icons';
import { MINES_A } from './mines';
import { MINES_B } from './mines2';
import { PILES } from './piles';
import { PLACES_A } from './places';
import { PLACES_B } from './places2';
import { drawTown } from './town';
import type { SiteArt, SiteDrawer } from './types';

/**
 * Every map site's drawing (see types.ts for the contract): the Crown's
 * town, the seven mines, the seven resource piles, and the treasure and
 * visitable places, painted as ink and wash in the map's 3/4 view.
 */
const ALL: SiteArt[] = ['town', ...RESOURCES.map((r) => `mine-${r}` as const), ...RESOURCES.map((r) => `pile-${r}` as const), 'chest', 'campfire', 'mercCamp', 'watchtower', 'standingStone', 'shrine', 'windmill', 'stables'];

export const SITE_ART: Readonly<Record<SiteArt, SiteDrawer>> = { town: drawTown, ...MINES_A, ...MINES_B, ...PILES, ...PLACES_A, ...PLACES_B };
export const SITE_ARTS = ALL;

export { drawFlag, drawResourceIcon };
