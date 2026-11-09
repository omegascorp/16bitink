import { describe, expect, it } from 'vitest';
import { RED_LAND } from '../src/level/twoLands';
import type { MapDef } from '../src/level/types';
import { gridOf, planPath, startAdventure, stepHero, type Adventure } from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import type { Hero } from '../src/logic/hero';
import { gainItem, type ItemId } from '../src/logic/items';
import { lyingItem } from '../src/logic/adventure';
import { intentAt } from '../src/logic/mapIntent';
import { passable } from '../src/logic/map';
import { rivalTurn } from '../src/logic/rival';

/**
 * Gear lying on the ground never walls off a way (src/logic/lying.ts): the
 * Red Land's ford, west of Abu's raiders, is one tile wide at (21..23, 52).
 * A hero (ours or the rival's) rides over a piece lying there, taking it in
 * passing with room for it and leaving it (said once) without.
 */

const PIECE: ItemId = 'scaleHelm';
const FORD = { x: 22, y: 52 };
const WEST = { x: 19, y: 52 };
const EAST = { x: 27, y: 52 };
/** The Red Land with a plain rival (src/logic/rival.ts), not a lord. */
const PLAIN: MapDef = { ...RED_LAND, rival: { ...RED_LAND.rival!, mind: undefined } };

/** `h` with every slot `id` fits and the whole bag filled with it: no room for one more. */
function full(h: Hero): Hero {
  let out = h;
  for (let i = 0; i < 40; i++) {
    const got = gainItem(out, PIECE);
    if (!got.kept) return out;
    out = got.hero;
  }
  throw new Error('the bag never filled');
}
const holds = (h: Hero): number => [...Object.values(h.gear ?? {}), ...(h.bag ?? [])].filter((id) => id === PIECE).length;
const bare = (h: Hero): Hero => {
  const { gear: _gear, bag: _bag, ...rest } = h;
  return rest;
};

/** The Red Land with nothing near the ford but a piece lying on it, our hero at `at`. */
function atTheFord(def: MapDef, hero: (h: Hero) => Hero, at = WEST): Adventure {
  const start = startAdventure(def);
  const far = start.objects.filter((o) => Math.max(Math.abs(o.x - FORD.x), Math.abs(o.y - FORD.y)) > 8);
  const objects = [...far, lyingItem({ id: 'spoils@1-0', ...FORD }, PIECE)];
  return { ...start, prompts: [], objects, hero: { ...hero(start.hero), ...at, mp: 3000 } };
}

/** Rides `adv`'s planned path to (x, y) step by step, as the map does; the notes said on the way. */
function ride(adv: Adventure, x: number, y: number): { adv: Adventure; notes: string[]; stopped: boolean } {
  const path = planPath(adv, RED_LAND, x, y)!;
  let a = adv;
  const notes: string[] = [];
  for (const step of path) {
    const r = stepHero(a, RED_LAND, step, path.at(-1));
    a = r.adv;
    notes.push(...r.notes);
    if (r.stop) return { adv: a, notes, stopped: true };
  }
  return { adv: a, notes, stopped: false };
}

const lying = (adv: Adventure): boolean => adv.objects.some((o) => o.id === 'spoils@1-0' && !o.gone);

describe('gear lying on the ground', () => {
  it('lies on a one-tile choke: the ford has no way round it nearby', () => {
    const g = gridOf(RED_LAND);
    for (const x of [21, 22, 23]) {
      expect(passable(g, x, 52)).toBe(true);
      expect(passable(g, x, 51) || passable(g, x, 53)).toBe(false);
    }
  });

  it('a full-bag hero rides across the choke over it, leaves it there and is told so once', () => {
    const adv = atTheFord(RED_LAND, full);
    const path = planPath(adv, RED_LAND, EAST.x, EAST.y);
    expect(path, 'a way across the ford').not.toBeNull();
    expect(path!.some((s) => s.x === FORD.x && s.y === FORD.y)).toBe(true);
    expect(path!.every((s) => s.day === 0)).toBe(true);
    const r = ride(adv, EAST.x, EAST.y);
    expect(r.stopped).toBe(false);
    expect(r.adv.hero).toMatchObject(EAST);
    expect(lying(r.adv), 'never lost').toBe(true);
    expect(r.notes.filter((n) => n.startsWith('No room in the bag for the'))).toHaveLength(1);
    expect(r.adv.prompts).toHaveLength(0);
    // The cursor shows a plain ride onto it, not a visit.
    expect(intentAt({ ...adv, explored: '1'.repeat(adv.explored.length) }, RED_LAND, FORD.x, FORD.y)).toBe('move');
  });

  it('a full-bag hero may stop on it too, and ride on from there', () => {
    const adv = atTheFord(RED_LAND, full);
    const on = ride(adv, FORD.x, FORD.y);
    expect(on.adv.hero).toMatchObject(FORD);
    expect(lying(on.adv)).toBe(true);
    expect(ride(on.adv, EAST.x, EAST.y).adv.hero).toMatchObject(EAST);
  });

  it('a hero with room picks it up in passing, without stopping', () => {
    const adv = atTheFord(RED_LAND, bare);
    const r = ride(adv, EAST.x, EAST.y);
    expect(r.stopped).toBe(false);
    expect(r.adv.hero).toMatchObject(EAST);
    expect(lying(r.adv)).toBe(false);
    expect(holds(r.adv.hero)).toBe(1);
    expect(r.adv.prompts.some((p) => p.kind === 'message' && p.item === PIECE)).toBe(true);
    expect(intentAt({ ...adv, explored: '1'.repeat(adv.explored.length) }, RED_LAND, FORD.x, FORD.y)).toBe('visit');
  });

  for (const [mind, def] of [['plain', PLAIN], ['lord', RED_LAND]] as const) {
    describe(`the rival (${mind})`, () => {
      /** Our weak hero east of the ford, the rival's strong one west of it, riding at ours across it. */
      function across(gear: (h: Hero) => Hero): Adventure {
        const adv = atTheFord(def, bare, EAST);
        const hero = { ...adv.hero, army: armyOf([{ creature: adv.hero.army.find((s) => s)!.creature, count: 1 }]) };
        const foe = adv.rival!.hero!;
        return { ...adv, hero, rival: { ...adv.rival!, hero: { ...gear(foe), ...WEST, mp: 3000 } } };
      }

      it('rides over it with his bag full and leaves it there', () => {
        const r = rivalTurn(across(full), def).adv;
        const him = r.rival!.hero!;
        expect(him.x).toBeGreaterThan(FORD.x);
        expect(lying(r)).toBe(true);
      });

      it('picks it up in passing with room for it', () => {
        // His own kit on, an empty bag.
        const r = rivalTurn(across((h) => ({ ...h, bag: [] })), def).adv;
        const him = r.rival!.hero!;
        expect(him.x).toBeGreaterThan(FORD.x);
        expect(lying(r)).toBe(false);
        expect(holds(him)).toBe(1);
      });
    });
  }
});
