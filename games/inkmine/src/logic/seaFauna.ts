import { CREATURE, type Creature } from './creatures';
import type { FaunaHost } from './fauna';
import { bodyOf, clear, edgeDistance, lungeOf, overlaps } from './faunaShape';
import type { MineEvent } from './mine';
import { foldX, isSolid, ringDelta, type Terrain } from './terrain';

/**
 * Brine's creatures that live in the water (creatures.ts): the bubble
 * jelly, the rasp eel and the Leviathan. Pure steps, as fauna.ts's are: each
 * takes a creature and returns it as it is a moment later.
 */

/** Whether a tile is under water, as the host sees it (nothing is on a dry world). */
const wetAt = (host: FaunaHost, x: number, y: number): boolean => host.wet?.(x, y) ?? false;

/** Whether the prospector is in the water (their middle is). */
function swimming(host: FaunaHost): boolean {
  const p = host.player;
  return wetAt(host, Math.floor(foldX(host.terrain, p.x + p.w / 2, host.tile) / host.tile), Math.floor((p.y + p.h / 2) / host.tile));
}

/**
 * Hangs in the water, bobbing; notices a swimmer (a moment's warning) and
 * drifts after them, slowly, through water only. Touching them, it stings
 * (a hit, and air lost) and backs off to rest. Left high and dry, it bursts.
 */
export function jelly(c: Creature, dt: number, host: FaunaHost, events: MineEvent[]): Creature {
  const J = CREATURE.jelly;
  const T = host.tile;
  const t = host.terrain;
  if (!wetAt(host, Math.floor(c.x / T), Math.floor(c.y / T))) return { ...c, state: 'burst', timer: 0.6 };
  const p = host.player;
  const dx = ringDelta(t, c.x, p.x + p.w / 2, T);
  const dy = p.y + p.h / 2 - c.y;
  const far = Math.hypot(dx, dy);
  const sees = swimming(host) && far < J.notice * T && clear(t, c.x, c.y, dx, dy, T);
  const timer = c.timer - dt;
  const facing = dx < 0 ? -1 : 1;
  if (c.state === 'idle') return sees && timer <= 0 ? { ...c, state: 'warn', timer: J.warn, facing } : { ...c, timer };
  if (c.state === 'warn') return timer > 0 ? { ...c, timer, facing } : { ...c, state: 'walk', timer: 0, facing };
  if (c.state === 'rest') {
    // Backing off from what it stung, for the first moments of its rest.
    const away = timer > J.rest - 0.4 ? drift(c, -dx, -dy, J.recoil * T * dt, host) : c;
    return timer > 0 ? { ...away, timer } : { ...away, state: 'idle', timer: 0 };
  }
  // Drifting after you: it gives up once you're out of the water or far off.
  if (!swimming(host) || far > J.notice * J.lose * T) return { ...c, state: 'idle', timer: 1 };
  if (overlaps(host, p, bodyOf(c, t, T))) {
    host.hurt();
    host.loseAir(J.sting);
    events.push({ kind: 'stung' });
    return { ...c, state: 'rest', timer: J.rest, facing };
  }
  return { ...drift(c, dx, dy, J.speed * T * dt, host), facing };
}

/** A jelly moved `step` px along (dx, dy), each way only into open water. */
function drift(c: Creature, dx: number, dy: number, step: number, host: FaunaHost): Creature {
  const T = host.tile;
  const d = Math.hypot(dx, dy) || 1;
  const open = (x: number, y: number): boolean => {
    const col = Math.floor(foldX(host.terrain, x, T) / T);
    const row = Math.floor(y / T);
    return !isSolid(host.terrain, col, row) && wetAt(host, col, row);
  };
  const x = c.x + (dx / d) * step;
  const y = c.y + (dy / d) * step;
  const nx = open(x, c.y) ? foldX(host.terrain, x, T) : c.x;
  const ny = open(nx, y) ? y : c.y;
  return { ...c, x: nx, y: ny };
}

/**
 * Waits in its burrow; when something swims (or walks) in front of it, a
 * moment's warning, then it lunges out along its row and bites, and pulls
 * back in to rest. A pulse sends it back in; a second kills it.
 */
export function lamprey(c: Creature, dt: number, host: FaunaHost, events: MineEvent[]): Creature {
  const L = CREATURE.lamprey;
  const T = host.tile;
  const p = host.player;
  const full = lungeOf(host.terrain, c, T);
  const ahead = ringDelta(host.terrain, c.x, p.x + p.w / 2, T) * c.facing;
  const level = Math.abs(p.y + p.h / 2 - c.y) < L.band * T + p.h / 2;
  const before = level && ahead > 0 && ahead < Math.min(L.sense * T, full) + p.w / 2;
  const timer = c.timer - dt;
  if (c.state === 'idle') return before ? { ...c, state: 'warn', timer: L.warn } : c;
  if (c.state === 'warn') return timer > 0 ? { ...c, timer } : { ...c, state: 'strike', timer: 0 };
  if (c.state === 'strike') {
    const reach = Math.min(1, c.reach + dt / L.strike);
    const out = { ...c, reach };
    if (overlaps(host, p, bodyOf(out, host.terrain, T))) {
      host.hurt();
      events.push({ kind: 'bitten' });
      return { ...out, state: 'retract' };
    }
    return reach >= 1 ? { ...out, state: 'retract' } : out;
  }
  if (c.state === 'retract') {
    const reach = Math.max(0, c.reach - dt / L.retract);
    return reach > 0 ? { ...c, reach } : { ...c, reach: 0, state: 'rest', timer: L.rest };
  }
  return timer > 0 ? { ...c, timer } : { ...c, state: 'idle', timer: 0 };
}

/**
 * Asleep on its cave floor, its noise falling back as things go quiet;
 * swimming right up to it stirs it, and touching it wakes it at once. At a
 * full measure of noise it wakes (a long stir first), then sweeps its cave
 * back and forth, turning at rock and at the end of its range; its body is
 * a hit and throws you. Then it swims home and sleeps again.
 */
export function leviathan(c: Creature, dt: number, host: FaunaHost, events: MineEvent[]): Creature {
  const V = CREATURE.leviathan;
  const T = host.tile;
  const t = host.terrain;
  const body = bodyOf(c, t, T);
  const touching = overlaps(host, host.player, body);
  const timer = c.timer - dt;
  if (c.state === 'idle') {
    const close = edgeDistance(host, body) < V.close * T;
    const noise = touching ? 1 : Math.max(0, (c.noise ?? 0) + (close ? V.near : -V.decay) * dt);
    if (noise >= 1) {
      events.push({ kind: 'leviathan', now: 'wake' });
      return { ...c, noise: 1, state: 'warn', timer: V.warn };
    }
    // Its `reach` marks that it has stirred in this sleep, so it's said once (and again after it has settled).
    if (noise >= V.stir && c.reach === 0) {
      events.push({ kind: 'leviathan', now: 'stir' });
      return { ...c, noise, reach: 1 };
    }
    return { ...c, noise, reach: noise < V.stir / 2 ? 0 : c.reach };
  }
  if (touching) {
    host.hurt();
    const dx = ringDelta(t, c.x, host.player.x + host.player.w / 2, T);
    host.push((dx < 0 ? -1 : 1) * V.push, -200);
  }
  if (c.state === 'warn') return timer > 0 ? { ...c, timer } : { ...c, state: 'walk', timer: V.awake };
  if (c.state === 'walk') {
    const swept = sweep(c, V.speed * T * dt, t, T);
    return timer > 0 ? { ...swept, timer } : { ...swept, state: 'rest', timer: 0 };
  }
  // Home again, to sleep.
  const home = c.home ?? c.x;
  const left = ringDelta(t, c.x, home, T);
  if (Math.abs(left) <= V.speed * T * dt) {
    events.push({ kind: 'leviathan', now: 'sleep' });
    return { ...c, x: home, state: 'idle', noise: 0, timer: 0, reach: 0 };
  }
  return { ...c, x: foldX(t, c.x + Math.sign(left) * V.speed * T * dt, T), facing: left < 0 ? -1 : 1 };
}

/** Swims `step` px the way it faces, turning before rock at its middle or past its range from home. */
function sweep(c: Creature, step: number, t: Terrain, tile: number): Creature {
  const V = CREATURE.leviathan;
  const nose = c.x + c.facing * ((V.w * tile) / 2 + step);
  const mid = Math.floor((c.y - (V.h * tile) / 2) / tile);
  const past = Math.abs(ringDelta(t, c.home ?? c.x, c.x + c.facing * step, tile)) > V.range * tile;
  if (past || isSolid(t, Math.floor(foldX(t, nose, tile) / tile), mid)) return { ...c, facing: c.facing === 1 ? -1 : 1 };
  return { ...c, x: foldX(t, c.x + c.facing * step, tile) };
}

/** A sound at (x, y) px: a drilled tile or a blast. A sleeping Leviathan in earshot takes it as noise. */
export function noiseAt(c: Creature, x: number, y: number, kind: 'drill' | 'blast' | 'shot', t: Terrain, tile: number): Creature {
  if (c.kind !== 'leviathan' || c.state !== 'idle') return c;
  const V = CREATURE.leviathan;
  const body = bodyOf(c, t, tile);
  const dx = Math.max(0, Math.abs(ringDelta(t, body.x + body.w / 2, x, tile)) - body.w / 2);
  const dy = Math.max(0, Math.abs(y - (body.y + body.h / 2)) - body.h / 2);
  const reach = (kind === 'blast' ? V.hearBlast : V.hear) * tile;
  if (kind !== 'shot' && Math.hypot(dx, dy) > reach) return c;
  const add = kind === 'drill' ? V.drill : kind === 'blast' ? V.blast : V.shot;
  // It wakes on its own next step (which says so), not here.
  return { ...c, noise: Math.min(1.5, (c.noise ?? 0) + add) };
}
