import { CREATURE, type Creature } from './creatures';
import type { FaunaHost } from './fauna';
import { bodyOf, edgeDistance, overlaps } from './faunaShape';
import type { MineEvent } from './mine';
import { foldX, isSolid, ringDelta, type Terrain } from './terrain';

/**
 * The giants that sleep (creatures.ts): Brine's Leviathan and Talus's
 * Rockslide. Both can't be hurt; both wake to noise, sweep their cave a
 * while, and go home to sleep. The Rockslide also shakes rock down from
 * the roof as it goes. Pure steps, as fauna.ts's are.
 */

/** A sleeping giant's numbers (see CREATURE.leviathan). */
type SleeperSpec = typeof CREATURE.leviathan | typeof CREATURE.rockslide;
type Sleeper = 'leviathan' | 'rockslide';
type Turn = 'stir' | 'wake' | 'sleep';

const specOf = (kind: Sleeper): SleeperSpec => CREATURE[kind];
const say = (kind: Sleeper, now: Turn): MineEvent => ({ kind, now });

/** Brine's Leviathan: asleep in its flooded cave, it sweeps it when woken. */
export function leviathan(c: Creature, dt: number, host: FaunaHost, events: MineEvent[]): Creature {
  return sleeper(c, 'leviathan', dt, host, events);
}

/**
 * Talus's Rockslide: the Leviathan's ways on its feet, and while it's up
 * (stirring, and scuttling), every so often it shakes rock down from the
 * roof round it.
 */
export function rockslide(c: Creature, dt: number, host: FaunaHost, events: MineEvent[]): Creature {
  const R = CREATURE.rockslide;
  const next = sleeper(c, 'rockslide', dt, host, events);
  if (next.state !== 'warn' && next.state !== 'walk') return { ...next, quake: 0 };
  const quake = (next.quake ?? 0) + dt;
  if (quake < R.quake) return { ...next, quake };
  host.quake?.(next.x, next.y, R.spread, R.rocks);
  events.push({ kind: 'rockslide', now: 'quake' });
  return { ...next, quake: 0 };
}

/**
 * Asleep on its cave floor, its noise falling back as things go quiet;
 * swimming right up to it stirs it, and touching it wakes it at once. At a
 * full measure of noise it wakes (a long stir first), then sweeps its cave
 * back and forth, turning at rock and at the end of its range; its body is
 * a hit and throws you. Then it goes home and sleeps again.
 */
function sleeper(c: Creature, kind: Sleeper, dt: number, host: FaunaHost, events: MineEvent[]): Creature {
  const V = specOf(kind);
  const T = host.tile;
  const t = host.terrain;
  const body = bodyOf(c, t, T);
  const touching = overlaps(host, host.player, body);
  const timer = c.timer - dt;
  if (c.state === 'idle') {
    const close = edgeDistance(host, body) < V.close * T;
    const noise = touching ? 1 : Math.max(0, (c.noise ?? 0) + (close ? V.near : -V.decay) * dt);
    if (noise >= 1) {
      events.push(say(kind, 'wake'));
      return { ...c, noise: 1, state: 'warn', timer: V.warn };
    }
    // Its `reach` marks that it has stirred in this sleep, so it's said once (and again after it has settled).
    if (noise >= V.stir && c.reach === 0) {
      events.push(say(kind, 'stir'));
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
    const swept = sweep(c, V, V.speed * T * dt, t, T);
    return timer > 0 ? { ...swept, timer } : { ...swept, state: 'rest', timer: 0 };
  }
  // Home again, to sleep.
  const home = c.home ?? c.x;
  const left = ringDelta(t, c.x, home, T);
  if (Math.abs(left) <= V.speed * T * dt) {
    events.push(say(kind, 'sleep'));
    return { ...c, x: home, state: 'idle', noise: 0, timer: 0, reach: 0 };
  }
  return { ...c, x: foldX(t, c.x + Math.sign(left) * V.speed * T * dt, T), facing: left < 0 ? -1 : 1 };
}

/** Goes `step` px the way it faces, turning before rock at its middle or past its range from home. */
function sweep(c: Creature, V: SleeperSpec, step: number, t: Terrain, tile: number): Creature {
  const nose = c.x + c.facing * ((V.w * tile) / 2 + step);
  const mid = Math.floor((c.y - (V.h * tile) / 2) / tile);
  const past = Math.abs(ringDelta(t, c.home ?? c.x, c.x + c.facing * step, tile)) > V.range * tile;
  if (past || isSolid(t, Math.floor(foldX(t, nose, tile) / tile), mid)) return { ...c, facing: c.facing === 1 ? -1 : 1 };
  return { ...c, x: foldX(t, c.x + c.facing * step, tile) };
}

/** Whether a creature is a giant that sleeps, and so hears. */
export const sleeps = (c: Creature): c is Creature & { readonly kind: Sleeper } => c.kind === 'leviathan' || c.kind === 'rockslide';

/** A sound at (x, y) px: a drilled tile or a blast. A sleeping giant in earshot takes it as noise. */
export function noiseAt(c: Creature, x: number, y: number, kind: 'drill' | 'blast' | 'shot', t: Terrain, tile: number): Creature {
  if (!sleeps(c) || c.state !== 'idle') return c;
  const V = specOf(c.kind);
  const body = bodyOf(c, t, tile);
  const dx = Math.max(0, Math.abs(ringDelta(t, body.x + body.w / 2, x, tile)) - body.w / 2);
  const dy = Math.max(0, Math.abs(y - (body.y + body.h / 2)) - body.h / 2);
  const reach = (kind === 'blast' ? V.hearBlast : V.hear) * tile;
  if (kind !== 'shot' && Math.hypot(dx, dy) > reach) return c;
  const add = kind === 'drill' ? V.drill : kind === 'blast' ? V.blast : V.shot;
  // It wakes on its own next step (which says so), not here.
  return { ...c, noise: Math.min(1.5, (c.noise ?? 0) + add) };
}
