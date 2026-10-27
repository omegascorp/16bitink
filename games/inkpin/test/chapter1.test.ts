import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/level';
import { CISTERN } from '../src/level/cistern';
import { DOOR } from '../src/level/door';
import { GOLD_RUSH } from '../src/level/goldRush';
import { GUARD } from '../src/level/guard';
import { IDOL_HALL } from '../src/level/idolHall';
import { PIN_OVER_PIN } from '../src/level/pinOverPin';
import { STAIR } from '../src/level/stair';
import { TORCHES } from '../src/level/torches';
import { WELL } from '../src/level/well';
import type { LevelDef } from '../src/logic/level';
import { World } from '../src/logic/world';
import { play } from './solver';

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked' (a pin couldn't come out). */
const outcome = (level: LevelDef, order: readonly string[], patient = false): string => {
  const r = play(level, order, patient);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('Chapter 1', () => {
  it('has ten levels with their own ids, each opening at rest', () => {
    expect(LEVELS).toHaveLength(10);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(10);
    for (const level of LEVELS) {
      const w = new World(level);
      expect(w.status.state).toBe('playing');
      expect(w.coinsTotal).toBeGreaterThanOrEqual(level.coinsNeeded);
    }
  });

  // Each level: its hint's order wins, and the tempting wrong orders lose the way the level means.
  const cases: [LevelDef, [string[], string[]][], boolean?][] = [
    [DOOR, []],
    [GOLD_RUSH, [[['A', 'B', 'G'], ['drained']]]],
    [CISTERN, [[['W', 'S'], ['drained']]]],
    [GUARD, [[['G', 'R', 'W'], ['inked']], [['W', 'R', 'G'], ['inked']], [['R', 'G', 'W'], ['inked']]]],
    [PIN_OVER_PIN, [[['N', 'B', 'C'], ['pricked']], [['C', 'B', 'N'], ['blocked']]]],
    [WELL, [[['G', 'W', 'C'], ['inked']], [['C', 'G', 'W'], ['inked']]]],
    [STAIR, [[['C', 'K', 'W', 'N'], ['drained']], [['N', 'K', 'W', 'C'], ['inked']]]],
    [TORCHES, [[['N', 'K', 'W'], ['inked']], [['W', 'N', 'K'], ['drained', 'playing']]]],
    // The boss: Nib waits on the ledge. Opening the cistern before both tanks are in it never beats the boar.
    [IDOL_HALL, [[['R', 'A', 'B', 'C'], ['playing', 'inked']], [['A', 'R', 'B', 'C'], ['playing', 'inked']]], true],
  ];
  it.each(cases.map(([level, losses, patient]) => [level.name, level, losses, patient ?? false] as const))('%s', (_name, level, losses, patient) => {
    expect(outcome(level, level.solution, patient)).toBe('won');
    for (const [order, causes] of losses) expect(causes).toContain(outcome(level, order, patient));
  });
}, 300_000);

describe('vines', () => {
  it('Nib climbs a tapped vine, steps off at the top, and climbs back down', () => {
    const w = new World(DOOR);
    const go = (x: number, y?: number): void => {
      w.command(y === undefined ? { kind: 'goto', x } : { kind: 'goto', x, y });
      for (let s = 0; s < 1500; s++) {
        w.step();
        if (s > 20 && w.nibOrder.kind === 'stay') break;
      }
    };
    go(232, 850);
    expect(w.onVine).toBe(true);
    expect(w.nib.y).toBeLessThan(860);
    go(70, 840);
    expect(w.onVine).toBe(false);
    expect(w.coinsCollected).toBeGreaterThan(15);
    go(232, 1090);
    go(150);
    expect(w.nib.y).toBeGreaterThan(1050);
  });
});

describe('the boss', () => {
  // However long the player waits between pulls, filling the cistern first washes the Great Boar away.
  it.each([300, 500, 800, 1100])('falls to the full flood with %i steps between pulls', (wait) => {
    const w = new World(IDOL_HALL);
    for (const id of ['B', 'A', 'R']) {
      w.pull(id);
      for (let s = 0; s < wait; s++) w.step();
    }
    for (let s = 0; s < 600; s++) w.step();
    expect(w.blots[0]!.gone).toBe('washed');
  });

  it('bounces Nib off its back instead of being squashed', () => {
    const w = new World(IDOL_HALL);
    const boss = w.blots[0]!;
    for (let s = 0; s < 600; s++) w.step();
    w.nib.x = boss.x;
    w.nib.y = boss.y - 110;
    w.nib.vy = 0;
    let bonked = false;
    for (let s = 0; s < 200 && !bonked; s++) {
      w.step();
      bonked = w.events.some((e) => e.type === 'bonk');
    }
    expect(bonked).toBe(true);
    expect(boss.gone).toBe(null);
  });
}, 300_000);
