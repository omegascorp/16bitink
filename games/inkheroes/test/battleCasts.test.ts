import { describe, expect, it } from 'vitest';
import { act, activeStack, createBattle, stackById } from '../src/logic/battle';
import { chooseAction } from '../src/logic/battleAi';
import { bestCast } from '../src/logic/battleCasts';
import type { BattleHero, BattleState, Side } from '../src/logic/battleTypes';
import { armyOf } from '../src/logic/army';
import { creature } from '../src/logic/creatures';
import type { SpellId } from '../src/logic/spells';
import { autoBattle } from '../src/logic/rival';

const hero = (spells: SpellId[], o: Partial<BattleHero> = {}): BattleHero => ({ name: 'Lykaon', attack: 2, defense: 2, power: 3, mana: 40, spells, skills: {}, morale: 0, luck: 0, ...o });

/** A battle with a hero on the left knowing `spells`, against `foes`. */
function battle(spells: SpellId[], foes = armyOf([{ creature: 'spearman', count: 20 }, { creature: 'griffin', count: 6 }, { creature: 'wolf', count: 12 }]), o: Partial<BattleHero> = {}): BattleState {
  return createBattle({ hero: hero(spells, o), army: armyOf([{ creature: 'swordsman', count: 8 }, { creature: 'bowman', count: 12 }]) }, { hero: null, army: foes }, 3).state;
}

/** The battle with side 0's stack to move. */
function leftToMove(st: BattleState): BattleState {
  let s = st;
  for (let i = 0; i < 40 && activeStack(s)!.side !== 0; i++) s = act(s, chooseAction(s)).state;
  return s;
}

describe('the AI hero casts', () => {
  it('hurls Thunderbolt at the stack worth most to kill', () => {
    const st = leftToMove(battle(['lightningBolt']));
    const cast = bestCast(st, 0)!;
    expect(cast.action.spell).toBe('lightningBolt');
    // The griffins: the highest level, and a bolt kills several.
    expect(stackById(st, cast.action.target).creature).toBe('griffin');
    expect(chooseAction(st)).toEqual(cast.action);
  });

  it('slows the fastest foe, and buffs the strongest stack of his', () => {
    const st = leftToMove(battle(['slow']));
    const fastest = st.stacks.filter((s) => s.side === 1).sort((a, b) => creature(b.creature).speed - creature(a.creature).speed)[0]!;
    expect(bestCast(st, 0)!.action.target).toBe(fastest.id);
    const buff = leftToMove(battle(['bloodlust']));
    expect(stackById(buff, bestCast(buff, 0)!.action.target).creature).toBe('swordsman');
  });

  it('heals a hurt stack, and casts nothing with no mana, no spells or a fight already won', () => {
    const st = leftToMove(battle(['cure']));
    const hurt = st.stacks.find((s) => s.side === 0 && s.creature === 'swordsman')!;
    const wounded = { ...st, stacks: st.stacks.map((s) => (s.id === hurt.id ? { ...s, topHp: 5 } : s)) };
    expect(bestCast(wounded, 0)?.action).toEqual({ type: 'cast', spell: 'cure', target: hurt.id });
    expect(bestCast(st, 0)).toBeNull();
    expect(bestCast(leftToMove(battle(['lightningBolt'], undefined, { mana: 2 })), 0)).toBeNull();
    expect(bestCast(leftToMove(battle([])), 0)).toBeNull();
    expect(bestCast(leftToMove(battle(['lightningBolt'], armyOf([{ creature: 'goblin', count: 3 }]))), 0)).toBeNull();
  });

  it('casts at most once a round, and the stack still moves after', () => {
    let st = leftToMove(battle(['lightningBolt', 'slow', 'bless']));
    const round = st.round;
    st = act(st, chooseAction(st)).state;
    expect(st.cast[0]).toBe(true);
    expect(chooseAction(st).type).not.toBe('cast');
    expect(st.round).toBe(round);
  });

  it('wins more with a book than without (the same fight, many seeds)', () => {
    const fight = (spells: SpellId[], seed: number): Side | null => autoBattle(
      { hero: hero(spells, { mana: 60 }), army: armyOf([{ creature: 'swordsman', count: 10 }, { creature: 'bowman', count: 14 }]) },
      { hero: null, army: armyOf([{ creature: 'spearman', count: 40 }, { creature: 'griffin', count: 9 }, { creature: 'swordsman', count: 6 }]) },
      seed,
    ).winner;
    const wins = (spells: SpellId[]): number => [1, 2, 3, 4, 5, 6, 7, 8].filter((s) => fight(spells, s) === 0).length;
    expect(wins(['lightningBolt', 'slow', 'bless'])).toBeGreaterThan(wins([]));
  });
});
