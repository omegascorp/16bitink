import { describe, expect, it } from 'vitest';
import { firstScreen } from '../src/scenes/firstScreen';

const won = { blots: 1, coins: 0, allCoins: false, firstTry: false };

describe('firstScreen', () => {
  it('sends a player with no progress straight into level 1', () => {
    expect(firstScreen({ levels: {} })).toEqual({ scene: 'game', level: 0 });
  });
  it('sends a returning player to the map', () => {
    expect(firstScreen({ levels: { door: won } })).toEqual({ scene: 'menu' });
  });
  it('leaves a dev ?level= start to the map hand-off', () => {
    expect(firstScreen({ levels: {} }, true)).toEqual({ scene: 'menu' });
  });
});
