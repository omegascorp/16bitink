import type { SnakeId } from '../species';
import { ADDER } from './adder';
import { ANACONDA } from './anaconda';
import { COBRA } from './cobra';
import { EGGEATER } from './eggeater';
import { FLYING } from './flying';
import { HOGNOSE } from './hognose';
import { KRAIT } from './krait';
import { SIDEWINDER } from './sidewinder';
import { SPIDERTAIL } from './spidertail';
import type { AbilityMaker } from './types';

export type { Ability, AbilityCtx, AbilityInput, AbilityMaker } from './types';

/**
 * Each snake's ability, by species: one file each in this folder, each
 * chapter owning its own. The corn snake's coil is part of the core rules.
 */
const MAKERS: Partial<Record<SnakeId, AbilityMaker | null>> = {
  hognose: HOGNOSE, sidewinder: SIDEWINDER, eggeater: EGGEATER, flying: FLYING, krait: KRAIT,
  spidertail: SPIDERTAIL, adder: ADDER, cobra: COBRA, anaconda: ANACONDA,
};

export const ABILITIES: Partial<Record<SnakeId, AbilityMaker>> = Object.fromEntries(Object.entries(MAKERS).filter(([, m]) => m)) as Partial<Record<SnakeId, AbilityMaker>>;
