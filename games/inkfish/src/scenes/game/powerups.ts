import Phaser from 'phaser';
import { boilKey } from '../../art/textures';
import type { LevelDef, PowerUpId } from '../../levels/types';
import { rangeOf, type Rng } from '../../logic/rng';
import { TUNING } from './tuning';

export interface PowerUp {
  readonly sprite: Phaser.GameObjects.Image;
  readonly kind: PowerUpId;
  readonly expiresAt: number;
  readonly baseY: number;
}

export function spawnPowerUp(scene: Phaser.Scene, level: LevelDef, view: Phaser.Geom.Rectangle, now: number, rng: Rng): PowerUp | null {
  if (level.powerUps.length === 0) return null;
  const kind = level.powerUps[Math.floor(rng() * level.powerUps.length)]!;
  // Inside the current view so the player can actually go for it.
  const x = Phaser.Math.Clamp(rangeOf(rng, view.left + 80, view.right - 80), 80, level.world.width - 80);
  const y = Phaser.Math.Clamp(rangeOf(rng, view.top + 80, view.bottom - 80), 140, level.world.height - 160);
  const sprite = scene.add.image(x, y, boilKey(`pu-${kind}`, 0)).setDepth(13).setScale(0);
  scene.tweens.add({ targets: sprite, scale: 0.75, duration: 400, ease: 'Back.Out' });
  return { sprite, kind, expiresAt: now + TUNING.powerUpTtlMs, baseY: y };
}

export function updatePowerUp(p: PowerUp, now: number, frame: number): boolean {
  if (now > p.expiresAt) {
    p.sprite.destroy();
    return false;
  }
  const left = p.expiresAt - now;
  p.sprite.y = p.baseY + Math.sin(now / 350) * 8;
  // Blink during the last two seconds.
  p.sprite.setAlpha(left < 2000 && Math.floor(now / 150) % 2 === 0 ? 0.35 : 1);
  p.sprite.setTexture(boilKey(`pu-${p.kind}`, frame));
  return true;
}
