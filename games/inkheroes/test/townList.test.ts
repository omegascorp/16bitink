import { describe, expect, it } from 'vitest';
import { townListKey } from '../src/scenes/hud/townListData';
import { shrinkSmooth } from '../src/scenes/town/townPictures';
import type { Town } from '../src/logic/town';

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
});
