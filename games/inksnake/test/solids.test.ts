/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import type { LevelDef } from '../src/level/types';
import { dist, pushOut } from '../src/logic/vec';
import { World } from '../src/logic/world';
import { botInput } from './bot';

/** Every level of every chapter. */
const FILES = import.meta.glob<Record<string, readonly LevelDef[]>>('../src/level/chapter*.ts', { eager: true });
const LEVELS = Object.values(FILES).flatMap((m) => Object.values(m).find(Array.isArray) ?? []);
/** Seconds of each level played. */
const PLAY = 25;
/** Slack for a push that's settling, px (hunters keep 10 px of their middles clear). */
const SLACK = 4;

describe('ground hunters go round solid things', () => {
  it('never stand inside one, in any level, as the bot plays', () => {
    expect(LEVELS.length).toBe(100);
    for (const level of LEVELS) {
      const w = new World(level, 0);
      while (w.state === 'play' && w.elapsed < PLAY) {
        w.step(botInput(w), 1 / 60);
        for (const e of [...w.enemies, ...(w.boss ? [w.boss] : [])]) {
          if (e.away || e.overBody || e.alt > 0.05) continue;
          for (const s of w.solids) {
            const out = pushOut(e, 10 - SLACK, s);
            expect(out === null, `${level.id} ${e.kind} (${e.mode}) inside a solid at ${e.x.toFixed(0)},${e.y.toFixed(0)}, ${out ? dist(out.p, e).toFixed(1) : ''} px deep`).toBe(true);
          }
        }
      }
    }
  }, 120_000);
});
