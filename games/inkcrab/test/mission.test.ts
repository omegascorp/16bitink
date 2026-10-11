import { describe, expect, it } from 'vitest';
import { buildLevel, levelGoal } from '../src/level/build';
import { carve } from '../src/level/carve';
import { INKCRAB_PAID_BEACHES } from '../content/paid';
import { installPaidBeaches, loadedBeaches, loadedLevels } from '../src/level/levels';
import { missionKinds, missionOf, parTimeOf, quarrySpecies } from '../src/level/missions';
import { boxHitsSolid } from '../src/logic/body';
import { makeCritter } from '../src/logic/critters';
import { setTile, TILE } from '../src/logic/terrain';
import { centre, findItem, food, makeItem, shell, type Item } from '../src/logic/items';
import { BEACH_FINDS, FINDS } from '../src/logic/finds';
import { fed, LINE, lineOf } from '../src/logic/line';
import { missionGoal, missionLine, missionNotes, missionTag, PLAIN, tasksDone, type Mission } from '../src/logic/mission';
import { shellOf, type ShellKind } from '../src/logic/shells';
import { Beach, IDLE, type BeachSetup, type Input, type SimEvent } from '../src/logic/sim';
import { movementOf, SPECIES } from '../src/logic/species';

// Every beach, as an owner has them.
installPaidBeaches(INKCRAB_PAID_BEACHES);

const T = 16;
const GROUND = 12;
const W = 80;
const flat = () => carve({ width: W, height: 24, seed: 1, profile: [[0, GROUND], [W - 1, GROUND]] });

/** A loose shell lying on the sand at column `col`. */
function loose(id: number, kind: ShellKind, size: number, col: number): Item {
  const proto = makeItem(id, shell(kind, size), 0, 0, false);
  return { ...proto, x: col * T + T / 2 - proto.w / 2, y: GROUND * T - proto.h };
}

const CHAIN: Mission = { ...PLAIN, kinds: ['chain'], chain: 3 };

/** A flat beach, the crab at column 10 (size 2, full in its size-2 periwinkle). */
function beach(over: Partial<BeachSetup> = {}): Beach {
  return new Beach({
    terrain: flat(), items: [], start: { x: 10 * T, y: GROUND * T }, tileSize: T, startShell: shellOf('periwinkle', 2), seed: 1, surfaceFood: 0,
    startGrowth: { size: 2, meter: 0 }, goal: 5, ...over,
  });
}

const run = (b: Beach, seconds: number, input: Partial<Input> = {}): SimEvent[] => {
  const events: SimEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) events.push(...b.step({ ...IDLE, ...input }, 1 / 60));
  return events;
};

/** Presses E for a few frames, until the crab starts moving house. */
const moveIn = (b: Beach): void => {
  for (let i = 0; i < 6 && !b.crab.swap; i++) b.step({ ...IDLE, interact: true }, 1 / 60);
};

const followers = (b: Beach) => lineOf(b.critters.values());

describe('the mission arc', () => {
  it('runs the same ten slots every beach: a shell chain fifth, the giant last', () => {
    for (let beachNo = 0; beachNo < 8; beachNo++) {
      expect(missionKinds(beachNo, 0)).toEqual(['grow']);
      expect(missionKinds(beachNo, 1)).toEqual(['collect']);
      expect(missionKinds(beachNo, 3)).toEqual(['bounty']);
      expect(missionKinds(beachNo, 4)).toEqual(['chain']);
      expect(missionKinds(beachNo, 6)).toEqual(['survive']);
      expect(missionKinds(beachNo, 7)).toHaveLength(2);
      expect(missionKinds(beachNo, 9)).toEqual(['giant']);
    }
    // No two beaches in a row remix the same pair.
    for (let beachNo = 1; beachNo < 8; beachNo++) expect(missionKinds(beachNo, 7)).not.toEqual(missionKinds(beachNo - 1, 7));
  });

  it('gives every level a mission, shown on its intro card', () => {
    for (const def of loadedLevels()) {
      const m = missionOf(def);
      expect(missionTag(m).length, def.id).toBeGreaterThan(0);
      expect(missionGoal(m, levelGoal(def)), def.id).toMatch(new RegExp(`size[- ]${levelGoal(def)}`));
      expect(parTimeOf(def)).toBeGreaterThanOrEqual(def.parTime);
    }
  });

  it('puts a price only on creatures that walk and can be walked down and eaten', () => {
    for (const def of loadedLevels()) {
      const s = quarrySpecies(def);
      expect(['walk', 'climb']).toContain(movementOf(s));
      expect(SPECIES[s].lowTide ?? false).toBe(false);
    }
  });
});

describe('every mission level', () => {
  for (const [b, beachLevels] of loadedBeaches().entries()) {
    for (const def of beachLevels) {
      const m = missionOf(def);
      if (m.kinds.includes('grow')) continue;
      it(`${b * 10 + beachLevels.indexOf(def) + 1} ${def.id} lays out its ${missionTag(m)}`, () => {
        const setup = buildLevel(def);
        const sim = new Beach(setup);
        const finds = setup.items.filter((i) => i.kind.type === 'find' && i.buried);
        expect(finds).toHaveLength(m.finds);
        // The beach's own find.
        for (const i of finds) expect(i.kind.type === 'find' && i.kind.find).toBe(BEACH_FINDS[b]);
        const marked = [...sim.critters.values()].filter((k) => k.marked);
        expect(marked).toHaveLength((m.marked?.count ?? 0) + (m.giant ? 1 : 0));
        // Away from the start, where nothing finds the crab straight off.
        for (const k of marked) expect(Math.abs(centre(k).x / T - def.startCol)).toBeGreaterThan(8);
        const recruits = [...sim.critters.values()].filter((k) => k.recruit);
        expect(recruits).toHaveLength(m.chain);
        for (const k of recruits) expect(k.shell?.size).toBe(1);
        expect(sim.lives).toBe(m.lives);
      });
    }
  }

  it('asks for one more follower than the shells past the periwinkle, on a chain', () => {
    for (const def of loadedLevels()) {
      const m = missionOf(def);
      if (m.chain) expect(m.chain).toBe(levelGoal(def) - 2);
    }
  });
});

describe('beachcomber\'s finds', () => {
  const bottle = (id: number, col: number): Item => {
    const proto = makeItem(id, findItem('doubloon'), 0, 0, false);
    return { ...proto, x: col * T, y: GROUND * T - proto.h };
  };

  it('are picked up by walking over them, and the level is won only with all of them and grown', () => {
    const m: Mission = { ...PLAIN, kinds: ['collect'], finds: 2, find: 'doubloon' };
    const b = beach({ mission: m, items: [bottle(1, 12), bottle(2, 40)], startGrowth: { size: 5, meter: 0 } });
    const first = run(b, 1, { moveX: 1 });
    expect(first.filter((e) => e.type === 'collected')).toHaveLength(1);
    expect(b.outcome).toBe('playing');
    const rest = run(b, 8, { moveX: 1 });
    expect(rest.some((e) => e.type === 'collected')).toBe(true);
    expect(b.finds).toBe(2);
    expect(b.outcome).toBe('won');
  });

  it('show on the HUD, then point back at the growth bar once all are found', () => {
    const m: Mission = { ...PLAIN, kinds: ['collect'], finds: 3, find: 'doubloon' };
    expect(missionLine(m, { grown: false, finds: 1, marked: 0, giant: false })).toBe('gold doubloons 1/3');
    expect(missionLine(m, { grown: false, finds: 3, marked: 0, giant: false })).toContain('grow');
  });

  it('are each beach\'s own, every one different, named on the intro card', () => {
    expect(new Set(BEACH_FINDS).size).toBe(10);
    const m: Mission = { ...PLAIN, kinds: ['collect'], finds: 4, find: 'opal' };
    expect(missionGoal(m, 6)).toBe('grow to size 6 and dig up 4 opals');
    expect(missionNotes(m)[0]).toContain(FINDS.opal.lore);
  });
});

describe('marked hunters and the giant', () => {
  it('count when eaten, and the level waits for them', () => {
    const m: Mission = { ...PLAIN, kinds: ['bounty'], marked: { species: 'ghostcrab', size: 2, count: 1 } };
    const b = beach({ mission: m, startGrowth: { size: 5, meter: 0 } });
    run(b, 0.2);
    expect(b.outcome).toBe('playing');
    const k = makeCritter(900, 2, 12 * T, GROUND * T, -1, 10, 'ghostcrab');
    b.critters.set(900, { ...k, marked: 'bounty' });
    const events = run(b, 2, { moveX: 1 });
    expect(events.some((e) => e.type === 'quarry')).toBe(true);
    expect(b.markedEaten).toBe(1);
    expect(b.outcome).toBe('won');
  });

  it('are placed for the level: three marked hunters on a bounty, the giant on the finale', () => {
    const def = loadedBeaches()[0]![3]!;
    const sim = new Beach(buildLevel(def));
    const marked = [...sim.critters.values()].filter((k) => k.marked === 'bounty');
    expect(marked).toHaveLength(3);
    for (const k of marked) expect(k.size).toBe(levelGoal(def) - 2);
    const finale = loadedBeaches()[0]![9]!;
    const giant = [...new Beach(buildLevel(finale)).critters.values()].filter((k) => k.marked === 'giant');
    expect(giant).toHaveLength(1);
    expect(giant[0]!.size).toBe(levelGoal(finale) - 1);
  });

  it('a giant is the last task: grown up, the level still waits for it', () => {
    const m: Mission = { ...PLAIN, kinds: ['giant'], giant: { species: 'ghostcrab', size: 4, count: 1 } };
    expect(tasksDone(m, { grown: true, finds: 0, marked: 0, giant: false })).toBe(false);
    expect(missionLine(m, { grown: true, finds: 0, marked: 0, giant: false })).toBe('now eat the giant ghost crab!');
  });
});

describe('one life', () => {
  it('ends the level at the first catch', () => {
    const def = loadedBeaches()[0]![6]!;
    expect(missionOf(def).lives).toBe(1);
    const b = new Beach(buildLevel(def));
    expect(b.lives).toBe(1);
    expect(b.startLives).toBe(1);
  });
});

describe('a shell chain', () => {
  const recruit = (col: number): readonly [ShellKind, number, number, number] => ['periwinkle', 1, col, 1];

  it('lets a small crab join the line when the crab comes up to it, and it follows', () => {
    const b = beach({ mission: CHAIN, recruits: [recruit(18)] });
    run(b, 0.5);
    expect(followers(b)).toHaveLength(0);
    const events = run(b, 2, { moveX: 1 });
    expect(events.some((e) => e.type === 'joined')).toBe(true);
    expect(followers(b)).toHaveLength(1);
    run(b, 3, { moveX: -1 });
    run(b, 3);
    const k = followers(b)[0]!;
    expect(Math.abs(centre(k).x - centre(b.crab.body).x)).toBeLessThan(3 * T);
  });

  it('never lets the crab rap on a recruit', () => {
    const b = beach({ mission: CHAIN, recruits: [recruit(11)] });
    run(b, 0.3);
    expect(b.nearbyRival).toBeNull();
  });

  it('holds a move up until there is a crab to take the shell left behind', () => {
    const b = beach({ mission: CHAIN, items: [loose(50, 'snail', 3, 10)] });
    run(b, 0.2);
    expect(b.nearbyFits).toBe(true);
    expect(b.nearbyHeld).toBe(true);
    expect(b.chain?.wait).toBe('recruit');
    moveIn(b);
    expect(b.crab.swap).toBeNull();
  });

  it('hands the shell left behind to the first in line, whose tiny one is left over', () => {
    const b = beach({ mission: CHAIN, recruits: [recruit(13)], items: [loose(50, 'snail', 3, 10)] });
    run(b, 1);
    expect(followers(b)).toHaveLength(1);
    expect(b.chain?.wait).toBeNull();
    moveIn(b);
    expect(b.crab.swap).not.toBeNull();
    const events = run(b, 6);
    expect(b.crab.shell).toEqual(shellOf('snail', 3));
    expect(followers(b)[0]!.shell).toEqual(shellOf('periwinkle', 2));
    expect(events.filter((e) => e.type === 'traded')).toHaveLength(1);
    const left = [...b.items.values()].flatMap((i) => (i.kind.type === 'shell' ? [i.kind.shell] : []));
    expect(left).toEqual([shellOf('periwinkle', 1)]);
  });

  it('needs one more crab for each move up, each grown into its shell', () => {
    const b = beach({ mission: CHAIN, startShell: shellOf('snail', 3), startGrowth: { size: 3, meter: 0 }, recruits: [['periwinkle', 2, 13, 1], recruit(14)] });
    run(b, 1);
    expect(followers(b)).toHaveLength(2);
    // The first is still a size short of its periwinkle.
    expect(b.chain?.wait).toBe('growing');
    const [first] = followers(b);
    b.critters.set(first!.id, fed(first!, LINE.meal));
    expect(followers(b)[0]!.size).toBe(2);
    expect(b.chain?.wait).toBeNull();
  });

  it('grows its followers as they eat, never past their shells', () => {
    const k = { ...makeCritter(1, 1, 0, 0, 1, 1, 'hermit'), shell: shellOf('periwinkle', 2) };
    const once = fed(k, LINE.meal);
    expect(once.size).toBe(2);
    expect(fed(once, LINE.meal * 3).size).toBe(2);
  });

  it('feeds a hungry follower on food it passes on the crab\'s path', () => {
    const b = beach({ mission: CHAIN, recruits: [['periwinkle', 2, 8, 1]] });
    run(b, 1);
    run(b, 2, { moveX: 1 });
    // Food turns up on the path between the crab and its follower.
    const k = followers(b)[0]!;
    const proto = makeItem(60, food('hopper'), 0, 0, false);
    const x = (centre(k).x + centre(b.crab.body).x) / 2;
    b.items.set(60, { ...proto, x: x - proto.w / 2, y: GROUND * T - proto.h });
    const before = followers(b)[0]!.meter ?? 0;
    run(b, 2, { moveX: 1 });
    expect(b.items.has(60)).toBe(false);
    const after = followers(b)[0]!;
    expect((after.size - 1) * LINE.meal + (after.meter ?? 0)).toBeGreaterThan(before + 1.5);
  });

  it('pulls a follower into its shell while a bigger hunter is close, and nothing catches it', () => {
    const b = beach({ mission: CHAIN, recruits: [recruit(13)] });
    run(b, 1);
    const k = followers(b)[0]!;
    const hunter = makeCritter(900, 6, centre(k).x + 2 * T, GROUND * T, -1, 10, 'ghostcrab');
    b.critters.set(900, { ...hunter, bored: 30 });
    run(b, 0.2);
    expect(followers(b)[0]!.tucked).toBe(true);
    run(b, 3);
    expect(followers(b)).toHaveLength(1);
  });

  it('is won only once the last crab in the line is in its new shell, and the crab has grown to fill the biggest', () => {
    const chainOf2 = (): Beach => beach({
      mission: { ...PLAIN, kinds: ['chain'], chain: 2 }, goal: 4, startShell: shellOf('snail', 3), startGrowth: { size: 3, meter: 0 },
      recruits: [['periwinkle', 2, 13, 2], recruit(14)], items: [loose(50, 'nerite', 4, 10)],
    });
    // Grown the moment it's in: still the line to go.
    const quick = chainOf2();
    run(quick, 1);
    expect(quick.chain?.wait).toBeNull();
    moveIn(quick);
    run(quick, 1.1);
    expect(quick.crab.shell).toEqual(shellOf('nerite', 4));
    // Moving in grows it no bigger.
    expect(quick.crab.growth.size).toBe(3);
    quick.crab = { ...quick.crab, growth: { size: 4, meter: 0 } };
    const out: SimEvent[] = [];
    for (let i = 0; i < 60 * 8 && quick.outcome === 'playing'; i++) {
      out.push(...quick.step(IDLE, 1 / 60));
      if (quick.outcome === 'playing') expect(quick.progress.chained).toBe(false);
    }
    expect(quick.outcome).toBe('won');
    expect(out.filter((e) => e.type === 'traded')).toHaveLength(2);
    expect(followers(quick).map((k) => k.shell?.size)).toEqual([3, 2]);
    // The line done first: still a size to grow.
    const slow = chainOf2();
    run(slow, 1);
    moveIn(slow);
    run(slow, 8);
    expect(slow.progress.chained).toBe(true);
    expect(slow.outcome).toBe('playing');
    expect(missionLine(slow.mission, slow.progress, slow.chain)).toContain('now grow');
  });

  it('follows the crab\'s footsteps down a drop no walker would go down', () => {
    const terrain = carve({ width: W, height: 24, seed: 1, profile: [[0, 6], [30, 6], [31, 14], [W - 1, 14]] });
    const b = beach({ terrain, start: { x: 10 * T, y: 6 * T }, mission: CHAIN, recruits: [recruit(13)] });
    run(b, 1);
    expect(followers(b)).toHaveLength(1);
    run(b, 5, { moveX: 1 });
    run(b, 4);
    const k = followers(b)[0]!;
    // Down at the foot of the drop with the crab, not left on top.
    expect(k.y + k.h).toBeGreaterThan(12 * T);
    expect(Math.abs(centre(k).x - centre(b.crab.body).x)).toBeLessThan(3 * T);
  });

  it('hides only from a roaming hunter right by it, not one a few tiles off, a timid creature or an antlion in its pit', () => {
    const near = (species: 'ghostcrab' | 'darkling' | 'antlion', tiles: number): boolean => {
      const b = beach({ mission: CHAIN, recruits: [recruit(13)] });
      run(b, 1);
      const k = followers(b)[0]!;
      const other = makeCritter(900, 6, centre(k).x + tiles * T, GROUND * T, -1, 10, species);
      b.critters.set(900, { ...other, bored: 30 });
      run(b, 0.2);
      return followers(b)[0]!.tucked ?? false;
    };
    expect(near('ghostcrab', 1.5)).toBe(true);
    expect(near('ghostcrab', 4)).toBe(false);
    expect(near('darkling', 1.5)).toBe(false);
    expect(near('antlion', 1.5)).toBe(false);
  });

  it('hides only from a hunter it can see: not through a wall of sand', () => {
    const b = beach({ mission: CHAIN, recruits: [recruit(13)] });
    run(b, 1);
    const k = followers(b)[0]!;
    const col = Math.floor(centre(k).x / T);
    for (let y = GROUND - 4; y < GROUND; y++) setTile(b.terrain, col - 2, y, TILE.sand);
    const hunter = makeCritter(900, 6, (col - 3) * T, GROUND * T, -1, 10, 'ghostcrab');
    b.critters.set(900, { ...hunter, bored: 30 });
    run(b, 0.2);
    expect(followers(b)[0]!.tucked).toBe(false);
  });

  it('steps up over a little sand that has poured onto the crab\'s footsteps', () => {
    const b = beach({ mission: CHAIN, recruits: [recruit(8)] });
    run(b, 1);
    run(b, 3, { moveX: 1 });
    run(b, 1);
    const k = followers(b)[0]!;
    const crabX = centre(b.crab.body).x;
    setTile(b.terrain, Math.floor((centre(k).x + crabX) / 2 / T), GROUND - 1, TILE.sand);
    const before = centre(k).x;
    run(b, 3, { moveX: 1 });
    expect(centre(followers(b)[0]!).x - before).toBeGreaterThan(4 * T);
  });

  it('waits behind sand put across the crab\'s footsteps, and goes on once it\'s dug away', () => {
    const b = beach({ mission: CHAIN, recruits: [recruit(8)] });
    run(b, 1);
    run(b, 3, { moveX: 1 });
    run(b, 2);
    const k = followers(b)[0]!;
    const crabX = centre(b.crab.body).x;
    // A wall across the way between them, too late for the follower to have passed.
    const wall = Math.floor((centre(k).x + crabX) / 2 / T);
    for (let y = GROUND - 3; y < GROUND; y++) setTile(b.terrain, wall, y, TILE.sand);
    b.crab = { ...b.crab, body: { ...b.crab.body, x: b.crab.body.x + 8 * T } };
    run(b, 0.2);
    const before = centre(followers(b)[0]!).x;
    run(b, 2);
    expect(Math.abs(centre(followers(b)[0]!).x - before)).toBeLessThan(T);
    for (let y = GROUND - 3; y < GROUND; y++) setTile(b.terrain, wall, y, TILE.air);
    run(b, 3);
    expect(Math.abs(centre(followers(b)[0]!).x - before)).toBeGreaterThan(2 * T);
  });

  it('shows on the HUD how the line stands', () => {
    const p = { grown: false, finds: 0, marked: 0, giant: false };
    expect(missionLine(CHAIN, p, { line: 0, needed: 1, wait: 'recruit' })).toContain('find one more small crab');
    expect(missionLine(CHAIN, p, { line: 2, needed: 2, wait: 'growing' })).toContain('grow');
    expect(missionLine(CHAIN, p, { line: 2, needed: 2, wait: null })).toContain('ready');
  });

  it('works through the first chain level: the first recruit lets the crab into the size-3 shell', () => {
    const def = loadedBeaches()[0]![4]!;
    const setup = buildLevel(def);
    const m = missionOf(def);
    expect(m.chain).toBe(levelGoal(def) - 2);
    const recruits = setup.recruits ?? [];
    // Each before its shell: the first short of the size-3 snail.
    const snail = def.shells.find(([, size]) => size === 3)![2];
    expect(recruits[0]![2]).toBeLessThan(snail);
  });
});

describe('shells of every size', () => {
  it('turn up again, away from the crab, if every one of a size it still needs is lost', () => {
    const b = beach({ startGrowth: { size: 1, meter: 0 }, ladder: [shellOf('snail', 3), shellOf('nerite', 4)], items: [loose(50, 'snail', 3, 40)] });
    run(b, 5);
    const sizes = [...b.items.values()].flatMap((i) => (i.kind.type === 'shell' ? [i.kind.shell.size] : [])).sort();
    expect(sizes).toEqual([3, 4]);
    const nerite = [...b.items.values()].find((i) => i.kind.type === 'shell' && i.kind.shell.size === 4)!;
    expect(Math.abs(centre(nerite).x - centre(b.crab.body).x)).toBeGreaterThan(10 * T);
  });

  it('wait for a shell the tide has still to bring in', () => {
    const terrain = carve({ width: W, height: 30, seed: 1, profile: [[0, 10], [W - 1, 18]] });
    const b = beach({ terrain, start: { x: 6 * T, y: 10 * T }, tide: { low: 22, high: 12, period: 40 }, tideBrings: { food: 0, shells: [['nerite', 4, 40]] }, ladder: [shellOf('nerite', 4)] });
    run(b, 6);
    expect([...b.items.values()].some((i) => i.kind.type === 'shell')).toBe(false);
  });

  it('never start sunk into the sand, on any level', () => {
    for (const def of loadedLevels()) {
      const setup = buildLevel(def);
      for (const i of setup.items) if (i.kind.type === 'shell' && !i.buried) expect(boxHitsSolid(setup.terrain, i, T), `${def.id} ${i.kind.shell.kind}`).toBe(false);
    }
  });
});

