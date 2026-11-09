import type { HeroDef, MapDef } from '../../level/types';
import { checkGoal, DEFEND, GATE, RIVAL, weekOf, type Adventure } from '../adventure';
import { dailyMp } from '../hero';
import { stripped } from '../spoils';
import { lordDay } from './day';
import { lookAbout, NO_MEMORY } from './knowledge';
import { mirrored, unmirrored } from './mirror';
import { lordNews } from './news';

/**
 * The rival's night as a lord (`rival.mind: 'lord'`): his side played by
 * lordDay on the mirrored adventure, with his own fog and memory, then the
 * news our sight and scouts bring. `stop` leaves a fight with us waiting for
 * the player (the rival's turn in the game); `auto` fights it out (AI
 * against AI, for the balance runs).
 */

/** The most heroes a lord rides with, when the map doesn't say (`rival.heroes`). */
export const LORD_HEROES = 3;

/** The part's day from which he rides for a town both sides race for: after its third night, as Kassander and Sethi (rival.ts RACE). */
const RACE_FROM = 4;

/** Whether the map's rival thinks as a lord. */
export const isLord = (def: MapDef): boolean => def.rival?.mind === 'lord';

/** The heroes a lord's Taverns hire on `def` (none named: the roster's offer, as ours), and how many may ride. */
export function lordRules(def: MapDef): { recruits?: readonly HeroDef[]; maxHeroes: number } {
  const r = def.rival as (MapDef['rival'] & { recruits?: readonly HeroDef[] }) | undefined;
  return { ...(r?.recruits ? { recruits: r.recruits } : {}), maxHeroes: r?.heroes ?? LORD_HEROES };
}

/**
 * The lord beaten in the field the week before is back in a town of his,
 * with no army, to hire again (as a beaten player hires again in H3); his
 * beaten captains are gone for good.
 */
export function comesBack(adv: Adventure, def: MapDef): Adventure {
  const r = adv.rival!;
  const lord = r.fallen?.find((f) => f.hero.id === def.rival!.hero.id);
  if (!r.fallen?.length) return adv;
  // His first town on the map (Lykosoura) while he holds it.
  const home = adv.towns.find((t) => t.owner === 'rival');
  const due = !!lord && !!home && weekOf(adv.day) > weekOf(lord.day);
  const fallen = r.fallen.filter((f) => f.hero.id === def.rival!.hero.id && !due);
  // Back without the gear he was beaten in (stripped, his war machine kept), as a hero beaten anywhere.
  const back = due ? { ...stripped(lord.hero), x: home!.x, y: home!.y, mp: dailyMp(stripped(lord.hero)) } : null;
  const heroes = [...(r.hero ? [r.hero] : []), ...(r.others ?? []), ...(back ? [back] : [])];
  const [first, ...others] = heroes;
  return { ...adv, rival: { ...r, hero: first ?? null, others, ...(fallen.length ? { fallen } : { fallen: [] }) } };
}

/** A lord with no town has this many days to take one back (H3's rule): then he and his captains are gone. */
export const TOWNLESS_DAYS = 7;

/**
 * H3's elimination: a lord who has lost his last town counts the days on
 * our day card; on the TOWNLESS_DAYS-th night with none taken back, his
 * banner falls, he and his captains with it (Lykaon beaten, for the win).
 * Taking a town back stops the count.
 */
export function townless(adv: Adventure, def: MapDef): { adv: Adventure; notes: string[]; fell: boolean } {
  const r = adv.rival!;
  const name = def.rival!.hero.name;
  if (adv.towns.some((t) => t.owner === 'rival')) {
    if (r.homeless === undefined) return { adv, notes: [], fell: false };
    const { homeless: _h, ...rest } = r;
    return { adv: { ...adv, rival: rest }, notes: [], fell: false };
  }
  if (!r.hero && !r.others?.length && !r.fallen?.length) return { adv, notes: [], fell: false };
  // The night he is found townless counts as the first of the seven; on the seventh he falls.
  const since = r.homeless ?? adv.day;
  const left = TOWNLESS_DAYS - (adv.day - since);
  if (left > 1) {
    const notes = [`${name} has no town: ${left} ${left === 1 ? 'day' : 'days'} to take one back or his banner falls.`];
    return { adv: { ...adv, rival: { ...r, homeless: since } }, notes, fell: false };
  }
  const gone: Adventure = { ...adv, rival: { ...r, hero: null, others: [], fallen: [], homeless: since } };
  return { adv: gone, notes: [`${name} found no town to hold: his banner falls, and his captains scatter.`], fell: true };
}

export interface LordTurn {
  readonly adv: Adventure;
  readonly notes: readonly string[];
  readonly path: readonly { x: number; y: number }[];
  /** A fight with us he started (`stop`): RIVAL, GATE + a town's id (the hero at its gate) or DEFEND + its id (its walls), as rival.ts's. */
  readonly fight?: string;
}

export function playLord(adv: Adventure, def: MapDef, resolve: 'auto' | 'stop'): LordTurn {
  if (!adv.rival || adv.status !== 'playing') return { adv, notes: [], path: [] };
  const fresh = adv.rival.explored ? adv : { ...adv, rival: { ...adv.rival, explored: '0'.repeat(adv.explored.length) } };
  const counted = townless(comesBack(fresh, def), def);
  if (counted.fell) return { adv: checkGoal(counted.adv, def), notes: counted.notes, path: [] };
  const known = counted.adv;
  const view = lookAbout(mirrored(known), def);
  const { recruits: _ours, ...open } = def;
  const rules = lordRules(def);
  const day = lordDay(view, rules.recruits ? { ...open, recruits: rules.recruits } : open, known.rival!.memory ?? NO_MEMORY, { ...rules, rest: true, resolve, raceFrom: RACE_FROM });
  const back = unmirrored(day.adv, known);
  // His heroes beaten on his own ride (fought at once) are remembered as fallen, as beatRival remembers those we beat.
  const riding = new Set([...(back.rival!.hero ? [back.rival!.hero.id] : []), ...(back.rival!.others ?? []).map((h) => h.id)]);
  const lost = [...(known.rival!.hero ? [known.rival!.hero] : []), ...(known.rival!.others ?? [])].filter((h) => !riding.has(h.id)).map((h) => ({ hero: { ...stripped(h), army: h.army.map(() => null) }, day: adv.day }));
  const played: Adventure = { ...back, rival: { ...back.rival!, memory: day.memory, ...(lost.length ? { fallen: [...(back.rival!.fallen ?? []), ...lost] } : {}) } };
  const notes = [...lordNews(known, played, def), ...counted.notes];
  if (!day.fight) return { adv: checkGoal(played, def), notes, path: day.path };
  // In the mirror a town of ours was "the rival's": the hero at its gate is met first (GATE), its walls (the town's id there) are our DEFEND.
  const fight = day.fight === RIVAL || day.fight.startsWith(GATE) ? day.fight : DEFEND + day.fight;
  return { adv: played, notes, path: day.path, fight };
}
