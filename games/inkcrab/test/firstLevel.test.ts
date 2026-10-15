import { describe, expect, it } from 'vitest';
import { buildLevel } from '../src/level/build';
import { BEACH_1 } from '../src/level/beach1';
import { Coach, ledgeAhead } from '../src/logic/coach';
import { Beach, IDLE } from '../src/logic/sim';

/** Holds right for `seconds`, jumping when `jump` says to; returns the furthest column reached. */
function walkRight(b: Beach, seconds: number, jump: (b: Beach) => boolean, coach?: Coach): number {
  let furthest = 0;
  for (let i = 0; i < seconds * 60; i++) {
    const events = b.step({ ...IDLE, moveX: 1, jump: jump(b) }, 1 / 60);
    coach?.observe(b, events);
    furthest = Math.max(furthest, b.crab.body.x / b.tileSize);
  }
  return furthest;
}

describe('the first level', () => {
  const def = BEACH_1[0]!;

  it('teaches jumping: its bank can\'t be walked up, only jumped', () => {
    expect(def.teach).toContain('jump');
    const walker = new Beach(buildLevel(def));
    expect(walkRight(walker, 6, () => false)).toBeLessThan(17);
    expect(ledgeAhead(walker, 1)).not.toBeNull();
    const jumper = new Beach(buildLevel(def));
    expect(walkRight(jumper, 6, (b) => ledgeAhead(b, 1) !== null)).toBeGreaterThan(30);
  });

  it('says how to jump at the bank, even after the first bite has ended the walking lesson', () => {
    const b = new Beach(buildLevel(def));
    const coach = new Coach(def.teach ?? []);
    walkRight(b, 6, () => false, coach);
    expect(coach.learnt('move')).toBe(true);
    expect(coach.hint(b, 'keys')?.lesson).toBe('jump');
  });
});
