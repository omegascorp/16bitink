import { DEEP_GUIDE } from './deep';
import { OPEN_GUIDE } from './open';
import { OTHER_GUIDE } from './others';
import { SHALLOW_GUIDE } from './shallow';
import type { GuideEntry, GuideId } from './types';

/** Real-life fact cards for every creature in the game. */
export const GUIDE: Readonly<Record<GuideId, GuideEntry>> = { ...SHALLOW_GUIDE, ...OPEN_GUIDE, ...DEEP_GUIDE, ...OTHER_GUIDE };

export { guideArt, guideName, guidePages, guideProgress, type GuidePage, type GuideProgress } from './catalog';
export type { GuideEntry, GuideId } from './types';
