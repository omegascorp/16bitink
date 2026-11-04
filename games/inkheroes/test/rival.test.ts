import { describe, expect, it } from 'vitest';
import { BLACK_BANNER } from '../src/level/borderMarch';
import { afterBattle, battleSides, DEFEND, endDay, RIVAL, startAdventure, stepHero, townById, withTown, type Adventure } from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { createBattle } from '../src/logic/battle';
import type { BattleState } from '../src/logic/battleTypes';
import { armyStrength, autoBattle, rivalTurn } from '../src/logic/rival';

const def = BLACK_BANNER;
const korax = 'korax-town';
const eudora = 'eudora-town';
/** Eudora as the player's only town (Ashford, far back on the chapter's road, given up). */
const lastTown = (adv: Adventure): Adventure => withTown(adv, { ...townById(adv, 'ashford-town')!, owner: 'neutral' });

/** Plays `days` nights: the day ends, then the rival rides; stops at a fight he starts. */
function nights(adv: Adventure, days: number): { adv: Adventure; fight?: string; notes: string[] } {
  let a = adv;
  const notes: string[] = [];
  for (let d = 0; d < days; d++) {
    const r = rivalTurn(endDay(a), def);
    a = r.adv;
    notes.push(...r.report.notes);
    if (r.report.fight) return { adv: a, fight: r.report.fight, notes };
  }
  return { adv: a, notes };
}

/** A battle `side` has won outright (the other side's stacks all gone). */
function wonBy(adv: Adventure, id: string, side: 0 | 1): BattleState {
  const s = battleSides(adv, id);
  const st = createBattle(s.attacker, s.defender, s.seed).state;
  return { ...st, winner: side, stacks: st.stacks.map((x) => (x.side === side ? x : { ...x, count: 0 })) };
}

describe('the rival lord', () => {
  it('starts in his town with his army, purse and ballista; his town flies his banner', () => {
    const adv = startAdventure(def);
    expect(adv.rival?.hero?.name).toBe('Kassander');
    expect(adv.rival?.hero?.machines).toEqual(['ballista']);
    expect(townById(adv, korax)?.owner).toBe('rival');
    expect(adv.rival?.purse.gold).toBe(6000);
  });

  it('builds his order and hires into his hero at home, and plays the same way every time', () => {
    const adv = startAdventure(def);
    const a = rivalTurn(endDay(adv), def);
    const b = rivalTurn(endDay(adv), def);
    expect(a.adv).toEqual(b.adv);
    expect(townById(a.adv, korax)!.built).toContain('barracks');
    // He hired the week's Hoplites before riding out.
    expect(armyStrength(a.adv.rival!.hero!.army)).toBeGreaterThan(armyStrength(adv.rival!.hero!.army));
  });

  it('rides out for the lakelands: within a week he has taken something', () => {
    const start = startAdventure(def);
    const r = nights(start, 7);
    const hero = r.adv.rival!.hero;
    const took = r.adv.objects.filter((o) => o.gone || (o.kind === 'mine' && o.owner === 'rival')).length;
    const before = start.objects.filter((o) => o.gone || (o.kind === 'mine' && o.owner === 'rival')).length;
    expect(took + (hero ? 0 : 1)).toBeGreaterThan(before);
  });

  it('storms a town of ours with nobody in it and takes it; losing the last town loses the map', () => {
    const start = lastTown(startAdventure(def));
    const town = townById(start, eudora)!;
    // Kassander beside Eudora's gate with a big army; Rowan far away.
    const hero = { ...start.rival!.hero!, x: town.x + 2, y: town.y + 1, army: armyOf([{ creature: 'swordsman', count: 30 }]) };
    const adv = withTown({ ...start, hero: { ...start.hero, x: 2, y: 9 }, rival: { ...start.rival!, hero } }, { ...town, garrison: armyOf([]) });
    const r = rivalTurn(adv, def);
    expect(townById(r.adv, eudora)!.owner).toBe('rival');
    expect(r.adv.status).toBe('lost');
    expect(r.report.notes.join(' ')).toMatch(/Eudora/);
  });

  it('a garrison alone holds the town in a battle the player plays (DEFEND): win and he is beaten, lose and the town falls', () => {
    const start = lastTown(startAdventure(def));
    const town = townById(start, eudora)!;
    const hero = { ...start.rival!.hero!, x: town.x + 2, y: town.y + 1, army: armyOf([{ creature: 'swordsman', count: 30 }]) };
    const held = withTown({ ...start, hero: { ...start.hero, x: 2, y: 9 }, rival: { ...start.rival!, hero } }, { ...town, garrison: armyOf([{ creature: 'spearman', count: 10 }]) });
    const r = rivalTurn(held, def);
    expect(r.report.fight).toBe(DEFEND + eudora);
    const sides = battleSides(r.adv, DEFEND + eudora);
    expect(sides.attacker.hero).toBeNull();
    expect(sides.defender.hero?.name).toBe('Kassander');
    const kept = afterBattle(r.adv, def, DEFEND + eudora, wonBy(r.adv, DEFEND + eudora, 0));
    expect(kept.rival!.hero).toBeNull();
    expect(townById(kept, eudora)!.owner).toBe('player');
    const fell = afterBattle(r.adv, def, DEFEND + eudora, wonBy(r.adv, DEFEND + eudora, 1));
    expect(townById(fell, eudora)!.owner).toBe('rival');
    expect(fell.rival!.hero!.x).toBe(town.x);
    expect(fell.status).toBe('lost');
  });

  it('attacks our hero when he is the stronger, and the player plays it (RIVAL)', () => {
    const start = startAdventure(def);
    const hero = { ...start.rival!.hero!, x: start.hero.x + 2, y: start.hero.y, army: armyOf([{ creature: 'swordsman', count: 40 }]) };
    // Rowan out of town, weak.
    const adv = { ...start, hero: { ...start.hero, army: armyOf([{ creature: 'spearman', count: 3 }]) }, rival: { ...start.rival!, hero } };
    const r = rivalTurn(adv, def);
    expect(r.report.fight).toBe(RIVAL);
    const sides = battleSides(r.adv, RIVAL);
    expect(sides.defender.machines).toEqual(['ballista']);
    const won = afterBattle(r.adv, def, RIVAL, wonBy(r.adv, RIVAL, 0));
    expect(won.rival!.hero).toBeNull();
    expect(won.prompts.some((p) => p.kind === 'message' && /Kassander/.test(p.title))).toBe(true);
  });

  it('our hero stepping onto him starts the fight; at his town gate it is the town and him together', () => {
    const start = startAdventure(def);
    const r = start.rival!.hero!;
    const field = { ...start, rival: { ...start.rival!, hero: { ...r, x: start.hero.x + 1, y: start.hero.y } } };
    expect(stepHero(field, def, { x: r.x === 0 ? 0 : start.hero.x + 1, y: start.hero.y, cost: 100, day: 0 } as never).battle).toBe(RIVAL);
    // At his gate: the town's garrison joins him.
    const sides = battleSides(start, korax);
    expect(sides.defender.hero?.name).toBe('Kassander');
    expect(armyStrength(sides.defender.army)).toBeGreaterThan(armyStrength(r.army));
    const taken = afterBattle(start, def, korax, wonBy(start, korax, 0));
    expect(townById(taken, korax)!.owner).toBe('player');
    expect(taken.rival!.hero).toBeNull();
    expect(taken.status).toBe('won');
  });

  it('settles his fights with monsters at once (an auto battle always ends)', () => {
    const start = startAdventure(def);
    const end = autoBattle(battleSides(start, RIVAL === 'rival' ? korax : korax).defender, { hero: null, army: armyOf([{ creature: 'goblin', count: 10 }]) }, 7);
    expect(end.winner).toBe(0);
  });
});

describe('the Blacksmith', () => {
  it('sells the visiting hero one Ballista and one First Aid Tent, which ride into battle with them', async () => {
    const { buyMachine, cantBuyMachine } = await import('../src/logic/adventure');
    const start = startAdventure(def);
    const town = townById(start, eudora)!;
    expect(cantBuyMachine(start, 'ballista')).toMatch(/Blacksmith/);
    const smithy = withTown({ ...start, hero: { ...start.hero, x: town.x, y: town.y } }, { ...town, built: [...town.built, 'blacksmith'] });
    expect(cantBuyMachine(smithy, 'ballista')).toBeNull();
    const one = buyMachine(smithy, 'ballista');
    expect(one.purse.gold).toBe(smithy.purse.gold - 1500);
    expect(cantBuyMachine(one, 'ballista')).toMatch(/already/);
    const both = buyMachine(one, 'tent');
    expect(both.hero.machines).toEqual(['ballista', 'tent']);
    expect(battleSides(both, 'north-pass-brigands').attacker.machines).toEqual(['ballista', 'tent']);
    // A machine lost in battle is gone: the hero keeps only what still stands.
    const st = createBattle(battleSides(both, 'north-pass-brigands').attacker, battleSides(both, 'north-pass-brigands').defender, 1).state;
    const won = { ...st, winner: 0 as const, stacks: st.stacks.map((x) => (x.side === 1 || x.creature === 'tent' ? { ...x, count: 0 } : x)) };
    expect(afterBattle(both, def, 'north-pass-brigands', won).hero.machines).toEqual(['ballista']);
  });
});

describe('saving a map with a rival', () => {
  it('keeps the rival, his waiting fight, rival-held towns and the hero’s war machines through a reload', async () => {
    const { parseAdventure } = await import('../src/logic/save');
    const start = startAdventure(def);
    const town = townById(start, eudora)!;
    const hero = { ...start.rival!.hero!, x: start.hero.x + 2, y: start.hero.y, army: armyOf([{ creature: 'swordsman', count: 40 }]) };
    const adv = { ...start, hero: { ...start.hero, machines: ['tent' as const], army: armyOf([{ creature: 'spearman', count: 3 }]) }, rival: { ...start.rival!, hero } };
    const r = rivalTurn(adv, def).adv;
    expect(r.rivalFight).toBe(RIVAL);
    const back = parseAdventure(JSON.parse(JSON.stringify(r)), def)!;
    expect(back.rivalFight).toBe(RIVAL);
    expect(back.rival).toEqual(r.rival);
    expect(back.hero.machines).toEqual(['tent']);
    // A town he took stays his.
    const fell = withTown(r, { ...town, owner: 'rival' });
    expect(townById(parseAdventure(JSON.parse(JSON.stringify(fell)), def)!, eudora)!.owner).toBe('rival');
    // Beaten, he stays beaten.
    const beaten = { ...r, rival: { ...r.rival!, hero: null }, rivalFight: undefined };
    expect(parseAdventure(JSON.parse(JSON.stringify(beaten)), def)!.rival!.hero).toBeNull();
  });
});
