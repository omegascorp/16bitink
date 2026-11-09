import type { MapDef } from '../../level/types';
import type { Adventure } from '../adventure';
import { BUILDINGS, type BuildingId } from '../buildings';
import { dwellingName } from '../dwellings';
import { gridOf } from '../adventure';
import { tileIndex } from '../map';
import { MINE_NAMES, type MapObject } from '../objects';
import { buildingIn } from '../town';
import { inSight } from './knowledge';

/**
 * The night's news of a lord (rule 10): only what our sight saw (a mine or
 * a dwelling flagged in view, his heroes riding out of a town we watch),
 * and the scouts' word of his buildings and the towns he takes.
 */

/** Buildings worth the scouts' word: halls, walls and dwellings. */
const NEWSWORTHY = (b: BuildingId): boolean => !!BUILDINGS[b].dwelling || !!BUILDINGS[b].income || !!BUILDINGS[b].growth;
const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth'];

/** The nearest town's name within a few tiles of (x, y), for "at Pherai". */
function near(adv: Adventure, x: number, y: number): string {
  const t = adv.towns.map((t) => ({ t, d: Math.max(Math.abs(t.x - x), Math.abs(t.y - y)) })).filter((x) => x.d <= 10).sort((a, b) => a.d - b.d)[0];
  return t ? ` near ${t.t.name}` : '';
}

const siteName = (o: MapObject): string => (o.kind === 'mine' ? MINE_NAMES[o.resource!] : dwellingName(o));

export function lordNews(before: Adventure, after: Adventure, def: MapDef): string[] {
  const lord = def.rival?.hero.name ?? 'The rival';
  const g = gridOf(def);
  const sight = inSight(after, def);
  const seen = (x: number, y: number): boolean => sight.has(tileIndex(g, x, y));
  const out: string[] = [];
  for (const t of after.towns.filter((x) => x.owner === 'rival')) {
    const was = before.towns.find((x) => x.id === t.id);
    if (was && was.owner !== 'rival') out.push(was.owner === 'player' ? `${t.name} has fallen to ${lord}.` : `${lord}'s banner flies over ${t.name} now.`);
    for (const b of t.built.filter((x) => !was?.built.includes(x) && NEWSWORTHY(x))) out.push(`${lord} raises the ${buildingIn(t, b).name} in ${t.name}.`);
  }
  for (const o of after.objects) {
    const was = before.objects.find((x) => x.id === o.id);
    if (!was || o.owner !== 'rival' || was.owner === 'rival' || (o.kind !== 'mine' && o.kind !== 'dwelling') || !seen(o.x, o.y)) continue;
    out.push(was.owner === 'player' ? `${lord}'s riders took your ${siteName(o)}.` : `${lord}'s riders took the ${siteName(o)}${near(after, o.x, o.y)}.`);
  }
  const riding = (a: Adventure): string[] => [...(a.rival?.hero ? [a.rival.hero.id] : []), ...(a.rival?.others ?? []).map((h) => h.id)];
  const old = new Set(riding(before));
  const all = [...(after.rival?.hero ? [after.rival.hero] : []), ...(after.rival?.others ?? [])];
  const fallen = new Set((before.rival?.fallen ?? []).map((f) => f.hero.id));
  for (const h of all.filter((x) => !old.has(x.id) && fallen.has(x.id))) {
    out.push(`${h.name} is back in ${after.towns.find((t) => t.x === h.x && t.y === h.y)?.name ?? 'his hills'}, hiring a new army.`);
  }
  for (const h of all.filter((x) => !old.has(x.id) && !fallen.has(x.id))) {
    const from = after.towns.find((t) => t.x === h.x && t.y === h.y)?.name;
    const nth = ORDINAL[Math.min(ORDINAL.length - 1, all.indexOf(h))];
    out.push(`A ${nth} banner rides out of ${from ?? 'the hills'}.`);
  }
  return out;
}
