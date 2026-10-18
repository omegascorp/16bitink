import { describe, expect, it } from 'vitest';
import { CREATURE, placeCreatures, type Creature, type CreatureKind } from '../src/logic/creatures';
import { NO_INPUT, type Mine, type MineEvent, type MineInput } from '../src/logic/mine';
import { ORES } from '../src/logic/ore';
import { STORM } from '../src/logic/storm';
import { TILE, tileAt } from '../src/logic/terrain';
import { grid, mine, standAt, T } from './helpers';

function creature(kind: CreatureKind, col: number, y: number, over: Partial<Creature> = {}): Creature {
  const hp = kind === 'rockcrab' ? CREATURE.rockcrab.hp : 1;
  const walks = kind === 'beetle' || kind === 'skate';
  const home = kind === 'skate' || kind === 'rockslide' ? { home: (col + 0.5) * T } : {};
  return { id: 1, kind, x: (col + 0.5) * T, y, hp, state: walks ? 'walk' : 'idle', timer: 0, facing: 1, reach: 0, ...home, ...(kind === 'rockslide' ? { noise: 0 } : {}), ...over };
}

/** Steps `seconds` at 60 fps; `input` on every step, `press` (fire, jump) on the first only. */
function play(m: Mine, seconds: number, input: Partial<MineInput> = {}, press: Partial<MineInput> = {}): MineEvent[] {
  const events: MineEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) events.push(...m.step(1 / 60, { ...NO_INPUT, ...input, ...(i === 0 ? press : {}) }));
  return events;
}

const hit = (events: readonly MineEvent[]): boolean => events.some((e) => e.kind === 'shielded' || e.kind === 'hurt');

/** A salt flat 30 wide: open sky over a crust of sand, the lander at the west end. */
const FLAT = [...Array.from({ length: 4 }, () => '.'.repeat(30)), 's'.repeat(30), 's'.repeat(30), '#'.repeat(30)];
const CRUST = 4 * T;

/** A slope's foot: a run of loose rock lying on the flat. */
const SLOPE = [...Array.from({ length: 4 }, () => '.'.repeat(30)), `${'s'.repeat(10)}${'o'.repeat(12)}${'s'.repeat(8)}`, 's'.repeat(30), '#'.repeat(30)];

/** A cave 30 wide and 6 high under a stone roof, the lander far off at the left. */
const CAVE = ['t'.repeat(30), ...Array.from({ length: 6 }, () => `t${'.'.repeat(28)}t`), 's'.repeat(30), '#'.repeat(30)];
const FLOOR = 7 * T;

describe('where they live', () => {
  it('boulder crabs only on loose rock, sand skates only in a level crust of sand', () => {
    const t = grid(['.'.repeat(40), '.'.repeat(40), `${'.'.repeat(12)}${'o'.repeat(6)}${'.'.repeat(22)}`, `${'.'.repeat(10)}${'o'.repeat(10)}${'.'.repeat(20)}`, 's'.repeat(40), 's'.repeat(40), 's'.repeat(40), '#'.repeat(40)]);
    const placed = placeCreatures(t, [{ kind: 'rockcrab', count: 6, from: -4, to: 0 }, { kind: 'skate', count: 6, from: 0, to: 0 }], 4, T, 1);
    const crabs = placed.filter((c) => c.kind === 'rockcrab');
    const skates = placed.filter((c) => c.kind === 'skate');
    expect(crabs.length).toBeGreaterThan(0);
    expect(skates.length).toBeGreaterThan(0);
    for (const c of crabs) expect(tileAt(t, Math.floor(c.x / T), Math.floor(c.y / T))).toBe(TILE.loose);
    for (const s of skates) {
      const col = Math.floor(s.x / T);
      expect(s.y).toBe(4 * T);
      expect(tileAt(t, col, 4)).toBe(TILE.soil);
      expect(tileAt(t, col, 3)).toBe(TILE.air);
      expect(s.home).toBe(s.x);
    }
  });
});

describe('boulder crabs', () => {
  it('sit still as boulders while you keep your distance', () => {
    const m = mine(SLOPE, { lander: { col: 1, row: 4 }, creatures: [creature('rockcrab', 16, CRUST)] });
    standAt(m, 11, 4);
    play(m, 2);
    const c = m.fauna.creatures[0]!;
    expect(c.state).toBe('idle');
    expect(c.x).toBe(16.5 * T);
  });

  it('rear up when you come close, pinch, and scuttle off, then settle into a boulder again', () => {
    const m = mine(SLOPE, { lander: { col: 1, row: 4 }, creatures: [creature('rockcrab', 16, CRUST)] });
    standAt(m, 15, 4);
    const events = play(m, 0.6);
    expect(events).toContainEqual({ kind: 'pinched' });
    expect(hit(events)).toBe(true);
    const fled = m.fauna.creatures[0]!;
    expect(fled.state).toBe('walk');
    expect(fled.facing).toBe(1);
    standAt(m, 2, 4);
    play(m, CREATURE.rockcrab.flee + CREATURE.rockcrab.rest + 0.2);
    expect(m.fauna.creatures[0]!.state).toBe('idle');
    expect(m.fauna.creatures[0]!.x).toBeGreaterThan(17 * T);
  });

  it('take two shots: the first sends it running, the second leaves its hematite shell', () => {
    const m = mine(SLOPE, { lander: { col: 1, row: 4 }, armed: true, creatures: [creature('rockcrab', 16, CRUST)] });
    standAt(m, 12, 4);
    m.facing = 1;
    const first = play(m, 0.5, {}, { fire: true });
    expect(first).toContainEqual({ kind: 'struck', creature: 'rockcrab', killed: false });
    expect(m.fauna.creatures[0]!.state).toBe('walk');
    const second = play(m, 1.2, {}, { fire: true });
    expect(second).toContainEqual({ kind: 'struck', creature: 'rockcrab', killed: true });
    play(m, 1);
    expect(m.pieces.map((p) => p.ore)).toContain(ORES.hematite.id);
  });

  it('are crushed by a falling rock, like anything else small', () => {
    const m = mine(SLOPE, { lander: { col: 1, row: 4 }, creatures: [creature('rockcrab', 16, CRUST)] });
    m.fauna.crush([[16, 3]], T);
    expect(m.fauna.creatures[0]!.state).toBe('dead');
  });
});

describe('sand skates', () => {
  it('cruise back and forth under the crust, no further than their range', () => {
    const m = mine(FLAT, { lander: { col: 1, row: 4 }, creatures: [creature('skate', 18, CRUST)] });
    standAt(m, 2, 4);
    const xs: number[] = [];
    for (let i = 0; i < 20; i++) {
      play(m, 1);
      xs.push(m.fauna.creatures[0]!.x);
      expect(m.fauna.creatures[0]!.y).toBe(CRUST);
    }
    expect(new Set(xs.map((x) => Math.round(x))).size).toBeGreaterThan(5);
    for (const x of xs) expect(Math.abs(x - 18.5 * T)).toBeLessThanOrEqual(CREATURE.skate.range * T + 1);
  });

  it('feel footsteps, dart under them and strike up: a hit, and a toss', () => {
    const m = mine(FLAT, { lander: { col: 1, row: 4 }, creatures: [creature('skate', 18, CRUST)] });
    standAt(m, 16, 4);
    const events = play(m, 1.2);
    expect(events).toContainEqual({ kind: 'struckUp' });
    expect(hit(events)).toBe(true);
  });

  it('never feel a flyer', () => {
    const m = mine(FLAT, { lander: { col: 1, row: 4 }, creatures: [creature('skate', 18, CRUST)] });
    standAt(m, 18, 1);
    m.player = { ...m.player, onGround: false };
    play(m, 0.25);
    expect(m.fauna.creatures[0]!.state).toBe('walk');
  });

  it("can't be shot under the crust, but one shot kills it out of the ground, and it leaves its water", () => {
    const m = mine(FLAT, { lander: { col: 1, row: 4 }, armed: true, creatures: [creature('skate', 17, CRUST, { state: 'rest', timer: 5 })] });
    standAt(m, 14, 4);
    m.facing = 1;
    expect(play(m, 0.5, {}, { fire: true }).some((e) => e.kind === 'struck')).toBe(false);
    m.fauna.creatures = [{ ...m.fauna.creatures[0]!, state: 'retract', reach: 1 }];
    const events = play(m, 0.4, {}, { fire: true });
    expect(events).toContainEqual({ kind: 'struck', creature: 'skate', killed: true });
    play(m, 1.5);
    expect(m.pieces.map((p) => p.ore)).toContain(ORES.water.id);
  });
});

describe('dew beetles', () => {
  it('walk the open ground, harmless', () => {
    const m = mine(FLAT, { lander: { col: 1, row: 4 }, creatures: [creature('beetle', 18, CRUST)] });
    standAt(m, 18, 4);
    const events = play(m, 3);
    expect(hit(events)).toBe(false);
    expect(m.fauna.creatures[0]!.x).not.toBe(18.5 * T);
  });

  it('tuck in while a dust storm blows, and walk on once it has passed', () => {
    const m = mine(FLAT, { lander: { col: 1, row: 4 }, storm: 4004, creatures: [creature('beetle', 18, CRUST)] });
    const s = m.storm!;
    while (s.phase !== 'blow') s.step(s.left + 1e-6);
    play(m, 1);
    expect(m.fauna.creatures[0]!.state).toBe('curled');
    s.step(s.left + 1e-6);
    s.step(STORM.clear + 1e-6);
    expect(s.phase).toBe('calm');
    play(m, 2);
    expect(m.fauna.creatures[0]!.state).toBe('walk');
  });
});

describe('the Rockslide', () => {
  it('sleeps through quiet, and wakes to noise', () => {
    const m = mine(CAVE, { lander: { col: 1, row: 7 }, creatures: [creature('rockslide', 20, FLOOR)] });
    standAt(m, 6, 7);
    expect(play(m, 2).some((e) => e.kind === 'rockslide')).toBe(false);
    for (let i = 0; i < 12; i++) m.fauna.noise(18 * T, 6 * T, 'drill', m.terrain, T);
    const events = play(m, 0.2);
    expect(events).toContainEqual({ kind: 'rockslide', now: 'wake' });
  });

  it('awake, shakes rock down from the roof, some of it over you', () => {
    const m = mine(CAVE, { lander: { col: 1, row: 7 }, creatures: [creature('rockslide', 20, FLOOR, { noise: 1 })] });
    standAt(m, 15, 7);
    const events = play(m, CREATURE.rockslide.warn + CREATURE.rockslide.quake * 2);
    expect(events.filter((e) => e.kind === 'rockslide' && e.now === 'quake').length).toBeGreaterThanOrEqual(2);
    expect(events.some((e) => e.kind === 'rock' && (e.now === 'land' || e.now === 'hit'))).toBe(true);
  });

  it("can't be hurt: not by a pulse, a blast or a rock", () => {
    const m = mine(CAVE, { lander: { col: 1, row: 7 }, armed: true, creatures: [creature('rockslide', 20, FLOOR)] });
    standAt(m, 10, 7);
    m.facing = 1;
    play(m, 1, {}, { fire: true });
    m.fauna.blast([[20, 6]], T, m.terrain);
    m.fauna.crush([[20, 6]], T);
    const r = m.fauna.creatures[0]!;
    expect(r.state === 'idle' || r.state === 'warn' || r.state === 'walk').toBe(true);
    expect(r.hp).toBe(1);
  });
});
