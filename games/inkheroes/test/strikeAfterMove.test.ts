import { describe, expect, it } from 'vitest';
import { armyOf } from '../src/logic/army';
import { act, canShoot, createBattle, handOptions, moves, stackById, strikeFrom, strikeOptions } from '../src/logic/battle';
import { chooseAction } from '../src/logic/battleAi';
import type { Action, BattleHero, BattleState } from '../src/logic/battleTypes';
import type { CreatureId } from '../src/logic/creatures';
import { occupiedHexes } from '../src/logic/footprint';
import { hexAt, type Hex } from '../src/logic/hex';
import { fortification, PART_HEX } from '../src/logic/siege';

/** One stack a side, no obstacles, the stacks where the test says, side 0 to move. */
function duel(a: CreatureId, d: CreatureId, at: Hex, dt: Hex, counts: readonly [number, number] = [5, 5]): BattleState {
  const { state } = createBattle({ hero: null, army: armyOf([{ creature: a, count: counts[0] }]) }, { hero: null, army: armyOf([{ creature: d, count: counts[1] }]) }, 7);
  const hexes = [at, dt];
  return { ...state, obstacles: [], stacks: state.stacks.map((s) => ({ ...s, hex: hexes[s.side]! })), active: state.stacks.find((s) => s.side === 0)!.id };
}

const side = (s: BattleState, k: 0 | 1) => s.stacks.find((x) => x.side === k)!;
const hold = (to: Hex): Action => ({ type: 'move', to, hold: true });
const hero = (): BattleHero => ({ name: 'H', attack: 0, defense: 0, power: 1, mana: 0, spells: [], skills: {}, morale: 0, luck: 0 });

/** The same strike as one action, and as a held move then a strike from where it stopped: the battle after each. */
function bothWays(s: BattleState, to: Hex, target: number): [BattleState, BattleState] {
  const once = act(s, { type: 'attack', target, from: to }).state;
  const moved = act(s, hold(to)).state;
  expect(moved.held).toBeDefined();
  const after = act(moved, { type: 'attack', target, from: to }).state;
  return [once, after];
}

describe('finishing a move with a strike', () => {
  it('a player’s move that stops beside an enemy keeps the turn: it may strike from there only', () => {
    const s = duel('spearman', 'goblin', hexAt(3, 5), hexAt(7, 5));
    const step = act(s, hold(hexAt(6, 5)));
    const me = side(step.state, 0);
    expect(step.state.active).toBe(me.id);
    expect(step.state.held).toEqual({ stack: me.id, from: hexAt(3, 5), moved: 3 });
    expect(step.events.map((e) => e.type)).toEqual(['move']);
    expect([...moves(step.state).keys()]).toEqual([hexAt(6, 5)]);
    expect([...strikeFrom(step.state, side(step.state, 1)).entries()]).toEqual([[hexAt(6, 5), 0]]);
    expect(() => act(step.state, { type: 'move', to: hexAt(6, 6) })).toThrow();
    const hit = act(step.state, { type: 'attack', target: side(s, 1).id, from: hexAt(6, 5) });
    // Struck, answered, and the turn is over.
    expect(hit.events.filter((e) => e.type === 'strike').map((e) => e.type === 'strike' && e.retaliation)).toEqual([false, true]);
    expect(hit.state.held).toBeUndefined();
    expect(stackById(hit.state, me.id).acted || hit.state.active !== me.id).toBe(true);
  });

  it('ends the turn as before when nothing is beside it, or when the move isn’t held (the AI’s)', () => {
    const s = duel('spearman', 'goblin', hexAt(3, 5), hexAt(10, 5));
    const away = act(s, hold(hexAt(6, 5))).state;
    expect(away.held).toBeUndefined();
    expect(stackById(away, side(s, 0).id).acted).toBe(true);
    const near = duel('spearman', 'goblin', hexAt(3, 5), hexAt(7, 5));
    const plain = act(near, { type: 'move', to: hexAt(6, 5) }).state;
    expect(plain.held).toBeUndefined();
    expect(stackById(plain, side(near, 0).id).acted).toBe(true);
  });

  it('adds no power: the charge counts the hexes walked, and the battle comes out as one move-and-strike', () => {
    const s = duel('chariot', 'ogre', hexAt(2, 5), hexAt(9, 5));
    const [once, after] = bothWays(s, hexAt(8, 5), side(s, 1).id);
    expect(after.stacks).toEqual(once.stacks);
    expect(after.seed).toBe(once.seed);
    expect(after.active).toBe(once.active);
  });

  it('a swooper still flies home after the strike', () => {
    const s = duel('stymphalian', 'goblin', hexAt(2, 5), hexAt(8, 5), [40, 3]);
    const [once, after] = bothWays(s, hexAt(7, 5), side(s, 1).id);
    expect(side(after, 0).count).toBeGreaterThan(0);
    expect(side(after, 0).hex).toBe(hexAt(2, 5));
    expect(after.stacks).toEqual(once.stacks);
  });

  it('a three-hex unit may strike with any hex that ended beside the enemy', () => {
    // The chariot stops at (8,4)-(6,4); the ogre on (7,5) touches its middle and last hexes.
    const s = duel('chariot', 'ogre', hexAt(3, 3), hexAt(7, 5));
    const held = act(s, hold(hexAt(8, 4))).state;
    expect(held.held).toBeDefined();
    const options = strikeOptions(held, side(held, 1));
    expect(options.map((o) => o.from)).toEqual([hexAt(8, 4)]);
    expect(occupiedHexes(side(held, 0))).toContain(options[0]!.contact);
    expect(act(held, { type: 'attack', target: side(held, 1).id, from: hexAt(8, 4) }).events.some((e) => e.type === 'strike')).toBe(true);
  });

  it('a shooter held beside an enemy can strike by hand but not shoot', () => {
    const s = duel('bowman', 'goblin', hexAt(3, 5), hexAt(7, 5));
    const held = act(s, hold(hexAt(6, 5))).state;
    expect(held.held).toBeDefined();
    expect(canShoot(held, side(held, 0))).toBe(false);
    expect(() => act(held, { type: 'shoot', target: side(held, 1).id })).toThrow();
    expect(act(held, { type: 'attack', target: side(held, 1).id, from: hexAt(6, 5) }).events.some((e) => e.type === 'strike' && !e.ranged)).toBe(true);
  });

  it('Wait and Defend end the turn (Wait as the move would have, even after an earlier wait); nothing else is allowed', () => {
    const s = duel('spearman', 'goblin', hexAt(3, 5), hexAt(7, 5));
    const held = act(s, hold(hexAt(6, 5))).state;
    const me = side(held, 0).id;
    const waited = act({ ...held, stacks: held.stacks.map((x) => (x.id === me ? { ...x, waited: true } : x)) }, { type: 'wait' }).state;
    expect(waited.held).toBeUndefined();
    expect(stackById(waited, me).acted).toBe(true);
    const defended = act(held, { type: 'defend' }).state;
    expect(defended.held).toBeUndefined();
    expect(stackById(defended, me)).toMatchObject({ acted: true, defending: true });
    expect(() => act(held, { type: 'cast', spell: 'bless', target: me })).toThrow();
  });

  it('in a siege: held beside a garrison company, no strike at the gate by hand', () => {
    const fort = fortification(['fort'])!;
    const { state } = createBattle(
      { hero: hero(), army: armyOf([{ creature: 'spearman', count: 10 }]) },
      { hero: null, army: armyOf([{ creature: 'spearman', count: 10 }]) },
      3,
      { fort, me: 0 },
    );
    // The bridge before the gate, (8,5), touches both the gate and a company out on (8,4).
    const at = [hexAt(5, 5), hexAt(8, 4)];
    const s: BattleState = { ...state, obstacles: [], stacks: state.stacks.map((x) => ({ ...x, hex: at[x.side]! })), active: state.stacks.find((x) => x.side === 0)!.id };
    expect(handOptions(s, 'gate').length).toBeGreaterThan(0);
    const held = act(s, hold(hexAt(8, 5))).state;
    expect(held.held).toBeDefined();
    expect(handOptions(held, 'gate')).toEqual([]);
    expect(() => act(held, { type: 'bash', part: 'gate', from: hexAt(8, 5) })).toThrow();
    expect(PART_HEX.gate).toBe(hexAt(9, 5));
    expect(act(held, { type: 'attack', target: side(held, 1).id, from: hexAt(8, 5) }).events.some((e) => e.type === 'strike')).toBe(true);
  });

  it('the AI (Auto switched on mid-turn) never stalls when held: it strikes from there or ends the turn', () => {
    for (const [a, d] of [['spearman', 'goblin'], ['bowman', 'ogre'], ['chariot', 'wolf']] as const) {
      let s = act(duel(a, d, hexAt(5, 5), hexAt(9, 5)), hold(hexAt(8, 5))).state;
      expect(s.held).toBeDefined();
      const pick = chooseAction(s);
      expect(['attack', 'defend', 'wait']).toContain(pick.type);
      if (pick.type === 'attack') expect(pick.from).toBe(side(s, 0).hex);
      for (let i = 0; i < 400 && s.winner === null; i++) s = act(s, chooseAction(s)).state;
      expect(s.winner).not.toBeNull();
    }
  });
});
