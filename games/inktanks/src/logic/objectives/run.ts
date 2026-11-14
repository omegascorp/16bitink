import { damageTaken } from '../damage';
import type { ObjectiveDef } from '../level/types';
import { killTank } from '../match/combat';
import type { Match } from '../match/match';
import type { Pt } from '../vec';
import { BASE, dist, type Mark, type Objective } from './types';

const PICKUP_RADIUS = 90;
/** Share of the warning time's travel the artillery leads you by. */
export const ARTILLERY_LEAD = 0.6;
/** While you carry the prototype, enemies are told where you are this often. */
const CALL_EVERY = 1.5;

/** Salvage: take the crashed prototype to the pick-up. Carrying it slows you, and every enemy comes for it. */
export function salvage(m: Match, def: Extract<ObjectiveDef, { kind: 'salvage' }>): Objective {
  const at = m.point(def.at);
  const pickup = m.point(def.pickup);
  const proto = m.addPickup({ kind: 'proto' }, at.x, at.y);
  let delivered = false;
  let callT = 0;
  const carrying = () => !!m.player?.carrying;
  return {
    ...BASE,
    kind: 'salvage',
    title: 'Bring the prototype to the pick-up',
    step: (dt) => {
      const p = m.player;
      if (!p?.carrying) return;
      if (dist(p, pickup) < PICKUP_RADIUS) delivered = true;
      callT -= dt;
      if (callT > 0) return;
      callT = CALL_EVERY;
      for (const b of m.brains.values()) if (b.role === 'guard' || b.role === 'patrol') b.alert = { x: p.x, y: p.y, until: m.t + CALL_EVERY + 1 };
    },
    status: () => ({ text: carrying() ? 'Bring the prototype to the pick-up' : 'Find the crashed prototype', target: carrying() ? pickup : at, done: delivered, failed: null }),
    staged: carrying,
    playerHint: () => (proto.taken ? { goal: pickup, goalRadius: 30, urgent: true } : { goal: proto, goalRadius: 4 }),
    foeHint: () => (carrying() && m.player ? { goal: m.player, goalRadius: 200, target: m.player.id } : null),
    marks: () => [{ kind: 'pickup', x: pickup.x, y: pickup.y, r: PICKUP_RADIUS }],
  };
}

interface Shell extends Pt {
  readonly at: number;
}

/**
 * Breakout: reach the exit before the level's timer runs out. Artillery
 * (optional) marks a spot just ahead of you every few seconds and lands
 * there after a warning; it hurts anything in the ring.
 */
export function breakout(m: Match, def: Extract<ObjectiveDef, { kind: 'breakout' }>): Objective {
  const exit = m.point(def.exit);
  const r = def.radius ?? 110;
  const art = def.artillery;
  let shells: Shell[] = [];
  let nextMark = art ? art.every : Infinity;
  let out = false;
  return {
    ...BASE,
    kind: 'breakout',
    title: 'Reach the exit before the timer runs out',
    step: () => {
      const p = m.player;
      if (!p?.alive) return;
      if (dist(p, exit) < r) out = true;
      if (!art) return;
      if (m.t >= nextMark) {
        nextMark = m.t + art.every;
        // Aimed short of where you'd be: keep driving and it lands behind you; stop and it lands on you.
        const lead = art.warn * Math.max(0, p.speed) * ARTILLERY_LEAD;
        const s = { x: p.x + Math.cos(p.heading) * lead + m.rng.range(-50, 50), y: p.y + Math.sin(p.heading) * lead + m.rng.range(-50, 50), at: m.t + art.warn };
        shells = [...shells, s];
        m.emit({ kind: 'mark', x: s.x, y: s.y, r: art.radius, at: s.at });
      }
      const landed = shells.filter((s) => m.t >= s.at);
      if (landed.length === 0) return;
      shells = shells.filter((s) => m.t < s.at);
      for (const s of landed) {
        m.emit({ kind: 'explode', x: s.x, y: s.y, r: art.radius });
        for (const t of m.tanks) {
          if (!t.alive || t.role === 'boss' || t.role === 'bossTurret' || dist(t, s) > art.radius + t.stats.radius) continue;
          t.hp -= damageTaken(art.damage, 'cannon', t.stats.drive, t.stats.armour);
          if (t.hp <= 0) killTank(m, t, null, 'artillery');
        }
      }
    },
    status: () => ({ text: out ? 'Out!' : `Reach the exit: ${Math.round((m.player ? dist(m.player, exit) : 0) / 10)} m`, target: exit, done: out, failed: null }),
    playerHint: () => ({ goal: exit, goalRadius: 20, urgent: true, run: true }),
    marks: () => [{ kind: 'exit', x: exit.x, y: exit.y, r }, ...shells.map((s): Mark => ({ kind: 'artillery', x: s.x, y: s.y, r: art!.radius, progress: 1 - (s.at - m.t) / art!.warn }))],
  };
}
