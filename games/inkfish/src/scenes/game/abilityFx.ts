import Phaser from 'phaser';
import { ABILITY } from '../../logic/abilities';
import type { Rng } from '../../logic/rng';
import { relationTo } from '../../logic/sizing';
import { keepInWater } from '../../logic/water';
import { isCrawler } from './crawlers';
import { isHelpless, steerTo, type Fish } from './fish';
import type { Player } from './player';

/** Sepia-black, like the giant squid's ink. */
const INK = 0x2a2230;
const FLASH = 0xcfe8ff;

/**
 * The inkling's ink cloud: a few overlapping blots that billow out from the
 * player, hang for a moment, then thin away. Hunters inside it lose the
 * player (see blindHunters).
 */
export function drawInkCloud(scene: Phaser.Scene, x: number, y: number, size: number, rng: Rng): void {
  const reach = ABILITY.inkRadius;
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * reach * 0.45;
    const r = reach * (0.28 + rng() * 0.22);
    const blot = scene.add.graphics().setDepth(19).setPosition(x + Math.cos(a) * d * 0.3, y + Math.sin(a) * d * 0.3);
    blot.fillStyle(INK, 0.55).fillCircle(0, 0, r);
    blot.fillStyle(INK, 0.35).fillCircle(r * 0.3, -r * 0.2, r * 0.7);
    blot.setScale(size / 60).setAlpha(0.95);
    scene.tweens.add({ targets: blot, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 20, scale: 1, duration: 450, ease: 'Cubic.Out' });
    scene.tweens.add({ targets: blot, alpha: 0, delay: 900 + rng() * 600, duration: 1800, onComplete: () => blot.destroy() });
  }
}

/** Every fish in the cloud that could hurt you (peers too) loses track of you for a while. Returns how many. */
export function blindHunters(fish: readonly Fish[], p: Player, now: number): number {
  let n = 0;
  for (const f of fish) {
    if (isCrawler(f.species) || isHelpless(f) || relationTo(p.size, f.size) === 'prey') continue;
    if (Phaser.Math.Distance.Between(f.sprite.x, f.sprite.y, p.sprite.x, p.sprite.y) > ABILITY.inkRadius + f.size) continue;
    // Tired fish don't strike again until their cooldown is over (see fish.ts behave).
    Object.assign(f, { state: 'tired', stateUntil: now + ABILITY.inkBlindMs, cooldownUntil: now + ABILITY.inkBlindMs, blindUntil: now + ABILITY.inkBlindMs });
    n += 1;
  }
  return n;
}

/** The lanternfish's flash: a pale ring of light racing out from the player. */
export function drawFlash(scene: Phaser.Scene, x: number, y: number): void {
  const ring = scene.add.graphics().setDepth(35).setPosition(x, y);
  ring.lineStyle(6, FLASH, 0.9).strokeCircle(0, 0, 40);
  ring.fillStyle(FLASH, 0.25).fillCircle(0, 0, 40);
  scene.tweens.add({ targets: ring, scale: ABILITY.flashRadius / 40, alpha: 0, duration: 700, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
}

/** Whether a fish is drawn to the player's flash right now: free-swimming, awake, and close enough. */
export function drawnToFlash(f: Fish, p: Player, now: number): boolean {
  if (now >= p.flashUntil || f.led || f.role === 'boss' || isCrawler(f.species) || isHelpless(f) || p.hidden) return false;
  return Phaser.Math.Distance.Between(f.sprite.x, f.sprite.y, p.sprite.x, p.sprite.y) < ABILITY.flashRadius;
}

/** Swims a fish in towards the flash (in place of its own habits, for as long as it shines). */
export function swimToFlash(f: Fish, p: Player, worldHeight: number, floorAt: (x: number) => number, dt: number): void {
  f.phase += dt;
  steerTo(f, p.sprite.x, p.sprite.y, ABILITY.flashPull, dt, 4);
  f.sprite.x += f.vx * dt;
  const water = keepInWater(f.sprite.y + f.vy * dt, f.vy, f.size, worldHeight, floorAt(f.sprite.x));
  f.sprite.y = water.y;
  f.vy = water.vy;
}
