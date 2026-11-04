import { describe, expect, it } from 'vitest';
import { ASHFORD } from '../src/level/borderMarch';
import { isOpen, MAPS, nextMap } from '../src/level/maps';
import { openBy, UNLOCKS } from '../src/level/unlocks';
import { THORNWOOD } from '../src/level/borderMarch';
import type { MapDef } from '../src/level/types';
import { afterBattle, answerPrompt, unfinished, heroTown, playerTowns, townById, battleSides, dailyIncome, endDay, garrisonHero, withTown, gridOf, heroInGarrison, heroVisiting, isSeen, leadOut, objectAt, planPath, startAdventure, stepHero, type Adventure } from '../src/logic/adventure';
import { armyOf, moveAll } from '../src/logic/army';
import { act, createBattle } from '../src/logic/battle';
import { chooseAction } from '../src/logic/battleAi';
import { dailyMp, levelFor, nextLevelUp, xpForLevel } from '../src/logic/hero';
import { passable, tileIndex } from '../src/logic/map';
import { objectFootprint, townFootprint } from '../src/logic/objects';
import { findPath } from '../src/logic/path';
import { advisedNext, bestUnit, build, cantBuild, growthOf, hire, hireAll, upgradeAll, upgradeCost, upgradeSlot, upgradeTo, weekly } from '../src/logic/town';
import { BUILDINGS, BUILDING_IDS } from '../src/logic/buildings';
import { creature, lineOf, lineUnits, tierOf } from '../src/logic/creatures';

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
      expect(def.objects.some((o) => o.id === def.goal.target) || towns(def).some((t) => t.id === def.goal.target)).toBe(true);
      for (const town of towns(def)) {
        expect(passable(g, town.x, town.y), `${town.id} gate`).toBe(true);
        for (const t of townFootprint(town.x, town.y)) {
          expect(objectAtDef(def, t.x, t.y)).toBeUndefined();
          expect(passable(g, t.x, t.y), `${town.id} at ${t.x},${t.y}`).toBe(true);
        }
      }
    });

    it(`${def.id}: every object's footprint is open ground, clear of the town and other objects`, () => {
      const g = gridOf(def);
      const taken = new Set([...def.objects.map((o) => `${o.x},${o.y}`), ...towns(def).flatMap((town) => [`${town.x},${town.y}`, ...townFootprint(town.x, town.y).map((t) => `${t.x},${t.y}`)])]);
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
        const view = { grid: gridOf(def), solid: new Set(towns(def).flatMap((town) => townFootprint(town.x, town.y)).map((t) => tileIndex(gridOf(def), t.x, t.y))), stopAt: new Set<number>(), pathfinding: 0 };
        expect(findPath(view, adv.hero, o.x, o.y, 1e9, 1e9), o.id).not.toBeNull();
      }
    });
  }
});

const objectAtDef = (def: MapDef, x: number, y: number) => def.objects.find((o) => o.x === x && o.y === y);
const towns = (def: MapDef) => [def.town, ...(def.towns ?? [])];

describe('the adventure', () => {
  it('starts on day 1 with the intro card, the hero rested and the land round it seen', () => {
    const adv = startAdventure(ASHFORD);
    expect(adv.day).toBe(1);
    expect(adv.prompts[0]).toMatchObject({ kind: 'message', title: 'Ashford' });
    expect(adv.hero.mp).toBe(dailyMp(adv.hero));
    expect(isSeen(adv, ASHFORD, 6, 6)).toBe(true);
    expect(isSeen(adv, ASHFORD, 30, 20)).toBe(false);
    // The Guardhouse opens with a week of Spearmen.
    expect(adv.towns[0]!.stock.spearman).toBe(14);
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
    adv = walk(endDay(adv), ASHFORD, 11, 6).adv;
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
    adv = walk(endDay(adv), ASHFORD, 11, 6).adv;
    expect(adv.objects.find((o) => o.id === 'sawmill')!.owner).toBe('player');
    expect(adv.hero.x === 11 && adv.hero.y === 6).toBe(false);
    expect(planPath(adv, ASHFORD, 11, 5)).toBeNull();
  });

  it('a monster’s guard zone starts a fight, and winning clears it and pays experience', () => {
    const adv = { ...startAdventure(ASHFORD), prompts: [] };
    const r = walk(adv, ASHFORD, 11, 6);
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
    expect(adv.towns[0]!.stock.spearman).toBe(28);
    expect(adv.objects.find((o) => o.id === 'ogres')!.count).toBe(9);
  });

  it('ends each day with a report of what came in, and on a new week the fresh recruits', () => {
    const start = { ...startAdventure(ASHFORD), prompts: [] };
    const owned = { ...start, objects: start.objects.map((o) => (o.kind === 'mine' && o.resource === 'wood' ? { ...o, owner: 'player' as const } : o)) };
    const day2 = endDay(owned);
    expect(day2.prompts).toHaveLength(1);
    const report = day2.prompts[0] as { kind: string; title: string; text: string };
    expect(report).toMatchObject({ kind: 'message', title: 'Month 1, Week 1, Day 2' });
    expect(report.text).toContain(`${start.towns[0]!.name} pays ${dailyIncome(owned).gold} gold`);
    expect(report.text).toMatch(/Sawmill: \+\d+ wood/);
    expect(report.text).toContain(`${start.hero.name} is rested`);
    let adv: Adventure = start;
    for (let d = 1; d < 8; d++) adv = { ...endDay(adv), prompts: [] };
    const week = endDay({ ...adv, day: 7 });
    const text = (week.prompts[0] as { text: string }).text;
    expect(text).toContain('A new week');
    expect(text).toMatch(/\+14 Hoplites/);
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
    expect(cantBuild(start.towns[0]!, 'griffinTower', start.purse, ASHFORD.off)).toMatch(/Barracks/);
    expect(cantBuild(start.towns[0]!, 'cityHall', start.purse, ASHFORD.off)).toBe('Not on this map');
    expect(cantBuild(start.towns[0]!, 'blacksmith', start.purse, ASHFORD.off)).toBe('Not on this map');
    const r = build(start.towns[0]!, 'barracks', start.purse, ASHFORD.off);
    expect(r.purse.gold).toBe(start.purse.gold - 2000);
    expect(cantBuild(r.town, 'griffinTower', r.purse, ASHFORD.off)).toBe('Already built today');
    expect(cantBuild(weekly(r.town), 'griffinTower', r.purse, ASHFORD.off)).toBeNull();
  });

  it('a new dwelling opens with a week’s growth; walls add to growth', () => {
    const r = build(start.towns[0]!, 'archeryRange', start.purse, ASHFORD.off);
    expect(r.town.stock.bowman).toBe(9);
    expect(growthOf({ ...r.town, built: [...r.town.built, 'citadel'] }, 'bowman')).toBe(13);
  });

  it('hires into the hero’s army and pays for it', () => {
    const r = hire(start.towns[0]!, 'spearman', 10, start.purse, start.hero.army);
    expect(r.army[0]).toEqual({ creature: 'spearman', count: 28 });
    expect(r.purse.gold).toBe(start.purse.gold - 600);
    expect(r.town.stock.spearman).toBe(4);
    expect(() => hire(start.towns[0]!, 'spearman', 15, start.purse, start.hero.army)).toThrow();
  });
});

describe('the whole army moving between hero and garrison', () => {
  const start = startAdventure(ASHFORD);
  const inTown: Adventure = { ...start, hero: { ...start.hero, x: start.towns[0]!.x, y: start.towns[0]!.y } };

  it('merges like companies and refuses when the row has no room', () => {
    const src = armyOf([{ creature: 'spearman', count: 5 }, { creature: 'bowman', count: 2 }]);
    const dst = armyOf([{ creature: 'bowman', count: 3 }, null, { creature: 'monk', count: 1 }]);
    const r = moveAll(src, dst)!;
    expect(r.src.every((s) => !s)).toBe(true);
    expect(r.dst.slice(0, 3)).toEqual([{ creature: 'bowman', count: 5 }, { creature: 'spearman', count: 5 }, { creature: 'monk', count: 1 }]);
    const full = armyOf(['griffin', 'swordsman', 'monk', 'lancer', 'seraph', 'goblin', 'ogre'].map((c) => ({ creature: c as 'griffin', count: 1 })));
    expect(moveAll(src, full)).toBeNull();
    expect(moveAll(armyOf([{ creature: 'monk', count: 4 }]), full)!.dst[2]).toEqual({ creature: 'monk', count: 5 });
  });

  it('the hero goes into the garrison with every company, and leads it all out again', () => {
    const town = { ...inTown.towns[0]!, garrison: armyOf([{ creature: 'bowman', count: 4 }]) };
    const held = garrisonHero(withTown(inTown, town))!;
    expect(heroInGarrison(held)).toBe(true);
    expect(heroVisiting(held)).toBe(false);
    expect(held.hero.army.every((s) => !s)).toBe(true);
    expect(held.towns[0]!.garrison[0]).toEqual({ creature: 'bowman', count: 11 });
    expect(held.towns[0]!.garrison[1]).toEqual({ creature: 'spearman', count: 18 });
    const out = leadOut(held);
    expect(heroVisiting(out)).toBe(true);
    expect(out.towns[0]!.garrison.every((s) => !s)).toBe(true);
    expect(out.hero.army.slice(0, 2)).toEqual(held.towns[0]!.garrison.slice(0, 2));
  });

  it('only a hero standing in the town, with room for them, can go into the garrison', () => {
    expect(garrisonHero(start)).toBeNull();
    const full = armyOf(['griffin', 'swordsman', 'monk', 'lancer', 'seraph', 'goblin', 'ogre'].map((c) => ({ creature: c as 'griffin', count: 1 })));
    expect(garrisonHero(withTown(inTown, { ...inTown.towns[0]!, garrison: full }))).toBeNull();
  });
});

describe('three levels of every unit', () => {
  const start = startAdventure(ASHFORD);
  const rich = { gold: 99999, wood: 99, ore: 99, mercury: 99, sulfur: 99, crystal: 99, gems: 99 };
  /** The town with `more` built (no needs checked), the day's build free again. */
  const withBuilt = (...more: (typeof BUILDING_IDS)[number][]) => ({ ...start.towns[0]!, built: [...start.towns[0]!.built, ...more], builtToday: false });

  it('gives each of the seven lines a base and two upgrades, all sharing the line', () => {
    for (const base of ['spearman', 'bowman', 'griffin', 'swordsman', 'monk', 'lancer', 'seraph'] as const) {
      const units = lineUnits(base);
      expect(units.map(tierOf)).toEqual([1, 2, 3]);
      expect(units.every((u) => lineOf(u) === base)).toBe(true);
      // Each level is better than the one below it, and dearer.
      for (let i = 1; i < 3; i++) {
        const [a, b] = [creature(units[i - 1]!), creature(units[i]!)];
        expect(b.attack + b.defense + b.hp).toBeGreaterThan(a.attack + a.defense + a.hp);
        expect(b.cost.gold!).toBeGreaterThan(a.cost.gold!);
        expect(!!b.flies).toBe(!!a.flies);
        expect(!!b.wide).toBe(!!a.wide);
      }
    }
  });

  it('builds the tree in order: the dwelling, its upgrade, then the second upgrade behind the walls', () => {
    const off: never[] = [];
    expect(cantBuild(withBuilt(), 'guardhouse3', rich, off)).toMatch(/Phalanx Yard/);
    expect(cantBuild(withBuilt(), 'guardhouse2', rich, off)).toBeNull();
    expect(cantBuild(withBuilt('guardhouse2'), 'guardhouse3', rich, off)).toMatch(/Citadel/);
    expect(cantBuild(withBuilt('guardhouse2', 'citadel'), 'guardhouse3', rich, off)).toBeNull();
    // Every upgrade needs the step below it.
    for (const id of BUILDING_IDS) {
      const d = BUILDINGS[id].dwelling;
      if (!d || tierOf(d) === 1) continue;
      const below = BUILDING_IDS.find((b) => BUILDINGS[b].dwelling === lineUnits(lineOf(d))[tierOf(d) - 2]);
      expect(BUILDINGS[id].needs, id).toContain(below);
    }
  });

  it('hires the best level built from the line’s one stock, which an upgrade doesn’t refill', () => {
    const town = withBuilt();
    const up = build(town, 'guardhouse2', rich, []).town;
    expect(up.stock.spearman).toBe(town.stock.spearman);
    expect(bestUnit(up, 'spearman')).toBe('spearman2');
    const r = hire(up, 'spearman2', 4, rich, start.hero.army);
    expect(r.town.stock.spearman).toBe(town.stock.spearman! - 4);
    expect(r.purse.gold).toBe(rich.gold - 4 * 80);
    expect(r.army.find((s) => s?.creature === 'spearman2')).toEqual({ creature: 'spearman2', count: 4 });
    expect(growthOf(up, 'spearman2')).toBe(growthOf(up, 'spearman'));
    expect(weekly(up).stock.spearman).toBe(up.stock.spearman! + growthOf(up, 'spearman'));
  });

  it('hires all it can in one go: the best level of each line, the strongest lines first while the gold lasts', () => {
    const town = { ...withBuilt('guardhouse2', 'archeryRange', 'barracks'), stock: { spearman: 14, bowman: 9, swordsman: 4 } };
    const army = start.hero.army;
    const all = hireAll(town, army, rich);
    expect(all.hired.map((h) => h.id)).toEqual(['swordsman', 'bowman', 'spearman2']);
    expect(all.hired.every((h) => h.count === (town.stock as Record<string, number>)[lineOf(h.id)])).toBe(true);
    expect(all.town.stock.spearman).toBe(0);
    // Gold for the Minotaurs only: the lesser lines wait.
    const cost = creature('swordsman').cost.gold! * town.stock.swordsman!;
    const some = hireAll(town, army, { ...rich, gold: cost + 10 });
    expect(some.hired).toEqual([{ id: 'swordsman', count: town.stock.swordsman }]);
    expect(some.purse.gold).toBe(10);
    // An army with no room for a new kind: that kind waits in its dwelling.
    const full = armyOf(['goblin', 'skeleton', 'wolf', 'bandit', 'ogre', 'griffin', 'monk'].map((c) => ({ creature: c as never, count: 1 })));
    expect(hireAll(town, full, rich).hired).toEqual([]);
  });

  it('upgrades a company in the town to the best level built, for the difference in price', () => {
    const town = withBuilt('guardhouse2', 'citadel', 'guardhouse3');
    expect(upgradeCost('spearman', 'spearman3', 18)).toEqual({ gold: 18 * 40 });
    expect(upgradeTo(town, 'spearman')).toBe('spearman3');
    expect(upgradeTo(town, 'spearman3')).toBeNull();
    expect(upgradeTo(withBuilt(), 'spearman')).toBeNull();
    const army = start.hero.army;
    const r = upgradeSlot(town, army, 0, rich)!;
    expect(r.army[0]).toEqual({ creature: 'spearman3', count: 18 });
    expect(r.army[1]).toEqual(army[1]);
    expect(r.purse.gold).toBe(rich.gold - 720);
    // Not enough gold, nothing to raise it to, or an empty slot: no upgrade.
    expect(upgradeSlot(town, army, 0, { ...rich, gold: 100 })).toBeNull();
    expect(upgradeSlot(town, army, 1, rich)).toBeNull();
    expect(upgradeSlot(town, army, 5, rich)).toBeNull();
  });

  it('sends a hero who starts the day in a town with Stables on with 4 more tiles, and no one else', () => {
    const town = start.towns[0]!;
    const at = { ...start, hero: { ...start.hero, x: town.x, y: town.y } };
    const stabled = { ...at, towns: [withBuilt('stables'), ...at.towns.slice(1)] };
    expect(endDay(stabled).hero.mp).toBe(dailyMp(start.hero) + 400);
    expect(endDay(at).hero.mp).toBe(dailyMp(start.hero));
    // Out on the map, the Stables back home are no help; the next morning there, the bonus comes again rather than adding up.
    expect(endDay({ ...stabled, hero: { ...stabled.hero, x: town.x + 9, y: town.y + 9 } }).hero.mp).toBe(dailyMp(start.hero));
    expect(endDay(endDay(stabled)).hero.mp).toBe(dailyMp(start.hero) + 400);
    expect(endDay(stabled).prompts.at(-1)).toMatchObject({ text: expect.stringContaining('+4 tiles') });
    expect(BUILDINGS.stables.says).toContain('4 tiles');
  });

  it('upgrades every company it can in one go, in every army, the strongest first while the purse lasts', () => {
    const town = withBuilt('guardhouse2', 'archeryRange2', 'griffinTower2');
    const hero = armyOf([{ creature: 'spearman', count: 10 }, { creature: 'griffin', count: 2 }, { creature: 'boar', count: 3 }]);
    const garrison = armyOf([{ creature: 'bowman', count: 4 }, { creature: 'spearman2', count: 5 }]);
    const price = (from: 'spearman' | 'griffin' | 'bowman', to: 'spearman2' | 'griffin2' | 'bowman2', n: number): number => upgradeCost(from, to, n).gold ?? 0;
    const spearmen = price('spearman', 'spearman2', 10);
    const griffins = price('griffin', 'griffin2', 2);
    const bowmen = price('bowman', 'bowman2', 4);

    const all = upgradeAll(town, [hero, garrison], rich);
    expect(all.armies[0]![0]).toEqual({ creature: 'spearman2', count: 10 });
    expect(all.armies[0]![1]).toEqual({ creature: 'griffin2', count: 2 });
    // A neutral has no dwelling here, and a company at the top level has nowhere to go.
    expect(all.armies[0]![2]).toEqual({ creature: 'boar', count: 3 });
    expect(all.armies[1]![0]).toEqual({ creature: 'bowman2', count: 4 });
    expect(all.armies[1]![1]).toEqual({ creature: 'spearman2', count: 5 });
    expect(all.upgraded).toBe(16);
    expect(all.eligible).toBe(16);
    expect(all.purse.gold).toBe(rich.gold - spearmen - griffins - bowmen);
    expect(hero[0]).toEqual({ creature: 'spearman', count: 10 }); // the armies given are left as they were

    // Gold for the griffins and not the rest: the best troops go first, and the others wait.
    const some = upgradeAll(town, [hero, garrison], { ...rich, gold: griffins + 1 });
    expect(some.armies[0]![1]).toEqual({ creature: 'griffin2', count: 2 });
    expect(some.armies[0]![0]).toEqual(hero[0]);
    expect(some.upgraded).toBe(2);
    expect(some.eligible).toBe(16);
    expect(some.purse.gold).toBe(1);

    // Dearer companies skipped, a cheaper one still taken.
    const cheapest = Math.min(spearmen, griffins, bowmen);
    const skip = upgradeAll(town, [hero, garrison], { ...rich, gold: cheapest });
    expect(skip.upgraded).toBeGreaterThan(0);
    expect(skip.purse.gold).toBe(0);

    const broke = upgradeAll(town, [hero, garrison], { ...rich, gold: 0 });
    expect(broke.upgraded).toBe(0);
    expect(broke.eligible).toBe(16);
    expect(broke.armies).toEqual([hero, garrison]);
    expect(upgradeAll(withBuilt(), [hero, garrison], rich).eligible).toBe(0);
  });
});

describe('taking a town (Thornwood)', () => {
  /** Thornwood with no monsters, the hero beside the town's gate with a big army. */
  const beside = (): Adventure => {
    const adv = peaceful(startAdventure(THORNWOOD));
    return { ...adv, hero: { ...adv.hero, x: 63, y: 16, mp: 5000, army: armyOf([{ creature: 'seraph', count: 10 }]) } };
  };

  it('starts with two towns, only Ashford the player’s, and Thornwood held by its garrison', () => {
    const adv = startAdventure(THORNWOOD);
    expect(adv.towns.map((t) => t.owner)).toEqual(['player', 'neutral']);
    expect(playerTowns(adv).map((t) => t.name)).toEqual(['Ashford']);
    expect(townById(adv, 'thornwood-town')!.garrison.filter(Boolean)).toHaveLength(4);
    // Only the player's towns pay.
    expect(dailyIncome(adv).gold).toBe(500);
  });

  it('a garrison bars the gate: beating it takes the town, the hero rides in, and the map is won', () => {
    const adv = beside();
    const r = stepHero(adv, THORNWOOD, { x: 63, y: 15, cost: 100, straight: 100, day: 0 });
    expect(r.battle).toBe('thornwood-town');
    expect(r.adv.hero.x).toBe(63);
    expect(r.adv.hero.y).toBe(16);
    const sides = battleSides(r.adv, 'thornwood-town');
    let b = createBattle(sides.attacker, sides.defender, sides.seed).state;
    for (let i = 0; i < 600 && b.winner === null; i++) b = act(b, chooseAction(b)).state;
    expect(b.winner).toBe(0);
    const after = afterBattle(r.adv, THORNWOOD, 'thornwood-town', b);
    const town = townById(after, 'thornwood-town')!;
    expect(town.owner).toBe('player');
    expect(town.garrison.every((s) => !s)).toBe(true);
    expect(heroTown(after)?.id).toBe('thornwood-town');
    expect(after.status).toBe('won');
    // Both towns pay now (Thornwood has a Town Hall).
    expect(dailyIncome(after).gold).toBe(1500);
  });

  it('an empty town is walked into and taken without a fight', () => {
    const adv = beside();
    const empty = withTown(adv, { ...townById(adv, 'thornwood-town')!, garrison: armyOf([]) });
    const r = stepHero(empty, THORNWOOD, { x: 63, y: 15, cost: 100, straight: 100, day: 0 });
    expect(r.battle).toBeUndefined();
    expect(r.town).toBe(true);
    expect(townById(r.adv, 'thornwood-town')!.owner).toBe('player');
    expect(r.adv.status).toBe('won');
  });
});

describe('the campaign', () => {
  it('opens the town map by map: each map’s towns start with only what the campaign has opened', () => {
    for (const def of MAPS) {
      const open = openBy(def.n);
      for (const t of towns(def)) for (const b of t.built) expect(open.has(b), `${def.id} ${t.id} ${b}`).toBe(true);
      expect(def.off.every((b) => !open.has(b))).toBe(true);
    }
    // Later maps only ever add.
    for (let n = 2; n <= UNLOCKS.length; n++) expect([...openBy(n - 1)].every((b) => openBy(n).has(b))).toBe(true);
    expect(openBy(1).has('guardhouse2')).toBe(false);
    // Whatever a map opens needs only what's open by then: no building waits on a later map's.
    for (let n = 1; n <= UNLOCKS.length; n++) for (const b of openBy(n)) for (const need of BUILDINGS[b].needs) expect(openBy(n).has(need), `map ${n}: ${b} needs ${need}`).toBe(true);
    // The Blacksmith (war machines) waits for map 3.
    expect(openBy(2).has('blacksmith')).toBe(false);
    expect(openBy(3).has('blacksmith')).toBe(true);
    expect(openBy(2).has('guardhouse2')).toBe(true);
  });

  it('opens each map once the one before it is won, and leads from one to the next', () => {
    expect(isOpen(ASHFORD, {})).toBe(true);
    expect(isOpen(THORNWOOD, {})).toBe(false);
    expect(isOpen(THORNWOOD, { ashford: { blots: 1 } })).toBe(true);
    expect(nextMap(ASHFORD)).toBe(THORNWOOD);
    expect(MAPS.map((m) => m.n)).toEqual(MAPS.map((_, i) => i + 1));
  });

  it('guides the first map’s building, one advised step at a time, each one buildable in turn', () => {
    const order = ASHFORD.advice!;
    expect(order.length).toBeGreaterThan(0);
    let town = startAdventure(ASHFORD).towns[0]!;
    const rich = { gold: 1e6, wood: 999, ore: 999, mercury: 99, sulfur: 99, crystal: 99, gems: 99 };
    for (const id of order) {
      expect(ASHFORD.off).not.toContain(id);
      expect(advisedNext(town, order, ASHFORD.off)).toBe(id);
      expect(cantBuild(town, id, rich, ASHFORD.off)).toBeNull();
      town = { ...build(town, id, rich, ASHFORD.off).town, builtToday: false };
    }
    expect(advisedNext(town, order, ASHFORD.off)).toBeNull();
    // Built out of order, it skips what's done.
    const ahead = { ...startAdventure(ASHFORD).towns[0]!, built: [...startAdventure(ASHFORD).towns[0]!.built, order[0]!] };
    expect(advisedNext(ahead, order, ASHFORD.off)).toBe(order[1]);
  });
});

describe('ending the day', () => {
  it('names what could still be done: moves left, a building the town can afford today', () => {
    const adv = { ...startAdventure(ASHFORD), prompts: [] };
    expect(unfinished(adv, ASHFORD)).toEqual(['Rowan can still move today.', 'Ashford can still build today.']);
    const tired = { ...adv, hero: { ...adv.hero, mp: 0 } };
    expect(unfinished(tired, ASHFORD)).toEqual(['Ashford can still build today.']);
    const done = withTown(tired, { ...tired.towns[0]!, builtToday: true });
    expect(unfinished(done, ASHFORD)).toEqual([]);
  });
});
