import { describe, expect, it } from 'vitest';
import { ASHFORD } from '../src/level/borderMarch';
import type { MapDef } from '../src/level/types';
import { afterBattle, answerPrompt, battleSides, endDay, enterTown, startAdventure, withTown, type Adventure } from '../src/logic/adventure';
import { armyOf, emptyArmy } from '../src/logic/army';
import { act, answers, conquer, createBattle, stackById, survivors, type BattleSide } from '../src/logic/battle';
import { BUILDINGS, type BuildingId } from '../src/logic/buildings';
import { factionOf } from '../src/logic/factions';
import { toBattleHero } from '../src/logic/hero';
import type { Purse } from '../src/logic/resources';
import { parseAdventure } from '../src/logic/save';
import { bestUnit, BUILD_ORDER, BUILD_PLAN, BUILD_PLANS, build, buildAll, buildingIn, buildOrderOf, cantBuild, dwellings, hire, hireAll, spellbookSold, suggestBuilding, upgradeSlot, weekly, type Town } from '../src/logic/town';
import { chooseAction } from '../src/logic/battleAi';
import { cantCast, castSpell } from '../src/logic/battleSpells';
import type { BattleEvent, BattleHero, BattleState, Stack } from '../src/logic/battleTypes';
import { creature, CREATURE_IDS, lineUnits, strengthOf, tierOf, type CreatureId } from '../src/logic/creatures';
import { damageRange, RANGE_PENALTY_DISTANCE } from '../src/logic/damage';
import { hexAt, neighbours, type Hex } from '../src/logic/hex';
import { ITEMS } from '../src/logic/items';
import { SCHOOLS, SPELLS } from '../src/logic/spells';
import { traitList } from '../src/scenes/battle/unitCard';
import { poisonDose } from '../src/logic/battleTraits';
import { bookTabs, costLine } from '../src/scenes/battle/spellBookData';
import { figureArt, standInFor } from '../src/scenes/battle/standIns';
import { buildingArt } from '../src/scenes/town/townStage';
import { HERO_ART, UNIT_ART } from '../src/art/pixel/manifest';
import { TOWN_ART } from '../src/art/pixel/town';

type Placed = readonly [CreatureId, number, Hex];

const HERO: BattleHero = { name: 'Neferet', attack: 0, defense: 0, power: 2, mana: 40, spells: ['curse', 'ward', 'rebirth', 'bless', 'cure'], skills: {}, morale: 0, luck: 0, ankhs: 1 };

/** A battle with exactly these stacks on these hexes, no obstacles; `heroes` puts HERO on both sides. Stack ids run left first, then right. */
function field(left: readonly Placed[], right: readonly Placed[], active: number, seed = 7, heroes = false): BattleState {
  const side = (ps: readonly Placed[]): BattleSide => ({ hero: heroes ? HERO : null, army: armyOf(ps.map(([c, n]) => ({ creature: c, count: n }))) });
  const { state } = createBattle(side(left), side(right), seed);
  const hexes = [...left, ...right].map(([, , h]) => h);
  return { ...state, obstacles: [], stacks: state.stacks.map((s, i) => ({ ...s, hex: hexes[i]! })), active };
}

const withStack = (s: BattleState, id: number, f: (x: Stack) => Stack): BattleState => ({ ...s, stacks: s.stacks.map((x) => (x.id === id ? f(x) : x)) });
const strikes = (events: readonly BattleEvent[]) => events.filter((e): e is Extract<BattleEvent, { type: 'strike' }> => e.type === 'strike');
const hasEffect = (s: Stack, kind: string): boolean => s.effects.some((e) => e.kind === kind);

/** The first seed from 1 up where `f` holds, for outcomes that hang on a roll. */
function seedWhere(f: (seed: number) => boolean): number {
  for (let seed = 1; seed < 2000; seed++) if (f(seed)) return seed;
  throw new Error('no seed gives that');
}

describe('the Two Lands', () => {
  const EGYPT = ['levy', 'nubian', 'jackal', 'chariot', 'mummy', 'sphinx', 'bennu'] as const;

  it('has seven lines of five ranks, all of them Egypt’s', () => {
    for (const [i, base] of EGYPT.entries()) {
      const units = lineUnits(base);
      expect(units, base).toEqual([base, `${base}2`, `${base}3`, `${base}4`, `${base}5`]);
      for (const id of units) expect(creature(id)).toMatchObject({ faction: 'kemet', level: i + 1 });
    }
    expect(CREATURE_IDS.filter((id) => creature(id).faction === 'kemet')).toHaveLength(35);
  });

  it('carries the design’s numbers and traits', () => {
    expect(creature('levy')).toMatchObject({ name: 'Nile Levy', attack: 4, defense: 5, minDmg: 1, maxDmg: 3, hp: 10, speed: 4, growth: 14, cost: { gold: 60 } });
    expect(creature('chariot')).toMatchObject({ hexes: 3, charge: true, speed: 8 });
    expect(creature('mummy')).toMatchObject({ undead: true, curse: 0.25 });
    expect(creature('mummy2').curse).toBeCloseTo(0.35);
    expect(creature('mummy3').curse).toBeCloseTo(0.5);
    expect(creature('sphinx')).toMatchObject({ wide: true, guardian: true });
    expect(creature('bennu')).toMatchObject({ flies: true, rebirth: 'half', cost: { gold: 3000, gems: 1 } });
    expect(creature('bennu3')).toMatchObject({ rebirth: 'all', cost: { gold: 4400, gems: 3 } });
    expect(creature('levy3')).toMatchObject({ shieldWall: true, attack: 7, defense: 8 });
    expect(creature('nubian3')).toMatchObject({ noRangePenalty: true, shots: 20, cost: { gold: 170 } });
    expect(creature('jackal3').noRetaliation).toBe(true);
  });

  it('brings Egypt’s neutrals', () => {
    expect(creature('hyena')).toMatchObject({ faction: 'neutral', level: 1, hp: 7, speed: 6 });
    expect(creature('raider')).toMatchObject({ faction: 'neutral', shots: 8 });
    expect(creature('scorpion').poison).toBeCloseTo(0.1);
    expect(creature('crocodile')).toMatchObject({ hexes: 3, noRetaliation: true });
    expect(creature('petsuchos')).toMatchObject({ hexes: 3, regen: 10, level: 6, hp: 120, speed: 5 });
    expect(strengthOf('petsuchos', 1)).toBeGreaterThan(strengthOf('hydra', 1));
  });

  it('is about as strong as the Greeks, level by level', () => {
    const greek = ['spearman', 'bowman', 'griffin', 'swordsman', 'monk', 'lancer', 'seraph'] as const;
    EGYPT.forEach((e, i) => {
      const ratio = strengthOf(e, 1) / strengthOf(greek[i]!, 1);
      expect(ratio, e).toBeGreaterThan(0.75);
      expect(ratio, e).toBeLessThan(1.35);
    });
  });

  it('names every new trait on the unit card', () => {
    expect(traitList('mummy').join(' ')).toMatch(/curse/i);
    expect(traitList('bennu').join(' ')).toMatch(/rises/i);
    expect(traitList('bennu3').join(' ')).toMatch(/all/i);
    expect(traitList('sphinx').join(' ')).toMatch(/every strike/i);
    expect(traitList('levy3').join(' ')).toMatch(/shots against it/i);
    expect(traitList('nubian3').join(' ')).toMatch(/any range/i);
    expect(traitList('scorpion').join(' ')).toMatch(/poison/i);
  });
});

describe('curse on strike', () => {
  const mummyHits = (seed: number, target: CreatureId = 'spearman'): { state: BattleState; events: readonly BattleEvent[] } => {
    const s = field([['mummy', 5, hexAt(4, 5)]], [[target, 200, hexAt(5, 5)]], 0, seed);
    return act(s, { type: 'attack', target: 1, from: hexAt(4, 5) });
  };

  it('curses a living target some of the time, never all', () => {
    const cursed = seedWhere((seed) => hasEffect(stackById(mummyHits(seed).state, 1), 'curse'));
    const spared = seedWhere((seed) => !hasEffect(stackById(mummyHits(seed).state, 1), 'curse'));
    expect(cursed).not.toBe(spared);
  });

  it('makes the cursed stack deal its least damage', () => {
    const s = field([['spearman', 20, hexAt(4, 5)]], [['spearman', 20, hexAt(5, 5)]], 0);
    const cursed = withStack(s, 0, (x) => ({ ...x, effects: [{ kind: 'curse', rounds: 3 }] }));
    const ctx = { ranged: false, distance: 1, moved: 0 };
    const r = damageRange(cursed, stackById(cursed, 0), stackById(cursed, 1), ctx);
    expect(r.min).toBe(r.max);
    expect(r.min).toBe(damageRange(s, stackById(s, 0), stackById(s, 1), ctx).min);
    const step = act(cursed, { type: 'attack', target: 1, from: hexAt(4, 5) });
    expect(strikes(step.events)[0]!.damage).toBe(r.min);
  });

  it('never curses the undead', () => {
    for (let seed = 1; seed < 40; seed++) expect(hasEffect(stackById(mummyHits(seed, 'skeleton').state, 1), 'curse')).toBe(false);
  });
});

describe('rebirth', () => {
  /** A stack of `n` of `bird` (side 1) wiped out by a huge stack of titans. */
  const wipe = (bird: CreatureId, n: number, s0?: BattleState) => {
    const s = s0 ?? field([['seraph', 60, hexAt(4, 5)]], [[bird, n, hexAt(5, 5)]], 0);
    return act(s, { type: 'attack', target: 1, from: hexAt(4, 5) });
  };

  it('raises a wiped-out Bennu once, with half its creatures', () => {
    const step = wipe('bennu', 4);
    const b = stackById(step.state, 1);
    expect(b.count).toBe(2);
    expect(b.topHp).toBe(creature('bennu').hp);
    expect(step.events.some((e) => e.type === 'rebirth' && e.stack === 1)).toBe(true);
    expect(step.state.winner).toBeNull();
  });

  it('rises with at least one, and Bennu of Ra with all', () => {
    expect(stackById(wipe('bennu', 1).state, 1).count).toBe(1);
    expect(stackById(wipe('bennu3', 5).state, 1).count).toBe(5);
  });

  it('happens once a battle: the second time it stays down', () => {
    const once = wipe('bennu', 4).state;
    const again = { ...once, active: 0, stacks: once.stacks.map((x) => ({ ...x, acted: false, retaliationsLeft: 1 })) };
    const step = wipe('bennu', 4, again);
    expect(stackById(step.state, 1).count).toBe(0);
    expect(step.state.winner).toBe(0);
  });
});

describe('guardian', () => {
  it('answers every strike in a round', () => {
    const at = hexAt(5, 5);
    const sides = neighbours(at).filter((h) => h !== hexAt(6, 5)).slice(0, 3);
    let st = field(sides.map((h): Placed => ['spearman', 5, h]), [['sphinx', 2, at]], 0);
    for (const id of [0, 1, 2]) {
      const step = act({ ...st, active: id }, { type: 'attack', target: 3, from: stackById(st, id).hex });
      expect(strikes(step.events).some((e) => e.retaliation), `strike ${id}`).toBe(true);
      st = step.state;
    }
  });
});

describe('shield wall and the long bow', () => {
  const shot = (shooter: CreatureId, target: CreatureId, distance: number): number => {
    const s = field([[shooter, 10, hexAt(0, 5)]], [[target, 10, hexAt(10, 5)]], 0);
    return damageRange(s, stackById(s, 0), stackById(s, 1), { ranged: true, distance, moved: 0 }).max;
  };

  it('halves shots against a Shardana Guard (a Spartan has the same numbers and no wall)', () => {
    expect(creature('spearman3')).toMatchObject({ attack: creature('levy3').attack, defense: creature('levy3').defense });
    expect(shot('bowman', 'levy3', 3)).toBe(Math.floor(shot('bowman', 'spearman3', 3) / 2));
  });

  it('a wall holds against shots, not blows', () => {
    const s = field([['spearman', 10, hexAt(4, 5)]], [['levy3', 10, hexAt(5, 5)]], 0);
    const t = field([['spearman', 10, hexAt(4, 5)]], [['spearman3', 10, hexAt(5, 5)]], 0);
    const melee = { ranged: false, distance: 1, moved: 0 };
    expect(damageRange(s, stackById(s, 0), stackById(s, 1), melee)).toEqual(damageRange(t, stackById(t, 0), stackById(t, 1), melee));
  });

  it('lets the Bowman of Ta-Seti shoot as hard at any range', () => {
    const far = RANGE_PENALTY_DISTANCE + 3;
    expect(shot('nubian3', 'spearman', far)).toBe(shot('nubian3', 'spearman', 3));
    expect(shot('nubian2', 'spearman', far)).toBeLessThan(shot('nubian2', 'spearman', 3));
  });
});

describe('poison', () => {
  const sting = (target: CreatureId) => {
    const s = field([['scorpion', 10, hexAt(4, 5)]], [[target, 30, hexAt(5, 5)]], 0);
    return act(s, { type: 'attack', target: 1, from: hexAt(4, 5) });
  };
  /** Plays the battle on with the AI until stack `id` has started `turns` more turns. */
  const playTurns = (start: BattleState, id: number, turns: number): { state: BattleState; events: BattleEvent[] } => {
    let state = start;
    const events: BattleEvent[] = [];
    for (let seen = 0, guard = 0; seen < turns && state.winner === null && guard < 200; guard++) {
      const step = act(state, { type: 'defend' });
      events.push(...step.events);
      seen += step.events.filter((e) => e.type === 'turn' && e.stack === id).length;
      state = step.state;
    }
    return { state, events };
  };

  it('a landed sting poisons a living target', () => {
    const step = sting('spearman');
    expect(step.events.some((e) => e.type === 'afflict' && e.stack === 1 && e.effect === 'poison')).toBe(true);
    expect(hasEffect(stackById(step.state, 1), 'poison')).toBe(true);
  });

  it('takes a tenth of the stinging blow at the start of each of the target’s next three turns, then stops', () => {
    const step = sting('griffin');
    const hp = (s: BattleState): number => { const x = stackById(s, 1); return (x.count - 1) * creature('griffin').hp + x.topHp; };
    // The griffins' first turn may start in the sting's own step: count from the sting on.
    const after = playTurns(step.state, 1, 3);
    const ticks = [...step.events, ...after.events].filter((e): e is Extract<BattleEvent, { type: 'poison' }> => e.type === 'poison' && e.stack === 1);
    const stung = strikes(step.events).find((e) => e.target === 1)!.damage;
    const tick = poisonDose(stung, 0.1);
    expect(tick).toBe(Math.max(1, Math.floor(stung / 10)));
    expect(ticks.map((t) => t.damage)).toEqual([tick, tick, tick]);
    expect(hp(after.state)).toBe(30 * creature('griffin').hp - stung - 3 * tick);
    expect(hasEffect(stackById(after.state, 1), 'poison')).toBe(false);
  });

  it('scales with the scorpions: a bigger stack poisons harder, a fresh sting replaces the old, Healing lifts it', () => {
    const doseFrom = (n: number): number => {
      const s = field([['scorpion', n, hexAt(4, 5)]], [['ogre', 50, hexAt(5, 5)]], 0);
      return stackById(act(s, { type: 'attack', target: 1, from: hexAt(4, 5) }).state, 1).effects.find((e) => e.kind === 'poison')!.dose!;
    };
    expect(doseFrom(40)).toBeGreaterThan(doseFrom(5) * 4);
    const s = field([['scorpion', 5, hexAt(4, 5)]], [['ogre', 50, hexAt(5, 5)]], 0, 7, true);
    const old = withStack(s, 1, (x) => ({ ...x, effects: [{ kind: 'poison', rounds: 1, dose: 999 }] }));
    const stung = act(old, { type: 'attack', target: 1, from: hexAt(4, 5) }).state;
    const poisons = stackById(stung, 1).effects.filter((e) => e.kind === 'poison');
    expect(poisons).toHaveLength(1);
    expect(poisons[0]!.dose).toBeLessThan(999);
    const fresh = { ...s, stacks: s.stacks.map((x) => (x.id === 1 ? { ...x, effects: [{ kind: 'poison' as const, rounds: 3, dose: 5 }] } : x)) };
    expect(hasEffect(stackById(castSpell(fresh, 1, 'cure', 1).state, 1), 'poison')).toBe(false);
  });

  it('never poisons the undead', () => {
    expect(hasEffect(stackById(sting('skeleton').state, 1), 'poison')).toBe(false);
  });
});

describe('the Sacred Rites', () => {
  it('are a school of their own in the spellbook', () => {
    expect(SCHOOLS.map((s) => s.id)).toContain('rites');
    expect(SCHOOLS.find((s) => s.id === 'rites')!.name).toBe('Sacred Rites');
    for (const id of ['curse', 'ward', 'rebirth'] as const) expect(SPELLS[id].school).toBe('rites');
    expect(SPELLS.rebirth).toMatchObject({ level: 2, mana: 12, ankhs: 1 });
  });

  it('Curse of Set: the enemy deals its least damage; the undead are immune; Healing lifts it', () => {
    const s = field([['spearman', 10, hexAt(0, 5)]], [['spearman', 10, hexAt(10, 5)], ['skeleton', 10, hexAt(10, 2)]], 0, 7, true);
    const step = castSpell(s, 0, 'curse', 1);
    expect(stackById(step.state, 1).effects).toEqual([{ kind: 'curse', rounds: 2 }]);
    expect(cantCast(s, 0, 'curse', stackById(s, 2))).toMatch(/undead/i);
    const cured = castSpell(step.state, 1, 'cure', 1).state;
    expect(hasEffect(stackById(cured, 1), 'curse')).toBe(false);
  });

  it('a curse and Wisdom of Athena put each other out', () => {
    const s = field([['spearman', 10, hexAt(0, 5)]], [['spearman', 10, hexAt(10, 5)]], 0, 7, true);
    const blessed = castSpell(s, 1, 'bless', 1).state;
    const cursed = castSpell(blessed, 0, 'curse', 1).state;
    expect(stackById(cursed, 1).effects.map((e) => e.kind)).toEqual(['curse']);
  });

  it('Ward of Isis soaks the next 10 × power + 20 damage, then is spent', () => {
    const s = field([['seraph', 1, hexAt(4, 5)]], [['spearman', 100, hexAt(5, 5)]], 0, 7, true);
    const warded = castSpell(s, 1, 'ward', 1).state;
    expect(stackById(warded, 1).effects).toEqual([{ kind: 'ward', rounds: 1, left: 40 }]);
    const plain = act(s, { type: 'attack', target: 1, from: hexAt(4, 5) });
    const step = act(warded, { type: 'attack', target: 1, from: hexAt(4, 5) });
    const dealt = strikes(plain.events)[0]!.damage;
    const soaked = strikes(step.events)[0]!;
    expect(soaked.soaked).toBe(Math.min(40, dealt));
    expect(soaked.damage).toBe(dealt - Math.min(40, dealt));
    expect(hasEffect(stackById(step.state, 1), 'ward')).toBe(dealt < 40);
  });

  it('a blow the ward soaks whole poisons nothing', () => {
    const s = field([['scorpion', 10, hexAt(4, 5)]], [['spearman', 100, hexAt(5, 5)]], 0);
    const warded = withStack(s, 1, (x) => ({ ...x, effects: [{ kind: 'ward', rounds: 1, left: 9999 }] }));
    const step = act(warded, { type: 'attack', target: 1, from: hexAt(4, 5) });
    expect(strikes(step.events)[0]).toMatchObject({ damage: 0 });
    expect(hasEffect(stackById(step.state, 1), 'poison')).toBe(false);
    expect(step.events.some((e) => e.type === 'afflict')).toBe(false);
    // Unwarded, the same blow does poison.
    const plain = act(s, { type: 'attack', target: 1, from: hexAt(4, 5) });
    expect(hasEffect(stackById(plain.state, 1), 'poison')).toBe(true);
  });

  it('a Bennu the blow wipes out rises clean, not poisoned', () => {
    const s = field([['scorpion', 10, hexAt(4, 5)]], [['bennu', 4, hexAt(5, 5)]], 0);
    const frail = withStack(s, 1, (x) => ({ ...x, count: 1, topHp: 1 }));
    const step = act(frail, { type: 'attack', target: 1, from: hexAt(4, 5) });
    expect(step.events.some((e) => e.type === 'rebirth' && e.stack === 1)).toBe(true);
    expect(hasEffect(stackById(step.state, 1), 'poison')).toBe(false);
    expect(step.events.some((e) => e.type === 'afflict' && e.stack === 1)).toBe(false);
  });

  it('Rite of Osiris brings back 30 × power + 40 health of the fallen, for good, for 12 mana and an Ankh', () => {
    const s0 = field([['spearman', 10, hexAt(0, 5)]], [['spearman', 30, hexAt(10, 5)]], 0, 7, true);
    // Twenty Hoplites fallen, the top one hurt.
    const s = withStack(s0, 0, (x) => ({ ...x, count: 4, topHp: 5, startCount: 10 }));
    const step = castSpell(s, 0, 'rebirth', 0);
    // The four left are 65 HP short of the ten there were; 100 HP raises them all, and no more.
    const raised = stackById(step.state, 0);
    expect(raised.count).toBe(10);
    expect(raised.topHp).toBe(10);
    expect(step.state.heroes[0]).toMatchObject({ mana: 28, ankhs: 0 });
    expect(survivors(step.state, 0, armyOf([{ creature: 'spearman', count: 10 }]))[0]).toEqual({ creature: 'spearman', count: 10 });
  });

  it('Rite of Osiris needs an Ankh, someone fallen, and a living (not undead) stack', () => {
    const s = field([['spearman', 10, hexAt(0, 5)], ['mummy', 4, hexAt(0, 2)]], [['spearman', 30, hexAt(10, 5)]], 0, 7, true);
    const hurt = withStack(s, 0, (x) => ({ ...x, count: 5 }));
    expect(cantCast(s, 0, 'rebirth', stackById(s, 0))).toMatch(/fallen/i);
    expect(cantCast(withStack(s, 1, (x) => ({ ...x, count: 2 })), 0, 'rebirth', stackById(withStack(s, 1, (x) => ({ ...x, count: 2 })), 1))).toMatch(/undead/i);
    const noAnkh = { ...hurt, heroes: [{ ...HERO, ankhs: 0 }, HERO] as const };
    expect(cantCast(noAnkh, 0, 'rebirth', null)).toMatch(/ankh/i);
    expect(cantCast(hurt, 0, 'rebirth', stackById(hurt, 0))).toBeNull();
  });

  it('gives Egypt a book of its own, the same grade as the Greeks’ first', () => {
    expect(ITEMS.novicePapyrus).toMatchObject({ name: 'Novice’s Papyrus', slot: 'book', quality: ITEMS.noviceSpellbook.quality, gives: ITEMS.noviceSpellbook.gives });
  });
});

describe('the battle AI and the new traits', () => {
  it('counts a guardian’s answer even when its retaliations are spent', () => {
    const s = field([['spearman', 5, hexAt(4, 5)]], [['sphinx', 1, hexAt(5, 5)]], 0);
    const spent = withStack(s, 1, (x) => ({ ...x, retaliationsLeft: 0 }));
    expect(answers(stackById(spent, 0), stackById(spent, 1))).toBe(true);
  });

  it('plays a whole Egypt-against-Greece battle to the end', () => {
    const side = (army: { creature: CreatureId; count: number }[]): BattleSide => ({ hero: null, army: armyOf(army) });
    let { state } = createBattle(
      side([{ creature: 'levy3', count: 30 }, { creature: 'nubian3', count: 15 }, { creature: 'mummy', count: 6 }, { creature: 'sphinx', count: 2 }, { creature: 'bennu', count: 1 }]),
      side([{ creature: 'spearman', count: 30 }, { creature: 'bowman', count: 15 }, { creature: 'scorpion', count: 8 }, { creature: 'lancer', count: 2 }, { creature: 'seraph', count: 1 }]),
      11,
    );
    for (let i = 0; i < 500 && state.winner === null; i++) state = act(state, chooseAction(state)).state;
    expect(state.winner).not.toBeNull();
  });
});

describe('a town of the Two Lands', () => {
  const NEKHEN: Town = { ...startAdventure(ASHFORD).towns[0]!, faction: 'kemet', built: ['villageHall', 'fort', 'tavern'], stock: {} };
  const RICH = Object.fromEntries(['gold', 'wood', 'ore', 'mercury', 'sulfur', 'crystal', 'gems'].map((r) => [r, 1e6])) as unknown as Purse;
  const built = (t: Town, ...ids: BuildingId[]): Town => ids.reduce((x, b) => build({ ...x, builtToday: false }, b, RICH, []).town, t);

  it('names the buildings its own way, under the same ids', () => {
    expect(buildingIn(NEKHEN, 'guardhouse')).toMatchObject({ name: 'Levy Camp', dwelling: 'levy', says: 'Hires Nile Levies' });
    expect(buildingIn(NEKHEN, 'seraphSpire3')).toMatchObject({ name: 'Temple of Ra', dwelling: 'bennu3' });
    expect(buildingIn(NEKHEN, 'mageGuild1').name).toBe('House of Life');
    expect(buildingIn(NEKHEN, 'blacksmith').name).toBe('Workshop');
    expect(buildingIn(NEKHEN, 'stables').name).toBe('Chariot Road');
    expect(buildingIn(NEKHEN, 'townHall')).toEqual(BUILDINGS.townHall);
  });

  it('leaves a Greek town exactly as it was', () => {
    const greek = startAdventure(ASHFORD).towns[0]!;
    for (const b of BUILD_ORDER) expect(buildingIn(greek, b), b).toEqual(BUILDINGS[b]);
    expect(BUILD_ORDER).not.toContain('templeOsiris');
    expect(BUILD_PLAN).not.toContain('templeOsiris');
  });

  it('stands its dwellings in Egypt’s own order; the Greeks’ are as they were', () => {
    const needs = (b: BuildingId): readonly BuildingId[] => buildingIn(NEKHEN, b).needs;
    expect(needs('archeryRange')).toEqual(['guardhouse']);
    expect(needs('griffinTower')).toEqual(['guardhouse']);
    expect(needs('barracks')).toEqual(['griffinTower']);
    expect(needs('stables')).toEqual(['barracks']);
    expect(needs('monastery')).toEqual(['mageGuild1', 'griffinTower']);
    expect(needs('tiltyard')).toEqual(['monastery']);
    expect(needs('seraphSpire')).toEqual(['tiltyard', 'templeOsiris']);
    // Upgrades keep the Greek rule: the first needs the dwelling, the second the first and the Citadel or Castle.
    expect(needs('griffinTower3')).toEqual(BUILDINGS.griffinTower3.needs);
    expect(cantBuild(NEKHEN, 'barracks', RICH, [])).toBe('Needs Jackal Shrine');
    expect(BUILDINGS.barracks.needs).toEqual(['guardhouse']);
  });

  it('follows its own plan, every step buildable, to a finished town', () => {
    let t: Town = NEKHEN;
    for (let i = 0; i < 60; i++) {
      const next = suggestBuilding(t, RICH, []);
      if (!next) break;
      expect(cantBuild({ ...t, builtToday: false }, next, RICH, []), next).toBeNull();
      t = build({ ...t, builtToday: false }, next, RICH, []).town;
    }
    expect(suggestBuilding(t, RICH, [])).toBeNull();
    expect([...t.built].sort()).toEqual([...buildOrderOf(NEKHEN)].sort());
    expect(t.built.indexOf('griffinTower')).toBeLessThan(t.built.indexOf('barracks'));
  });

  it('hires and upgrades Egypt’s units from its dwellings', () => {
    const t = built(NEKHEN, 'guardhouse');
    expect(dwellings(t)).toEqual(['levy']);
    expect(t.stock).toEqual({ levy: 14 });
    const hired = hire(t, 'levy', 10, RICH, emptyArmy());
    expect(hired.army[0]).toEqual({ creature: 'levy', count: 10 });
    const up = built(hired.town, 'guardhouse2');
    expect(bestUnit(up, 'levy')).toBe('levy2');
    expect(upgradeSlot(up, hired.army, 0, RICH)?.army[0]).toEqual({ creature: 'levy2', count: 10 });
    expect(hireAll(built(t, 'archeryRange', 'griffinTower', 'barracks'), emptyArmy(), RICH).hired.map((h) => h.id).sort()).toEqual(['chariot', 'jackal', 'levy', 'nubian']);
  });

  it('builds the Temple of Osiris after the House of Life; a Greek town never does', () => {
    const greek = { ...NEKHEN, faction: undefined };
    expect(cantBuild(greek, 'templeOsiris', RICH, [])).toMatch(/not built by/i);
    expect(cantBuild(NEKHEN, 'templeOsiris', RICH, [])).toMatch(/House of Life/);
    expect(BUILD_PLANS.kemet.indexOf('templeOsiris')).toBe(BUILD_PLANS.kemet.indexOf('mageGuild1') + 1);
    expect(buildOrderOf(NEKHEN)).toContain('templeOsiris');
    expect(buildAll(greek, []).built).not.toContain('templeOsiris');
    expect(buildAll(NEKHEN, []).built).toContain('templeOsiris');
  });

  it('its temple makes an Ankh a week, and a hero in town takes them', () => {
    const temple = built(NEKHEN, 'mageGuild1', 'templeOsiris');
    expect(temple.ankhs).toBe(1);
    expect(weekly(temple).ankhs).toBe(2);
    const adv = startAdventure(ASHFORD);
    const home = { ...weekly(temple), x: adv.towns[0]!.x, y: adv.towns[0]!.y };
    const there = { ...withTown(adv, home), hero: { ...adv.hero, x: home.x, y: home.y } };
    const took = enterTown(there);
    expect(took.hero.ankhs).toBe(2);
    expect(took.towns[0]!.ankhs).toBeUndefined();
    expect(toBattleHero(took.hero).ankhs).toBe(2);
  });

  it('sells Egypt’s own spellbook in the House of Life', () => {
    expect(spellbookSold(NEKHEN)).toBe('novicePapyrus');
    expect(spellbookSold(startAdventure(ASHFORD).towns[0]!)).toBe('noviceSpellbook');
  });
});

describe('saves and the two peoples', () => {
  const KEMET_MAP: MapDef = { ...ASHFORD, town: { ...ASHFORD.town, faction: 'kemet' }, hero: { ...ASHFORD.hero, faction: 'kemet', ankhs: 2 } };
  const roundTrip = (adv: Adventure, def: MapDef): Adventure | null => parseAdventure(JSON.parse(JSON.stringify(adv)) as unknown, def);

  it('loads a save from before Egypt (no people, no Ankhs) as Greek, unchanged', () => {
    const adv = endDay(answerPrompt(startAdventure(ASHFORD)));
    const old = JSON.parse(JSON.stringify(adv)) as { towns: Record<string, unknown>[]; hero: Record<string, unknown> };
    expect(old.towns[0]!.faction).toBeUndefined();
    expect(old.hero.ankhs).toBeUndefined();
    const loaded = parseAdventure(old, ASHFORD)!;
    expect(loaded).toEqual(adv);
    expect(factionOf(loaded.towns[0])).toBe('crown');
    expect(factionOf(loaded.hero)).toBe('crown');
  });

  it('keeps an Egyptian town’s people, stock and Ankhs, and the hero’s', () => {
    const start = startAdventure(KEMET_MAP);
    expect(start.hero).toMatchObject({ faction: 'kemet', ankhs: 2 });
    // Nekhen-to-be opens with its Levy Camp's first week in.
    expect(start.towns[0]!.stock).toEqual({ levy: 14 });
    const adv = withTown(start, { ...start.towns[0]!, ankhs: 3 });
    const back = roundTrip(adv, KEMET_MAP)!;
    expect(back.towns[0]).toMatchObject({ faction: 'kemet', ankhs: 3, stock: { levy: 14 } });
    expect(back.hero).toMatchObject({ faction: 'kemet', ankhs: 2 });
  });

  it('takes the people from the map, not the save, and drops what that people can’t have', () => {
    const adv = startAdventure(ASHFORD);
    const forged = { ...adv, towns: [{ ...adv.towns[0]!, faction: 'kemet', built: [...adv.towns[0]!.built, 'mageGuild1', 'templeOsiris'], stock: { levy: 5 } }] };
    const back = roundTrip(forged as unknown as Adventure, ASHFORD)!;
    expect(back.towns[0]!.faction).toBeUndefined();
    expect(back.towns[0]!.built).not.toContain('templeOsiris');
    expect(back.towns[0]!.stock).not.toHaveProperty('levy');
  });

  it('brings the Ankhs a battle left back to the map', () => {
    const adv = { ...startAdventure(KEMET_MAP), prompts: [] };
    const sides = battleSides(adv, 'goblins');
    expect(sides.attacker.hero?.ankhs).toBe(2);
    const { state } = createBattle(sides.attacker, sides.defender, sides.seed);
    const won = conquer({ ...state, heroes: [{ ...state.heroes[0]!, ankhs: 1 }, state.heroes[1]] });
    expect(afterBattle(adv, KEMET_MAP, 'goblins', won).hero.ankhs).toBe(1);
  });
});

describe('art not drawn yet', () => {
  it('draws every Egypt unit itself: no stand-in, no tint', () => {
    const egypt = CREATURE_IDS.filter((id) => creature(id).faction === 'kemet');
    expect(egypt.length).toBe(35);
    for (const id of egypt) {
      // Epic and Legendary art comes in its own pass; until then a rank wears its line's base art (figureArt).
      if (tierOf(id) <= 3) expect(UNIT_ART[id], id).toBeDefined();
      expect(standInFor(id), id).toBeNull();
      expect(figureArt(id).tint, id).toBeUndefined();
    }
    expect(figureArt('spearman').tint).toBeUndefined();
  });

  it('has real art for the desert neutrals and Neferet, so they stand in for no one', () => {
    for (const id of ['hyena', 'raider', 'scorpion', 'crocodile', 'petsuchos']) {
      expect(UNIT_ART[id], id).toBeDefined();
      expect(standInFor(id as CreatureId), id).toBeNull();
      expect(figureArt(id).tint, id).toBeUndefined();
    }
    expect(HERO_ART.neferet).toBeDefined();
  });

  it('gives the Temple of Osiris a picture in the hall', () => {
    expect(TOWN_ART[buildingArt('templeOsiris')]).toBeDefined();
  });
});

describe('the spellbook’s tabs and prices', () => {
  it('shows the Sacred Rites to a hero who knows one, and keeps a Greek book as it was', () => {
    expect(bookTabs(['curse', 'ward', 'cure']).map((s) => s.id)).toEqual(['common', 'rites']);
    expect(bookTabs(['magicArrow']).map((s) => s.id)).toEqual(['common', 'olympian']);
    expect(bookTabs(['bless', 'magicArrow']).map((s) => s.id)).toEqual(['common', 'olympian']);
  });

  it('prices the Rite in mana and an Ankh, with the hero’s Ankhs beside it', () => {
    expect(costLine('rebirth', 2)).toBe('12 mana + 1 Ankh\nAnkhs: 2');
    expect(costLine('curse', 2)).toBe('5 mana');
  });
});
