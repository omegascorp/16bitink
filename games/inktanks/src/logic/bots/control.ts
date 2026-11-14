import type { Match } from '../match/match';
import { IDLE, type Tank, type TankInput } from '../match/types';
import { clearLine } from '../nav/grid';
import { flowDir } from '../nav/flow';
import { angleTo, wrapAngle, type Pt } from '../vec';
import { think, type Brain } from './brain';

const STUCK_MOVE = 10;
const STUCK_TIME = 1.0;
const DETOUR = 0.9;
const SEPARATION = 85;
/** Cannon and Rockets bots hold their aim line this long before they fire (Tactics §4). */
export const TELEGRAPH = 0.4;
const TELEGRAPHED: ReadonlySet<string> = new Set(['cannon', 'rockets']);
/** Bots steer this far round mines they watched being laid. */
const MINE_AVOID = 70;

/** The way to drive towards `goal`: straight when the line is clear, else down the flow field. */
export function navAngle(m: Match, t: Tank, goal: Pt): number {
  if (clearLine(m.nav, t.x, t.y, goal.x, goal.y)) return angleTo(t, goal);
  const f = m.flow.get(goal.x, goal.y);
  const a = f ? flowDir(m.nav, f, t.x, t.y) : null;
  return a ?? angleTo(t, goal);
}

/** Steers a desired angle away from nearby tanks, and from mines it saw laid. */
function separate(m: Match, t: Tank, angle: number, ignore: number | null): number {
  let vx = Math.cos(angle);
  let vy = Math.sin(angle);
  for (const mine of m.gadgets.mines) {
    if (!mine.alive || !mine.known.has(t.id)) continue;
    const dx = t.x - mine.x;
    const dy = t.y - mine.y;
    const d = Math.hypot(dx, dy);
    if (d > MINE_AVOID || d < 1) continue;
    const k = ((MINE_AVOID - d) / MINE_AVOID) * 2.5;
    vx += (dx / d) * k;
    vy += (dy / d) * k;
  }
  for (const o of m.tanks) {
    if (o === t || !o.alive || o.id === ignore || o.role === 'bossTurret' || o.role === 'crew') continue;
    const dx = t.x - o.x;
    const dy = t.y - o.y;
    const d = Math.hypot(dx, dy);
    const reach = SEPARATION + o.stats.radius;
    if (d > reach || d < 1) continue;
    const k = ((reach - d) / reach) * 1.4;
    vx += (dx / d) * k;
    vy += (dy / d) * k;
  }
  return Math.atan2(vy, vx);
}

/** Where to aim: the target as last seen, moved on by its speed then, plus the shot's flight. */
function lead(m: Match, b: Brain, t: Tank, o: Tank, shotSpeed: number): Pt {
  const s = b.snap ?? { x: o.x, y: o.y, vx: 0, vy: 0, t: m.t };
  const d = Math.hypot(s.x - t.x, s.y - t.y);
  const time = d / shotSpeed + (m.t - s.t);
  return { x: s.x + s.vx * time, y: s.y + s.vy * time };
}

function trackStuck(b: Brain, t: Tank, moving: boolean, dt: number): void {
  if (b.detourT > 0) {
    b.detourT -= dt;
    return;
  }
  const moved = Math.hypot(t.x - b.lastPos.x, t.y - b.lastPos.y);
  if (!moving || moved > STUCK_MOVE) {
    b.stuckT = 0;
    b.lastPos = { x: t.x, y: t.y };
    return;
  }
  b.stuckT += dt;
  if (b.stuckT > STUCK_TIME) {
    b.stuckT = 0;
    b.detourT = DETOUR;
    b.detourAngle = wrapAngle(t.heading + Math.PI + b.rng.range(-0.9, 0.9));
    b.lastPos = { x: t.x, y: t.y };
  }
}

/**
 * Cannon and Rockets bots don't fire the moment they line up: they lock the
 * turret, show the aim line (an 'aim' event) for TELEGRAPH s, then fire along
 * it. Machineguns and the player don't.
 */
function telegraph(m: Match, b: Brain, t: Tank, aim: number | null, fire: boolean): { aim: number | null; fire: boolean } {
  if (b.role === 'player' || !TELEGRAPHED.has(t.stats.gun.family)) return { aim, fire };
  const tg = b.telegraph;
  if (tg) {
    if (m.t + 1e-9 < tg.until) return { aim: tg.angle, fire: false };
    b.telegraph = null;
    return { aim: tg.angle, fire: true };
  }
  if (!fire || t.reload > 0 || t.burst > 0 || t.repairT > 0) return { aim, fire: false };
  const until = m.t + TELEGRAPH;
  b.telegraph = { angle: t.turret, until };
  m.emit({ kind: 'aim', tank: t.id, angle: t.turret, len: t.stats.gun.range, until });
  return { aim: t.turret, fire: false };
}

/** Where an idle bot looks: a calm guard or turret sweeps round its post's heading; a suspicious one turns to the spot. */
function lookAround(m: Match, b: Brain, t: Tank): number | null {
  if (b.aware === 'suspicious' && b.awareSpot) return angleTo(t, b.awareSpot);
  if (b.aware === 'calm' && (b.role === 'guard' || b.role === 'turret') && b.state === 'idle') return wrapAngle(b.lookBase + Math.sin(m.t * 0.45 + t.id) * 0.7);
  return null;
}

export function botInput(m: Match, b: Brain, t: Tank, dt: number): TankInput {
  b.thinkT -= dt;
  if (b.thinkT <= 0) {
    b.thinkT = b.diff.reaction * b.rng.range(0.8, 1.2);
    think(m, b, t);
  }
  const target = b.target !== null ? m.tank(b.target) : null;
  const g = t.stats.gun;
  let aim: number | null = lookAround(m, b, t);
  let fire = false;
  const cover = b.coverShot;
  if (cover && !(target?.alive && b.los)) {
    // Shoot the cover where it last saw you: the shot stops on it.
    aim = angleTo(t, cover) + b.aimNoise * 0.5;
    const d = Math.hypot(cover.x - t.x, cover.y - t.y);
    fire = !b.holdFire && d <= g.range && Math.abs(wrapAngle(t.turret - aim)) < 0.1;
  } else if (target?.alive) {
    const p = lead(m, b, t, target, g.shotSpeed);
    aim = angleTo(t, p) + b.aimNoise;
    const d = Math.hypot(target.x - t.x, target.y - t.y);
    fire = !b.holdFire && b.los && d <= g.range + target.stats.radius && Math.abs(wrapAngle(t.turret - aim)) < (g.family === 'machinegun' ? 0.2 : 0.09);
  } else if (b.shootAt) {
    aim = angleTo(t, b.shootAt) + b.aimNoise * 0.5;
    const d = Math.hypot(b.shootAt.x - t.x, b.shootAt.y - t.y);
    fire = b.los && d <= g.range && Math.abs(wrapAngle(t.turret - aim)) < 0.1;
  }
  ({ aim, fire } = telegraph(m, b, t, aim, fire));
  const gadget = b.useGadget;
  b.useGadget = false;
  if (t.role === 'bossTurret' || b.role === 'turret') return { move: null, aim, fire, swap: false, repair: false };
  let angle: number | null = null;
  let mag = 1;
  switch (b.state) {
    case 'fight': {
      // Cover shooters stand and shoot; the stand-in fights from its bush or sandbags.
      if (cover && !(target?.alive && b.los)) break;
      if (b.coverSpot && target) {
        const d = Math.hypot(b.coverSpot.x - t.x, b.coverSpot.y - t.y);
        if (d > 16) angle = navAngle(m, t, b.coverSpot);
        break;
      }
      if (!target) break;
      const d = Math.hypot(target.x - t.x, target.y - t.y);
      const outranges = g.range > target.stats.gun.range + 40 && target.role === 'tank';
      // Kite when it outranges the target, or (the player's stand-in) when outnumbered.
      const kites = (outranges && b.diff.kite > 0.5) || (b.role === 'player' && b.seenCount > 1);
      const want = kites ? g.range * 0.85 : Math.max(120, g.range * 0.6);
      b.strafeT -= dt;
      if (b.strafeT <= 0) {
        b.strafeT = b.rng.range(1.2, 2.8);
        b.strafe = b.strafe === 1 ? -1 : 1;
      }
      const home = b.hint?.stay && b.hint.goal ? b.hint.goal : null;
      const away = home ? Math.hypot(home.x - t.x, home.y - t.y) : 0;
      if (home && away > (b.hint?.goalRadius ?? 100) * 1.6) angle = navAngle(m, t, home);
      else if (b.allyBlocked && d <= want + 120) {
        // A friend is in the way: sidestep for a clear line, don't charge (friendly fire, owner Nov 14).
        angle = wrapAngle(angleTo(t, target) + (b.strafe * Math.PI) / 2);
        mag = 0.8;
      } else if (d > want + 50 || !b.los) angle = home ? (b.los ? null : angleTo(t, home)) : navAngle(m, t, target);
      else if (d < want - 60) angle = wrapAngle(angleTo(target, t) + b.strafe * 0.5);
      else {
        angle = wrapAngle(angleTo(t, target) + (b.strafe * Math.PI) / 2);
        mag = 0.7;
      }
      break;
    }
    case 'flee': {
      // Back off from the threat, leaning towards home (a guard's post, the player's start).
      const away = target ? angleTo(target, t) : angleTo(b.post, t);
      const home = Math.hypot(b.post.x - t.x, b.post.y - t.y) > 60 ? navAngle(m, t, b.post) : away;
      angle = Math.atan2(Math.sin(away) * 2 + Math.sin(home), Math.cos(away) * 2 + Math.cos(home));
      break;
    }
    case 'idle':
      mag = 0;
      break;
    case 'route': {
      const r = b.route;
      const next = r?.[b.routeI];
      if (!r || !next) break;
      if (Math.hypot(next.x - t.x, next.y - t.y) < 40) {
        const end = b.routeDir === 1 ? b.routeI >= r.length - 1 : b.routeI <= 0;
        if (end && b.role !== 'patrol') {
          m.escape(t);
          return IDLE;
        }
        if (end) b.routeDir = b.routeDir === 1 ? -1 : 1;
        b.routeI += b.routeDir;
      }
      angle = navAngle(m, t, r[b.routeI]!);
      break;
    }
    default: {
      if (!b.goal) break;
      const d = Math.hypot(b.goal.x - t.x, b.goal.y - t.y);
      // Something to shoot there (a cage, a target) but no clear shot yet: keep closing in.
      const blocked = b.shootAt !== null && !b.los;
      const stopAt = b.state === 'loot' ? 6 : b.state === 'goal' ? (b.role === 'guard' || blocked ? 40 : (b.hint?.goalRadius ?? 40)) : 30;
      if (d < stopAt) mag = 0;
      else {
        angle = navAngle(m, t, b.goal);
        if (b.state === 'loot' && d < 60) mag = 0.5;
      }
    }
  }
  const moving = angle !== null && mag > 0;
  trackStuck(b, t, moving, dt);
  if (b.detourT > 0) {
    angle = b.detourAngle;
    mag = 1;
  }
  if (angle !== null && b.state !== 'loot') angle = separate(m, t, angle, b.target);
  if (aim === null && angle !== null) aim = angle;
  const wantSwap = b.state === 'loot' && t.onPart !== null && t.onPart === b.goalPickup;
  return { move: angle === null ? null : { kind: 'point', angle, mag }, aim, fire, swap: wantSwap, repair: b.useKit, gadget };
}
