import { describe, expect, it } from 'vitest';
import { ch1Level } from '../src/content/ch1/levels';
import type { LoadedLevel } from '../src/logic/level/load';
import { hitTank, killTank } from '../src/logic/match/combat';
import { Match } from '../src/logic/match/match';
import { breakStructure } from '../src/logic/match/movement';
import { IDLE, type Tank } from '../src/logic/match/types';
import { CREW } from '../src/logic/objectives/targets';
import { STARTER_LOADOUT } from '../src/logic/parts';
import type { Pt } from '../src/logic/vec';
import { CAPTURE, CHASE, fixture, load, POINTS, RECON } from './fixtures/levels';

const make = (level: LoadedLevel, seed = 1) => new Match({ level, seed, player: { loadout: STARTER_LOADOUT } });
const steps = (m: Match, seconds: number) => {
  for (let i = 0; i < seconds * 30 && !m.over; i++) m.step(1 / 30, IDLE);
};
const put = (t: Tank, p: Pt) => Object.assign(t, { x: p.x, y: p.y, speed: 0 });
const foes = (m: Match) => m.tanks.filter((t) => t.team !== 0);
/** Enemies that can't reach or hurt the player in a unit test. */
const freeze = (m: Match) => m.brains.clear();

describe('every objective reports a HUD line and a target', () => {
  it('for all ten chapter 1 levels and the fixtures', () => {
    const all = [...Array.from({ length: 10 }, (_, i) => ch1Level(i + 1)), load(RECON), load(CAPTURE), load(CHASE)];
    for (const l of all) {
      const s = make(l).objective.status();
      expect(s.text.length, l.def.name).toBeGreaterThan(5);
      expect(s.done || s.failed, l.def.name).toBeFalsy();
      expect(make(l).objective.title.length).toBeGreaterThan(5);
    }
  });
});

describe('assault, ace, fortress', () => {
  it('assault: done when every enemy tank is destroyed', () => {
    const m = make(ch1Level(1));
    freeze(m);
    expect(m.objective.status().text).toBe('Tanks destroyed 0/4');
    for (const t of foes(m)) killTank(m, t, m.player, 'cannon');
    m.step(1 / 30);
    expect(m.over?.passed).toBe(true);
  });
  it('assault: timed waves still to come count', () => {
    const m = make(load(fixture({ kind: 'assault' }, [{ role: 'guard', clan: 'boars', tank: 'machinegun1/light1/wheels1', at: 'b' }, { role: 'wave', clan: 'boars', tank: 'machinegun1/light1/wheels1', at: 'far', when: 2 }])));
    freeze(m);
    killTank(m, foes(m)[0]!, m.player, 'cannon');
    m.step(1 / 30);
    expect(m.over).toBeNull();
    expect(m.objective.status().text).toBe('Tanks destroyed 1/2');
    steps(m, 2.1);
    expect(foes(m).filter((t) => t.alive)).toHaveLength(1);
  });
  it('ace: done on the kill, and its intel is taken at once', () => {
    const m = make(ch1Level(5));
    freeze(m);
    const ace = m.tanks.find((t) => t.ace)!;
    expect(ace.name).toBe('Sly');
    killTank(m, ace, m.player, 'machinegun');
    m.step(1 / 30);
    expect(m.over?.passed).toBe(true);
    expect(Object.values(m.intel).reduce((s, n) => s + (n ?? 0), 0)).toBeGreaterThan(20);
  });
  it('fortress: the hull is shielded while turrets stand', () => {
    const m = make(ch1Level(10));
    const boss = m.tanks.find((t) => t.role === 'boss')!;
    const before = boss.hp;
    hitTank(m, boss, 100, 'rockets', m.player!.id);
    const shielded = before - boss.hp;
    expect(m.objective.status().text).toContain('turrets 0/4');
    for (const t of m.tanks) if (t.parent === boss.id) killTank(m, t, m.player, 'rockets');
    const mid = boss.hp;
    hitTank(m, boss, 100, 'rockets', m.player!.id);
    expect(mid - boss.hp).toBeGreaterThan(shielded * 3);
    expect(m.objective.status().text).toContain('hull');
    killTank(m, boss, m.player, 'rockets');
    m.step(1 / 30);
    expect(m.over?.passed).toBe(true);
  });
});

describe('raid and rescue', () => {
  it('raid: counts broken targets', () => {
    const m = make(ch1Level(2));
    freeze(m);
    const targets = m.structs.map((s, i) => [s, i] as const).filter(([s]) => s.def.tag === 'target');
    expect(targets).toHaveLength(3);
    breakStructure(m, targets[0]![1]);
    expect(m.objective.status().text).toBe('Fuel stacks 1/3');
    for (const [, i] of targets) breakStructure(m, i);
    m.step(1 / 30);
    expect(m.over?.passed).toBe(true);
  });
  const rescueLevel = load(fixture({ kind: 'rescue', tag: 'cage', home: 'a' }, [], { structures: [{ kind: 'cage', x: 1500, y: 800, tag: 'cage' }, { kind: 'cage', x: 1500, y: 300, tag: 'cage' }] }));
  it('rescue: a broken cage frees a crew that follows you; crews home win', () => {
    const m = make(rescueLevel);
    const p = m.player!;
    put(p, { x: 1300, y: 800 });
    expect(m.objective.staged()).toBe(false);
    m.structs.forEach((s, i) => s.def.tag === 'cage' && breakStructure(m, i));
    m.step(1 / 30);
    expect(m.objective.staged()).toBe(true);
    const crews = m.tanks.filter((t) => t.role === 'crew');
    expect(crews).toHaveLength(2);
    const d0 = Math.hypot(crews[0]!.x - p.x, crews[0]!.y - p.y);
    steps(m, 2);
    expect(Math.hypot(crews[0]!.x - p.x, crews[0]!.y - p.y)).toBeLessThan(d0);
    for (const c of crews) put(c, POINTS.a!);
    m.step(1 / 30);
    expect(m.over?.passed).toBe(true);
  });
  it('rescue: losing a crew fails', () => {
    const m = make(rescueLevel);
    m.structs.forEach((s, i) => s.def.tag === 'cage' && breakStructure(m, i));
    m.step(1 / 30);
    killTank(m, m.tanks.find((t) => t.role === 'crew')!, null, 'cannon');
    m.step(1 / 30);
    expect(m.over).toMatchObject({ passed: false, reason: 'a crew was lost' });
    expect(CREW.hp).toBeGreaterThan(0);
  });
});

describe('escort, ambush, chase', () => {
  it('escort: the truck drives only with you near; losing it fails', () => {
    const m = make(ch1Level(3));
    freeze(m);
    const truck = m.tanks.find((t) => t.role === 'truck' && t.team === 0)!;
    const x0 = truck.x;
    put(m.player!, { x: 3800, y: 100 });
    steps(m, 2);
    expect(truck.x).toBeCloseTo(x0, 0);
    put(m.player!, truck);
    steps(m, 3);
    expect(truck.x).toBeGreaterThan(x0 + 20);
    expect(m.objective.truckHpShare()).toBe(1);
    killTank(m, truck, null, 'cannon');
    m.step(1 / 30);
    expect(m.over).toMatchObject({ passed: false, reason: 'the truck was destroyed' });
  });
  it('ambush: a truck reaching the exit fails; stopping all wins', () => {
    const lose = make(ch1Level(7));
    lose.escape(lose.tanks.find((t) => lose.brains.get(t.id)?.role === 'convoy')!);
    lose.step(1 / 30);
    expect(lose.over).toMatchObject({ passed: false, reason: 'the convoy got away' });
    const win = make(ch1Level(7));
    for (const t of win.tanks) if (win.brains.get(t.id)?.role === 'convoy') killTank(win, t, win.player, 'cannon');
    win.step(1 / 30);
    expect(win.over?.passed).toBe(true);
  });
  it('chase: the courier drives its road and gets away at its base', () => {
    const m = make(load(CHASE));
    const r = m.tanks.find((t) => t.name === 'Dart')!;
    put(m.player!, { x: 100, y: 1000 });
    steps(m, 60);
    expect(r.escaped).toBe(true);
    expect(m.over).toMatchObject({ passed: false, reason: 'the courier got away' });
    const win = make(load(CHASE));
    killTank(win, win.tanks.find((t) => t.name === 'Dart')!, win.player, 'machinegun');
    win.step(1 / 30);
    expect(win.over?.passed).toBe(true);
  });
});

describe('hold, capture, recon', () => {
  it('hold: the clock runs only while you are in the zone', () => {
    const m = make(load(fixture({ kind: 'hold', zone: 'mid', radius: 200, seconds: 3 })));
    steps(m, 1);
    expect(m.objective.status().text).toContain('0/3');
    put(m.player!, POINTS.mid!);
    steps(m, 3.2);
    expect(m.over?.passed).toBe(true);
  });
  it('capture: take every flag, enemies take them back, hold them all to win', () => {
    const m = make(load(CAPTURE));
    freeze(m);
    const enemy = foes(m)[0]!;
    put(enemy, { x: 1900, y: 1050 });
    const p = m.player!;
    put(p, POINTS.a!);
    steps(m, 2.2);
    expect(m.objective.status().text).toBe('Flags held 1/3');
    put(p, POINTS.d!);
    put(enemy, POINTS.a!);
    steps(m, 2.2);
    // a went back to them while you took d.
    expect(m.objective.status().text).toBe('Flags held 1/3');
    killTank(m, enemy, p, 'machinegun');
    for (const k of ['a', 'b']) {
      put(p, POINTS[k]!);
      steps(m, 2.2);
    }
    expect(m.objective.status().text).toContain('All flags held');
    steps(m, 2.2);
    expect(m.over?.passed).toBe(true);
  });
  it('recon: scouting needs to be unseen; being seen raises the alarm and calls reinforcements', () => {
    const m = make(load(RECON));
    const p = m.player!;
    put(p, POINTS.a!);
    steps(m, 1.2);
    expect(m.objective.status().text).toContain('1/3');
    expect(m.alarm.firstAt).toBeNull();
    put(p, POINTS.b!);
    steps(m, 1.2);
    expect(m.objective.status().text).toContain('1/3');
    expect(m.alarm.firstAt).not.toBeNull();
    expect(m.pendingWaves()).toBe(0);
    expect(m.over).toBeNull();
  });
});

describe('salvage and breakout', () => {
  it('salvage: picking up the prototype stages the waves; the pick-up wins', () => {
    const m = make(ch1Level(8));
    const p = m.player!;
    const proto = m.pickups.find((x) => x.kind === 'proto')!;
    const waves = m.pendingWaves();
    put(p, proto);
    m.step(1 / 30, IDLE);
    expect(p.carrying).toBe(true);
    m.step(1 / 30, IDLE);
    expect(m.pendingWaves()).toBe(waves - 2);
    put(p, m.point('pickup'));
    m.step(1 / 30, IDLE);
    expect(m.over?.passed).toBe(true);
  });
  it('breakout: artillery marks then lands; the exit wins, the timer fails', () => {
    const def = fixture({ kind: 'breakout', exit: 'far', artillery: { every: 1, radius: 60, damage: 50, warn: 0.5 } }, [], { timeLimit: 4 });
    const m = make(load(def));
    const p = m.player!;
    steps(m, 1.1);
    expect(m.objective.marks().some((k) => k.kind === 'artillery')).toBe(true);
    const hp = p.hp;
    steps(m, 0.6);
    expect(p.hp).toBeLessThan(hp);
    steps(m, 3);
    expect(m.over).toMatchObject({ passed: false, reason: 'time' });
    const win = make(load(def));
    put(win.player!, POINTS.far!);
    win.step(1 / 30);
    expect(win.over?.passed).toBe(true);
  });
});
