import type { Adventure, RivalState } from '../adventure';
import { armyOf } from '../army';
import type { Hero } from '../hero';
import type { MapObject, Owner } from '../objects';
import type { Town } from '../town';

/**
 * The adventure seen from the rival's chair: his heroes are "ours" (the
 * picked one and the others), his purse, fog, towns and flags are the
 * player's, and the player's side is "the rival". The player's rules then
 * play his side as they play ours (the same moves, visits, fights, hires),
 * so a lord can be driven by the code that drives either side. Mirroring
 * twice gives the adventure back; `unmirrored` keeps what only the player's
 * side has (its cards, its blots, the part's state).
 */

/** A stand-in for a lord with no hero riding: never drawn, never moved, dropped on the way back. */
export const GHOST = '__ghost';

const flip = (o: Owner | undefined): Owner | undefined => (o === 'player' ? 'rival' : o === 'rival' ? 'player' : o);
const flipTown = (t: Town): Town => ({ ...t, owner: flip(t.owner)! });
const flipObject = (o: MapObject): MapObject => (o.owner === 'player' || o.owner === 'rival' ? { ...o, owner: flip(o.owner) } : o);

/** The ghost a lord with no hero is played with, at his first town (the town still builds and hires into its garrison). */
function ghost(adv: Adventure): Hero {
  const at = adv.towns.find((t) => t.owner === 'rival') ?? adv.towns[0]!;
  return { ...adv.hero, id: GHOST, name: '', x: at.x, y: at.y, army: armyOf([]), mp: 0, visited: [], skills: {}, spells: [] };
}

/** The rival's side as the player's: needs `adv.rival`, and his fog (a lord's). */
export function mirrored(adv: Adventure): Adventure {
  const r = adv.rival!;
  const [first, ...rest] = [...(r.hero ? [r.hero] : []), ...(r.others ?? [])];
  const them: RivalState = { hero: adv.hero, purse: adv.purse, others: adv.others ?? [], explored: adv.explored, mirror: true };
  const { rivalFight: _fight, others: _others, ...base } = adv;
  return {
    ...base,
    hero: first ?? ghost(adv),
    ...(rest.length ? { others: rest } : {}),
    purse: r.purse,
    explored: r.explored ?? '0'.repeat(adv.explored.length),
    // A town that waits for us opens to us only: for him it is a town to storm.
    towns: adv.towns.map((t) => { const { ally: _ally, ...town } = t; return flipTown(town); }),
    objects: adv.objects.map(flipObject),
    prompts: [],
    lostStacks: 0,
    status: 'playing',
    rival: them,
  };
}

/** The mirrored adventure `m` back as the player's, from `real` (the adventure before it was mirrored). */
export function unmirrored(m: Adventure, real: Adventure): Adventure {
  const lord = [m.hero, ...(m.others ?? [])].filter((h) => h.id !== GHOST);
  const [first, ...rest] = lord;
  const them = m.rival!;
  const allies = new Set(real.towns.filter((t) => t.ally).map((t) => t.id));
  const towns = m.towns.map((t) => { const back = flipTown(t); return allies.has(t.id) && back.owner === 'neutral' ? { ...back, ally: true } : back; });
  // The player's heroes as he left them (a beaten one gone, the next picked).
  const heroes = them.hero ? [them.hero, ...(them.others ?? [])] : [];
  const [hero, ...others] = heroes;
  const { others: _was, ...base } = real;
  return {
    ...base,
    day: m.day,
    hero: hero ?? { ...real.hero, army: armyOf([]) },
    ...(others.length ? { others } : {}),
    purse: them.purse,
    explored: them.explored ?? real.explored,
    towns,
    objects: m.objects.map(flipObject),
    rival: { ...real.rival!, hero: first ?? null, others: rest, purse: m.purse, explored: m.explored },
    // Every hero of ours beaten: the part is lost, whatever towns are left.
    ...(hero ? {} : { status: 'lost' as const }),
  };
}
