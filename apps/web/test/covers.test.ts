import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { playableGames } from '../src/data/games';
import { COVER_FORMATS, COVER_WIDTHS, coverSrcset, coverVariant, loopSources } from '../src/lib/covers';

const publicFile = (url: string): string => fileURLToPath(new URL(`../public${url}`, import.meta.url));

describe('coverVariant', () => {
  it('names a resized copy of a cover next to it', () => {
    expect(coverVariant('/covers/inkfish.png', 640, 'webp')).toBe('/covers/inkfish-640.webp');
    expect(coverVariant('/covers/inkmine.png', 1200, 'avif')).toBe('/covers/inkmine-1200.avif');
  });

  it('lists every width of a format for srcset, smallest first', () => {
    expect(coverSrcset('/covers/inkcrab.png', 'webp')).toBe('/covers/inkcrab-640.webp 640w, /covers/inkcrab-1200.webp 1200w');
  });
});

describe('loopSources', () => {
  it('offers the small webm first and the mp4 for Safari', () => {
    expect(loopSources('inkfish')).toEqual([
      { src: '/loops/inkfish.webm', type: 'video/webm' },
      { src: '/loops/inkfish.mp4', type: 'video/mp4' },
    ]);
  });
});

describe('cover files', () => {
  it('every playable game has its cover in every size and format (pnpm --filter @16bitink/web covers)', () => {
    for (const game of playableGames()) {
      expect(game.cover, game.slug).toBeDefined();
      const files = COVER_FORMATS.flatMap((format) => COVER_WIDTHS.map((width) => coverVariant(game.cover!, width, format)));
      for (const file of [game.cover!, ...files]) expect(existsSync(publicFile(file)), file).toBe(true);
    }
  });

  it('every game with a gameplay loop has both of its video files (scripts/loops.mjs)', () => {
    for (const game of playableGames().filter((g) => g.loop)) {
      for (const { src } of loopSources(game.slug)) expect(existsSync(publicFile(src)), src).toBe(true);
    }
  });
});
