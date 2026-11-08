import { describe, expect, it } from 'vitest';
import { cardButtonLook } from '../src/scenes/battle/pixelFrames';

describe('a card button\'s look', () => {
  it('fills the first button as the main action unless it says otherwise', () => {
    expect(cardButtonLook(undefined, 0)).toEqual({ rim: 'gold', primary: true });
    expect(cardButtonLook(undefined, 1)).toEqual({ rim: 'bronze', primary: false });
    expect(cardButtonLook('plain', 0)).toEqual({ rim: 'bronze', primary: false });
  });

  it('keeps equal choices equal: gold rimmed, none filled as the one to pick', () => {
    expect(cardButtonLook('crown', 0)).toEqual({ rim: 'gold', primary: false });
    expect(cardButtonLook('crown', 1)).toEqual({ rim: 'gold', primary: false });
  });
});
