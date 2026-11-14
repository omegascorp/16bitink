import { describe, expect, it } from 'vitest';
import { CH1_LEVELS, ch1Level } from '../src/content/ch1/levels';
import { STARTER_LOADOUT } from '../src/logic/parts';
import { asciiMap } from '../src/sim/asciiMap';
import { intelLine, runChapter } from '../src/sim/chapter';
import { main, parseArgs } from '../src/sim/lab';
import { runMission } from '../src/sim/runMission';

describe('the level lab', () => {
  it('parses its arguments', () => {
    expect(parseArgs(['--level', '3', '--seeds', '5', '--no-map'])).toMatchObject({ level: 3, seeds: 5, map: false, chapter: false });
    expect(parseArgs(['--map', '4'])).toMatchObject({ level: 4, mapOnly: true });
    expect(parseArgs(['--chapter', '--seeds', '2']).chapter).toBe(true);
    expect(parseArgs(['--all']).all).toBe(true);
    expect(() => parseArgs(['--level', '11'])).toThrow();
    expect(() => parseArgs([])).toThrow(/--level/);
    expect(() => parseArgs(['--level', '1', '--tank', 'laser1/light1/wheels1'])).toThrow();
  });

  it('prints a line per seed, a summary and the map', () => {
    const out = main(['--level', '1', '--seeds', '2']);
    expect(out.match(/^ {2}seed /gm)).toHaveLength(2);
    expect(out).toMatch(/^L1 First Tracks \(assault\): pass \d\/2/m);
    expect(out).toContain('S start');
    const map = asciiMap(ch1Level(3));
    expect(map).toContain('S');
    expect(map).toContain('G');
    expect(map.split('\n')[0]).toHaveLength(4 * 12 + 2);
  });

  it('runs a level with a bot in the player seat', () => {
    const r = runMission({ level: ch1Level(1), seed: 1, player: { loadout: STARTER_LOADOUT } });
    expect(r.report).not.toBeNull();
    expect(r.tanks.filter((t) => t.isPlayer)).toHaveLength(1);
    expect(r.reason.length).toBeGreaterThan(0);
    expect(intelLine({ cannon: 2 })).toBe('2 (cannon 2)');
  });
});

describe('the chapter run', () => {
  it('plays levels in order, retries fails and keeps progress', { timeout: 60_000 }, () => {
    const r = runChapter(CH1_LEVELS.slice(0, 2), 1, 2);
    expect(r.rows.map((x) => x.level)).toEqual([1, 2]);
    expect(r.rows.every((x) => x.attempts >= 1 && x.attempts <= 2 && x.ends.length === x.attempts)).toBe(true);
    expect(r.progress.xp).toBeGreaterThan(0);
    expect(r.verdict.detail.length).toBeGreaterThan(0);
  });
});
