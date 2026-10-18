import { describe, expect, it } from 'vitest';
import type { Creature } from '../src/logic/creatures';
import { Ladders } from '../src/logic/ladders';
import type { Mine } from '../src/logic/mine';
import { ROCK, Rocks, rubbleOf, settleRocks } from '../src/logic/rocks';
import { setTile, TILE, tileAt, type Terrain, type TilePos } from '../src/logic/terrain';
import { applyWorld, captureWorld } from '../src/logic/worldSave';
import { grid, mine, run as play, standAt, T } from './helpers';

/** The ground as rows: `o` loose rock, `.` open, `#` anything else solid. */
function picture(t: Terrain): string[] {
  return Array.from({ length: t.height }, (_, y) =>
    Array.from({ length: t.width }, (_, x) => {
      const tile = t.tiles[y * t.width + x];
      return tile === TILE.loose ? 'o' : tile === TILE.air ? '.' : '#';
    }).join(''));
}

function dig(t: Terrain, rocks: Rocks, ...tiles: TilePos[]): void {
  for (const [x, y] of tiles) setTile(t, x, y, TILE.air);
  rocks.opened(tiles);
}

/** Steps the rocks at 60 fps for `seconds`; returns every tile landed in. */
function run(rocks: Rocks, seconds: number): TilePos[] {
  const landed: TilePos[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) landed.push(...rocks.step(1 / 60).landed);
  return landed;
}

describe('loose rock', () => {
  it('stays put while something is under it', () => {
    const t = grid(['.o.', '.s.', '.s.', '###']);
    const rocks = new Rocks(t, T);
    dig(t, rocks, [0, 1]);
    run(rocks, 2);
    expect(picture(t)).toEqual(['.o.', '.#.', '.#.', '###']);
  });

  it('shakes before it drops, so there is time to get out from under it', () => {
    const t = grid(['.o.', '.s.', '...', '###']);
    const rocks = new Rocks(t, T);
    dig(t, rocks, [1, 1]);
    expect(rocks.step(1 / 60).shook).toEqual([[1, 0]]);
    run(rocks, ROCK.shake - 0.1);
    expect(picture(t)[0]).toBe('.o.');
    expect(rocks.falling).toHaveLength(0);
    run(rocks, 0.2);
    expect(picture(t)[0]).toBe('...');
    expect(rocks.falling).toHaveLength(1);
  });

  it('falls until it lands, and stays loose where it lands', () => {
    const t = grid(['.o.', '.s.', '...', '...', '...', '###']);
    const rocks = new Rocks(t, T);
    dig(t, rocks, [1, 1]);
    const landed = run(rocks, 2);
    expect(landed).toEqual([[1, 4]]);
    expect(picture(t)).toEqual(['...', '...', '...', '...', '.o.', '###']);
    expect(rocks.moving).toBe(false);
  });

  it('brings down a whole column stacked on it, and it lands in order', () => {
    const t = grid(['.o.', '.o.', '.o.', '.s.', '...', '...', '###']);
    const rocks = new Rocks(t, T);
    dig(t, rocks, [1, 3]);
    run(rocks, 3);
    expect(picture(t)).toEqual(['...', '...', '...', '.o.', '.o.', '.o.', '###']);
  });

  it('starts the rock above shaking again if one lands, then is dug out from under once more', () => {
    const t = grid(['.o.', '.s.', '.s.', '...', '###']);
    const rocks = new Rocks(t, T);
    dig(t, rocks, [1, 1]);
    run(rocks, 2);
    // Landed on the soil at row 2.
    expect(picture(t)[1]).toBe('.o.');
    dig(t, rocks, [1, 2]);
    run(rocks, 2);
    expect(picture(t)).toEqual(['...', '...', '...', '.o.', '###']);
  });

  it('can be shattered in the air, and is gone', () => {
    const t = grid(['.o.', '.s.', '...', '...', '###']);
    const rocks = new Rocks(t, T);
    dig(t, rocks, [1, 1]);
    run(rocks, ROCK.shake + 0.05);
    rocks.shatter(rocks.falling[0]!);
    run(rocks, 2);
    expect(picture(t)).toEqual(['...', '...', '...', '...', '###']);
  });

  it('falls round the join on a wrapping world', () => {
    const t = grid(['o..', 's..', '...', '###'], true);
    const rocks = new Rocks(t, T);
    dig(t, rocks, [3, 1]);
    run(rocks, 2);
    expect(picture(t)).toEqual(['...', '...', 'o..', '###']);
  });
});

describe('settling the ground as carved', () => {
  it('drops every loose rock with nothing under it straight to rest, columns in order', () => {
    const t = grid(['o.o', 'o..', '...', '..s', '###']);
    settleRocks(t);
    expect(picture(t)).toEqual(['...', '...', 'o.o', 'o.#', '###']);
  });

  it('records where loose rock lies, for the save', () => {
    const t = grid(['o.', '#o']);
    expect([...rubbleOf(t)]).toEqual([1, 0, 0, 1]);
  });
});

describe('falling rock in play', () => {
  /** Open ground, a loose rock on a soil pillar over column 4, a floor at row 4. */
  const PILLAR = ['....o.....', '....s.....', '..........', '..........', 'ssssssssss', '##########'];

  /** Knocks the pillar out from under the rock, as a drill would. */
  function knockOut(m: Mine): void {
    setTile(m.terrain, 4, 1, TILE.air);
    m.rocks.opened([[4, 1]]);
  }

  it('breaks on the prospector standing under it, costing the shield', () => {
    const m = mine(PILLAR, { lander: { col: 8, row: 4 } });
    standAt(m, 4, 4);
    knockOut(m);
    const events = play(m, 1.2);
    expect(events).toContainEqual(expect.objectContaining({ kind: 'rock', now: 'hit' }));
    expect(events).toContainEqual({ kind: 'shielded' });
    expect(m.terrain.tiles.includes(TILE.loose)).toBe(false);
  });

  it('misses a prospector who steps out from under it while it shakes, and lands', () => {
    const m = mine(PILLAR, { lander: { col: 8, row: 4 } });
    standAt(m, 4, 4);
    knockOut(m);
    const events = play(m, 1.2, { ix: -1 });
    expect(events.some((e) => e.kind === 'rock' && e.now === 'hit')).toBe(false);
    expect(events.some((e) => e.kind === 'hurt' || e.kind === 'shielded')).toBe(false);
    expect(tileAt(m.terrain, 4, 3)).toBe(TILE.loose);
  });

  it('never hurts the prospector riding it down', () => {
    const m = mine(['..........', '..........', 'ssssosssss', 'ssssssssss', 'ssss.sssss', 'ssss.sssss', 'ssssssssss', '##########'], { lander: { col: 8, row: 2 } });
    standAt(m, 4, 2);
    setTile(m.terrain, 4, 3, TILE.air);
    m.rocks.opened([[4, 3]]);
    const events = play(m, 2);
    expect(events.some((e) => e.kind === 'hurt' || e.kind === 'shielded' || (e.kind === 'rock' && e.now === 'hit'))).toBe(false);
    expect(tileAt(m.terrain, 4, 5)).toBe(TILE.loose);
  });

  it('crushes a creature it comes down on', () => {
    const crab: Creature = { id: 1, kind: 'crab', x: 4.5 * T, y: 4 * T, hp: 1, state: 'idle', timer: 0, facing: 1, reach: 0 };
    const m = mine(PILLAR, { lander: { col: 9, row: 4 }, creatures: [crab] });
    standAt(m, 8, 4);
    knockOut(m);
    play(m, 1.2);
    expect(m.fauna.creatures[0]!.state).toBe('dead');
  });
});

describe('saving fallen rock', () => {
  it('keeps where rocks fell, and the ground dug under them stays dug', () => {
    const carved = (): Terrain => grid(['.o.', '.s.', '.c.', '...', '###']);
    const t = carved();
    const base = t.tiles.slice();
    const rocks = new Rocks(t, T);
    // Dig out the soil and the copper under it: the rock drops to the floor.
    dig(t, rocks, [1, 1], [1, 2]);
    run(rocks, 2);
    const save = captureWorld(base, t, new Ladders(t), 1, [], null, [], undefined, rubbleOf(t));
    const again = carved();
    applyWorld(again, new Ladders(again), save);
    expect(picture(again)).toEqual(picture(t));
    expect(again.content.some((c) => c !== 0)).toBe(false);
  });

  it("doesn't put back rock (or its ore) a fallen rock now lies in", () => {
    const carved = (): Terrain => grid(['.o.', '.s.', '.c.', '.s.', '###']);
    const t = carved();
    const base = t.tiles.slice();
    const rocks = new Rocks(t, T);
    dig(t, rocks, [1, 1], [1, 2]);
    run(rocks, 2);
    // The rock lies where the copper was.
    expect(picture(t)[2]).toBe('.o.');
    const save = captureWorld(base, t, new Ladders(t), 1, [], null, [], undefined, rubbleOf(t));
    const again = carved();
    applyWorld(again, new Ladders(again), save);
    expect(picture(again)).toEqual(picture(t));
    expect(again.content[2 * 3 + 1]).toBe(0);
  });
});
