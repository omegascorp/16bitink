import { describe, expect, it } from 'vitest';
import { listedGames } from '../src/data/games';
import { FLASH_GAMES, FLASH_PAGE } from '../src/data/flashGames';
import { findGamesLike, listedGamesLike } from '../src/data/gamesLike';
import { flashJsonLd, flashTitle, sitemapXml } from '../src/lib/seo';

const SITE = new URL('https://16bit.ink');
const LATER = new Date('2030-01-01T00:00:00Z');
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LINK = /^https?:\/\//;

describe('Flash games page', () => {
  it('lists well-known Flash games, each with a legal way to play it today', () => {
    expect(FLASH_GAMES.length).toBeGreaterThanOrEqual(8);
    expect(new Set(FLASH_GAMES.map((g) => g.name)).size).toBe(FLASH_GAMES.length);
    for (const g of FLASH_GAMES) {
      expect(g.year, g.name).toBeGreaterThanOrEqual(1996);
      expect(g.year, g.name).toBeLessThanOrEqual(2020);
      expect(g.what.length, g.name).toBeGreaterThan(20);
      expect(g.playNow.length, g.name).toBeGreaterThanOrEqual(1);
      for (const w of g.playNow) expect(w.url, g.name).toMatch(LINK);
    }
  });

  it('points a game ours plays like at its "games like" page', () => {
    const linked = FLASH_GAMES.filter((g) => g.gamesLike);
    expect(linked.map((g) => g.gamesLike)).toEqual(expect.arrayContaining(['motherload', 'fishy']));
    for (const g of linked) expect(findGamesLike(g.gamesLike!), g.name).toBeDefined();
  });

  it('answers first, cites its sources and is dated', () => {
    expect(FLASH_PAGE.answer.split(/\s+/).length).toBeLessThanOrEqual(60);
    expect(FLASH_PAGE.sources.length).toBeGreaterThanOrEqual(3);
    for (const s of FLASH_PAGE.sources) expect(s.url).toMatch(LINK);
    expect(FLASH_PAGE.published).toMatch(DATE);
    expect(FLASH_PAGE.updated >= FLASH_PAGE.published).toBe(true);
  });

  it('has a title that fits a results page', () => {
    expect(flashTitle().length).toBeLessThanOrEqual(65);
    expect(flashTitle()).toMatch(/^Flash Games You Can Still Play/);
  });

  it('is an Article with a ranked list of the games', () => {
    const [article, list] = flashJsonLd(SITE) as Record<string, unknown>[];
    expect(article).toMatchObject({ '@type': 'Article', url: 'https://16bit.ink/flash-games', dateModified: FLASH_PAGE.updated });
    const items = (list as { itemListElement: { name: string }[] }).itemListElement;
    expect(items.map((i) => i.name)).toEqual(FLASH_GAMES.map((g) => g.name));
  });

  it('is in the sitemap, dated by its last update', () => {
    expect(sitemapXml(SITE, listedGames(LATER), listedGamesLike(LATER))).toContain(
      `<loc>https://16bit.ink/flash-games</loc><lastmod>${FLASH_PAGE.updated}</lastmod>`,
    );
  });
});
