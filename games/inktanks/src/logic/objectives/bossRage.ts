import { BOSS_STUN_MULT, hitTank } from '../match/combat';
import type { Match } from '../match/match';
import { moveBy } from '../match/movement';
import { IDLE, type Tank, type TankInput } from '../match/types';
import { angleTo, wrapAngle, type Pt } from '../vec';
import type { Hint } from './types';

/**
 * The fortress boss's second phase (owner, Nov 14: "once you destroy all
 * towers the boss is useless"). With its turrets gone the hull is enraged:
 * it drives its ring faster and, whenever it sees you, swings round, shows
 * its charge lane, and rams down it with its tusks. A charge that ends in a
 * wall stuns it and it takes extra damage, so the fight is about baiting
 * charges into the fort walls and shooting while it's dazed.
 */
export const RAGE = {
  roamSpeed: 46,
  chargeSpeed: 330,
  /** Longest charge, s. */
  chargeTime: 1.6,
  /** The lane shows this long before it charges, s. */
  rev: 1.3,
  /** Longest it spends swinging round to face you, s. */
  turnFor: 3,
  /** Between charges, s. */
  every: 4,
  /** It only charges at you within this, with a clear line. */
  reach: 760,
  ramDamage: 70,
  stun: 3,
  /** Damage taken while stunned, × (combat.ts applies it from stunnedUntil). */
  stunMult: BOSS_STUN_MULT,
  recover: 1.2,
  /** Lane width, as a share of the hull's radius each side. */
  lane: 0.85,
} as const;

type State =
  | { readonly kind: 'roam'; readonly next: number }
  | { readonly kind: 'turn'; readonly until: number }
  | { readonly kind: 'rev'; readonly angle: number; readonly until: number }
  | { readonly kind: 'charge'; readonly angle: number; readonly until: number; readonly since: number; readonly hit: ReadonlySet<number> }
  | { readonly kind: 'stun'; readonly until: number }
  | { readonly kind: 'recover'; readonly until: number };

export interface Rage {
  /** Advances the phase; call each step once the turrets are down. */
  step(dt: number): void;
  /** The body's input while enraged; `road` is its ring drive. */
  drive(road: () => TankInput): TankInput;
  /** The player's stand-in: step out of the lane while it revs or charges. */
  dodge(t: Tank): Hint | null;
  readonly charging: () => boolean;
}

export function bossRage(m: Match, body: Tank): Rage {
  let s: State = { kind: 'roam', next: m.t + 1.5 };
  let last: { x: number; y: number; speed: number } = { x: body.x, y: body.y, speed: 0 };
  const setSpeed = (v: number): void => {
    if (body.stats.speed !== v) body.stats = { ...body.stats, speed: v };
  };
  setSpeed(RAGE.roamSpeed);
  m.emit({ kind: 'boss', what: 'enraged', x: body.x, y: body.y });

  const prey = (): Tank | null => {
    const p = m.player;
    if (!p?.alive || Math.hypot(p.x - body.x, p.y - body.y) > RAGE.reach) return null;
    return m.lineBlocker(body.x, body.y, p.x, p.y, null) ? null : p;
  };

  const startCharge = (angle: number): void => {
    setSpeed(RAGE.chargeSpeed);
    s = { kind: 'charge', angle, until: m.t + RAGE.chargeTime, since: m.t, hit: new Set() };
    m.emit({ kind: 'boss', what: 'charge', x: body.x, y: body.y });
  };
  const stop = (next: State): void => {
    setSpeed(next.kind === 'roam' ? RAGE.roamSpeed : 0);
    body.speed = Math.min(body.speed, next.kind === 'stun' ? 0 : body.speed);
    s = next;
  };

  /** Rams every tank in its way: damage once per charge, and shoves them clear of the tusks. */
  const ram = (c: Extract<State, { kind: 'charge' }>): void => {
    const reach = body.stats.radius * 0.8;
    const hit = new Set(c.hit);
    for (const o of m.tanks) {
      if (o === body || !o.alive || o.parent === body.id || o.role === 'bossTurret') continue;
      const dx = o.x - body.x;
      const dy = o.y - body.y;
      const d = Math.hypot(dx, dy) || 1;
      const need = reach + o.stats.radius * 0.8;
      if (d >= need) continue;
      // Shove it out of the hull, mostly sideways off the lane so it isn't carried along.
      const side = Math.sign(Math.cos(c.angle) * dy - Math.sin(c.angle) * dx) || 1;
      const px = Math.cos(c.angle + side * Math.PI / 2) * 0.7 + (dx / d) * 0.3;
      const py = Math.sin(c.angle + side * Math.PI / 2) * 0.7 + (dy / d) * 0.3;
      moveBy(m, o, px * (need - d + 6), py * (need - d + 6));
      if (hit.has(o.id)) continue;
      hit.add(o.id);
      o.speed = 0;
      m.emit({ kind: 'boss', what: 'ram', x: o.x, y: o.y });
      hitTank(m, o, RAGE.ramDamage, 'cannon', body.id, true);
    }
    s = { ...c, hit };
  };

  return {
    charging: () => s.kind === 'rev' || s.kind === 'charge',
    step: (dt) => {
      if (!body.alive) return;
      const moved = Math.hypot(body.x - last.x, body.y - last.y);
      const expected = last.speed * dt;
      switch (s.kind) {
        case 'roam':
          if (m.t >= s.next && prey()) s = { kind: 'turn', until: m.t + RAGE.turnFor };
          break;
        case 'turn': {
          const p = m.player;
          const a = p ? angleTo(body, p) : body.heading;
          if (!p?.alive) stop({ kind: 'roam', next: m.t + RAGE.every });
          else if (Math.abs(wrapAngle(a - body.heading)) < 0.07 || m.t >= s.until) {
            const until = m.t + RAGE.rev;
            s = { kind: 'rev', angle: body.heading, until };
            m.emit({ kind: 'aim', tank: body.id, angle: body.heading, len: RAGE.chargeSpeed * RAGE.chargeTime * 0.8, until, width: body.stats.radius * RAGE.lane * 2, dur: RAGE.rev });
          }
          break;
        }
        case 'rev':
          if (m.t >= s.until) startCharge(s.angle);
          break;
        case 'charge': {
          ram(s);
          // Ran into something solid at speed: a wall stops it dead and dazes it.
          const blocked = m.t - s.since > 0.3 && expected > 60 * dt && moved < expected * 0.4;
          if (blocked) {
            stop({ kind: 'stun', until: m.t + RAGE.stun });
            body.stunnedUntil = m.t + RAGE.stun;
            m.emit({ kind: 'boss', what: 'stunned', x: body.x, y: body.y });
          } else if (m.t >= s.until) stop({ kind: 'recover', until: m.t + RAGE.recover });
          break;
        }
        case 'stun':
        case 'recover':
          if (m.t >= s.until) stop({ kind: 'roam', next: m.t + RAGE.every });
          break;
      }
      last = { x: body.x, y: body.y, speed: body.speed };
    },
    drive: (road) => {
      switch (s.kind) {
        case 'roam':
          return road();
        case 'turn': {
          const p = m.player;
          const off = p ? wrapAngle(angleTo(body, p) - body.heading) : 0;
          return { ...IDLE, move: { kind: 'tank', turn: Math.max(-1, Math.min(1, off * 3)), throttle: 0 } };
        }
        case 'charge':
          return { ...IDLE, move: { kind: 'point', angle: s.angle, mag: 1 } };
        default:
          return IDLE;
      }
    },
    dodge: (t) => {
      if (s.kind !== 'rev' && s.kind !== 'charge') return null;
      const a = s.angle;
      const side = Math.sign(Math.cos(a) * (t.y - body.y) - Math.sin(a) * (t.x - body.x)) || 1;
      const out: Pt = { x: t.x + Math.cos(a + side * Math.PI / 2) * 170, y: t.y + Math.sin(a + side * Math.PI / 2) * 170 };
      return { goal: out, goalRadius: 20, target: body.id, urgent: true, run: true };
    },
  };
}
