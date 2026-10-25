import { describe, expect, it } from 'vitest';
import { CHAPTER_1 } from '../src/level/chapter1';
import { parseChapters, parseLevel } from '../src/level/validate';
import { BOARD } from '../src/level/types';
import { preySpec } from '../src/logic/prey';
import { coilMaxOf, gapeOf, SNAKE_SPECS } from '../src/logic/species';
import { pushOut } from '../src/logic/vec';
import { World } from '../src/logic/world';
import { playLevel } from './bot';

/** Thirty bot playthroughs take a few seconds, longer on a busy machine. */
const BOT_TIMEOUT = 120_000;

describe('chapter 1', () => {
  it('has ten levels with unique ids, the last a boss', () => {
    expect(CHAPTER_1).toHaveLength(10);
    expect(new Set(CHAPTER_1.map((l) => l.id)).size).toBe(10);
    expect(CHAPTER_1[9]!.goal?.kind).toBe('boss');
  });

  it('survives its own validator unchanged', () => {
    for (const l of CHAPTER_1) expect(parseLevel(JSON.parse(JSON.stringify(l)))).toEqual(l);
  });

  it('starts the snake on the board, clear of anything solid', () => {
    for (const l of CHAPTER_1) {
      expect(l.start.x).toBeGreaterThan(40);
      expect(l.start.x).toBeLessThan(BOARD.w - 40);
      const w = new World(l);
      for (const p of w.snake.trail.pts) {
        expect(p.x, l.id).toBeGreaterThan(0);
        for (const s of w.solids) expect(pushOut(p, 4, s), `${l.id} body in a solid`).toBeNull();
      }
    }
  });

  it('only asks for prey a corn snake can eat: small enough to swallow or to coil', () => {
    const spec = SNAKE_SPECS.corn;
    for (const l of CHAPTER_1) for (const p of l.prey) {
      const size = preySpec(p.kind).size;
      expect(size <= gapeOf(spec.width) || size <= coilMaxOf(spec.width), `${l.id} ${p.kind}`).toBe(true);
    }
  });

  it('can be won by the bot, every level, within twice its par (in one of three tries)', () => {
    for (const l of CHAPTER_1) {
      const runs = [0, 1, 2].map((seed) => playLevel(l, l.par * 2, seed));
      expect(runs.some((r) => r.won), `${l.id}: ${JSON.stringify(runs)}`).toBe(true);
    }
  }, BOT_TIMEOUT);

  it('is not a walkover: the bot loses lives somewhere in the chapter', () => {
    const lost = CHAPTER_1.flatMap((l) => [0, 1, 2].map((seed) => playLevel(l, l.par * 2, seed).livesLost));
    expect(lost.reduce((a, b) => a + b, 0)).toBeGreaterThan(3);
  });
});

describe('validator', () => {
  const good = JSON.parse(JSON.stringify(CHAPTER_1[1]));

  it('refuses bad levels', () => {
    expect(() => parseLevel({ ...good, snake: 'python' })).toThrow();
    expect(() => parseLevel({ ...good, target: 10 })).toThrow();
    expect(() => parseLevel({ ...good, prey: [] })).toThrow();
    expect(() => parseLevel({ ...good, enemies: [{ kind: 'dragon' }] })).toThrow();
    expect(() => parseLevel({ ...good, goal: { kind: 'boss' } })).toThrow();
    expect(() => parseLevel({ ...good, solids: [{ kind: 'circle', look: '<b>', x: 1, y: 1, r: 9 }] })).toThrow();
  });

  it('drops unknown fields', () => {
    expect(parseLevel({ ...good, evil: true })).not.toHaveProperty('evil');
  });

  it('refuses chapters that reuse the free chapter\'s ids', () => {
    expect(() => parseChapters([[good]])).toThrow(/repeated/);
    expect(parseChapters([[{ ...good, id: 'barrens-1' }]])).toHaveLength(1);
  });
});
