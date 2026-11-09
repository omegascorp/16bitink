import type { MapDef } from '../level/types';
import { gridOf, oldLordGone, openingPrompt, revealAround, rivalFromDef, type Adventure } from './adventure';
import { lairsOut } from './lairs';
import { armyOf } from './army';
import { sightOf } from './hero';
import { addTo, purse } from './resources';
import { headStart } from './rival';
import { weekly, type Town } from './town';

/** How far either side of a newly opened way the land shows, tiles. */
const WAY_SIGHT = 4;

/**
 * A chapter is one land played straight through: winning a part opens the
 * next around the hero, who rides on with everything won so far (the hero,
 * the towns and what is built in them, the mines, the purse, the day, and
 * the land already seen). The next part adds its own towns, sights and
 * monsters, its rival, and what the Crown sends to help.
 */
export function rideOn(won: Adventure, from: MapDef, next: MapDef): Adventure {
  // A part with a lord of its own (Othrys's Lykaon after Kassander) brings him in; one with the same lord, or none, keeps the last's.
  const newLord = !!next.rival && (!won.rival || (won.rival.hero?.id ?? null) !== next.rival.hero.id);
  // And the old lord's mines, dwellings and towns still flying his banner turn neutral.
  const adv = newLord && won.rival ? oldLordGone(won, new Set([...won.objects.map((o) => o.id), ...won.towns.map((t) => t.id)])) : won;
  const have = new Set(adv.objects.map((o) => o.id));
  const objects = [...adv.objects, ...next.objects.filter((o) => !have.has(o.id))];
  // The towns in the part's order (a save reads them in that order): those held already as they are, the new ones as the part sets them.
  const towns = [next.town, ...(next.towns ?? [])].map((spec): Town => {
    const held = adv.towns.find((t) => t.id === spec.id);
    if (held) return held;
    const { owner, waits } = spec as { owner?: Town['owner']; waits?: boolean };
    return weekly({
      id: spec.id, name: spec.name, owner: waits ? 'neutral' : owner ?? 'neutral', x: spec.x, y: spec.y, built: spec.built,
      builtToday: false, stock: {}, garrison: armyOf(spec.garrison ?? []), guild: spec.guild, ...(waits ? { ally: true } : {}),
      // Its people, as the map has them (Abu is Egypt's).
      ...(spec.faction ? { faction: spec.faction } : {}),
    });
  });
  const rival = newLord ? { hero: rivalFromDef(next), purse: purse(next.rival!.purse) } : adv.rival;
  // Nothing the last part left waiting is fought in the next.
  const { rivalFight: _fight, ...rest } = adv;
  const opened: Adventure = {
    ...rest,
    mapId: next.id,
    status: 'playing',
    purse: next.grant ? addTo(adv.purse, next.grant) : adv.purse,
    towns,
    objects,
    explored: widen(adv.explored, gridOf(from).w, next),
    prompts: [...adv.prompts, openingPrompt(next)],
    lostStacks: 0,
    begun: adv.day,
    ...(rival ? { rival } : {}),
  };
  // The hero looks about the newly opened land, and so does each new town of ours (a town waiting for us has to be found).
  const fresh = towns.filter((t) => t.owner === 'player' && !adv.towns.some((o) => o.id === t.id));
  const seen = openLand(fresh.reduce((a, t) => revealAround(a, next, t.x, t.y, 5), revealAround(opened, next, adv.hero.x, adv.hero.y, sightOf(adv.hero))), next);
  // A rival who appears with the part has been at work at home too; a lord (`mind: 'lord'`) starts fair, with no head start.
  const started = newLord && next.rival!.mind !== 'lord' ? headStart(seen, next) : seen;
  // The part's lairs send out their first groups.
  return lairsOut(started);
}

/** The land along the way the part opened, seen (seeing it again changes nothing). */
export function openLand(adv: Adventure, def: MapDef): Adventure {
  const way = def.opening?.way ?? [];
  if (def.opening?.apart) return way.reduce((seen, p) => revealAround(seen, def, p.x, p.y, WAY_SIGHT), adv);
  return way.slice(1).reduce((seen, to, i) => {
    const from = way[i]!;
    const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
    return Array.from({ length: steps + 1 }, (_, n) => n).reduce(
      (a, n) => revealAround(a, def, Math.round(from.x + ((to.x - from.x) * n) / steps), Math.round(from.y + ((to.y - from.y) * n) / steps), WAY_SIGHT),
      seen,
    );
  }, adv);
}

/** The days played in this part (its par counts these). */
export const partDays = (adv: Adventure): number => adv.day - (adv.begun ?? 1) + 1;

/** The seen tiles of a land `w` wide, laid on the bigger land of `next` (which starts at the same corner). */
function widen(explored: string, w: number, next: MapDef): string {
  const g = gridOf(next);
  const h = explored.length / w;
  let out = '';
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) out += x < w && y < h ? explored[x + y * w]! : '0';
  }
  return out;
}
