import type { SpriteArt } from '../types';
import { CHAPTER_CRITTERS } from '../chapters/index';
import type { CritterKind, CritterPose, FarmCritter } from './poses';
import { CROW } from './crow';
import { EGG } from './egg';
import { FROG } from './frog';
import { HAWK } from './hawk';
import { HEN } from './hen';
import { MOUSE } from './mouse';
import { RAT } from './rat';
import { TOMCAT } from './tomcat';

export { CRITTER_POSES, type CritterKind, type CritterPose, type FarmCritter } from './poses';

type FarmArtMap = { readonly [K in FarmCritter]: SpriteArt<CritterPose<K>> };

/** The farm's critters' drawings (one file each, see poses.ts). */
const FARM_ART: FarmArtMap = { mouse: MOUSE, rat: RAT, frog: FROG, egg: EGG, crow: CROW, hawk: HAWK, hen: HEN, tomcat: TOMCAT };

/** Every critter's drawings, by kind: the farm's and each chapter's (art/chapters/). */
export const CRITTER_ART: Readonly<Record<CritterKind, SpriteArt>> = { ...FARM_ART, ...CHAPTER_CRITTERS };
