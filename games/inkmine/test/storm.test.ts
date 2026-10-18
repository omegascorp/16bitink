import { describe, expect, it } from 'vitest';
import { exposed, Storm, STORM, stormLine } from '../src/logic/storm';
import type { Mine } from '../src/logic/mine';
import { grid, mine, run, standAt, T } from './helpers';

/** Steps a storm through whole phases until it's in `phase`; returns the turns it said. */
function until(s: Storm, phase: Storm['phase']): string[] {
  const turns: string[] = [];
  for (let i = 0; i < 8 && s.phase !== phase; i++) {
    const turned = s.step(s.left + 1e-6);
    if (turned) turns.push(turned);
  }
  return turns;
}

/** A body standing in column `col` with its feet on row `row`. */
const body = (col: number, row: number) => ({ x: col * T + 6, y: row * T - 28, w: 20, h: 28 });

/** A storm blowing at full strength towards `dir`, in a mine with storms. */
function blowing(m: Mine, dir: 1 | -1): void {
  until(m.storm!, 'blow');
  m.storm!.dir = dir;
}

// Twelve columns of open flat, the lander at the west end.
const FLAT = ['............', '............', 'ssssssssssss', '############'];

describe('dust storms', () => {
  it('come in turns: a long calm, a warning, the storm, then it clears and calms again', () => {
    const s = new Storm(4004);
    expect(s.phase).toBe('calm');
    expect(s.left).toBeGreaterThanOrEqual(STORM.firstCalm[0]);
    expect(s.left).toBeLessThanOrEqual(STORM.firstCalm[1]);
    expect(until(s, 'blow')).toEqual(['warn', 'blow']);
    expect(until(s, 'calm')).toEqual(['clear', 'calm']);
    expect(s.left).toBeGreaterThanOrEqual(STORM.calm[0]);
  });

  it('blow nothing in the calm or the warning, build up, and gust while they blow', () => {
    const s = new Storm(1);
    expect(s.strength).toBe(0);
    until(s, 'warn');
    s.step(1);
    expect(s.strength).toBe(0);
    expect(s.dust).toBeGreaterThan(0);
    until(s, 'blow');
    s.step(0.5);
    const early = s.strength;
    s.step(STORM.rise);
    expect(s.strength).toBeGreaterThan(early);
    const seen = new Set<number>();
    for (let i = 0; i < 40; i++) {
      s.step(0.25);
      if (s.phase === 'blow') seen.add(Math.round(s.strength * 20));
    }
    expect(seen.size).toBeGreaterThan(1);
    expect(Math.max(...seen) / 20).toBeLessThanOrEqual(1);
  });

  it('are the same storms on every landing from the same seed', () => {
    const a = new Storm(77);
    const b = new Storm(77);
    expect(a.left).toBe(b.left);
    until(a, 'blow');
    until(b, 'blow');
    expect(a.dir).toBe(b.dir);
    expect(a.left).toBe(b.left);
  });

  it('say on the HUD when one is coming, and whether you are under cover', () => {
    const s = new Storm(5);
    expect(stormLine(s, true)).toBeNull();
    until(s, 'warn');
    s.step(STORM.warn - 12.5);
    expect(stormLine(s, true)).toEqual({ text: 'Dust storm in 13 s: find cover', danger: true });
    until(s, 'blow');
    expect(stormLine(s, true)?.danger).toBe(true);
    expect(stormLine(s, false)).toEqual({ text: 'Dust storm: under cover', danger: false });
  });

  describe('cover', () => {
    it('the open flat is out in it', () => {
      expect(exposed(grid(FLAT), body(6, 2), T, 1)).toBe(true);
    });

    it('anything over your head is a roof', () => {
      const t = grid(['......t.....', '............', 'ssssssssssss', '############']);
      expect(exposed(t, body(6, 2), T, 1)).toBe(false);
    });

    it('a wall a tile or two upwind is a lee; one downwind is no help', () => {
      const t = grid(['............', '....s.......', 'ssssssssssss', '############']);
      // The wind blowing east comes from the west: the boulder at column 4 shelters columns 5 and 6.
      expect(exposed(t, body(5, 2), T, 1)).toBe(false);
      expect(exposed(t, body(6, 2), T, 1)).toBe(false);
      expect(exposed(t, body(7, 2), T, 1)).toBe(true);
      // Blowing west, it's downwind of them.
      expect(exposed(t, body(5, 2), T, -1)).toBe(true);
    });

    it('a hole is cover', () => {
      const t = grid(['............', '............', 'sssss.ssssss', 'ssssssssssss', '############']);
      expect(exposed(t, body(5, 3), T, 1)).toBe(false);
      expect(exposed(t, body(5, 3), T, -1)).toBe(false);
    });
  });

  describe('in the dig site', () => {
    it('only on a world that has them', () => {
      expect(mine(FLAT).storm).toBeNull();
      expect(mine(FLAT, { storm: 4004 }).storm).not.toBeNull();
    });

    it('say when one is coming, before it blows', () => {
      const m = mine(FLAT, { storm: 4004 });
      const events = run(m, STORM.firstCalm[1] + 1);
      expect(events.filter((e) => e.kind === 'storm').map((e) => e.kind === 'storm' && e.now)[0]).toBe('warn');
    });

    it('shove you downwind out in the open, and the grit lands a hit every few seconds', () => {
      const m = mine(FLAT, { storm: 4004 });
      standAt(m, 6, 2);
      blowing(m, 1);
      const x0 = m.player.x;
      const events = run(m, 0.5);
      expect(m.exposed).toBe(true);
      expect(m.player.x).toBeGreaterThan(x0);
      expect(events.some((e) => e.kind === 'shielded' || e.kind === 'hurt')).toBe(false);
      standAt(m, 6, 2);
      const later = run(m, STORM.grit * 2.5);
      expect(later.filter((e) => e.kind === 'shielded' || (e.kind === 'hurt' && e.cause === 'storm')).length).toBeGreaterThanOrEqual(1);
    });

    it('walking into the wind is slow, but you get there', () => {
      const m = mine(FLAT, { storm: 4004 });
      blowing(m, 1);
      run(m, STORM.rise);
      standAt(m, 9, 2);
      const x0 = m.player.x;
      run(m, 1, { ix: -1 });
      const into = x0 - m.player.x;
      expect(into).toBeGreaterThan(0);
      expect(into).toBeLessThan(125 * 0.8);
    });

    it('in a hole, nothing happens to you', () => {
      const m = mine(['............', '............', 'sssss.ssssss', 'ssssssssssss', '############'], { storm: 4004 });
      standAt(m, 5, 3);
      blowing(m, -1);
      const x0 = m.player.x;
      const events = run(m, STORM.grit * 3);
      expect(m.exposed).toBe(false);
      expect(Math.abs(m.player.x - x0)).toBeLessThan(1);
      expect(events.some((e) => e.kind === 'shielded' || e.kind === 'hurt')).toBe(false);
    });

    it("blot out the sun: the lander's panels make nothing while one blows", () => {
      const m = mine(FLAT, { storm: 4004, stores: { air: 100, power: 100 }, storesCap: 1200 });
      standAt(m, 8, 2);
      run(m, 1);
      const charging = m.stores.power;
      expect(charging).toBeGreaterThan(100);
      blowing(m, 1);
      run(m, 2);
      expect(m.stores.power).toBe(charging);
    });
  });
});
