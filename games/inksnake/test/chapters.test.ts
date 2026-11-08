import { describe, expect, it } from 'vitest';
/// <reference types="vite/client" />
import { INKSNAKE_PAID_CHAPTERS } from '../content/paid';
import type { LevelDef } from '../src/level/types';
import { parseChapters, parseLevel } from '../src/level/validate';
import { BOARD } from '../src/level/types';
import { pushOut } from '../src/logic/vec';
import { World } from '../src/logic/world';
import { playLevel } from './bot';

/** Thirty bot playthroughs take a few seconds, longer on a busy machine. */
const BOT_TIMEOUT = 120_000;

/** Every chapter file there is (built or still being built), by number: each checked as chapter 1 is. */
const FILES = import.meta.glob<Record<string, readonly LevelDef[]>>('../src/level/chapter*.ts', { eager: true });
const CHAPTERS = Object.entries(FILES)
  .map(([f, m]) => [Number(f.replace(/^.*chapter(\d+)\.ts$/, '$1')), Object.values(m).find(Array.isArray) ?? []] as const)
  .filter(([n]) => n >= 2)
  .sort((a, b) => a[0] - b[0]);

describe.each(CHAPTERS)('chapter %i', (_n, chapter) => {
  it('has ten levels with unique ids, the last a boss, all of one snake', () => {
    expect(chapter).toHaveLength(10);
    expect(new Set(chapter.map((l) => l.id)).size).toBe(10);
    expect(chapter[9]!.goal?.kind).toBe('boss');
    expect(new Set(chapter.map((l) => l.snake)).size).toBe(1);
  });

  it('survives the validator unchanged, as the server sends it', () => {
    for (const l of chapter) expect(parseLevel(JSON.parse(JSON.stringify(l)))).toEqual(l);
  });

  it('starts the snake on the board, clear of anything solid', () => {
    for (const l of chapter) {
      const w = new World(l);
      for (const p of w.snake.trail.pts) {
        expect(p.x > 0 && p.y > 0 && p.x < BOARD.w && p.y < BOARD.h, `${l.id} body off the board`).toBe(true);
        for (const s of w.solids) expect(pushOut(p, 4, s), `${l.id} body in a solid`).toBeNull();
      }
    }
  });

  it('can be won by the bot, every level, within twice its par (in one of three tries)', () => {
    for (const l of chapter) {
      const runs = [0, 1, 2].map((seed) => playLevel(l, l.par * 2, seed));
      expect(runs.some((r) => r.won), `${l.id}: ${JSON.stringify(runs)}`).toBe(true);
    }
  }, BOT_TIMEOUT);
});

it('the full game parses as the client reads it', () => {
  expect(parseChapters(JSON.parse(JSON.stringify(INKSNAKE_PAID_CHAPTERS)))).toHaveLength(INKSNAKE_PAID_CHAPTERS.length);
});
