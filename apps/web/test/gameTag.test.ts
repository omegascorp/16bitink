import { describe, expect, it } from 'vitest';
import { fromGameEvent, gameTag } from '../src/lib/client/analytics';

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

describe('fromGameEvent', () => {
  const tag = { game: 'inkfish', version: '1.0.0' };

  it('passes on where a game showed its offer', () => {
    expect(fromGameEvent(tag, { type: 'offer_view', where: 'free_end' })).toEqual({ type: 'offer_view', where: 'free_end', game: 'inkfish', version: '1.0.0' });
  });

  it('drops an offer from a place the server would refuse', () => {
    expect(fromGameEvent(tag, { type: 'offer_view', where: 'popup' } as never)).toBeNull();
  });

  it('trims level events and drops ones with no level number', () => {
    expect(fromGameEvent(tag, { type: 'level_start', level: 'x'.repeat(50), n: 2 })).toMatchObject({ level: 'x'.repeat(40), n: 2, game: 'inkfish' });
    expect(fromGameEvent(tag, { type: 'level_start', level: 'a', n: 0 })).toBeNull();
  });
});
