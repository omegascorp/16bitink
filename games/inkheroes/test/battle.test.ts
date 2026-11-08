import { describe, expect, it } from 'vitest';
import { fortification } from '../src/logic/siege';
import { armyOf, splitMonster } from '../src/logic/army';
import { act, activeStack, canShoot, createBattle, experienceFor, moves, stackById, strikeFrom, survivors, update } from '../src/logic/battle';
import { chooseAction } from '../src/logic/battleAi';
import type { BattleHero, BattleState } from '../src/logic/battleTypes';
import { damageFactor, damageRange, hurt } from '../src/logic/damage';
import { COLS, colOf, distance, hexAt, neighbours, ROWS, rowOf } from '../src/logic/hex';
import { SCHOOLS, SPELL_IDS, SPELLS, type SpellSchool } from '../src/logic/spells';

/** A school's spells in the book's order: by level, then cost. */
const schoolSpellIds = (school: SpellSchool): string[] =>
  SPELL_IDS.filter((id) => SPELLS[id].school === school).sort((a, b) => SPELLS[a].level - SPELLS[b].level || SPELLS[a].mana - SPELLS[b].mana || a.localeCompare(b));

const hero = (o: Partial<BattleHero> = {}): BattleHero => ({ name: 'Rowan', attack: 0, defense: 0, power: 1, mana: 20, spells: ['magicArrow', 'bless', 'haste'], skills: {}, morale: 0, luck: 0, ...o });

/** A battle with no obstacles, so placement tests are exact. */
function clear(state: BattleState): BattleState {
  return { ...state, obstacles: [] };
}

describe('hex grid', () => {
  it('has six neighbours inside the field and fewer on the edge', () => {
    expect(neighbours(hexAt(5, 4))).toHaveLength(6);
    expect(neighbours(hexAt(0, 0))).toHaveLength(2);
  });

  it('measures distance across staggered rows', () => {
    expect(distance(hexAt(0, 0), hexAt(12, 0))).toBe(12);
    expect(distance(hexAt(0, 0), hexAt(0, 2))).toBe(2);
    for (const n of neighbours(hexAt(6, 3))) expect(distance(hexAt(6, 3), n)).toBe(1);
  });
});

describe('damage', () => {
  it('adds 5% per point of Attack over Defense, capped at +300%', () => {
    const { state } = createBattle({ hero: hero({ attack: 10 }), army: armyOf([{ creature: 'spearman', count: 10 }]) }, { hero: null, army: armyOf([{ creature: 'goblin', count: 10 }]) }, 1);
    const [a, d] = state.stacks;
    // Spearman 4 + 10 hero vs Goblin 2: 12 points over → +60%.
    expect(damageFactor(state, a!, d!, { ranged: false, distance: 1, moved: 0 })).toBeCloseTo(1.6);
    const huge = { ...state, heroes: [hero({ attack: 200 }), null] as const };
    expect(damageFactor(huge, a!, d!, { ranged: false, distance: 1, moved: 0 })).toBeCloseTo(4);
  });

  it('takes 2.5% per point of Defense over Attack, capped at −70%', () => {
    const { state } = createBattle({ hero: null, army: armyOf([{ creature: 'goblin', count: 10 }]) }, { hero: hero({ defense: 4 }), army: armyOf([{ creature: 'swordsman', count: 1 }]) }, 1);
    const [a, d] = state.stacks;
    // Goblin 4 vs Swordsman 12 + 4: 12 points under → −30%.
    expect(damageFactor(state, a!, d!, { ranged: false, distance: 1, moved: 0 })).toBeCloseTo(0.7);
  });

  it('halves shots beyond 7 hexes and shooters in melee', () => {
    const { state } = createBattle({ hero: null, army: armyOf([{ creature: 'bowman', count: 10 }]) }, { hero: null, army: armyOf([{ creature: 'bowman', count: 10 }]) }, 1);
    const [a, d] = state.stacks;
    const near = damageFactor(state, a!, d!, { ranged: true, distance: 5, moved: 0 });
    expect(damageFactor(state, a!, d!, { ranged: true, distance: 9, moved: 0 })).toBeCloseTo(near / 2);
    expect(damageFactor(state, a!, d!, { ranged: false, distance: 1, moved: 0 })).toBeCloseTo(near / 2);
  });

  it('kills from the top creature down', () => {
    const { state } = createBattle({ hero: null, army: armyOf([{ creature: 'wolf', count: 5 }]) }, { hero: null, army: armyOf([{ creature: 'wolf', count: 5 }]) }, 1);
    const wolves = { ...state.stacks[0]!, topHp: 4 };
    expect(hurt(wolves, 4).kills).toBe(1);
    expect(hurt(wolves, 5)).toMatchObject({ kills: 1, stack: { count: 4, topHp: 9 } });
    expect(hurt(wolves, 999).stack.count).toBe(0);
  });

  it('a blessed unit always deals its most', () => {
    const { state } = createBattle({ hero: null, army: armyOf([{ creature: 'spearman', count: 10 }]) }, { hero: null, army: armyOf([{ creature: 'spearman', count: 10 }]) }, 1);
    const a = { ...state.stacks[0]!, effects: [{ kind: 'bless' as const, rounds: 1 }] };
    const r = damageRange(state, a, state.stacks[1]!, { ranged: false, distance: 1, moved: 0 });
    expect(r.min).toBe(r.max);
  });
});

describe('turns', () => {
  it('lines the armies up in the outer columns and lets the fastest go first', () => {
    const { state } = createBattle(
      { hero: null, army: armyOf([{ creature: 'spearman', count: 5 }, { creature: 'griffin', count: 2 }]) },
      { hero: null, army: armyOf([{ creature: 'wolf', count: 4 }]) },
      3,
    );
    // Two-hex units (griffin, wolf) stand one column in, their back hex on the edge.
    expect(state.stacks.filter((s) => s.side === 0).map((s) => [s.creature, s.hex % COLS])).toEqual([['spearman', 0], ['griffin', 1]]);
    expect(state.stacks.filter((s) => s.side === 1).every((s) => s.hex % COLS === COLS - 2)).toBe(true);
    // Wolf (7) before Griffin (6) before Spearman (4).
    expect(activeStack(state)?.creature).toBe('wolf');
  });

  it('uses H3’s 15 × 11 field, loose formation rows and middle-column obstacles', () => {
    const army = (n: number) => armyOf(Array.from({ length: n }, () => ({ creature: 'spearman' as const, count: 1 })));
    const rows = (n: number) => createBattle({ hero: null, army: army(n) }, { hero: null, army: army(n) }, 2).state.stacks.filter((s) => s.side === 0).map((s) => rowOf(s.hex));
    expect([COLS, ROWS]).toEqual([15, 11]);
    expect(rows(1)).toEqual([5]);
    expect(rows(2)).toEqual([2, 8]);
    expect(rows(4)).toEqual([0, 4, 6, 10]);
    expect(rows(7)).toEqual([0, 2, 4, 5, 6, 8, 10]);
    const right = createBattle({ hero: null, army: army(3) }, { hero: null, army: army(3) }, 2).state.stacks.filter((s) => s.side === 1);
    expect(right.map((s) => colOf(s.hex))).toEqual([14, 14, 14]);
    for (let seed = 1; seed <= 50; seed++) {
      const { obstacles } = createBattle({ hero: null, army: army(7) }, { hero: null, army: army(7) }, seed).state;
      expect(obstacles.length).toBeGreaterThanOrEqual(3);
      expect(obstacles.length).toBeLessThanOrEqual(7);
      for (const h of obstacles) expect(colOf(h) >= 3 && colOf(h) <= COLS - 4).toBe(true);
    }
  });

  it('sends a waiting unit to the end of the round, and starts a new round after', () => {
    let { state } = createBattle({ hero: null, army: armyOf([{ creature: 'spearman', count: 5 }]) }, { hero: null, army: armyOf([{ creature: 'skeleton', count: 4 }]) }, 5);
    state = clear(state);
    const first = activeStack(state)!;
    state = act(state, { type: 'wait' }).state;
    expect(activeStack(state)!.id).not.toBe(first.id);
    state = act(state, { type: 'defend' }).state;
    expect(activeStack(state)!.id).toBe(first.id);
    const step = act(state, { type: 'defend' });
    expect(step.events.some((e) => e.type === 'round')).toBe(true);
    expect(step.state.round).toBe(2);
  });

  it('a walker reaches only as far as its speed, a flyer goes over others', () => {
    const { state } = createBattle({ hero: null, army: armyOf([{ creature: 'griffin', count: 1 }]) }, { hero: null, army: armyOf([{ creature: 'spearman', count: 1 }]) }, 9);
    const reach = moves(clear(state));
    expect([...reach.values()].every((d) => d <= 6)).toBe(true);
    expect(reach.size).toBeGreaterThan(20);
  });
});

describe('fighting', () => {
  it('a melee strike is answered once; the second strike in a round is not', () => {
    let { state } = createBattle({ hero: null, army: armyOf([{ creature: 'wolf', count: 3 }, { creature: 'wolf', count: 3 }]) }, { hero: null, army: armyOf([{ creature: 'ogre', count: 2 }]) }, 11);
    state = clear(state);
    // Put the ogres next to the wolves so both can reach.
    const ogre = state.stacks.find((s) => s.side === 1)!;
    state = update(state, ogre.id, (x) => ({ ...x, hex: hexAt(2, 4), acted: true }));
    const target = stackById(state, ogre.id);
    let me = activeStack(state)!;
    const from = [...strikeFrom(state, target).keys()][0]!;
    let step = act(state, { type: 'attack', target: ogre.id, from });
    expect(step.events.filter((e) => e.type === 'strike').map((e) => e.type === 'strike' && e.retaliation)).toEqual([false, true]);
    state = step.state;
    me = activeStack(state)!;
    const from2 = [...strikeFrom(state, stackById(state, ogre.id)).keys()][0]!;
    step = act(state, { type: 'attack', target: ogre.id, from: from2 });
    expect(step.events.filter((e) => e.type === 'strike' && e.retaliation)).toHaveLength(0);
    expect(me).toBeTruthy();
  });

  it('bandits strike unanswered', () => {
    let { state } = createBattle({ hero: null, army: armyOf([{ creature: 'bandit', count: 3 }]) }, { hero: null, army: armyOf([{ creature: 'ogre', count: 2 }]) }, 13);
    state = clear(state);
    const ogre = state.stacks.find((s) => s.side === 1)!;
    state = update(state, ogre.id, (x) => ({ ...x, hex: hexAt(3, 4) }));
    const from = [...strikeFrom(state, stackById(state, ogre.id)).keys()][0]!;
    const step = act(state, { type: 'attack', target: ogre.id, from });
    expect(step.events.filter((e) => e.type === 'strike')).toHaveLength(1);
  });

  it('shooters shoot unless an enemy stands next to them, and use up shots', () => {
    let { state } = createBattle({ hero: null, army: armyOf([{ creature: 'bowman', count: 5 }]) }, { hero: null, army: armyOf([{ creature: 'skeleton', count: 4 }]) }, 17);
    state = clear(state);
    const me = activeStack(state)!;
    expect(me.creature).toBe('bowman');
    expect(canShoot(state, me)).toBe(true);
    const enemy = state.stacks.find((s) => s.side === 1)!;
    const step = act(state, { type: 'shoot', target: enemy.id });
    expect(stackById(step.state, me.id).shots).toBe(11);
    const crowded = update(state, enemy.id, (x) => ({ ...x, hex: neighbours(me.hex)[0]! }));
    expect(canShoot(crowded, me)).toBe(false);
  });

  it('the hero casts once a round without using the unit’s turn', () => {
    let { state } = createBattle({ hero: hero({ power: 2 }), army: armyOf([{ creature: 'spearman', count: 5 }]) }, { hero: null, army: armyOf([{ creature: 'goblin', count: 20 }]) }, 19);
    state = clear(state);
    while (activeStack(state)!.side !== 0) state = act(state, { type: 'defend' }).state;
    const goblins = state.stacks.find((s) => s.side === 1)!;
    const step = act(state, { type: 'cast', spell: 'magicArrow', target: goblins.id });
    // 10 × 2 + 10 = 30 damage = 6 goblins.
    expect(stackById(step.state, goblins.id).count).toBe(14);
    expect(step.state.heroes[0]!.mana).toBe(15);
    expect(step.state.active).toBe(state.active);
    expect(() => act(step.state, { type: 'cast', spell: 'magicArrow', target: goblins.id })).toThrow(/Already cast/);
  });

  it('Dispel lifts every spell from a unit of either side, and needs one there to lift', () => {
    let { state } = createBattle({ hero: hero({ spells: ['dispel'] }), army: armyOf([{ creature: 'spearman', count: 5 }]) }, { hero: null, army: armyOf([{ creature: 'goblin', count: 20 }]) }, 19);
    state = clear(state);
    while (activeStack(state)!.side !== 0) state = act(state, { type: 'defend' }).state;
    const goblins = state.stacks.find((s) => s.side === 1)!;
    expect(() => act(state, { type: 'cast', spell: 'dispel', target: goblins.id })).toThrow(/No spells/);
    const hasted = update(state, goblins.id, (x) => ({ ...x, effects: [{ kind: 'haste' as const, rounds: 2 }] }));
    const step = act(hasted, { type: 'cast', spell: 'dispel', target: goblins.id });
    expect(stackById(step.state, goblins.id).effects).toEqual([]);
    expect(step.state.heroes[0]!.mana).toBe(15);
  });

  it('sorts spells into common magic and Olympian Favor, every divine power with its god', () => {
    for (const def of Object.values(SPELLS)) {
      expect(SCHOOLS.map((s) => s.id)).toContain(def.school);
      if (def.school === 'olympian') expect(def.god).toBeDefined();
      else expect(def.god).toBeUndefined();
    }
    expect(schoolSpellIds('olympian')).toEqual(['bless', 'bloodlust', 'lightningBolt']);
  });

  it('the AI fights a battle to the end, and the winner earns the dead enemies’ HP', () => {
    let { state } = createBattle(
      { hero: hero({ attack: 2, defense: 2 }), army: armyOf([{ creature: 'spearman', count: 18 }, { creature: 'bowman', count: 7 }]) },
      { hero: null, army: splitMonster('wolf', 12) },
      23,
    );
    for (let i = 0; i < 500 && state.winner === null; i++) state = act(state, chooseAction(state)).state;
    expect(state.winner).not.toBeNull();
    const w = state.winner!;
    expect(experienceFor(state, w)).toBeGreaterThan(0);
    const left = survivors(state, 0, armyOf([{ creature: 'spearman', count: 18 }, { creature: 'bowman', count: 7 }]));
    expect(left.filter(Boolean).length).toBeLessThanOrEqual(2);
  });
});

describe('monsters', () => {
  it('split into about √count near-even stacks, at most four', () => {
    expect(splitMonster('wolf', 10).filter(Boolean).map((s) => s!.count)).toEqual([4, 3, 3]);
    expect(splitMonster('goblin', 4).filter(Boolean)).toHaveLength(2);
    expect(splitMonster('goblin', 40).filter(Boolean)).toHaveLength(4);
    expect(splitMonster('ogre', 1).filter(Boolean)).toHaveLength(1);
  });
});

describe('war machines', () => {
  const sides = () => createBattle(
    { hero: hero(), army: armyOf([{ creature: 'spearman', count: 10 }]), machine: 'catapult' },
    { hero: null, army: armyOf([{ creature: 'goblin', count: 30 }]) },
    3,
    { fort: fortification(['fort'])!, me: 0 },
  );

  it('stay at home when there are no walls to break', () => {
    const open = createBattle({ hero: hero(), army: armyOf([{ creature: 'spearman', count: 10 }]), machine: 'catapult' }, { hero: null, army: armyOf([{ creature: 'goblin', count: 30 }]) }, 3);
    expect(open.state.stacks.some((s) => s.slot < 0)).toBe(false);
  });

  it('stand at the back of their side, out of the formation, and never answer a strike', () => {
    const [machine, ...more] = sides().state.stacks.filter((s) => s.slot < 0);
    expect(more).toEqual([]);
    expect([colOf(machine!.hex), rowOf(machine!.hex)]).toEqual([0, 9]);
    expect(machine).toMatchObject({ creature: 'catapult', retaliationsLeft: 0, side: 0 });
  });

  it('cannot hold the field alone: a side left with only a machine has lost, and survivors leave it out of the army', () => {
    const { state } = sides();
    const spear = state.stacks.find((s) => s.creature === 'spearman')!;
    const goblins = state.stacks.find((s) => s.creature === 'goblin')!;
    const struck = update(update(state, spear.id, (s) => ({ ...s, count: 1, topHp: 1 })), goblins.id, (g) => ({ ...g, hex: hexAt(1, 5) }));
    // Goblins strike the last spearman: the machine still stands, but the battle is lost.
    const g = stackById(struck, goblins.id);
    const from = [...strikeFrom({ ...struck, active: g.id }, stackById(struck, spear.id)).keys()][0]!;
    const end = act({ ...struck, active: g.id }, { type: 'attack', target: spear.id, from }).state;
    expect(end.winner).toBe(1);
    expect(survivors(end, 0, armyOf([{ creature: 'spearman', count: 10 }]))[0]).toBeNull();
  });
});
