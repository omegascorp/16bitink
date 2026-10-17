import { describe, expect, it } from 'vitest';
import { INKMINE_PAID_PLANETS } from '../content/paid';
import { buildWorld } from '../src/level/build';
import { PLANET_1 } from '../src/level/planet1';
import { canBuild, nextMark, RECIPES } from '../src/logic/blueprints';
import { CREATURE, type Creature, type CreatureKind } from '../src/logic/creatures';
import { NEW_PROFILE } from '../src/logic/economy';
import { countIn } from '../src/logic/inventory';
import { ORES, type OreKey } from '../src/logic/ore';
import { NO_INPUT, type Mine, type MineEvent, type MineInput } from '../src/logic/mine';
import { PULSE } from '../src/logic/pulse';
import { parseProfile } from '../src/logic/save';
import { findBlueprint, learnTaken } from '../src/logic/designs';
import { mine, standAt, T } from './helpers';

/** A cave 20 wide: open rows over a soil floor, the lander far off at the left. */
const CAVE = ['ssssssssssssssssssss', ...Array.from({ length: 6 }, () => 's..................s'), 'ssssssssssssssssssss', '####################'];

/** A creature of `kind` anchored at column `col`, at `y` px (a floor's top, or a ceiling's underside). */
function creature(kind: CreatureKind, col: number, y: number, over: Partial<Creature> = {}): Creature {
  return { id: 1, kind, x: (col + 0.5) * T, y, hp: kind === 'tendril' ? 2 : 1, state: kind === 'grazer' ? 'walk' : 'idle', timer: 0, facing: 1, reach: 0, ...over };
}

/** Steps `seconds` at 60 fps; `input` on every step, `press` (fire, jump) on the first only. */
function play(m: Mine, seconds: number, input: Partial<MineInput> = {}, press: Partial<MineInput> = {}): MineEvent[] {
  const events: MineEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) events.push(...m.step(1 / 60, { ...NO_INPUT, ...input, ...(i === 0 ? press : {}) }));
  return events;
}

const FLOOR = 7 * T;

describe('puffballs', () => {
  it('notice you, swell and spit a clot that costs the shield and air', () => {
    const m = mine(CAVE, { lander: { col: 1, row: 1 }, creatures: [creature('puffball', 14, FLOOR)] });
    standAt(m, 10, 7);
    const air = m.suit.air;
    const events = play(m, 3);
    expect(events.some((e) => e.kind === 'spat')).toBe(true);
    expect(events.some((e) => e.kind === 'shielded')).toBe(true);
    expect(m.suit.air).toBeLessThan(air - CREATURE.puffball.air + 1);
  });

  it("don't see you through rock", () => {
    const walled = CAVE.map((row, y) => (y >= 1 && y <= 6 ? `${row.slice(0, 12)}s${row.slice(13)}` : row));
    const m = mine(walled, { lander: { col: 1, row: 1 }, creatures: [creature('puffball', 15, FLOOR)] });
    standAt(m, 9, 7);
    expect(play(m, 3).some((e) => e.kind === 'spat')).toBe(false);
  });

  it('burst at a pulse, which costs the cell and never breaks rock', () => {
    const m = mine(CAVE, { lander: { col: 1, row: 1 }, armed: true, creatures: [creature('puffball', 12, FLOOR)] });
    standAt(m, 8, 7);
    m.facing = 1;
    const energy = m.suit.energy;
    const events = play(m, 1, {}, { fire: true });
    expect(events).toContainEqual({ kind: 'pulse' });
    expect(events).toContainEqual({ kind: 'struck', creature: 'puffball', killed: true });
    expect(m.suit.energy).toBe(energy - PULSE.energy);
    expect(m.fauna.creatures).toHaveLength(0);
  });

  it('are untouched by a pulse you have not got', () => {
    const m = mine(CAVE, { lander: { col: 1, row: 1 }, creatures: [creature('puffball', 12, FLOOR)] });
    standAt(m, 8, 7);
    expect(play(m, 0.5, {}, { fire: true }).some((e) => e.kind === 'pulse')).toBe(false);
  });

  it('burst in a blast', () => {
    const m = mine(CAVE, { lander: { col: 1, row: 1 }, creatures: [creature('puffball', 12, FLOOR)] });
    m.fauna.blast([[12, 6]], T);
    expect(m.fauna.creatures[0]!.state).toBe('burst');
  });
});

describe('snap tendrils', () => {
  const ceiling = 1 * T;
  /** A cave four tiles high: a tendril reaches its floor. */
  const LOW = ['ssssssssssssssssssss', ...Array.from({ length: 4 }, () => 's..................s'), 'ssssssssssssssssssss', '####################'];

  it('whip down on whoever passes under, hold on and squeeze until struggled free', () => {
    const m = mine(LOW, { lander: { col: 1, row: 1 }, creatures: [creature('tendril', 10, ceiling)] });
    standAt(m, 10, 5);
    const events = play(m, 1);
    expect(events).toContainEqual({ kind: 'grabbed' });
    expect(m.fauna.held).toBe(1);
    // Held, walking goes nowhere.
    const x = m.player.x;
    play(m, 0.5, { ix: 1 });
    expect(m.player.x).toBe(x);
    const freed: MineEvent[] = [];
    for (let k = 0; k < CREATURE.tendril.struggle; k++) freed.push(...play(m, 0.1, {}, { jump: true }));
    expect(freed).toContainEqual({ kind: 'freed' });
    expect(m.fauna.held).toBeNull();
  });

  it('let go when shot, and are severed by a second shot', () => {
    const m = mine(LOW, { lander: { col: 1, row: 1 }, armed: true, creatures: [creature('tendril', 10, ceiling)] });
    standAt(m, 10, 5);
    play(m, 1);
    expect(m.fauna.held).toBe(1);
    const shot = play(m, 0.6, {}, { fire: true });
    expect(shot).toContainEqual({ kind: 'freed' });
    expect(shot).toContainEqual({ kind: 'struck', creature: 'tendril', killed: false });
  });

  it('leave you be when you keep clear of them', () => {
    const m = mine(LOW, { lander: { col: 1, row: 1 }, creatures: [creature('tendril', 15, ceiling)] });
    standAt(m, 8, 5);
    expect(play(m, 2).some((e) => e.kind === 'grabbed')).toBe(false);
  });
});

describe('grazers', () => {
  it('crawl along the ground, harmless, and curl up when shot', () => {
    const m = mine(CAVE, { lander: { col: 1, row: 1 }, armed: true, creatures: [creature('grazer', 13, FLOOR)] });
    standAt(m, 8, 7);
    const x = m.fauna.creatures[0]!.x;
    const events = play(m, 1, {}, { fire: true });
    expect(events).toContainEqual({ kind: 'struck', creature: 'grazer', killed: false });
    expect(m.fauna.creatures[0]!.state).toBe('curled');
    expect(m.suit.hearts).toBe(m.suit.maxHearts);
    play(m, CREATURE.grazer.curl + 1);
    expect(m.fauna.creatures[0]!.state).toBe('walk');
    expect(m.fauna.creatures[0]!.x).not.toBe(x);
  });
});

describe('grazers on rough ground', () => {
  it('step up and down a tile and crawl in among caps, never floating', () => {
    const rough = ['....................', '........ss..........', '...m...ssss....m....', 'ssssssssssssssssssss', '####################'];
    const m = mine(rough, { lander: { col: 0, row: 3 }, creatures: [creature('grazer', 4, 3 * T)] });
    for (let i = 0; i < 60 * 30; i++) {
      m.step(1 / 60, NO_INPUT);
      const c = m.fauna.creatures[0]!;
      const col = Math.floor(c.x / T);
      const row = Math.floor((c.y - 1) / T);
      // Standing (ground right under its feet) or, at most, part way through a drop.
      if (c.y % T === 0) expect(m.terrain.tiles[(row + 1) * m.terrain.width + col], `t=${i}`).not.toBe(0);
    }
  });
});

describe('the Mother Mycel', () => {
  const big = ['s'.repeat(40), ...Array.from({ length: 10 }, () => `s${'.'.repeat(38)}s`), 's'.repeat(40), '#'.repeat(40)];

  it("beats, and its wave costs air nearby; a pulse doesn't mark it", () => {
    const m = mine(big, { lander: { col: 1, row: 1 }, armed: true, creatures: [creature('mother', 30, 11 * T)] });
    standAt(m, 20, 11);
    m.facing = 1;
    const air = m.suit.air;
    const events = play(m, CREATURE.mother.beat + 0.1, {}, { fire: true });
    expect(events).toContainEqual({ kind: 'beat', near: true });
    expect(events).toContainEqual({ kind: 'struck', creature: 'mother', killed: false });
    expect(m.suit.air).toBeLessThan(air - CREATURE.mother.waveAir + 1);
    expect(m.fauna.creatures).toHaveLength(1);
  });

  it('hurts to touch, and throws you off', () => {
    const m = mine(big, { lander: { col: 1, row: 1 }, creatures: [creature('mother', 30, 11 * T)] });
    standAt(m, 26, 11);
    const x = m.player.x;
    const events = play(m, 0.5);
    expect(events.some((e) => e.kind === 'shielded')).toBe(true);
    expect(m.player.x).toBeLessThan(x);
  });
});

describe('where they live', () => {
  const mycel = INKMINE_PAID_PLANETS[0]!;
  const p = { ...NEW_PROFILE, at: 'mycel' as const };
  const { setup } = buildWorld(mycel, p, null);
  const creatures = setup.creatures ?? [];
  const surface = mycel.world.site.surface;
  const fromLander = (c: Creature): number => {
    const d = Math.abs(c.x / T - mycel.world.site.landerCol);
    return Math.min(d, mycel.world.site.width - d);
  };

  it('Graphite, a dead rock, has none', () => {
    expect(buildWorld(PLANET_1, NEW_PROFILE, null).setup.creatures).toEqual([]);
  });

  it('Mycel has all four, and her giant on her chamber floor', () => {
    for (const kind of ['puffball', 'tendril', 'grazer', 'mother'] as const) expect(creatures.some((c) => c.kind === kind), kind).toBe(true);
    expect(creatures.filter((c) => c.kind === 'mother')).toHaveLength(1);
  });

  it('keeps the danger away from the lander, and deeper is fiercer: tendrils only in the stone', () => {
    for (const c of creatures.filter((k) => k.kind === 'puffball' && k.y / T - surface < 24)) expect(fromLander(c)).toBeGreaterThan(60);
    for (const c of creatures.filter((k) => k.kind === 'tendril')) expect(c.y / T - surface).toBeGreaterThanOrEqual(23);
    for (const c of creatures.filter((k) => k.kind === 'grazer')) expect(fromLander(c)).toBeGreaterThan(20);
  });

  it('arms you once the pulse is printed', () => {
    expect(setup.armed).toBe(false);
    expect(buildWorld(mycel, { ...p, tools: ['receiver', 'pulse'] }, null).setup.armed).toBe(true);
  });
});

describe('spoils', () => {
  /** Pieces of `ore` lying about or already in the bag. */
  const got = (m: Mine, ore: OreKey): number => m.pieces.filter((p) => p.ore === ORES[ore].id).length + countIn(m.suit.bag, ore);

  it('a burst puffball leaves carbon and water', () => {
    const m = mine(CAVE, { lander: { col: 1, row: 1 }, armed: true, creatures: [creature('puffball', 12, FLOOR)] });
    standAt(m, 8, 7);
    m.facing = 1;
    const [carbon, water] = [got(m, 'carbon'), got(m, 'water')];
    play(m, 1, {}, { fire: true });
    expect(got(m, 'carbon')).toBe(carbon + 1);
    expect(got(m, 'water')).toBe(water + 1);
  });

  it('a severed tendril leaves carbon and amber; a blast kills and leaves spoils too', () => {
    const m = mine(CAVE, { lander: { col: 1, row: 1 }, creatures: [creature('tendril', 10, 1 * T), creature('puffball', 14, FLOOR, { id: 2 })] });
    m.fauna.blast([[10, 1], [14, 6]], T);
    expect(m.fauna.takeSpoils().map((s) => s.ore).sort()).toEqual(['amber', 'carbon', 'carbon', 'water']);
    expect(m.fauna.takeSpoils()).toEqual([]);
  });

  it('a grazer only curls up, and leaves nothing', () => {
    const m = mine(CAVE, { lander: { col: 1, row: 1 }, creatures: [creature('grazer', 12, FLOOR)] });
    m.fauna.blast([[12, 6]], T);
    expect(m.fauna.takeSpoils()).toEqual([]);
  });
});

describe('saves', () => {
  it("keep the pulse's design and the tool", () => {
    const back = parseProfile(JSON.parse(JSON.stringify({ ...NEW_PROFILE, found: ['pulse', 'drill-2', 'nonsense'], tools: ['receiver', 'pulse'] })));
    expect(back.found).toEqual(['pulse', 'drill-2']);
    expect(back.tools).toEqual(['receiver', 'pulse']);
  });
});

describe('learning the pulse', () => {
  it('records its design when the broken one is studied', () => {
    expect(findBlueprint(NEW_PROFILE, 'pulse').found).toEqual(['pulse']);
    expect(findBlueprint(NEW_PROFILE, 'warp-9')).toBe(NEW_PROFILE);
  });

  it('mends a save where the resonator was taken apart but its design never recorded', () => {
    const items = INKMINE_PAID_PLANETS[0]!.world.items;
    const healed = learnTaken(NEW_PROFILE, items, ['aster-pulse', 'east-cave-drill-2']);
    expect(healed.found).toEqual(['pulse', 'drill-2']);
    expect(learnTaken(healed, items, ['aster-pulse'])).toBe(healed);
  });
});

describe('gear marks', () => {
  it("can be skipped: Mycel's Mk 2 prints over a Mk 0 without Graphite's Mk 1", () => {
    const gear = { ...NEW_PROFILE.gear };
    expect(canBuild(RECIPES['cell-2']!, ['cell-2'], gear, () => true)).toBe('ok');
    expect(nextMark('cell', ['cell-2'], gear)!.id).toBe('cell-2');
    // Nothing found above it: the next mark, to say it's still to find.
    expect(nextMark('cell', [], gear)!.id).toBe('cell-1');
    expect(canBuild(RECIPES['cell-1']!, ['cell-1', 'cell-2'], { ...gear, cell: 2 }, () => true)).toBe('built');
  });
});
