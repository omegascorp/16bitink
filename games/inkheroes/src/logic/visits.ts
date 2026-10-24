import type { Adventure } from './adventure';
import { gainedXp } from './hero';
import { CHEST_XP, MINE_NAMES, MINE_OUTPUT, ONCE_PER_HERO, type MapObject } from './objects';
import { addTo } from './resources';
import { SPELLS } from './spells';

export interface VisitResult {
  readonly adv: Adventure;
  readonly notes: readonly string[];
}

const weekOf = (day: number): number => Math.floor((day - 1) / 7) + 1;
const gone = (adv: Adventure, id: string): Adventure => ({ ...adv, objects: adv.objects.map((o) => (o.id === id ? { ...o, gone: true } : o)) });
const setObj = (adv: Adventure, id: string, patch: Partial<MapObject>): Adventure => ({ ...adv, objects: adv.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
const message = (adv: Adventure, title: string, text: string): Adventure => ({ ...adv, prompts: [...adv.prompts, { kind: 'message', title, text }] });

/** What happens when the hero steps onto a site. Level-ups are queued by the caller. */
export function visitSite(adv: Adventure, o: MapObject): VisitResult {
  const hero = adv.hero;
  if (ONCE_PER_HERO.includes(o.kind) && hero.visited.includes(o.id)) {
    return { adv: message(adv, siteTitle(o), 'You have already been here.'), notes: [] };
  }
  const visited = { ...hero, visited: [...hero.visited, o.id] };
  switch (o.kind) {
    case 'pile': {
      const amount = o.amount ?? 0;
      return { adv: gone({ ...adv, purse: addTo(adv.purse, { [o.resource!]: amount }) }, o.id), notes: [`+${amount} ${o.resource}`] };
    }
    case 'campfire': {
      const gold = o.gold ?? 500;
      const amount = o.amount ?? 5;
      return { adv: gone({ ...adv, purse: addTo(adv.purse, { gold, [o.resource!]: amount }) }, o.id), notes: [`+${gold} gold`, `+${amount} ${o.resource}`] };
    }
    case 'chest': {
      const gold = o.gold ?? 1000;
      return { adv: { ...adv, prompts: [...adv.prompts, { kind: 'chest', id: o.id, gold, xp: CHEST_XP[gold] ?? Math.floor(gold / 2) }] }, notes: [] };
    }
    case 'mine': {
      if (o.owner === 'player') return { adv, notes: [] };
      const name = MINE_NAMES[o.resource!];
      const out = MINE_OUTPUT[o.resource!];
      return { adv: message(setObj(adv, o.id, { owner: 'player' }), name, `The ${name} flies your banner now: +${out} ${o.resource} a day.`), notes: [] };
    }
    case 'mercCamp':
      return { adv: message({ ...adv, hero: { ...visited, attack: hero.attack + 1 } }, 'Mercenary Camp', 'Old soldiers drill your hero with the sword.\n+1 Attack'), notes: ['+1 Attack'] };
    case 'watchtower':
      return { adv: message({ ...adv, hero: { ...visited, defense: hero.defense + 1 } }, 'Old Watchtower', 'From the tower your hero learns how the land can be held.\n+1 Defense'), notes: ['+1 Defense'] };
    case 'standingStone': {
      const xp = gainedXp(hero, 1000);
      return { adv: message({ ...adv, hero: { ...visited, xp: hero.xp + xp } }, 'Standing Stone', `Old carvings tell of battles long ago.\n+${xp} experience`), notes: [`+${xp} XP`] };
    }
    case 'shrine': {
      const spell = o.spell!;
      if (!hero.hasBook) return { adv: message(adv, 'Wayside Shrine', `A prayer to ${SPELLS[spell].name} is carved here, but your hero has no spellbook to write it in.`), notes: [] };
      if (hero.spells.includes(spell)) return { adv: message({ ...adv, hero: visited }, 'Wayside Shrine', `Your hero already knows ${SPELLS[spell].name}.`), notes: [] };
      return { adv: message({ ...adv, hero: { ...visited, spells: [...hero.spells, spell] } }, 'Wayside Shrine', `Your hero copies ${SPELLS[spell].name} into the spellbook.\n${SPELLS[spell].says}.`), notes: [`Learned ${SPELLS[spell].name}`] };
    }
    case 'windmill': {
      const week = weekOf(adv.day);
      if (o.week === week) return { adv: message(adv, 'Windmill', 'The miller has nothing more for you this week.'), notes: [] };
      const amount = o.amount ?? 4;
      return { adv: setObj({ ...adv, purse: addTo(adv.purse, { [o.resource!]: amount }) }, o.id, { week }), notes: [`+${amount} ${o.resource}`] };
    }
    case 'stables': {
      const week = weekOf(adv.day);
      if (o.week === week) return { adv: message(adv, 'Stables', 'The horses are resting. Come back next week.'), notes: [] };
      return { adv: setObj({ ...adv, hero: { ...hero, mp: hero.mp + 400 } }, o.id, { week }), notes: ['+400 movement'] };
    }
    case 'town':
    case 'monster':
      return { adv, notes: [] };
  }
}

function siteTitle(o: MapObject): string {
  return o.kind === 'mercCamp' ? 'Mercenary Camp' : o.kind === 'watchtower' ? 'Old Watchtower' : o.kind === 'standingStone' ? 'Standing Stone' : 'Wayside Shrine';
}
