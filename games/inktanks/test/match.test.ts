import { describe, expect, it } from 'vitest';
import { ch1Level } from '../src/content/ch1/levels';
import { bonusMet, bonusText } from '../src/logic/mission/bonus';
import { hitTank, killTank } from '../src/logic/match/combat';
import { Match } from '../src/logic/match/match';
import { matchReport, type MatchReport } from '../src/logic/match/report';
import { swapIn } from '../src/logic/match/pickups';
import { IDLE } from '../src/logic/match/types';
import { applyOutcome, outcome } from '../src/logic/mission/outcome';
import type { BonusDef } from '../src/logic/level/types';
import { part, STARTER_LOADOUT } from '../src/logic/parts';
import { newProgress } from '../src/logic/workshop';
import { XP } from '../src/logic/rank';

const make = (level: number, seed = 5, bot = true) => new Match({ level: ch1Level(level), seed, player: { loadout: STARTER_LOADOUT }, playerBot: bot });
const run = (m: Match) => {
  while (!m.over) m.step(1 / 30);
  return m;
};

describe('a match', () => {
  it('starts at the level start, is deterministic for a seed, and always ends', () => {
    const a = make(1, 11);
    expect([a.player!.x, a.player!.y]).toEqual([ch1Level(1).start.x, ch1Level(1).start.y]);
    run(a);
    const b = run(make(1, 11));
    expect(a.t).toBe(b.t);
    expect(a.tanks.map((t) => [t.x, t.hp])).toEqual(b.tanks.map((t) => [t.x, t.hp]));
  });

  it('places the level: its enemies, crates and no others', () => {
    const m = make(2);
    expect(m.tanks.filter((t) => t.team !== 0)).toHaveLength(ch1Level(2).enemies.length);
    expect(m.pickups.filter((p) => p.kind === 'crate')).toHaveLength(ch1Level(2).crates.length);
  });

  it('drives in the direction pressed and fires from player input', () => {
    const m = make(1, 1, false);
    const p = m.player!;
    const x0 = p.x;
    const y0 = p.y;
    for (let i = 0; i < 40; i++) m.step(1 / 30, { move: { kind: 'point', angle: 0, mag: 1 }, aim: 0, fire: true, swap: false, repair: false });
    expect(p.x - x0).toBeGreaterThan(40);
    expect(Math.abs(p.y - y0)).toBeLessThan(40);
    expect(p.shotsFired).toBeGreaterThan(3);
    expect(m.drainEvents().some((e) => e.kind === 'fire')).toBe(true);
  });

  it('swaps parts keeping the HP share, repairs, and leaves a wreck with intel', () => {
    const m = make(1, 4, false);
    const p = m.player!;
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
    m.addPickup({ kind: 'intel', bag: { cannon: 2 }, from: 'x', ace: false }, p.x, p.y);
    m.addPickup({ kind: 'part', part: part('cannon', 2) }, p.x, p.y);
    for (let i = 0; i < 20; i++) m.step(1 / 30, { ...IDLE, swap: true });
    expect(m.intel.cannon).toBeGreaterThanOrEqual(2);
    expect(p.loadout.gun).toEqual(part('cannon', 2));
  });

  it('breaks structures with brick-breakers, not with a machinegun', () => {
    const m = make(2, 1, false);
    const s = m.structs.find((x) => x.def.material === 'brick' && x.def.hp > 0)!;
    const p = m.player!;
    for (let k = 0; k < 20; k++) m.shots.push({ id: 9000 + k, owner: p.id, team: 0, x: s.def.x, y: s.def.y - 200, vx: 0, vy: 600, travelled: 0, range: 400, damage: 6, gun: 'machinegun', splash: 0, breaksBrick: false, kind: 'tracer', alive: true });
    for (let k = 0; k < 30; k++) m.step(1 / 30, IDLE);
    expect(s.hp).toBe(s.def.hp);
    m.shots.push({ id: 9999, owner: p.id, team: 0, x: s.def.x, y: s.def.y - 150, vx: 0, vy: 600, travelled: 0, range: 400, damage: 400, gun: 'rockets', splash: 20, breaksBrick: true, kind: 'rocket', alive: true });
    for (let k = 0; k < 30; k++) m.step(1 / 30, IDLE);
    expect(s.state).toBe(0);
  });

  it('fails when the player is destroyed, and when the timer runs out', () => {
    const m = make(1, 2, false);
    killTank(m, m.player!, null, 'cannon');
    m.step(1 / 30);
    expect(m.over).toMatchObject({ passed: false, reason: 'destroyed' });
    const t = make(9, 2, false);
    expect(t.timeLeft()).toBe(150);
    // Enemies idle and armour on: standing still under artillery would end it first.
    t.brains.clear();
    t.player!.hp = 1e9;
    while (!t.over) t.step(1, IDLE);
    expect(t.over).toMatchObject({ passed: false, reason: 'time' });
    expect(make(1).timeLeft()).toBeNull();
  });
});

describe('medals and bonuses', () => {
  const base: MatchReport = {
    level: 1, passedMain: true, reason: 'objective', playerAlive: true, kills: 5, victims: [{ hull: 'heavy', drive: 'tracks', gun: 'cannon', by: 'rockets' }],
    intel: { cannon: 10 }, intelCount: 10, usedKit: false, alarm: false, hullsUsed: ['light'], picks: [part('cannon'), part('medium')], time: 100, truckHpShare: 0.8,
  };
  const bad: MatchReport = { ...base, kills: 0, victims: [], intelCount: 0, usedKit: true, alarm: true, picks: [], time: 400, truckHpShare: 0.2 };
  const all: BonusDef[] = [{ kind: 'kills', n: 3 }, { kind: 'noKit' }, { kind: 'time', under: 180 }, { kind: 'noAlarm' }, { kind: 'truckHp', min: 0.5 }, { kind: 'heavyWithRockets' }, { kind: 'swaps', n: 2 }, { kind: 'intel', n: 6 }];
  it('each bonus kind tests its own condition', () => {
    for (const b of all) {
      expect(bonusMet(b, base), b.kind).toBe(true);
      expect(bonusMet(b, bad), b.kind).toBe(false);
      expect(bonusText(b).length, b.kind).toBeGreaterThan(5);
    }
    expect(bonusText({ kind: 'time', under: 180 })).toBe('Pass in under 3:00');
  });
  it('medals only add up, objective XP is paid once, intel is kept win or lose', () => {
    const def = ch1Level(1).def;
    const r = { ...matchReport(run(make(1, 5))), passedMain: true, kills: 3, intel: { cannon: 2 } as const, intelCount: 2 };
    const o1 = outcome(def, r, undefined);
    expect(o1.done[0]).toBe(true);
    expect(o1.xp).toBe(XP.main + XP.firstWin + 3 * XP.kill + (o1.done[1] ? XP.bonus : 0) + (o1.done[2] ? XP.bonus : 0));
    expect(outcome(def, r, o1.medals).xp).toBe(3 * XP.kill);
    const lost = applyOutcome(newProgress(), def, { ...r, passedMain: false });
    expect(lost.outcome.medals).toEqual([false, false, false]);
    expect(lost.progress.intel.cannon).toBe(2);
  });
});
