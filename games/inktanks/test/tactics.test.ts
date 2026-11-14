import { describe, expect, it } from 'vitest';
import { AWARE, sense } from '../src/logic/bots/awareness';
import { think } from '../src/logic/bots/brain';
import { TELEGRAPH } from '../src/logic/bots/control';
import { allyInLine, canSee, hidden, LOW_PASS, shotBlocker, shotHits, SPOT_NEAR } from '../src/logic/bots/perception';
import { damageTaken } from '../src/logic/damage';
import type { EnemyDef, StructPlace } from '../src/logic/level/types';
import { aimAndFire, AMBUSH, hitTank } from '../src/logic/match/combat';
import { Match } from '../src/logic/match/match';
import { IDLE, type MatchEvent, type Tank } from '../src/logic/match/types';
import { STARTER_LOADOUT } from '../src/logic/parts';
import { fixture, load } from './fixtures/levels';

const SCOUT = 'machinegun1/light1/wheels1';
const GUARD = (x: number, y: number, extra: Partial<EnemyDef> = {}): EnemyDef => ({ role: 'guard', clan: 'boars', tank: SCOUT, at: { x, y }, ...extra });
const make = (enemies: EnemyDef[], structures: StructPlace[] = []) =>
  new Match({ level: load(fixture({ kind: 'assault' }, enemies, { structures })), seed: 5, player: { loadout: STARTER_LOADOUT } });
const foes = (m: Match): Tank[] => m.tanks.filter((t) => t.team !== 0);
const put = (t: Tank, x: number, y: number) => Object.assign(t, { x, y });
const brain = (m: Match, t: Tank) => m.brains.get(t.id)!;
const steps = (m: Match, s: number, input = IDLE) => {
  const ev: MatchEvent[] = [];
  for (let i = 0; i < Math.round(s * 60) && !m.over; i++) {
    m.step(1 / 60, input);
    ev.push(...m.drainEvents());
  }
  return ev;
};

describe('sight', () => {
  it('walls block sight; low cover and open ground do not', () => {
    const m = make([GUARD(1000, 540)], [{ kind: 'wallStoneV', x: 900, y: 540 }, { kind: 'sandbagsV', x: 900, y: 200 }]);
    const [g] = foes(m);
    const p = m.player!;
    put(p, 780, 540);
    expect(canSee(m, g!, p)).toBe(false);
    put(p, 780, 200);
    put(g!, 1000, 200);
    expect(canSee(m, g!, p)).toBe(true);
  });
  it('a calm bot sees only in its cone; within SPOT_NEAR it notices you any way round', () => {
    const m = make([GUARD(1000, 540)]);
    const [g] = foes(m);
    g!.turret = Math.PI; // looking west
    const p = m.player!;
    put(p, 750, 540);
    expect(canSee(m, g!, p, 340, AWARE.cone)).toBe(true);
    put(p, 1250, 540);
    expect(canSee(m, g!, p, 340, AWARE.cone)).toBe(false);
    put(p, 1000 + SPOT_NEAR - 5, 540);
    expect(canSee(m, g!, p, 340, AWARE.cone)).toBe(true);
  });
  it('a bush hides you unless an enemy is within 60 px or you fired in the last 2 s', () => {
    const m = make([GUARD(1000, 540)], [{ kind: 'bush', x: 900, y: 540 }]);
    const [g] = foes(m);
    const p = m.player!;
    put(p, 900, 540);
    expect(hidden(m, p)).toBe(true);
    expect(canSee(m, g!, p)).toBe(false);
    put(g!, 900 + SPOT_NEAR - 4, 540);
    expect(canSee(m, g!, p)).toBe(true);
    put(g!, 1000, 540);
    p.firedAt = m.t;
    expect(canSee(m, g!, p)).toBe(true);
  });
});

describe('alert states', () => {
  it('calm → ? on a glimpse → ! when still seen after the confirm; then back to ? and calm', () => {
    const m = make([GUARD(1000, 540)]);
    const [g] = foes(m);
    const b = brain(m, g!);
    g!.turret = Math.PI;
    put(m.player!, 760, 540);
    expect(b.aware).toBe('calm');
    expect(sense(m, b, g!)).toEqual([]);
    expect(b.aware).toBe('suspicious');
    m.t += AWARE.confirm / 2;
    sense(m, b, g!);
    expect(b.aware).toBe('suspicious');
    m.t += AWARE.confirm;
    expect(sense(m, b, g!)).toContain(m.player);
    expect(b.aware).toBe('alert');
    expect(m.tactics.spotted).toBe(1);
    put(m.player!, 100, 100);
    m.t += AWARE.forget + 0.1;
    sense(m, b, g!);
    expect(b.aware).toBe('suspicious');
    m.t += AWARE.suspect + 0.1;
    sense(m, b, g!);
    expect(b.aware).toBe('calm');
  });
  it('duck back before the confirm and it calms down without spotting you', () => {
    const m = make([GUARD(1000, 540)]);
    const [g] = foes(m);
    const b = brain(m, g!);
    g!.turret = Math.PI;
    put(m.player!, 760, 540);
    sense(m, b, g!);
    put(m.player!, 100, 100);
    m.t += AWARE.suspect + 0.1;
    sense(m, b, g!);
    expect(b.aware).toBe('calm');
    expect(m.tactics.spotted).toBe(0);
  });
  it('hears a shot within 300 px behind it (suspicious of that spot), not farther', () => {
    const m = make([GUARD(1000, 540)]);
    const [g] = foes(m);
    const b = brain(m, g!);
    g!.turret = Math.PI;
    const p = m.player!;
    put(p, 1350, 540);
    p.firedAt = m.t;
    sense(m, b, g!);
    expect(b.aware).toBe('calm');
    put(p, 1250, 540);
    sense(m, b, g!);
    expect(b.aware).toBe('suspicious');
    expect(b.awareSpot).toEqual({ x: 1250, y: 540 });
  });
  it('only an alert bot raises the alarm', () => {
    const m = make([GUARD(1000, 540)]);
    const [g] = foes(m);
    const b = brain(m, g!);
    g!.turret = Math.PI;
    put(m.player!, 760, 540);
    think(m, b, g!);
    expect(b.aware).toBe('suspicious');
    expect(m.alarm.firstAt).toBeNull();
    m.t += AWARE.confirm + 0.05;
    think(m, b, g!);
    expect(b.aware).toBe('alert');
    expect(m.alarm.firstAt).not.toBeNull();
  });
});

describe('ambush', () => {
  it('a hit on a calm or suspicious enemy does ×2 and alerts it; the next hit is normal', () => {
    const m = make([GUARD(1000, 540, { hpMult: 5 })]);
    const [g] = foes(m);
    const p = m.player!;
    const base = damageTaken(10, 'machinegun', g!.stats.drive, g!.stats.armour);
    const hp0 = g!.hp;
    hitTank(m, g!, 10, 'machinegun', p.id);
    expect(hp0 - g!.hp).toBeCloseTo(base * AMBUSH);
    expect(brain(m, g!).aware).toBe('alert');
    const ev = m.drainEvents().filter((e) => e.kind === 'ambush');
    expect(ev).toHaveLength(1);
    const hp1 = g!.hp;
    hitTank(m, g!, 10, 'machinegun', p.id);
    expect(hp1 - g!.hp).toBeCloseTo(base);
    expect(m.tactics.ambushHits).toBe(1);
  });
});

describe('low cover', () => {
  it(`a shot passes over low cover in its first ${LOW_PASS} px; farther on, the cover stops it`, () => {
    const near = make([{ role: 'turret', clan: 'boars', tank: SCOUT, at: { x: 900, y: 540 }, hpMult: 20 }], [{ kind: 'sandbagsV', x: 640, y: 540 }]);
    const p = near.player!;
    put(p, 600, 540);
    const [tu] = foes(near);
    expect(shotBlocker(near, 600, 540, 900, 540)).toBeNull();
    const hp0 = tu!.hp;
    steps(near, 0.6, { ...IDLE, aim: 0, fire: true });
    expect(tu!.hp).toBeLessThan(hp0);
    expect(near.structs[0]!.hp).toBe(near.structs[0]!.def.hp);

    const far = make([{ role: 'turret', clan: 'boars', tank: SCOUT, at: { x: 900, y: 540 }, hpMult: 20 }], [{ kind: 'sandbagsV', x: 840, y: 540 }]);
    put(far.player!, 600, 540);
    const [tu2] = foes(far);
    expect(shotBlocker(far, 600, 540, 900, 540)?.def.kind).toBe('sandbagsV');
    const hp2 = tu2!.hp;
    steps(far, 0.6, { ...IDLE, aim: 0, fire: true });
    expect(tu2!.hp).toBe(hp2);
    expect(far.structs[0]!.hp).toBeLessThan(far.structs[0]!.def.hp);
  });
  it('high cover blocks shots both ways', () => {
    const m = make([GUARD(900, 540)], [{ kind: 'wallStoneV', x: 630, y: 540 }]);
    expect(shotBlocker(m, 600, 540, 900, 540)?.def.kind).toBe('wallStoneV');
    expect(shotBlocker(m, 900, 540, 600, 540)?.def.kind).toBe('wallStoneV');
  });
});

describe('bots and cover', () => {
  it('one bot shoots the sandbags you hide behind; the other flanks', () => {
    const m = make([GUARD(900, 480), GUARD(900, 600)], [{ kind: 'sandbagsV', x: 700, y: 540 }]);
    const p = m.player!;
    put(p, 660, 540);
    const [a, b] = foes(m);
    for (const t of [a!, b!]) {
      const br = brain(m, t);
      br.aware = 'alert';
      br.alertUntil = m.t + 10;
      think(m, br, t);
    }
    const shooters = [a!, b!].filter((t) => brain(m, t).coverShot !== null);
    expect(shooters).toHaveLength(1);
    const s = brain(m, shooters[0]!);
    expect(s.coverShot!.id).toBe(m.structs[0]!.def.id);
    const other = [a!, b!].find((t) => t !== shooters[0])!;
    expect(brain(m, other).state).toBe('fight');
    expect(brain(m, other).los).toBe(false);
  });
  it('behind a wall it loses you: no target, no shots, it drives to where it last saw you', () => {
    const m = make([{ role: 'guard', clan: 'boars', tank: 'cannon1/light1/wheels1', at: { x: 1000, y: 540 } }], [{ kind: 'wallBrickV', x: 700, y: 540 }]);
    const p = m.player!;
    const [g] = foes(m);
    const b = brain(m, g!);
    b.aware = 'alert';
    b.alertUntil = m.t + 10;
    put(p, 760, 540);
    think(m, b, g!);
    expect(b.target).toBe(p.id);
    put(p, 650, 540);
    m.t += 0.5;
    think(m, b, g!);
    expect(b.target).toBeNull();
    expect(b.coverShot).toBeNull();
    expect(b.state).toBe('goal');
    expect(b.goal).toMatchObject({ x: 760, y: 540 });
  });
});

describe('telegraph', () => {
  it(`a Cannon bot shows its aim line ${TELEGRAPH} s before it fires; a Machinegun bot doesn't`, () => {
    const m = make([{ role: 'turret', clan: 'boars', tank: 'cannon1/light1/wheels1', at: { x: 700, y: 540 } }]);
    const p = Object.assign(m.player!, { x: 450, y: 540, hp: 1e6 });
    const [tu] = foes(m);
    const b = brain(m, tu!);
    Object.assign(b, { aware: 'alert', alertUntil: 1e9, diff: { ...b.diff, hesitate: 0, aimError: 0 } });
    let aimAt: number | null = null;
    let firedAt: number | null = null;
    for (let i = 0; i < 60 * 4 && firedAt === null; i++) {
      m.step(1 / 60, IDLE);
      for (const e of m.drainEvents()) {
        if (e.kind === 'aim' && e.tank === tu!.id && aimAt === null) aimAt = m.t;
        if (e.kind === 'fire' && e.tank === tu!.id) firedAt = m.t;
      }
    }
    expect(aimAt).not.toBeNull();
    expect(firedAt).not.toBeNull();
    expect(firedAt! - aimAt!).toBeGreaterThanOrEqual(TELEGRAPH - 1e-6);
    expect(firedAt! - aimAt!).toBeLessThan(TELEGRAPH + 0.05);
    expect(p.alive).toBe(true);

    const mg = make([{ role: 'turret', clan: 'boars', tank: SCOUT, at: { x: 700, y: 540 } }]);
    Object.assign(mg.player!, { x: 500, y: 540, hp: 1e6 });
    const [t2] = foes(mg);
    Object.assign(brain(mg, t2!), { aware: 'alert', alertUntil: 1e9 });
    const ev = steps(mg, 3);
    expect(ev.some((e) => e.kind === 'fire' && e.tank === t2!.id)).toBe(true);
    expect(ev.some((e) => e.kind === 'aim')).toBe(false);
  });
});

describe('friendly fire', () => {
  it("an enemy's shot stops at a friend in its way and hurts it", () => {
    const m = make([GUARD(1000, 540, { role: 'turret', hpMult: 20 }), GUARD(860, 540, { role: 'turret', hpMult: 20 })]);
    const [a, b] = foes(m);
    put(m.player!, 400, 540);
    const hp0 = b!.hp;
    for (let i = 0; i < 30; i++) aimAndFire(m, a!, { ...IDLE, aim: Math.PI, fire: true }, 1 / 60);
    const ev = steps(m, 0.4);
    expect(b!.hp).toBeLessThan(hp0);
    expect(ev.some((e) => e.kind === 'friendly' && e.target === b!.id)).toBe(true);
  });

  it('a bot holds fire with a friend in its line; clear of it, it fires', () => {
    const m = make([GUARD(1000, 540), GUARD(860, 540)]);
    const [a, b] = foes(m);
    const p = m.player!;
    put(p, 600, 540);
    expect(allyInLine(m, a!, p.x, p.y)).toBe(true);
    put(b!, 860, 700);
    expect(allyInLine(m, a!, p.x, p.y)).toBe(false);
    expect(allyInLine(m, p, a!.x, a!.y)).toBe(false);
  });

  it("the player's shots pass through its own side; a fortress never hits itself", () => {
    const m = make([GUARD(1000, 540), GUARD(860, 540)]);
    const [a, b] = foes(m);
    const p = m.player!;
    const truck = { ...p, id: 9001, isPlayer: false, role: 'truck' } as Tank;
    expect(shotHits(p, 0, truck)).toBe(false);
    expect(shotHits(p, 0, a!)).toBe(true);
    expect(shotHits(a!, a!.team, b!)).toBe(true);
    expect(shotHits(a!, a!.team, a!)).toBe(false);
    const turret = { ...b!, parent: a!.id } as Tank;
    expect(shotHits(turret, a!.team, a!)).toBe(false);
    expect(shotHits(a!, a!.team, turret)).toBe(false);
  });
});
