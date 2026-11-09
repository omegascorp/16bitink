import { describe, expect, it } from 'vitest';
import { BLACK_BANNER, OTHRYS } from '../src/level/borderMarch';
import type { MapDef } from '../src/level/types';
import { kitProblems, parseMaps } from '../src/level/validate';
import { afterBattle, battleSides, rivalFromDef, startAdventure, type Adventure } from '../src/logic/adventure';
import { createBattle } from '../src/logic/battle';
import type { BattleState } from '../src/logic/battleTypes';
import { toBattleHero, type Hero } from '../src/logic/hero';
import { hireHero, tavernHeroes } from '../src/logic/heroes';
import { withGear, type Gear, type ItemId } from '../src/logic/items';
import { kitted } from '../src/logic/lord/kit';
import { mirrored } from '../src/logic/lord/mirror';
import { comesBack } from '../src/logic/lord/turn';
import { parseAdventure } from '../src/logic/save';
import { spoilsOf, stripped, takeSpoils } from '../src/logic/spoils';

// The map without the lord's own kit, so these tests set their own.
const { kit: _kit, ...rivalNoKit } = BLACK_BANNER.rival!;
const def: MapDef = { ...BLACK_BANNER, rival: rivalNoKit };
const korax = 'korax-town';
const KIT: Gear = { helm: 'bronzeHelm', belt: 'warBelt', boots: 'warSandals' };

/** Kassander out in the field, wearing `gear` and carrying `bag`. */
function geared(gear: Gear, bag: ItemId[] = []): Adventure {
  const start = startAdventure(def);
  const foe = start.rival!.hero!;
  return { ...start, prompts: [], rival: { ...start.rival!, hero: { ...foe, x: 60, y: 50, gear: { ...foe.gear, ...gear }, bag } } };
}
function wonBy(adv: Adventure, id: string, side: 0 | 1): BattleState {
  const s = battleSides(adv, id);
  const st = createBattle(s.attacker, s.defender, s.seed, s.siege).state;
  return { ...st, winner: side, stacks: st.stacks.map((x) => (x.side === side ? x : { ...x, count: 0 })) };
}
const holds = (h: Hero): ItemId[] => [...Object.values(h.gear ?? {}), ...(h.bag ?? [])];

describe('the beaten rival\'s gear', () => {
  it('the hero who beats him takes everything he wore and carried but his war machine', () => {
    const adv = geared(KIT, ['linenHood']);
    const won = afterBattle(adv, def, 'rival', wonBy(adv, 'rival', 0));
    expect(won.rival!.hero).toBeNull();
    expect(holds(won.hero)).toEqual(expect.arrayContaining(['bronzeHelm', 'warBelt', 'warSandals', 'linenHood']));
    expect(holds(won.hero)).not.toContain('catapult2');
    expect(won.prompts.some((p) => p.kind === 'message' && p.title === "Kassander's gear")).toBe(true);
  });

  it('a piece whose slot is taken goes in the bag, and with the bag full lies on the ground where the battle was', () => {
    const adv = geared({ ...KIT, cuirass: 'bronzeCuirass' }, ['linenHood', 'cordSash']);
    const full = { ...adv, hero: { ...adv.hero, gear: { ...adv.hero.gear, helm: 'scaleHelm' as ItemId }, bag: ['scaleCoat', 'scaleBracers', 'scaleGreaves'] as ItemId[] } };
    const won = afterBattle(full, def, 'rival', wonBy(full, 'rival', 0));
    expect(won.hero.bag).toHaveLength(4);
    const ground = won.objects.filter((o) => o.id.startsWith('spoils@'));
    expect(ground.length).toBeGreaterThan(0);
    for (const o of ground) {
      expect(o.kind).toBe('item');
      expect(Math.max(Math.abs(o.x - 60), Math.abs(o.y - 50))).toBeLessThanOrEqual(4);
    }
    // Nothing is lost: the hero and the ground hold all he had.
    const all = [...holds(won.hero), ...ground.map((o) => o.item!)];
    for (const id of spoilsOf(full.rival!.hero!)) expect(all).toContain(id);
    // The ground survives a reload.
    const back = parseAdventure(JSON.parse(JSON.stringify(won)), def)!;
    expect(back.objects.filter((o) => o.id.startsWith('spoils@'))).toEqual(ground);
  });

  it('fled to his town, he keeps it all', () => {
    const adv = geared(KIT);
    const s = battleSides(adv, 'rival');
    const st = createBattle(s.attacker, s.defender, s.seed).state;
    const fled = afterBattle(adv, def, 'rival', { ...st, winner: 0, fled: 1, active: null });
    expect(fled.rival!.hero!.gear).toMatchObject(KIT);
    expect(holds(fled.hero)).not.toContain('warBelt');
  });

  it('held by its garrison alone, the town keeps his gear in its store (as room allows)', () => {
    const adv = geared(KIT);
    const store = { ...adv, rival: { ...adv.rival!, hero: { ...adv.rival!.hero!, x: 1, y: 1 } } };
    const town = store.towns[0]!;
    const withStore = { ...store, towns: store.towns.map((t) => (t.id === town.id ? { ...t, built: [...t.built, 'storehouse' as never] } : t)) };
    const out = takeSpoils(withStore, def, adv.rival!.hero!, { x: town.x, y: town.y }, withStore.towns[0]!);
    expect(out.towns[0]!.store).toEqual(['bronzeHelm', 'warBelt', 'warSandals']);
  });

  it('one-way: in the lord\'s chair nothing is taken from our heroes', () => {
    const adv = { ...startAdventure(def), hero: { ...startAdventure(def).hero, gear: KIT } };
    const m = mirrored(adv);
    expect(takeSpoils(m, def, adv.hero, { x: 1, y: 1 })).toBe(m);
  });

  it('a beaten lord\'s hero is remembered without his gear, and comes back the next week without it', () => {
    const lord: MapDef = { ...OTHRYS, rival: { ...OTHRYS.rival!, kit: { lykaon: KIT } } };
    const start = startAdventure(lord);
    const foe = start.rival!.hero!;
    expect(foe.gear).toMatchObject(KIT);
    // A lord after his first night: his other heroes (none yet) and fog are kept.
    const adv: Adventure = { ...start, prompts: [], hero: { ...start.hero, x: foe.x + 1, y: foe.y }, rival: { ...start.rival!, others: [] } };
    const won = afterBattle(adv, lord, 'rival', wonBy(adv, 'rival', 0));
    const fallen = won.rival!.fallen![0]!.hero;
    expect(fallen.gear).toEqual({ machine: foe.gear!.machine });
    const back = comesBack({ ...won, day: won.day + 7 }, lord);
    const again = [back.rival!.hero, ...(back.rival!.others ?? [])].find((h) => h?.id === 'lykaon');
    expect(again?.gear).toEqual({ machine: foe.gear!.machine });
    expect(stripped({ ...foe, bag: ['linenHood'] }).bag).toBeUndefined();
  });
});

describe('lords wear gear at no cost to their balance', () => {
  it('a kit lowers his four stats by what it adds: in battle he is as tuned', () => {
    const plain = startAdventure(def).rival!.hero!;
    const lord: MapDef = { ...BLACK_BANNER, rival: { ...BLACK_BANNER.rival!, kit: { kassander: KIT } } };
    const worn = rivalFromDef(lord);
    expect(worn.gear).toMatchObject({ ...KIT, machine: plain.gear!.machine });
    expect(worn.defense).toBe(plain.defense - 1);
    expect(worn.attack).toBe(plain.attack - 1);
    const a = withGear(worn);
    const b = withGear(plain);
    expect([a.attack, a.defense, a.power, a.knowledge]).toEqual([b.attack, b.defense, b.power, b.knowledge]);
    // The War Belt's morale is a real gain: only the four stats are paid back.
    expect(toBattleHero(worn).morale).toBe(toBattleHero(plain).morale + 1);
    expect(kitProblems(lord)).toEqual([]);
  });

  it('counts a set bonus in what it pays back', () => {
    const plain = startAdventure(def).rival!.hero!;
    const worn = kitted(plain, { helm: 'myrmidonHelm', cuirass: 'myrmidonCuirass' });
    expect(withGear(worn).attack).toBe(withGear(plain).attack);
    expect(withGear(worn).defense).toBe(withGear(plain).defense);
  });

  it('his Tavern\'s hires wear theirs, ours never do', () => {
    const adv = startAdventure(OTHRYS);
    const town = adv.towns.find((t) => t.built.includes('tavern'))!;
    const rich = { ...adv, purse: { ...adv.purse, gold: 99999 }, towns: adv.towns.map((t) => (t.id === town.id ? { ...t, owner: 'player' as const } : t)) };
    const open: MapDef = { ...OTHRYS, recruits: undefined };
    const offered = tavernHeroes(rich, open, town, 'lord')[0]!;
    const lord: MapDef = { ...open, rival: { ...OTHRYS.rival!, kit: { [offered.id]: { helm: 'bronzeHelm' } } } };
    const lords = hireHero(rich, lord, town.id, offered.id, 'lord');
    expect(lords?.hero).toMatchObject({ id: offered.id, gear: { helm: 'bronzeHelm' } });
    expect(lords!.hero.defense).toBe(Math.max(0, offered.defense - 1));
    const ours = hireHero(rich, lord, town.id, tavernHeroes(rich, lord, town, 'player')[0]!.id, 'player');
    expect(ours?.hero.gear?.helm).toBeUndefined();
  });

  it('a kit that would push a stat below 0 is refused', () => {
    const lord: MapDef = { ...BLACK_BANNER, rival: { ...BLACK_BANNER.rival!, kit: { kassander: { book: 'alexandrianCodex', helm: 'orphicCirclet', cuirass: 'orphicRobe' } } } };
    const low = { ...lord, rival: { ...lord.rival!, hero: { ...lord.rival!.hero, power: 0, knowledge: 0 } } };
    expect(kitProblems(low).length).toBeGreaterThan(0);
    const bad = (kit: unknown): unknown => [{ ...JSON.parse(JSON.stringify(BLACK_BANNER)), id: 'x-kit', n: 6, rival: { ...JSON.parse(JSON.stringify(BLACK_BANNER.rival)), kit } }];
    expect(() => parseMaps(bad({ kassander: { helm: 'warBelt' } }))).toThrow();
  });
});
