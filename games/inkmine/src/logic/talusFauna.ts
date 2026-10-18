import { CREATURE, type Creature } from './creatures';
import type { FaunaHost } from './fauna';
import { bodyOf, edgeDistance, overlaps } from './faunaShape';
import type { MineEvent } from './mine';
import { foldX, isSolid, ringDelta, surfaceRow, TILE, tileAt, type Terrain } from './terrain';
import { grazer, stride } from './walkers';

/**
 * Talus's creatures (creatures.ts): the boulder crab, the sand skate and
 * the dew beetle (the Rockslide, a giant, is in giants.ts). Life on a dry
 * world lives near the surface, where the sun and the plants are, and
 * saves every drop. Pure steps, as fauna.ts's are.
 */

/** Which way is towards the prospector from x, px. */
function towards(host: FaunaHost, x: number): 1 | -1 {
  const p = host.player;
  return ringDelta(host.terrain, x, p.x + p.w / 2, host.tile) < 0 ? -1 : 1;
}

/** A boulder crab turned to run from x px: scuttling off for a while before it rests. */
export function fleeFrom(c: Creature, x: number, host: FaunaHost): Creature {
  const away = ringDelta(host.terrain, x, c.x, host.tile) < 0 ? -1 : 1;
  return { ...c, state: 'walk', timer: CREATURE.rockcrab.flee, facing: away };
}

/**
 * Sits still, a boulder among boulders. Come within reach and it rears up
 * (a moment's warning), pinches whatever is at its claws (a hit), and
 * scuttles off; it rests a while, then settles into a boulder again. It
 * turns at walls and drops as it runs, and falls if the ground goes.
 */
export function rockcrab(c: Creature, dt: number, host: FaunaHost, events: MineEvent[]): Creature {
  const R = CREATURE.rockcrab;
  const T = host.tile;
  const timer = c.timer - dt;
  const body = bodyOf(c, host.terrain, T);
  if (c.state === 'idle') {
    // Still, it only falls if what it sits on goes.
    const settled = stride(c, dt, host, 0).c;
    return edgeDistance(host, body) < R.notice * T ? { ...settled, state: 'warn', timer: R.warn, facing: towards(host, c.x) } : settled;
  }
  if (c.state === 'warn') {
    if (timer > 0) return { ...c, timer, facing: towards(host, c.x) };
    const claws = { x: c.facing === 1 ? body.x + body.w : body.x - R.pinch * T, y: body.y, w: R.pinch * T, h: body.h };
    if (overlaps(host, host.player, claws) || overlaps(host, host.player, body)) {
      host.hurt();
      events.push({ kind: 'pinched' });
    }
    return fleeFrom(c, host.player.x + host.player.w / 2, host);
  }
  if (c.state === 'walk') {
    const step = stride(c, dt, host, R.speed);
    const ran = step.blocked ? { ...step.c, facing: c.facing === 1 ? -1 : 1 } as const : step.c;
    return timer > 0 ? { ...ran, timer } : { ...ran, state: 'rest', timer: R.rest };
  }
  // Resting, then a boulder again.
  return timer > 0 ? { ...c, timer } : { ...c, state: 'idle', timer: 0 };
}

/** Whether a sand skate can cruise in column x at crust row `row`: sand there, open over it. */
function crust(t: Terrain, x: number, row: number): boolean {
  return surfaceRow(t, x) === row && tileAt(t, x, row) === TILE.soil;
}

/** A skate moved `step` px along its crust (turning where the sand ends, or past its range): its back on the new column's ground line. */
function cruise(c: Creature, step: number, host: FaunaHost): Creature {
  const t = host.terrain;
  const T = host.tile;
  const S = CREATURE.skate;
  const row = Math.round(c.y / T);
  const x = foldX(t, c.x + step, T);
  const col = Math.floor(x / T);
  const far = Math.abs(ringDelta(t, c.home ?? c.x, x, T)) > S.range * T;
  // A crust a row up or down is still a crust: the flats roll a little.
  const at = [row, row - 1, row + 1].find((r) => crust(t, col, r));
  if (at === undefined || far) return { ...c, facing: c.facing === 1 ? -1 : 1 };
  return { ...c, x, y: at * T };
}

/**
 * Cruises just under the crust, back and forth from where it lives. It
 * feels footsteps: someone walking within reach above it (never a flyer,
 * never someone on a ladder) and it darts under them, rippling the sand
 * (a moment's warning), then strikes up out of the ground, a hit and a
 * toss. It pulls back in and rests. Only out of the ground can it be shot.
 * With its crust dug away, it drops to the ground below.
 */
export function skate(c: Creature, dt: number, host: FaunaHost, events: MineEvent[]): Creature {
  const S = CREATURE.skate;
  const t = host.terrain;
  const T = host.tile;
  const p = host.player;
  const timer = c.timer - dt;
  const col = Math.floor(c.x / T);
  // Dug out from over it: down to whatever ground is left.
  if (!isSolid(t, col, Math.round(c.y / T))) return { ...c, y: surfaceRow(t, col) * T, reach: 0, state: 'rest', timer: S.rest };
  const dx = ringDelta(t, c.x, p.x + p.w / 2, T);
  const walking = p.onGround && Math.abs(p.y + p.h - c.y) < T * 0.6;
  if (c.state === 'walk') {
    if (walking && Math.abs(dx) < S.sense * T) return { ...c, state: 'warn', timer: S.warn, facing: dx < 0 ? -1 : 1 };
    return cruise(c, c.facing * S.speed * T * dt, host);
  }
  if (c.state === 'warn') {
    // Darting under them, as long as they're still there to feel.
    const dart = Math.abs(dx) > 2 ? cruise({ ...c, facing: dx < 0 ? -1 : 1 }, Math.sign(dx) * Math.min(Math.abs(dx), S.dash * T * dt), host) : c;
    if (timer > 0) return { ...dart, timer };
    return { ...dart, state: 'strike', timer: 0 };
  }
  if (c.state === 'strike') {
    const reach = Math.min(1, c.reach + dt / S.strike);
    const out = { ...c, reach };
    if (overlaps(host, p, bodyOf(out, t, T))) {
      host.hurt();
      host.push(0, -S.toss);
      events.push({ kind: 'struckUp' });
      return { ...out, state: 'retract' };
    }
    return reach >= 1 ? { ...out, state: 'retract' } : out;
  }
  if (c.state === 'retract') {
    const reach = Math.max(0, c.reach - dt / S.retract);
    return reach > 0 ? { ...c, reach } : { ...c, reach: 0, state: 'rest', timer: S.rest };
  }
  return timer > 0 ? { ...c, timer } : { ...c, state: 'walk', timer: 0 };
}

/** Walks the open ground as a grazer does; while a dust storm blows it stays tucked in, legs under its shell. */
export function beetle(c: Creature, dt: number, host: FaunaHost): Creature {
  if (host.storming) return { ...c, state: 'curled', timer: Math.max(c.timer - dt, 1) };
  return grazer(c, dt, host);
}
