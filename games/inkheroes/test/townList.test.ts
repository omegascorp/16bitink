import { describe, expect, it } from 'vitest';
import { townListKey } from '../src/scenes/hud/townListData';
import { shrinkSmooth } from '../src/scenes/town/townPictures';
import type { Town } from '../src/logic/town';
import { dailyMp, type Hero } from '../src/logic/hero';
import { heroListKey, heroListOrder, travelLeft } from '../src/scenes/hud/heroListData';

const town = (id: string, built: Town['built']): Town => ({ id, name: id, owner: 'player', x: 0, y: 0, built, builtToday: false, stock: {}, garrison: [], guild: [] });

describe('shrinkSmooth', () => {
  const pixels = (rgba: readonly number[], w: number, h: number) => ({ data: new Uint8ClampedArray(rgba), w, h });

  it('averages each block', () => {
    const out = shrinkSmooth(pixels([0, 0, 0, 255, 100, 200, 40, 255, 0, 0, 0, 255, 100, 200, 40, 255], 2, 2), 2);
    expect([out.w, out.h]).toEqual([1, 1]);
    expect([...out.data]).toEqual([50, 100, 20, 255]);
  });

  it('lets no colour in from clear pixels', () => {
    const out = shrinkSmooth(pixels([200, 100, 50, 255, 255, 255, 255, 0, 200, 100, 50, 255, 255, 255, 255, 0], 2, 2), 2);
    expect([...out.data]).toEqual([200, 100, 50, 128]);
  });

  it('leaves a clear block clear', () => {
    expect([...shrinkSmooth(pixels(new Array<number>(16).fill(0), 2, 2), 2).data]).toEqual([0, 0, 0, 0]);
  });
});

describe('townListKey', () => {
  it('changes when a town is won or built up, not otherwise', () => {
    const one = [town('a', ['fort'])];
    expect(townListKey(one)).toBe(townListKey([{ ...one[0]!, stock: { spearman: 3 } }]));
    expect(townListKey(one)).not.toBe(townListKey([...one, town('b', [])]));
    expect(townListKey(one)).not.toBe(townListKey([town('a', ['fort', 'tavern'])]));
  });

  it('changes when another town is the one open', () => {
    const two = [town('a', []), town('b', [])];
    expect(townListKey(two, 'a')).not.toBe(townListKey(two, 'b'));
  });
});

describe('the hero list', () => {
  const hero = (id: string, mp: number): Hero => ({ id, name: id, heroClass: 'knight', x: 0, y: 0, attack: 0, defense: 0, power: 0, knowledge: 0, mana: 0, xp: 0, level: 1, skills: {}, spells: [], army: [{ creature: 'spearman', count: 1 }], mp, visited: [] });

  it('keeps the order heroes were hired in, whichever is picked', () => {
    const order = ['rowan', 'ianthe'];
    expect(heroListOrder([hero('ianthe', 0), hero('rowan', 0)], order).map((h) => h.id)).toEqual(['rowan', 'ianthe']);
    expect(heroListOrder([hero('stranger', 0), hero('rowan', 0)], order).map((h) => h.id)).toEqual(['rowan', 'stranger']);
  });

  it('redraws when another is picked or travel is used, not otherwise', () => {
    const two = [hero('rowan', 1500), hero('ianthe', 1500)];
    expect(heroListKey(two, 'rowan')).toBe(heroListKey([...two], 'rowan'));
    expect(heroListKey(two, 'rowan')).not.toBe(heroListKey(two, 'ianthe'));
    expect(heroListKey(two, 'rowan')).not.toBe(heroListKey([hero('rowan', 1000), two[1]!], 'rowan'));
  });

  it('shows the travel left as a share of a day', () => {
    expect(travelLeft(hero('rowan', 0))).toBe(0);
    expect(travelLeft(hero('rowan', 99999))).toBe(1);
    const h = hero('rowan', 0);
    expect(travelLeft({ ...h, mp: Math.round(dailyMp(h) / 2) })).toBeCloseTo(0.5, 2);
  });
});
