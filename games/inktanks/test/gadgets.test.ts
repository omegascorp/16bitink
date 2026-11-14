import { describe, expect, it } from 'vitest';
import { canSee, hidden } from '../src/logic/bots/perception';
import type { EnemyDef, StructPlace } from '../src/logic/level/types';
import { GADGET_SHARE, rollCrate } from '../src/logic/loot';
import { GADGET } from '../src/logic/match/gadgets';
import { useGadget } from '../src/logic/match/gadgetUse';
import { Match } from '../src/logic/match/match';
import { driveTank } from '../src/logic/match/movement';
import { touchPickups } from '../src/logic/match/pickups';
import { IDLE, type GadgetKind, type Tank } from '../src/logic/match/types';
import { STARTER_LOADOUT } from '../src/logic/parts';
import { createRng } from '../src/logic/rng';
import { newSave, parseSave, serializeSave } from '../src/logic/save';
import { LOOT_EARLY } from '../src/content/ch1/levels/kit';
import { fixture, load } from './fixtures/levels';

const SCOUT = 'machinegun1/light1/wheels1';
/** A dummy that can't see or shoot: a turret far from everything, set alert so no ambush ×2. */
const dummy = (x: number, y: number): EnemyDef => ({ role: 'turret', clan: 'boars', tank: SCOUT, at: { x, y }, hpMult: 3 });
const make = (gadget: GadgetKind | null, enemies: EnemyDef[] = [dummy(1800, 1000)], structures: StructPlace[] = []) =>
  new Match({ level: load(fixture({ kind: 'assault' }, enemies, { structures })), seed: 7, player: { loadout: STARTER_LOADOUT, gadget } });
const foes = (m: Match): Tank[] => m.tanks.filter((t) => t.team !== 0);
const put = (t: Tank, x: number, y: number) => Object.assign(t, { x, y, speed: 0 });
const steps = (m: Match, s: number) => {
  for (let i = 0; i < Math.round(s * 60) && !m.over; i++) m.step(1 / 60, IDLE);
};
const alert = (m: Match, t: Tank) => Object.assign(m.brains.get(t.id)!, { aware: 'alert', alertUntil: 1e9 });

describe('the gadget slot', () => {
  it('2 charges a level; one press, one use; none without a slot', () => {
    const m = make('smoke');
    const p = m.player!;
    expect(p.gadgetCharges).toBe(GADGET.charges);
    expect(useGadget(m, p)).toBe(true);
    expect(useGadget(m, p)).toBe(false);
    m.t += GADGET.cooldown;
    expect(useGadget(m, p)).toBe(true);
    m.t += GADGET.cooldown;
    expect(useGadget(m, p)).toBe(false);
    expect(p.gadgetCharges).toBe(0);
    expect(p.gadgetsUsed).toBe(2);
    const none = make(null);
    expect(useGadget(none, none.player!)).toBe(false);
  });
  it('the briefing can change the gadget before the start', () => {
    const m = make('mines');
    m.setPlayerGadget('oil');
    expect(m.player!.gadget).toBe('oil');
    expect(m.player!.gadgetCharges).toBe(GADGET.charges);
  });
  it('crates roll a gadget charge now and then; the pickup tops you up to the max', () => {
    const rng = createRng(3);
    const rolls = Array.from({ length: 1000 }, () => rollCrate(rng, LOOT_EARLY));
    const share = rolls.filter((r) => r.kind === 'gadget').length / rolls.length;
    expect(share).toBeGreaterThan(GADGET_SHARE * (1 - LOOT_EARLY.kitShare) * 0.6);
    expect(share).toBeLessThan(GADGET_SHARE * 1.4);
    const m = make('mines');
    const p = m.player!;
    for (let i = 0; i < GADGET.max; i++) {
      m.addPickup({ kind: 'gadget' }, p.x, p.y);
      touchPickups(m, p, IDLE, 1 / 60, false);
    }
    expect(p.gadgetCharges).toBe(GADGET.max);
    expect(m.pickups.filter((x) => x.kind === 'gadget' && !x.taken)).toHaveLength(GADGET.charges);
  });
});

describe('mines', () => {
  it('arm after 1 s, go off under an enemy within 28 px: 90 damage, 40 px splash, a broken track', () => {
    const m = make('mines', [dummy(1500, 300), dummy(1500, 900)]);
    const p = m.player!;
    put(p, 600, 540);
    p.heading = 0;
    const [a, b] = foes(m);
    alert(m, a!);
    alert(m, b!);
    useGadget(m, p);
    const mine = m.gadgets.mines[0]!;
    put(p, 300, 540);
    put(a!, mine.x + 20, mine.y);
    put(b!, mine.x, mine.y + 40 + b!.stats.radius - 4);
    const [hpA, hpB] = [a!.hp, b!.hp];
    steps(m, 0.5);
    expect(mine.alive).toBe(true);
    expect(a!.hp).toBe(hpA);
    steps(m, 0.6);
    expect(mine.alive).toBe(false);
    expect(hpA - a!.hp).toBeCloseTo(GADGET.mine.damage);
    expect(hpB - b!.hp).toBeCloseTo(GADGET.mine.damage / 2);
    expect(a!.trackBrokenUntil).toBeGreaterThan(m.t + GADGET.mine.slowFor - 0.6);
  });
  it('a broken track halves speed; your own mines never go off under you', () => {
    const m = make('mines', [dummy(1500, 300)]);
    const p = m.player!;
    put(p, 600, 540);
    useGadget(m, p);
    steps(m, 1.2);
    put(p, m.gadgets.mines[0]!.x, m.gadgets.mines[0]!.y);
    steps(m, 0.2);
    expect(m.gadgets.mines[0]!.alive).toBe(true);
    const drive = (broken: boolean): number => {
      const mm = make(null);
      const q = mm.player!;
      put(q, 400, 540);
      q.heading = 0;
      if (broken) q.trackBrokenUntil = 99;
      for (let i = 0; i < 60; i++) mm.step(1 / 60, { ...IDLE, move: { kind: 'point', angle: 0, mag: 1 } });
      return q.x - 400;
    };
    expect(drive(true)).toBeLessThan(drive(false) * 0.6);
  });
  it('only bots that watched it laid know it is there', () => {
    const m = make('mines', [{ role: 'guard', clan: 'boars', tank: SCOUT, at: { x: 900, y: 540 } }, { role: 'guard', clan: 'boars', tank: SCOUT, at: { x: 900, y: 200 } }], [{ kind: 'wallStoneV', x: 700, y: 230 }, { kind: 'wallStoneV', x: 700, y: 170 }]);
    const p = m.player!;
    put(p, 600, 540);
    const [watcher, blind] = foes(m);
    watcher!.turret = Math.PI;
    alert(m, watcher!);
    alert(m, blind!);
    put(p, 600, 200);
    useGadget(m, p);
    put(p, 600, 540);
    m.t += GADGET.cooldown;
    useGadget(m, p);
    const [m1, m2] = m.gadgets.mines;
    expect(m1!.known.has(blind!.id)).toBe(false);
    expect(m2!.known.has(watcher!.id)).toBe(true);
  });
});

describe('oil and smoke', () => {
  it('oil: enemies in it crawl at ×0.4 and turn badly; the player is safe in its own slick', () => {
    const GO = { ...IDLE, move: { kind: 'point' as const, angle: 0, mag: 1 } };
    const run = (oil: boolean, who: 'enemy' | 'player'): { moved: number; turned: number } => {
      const m = make('oil', [dummy(1700, 900)]);
      const p = m.player!;
      put(p, 600, 300);
      p.heading = Math.PI;
      if (oil) useGadget(m, p);
      const t = who === 'enemy' ? foes(m)[0]! : p;
      if (who === 'enemy') put(p, 100, 100);
      put(t, 600, 300);
      t.heading = 0;
      // Held in the slick's middle for 1 s: the speed it settles at.
      for (let i = 0; i < 60; i++) {
        driveTank(m, t, GO, 1 / 60);
        Object.assign(t, { x: 600, y: 300 });
      }
      const moved = t.speed;
      t.heading = 0;
      t.speed = 0;
      put(t, 600, 300);
      for (let i = 0; i < 10; i++) driveTank(m, t, { ...IDLE, move: { kind: 'point', angle: Math.PI / 2, mag: 1 } }, 1 / 60);
      return { moved, turned: t.heading };
    };
    const [slick, dry] = [run(true, 'enemy'), run(false, 'enemy')];
    expect(slick.moved).toBeLessThan(dry.moved * 0.6);
    expect(slick.turned).toBeLessThan(dry.turned * 0.5);
    expect(run(true, 'player').moved).toBeCloseTo(run(false, 'player').moved, 3);
  });
  it('smoke: blocks sight both ways, hides a tank inside, and clears after 6 s', () => {
    const m = make('smoke', [{ role: 'guard', clan: 'boars', tank: SCOUT, at: { x: 900, y: 540 } }]);
    const p = m.player!;
    put(p, 600, 540);
    const [g] = foes(m);
    expect(canSee(m, g!, p)).toBe(true);
    useGadget(m, p);
    expect(hidden(m, p)).toBe(true);
    expect(canSee(m, g!, p)).toBe(false);
    expect(canSee(m, p, g!)).toBe(false);
    // Out of the cloud, behind it: still hidden from the guard.
    put(p, 500, 540);
    expect(hidden(m, p)).toBe(false);
    expect(canSee(m, g!, p)).toBe(false);
    m.t += GADGET.smoke.life + 0.1;
    expect(canSee(m, g!, p)).toBe(true);
  });
});

describe('the save', () => {
  it('keeps the gadget; a missing or bad one gives the default', () => {
    const s = { ...newSave(), gadget: 'smoke' as const };
    expect(parseSave(serializeSave(s)).save.gadget).toBe('smoke');
    const old = JSON.parse(serializeSave(s)) as Record<string, unknown>;
    delete old.gadget;
    expect(parseSave(JSON.stringify(old)).save.gadget).toBe('mines');
    expect(parseSave(JSON.stringify({ ...old, gadget: 'nuke' })).save.gadget).toBe('mines');
    expect(parseSave(JSON.stringify({ ...old, gadget: 'nuke' })).problem).toBeNull();
  });
});
