import { lineOf, type CreatureId } from '../../logic/creatures';
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

/** War machines, the pixel-only neutrals and Egypt (pixel art only, still to come) have no painted drawing. */
type BaseId = Exclude<CreatureId, `${string}2` | `${string}3` | 'catapult' | 'boar' | 'stymphalian' | 'hydra' | 'basilisk'
  | 'levy' | 'nubian' | 'jackal' | 'chariot' | 'mummy' | 'sphinx' | 'bennu' | 'hyena' | 'raider' | 'scorpion' | 'crocodile' | 'petsuchos' | 'cobra' | 'lion' | 'apep' | 'gigas' | 'ammit' | 'ramp'>;

/** Every base creature's drawing (see types.ts for the contract); an upgrade is drawn as its line's base. */
export const CREATURE_ART: Readonly<Record<BaseId, CreatureDrawer>> = {
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

/** The drawing for `id`: an upgrade is drawn as its line's base. */
export const creatureArt = (id: CreatureId): CreatureDrawer => CREATURE_ART[lineOf(id) as BaseId] ?? CREATURE_ART.spearman; // war machines have no painted drawing
