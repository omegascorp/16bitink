import { describe, expect, it } from 'vitest';
import { armyOf, type Army } from '../src/logic/army';
import { act, activeStack, canShoot, createBattle, handOptions, moves, stackById, strikeFrom, TOWER_SLOT, towerSurvivors, type BattleSide } from '../src/logic/battle';
import { chooseAction } from '../src/logic/battleAi';
import type { BattleHero, BattleState, Stack } from '../src/logic/battleTypes';
import { damageRange } from '../src/logic/damage';
import { colOf, hexAt, HEX_COUNT, neighbours, type Hex } from '../src/logic/hex';
import { BRIDGE, fortification, HAND_STRIKES, insideWalls, moatFor, PART_HEX, raiseWalls, shotOverWall, standing, strikeByHand, strikesLeft, wallsAgainst, type Siege } from '../src/logic/siege';
import { canManTower } from '../src/logic/creatures';
import { manTowers, towerPlaces } from '../src/logic/town';

const hero = (): BattleHero => ({ name: 'H', attack: 0, defense: 0, power: 1, mana: 0, spells: [], skills: {}, morale: 0, luck: 0 });
const FORT = fortification(['fort'])!;
const CASTLE = fortification(['fort', 'citadel', 'castle'])!;
const CITADEL = fortification(['fort', 'citadel'])!;

/** Every hex a walker of `side` can get to from the left edge. */
function walkable(s: Siege, side: 0 | 1, from: Hex = hexAt(0, 5)): Set<Hex> {
  const closed = new Set(wallsAgainst(s, side));
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) for (const n of neighbours(queue.pop()!)) if (!seen.has(n) && !closed.has(n)) { seen.add(n); queue.push(n); }
  return seen;
}

function siege(attacker: Partial<BattleSide>, defender: Partial<BattleSide>, fort = CASTLE, seed = 3): BattleState {
  return createBattle({ hero: hero(), army: armyOf([{ creature: 'spearman', count: 10 }]), ...attacker }, { hero: null, army: armyOf([{ creature: 'spearman', count: 10 }]), ...defender }, seed, { fort, me: 0 }).state;
}

const set = (st: BattleState, id: number, patch: Partial<Stack>): BattleState => ({ ...st, active: id, stacks: st.stacks.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

describe('fortifications', () => {
  it('grow with the town: Fort walls and a tower, Citadel a moat and a second, Castle stronger walls and a third', () => {
    expect(fortification(['tavern'])).toBeNull();
    expect(FORT).toEqual({ wall: 2, moat: false, places: 1 });
    expect(CITADEL).toEqual({ wall: 2, moat: true, places: 2 });
    expect(CASTLE).toEqual({ wall: 3, moat: true, places: 3 });
    expect(towerPlaces({ built: ['fort', 'citadel'] })).toBe(2);
  });
});

describe('the walls', () => {
  it('close the field to a walker, top to bottom, while they all stand', () => {
    const reach = walkable(raiseWalls(CASTLE, 0), 0);
    expect([...reach].some(insideWalls)).toBe(false);
  });

  it('let a walker in by any one breach', () => {
    const s = raiseWalls(CASTLE, 0);
    for (const part of ['wallNorth', 'wallGateNorth', 'wallGateSouth', 'wallSouth', 'gate'] as const) {
      const open = { ...s, parts: { ...s.parts, [part]: 0 } };
      expect([...walkable(open, 0)].some(insideWalls)).toBe(true);
    }
  });

  it('open their gate for the defender and nobody else', () => {
    const s = raiseWalls(FORT, 0);
    expect(wallsAgainst(s, 0)).toContain(PART_HEX.gate);
    expect(wallsAgainst(s, 1)).not.toContain(PART_HEX.gate);
    expect(walkable(s, 1, hexAt(14, 5)).has(hexAt(0, 5))).toBe(true);
  });

  it('leave room inside for every row of a formation', () => {
    for (let r = 0; r < 11; r++) expect(insideWalls(hexAt(14, r))).toBe(true);
    for (let h = 0; h < HEX_COUNT; h++) if (colOf(h) <= 8) expect(insideWalls(h)).toBe(false);
  });

  it('halve a shot only while a part of them stands in its line', () => {
    const s = raiseWalls(FORT, 0);
    const from = hexAt(3, 5);
    const to = hexAt(13, 5);
    expect(shotOverWall(s, from, to)).toBe(true);
    expect(shotOverWall({ ...s, parts: { ...s.parts, gate: 0 } }, from, to)).toBe(false);
    expect(shotOverWall(s, to, from)).toBe(false);
    expect(shotOverWall(s, hexAt(3, 5), hexAt(5, 5))).toBe(false);
  });

  it('show in the damage a shooter does', () => {
    const st = siege({ army: armyOf([{ creature: 'bowman', count: 10 }]) }, {}, FORT);
    const shooter = st.stacks.find((s) => s.creature === 'bowman')!;
    const inside = st.stacks.find((s) => s.side === 1)!;
    const shot = { ranged: true, distance: 5, moved: 0 };
    const near = { ...inside, hex: hexAt(3, 5) };
    expect(damageRange(st, shooter, inside, shot).max).toBeLessThan(damageRange(st, shooter, near, shot).max);
  });
});

describe('the moat', () => {
  it('stands only from the Citadel, and the bridge lies down for the defender and once the gate falls', () => {
    expect(moatFor(raiseWalls(FORT, 0), 0).size).toBe(0);
    const s = raiseWalls(CITADEL, 0);
    expect(moatFor(s, 0).has(BRIDGE)).toBe(true);
    expect(moatFor(s, 1).has(BRIDGE)).toBe(false);
    expect(moatFor({ ...s, parts: { ...s.parts, gate: 0 } }, 0).has(BRIDGE)).toBe(false);
  });

  it('stops a walker where it enters and hurts it', () => {
    const start = siege({}, {}, CITADEL);
    const me = start.stacks.find((s) => s.creature === 'spearman' && s.side === 0)!;
    const moat = hexAt(9, 4);
    const siegeOpen = { ...start.siege!, parts: { ...start.siege!.parts, wallGateNorth: 0 } };
    const st = set({ ...start, siege: siegeOpen }, me.id, { hex: hexAt(8, 4), count: 20 });
    const reach = moves(st);
    expect(reach.has(moat)).toBe(true);
    // The breach is one step past the moat, but the moat ends the move.
    expect(reach.has(PART_HEX.wallGateNorth)).toBe(false);
    const step = act(st, { type: 'move', to: moat });
    expect(step.events.some((e) => e.type === 'moat')).toBe(true);
    expect(stackById(step.state, me.id).count).toBe(13);
  });

  it('lets a flyer cross, hurting only one that lands in it', () => {
    const st = siege({ army: armyOf([{ creature: 'griffin', count: 5 }]) }, {}, CITADEL);
    const g = st.stacks.find((s) => s.creature === 'griffin')!;
    const near = set(st, g.id, { hex: hexAt(8, 7) });
    expect(moves(near).has(hexAt(12, 7))).toBe(true);
  });
});

describe('the Catapult', () => {
  const CAT = { machine: 'catapult' } as const;

  it('comes only with a hero who owns one, and only to a siege', () => {
    expect(siege(CAT, {}).stacks.some((s) => s.creature === 'catapult')).toBe(true);
    expect(siege({}, {}).stacks.some((s) => s.slot < 0)).toBe(false);
    const open = createBattle({ hero: hero(), army: armyOf([{ creature: 'spearman', count: 1 }]), ...CAT }, { hero: null, army: armyOf([{ creature: 'spearman', count: 1 }]) }, 1).state;
    expect(open.stacks.some((s) => s.creature === 'catapult')).toBe(false);
  });

  it('goes before anyone else in the round, and hurls by itself', () => {
    const st = siege(CAT, {});
    expect(activeStack(st)?.creature).toBe('catapult');
    expect(chooseAction(st)).toEqual({ type: 'catapult' });
  });

  it('cannot be struck or shot, so walls can always be opened', () => {
    const st = siege(CAT, { army: armyOf([{ creature: 'bowman', count: 10 }]) });
    const cat = st.stacks.find((s) => s.creature === 'catapult')!;
    const bow = st.stacks.find((s) => s.creature === 'bowman')!;
    const shooting = set(st, bow.id, {});
    expect(() => act(shooting, { type: 'shoot', target: cat.id })).toThrow();
    expect(strikeFrom(shooting, cat).size).toBe(0);
  });

  it('throws harder and faster at the finer grades', () => {
    const stones = (machine: 'catapult' | 'catapult2' | 'catapult3', seed: number): number => {
      const st = siege({ machine }, {}, CASTLE, seed);
      return act(st, { type: 'catapult' }).events.filter((e) => e.type === 'siege').length;
    };
    expect(stones('catapult', 1)).toBe(1);
    expect(stones('catapult2', 1)).toBe(1);
    expect(stones('catapult3', 1)).toBe(2);
    const blows = (machine: 'catapult' | 'catapult2'): number => Array.from({ length: 200 }, (_, seed) => act(siege({ machine }, {}, CASTLE, seed), { type: 'catapult' }).events.reduce((n, e) => n + (e.type === 'siege' ? e.blows : 0), 0)).reduce((a, b) => a + b);
    expect(blows('catapult2')).toBeGreaterThan(blows('catapult'));
  });

  it('wears the walls down until a walker can get in', () => {
    let st = siege(CAT, {});
    const cat = st.stacks.find((s) => s.creature === 'catapult')!.id;
    let blows = 0;
    for (let i = 0; i < 80; i++) {
      const step = act(set(st, cat, { acted: false }), { type: 'catapult' });
      blows += step.events.filter((e) => e.type === 'siege' && e.blows > 0).length;
      st = { ...step.state, active: cat };
    }
    expect(blows).toBeGreaterThan(10);
    expect(Object.values(st.siege!.parts).every((n) => n === 0)).toBe(true);
    expect([...walkable(st.siege!, 0)].some(insideWalls)).toBe(true);
  });
});

describe('the gate, with no war machine', () => {
  const walker = (st: BattleState): Stack => st.stacks.find((s) => s.side === 0)!;
  const atGate = (st: BattleState): BattleState => set(st, walker(st).id, { hex: hexAt(8, 5) });

  it('takes many strikes by hand: a Catapult’s blow is worth several', () => {
    const s = raiseWalls(FORT, 0);
    expect(strikesLeft(s, 'gate')).toBe(HAND_STRIKES * 2);
    const worn = Array.from({ length: HAND_STRIKES * 2 - 1 }).reduce<Siege>((x) => strikeByHand(x, 'gate'), s);
    expect(standing(worn, 'gate')).toBe(true);
    expect(strikesLeft(worn, 'gate')).toBe(1);
    expect(standing(strikeByHand(worn, 'gate'), 'gate')).toBe(false);
  });

  it('can be struck by a company beside it, which walks there first if it must', () => {
    const st = siege({}, {}, FORT);
    expect(handOptions(atGate(st), 'gate').find((o) => o.steps === 0)).toBeTruthy();
    const step = act(atGate(st), { type: 'bash', part: 'gate', from: hexAt(8, 5) });
    expect(step.events[0]).toEqual({ type: 'bash', stack: walker(st).id, part: 'gate', left: HAND_STRIKES * 2 - 1 });
    expect(strikesLeft(step.state.siege!, 'gate')).toBe(HAND_STRIKES * 2 - 1);
    expect(() => act(set(st, walker(st).id, { hex: hexAt(0, 0) }), { type: 'bash', part: 'gate', from: hexAt(8, 5) })).toThrow();
  });

  it('is not for the defender or a war machine to strike', () => {
    const st = siege({ machine: 'catapult' }, {}, FORT);
    expect(handOptions(set(st, st.stacks.find((s) => s.side === 1)!.id, {}), 'gate')).toEqual([]);
    expect(handOptions(st, 'gate')).toEqual([]);
  });

  it('breaks with its last strike, opening the way in', () => {
    const st = atGate(siege({}, {}, FORT));
    const worn = { ...st, siege: { ...st.siege!, parts: { ...st.siege!.parts, gate: 1 }, dents: { gate: HAND_STRIKES - 1 } } };
    const step = act(worn, { type: 'bash', part: 'gate', from: hexAt(8, 5) });
    expect(step.events).toContainEqual({ type: 'bash', stack: walker(st).id, part: 'gate', left: 0 });
    expect(walkable(step.state.siege!, 0).has(PART_HEX.gate)).toBe(true);
  });

  it('draws a walker with no machine, but one with a Catapult waits for it', () => {
    const bare = atGate(siege({}, {}, FORT));
    expect(chooseAction(bare)).toEqual({ type: 'bash', part: 'gate', from: hexAt(8, 5) });
    const cat = siege({ machine: 'catapult' }, {}, FORT);
    expect(chooseAction(set(cat, walker(cat).id, { hex: hexAt(8, 5) })).type).not.toBe('bash');
  });

  it('lets an army with no war machine win by hand, at a town with a moat', () => {
    let st = siege({ army: armyOf([{ creature: 'spearman', count: 60 }, { creature: 'swordsman', count: 12 }, { creature: 'bowman', count: 20 }]) }, { army: armyOf([{ creature: 'spearman', count: 20 }]), towers: armyOf([{ creature: 'bowman', count: 8 }]) }, CASTLE, 11);
    let strikes = 0;
    for (let i = 0; i < 3000 && st.winner === null; i++) {
      const step = act(st, chooseAction(st));
      strikes += step.events.filter((e) => e.type === 'bash').length;
      st = step.state;
    }
    expect(st.winner).toBe(0);
    expect(strikes).toBe(HAND_STRIKES * 2);
  });
});

describe('a tower, with no war machine', () => {
  it('can be broken by hand, so a company up there can never hold an army off for ever', () => {
    const towers = armyOf([{ creature: 'bowman', count: 30 }]);
    let st = siege({ army: armyOf([{ creature: 'spearman', count: 200 }]) }, { army: armyOf([{ creature: 'wolf', count: 1 }]), towers }, FORT, 5);
    let strikes = 0;
    for (let i = 0; i < 3000 && st.winner === null; i++) {
      const step = act(st, chooseAction(st));
      strikes += step.events.filter((e) => e.type === 'bash' && e.part === 'keep').length;
      st = step.state;
    }
    expect(st.winner).toBe(0);
    expect(strikes).toBe(HAND_STRIKES * 2);
  });
});

describe('the towers', () => {
  const slingers: Army = armyOf([{ creature: 'bowman', count: 8 }]);

  it('take only one-hex shooters', () => {
    expect(canManTower('bowman')).toBe(true);
    expect(canManTower('bowman3')).toBe(true);
    expect(canManTower('monk')).toBe(false);
    expect(canManTower('spearman')).toBe(false);
    expect(canManTower('catapult')).toBe(false);
  });

  it('put a placed company up on its tower, on no more towers than the town has', () => {
    const st = siege({}, { towers: armyOf([{ creature: 'bowman', count: 8 }, { creature: 'bowman2', count: 4 }]) }, FORT);
    const up = st.stacks.filter((s) => s.tower !== undefined);
    expect(up.map((s) => s.creature)).toEqual(['bowman']);
    expect(up[0]!.hex).toBe(PART_HEX.keep);
    expect(up[0]!.slot).toBe(TOWER_SLOT);
  });

  it('keep their company shooting with an enemy beside them, with shots that never run out', () => {
    const st = siege({}, { towers: slingers }, FORT);
    const up = st.stacks.find((s) => s.tower !== undefined)!;
    const foe = st.stacks.find((s) => s.creature === 'spearman' && s.side === 0)!;
    const beside = set({ ...st, stacks: st.stacks.map((s) => (s.id === foe.id ? { ...s, hex: neighbours(up.hex).find(insideWalls)! } : s)) }, up.id, {});
    expect(canShoot(beside, stackById(beside, up.id))).toBe(true);
    const step = act(beside, { type: 'shoot', target: foe.id });
    expect(stackById(step.state, up.id).shots).toBe(up.shots);
  });

  it('put their company out of reach of a blow, and half out of reach of a shot', () => {
    const st = siege({ army: armyOf([{ creature: 'bowman', count: 10 }]) }, { towers: slingers }, FORT);
    const up = st.stacks.find((s) => s.tower !== undefined)!;
    const bow = st.stacks.find((s) => s.creature === 'bowman' && s.side === 0)!;
    const yard = set(st, bow.id, { hex: neighbours(up.hex).find(insideWalls)! });
    expect(strikeFrom(yard, up).size).toBe(0);
    const shot = { ranged: true, distance: 3, moved: 0 };
    expect(damageRange(st, bow, up, shot).max).toBeLessThan(damageRange(st, bow, { ...up, tower: undefined, hex: hexAt(2, 5) }, shot).max);
  });

  it('never move their company, and it lands on the ground when the tower falls', () => {
    const st = siege({ machine: 'catapult' }, { towers: slingers }, FORT);
    const up = st.stacks.find((s) => s.tower !== undefined)!;
    expect([...moves(set(st, up.id, {})).keys()]).toEqual([up.hex]);
    const cat = st.stacks.find((s) => s.creature === 'catapult')!.id;
    const last: BattleState = { ...st, siege: { ...st.siege!, parts: { keep: 1 } } };
    let s = last;
    for (let i = 0; i < 30 && s.siege!.parts.keep; i++) s = { ...act(set(s, cat, { acted: false }), { type: 'catapult' }).state };
    const down = stackById(s, up.id);
    expect(down.tower).toBeUndefined();
    expect(down.hex).not.toBe(up.hex);
    expect(insideWalls(down.hex)).toBe(true);
  });

  it('send their survivors back to the town, place by place', () => {
    const towers = armyOf([null, { creature: 'bowman', count: 8 }]);
    const st = siege({}, { towers }, CITADEL);
    const up = st.stacks.find((s) => s.tower !== undefined)!;
    const hurt: BattleState = { ...st, stacks: st.stacks.map((s) => (s.id === up.id ? { ...s, count: 3 } : s)) };
    expect(towerSurvivors(hurt, 1, towers)[1]).toEqual({ creature: 'bowman', count: 3 });
  });

  it('are manned from the garrison when nobody places them', () => {
    const army = armyOf([{ creature: 'spearman', count: 20 }, { creature: 'bowman', count: 5 }, { creature: 'bowman2', count: 9 }, { creature: 'monk', count: 3 }]);
    const { army: left, towers } = manTowers(army, 2);
    expect(towers.filter(Boolean).map((s) => s!.creature)).toEqual(['bowman2', 'bowman']);
    expect(left.filter(Boolean).map((s) => s!.creature)).toEqual(['spearman', 'monk']);
  });

  it('leave a garrison of nothing but shooters someone on the ground', () => {
    const { army, towers } = manTowers(armyOf([{ creature: 'bowman', count: 5 }]), 2);
    expect(army.filter(Boolean)).toHaveLength(1);
    expect(towers.filter(Boolean)).toHaveLength(0);
  });
});

describe('a garrison under siege', () => {
  it('on foot holds its walls and lets the enemy come', () => {
    const st = siege({}, {}, FORT);
    const foot = st.stacks.find((s) => s.side === 1)!;
    expect(chooseAction(set(st, foot.id, {}))).toEqual({ type: 'defend' });
  });

  it('plays out to an end: the attacker gets in and someone wins', () => {
    let st = siege({ machine: 'catapult', army: armyOf([{ creature: 'spearman', count: 60 }, { creature: 'swordsman', count: 12 }]) }, { army: armyOf([{ creature: 'spearman', count: 20 }]), towers: armyOf([{ creature: 'bowman', count: 8 }]) }, CASTLE, 11);
    for (let i = 0; i < 2000 && st.winner === null; i++) st = act(st, chooseAction(st)).state;
    expect(st.winner).toBe(0);
  });
});
