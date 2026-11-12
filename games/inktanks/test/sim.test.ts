import { describe, expect, it } from 'vitest';
import { main, missionSummary, parseArgs } from '../src/sim/cli';
import { intelLine } from '../src/sim/chapter';
import { runMission } from '../src/sim/runMission';
import { CH1_LAND } from '../src/content/ch1/land';
import { ch1Mission } from '../src/content/ch1/missions';
import { STARTER_LOADOUT } from '../src/logic/parts';

describe('the headless sim', () => {
  it('parses its arguments', () => {
    expect(parseArgs(['--level', '3', '--runs', '5', '--bots'])).toMatchObject({ level: 3, runs: 5, bots: true, chapter: false });
    expect(parseArgs(['--chapter', '--seeds', '2']).chapter).toBe(true);
    expect(() => parseArgs(['--level', '11'])).toThrow();
  });

  it('runs a mission with a bot in the player seat, and bots only', () => {
    const r = runMission({ land: CH1_LAND, mission: ch1Mission(1), seed: 1, player: { loadout: STARTER_LOADOUT } });
    expect(r.report).not.toBeNull();
    expect(r.tanks.filter((t) => t.isPlayer)).toHaveLength(1);
    const out = main(['--level', '1', '--runs', '2']);
    expect(out).toContain('placement avg');
    expect(out).toContain('fitted at end');
    expect(missionSummary({ level: 2, runs: 1, seed: 1, bots: true, chapter: false, seeds: 1 })).toContain('bots only');
    expect(intelLine({ cannon: 2 })).toBe('2 (cannon 2)');
  });
});

import { runChapter } from '../src/sim/chapter';
import { CH1_MISSIONS } from '../src/content/ch1/missions';
import { BONUSES } from '../src/logic/mission/bonus';
import type { MatchReport } from '../src/logic/match/report';

describe('the chapter run', () => {
  it('plays missions in order, retries fails and keeps progress', { timeout: 60_000 }, () => {
    const r = runChapter(CH1_LAND, CH1_MISSIONS.slice(0, 2), 1, 2);
    expect(r.rows.map((x) => x.level)).toEqual([1, 2]);
    expect(r.rows.every((x) => x.attempts >= 1 && x.attempts <= 2)).toBe(true);
    expect(r.progress.xp).toBeGreaterThanOrEqual(0);
    expect(r.verdict.detail.length).toBeGreaterThan(0);
    expect(r.bonusShare).toBeGreaterThanOrEqual(0);
  });
});

describe('bonus objectives', () => {
  it('each tests its own condition', () => {
    const base: MatchReport = {
      level: 1, passedMain: true, reason: 'objective', placement: 1, tanks: 6, won: true, playerAlive: true, kills: 5,
      victims: [{ hull: 'heavy', drive: 'tracks', gun: 'cannon', by: 'rockets' }], intel: { cannon: 10 }, intelCount: 10,
      usedKit: false, stormDamage: 0, hullsUsed: ['light'], picks: [{ family: 'cannon', mk: 1 }, { family: 'medium', mk: 1 }], time: 200, truckHpShare: 0.8,
    };
    for (const [id, b] of Object.entries(BONUSES)) {
      expect(b.test(base), id).toBe(true);
      expect(b.text.length, id).toBeGreaterThan(5);
    }
    const bad: MatchReport = { ...base, won: false, playerAlive: false, kills: 0, victims: [], intelCount: 0, usedKit: true, stormDamage: 9, hullsUsed: ['medium'], picks: [], time: 400, truckHpShare: 0.2 };
    for (const [id, b] of Object.entries(BONUSES)) expect(b.test(bad), id).toBe(false);
  });
});
