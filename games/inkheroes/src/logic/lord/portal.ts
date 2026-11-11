import type { MapDef } from '../../level/types';
import { afterBattle, battleSides, fieldOf, heroTown, PORTAL, type Adventure } from '../adventure';
import { autoBattle } from '../autoBattle';
import { selectHero } from '../heroes';
import { cantStepThrough, portalTowns, stepThrough } from '../portal';
import { cantFightMob, portalMob } from '../portalMob';
import { armyStrength } from '../strength';
import type { LordMemory } from './knowledge';
import { SAFE } from './targets';
import { answerAll } from './day';
import { outfit, townDanger, type LordRules } from './towns';

/**
 * A lord's Portals, by the player's rules (portal.ts, portalMob.ts), before
 * a hero of his rides: from a Great Portal town that isn't in danger he
 * steps through to the town of his with a Great Portal in most danger (a
 * foe in reach stronger than all that holds it), to defend it; else a hero
 * who isn't his main one fights his town's band when it is no more than
 * SAFE.monster of his army, as he takes on monsters. Either ends the hero's
 * day; nothing else is rolled, so the same day plays the same way.
 */

/** Hero `id` of the side's, before his ride: a step home through a Great Portal, a band fought, or nothing. */
export function portalDuty(adv: Adventure, def: MapDef, memory: LordMemory, id: string, main: boolean, rules: Pick<LordRules, 'takeAll'>): Adventure {
  const picked = adv.hero.id;
  const a = selectHero(adv, id);
  const done = stepHome(a, def, memory, rules) ?? (main ? null : fightBand(a, def, memory));
  return done ? (done.hero.id === picked ? done : selectHero(done, picked)) : adv;
}

/** The picked hero through the Great Portal to the town in most danger, outfitted there; null when none needs him or his own does. */
function stepHome(adv: Adventure, def: MapDef, memory: LordMemory, rules: Pick<LordRules, 'takeAll'>): Adventure | null {
  const from = heroTown(adv);
  if (!from || townDanger(adv, memory, from) > 0) return null;
  const to = portalTowns(adv, from)
    .filter((t) => !cantStepThrough(adv, adv.hero.id, t.id))
    .map((t) => ({ t, danger: townDanger(adv, memory, t) }))
    .filter((x) => x.danger > 0)
    .sort((x, y) => y.danger - x.danger)[0];
  const moved = to ? stepThrough(adv, def, adv.hero.id, to.t.id) : null;
  return moved ? outfit(moved, def, moved.hero.id, memory, rules) : null;
}

/** The picked hero fights his town's band, played out by the battle AI, when it is weak enough; null when he doesn't. */
function fightBand(adv: Adventure, def: MapDef, memory: LordMemory): Adventure | null {
  const town = heroTown(adv);
  const mob = town && portalMob(adv, def, town);
  if (!town || !mob || cantFightMob(adv, def) || mob.strength > armyStrength(adv.hero.army) * SAFE.monster) return null;
  const id = PORTAL + town.id;
  const setup = battleSides(adv, id, def);
  return answerAll(afterBattle(adv, def, id, autoBattle(setup.attacker, setup.defender, setup.seed, undefined, undefined, fieldOf(setup))), memory);
}
