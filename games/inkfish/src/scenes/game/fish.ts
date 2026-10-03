import Phaser from 'phaser';
import { FISH_RADIUS } from '../../art/fishArt';
import { fishKey } from '../../art/textures';
import { SPECIES_INFO } from '../../levels/species';
import type { LevelDef, SpeciesId } from '../../levels/types';
import { rangeOf, type Rng } from '../../logic/rng';
import { pickSpawn, relationTo } from '../../logic/sizing';
import { keepInWater } from '../../logic/water';

/** Ordinary fish come and go; marked fish and the giant are level goals and never leave. */
export type FishRole = 'normal' | 'bounty' | 'boss';

export interface Fish {
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
  /** dead: knocked out by a firecracker, floating belly-up; anyone can eat it. */
  state: 'cruise' | 'chase' | 'lunge' | 'puffed' | 'tired' | 'stunned' | 'hooked' | 'dead';
}

const cruiseOf = (species: SpeciesId): readonly [number, number] => SPECIES_INFO[species].cruise;

/**
 * Spawns a fish somewhere in the world but outside the camera view
 * (so nothing pops into existence on screen), heading across the map.
 */
export function spawnFish(scene: Phaser.Scene, level: LevelDef, playerSize: number, view: Phaser.Geom.Rectangle, rng: Rng): Fish {
  const { entry, size } = pickSpawn(level.spawns, playerSize, rng);
  const margin = size * 2 + 40;
  let x = 0;
  let y = 0;
  for (let attempt = 0; attempt < 12; attempt++) {
    x = rangeOf(rng, -margin, level.world.width + margin);
    y = rangeOf(rng, 140, level.world.height - 170);
    const onScreen = x > view.left - margin && x < view.right + margin && y > view.top - margin && y < view.bottom + margin;
    if (!onScreen) break;
  }
  const speed = rangeOf(rng, ...cruiseOf(entry.species));
  // Head towards the far side so fish cross the player's area.
  const goRight = x < level.world.width / 2 ? rng() < 0.8 : rng() < 0.2;
  return makeFish(scene, entry.species, size, 'normal', x, y, goRight ? speed : -speed, rng);
}

/** A goal fish placed by the level: a marked fish or the giant. */
export function spawnSpecial(scene: Phaser.Scene, species: SpeciesId, size: number, role: FishRole, x: number, y: number, rng: Rng): Fish {
  const speed = rangeOf(rng, ...cruiseOf(species)) * (rng() < 0.5 ? -1 : 1);
  return makeFish(scene, species, size, role, x, y, speed, rng);
}

function makeFish(scene: Phaser.Scene, species: SpeciesId, size: number, role: FishRole, x: number, y: number, vx: number, rng: Rng): Fish {
  const sprite = scene.add.image(x, y, fishKey(species, 'light', 0)).setDepth(role === 'boss' ? 11 : 10).setScale(size / FISH_RADIUS);
  return {
    sprite, species, role, baseSize: size, size, vx, vy: 0, phase: rng() * Math.PI * 2,
    shockedUntil: 0, stateUntil: 0, cooldownUntil: 0, fullUntil: 0, state: 'cruise',
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

/** Per-species behaviour. Mutates the fish in place (hot loop, pooled entities). */
/** A point hunters chase instead of the player (a rubber duck decoy). */
export interface Decoy {
  readonly x: number;
  readonly y: number;
}

export function updateFish(
  f: Fish, player: PlayerView, world: { readonly width: number; readonly height: number }, now: number, dt: number, decoy: Decoy | null = null,
): void {
  f.phase += dt;
  // A hooked fish is moved by its hook.
  if (f.state === 'hooked') return;
  if (f.state === 'dead') {
    // Belly-up, drifting slowly towards the light.
    f.vx -= f.vx * Math.min(1, dt * 3);
    f.sprite.x += f.vx * dt;
    f.sprite.y = keepInWater(f.sprite.y - 16 * dt, -16, f.size, world.height).y;
    return;
  }
  // Hunters go for the decoy when there is one; everyone else reacts to the player.
  const p: PlayerView = decoy && SPECIES_INFO[f.species].behaviour !== 'school' ? { ...player, ...decoy } : player;
  const dist = Phaser.Math.Distance.Between(f.sprite.x, f.sprite.y, p.x, p.y);
  const puffed = f.state === 'puffed' && now < f.stateUntil;
  f.size = f.baseSize * (puffed ? 1.7 : 1);
  const rel = relationTo(p.size, f.size);
  const cruise = Math.sign(f.vx || (f.sprite.flipX ? -1 : 1)) * cruiseOf(f.species)[0];

  if (f.state !== 'cruise' && now >= f.stateUntil) {
    f.state = f.state === 'chase' || f.state === 'lunge' ? 'tired' : 'cruise';
    f.stateUntil = now + 1800;
    f.cooldownUntil = now + 3000;
  }

  if (f.state === 'stunned') {
    f.vx -= f.vx * Math.min(1, dt * 4);
    f.vy = 22;
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
  if (f.role !== 'normal') turnAtWalls(f, world.width);
  const water = keepInWater(f.sprite.y + f.vy * dt, f.vy, f.size, world.height);
  f.sprite.y = water.y;
  f.vy = water.vy;
}

/** Goal fish patrol the level instead of swimming off it. */
function turnAtWalls(f: Fish, width: number): void {
  const m = f.size + 40;
  if (f.sprite.x < m) f.vx = Math.abs(f.vx);
  else if (f.sprite.x > width - m) f.vx = -Math.abs(f.vx);
}

export function renderFish(f: Fish, playerSize: number, frame: number): void {
  const heavy = relationTo(playerSize, f.size) === 'predator' && !isHelpless(f);
  f.sprite.setTexture(fishKey(f.species, heavy ? 'heavy' : 'light', frame));
  // Ease scale so puffing animates instead of popping.
  const target = f.size / FISH_RADIUS;
  f.sprite.setScale(f.sprite.scaleX + (target - f.sprite.scaleX) * 0.25);
  if (f.state === 'dead') {
    f.sprite.setTint(0xb3ab9c).setFlipY(true).setRotation(Math.sin(f.phase * 1.5) * 0.08);
    return;
  }
  f.sprite.setFlipY(false);
  if (f.state === 'stunned') f.sprite.setTint(0xc4a8e0);
  else f.sprite.clearTint();
  if (f.state === 'hooked') {
    // Hanging from the barb by the mouth, thrashing.
    f.sprite.setFlipX(false).setRotation(-Math.PI / 2 + Math.sin(f.phase * 22) * 0.3);
    return;
  }
  if (Math.abs(f.vx) > 4) f.sprite.setFlipX(f.vx < 0);
  const wobble = f.state === 'stunned' ? Math.sin(f.phase * 9) * 0.2 : 0;
  f.sprite.setRotation(Phaser.Math.Clamp(f.vy / 400, -0.35, 0.35) * (f.sprite.flipX ? -1 : 1) + wobble);
}

export function isOffWorld(f: Fish, level: LevelDef): boolean {
  if (f.role !== 'normal') return false;
  const m = f.size * 3 + 40;
  const { x, y } = f.sprite;
  return x < -m || x > level.world.width + m || y < -m || y > level.world.height + m;
}
