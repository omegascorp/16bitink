import { describe, expect, it } from 'vitest';
import { firstScreen, parseSaveValue, recordResult } from '../src/logic/save';

describe('firstScreen', () => {
  it('drops a new player straight into the first level', () => {
    expect(firstScreen(parseSaveValue(null))).toEqual({ scene: 'Game', data: { levelIndex: 0 } });
  });

  it('a new player who has met fish but finished nothing still starts in level 1', () => {
    expect(firstScreen({ ...parseSaveValue(null), seen: ['fry'] }).scene).toBe('Game');
  });

  it('shows the map once a level is finished', () => {
    expect(firstScreen(recordResult(parseSaveValue(null), 'c1-l1', 100, 1))).toEqual({ scene: 'Menu' });
  });
});
