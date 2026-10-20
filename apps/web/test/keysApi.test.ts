import { describe, expect, it } from 'vitest';
import { API_KEYS_PER_DAY, API_MAX_KEY_USES, parseIssueRequest } from '../src/lib/keysApi';

describe('parseIssueRequest', () => {
  it('takes a game, a note and an optional number of uses (default 1)', () => {
    expect(parseIssueRequest({ game: 'inkfish', note: '  Ocean Facts  ' })).toEqual({ game: 'inkfish', uses: 1, note: 'Ocean Facts' });
    expect(parseIssueRequest({ game: 'inkcrab', note: 'Channel', uses: 3 })).toEqual({ game: 'inkcrab', uses: 3, note: 'Channel' });
  });

  it('needs a note, so every automated key says who it is for', () => {
    expect(parseIssueRequest({ game: 'inkfish' })).toBeNull();
    expect(parseIssueRequest({ game: 'inkfish', note: '   ' })).toBeNull();
    expect(parseIssueRequest({ game: 'inkfish', note: 'x'.repeat(81) })).toBeNull();
  });

  it(`allows at most ${API_MAX_KEY_USES} uses per key`, () => {
    expect(parseIssueRequest({ game: 'inkfish', note: 'C', uses: API_MAX_KEY_USES })).not.toBeNull();
    expect(parseIssueRequest({ game: 'inkfish', note: 'C', uses: API_MAX_KEY_USES + 1 })).toBeNull();
    expect(parseIssueRequest({ game: 'inkfish', note: 'C', uses: 0 })).toBeNull();
    expect(parseIssueRequest({ game: 'inkfish', note: 'C', uses: 1.5 })).toBeNull();
  });

  it('rejects malformed games and bodies', () => {
    expect(parseIssueRequest({ game: 'Ink Fish!', note: 'C' })).toBeNull();
    expect(parseIssueRequest(null)).toBeNull();
    expect(parseIssueRequest('inkfish')).toBeNull();
  });

  it('has a daily cap', () => {
    expect(API_KEYS_PER_DAY).toBeGreaterThan(0);
  });
});
