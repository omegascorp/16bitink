import { describe, expect, it } from 'vitest';
import { ALARM_RADIUS } from '../src/logic/bots/difficulty';
import { hitTank } from '../src/logic/match/combat';
import { Match } from '../src/logic/match/match';
import { IDLE, type Tank } from '../src/logic/match/types';
import { STARTER_LOADOUT } from '../src/logic/parts';
import { fixture, load } from './fixtures/levels';

const SCOUT = 'machinegun1/light1/wheels1';
const make = (enemies: Parameters<typeof fixture>[1], objective: Parameters<typeof fixture>[0] = { kind: 'assault' }) =>
  new Match({ level: load(fixture(objective, enemies)), seed: 3, player: { loadout: STARTER_LOADOUT } });
const steps = (m: Match, seconds: number) => {
  for (let i = 0; i < seconds * 30 && !m.over; i++) m.step(1 / 30, IDLE);
};
const role = (m: Match, r: string): Tank => m.tanks.find((t) => m.brains.get(t.id)?.role === r)!;
const far = (m: Match) => Object.assign(m.player!, { x: 60, y: 1050 });

describe('bot roles', () => {
  it('a guard sits at its post, a turret never moves, a patrol drives its route', () => {
    const m = make([
      { role: 'guard', clan: 'boars', tank: SCOUT, at: 'b' },
      { role: 'turret', clan: 'boars', tank: SCOUT, at: 'c' },
      { role: 'patrol', clan: 'boars', tank: SCOUT, at: 'a', route: 'line' },
    ]);
    far(m);
    const g = role(m, 'guard');
    const tu = role(m, 'turret');
    const pa = role(m, 'patrol');
    const [g0, t0, p0] = [{ ...g }, { ...tu }, { ...pa }];
    steps(m, 6);
    expect(Math.hypot(g.x - g0.x, g.y - g0.y)).toBeLessThan(30);
    expect(Math.hypot(tu.x - t0.x, tu.y - t0.y)).toBe(0);
    expect(Math.hypot(pa.x - p0.x, pa.y - p0.y)).toBeGreaterThan(300);
  });
  it('a convoy drives its road and leaves by the exit, without a wreck', () => {
    const m = make([{ role: 'convoy', clan: 'boars', tank: SCOUT, at: 'a', route: 'line', truck: true }, { role: 'guard', clan: 'boars', tank: SCOUT, at: 'far' }], { kind: 'ambush', mayEscape: 1 });
    far(m);
    const c = role(m, 'convoy');
    steps(m, 40);
    expect(c.escaped).toBe(true);
    expect(m.pickups.some((p) => p.kind === 'part')).toBe(false);
  });
  it('a hunter comes for you wherever you are', () => {
    const m = make([{ role: 'hunter', clan: 'boars', tank: SCOUT, at: 'far' }]);
    const h = role(m, 'hunter');
    const d0 = Math.hypot(h.x - m.player!.x, h.y - m.player!.y);
    steps(m, 4);
    expect(Math.hypot(h.x - m.player!.x, h.y - m.player!.y)).toBeLessThan(d0 - 300);
  });
});

describe('the alarm', () => {
  it('a guard that is hit calls the guards near it, not the far ones, and alarm waves arrive', () => {
    const m = make([
      { role: 'guard', clan: 'boars', tank: SCOUT, at: { x: 1500, y: 300 } },
      { role: 'guard', clan: 'boars', tank: SCOUT, at: { x: 1500, y: 300 + ALARM_RADIUS - 60 } },
      { role: 'guard', clan: 'boars', tank: SCOUT, at: { x: 200, y: 200 } },
      { role: 'wave', clan: 'boars', tank: SCOUT, at: 'far', when: 'alarm' },
    ]);
    far(m);
    const [a, near, away] = m.tanks.filter((t) => m.brains.get(t.id)?.role === 'guard');
    steps(m, 1);
    expect(m.alarm.firstAt).toBeNull();
    expect(m.pendingWaves()).toBe(1);
    hitTank(m, a!, 5, 'machinegun', m.player!.id);
    steps(m, 1);
    expect(m.alarm.firstAt).not.toBeNull();
    expect(m.brains.get(near!.id)!.alert).not.toBeNull();
    expect(m.brains.get(away!.id)!.alert).toBeNull();
    expect(m.pendingWaves()).toBe(0);
  });
  it('sneaking past: an unalerted guard spots you only within its sight', () => {
    const m = make([{ role: 'guard', clan: 'boars', tank: SCOUT, at: 'mid', sight: 200 }]);
    const g = role(m, 'guard');
    Object.assign(m.player!, { x: g.x - 320, y: g.y });
    steps(m, 2);
    expect(m.alarm.firstAt).toBeNull();
    Object.assign(m.player!, { x: g.x - 150, y: g.y });
    steps(m, 1);
    expect(m.alarm.firstAt).not.toBeNull();
  });
});
