import { pushOut } from '../geom';
import { groundAt, isDrivable } from '../land';
import { unblock } from '../nav/grid';
import { clamp, turnTowards, wrapAngle } from '../vec';
import type { Match } from './match';
import type { Tank, TankInput } from './types';

/** How hard a tank gets up to speed, px/s², before the engine factor. */
const ACCEL = 420;
const REVERSE = 0.6;
/** Beyond this angle off the heading, a pointing stick backs up instead of turning round. */
const BACK_UP = 2.4;
export const CARRY_SLOW = 0.8;

function groundMult(m: Match, t: Tank): number {
  const g = groundAt(m.land, t.x, t.y);
  const base = g === 'sand' ? t.stats.sand : g === 'mud' ? t.stats.mud : 1;
  return base * (t.carrying ? CARRY_SLOW : 1);
}

/** Turns and throttles a tank from its input, then moves it and resolves collisions. */
export function driveTank(m: Match, t: Tank, input: TankInput, dt: number): void {
  if (t.role === 'bossTurret') return;
  const s = t.stats;
  const top = s.speed * groundMult(m, t);
  // Wheels and half-tracks need some roll to turn; tracks pivot.
  const roll = s.pivots ? 1 : clamp(0.35 + Math.abs(t.speed) / Math.max(1, s.speed), 0.35, 1);
  let throttle = 0;
  const mv = input.move;
  if (mv?.kind === 'tank') {
    t.heading = wrapAngle(t.heading + clamp(mv.turn, -1, 1) * s.turn * roll * dt * (t.speed < -1 ? -1 : 1));
    throttle = clamp(mv.throttle, -1, 1);
  } else if (mv?.kind === 'point' && mv.mag > 0) {
    const off = wrapAngle(mv.angle - t.heading);
    if (Math.abs(off) > BACK_UP && !t.isPlayer) {
      // Back up towards the point: aim the tail at it.
      t.heading = turnTowards(t.heading, wrapAngle(mv.angle + Math.PI), s.turn * roll * dt);
      throttle = -mv.mag * Math.max(0, Math.cos(wrapAngle(mv.angle + Math.PI - t.heading)));
    } else {
      t.heading = turnTowards(t.heading, mv.angle, s.turn * roll * dt);
      const along = Math.cos(wrapAngle(mv.angle - t.heading));
      throttle = mv.mag * (s.pivots ? Math.max(0, along) ** 2 : Math.max(0.25, along));
    }
  }
  const want = throttle >= 0 ? throttle * top : throttle * top * REVERSE;
  const accel = ACCEL * s.engineFactor * dt;
  t.speed = t.speed < want ? Math.min(want, t.speed + accel) : Math.max(want, t.speed - accel * 1.6);
  if (Math.abs(t.speed) < 0.5 && want === 0) t.speed = 0;
  const step = t.speed * dt;
  moveBy(m, t, Math.cos(t.heading) * step, Math.sin(t.heading) * step);
  t.rolled += Math.abs(step);
}

/** Moves with sliding along water and closed land, then pushes out of solids and other tanks. */
export function moveBy(m: Match, t: Tank, dx: number, dy: number): void {
  const r = t.stats.radius * 0.6;
  const ok = (x: number, y: number): boolean =>
    isDrivable(m.land, x, y) && isDrivable(m.land, x + r, y) && isDrivable(m.land, x - r, y) && isDrivable(m.land, x, y + r) && isDrivable(m.land, x, y - r);
  if (ok(t.x + dx, t.y + dy)) {
    t.x += dx;
    t.y += dy;
  } else if (ok(t.x + dx, t.y)) {
    t.x += dx;
    t.speed *= 0.7;
  } else if (ok(t.x, t.y + dy)) {
    t.y += dy;
    t.speed *= 0.7;
  } else {
    t.speed *= 0.3;
  }
  collideStructures(m, t);
  if (t.role !== 'boss') collideTanks(m, t);
}

function crushes(t: Tank): boolean {
  return t.role === 'boss' || t.stats.drive === 'tracks' || t.stats.hull === 'heavy';
}

function collideStructures(m: Match, t: Tank): void {
  const r = t.stats.radius;
  const ids = m.grid.query({ x0: t.x - r, y0: t.y - r, x1: t.x + r, y1: t.y + r });
  for (const i of ids) {
    const s = m.structs[i]!;
    if (s.state === 0 || s.def.cover) continue;
    const p = pushOut(s.def.shape, s.def.x, s.def.y, t.x, t.y, r * 0.85);
    if (!p) continue;
    if (s.def.flattenable) {
      if (crushes(t)) {
        breakStructure(m, i);
        continue;
      }
    }
    t.x += p.x;
    t.y += p.y;
    t.speed *= 0.85;
  }
}

function collideTanks(m: Match, t: Tank): void {
  for (const o of m.tanks) {
    if (o === t || !o.alive || o.dropT > 0 || o.role === 'bossTurret') continue;
    const dx = t.x - o.x;
    const dy = t.y - o.y;
    const need = (t.stats.radius + o.stats.radius) * 0.8;
    const d2 = dx * dx + dy * dy;
    if (d2 >= need * need) continue;
    const d = Math.sqrt(d2) || 1;
    const push = need - d;
    // The boss doesn't budge; two tanks share the push.
    const share = o.role === 'boss' ? 1 : 0.5;
    t.x += (dx / d) * push * share;
    t.y += (dy / d) * push * share;
    if (o.role !== 'boss') {
      o.x -= (dx / d) * push * 0.5;
      o.y -= (dy / d) * push * 0.5;
    }
  }
}

export function breakStructure(m: Match, i: number): void {
  const s = m.structs[i]!;
  if (s.state === 0) return;
  s.hp = 0;
  s.state = 0;
  unblock(m.nav, m.land, s.def.id);
  m.emit({ kind: 'struct', id: s.def.id, state: 0 });
}

/** Boss turrets ride on their body. */
export function placeMounted(m: Match, t: Tank): void {
  if (t.parent === null || !t.mount) return;
  const body = m.tank(t.parent);
  if (!body) return;
  const c = Math.cos(body.heading);
  const s = Math.sin(body.heading);
  t.x = body.x + t.mount.dx * c - t.mount.dy * s;
  t.y = body.y + t.mount.dx * s + t.mount.dy * c;
  t.heading = body.heading;
}
