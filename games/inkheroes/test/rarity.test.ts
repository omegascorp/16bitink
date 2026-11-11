import { describe, expect, it } from 'vitest';
import { BLACK_BANNER, OTHRYS } from '../src/level/borderMarch';
import { DELTA, RED_LAND, TWO_LANDS_PARTS } from '../src/level/twoLands';
import { parseMaps } from '../src/level/validate';
import { guardAt, startAdventure, type Adventure } from '../src/logic/adventure';
import { armyOf, type ArmySlot } from '../src/logic/army';
import { BUILDINGS } from '../src/logic/buildings';
import { CREATURE_IDS, creature, isCreatureId, lineOf, lineUnits, tierOf, type CreatureDef, type CreatureId } from '../src/logic/creatures';
import { answerAll } from '../src/logic/lord/day';
import { NO_MEMORY } from '../src/logic/lord/knowledge';
import { mirrored } from '../src/logic/lord/mirror';
import { outfit } from '../src/logic/lord/towns';
import type { MapObject } from '../src/logic/objects';
import { rankLine, rankOf, RARITY_NAMES } from '../src/logic/rarity';
import { purse, type Purse } from '../src/logic/resources';
import { parseAdventure } from '../src/logic/save';
import { bestUnit, buildAll, dwellings, upgradeAll, upgradeTo, type Town } from '../src/logic/town';
import { trainAt, trainCap, trainingName, trainOffers } from '../src/logic/training';
import { visitSite } from '../src/logic/visits';
import { RIMS } from '../src/scenes/battle/pixelFrames';
import { QUALITY_RIM, qualityInk, qualityRank, RANK_RIM, rankTint, rimOfUnit } from '../src/scenes/battle/rankLook';
import { drawBadge } from '../src/scenes/battle/pixelRaster';
import { ITEM_IDS, itemQuality, QUALITIES, QUALITY_NAMES } from '../src/logic/items';
import { armyUnitInfo } from '../src/scenes/battle/unitCard';
import { columnsThatFit, compareColumns, compareLayout } from '../src/scenes/battle/unitCompare';

/** Every Greek, Egyptian and Norse line, by its base unit. */
const BASES = CREATURE_IDS.filter((id) => !creature(id).line && (creature(id).faction === 'crown' || creature(id).faction === 'kemet' || creature(id).faction === 'norse'));
const NEW_IDS = CREATURE_IDS.filter((id) => tierOf(id) >= 4);
const STATS = ['attack', 'defense', 'minDmg', 'maxDmg', 'hp', 'speed'] as const;
/** The traits a rank keeps from the one below it (numbers may only rise). */
const FLAGS = ['flies', 'undead', 'noRetaliation', 'charge', 'cleave', 'guardian', 'shieldWall', 'noRangePenalty', 'noMeleePenalty', 'wide', 'breath', 'shootsTwice', 'skis'] as const;
const NUMBERS = ['shots', 'retaliations', 'regen', 'petrify', 'curse', 'poison', 'morale', 'hexes', 'rage'] as const;

describe('rarity: the five ranks', () => {
  it('adds 42 units, ranks 4 and 5 of every Greek, Egyptian and Norse line, each a full def of its line', () => {
    expect(BASES).toHaveLength(21);
    expect(NEW_IDS).toHaveLength(42);
    for (const id of NEW_IDS) {
      const c = creature(id);
      const base = creature(lineOf(id));
      expect(isCreatureId(id)).toBe(true);
      expect(id).toBe(`${lineOf(id)}${tierOf(id)}`);
      expect(c).toMatchObject({ id, faction: base.faction, level: base.level, growth: base.growth });
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.plural.length).toBeGreaterThan(0);
    }
    expect(new Set(NEW_IDS.map((id) => creature(id).name)).size).toBe(42);
    for (const b of BASES) expect(lineUnits(b).map(tierOf)).toEqual([1, 2, 3, 4, 5]);
  });

  it('carries the spec’s names', () => {
    expect(['spearman4', 'spearman5', 'lancer5', 'seraph5', 'jackal5', 'bennu5'].map((id) => creature(id as CreatureId).name))
      .toEqual(['Myrmidon', 'Champion of Ares', 'Pegasus Rider', 'Titan of Olympus', 'Chosen of Anubis', 'Eternal Bennu']);
    expect(creature('nubian4').plural).toBe('Royal Bowmen');
  });

  it('every stat is monotonic over ranks 1–5 for every line, and the price rises', () => {
    for (const b of BASES) {
      const line = lineUnits(b).map(creature);
      for (let i = 1; i < line.length; i++) {
        for (const k of STATS) expect(line[i]![k], `${line[i]!.id} ${k}`).toBeGreaterThanOrEqual(line[i - 1]![k]);
        expect(line[i]!.cost.gold!, line[i]!.id).toBeGreaterThan(line[i - 1]!.cost.gold!);
      }
    }
  });

  it('ranks 4 and 5 continue the line’s last step: the rank 2 → 3 gain (at least +1) on each stat, +1 speed, and the price', () => {
    for (const b of BASES) {
      const [, r2, r3, r4, r5] = lineUnits(b).map(creature) as CreatureDef[];
      for (const k of ['attack', 'defense', 'minDmg', 'maxDmg', 'hp'] as const) {
        const gain = Math.max(1, r3![k] - r2![k]);
        expect(r4![k], `${r4!.id} ${k}`).toBe(r3![k] + gain);
        expect(r5![k], `${r5!.id} ${k}`).toBe(r4![k] + gain);
      }
      expect(r4!.speed).toBe(r3!.speed + 1);
      expect(r5!.speed).toBe(r4!.speed + 1);
      const rise = r3!.cost.gold! - r2!.cost.gold!;
      expect(r4!.cost.gold).toBe(r3!.cost.gold! + 1.5 * rise);
      expect(r5!.cost.gold).toBe(r4!.cost.gold! + 2 * rise);
      // Levels 6 and 7 add a gem a rank.
      const gems = r3!.cost.gems ?? 0;
      expect(r4!.cost.gems ?? 0).toBe(r3!.level >= 6 ? gems + 1 : 0);
      expect(r5!.cost.gems ?? 0).toBe(r3!.level >= 6 ? gems + 2 : 0);
    }
  });

  it('every rank keeps the traits of the one below it', () => {
    for (const id of NEW_IDS) {
      const [c, prev] = [creature(id), creature(lineUnits(lineOf(id))[tierOf(id) - 2]!)];
      for (const f of FLAGS) if (prev[f]) expect(c[f], `${id} ${f}`).toBe(true);
      for (const n of NUMBERS) if (prev[n] !== undefined) expect(c[n] ?? 0, `${id} ${n}`).toBeGreaterThanOrEqual(prev[n]!);
      expect(c.rebirth === 'all' || c.rebirth === prev.rebirth || !prev.rebirth, id).toBe(true);
    }
  });

  it('gives each Legendary its own trait', () => {
    expect(creature('spearman5')).toMatchObject({ retaliations: 3, shieldWall: true });
    expect(creature('bowman5')).toMatchObject({ noMeleePenalty: true, shots: 30 });
    expect(creature('griffin5')).toMatchObject({ morale: 1, retaliations: 6 });
    expect(creature('swordsman5').cleave).toBe(true);
    expect(creature('monk5').noMeleePenalty).toBe(true);
    expect(creature('lancer5')).toMatchObject({ flies: true, charge: true, wide: true });
    expect(creature('seraph5').regen).toBe(20);
    expect(creature('levy5').retaliations).toBe(2);
    expect(creature('nubian5').noMeleePenalty).toBe(true);
    expect(creature('jackal5').poison).toBeCloseTo(0.1);
    expect(creature('chariot5').noRetaliation).toBe(true);
    expect(creature('mummy5').rebirth).toBe('half');
    expect(creature('sphinx5').cleave).toBe(true);
    expect(creature('bennu5').regen).toBe(30);
    // The Norse (chapter 3).
    expect(creature('shieldmaiden5').rebirth).toBe('half');
    expect(creature('hunter5').noMeleePenalty).toBe(true);
    expect(creature('berserker5').noRetaliation).toBe(true);
    expect(creature('dwarf5').guardian).toBe(true);
    expect(creature('warBoar5').cleave).toBe(true);
    expect(creature('valkyrie5').noRetaliation).toBe(true);
    expect(creature('dragon5').poison).toBeCloseTo(0.1);
  });

  it('carries the Norse table’s numbers, Epic and Legendary from the formula', () => {
    const row = (id: CreatureId): string => {
      const c = creature(id);
      return `${c.name} ${c.attack}/${c.defense}, ${c.minDmg}–${c.maxDmg}, ${c.hp}, ${c.speed}, ${c.cost.gold}${c.cost.gems ? ` + ${c.cost.gems}` : ''}`;
    };
    expect(['shieldmaiden4', 'shieldmaiden5', 'hunter4', 'hunter5', 'berserker4', 'berserker5', 'dwarf4', 'dwarf5', 'warBoar4', 'warBoar5', 'valkyrie4', 'valkyrie5', 'dragon4', 'dragon5'].map((id) => row(id as CreatureId))).toEqual([
      'Lagertha’s Guard 9/9, 3–5, 18, 6, 130', 'Einherjar 10/11, 4–6, 21, 7, 170',
      'Huntsman of Skadi 9/5, 4–5, 14, 7, 230', 'Archer of Ýdalir 10/6, 5–6, 16, 8, 310',
      'Úlfheðinn 15/7, 5–9, 31, 9, 365', 'Chosen of Odin 17/8, 6–10, 34, 10, 465',
      'Dwarf Lord 13/18, 8–11, 54, 6, 535', 'Son of Ivaldi 14/20, 9–12, 60, 7, 675',
      'Hildisvíni 18/13, 13–17, 60, 8, 625', 'Gullinbursti 20/14, 14–18, 65, 9, 765',
      'Valkyrie Captain 21/18, 22–30, 130, 12, 1950 + 1', 'Valkyrie of Fólkvangr 23/19, 24–32, 145, 13, 2550 + 2',
      'Elder Dragon 29/24, 55–65, 310, 16, 5600 + 4', 'Níðhöggr 32/26, 60–70, 350, 17, 7200 + 5',
    ]);
    // Rage counts double from the Berserker of Odin up; skis from the Ski Bowman; two shots from the Archer of Ullr.
    expect(lineUnits('berserker').map((id) => creature(id).rage)).toEqual([1, 1, 2, 2, 2]);
    expect(lineUnits('hunter').map((id) => !!creature(id).skis)).toEqual([false, true, true, true, true]);
    expect(lineUnits('hunter').map((id) => !!creature(id).shootsTwice)).toEqual([false, false, true, true, true]);
  });

  it('names the ranks, for the town peoples only', () => {
    expect(['spearman', 'spearman2', 'spearman3', 'spearman4', 'spearman5'].map((id) => rankOf(id as CreatureId))).toEqual([1, 2, 3, 4, 5]);
    expect(Object.values(RARITY_NAMES)).toEqual(['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']);
    expect(rankOf('hydra')).toBeNull();
    expect(rankOf('catapult3')).toBeNull();
    expect(rankLine('chariot4')).toBe('Epic · level 4 of 5');
  });
});

describe('towns never go past Rare', () => {
  const finished = (faction?: 'kemet' | 'norse'): Town => buildAll({ ...startAdventure(OTHRYS).towns[0]!, ...(faction ? { faction } : {}), built: ['villageHall'], builtToday: false }, []);
  const rich: Purse = purse({ gold: 1e6, wood: 999, ore: 999, mercury: 999, sulfur: 999, crystal: 999, gems: 999 });

  it('hires and upgrades to rank 3 at most, Greek or Egyptian, with everything built', () => {
    for (const t of [finished(), finished('kemet'), finished('norse')]) {
      expect(dwellings(t)).toHaveLength(7);
      for (const b of dwellings(t)) {
        expect(tierOf(bestUnit(t, b)!)).toBe(3);
        expect(upgradeTo(t, lineUnits(b)[2]!)).toBeNull();
        expect(upgradeTo(t, lineUnits(b)[3]!)).toBeNull();
        expect(upgradeTo(t, lineUnits(b)[4]!)).toBeNull();
      }
    }
    // No building hires a rank above Rare.
    expect(Object.values(BUILDINGS).filter((d) => d.dwelling && tierOf(d.dwelling) > 3)).toEqual([]);
  });

  it('Upgrade all raises the rest to Rare and leaves Epic and Legendary as they are', () => {
    const t = finished();
    const army = armyOf([{ creature: 'spearman', count: 10 }, { creature: 'spearman4', count: 5 }, { creature: 'griffin5', count: 2 }]);
    const r = upgradeAll(t, [army], rich);
    expect(r.armies[0]!.slice(0, 3)).toEqual([{ creature: 'spearman3', count: 10 }, { creature: 'spearman4', count: 5 }, { creature: 'griffin5', count: 2 }]);
    expect(r.eligible).toBe(10);
  });

  it('a lord outfitting in his finished town hires and raises no further than Rare', () => {
    const m = mirrored(startAdventure(OTHRYS));
    const home = m.towns.find((t) => t.x === m.hero.x && t.y === m.hero.y)!;
    const built = { ...buildAll({ ...home, builtToday: false }, []), stock: Object.fromEntries(dwellings(buildAll(home, [])).map((b) => [b, 20])) };
    const hero = { ...m.hero, army: armyOf([{ creature: 'spearman2', count: 10 }, { creature: 'bowman4', count: 4 }]) };
    const adv: Adventure = { ...m, hero, purse: rich, towns: m.towns.map((t) => (t.id === home.id ? built : t)) };
    const out = outfit(adv, OTHRYS, hero.id, NO_MEMORY);
    const ranks = out.hero.army.filter((s): s is ArmySlot => !!s).map((s) => [s.creature, tierOf(s.creature)] as const);
    expect(ranks.find(([c]) => c === 'bowman4')).toBeDefined();
    expect(ranks.filter(([c, r]) => r > 3 && c !== 'bowman4')).toEqual([]);
    expect(ranks.some(([c]) => c === 'spearman3')).toBe(true);
  });
});

/** The adventure on `def` with the picked hero leading `army` and holding `p`. */
function withArmy(def: typeof OTHRYS, army: readonly (ArmySlot | null)[], p: Purse = purse({ gold: 20000, gems: 20 })): Adventure {
  const adv = startAdventure(def);
  return { ...adv, purse: p, prompts: [], hero: { ...adv.hero, army: armyOf(army) } };
}
const site = (adv: Adventure, id: string): MapObject => adv.objects.find((o) => o.id === id)!;
/** The hero visits site `id`; with `slot`, trains that company. */
function visit(adv: Adventure, id: string, slot?: number): Adventure {
  const seen = visitSite(adv, site(adv, id)).adv;
  return slot === undefined ? seen : trainAt(seen, slot);
}
const lastText = (adv: Adventure): string => {
  const p = adv.prompts.at(-1);
  return p?.kind === 'message' ? p.text : '';
};

describe('an Arena of Heroes', () => {
  it('offers the Rare companies, the strongest first, and trains up to a week’s growth of the line', () => {
    const adv = withArmy(OTHRYS, [{ creature: 'spearman3', count: 20 }, { creature: 'griffin3', count: 5 }, { creature: 'spearman', count: 9 }]);
    const seen = visitSite(adv, site(adv, 'othrys-arena')).adv;
    expect(seen.prompts.at(-1)).toEqual({ kind: 'train', id: 'othrys-arena' });
    expect(trainOffers(site(adv, 'othrys-arena'), adv.hero.army, adv.purse).map((o) => [o.from, o.count])).toEqual([['griffin3', 5], ['spearman3', 14]]);
    const done = trainAt(seen, 0);
    // 14 Hoplites a week: 14 of the 20 come out Myrmidons, in the first free slot; 6 stay Spartans.
    expect(done.hero.army.slice(0, 4)).toEqual([{ creature: 'spearman3', count: 6 }, { creature: 'griffin3', count: 5 }, { creature: 'spearman', count: 9 }, { creature: 'spearman4', count: 14 }]);
    expect(done.prompts[0]).toMatchObject({ kind: 'message', title: 'Arena of Heroes' });
    expect(trainCap(site(adv, 'othrys-arena'), 'seraph3')).toBe(1);
  });

  it('costs the difference in price for each creature trained', () => {
    const adv = withArmy(OTHRYS, [{ creature: 'griffin3', count: 5 }]);
    const done = visit(adv, 'othrys-arena', 0);
    expect(adv.purse.gold - done.purse.gold).toBe((365 - 290) * 5);
    expect(done.purse.gems).toBe(adv.purse.gems);
  });

  it('trains once a week, for any hero: next Monday it trains again', () => {
    const adv = withArmy(OTHRYS, [{ creature: 'spearman3', count: 30 }]);
    const once = { ...visit(adv, 'othrys-arena', 0), prompts: [] };
    const again = visit(once, 'othrys-arena');
    expect(again.prompts.map((p) => p.kind)).toEqual(['message']);
    expect(lastText(again)).toMatch(/Monday/);
    const other = { ...once, hero: { ...once.hero, id: 'someone-else' } };
    expect(visit(other, 'othrys-arena').prompts.at(-1)?.kind).toBe('message');
    const monday = { ...once, day: once.day + 7 };
    expect(visit(monday, 'othrys-arena').prompts.at(-1)).toEqual({ kind: 'train', id: 'othrys-arena' });
  });

  it('puts part of a company onto a company of the same unit', () => {
    const adv = withArmy(OTHRYS, [{ creature: 'spearman3', count: 20 }, { creature: 'spearman4', count: 3 }]);
    const done = visit(adv, 'othrys-arena', 0);
    expect(done.hero.army.slice(0, 3)).toEqual([{ creature: 'spearman3', count: 6 }, { creature: 'spearman4', count: 17 }, null]);
  });

  it('with no free slot trains only a whole company, under the cap', () => {
    const full = (n: number): ArmySlot[] => [{ creature: 'spearman3', count: n }, ...(['bowman', 'griffin', 'swordsman', 'monk', 'lancer', 'seraph'] as const).map((c) => ({ creature: c, count: 1 }))];
    const big = withArmy(OTHRYS, full(20));
    expect(trainOffers(site(big, 'othrys-arena'), big.hero.army, big.purse)).toEqual([]);
    expect(lastText(visit(big, 'othrys-arena'))).toMatch(/no free slot.*14 or fewer/);
    const small = withArmy(OTHRYS, full(12));
    expect(visit(small, 'othrys-arena', 0).hero.army[0]).toEqual({ creature: 'spearman4', count: 12 });
  });

  it('says why when nothing can train: no Rare company, or a purse that can’t pay', () => {
    const none = visit(withArmy(OTHRYS, [{ creature: 'spearman', count: 20 }, { creature: 'griffin4', count: 3 }]), 'othrys-arena');
    expect(none.prompts.at(-1)?.kind).toBe('message');
    expect(lastText(none)).toMatch(/Only Rare troops train here, to Epic/);
    const poor = visit(withArmy(OTHRYS, [{ creature: 'spearman3', count: 20 }], purse({ gold: 20 })), 'othrys-arena');
    expect(lastText(poor)).toMatch(/can't pay/);
  });

  it('trains no more than the purse pays for', () => {
    const adv = withArmy(OTHRYS, [{ creature: 'spearman3', count: 20 }], purse({ gold: 30 * 5 + 10 }));
    expect(visit(adv, 'othrys-arena', 0).hero.army.slice(0, 2)).toEqual([{ creature: 'spearman3', count: 15 }, { creature: 'spearman4', count: 5 }]);
  });

  it('Leave answers the card and trains nothing; a lord rides past', () => {
    const seen = visit(withArmy(OTHRYS, [{ creature: 'spearman3', count: 5 }]), 'othrys-arena');
    const left = trainAt(seen);
    expect(left.prompts).toEqual(seen.prompts.slice(0, -1));
    expect(site(left, 'othrys-arena').week).toBeUndefined();
    expect(answerAll(seen, NO_MEMORY).prompts.some((p) => p.kind === 'train')).toBe(false);
  });

  it('keeps its week, and a waiting card, through a save; an old save without the sites takes them in', () => {
    const adv = withArmy(OTHRYS, [{ creature: 'spearman3', count: 30 }]);
    const done = { ...visit(adv, 'othrys-arena', 0), prompts: [] };
    const back = parseAdventure(JSON.parse(JSON.stringify(done)), OTHRYS)!;
    expect(site(back, 'othrys-arena').week).toBe(1);
    expect(back.hero.army[1]).toEqual({ creature: 'spearman4', count: 14 });
    const waiting = visit({ ...done, day: 8 }, 'othrys-arena');
    expect(parseAdventure(JSON.parse(JSON.stringify(waiting)), OTHRYS)!.prompts.at(-1)).toEqual({ kind: 'train', id: 'othrys-arena' });
    const old = { ...adv, objects: adv.objects.filter((o) => o.kind !== 'arena' && o.kind !== 'sanctum') };
    const loaded = parseAdventure(JSON.parse(JSON.stringify(old)), OTHRYS)!;
    expect(loaded).not.toBeNull();
    expect(loaded.objects.filter((o) => o.kind === 'arena').map((o) => o.id).sort()).toEqual(['banner-arena', 'othrys-arena']);
  });
});

describe('a legendary site', () => {
  it('is named for its land: the Forge of Hephaestus, the Temple of Ra', () => {
    expect(trainingName(site(startAdventure(OTHRYS), 'hephaestus-forge'))).toBe('Forge of Hephaestus');
    expect(trainingName(site(startAdventure(DELTA), 'ra-temple'))).toBe('Temple of Ra');
  });

  it('trains Epic to Legendary, half a week’s growth (rounded up), for the price and a gem fee of the line’s level', () => {
    const adv = withArmy(OTHRYS, [{ creature: 'spearman4', count: 10 }, { creature: 'spearman3', count: 5 }]);
    const done = visit(adv, 'hephaestus-forge', 0);
    expect(done.hero.army.slice(0, 3)).toEqual([{ creature: 'spearman4', count: 3 }, { creature: 'spearman3', count: 5 }, { creature: 'spearman5', count: 7 }]);
    expect(adv.purse.gold - done.purse.gold).toBe((170 - 130) * 7);
    expect(adv.purse.gems - done.purse.gems).toBe(1);
    // A Rare company is no use here.
    expect(trainOffers(site(adv, 'hephaestus-forge'), adv.hero.army, adv.purse).map((o) => o.from)).toEqual(['spearman4']);
  });

  it('charges a Titan’s gem fee once, beside the gems the price itself rises by', () => {
    const adv = withArmy(OTHRYS, [{ creature: 'seraph4', count: 2 }]);
    const done = visit(adv, 'hephaestus-forge', 0);
    expect(done.hero.army[0]).toEqual({ creature: 'seraph4', count: 1 });
    expect(done.hero.army[1]).toEqual({ creature: 'seraph5', count: 1 });
    expect(adv.purse.gems - done.purse.gems).toBe(7 + 1);
    expect(adv.purse.gold - done.purse.gold).toBe(7200 - 5600);
  });

  it('turns a hero away who can’t pay the fee', () => {
    const poor = visit(withArmy(DELTA, [{ creature: 'levy4', count: 10 }], purse({ gold: 9000 })), 'ra-temple');
    expect(lastText(poor)).toMatch(/can't pay.*1 gems/);
  });
});

describe('where the sites stand', () => {
  const parts = [BLACK_BANNER, OTHRYS, RED_LAND, DELTA];

  it('an Arena on chapter 1 parts 3 and 4 and chapter 2 parts 3 and 4, a legendary site on each chapter’s last part', () => {
    const ids = (def: typeof OTHRYS, kind: string): string[] => def.objects.filter((o) => o.kind === kind).map((o) => o.id).sort();
    expect(parts.map((d) => ids(d, 'arena'))).toEqual([['banner-arena'], ['banner-arena', 'othrys-arena'], ['red-arena'], ['delta-arena', 'red-arena']]);
    expect(parts.map((d) => ids(d, 'sanctum'))).toEqual([[], ['hephaestus-forge'], [], ['ra-temple']]);
  });

  it('each stands guarded by a strong group beside it', () => {
    for (const def of parts) {
      const adv = startAdventure(def);
      for (const o of adv.objects.filter((x) => x.kind === 'arena' || x.kind === 'sanctum')) {
        const guard = guardAt(adv, o.x, o.y);
        expect(guard, o.id).toBeDefined();
        expect(guard!.count, o.id).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it('the paid chapter’s maps, sites and all, pass the server check', () => {
    const maps = parseMaps(JSON.parse(JSON.stringify(TWO_LANDS_PARTS)));
    expect(maps.at(-1)!.objects.find((o) => o.id === 'ra-temple')).toMatchObject({ kind: 'sanctum', look: 'raTemple' });
    expect(() => parseMaps(JSON.parse(JSON.stringify([{ ...DELTA, objects: [{ id: 'bad', kind: 'sanctum', x: 1, y: 1, look: 'nowhere' }] }])))).toThrow(/legendary site/);
  });
});

describe('ranks on screen', () => {
  it('the unit card names the rank, the name in its colour', () => {
    const info = armyUnitInfo('spearman5', 3);
    expect(info.notes[0]).toBe('Legendary · level 5 of 5');
    expect(info.nameInk).toEqual(RIMS.orange.light);
    expect(armyUnitInfo('griffin3', 1).notes[0]).toBe('Rare · level 3 of 5');
    expect(armyUnitInfo('hydra', 1).nameInk).toBeUndefined();
    expect(armyUnitInfo('hydra', 1).notes.some((n) => /level/.test(n))).toBe(false);
  });

  it('frames each rank in its own colour, apart from the sides’ and the pick’s', () => {
    expect(Object.values(RANK_RIM)).toEqual(['grey', 'green', 'blue', 'purple', 'orange']);
    for (const r of Object.values(RANK_RIM)) for (const other of ['player', 'enemy', 'gold'] as const) expect(RIMS[r].mid).not.toEqual(RIMS[other].mid);
    expect(rimOfUnit('levy4')).toBe('purple');
    expect(rimOfUnit('wolf')).toBe('bronze');
  });

  it('shares the one palette with gear: the top grade orange, never the picked gold', () => {
    expect(QUALITIES.map((q) => QUALITY_RIM[q])).toEqual(['grey', 'green', 'blue', 'purple', 'orange']);
    expect(QUALITIES.map(qualityRank)).toEqual([1, 2, 3, 4, 5]);
    expect(QUALITY_NAMES.gold).toBe('Legendary');
    const top = ITEM_IDS.find((id) => itemQuality(id) === 'gold')!;
    expect(qualityInk(top)).toEqual(RIMS.orange.light);
  });

  it('tints a big panel softly toward the rank, and leaves a unit with none alone', () => {
    const base = [22, 15, 10, 255] as const;
    expect(rankTint(null, base)).toEqual(base);
    const epic = rankTint(4, base);
    expect(epic).not.toEqual(base);
    // Soft: still a dark well, nearer its own fill than the rank's colour.
    for (let i = 0; i < 3; i++) expect(Math.abs(epic[i]! - base[i]!)).toBeLessThan(Math.abs(RIMS.purple.mid[i]! - base[i]!) / 4);
    expect(epic[3]).toBe(255);
  });

  it('rings a ranked stack’s count badge in its colour, keeping the side’s fill', () => {
    const side = { fill: [54, 74, 150, 255], top: [150, 175, 235, 255] } as const;
    const plain = drawBadge(12, side);
    const ringed = drawBadge(12, side, RIMS.orange.mid);
    const at = (b: ReturnType<typeof drawBadge>, x: number, y: number): number[] => [...b.data.subarray((y * b.w + x) * 4, (y * b.w + x) * 4 + 4)];
    expect(at(ringed, 1, 5)).toEqual([...RIMS.orange.mid]);
    expect(at(plain, 1, 5)).toEqual([...side.fill]);
    // The outline and the fill within stay as they were.
    expect(at(ringed, 0, 5)).toEqual(at(plain, 0, 5));
    expect(at(ringed, 2, 3)).toEqual(at(plain, 2, 3));
  });

  it('Compare shows all five ranks where there is room, the top four on a narrow phone', () => {
    expect(compareColumns('seraph5').map((c) => c.id)).toEqual(lineUnits('seraph'));
    expect(compareColumns('seraph5').map((c) => c.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(columnsThatFit({ w: 320 })).toBe(4);
    expect(columnsThatFit({ w: 390 })).toBe(5);
    const four = compareColumns('seraph5', columnsThatFit({ w: 320 }));
    expect(four.map((c) => c.id)).toEqual(['seraph2', 'seraph3', 'seraph4', 'seraph5']);
    expect(four[0]!.cells.every((c) => !c.up)).toBe(true);
    const text = { nameLines: 2, costLines: 2, traitLines: 10, traitCount: 4 };
    for (const [w, h, n] of [[320, 568, 4], [390, 844, 5], [1400, 900, 5]] as const) {
      const l = compareLayout({ w, h }, n, text);
      expect(l.fits, `${w}×${h}`).toBe(true);
      expect(l.left + l.w).toBeLessThanOrEqual(w);
    }
  });
});
