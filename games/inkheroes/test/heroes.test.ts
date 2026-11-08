import { describe, expect, it } from 'vitest';
import { ASHFORD, BLACK_BANNER, THORNWOOD } from '../src/level/borderMarch';
import { afterBattle, battleSides, endDay, garrisonHero, leadOut, unfinished, gridOf, isSeen, ourHeroes, RIVAL, startAdventure, stepHero, terrainView, townById, type Adventure } from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { createBattle } from '../src/logic/battle';
import { cantHireHero, HERO_COST, hireHero, recruitsLeft, selectHero, sendAll, swapTownHeroes, townHeroes, trade } from '../src/logic/heroes';
import { passable, tileIndex } from '../src/logic/map';
import { rivalTurn } from '../src/logic/rival';
import { parseAdventure } from '../src/logic/save';

const ashford = 'ashford-town';
/** Part 2 with the hero at Ashford's gate. */
const atHome = (): Adventure => {
  const a = startAdventure(THORNWOOD);
  const t = townById(a, ashford)!;
  return { ...a, prompts: [], hero: { ...a.hero, x: t.x, y: t.y } };
};

describe('hiring a second hero', () => {
  it('is not offered on map 1: no hero comes to the Tavern yet', () => {
    const a = startAdventure(ASHFORD);
    expect(cantHireHero(a, ASHFORD, townById(a, ashford)!)).toMatch(/No hero/);
    expect(hireHero(a, ASHFORD, ashford)).toBeNull();
  });

  it('opens from part 2: Ianthe joins for 2500 gold, in the town\'s gate, and is picked', () => {
    const a = { ...startAdventure(THORNWOOD), prompts: [] };
    const t = townById(a, ashford)!;
    expect(cantHireHero(a, THORNWOOD, t)).toBeNull();
    const hired = hireHero(a, THORNWOOD, ashford)!;
    expect(hired.hero).toMatchObject({ name: 'Ianthe', heroClass: 'cleric', x: t.x, y: t.y });
    expect(hired.purse.gold).toBe(a.purse.gold - HERO_COST.gold);
    expect(hired.others!.map((h) => h.name)).toEqual(['Rowan']);
    expect(townHeroes(hired, t).visitor?.id).toBe('ianthe');
    expect(isSeen(hired, THORNWOOD, t.x, t.y)).toBe(true);
    // One each: none left to hire.
    expect(recruitsLeft(hired, THORNWOOD)).toEqual([]);
    expect(cantHireHero(hired, THORNWOOD, townById(hired, ashford)!)).toMatch(/already rides|stands in the gate/);
  });

  it('needs the gate free: a hero standing in it moves into the garrison first, and the two share the town', () => {
    const a = atHome();
    const t = townById(a, ashford)!;
    expect(cantHireHero(a, THORNWOOD, t)).toMatch(/Rowan stands in the gate/);
    expect(hireHero(a, THORNWOOD, ashford)).toBeNull();
    const kept = garrisonHero(a)!;
    const hired = hireHero(kept, THORNWOOD, ashford)!;
    const both = townHeroes(hired, townById(hired, ashford)!);
    expect(both.garrison?.id).toBe('rowan');
    expect(both.visitor?.id).toBe('ianthe');
    expect(hired.hero.id).toBe('ianthe');
    // Rowan can't lead out past her, and she can't join a garrison he holds: they change places instead.
    expect(leadOut(selectHero(hired, 'rowan'))).toEqual(selectHero(hired, 'rowan'));
    expect(garrisonHero(hired)).toBeNull();
    const swapped = swapTownHeroes(hired, ashford)!;
    const after = townHeroes(swapped, townById(swapped, ashford)!);
    expect(after.garrison?.id).toBe('ianthe');
    expect(after.visitor?.id).toBe('rowan');
    expect(after.visitor!.army).toEqual(townById(hired, ashford)!.garrison);
    expect(townById(swapped, ashford)!.garrison).toEqual(both.visitor!.army);
    // A save keeps both in the one town.
    expect(parseAdventure(JSON.parse(JSON.stringify(swapped)), THORNWOOD)).toEqual(swapped);
  });

  it('needs a Tavern and the gold', () => {
    const a = { ...startAdventure(THORNWOOD), prompts: [] };
    const t = townById(a, ashford)!;
    expect(cantHireHero(a, THORNWOOD, { ...t, built: t.built.filter((b) => b !== 'tavern') })).toMatch(/Tavern/);
    expect(cantHireHero({ ...a, purse: { ...a.purse, gold: 100 } }, THORNWOOD, t)).toMatch(/2500/);
  });
});

describe('two heroes on the map', () => {
  /** Ianthe hired in Ashford's gate, Rowan out on the north road. */
  const two = (): Adventure => hireHero({ ...startAdventure(THORNWOOD), prompts: [] }, THORNWOOD, ashford)!;

  it('picks either one; the other waits where they stand', () => {
    const a = two();
    const back = selectHero(a, 'rowan');
    expect(back.hero.name).toBe('Rowan');
    expect(back.others!.map((h) => h.id)).toEqual(['ianthe']);
    expect(selectHero(back, 'nobody')).toBe(back);
  });

  it('both rest at night', () => {
    const a = two();
    const tired = { ...a, hero: { ...a.hero, mp: 0 }, others: a.others!.map((h) => ({ ...h, mp: 0 })) };
    const next = endDay(tired);
    expect(ourHeroes(next).every((h) => h.mp > 0)).toBe(true);
  });

  it('asks before the day ends while any hero can still move, picked or not', () => {
    const a = two();
    const moves = (adv: Adventure): string[] => unfinished(adv, THORNWOOD).filter((l) => l.includes('move'));
    expect(moves(a)).toEqual(['Ianthe can still move today.', 'Rowan can still move today.']);
    const pickedTired = { ...a, hero: { ...a.hero, mp: 0 } };
    expect(moves(pickedTired)).toEqual(['Rowan can still move today.']);
    const allTired = { ...pickedTired, others: a.others!.map((h) => ({ ...h, mp: 0 })) };
    expect(moves(allTired)).toEqual([]);
  });

  it('walking into the other hero is a meeting, and they trade companies', () => {
    const a = two();
    const rowan = a.others![0]!;
    const view = terrainView(a, THORNWOOD);
    expect(view.visit!.has(tileIndex(view.grid, rowan.x, rowan.y))).toBe(true);
    const step = stepHero(a, THORNWOOD, { x: rowan.x, y: rowan.y, cost: 100, day: 0 } as never);
    expect(step).toMatchObject({ stop: true, meet: 'rowan' });
    const beside = { ...a, hero: { ...a.hero, x: rowan.x + 1, y: rowan.y } };
    const moved = sendAll(beside.hero.army, rowan.army)!;
    const traded = trade(beside, 'ianthe', moved.from, 'rowan', moved.to)!;
    expect(traded.hero.army.filter(Boolean)).toHaveLength(1);
    // Nothing made from nothing, and nobody left leading no one.
    expect(trade(beside, 'ianthe', armyOf([{ creature: 'griffin', count: 99 }]), 'rowan', rowan.army)).toBeNull();
    expect(trade(beside, 'ianthe', armyOf([]), 'rowan', [...rowan.army])).toBeNull();
  });

  it('losing with one hero falls that hero only; the last one falling loses the map', () => {
    const a = two();
    const s = battleSides(a, THORNWOOD.objects.find((o) => o.kind === 'monster')!.id);
    const lost = { ...createBattle(s.attacker, s.defender, s.seed).state, winner: 1 as const };
    const after = afterBattle(a, THORNWOOD, THORNWOOD.objects.find((o) => o.kind === 'monster')!.id, lost);
    expect(after.status).toBe('playing');
    expect(after.hero.name).toBe('Rowan');
    expect(after.others).toEqual([]);
    const again = afterBattle(after, THORNWOOD, THORNWOOD.objects.find((o) => o.kind === 'monster')!.id, lost);
    expect(again.status).toBe('lost');
  });

  it('saves and loads both, whichever is picked', () => {
    for (const a of [two(), selectHero(two(), 'rowan')]) {
      expect(parseAdventure(JSON.parse(JSON.stringify(a)), THORNWOOD)).toEqual(a);
    }
    const a = two();
    const twice = { ...a, others: [a.others![0]!, a.others![0]!] };
    expect(parseAdventure(JSON.parse(JSON.stringify(twice)), THORNWOOD)).toBeNull();
  });
});

describe('the rival and a second hero', () => {
  it('goes for whichever of ours is weak, and the fight is played with that hero picked', () => {
    const start = { ...startAdventure(BLACK_BANNER), prompts: [] };
    const eudora = townById(start, 'eudora-town')!;
    const hired = hireHero(start, BLACK_BANNER, eudora.id)!;
    // Ianthe out in the open, two tiles from where the rival will stand.
    const g = gridOf(BLACK_BANNER);
    const spot = [...Array(12).keys()].map((d) => ({ x: eudora.x + 3 + d, y: eudora.y + 2 })).find((p) => passable(g, p.x, p.y) && passable(g, p.x + 2, p.y))!;
    const ianthe = { ...hired.hero, ...spot };
    const rowanPicked = selectHero({ ...hired, hero: ianthe }, 'rowan');
    const foe = { ...rowanPicked.rival!.hero!, x: ianthe.x + 2, y: ianthe.y, army: armyOf([{ creature: 'swordsman', count: 40 }]) };
    // Ianthe weak out in the field, Rowan picked and strong.
    const adv = { ...rowanPicked, others: [{ ...ianthe, army: armyOf([{ creature: 'spearman', count: 2 }]) }], rival: { ...rowanPicked.rival!, hero: foe } };
    const r = rivalTurn(adv, BLACK_BANNER);
    expect(r.report.fight).toBe(RIVAL);
    expect(r.adv.hero.id).toBe('ianthe');
  });
});
