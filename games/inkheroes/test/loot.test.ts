import { describe, expect, it } from 'vitest';
import { ASHFORD, BLACK_BANNER, OTHRYS, THORNWOOD } from '../src/level/borderMarch';
import { DELTA } from '../src/level/twoLands';
import type { MapDef } from '../src/level/types';
import { afterBattle, battleSides, startAdventure, type Adventure } from '../src/logic/adventure';
import { createBattle } from '../src/logic/battle';
import type { BattleState } from '../src/logic/battleTypes';
import type { Hero } from '../src/logic/hero';
import { itemDef, type ItemId } from '../src/logic/items';
import { chestHoldsPiece, chestPiece, DROP_CHANCE, dropOf, gradeOn, lootFaction, partOf, pickPiece } from '../src/logic/loot';
import type { MapObject } from '../src/logic/objects';
import { rivalTurn } from '../src/logic/rival';
import { parseAdventure } from '../src/logic/save';

/** A map of `n` guard groups of growing strength, each with an id of its own (a part 1 or part 4 of chapter 1). */
function guards(n: number, part: 1 | 4, seed = 7): MapDef {
  const objects: MapObject[] = Array.from({ length: n }, (_, i) => ({ id: `g${i}`, kind: 'monster', x: 1, y: 1, creature: 'wolf', count: 1 + i }));
  return { ...(part === 1 ? ASHFORD : OTHRYS), id: `fixture-${part}-${n}`, n: part, objects, seed };
}

/** A battle `side` has won outright. */
function wonBy(adv: Adventure, id: string, side: 0 | 1): BattleState {
  const s = battleSides(adv, id);
  const st = createBattle(s.attacker, s.defender, s.seed, s.siege).state;
  return { ...st, winner: side, stacks: st.stacks.map((x) => (x.side === side ? x : { ...x, count: 0 })) };
}

const nobody: readonly Pick<Hero, 'gear' | 'bag'>[] = [];

describe('random drops', () => {
  it('are fixed by the map seed and the group: the same roll every time, another seed another roll', () => {
    const def = guards(40, 4);
    const rolls = def.objects.map((o) => dropOf(def, o, nobody));
    expect(def.objects.map((o) => dropOf(def, o, nobody))).toEqual(rolls);
    const other = { ...def, seed: 99 };
    expect(other.objects.map((o) => dropOf(other, o, nobody))).not.toEqual(rolls);
  });

  it('a hand-placed drop always wins', () => {
    const goblins = ASHFORD.objects.find((o) => o.id === 'goblins')!;
    expect(dropOf(ASHFORD, goblins, nobody)).toBe('bronzeHelm');
  });

  it('grow likelier with a group\'s strength rank: 25% for the weakest to 75% for the strongest, about 1 in 2 over all', () => {
    let weak = 0;
    let strong = 0;
    let all = 0;
    let groups = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const def = guards(9, 1, seed);
      const got = def.objects.map((o) => !!dropOf(def, o, nobody));
      weak += got[0] ? 1 : 0;
      strong += got[8] ? 1 : 0;
      all += got.filter(Boolean).length;
      groups += got.length;
    }
    expect(weak / 400).toBeCloseTo(DROP_CHANCE.weakest, 1);
    expect(strong / 400).toBeCloseTo(DROP_CHANCE.strongest, 1);
    expect(all / groups).toBeGreaterThan(0.44);
    expect(all / groups).toBeLessThan(0.56);
  });

  it('roll the grade on the part\'s row, and part 4\'s strongest quarter on the last row', () => {
    const count = (row: number): Record<string, number> => {
      const out: Record<string, number> = {};
      for (let i = 0; i < 2000; i++) out[gradeOn(row, (i + 0.5) / 2000)] = (out[gradeOn(row, (i + 0.5) / 2000)] ?? 0) + 1;
      return out;
    };
    expect(count(1)).toEqual({ gray: 1700, green: 300 });
    expect(count(5)).toEqual({ gray: 300, green: 800, blue: 640, purple: 260 });
    // Part 1 never gives blue or purple.
    const def = guards(30, 1);
    const grades = new Set(def.objects.map((o) => dropOf(def, o, nobody)).filter((x): x is ItemId => !!x).map((id) => itemDef(id).quality));
    expect([...grades].every((g) => g === 'gray' || g === 'green')).toBe(true);
  });

  it('know each object\'s part within its chapter, from the part that brought it', () => {
    expect(partOf(OTHRYS, 'goblins')).toBe(1);
    expect(partOf(OTHRYS, OTHRYS.objects.find((o) => o.id === 'coast-brigands')?.id ?? 'othrys-coast-brigands')).toBe(4);
    expect(partOf(THORNWOOD, THORNWOOD.objects.at(-1)!.id)).toBe(2);
  });

  it('come from the chapter\'s people: Greek pieces in chapter 1, Egyptian in chapter 2', () => {
    expect(lootFaction(OTHRYS)).toBe('crown');
    expect(lootFaction(DELTA)).toBe('kemet');
    const def = { ...guards(40, 4), hero: DELTA.hero };
    const pieces = def.objects.map((o) => dropOf(def, o, nobody)).filter((x): x is ItemId => !!x);
    expect(pieces.length).toBeGreaterThan(0);
    expect(pieces.every((id) => itemDef(id).faction === 'kemet')).toBe(true);
  });

  it('are about 1 in 3 pieces never in a set, and lean 3× to a set started and 3× again to its missing slots', () => {
    let loose = 0;
    let corinthian = 0;
    let missing = 0;
    const holder = { gear: { helm: 'corinthianHelm' as ItemId } };
    for (let i = 0; i < 3000; i++) {
      const id = pickPiece('crown', 'green', false, (i + 0.5) / 3000, [holder])!;
      if (itemDef(id).set === 'corinthian') corinthian += 1;
      if (itemDef(id).set === 'corinthian' && itemDef(id).slot !== 'helm') missing += 1;
      if (!itemDef(pickPiece('crown', 'green', i % 3 === 0, 0.5, [])!).set) loose += 1;
    }
    expect(loose).toBe(1000);
    // Weights: Corinthian helm 3, its 5 missing slots 9 each, the Delphic set's 6 pieces 1 each: 48 of 54.
    expect(corinthian / 3000).toBeCloseTo(48 / 54, 2);
    expect(missing / 3000).toBeCloseTo(45 / 54, 2);
  });

  it('fall back to a lower grade when the catalog has none at the one rolled', () => {
    const id = pickPiece('crown', 'gold', true, 0.3, []);
    expect(id && itemDef(id).quality).toBe('purple');
  });

  it('go to the hero who beat the group, and survive a reload', () => {
    const def = guards(12, 1);
    const hit = def.objects.find((o) => dropOf(def, o, nobody))!;
    const adv = { ...startAdventure(def), prompts: [] };
    const won = afterBattle(adv, def, hit.id, wonBy(adv, hit.id, 0));
    const piece = dropOf(def, hit, nobody)!;
    expect([...Object.values(won.hero.gear ?? {}), ...(won.hero.bag ?? [])]).toContain(piece);
    expect(won.prompts.some((p) => p.kind === 'message' && p.item === piece)).toBe(true);
  });

  it('the rival gets the drop of a group he beats, by the same roll', () => {
    const def = BLACK_BANNER;
    const start = startAdventure(def);
    const foe = start.rival!.hero!;
    const wolves: MapObject = { id: 'test-wolves', kind: 'monster', x: foe.x - 1, y: foe.y + 1, creature: 'goblin', count: 1, drop: 'warBelt' };
    const lone: Adventure = { ...start, objects: [wolves], rival: { ...start.rival!, purse: { ...start.rival!.purse, gold: 0 } } };
    const after = rivalTurn(lone, def).adv;
    expect(after.objects.find((o) => o.id === 'test-wolves')?.gone).toBe(true);
    expect(after.rival!.hero!.gear?.belt).toBe('warBelt');
  });
});

describe('chests', () => {
  it('1 in 4 hold a piece, fixed by the map\'s seed', () => {
    const chests = Array.from({ length: 800 }, (_, i): MapObject => ({ id: `chest-${i}`, kind: 'chest', x: 1, y: 1, gold: 1000 }));
    const def = { ...OTHRYS, objects: chests };
    const share = chests.filter((c) => chestHoldsPiece(def, c)).length / chests.length;
    expect(share).toBeGreaterThan(0.2);
    expect(share).toBeLessThan(0.3);
    expect(chests.map((c) => chestHoldsPiece(def, c))).toEqual(chests.map((c) => chestHoldsPiece(def, c)));
  });

  it('the piece shows on the chest\'s card, survives a reload, and the rival takes it too', () => {
    const chest = ASHFORD.objects.find((o) => o.id === 'chest-glade')!;
    expect(chestPiece(ASHFORD, chest, nobody)).toBe('oliveWoodRing');
    const adv: Adventure = { ...startAdventure(ASHFORD), prompts: [{ kind: 'chest', id: chest.id, gold: 1500, xp: 1000, item: 'oliveWoodRing' }] };
    expect(parseAdventure(JSON.parse(JSON.stringify(adv)), ASHFORD)!.prompts[0]).toMatchObject({ kind: 'chest', item: 'oliveWoodRing' });
    // A chest of gold can't be saved as one holding a piece.
    const east = { ...adv, prompts: [{ kind: 'chest' as const, id: 'chest-east', gold: 1000, xp: 500, item: 'oliveWoodRing' as ItemId }] };
    expect(parseAdventure(JSON.parse(JSON.stringify(east)), ASHFORD)!.prompts[0]).not.toHaveProperty('item');
    // The rival beside it rides over and takes the piece instead of gold.
    const def = BLACK_BANNER;
    const start = startAdventure(def);
    const foe = start.rival!.hero!;
    const lone: Adventure = { ...start, objects: [{ ...chest, x: foe.x - 1, y: foe.y + 1 }], rival: { ...start.rival!, purse: { ...start.rival!.purse, gold: 0 } } };
    const after = rivalTurn(lone, def).adv;
    if (chestHoldsPiece(def, chest)) {
      expect(after.rival!.purse.gold).toBeLessThan(1000);
      expect([...Object.values(after.rival!.hero!.gear ?? {}), ...(after.rival!.hero!.bag ?? [])]).toContain(chestPiece(def, chest, [foe]));
    }
    expect(after.objects[0]!.gone).toBe(true);
  });
});
