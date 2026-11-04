import { describe, expect, it } from 'vitest';
import { armyOf } from '../src/logic/army';
import { act, canShoot, createBattle, moveHeadFor, moves, occupiableHexes, stackAt, stackById, strikeFrom, strikeOptions } from '../src/logic/battle';
import { chooseAction } from '../src/logic/battleAi';
import type { BattleState } from '../src/logic/battleTypes';
import { CREATURE_IDS, lineOf, type CreatureId } from '../src/logic/creatures';
import { facesTarget, isWide, occupiedHexes, shotDistance, tailOf } from '../src/logic/footprint';
import { COLS, colOf, hexAt, ROWS, rowOf, type Hex } from '../src/logic/hex';

/** A battle of one stack a side, no obstacles, with the stacks put where the test says and `active` to move. */
function duel(a: CreatureId, d: CreatureId, at: Hex, dt: Hex, active: 0 | 1 = 0, obstacles: Hex[] = []): BattleState {
  const { state } = createBattle({ hero: null, army: armyOf([{ creature: a, count: 5 }]) }, { hero: null, army: armyOf([{ creature: d, count: 5 }]) }, 7);
  const hexes = [at, dt];
  return {
    ...state,
    obstacles,
    stacks: state.stacks.map((s) => ({ ...s, hex: hexes[s.side]! })),
    active: state.stacks.find((s) => s.side === active)!.id,
  };
}

const side = (s: BattleState, k: 0 | 1) => s.stacks.find((x) => x.side === k)!;

describe('two-hex units: occupancy', () => {
  it('flags the griffin, centaur, companion and wolf as wide (with their upgrades), nobody else', () => {
    expect([...new Set(CREATURE_IDS.filter(isWide).map(lineOf))].sort()).toEqual(['griffin', 'lancer', 'monk', 'wolf']);
  });

  it('a wide unit covers its head and the hex behind it: left for the attacker, right for the defender', () => {
    const s = duel('wolf', 'griffin', hexAt(4, 3), hexAt(8, 5));
    expect(occupiedHexes(side(s, 0))).toEqual([hexAt(4, 3), hexAt(3, 3)]);
    expect(occupiedHexes(side(s, 1))).toEqual([hexAt(8, 5), hexAt(9, 5)]);
    const narrow = duel('spearman', 'ogre', hexAt(4, 3), hexAt(8, 5));
    expect(occupiedHexes(side(narrow, 0))).toEqual([hexAt(4, 3)]);
  });

  it('the tail never wraps to another row', () => {
    expect(tailOf(hexAt(0, 3), 0)).toBeNull();
    expect(tailOf(hexAt(COLS - 1, 3), 1)).toBeNull();
    expect(tailOf(hexAt(COLS - 1, 3), 0)).toBe(hexAt(COLS - 2, 3));
  });

  it('either hex finds the stack', () => {
    const s = duel('spearman', 'wolf', hexAt(1, 4), hexAt(6, 4));
    expect(stackAt(s, hexAt(6, 4))?.side).toBe(1);
    expect(stackAt(s, hexAt(7, 4))?.side).toBe(1);
    expect(stackAt(s, hexAt(5, 4))).toBeUndefined();
  });
});

describe('two-hex units: start placement', () => {
  it('lines wide heads up one column in, so the tail fits; obstacles never overlap a unit', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { state } = createBattle(
        { hero: null, army: armyOf([{ creature: 'spearman', count: 5 }, { creature: 'griffin', count: 2 }, { creature: 'lancer', count: 1 }]) },
        { hero: null, army: armyOf([{ creature: 'wolf', count: 4 }, { creature: 'ogre', count: 2 }]) },
        seed,
      );
      for (const s of state.stacks) {
        const wide = isWide(s.creature);
        const head = colOf(s.hex);
        if (s.side === 0) expect(head).toBe(wide ? 1 : 0);
        else expect(head).toBe(wide ? COLS - 2 : COLS - 1);
        const hexes = occupiedHexes(s);
        expect(hexes).toHaveLength(wide ? 2 : 1);
        for (const h of hexes) {
          expect(rowOf(h)).toBe(rowOf(s.hex));
          expect(state.obstacles).not.toContain(h);
        }
        if (wide) expect(colOf(hexes[1]!)).toBe(s.side === 0 ? 0 : COLS - 1);
      }
    }
  });
});

describe('two-hex units: movement', () => {
  it('a walker cannot step on either hex of a wide unit', () => {
    const s = duel('spearman', 'wolf', hexAt(4, 4), hexAt(5, 4));
    const reach = moves(s);
    expect(reach.has(hexAt(5, 4))).toBe(false);
    expect(reach.has(hexAt(6, 4))).toBe(false);
    // Round the two hexes: 4 steps where a clear row takes 3.
    expect(reach.get(hexAt(7, 4))).toBe(4);
  });

  it('a wide walker needs both hexes free at every step: through a two-hex gap, not a one-hex one', () => {
    const wall = (gap: number[]): Hex[] => Array.from({ length: COLS }, (_, c) => c).filter((c) => !gap.includes(c)).map((c) => hexAt(c, 3));
    const narrow = moves(duel('spearman', 'ogre', hexAt(6, 4), hexAt(12, 8), 0, wall([6])));
    expect([...narrow.keys()].some((h) => rowOf(h) < 3)).toBe(true);
    const oneGap = moves(duel('wolf', 'ogre', hexAt(6, 4), hexAt(12, 8), 0, wall([6])));
    expect([...oneGap.keys()].some((h) => rowOf(h) <= 3)).toBe(false);
    const twoGap = moves(duel('wolf', 'ogre', hexAt(6, 4), hexAt(12, 8), 0, wall([5, 6])));
    expect(twoGap.has(hexAt(6, 3))).toBe(true);
    expect([...twoGap.keys()].some((h) => rowOf(h) < 3)).toBe(true);
  });

  it('never offers a head whose tail would leave the field or land on something', () => {
    const s = duel('wolf', 'ogre', hexAt(2, 4), hexAt(9, 4), 0, [hexAt(4, 2)]);
    const reach = moves(s);
    for (let r = 0; r < ROWS; r++) expect(reach.has(hexAt(0, r))).toBe(false);
    expect(reach.has(hexAt(5, 2))).toBe(false); // tail on the rock
    expect(reach.has(hexAt(10, 4))).toBe(false); // tail on the ogre
    expect(reach.has(hexAt(3, 4))).toBe(true); // half on its own old hexes is fine
  });

  it('a flyer lands only where both hexes are free; steps count from the head', () => {
    const s = duel('griffin', 'spearman', hexAt(1, 4), hexAt(8, 2), 0, [hexAt(5, 4)]);
    const reach = moves(s);
    expect(reach.has(hexAt(6, 4))).toBe(false); // tail on the rock
    expect(reach.has(hexAt(9, 2))).toBe(false); // tail on the enemy
    expect(reach.has(hexAt(7, 4))).toBe(true);
    expect([...reach.values()].every((d) => d <= 6)).toBe(true);
    const step = act(s, { type: 'move', to: hexAt(7, 4) });
    expect(occupiedHexes(stackById(step.state, side(s, 0).id))).toEqual([hexAt(7, 4), hexAt(6, 4)]);
  });

  it('a tap on a tail spot moves the unit so its tail lands there (VCMI toWhichHexMove)', () => {
    const s = duel('wolf', 'ogre', hexAt(2, 4), hexAt(12, 8));
    expect(moveHeadFor(s, hexAt(5, 4))).toBe(hexAt(5, 4));
    expect(moveHeadFor(s, hexAt(0, 0))).toBe(hexAt(1, 0));
    expect(occupiableHexes(s).has(hexAt(0, 0))).toBe(true); // a tail spot, not a head spot
    expect(moves(s).has(hexAt(0, 0))).toBe(false);
  });
});

describe('two-hex units: fighting', () => {
  it('a unit can strike a wide target from beside its tail, and is answered', () => {
    // The wolf (defender) covers (5,4) and (6,4); (7,4) touches only its tail.
    const s = duel('spearman', 'wolf', hexAt(8, 4), hexAt(5, 4));
    const s2 = { ...s, stacks: s.stacks.map((x) => (x.side === 0 ? { ...x, hex: hexAt(7, 4) } : x)) };
    expect(strikeFrom(s2, side(s2, 1)).get(hexAt(7, 4))).toBe(0);
    const step = act(s2, { type: 'attack', target: side(s2, 1).id, from: hexAt(7, 4) });
    expect(step.events.filter((e) => e.type === 'strike').map((e) => e.type === 'strike' && e.retaliation)).toEqual([false, true]);
    // From further off, it walks to a hex that touches only the tail.
    expect(strikeFrom(s, side(s, 1)).has(hexAt(7, 4))).toBe(true);
  });

  it('a wide attacker strikes with its head, or backs onto the target with its tail and turns', () => {
    const s = duel('wolf', 'ogre', hexAt(2, 4), hexAt(6, 4));
    const ogre = side(s, 1);
    const options = strikeOptions(s, ogre);
    const front = options.find((o) => o.from === hexAt(5, 4))!;
    const back = options.find((o) => o.from === hexAt(8, 4))!;
    expect(front).toMatchObject({ hexes: [hexAt(5, 4), hexAt(4, 4)], contact: hexAt(5, 4), reversed: false });
    expect(back).toMatchObject({ hexes: [hexAt(8, 4), hexAt(7, 4)], contact: hexAt(7, 4), reversed: true });
    // Nothing that overlaps the ogre or doesn't touch it.
    for (const o of options) {
      expect(o.hexes).not.toContain(ogre.hex);
      expect(new Set([...strikeFrom(s, ogre).keys()]).has(o.from)).toBe(true);
    }
    const step = act(s, { type: 'attack', target: ogre.id, from: back.from });
    expect(stackById(step.state, side(s, 0).id).hex).toBe(hexAt(8, 4));
    expect(step.events.some((e) => e.type === 'strike' && !e.retaliation)).toBe(true);
  });

  it('two wide units fight hex to hex, head to tail', () => {
    const s = duel('lancer', 'wolf', hexAt(3, 4), hexAt(6, 4));
    const wolf = side(s, 1);
    // The wolf covers (6,4)-(7,4); the companion can stand on (9,4)-(8,4) touching its tail.
    const back = strikeOptions(s, wolf).find((o) => o.from === hexAt(9, 4));
    expect(back).toMatchObject({ contact: hexAt(8, 4), struck: hexAt(7, 4) });
    expect(facesTarget(0, [hexAt(5, 4), hexAt(4, 4)], [hexAt(6, 4), hexAt(7, 4)])).toBe(true);
    expect(facesTarget(0, [hexAt(9, 4), hexAt(8, 4)], [hexAt(6, 4), hexAt(7, 4)])).toBe(false);
  });

  it('an enemy beside a wide shooter’s tail stops it shooting; distance counts to the nearest hex', () => {
    const s = duel('monk', 'ogre', hexAt(3, 3), hexAt(1, 3));
    expect(occupiedHexes(side(s, 0))).toEqual([hexAt(3, 3), hexAt(2, 3)]);
    expect(canShoot(s, side(s, 0))).toBe(false);
    const far = duel('bowman', 'wolf', hexAt(0, 4), hexAt(10, 4));
    // Wolf covers (10,4)-(11,4): the head is the nearer.
    expect(shotDistance(side(far, 0), side(far, 1))).toBe(10);
    const behind = duel('bowman', 'wolf', hexAt(12, 4), hexAt(2, 4));
    expect(shotDistance(side(behind, 0), side(behind, 1))).toBe(9);
  });
});

describe('two-hex units: AI', () => {
  it('fights a whole battle with wide units on both sides, never overlapping anything', () => {
    let { state } = createBattle(
      { hero: null, army: armyOf([{ creature: 'griffin', count: 6 }, { creature: 'lancer', count: 1 }, { creature: 'monk', count: 3 }, { creature: 'spearman', count: 12 }]) },
      { hero: null, army: armyOf([{ creature: 'wolf', count: 10 }, { creature: 'wolf', count: 9 }, { creature: 'ogre', count: 3 }, { creature: 'bandit', count: 6 }]) },
      29,
    );
    let turns = 0;
    for (; turns < 600 && state.winner === null; turns++) {
      state = act(state, chooseAction(state)).state;
      const taken = new Set<Hex>(state.obstacles);
      for (const s of state.stacks.filter((x) => x.count > 0)) {
        for (const h of occupiedHexes(s)) {
          expect(taken.has(h)).toBe(false);
          expect(rowOf(h)).toBe(rowOf(s.hex));
          taken.add(h);
        }
      }
    }
    expect(state.winner).not.toBeNull();
    expect(turns).toBeGreaterThan(3);
  });
});
