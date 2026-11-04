import { describe, expect, it } from 'vitest';
import { ASHFORD, BLACK_BANNER, THORNWOOD } from '../src/level/borderMarch';
import { BLACK_BANNER_LAND } from '../src/level/blackBanner';
import { ASHFORD_LAND } from '../src/level/chapter1';
import { THORNWOOD_LAND } from '../src/level/thornwood';
import type { MapDef } from '../src/level/types';
import { battleSides, startAdventure } from '../src/logic/adventure';
import { armyOf, splitMonster } from '../src/logic/army';
import { act, activeStack, createBattle, stackById, type BattleSide } from '../src/logic/battle';
import { chooseAction } from '../src/logic/battleAi';
import { castSpell } from '../src/logic/battleSpells';
import type { Action, BattleEvent, BattleHero, BattleState, Stack } from '../src/logic/battleTypes';
import { creature, strengthOf, type CreatureId } from '../src/logic/creatures';
import { adjacent, occupiedHexes } from '../src/logic/footprint';
import { hexAt, neighbours, type Hex } from '../src/logic/hex';
import { armyStrength, autoBattle } from '../src/logic/rival';

type Placed = readonly [CreatureId, number, Hex];

/** A battle with exactly these stacks on these hexes, no obstacles. Stack ids run left side first, then right; `active` picks whose turn it is. */
function field(left: readonly Placed[], right: readonly Placed[], active: number, seed = 7, obstacles: readonly Hex[] = []): BattleState {
  const side = (ps: readonly Placed[]): BattleSide => ({ hero: null, army: armyOf(ps.map(([c, n]) => ({ creature: c, count: n }))) });
  const { state } = createBattle(side(left), side(right), seed);
  const hexes = [...left, ...right].map(([, , h]) => h);
  return { ...state, obstacles: [...obstacles], stacks: state.stacks.map((s, i) => ({ ...s, hex: hexes[i]! })), active };
}

const moveEvents = (events: readonly BattleEvent[], id: number) => events.filter((e) => e.type === 'move' && e.stack === id);
const strikes = (events: readonly BattleEvent[]) => events.filter((e): e is Extract<BattleEvent, { type: 'strike' }> => e.type === 'strike');
/** Whether these events turned stack `id` to stone. */
const turned = (events: readonly BattleEvent[], id: number): boolean => events.some((e) => e.type === 'stone' && e.stack === id && !e.lost);
const withStack = (s: BattleState, id: number, f: (x: Stack) => Stack): BattleState => ({ ...s, stacks: s.stacks.map((x) => (x.id === id ? f(x) : x)) });

/** The first seed from 1 up where `f` holds, for outcomes that hang on a roll. */
function seedWhere(f: (seed: number) => boolean): number {
  for (let seed = 1; seed < 2000; seed++) if (f(seed)) return seed;
  throw new Error('no seed gives that');
}

describe('the new neutrals', () => {
  it('are neutrals with the traits the design gives them', () => {
    expect(creature('boar')).toMatchObject({ name: 'Erymanthian Boar', plural: 'Erymanthian Boars', faction: 'neutral', wide: true, charge: true });
    expect(creature('stymphalian')).toMatchObject({ name: 'Stymphalian Bird', plural: 'Stymphalian Birds', faction: 'neutral', flies: true, swoop: true });
    expect(creature('hydra')).toMatchObject({ name: 'Lernaean Hydra', plural: 'Lernaean Hydras', faction: 'neutral', wide: true, cleave: true });
    expect(creature('hydra').regen).toBeGreaterThan(0);
    expect(creature('basilisk')).toMatchObject({ name: 'Basilisk', plural: 'Basilisks', faction: 'neutral' });
    expect(creature('basilisk').petrify).toBeCloseTo(0.25);
  });

  it('sit between the neutrals around them in strength', () => {
    const one = (id: CreatureId): number => strengthOf(id, 1);
    expect(one('stymphalian')).toBeGreaterThan(one('wolf') * 0.8);
    expect(one('stymphalian')).toBeLessThan(one('ogre') * 0.5);
    expect(one('boar')).toBeGreaterThan(one('wolf'));
    expect(one('boar')).toBeLessThan(one('ogre'));
    expect(one('basilisk')).toBeGreaterThan(one('wolf'));
    expect(one('basilisk')).toBeLessThan(one('ogre'));
    expect(one('hydra')).toBeGreaterThan(one('ogre'));
    expect(one('hydra')).toBeLessThan(one('lancer'));
  });
});

describe('the boar charges', () => {
  it('hits harder the further it ran', () => {
    const run = (at: Hex): number => {
      const s = field([['boar', 10, at]], [['goblin', 50, hexAt(8, 5)]], 0);
      const step = act(s, { type: 'attack', target: 1, from: hexAt(7, 5) });
      return strikes(step.events)[0]!.damage;
    };
    expect(run(hexAt(2, 5))).toBeGreaterThan(run(hexAt(6, 5)));
  });
});

describe('swoop', () => {
  const home = hexAt(2, 5);
  const beside = hexAt(5, 5);

  it('flies back to where it started once the strike and the answer are over', () => {
    const s = field([['stymphalian', 10, home]], [['goblin', 20, hexAt(6, 5)]], 0);
    const step = act(s, { type: 'attack', target: 1, from: beside });
    expect(step.events.filter((e) => e.type === 'move' || e.type === 'strike').map((e) => e.type)).toEqual(['move', 'strike', 'strike', 'move']);
    expect(moveEvents(step.events, 0).at(-1)).toMatchObject({ path: [home], flies: true });
    expect(stackById(step.state, 0).hex).toBe(home);
  });

  it('stays put when it struck without leaving its hex', () => {
    const s = field([['stymphalian', 10, beside]], [['goblin', 20, hexAt(6, 5)]], 0);
    const step = act(s, { type: 'attack', target: 1, from: beside });
    expect(moveEvents(step.events, 0)).toEqual([]);
    expect(stackById(step.state, 0).hex).toBe(beside);
  });

  it('stays where it struck when its home hex is taken', () => {
    const s = field([['stymphalian', 10, home]], [['goblin', 20, hexAt(6, 5)]], 0, 7, [home]);
    const step = act(s, { type: 'attack', target: 1, from: beside });
    expect(moveEvents(step.events, 0)).toHaveLength(1);
    expect(stackById(step.state, 0).hex).toBe(beside);
  });

  it('does not fly home dead: a bird killed by the answer stays down', () => {
    const s = field([['stymphalian', 1, home], ['spearman', 5, hexAt(0, 0)]], [['ogre', 9, hexAt(6, 5)]], 0);
    const step = act(s, { type: 'attack', target: 2, from: beside });
    expect(stackById(step.state, 0).count).toBe(0);
    expect(moveEvents(step.events, 0)).toHaveLength(1);
    expect(stackById(step.state, 0).hex).toBe(beside);
  });

  it('does not fly home turned to stone', () => {
    const start = (seed: number): BattleState => field([['stymphalian', 20, home]], [['basilisk', 3, hexAt(6, 5)], ['spearman', 1, hexAt(14, 10)]], 0, seed);
    const seed = seedWhere((n) => turned(act(start(n), { type: 'attack', target: 1, from: beside }).events, 0));
    const step = act(start(seed), { type: 'attack', target: 1, from: beside });
    expect(stackById(step.state, 0).count).toBeGreaterThan(0);
    expect(stackById(step.state, 0).hex).toBe(beside);
  });

  it('a moving bird with nobody to strike keeps its new hex', () => {
    const s = field([['stymphalian', 10, home]], [['goblin', 20, hexAt(12, 5)]], 0);
    expect(stackById(act(s, { type: 'move', to: hexAt(4, 5) }).state, 0).hex).toBe(hexAt(4, 5));
  });

  it('leaves the AI striking again next round from home', () => {
    let s = field([['stymphalian', 10, home]], [['spearman', 12, hexAt(6, 5)]], 0);
    for (let round = 0; round < 3; round++) {
      const a = chooseAction(s);
      expect(a.type).toBe('attack');
      s = act(s, a).state;
      expect(stackById(s, 0).hex).toBe(home);
      while (s.winner === null && s.active !== 0) s = act(s, { type: 'defend' }).state;
    }
  });
});

describe('cleave', () => {
  const at = hexAt(6, 5);
  const [e1, e2, e3] = neighbours(at).filter((h) => h !== hexAt(5, 5));

  it('hits only the target when no one else stands beside it', () => {
    const s = field([['hydra', 3, hexAt(5, 5)]], [['spearman', 20, at], ['spearman', 20, hexAt(12, 1)]], 0);
    const step = act(s, { type: 'attack', target: 1, from: hexAt(5, 5) });
    expect(strikes(step.events).filter((e) => !e.retaliation).map((e) => e.target)).toEqual([1]);
    expect(stackById(step.state, 2).count).toBe(20);
  });

  it('hits every enemy stack beside it, target first, and all blows land before any answer', () => {
    const s = field([['hydra', 3, at]], [['spearman', 20, e1!], ['spearman', 20, e2!], ['spearman', 20, e3!]], 0);
    const step = act(s, { type: 'attack', target: 2, from: at });
    const all = strikes(step.events);
    expect(all.filter((e) => !e.retaliation).map((e) => e.target)).toEqual([2, 1, 3]);
    expect(all.map((e) => e.retaliation)).toEqual([false, false, false, true, true, true]);
    for (const id of [1, 2, 3]) expect(stackById(step.state, id).count).toBeLessThan(20);
  });

  it('counts both of its hexes, and spares its own side', () => {
    const tail = hexAt(4, 5);
    const behind = neighbours(tail).find((h) => !neighbours(at).includes(h) && h !== at)!;
    const friend = neighbours(at).find((h) => h !== tail && h !== e1 && !neighbours(tail).includes(h))!;
    const s = field([['hydra', 3, hexAt(5, 5)], ['spearman', 20, friend]], [['spearman', 20, at], ['spearman', 20, behind]], 0);
    const step = act(s, { type: 'attack', target: 2, from: hexAt(5, 5) });
    expect(strikes(step.events).filter((e) => !e.retaliation).map((e) => e.target).sort()).toEqual([2, 3]);
    expect(stackById(step.state, 1).count).toBe(20);
  });

  it('each struck stack answers once at most, and only with a retaliation left', () => {
    const s = field([['hydra', 3, at]], [['griffin', 5, e1!], ['spearman', 20, e2!], ['spearman', 20, e3!]], 0);
    const spent = withStack(s, 3, (x) => ({ ...x, retaliationsLeft: 0 }));
    const step = act(spent, { type: 'attack', target: 1, from: at });
    const answers = strikes(step.events).filter((e) => e.retaliation).map((e) => e.stack).sort();
    expect(answers).toEqual([1, 2]);
    expect(stackById(step.state, 1).retaliationsLeft).toBe(1);
    expect(stackById(step.state, 2).retaliationsLeft).toBe(0);
    expect(stackById(step.state, 3).retaliationsLeft).toBe(0);
  });

  it('stops the answers when they kill it', () => {
    const s = field([['hydra', 1, at]], [['ogre', 40, e1!], ['ogre', 40, e2!], ['ogre', 40, e3!]], 0);
    const step = act(s, { type: 'attack', target: 1, from: at });
    expect(stackById(step.state, 0).count).toBe(0);
    expect(strikes(step.events).filter((e) => e.retaliation)).toHaveLength(1);
  });

  it('answers a strike on it with one blow, at the striker alone', () => {
    const west = hexAt(5, 5);
    const s = field([['spearman', 20, west], ['spearman', 20, hexAt(6, 4)]], [['hydra', 3, at]], 0);
    const step = act(s, { type: 'attack', target: 2, from: west });
    expect(strikes(step.events).map((e) => [e.stack, e.target])).toEqual([[0, 2], [2, 0]]);
    expect(stackById(step.state, 1).count).toBe(20);
  });

  it('the AI picks the hex touching more enemies', () => {
    // Hoplites spread out: one alone in the north, two side by side in the south, all in reach.
    const lone = hexAt(9, 2);
    const pair = [hexAt(9, 8), hexAt(9, 7)] as const;
    const s = field([['hydra', 4, hexAt(6, 5)]], [['spearman', 12, lone], ['spearman', 12, pair[0]], ['spearman', 12, pair[1]]], 0);
    const a = chooseAction(s) as Extract<Action, { type: 'attack' }>;
    expect(a.type).toBe('attack');
    const hydra = { ...stackById(s, 0), hex: a.from };
    const touched = s.stacks.filter((x) => x.side === 1 && adjacent(hydra, x)).length;
    expect(touched).toBe(2);
  });
});

describe('regen', () => {
  const regen = creature('hydra').regen!;

  /** A hydra stack wounded to `topHp`, with the turn about to come round to it after the spearmen's. */
  const wounded = (topHp: number, count = 3): BattleState =>
    withStack(field([['spearman', 1, hexAt(0, 0)]], [['hydra', count, hexAt(12, 9)]], 0), 1, (x) => ({ ...x, topHp, acted: false }));

  it('heals the top creature by its number when its turn starts, and says so', () => {
    const hp = creature('hydra').hp;
    const step = act(wounded(hp - regen - 3), { type: 'defend' });
    expect(step.state.active).toBe(1);
    expect(stackById(step.state, 1).topHp).toBe(hp - 3);
    expect(step.events).toContainEqual({ type: 'heal', stack: 1, target: 1, amount: regen });
    const order = step.events.map((e) => e.type);
    expect(order.indexOf('heal')).toBeLessThan(order.indexOf('turn'));
  });

  it('never goes over full', () => {
    const hp = creature('hydra').hp;
    const step = act(wounded(hp - 2), { type: 'defend' });
    expect(stackById(step.state, 1).topHp).toBe(hp);
    expect(step.events).toContainEqual({ type: 'heal', stack: 1, target: 1, amount: 2 });
  });

  it('does nothing, and says nothing, at full health', () => {
    const hp = creature('hydra').hp;
    const step = act(wounded(hp), { type: 'defend' });
    expect(stackById(step.state, 1).topHp).toBe(hp);
    expect(step.events.some((e) => e.type === 'heal')).toBe(false);
  });

  it('never brings back the fallen', () => {
    const step = act(wounded(1, 2), { type: 'defend' });
    expect(stackById(step.state, 1).count).toBe(2);
    let s = field([['spearman', 1, hexAt(0, 0)]], [['hydra', 3, hexAt(12, 9)], ['spearman', 1, hexAt(14, 0)]], 0);
    s = withStack(s, 1, (x) => ({ ...x, count: 0, topHp: 0 }));
    const after = act(s, { type: 'defend' });
    expect(stackById(after.state, 1)).toMatchObject({ count: 0, topHp: 0 });
  });

  it('regrows once a round even if it waits', () => {
    const hp = creature('hydra').hp;
    const low = hp - regen * 3;
    let s = act(wounded(low), { type: 'defend' }).state;
    expect(stackById(s, 1).topHp).toBe(low + regen);
    s = act(s, { type: 'wait' }).state;
    expect(stackById(s, 1).topHp).toBe(low + regen);
  });
});

describe('petrify', () => {
  const strikeAt = hexAt(5, 5);
  const start = (seed: number, count = 9): BattleState => field([['basilisk', count, strikeAt]], [['spearman', 40, hexAt(6, 5)], ['spearman', 1, hexAt(14, 10)]], 0, seed);
  const hit = (s: BattleState) => act(s, { type: 'attack', target: 1, from: strikeAt });
  const stoned = (s: BattleState, id: number): boolean => stackById(s, id).effects.some((e) => e.kind === 'stone');

  it('lands about one strike in four, and is the same every time for a seed', () => {
    const n = 400;
    const landed = Array.from({ length: n }, (_, i) => turned(hit(start(i + 1)).events, 1)).filter(Boolean).length;
    expect(landed / n).toBeGreaterThan(0.18);
    expect(landed / n).toBeLessThan(0.32);
    expect(hit(start(11))).toEqual(hit(start(11)));
  });

  it('says so, and a stack turned to stone does not answer', () => {
    const step = hit(start(seedWhere((n) => turned(hit(start(n)).events, 1))));
    expect(step.events).toContainEqual({ type: 'stone', stack: 1, lost: false });
    expect(strikes(step.events).filter((e) => e.retaliation)).toEqual([]);
  });

  it('costs the target exactly one turn, when it had not yet acted this round', () => {
    const first = hit(start(seedWhere((n) => turned(hit(start(n)).events, 1))));
    expect(first.events).toContainEqual({ type: 'stone', stack: 1, lost: true });
    expect(first.state.active).not.toBe(1);
    expect(stoned(first.state, 1)).toBe(false);
    // Round on: it has its turn again.
    let s = first.state;
    for (let i = 0; i < 6 && s.active !== 1; i++) s = act(s, { type: 'defend' }).state;
    expect(s.active).toBe(1);
  });

  it('costs the target exactly one turn, when it had already acted this round', () => {
    const acted = (seed: number): BattleState => withStack(start(seed), 1, (x) => ({ ...x, acted: true }));
    const step = hit(acted(seedWhere((n) => turned(hit(acted(n)).events, 1))));
    expect(stoned(step.state, 1)).toBe(true);
    let s = step.state;
    let lost = 0;
    for (let i = 0; i < 12 && s.active !== 1; i++) {
      const next = act(s, { type: 'defend' });
      lost += next.events.filter((e) => e.type === 'stone' && e.lost).length;
      s = next.state;
    }
    expect(lost).toBe(1);
    expect(s.active).toBe(1);
    expect(s.round).toBe(step.state.round + 2);
  });

  it('does nothing to a dead target', () => {
    const s = field([['basilisk', 30, strikeAt]], [['goblin', 1, hexAt(6, 5)], ['spearman', 1, hexAt(14, 10)]], 0);
    for (let seed = 1; seed <= 40; seed++) {
      const step = act({ ...s, seed }, { type: 'attack', target: 1, from: strikeAt });
      expect(stackById(step.state, 1).count).toBe(0);
      expect(stackById(step.state, 1).effects).toEqual([]);
      expect(step.events.some((e) => e.type === 'stone')).toBe(false);
    }
  });

  it('a basilisk’s answer can turn its striker to stone too', () => {
    const go = (seed: number) => act(field([['spearman', 30, strikeAt], ['spearman', 1, hexAt(0, 0)]], [['basilisk', 9, hexAt(6, 5)]], 0, seed), { type: 'attack', target: 2, from: strikeAt });
    const seed = seedWhere((n) => stoned(go(n).state, 0));
    expect(stoned(go(seed).state, 0)).toBe(true);
  });

  it('does not stack: a second stone on a stone stack is still one lost turn', () => {
    const spent = (seed: number): BattleState => withStack(start(seed), 1, (x) => ({ ...x, acted: true, effects: [{ kind: 'stone', rounds: 1 }] }));
    const step = hit(spent(seedWhere((n) => turned(hit(spent(n)).events, 1))));
    expect(stackById(step.state, 1).effects).toEqual([{ kind: 'stone', rounds: 1 }]);
  });

  it('is lifted by Healing', () => {
    const hero: BattleHero = { name: 'Rowan', attack: 0, defense: 0, power: 1, mana: 20, spells: ['cure'], skills: {}, morale: 0, luck: 0 };
    const base = field([['spearman', 5, hexAt(1, 1)]], [['goblin', 5, hexAt(9, 9)]], 0);
    const s = withStack({ ...base, heroes: [hero, null] }, 0, (x) => ({ ...x, effects: [{ kind: 'stone', rounds: 1 }] }));
    expect(stackById(castSpell(s, 0, 'cure', 0).state, 0).effects).toEqual([]);
  });

  it('the AI would rather turn a stack to stone than strike one that already is', () => {
    const base = field([['basilisk', 6, hexAt(7, 5)]], [['spearman', 10, hexAt(6, 5)], ['spearman', 10, hexAt(8, 5)]], 0);
    const quiet = { ...base, stacks: base.stacks.map((x) => (x.side === 1 ? { ...x, retaliationsLeft: 0 } : x)) };
    const s = withStack(quiet, 1, (x) => ({ ...x, effects: [{ kind: 'stone', rounds: 1 }] }));
    expect(chooseAction(s)).toMatchObject({ type: 'attack', target: 2 });
  });

  it('the AI takes a free blow on a stack too stone to answer', () => {
    const base = field([['basilisk', 6, hexAt(7, 5)]], [['spearman', 10, hexAt(6, 5)], ['spearman', 10, hexAt(8, 5)]], 0);
    const s = withStack(base, 2, (x) => ({ ...x, effects: [{ kind: 'stone', rounds: 1 }] }));
    expect(chooseAction(s)).toMatchObject({ type: 'attack', target: 2 });
  });
});

describe('auto-battle with the new neutrals', () => {
  const crown: BattleSide = { hero: null, army: armyOf([{ creature: 'spearman', count: 30 }, { creature: 'bowman', count: 12 }, { creature: 'griffin', count: 4 }]) };
  for (const id of ['boar', 'stymphalian', 'hydra', 'basilisk'] as const) {
    it(`always ends against ${id}`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const count = { boar: 8, stymphalian: 14, hydra: 3, basilisk: 8 }[id];
        const end = autoBattle(crown, { hero: null, army: splitMonster(id, count) }, seed);
        expect(end.winner, `seed ${seed}`).not.toBeNull();
      }
    });
  }

  it('is deterministic', () => {
    const run = (): BattleState => autoBattle(crown, { hero: null, army: splitMonster('hydra', 4) }, 42);
    expect(run()).toEqual(run());
  });

  it('never leaves a stack on another: every hex stays singly held', () => {
    let s = createBattle(crown, { hero: null, army: armyOf([{ creature: 'hydra', count: 2 }, { creature: 'stymphalian', count: 8 }, { creature: 'boar', count: 5 }, { creature: 'basilisk', count: 5 }]) }, 3).state;
    for (let i = 0; i < 300 && s.winner === null; i++) {
      s = act(s, chooseAction(s)).state;
      const hexes = s.stacks.filter((x) => x.count > 0).flatMap(occupiedHexes);
      expect(new Set(hexes).size).toBe(hexes.length);
      expect(activeStack(s)?.effects.some((e) => e.kind === 'stone') ?? false).toBe(false);
    }
  });
});

describe('each map brings new enemies', () => {
  const creaturesOf = (def: MapDef): Set<CreatureId> => new Set(def.objects.flatMap((o) => (o.kind === 'monster' && o.creature ? [o.creature] : [])));
  const groups = (def: MapDef, ids: readonly CreatureId[]) => def.objects.filter((o) => o.kind === 'monster' && ids.includes(o.creature!));
  const westOf = (x: number) => THORNWOOD_LAND.objects.filter((o) => o.kind === 'monster' && o.x < x);

  it('map 2 adds boars and birds, map 3 hydras and basilisks, none before their map', () => {
    expect(creaturesOf(ASHFORD_LAND).has('boar')).toBe(false);
    expect([...creaturesOf(THORNWOOD_LAND)]).toEqual(expect.arrayContaining(['boar', 'stymphalian']));
    expect(groups(THORNWOOD_LAND, ['hydra', 'basilisk'])).toEqual([]);
    expect([...creaturesOf(BLACK_BANNER_LAND)]).toEqual(expect.arrayContaining(['hydra', 'basilisk']));
    expect(groups(ASHFORD, ['boar', 'stymphalian', 'hydra', 'basilisk'])).toEqual([]);
  });

  it('the chapter carries them from land to land', () => {
    expect(THORNWOOD.objects.some((o) => o.creature === 'boar')).toBe(true);
    expect(BLACK_BANNER.objects.some((o) => o.creature === 'hydra')).toBe(true);
  });

  it('fills Thornwood’s west: at least ten groups there, boars and birds among them', () => {
    const west = westOf(18);
    expect(west.length).toBeGreaterThanOrEqual(10);
    expect(west.filter((o) => o.creature === 'boar').length).toBeGreaterThanOrEqual(2);
    expect(west.filter((o) => o.creature === 'stymphalian').length).toBeGreaterThanOrEqual(2);
    // The further groups of each, past the river.
    const east = THORNWOOD_LAND.objects.filter((o) => o.kind === 'monster' && o.x > 20);
    expect(east.filter((o) => o.creature === 'boar').length).toBeGreaterThanOrEqual(2);
    expect(east.filter((o) => o.creature === 'stymphalian').length).toBeGreaterThanOrEqual(2);
  });

  it('every group in Thornwood’s west falls to the starting army', () => {
    const adv = startAdventure(THORNWOOD);
    for (const o of THORNWOOD.objects.filter((m) => m.kind === 'monster' && m.x >= 32 && m.x < 50)) {
      for (let seed = 1; seed <= 12; seed++) {
        const { attacker, defender } = battleSides(adv, o.id);
        const end = autoBattle(attacker, defender, seed * 101);
        expect(end.winner, `${o.id} seed ${seed}`).toBe(0);
      }
    }
  });

  it('steps up from map 1: its book guard outdoes the ogres, its east every group before it', () => {
    const power = (o: { creature?: CreatureId; count?: number }): number => strengthOf(o.creature!, o.count ?? 1);
    const ogres = power(ASHFORD.objects.find((o) => o.id === 'ogres')!);
    expect(power(THORNWOOD_LAND.objects.find((o) => o.id === 'book-birds')!)).toBeGreaterThan(ogres);
    const east = THORNWOOD_LAND.objects.filter((o) => o.kind === 'monster' && o.x > 20).map(power);
    expect(Math.min(...east)).toBeGreaterThan(ogres);
  });

  it('is cheap on the way for a strong army riding on from map 1, and the garrison makes it pay', () => {
    const army = armyOf([{ creature: 'spearman', count: 60 }, { creature: 'bowman', count: 34 }, { creature: 'griffin', count: 14 }, { creature: 'swordsman', count: 8 }]);
    const base = startAdventure(THORNWOOD);
    const adv = { ...base, hero: { ...base.hero, army, attack: 4, defense: 5 } };
    const units = (a: readonly ({ count: number } | null)[]): number => a.reduce((t, x) => t + (x?.count ?? 0), 0);
    const lost = (id: string): number => {
      const { attacker, defender } = battleSides(adv, id);
      const ends = [101, 202, 303, 404].map((seed) => autoBattle(attacker, defender, seed));
      for (const end of ends) expect(end.winner, id).toBe(0);
      const left = (s: (typeof ends)[number]): number => units(s.stacks.filter((x) => x.side === 0));
      return ends.reduce((t, e) => t + (units(army) - left(e)) / units(army), 0) / ends.length;
    };
    expect(lost('gate-brigands')).toBeLessThan(0.1);
    expect(lost('thornwood-town')).toBeGreaterThan(0.12);
  });

  it('rises towards the goal: Thornwood’s east is stronger than its west, and the garrison the strongest of all', () => {
    const power = (o: { creature?: CreatureId; count?: number }): number => strengthOf(o.creature!, o.count ?? 1);
    const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    const west = westOf(18).map(power);
    const east = THORNWOOD_LAND.objects.filter((o) => o.kind === 'monster' && o.x > 20).map(power);
    expect(mean(east)).toBeGreaterThan(mean(west) * 1.4);
    const garrison = armyStrength(armyOf(THORNWOOD_LAND.towns![0]!.garrison));
    expect(Math.max(...west, ...east)).toBeLessThan(garrison);
  });

  it('opens map 3 with a small basilisk group, and hydras stand by the better prizes', () => {
    const hero = BLACK_BANNER_LAND.hero;
    const basilisks = groups(BLACK_BANNER_LAND, ['basilisk']);
    const near = basilisks.reduce((a, b) => (Math.hypot(a.x - hero.x, a.y - hero.y) < Math.hypot(b.x - hero.x, b.y - hero.y) ? a : b));
    expect(Math.hypot(near.x - hero.x, near.y - hero.y)).toBeLessThan(8);
    expect(near.count).toBe(Math.min(...basilisks.map((o) => o.count ?? 1)));
    for (const h of groups(BLACK_BANNER_LAND, ['hydra'])) {
      const prize = BLACK_BANNER_LAND.objects.some((o) => o.kind !== 'monster' && Math.abs(o.x - h.x) <= 1 && Math.abs(o.y - h.y) <= 1);
      expect(prize, h.id).toBe(true);
    }
  });

  it('map 3’s first basilisks fall to its starting army', () => {
    const adv = startAdventure(BLACK_BANNER);
    const near = BLACK_BANNER.objects.find((o) => o.id === 'ore-basilisks')!;
    for (let seed = 1; seed <= 12; seed++) {
      const { attacker, defender } = battleSides(adv, near.id);
      expect(autoBattle(attacker, defender, seed).winner).toBe(0);
    }
  });
});
