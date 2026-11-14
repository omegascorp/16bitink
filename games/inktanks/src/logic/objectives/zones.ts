import { canSee, VISION } from '../bots/perception';
import type { ObjectiveDef } from '../level/types';
import type { Match } from '../match/match';
import type { Tank } from '../match/types';
import type { Pt } from '../vec';
import { BASE, dist, nearest, type Mark, type Objective } from './types';

const inside = (t: Tank, c: Pt, r: number) => t.alive && dist(t, c) <= r;

/** Hold: stay in the zone for N seconds in all (the clock pauses when you leave); waves head for the zone. */
export function hold(m: Match, def: Extract<ObjectiveDef, { kind: 'hold' }>): Objective {
  const zone = m.point(def.zone);
  let held = 0;
  return {
    ...BASE,
    kind: 'hold',
    title: `Hold the zone for ${def.seconds} s`,
    step: (dt) => {
      if (m.player && inside(m.player, zone, def.radius)) held += dt;
    },
    status: () => ({ text: `Hold: ${Math.floor(held)}/${def.seconds} s${m.player && !inside(m.player, zone, def.radius) ? ' (get in the ring)' : ''}`, target: zone, done: held >= def.seconds, failed: null }),
    playerHint: () => ({ goal: zone, goalRadius: def.radius * 0.45, stay: true, urgent: true }),
    foeHint: () => ({ goal: zone, goalRadius: def.radius * 0.5 }),
    marks: () => [{ kind: 'zone', x: zone.x, y: zone.y, r: def.radius, progress: Math.min(1, held / def.seconds) }],
  };
}

interface Flag extends Pt {
  /** -1 theirs … +1 ours. */
  hold: number;
}

/**
 * Capture: take the flags and hold them all at once. A flag moves towards
 * whoever stands alone in its ring (contested: no change); enemies send
 * waves and hunters to the nearest flag that isn't theirs.
 */
export function capture(m: Match, def: Extract<ObjectiveDef, { kind: 'capture' }>): Objective {
  const r = def.radius ?? 140;
  const takes = def.capture ?? 6;
  const holdAll = def.holdAll ?? 5;
  const flags: Flag[] = def.flags.map((k) => ({ ...m.point(k), hold: -1 }));
  let allFor = 0;
  const ours = () => flags.filter((f) => f.hold >= 1).length;
  return {
    ...BASE,
    kind: 'capture',
    title: `Take all ${flags.length} flags and hold them`,
    step: (dt) => {
      for (const f of flags) {
        const us = m.tanks.some((t) => t.team === 0 && t.role === 'tank' && inside(t, f, r));
        const them = m.tanks.some((t) => t.team !== 0 && t.role === 'tank' && inside(t, f, r));
        if (us !== them) f.hold = Math.max(-1, Math.min(1, f.hold + ((us ? 1 : -1) * 2 * dt) / takes));
      }
      allFor = ours() === flags.length ? allFor + dt : 0;
    },
    status: () => {
      const n = ours();
      const next = m.player ? nearest(m.player, flags.filter((f) => f.hold < 1)) : null;
      const text = n === flags.length ? `All flags held: ${Math.floor(allFor)}/${holdAll} s` : `Flags held ${n}/${flags.length}`;
      return { text, target: next, done: allFor >= holdAll, failed: null };
    },
    playerHint: (t) => {
      const next = nearest(t, flags.filter((f) => f.hold < 1));
      return next ? { goal: next, goalRadius: r * 0.4, stay: true, urgent: true } : { goal: nearest(t, flags)!, goalRadius: r * 0.5, stay: true };
    },
    foeHint: (t) => {
      const next = nearest(t, flags.filter((f) => f.hold > -1));
      return next ? { goal: next, goalRadius: r * 0.4, stay: true } : null;
    },
    marks: () => flags.map((f): Mark => ({ kind: 'flag', x: f.x, y: f.y, r, state: f.hold >= 1 ? 'ours' : f.hold <= -1 ? 'theirs' : 'neutral', progress: (f.hold + 1) / 2 })),
  };
}

/**
 * Recon: get within range of each spot and stay there unseen for a moment.
 * Being seen isn't a fail: guards that spot you raise the alarm, which calls
 * the level's 'alarm' waves (reinforcements).
 */
export function recon(m: Match, def: Extract<ObjectiveDef, { kind: 'recon' }>): Objective {
  const r = def.radius ?? 150;
  const dwell = def.dwell ?? 2;
  const spots = def.spots.map((k) => ({ ...m.point(k), t: 0 }));
  const seen = (p: Tank): boolean => {
    for (const [id, b] of m.brains) {
      const e = m.tank(id);
      if (!e?.alive || e.team === 0) continue;
      const alerted = b.alert !== null && m.t < b.alert.until;
      if (canSee(m, e, p, alerted ? VISION : b.sight)) return true;
    }
    return false;
  };
  let spotted = false;
  return {
    ...BASE,
    kind: 'recon',
    title: `Scout ${spots.length} spots without being seen`,
    step: (dt) => {
      const p = m.player;
      if (!p?.alive) return;
      spotted = seen(p);
      for (const s of spots) if (s.t < dwell && inside(p, s, r) && !spotted) s.t = Math.min(dwell, s.t + dt);
    },
    status: () => {
      const done = spots.filter((s) => s.t >= dwell).length;
      const next = m.player ? nearest(m.player, spots.filter((s) => s.t < dwell)) : null;
      return { text: `Spots scouted ${done}/${spots.length}${spotted ? ' (you are seen!)' : ''}`, target: next, done: done === spots.length, failed: null };
    },
    playerHint: (t) => {
      const next = nearest(t, spots.filter((s) => s.t < dwell));
      return next ? { goal: next, goalRadius: r * 0.4, sneak: true, urgent: true } : null;
    },
    marks: () => spots.map((s): Mark => ({ kind: 'spot', x: s.x, y: s.y, r, state: s.t >= dwell ? 'done' : 'neutral', progress: s.t / dwell })),
  };
}
