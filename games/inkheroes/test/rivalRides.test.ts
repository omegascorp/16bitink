import { describe, expect, it } from 'vitest';
import { OTHRYS } from '../src/level/borderMarch';
import { startAdventure, type Adventure } from '../src/logic/adventure';
import { intentAt, rivalHeroAt } from '../src/logic/mapIntent';
import { splitRides } from '../src/scenes/map/rivalRides';

const h = (id: string, x: number, y: number) => ({ id, x, y });

describe('the night’s rides, hero by hero', () => {
  it('splits the rival’s one path where it jumps, each run to the hero it starts beside', () => {
    const path = [{ x: 11, y: 10 }, { x: 12, y: 10 }, { x: 31, y: 20 }, { x: 32, y: 21 }];
    const rides = splitRides(path, [h('lykaon', 30, 20), h('runner', 10, 10)], [h('lykaon', 32, 21), h('runner', 12, 10)]);
    expect(rides).toEqual([
      { id: 'runner', tiles: [{ x: 11, y: 10 }, { x: 12, y: 10 }] },
      { id: 'lykaon', tiles: [{ x: 31, y: 20 }, { x: 32, y: 21 }] },
    ]);
  });

  it('keeps a hero’s legs together, a stop at a site included', () => {
    const path = [{ x: 1, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
    expect(splitRides(path, [h('lykaon', 0, 0)], [h('lykaon', 2, 0)])).toEqual([{ id: 'lykaon', tiles: path }]);
  });

  it('gives a ride to a hero hired tonight by where it ends', () => {
    const path = [{ x: 51, y: 50 }, { x: 52, y: 50 }];
    expect(splitRides(path, [h('lykaon', 0, 0)], [h('lykaon', 0, 0), h('new', 52, 50)])).toEqual([{ id: 'new', tiles: path }]);
  });
});

describe('a second rival hero on the map', () => {
  function withTwo(): { adv: Adventure; x: number; y: number } {
    const adv = startAdventure(OTHRYS);
    const lord = adv.rival!.hero!;
    const x = adv.hero.x;
    const y = adv.hero.y + 1;
    const runner = { ...lord, id: 'runner', name: 'Pallas', x, y };
    return { adv: { ...adv, prompts: [], explored: '1'.repeat(adv.explored.length), rival: { ...adv.rival!, others: [runner] } }, x, y };
  }

  it('is the one a tap on his tile fights, and is named there', () => {
    const { adv, x, y } = withTwo();
    expect(intentAt(adv, OTHRYS, x, y)).toBe('attack');
    expect(rivalHeroAt(adv, x, y)?.name).toBe('Pallas');
    expect(rivalHeroAt(adv, x + 1, y)).toBeUndefined();
  });

  it('is nothing to tap while the fog hides him', () => {
    const { adv, x, y } = withTwo();
    expect(intentAt({ ...adv, explored: '0'.repeat(adv.explored.length) }, OTHRYS, x, y)).toBeNull();
  });
});
