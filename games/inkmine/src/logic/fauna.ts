import type { Body, Box } from './body';
import { alive, CREATURE, SPOILS, type Creature } from './creatures';
import type { OreKey } from './ore';
import type { MineEvent } from './mine';
import { newShot, PULSE, stepShot, type Shot } from './pulse';
import { foldX, isSolid, ringDelta, TILE, tileAt, type Terrain, type TilePos } from './terrain';

/** A clot of spores a puffball spat, in flight. */
export interface Glob {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly age: number;
}

/** Spat clots fall faster than a body (they're light, but the air's thick), and break up after a few seconds. */
const GLOB = { gravity: 600, size: 10, life: 3 } as const;

/** What the fauna needs of the dig site each step, as it stands. */
export interface FaunaHost {
  readonly terrain: Terrain;
  readonly tile: number;
  readonly player: Body;
  readonly facing: 1 | -1;
  /** A hit on the prospector (the shield, then a heart). */
  hurt(): void;
  loseAir(n: number): void;
  /** Spends cell energy for a shot; false when the cell hasn't that much. */
  spend(energy: number): boolean;
  /** Throws the prospector, px/s. */
  push(vx: number, vy: number): void;
}

/** What the controls ask of the fauna this step. */
export interface FaunaInput {
  readonly fire: boolean;
  readonly iy: number;
  /** Jump pressed: held by a tendril, it's a struggle to get free. */
  readonly jump: boolean;
}

/** A piece a killed creature left, px, for the Mine to drop. */
export interface Spoil {
  readonly ore: OreKey;
  readonly x: number;
  readonly y: number;
}

let nextGlob = 1;

/**
 * The creatures of a dig site, the clots they spit and the pulses you
 * shoot at them (creatures.ts, pulse.ts). Pure simulation, stepped by the
 * Mine, which hands it the prospector as they are (FaunaHost).
 */
export class Fauna {
  creatures: Creature[];
  globs: Glob[] = [];
  shots: Shot[] = [];
  /** The tendril holding the prospector, by id; null when free. */
  held: number | null = null;
  /** Pieces left by what was killed since the Mine last took them (takeSpoils). */
  private spoils: Spoil[] = [];
  private struggles = 0;
  private cooldown = 0;

  constructor(creatures: readonly Creature[], readonly armed: boolean) {
    this.creatures = [...creatures];
  }

  step(dt: number, input: FaunaInput, host: FaunaHost, events: MineEvent[]): void {
    if (dt <= 0) return;
    this.fire(dt, input, host, events);
    this.shots = this.shots.flatMap((s) => {
      const next = stepShot(host.terrain, s, dt, host.tile);
      return next && !this.strike(next, host, events) ? [next] : [];
    });
    this.creatures = this.creatures.map((c) => this.act(c, dt, input, host, events)).filter((c) => !((c.state === 'burst' || c.state === 'dead') && c.timer <= 0));
    this.globs = this.globs.flatMap((g) => this.fly(g, dt, host));
  }

  /** The pieces left by what was killed since last asked, once. */
  takeSpoils(): Spoil[] {
    const out = this.spoils;
    this.spoils = [];
    return out;
  }

  /** `c` killed: bursting or slumping, and leaving its spoils where its body was. */
  private kill(c: Creature, tile: number): Creature {
    const ores = SPOILS[c.kind] ?? [];
    // A tendril's body hangs below its knot in the ceiling; a puffball's sits on its foot.
    const y = c.kind === 'tendril' ? c.y + tile * 0.6 : c.y - tile * 0.4;
    ores.forEach((ore, j) => this.spoils.push({ ore, x: c.x + (j - (ores.length - 1) / 2) * tile * 0.4, y }));
    return { ...c, hp: 0, state: c.kind === 'puffball' ? 'burst' : 'dead', timer: 0.6 };
  }

  /** A blast over `area` bursts puffballs, severs tendrils and curls up grazers; the Mother doesn't notice. */
  blast(area: readonly TilePos[], tile: number): void {
    const hit = new Set(area.map(([x, y]) => `${x},${y}`));
    this.creatures = this.creatures.map((c) => {
      if (!alive(c) || c.kind === 'mother') return c;
      const key = `${Math.floor(c.x / tile)},${Math.floor((c.kind === 'tendril' ? c.y + 1 : c.y - 1) / tile)}`;
      if (!hit.has(key)) return c;
      if (c.kind === 'grazer') return { ...c, state: 'curled', timer: CREATURE.grazer.curl };
      if (c.id === this.held) this.held = null;
      return this.kill(c, tile);
    });
  }

  /** A pulse fired from the hand: the way you face, or up or down while held; held by a tendril, straight at it. */
  private fire(dt: number, input: FaunaInput, host: FaunaHost, events: MineEvent[]): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!input.fire || !this.armed || this.cooldown > 0) return;
    if (!host.spend(PULSE.energy)) {
      events.push({ kind: 'flat' });
      return;
    }
    this.cooldown = PULSE.cooldown;
    const p = host.player;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2 - 2;
    const holder = this.creatures.find((c) => c.id === this.held);
    const [dx, dy] = holder ? [ringDelta(host.terrain, cx, holder.x, host.tile), holder.y - cy] : input.iy !== 0 ? [0, input.iy] : [host.facing, 0];
    this.shots.push(newShot(cx + (input.iy === 0 && !holder ? host.facing * 8 : 0), cy, dx, dy));
    events.push({ kind: 'pulse' });
  }

  /** Whether a pulse hit something (and so is spent): bursts, severs or curls what it hits; the Mother takes it without a mark. */
  private strike(s: Shot, host: FaunaHost, events: MineEvent[]): boolean {
    const r = PULSE.size / 2;
    const shotBox = { x: s.x - r, y: s.y - r, w: r * 2, h: r * 2 };
    const i = this.creatures.findIndex((c) => alive(c) && c.state !== 'curled' && overlaps(host, shotBox, bodyOf(c, host.terrain, host.tile)));
    if (i < 0) return false;
    const c = this.creatures[i]!;
    let after: Creature = c;
    if (c.kind === 'grazer') after = { ...c, state: 'curled', timer: CREATURE.grazer.curl };
    else if (c.kind !== 'mother') {
      const hp = c.hp - 1;
      if (c.id === this.held && (hp <= 0 || c.kind === 'tendril')) this.release(events);
      after = hp > 0 ? { ...c, hp, state: c.kind === 'tendril' ? 'retract' : c.state } : this.kill(c, host.tile);
      // A puffball bursting close by fills the air round it with spores.
      if (after.state === 'burst' && distance(host, c.x, c.y - 14) < CREATURE.puffball.burstReach * host.tile) host.loseAir(CREATURE.puffball.burstAir);
    }
    this.creatures[i] = after;
    events.push({ kind: 'struck', creature: c.kind, killed: after.state === 'burst' || after.state === 'dead' });
    return true;
  }

  private act(c: Creature, dt: number, input: FaunaInput, host: FaunaHost, events: MineEvent[]): Creature {
    if (c.state === 'burst' || c.state === 'dead') return { ...c, timer: c.timer - dt, reach: Math.max(0, c.reach - dt * 2) };
    if (c.kind === 'puffball') return this.puffball(c, dt, host, events);
    if (c.kind === 'tendril') return this.tendril(c, dt, input, host, events);
    if (c.kind === 'grazer') return grazer(c, dt, host);
    return mother(c, dt, host, events);
  }

  /** Waits, notices you (a moment's warning), swells, spits a clot at you in an arc, and rests before it can again. */
  private puffball(c: Creature, dt: number, host: FaunaHost, events: MineEvent[]): Creature {
    const P = CREATURE.puffball;
    const p = host.player;
    const dx = ringDelta(host.terrain, c.x, p.x + p.w / 2, host.tile);
    const dy = p.y + p.h / 2 - (c.y - 14);
    const sees = Math.hypot(dx, dy) < P.notice * host.tile && clear(host.terrain, c.x, c.y - 14, dx, dy, host.tile);
    const facing = dx < 0 ? -1 : 1;
    const timer = c.timer - dt;
    if (c.state === 'idle') return sees && timer <= 0 ? { ...c, state: 'warn', timer: P.warn, facing } : { ...c, timer };
    if (c.state === 'warn') return timer > 0 ? { ...c, timer, facing } : { ...c, state: 'swell', timer: P.swell, facing };
    if (c.state === 'swell') {
      if (timer > 0) return { ...c, timer, facing };
      if (sees) {
        // Flight time from the distance; the arc's rise makes up for the fall on the way.
        const tf = Math.min(1.2, Math.max(0.35, Math.hypot(dx, dy) / P.glob));
        this.globs.push({ id: nextGlob++, x: c.x, y: c.y - 24, vx: dx / tf, vy: (dy + 10) / tf - 0.5 * GLOB.gravity * tf, age: 0 });
        events.push({ kind: 'spat' });
      }
      return { ...c, state: 'rest', timer: P.rest, facing };
    }
    return timer > 0 ? { ...c, timer } : { ...c, state: 'idle', timer: 0 };
  }

  /**
   * Hangs coiled; when you pass under it, a moment's warning, then it
   * whips down. Catching you, it holds on and squeezes (a hit every few
   * seconds) until you struggle free (jump) or shoot it; missing, it pulls
   * back up and rests.
   */
  private tendril(c: Creature, dt: number, input: FaunaInput, host: FaunaHost, events: MineEvent[]): Creature {
    const T = CREATURE.tendril;
    const p = host.player;
    const full = reachOf(host.terrain, c, host.tile);
    const dx = ringDelta(host.terrain, c.x, p.x + p.w / 2, host.tile);
    const under = Math.abs(dx) < T.sense * host.tile + p.w / 2 && p.y + p.h > c.y && p.y < c.y + full;
    const timer = c.timer - dt;
    if (c.state === 'idle') return under ? { ...c, state: 'warn', timer: T.warn } : c;
    if (c.state === 'warn') return timer > 0 ? { ...c, timer } : { ...c, state: 'strike', timer: 0 };
    if (c.state === 'strike') {
      const reach = Math.min(1, c.reach + dt / T.strike);
      if (overlaps(host, p, { x: c.x - 8, y: c.y, w: 16, h: reach * full }) && this.held === null) {
        this.held = c.id;
        this.struggles = 0;
        host.hurt();
        events.push({ kind: 'grabbed' });
        return { ...c, state: 'hold', reach, timer: T.squeeze };
      }
      return reach >= 1 ? { ...c, state: 'retract', reach } : { ...c, reach };
    }
    if (c.state === 'hold') {
      if (input.jump && ++this.struggles >= T.struggle) {
        this.release(events);
        return { ...c, state: 'retract' };
      }
      // It keeps hold of you where you are: its frond follows you down.
      const reach = Math.min(1, Math.max(0.15, (p.y + 6 - c.y) / full));
      if (timer > 0) return { ...c, timer, reach };
      host.hurt();
      return { ...c, timer: T.squeeze, reach };
    }
    if (c.state === 'retract') {
      const reach = Math.max(0, c.reach - dt / T.retract);
      return reach > 0 ? { ...c, reach } : { ...c, reach: 0, state: 'rest', timer: T.rest };
    }
    return timer > 0 ? { ...c, timer } : { ...c, state: 'idle', timer: 0 };
  }

  private release(events: MineEvent[]): void {
    if (this.held === null) return;
    this.held = null;
    events.push({ kind: 'freed' });
  }

  /** A clot in flight: falls in its arc, breaks on rock, and on you it's a hit and a lungful of spores. */
  private fly(g: Glob, dt: number, host: FaunaHost): Glob[] {
    const next = { ...g, x: foldX(host.terrain, g.x + g.vx * dt, host.tile), y: g.y + g.vy * dt, vy: g.vy + GLOB.gravity * dt, age: g.age + dt };
    if (next.age > GLOB.life || isSolid(host.terrain, Math.floor(next.x / host.tile), Math.floor(next.y / host.tile))) return [];
    const r = GLOB.size / 2;
    if (overlaps(host, { x: next.x - r, y: next.y - r, w: r * 2, h: r * 2 }, host.player)) {
      host.hurt();
      host.loseAir(CREATURE.puffball.air);
      return [];
    }
    return [next];
  }
}

/**
 * Crawls along the ground, stepping up a tile or down one, turning before
 * a wall or a drop it can't take (and now and then for no reason); shot,
 * it curls up a while. It falls if the ground goes from under it.
 */
function grazer(c: Creature, dt: number, host: FaunaHost): Creature {
  const t = host.terrain;
  const T = host.tile;
  const timer = c.timer - dt;
  if (c.state === 'curled') return timer > 0 ? { ...c, timer } : { ...c, state: 'walk', timer: 4 };
  // Caps are its food, not its ground: it crawls in among them.
  const isSolid = (x: number, y: number): boolean => firm(t, x, y);
  const col = Math.floor(c.x / T);
  const row = Math.floor((c.y - 1) / T);
  // Nothing under it: it drops, a tile line at a time, so it can't fall through one.
  if (!isSolid(col, row + 1)) return { ...c, y: Math.min(c.y + 300 * dt, (Math.floor(c.y / T) + 1) * T) };
  const turned = { ...c, facing: c.facing === 1 ? -1 : 1, timer: 5 + (c.id % 4) } as const;
  if (timer <= 0) return turned;
  // How a column's ground stands against this one's: level, a step up, a step down, or no way on.
  const level = (ax: number): number | null => {
    if (!isSolid(ax, row) && isSolid(ax, row + 1)) return 0;
    if (isSolid(ax, row) && !isSolid(ax, row - 1) && !isSolid(col, row - 1)) return -1;
    if (!isSolid(ax, row) && !isSolid(ax, row + 1) && isSolid(ax, row + 2)) return 1;
    return null;
  };
  const ahead = Math.floor((c.x + c.facing * T * 0.45) / T);
  if (ahead !== col && level(ahead) === null) return turned;
  const x = c.x + c.facing * CREATURE.grazer.speed * T * dt;
  const next = Math.floor(x / T);
  const y = next !== col ? c.y + (level(next) ?? 0) * T : c.y;
  return { ...c, x: foldX(t, x, T), y, timer };
}

/** Beats: each beat a wave of spores (air lost within its reach); touching her is a hit, and throws you off. */
function mother(c: Creature, dt: number, host: FaunaHost, events: MineEvent[]): Creature {
  const M = CREATURE.mother;
  let timer = c.timer + dt;
  if (timer >= M.beat) {
    timer -= M.beat;
    const near = edgeDistance(host, bodyOf(c, host.terrain, host.tile)) < M.wave * host.tile;
    if (near) host.loseAir(M.waveAir);
    events.push({ kind: 'beat', near });
  }
  const body = bodyOf(c, host.terrain, host.tile);
  if (overlaps(host, host.player, body)) {
    host.hurt();
    const dx = ringDelta(host.terrain, c.x, host.player.x + host.player.w / 2, host.tile);
    host.push((dx < 0 ? -1 : 1) * M.push, -220);
  }
  return { ...c, timer };
}

/** Ground a grazer walks on: anything solid but a cap. */
function firm(t: Terrain, x: number, y: number): boolean {
  return isSolid(t, x, y) && tileAt(t, x, y) !== TILE.cap;
}

/** How far down a tendril can reach from its knot: its full length, or to the floor under it. */
export function reachOf(t: Terrain, c: Creature, tile: number): number {
  const col = Math.floor(c.x / tile);
  const top = Math.floor(c.y / tile);
  let rows = 0;
  while (rows < CREATURE.tendril.reach && !isSolid(t, col, top + rows)) rows++;
  return Math.max(tile * 0.5, Math.min(CREATURE.tendril.reach, rows) * tile);
}

/** The box a creature is hit in, px. */
export function bodyOf(c: Creature, t: Terrain, tile: number): Box {
  if (c.kind === 'puffball') return { x: c.x - 13, y: c.y - 28, w: 26, h: 28 };
  if (c.kind === 'tendril') return { x: c.x - 10, y: c.y, w: 20, h: Math.max(14, c.reach * reachOf(t, c, tile)) };
  if (c.kind === 'grazer') return { x: c.x - 22, y: c.y - 24, w: 44, h: 24 };
  const M = CREATURE.mother;
  return { x: c.x - (M.w * tile) / 2, y: c.y - M.h * tile, w: M.w * tile, h: M.h * tile };
}

/** Whether two boxes overlap, measured the short way round. */
function overlaps(host: FaunaHost, a: Box, b: Box): boolean {
  const bx = a.x + ringDelta(host.terrain, a.x, b.x, host.tile);
  return a.x < bx + b.w && a.x + a.w > bx && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** From the prospector's middle to (x, y), px, the short way round. */
function distance(host: FaunaHost, x: number, y: number): number {
  const p = host.player;
  return Math.hypot(ringDelta(host.terrain, p.x + p.w / 2, x, host.tile), p.y + p.h / 2 - y);
}

/** From the prospector's middle to the nearest edge of a box, px (0 inside it). */
function edgeDistance(host: FaunaHost, b: Box): number {
  const p = host.player;
  const dx = Math.max(0, Math.abs(ringDelta(host.terrain, b.x + b.w / 2, p.x + p.w / 2, host.tile)) - b.w / 2);
  const dy = Math.max(0, Math.abs(p.y + p.h / 2 - (b.y + b.h / 2)) - b.h / 2);
  return Math.hypot(dx, dy);
}

/** Whether nothing solid lies on the straight line from (x, y) along (dx, dy). */
function clear(t: Terrain, x: number, y: number, dx: number, dy: number, tile: number): boolean {
  const steps = Math.ceil(Math.hypot(dx, dy) / (tile / 3));
  for (let i = 1; i < steps; i++) {
    const k = i / steps;
    if (isSolid(t, Math.floor((x + dx * k) / tile), Math.floor((y + dy * k) / tile))) return false;
  }
  return true;
}
