import { describe, expect, it } from 'vitest';
import { ASHFORD } from '../src/level/chapter1';
import { MAPS } from '../src/level/maps';
import type { MapDef } from '../src/level/types';
import { afterBattle, answerPrompt, battleSides, dailyIncome, endDay, gridOf, isSeen, objectAt, planPath, startAdventure, stepHero, type Adventure } from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { act, createBattle } from '../src/logic/battle';
import { chooseAction } from '../src/logic/battleAi';
import { dailyMp, levelFor, nextLevelUp, xpForLevel } from '../src/logic/hero';
import { passable, tileIndex } from '../src/logic/map';
import { objectFootprint, townFootprint } from '../src/logic/objects';
import { findPath } from '../src/logic/path';
import { build, cantBuild, growthOf, hire, weekly } from '../src/logic/town';

/** Walks a planned path to its end (or until something stops the hero). */
function walk(adv: Adventure, def: MapDef, x: number, y: number): { adv: Adventure; battle?: string; town?: boolean } {
  const path = planPath(adv, def, x, y);
  if (!path) throw new Error(`no path to ${x},${y}`);
  let a = adv;
  for (const step of path) {
    const r = stepHero(a, def, step, path[path.length - 1]);
    a = r.adv;
    if (r.stop) return { adv: a, ...(r.battle ? { battle: r.battle } : {}), ...(r.town ? { town: true } : {}) };
  }
  return { adv: a };
}

/** Removes every monster, so a test can walk anywhere. */
const peaceful = (adv: Adventure): Adventure => ({ ...adv, objects: adv.objects.map((o) => (o.kind === 'monster' ? { ...o, gone: true } : o)), prompts: [] });

describe('maps', () => {
  for (const def of MAPS) {
    it(`${def.id}: every site stands on open ground, ids are unique and the goal exists`, () => {
      const g = gridOf(def);
      const ids = new Set<string>();
      for (const o of def.objects) {
        expect(passable(g, o.x, o.y), `${o.id} at ${o.x},${o.y}`).toBe(true);
        expect(ids.has(o.id), o.id).toBe(false);
        ids.add(o.id);
      }
      expect(def.objects.some((o) => o.id === def.goal.target)).toBe(true);
      for (const t of townFootprint(def.town.x, def.town.y)) expect(objectAtDef(def, t.x, t.y)).toBeUndefined();
    });

    it(`${def.id}: every object's footprint is open ground, clear of the town and other objects`, () => {
      const g = gridOf(def);
      const taken = new Set([...def.objects.map((o) => `${o.x},${o.y}`), `${def.town.x},${def.town.y}`, ...townFootprint(def.town.x, def.town.y).map((t) => `${t.x},${t.y}`)]);
      for (const o of def.objects) {
        for (const t of objectFootprint(o)) {
          expect(passable(g, t.x, t.y), `${o.id} footprint ${t.x},${t.y}`).toBe(true);
          expect(taken.has(`${t.x},${t.y}`), `${o.id} footprint ${t.x},${t.y}`).toBe(false);
          expect(t.x === def.hero.x && t.y === def.hero.y, `${o.id} footprint on the hero`).toBe(false);
          taken.add(`${t.x},${t.y}`);
        }
      }
    });

    it(`${def.id}: the hero can reach every object from beside it (fighting aside)`, () => {
      const adv = peaceful(startAdventure(def));
      const hero = { ...adv.hero, mp: 1e9 };
      for (const o of def.objects) {
        // Monsters gone, except the one being reached; every site stays in the way.
        const objects = adv.objects.map((m) => (m.id === o.id ? { ...m, gone: false } : m));
        expect(planPath({ ...adv, hero, objects }, def, o.x, o.y), o.id).not.toBeNull();
      }
    });

    it(`${def.id}: the hero can reach every site (fighting aside)`, () => {
      const adv = peaceful(startAdventure(def));
      for (const o of def.objects) {
        const view = { grid: gridOf(def), solid: new Set(townFootprint(def.town.x, def.town.y).map((t) => tileIndex(gridOf(def), t.x, t.y))), stopAt: new Set<number>(), pathfinding: 0 };
        expect(findPath(view, adv.hero, o.x, o.y, 1e9, 1e9), o.id).not.toBeNull();
      }
    });
  }
});

const objectAtDef = (def: MapDef, x: number, y: number) => def.objects.find((o) => o.x === x && o.y === y);

describe('the adventure', () => {
  it('starts on day 1 with the intro card, the hero rested and the land round it seen', () => {
    const adv = startAdventure(ASHFORD);
    expect(adv.day).toBe(1);
    expect(adv.prompts[0]).toMatchObject({ kind: 'message', title: 'Ashford' });
    expect(adv.hero.mp).toBe(dailyMp(adv.hero));
    expect(isSeen(adv, ASHFORD, 6, 6)).toBe(true);
    expect(isSeen(adv, ASHFORD, 30, 20)).toBe(false);
    // The Guardhouse opens with a week of Spearmen.
    expect(adv.town.stock.spearman).toBe(14);
  });

  it('plans paths in days and walks only today’s part', () => {
    const adv = peaceful(startAdventure(ASHFORD));
    const path = planPath(adv, ASHFORD, 29, 20)!;
    expect(path.some((s) => s.day > 0)).toBe(true);
    const r = walk(adv, ASHFORD, 29, 20);
    expect(r.adv.hero.mp).toBeLessThan(200);
    expect(r.adv.hero.x === 29 && r.adv.hero.y === 20).toBe(false);
  });

  it('picks up a pile and flags a mine for daily income', () => {
    let adv = peaceful(startAdventure(ASHFORD));
    const wood = adv.purse.wood;
    adv = walk(adv, ASHFORD, 3, 7).adv;
    expect(adv.purse.wood).toBe(wood + 7);
    expect(objectAt(adv, 3, 7)).toBeUndefined();
    adv = walk(endDay(adv), ASHFORD, 10, 6).adv;
    expect(adv.objects.find((o) => o.id === 'sawmill')!.owner).toBe('player');
    expect(dailyIncome(adv)).toMatchObject({ gold: 500, wood: 2 });
  });

  it('visits an object from beside it, never standing on or walking through one (as H3)', () => {
    let adv = peaceful(startAdventure(ASHFORD));
    const path = planPath(adv, ASHFORD, 3, 7)!;
    const view = new Set([...adv.objects.flatMap((o) => [{ x: o.x, y: o.y }, ...objectFootprint(o)])].map((t) => `${t.x},${t.y}`));
    for (const s of path.slice(0, -1)) expect(view.has(`${s.x},${s.y}`), `${s.x},${s.y}`).toBe(false);
    adv = walk(adv, ASHFORD, 3, 7).adv;
    expect(Math.max(Math.abs(adv.hero.x - 3), Math.abs(adv.hero.y - 7))).toBe(1);
    // The sawmill is flagged from beside it; its back tile can't be walked onto.
    adv = walk(endDay(adv), ASHFORD, 10, 6).adv;
    expect(adv.objects.find((o) => o.id === 'sawmill')!.owner).toBe('player');
    expect(adv.hero.x === 10 && adv.hero.y === 6).toBe(false);
    expect(planPath(adv, ASHFORD, 10, 5)).toBeNull();
  });

  it('a monster’s guard zone starts a fight, and winning clears it and pays experience', () => {
    const adv = { ...startAdventure(ASHFORD), prompts: [] };
    const r = walk(adv, ASHFORD, 10, 6);
    expect(r.battle).toBe('goblins');
    const sides = battleSides(r.adv, 'goblins');
    let b = createBattle(sides.attacker, sides.defender, sides.seed).state;
    for (let i = 0; i < 400 && b.winner === null; i++) b = act(b, chooseAction(b)).state;
    expect(b.winner).toBe(0);
    const after = afterBattle(r.adv, ASHFORD, 'goblins', b);
    expect(after.objects.find((o) => o.id === 'goblins')!.gone).toBe(true);
    expect(after.hero.xp).toBe(4 * 5);
    expect(after.status).toBe('playing');
  });

  it('losing the battle loses the map', () => {
    const adv = startAdventure(ASHFORD);
    const sides = battleSides(adv, 'ogres');
    let b = createBattle({ ...sides.attacker, army: armyOf([{ creature: 'spearman', count: 1 }]) }, sides.defender, 1).state;
    for (let i = 0; i < 400 && b.winner === null; i++) b = act(b, chooseAction(b)).state;
    expect(afterBattle(adv, ASHFORD, 'ogres', b).status).toBe('lost');
  });

  it('beating the goal monster wins the map', () => {
    const adv = startAdventure(ASHFORD);
    const sides = battleSides(adv, 'ogres');
    let b = createBattle({ ...sides.attacker, army: armyOf([{ creature: 'seraph', count: 10 }]) }, sides.defender, 1).state;
    for (let i = 0; i < 400 && b.winner === null; i++) b = act(b, chooseAction(b)).state;
    expect(afterBattle(adv, ASHFORD, 'ogres', b).status).toBe('won');
  });

  it('a new week fills the dwellings and grows the monsters', () => {
    let adv = startAdventure(ASHFORD);
    for (let d = 1; d < 8; d++) adv = endDay(adv);
    expect(adv.day).toBe(8);
    expect(adv.town.stock.spearman).toBe(28);
    expect(adv.objects.find((o) => o.id === 'ogres')!.count).toBe(9);
  });

  it('a treasure chest offers gold or experience', () => {
    let adv = peaceful(startAdventure(ASHFORD));
    adv = { ...adv, hero: { ...adv.hero, x: 19, y: 5 } };
    adv = walk(adv, ASHFORD, 19, 4).adv;
    expect(adv.prompts[0]).toMatchObject({ kind: 'chest', gold: 1500, xp: 1000 });
    const gold = answerPrompt(adv, 'gold');
    expect(gold.purse.gold).toBe(adv.purse.gold + 1500);
    const xp = answerPrompt(adv, 'xp');
    expect(xp.hero.xp).toBe(1000);
    // 1000 XP is level 2: a level-up card follows.
    expect(xp.prompts[0]).toMatchObject({ kind: 'levelUp' });
    const levelled = answerPrompt(xp, (xp.prompts[0] as unknown as { offer: { choices: string[] } }).offer.choices[0] as never);
    expect(levelled.hero.level).toBe(2);
  });
});

describe('heroes', () => {
  it('follow H3’s experience table', () => {
    expect(xpForLevel(2)).toBe(1000);
    expect(xpForLevel(15)).toBe(34140);
    expect(levelFor(4599)).toBe(4);
    expect(levelFor(4600)).toBe(5);
  });

  it('are offered up to two skills on a level-up, an upgrade first', () => {
    const hero = startAdventure(ASHFORD).hero;
    const r = nextLevelUp({ ...hero, xp: 1000 }, 7)!;
    expect(r.offer.choices).toHaveLength(2);
    expect(r.offer.choices[0]).toBe('leadership');
  });
});

describe('towns', () => {
  const start = startAdventure(ASHFORD);

  it('builds one thing a day when its needs are met', () => {
    expect(cantBuild(start.town, 'barracks', start.purse, ASHFORD.off)).toMatch(/Blacksmith/);
    expect(cantBuild(start.town, 'cityHall', start.purse, ASHFORD.off)).toBe('Not on this map');
    const r = build(start.town, 'blacksmith', start.purse, ASHFORD.off);
    expect(r.purse.gold).toBe(start.purse.gold - 1000);
    expect(cantBuild(r.town, 'barracks', r.purse, ASHFORD.off)).toBe('Already built today');
    expect(cantBuild(weekly(r.town), 'barracks', r.purse, ASHFORD.off)).toBeNull();
  });

  it('a new dwelling opens with a week’s growth; walls add to growth', () => {
    const r = build(start.town, 'archeryRange', start.purse, ASHFORD.off);
    expect(r.town.stock.bowman).toBe(9);
    expect(growthOf({ ...r.town, built: [...r.town.built, 'citadel'] }, 'bowman')).toBe(13);
  });

  it('hires into the hero’s army and pays for it', () => {
    const r = hire(start.town, 'spearman', 10, start.purse, start.hero.army);
    expect(r.army[0]).toEqual({ creature: 'spearman', count: 28 });
    expect(r.purse.gold).toBe(start.purse.gold - 600);
    expect(r.town.stock.spearman).toBe(4);
    expect(() => hire(start.town, 'spearman', 15, start.purse, start.hero.army)).toThrow();
  });
});
