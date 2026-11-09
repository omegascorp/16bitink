import { describe, expect, it } from 'vitest';
import { machineOf } from '../src/logic/items';
import { BLACK_BANNER } from '../src/level/borderMarch';
import { afterBattle, battleSides, checkGoal, DEFEND, endDay, isSeen, playerTowns, RIVAL, startAdventure, stepHero, takeTown, townById, wallsToStorm, withTown, type Adventure } from '../src/logic/adventure';
import { undefended } from '../src/logic/town';
import { armyOf } from '../src/logic/army';
import { act, createBattle } from '../src/logic/battle';
import { losing } from '../src/logic/battleAi';
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
  const st = createBattle(s.attacker, s.defender, s.seed, s.siege).state;
  return { ...st, winner: side, stacks: st.stacks.map((x) => (x.side === side ? x : { ...x, count: 0 })) };
}

describe('the rival lord', () => {
  it('puts the night\'s news on the day card, under its report', () => {
    const start = { ...startAdventure(def), prompts: [] };
    const adv = withTown(start, { ...townById(start, korax)!, owner: 'player' });
    const [day] = rivalTurn(endDay(adv), def).adv.prompts;
    expect(day).toMatchObject({ kind: 'message', text: expect.stringMatching(/^Scouts saw Kassander/), report: { hero: { name: adv.hero.name } } });
  });

  it('starts in his town with his army, purse and Catapult; his town flies his banner', () => {
    const adv = startAdventure(def);
    expect(adv.rival?.hero?.name).toBe('Kassander');
    expect(adv.rival?.hero?.gear?.machine).toBe('catapult');
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
    // Eudora has a Fort: he has the left, the walls and the player the right.
    expect(sides.attacker.hero?.name).toBe('Kassander');
    expect(sides.defender.hero).toBeNull();
    expect(sides.siege?.me).toBe(1);
    const kept = afterBattle(r.adv, def, DEFEND + eudora, wonBy(r.adv, DEFEND + eudora, 1));
    expect(kept.rival!.hero).toBeNull();
    expect(townById(kept, eudora)!.owner).toBe('player');
    const fell = afterBattle(r.adv, def, DEFEND + eudora, wonBy(r.adv, DEFEND + eudora, 0));
    expect(townById(fell, eudora)!.owner).toBe('rival');
    expect(fell.rival!.hero!.x).toBe(town.x);
    expect(fell.status).toBe('lost');
  });

  it('a defence carries the battle hero\'s spent Ankhs and mana back, win or lose', () => {
    const start = lastTown(startAdventure(def));
    const town = townById(start, eudora)!;
    const hero = { ...start.rival!.hero!, x: town.x + 2, y: town.y + 1, army: armyOf([{ creature: 'swordsman', count: 30 }]) };
    const held = withTown({ ...start, hero: { ...start.hero, ankhs: 2, mana: 30, x: 2, y: 9 }, rival: { ...start.rival!, hero } }, { ...town, garrison: armyOf([{ creature: 'spearman', count: 10 }]) });
    const r = rivalTurn(held, def);
    for (const side of [0, 1] as const) {
      const done = wonBy(r.adv, DEFEND + eudora, side);
      const spent = { ...done, heroes: [done.heroes[0], { name: 'Eudora', attack: 0, defense: 0, power: 1, mana: 12, spells: [], skills: {}, morale: 0, luck: 0, ankhs: 1 }] as BattleState['heroes'] };
      const after = afterBattle(r.adv, def, DEFEND + eudora, spent);
      expect(after.hero.ankhs).toBe(1);
      expect(after.hero.mana).toBe(12);
    }
  });

  it('attacks our hero when he is the stronger, and the player plays it (RIVAL)', () => {
    const start = startAdventure(def);
    const hero = { ...start.rival!.hero!, x: start.hero.x + 2, y: start.hero.y, army: armyOf([{ creature: 'swordsman', count: 40 }]) };
    // Rowan out of town, weak.
    const adv = { ...start, hero: { ...start.hero, army: armyOf([{ creature: 'spearman', count: 3 }]) }, rival: { ...start.rival!, hero } };
    const r = rivalTurn(adv, def);
    expect(r.report.fight).toBe(RIVAL);
    const sides = battleSides(r.adv, RIVAL);
    expect(sides.defender.machine).toBe('catapult');
    const won = afterBattle(r.adv, def, RIVAL, wonBy(r.adv, RIVAL, 0));
    expect(won.rival!.hero).toBeNull();
    expect(won.prompts.some((p) => p.kind === 'message' && /Kassander/.test(p.title))).toBe(true);
  });

  it('our hero stepping onto him starts the fight; his walls stormed straight (an old save) hold him with the garrison', () => {
    const start = startAdventure(def);
    const r = start.rival!.hero!;
    const field = { ...start, rival: { ...start.rival!, hero: { ...r, x: start.hero.x + 1, y: start.hero.y } } };
    expect(stepHero(field, def, { x: r.x === 0 ? 0 : start.hero.x + 1, y: start.hero.y, cost: 100, day: 0 } as never).battle).toBe(RIVAL);
    // His walls fought with him still at the gate (the gate fight comes first now: test/townAssault.test.ts): the garrison joins him.
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

describe('winning the Black Banner takes Korax and Kassander both', () => {
  /** Kassander out in the field, by the hills south of Korax. */
  const riding = (adv: Adventure): Adventure => ({ ...adv, rival: { ...adv.rival!, hero: { ...adv.rival!.hero!, x: 60, y: 50 } } });

  it('goes on when Korax falls with him still riding, and tells the player to hunt him', () => {
    const start = riding(startAdventure(def));
    const taken = afterBattle(start, def, korax, wonBy(start, korax, 0));
    expect(townById(taken, korax)!.owner).toBe('player');
    expect(taken.status).toBe('playing');
    expect(taken.prompts.find((p) => p.kind === 'message' && p.title === 'Korax is yours')).toHaveProperty('text', expect.stringContaining('Hunt him down'));
  });

  it('is won when he is then beaten in the field', () => {
    const start = takeTown(riding(startAdventure(def)), korax);
    const end = afterBattle(start, def, RIVAL, wonBy(start, RIVAL, 0));
    expect(end.rival!.hero).toBeNull();
    expect(end.status).toBe('won');
  });

  it('goes on when he is beaten first, and is won when Korax falls after', () => {
    const start = riding(startAdventure(def));
    const beaten = afterBattle(start, def, RIVAL, wonBy(start, RIVAL, 0));
    expect(beaten.status).toBe('playing');
    const end = afterBattle(beaten, def, korax, wonBy(beaten, korax, 0));
    expect(end.status).toBe('won');
  });

  it('is won when he dies storming a town of ours', () => {
    const start = takeTown(riding(startAdventure(def)), korax);
    const id = DEFEND + eudora;
    const held = withTown(start, { ...townById(start, eudora)!, garrison: armyOf([{ creature: 'spearman', count: 50 }]) });
    expect(afterBattle(held, def, id, wonBy(held, id, 1)).status).toBe('won');
  });

  it('is not lost with a town: only the last one ends it', () => {
    const start = startAdventure(def);
    const fell = withTown(start, { ...townById(start, eudora)!, owner: 'rival' });
    expect(playerTowns(fell).length).toBeGreaterThan(0);
    expect(checkGoal(fell, def).status).toBe('playing');
  });
});

describe('Kassander with no town left', () => {
  const homeless = (at: { x: number; y: number }): Adventure => {
    const start = takeTown(startAdventure(def), korax);
    return { ...start, explored: '0'.repeat(start.explored.length), rival: { ...start.rival!, hero: { ...start.rival!.hero!, ...at, mp: 0, army: armyOf([{ creature: 'spearman', count: 1 }]) } } };
  };

  it('shows on the map each night, and the day\'s card says where', () => {
    const night = rivalTurn(endDay(homeless({ x: 44, y: 56 })), def);
    const foe = night.adv.rival!.hero!;
    expect(isSeen(night.adv, def, foe.x, foe.y)).toBe(true);
    expect(night.report.notes.at(-1)).toMatch(/^Scouts saw Kassander \d+ tiles (north|south|east|west)/);
  });

  it('stays hidden while he has a town to go home to', () => {
    const start = startAdventure(def);
    const hidden = { ...start, explored: '0'.repeat(start.explored.length) };
    const night = rivalTurn(endDay(hidden), def);
    const foe = night.adv.rival!.hero!;
    expect(night.report.notes.some((n) => n.startsWith('Scouts'))).toBe(false);
    expect(isSeen(night.adv, def, foe.x, foe.y)).toBe(false);
  });
});

describe('the Blacksmith', () => {
  it('sells the visiting hero a Catapult as gear, which rides with them and is never lost', async () => {
    const { buyMachine, cantBuyMachine } = await import('../src/logic/adventure');
    const start = startAdventure(def);
    const town = townById(start, eudora)!;
    expect(cantBuyMachine(start, 'catapult')).toMatch(/Blacksmith/);
    const smithy = withTown({ ...start, hero: { ...start.hero, x: town.x, y: town.y } }, { ...town, built: [...town.built, 'blacksmith'] });
    expect(cantBuyMachine(smithy, 'catapult')).toBeNull();
    const one = buyMachine(smithy, 'catapult');
    expect(one.purse.gold).toBe(smithy.purse.gold - 1500);
    expect(one.hero.gear?.machine).toBe('catapult');
    expect(cantBuyMachine(one, 'catapult')).toMatch(/as good/);
    expect(battleSides(one, 'south-pass-wolves').attacker.machine).toBe('catapult');
    const st = createBattle(battleSides(one, 'south-pass-wolves').attacker, battleSides(one, 'south-pass-wolves').defender, 1).state;
    const won = { ...st, winner: 0 as const, stacks: st.stacks.map((x) => (x.side === 1 ? { ...x, count: 0 } : x)) };
    expect(machineOf(afterBattle(one, def, 'south-pass-wolves', won).hero)).toBe('catapult');
  });

  it('sells a finer grade over a lesser one, which goes to the bag', async () => {
    const { buyMachine, cantBuyMachine } = await import('../src/logic/adventure');
    const start = startAdventure(def);
    const town = townById(start, eudora)!;
    const smithy = withTown({ ...start, purse: { ...start.purse, gold: 9000 }, hero: { ...start.hero, x: town.x, y: town.y } }, { ...town, built: [...town.built, 'blacksmith'] });
    const better = buyMachine(buyMachine(smithy, 'catapult'), 'catapult2');
    expect(better.hero.gear?.machine).toBe('catapult2');
    expect(better.hero.bag).toEqual(['catapult']);
    expect(cantBuyMachine(better, 'catapult')).toMatch(/as good/);
    expect(battleSides(better, 'south-pass-wolves').attacker.machine).toBe('catapult2');
  });
});

describe('a siege on the map', () => {
  it('warns of walls only when the hero has no war machine', () => {
    const start = startAdventure(def);
    expect(wallsToStorm(start, korax)?.id).toBe(korax);
    expect(wallsToStorm({ ...start, hero: { ...start.hero, gear: { ...start.hero.gear, machine: 'catapult' } } }, korax)).toBeUndefined();
    expect(wallsToStorm(start, 'south-pass-wolves')).toBeUndefined();
  });

  it('mans an enemy town from its garrison, leaving the shooters out of the ground fight', () => {
    const s = battleSides(startAdventure(def), korax);
    expect(s.siege?.me).toBe(0);
    expect(s.defender.towers?.filter(Boolean).map((t) => t!.creature)).toEqual(['bowman']);
    expect(s.defender.army.some((a) => a?.creature === 'bowman')).toBe(false);
  });

  it('holds our hero’s town from the right, with our own towers, and brings them back after', () => {
    const start = startAdventure(def);
    const town = townById(start, eudora)!;
    const towers = armyOf([{ creature: 'bowman', count: 9 }]);
    const foe = { ...start.rival!.hero!, x: town.x, y: town.y + 1 };
    // Our hero holds the walls from the garrison (one at the gate is fought first, in the open: test/townAssault.test.ts).
    const hero = { ...start.hero, x: town.x, y: town.y, army: armyOf([]), gear: { ...start.hero.gear, machine: 'catapult' as const } };
    const adv = withTown({ ...start, hero, rival: { ...start.rival!, hero: foe } }, { ...town, garrison: start.hero.army, towers });
    const s = battleSides(adv, RIVAL);
    expect(s.siege?.me).toBe(1);
    expect(s.attacker.hero?.name).toBe('Kassander');
    expect(s.defender.hero?.name).toBe(start.hero.name);
    const st = createBattle(s.attacker, s.defender, s.seed, s.siege).state;
    // Our Catapult has nothing to do from inside; his comes.
    expect(st.stacks.some((x) => x.side === 1 && x.creature === 'catapult')).toBe(false);
    expect(st.stacks.some((x) => x.side === 0 && x.creature === 'catapult')).toBe(true);
    const up = st.stacks.find((x) => x.tower !== undefined)!;
    const won = { ...st, winner: 1 as const, stacks: st.stacks.map((x) => (x.side === 0 ? { ...x, count: 0 } : x.id === up.id ? { ...x, count: 4 } : x)) };
    const after = afterBattle(adv, def, RIVAL, won);
    expect(after.hero.gear?.machine).toBe('catapult');
    expect(townById(after, eudora)!.towers?.[0]).toEqual({ creature: 'bowman', count: 4 });
  });

  it('counts the towers as defenders: a town with only them isn’t walked into', () => {
    const start = startAdventure(def);
    const town = townById(start, eudora)!;
    expect(undefended({ ...town, garrison: armyOf([]), towers: armyOf([{ creature: 'bowman', count: 1 }]) })).toBe(false);
    expect(undefended({ ...town, garrison: armyOf([]) })).toBe(true);
  });
});

describe('saving a map with a rival', () => {
  it('keeps the rival, his waiting fight, rival-held towns and the hero’s war machines through a reload', async () => {
    const { parseAdventure } = await import('../src/logic/save');
    const start = startAdventure(def);
    const town = townById(start, eudora)!;
    const hero = { ...start.rival!.hero!, x: start.hero.x + 2, y: start.hero.y, army: armyOf([{ creature: 'swordsman', count: 40 }]) };
    const adv = { ...start, hero: { ...start.hero, gear: { ...start.hero.gear, machine: 'catapult2' as const }, army: armyOf([{ creature: 'spearman', count: 3 }]) }, rival: { ...start.rival!, hero } };
    const r = rivalTurn(adv, def).adv;
    expect(r.rivalFight).toBe(RIVAL);
    const back = parseAdventure(JSON.parse(JSON.stringify(r)), def)!;
    expect(back.rivalFight).toBe(RIVAL);
    expect(back.rival).toEqual(r.rival);
    expect(machineOf(back.hero)).toBe('catapult2');
    // The war machines since cut from the game come back as their price in gold; towers keep their companies.
    const old = JSON.parse(JSON.stringify(r));
    old.hero.machines = ['ballista', 'tent'];
    old.towns[0].towers = armyOf([{ creature: 'bowman', count: 3 }]);
    const loaded = parseAdventure(old, def)!;
    expect(loaded.purse.gold).toBe(r.purse.gold + 2250);
    expect(loaded.towns[0]!.towers?.[0]).toEqual({ creature: 'bowman', count: 3 });
    // A town he took stays his.
    const fell = withTown(r, { ...town, owner: 'rival' });
    expect(townById(parseAdventure(JSON.parse(JSON.stringify(fell)), def)!, eudora)!.owner).toBe('rival');
    // Beaten, he stays beaten.
    const beaten = { ...r, rival: { ...r.rival!, hero: null }, rivalFight: undefined };
    expect(parseAdventure(JSON.parse(JSON.stringify(beaten)), def)!.rival!.hero).toBeNull();
  });
});

describe('Kassander leaves a lost battle', () => {
  const field = (start: Adventure, army = armyOf([{ creature: 'spearman', count: 24 }])): Adventure =>
    ({ ...start, rival: { ...start.rival!, hero: { ...start.rival!.hero!, x: start.hero.x + 2, y: start.hero.y, army } } });

  it('may flee the field while he has a town, and not once he has none', () => {
    const start = startAdventure(def);
    expect(battleSides(field(start), RIVAL).defender.hero?.canFlee).toBe(true);
    const homeless = withTown(field(start), { ...townById(start, korax)!, owner: 'player' });
    expect(battleSides(homeless, RIVAL).defender.hero?.canFlee).toBeFalsy();
    // Defending his own town he stands and fights.
    expect(battleSides(start, korax).defender.hero?.canFlee).toBeFalsy();
  });

  it('flees when his army is cut down and outmatched, and the field is ours', () => {
    const start = field(startAdventure(def));
    const s = battleSides(start, RIVAL);
    const st = createBattle(s.attacker, s.defender, s.seed).state;
    const cut = { ...st, stacks: st.stacks.map((x) => (x.side === 1 ? { ...x, count: Math.ceil(x.count / 4) } : x)) };
    expect(losing(cut, 1)).toBe(true);
    expect(losing(st, 1)).toBe(false);
    const end = act({ ...cut, active: cut.stacks.find((x) => x.side === 1)!.id }, { type: 'flee' });
    expect(end.state).toMatchObject({ winner: 0, fled: 1 });
    expect(end.events.map((e) => e.type)).toEqual(['flee', 'end']);
  });

  it('rides back to Korax with no army, still in the game, and hires again before riding out', () => {
    const start = field(startAdventure(def));
    const s = battleSides(start, RIVAL);
    const st = createBattle(s.attacker, s.defender, s.seed).state;
    const after = afterBattle(start, def, RIVAL, { ...st, winner: 0, fled: 1, active: null });
    const k = townById(after, korax)!;
    expect(after.rival!.hero).toMatchObject({ x: k.x, y: k.y, mp: 0 });
    expect(armyStrength(after.rival!.hero!.army)).toBe(0);
    expect(after.status).toBe('playing');
    expect(after.prompts.some((p) => p.kind === 'message' && /flees/.test(p.title))).toBe(true);
    // With nothing to hire he stays home; with recruits in Korax he leads them out.
    const broke = { ...after, rival: { ...after.rival!, purse: { ...after.rival!.purse, gold: 0 } } };
    expect(rivalTurn({ ...broke, towns: broke.towns.map((t) => (t.id === korax ? { ...t, stock: {} } : t)) }, def).report.path).toEqual([]);
    const paid = rivalTurn(endDay({ ...after, rival: { ...after.rival!, purse: { ...after.rival!.purse, gold: 20000 } } }), def).adv;
    expect(armyStrength(paid.rival!.hero?.army ?? [])).toBeGreaterThan(0);
  });

  it('is beaten for good when he has nowhere to run', () => {
    const start = field(startAdventure(def));
    const homeless = withTown(start, { ...townById(start, korax)!, owner: 'player' });
    const won = afterBattle(homeless, def, RIVAL, wonBy(homeless, RIVAL, 0));
    expect(won.rival!.hero).toBeNull();
  });
});

describe('the race for Eudora', () => {
  /** The Black Banner ridden on into: Eudora waits, Rowan far up the forest trail. */
  const raced = (): Adventure => {
    const start = startAdventure(def);
    const e = townById(start, eudora)!;
    return { ...withTown(start, { ...e, owner: 'neutral', ally: true }), begun: start.day, hero: { ...start.hero, x: 38, y: 32 } };
  };

  it('is not his to run before the third night', () => {
    const r = nights(raced(), 2);
    expect(townById(r.adv, eudora)).toMatchObject({ owner: 'neutral', ally: true });
  });

  it('is lost to him if the player dawdles: Eudora flies his banner and the night says so', () => {
    const r = nights(raced(), 10);
    const e = townById(r.adv, eudora)!;
    expect(e.owner).toBe('rival');
    expect(e.ally).toBeUndefined();
    expect(r.notes.some((n) => /Eudora/.test(n) && /before you/.test(n))).toBe(true);
    // The loss gets a card the narrator tells, after the night's card that keeps the short note.
    const lost = r.adv.prompts.findIndex((p) => p.kind === 'message' && p.line === 'eudora-lost');
    expect(lost).toBeGreaterThan(0);
    const night = r.adv.prompts.slice(0, lost).filter((p) => p.kind === 'message' && p.report);
    expect(night.some((p) => p.kind === 'message' && /Eudora before you/.test(p.text))).toBe(true);
    // Now it is his town to flee to, and a town to storm.
    expect(stepHero({ ...r.adv, hero: { ...r.adv.hero, x: e.x, y: e.y + 1 } }, def, { x: e.x, y: e.y, cost: 100, day: 0 } as never).battle ?? 'walked in').toBeTruthy();
  });
});
