import { describe, expect, it } from 'vitest';
import { BLACK_BANNER, OTHRYS } from '../src/level/borderMarch';
import type { MapDef } from '../src/level/types';
import { afterBattle, battleSides, DEFEND, GATE, holdOff, ourHeroes, RIVAL, wallsToStorm, rivalHeroes, startAdventure, stepHero, townById, withTown, type Adventure } from '../src/logic/adventure';
import { armyOf, type Army } from '../src/logic/army';
import { createBattle } from '../src/logic/battle';
import { autoBattle } from '../src/logic/autoBattle';
import type { BattleState, Side } from '../src/logic/battleTypes';
import { playLord } from '../src/logic/lord/turn';
import { rivalTurn } from '../src/logic/rival';
import { parseAdventure } from '../src/logic/save';
import type { PathStep } from '../src/logic/path';

/**
 * A town has two places for heroes: its gate and its garrison. Whoever
 * storms it fights the hero at the gate first, in the open; only past the
 * gate do the walls (garrison, towers, the hero in the garrison) fight.
 */

const def = BLACK_BANNER;
const LORDLY: MapDef = { ...def, rival: { ...def.rival!, mind: 'lord' } };
const eudora = 'eudora-town';
const korax = 'korax-town';
const spears = (count: number): Army => armyOf([{ creature: 'spearman', count }]);

interface Held { picked?: boolean; gate?: boolean; inside?: boolean; garrison?: number; far?: boolean }

/** Eudora our only town; Kassander strong beside it; a hero of ours at its gate (picked or not), another in its garrison, as asked. */
function held({ picked = true, gate = true, inside = false, garrison = 1, far = true }: Held = {}): Adventure {
  const start = startAdventure(def);
  const lone = withTown(start, { ...townById(start, 'ashford-town')!, owner: 'neutral' });
  const town = townById(lone, eudora)!;
  const foe = { ...lone.rival!.hero!, x: town.x + 2, y: town.y + 1, army: armyOf([{ creature: 'swordsman', count: 60 }]) };
  const guard = { ...lone.hero, x: town.x, y: town.y, army: spears(25) };
  const keeper = { ...lone.hero, id: 'keeper', name: 'Keeper', x: town.x, y: town.y, army: armyOf([]) };
  const away = { ...lone.hero, id: 'far-hero', name: 'Far', x: 2, y: 9 };
  const heroes = [...(gate ? [guard] : []), ...(inside ? [keeper] : []), ...(far ? [away] : [])];
  const [hero, ...others] = picked ? heroes : [...heroes.slice(1), heroes[0]!];
  const adv: Adventure = { ...lone, hero: hero!, ...(others.length ? { others } : {}), prompts: [], rival: { ...lone.rival!, hero: foe } };
  return withTown(adv, { ...town, garrison: spears(garrison), towers: armyOf([]) });
}

/** Fight `id` won by `side`, the loser's stacks all gone and the winner's at `kept` of their count. */
function wonBy(adv: Adventure, id: string, side: Side, kept = 1): BattleState {
  const s = battleSides(adv, id);
  const st = createBattle(s.attacker, s.defender, s.seed, s.siege).state;
  return { ...st, winner: side, stacks: st.stacks.map((x) => (x.side === side ? { ...x, count: Math.max(1, Math.round(x.count * kept)) } : { ...x, count: 0 })) };
}

const has = (army: Army, count: number): boolean => army.some((x) => x?.count === count);
const lastText = (adv: Adventure): string => { const p = adv.prompts.at(-1); return p?.kind === 'message' ? p.text : ''; };

describe('a town stormed with a hero of ours at its gate', () => {
  for (const picked of [true, false]) {
    it(`the lord fights our ${picked ? 'picked' : 'other'} gate hero first, in the open (the reported bug)`, () => {
      const r = playLord(held({ picked }), LORDLY, 'stop');
      expect(r.fight).toBe(GATE + eudora);
      const s = battleSides(r.adv, r.fight!);
      expect(s.siege).toBeUndefined();
      expect(has(s.attacker.army, 25)).toBe(true);
      expect(r.adv.hero.army).toEqual(spears(25));
    });
    it(`Kassander fights our ${picked ? 'picked' : 'other'} gate hero first, in the open`, () => {
      const r = rivalTurn(held({ picked }), def);
      expect(r.report.fight).toBe(GATE + eudora);
      expect(r.adv.hero.army).toEqual(spears(25));
      expect(battleSides(r.adv, r.report.fight!).siege).toBeUndefined();
      expect(r.adv.prompts.some((p) => p.kind === 'message' && /at the gate/.test(p.text))).toBe(true);
    });
  }

  it('the gate hero beaten: he falls, Kassander keeps what lived, and the walls come next; won, the town falls', () => {
    const r = rivalTurn(held({ picked: false, garrison: 10 }), def);
    const id = r.report.fight!;
    const lost = afterBattle(r.adv, def, id, wonBy(r.adv, id, 1, 0.5));
    expect(ourHeroes(lost).some((h) => has(h.army, 25))).toBe(false);
    expect(lost.rival!.hero!.army).toEqual(armyOf([{ creature: 'swordsman', count: 30 }]));
    expect(lost.rivalFight).toBe(DEFEND + eudora);
    expect(lastText(lost)).toBe('Kassander broke through at the gate: now the walls.');
    expect(townById(lost, eudora)!.owner).toBe('player');
    const walls = battleSides(lost, DEFEND + eudora);
    expect(walls.siege?.me).toBe(1);
    expect(walls.attacker.army).toEqual(armyOf([{ creature: 'swordsman', count: 30 }]));
    const fell = afterBattle(lost, def, DEFEND + eudora, wonBy(lost, DEFEND + eudora, 0));
    expect(townById(fell, eudora)!.owner).toBe('rival');
    expect(fell.rivalFight).toBeUndefined();
  });

  it('the gate hero wins: the town holds, no siege', () => {
    const r = rivalTurn(held({ garrison: 10 }), def);
    const won = afterBattle(r.adv, def, r.report.fight!, wonBy(r.adv, r.report.fight!, 0));
    expect(won.rivalFight).toBeUndefined();
    expect(won.rival!.hero).toBeNull();
    expect(townById(won, eudora)!.owner).toBe('player');
    expect(won.status).toBe('playing');
  });

  it('nobody at the gate: straight to the walls', () => {
    const r = rivalTurn(held({ gate: false, garrison: 10 }), def);
    expect(r.report.fight).toBe(DEFEND + eudora);
    const s = battleSides(r.adv, r.report.fight!);
    expect(s.siege?.me).toBe(1);
    expect(s.defender.hero).toBeNull();
  });

  it('the gate beaten with nobody behind it: the town falls at once', () => {
    const r = rivalTurn(held({ garrison: 0 }), def);
    expect(r.report.fight).toBe(GATE + eudora);
    const lost = afterBattle(r.adv, def, r.report.fight!, wonBy(r.adv, r.report.fight!, 1));
    expect(lost.rivalFight).toBeUndefined();
    expect(townById(lost, eudora)!.owner).toBe('rival');
    expect(lost.rival!.hero!.x).toBe(townById(lost, eudora)!.x);
  });

  it('a hero in the garrison commands the walls: picked, in the battle, and falls with the town', () => {
    // Behind a gate hero: the gate first, then the keeper picked for the walls.
    const r = rivalTurn(held({ inside: true, garrison: 10 }), def);
    expect(r.report.fight).toBe(GATE + eudora);
    const lost = afterBattle(r.adv, def, r.report.fight!, wonBy(r.adv, r.report.fight!, 1));
    expect(lost.rivalFight).toBe(DEFEND + eudora);
    expect(lost.hero.id).toBe('keeper');
    const s = battleSides(lost, DEFEND + eudora);
    expect(s.defender.hero?.name).toBe('Keeper');
    expect(has(s.defender.army, 10) || has(s.defender.towers ?? [], 10)).toBe(true);
    const kept = afterBattle(lost, def, DEFEND + eudora, wonBy(lost, DEFEND + eudora, 1));
    expect(townById(kept, eudora)!.owner).toBe('player');
    expect(kept.hero.id).toBe('keeper');
    expect(kept.hero.xp).toBeGreaterThan(lost.hero.xp);
    const fell = afterBattle(lost, def, DEFEND + eudora, wonBy(lost, DEFEND + eudora, 0));
    expect(townById(fell, eudora)!.owner).toBe('rival');
    expect(ourHeroes(fell).map((h) => h.id)).not.toContain('keeper');
    // With nobody at the gate, the keeper is picked for the walls straight away.
    const straight = rivalTurn(held({ gate: false, inside: true, garrison: 10 }), def);
    expect(straight.report.fight).toBe(DEFEND + eudora);
    expect(straight.adv.hero.id).toBe('keeper');
    expect(battleSides(straight.adv, DEFEND + eudora).defender.hero?.name).toBe('Keeper');
  });

  it('a hero alone in an empty garrison still stands: a fight (won at once by the storm), then the town falls', () => {
    const r = rivalTurn(held({ gate: false, inside: true, garrison: 0 }), def);
    expect(r.report.fight).toBe(DEFEND + eudora);
    const s = battleSides(r.adv, r.report.fight!);
    const end = autoBattle(s.attacker, s.defender, s.seed, s.siege);
    expect(end.winner).toBe(0);
    const fell = afterBattle(r.adv, def, r.report.fight!, end);
    expect(townById(fell, eudora)!.owner).toBe('rival');
    expect(ourHeroes(fell).map((h) => h.id)).not.toContain('keeper');
  });

  it('the lord fights both battles at once in an auto night: past a weak gate, the town is his', () => {
    const a = playLord(held(), LORDLY, 'auto').adv;
    expect(townById(a, eudora)!.owner).toBe('rival');
    expect(ourHeroes(a).some((h) => has(h.army, 25))).toBe(false);
  });

  it('old saves still load: a pending defence stays, and one with a hero at the gate becomes the gate fight', () => {
    const reload = (a: Adventure): Adventure | null => parseAdventure(JSON.parse(JSON.stringify(a)), def);
    const guarded = held({ far: false, garrison: 10 });
    expect(guarded.others).toBeUndefined();
    // The same hero away from the town: nobody at its gate.
    const bare = { ...guarded, hero: { ...guarded.hero, x: 2, y: 9 } };
    expect(reload({ ...bare, rivalFight: DEFEND + eudora })?.rivalFight).toBe(DEFEND + eudora);
    expect(reload({ ...guarded, rivalFight: DEFEND + eudora })?.rivalFight).toBe(GATE + eudora);
    expect(reload({ ...guarded, rivalFight: 'rival' })?.rivalFight).toBe(GATE + eudora);
    expect(reload({ ...guarded, rivalFight: GATE + eudora })?.rivalFight).toBe(GATE + eudora);
  });
});

describe('we storm a town of his with a hero at its gate', () => {
  const step = (x: number, y: number): PathStep => ({ x, y, cost: 100, day: 0 }) as PathStep;

  it('Kassander at Korax\'s gate is fought first in the open, then its walls; then it is ours', () => {
    const start = { ...startAdventure(def), prompts: [] };
    const k = townById(start, korax)!;
    expect(stepHero(start, def, step(k.x, k.y)).battle).toBe(GATE + korax);
    const gate = battleSides(start, GATE + korax);
    expect(gate.siege).toBeUndefined();
    expect(gate.defender.hero?.name).toBe('Kassander');
    expect(gate.defender.army).toEqual(start.rival!.hero!.army);
    const past = afterBattle(start, def, GATE + korax, wonBy(start, GATE + korax, 0));
    expect(past.rival!.hero).toBeNull();
    expect(past.rivalFight).toBe(korax);
    expect(lastText(past)).toBe(`${start.hero.name} broke through at the gate: now the walls.`);
    expect(townById(past, korax)!.owner).toBe('rival');
    const walls = battleSides(past, korax);
    expect(walls.siege?.me).toBe(0);
    expect(walls.defender.hero).toBeNull();
    const taken = afterBattle(past, def, korax, wonBy(past, korax, 0));
    expect(townById(taken, korax)!.owner).toBe('player');
    expect(taken.status).toBe('won');
  });

  it('with an empty garrison behind the gate, Korax is ridden into at once', () => {
    const start = { ...startAdventure(def), prompts: [] };
    const bare = withTown(start, { ...townById(start, korax)!, garrison: armyOf([]), towers: armyOf([]) });
    const past = afterBattle(bare, def, GATE + korax, wonBy(bare, GATE + korax, 0));
    expect(past.rivalFight).toBeUndefined();
    expect(townById(past, korax)!.owner).toBe('player');
  });

  it('a lord\'s captain at the gate first, then the walls under the captain in the garrison', () => {
    const start = { ...startAdventure(OTHRYS), prompts: [] };
    const lyko = townById(start, 'lykosoura-town')!;
    const lord = start.rival!.hero!;
    const gate = { ...lord, id: 'cap-gate', name: 'Gatekeeper', x: lyko.x, y: lyko.y, army: spears(20) };
    const inside = { ...lord, id: 'cap-in', name: 'Warden', x: lyko.x, y: lyko.y, army: armyOf([]) };
    const adv: Adventure = { ...start, rival: { ...start.rival!, hero: { ...lord, x: lyko.x + 20, y: lyko.y }, others: [inside, gate] } };
    const r = stepHero(adv, OTHRYS, step(lyko.x, lyko.y));
    expect(r.battle).toBe(GATE + lyko.id);
    expect(r.adv.rival!.hero!.id).toBe('cap-gate');
    expect(battleSides(r.adv, r.battle!).siege).toBeUndefined();
    const past = afterBattle(r.adv, OTHRYS, r.battle!, wonBy(r.adv, r.battle!, 0));
    expect(rivalHeroes(past).map((h) => h.id)).not.toContain('cap-gate');
    expect(past.rivalFight).toBe(lyko.id);
    expect(past.rival!.hero!.id).toBe('cap-in');
    const walls = battleSides(past, lyko.id);
    expect(walls.siege).toBeDefined();
    expect(walls.defender.hero?.name).toBe('Warden');
    const taken = afterBattle(past, OTHRYS, lyko.id, wonBy(past, lyko.id, 0));
    expect(townById(taken, lyko.id)!.owner).toBe('player');
    expect(rivalHeroes(taken).map((h) => h.id)).not.toContain('cap-in');
  });
});

describe('a rival hero who beats ours keeps only what lived', () => {
  it('in the field (RIVAL), as the player plays it', () => {
    const start = { ...startAdventure(def), prompts: [] };
    const foe = { ...start.rival!.hero!, x: 30, y: 20, army: armyOf([{ creature: 'swordsman', count: 40 }]) };
    const adv: Adventure = { ...start, hero: { ...start.hero, x: 2, y: 9, army: spears(5) }, rival: { ...start.rival!, hero: foe } };
    const lost = afterBattle(adv, def, RIVAL, wonBy(adv, RIVAL, 1, 0.5));
    expect(lost.rival!.hero!.army).toEqual(armyOf([{ creature: 'swordsman', count: 20 }]));
  });

  it('at his gate, when we storm it and lose', () => {
    const start = { ...startAdventure(def), prompts: [] };
    const before = start.rival!.hero!.army;
    const lost = afterBattle(start, def, GATE + korax, wonBy(start, GATE + korax, 1, 0.5));
    expect(lost.rival!.hero!.army).toEqual(before.map((x) => (x ? { ...x, count: Math.max(1, Math.round(x.count * 0.5)) } : null)));
    expect(lost.rivalFight).toBeUndefined();
  });
});

describe('the walls after his gate is won, with no war machine', () => {
  it('are warned of (as any siege), and can be left for later', () => {
    const start = { ...startAdventure(def), prompts: [] };
    const { machine: _m, ...gear } = start.hero.gear ?? {};
    const bare = { ...start, hero: { ...start.hero, gear } };
    const past = afterBattle(bare, def, GATE + korax, wonBy(bare, GATE + korax, 0));
    expect(past.rivalFight).toBe(korax);
    expect(wallsToStorm(past, past.rivalFight!)?.id).toBe(korax);
    const later = holdOff(past);
    expect(later.rivalFight).toBeUndefined();
    expect(townById(later, korax)!.owner).toBe('rival');
    // A night fight can't be put off, and a gate or our walls need no warning.
    const night = { ...past, rivalFight: DEFEND + eudora };
    expect(holdOff(night).rivalFight).toBe(DEFEND + eudora);
    expect(wallsToStorm(night, DEFEND + eudora)).toBeUndefined();
    expect(wallsToStorm(bare, GATE + korax)).toBeUndefined();
  });
});
