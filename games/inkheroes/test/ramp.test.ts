import { describe, expect, it } from 'vitest';
import { armyOf } from '../src/logic/army';
import { act, activeStack, createBattle, rampsToPlace, type BattleSide } from '../src/logic/battle';
import { chooseAction } from '../src/logic/battleAi';
import type { BattleEvent, BattleHero, BattleState } from '../src/logic/battleTypes';
import { creature } from '../src/logic/creatures';
import { insideWalls, fortification, growRamps, moatFor, PART_HEX, raiseRamp, raiseWalls, rampDone, rampFoot, rampSpots, rampStretch, shotOverWall, wallsAgainst, WALLS, type Siege } from '../src/logic/siege';
import { hexAt, neighbours, type Hex } from '../src/logic/hex';
import { itemSays } from '../src/logic/items';
import { soldOn } from '../src/level/unlocks';

const hero = (): BattleHero => ({ name: 'H', attack: 0, defense: 0, power: 1, mana: 0, spells: [], skills: {}, morale: 0, luck: 0 });
const FORT = fortification(['fort'])!;
const CITADEL = fortification(['fort', 'citadel'])!;

/** Every hex a walker of `side` can get to from `from`. */
function walkable(s: Siege, side: 0 | 1, from: Hex): Set<Hex> {
  const closed = new Set(wallsAgainst(s, side));
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) for (const n of neighbours(queue.pop()!)) if (!seen.has(n) && !closed.has(n)) { seen.add(n); queue.push(n); }
  return seen;
}

function siege(machine: BattleSide['machine'], defender: Partial<BattleSide> = {}, fort = CITADEL, seed = 3): BattleState {
  return createBattle(
    { hero: hero(), army: armyOf([{ creature: 'levy', count: 30 }, { creature: 'nubian', count: 10 }]), machine },
    { hero: null, army: armyOf([{ creature: 'raider', count: 8 }]), ...defender },
    seed, { fort, me: 0 },
  ).state;
}

/** Everyone defends (the ramp's own turns too, once placed) until round `n` begins. */
function untilRound(st: BattleState, n: number): BattleState {
  let s = st;
  while (s.round < n && s.winner === null) s = act(s, { type: 'defend' }).state;
  return s;
}

const done = (s: BattleState, i = 0): boolean => rampDone(s.siege!.ramps![i]!);

describe('the siege ramp', () => {
  it('is three grades of war machine, sold by Egypt’s Workshop from part 6 (Earth) and part 7 (Brick)', () => {
    expect(creature('ramp').machine).toBe('ramp');
    expect(creature('ramp').cost.gold).toBe(1500);
    expect(creature('ramp2').cost.gold).toBe(3000);
    expect(soldOn(5)).toEqual([]);
    expect(soldOn(6)).toEqual(['ramp']);
    expect(soldOn(7)).toEqual(['ramp', 'ramp2']);
    // Chapter 1 sells the Greeks' catapults, unchanged.
    expect(soldOn(2)).toEqual(['catapult']);
    expect(itemSays('ramp')).toMatch(/round 3/);
    expect(itemSays('ramp3')).toMatch(/second/);
  });

  it('acts first in the first round, and waits for a stretch to be chosen: never the gate', () => {
    const s = siege('ramp');
    const me = activeStack(s)!;
    expect(me.creature).toBe('ramp');
    expect(rampsToPlace(s)).toBe(1);
    expect(rampSpots(s.siege!)).toEqual([...WALLS]);
    expect(() => act(s, { type: 'ramp', part: 'gate' as never })).toThrow();
    const placed = act(s, { type: 'ramp', part: 'wallSouth' });
    expect(placed.state.siege!.ramps).toEqual([{ part: 'wallSouth', stage: 0, need: 2 }]);
    expect(placed.events).toContainEqual({ type: 'ramp', stack: me.id, part: 'wallSouth', stage: 0, need: 2 });
    expect(activeStack(placed.state)!.id).not.toBe(me.id);
    expect(rampsToPlace(placed.state)).toBe(0);
  });

  it('grows at the start of each round: the Earth Ramp is ready on round 3, the Brick Ramp on round 2', () => {
    const earth = act(siege('ramp'), { type: 'ramp', part: 'wallNorth' }).state;
    expect(done(untilRound(earth, 2))).toBe(false);
    expect(untilRound(earth, 2).siege!.ramps![0]!.stage).toBe(1);
    expect(done(untilRound(earth, 3))).toBe(true);
    const brick = act(siege('ramp2'), { type: 'ramp', part: 'wallNorth' }).state;
    expect(done(brick)).toBe(false);
    expect(done(untilRound(brick, 2))).toBe(true);
  });

  it('when done, lets walkers over that stretch both ways and fills its moat, leaving the walls, gate and towers as they were', () => {
    const walls = raiseWalls(CITADEL, 0);
    const built = growRamps(growRamps(raiseRamp(walls, 'wallGateSouth', 2)));
    expect(walkable(walls, 0, hexAt(0, 5)).has(PART_HEX.keep)).toBe(false);
    const inside = walkable(built, 0, hexAt(0, 5));
    expect([...inside].some(insideWalls)).toBe(true);
    expect(walkable(built, 1, hexAt(16, 6)).has(hexAt(0, 6))).toBe(true);
    expect(moatFor(walls, 0).has(rampFoot('wallGateSouth'))).toBe(true);
    expect(moatFor(built, 0).has(rampFoot('wallGateSouth'))).toBe(false);
    expect(moatFor(built, 0).size).toBe(moatFor(walls, 0).size - 1);
    expect(built.parts).toEqual(walls.parts);
    expect(wallsAgainst(built, 0)).toContain(PART_HEX.gate);
    expect(wallsAgainst(built, 0)).toContain(PART_HEX.keep);
  });

  it('does nothing for anyone while it is still going up', () => {
    const walls = raiseWalls(CITADEL, 0);
    const half = growRamps(raiseRamp(walls, 'wallGateSouth', 2));
    expect(wallsAgainst(half, 0)).toEqual(wallsAgainst(walls, 0));
    expect(moatFor(half, 0)).toEqual(moatFor(walls, 0));
  });

  it('still halves a shot over the stretch it stands against', () => {
    const walls = raiseWalls(FORT, 0);
    const built = growRamps(raiseRamp(walls, 'wallGateSouth', 1));
    const from = hexAt(3, 6);
    const to = hexAt(13, 6);
    expect(shotOverWall(walls, from, to)).toBe(true);
    expect(shotOverWall(built, from, to)).toBe(true);
  });

  it('can’t go twice on one stretch', () => {
    const one = raiseRamp(raiseWalls(FORT, 0), 'wallNorth', 2);
    expect(rampSpots(one)).not.toContain('wallNorth');
    expect(() => raiseRamp(one, 'wallNorth', 2)).toThrow();
  });

  it('of the Pyramid Builders raises two: the first ready on round 2, the second, at another stretch, on round 3', () => {
    const s = siege('ramp3');
    expect(rampsToPlace(s)).toBe(2);
    const me = activeStack(s)!.id;
    const first = act(s, { type: 'ramp', part: 'wallNorth' }).state;
    // Still the workers' turn: the second ramp's place.
    expect(activeStack(first)!.id).toBe(me);
    expect(rampsToPlace(first)).toBe(1);
    expect(() => act(first, { type: 'ramp', part: 'wallNorth' })).toThrow();
    const both = act(first, { type: 'ramp', part: 'wallSouth' }).state;
    expect(activeStack(both)!.id).not.toBe(me);
    expect(both.siege!.ramps!.map((r) => r.need)).toEqual([1, 2]);
    const r2 = untilRound(both, 2);
    expect([done(r2, 0), done(r2, 1)]).toEqual([true, false]);
    const r3 = untilRound(both, 3);
    expect([done(r3, 0), done(r3, 1)]).toEqual([true, true]);
  });

  it('is put by a bot where the fewest manned towers can shoot at it, ties nearest the gate', () => {
    const fort = raiseWalls(FORT, 0);
    // Only the keep, which reaches every stretch: the stretches by the gate, the north one first.
    expect(rampStretch(fort, ['keep'])).toBe('wallGateNorth');
    expect(rampStretch(fort, [])).toBe('wallGateNorth');
    // A manned north tower reaches all but the far south stretch.
    const citadel = raiseWalls(CITADEL, 0);
    expect(rampStretch(citadel, ['keep', 'towerNorth'])).toBe('wallSouth');
    // Both outer towers reach the gate's stretches: an end one, the north first.
    expect(rampStretch(raiseWalls(fortification(['fort', 'citadel', 'castle'])!, 0), ['towerNorth', 'towerSouth'])).toBe('wallNorth');
    // Not where a ramp already goes: then evens, by the gate.
    expect(rampStretch(raiseRamp(citadel, 'wallSouth', 2), ['keep', 'towerNorth'])).toBe('wallGateNorth');
  });

  it('is placed by the battle AI by that rule, the towers’ companies counted', () => {
    const s = siege('ramp', { towers: armyOf([{ creature: 'raider', count: 6 }, { creature: 'raider', count: 6 }]) });
    const action = chooseAction(s);
    expect(action).toEqual({ type: 'ramp', part: 'wallSouth' });
  });

  it('keeps the attackers on the near bank, out of the moat and off the gate, until it is done; then they go through it', () => {
    let s = siege('ramp', { army: armyOf([{ creature: 'raider', count: 6 }, { creature: 'hyena', count: 10 }]) }, CITADEL, 11);
    const events: BattleEvent[] = [];
    let inBefore = false;
    let throughRamp = false;
    for (let i = 0; i < 400 && s.winner === null; i++) {
      const a = activeStack(s)!;
      const step = act(s, chooseAction(s));
      events.push(...step.events);
      s = step.state;
      const built = s.siege!.ramps?.some(rampDone) ?? false;
      const attackersIn = s.stacks.some((x) => x.side === 0 && x.count > 0 && !creature(x.creature).machine && insideWalls(x.hex));
      if (!built && attackersIn) inBefore = true;
      if (a.side === 0 && step.events.some((e) => e.type === 'move' && e.path.includes(PART_HEX[s.siege!.ramps![0]!.part]))) throughRamp = true;
    }
    expect(events.some((e) => e.type === 'bash')).toBe(false);
    expect(events.some((e) => e.type === 'moat' && s.stacks[e.stack]!.side === 0)).toBe(false);
    expect(inBefore).toBe(false);
    expect(throughRamp).toBe(true);
    expect(s.winner).toBe(0);
  });
});

describe('a ramp, once only a tower’s company is left', () => {
  it('leaves the attackers to strike the tower down by hand, as with no machine (a ramp opens no tower)', () => {
    let s = siege('ramp', { army: armyOf([{ creature: 'hyena', count: 1 }]), towers: armyOf([{ creature: 'raider', count: 3 }]) }, FORT, 5);
    s = act(s, { type: 'ramp', part: 'wallGateNorth' }).state;
    // The hyena on the ground is gone: only the keep's raiders hold out.
    s = { ...s, stacks: s.stacks.map((x) => (x.creature === 'hyena' ? { ...x, count: 0 } : x)) };
    const events: BattleEvent[] = [];
    for (let i = 0; i < 400 && s.winner === null; i++) {
      const step = act(s, chooseAction(s));
      events.push(...step.events);
      s = step.state;
    }
    expect(events.some((e) => e.type === 'bash' && e.part === 'keep')).toBe(true);
    expect(events.some((e) => e.type === 'bash' && e.part === 'gate')).toBe(false);
    expect(s.winner).toBe(0);
  });
});

describe('poison on shots', () => {
  it('comes with a cobra’s spit as with a scorpion’s sting', () => {
    const st = createBattle(
      { hero: null, army: armyOf([{ creature: 'cobra', count: 10 }]) },
      { hero: null, army: armyOf([{ creature: 'levy', count: 20 }]) }, 5,
    ).state;
    const cobra = st.stacks.find((x) => x.creature === 'cobra')!;
    const levy = st.stacks.find((x) => x.creature === 'levy')!;
    const step = act({ ...st, active: cobra.id }, { type: 'shoot', target: levy.id });
    const hit = step.events.find((e) => e.type === 'strike')!;
    expect(hit.type === 'strike' && hit.ranged).toBe(true);
    expect(step.events).toContainEqual({ type: 'afflict', stack: levy.id, effect: 'poison' });
    const poison = step.state.stacks[levy.id]!.effects.find((e) => e.kind === 'poison');
    expect(poison?.dose).toBe(Math.max(1, Math.floor((hit.type === 'strike' ? hit.damage : 0) * 0.1)));
  });
});
