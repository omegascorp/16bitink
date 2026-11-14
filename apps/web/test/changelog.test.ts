import { describe, expect, it } from 'vitest';
import { CHANGELOG, SITE_CHANGELOG, allUpdates, changelogFor, latestUpdate, type ChangelogEntry } from '../src/data/changelog';
import { findGame, listedGames, playableGames } from '../src/data/games';
import { sitemapXml } from '../src/lib/seo';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const LATER = new Date('2030-01-01T00:00:00Z');

function checkEntries(entries: readonly ChangelogEntry[]): void {
  const days = entries.map((e) => e.date);
  for (const day of days) {
    expect(day).toMatch(DAY);
    expect(Number.isNaN(new Date(`${day}T00:00:00Z`).getTime())).toBe(false);
  }
  // Newest first (a big day can have several entries).
  expect([...days].sort().reverse()).toEqual(days);
  for (const e of entries) {
    expect(e.title.trim().length).toBeGreaterThan(0);
    expect(e.changes.length).toBeGreaterThanOrEqual(1);
    expect(e.changes.length).toBeLessThanOrEqual(6);
    for (const c of e.changes) expect(c.trim().length).toBeGreaterThan(0);
  }
}

describe('changelog', () => {
  it('has an entry list for every playable game, and only for catalog games', () => {
    for (const g of playableGames()) expect(changelogFor(g.slug).length).toBeGreaterThan(0);
    for (const slug of Object.keys(CHANGELOG)) expect(findGame(slug)?.status).toBe('playable');
  });

  it('keeps every list newest first, each entry with a title and a few changes', () => {
    for (const entries of Object.values(CHANGELOG)) checkEntries(entries);
    checkEntries(SITE_CHANGELOG);
  });

  it("starts each game's list on its release day and never before", () => {
    for (const g of playableGames()) {
      const entries = changelogFor(g.slug);
      expect(entries.at(-1)?.date).toBe(g.released);
      for (const e of entries) expect(e.date >= (g.released ?? '')).toBe(true);
    }
  });

  it("dates the catalog's Updated stamp by the newest entry, so the two never disagree", () => {
    for (const g of playableGames()) expect(g.updated ?? g.released).toBe(latestUpdate(g.slug)?.date);
  });

  it('is empty for a game it does not know', () => {
    expect(changelogFor('no-such-game')).toEqual([]);
    expect(latestUpdate('no-such-game')).toBeUndefined();
  });
});

describe('allUpdates', () => {
  it('merges every game and the site, newest first', () => {
    const updates = allUpdates(listedGames(LATER), LATER);
    const days = updates.map((u) => u.entry.date);
    expect([...days].sort().reverse()).toEqual(days);
    expect(updates.filter((u) => u.game === null).length).toBe(SITE_CHANGELOG.length);
    for (const g of playableGames()) expect(updates.some((u) => u.game?.slug === g.slug)).toBe(true);
  });

  it("leaves out a game before its release day and anything dated after today", () => {
    const before = new Date('2026-11-07T23:59:59Z');
    const updates = allUpdates(listedGames(before), before);
    expect(updates.some((u) => u.game?.slug === 'inkheroes')).toBe(false);
    for (const u of updates) expect(u.entry.date <= '2026-11-07').toBe(true);
  });
});

describe('sitemap.xml lists the changelogs', () => {
  const xml = sitemapXml(new URL('https://16bit.ink'), listedGames(LATER));

  it('has the all-games page and one per game, dated by their newest entry', () => {
    // The sitemap dates the all-games page by what is out today (a game dated ahead, like InkTanks, is listed later).
    const newest = allUpdates(listedGames(LATER), new Date())[0]?.entry.date;
    expect(xml).toContain(`<loc>https://16bit.ink/changelog</loc><lastmod>${newest}</lastmod>`);
    for (const g of playableGames()) {
      expect(xml).toContain(`<loc>https://16bit.ink/games/${g.slug}/changelog</loc><lastmod>${latestUpdate(g.slug)?.date}</lastmod>`);
    }
  });
});
