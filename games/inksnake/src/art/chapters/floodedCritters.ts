import type { SpriteArt } from '../types';
import { BLACK_CAIMAN_ART } from './floodedCrittersBlackCaiman';
import { CAPYBARA_ART } from './floodedCrittersCapybara';
import { YOUNG_CAIMAN_ART } from './floodedCrittersCaiman';
import { EGRET_ART } from './floodedCrittersEgret';
import { PIRANHA_ART } from './floodedCrittersPiranha';
import { RIVER_TURTLE_ART } from './floodedCrittersTurtle';

/** The Flooded Forest's critters, by kind, as they're painted (the jaguar is in floodedBoss.ts; poses as listed in flooded.ts). */
export const FLOODED_CRITTERS: Readonly<Record<string, SpriteArt>> = { piranha: PIRANHA_ART, egret: EGRET_ART, capybara: CAPYBARA_ART, 'young-caiman': YOUNG_CAIMAN_ART, 'river-turtle': RIVER_TURTLE_ART, 'black-caiman': BLACK_CAIMAN_ART };
