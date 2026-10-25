import type { SpriteArt } from '../types';
import { GUINEA_EGG_ART, WEAVER_EGG_ART } from './savannaCrittersEggs';
import { MONGOOSE_ART } from './savannaCrittersMongoose';
import { WEAVER_ART } from './savannaCrittersWeaver';
import { WILDEBEEST_ART } from './savannaCrittersWildebeest';

/** The Savanna's critters painted so far, by kind (the Secretary Bird is in savannaBoss.ts; poses as listed in savanna.ts). */
export const SAVANNA_CRITTERS: Readonly<Record<string, SpriteArt>> = {
  'weaver-egg': WEAVER_EGG_ART,
  'guinea-egg': GUINEA_EGG_ART,
  'banded-mongoose': MONGOOSE_ART,
  weaver: WEAVER_ART,
  wildebeest: WILDEBEEST_ART,
};
