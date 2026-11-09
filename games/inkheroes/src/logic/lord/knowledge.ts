import type { MapDef } from '../../level/types';
import { gridOf, ourHeroes, playerTowns, revealAround, rivalHeroes, type Adventure } from '../adventure';
import { sightOf } from '../hero';
import { tileIndex } from '../map';
import { armyStrength } from '../strength';

/**
 * What a lord knows (Lykaon's rule 1): only what his heroes and towns have
 * seen, in his own fog, and the last strength and place he saw each hero of
 * the other side. Everything here reads the side being played as "ours"
 * (adv.hero, the player's towns): the rival's side is played on the mirrored
 * adventure (mirror.ts), so the same code serves both.
 */

/** A hero of the other side, as last seen. */
export interface Sighting {
  readonly x: number;
  readonly y: number;
  readonly strength: number;
  readonly day: number;
}

export interface LordMemory {
  /** The last time each hero of the other side was seen, by id. */
  readonly foes: Readonly<Record<string, Sighting>>;
  /** Gold set aside for the big building he saves for (build.ts). */
  readonly savings: number;
  /** The hero who carries the army (jobs: the rest are runners). */
  readonly main?: string;
  /** Where each hero of the side is riding: kept unless something clearly better turns up (no turning back and forth). */
  readonly goals?: Readonly<Record<string, { readonly x: number; readonly y: number }>>;
}

export const NO_MEMORY: LordMemory = { foes: {}, savings: 0 };

/** How far a town of ours sees round it, tiles (as a town reveals at the start). */
export const TOWN_SIGHT = 5;

/** The tiles the side sees right now: round each hero (their sight) and each town. */
export function inSight(adv: Adventure, def: MapDef): Set<number> {
  const g = gridOf(def);
  const out = new Set<number>();
  const round = (cx: number, cy: number, r: number): void => {
    for (let y = Math.max(0, cy - r); y <= Math.min(g.h - 1, cy + r); y++) {
      for (let x = Math.max(0, cx - r); x <= Math.min(g.w - 1, cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + r) out.add(tileIndex(g, x, y));
    }
  };
  for (const h of ourHeroes(adv)) if (h.x >= 0) round(h.x, h.y, sightOf(h));
  for (const t of playerTowns(adv)) round(t.x, t.y, TOWN_SIGHT);
  return out;
}

/** The side looks about: its fog lifts round its heroes and towns. */
export function lookAbout(adv: Adventure, def: MapDef): Adventure {
  const heroes = ourHeroes(adv).filter((h) => h.x >= 0).reduce((a, h) => revealAround(a, def, h.x, h.y, sightOf(h)), adv);
  return playerTowns(adv).reduce((a, t) => revealAround(a, def, t.x, t.y, TOWN_SIGHT), heroes);
}

/** The other side's heroes the side sees now go into its memory (their place and strength, with a town's garrison when in one). */
export function remember(adv: Adventure, def: MapDef, memory: LordMemory): LordMemory {
  const g = gridOf(def);
  const sight = inSight(adv, def);
  const alive = new Set(rivalHeroes(adv).map((h) => h.id));
  const foes: Record<string, Sighting> = Object.fromEntries(Object.entries(memory.foes).filter(([id]) => alive.has(id)));
  // With no town left to ride to, the other side's heroes are found by the scouts each night (as Kassander is).
  const homeless = !adv.towns.some((t) => t.owner === 'rival');
  for (const h of rivalHeroes(adv)) {
    if (!homeless && !sight.has(tileIndex(g, h.x, h.y))) continue;
    const town = adv.towns.find((t) => t.x === h.x && t.y === h.y);
    foes[h.id] = { x: h.x, y: h.y, strength: armyStrength(h.army) + (town ? armyStrength(town.garrison) : 0), day: adv.day };
  }
  return { ...memory, foes };
}

/** A sighting this many days old no longer says where a hero is. */
export const FORGET = 4;

/** The other side's heroes as the side knows them: seen lately, with how far they may have ridden since. */
export function knownFoes(adv: Adventure, memory: LordMemory): (Sighting & { readonly id: string; readonly age: number })[] {
  return Object.entries(memory.foes).map(([id, s]) => ({ ...s, id, age: adv.day - s.day })).filter((s) => s.age <= FORGET);
}

/** Whether the side has ever seen tile (x, y). */
export const seenBy = (adv: Adventure, def: MapDef, x: number, y: number): boolean => adv.explored[tileIndex(gridOf(def), x, y)] === '1';
