import { describe, expect, it } from 'vitest';
import { gameTag } from '../src/lib/client/analytics';

describe('gameTag', () => {
  it('tags events with the game and its version', () => {
    expect(gameTag('inkcrab', '1.2.0')).toEqual({ game: 'inkcrab', version: '1.2.0' });
  });

  it('leaves out a missing or malformed version instead of losing the event', () => {
    expect(gameTag('inkcrab', undefined)).toEqual({ game: 'inkcrab' });
    expect(gameTag('inkcrab', '')).toEqual({ game: 'inkcrab' });
    expect(gameTag('inkcrab', '1.0 beta')).toEqual({ game: 'inkcrab' });
    expect(gameTag('inkcrab', '9'.repeat(41))).toEqual({ game: 'inkcrab' });
  });
});
