import { describe, expect, it } from 'vitest';
import { GAMES, playableGames } from '../src/data/games';
import { pageviewRef, shortLinkTarget } from '../src/lib/shortLinks';

describe('short links', () => {
  it('gives every playable game a short path people can type from a video', () => {
    const shorts = playableGames().map((g) => g.short);
    expect(shorts).toEqual(['fish', 'crab', 'mine', 'gecko', 'snake']);
    expect(new Set(shorts).size).toBe(shorts.length);
  });

  it('never takes a path the site already uses', () => {
    const taken = ['about', 'terms', 'privacy', 'legal', 'redeem', 'account', 'admin', 'api', 'auth', 'games', 'play', 'purchase', 'covers', 'icons', 'loops', 'unsubscribe'];
    for (const g of GAMES) if (g.short) expect(taken, g.slug).not.toContain(g.short);
  });

  it('sends a short path to its game page, tagged with how the visitor came', () => {
    expect(shortLinkTarget('/fish')).toBe('/games/inkfish?via=fish');
    expect(shortLinkTarget('/crab')).toBe('/games/inkcrab?via=crab');
    expect(shortLinkTarget('/FISH')).toBe('/games/inkfish?via=fish');
    expect(shortLinkTarget('/fish/')).toBe('/games/inkfish?via=fish');
  });

  it('leaves every other path alone', () => {
    for (const path of ['/', '/games/inkfish', '/fishy', '/fish/more', '/about']) expect(shortLinkTarget(path), path).toBeNull();
  });
});

describe('pageview source', () => {
  it('names the short link a visitor typed, before any referrer', () => {
    expect(pageviewRef({ referrer: 'https://www.youtube.com/', hostname: '16bit.ink', search: '?via=fish' })).toBe('16bit.ink/fish');
  });

  it('keeps another site as its host only', () => {
    expect(pageviewRef({ referrer: 'https://www.reddit.com/r/WebGames/abc', hostname: '16bit.ink', search: '' })).toBe('www.reddit.com');
  });

  it('records nothing for our own pages, typed visits or a forged tag', () => {
    expect(pageviewRef({ referrer: 'https://16bit.ink/', hostname: '16bit.ink', search: '' })).toBeUndefined();
    expect(pageviewRef({ referrer: '', hostname: '16bit.ink', search: '' })).toBeUndefined();
    expect(pageviewRef({ referrer: '', hostname: '16bit.ink', search: '?via=<script>' })).toBeUndefined();
    expect(pageviewRef({ referrer: 'not a url', hostname: '16bit.ink', search: '' })).toBeUndefined();
  });
});
