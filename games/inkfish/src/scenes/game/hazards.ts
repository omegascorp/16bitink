import Phaser from 'phaser';
import { ART_RES, boilKey } from '../../art/textures';
import type { LevelDef } from '../../levels/types';
import { rangeOf, type Rng } from '../../logic/rng';
import { TUNING } from './tuning';

export interface Jelly {
  readonly sprite: Phaser.GameObjects.Image;
  readonly radius: number;
  vx: number;
  phase: number;
}

export function spawnJellies(scene: Phaser.Scene, level: LevelDef, rng: Rng): Jelly[] {
  return Array.from({ length: level.hazards.jellyfish }, () => {
    const sprite = scene.add
      .image(rangeOf(rng, 200, level.world.width - 200), rangeOf(rng, 300, level.world.height - 300), boilKey('jelly', 0))
      .setDepth(9)
      .setScale(0.7 / ART_RES);
    return { sprite, radius: 30, vx: rangeOf(rng, -25, 25), phase: rng() * 6 };
  });
}

export function updateJelly(j: Jelly, level: LevelDef, dt: number, frame: number): void {
  j.phase += dt;
  j.sprite.x = Phaser.Math.Wrap(j.sprite.x + j.vx * dt, -60, level.world.width + 60);
  // Pulse upward, drift down: the jellyfish "breathes".
  j.sprite.y += (Math.sin(j.phase * 2) > 0.6 ? -55 : 14) * dt;
  j.sprite.y = Phaser.Math.Clamp(j.sprite.y, 140, level.world.height - 200);
  j.sprite.setTexture(boilKey('jelly', frame));
}

export type HookPhase = 'warn' | 'drop' | 'hold' | 'reel';

export interface Hook {
  readonly sprite: Phaser.GameObjects.Image;
  readonly line: Phaser.GameObjects.Graphics;
  readonly x: number;
  readonly depth: number;
  phase: HookPhase;
  t: number;
  y: number;
  /** Radius of whatever hangs on the barb; 0 while the hook is empty. */
  load: number;
}

/** Drops near the player so it's a real threat, telegraphed by a dotted line first. */
export function spawnHook(scene: Phaser.Scene, level: LevelDef, px: number, py: number, rng: Rng): Hook {
  const x = Phaser.Math.Clamp(px + rangeOf(rng, -260, 260), 120, level.world.width - 120);
  const depth = Phaser.Math.Clamp(py + rangeOf(rng, -120, 160), 260, level.world.height - 220);
  const sprite = scene.add.image(x, -80, boilKey('hook', 0)).setOrigin(0.66, 0.05).setDepth(12).setScale(1 / ART_RES);
  const line = scene.add.graphics().setDepth(11);
  return { sprite, line, x, depth, phase: 'warn', t: 0, y: -80, load: 0 };
}

/** Returns false when the hook has left the screen and should be destroyed. */
export function updateHook(h: Hook, dtMs: number, frame: number): boolean {
  h.t += dtMs;
  h.line.clear();
  if (h.phase === 'warn') {
    // Dotted pencil guide line growing down towards the target depth.
    const reach = h.depth * Math.min(1, h.t / TUNING.hookWarnMs);
    h.line.fillStyle(0x1b1a1f, 0.45);
    for (let y = 0; y < reach; y += 16) h.line.fillCircle(h.x, y, 2);
    if (h.t >= TUNING.hookWarnMs) Object.assign(h, { phase: 'drop', t: 0 });
  } else if (h.phase === 'drop') {
    h.y = Phaser.Math.Linear(-80, h.depth, Math.min(1, h.t / 280));
    if (h.t >= 280) Object.assign(h, { phase: 'hold', t: 0 });
  } else if (h.phase === 'hold') {
    h.y = h.depth + Math.sin(h.t / 300) * 8;
    if (h.t >= TUNING.hookHoldMs) Object.assign(h, { phase: 'reel', t: 0 });
  } else {
    // A loaded hook starts with a hard jerk and keeps hauling; an empty one just lifts.
    const speed = h.load > 0 ? 0.45 + Math.min(1, h.t / 500) * 0.55 : 0.9;
    h.y -= dtMs * speed;
    if (h.y < -120 - h.load * 2.2) return false;
  }
  if (h.phase !== 'warn') {
    h.line.lineStyle(1.6, 0x1b1a1f, 0.85);
    h.line.lineBetween(h.x, 0, h.x, h.y);
  }
  h.sprite.setPosition(h.x, h.y).setTexture(boilKey('hook', frame));
  return true;
}

/** World-space point of the barb, used for collisions. Only an empty, lowered hook bites. */
export function hookTip(h: Hook): { x: number; y: number; active: boolean } {
  return { x: h.x - 10, y: h.y + 56, active: h.load === 0 && (h.phase === 'drop' || h.phase === 'hold') };
}

/** Something bit: start reeling it in at once. */
export function hookCatch(h: Hook, radius: number): void {
  Object.assign(h, { phase: 'reel', t: 0, load: radius });
}

/** The catch slipped off: the hook keeps rising empty. */
export function hookRelease(h: Hook): void {
  h.load = 0;
}

/**
 * Where the centre of a fish hanging from the barb sits: mouth on the hook,
 * body below it, swinging a little as it thrashes.
 */
export function hangPoint(h: Hook, radius: number, phase: number): { x: number; y: number } {
  const tip = hookTip(h);
  return { x: tip.x + Math.sin(phase * 6) * radius * 0.15, y: tip.y + radius * 0.85 };
}

export function destroyHook(h: Hook): void {
  h.sprite.destroy();
  h.line.destroy();
}
