import { createBrain } from '../bots/brain';
import type { ObjectiveDef } from '../level/types';
import type { Match } from '../match/match';
import { addTank, ENEMY_TEAM } from '../match/spawn';
import { mergeIntel } from '../intel';
import { tankStats } from '../stats';
import { angleTo } from '../vec';
import { BASE, nearest, type Objective } from './types';

/** Assault: destroy every enemy tank in the area (timed waves still to come count too). */
export function assault(m: Match): Objective {
  const foes = () => m.tanks.filter((t) => t.team !== 0 && t.role === 'tank');
  return {
    ...BASE,
    kind: 'assault',
    title: 'Destroy every enemy tank',
    step: () => undefined,
    status: () => {
      const all = foes();
      const left = all.filter((t) => t.alive);
      const total = all.length + m.pendingWaves(true);
      const done = left.length === 0 && m.pendingWaves(true) === 0;
      return { text: `Tanks destroyed ${total - left.length - m.pendingWaves(true)}/${total}`, target: m.player ? nearest(m.player, left) : null, done, failed: null };
    },
    playerHint: (t) => {
      const n = nearest(t, foes().filter((o) => o.alive));
      return n ? { goal: n, goalRadius: t.stats.gun.range * 0.6, target: n.id } : null;
    },
  };
}

/** Ace: destroy the named ace. Its intel is taken on the kill, so it can't be lost. */
export function ace(m: Match): Objective {
  const theAce = () => m.tanks.find((t) => t.ace && t.team !== 0) ?? null;
  return {
    ...BASE,
    kind: 'ace',
    title: `Destroy ${theAce()?.name ?? 'the ace'}`,
    step: () => {
      const a = theAce();
      if (!a || a.alive) return;
      for (const p of m.pickups) {
        if (p.kind !== 'intel' || !p.ace || p.taken) continue;
        p.taken = true;
        m.intel = mergeIntel(m.intel, p.bag);
      }
    },
    status: () => {
      const a = theAce();
      return { text: a ? `Destroy ${a.name}, the ${a.crew} ace` : 'Destroy the ace', target: a?.alive ? a : null, done: !!a && !a.alive, failed: null };
    },
    playerHint: (t) => {
      const a = theAce();
      return a?.alive ? { goal: a, goalRadius: t.stats.gun.range * 0.6, target: a.id } : null;
    },
  };
}

/** Fortress guns are slow to reload: the boss is a puzzle of angles, not a wall of fire. */
const BOSS_RELOAD = 1.8;

/** Fortress: break the boss's turrets (its hull is shielded while any stand), then the hull. */
export function fortress(m: Match, def: Extract<ObjectiveDef, { kind: 'fortress' }>): Objective {
  const b = def.boss;
  const road = m.road(b.road);
  const body = addTank(m, { name: b.name, clan: 'boars', team: ENEMY_TEAM, role: 'boss', loadout: { gun: { family: 'cannon', mk: 2 }, hull: { family: 'heavy', mk: 2 }, drive: { family: 'tracks', mk: 2 } }, at: road[0]!, heading: angleTo(road[0]!, road[1]!) });
  body.stats = { ...body.stats, maxHp: b.hp, speed: b.speed, radius: 70, armour: 14 };
  body.hp = b.hp;
  for (const tu of b.turrets) {
    const t = addTank(m, { name: `${b.name} ${tu.gun}`, clan: 'boars', team: ENEMY_TEAM, role: 'bossTurret', loadout: { gun: { family: tu.gun, mk: 1 }, hull: { family: 'heavy', mk: 1 }, drive: { family: 'tracks', mk: 1 } }, at: road[0]! });
    const st = tankStats(t.loadout);
    t.stats = { ...st, maxHp: tu.hp, radius: 22, gun: { ...st.gun, reload: st.gun.reload * BOSS_RELOAD } };
    t.hp = tu.hp;
    t.parent = body.id;
    t.mount = { dx: tu.dx, dy: tu.dy };
    m.brains.set(t.id, createBrain(t, null, m.difficulty, m.rng.fork(t.id)));
    // Turrets fight from where they sit, with a turret's eyes.
    Object.assign(m.brains.get(t.id)!, { role: 'turret', sight: 460 });
  }
  let roadI = 1;
  const turrets = () => m.tanks.filter((t) => t.parent === body.id);
  return {
    ...BASE,
    kind: 'fortress',
    title: `Destroy the ${b.name}`,
    step: () => undefined,
    status: () => {
      const tu = turrets();
      const up = tu.filter((t) => t.alive).length;
      const text = up > 0 ? `${b.name}: turrets ${tu.length - up}/${tu.length}` : `${b.name}: break the hull ${Math.ceil((body.hp / b.hp) * 100)}%`;
      return { text, target: body.alive ? body : null, done: !body.alive, failed: null };
    },
    playerHint: (t) => {
      if (!body.alive) return null;
      const turret = nearest(t, turrets().filter((x) => x.alive));
      return { goal: body, goalRadius: t.stats.gun.range * 0.75, target: (turret ?? body).id };
    },
    drive: (t) => {
      if (t.id !== body.id) return null;
      const next = road[roadI % road.length]!;
      if (Math.hypot(next.x - t.x, next.y - t.y) < 50) roadI++;
      return { move: { kind: 'point', angle: angleTo(t, next), mag: 1 }, aim: null, fire: false, swap: false, repair: false };
    },
  };
}
