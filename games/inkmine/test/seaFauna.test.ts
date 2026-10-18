import { describe, expect, it } from 'vitest';
import { CREATURE, type Creature, type CreatureKind } from '../src/logic/creatures';
import { NO_INPUT, type Mine, type MineEvent, type MineInput, type MineSetup } from '../src/logic/mine';
import { ORES } from '../src/logic/ore';
import { Water } from '../src/logic/water';
import { grid, mine, standAt, T } from './helpers';

/** A cave 30 wide and 6 high over a soil floor, the lander far off at the left. */
const CAVE = ['s'.repeat(30), ...Array.from({ length: 6 }, () => `s${'.'.repeat(28)}s`), 's'.repeat(30), '#'.repeat(30)];
const FLOOR = 7 * T;

/** The cave, full of water (or dry), with these creatures in it. */
function sea(creatures: Creature[], { wet = true, ...over }: Partial<MineSetup> & { wet?: boolean } = {}): Mine {
  const t = grid(CAVE);
  const mask = new Uint8Array(t.width * t.height);
  if (wet) for (let y = 1; y <= 6; y++) for (let x = 1; x <= 28; x++) mask[y * t.width + x] = 1;
  return mine(CAVE, { terrain: t, water: new Water(t, null, mask), lander: { col: 1, row: 1 }, creatures, ...over });
}

function creature(kind: CreatureKind, x: number, y: number, over: Partial<Creature> = {}): Creature {
  const hp = kind === 'lamprey' ? CREATURE.lamprey.hp : 1;
  return { id: 1, kind, x, y, hp, state: kind === 'crab' ? 'walk' : 'idle', timer: 0, facing: 1, reach: 0, ...(kind === 'leviathan' ? { home: x, noise: 0 } : {}), ...over };
}

/** Steps `seconds` at 60 fps; `press` (fire, jump) on the first step only. */
function play(m: Mine, seconds: number, press: Partial<MineInput> = {}): MineEvent[] {
  const events: MineEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) events.push(...m.step(1 / 60, { ...NO_INPUT, ...(i === 0 ? press : {}) }));
  return events;
}

describe('bubble jellies', () => {
  it('drift after a swimmer and sting: a hit, and air lost', () => {
    const m = sea([creature('jelly', 14.5 * T, 4.5 * T)]);
    standAt(m, 11, 7);
    const air = m.suit.air;
    const events = play(m, 6);
    expect(events).toContainEqual({ kind: 'stung' });
    expect(m.suit.air).toBeLessThan(air - CREATURE.jelly.sting + 1);
  });

  it('leave you be out of the water', () => {
    const m = sea([creature('jelly', 14.5 * T, 3.5 * T)], { wet: false });
    // Dry, it can't live: it bursts.
    play(m, 0.1);
    expect(m.fauna.creatures[0]?.state ?? 'burst').toBe('burst');
  });

  it("don't drift into dry rock or air", () => {
    const t = grid(CAVE);
    const mask = new Uint8Array(t.width * t.height);
    // Water only in the cave's right half; the prospector stands on the dry left.
    for (let y = 1; y <= 6; y++) for (let x = 16; x <= 28; x++) mask[y * t.width + x] = 1;
    const m = mine(CAVE, { terrain: t, water: new Water(t, null, mask), lander: { col: 1, row: 1 }, creatures: [creature('jelly', 18.5 * T, 4.5 * T)] });
    standAt(m, 12, 7);
    play(m, 4);
    expect(m.fauna.creatures[0]!.x).toBe(18.5 * T);
  });

  it('burst at a pulse and leave salt water: water and halite', () => {
    const m = sea([creature('jelly', 12.5 * T, 6.5 * T)], { armed: true });
    standAt(m, 9, 7);
    m.facing = 1;
    const events = play(m, 0.6, { fire: true });
    expect(events).toContainEqual({ kind: 'struck', creature: 'jelly', killed: true });
    play(m, 1);
    const left = m.pieces.map((p) => p.ore).sort();
    expect(left).toEqual([ORES.water.id, ORES.halite.id].sort());
  });
});

describe('rasp eels', () => {
  /** An eel in the cave's left wall, its mouth at column 1's west edge, facing east along row 6. */
  const eel = (over: Partial<Creature> = {}): Creature => creature('lamprey', 1 * T, 6.5 * T, over);

  it('lunge at whatever swims in front of their burrow, and bite', () => {
    const m = sea([eel()]);
    standAt(m, 3, 7);
    const events = play(m, 1);
    expect(events).toContainEqual({ kind: 'bitten' });
    expect(events.some((e) => e.kind === 'shielded')).toBe(true);
  });

  it('leave you be above their row or past their reach', () => {
    const m = sea([eel()]);
    standAt(m, 3 + CREATURE.lamprey.reach + 2, 7);
    expect(play(m, 2).some((e) => e.kind === 'bitten')).toBe(false);
    const high = sea([eel({ y: 2.5 * T })]);
    standAt(high, 3, 7);
    expect(play(high, 2).some((e) => e.kind === 'bitten')).toBe(false);
  });

  it('pull back in at a pulse, die at a second, and leave their magnetite teeth', () => {
    const m = sea([eel({ state: 'strike', reach: 0.4 })], { armed: true });
    standAt(m, 6, 7);
    m.facing = -1;
    expect(play(m, 0.5, { fire: true })).toContainEqual({ kind: 'struck', creature: 'lamprey', killed: false });
    m.fauna.creatures = m.fauna.creatures.map((c) => ({ ...c, state: 'strike', reach: 0.6 }));
    expect(play(m, 0.5, { fire: true })).toContainEqual({ kind: 'struck', creature: 'lamprey', killed: true });
    play(m, 1);
    expect(m.pieces.map((p) => p.ore)).toContain(ORES.magnetite.id);
  });
});

describe('shore crabs', () => {
  it('walk the ground, harmless, tuck in when shot, and leave nothing', () => {
    const m = sea([creature('crab', 20.5 * T, FLOOR)], { wet: false, armed: true });
    standAt(m, 14, 7);
    const before = m.fauna.creatures[0]!.x;
    expect(play(m, 1).some((e) => e.kind === 'shielded' || e.kind === 'hurt')).toBe(false);
    expect(m.fauna.creatures[0]!.x).not.toBe(before);
    m.facing = 1;
    m.fauna.creatures = m.fauna.creatures.map((c) => ({ ...c, x: 17.5 * T }));
    expect(play(m, 0.5, { fire: true })).toContainEqual({ kind: 'struck', creature: 'crab', killed: false });
    expect(m.fauna.creatures[0]!.state).toBe('curled');
    play(m, 1);
    expect(m.pieces).toHaveLength(0);
  });
});

describe('the Leviathan', () => {
  /** Asleep at the cave's west end, on its floor. */
  const leviathan = (over: Partial<Creature> = {}): Creature => creature('leviathan', 8.5 * T, FLOOR, over);

  it('sleeps through drilling far off, but drilling near wakes it', () => {
    const m = sea([leviathan()]);
    standAt(m, 26, 7);
    for (let i = 0; i < 20; i++) m.fauna.noise(28.5 * T, 3.5 * T, 'drill', m.terrain, T);
    expect(m.fauna.creatures[0]!.noise).toBe(0);
    for (let i = 0; i < Math.ceil(1 / CREATURE.leviathan.drill); i++) m.fauna.noise(16.5 * T, 3.5 * T, 'drill', m.terrain, T);
    const events = play(m, 0.1);
    expect(events).toContainEqual({ kind: 'leviathan', now: 'wake' });
  });

  it('hears the drill through the mine', () => {
    const m = sea([leviathan()]);
    // Dig into the floor right beside it.
    standAt(m, 15, 7);
    const events = play(m, 0);
    expect(events).toHaveLength(0);
    const dug: MineEvent[] = [];
    for (let i = 0; i < 120; i++) dug.push(...m.step(1 / 60, { ...NO_INPUT, iy: 1 }));
    expect(dug.some((e) => e.kind === 'drilled')).toBe(true);
    expect(m.fauna.creatures[0]!.noise).toBeGreaterThan(0);
  });

  it('stirs as noise builds, and settles again in the quiet', () => {
    const m = sea([leviathan({ noise: CREATURE.leviathan.stir - 0.01 })]);
    standAt(m, 26, 7);
    m.fauna.noise(14.5 * T, 3.5 * T, 'drill', m.terrain, T);
    expect(play(m, 0.1)).toContainEqual({ kind: 'leviathan', now: 'stir' });
    play(m, 30);
    expect(m.fauna.creatures[0]!.noise).toBe(0);
  });

  it('wakes at a touch, sweeps its cave, hurts and throws you, then goes home to sleep', () => {
    const m = sea([leviathan()]);
    standAt(m, 10, 7);
    const events = play(m, CREATURE.leviathan.warn + 1);
    expect(events).toContainEqual({ kind: 'leviathan', now: 'wake' });
    expect(events.some((e) => e.kind === 'shielded' || e.kind === 'hurt')).toBe(true);
    expect(m.fauna.creatures[0]!.state).toBe('walk');
    standAt(m, 27, 2);
    const later = play(m, CREATURE.leviathan.awake + 12);
    expect(later).toContainEqual({ kind: 'leviathan', now: 'sleep' });
    expect(m.fauna.creatures[0]).toMatchObject({ state: 'idle', x: 8.5 * T, noise: 0 });
  });

  it("can't be hurt: a pulse only adds to the noise", () => {
    const m = sea([leviathan()], { armed: true });
    standAt(m, 16, 7);
    m.facing = -1;
    const events = play(m, 0.6, { fire: true });
    expect(events).toContainEqual({ kind: 'struck', creature: 'leviathan', killed: false });
    expect(m.fauna.creatures[0]!.noise).toBeGreaterThan(0);
    expect(m.fauna.creatures[0]!.hp).toBe(1);
  });
});
