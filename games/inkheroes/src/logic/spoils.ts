import type { MapDef } from '../level/types';
import { gridOf, objectCovering, ourHeroes, rivalHeroes, withTown, type Adventure, type Prompt } from './adventure';
import type { Hero } from './hero';
import { gainItem, itemDef, SLOTS, type ItemId } from './items';
import { passable } from './map';
import { townFootprint, type MapObject } from './objects';
import { storeOf, storeRoom } from './storage';
import type { Town } from './town';

/**
 * The beaten rival's gear (docs/inkheroes-design.md, Loot): the hero who
 * beat him takes everything he wore and carried but his war machine (a
 * machine is never lost), worn where its slot is empty, else in the bag,
 * else on the ground where the battle was. Fled, he keeps it all; rehired,
 * he comes back without it. One-way: the rival never takes ours.
 */

/** What may lie this far (tiles) from where a battle was, at most. */
const SPREAD = 4;
/** The id of a piece of a beaten rival's left on the ground: `spoils@<day>-<n>`. */
export const SPOILS = /^spoils@\d{1,6}-\d{1,3}$/;

/** Everything `h` wears and carries but the war machine. */
export function spoilsOf(h: Pick<Hero, 'gear' | 'bag'>): ItemId[] {
  const worn = SLOTS.filter((s) => s !== 'machine').map((s) => h.gear?.[s]).filter((id): id is ItemId => !!id);
  return [...worn, ...(h.bag ?? [])];
}

/** `h` with nothing on but the war machine, and an empty bag. */
export function stripped(h: Hero): Hero {
  const { gear: _gear, bag: _bag, ...rest } = h;
  return h.gear?.machine ? { ...rest, gear: { machine: h.gear.machine } } : rest;
}

/** The free tiles nearest (x, y): open ground, no site, town or hero on it, closest first. */
function freeTiles(adv: Adventure, def: MapDef, x: number, y: number): { x: number; y: number }[] {
  const g = gridOf(def);
  const walls = new Set(adv.towns.flatMap((t) => [{ x: t.x, y: t.y }, ...townFootprint(t.x, t.y)]).map((t) => `${t.x},${t.y}`));
  const heroes = new Set([...ourHeroes(adv), ...rivalHeroes(adv)].map((h) => `${h.x},${h.y}`));
  const out: { x: number; y: number }[] = [];
  for (let r = 0; r <= SPREAD; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const t = { x: x + dx, y: y + dy };
        const key = `${t.x},${t.y}`;
        if (!passable(g, t.x, t.y) || walls.has(key) || heroes.has(key) || objectCovering(adv, t.x, t.y)) continue;
        out.push(t);
      }
    }
  }
  return out;
}

/** Pieces laid on the ground near (x, y), one a tile; those with no room anywhere near are lost (never happens on a real map). */
export function layDown(adv: Adventure, def: MapDef, ids: readonly ItemId[], x: number, y: number): Adventure {
  if (!ids.length) return adv;
  const tiles = freeTiles(adv, def, x, y);
  const used = adv.objects.filter((o) => o.id.startsWith(`spoils@${adv.day}-`)).length;
  const laid = ids.slice(0, tiles.length).map((item, i): MapObject => ({ id: `spoils@${adv.day}-${used + i}`, kind: 'item', x: tiles[i]!.x, y: tiles[i]!.y, item }));
  return { ...adv, objects: [...adv.objects, ...laid] };
}

/**
 * The beaten hero `foe`'s pieces go to the picked hero of ours (who beat
 * him), or (`town`: a garrison beat him with no hero of ours) into that
 * town's store while it has room; the rest lie on the ground near (x, y).
 * A card says what was taken. In the lord's chair (`rival.mirror`) our
 * heroes are "his foe": nothing is taken from them.
 */
export function takeSpoils(adv: Adventure, def: MapDef, foe: Pick<Hero, 'name' | 'gear' | 'bag'>, at: { x: number; y: number }, town?: Town): Adventure {
  const ids = spoilsOf(foe);
  if (!ids.length || adv.rival?.mirror) return adv;
  let hero = adv.hero;
  const store = town ? [...storeOf(town)] : [];
  const lines: string[] = [];
  const ground: ItemId[] = [];
  for (const id of ids) {
    if (town) {
      const kept = store.length < storeRoom(town);
      if (kept) store.push(id);
      else ground.push(id);
      lines.push(`${itemDef(id).name}: ${kept ? `to ${town.name}'s store` : 'left on the ground'}`);
      continue;
    }
    const got = gainItem(hero, id);
    hero = got.hero;
    if (!got.kept) ground.push(id);
    lines.push(`${itemDef(id).name}: ${got.worn ? `${hero.name} puts it on` : got.kept ? 'in the bag' : 'left on the ground, the bag is full'}`);
  }
  const taken = town ? withTown(adv, { ...town, ...(store.length ? { store } : {}) }) : { ...adv, hero };
  const card: Prompt = { kind: 'message', title: `${foe.name}'s gear`, text: `${foe.name} leaves everything he wore and carried behind:\n${lines.join('\n')}`, item: ids[0]! };
  return layDown({ ...taken, prompts: [...taken.prompts, card] }, def, ground, at.x, at.y);
}
