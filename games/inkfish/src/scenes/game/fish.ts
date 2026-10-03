import Phaser from 'phaser';
import { FISH_RADIUS } from '../../art/fishArt';
import { fishKey } from '../../art/textures';
import type { LevelDef, SpeciesId } from '../../levels/types';
import { rangeOf, type Rng } from '../../logic/rng';
import { pickSpawn, relationTo } from '../../logic/sizing';

export interface Fish {
  readonly sprite: Phaser.GameObjects.Image;
  readonly species: SpeciesId;
  readonly baseSize: number;
  /** Current radius after puffing/shrinking. */
  size: number;
  vx: number;
  vy: number;
  phase: number;
  /** Timestamps (scene time ms) for behaviour states. */
  shrinkUntil: number;
  stateUntil: number;
  cooldownUntil: number;
  state: 'cruise' | 'chase' | 'lunge' | 'puffed' | 'tired' | 'hooked';
}

const CRUISE: Record<SpeciesId, [number, number]> = {
  minnow: [90, 140], perch: [60, 95], puffer: [35, 55], pike: [70, 100], angler: [25, 40], eel: [100, 130],
};

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
  const speed = rangeOf(rng, ...CRUISE[entry.species]);
  // Head towards the far side so fish cross the player's area.
  const goRight = x < level.world.width / 2 ? rng() < 0.8 : rng() < 0.2;
  const sprite = scene.add.image(x, y, fishKey(entry.species, 'light', 0)).setDepth(10).setScale(size / FISH_RADIUS);
  return {
    sprite, species: entry.species, baseSize: size, size,
    vx: goRight ? speed : -speed, vy: 0, phase: rng() * Math.PI * 2,
    shrinkUntil: 0, stateUntil: 0, cooldownUntil: 0, state: 'cruise',
  };
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

/** Per-species behaviour. Mutates the fish in place (hot loop, pooled entities). */
export function updateFish(f: Fish, p: PlayerView, now: number, dt: number): void {
  const dist = Phaser.Math.Distance.Between(f.sprite.x, f.sprite.y, p.x, p.y);
  const shrunk = now < f.shrinkUntil;
  const puffed = f.state === 'puffed' && now < f.stateUntil;
  f.size = f.baseSize * (shrunk ? 0.5 : 1) * (puffed ? 1.7 : 1);
  const rel = relationTo(p.size, f.size);
  const cruise = Math.sign(f.vx || 1) * CRUISE[f.species][0];
  f.phase += dt;

  if (f.state !== 'cruise' && now >= f.stateUntil && f.state !== 'hooked') {
    f.state = f.state === 'chase' || f.state === 'lunge' ? 'tired' : 'cruise';
    f.stateUntil = now + 1800;
    f.cooldownUntil = now + 3000;
  }

  switch (f.species) {
    case 'minnow':
      if (rel === 'prey' && dist < 130) steerTo(f, f.sprite.x * 2 - p.x, f.sprite.y * 2 - p.y, 125, dt);
      else f.vy = Math.sin(f.phase * 3) * 30;
      break;
    case 'puffer':
      if (f.state === 'cruise' && dist < 150 + f.size && now > f.cooldownUntil) {
        f.state = 'puffed';
        f.stateUntil = now + 2200;
      }
      f.vy = Math.sin(f.phase * 1.5) * 12;
      break;
    case 'pike':
      if (f.state === 'cruise' && rel === 'predator' && dist < 380 && now > f.cooldownUntil && !shrunk) {
        f.state = 'chase';
        f.stateUntil = now + 2800;
      }
      if (f.state === 'chase') steerTo(f, p.x, p.y, 175, dt);
      else f.vy = Math.sin(f.phase) * 18;
      break;
    case 'angler':
      if (f.state === 'cruise' && rel === 'predator' && dist < 230 && now > f.cooldownUntil && !shrunk) {
        f.state = 'lunge';
        f.stateUntil = now + 550;
      }
      if (f.state === 'lunge') steerTo(f, p.x, p.y, 360, dt, 8);
      else f.vy = Math.sin(f.phase * 0.8) * 10;
      break;
    case 'eel':
      f.vy = Math.cos(f.phase * 1.6) * 70;
      break;
    default:
      f.vy = Math.sin(f.phase * 1.2) * 20;
  }

  // Ease back to cruising speed after a chase.
  if (f.state === 'cruise' || f.state === 'tired' || f.state === 'puffed') {
    f.vx += (cruise - f.vx) * Math.min(1, dt * 1.5);
  }
  f.sprite.x += f.vx * dt;
  f.sprite.y += f.vy * dt;
}

export function renderFish(f: Fish, playerSize: number, frame: number): void {
  const heavy = relationTo(playerSize, f.size) === 'predator';
  f.sprite.setTexture(fishKey(f.species, heavy ? 'heavy' : 'light', frame));
  f.sprite.setFlipX(f.vx < 0);
  // Ease scale so puff/shrink animate instead of popping.
  const target = f.size / FISH_RADIUS;
  f.sprite.setScale(f.sprite.scaleX + (target - f.sprite.scaleX) * 0.25);
  f.sprite.setRotation(Phaser.Math.Clamp(f.vy / 400, -0.35, 0.35) * (f.vx < 0 ? -1 : 1));
}

export function isOffWorld(f: Fish, level: LevelDef): boolean {
  const m = f.size * 3 + 40;
  const { x, y } = f.sprite;
  return x < -m || x > level.world.width + m || y < -m || y > level.world.height + m;
}
