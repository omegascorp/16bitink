import Phaser from 'phaser';
import { BONES_SIZE } from '../../art/deathArt';
import { ART_RES } from '../../art/textures';
import type { Fish } from './fish';
import type { Player } from './player';

/** Scene helpers the effects borrow from the game scene. */
export interface Fx {
  burst(x: number, y: number, count: number): void;
}

const DEAD_TINT = 0xb3ab9c;

/** Short pen strokes radiating from a point: where the spines went in. */
export function spikeMarks(scene: Phaser.Scene, x: number, y: number, radius: number): void {
  const g = scene.add.graphics().setDepth(31).setPosition(x, y);
  g.lineStyle(2, 0x1b1a1f, 0.9);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    g.lineBetween(Math.cos(a) * radius * 0.9, Math.sin(a) * radius * 0.9, Math.cos(a) * radius * 1.5, Math.sin(a) * radius * 1.5);
  }
  scene.tweens.add({ targets: g, scale: 1.4, alpha: 0, duration: 500, ease: 'Cubic.Out', onComplete: () => g.destroy() });
}

/** Swallowed whole: the player is sucked into the killer's mouth and the bones drift back out. */
export function playEaten(scene: Phaser.Scene, player: Player, killer: Fish, fx: Fx): void {
  const dir = killer.sprite.flipX ? -1 : 1;
  const mouth = (): { x: number; y: number } => ({ x: killer.sprite.x + dir * killer.size * 0.8, y: killer.sprite.y });
  const ps = player.sprite;
  // The killer has eaten: it stops hunting and swims on.
  Object.assign(killer, { state: 'tired', stateUntil: scene.time.now + 3000, cooldownUntil: scene.time.now + 6000 });
  scene.tweens.add({
    targets: ps, x: mouth().x, y: mouth().y, scaleX: 0, scaleY: 0, rotation: ps.rotation + dir * 0.9,
    duration: 260, ease: 'Quad.In',
    onComplete: () => {
      ps.setVisible(false);
      const m = mouth();
      fx.burst(m.x, m.y, 8);
      const scale = (player.drawSize * 2.6) / (BONES_SIZE.w * ART_RES);
      const bones = scene.add.image(m.x, m.y, 'bones').setDepth(21).setScale(scale * 0.6).setAlpha(0).setFlipX(dir < 0);
      scene.tweens.add({ targets: bones, alpha: 1, scale, x: m.x - dir * 30, duration: 300, delay: 250, ease: 'Back.Out' });
      scene.tweens.add({
        targets: bones, y: m.y + 160, rotation: dir * 0.7, duration: 2200, delay: 550, ease: 'Sine.In',
        onComplete: () => bones.destroy(),
      });
    },
  });
}

/** Pricked: the player twitches, goes pale and floats belly-up towards the surface. */
export function playSpiked(scene: Phaser.Scene, player: Player, surfaceY: number): void {
  const ps = player.sprite;
  spikeMarks(scene, ps.x, ps.y, player.drawSize);
  ps.setTint(DEAD_TINT).setAlpha(1);
  scene.tweens.add({ targets: ps, x: ps.x + 6, duration: 50, yoyo: true, repeat: 4 });
  scene.tweens.add({
    targets: ps, rotation: 0, delay: 280, duration: 260, ease: 'Sine.Out',
    onStart: () => ps.setFlipY(true),
  });
  scene.tweens.add({ targets: ps, y: surfaceY, delay: 450, duration: 2600, ease: 'Sine.InOut' });
  scene.tweens.add({ targets: ps, angle: 8, delay: 600, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
}
