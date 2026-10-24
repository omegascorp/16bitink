import type { CreatureId } from '../../logic/creatures';
import { drawSpearman } from './spearman';
import { drawBowman } from './bowman';
import { drawGriffin } from './griffin';
import { drawSwordsman } from './swordsman';
import { drawMonk } from './monk';
import { drawLancer } from './lancer';
import { drawSeraph } from './seraph';
import { drawGoblin } from './goblin';
import { drawSkeleton } from './skeleton';
import { drawWolf } from './wolf';
import { drawBandit } from './bandit';
import { drawOgre } from './ogre';
import type { CreatureDrawer } from './types';

/** Every creature's drawing (see types.ts for the contract). */
export const CREATURE_ART: Readonly<Record<CreatureId, CreatureDrawer>> = {
  spearman: drawSpearman,
  bowman: drawBowman,
  griffin: drawGriffin,
  swordsman: drawSwordsman,
  monk: drawMonk,
  lancer: drawLancer,
  seraph: drawSeraph,
  goblin: drawGoblin,
  skeleton: drawSkeleton,
  wolf: drawWolf,
  bandit: drawBandit,
  ogre: drawOgre,
};
