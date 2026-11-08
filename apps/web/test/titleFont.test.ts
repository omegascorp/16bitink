import { describe, expect, it } from 'vitest';
import { findGame, GAMES } from '../src/data/games';
import { titleFont } from '../src/lib/titleFont';

describe('titleFont', () => {
  it('hand-letters an ink game\'s title', () => {
    expect(titleFont(findGame('inkfish')!)).toBe('hand');
  });

  it('letters a pixel game\'s whole title in pixels', () => {
    expect(titleFont(findGame('inkheroes')!)).toBe('pixel');
  });

  it('marks InkHeroes as the pixel game and every other playable game as ink', () => {
    expect(GAMES.filter((g) => g.style === 'pixel').map((g) => g.slug)).toEqual(['inkheroes']);
  });
});
