import type { MapDef } from '../level/types';
import { gridOf, heroFromDef, revealAround, type Adventure } from './adventure';
import { armyOf } from './army';
import { sightOf } from './hero';
import { addTo, purse } from './resources';
import { weekly, type Town } from './town';

/**
 * A chapter is one land played straight through: winning a part opens the
 * next around the hero, who rides on with everything won so far (the hero,
 * the towns and what is built in them, the mines, the purse, the day, and
 * the land already seen). The next part adds its own towns, sights and
 * monsters, its rival, and what the Crown sends to help.
 */
export function rideOn(adv: Adventure, from: MapDef, next: MapDef): Adventure {
  const have = new Set(adv.objects.map((o) => o.id));
  const objects = [...adv.objects, ...next.objects.filter((o) => !have.has(o.id))];
  // The towns in the part's order (a save reads them in that order): those held already as they are, the new ones as the part sets them.
  const towns = [next.town, ...(next.towns ?? [])].map((spec): Town => adv.towns.find((t) => t.id === spec.id) ?? weekly({
    id: spec.id, name: spec.name, owner: (spec as { owner?: Town['owner'] }).owner ?? 'neutral', x: spec.x, y: spec.y, built: spec.built,
    builtToday: false, stock: {}, garrison: armyOf(spec.garrison ?? []), guild: spec.guild,
  }));
  const rival = adv.rival ?? (next.rival ? { hero: heroFromDef(next.rival.hero), purse: purse(next.rival.purse) } : undefined);
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
    prompts: [...adv.prompts, { kind: 'message', title: next.name, text: [...next.intro, '', `Goal: ${next.goal.text}`].join('\n') }],
    lostStacks: 0,
    begun: adv.day,
    ...(rival ? { rival } : {}),
  };
  // The hero looks about the newly opened land, and so does each new town of ours.
  const fresh = towns.filter((t) => t.owner === 'player' && !adv.towns.some((o) => o.id === t.id));
  return fresh.reduce((a, t) => revealAround(a, next, t.x, t.y, 5), revealAround(opened, next, adv.hero.x, adv.hero.y, sightOf(adv.hero)));
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
