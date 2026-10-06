import { describe, expect, it } from 'vitest';
import { Coach } from '../src/logic/coach';
import { makeCritter } from '../src/logic/critters';
import { digColumns } from '../src/logic/dig';
import { meterGoal } from '../src/logic/growth';
import { makeItem, shell } from '../src/logic/items';
import { Beach, IDLE, type Input, type SimEvent } from '../src/logic/sim';
import { createTerrain, setTile, TILE, type Terrain } from '../src/logic/terrain';

const T = 16;

function beach(items = [] as ReturnType<typeof makeItem>[]): Beach {
  const terrain: Terrain = createTerrain(60, 30);
  for (let x = 0; x < 60; x++) for (let y = 10; y < 30; y++) setTile(terrain, x, y, TILE.sand);
  return new Beach({ terrain, items, start: { x: 5 * T, y: 10 * T }, tileSize: T, startShell: 'periwinkle', seed: 1, surfaceFood: 0 });
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

  it('shows the dig lesson until the first dig, then the drop lesson until sand is dropped', () => {
    const b = beach();
    const coach = new Coach(['dig', 'drop']);
    play(b, coach, {}, 1);
    expect(coach.hint(b, 'keys')?.lesson).toBe('dig');
    play(b, coach, { aimY: 1, dig: true });
    expect(coach.learnt('dig')).toBe(true);
    expect(coach.hint(b, 'keys')?.lesson).toBe('drop');
    play(b, coach, {}, 0.5);
    play(b, coach, { place: true });
    expect(coach.learnt('drop')).toBe(true);
    expect(coach.hint(b, 'keys')).toBeNull();
  });

  it('points at a bigger shell once the shell is full, until the crab moves in', () => {
    const snail = makeItem(9, shell('snail'), 20 * T, 10 * T - 10, false);
    const b = beach([snail]);
    const coach = new Coach(['swap']);
    play(b, coach, {}, 1);
    expect(coach.hint(b, 'keys')).toBeNull();
    b.crab = { ...b.crab, growth: { size: 2, meter: meterGoal(2), bank: 0 } };
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
    b.items.set(9, makeItem(9, shell('can'), 50 * T, 15 * T, true));
    expect(coach.hint(b, 'keys')).toBeNull();
    b.crab = { ...b.crab, growth: { size: 2, meter: meterGoal(2), bank: 0 } };
    expect(coach.hint(b, 'keys')?.lesson).toBe('buried');
  });

  it('teaches digging at an angle, not straight down', () => {
    const b = beach();
    const dig = new Coach(['dig']).hint(b, 'keys')!.text;
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
    expect(new Coach(['dig']).hint(b, 'touch')?.text).toMatch(/Tap/);
  });
});
