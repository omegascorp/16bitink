import { describe, expect, it } from 'vitest';
import { CH1_LAND } from '../src/content/ch1/land';
import { CH1_MISSIONS, ch1Mission } from '../src/content/ch1/missions';
import { hitTank, killTank } from '../src/logic/match/combat';
import { Match } from '../src/logic/match/match';
import { matchReport } from '../src/logic/match/report';
import { swapIn } from '../src/logic/match/pickups';
import { IDLE } from '../src/logic/match/types';
import { applyOutcome, outcome } from '../src/logic/mission/outcome';
import { BONUSES } from '../src/logic/mission/bonus';
import { part, STARTER_LOADOUT } from '../src/logic/parts';
import { newProgress } from '../src/logic/workshop';
import { XP } from '../src/logic/rank';

const make = (level: number, seed = 5, bot = true) => new Match({ land: CH1_LAND, mission: ch1Mission(level), seed, player: { loadout: STARTER_LOADOUT }, playerBot: bot });
const run = (m: Match, max = 900) => {
  while (!m.over && m.t < max) m.step(1 / 30);
  return m;
};

describe('a match', () => {
  it('is deterministic for a seed', () => {
    const a = run(make(1, 11));
    const b = run(make(1, 11));
    expect(a.t).toBe(b.t);
    expect(a.tanks.map((t) => [t.x, t.hp])).toEqual(b.tanks.map((t) => [t.x, t.hp]));
  });

  it('every chapter 1 mission plays to an end', { timeout: 60_000 }, () => {
    for (const def of CH1_MISSIONS) {
      const m = run(make(def.level, 3));
      expect(m.over, `level ${def.level}`).not.toBeNull();
      const r = matchReport(m);
      expect(r.level).toBe(def.level);
      expect(r.placement).toBeGreaterThanOrEqual(1);
    }
  });

  it('a bots-only royale ends with one tank', () => {
    const m = run(new Match({ land: CH1_LAND, mission: ch1Mission(1), seed: 2, player: null }));
    expect(m.aliveTanks()).toBeLessThanOrEqual(1);
    expect(() => matchReport(m)).toThrow();
  });

  it('drops, drives and fires from player input', () => {
    const m = make(1, 1, false);
    const p = m.player!;
    for (let i = 0; i < 100; i++) m.step(1 / 30, IDLE);
    expect(p.dropT).toBe(0);
    const x0 = p.x;
    const y0 = p.y;
    for (let i = 0; i < 30; i++) m.step(1 / 30, { move: { kind: 'tank', throttle: 1, turn: 0.3 }, aim: 0, fire: true, swap: false, repair: false });
    expect(Math.hypot(p.x - x0, p.y - y0)).toBeGreaterThan(20);
    expect(p.shotsFired).toBeGreaterThan(3);
    for (let i = 0; i < 20; i++) m.step(1 / 30, { move: { kind: 'point', angle: 2, mag: 1 }, aim: null, fire: false, swap: false, repair: false });
    expect(m.drainEvents().some((e) => e.kind === 'fire')).toBe(true);
  });

  it('swaps parts keeping the HP share, repairs, and leaves a wreck with intel', () => {
    const m = make(1, 4, false);
    const p = m.player!;
    p.dropT = 0;
    p.hp = p.stats.maxHp / 2;
    const pick = m.addPickup({ kind: 'part', part: part('medium', 2) }, p.x, p.y);
    swapIn(m, p, pick.id);
    expect(p.loadout.hull).toEqual(part('medium', 2));
    expect(p.hp / p.stats.maxHp).toBeCloseTo(0.5);
    expect(m.pickups.some((x) => x.kind === 'part' && x.part.family === 'light' && !x.taken)).toBe(true);
    m.step(1 / 30, { ...IDLE, repair: true });
    expect(p.kits).toBe(0);
    for (let i = 0; i < 70; i++) m.step(1 / 30, IDLE);
    expect(p.hp / p.stats.maxHp).toBeCloseTo(0.9, 1);
    const foe = m.tanks.find((t) => !t.isPlayer)!;
    hitTank(m, foe, 10, 'cannon', p.id);
    expect(foe.lastHitBy).toBe(p.id);
    killTank(m, foe, p, 'cannon');
    expect(p.kills).toBe(1);
    expect(m.pickups.some((x) => x.kind === 'intel' && x.from === foe.name)).toBe(true);
  });

  it('holds swap to swap, and only the player collects intel', () => {
    const m = make(1, 6, false);
    const p = m.player!;
    for (let i = 0; i < 100; i++) m.step(1 / 30, IDLE);
    m.addPickup({ kind: 'intel', bag: { cannon: 2 }, from: 'x', ace: false }, p.x, p.y);
    m.addPickup({ kind: 'part', part: part('cannon', 2) }, p.x, p.y);
    for (let i = 0; i < 20; i++) m.step(1 / 30, { ...IDLE, swap: true });
    expect(m.intel.cannon).toBeGreaterThanOrEqual(2);
    expect(p.loadout.gun).toEqual(part('cannon', 2));
  });

  it('the storm hurts outside the circle', () => {
    const m = make(1, 8, false);
    const p = m.player!;
    p.dropT = 0;
    m.t = m.storm.end - 1;
    const hp = p.hp;
    m.step(1, IDLE);
    expect(p.stormDamage).toBeGreaterThan(0);
    expect(p.hp).toBeLessThan(hp);
  });

  it('breaks structures with brick-breakers, not with a machinegun', () => {
    const m = make(2, 1, false);
    const i = m.structs.findIndex((s) => s.def.material === 'brick');
    const s = m.structs[i]!;
    const p = m.player!;
    p.dropT = 0;
    for (let k = 0; k < 20; k++) m.shots.push({ id: 9000 + k, owner: p.id, team: 0, x: s.def.x, y: s.def.y - 200, vx: 0, vy: 600, travelled: 0, range: 400, damage: 6, gun: 'machinegun', splash: 0, breaksBrick: false, kind: 'tracer', alive: true });
    for (let k = 0; k < 30; k++) m.step(1 / 30, IDLE);
    expect(s.hp).toBe(s.def.hp);
    m.shots.push({ id: 9999, owner: p.id, team: 0, x: s.def.x, y: s.def.y - 150, vx: 0, vy: 600, travelled: 0, range: 400, damage: 400, gun: 'rockets', splash: 20, breaksBrick: true, kind: 'rocket', alive: true });
    for (let k = 0; k < 30; k++) m.step(1 / 30, IDLE);
    expect(s.state).toBe(0);
  });
});

describe('objectives and medals', () => {
  it('sets up each mission type', () => {
    expect(make(4).objective.truckId).not.toBeNull();
    expect(make(5).objective.aceId).not.toBeNull();
    expect(make(7).objective.zone?.r).toBe(220);
    expect(make(8).objective.protoId).not.toBeNull();
    const fort = make(10);
    expect(fort.tanks.filter((t) => t.parent === fort.objective.bossId)).toHaveLength(4);
    expect(make(2).objective.targets.length).toBeGreaterThanOrEqual(3);
  });

  it('the boss is shielded while its turrets stand', () => {
    const m = make(10, 1, false);
    const boss = m.tank(m.objective.bossId!)!;
    const before = boss.hp;
    hitTank(m, boss, 100, 'rockets', m.player!.id);
    const shielded = before - boss.hp;
    for (const t of m.tanks) if (t.parent === boss.id) killTank(m, t, m.player, 'rockets');
    const mid = boss.hp;
    hitTank(m, boss, 100, 'rockets', m.player!.id);
    expect(mid - boss.hp).toBeGreaterThan(shielded * 3);
    killTank(m, boss, m.player, 'rockets');
    m.step(1 / 30, IDLE);
    expect(m.over?.passed).toBe(true);
  });

  it('medals only add up, objective XP is paid once, intel is kept win or lose', () => {
    const def = ch1Mission(1);
    const m = run(make(1, 5));
    const r = { ...matchReport(m), passedMain: true, kills: 3, intel: { cannon: 2 } as const, intelCount: 2 };
    const o1 = outcome(def, r, undefined);
    expect(o1.done[0]).toBe(true);
    expect(o1.xp).toBe(XP.main + XP.firstWin + 3 * XP.kill + (o1.done[1] ? XP.bonus : 0) + (o1.done[2] ? XP.bonus : 0));
    const again = outcome(def, r, o1.medals);
    expect(again.xp).toBe(3 * XP.kill);
    const lost = applyOutcome(newProgress(), def, { ...r, passedMain: false });
    expect(lost.outcome.medals).toEqual([false, false, false]);
    expect(lost.progress.intel.cannon).toBe(2);
    expect(BONUSES.lightOnly.test({ ...r, hullsUsed: ['light'] })).toBe(true);
    expect(BONUSES.truck75.test({ ...r, truckHpShare: 0.5 })).toBe(false);
  });
});
