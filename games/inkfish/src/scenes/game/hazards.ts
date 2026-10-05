import Phaser from 'phaser';
import { ART_RES, boilKey, ensureJellyTextures, jellyKey } from '../../art/textures';
import { JELLY_INFO, pickJelly, type JellyId } from '../../levels/jellies';
import type { LevelDef, ZoneId } from '../../levels/types';
import { rangeOf, type Rng } from '../../logic/rng';
import { TUNING } from './tuning';
import { drawWorm } from './worm';

export interface Jelly {
  readonly sprite: Phaser.GameObjects.Image;
  readonly kind: JellyId;
  readonly radius: number;
  vx: number;
  phase: number;
}

/** A standard jelly's drawn scale and sting reach; each kind scales both. */
const JELLY_SCALE = 0.7;
const JELLY_RADIUS = 30;

export function spawnJellies(scene: Phaser.Scene, level: LevelDef, zone: ZoneId, rng: Rng): Jelly[] {
  const kinds = Array.from({ length: level.hazards.jellyfish }, () => pickJelly(zone, rng));
  ensureJellyTextures(scene, kinds);
  return kinds.map((kind) => {
    const { scale, motion } = JELLY_INFO[kind];
    const sprite = scene.add
      .image(rangeOf(rng, 200, level.world.width - 200), rangeOf(rng, 300, level.world.height - 300), jellyKey(kind, 0))
      .setDepth(9)
      .setScale((JELLY_SCALE * scale) / ART_RES);
    const drift = motion === 'dart' ? rangeOf(rng, 40, 70) * (rng() < 0.5 ? -1 : 1) : rangeOf(rng, -25, 25);
    return { sprite, kind, radius: JELLY_RADIUS * scale, vx: drift, phase: rng() * 6 };
  });
}

export function updateJelly(j: Jelly, level: LevelDef, dt: number, frame: number): void {
  j.phase += dt;
  j.sprite.x += j.vx * dt;
  const motion = JELLY_INFO[j.kind].motion;
  if (motion === 'glide') {
    // Comb jellies row smoothly on their combs: a slow, even bob.
    j.sprite.y += Math.sin(j.phase * 0.8) * 18 * dt;
  } else {
    // Pulse upward, drift down: the jellyfish "breathes".
    j.sprite.y += (Math.sin(j.phase * 2) > 0.6 ? -55 : 14) * dt;
  }
  j.sprite.y = Phaser.Math.Clamp(j.sprite.y, 140, level.world.height - 200);
  j.sprite.setTexture(jellyKey(j.kind, frame));
}

/** 'arrive': waiting, out of sight, while its boat sails into place. */
export type HookPhase = 'arrive' | 'warn' | 'drop' | 'hold' | 'reel';

export interface Hook {
  readonly sprite: Phaser.GameObjects.Image;
  readonly line: Phaser.GameObjects.Graphics;
  /** The live bait, redrawn every frame. */
  readonly worm: Phaser.GameObjects.Graphics;
  readonly x: number;
  /** Where the line starts: a boat's rod tip above the water, or the top edge of the world. */
  readonly topY: number;
  /** Ms to wait in 'arrive' before the warning line appears. */
  readonly arriveMs: number;
  readonly depth: number;
  phase: HookPhase;
  t: number;
  y: number;
  /** Radius of whatever hangs on the barb; 0 while the hook is empty. */
  load: number;
  /** Ms since the hook appeared: the worm's clock. */
  age: number;
  /** How far the current has pushed the hook downstream of where its line enters the water. */
  drift: number;
  /** Tilt of the hook along its bowed line, radians. */
  tilt: number;
}

/** A current pushes the hook this many px per (unit of current x px of line in the water). */
const LINE_DRAG = 0.0016;
/** Where on the line (0 surface .. 1 hook) the bow's control point sits: low, so the line hangs. */
const BOW = 0.65;

/** Where the hook texture's eye sits relative to the sprite origin (texture units). */
const HOOK_EYE = { x: 0, y: 2 } as const;

/** Where a hook will hang: near the player so it's a real threat. */
export function pickHookSpot(level: LevelDef, px: number, py: number, rng: Rng): { x: number; depth: number } {
  return {
    x: px + rangeOf(rng, -260, 260),
    depth: Phaser.Math.Clamp(py + rangeOf(rng, -120, 160), 260, level.world.height - 220),
  };
}

/**
 * A hook hanging from `topY` (a rod tip, or the world's top edge), telegraphed
 * by a dotted line first. With `arriveMs` it waits that long for its boat.
 */
export function spawnHook(scene: Phaser.Scene, spot: { x: number; depth: number }, topY = 0, arriveMs = 0): Hook {
  const { x, depth } = spot;
  const start = topY - 80;
  const sprite = scene.add.image(x, start, boilKey('hook', 0)).setOrigin(0.66, 0.05).setDepth(12).setScale(1 / ART_RES).setVisible(arriveMs <= 0);
  const line = scene.add.graphics().setDepth(11);
  const worm = scene.add.graphics().setDepth(12.5);
  return { sprite, line, worm, x, topY, arriveMs, depth, phase: arriveMs > 0 ? 'arrive' : 'warn', t: 0, y: start, load: 0, age: 0, drift: 0, tilt: 0 };
}

/** How far a current pushes a hook hanging `depth` px down: more line in the water, more drag. */
export function hookDrift(current: number, depth: number): number {
  return current * Math.max(0, depth) * LINE_DRAG;
}

/** A point on the bowed line (quadratic curve from where it starts at the top to the hook's eye). */
function linePoint(h: Hook, end: { x: number; y: number }, s: number): { x: number; y: number } {
  const cx = h.x + (end.x - h.x) * 0.15;
  const cy = h.topY + (end.y - h.topY) * BOW;
  const u = 1 - s;
  return { x: u * u * h.x + 2 * u * s * cx + s * s * end.x, y: u * u * h.topY + 2 * u * s * cy + s * s * end.y };
}

/** Returns false when the hook has left the screen and should be destroyed. `current` is the level's sideways drift. */
export function updateHook(h: Hook, dtMs: number, frame: number, current = 0): boolean {
  h.t += dtMs;
  h.age += dtMs;
  h.line.clear();
  if (h.phase === 'arrive') {
    if (h.t >= h.arriveMs) Object.assign(h, { phase: 'warn', t: 0 });
    return true;
  }
  if (h.phase === 'warn') {
    // Dotted pencil guide line growing down towards the target depth, already bowed
    // by the current so it shows where the hook will hang.
    const reach = Math.min(1, h.t / TUNING.hookWarnMs);
    const end = { x: h.x + hookDrift(current, h.depth), y: h.depth };
    h.line.fillStyle(0x1b1a1f, 0.45);
    const length = h.depth - h.topY;
    const dots = Math.ceil((length * reach) / 16);
    for (let i = 0; i <= dots; i++) {
      const p = linePoint(h, end, Math.min(reach, (i * 16) / length));
      h.line.fillCircle(p.x, p.y, 2);
    }
    if (h.t >= TUNING.hookWarnMs) {
      Object.assign(h, { phase: 'drop', t: 0 });
      h.sprite.setVisible(true);
    }
  } else if (h.phase === 'drop') {
    h.y = Phaser.Math.Linear(h.topY, h.depth, Math.min(1, h.t / 280));
    if (h.t >= 280) Object.assign(h, { phase: 'hold', t: 0 });
  } else if (h.phase === 'hold') {
    h.y = h.depth + Math.sin(h.t / 300) * 8;
    if (h.t >= TUNING.hookHoldMs) Object.assign(h, { phase: 'reel', t: 0 });
  } else {
    // A loaded hook starts with a hard jerk and keeps hauling; an empty one just lifts.
    const speed = h.load > 0 ? 0.45 + Math.min(1, h.t / 500) * 0.55 : 0.9;
    h.y -= dtMs * speed;
    // Hauled up to the rod tip (a boat), or out past the top of the world.
    if (h.topY < 0 ? h.y < h.topY + 6 : h.y < -120 - h.load * 2.2) return false;
  }
  // The hook trails downstream, more the deeper it hangs; it eases there rather than snapping.
  const target = hookDrift(current, h.y) + (current ? Math.sin(h.age / 700) * Math.abs(current) * 0.06 : 0);
  h.drift += (target - h.drift) * Math.min(1, dtMs / 400);
  const eye = { x: h.x + h.drift, y: h.y };
  if (h.phase !== 'warn') {
    h.line.lineStyle(1.6, 0x1b1a1f, 0.85).beginPath().moveTo(h.x, h.topY);
    for (let i = 1; i <= 16; i++) {
      const p = linePoint(h, eye, i / 16);
      h.line.lineTo(p.x, p.y);
    }
    h.line.strokePath();
  }
  // Hang along the line's last stretch.
  const before = linePoint(h, eye, 0.94);
  h.tilt = -Math.atan2(eye.x - before.x, eye.y - before.y);
  h.sprite.setPosition(eye.x, eye.y).setRotation(h.tilt).setTexture(boilKey('hook', frame));
  // Whatever bit the hook took the worm with it; a rising empty hook's worm thrashes.
  // No worm while the hook is still up with the angler (during the warning line).
  h.worm.clear().setPosition(eye.x, eye.y).setRotation(h.tilt);
  if (h.load === 0 && h.sprite.visible) drawWorm(h.worm, HOOK_EYE.x, HOOK_EYE.y, h.age / 1000, h.phase === 'reel');
  return true;
}

/** World-space point of the barb, used for collisions. Only an empty, lowered hook bites. */
export function hookTip(h: Hook): { x: number; y: number; active: boolean } {
  // The barb sits below and left of the eye; turn that offset with the hook's tilt.
  const c = Math.cos(h.tilt);
  const s = Math.sin(h.tilt);
  const dx = -10;
  const dy = 56;
  return { x: h.x + h.drift + dx * c - dy * s, y: h.y + dx * s + dy * c, active: h.load === 0 && (h.phase === 'drop' || h.phase === 'hold') };
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
  h.worm.destroy();
}
