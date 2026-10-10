import { describe, expect, it } from 'vitest';
import { buildLevel, levelGoal } from '../src/level/build';
import { carve } from '../src/level/carve';
import { BEACHES, LEVELS } from '../src/level/levels';
import { missionKinds, missionOf, parTimeOf, quarrySpecies } from '../src/level/missions';
import { makeCritter } from '../src/logic/critters';
import { BOTTLE, centre, food, makeItem, shell, type Item } from '../src/logic/items';
import { fed, LINE, lineOf } from '../src/logic/line';
import { missionGoal, missionLine, missionTag, PLAIN, tasksDone, type Mission } from '../src/logic/mission';
import { shellOf, type ShellKind } from '../src/logic/shells';
import { Beach, IDLE, type BeachSetup, type Input, type SimEvent } from '../src/logic/sim';
import { movementOf, SPECIES } from '../src/logic/species';

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
    startGrowth: { size: 2, meter: 0, bank: 0 }, goal: 5, ...over,
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
    for (const def of LEVELS) {
      const m = missionOf(def);
      expect(missionTag(m).length, def.id).toBeGreaterThan(0);
      expect(missionGoal(m, levelGoal(def)), def.id).toContain(`size ${levelGoal(def)}`);
      expect(parTimeOf(def)).toBeGreaterThanOrEqual(def.parTime);
    }
  });

  it('puts a price only on creatures that walk and can be walked down and eaten', () => {
    for (const def of LEVELS) {
      const s = quarrySpecies(def);
      expect(['walk', 'climb']).toContain(movementOf(s));
      expect(SPECIES[s].lowTide ?? false).toBe(false);
    }
  });
});

describe('every mission level', () => {
  for (const [b, beachLevels] of BEACHES.entries()) {
    for (const def of beachLevels) {
      const m = missionOf(def);
      if (m.kinds.includes('grow')) continue;
      it(`${b * 10 + beachLevels.indexOf(def) + 1} ${def.id} lays out its ${missionTag(m)}`, () => {
        const setup = buildLevel(def);
        const sim = new Beach(setup);
        expect(setup.items.filter((i) => i.kind.type === 'bottle' && i.buried)).toHaveLength(m.bottles);
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
    for (const def of LEVELS) {
      const m = missionOf(def);
      if (m.chain) expect(m.chain).toBe(levelGoal(def) - 2);
    }
  });
});

describe('ink bottles', () => {
  const bottle = (id: number, col: number): Item => {
    const proto = makeItem(id, BOTTLE, 0, 0, false);
    return { ...proto, x: col * T, y: GROUND * T - proto.h };
  };

  it('are picked up by walking over them, and the level is won only with all of them and grown', () => {
    const m: Mission = { ...PLAIN, kinds: ['collect'], bottles: 2 };
    const b = beach({ mission: m, items: [bottle(1, 12), bottle(2, 40)], startGrowth: { size: 5, meter: 0, bank: 0 } });
    const first = run(b, 1, { moveX: 1 });
    expect(first.filter((e) => e.type === 'collected')).toHaveLength(1);
    expect(b.outcome).toBe('playing');
    const rest = run(b, 8, { moveX: 1 });
    expect(rest.some((e) => e.type === 'collected')).toBe(true);
    expect(b.bottles).toBe(2);
    expect(b.outcome).toBe('won');
  });

  it('show on the HUD, then point back at the growth bar once all are found', () => {
    const m: Mission = { ...PLAIN, kinds: ['collect'], bottles: 3 };
    expect(missionLine(m, { grown: false, bottles: 1, marked: 0, giant: false })).toBe('ink bottles 1/3');
    expect(missionLine(m, { grown: false, bottles: 3, marked: 0, giant: false })).toContain('grow');
  });
});

describe('marked hunters and the giant', () => {
  it('count when eaten, and the level waits for them', () => {
    const m: Mission = { ...PLAIN, kinds: ['bounty'], marked: { species: 'ghostcrab', size: 2, count: 1 } };
    const b = beach({ mission: m, startGrowth: { size: 5, meter: 0, bank: 0 } });
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
    const def = BEACHES[0]![3]!;
    const sim = new Beach(buildLevel(def));
    const marked = [...sim.critters.values()].filter((k) => k.marked === 'bounty');
    expect(marked).toHaveLength(3);
    for (const k of marked) expect(k.size).toBe(levelGoal(def) - 2);
    const finale = BEACHES[0]![9]!;
    const giant = [...new Beach(buildLevel(finale)).critters.values()].filter((k) => k.marked === 'giant');
    expect(giant).toHaveLength(1);
    expect(giant[0]!.size).toBe(levelGoal(finale) - 1);
  });

  it('a giant is the last task: grown up, the level still waits for it', () => {
    const m: Mission = { ...PLAIN, kinds: ['giant'], giant: { species: 'ghostcrab', size: 4, count: 1 } };
    expect(tasksDone(m, { grown: true, bottles: 0, marked: 0, giant: false })).toBe(false);
    expect(missionLine(m, { grown: true, bottles: 0, marked: 0, giant: false })).toBe('now eat the giant ghost crab!');
  });
});

describe('one life', () => {
  it('ends the level at the first catch', () => {
    const def = BEACHES[0]![6]!;
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
    const b = beach({ mission: CHAIN, startShell: shellOf('snail', 3), startGrowth: { size: 3, meter: 0, bank: 0 }, recruits: [['periwinkle', 2, 13, 1], recruit(14)] });
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

  it('sends a hungry follower for food nearby, and it eats it', () => {
    const crumb = (id: number, col: number): Item => {
      const proto = makeItem(id, food('hopper'), 0, 0, false);
      return { ...proto, x: col * T, y: GROUND * T - proto.h };
    };
    const b = beach({ mission: CHAIN, recruits: [['periwinkle', 2, 12, 1]], items: [crumb(60, 7)] });
    run(b, 6);
    expect(b.items.has(60)).toBe(false);
    expect((followers(b)[0]!.meter ?? 0) + (followers(b)[0]!.size - 1) * LINE.meal).toBeGreaterThan(1);
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

  it('shows on the HUD how the line stands', () => {
    const p = { grown: false, bottles: 0, marked: 0, giant: false };
    expect(missionLine(CHAIN, p, { line: 0, needed: 1, wait: 'recruit' })).toContain('find one more small crab');
    expect(missionLine(CHAIN, p, { line: 2, needed: 2, wait: 'growing' })).toContain('grow');
    expect(missionLine(CHAIN, p, { line: 2, needed: 2, wait: null })).toContain('ready');
  });

  it('works through the first chain level: the first recruit lets the crab into the size-3 shell', () => {
    const def = BEACHES[0]![4]!;
    const setup = buildLevel(def);
    const m = missionOf(def);
    expect(m.chain).toBe(levelGoal(def) - 2);
    const recruits = setup.recruits ?? [];
    // Each before its shell: the first short of the size-3 snail.
    const snail = def.shells.find(([, size]) => size === 3)![2];
    expect(recruits[0]![2]).toBeLessThan(snail);
  });
});
