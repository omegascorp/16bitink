import type { BossKind } from '../../level/types';
import { CAT_ART } from './catArt';
import { CHAMELEON_ART } from './chameleonArt';
import { FROG_ART } from './frogArt';
import { LION_ART } from './lionArt';
import { MAGPIE_ART } from './magpieArt';
import { MOLE_ART } from './moleArt';
import { OWL_ART } from './owlArt';
import { SCARECROW_ART } from './scarecrowArt';
import { SNAIL_ART } from './snailArt';
import { TORTOISE_ART } from './tortoiseArt';
import type { BossArt } from './types';

export type { BossArt } from './types';

/** Each chapter's boss, as painted. */
export const BOSS_ART: Readonly<Record<BossKind, BossArt>> = {
  mole: MOLE_ART, frog: FROG_ART, snail: SNAIL_ART, magpie: MAGPIE_ART, tortoise: TORTOISE_ART,
  scarecrow: SCARECROW_ART, chameleon: CHAMELEON_ART, cat: CAT_ART, lion: LION_ART, owl: OWL_ART,
};
