import { describe, expect, it } from 'vitest';
import { BLACK_BANNER, OTHRYS } from '../src/level/borderMarch';
import { DELTA, RED_LAND } from '../src/level/twoLands';
import { mapById } from '../src/level/maps';
import { openBy, openIn, TWO_LANDS_UNLOCKS } from '../src/level/unlocks';
import { afterBattle, battleSides, garrisonHero, PORTAL, startAdventure, townById, weekOf, type Adventure } from '../src/logic/adventure';
import { armyOf, isEmptyArmy } from '../src/logic/army';
import { createBattle } from '../src/logic/battle';
import type { BattleState } from '../src/logic/battleTypes';
import { BUILDINGS, type BuildingId } from '../src/logic/buildings';
import { buildingOf } from '../src/logic/factions';
import { townHeroes } from '../src/logic/heroes';
import { fitsSlot, ITEM_IDS, SLOTS, type Gear, type ItemId } from '../src/logic/items';
import { NO_MEMORY, type LordMemory } from '../src/logic/lord/knowledge';
import { portalDuty } from '../src/logic/lord/portal';
import { cantStepThrough, portalLevel, portalTowns, stepThrough } from '../src/logic/portal';
import { cantFightMob, mobBase, mobKinds, mobLoot, mobOdds, portalMob, weekMob } from '../src/logic/portalMob';
import { strengthOf } from '../src/logic/creatures';
import { loadAdventure, saveAdventure } from '../src/logic/save';
import { forSale, sellPiece } from '../src/logic/sell';
import { cantStore, keptIn, sharedRoom, sharedWith, storeItem, storeOf, takeStored } from '../src/logic/storage';
import { armyStrength } from '../src/logic/strength';
import { BUILD_PLANS } from '../src/logic/town';

const KORAX = 'korax-town';
const THORN = 'thornwood-town';
const EUDORA = 'eudora-town';
const ASHFORD = 'ashford-town';
const ALL: readonly BuildingId[] = ['storehouse', 'treasury', 'portal', 'portal2', 'portal3'];

/** `adv` with town `id` given `more` buildings. */
function withBuilt(adv: Adventure, id: string, more: readonly BuildingId[]): Adventure {
  return { ...adv, towns: adv.towns.map((t) => (t.id === id ? { ...t, built: [...new Set([...t.built, ...more])] } : t)) };
}

/** Othrys with Rowan at Korax's gate, no cards waiting, and the towns built as given. */
function othrys(built: Readonly<Record<string, readonly BuildingId[]>> = { [KORAX]: ALL, [THORN]: ALL }): Adventure {
  const a = startAdventure(OTHRYS);
  const korax = townById(a, KORAX)!;
  const placed: Adventure = { ...a, prompts: [], hero: { ...a.hero, x: korax.x, y: korax.y } };
  return Object.entries(built).reduce((x, [id, b]) => withBuilt(x, id, b), placed);
}

const withStore = (adv: Adventure, id: string, store: readonly ItemId[]): Adventure => ({ ...adv, towns: adv.towns.map((t) => (t.id === id ? { ...t, store } : t)) });
const full = (n: number): ItemId[] => Array.from({ length: n }, () => 'warBelt' as const);

/** A battle `side` has won outright. */
function wonBy(adv: Adventure, id: string, side: 0 | 1): BattleState {
  const s = battleSides(adv, id, OTHRYS);
  const st = createBattle(s.attacker, s.defender, s.seed, s.siege).state;
  return { ...st, winner: side, stacks: st.stacks.map((x) => (x.side === side ? x : { ...x, count: 0 })) };
}

describe('the Portal: buildings', () => {
  it('climbs three levels: the Portal on a Storehouse, the Summoning Portal on it, the Great Portal on that and the Treasury', () => {
    expect(BUILDINGS.portal.needs).toEqual(['storehouse']);
    expect(BUILDINGS.portal2.needs).toEqual(['portal']);
    expect(BUILDINGS.portal3.needs).toEqual(['portal2', 'treasury']);
    expect(BUILDINGS.portal3.cost.crystal).toBeGreaterThan(0);
    expect(portalLevel({ built: [] })).toBe(0);
    expect(portalLevel({ built: ['storehouse', 'portal', 'portal2'] })).toBe(2);
    expect(portalLevel({ built: ALL })).toBe(3);
  });

  it('Egypt names it its own way', () => {
    expect(buildingOf('kemet', 'portal').name).toBe('Shrine of Wepwawet');
    expect(buildingOf('kemet', 'portal2').name).toBe('Gate of the Duat');
    expect(buildingOf('kemet', 'portal3').name).toBe('Great Gate of Wepwawet');
    expect(buildingOf('kemet', 'portal3').says).toMatch(/Great Gate/);
  });

  it('opens with the Treasury (map 3, part 3), its mob and its way between towns on the chapter\'s last part', () => {
    // One level a part from the second, where the second hero comes and guards start to sit idle (user, Nov 10).
    expect(openBy(1).has('portal')).toBe(false);
    expect(openBy(2).has('portal')).toBe(true);
    expect(openBy(2).has('portal2')).toBe(false);
    expect(openBy(3).has('portal2')).toBe(true);
    expect(openBy(3).has('portal3')).toBe(false);
    expect(openBy(4).has('portal3')).toBe(true);
    expect(BLACK_BANNER.off).not.toContain('portal2');
    expect(BLACK_BANNER.off).toContain('portal3');
    expect(OTHRYS.off).not.toContain('portal3');
    expect(openIn(TWO_LANDS_UNLOCKS, 2).has('portal')).toBe(true);
    expect(openIn(TWO_LANDS_UNLOCKS, 3).has('portal2')).toBe(true);
    expect(RED_LAND.off).toContain('portal3');
    expect(DELTA.off).not.toContain('portal3');
  });

  it('comes last in both peoples\' plans, so a lord builds it once all else stands', () => {
    for (const plan of Object.values(BUILD_PLANS)) expect(plan.slice(-3)).toEqual(['portal', 'portal2', 'portal3']);
  });
});

describe('the Portal: one store for every Portal town', () => {
  it('joins the stores of the Portal towns, their rooms together; a town without one keeps its own', () => {
    const a = withBuilt(othrys(), EUDORA, ['storehouse']);
    expect(sharedWith(a, townById(a, KORAX)!).map((t) => t.id)).toEqual([KORAX, THORN]);
    expect(sharedRoom(a, townById(a, KORAX)!)).toBe(40);
    expect(sharedWith(a, townById(a, EUDORA)!).map((t) => t.id)).toEqual([EUDORA]);
    expect(sharedRoom(a, townById(a, EUDORA)!)).toBe(8);
  });

  it('takes a piece kept in another Portal town, and leaves one here first, there once here is full', () => {
    const a = withStore(othrys(), THORN, ['linenHood']);
    const rowan = { ...a.hero, bag: ['warBelt' as const] };
    const b = { ...a, hero: rowan };
    expect(keptIn(b, townById(b, KORAX)!)).toEqual(['linenHood']);
    const took = takeStored(b, KORAX, rowan.id, 0)!;
    expect(storeOf(townById(took, THORN)!)).toEqual([]);
    expect([...Object.values(took.hero.gear ?? {}), ...(took.hero.bag ?? [])]).toContain('linenHood');
    const here = storeItem(b, KORAX, rowan.id, { bag: 0 })!;
    expect(storeOf(townById(here, KORAX)!)).toEqual(['warBelt']);
    const packed = withStore(b, KORAX, full(20));
    const there = storeItem(packed, KORAX, rowan.id, { bag: 0 })!;
    expect(storeOf(townById(there, THORN)!)).toEqual(['linenHood', 'warBelt']);
    const brim = withStore(packed, THORN, full(20));
    expect(cantStore(brim, KORAX, rowan.id, { bag: 0 })).toMatch(/full/);
  });

  it('a Portal town lost takes its own pieces with it', () => {
    const a = withStore(withStore(othrys(), THORN, ['linenHood']), KORAX, ['warBelt']);
    const lost = { ...a, towns: a.towns.map((t) => (t.id === THORN ? { ...t, owner: 'rival' as const } : t)) };
    expect(keptIn(lost, townById(lost, KORAX)!)).toEqual(['warBelt']);
  });

  it('sells from the shared store at a Marketplace', () => {
    const a = withBuilt(withStore(othrys(), THORN, ['linenHood']), KORAX, ['marketplace']);
    const lot = forSale(a, KORAX).find((l) => l.ref.kind === 'store')!;
    expect(lot.id).toBe('linenHood');
    const sold = sellPiece(a, KORAX, lot.ref)!;
    expect(storeOf(townById(sold, THORN)!)).toEqual([]);
    expect(sold.purse.gold).toBe(a.purse.gold + lot.price);
  });
});

describe('the Portal: the week\'s band', () => {
  it('is fixed by the game, the town and the week: one of the map\'s guard kinds, growing week by week', () => {
    const a = othrys();
    const korax = townById(a, KORAX)!;
    const mob = weekMob(a, OTHRYS, korax)!;
    expect(weekMob(a, OTHRYS, korax)).toEqual(mob);
    expect(mobKinds(OTHRYS)).toContain(mob.creature);
    expect(mob.xp).toBeGreaterThan(0);
    // Each week of the part a new band, a fifth of the part's middle guard stronger (counted in whole creatures).
    const weeks = Array.from({ length: 12 }, (_, w) => weekMob({ ...a, day: a.day + w * 7 }, OTHRYS, korax)!);
    expect(new Set(weeks.map((m) => m.creature)).size).toBeGreaterThan(1);
    weeks.forEach((m, w) => {
      const aim = mobBase(OTHRYS) * (1 + 0.2 * w);
      expect(Math.abs(m.count * strengthOf(m.creature, 1) - aim)).toBeLessThanOrEqual(strengthOf(m.creature, 1) / 2 + 1e-6);
    });
    expect(weekMob(withBuilt(startAdventure(OTHRYS), KORAX, ['storehouse', 'portal']), OTHRYS, townById(startAdventure(OTHRYS), KORAX)!)).toBeNull();
  });

  it('reads as weak, about even or dangerous against an army, and names the grade it may carry', () => {
    expect(mobOdds({ strength: 100 }, 1000)).toBe('weak');
    expect(mobOdds({ strength: 1000 }, 1000)).toBe('about even');
    expect(mobOdds({ strength: 3000 }, 1000)).toBe('dangerous');
    expect(mobOdds({ strength: 1 }, 0)).toBe('dangerous');
    expect(mobLoot({ grade: 'blue' })).toBe('may carry a Rare piece');
    expect(mobLoot({ grade: 'purple' })).toBe('may carry an Epic piece');
  });

  it('says why a hero can\'t fight it: not in such a town, no movement, no army, the garrison taken', () => {
    const a = othrys();
    expect(cantFightMob(a, OTHRYS)).toBeNull();
    expect(cantFightMob({ ...a, hero: { ...a.hero, x: a.hero.x + 1 } }, OTHRYS)).toMatch(/must be in a town/);
    expect(cantFightMob({ ...a, hero: { ...a.hero, mp: 0 } }, OTHRYS)).toMatch(/no movement/);
    const kept = garrisonHero(a)!;
    // Ianthe at the gate, Rowan in the garrison: beaten, she would have nowhere to come home to.
    const gate = { ...kept, hero: { ...a.hero, id: 'ianthe', name: 'Ianthe' }, others: [kept.hero] };
    expect(cantFightMob(gate, OTHRYS)).toMatch(/Rowan holds the garrison/);
    const bare = { ...kept, towns: kept.towns.map((t) => (t.id === KORAX ? { ...t, garrison: armyOf([]) } : t)) };
    expect(cantFightMob(bare, OTHRYS)).toMatch(/no army/);
  });

  it('won: the battle\'s experience, the day over, the band gone till next week, its piece kept (in the store when the bag is full)', () => {
    const a = othrys();
    const id = PORTAL + KORAX;
    const won = afterBattle(a, OTHRYS, id, wonBy(a, id, 0));
    expect(won.hero.xp).toBeGreaterThan(a.hero.xp);
    expect(won.hero.mp).toBe(0);
    expect(townById(won, KORAX)!.mobBeaten).toBe(weekOf(a.day));
    expect(portalMob(won, OTHRYS, townById(won, KORAX)!)).toBeNull();
    expect(cantFightMob({ ...won, hero: { ...won.hero, mp: 1000 } }, OTHRYS)).toMatch(/next week|Monday/);
    expect(portalMob({ ...won, day: won.day + 7 }, OTHRYS, townById(won, KORAX)!)).not.toBeNull();
    // Over many weeks about half the bands carry a piece; with the bag and every store full, it is lost with a line.
    let carried = 0;
    let lostLine = false;
    for (let w = 0; w < 40; w++) {
      const day = a.day + w * 7;
      const heavy = withStore(withStore({ ...a, day, hero: { ...a.hero, bag: full(4), gear: FULL_GEAR } }, KORAX, full(20)), THORN, full(20));
      const out = afterBattle(heavy, OTHRYS, id, wonBy(heavy, id, 0));
      const card = out.prompts.find((p) => p.kind === 'message' && p.item);
      if (card) carried++;
      if (card && card.kind === 'message' && /lost/.test(card.text)) lostLine = true;
    }
    expect(carried).toBeGreaterThan(8);
    expect(carried).toBeLessThan(32);
    expect(lostLine).toBe(true);
  });

  it('a won band\'s piece goes to the shared store when the bag is full', () => {
    const a = othrys();
    const id = PORTAL + KORAX;
    for (let w = 0; w < 30; w++) {
      const day = a.day + w * 7;
      const heavy = withStore({ ...a, day, hero: { ...a.hero, bag: full(4), gear: FULL_GEAR } }, KORAX, full(20));
      const out = afterBattle(heavy, OTHRYS, id, wonBy(heavy, id, 0));
      if (!out.prompts.some((p) => p.kind === 'message' && p.item)) continue;
      expect(storeOf(townById(out, THORN)!).length).toBe(1);
      return;
    }
    throw new Error('no band carried a piece in 30 weeks');
  });

  it('lost: the army is gone, but the hero comes home to the town\'s garrison, still ours, the band waiting on', () => {
    const a = othrys();
    const id = PORTAL + KORAX;
    const lost = afterBattle(a, OTHRYS, id, wonBy(a, id, 1));
    expect(lost.status).toBe('playing');
    expect(lost.hero.id).toBe(a.hero.id);
    expect(isEmptyArmy(lost.hero.army)).toBe(true);
    expect([lost.hero.x, lost.hero.y]).toEqual([a.hero.x, a.hero.y]);
    expect(lost.hero.mp).toBe(0);
    expect(townHeroes(lost, townById(lost, KORAX)!).garrison?.id).toBe(a.hero.id);
    expect(townById(lost, KORAX)!.owner).toBe('player');
    expect(portalMob(lost, OTHRYS, townById(lost, KORAX)!)).not.toBeNull();
    expect(lost.prompts.at(-1)).toMatchObject({ title: `${a.hero.name} comes home` });
  });

  it('a garrison\'s hero fights with the garrison, and loses only it', () => {
    const a = garrisonHero(othrys())!;
    const id = PORTAL + KORAX;
    expect(cantFightMob(a, OTHRYS)).toBeNull();
    expect(battleSides(a, id, OTHRYS).attacker.army).toEqual(townById(a, KORAX)!.garrison);
    const lost = afterBattle(a, OTHRYS, id, wonBy(a, id, 1));
    expect(isEmptyArmy(townById(lost, KORAX)!.garrison)).toBe(true);
    expect(townHeroes(lost, townById(lost, KORAX)!).garrison?.id).toBe(a.hero.id);
  });
});

/** Every slot worn (the first piece that fits each), so a piece won has nowhere to go but the bag. */
const FULL_GEAR: Gear = Object.fromEntries(SLOTS.map((slot) => [slot, ITEM_IDS.find((id) => fitsSlot(id, slot))!]));

describe('the Portal: the way between towns', () => {
  it('lists the other Great Portal towns of ours', () => {
    const a = withBuilt(othrys(), EUDORA, ['storehouse', 'portal']);
    expect(portalTowns(a, townById(a, KORAX)!).map((t) => t.id)).toEqual([THORN]);
  });

  it('takes the rest of the day: the hero arrives at the other gate, picked, with no movement, and the town is ridden into', () => {
    const a = othrys();
    const moved = stepThrough(a, OTHRYS, a.hero.id, THORN)!;
    const thorn = townById(moved, THORN)!;
    expect([moved.hero.x, moved.hero.y]).toEqual([thorn.x, thorn.y]);
    expect(moved.hero.mp).toBe(0);
    expect(moved.hero.army).toEqual(a.hero.army);
    expect(cantStepThrough(moved, moved.hero.id, KORAX)).toMatch(/no movement/);
  });

  it('says why not: no Great Portal here or there, no movement, the gate (or garrison) there taken', () => {
    const a = othrys();
    expect(cantStepThrough(a, a.hero.id, EUDORA)).toMatch(/no Great Portal/);
    expect(cantStepThrough(a, a.hero.id, KORAX)).toMatch(/Not a town of yours/);
    expect(cantStepThrough({ ...a, hero: { ...a.hero, mp: 0 } }, a.hero.id, THORN)).toMatch(/no movement/);
    expect(cantStepThrough({ ...a, hero: { ...a.hero, x: 1, y: 1 } }, a.hero.id, THORN)).toMatch(/must be in a town/);
    const thorn = townById(a, THORN)!;
    const other = { ...a.hero, id: 'ianthe', name: 'Ianthe', x: thorn.x, y: thorn.y };
    expect(cantStepThrough({ ...a, others: [other] }, a.hero.id, THORN)).toMatch(/Ianthe stands in Thornwood's gate/);
    // A hero in the garrison comes out in the garrison: a hero at the far gate is no bar.
    const kept = garrisonHero({ ...a, others: [other] })!;
    expect(cantStepThrough(kept, a.hero.id, THORN)).toBeNull();
    const there = stepThrough(kept, OTHRYS, a.hero.id, THORN)!;
    expect(townHeroes(there, townById(there, THORN)!).garrison?.id).toBe(a.hero.id);
  });
});

describe('the Portal: a lord\'s', () => {
  /** What the side remembers: a foe of `strength` two tiles from town `id`. */
  const foeBy = (adv: Adventure, id: string, strength: number): LordMemory => {
    const t = townById(adv, id)!;
    return { ...NO_MEMORY, foes: { foe: { x: t.x + 2, y: t.y, strength, day: adv.day } } };
  };

  it('steps home through a Great Portal to a town in danger, and its day is over', () => {
    // Ashford and Korax: far enough apart that a foe at one is out of the other's reach.
    const a = othrys({ [KORAX]: ALL, [ASHFORD]: ALL });
    const home = townById(a, ASHFORD)!;
    const after = portalDuty(a, OTHRYS, foeBy(a, ASHFORD, 1e6), a.hero.id, true, {});
    expect([after.hero.x, after.hero.y]).toEqual([home.x, home.y]);
    expect(after.hero.mp).toBe(0);
    // His own town in danger: he stays.
    expect(portalDuty(a, OTHRYS, foeBy(a, KORAX, 1e6), a.hero.id, true, {})).toBe(a);
    // Nobody near: he rides on as he would.
    expect(portalDuty(a, OTHRYS, NO_MEMORY, a.hero.id, true, {})).toBe(a);
  });

  it('a hero not his main one fights a band he is sure to beat, never one too strong; the main hero rides on', () => {
    const a = othrys();
    const mob = portalMob(a, OTHRYS, townById(a, KORAX)!)!;
    const strong = { ...a, hero: { ...a.hero, army: armyOf([{ creature: 'seraph3', count: 200 }]) } };
    expect(mob.strength).toBeLessThan(armyStrength(strong.hero.army) * 0.4);
    const fought = portalDuty(strong, OTHRYS, NO_MEMORY, a.hero.id, false, {});
    expect(townById(fought, KORAX)!.mobBeaten).toBe(weekOf(a.day));
    expect(fought.hero.mp).toBe(0);
    expect(portalDuty(strong, OTHRYS, NO_MEMORY, a.hero.id, false, {})).toEqual(fought);
    expect(portalDuty(strong, OTHRYS, NO_MEMORY, a.hero.id, true, {})).toBe(strong);
    const weak = { ...a, hero: { ...a.hero, army: armyOf([{ creature: 'spearman', count: 1 }]) } };
    expect(portalDuty(weak, OTHRYS, NO_MEMORY, a.hero.id, false, {})).toBe(weak);
  });
});

describe('the Portal: saves', () => {
  it('keeps the Portal\'s buildings and the week its band was beaten; a save from before has none', () => {
    const a = othrys();
    const beaten = { ...a, towns: a.towns.map((t) => (t.id === KORAX ? { ...t, mobBeaten: weekOf(a.day) } : t)) };
    const m = new Map<string, string>();
    const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as unknown as Storage;
    saveAdventure(s, { current: beaten, dayStart: beaten, partStart: beaten });
    const back = loadAdventure(s, mapById)!.current;
    expect(townById(back, KORAX)!.built).toEqual(expect.arrayContaining([...ALL]));
    expect(townById(back, KORAX)!.mobBeaten).toBe(weekOf(a.day));
    expect(townById(back, THORN)!.mobBeaten).toBeUndefined();
  });
});

describe('the Portal: the town screen', () => {
  it('shows the Portal button from its second level, while a hero of ours is in town', async () => {
    const { townButtons } = await import('../src/scenes/town/stripLayout');
    expect(townButtons(['storehouse', 'portal'], false, false, true)).not.toContain('portal');
    expect(townButtons(['storehouse', 'portal', 'portal2'], false, false, true)).toContain('portal');
    expect(townButtons(['storehouse', 'portal', 'portal2'], false, true, false)).not.toContain('portal');
  });

  it('the room: the band with its odds, experience and gear, then the towns to step through to, and fits a phone', async () => {
    const { portalLayout, portalView } = await import('../src/scenes/town/portalData');
    const a = othrys();
    const v = portalView(a, OTHRYS, KORAX);
    expect(v.title).toBe('Great Portal');
    expect(v.band!.line).toMatch(/Against Rowan's army: (weak|about even|dangerous) · \+\d+ experience · may carry an? \w+ piece/);
    expect(v.band!.why).toBeNull();
    expect(v.ways!.map((w) => w.name)).toEqual(['Thornwood']);
    expect(v.ways![0]!.why).toBeNull();
    const beaten = { ...a, towns: a.towns.map((t) => (t.id === KORAX ? { ...t, mobBeaten: weekOf(a.day) } : t)) };
    expect(portalView(beaten, OTHRYS, KORAX).band).toBeNull();
    expect(portalView(beaten, OTHRYS, KORAX).quiet).toMatch(/Monday/);
    const away = { ...a, hero: { ...a.hero, x: 1, y: 1 } };
    expect(portalView(away, OTHRYS, KORAX).who).toMatch(/away/);
    expect(portalView(away, OTHRYS, KORAX).ways![0]!.why).toMatch(/must be in a town/);
    for (const [w, h] of [[1280, 520], [360, 420]] as const) {
      const l = portalLayout({ w, h }, v, 36);
      expect(l.w).toBeLessThanOrEqual(w);
      expect(l.h).toBeLessThanOrEqual(h);
    }
  });

  it('the Storehouse room shows the shared store: its pieces, its whole room, and with whom', async () => {
    const { storeView, itemAt } = await import('../src/scenes/town/storeData');
    const a = withStore(othrys(), THORN, ['linenHood']);
    const v = storeView(a, KORAX);
    expect(v.kept).toBe('Kept: 1 / 40, shared with Thornwood');
    expect(v.items).toEqual(['linenHood']);
    expect(v.places).toBe(20);
    expect(itemAt(a, KORAX, { kind: 'store', i: 0 })).toBe('linenHood');
    expect(storeView(withBuilt(othrys({}), EUDORA, ['storehouse']), EUDORA).kept).toBe('Kept here: 0 / 8');
  });
});
