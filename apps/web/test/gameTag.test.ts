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

  it("trims a checkpoint's progress note like a level end's, and drops one without a note", () => {
    const e = { type: 'level_progress', level: 'day-run', n: 3, seconds: 600, progress: 'd'.repeat(70) } as const;
    expect(fromGameEvent(tag, e)).toEqual({ ...e, progress: 'd'.repeat(60), game: 'inkfish', version: '1.0.0' });
    expect(fromGameEvent(tag, { ...e, progress: '' })).toBeNull();
  });

  it("trims a level end's progress note", () => {
    expect(fromGameEvent(tag, { type: 'level_end', level: 'a', n: 1, result: 'quit', seconds: 5, progress: 'p'.repeat(70) })).toMatchObject({ progress: 'p'.repeat(60) });
  });

  it('trims level events and drops ones with no level number', () => {
    expect(fromGameEvent(tag, { type: 'level_start', level: 'x'.repeat(50), n: 2 })).toMatchObject({ level: 'x'.repeat(40), n: 2, game: 'inkfish' });
    expect(fromGameEvent(tag, { type: 'level_start', level: 'a', n: 0 })).toBeNull();
  });

  it('marks level starts as watched for their first press, and only them', () => {
    expect(fromGameEvent(tag, { type: 'level_start', level: 'a', n: 1 })).toMatchObject({ inputs: true });
    expect(fromGameEvent(tag, { type: 'level_end', level: 'a', n: 1, result: 'win', seconds: 3 })).not.toHaveProperty('inputs');
  });
});
