import { describe, expect, it } from 'vitest';
import { shellOf } from '../src/logic/shells';
import { Coach, ledgeAhead, nextShell, tallBankAhead } from '../src/logic/coach';
import { makeCritter } from '../src/logic/critters';
import { digColumns } from '../src/logic/dig';
import { meterGoal } from '../src/logic/growth';
import { findItem, makeItem, shell } from '../src/logic/items';
import { Beach, IDLE, type Input, type SimEvent } from '../src/logic/sim';
import { createTerrain, setTile, TILE, type Terrain } from '../src/logic/terrain';

const T = 16;

/** A flat beach (surface at row 10), the crab at column 5; `bank` raises columns [from, to] to `top`. */
function beach(items = [] as ReturnType<typeof makeItem>[], bank?: { from: number; to: number; top: number }): Beach {
  const terrain: Terrain = createTerrain(60, 30);
  for (let x = 0; x < 60; x++) for (let y = 10; y < 30; y++) setTile(terrain, x, y, TILE.sand);
  if (bank) for (let x = bank.from; x <= bank.to; x++) for (let y = bank.top; y < 10; y++) setTile(terrain, x, y, TILE.sand);
  return new Beach({ terrain, items, start: { x: 5 * T, y: 10 * T }, tileSize: T, startShell: shellOf('periwinkle'), seed: 1, surfaceFood: 0 });
}

/** Steps the beach and lets the coach watch. */
const play = (b: Beach, coach: Coach, input: Partial<Input> = {}, seconds = 1 / 60): SimEvent[] => {
  const all: SimEvent[] = [];
  for (let i = 0; i < Math.max(1, Math.round(seconds * 60)); i++) {
    const events = b.step({ ...IDLE, ...input }, 1 / 60);
    coach.observe(b, events);
    all.push(...events);
  }
  return all;
};

describe('the coach', () => {
  it('teaches only the lessons the level lists', () => {
    const b = beach();
    play(b, new Coach([]), {}, 1);
    expect(new Coach([]).hint(b, 'keys')).toBeNull();
    expect(new Coach(['move']).hint(b, 'keys')?.lesson).toBe('move');
  });

  it('teaches digging when something buried is near, pointing at it, until the first dig', () => {
    const cowrie = makeItem(7, findItem('cowrie'), 9 * T, 12 * T, true);
    const b = beach([cowrie]);
    const coach = new Coach(['dig']);
    play(b, coach, {}, 1);
    const h = coach.hint(b, 'keys');
    expect(h?.lesson).toBe('dig');
    expect(h?.text).toMatch(/buried/i);
    expect(h?.target?.x).toBeCloseTo(cowrie.x + cowrie.w / 2);
    play(b, coach, { aimY: 1, dig: true });
    expect(coach.learnt('dig')).toBe(true);
    expect(coach.hint(b, 'keys')).toBeNull();
  });

  it('with nothing buried near, waits a while before teaching digging', () => {
    const b = beach();
    const coach = new Coach(['dig']);
    play(b, coach, {}, 1);
    expect(coach.hint(b, 'keys')).toBeNull();
    play(b, coach, {}, 20);
    expect(coach.hint(b, 'keys')?.lesson).toBe('dig');
  });

  it('teaches building a step only carrying sand at a bank too high to jump, until a step is built', () => {
    const b = beach([], { from: 8, to: 20, top: 7 });
    const coach = new Coach(['drop']);
    play(b, coach, {}, 1);
    b.crab = { ...b.crab, sand: 3 };
    play(b, coach, {}, 0.1);
    const h = coach.hint(b, 'keys');
    expect(h?.lesson).toBe('drop');
    expect(h?.target?.x).toBeCloseTo(8.5 * T);
    expect(h?.text).toMatch(/↑ \+ C/);
    expect(coach.hint(b, 'touch')?.text).toMatch(/stick up/);
    // Away from the bank, or with no sand, it says nothing.
    expect(tallBankAhead(b, -1)).toBeNull();
    b.crab = { ...b.crab, sand: 0 };
    expect(coach.hint(b, 'keys')).toBeNull();
    b.crab = { ...b.crab, sand: 3 };
    play(b, coach, { place: true, aimY: -1 });
    expect(coach.learnt('drop')).toBe(true);
  });

  it('a bank the crab can jump onto is no reason to build', () => {
    const b = beach([], { from: 8, to: 20, top: 8 });
    const coach = new Coach(['drop']);
    play(b, coach, {}, 1);
    b.crab = { ...b.crab, sand: 3 };
    expect(coach.hint(b, 'keys')).toBeNull();
  });

  it('says to drop sand once the crab is full of it, on any level, until it has dropped some', () => {
    const b = beach();
    const coach = new Coach([]);
    play(b, coach, {}, 1);
    b.crab = { ...b.crab, sand: b.sandCapacity };
    expect(coach.hint(b, 'keys')?.text).toMatch(/full of sand/i);
    expect(coach.hint(b, 'touch')?.text).toMatch(/dig/i);
    play(b, coach, { place: true }, 1);
    b.crab = { ...b.crab, sand: b.sandCapacity };
    expect(coach.hint(b, 'keys')).toBeNull();
  });

  it('points at a bigger shell once the shell is full, until the crab moves in', () => {
    const snail = makeItem(9, shell('snail'), 20 * T, 10 * T - 10, false);
    const b = beach([snail]);
    const coach = new Coach(['swap']);
    play(b, coach, {}, 1);
    expect(coach.hint(b, 'keys')).toBeNull();
    b.crab = { ...b.crab, growth: { size: 2, meter: meterGoal(2) } };
    const h = coach.hint(b, 'keys');
    expect(h?.lesson).toBe('swap');
    expect(h?.target?.x).toBeCloseTo(snail.x + snail.w / 2);
  });

  it('says hide when a bigger ghost crab comes near, and stops once the crab has hidden from one', () => {
    const b = beach();
    const coach = new Coach(['hide']);
    play(b, coach, {}, 1);
    expect(coach.hint(b, 'keys')).toBeNull();
    b.critters.set(50, makeCritter(50, 4, b.crab.body.x + 60, 10 * T, -1, 10));
    expect(coach.hint(b, 'keys')?.lesson).toBe('hide');
    play(b, coach, { hide: true });
    expect(coach.learnt('hide')).toBe(true);
  });

  it('points at a buried shell until it is uncovered', () => {
    const b = beach();
    const coach = new Coach(['buried']);
    play(b, coach, {}, 1);
    // Two tiles under the column the crab digs.
    const col = digColumns(b.crab.body, T).x0;
    const proto = makeItem(9, shell('snail'), 0, 0, true);
    const buried = { ...proto, x: col * T + T / 2 - proto.w / 2, y: 12 * T + T / 2 - proto.h / 2 };
    b.items.set(9, buried);
    expect(coach.hint(b, 'keys')?.target?.y).toBeCloseTo(buried.y + buried.h / 2);
    for (let i = 0; i < 6 && !coach.learnt('buried'); i++) {
      play(b, coach, { aimY: 1, dig: true }, 0.3);
      play(b, coach, {}, 0.4);
    }
    expect(coach.learnt('buried')).toBe(true);
  });

  it('points at a far-off buried shell once it is the next one needed', () => {
    const b = beach();
    const coach = new Coach(['buried']);
    play(b, coach, {}, 1);
    b.items.set(9, makeItem(9, shell('topshell'), 50 * T, 15 * T, true));
    expect(coach.hint(b, 'keys')).toBeNull();
    b.crab = { ...b.crab, growth: { size: 2, meter: meterGoal(2) } };
    expect(coach.hint(b, 'keys')?.lesson).toBe('buried');
  });

  it('teaches digging at an angle, not straight down', () => {
    const b = beach();
    const coach = new Coach(['dig']);
    play(b, coach, {}, 21);
    const dig = coach.hint(b, 'keys')!.text;
    expect(dig).toMatch(/→/);
    expect(dig).toMatch(/↓/);
    expect(dig).toMatch(/straight down/i);
  });

  it('shows a way out when the crab is stuck down a hole, on any level', () => {
    const b = beach();
    const coach = new Coach([]);
    play(b, coach, {}, 1);
    expect(coach.hint(b, 'keys')).toBeNull();
    // Dig a shaft four deep, straight down.
    for (let i = 0; i < 4; i++) {
      play(b, coach, { aimY: 1, dig: true });
      play(b, coach, {}, 0.5);
    }
    const h = coach.hint(b, 'keys');
    expect(h?.lesson).toBe('stuck');
    expect(h?.text).toMatch(/↑/);
    // Climbing out (here: set down on open sand away from the hole) ends it.
    b.crab = { ...b.crab, body: { ...b.crab.body, x: 30 * T, y: 10 * T - b.crab.body.h, vy: 0 } };
    play(b, coach, {}, 0.2);
    expect(coach.hint(b, 'keys')).toBeNull();
  });

  it('words hints for touch screens', () => {
    const b = beach();
    const coach = new Coach(['dig']);
    play(b, coach, {}, 21);
    expect(coach.hint(b, 'touch')?.text).toMatch(/hold dig/);
  });

  it('points up at the next shell when it lies out of jumping reach, until the crab moves into it', () => {
    const snail = makeItem(9, shell('snail'), 14 * T, 6 * T - 10, false);
    const b = beach([snail], { from: 8, to: 20, top: 6 });
    const coach = new Coach(['reach', 'swap']);
    play(b, coach, {}, 1);
    expect(coach.hint(b, 'keys')).toBeNull();
    b.crab = { ...b.crab, growth: { size: 2, meter: meterGoal(2) } };
    play(b, coach, {}, 0.1);
    const h = coach.hint(b, 'keys');
    expect(h?.lesson).toBe('reach');
    expect(h?.target?.x).toBeCloseTo(snail.x + snail.w / 2);
    expect(h?.text).toMatch(/too high/);
    expect(coach.hint(b, 'touch')?.text).toMatch(/stick up/);
    coach.observe(b, [{ type: 'swapDone', from: b.crab.shell, to: shellOf('snail'), dropped: null }]);
    expect(coach.learnt('reach')).toBe(true);
  });

  it('says nothing about reaching a shell lying within a jump', () => {
    const snail = makeItem(9, shell('snail'), 14 * T, 8 * T - 10, false);
    const b = beach([snail], { from: 8, to: 20, top: 8 });
    const coach = new Coach(['reach']);
    play(b, coach, {}, 1);
    b.crab = { ...b.crab, growth: { size: 2, meter: meterGoal(2) } };
    play(b, coach, {}, 0.1);
    expect(coach.hint(b, 'keys')).toBeNull();
  });
});

describe('the harbour lessons', () => {
  /** A flat beach, the crab at column 5, with rain and decks as asked. */
  function harbour(over: Partial<ConstructorParameters<typeof Beach>[0]> = {}): Beach {
    const terrain: Terrain = createTerrain(60, 30);
    for (let x = 0; x < 60; x++) for (let y = 10; y < 30; y++) setTile(terrain, x, y, TILE.sand);
    const decks = (over.decks ?? []).map((d) => {
      for (let x = d.col; x < d.col + d.width; x++) setTile(terrain, x, d.row, TILE.wood);
      return d;
    });
    return new Beach({ terrain, items: [], start: { x: 5 * T, y: 10 * T }, tileSize: T, startShell: shellOf('periwinkle'), seed: 1, surfaceFood: 0, ...over, decks });
  }

  it('speaks up as the first squall comes, and is learnt once the downpour has passed', () => {
    const b = harbour({ rain: { period: 20, pour: 6 } });
    const coach = new Coach(['rain']);
    play(b, coach, {}, 5);
    expect(coach.hint(b, 'keys')).toBeNull();
    play(b, coach, {}, 9);
    expect(coach.hint(b, 'keys')?.lesson).toBe('rain');
    play(b, coach, {}, 7);
    expect(coach.learnt('rain')).toBe(true);
    expect(coach.hint(b, 'keys')).toBeNull();
  });

  it('points at a boat nearby until the crab has sheltered under it', () => {
    const b = harbour({ decks: [{ col: 10, width: 6, row: 7, kind: 'boat' }] });
    const coach = new Coach(['deck']);
    play(b, coach, {}, 0.5);
    const hint = coach.hint(b, 'keys');
    expect(hint?.lesson).toBe('deck');
    expect(hint?.target).toEqual({ x: 13 * T, y: 7 * T });
    play(b, coach, { moveX: 1 }, 2);
    expect(b.underDeck(b.crab.body)).toBe(true);
    expect(coach.learnt('deck')).toBe(true);
  });

  it('warns about a bigger monitor close by, and is learnt once the crab hides from it', () => {
    const b = harbour();
    const coach = new Coach(['monitor']);
    const k = makeCritter(900, 6, 9 * T, 10 * T, -1, 99, 'monitor');
    b.critters.set(k.id, k);
    play(b, coach);
    expect(coach.hint(b, 'keys')?.lesson).toBe('monitor');
    play(b, coach, { hide: true });
    expect(coach.learnt('monitor')).toBe(true);
  });
});

describe('the jump lesson', () => {
  /** A bank two tiles high from column 10 on: too high to walk up, low enough to jump. */
  const banked = (): Beach => {
    const b = beach();
    for (let x = 10; x < 60; x++) for (let y = 8; y < 10; y++) setTile(b.terrain, x, y, TILE.sand);
    return b;
  };

  it('speaks up when the crab pushes into a bank it could jump, pointing at its top', () => {
    const b = banked();
    const coach = new Coach(['jump']);
    play(b, coach, { moveX: 1 }, 2);
    const hint = coach.hint(b, 'keys');
    expect(hint?.lesson).toBe('jump');
    expect(hint?.text).toContain('Space');
    expect(hint?.target).toEqual({ x: 10.5 * T, y: 8 * T });
    expect(coach.hint(b, 'touch')?.text).toContain('jump');
  });

  it('is quiet when the crab isn\'t pushing into the bank', () => {
    const b = banked();
    const coach = new Coach(['jump']);
    play(b, coach, { moveX: 1 }, 2);
    play(b, coach, {}, 0.2);
    expect(coach.hint(b, 'keys')).toBeNull();
  });

  it('is learnt by jumping', () => {
    const b = banked();
    const coach = new Coach(['jump']);
    play(b, coach, { moveX: 1 }, 2);
    const events = play(b, coach, { moveX: 1, jump: true });
    expect(events.some((e) => e.type === 'jumped')).toBe(true);
    play(b, coach, { moveX: -1 }, 0.5);
    play(b, coach, { moveX: 1 }, 2);
    expect(coach.hint(b, 'keys')).toBeNull();
  });

  it('jumping clears the bank', () => {
    const b = banked();
    const coach = new Coach(['jump']);
    play(b, coach, { moveX: 1 }, 2);
    play(b, coach, { moveX: 1, jump: true });
    play(b, coach, { moveX: 1 }, 1);
    expect(b.crab.body.x).toBeGreaterThan(11 * T);
    expect(ledgeAhead(b, 1)).toBeNull();
  });
});

describe('nextShell', () => {
  it('is the nearest shell that fits once the crab is full, lying in the open before a buried one', () => {
    const near = makeItem(1, shell('snail'), 9 * T, 12 * T, true);
    const far = makeItem(2, shell('snail'), 30 * T, 10 * T - 10, false);
    const tooBig = makeItem(3, shell('nerite'), 7 * T, 10 * T - 10, false);
    const b = beach([near, far, tooBig]);
    b.crab = { ...b.crab, growth: { size: 2, meter: meterGoal(2) } };
    expect(nextShell(b)?.id).toBe(2);
  });

  it('falls back to a buried shell, and is null with none that fits', () => {
    const grown = (b: Beach): Beach => {
      b.crab = { ...b.crab, growth: { size: 2, meter: meterGoal(2) } };
      return b;
    };
    expect(nextShell(grown(beach([makeItem(1, shell('snail'), 9 * T, 12 * T, true)])))?.id).toBe(1);
    expect(nextShell(grown(beach([])))).toBeNull();
  });
});
