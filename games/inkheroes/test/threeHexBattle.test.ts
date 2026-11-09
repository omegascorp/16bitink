import { describe, expect, it } from 'vitest';
import { armyOf } from '../src/logic/army';
import { act, canShoot, createBattle, moveHeadFor, moves, occupiableHexes, stackAt, stackById, strikeFrom, strikeOptions, struckBy } from '../src/logic/battle';
import { chooseAction } from '../src/logic/battleAi';
import type { BattleHero, BattleState } from '../src/logic/battleTypes';
import { canManTower, type CreatureId } from '../src/logic/creatures';
import { facesTarget, footprintAt, headsOver, occupiedHexes, shotDistance, sizeOf } from '../src/logic/footprint';
import { COLS, colOf, hexAt, reachable, ROWS, rowOf, type Hex } from '../src/logic/hex';
import { fortification, insideWalls, wallsAgainst } from '../src/logic/siege';

/** A battle of one stack a side, no obstacles, with the stacks put where the test says and `active` to move. */
function duel(a: CreatureId, d: CreatureId, at: Hex, dt: Hex, active: 0 | 1 = 0, obstacles: Hex[] = []): BattleState {
  const { state } = createBattle({ hero: null, army: armyOf([{ creature: a, count: 5 }]) }, { hero: null, army: armyOf([{ creature: d, count: 5 }]) }, 7);
  const hexes = [at, dt];
  return { ...state, obstacles, stacks: state.stacks.map((s) => ({ ...s, hex: hexes[s.side]! })), active: state.stacks.find((s) => s.side === active)!.id };
}

const side = (s: BattleState, k: 0 | 1) => s.stacks.find((x) => x.side === k)!;
const hero = (): BattleHero => ({ name: 'H', attack: 0, defense: 0, power: 1, mana: 0, spells: [], skills: {}, morale: 0, luck: 0 });

/** No two living stacks share a hex, none stands on an obstacle, and every body stays in its head's row. */
function expectApart(state: BattleState): void {
  const taken = new Set<Hex>(state.obstacles);
  for (const s of state.stacks.filter((x) => x.count > 0)) {
    for (const h of occupiedHexes(s)) {
      expect(taken.has(h)).toBe(false);
      expect(rowOf(h)).toBe(rowOf(s.hex));
      taken.add(h);
    }
  }
}

describe('three-hex units: occupancy', () => {
  it('covers its head and the two hexes behind it: left for the attacker, right for the defender', () => {
    const s = duel('apep', 'chariot', hexAt(5, 3), hexAt(8, 6));
    expect(occupiedHexes(side(s, 0))).toEqual([hexAt(5, 3), hexAt(4, 3), hexAt(3, 3)]);
    expect(occupiedHexes(side(s, 1))).toEqual([hexAt(8, 6), hexAt(9, 6), hexAt(10, 6)]);
    for (const h of [hexAt(3, 3), hexAt(4, 3), hexAt(5, 3)]) expect(stackAt(s, h)?.side).toBe(0);
    expect(stackAt(s, hexAt(2, 3))).toBeUndefined();
  });

  it('never wraps a row: no footprint whose last hex would leave the field', () => {
    expect(footprintAt(hexAt(1, 3), 3, 0)).toBeNull();
    expect(footprintAt(hexAt(2, 3), 3, 0)).toEqual([hexAt(2, 3), hexAt(1, 3), hexAt(0, 3)]);
    expect(footprintAt(hexAt(COLS - 2, 3), 3, 1)).toBeNull();
    expect(headsOver(hexAt(5, 3), 3, 0)).toEqual([hexAt(5, 3), hexAt(6, 3), hexAt(7, 3)]);
    expect(headsOver(hexAt(1, 3), 3, 1)).toEqual([hexAt(1, 3), hexAt(0, 3)]);
  });

  it('keeps one-hex and two-hex units as they were, and never mans a tower', () => {
    expect(sizeOf('spearman')).toBe(1);
    expect(sizeOf('griffin')).toBe(2);
    expect(sizeOf('apep')).toBe(3);
    expect(canManTower('apep')).toBe(false);
  });
});

describe('three-hex units: start placement', () => {
  it('lines the head up two columns in, so the last hex sits on the edge column; obstacles never overlap', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { state } = createBattle(
        { hero: null, army: armyOf([{ creature: 'chariot', count: 5 }, { creature: 'griffin', count: 2 }, { creature: 'spearman', count: 9 }, { creature: 'lion', count: 2 }]) },
        { hero: null, army: armyOf([{ creature: 'apep', count: 1 }, { creature: 'crocodile', count: 4 }, { creature: 'hyena', count: 7 }]) },
        seed,
      );
      for (const s of state.stacks) {
        const n = sizeOf(s.creature);
        const hexes = occupiedHexes(s);
        expect(hexes).toHaveLength(n);
        expect(colOf(s.hex)).toBe(s.side === 0 ? n - 1 : COLS - n);
        expect(colOf(hexes[n - 1]!)).toBe(s.side === 0 ? 0 : COLS - 1);
      }
      expectApart(state);
    }
  });

  it('behind the walls, a three-hex defender whose row runs into a corner tower stands a row in, inside the walls', () => {
    const fort = fortification(['fort', 'citadel', 'castle'])!;
    const army = armyOf([{ creature: 'chariot', count: 3 }, { creature: 'levy', count: 10 }, { creature: 'levy', count: 10 }, { creature: 'apep', count: 1 }]);
    const { state } = createBattle({ hero: hero(), army: armyOf([{ creature: 'spearman', count: 10 }]) }, { hero: null, army }, 5, { fort, me: 0 });
    const walls = new Set(wallsAgainst(state.siege!, 1));
    const big = state.stacks.filter((s) => s.side === 1 && sizeOf(s.creature) === 3);
    // Four stacks stand on rows 0, 4, 6 and 10: the two big ones on the outer rows move in to 1 and 9.
    expect(big.map((s) => rowOf(s.hex)).sort((a, b) => a - b)).toEqual([1, 9]);
    for (const s of state.stacks.filter((x) => x.side === 1 && x.tower === undefined)) {
      for (const h of occupiedHexes(s)) {
        expect(walls.has(h)).toBe(false);
        expect(insideWalls(h)).toBe(true);
      }
    }
    expectApart(state);
  });
});

describe('three-hex units: movement', () => {
  it('a walker goes round all three hexes', () => {
    const s = duel('spearman', 'apep', hexAt(4, 4), hexAt(5, 4));
    const reach = moves(s);
    for (const c of [5, 6, 7]) expect(reach.has(hexAt(c, 4))).toBe(false);
  });

  it('a three-hex walker needs all three hexes free at every step: through a three-hex gap, not a two-hex one', () => {
    const wall = (gap: number[]): Hex[] => Array.from({ length: COLS }, (_, c) => c).filter((c) => !gap.includes(c)).map((c) => hexAt(c, 3));
    const twoGap = moves(duel('chariot', 'ogre', hexAt(6, 4), hexAt(12, 8), 0, wall([5, 6])));
    expect([...twoGap.keys()].some((h) => rowOf(h) <= 3)).toBe(false);
    const threeGap = moves(duel('chariot', 'ogre', hexAt(6, 4), hexAt(12, 8), 0, wall([4, 5, 6])));
    expect(threeGap.has(hexAt(6, 3))).toBe(true);
    expect([...threeGap.keys()].some((h) => rowOf(h) < 3)).toBe(true);
  });

  it('never offers a head whose body would leave the field or land on something', () => {
    const s = duel('apep', 'ogre', hexAt(4, 4), hexAt(10, 4), 0, [hexAt(5, 2)]);
    const reach = moves(s);
    for (let r = 0; r < ROWS; r++) {
      expect(reach.has(hexAt(0, r))).toBe(false);
      expect(reach.has(hexAt(1, r))).toBe(false);
    }
    expect(reach.has(hexAt(6, 2))).toBe(false); // second hex on the rock
    expect(reach.has(hexAt(7, 2))).toBe(false); // third hex on the rock
    expect(reach.has(hexAt(8, 2))).toBe(true);
    expect(reach.has(hexAt(11, 4))).toBe(false); // body on the ogre
    expect(reach.has(hexAt(3, 4))).toBe(true); // over its own old hexes is fine
  });

  it('a three-hex flyer lands only where all three hexes are free; steps count from the head', () => {
    const body = (h: Hex) => footprintAt(h, 3, 0)?.slice(1) ?? null;
    const reach = reachable(hexAt(3, 4), 6, new Set([hexAt(6, 4)]), true, body);
    expect(reach.has(hexAt(7, 4))).toBe(false);
    expect(reach.has(hexAt(8, 4))).toBe(false);
    expect(reach.has(hexAt(9, 4))).toBe(true);
    expect([...reach.values()].every((d) => d <= 6)).toBe(true);
  });

  it('a tap on its middle or last spot moves it so that hex is covered', () => {
    const s = duel('chariot', 'ogre', hexAt(2, 4), hexAt(12, 8));
    expect(moveHeadFor(s, hexAt(6, 4))).toBe(hexAt(6, 4));
    // (0,0) can only be the last hex: head two forward. (1,0), the middle or the last: the middle first.
    expect(moveHeadFor(s, hexAt(0, 0))).toBe(hexAt(2, 0));
    expect(moveHeadFor(s, hexAt(1, 0))).toBe(hexAt(2, 0));
    expect(occupiableHexes(s).has(hexAt(0, 0))).toBe(true);
    expect(moves(s).has(hexAt(0, 0))).toBe(false);
    const step = act(s, { type: 'move', to: moveHeadFor(s, hexAt(0, 0))! });
    expect(occupiedHexes(stackById(step.state, side(s, 0).id))).toEqual([hexAt(2, 0), hexAt(1, 0), hexAt(0, 0)]);
  });
});

describe('three-hex units: fighting', () => {
  it('a unit strikes a three-hex target from beside its last hex, and is answered', () => {
    // Apep (defender) covers (5,4)–(7,4); (8,4) touches only its last hex.
    const s = duel('spearman', 'apep', hexAt(8, 4), hexAt(5, 4));
    expect(strikeFrom(s, side(s, 1)).get(hexAt(8, 4))).toBe(0);
    const step = act(s, { type: 'attack', target: side(s, 1).id, from: hexAt(8, 4) });
    expect(step.events.filter((e) => e.type === 'strike').map((e) => e.type === 'strike' && e.retaliation)).toEqual([false, true]);
  });

  it('a three-hex attacker strikes with its head, or backs onto the target with its middle or last hex and turns', () => {
    const s = duel('chariot', 'ogre', hexAt(5, 2), hexAt(7, 4));
    const ogre = side(s, 1);
    const options = strikeOptions(s, ogre);
    expect(options.find((o) => o.from === hexAt(6, 4))).toMatchObject({ hexes: [hexAt(6, 4), hexAt(5, 4), hexAt(4, 4)], contact: hexAt(6, 4), reversed: false });
    expect(options.find((o) => o.from === hexAt(10, 4))).toMatchObject({ hexes: [hexAt(10, 4), hexAt(9, 4), hexAt(8, 4)], contact: hexAt(8, 4), reversed: true });
    // Row 3 above: its middle hex can touch the ogre with the head off to the side.
    const middle = options.find((o) => o.from === hexAt(8, 3));
    expect(middle?.contact).toBe(hexAt(7, 3));
    for (const o of options) expect(o.hexes).not.toContain(ogre.hex);
    const step = act(s, { type: 'attack', target: ogre.id, from: hexAt(10, 4) });
    expect(stackById(step.state, side(s, 0).id).hex).toBe(hexAt(10, 4));
    expect(step.events.some((e) => e.type === 'strike' && !e.retaliation)).toBe(true);
  });

  it('a cleaver strikes a three-hex enemy beside it by any of its hexes', () => {
    const { state } = createBattle(
      { hero: null, army: armyOf([{ creature: 'hydra', count: 2 }]) },
      { hero: null, army: armyOf([{ creature: 'ogre', count: 2 }, { creature: 'apep', count: 1 }]) },
      7,
    );
    const put = (apep: Hex): BattleState => {
      const at = [hexAt(5, 5), hexAt(6, 5), apep];
      return { ...state, obstacles: [], stacks: state.stacks.map((x, i) => ({ ...x, hex: at[i]! })), active: state.stacks[0]!.id };
    };
    // The hydra covers (5,5)–(4,5), the ogre is on (6,5). Apep (defender) on (6,4)–(8,4): its head touches the hydra's.
    const near = put(hexAt(6, 4));
    expect(struckBy(near, near.stacks[0]!, near.stacks[1]!, hexAt(5, 5)).map((x) => x.creature)).toEqual(['ogre', 'apep']);
    // On (2,4)–(4,4) only its far end, (4,4), touches the hydra (its tail): struck all the same.
    const far = put(hexAt(2, 4));
    expect(struckBy(far, far.stacks[0]!, far.stacks[1]!, hexAt(5, 5)).map((x) => x.creature)).toEqual(['ogre', 'apep']);
    // One hex further off, nothing touches.
    const off = put(hexAt(1, 4));
    expect(struckBy(off, off.stacks[0]!, off.stacks[1]!, hexAt(5, 5)).map((x) => x.creature)).toEqual(['ogre']);
  });

  it('an enemy beside a three-hex target’s far end is beside it: a shooter there can’t shoot; shots count to the nearest hex', () => {
    const s = duel('bowman', 'apep', hexAt(9, 4), hexAt(6, 4));
    expect(canShoot(s, side(s, 0))).toBe(false);
    const far = duel('bowman', 'apep', hexAt(0, 4), hexAt(10, 4));
    expect(shotDistance(side(far, 0), side(far, 1))).toBe(10);
    const behind = duel('bowman', 'apep', hexAt(14, 4), hexAt(2, 4));
    // Apep covers (2,4)–(4,4): its last hex is the nearer.
    expect(shotDistance(side(behind, 0), side(behind, 1))).toBe(10);
  });

  it('faces its target unless the target is behind it', () => {
    expect(facesTarget(0, [hexAt(6, 4), hexAt(5, 4), hexAt(4, 4)], [hexAt(7, 4)])).toBe(true);
    expect(facesTarget(0, [hexAt(10, 4), hexAt(9, 4), hexAt(8, 4)], [hexAt(7, 4)])).toBe(false);
  });
});

describe('three-hex units: AI', () => {
  it('fights whole battles with units of one, two and three hexes on both sides, never overlapping anything', () => {
    for (const seed of [11, 29, 47]) {
      let { state } = createBattle(
        { hero: null, army: armyOf([{ creature: 'chariot', count: 6 }, { creature: 'griffin', count: 4 }, { creature: 'nubian', count: 10 }, { creature: 'levy', count: 20 }, { creature: 'chariot3', count: 2 }]) },
        { hero: null, army: armyOf([{ creature: 'apep', count: 1 }, { creature: 'crocodile', count: 4 }, { creature: 'lion', count: 3 }, { creature: 'wolf', count: 8 }, { creature: 'hyena', count: 10 }]) },
        seed,
      );
      let turns = 0;
      for (; turns < 600 && state.winner === null; turns++) {
        state = act(state, chooseAction(state)).state;
        expectApart(state);
      }
      expect(state.winner).not.toBeNull();
      expect(turns).toBeGreaterThan(3);
    }
  });

  it('fights a siege with three-hex units on both sides, nobody ever on a closed wall', () => {
    const fort = fortification(['fort', 'citadel'])!;
    let { state } = createBattle(
      { hero: hero(), army: armyOf([{ creature: 'chariot', count: 8 }, { creature: 'levy', count: 30 }, { creature: 'nubian', count: 12 }, { creature: 'lion', count: 4 }]), machine: 'catapult' },
      { hero: null, army: armyOf([{ creature: 'apep', count: 1 }, { creature: 'levy', count: 12 }, { creature: 'chariot', count: 2 }, { creature: 'nubian', count: 6 }]) },
      13,
      { fort, me: 0 },
    );
    for (let turns = 0; turns < 600 && state.winner === null; turns++) {
      state = act(state, chooseAction(state)).state;
      expectApart(state);
      for (const s of state.stacks.filter((x) => x.count > 0 && x.tower === undefined)) {
        const closed = new Set(wallsAgainst(state.siege!, s.side));
        for (const h of occupiedHexes(s)) expect(closed.has(h)).toBe(false);
      }
    }
    expect(state.winner).not.toBeNull();
  });
});
