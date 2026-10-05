import Phaser from 'phaser';
import { FISH_RADIUS } from '../../art/fishArt';
import { fishKey } from '../../art/textures';
import { SPECIES_INFO } from '../../levels/species';
import type { LevelDef, SpeciesId } from '../../levels/types';
import { DUCK, nearestDecoy, type Decoy } from '../../logic/decoy';
import { rangeOf, type Rng } from '../../logic/rng';
import { pickSpawn, relationTo } from '../../logic/sizing';
import { keepInWater } from '../../logic/water';
import { pastView } from '../../logic/ring';
import { isSquid } from '../../art/squidArt';
import { renderSquid, updateSquid } from './squid';
import { attachSquid } from './squidRig';
import { attachTail, setSwimTexture, setTailBeat, stroke, turnToward, type SwimState } from './swim';

/** Ordinary fish come and go; marked fish and the giant are level goals and never leave. */
export type FishRole = 'normal' | 'bounty' | 'boss';

export interface Fish extends SwimState {
  readonly sprite: Phaser.GameObjects.Image;
  readonly species: SpeciesId;
  readonly role: FishRole;
  readonly baseSize: number;
  /** Current radius after puffing. */
  size: number;
  vx: number;
  vy: number;
  phase: number;
  /** Timestamps (scene time ms) for behaviour states. */
  /** Shocked by a battery: edible while stunned even if it's a bit bigger than you. */
  shockedUntil: number;
  stateUntil: number;
  cooldownUntil: number;
  /** After eating another fish, a hunter ignores prey until this time. */
  fullUntil: number;
  /** Lean to follow the ground under a crawler, radians (0 for swimmers). */
  tilt: number;
  /** How far it has gone sideways since it was spawned, px: after a lap of the ring an ordinary fish moves on. */
  swum: number;
  /** dead: knocked out by a firecracker, floating belly-up; anyone can eat it. */
  state: 'cruise' | 'chase' | 'lunge' | 'puffed' | 'tired' | 'stunned' | 'hooked' | 'dead';
}

const cruiseOf = (species: SpeciesId): readonly [number, number] => SPECIES_INFO[species].cruise;

/**
 * Spawns a fish somewhere round the ring but outside the camera view
 * (so nothing pops into existence on screen), heading across the player's way.
 */
export function spawnFish(scene: Phaser.Scene, level: LevelDef, playerSize: number, view: Phaser.Geom.Rectangle, rng: Rng): Fish {
  const { entry, size } = pickSpawn(level.spawns, playerSize, rng);
  const margin = size * 2 + 40;
  let x = 0;
  let y = 0;
  const half = level.world.width / 2;
  for (let attempt = 0; attempt < 12; attempt++) {
    x = rangeOf(rng, view.centerX - half, view.centerX + half);
    y = rangeOf(rng, 140, level.world.height - 170);
    const onScreen = x > view.left - margin && x < view.right + margin && y > view.top - margin && y < view.bottom + margin;
    if (!onScreen) break;
  }
  const speed = rangeOf(rng, ...cruiseOf(entry.species));
  // Head towards the view so fish cross the player's area.
  const goRight = x < view.centerX ? rng() < 0.8 : rng() < 0.2;
  return makeFish(scene, entry.species, size, 'normal', x, y, goRight ? speed : -speed, rng);
}

/** A goal fish placed by the level: a marked fish or the giant. */
export function spawnSpecial(scene: Phaser.Scene, species: SpeciesId, size: number, role: FishRole, x: number, y: number, rng: Rng): Fish {
  const speed = rangeOf(rng, ...cruiseOf(species)) * (rng() < 0.5 ? -1 : 1);
  return makeFish(scene, species, size, role, x, y, speed, rng);
}

export function makeFish(scene: Phaser.Scene, species: SpeciesId, size: number, role: FishRole, x: number, y: number, vx: number, rng: Rng): Fish {
  const sprite = scene.add.image(x, y, fishKey(species, 'light', 0)).setDepth(role === 'boss' ? 11 : 10).setScale(size / FISH_RADIUS).setFlipX(vx < 0);
  if (isSquid(species)) attachSquid(sprite);
  else attachTail(sprite, species);
  return {
    sprite, species, role, baseSize: size, size, vx, vy: 0, phase: rng() * Math.PI * 2, swim: rng() * Math.PI * 2, turn: vx < 0 ? -1 : 1,
    tilt: 0, swum: 0, shockedUntil: 0, stateUntil: 0, cooldownUntil: 0, fullUntil: 0, state: 'cruise',
  };
}

/** Everyday behaviour by species type (see levels/species.ts). */
function behave(f: Fish, p: PlayerView, dist: number, rel: string, now: number, dt: number): void {
  const canStrike = f.state === 'cruise' && rel === 'predator' && now > f.cooldownUntil;
  switch (SPECIES_INFO[f.species].behaviour) {
    case 'school':
      if (rel === 'prey' && dist < 130) steerTo(f, f.sprite.x * 2 - p.x, f.sprite.y * 2 - p.y, 125, dt);
      else f.vy = Math.sin(f.phase * 3) * 30;
      return;
    case 'puff':
      if (f.state === 'cruise' && dist < 150 + f.size && now > f.cooldownUntil) {
        f.state = 'puffed';
        f.stateUntil = now + 2200;
      }
      f.vy = Math.sin(f.phase * 1.5) * 12;
      return;
    case 'chase':
      if (canStrike && dist < 380) Object.assign(f, { state: 'chase', stateUntil: now + 2800 });
      if (f.state === 'chase') steerTo(f, p.x, p.y, 175, dt);
      else f.vy = Math.sin(f.phase) * 18;
      return;
    case 'lunge':
      if (canStrike && dist < 230) Object.assign(f, { state: 'lunge', stateUntil: now + 550 });
      if (f.state === 'lunge') steerTo(f, p.x, p.y, 360, dt, 8);
      else f.vy = Math.sin(f.phase * 0.8) * 10;
      return;
    case 'wave':
      f.vy = Math.cos(f.phase * 1.6) * 70;
      return;
    case 'hover':
      f.vy = Math.sin(f.phase * 0.7) * 6;
      return;
    default:
      f.vy = Math.sin(f.phase * 1.2) * 20;
  }
}

/** Goal fish have their own minds: marked fish flee, the giant hunts you down. Returns true if it steered. */
function updateGoalFish(f: Fish, p: PlayerView, dist: number, rel: string, now: number, dt: number): boolean {
  if (f.role === 'bounty') {
    if (rel !== 'prey' || dist > 190) return false;
    steerTo(f, f.sprite.x * 2 - p.x, f.sprite.y * 2 - p.y, 150, dt);
    return true;
  }
  if (f.role !== 'boss') return false;
  if (rel === 'prey' && dist < 320) {
    steerTo(f, f.sprite.x * 2 - p.x, f.sprite.y * 2 - p.y, 175, dt);
    return true;
  }
  if (f.state === 'cruise' && rel === 'predator' && dist < 620 && now > f.cooldownUntil) {
    f.state = 'chase';
    f.stateUntil = now + 3200;
  }
  if (f.state !== 'chase') return false;
  steerTo(f, p.x, p.y, 168, dt);
  return true;
}

export interface PlayerView {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** Hiding in cover: fish neither chase it nor flee from it. */
  readonly hidden?: boolean;
}

function steerTo(f: Fish, tx: number, ty: number, speed: number, dt: number, accel = 3): void {
  const dx = tx - f.sprite.x;
  const dy = ty - f.sprite.y;
  const d = Math.hypot(dx, dy) || 1;
  f.vx += ((dx / d) * speed - f.vx) * Math.min(1, dt * accel);
  f.vy += ((dy / d) * speed - f.vy) * Math.min(1, dt * accel);
}

/** Jellyfish sting: the fish stops swimming and sinks a little, harmless while it lasts. */
export function stunFish(f: Fish, now: number, ms: number): void {
  if (f.state === 'hooked' || f.state === 'stunned') return;
  f.state = 'stunned';
  f.stateUntil = now + ms;
}

/** Fish that can't bite, chase or be bitten by the player right now. */
export function isHelpless(f: Fish): boolean {
  return f.state === 'hooked' || f.state === 'stunned' || f.state === 'dead';
}

export type { Decoy };

/** Hunters that could threaten the player go for a nearby duck instead. */
function lureOf(f: Fish, player: PlayerView, decoys: readonly Decoy[]): Decoy | null {
  if (!decoys.length || f.role === 'bounty' || relationTo(player.size, f.size) === 'prey') return null;
  const b = SPECIES_INFO[f.species].behaviour;
  if (f.role !== 'boss' && b !== 'chase' && b !== 'lunge' && !isSquid(f.species)) return null;
  return nearestDecoy(f.sprite.x, f.sprite.y, decoys, DUCK.lure);
}

/** Mobbing a duck: circling just under it, snapping at it. */
function mobDecoy(f: Fish, d: Decoy, now: number, dt: number): void {
  Object.assign(f, { state: 'chase', stateUntil: now + 600 });
  const tx = d.x + Math.cos(f.phase * 2.2) * (f.size + 30);
  const ty = d.y + f.size + 20 + Math.sin(f.phase * 3.1) * 18;
  steerTo(f, tx, ty, SPECIES_INFO[f.species].behaviour === 'lunge' ? 230 : 180, dt);
}

/** The level as a swimmer sees it: its size and, when known, the seabed under any x. */
export interface SeaWorld {
  readonly width: number;
  readonly height: number;
  floorAt?(x: number): number;
}

/** Per-species behaviour. Mutates the fish in place (hot loop, pooled entities). */
export function updateFish(f: Fish, player: PlayerView, world: SeaWorld, now: number, dt: number, decoys: readonly Decoy[] = []): void {
  f.phase += dt;
  // A hooked fish is moved by its hook.
  if (f.state === 'hooked') return;
  if (f.state === 'dead') {
    // Belly-up, drifting slowly towards the light.
    f.vx -= f.vx * Math.min(1, dt * 3);
    f.sprite.x += f.vx * dt;
    f.sprite.y = keepInWater(f.sprite.y - 16 * dt, -16, f.size, world.height, world.floorAt?.(f.sprite.x)).y;
    return;
  }
  // Hunters go for a nearby duck when there is one; everyone else reacts to the player.
  const lure = f.state === 'stunned' ? null : lureOf(f, player, decoys);
  const p: PlayerView = lure && isSquid(f.species) ? { ...player, x: lure.x, y: lure.y, hidden: false } : player;
  const dist = Phaser.Math.Distance.Between(f.sprite.x, f.sprite.y, p.x, p.y);
  const puffed = f.state === 'puffed' && now < f.stateUntil;
  f.size = f.baseSize * (puffed ? 1.7 : 1);
  // A hidden player is invisible: nobody chases it, nobody runs from it.
  const rel = p.hidden ? 'peer' : relationTo(p.size, f.size);
  if (p.hidden && (f.state === 'chase' || f.state === 'lunge')) Object.assign(f, { state: 'tired', stateUntil: now + 1800, cooldownUntil: now + 3000 });
  const cruise = Math.sign(f.vx || (f.sprite.flipX ? -1 : 1)) * cruiseOf(f.species)[0];

  if (f.state !== 'cruise' && now >= f.stateUntil) {
    f.state = f.state === 'chase' || f.state === 'lunge' ? 'tired' : 'cruise';
    f.stateUntil = now + 1800;
    f.cooldownUntil = now + 3000;
  }

  if (isSquid(f.species) && f.state !== 'stunned') {
    updateSquid(f, p, dist, world, now, dt);
    return;
  }
  if (f.state === 'stunned') {
    f.vx -= f.vx * Math.min(1, dt * 4);
    f.vy = 22;
  } else if (lure) {
    mobDecoy(f, lure, now, dt);
  } else if (updateGoalFish(f, p, dist, rel, now, dt)) {
    // Steered by its role.
  } else {
    behave(f, p, dist, rel, now, dt);
  }

  // Ease back to cruising speed after a chase.
  if (f.state === 'cruise' || f.state === 'tired' || f.state === 'puffed') {
    f.vx += (cruise - f.vx) * Math.min(1, dt * 1.5);
  }
  f.sprite.x += f.vx * dt;
  const water = keepInWater(f.sprite.y + f.vy * dt, f.vy, f.size, world.height, world.floorAt?.(f.sprite.x));
  f.sprite.y = water.y;
  f.vy = water.vy;
}

export function renderFish(f: Fish, playerSize: number, frame: number, dt: number): void {
  const heavy = relationTo(playerSize, f.size) === 'predator' && !isHelpless(f);
  if (isSquid(f.species)) {
    renderSquid(f, frame, dt, heavy);
    return;
  }
  setSwimTexture(f.sprite, fishKey(f.species, heavy ? 'heavy' : 'light', frame));
  // Ease scale (y holds the true size) so puffing animates instead of popping.
  const target = f.size / FISH_RADIUS;
  const scale = f.sprite.scaleY + (target - f.sprite.scaleY) * 0.25;
  if (f.state === 'dead') {
    // Belly-up and limp: the tail just sways with the water.
    setTailBeat(f.sprite, Math.sin(f.phase * 1.3) * 0.06);
    f.sprite.setScale(scale).setTint(0xb3ab9c).setFlipY(true).setRotation(f.tilt + Math.sin(f.phase * 1.5) * 0.08);
    return;
  }
  f.sprite.setFlipY(false);
  if (f.state === 'stunned') f.sprite.setTint(0xc4a8e0);
  else f.sprite.clearTint();
  if (f.state === 'hooked') {
    // Hanging from the barb by the mouth, thrashing.
    setTailBeat(f.sprite, stroke(f, 0, dt, 3.2));
    f.sprite.setScale(scale).setFlipX(false).setRotation(-Math.PI / 2 + Math.sin(f.phase * 22) * 0.3);
    return;
  }
  const speed = Math.hypot(f.vx, f.vy);
  const effort = f.state === 'stunned' ? 0.35 : f.state === 'chase' || f.state === 'lunge' ? 1.5 : 1;
  setTailBeat(f.sprite, stroke(f, speed, dt, effort));
  // Turning round: squash through edge-on, flipping at the midpoint.
  const facing = turnToward(f, Math.abs(f.vx) > 4 ? (f.vx < 0 ? -1 : 1) : 0, dt);
  f.sprite.setFlipX(f.turn < 0).setScale(scale * facing, scale);
  const wobble = f.state === 'stunned' ? Math.sin(f.phase * 9) * 0.2 : 0;
  f.sprite.setRotation(f.tilt + Phaser.Math.Clamp(f.vy / 400, -0.35, 0.35) * (f.sprite.flipX ? -1 : 1) + wobble);
}

/** An ordinary fish done with this level: out of the water, or a lap swum and out of sight. Goal fish never are. */
export function isSpent(f: Fish, level: LevelDef, view: Phaser.Geom.Rectangle): boolean {
  if (f.role !== 'normal') return false;
  const m = f.size * 3 + 40;
  const { x, y } = f.sprite;
  if (y < -m || y > level.world.height + m) return true;
  return f.swum > level.world.width && pastView(x, view.centerX, view.width, level.world.width, m);
}
